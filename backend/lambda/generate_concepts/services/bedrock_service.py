"""
Bedrock Service - LLM invocation and response handling
This service encapsulates all interactions with AWS Bedrock including:
- Parallel concept generation with partitioned prompts
- Retry logic with exponential backoff
- Concept validation
- Response parsing with robust JSON extraction
- Single concept repair operations
@module services/bedrock_service
"""
import json
import os
import re
import time
import concurrent.futures
from typing import Any, Dict, List, Optional
import boto3
from botocore.config import Config
class BedrockService:
    """
    Service for interacting with AWS Bedrock LLM.
    Handles concept generation, validation, and repair operations
    with built-in retry logic and response parsing.
    """
    # Configuration constants
    MAX_RETRIES = 3
    RETRY_BACKOFF_BASE = 2 # Exponential backoff: 2, 4, 8 seconds
    MIN_CONCEPTS_THRESHOLD = 40 # Minimum acceptable concepts for success
    MAX_WORKERS = 3 # Concurrent API requests
    COVERAGE_STOPWORDS = {
        "a", "an", "the", "and", "or", "for", "in", "on", "to", "of", "by",
        "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
        "do", "does", "did", "will", "would", "could", "should", "may", "might",
        "shall", "can", "that", "this", "these", "those", "it", "its", "with",
        "from", "as", "at", "but", "not", "so", "if", "then", "than", "too",
        "very", "just", "about", "up", "out", "into", "over", "after", "before",
        "between", "through", "during", "without", "using", "including",
        "configure", "create", "manage", "implement", "deploy", "set",
        "use", "describe", "identify", "define", "establish", "perform",
    }
    def __init__(self, region: str = "us-east-1"):
        """
        Initialize the Bedrock service with AWS client.
        Args:
            region: AWS region for Bedrock endpoint
        """
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=region,
            config=Config(
                retries={"max_attempts": 3, "mode": "adaptive"},
                read_timeout=900,
            ),
        )
        self.model_id = os.environ.get(
            "BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0"
        )
    def classify_subject(self, subject: str, context: str = "") -> Optional[Dict[str, Any]]:
        from shared.system_prompt import get_classification_prompt
        prompt = get_classification_prompt(subject, context)
        print(f"[BedrockService] Classifying subject: {subject}")
        for attempt in range(self.MAX_RETRIES):
            try:
                response = self.client.invoke_model(
                    modelId=self.model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 4096,
                        "temperature": 0.3,
                        "messages": [{"role": "user", "content": prompt}],
                    }),
                )
                response_body = json.loads(response.get("body").read())
                raw_content = response_body.get("content", [])[0].get("text", "")
                print(f"[BedrockService] Classification response: {len(raw_content)} chars")
                json_match = re.search(r'\{[\s\S]*\}', raw_content)
                if json_match:
                    result = json.loads(json_match.group(0))
                    valid_types = {"procedural", "conceptual", "cyclic", "perceptual"}
                    if result.get("subjectType") in valid_types:
                        print(f"[BedrockService] Classified as: {result['subjectType']} (confidence: {result.get('classification', {}).get('confidence', 'N/A')})")
                        return result
                print(f"[BedrockService] Classification attempt {attempt + 1} returned invalid data")
            except Exception as e:
                print(f"[BedrockService] Classification attempt {attempt + 1} error: {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_BACKOFF_BASE ** (attempt + 1))
        print("[BedrockService] Classification failed, using default (conceptual)")
        return None
    def _enrich_domains_from_context(self, domains: List[Dict[str, Any]], context: str) -> None:
        CONTEXT_LINE_PATTERN = re.compile(r'^\[([^\]]+?)\s*-\s*(\d+)%?\]\s*(.+)$')
        domain_lookup = {}
        for d in domains:
            domain_lookup[d["name"].strip().lower()] = d
        for line in context.split('\n'):
            line = line.strip()
            if not line:
                continue
            match = CONTEXT_LINE_PATTERN.match(line)
            if not match:
                continue
            domain_name = match.group(1).strip()
            weight = int(match.group(2))
            task = match.group(3).strip()
            key = domain_name.lower()
            if key in domain_lookup:
                d = domain_lookup[key]
                if not d.get("subtopics") or not isinstance(d["subtopics"], list):
                    d["subtopics"] = []
                d["subtopics"].append(task)
                d["weight"] = weight / 100.0
        enriched = sum(1 for d in domains if d.get("subtopics"))
        total_tasks = sum(len(d.get("subtopics", [])) for d in domains)
        if enriched > 0:
            print(f"[BedrockService] Enriched {enriched}/{len(domains)} domains with {total_tasks} tasks from context")
        else:
            print(f"[BedrockService] No per-domain tasks found in context (will use raw context as fallback)")
    def generate_concepts(self, subject: str, context: str = "", trunks: list = None) -> tuple:
        from shared.system_prompt import get_tree_generation_prompt, _get_exam_domains
        classification_future = None
        if trunks and len(trunks) >= 2:
            print(f"[BedrockService] Using {len(trunks)} user-defined trunks (classifying in parallel)")
            equal_weight = round(1.0 / len(trunks), 2)
            domains = [{"name": t, "weight": equal_weight, "subtopics": []} for t in trunks]
            if context:
                self._enrich_domains_from_context(domains, context)
            classification_executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            classification_future = classification_executor.submit(self.classify_subject, subject, context)
            classification = None
        else:
            classification = self.classify_subject(subject, context)
            domains = _get_exam_domains(context, classification)
            if not domains:
                print("[BedrockService] WARNING: No exam domains from classification. Retrying classification...")
                retry_cls = self.classify_subject(subject, context)
                if retry_cls:
                    domains = _get_exam_domains(context, retry_cls)
                    if domains:
                        classification = retry_cls
            if not domains:
                print("[BedrockService] FALLBACK: Generating single-domain tree for subject")
                domains = [{"name": subject, "weight": 1.0, "subtopics": []}]
        num_partitions = len(domains)
        print(f"[BedrockService] Tree generation: {num_partitions} domains (trunks)")
        for i, d in enumerate(domains):
            print(f"[BedrockService]   Trunk {i+1}: {d.get('name')} (weight={d.get('weight', 'N/A')})")
        def generate_domain_with_retry(domain_index: int) -> List[Dict[str, Any]]:
            if domain_index > 0:
                time.sleep(0.5 * domain_index)
            domain = domains[domain_index]
            prompt = get_tree_generation_prompt(
                subject=subject,
                domain=domain,
                domain_index=domain_index,
                total_domains=num_partitions,
                context=context,
                classification=classification,
                all_domains=domains,
            )
            last_error = None
            domain_name = domain.get("name", f"Domain {domain_index + 1}")
            print(f"[BedrockService] Trunk '{domain_name}': Starting with model={self.model_id}")
            for attempt in range(self.MAX_RETRIES):
                try:
                    print(f"[BedrockService] Trunk '{domain_name}': Attempt {attempt + 1}/{self.MAX_RETRIES}")
                    system_msg, user_msg = self._split_prompt(prompt, domain_name)
                    response = self.client.invoke_model(
                        modelId=self.model_id,
                        contentType="application/json",
                        accept="application/json",
                        body=json.dumps({
                            "anthropic_version": "bedrock-2023-05-31",
                            "max_tokens": 51200,
                            "temperature": 0.3,
                            "system": self._build_cached_system(system_msg),
                            "messages": [{"role": "user", "content": user_msg}],
                        }),
                    )
                    response_body = json.loads(response.get("body").read())
                    self._log_cache_metrics(response_body, f"Tree '{domain_name}'")
                    raw_content = response_body.get("content", [])[0].get("text", "")
                    print(f"[BedrockService] Trunk '{domain_name}': Got {len(raw_content)} chars")
                    parsed = self._parse_concepts_from_response(raw_content)
                    print(f"[BedrockService] Trunk '{domain_name}': Parsed {len(parsed)} concepts")
                    for c in parsed:
                        if not c.get("trunkDomain"):
                            c["trunkDomain"] = domain_name
                    validated = [c for c in parsed if self._validate_concept(c)]
                    print(f"[BedrockService] Trunk '{domain_name}': Validated {len(validated)} concepts")
                    if validated:
                        return validated
                    last_error = f"Trunk '{domain_name}': All {len(parsed)} concepts failed validation"
                except Exception as e:
                    last_error = str(e)
                    print(f"[BedrockService] Trunk '{domain_name}': Error on attempt {attempt + 1}: {last_error}")
                    if attempt < self.MAX_RETRIES - 1:
                        sleep_time = self.RETRY_BACKOFF_BASE ** (attempt + 1)
                        time.sleep(sleep_time)
            print(f"[ERROR] generate_domain_with_retry failed after {self.MAX_RETRIES} attempts: {last_error}")
            return []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.MAX_WORKERS) as executor:
            futures = [
                executor.submit(generate_domain_with_retry, i)
                for i in range(num_partitions)
            ]
            results = [f.result() for f in futures]
        all_concepts = []
        for part_concepts in results:
            all_concepts.extend(part_concepts)
        all_concepts = [
            c for c in all_concepts if isinstance(c, dict) and c.get("name")
        ]
        seen_names = set()
        deduped = []
        for c in all_concepts:
            name_key = c["name"].strip().lower()
            if name_key not in seen_names:
                seen_names.add(name_key)
                deduped.append(c)
            else:
                print(f"[BedrockService] Dedup: removed duplicate '{c['name']}'")
        all_concepts = deduped
        if len(all_concepts) < self.MIN_CONCEPTS_THRESHOLD:
            print(f"[WARNING] Only {len(all_concepts)} concepts (threshold: {self.MIN_CONCEPTS_THRESHOLD})")
        has_objectives = any(d.get("subtopics") for d in domains)
        if has_objectives and len(all_concepts) > 0:
            all_concepts = self._detect_scope_creep(all_concepts, domains)
            gaps = self._analyze_coverage_gaps(all_concepts, domains)
            total_gaps = sum(len(v) for v in gaps.values()) if gaps else 0
            if total_gaps > 0 and total_gaps <= 2:
                print(f"[BedrockService] Gap-fill skipped: only {total_gaps} gaps (threshold: >2)")
            if gaps and total_gaps > 2:
                print(f"[BedrockService] Gap-fill triggered: {total_gaps} gaps across {len(gaps)} domains")
                gap_concepts = self._generate_gap_fill(
                    subject, domains, all_concepts, gaps, classification
                )
                for c in gap_concepts:
                    name_key = c.get("name", "").strip().lower()
                    if name_key and name_key not in seen_names:
                        seen_names.add(name_key)
                        all_concepts.append(c)
                    else:
                        print(f"[BedrockService] Gap-fill dedup: skipped '{c.get('name')}'")
                print(f"[BedrockService] After gap-fill: {len(all_concepts)} total concepts")
                all_concepts = self._detect_scope_creep(all_concepts, domains)
        all_concepts = self._post_process_concepts(all_concepts)
        if classification_future is not None:
            try:
                classification = classification_future.result(timeout=30)
                print(f"[BedrockService] Parallel classification resolved: {classification.get('subjectType', 'unknown') if classification else 'None'}")
            except Exception as e:
                print(f"[BedrockService] Parallel classification failed (non-fatal): {e}")
                classification = None
        return all_concepts, classification
    def repair_concept(
        self, subject: str, concept_name: str, issue: str
    ) -> Optional[Dict[str, Any]]:
        """
        Surgically repair a single concept using Bedrock.
        Args:
            subject: The subject context
            concept_name: Name of the concept to repair
            issue: Description of the issue to fix
        Returns:
            Repaired concept dict or None if repair failed
        """
        from shared.system_prompt import get_surgical_fix_prompt
        prompt = get_surgical_fix_prompt(subject, concept_name, issue)
        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4096,
                    "temperature": 0.5, # Lower temperature for precision
                    "messages": [{"role": "user", "content": prompt}],
                }),
            )
            response_body = json.loads(response.get("body").read())
            content = response_body.get("content", [])[0].get("text", "")
            concepts = self._parse_concepts_from_response(content)
            if concepts and len(concepts) > 0:
                return concepts[0]
            return None
        except Exception as e:
            print(f"[ERROR] Repair failed: {e}")
            return None
    def _split_prompt(self, prompt: str, domain_name: str) -> tuple:
        split_marker = f'Generate the concept tree for "{domain_name}" now:'
        idx = prompt.rfind(split_marker)
        if idx > 0:
            system_part = prompt[:idx].strip()
            user_part = split_marker
        else:
            last_rule_idx = prompt.rfind("---\n## 5.")
            if last_rule_idx > 0:
                system_part = prompt[:last_rule_idx].strip()
                user_part = prompt[last_rule_idx:].strip()
            else:
                system_part = prompt
                user_part = f'Generate the concept tree for "{domain_name}" now. Return ONLY valid JSON array.'
        user_part += "\n\nIMPORTANT — AUTOMATIC REJECTION PATTERNS (do NOT use these):\n- hookSentence: Never 'Without proper X...', 'Without X...', 'Improperly configured X...'. Lead with a concrete fact or scenario from the subject domain.\n- microMetaphor: Never 'Think of X as...'. Use 'X are/is [metaphor] — [mapping]' pattern.\n- whyYouNeed: Never 'X is crucial/critical/essential...', 'X provides a secure way...', 'X are essential for...'. Explain the specific problem this concept solves.\nWrite as a subject matter expert. Every field must have field-appropriate depth and specificity."
        return system_part, user_part

    @staticmethod
    def _build_cached_system(system_text: str) -> list:
        return [
            {
                "type": "text",
                "text": system_text,
                "cache_control": {"type": "ephemeral"},
            }
        ]

    @staticmethod
    def _log_cache_metrics(response_body: dict, label: str) -> None:
        usage = response_body.get("usage", {})
        cache_read = usage.get("cache_read_input_tokens", 0)
        cache_write = usage.get("cache_creation_input_tokens", 0)
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        if cache_read or cache_write:
            print(
                f"[BedrockService] {label} tokens: "
                f"input={input_tokens} output={output_tokens} "
                f"cache_read={cache_read} cache_write={cache_write}"
            )
        else:
            print(
                f"[BedrockService] {label} tokens: "
                f"input={input_tokens} output={output_tokens} (no cache)"
            )
    TEMPLATE_REGEX_PATTERNS = None

    @classmethod
    def _get_template_patterns(cls):
        if cls.TEMPLATE_REGEX_PATTERNS is None:
            cls.TEMPLATE_REGEX_PATTERNS = [
                re.compile(r"^why\s+.+\s+matters", re.IGNORECASE),
                re.compile(r"^think of\s+.+\s+as\b", re.IGNORECASE),
                re.compile(r"^detailed explanation of\s+", re.IGNORECASE),
                re.compile(r"^proper use of\s+.+\s+vs\s+", re.IGNORECASE),
                re.compile(r"^understanding\s+.+\s+in the context of", re.IGNORECASE),
                re.compile(r"^understanding\s+.+\s+is important", re.IGNORECASE),
                re.compile(r"^key exam topic for\s+", re.IGNORECASE),
                re.compile(r"^what is\s+.+\?$", re.IGNORECASE),
                re.compile(r"^when to use\s+", re.IGNORECASE),
                re.compile(r"^apply\s+.+\s+in practice$", re.IGNORECASE),
                re.compile(r"^.+\s+is a core concept", re.IGNORECASE),
                re.compile(r"^.+\s+matters because", re.IGNORECASE),
                re.compile(r"^.+\s+matters in\s+", re.IGNORECASE),
                re.compile(r"\btoolkit$", re.IGNORECASE),
                re.compile(r"^scope:\s*stay focused$", re.IGNORECASE),
                re.compile(r"^effectiveness$", re.IGNORECASE),
                re.compile(r"^efficiency$", re.IGNORECASE),
                re.compile(r"^common misunderstanding$", re.IGNORECASE),
                re.compile(r"^none$", re.IGNORECASE),
                re.compile(r"^without proper\s+.+,\s+(your|you)", re.IGNORECASE),
                re.compile(r"^without\s+\w+\s+(security |access |controls?|rules?|configuration)", re.IGNORECASE),
                re.compile(r"^improperly configured\s+", re.IGNORECASE),
                re.compile(r"^.+\s+is (a |the )?(crucial|critical|essential|important|fundamental)\s+(component|part|aspect|element)", re.IGNORECASE),
                re.compile(r"^.+\s+provides?\s+a\s+secure.+way to\s+", re.IGNORECASE),
                re.compile(r"^.+\s+are\s+(essential|crucial|critical|important)\s+for\s+", re.IGNORECASE),
            ]
        return cls.TEMPLATE_REGEX_PATTERNS

    def _is_template_content(self, text: str, concept_name: str) -> bool:
        if not text or not text.strip():
            return True
        lower = text.strip()
        if lower == "..." or lower == "N/A" or len(lower) < 10:
            return True
        for pattern in self._get_template_patterns():
            if pattern.search(lower):
                return True
        return False

    def _is_short_filler(self, text: str, min_length: int = 40) -> bool:
        if not text or not text.strip():
            return True
        return len(text.strip()) < min_length

    def _validate_concept(self, concept: Dict[str, Any]) -> bool:
        if not isinstance(concept, dict):
            return False
        if not concept.get("name"):
            return False
        name = concept.get("name", "")
        valid_tree_levels = {"trunk", "branch", "leaf"}
        tree_level = (concept.get("treeLevel") or "").lower().strip()
        if tree_level not in valid_tree_levels:
            concept["treeLevel"] = "leaf"
        mnemonic = concept.get("mnemonic", {})
        if not isinstance(mnemonic, dict):
            return False
        if not mnemonic.get("anchor") and not mnemonic.get("story"):
            return False
        anchor = (mnemonic.get("anchor") or "").strip().lower()
        if anchor == name.strip().lower():
            print(f"[BedrockService] Validation fail: '{name}' mnemonic anchor is just the concept name")
            return False
        story = (mnemonic.get("story") or "").strip()
        if self._is_template_content(story, name):
            print(f"[BedrockService] Template mnemonic.story in '{name}': '{story[:80]}'")
            return False
        if self._is_short_filler(story, 50):
            print(f"[BedrockService] Short mnemonic.story in '{name}': '{story[:80]}'")
            return False
        shape = concept.get("shape", {})
        if not isinstance(shape, dict):
            return False
        if not shape.get("simpleCore"):
            return False
        connections = concept.get("connections", [])
        if not isinstance(connections, list) or len(connections) < 1:
            print(f"[BedrockService] Validation fail: '{name}' has no connections")
            return False
        valid_levels = {"remember", "understand", "apply", "analyze", "evaluate", "create"}
        level = (concept.get("cognitiveLevel") or "").lower().strip()
        if level not in valid_levels:
            print(f"[BedrockService] Validation fail: '{name}' missing cognitiveLevel")
            return False
        template_fields = {
            "phase1.hookSentence": (concept.get("phase1") or {}).get("hookSentence", ""),
            "phase1.microMetaphor": (concept.get("phase1") or {}).get("microMetaphor", ""),
            "whyYouNeed": concept.get("whyYouNeed", ""),
            "shape.simpleCore": shape.get("simpleCore", ""),
        }
        for field_name, value in template_fields.items():
            if self._is_template_content(value, name):
                print(f"[BedrockService] Template in '{name}'.{field_name}: '{value[:80]}'")
                return False
        why = concept.get("whyYouNeed", "")
        if self._is_short_filler(why, 60):
            print(f"[BedrockService] Short whyYouNeed in '{name}': '{why[:80]}'")
            return False
        phase1 = concept.get("phase1") or {}
        execution = (phase1.get("execution") or "").strip()
        if self._is_template_content(execution, name):
            print(f"[BedrockService] Template phase1.execution in '{name}': '{execution[:80]}'")
            return False
        selection = phase1.get("selection", [])
        if isinstance(selection, list):
            for s in selection:
                sel_text = s if isinstance(s, str) else str(s)
                if self._is_template_content(sel_text, name):
                    print(f"[BedrockService] Template phase1.selection in '{name}': '{sel_text[:80]}'")
                    return False
        phase2 = concept.get("phase2", [])
        if isinstance(phase2, list) and len(phase2) > 0:
            for item in phase2:
                content = ""
                if isinstance(item, str):
                    content = item
                elif isinstance(item, dict):
                    content = item.get("content", "")
                if self._is_template_content(content, name):
                    print(f"[BedrockService] Template phase2 in '{name}': '{content[:80]}'")
                    return False
        phase3 = concept.get("phase3") or {}
        tool = (phase3.get("tool") or "").strip()
        if self._is_template_content(tool, name):
            print(f"[BedrockService] Template phase3.tool in '{name}': '{tool[:80]}'")
            return False
        metrics = phase3.get("metrics", [])
        if isinstance(metrics, list):
            for m in metrics:
                m_text = m if isinstance(m, str) else str(m)
                if self._is_template_content(m_text, name):
                    print(f"[BedrockService] Template phase3.metric in '{name}': '{m_text[:80]}'")
                    return False
        crit = concept.get("criticalDistinctions", [])
        if isinstance(crit, list):
            for item in crit:
                text = ""
                if isinstance(item, str):
                    text = item
                elif isinstance(item, dict):
                    text = f"{item.get('correct', '')} {item.get('incorrect', '')}"
                if self._is_template_content(text, name):
                    print(f"[BedrockService] Template criticalDistinctions in '{name}': '{text[:80]}'")
                    return False
        design = concept.get("designBoundaries", [])
        if isinstance(design, list):
            for item in design:
                text = ""
                if isinstance(item, str):
                    text = item
                elif isinstance(item, dict):
                    text = f"{item.get('boundary', '')} {item.get('rationale', '')}"
                if self._is_template_content(text, name):
                    print(f"[BedrockService] Template designBoundaries in '{name}': '{text[:80]}'")
                    return False
        pr = (shape.get("patternRecognition") or {})
        if isinstance(pr, dict):
            q = (pr.get("question") or "").strip()
            a = (pr.get("answer") or "").strip()
            if not q or not a:
                print(f"[BedrockService] Template patternRecognition in '{name}': empty Q or A")
                return False
            if self._is_short_filler(q, 30) or self._is_short_filler(a, 30):
                print(f"[BedrockService] Short patternRecognition in '{name}'")
                return False
        worked = concept.get("workedExample") or {}
        if isinstance(worked, dict):
            we_problem = (worked.get("problem") or "").strip()
            we_solution = (worked.get("solution") or "").strip()
            if tree_level in ("branch", "leaf"):
                if not we_problem or len(we_problem) < 20:
                    print(f"[BedrockService] Missing/short workedExample.problem in '{name}'")
                    return False
                if not we_solution or len(we_solution) < 20:
                    print(f"[BedrockService] Missing/short workedExample.solution in '{name}'")
                    return False
        return True
    def _validate_tree_structure(self, concepts: List[Dict[str, Any]]) -> None:
        name_set = {c.get("name", "").strip().lower() for c in concepts if c.get("name")}
        trunk_names = set()
        branch_names = set()
        tree_counts = {"trunk": 0, "branch": 0, "leaf": 0}
        for c in concepts:
            level = (c.get("treeLevel") or "leaf").lower().strip()
            c["treeLevel"] = level
            tree_counts[level] = tree_counts.get(level, 0) + 1
            if level == "trunk":
                trunk_names.add(c.get("name", "").strip().lower())
            elif level == "branch":
                branch_names.add(c.get("name", "").strip().lower())
        for c in concepts:
            level = c.get("treeLevel", "leaf")
            parent = (c.get("parentName") or "").strip().lower()
            if level == "branch" and parent and parent not in trunk_names:
                print(f"[BedrockService] Tree fix: branch '{c.get('name')}' parent '{c.get('parentName')}' not found in trunks")
            elif level == "leaf" and parent and parent not in branch_names:
                if parent in trunk_names:
                    print(f"[BedrockService] Tree fix: leaf '{c.get('name')}' parent points to trunk, should be branch")
            c["tier"] = c["treeLevel"]
        print(f"[BedrockService] Tree distribution: {tree_counts}")
        domains = set()
        for c in concepts:
            d = c.get("trunkDomain", "")
            if d:
                domains.add(d)
        print(f"[BedrockService] Domains: {domains}")
    def _enforce_blooms_distribution(self, concepts: List[Dict[str, Any]]) -> None:
        VALID_LEVELS = {"remember", "understand", "apply", "analyze", "evaluate", "create"}
        HIGHER_ORDER = {"apply", "analyze", "evaluate", "create"}
        UPGRADE_KEYWORDS = [
            "configur", "troubleshoot", "deploy", "implement", "manage",
            "monitor", "create", "design", "build", "set up", "provision",
            "migrate", "secure", "optimize", "diagnos", "debug", "resolve",
            "evaluate", "compare", "select", "choose", "decide", "plan",
            "architect", "automat", "integrat", "custom", "extend",
            "analyz", "synthesiz", "compos", "perform", "demonstrat",
            "construct", "formulat", "predict", "hypothesiz", "differentiat",
            "organiz", "interpret", "calculat", "solve", "apply", "practic",
            "execut", "adapt", "modify", "argu", "critiqu", "justif",
            "improvisat", "orchestrat", "coordinat", "assess", "prioritiz",
            "negoti", "mediat", "facilitat", "investigat", "experiment",
        ]
        for c in concepts:
            level = (c.get("cognitiveLevel") or "remember").lower().strip()
            if level not in VALID_LEVELS:
                c["cognitiveLevel"] = "understand"
        total = len(concepts)
        if total == 0:
            return
        higher_count = sum(1 for c in concepts if c.get("cognitiveLevel", "").lower() in HIGHER_ORDER)
        target_higher = max(int(total * 0.30), 1)
        if higher_count >= target_higher:
            print(f"[BedrockService] Bloom's OK: {higher_count}/{total} higher-order ({higher_count/total*100:.0f}%)")
            return
        needed = target_higher - higher_count
        candidates = []
        for c in concepts:
            if c.get("cognitiveLevel", "").lower() in HIGHER_ORDER:
                continue
            name_lower = c.get("name", "").lower()
            desc = (c.get("whyYouNeed", "") + " " + c.get("technicalDetails", "")).lower()
            text = name_lower + " " + desc
            keyword_hits = sum(1 for kw in UPGRADE_KEYWORDS if kw in text)
            if keyword_hits > 0:
                candidates.append((c, keyword_hits))
        candidates.sort(key=lambda x: -x[1])
        upgraded = 0
        for c, hits in candidates:
            if upgraded >= needed:
                break
            old_level = c.get("cognitiveLevel", "understand")
            if hits >= 3:
                c["cognitiveLevel"] = "analyze"
            else:
                c["cognitiveLevel"] = "apply"
            upgraded += 1
            print(f"[BedrockService] Bloom's upgrade: '{c.get('name')}' {old_level} -> {c['cognitiveLevel']}")
        final_higher = sum(1 for c in concepts if c.get("cognitiveLevel", "").lower() in HIGHER_ORDER)
        print(f"[BedrockService] Bloom's final: {final_higher}/{total} higher-order ({final_higher/total*100:.0f}%)")
    def _enforce_connection_diversity(self, concepts: List[Dict[str, Any]]) -> None:
        VALID_TYPES = {"requires", "enables", "is-part-of", "is-type-of", "causes", "constrains"}
        LEGACY_MAP = {
            "related-to": "enables",
            "relates": "enables",
            "extends": "is-type-of",
            "contains": "is-part-of",
            "depends-on": "requires",
        }
        concept_by_name = {
            c.get("name", "").strip().lower(): c
            for c in concepts
            if c.get("name")
        }

        def resolve_name(raw_name: str) -> Optional[str]:
            if not isinstance(raw_name, str):
                return None
            key = raw_name.strip().lower()
            if not key:
                return None
            target = concept_by_name.get(key)
            if not target:
                return None
            return target.get("name")

        total_connections = 0
        enables_count = 0
        for concept in concepts:
            connections = concept.get("connections", [])
            if not isinstance(connections, list):
                concept["connections"] = []
                connections = concept["connections"]

            concept_name = (concept.get("name") or "").strip().lower()
            level = (concept.get("treeLevel") or "leaf").lower().strip()
            parent = (concept.get("parentName") or "").strip()
            parent_name = resolve_name(parent) if parent else None
            normalized_connections = []
            seen = set()

            for conn in connections:
                if not isinstance(conn, dict):
                    continue
                target_name = resolve_name(conn.get("target") or "")
                if not target_name:
                    continue
                target_key = target_name.lower()
                if target_key == concept_name:
                    continue

                conn_type = (conn.get("type") or "enables").lower().strip()
                if conn_type in LEGACY_MAP:
                    conn_type = LEGACY_MAP[conn_type]
                if conn_type not in VALID_TYPES:
                    conn_type = "requires"

                target_level = (
                    (concept_by_name.get(target_key, {}) or {}).get("treeLevel") or ""
                ).lower().strip()

                if parent_name and target_key == parent_name.lower():
                    conn_type = "is-part-of"
                elif conn_type == "enables" and level == "leaf" and target_level in {"branch", "trunk"}:
                    conn_type = "requires"
                elif conn_type == "enables" and level == "branch" and target_level == "trunk":
                    conn_type = "requires"

                dedupe_key = f"{target_key}::{conn_type}"
                if dedupe_key in seen:
                    continue
                normalized_connections.append({"target": target_name, "type": conn_type})
                seen.add(dedupe_key)

                total_connections += 1
                if conn_type == "enables":
                    enables_count += 1

            concept["connections"] = normalized_connections

            if level != "trunk" and parent_name:
                has_parent_edge = any(
                    (c.get("target") or "").strip().lower() == parent_name.lower()
                    and c.get("type") == "is-part-of"
                    for c in concept["connections"]
                )
                if not has_parent_edge:
                    concept["connections"].append({"target": parent_name, "type": "is-part-of"})
                    total_connections += 1

            if len(concept["connections"]) < 2 and level == "leaf":
                trunk_name = resolve_name(concept.get("trunkDomain") or "")
                if trunk_name:
                    has_trunk_edge = any(
                        (c.get("target") or "").strip().lower() == trunk_name.lower()
                        for c in concept["connections"]
                    )
                    if not has_trunk_edge and trunk_name.lower() != concept_name:
                        concept["connections"].append({"target": trunk_name, "type": "requires"})
                        total_connections += 1
        if total_connections > 0:
            enables_pct = enables_count / total_connections
            print(f"[BedrockService] TRACES: {enables_count}/{total_connections} enables ({enables_pct*100:.0f}%)")
            if enables_pct > 0.40:
                CONSTRAINT_KEYWORDS = [
                    "security", "policy", "role", "permission", "limit",
                    "quota", "budget", "compliance", "governance", "lock",
                    "rule", "restrict", "deny", "block", "filter", "scope",
                    "boundary", "constraint", "regulation", "standard",
                    "threshold", "ceiling", "floor", "cap", "prohibition",
                    "requirement", "condition", "criterion", "guideline",
                ]
                PREREQUISITE_KEYWORDS = [
                    "identity", "authentication", "foundation", "basis",
                    "fundamental", "prerequisite", "prior", "background",
                    "setup", "preparation", "introduction", "definition",
                    "core", "elementary", "primary", "initial", "base",
                ]
                CAUSAL_KEYWORDS = [
                    "trigger", "alert", "event", "result", "effect",
                    "outcome", "consequence", "response", "reaction",
                    "produce", "generate", "lead to", "cause", "induce",
                    "influence", "impact", "drive", "yield", "propagat",
                ]
                TAXONOMIC_KEYWORDS = [
                    "type", "kind", "variant", "mode", "class",
                    "category", "family", "genre", "form", "style",
                    "species", "branch", "division", "subset", "subtype",
                ]
                upgraded = 0
                target_enables = int(total_connections * 0.30)
                excess = enables_count - target_enables
                for concept in concepts:
                    if upgraded >= excess:
                        break
                    connections = concept.get("connections", [])
                    for conn in connections:
                        if upgraded >= excess:
                            break
                        if conn.get("type") != "enables":
                            continue
                        target_name = (conn.get("target") or "").lower()
                        concept_name = (concept.get("name") or "").lower()
                        combined = target_name + " " + concept_name
                        if any(kw in combined for kw in CONSTRAINT_KEYWORDS):
                            conn["type"] = "constrains"
                            upgraded += 1
                        elif any(kw in combined for kw in PREREQUISITE_KEYWORDS):
                            conn["type"] = "requires"
                            upgraded += 1
                        elif any(kw in combined for kw in CAUSAL_KEYWORDS):
                            conn["type"] = "causes"
                            upgraded += 1
                        elif any(kw in combined for kw in TAXONOMIC_KEYWORDS):
                            conn["type"] = "is-type-of"
                            upgraded += 1
                if upgraded > 0:
                    print(f"[BedrockService] TRACES fix: upgraded {upgraded} enables → specific types")
            type_dist = {}
            for concept in concepts:
                for conn in concept.get("connections", []):
                    t = conn.get("type", "enables")
                    type_dist[t] = type_dist.get(t, 0) + 1
            print(f"[BedrockService] TRACES distribution: {type_dist}")
    def _enforce_unique_content(self, concepts: List[Dict[str, Any]]) -> None:
        COMPANY_PATTERN = re.compile(r'^([A-Z][A-Za-z\s&\.]+?)[\s]*\((\d{4})\)')
        anchor_registry: Dict[str, str] = {}
        example_registry: Dict[str, str] = {}
        fixes = 0
        for c in concepts:
            name = c.get("name", "unknown")
            mnemonic = c.get("mnemonic") or {}
            raw_anchor = (mnemonic.get("anchor") or "").strip()
            anchor_key = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27bf\ufe0f]', '', raw_anchor).strip().lower()
            if anchor_key and anchor_key in anchor_registry:
                old_owner = anchor_registry[anchor_key]
                new_anchor = f"{raw_anchor} ({name.split()[0]})"
                mnemonic["anchor"] = new_anchor
                fixes += 1
                print(f"[BedrockService] ANCHOR FIX: '{raw_anchor}' duped by '{name}' (first: '{old_owner}') → renamed to '{new_anchor}'")
            elif anchor_key:
                anchor_registry[anchor_key] = name
            example = ((c.get("shape") or {}).get("highStakesExample") or "").strip()
            if example:
                match = COMPANY_PATTERN.match(example)
                key = match.group(1).strip().lower() if match else example[:40].lower()
                if key in example_registry:
                    print(f"[BedrockService] DUPLICATE EXAMPLE: '{key}' used by '{name}' (first: '{example_registry[key]}')")
                else:
                    example_registry[key] = name
        if fixes > 0:
            print(f"[BedrockService] Content uniqueness: fixed {fixes} duplicate anchors across {len(concepts)} concepts")
        else:
            print(f"[BedrockService] Content uniqueness: OK ({len(concepts)} concepts, all unique)")

    @staticmethod
    def _extract_keywords(text: str) -> set:
        words = re.findall(r'[a-zA-Z0-9]+', text.lower())
        return {w for w in words if w not in BedrockService.COVERAGE_STOPWORDS and len(w) > 2}
    @staticmethod
    def _get_concept_text(concept: Dict[str, Any]) -> str:
        parts = [
            (concept.get("name") or "").lower(),
            (concept.get("technicalDetails") or "").lower(),
            " ".join(concept.get("keyPoints", []) if isinstance(concept.get("keyPoints"), list) else []).lower(),
            (concept.get("whyYouNeed") or "").lower(),
            " ".join(
                (p.get("content", "") if isinstance(p, dict) else str(p))
                for p in (concept.get("phase2") or [])
            ).lower(),
        ]
        return " ".join(parts)

    def _objective_covered_by_any_concept(
        self, obj_keywords: set, concept_texts: List[str]
    ) -> bool:
        for text in concept_texts:
            matches = sum(1 for kw in obj_keywords if kw in text)
            if matches / len(obj_keywords) >= 0.6:
                return True
        return False

    def _analyze_coverage_gaps(
        self, concepts: List[Dict[str, Any]], domains: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        concept_texts = [self._get_concept_text(c) for c in concepts]
        gaps_by_domain: Dict[str, List[str]] = {}
        total_objectives = 0
        covered_count = 0
        for domain in domains:
            domain_name = domain.get("name", "")
            subtopics = domain.get("subtopics", [])
            if not subtopics:
                continue
            objectives = []
            for st in subtopics:
                if isinstance(st, str):
                    objectives.append(st)
                elif isinstance(st, dict):
                    for obj in st.get("objectives", []):
                        objectives.append(obj)
                    if not st.get("objectives") and st.get("name"):
                        objectives.append(st["name"])
            missing = []
            for obj in objectives:
                total_objectives += 1
                keywords = self._extract_keywords(obj)
                if len(keywords) < 2:
                    covered_count += 1
                    continue
                if self._objective_covered_by_any_concept(keywords, concept_texts):
                    covered_count += 1
                else:
                    missing.append(obj)
            if missing:
                gaps_by_domain[domain_name] = missing
        total_gaps = sum(len(v) for v in gaps_by_domain.values())
        print(f"[BedrockService] Coverage: {covered_count}/{total_objectives} objectives covered, {total_gaps} gaps in {len(gaps_by_domain)} domains")
        for dn, m in gaps_by_domain.items():
            print(f"[BedrockService]   {dn}: {len(m)} gaps")
            for obj in m:
                print(f"[BedrockService]     - {obj}")
        return gaps_by_domain
    def _detect_scope_creep(
        self, concepts: List[Dict[str, Any]], domains: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        all_objectives = []
        for domain in domains:
            for st in domain.get("subtopics", []):
                if isinstance(st, str):
                    all_objectives.append(st)
                elif isinstance(st, dict):
                    for obj in st.get("objectives", []):
                        all_objectives.append(obj)
                    if not st.get("objectives") and st.get("name"):
                        all_objectives.append(st["name"])
        if not all_objectives:
            return concepts
        obj_keyword_sets = []
        for obj in all_objectives:
            kws = self._extract_keywords(obj)
            if len(kws) >= 2:
                obj_keyword_sets.append(kws)
        if not obj_keyword_sets:
            return concepts
        kept = []
        removed = 0
        for c in concepts:
            level = (c.get("treeLevel") or "leaf").lower().strip()
            if level == "trunk":
                kept.append(c)
                continue
            concept_text = self._get_concept_text(c)
            best_score = 0.0
            for obj_kws in obj_keyword_sets:
                matches = sum(1 for kw in obj_kws if kw in concept_text)
                score = matches / len(obj_kws)
                if score > best_score:
                    best_score = score
            if best_score >= 0.4:
                kept.append(c)
            else:
                removed += 1
                print(f"[BedrockService] Scope-creep removed: '{c.get('name')}' (best objective match: {best_score*100:.0f}%)")
        if removed > 0:
            print(f"[BedrockService] Scope-creep check: removed {removed}/{len(concepts)} concepts")
        else:
            print(f"[BedrockService] Scope-creep check: all {len(concepts)} concepts in-scope")
        return kept

    def _generate_gap_fill(
        self,
        subject: str,
        domains: List[Dict[str, Any]],
        existing_concepts: List[Dict[str, Any]],
        gaps_by_domain: Dict[str, List[str]],
        classification: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        from shared.system_prompt import get_gap_fill_prompt
        all_gap_concepts = []
        domain_tasks = []
        for domain_name, missing in gaps_by_domain.items():
            domain_concepts = [c for c in existing_concepts if c.get("trunkDomain") == domain_name]
            existing_names = [c.get("name", "") for c in domain_concepts]
            existing_branches = [
                c.get("name", "") for c in domain_concepts if c.get("treeLevel") == "branch"
            ]
            domain_tasks.append({
                "domain_name": domain_name,
                "missing": missing,
                "existing_names": existing_names,
                "existing_branches": existing_branches,
            })
        def fill_domain(task_index: int) -> List[Dict[str, Any]]:
            if task_index > 0:
                time.sleep(0.5 * task_index)
            task = domain_tasks[task_index]
            domain_name = task["domain_name"]
            prompt = get_gap_fill_prompt(
                subject=subject,
                domain_name=domain_name,
                existing_concepts=task["existing_names"],
                existing_branches=task["existing_branches"],
                missing_objectives=task["missing"],
            )
            max_tokens = min(32768, max(8192, len(task["missing"]) * 2500))
            print(f"[BedrockService] Gap-fill '{domain_name}': generating {len(task['missing'])} missing concepts (max_tokens={max_tokens})")
            try:
                gap_system = f"You are generating supplementary exam concepts for {subject}, domain: {domain_name}. Fill ONLY the listed coverage gaps. Match the quality and depth of the existing concepts."
                response = self.client.invoke_model(
                    modelId=self.model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": max_tokens,
                        "temperature": 0.3,
                        "system": self._build_cached_system(gap_system),
                        "messages": [{"role": "user", "content": prompt}],
                    }),
                )
                response_body = json.loads(response.get("body").read())
                self._log_cache_metrics(response_body, f"Gap-fill '{domain_name}'")
                raw_content = response_body.get("content", [])[0].get("text", "")
                print(f"[BedrockService] Gap-fill '{domain_name}': got {len(raw_content)} chars")
                parsed = self._parse_concepts_from_response(raw_content)
                for c in parsed:
                    if not c.get("trunkDomain"):
                        c["trunkDomain"] = domain_name
                validated = [c for c in parsed if self._validate_concept(c)]
                print(f"[BedrockService] Gap-fill '{domain_name}': {len(validated)}/{len(parsed)} validated")
                return validated
            except Exception as e:
                print(f"[BedrockService] Gap-fill '{domain_name}' failed: {e}")
                return []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.MAX_WORKERS) as executor:
            futures = [
                executor.submit(fill_domain, i)
                for i in range(len(domain_tasks))
            ]
            for f in futures:
                result = f.result()
                all_gap_concepts.extend(result)
        print(f"[BedrockService] Gap-fill total: {len(all_gap_concepts)} new concepts across {len(gaps_by_domain)} domains")
        return all_gap_concepts
    def _post_process_concepts(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        from shared.utils import generate_id
        for concept in concepts:
            if "id" not in concept:
                concept["id"] = generate_id()
            concept["stageId"] = concept.get("stageId", "PREPARE")
            if "mnemonic" not in concept:
                concept["mnemonic"] = {}
            if not self._validate_scoring_field(concept):
                name_words = [w.lower() for w in concept.get("name", "").split() if len(w) > 2]
                concept["scoring"] = {
                    "keywords": name_words[:5] if name_words else [],
                    "aliases": [],
                }
        self._validate_tree_structure(concepts)
        self._enforce_blooms_distribution(concepts)
        self._enforce_connection_diversity(concepts)
        self._enforce_unique_content(concepts)
        return concepts
    def _repair_json(self, raw_text: str) -> str:
        """
        Repair malformed JSON from LLM output.
        DEFENSIVE REPAIRS:
        1. Remove markdown code fences (```json, ```)
        2. Strip control characters that break parsing
        3. Fix trailing commas before ] or }
        4. Attempt to close unclosed brackets/braces
        5. Remove BOM and other invisible characters
        Args:
            raw_text: Raw text that may contain malformed JSON
        Returns:
            Repaired text ready for json.loads()
        """
        if not raw_text:
            return ""
        text = raw_text.strip()
        repairs_made = []
        # 1. Remove BOM and invisible characters
        text = text.lstrip('\ufeff')
        # 2. Remove markdown code fences
        # Pattern: ```json ... ``` or ``` ... ```
        if text.startswith("```json"):
            text = text[7:]
            repairs_made.append("removed_json_fence_start")
        elif text.startswith("```"):
            text = text[3:]
            repairs_made.append("removed_fence_start")
        if text.endswith("```"):
            text = text[:-3]
            repairs_made.append("removed_fence_end")
        text = text.strip()
        # 3. Remove control characters (except newlines and tabs)
        original_len = len(text)
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
        if len(text) != original_len:
            repairs_made.append("removed_control_chars")
        # 4. Fix trailing commas before ] or }
        # Pattern: ,\s*] or ,\s*}
        original = text
        text = re.sub(r',\s*\]', ']', text)
        text = re.sub(r',\s*\}', '}', text)
        if text != original:
            repairs_made.append("fixed_trailing_commas")
        # 5. Fix missing commas between objects in arrays
        # Pattern: }\s*{ should be },\s*{
        original = text
        text = re.sub(r'\}\s*\{', '},{', text)
        if text != original:
            repairs_made.append("added_missing_commas")
        # 6. Attempt to close unclosed brackets/braces
        # Count brackets to detect imbalance
        open_braces = text.count('{') - text.count('}')
        open_brackets = text.count('[') - text.count(']')
        if open_braces > 0 or open_brackets > 0:
            # Add closing characters
            text += '}' * open_braces
            text += ']' * open_brackets
            repairs_made.append(f"closed_brackets:{open_braces}b,{open_brackets}a")
        # 7. Handle truncated strings (unclosed quotes)
        # This is a heuristic - find last complete object
        if open_braces < 0 or open_brackets < 0:
            # Too many closing brackets - likely truncated input
            # Try to find the last valid array boundary
            last_bracket = text.rfind(']')
            if last_bracket > 0:
                # Check if there's content after that looks incomplete
                after = text[last_bracket+1:].strip()
                if after and not after.startswith(',') and not after.startswith('}'):
                    text = text[:last_bracket+1]
                    repairs_made.append("truncated_after_array")
        if repairs_made:
            print(f"[BedrockService] JSON repairs: {', '.join(repairs_made)}")
        return text
    def _parse_concepts_from_response(self, content: str) -> List[Dict[str, Any]]:
        """
        Robustly parse JSON content, handling common LLM formatting issues.
        MULTI-STAGE PIPELINE:
        1. Repair: Apply _repair_json() to fix common issues
        2. Extract: Try regex to find JSON array
        3. Parse: Attempt direct json.loads()
        4. Recover: Incremental parsing for truncated content
        Args:
            content: Raw response content from LLM
        Returns:
            List of parsed concept dictionaries
        """
        try:
            # Stage 0: Basic validation
            if not content or not content.strip():
                print("[BedrockService] Empty content received")
                return []
            # Stage 1: Apply repairs
            content = self._repair_json(content)
            # Stage 2: Try Regex Extraction first (most reliable for mixed content)
            # Match array containing objects
            json_array_pattern = r'\[\s*\{.*\}\s*\]'
            match = re.search(json_array_pattern, content, re.DOTALL)
            if match:
                json_str = match.group(0)
                try:
                    result = json.loads(json_str)
                    if isinstance(result, list):
                        print(f"[BedrockService] Stage 2 success: {len(result)} concepts via regex")
                        return result
                except json.JSONDecodeError as e:
                    print(f"[BedrockService] Stage 2 partial: regex found but parse failed: {e}")
                    # Continue to next stage
            # Stage 3: Try Direct Parse
            try:
                result = json.loads(content)
                if isinstance(result, list):
                    print(f"[BedrockService] Stage 3 success: {len(result)} concepts via direct parse")
                    return result
                elif isinstance(result, dict) and "concepts" in result:
                    concepts = result["concepts"]
                    print(f"[BedrockService] Stage 3 success: {len(concepts)} concepts from wrapper")
                    return concepts
                elif isinstance(result, dict):
                    # Single concept returned instead of array
                    print("[BedrockService] Stage 3: Single object, wrapping in array")
                    return [result]
            except json.JSONDecodeError:
                pass
            # Stage 4: Incremental recovery for truncated JSON
            # Try to extract individual complete objects
            concepts = []
            decoder = json.JSONDecoder()
            idx = 0
            # Find the start of the array
            array_start = content.find('[')
            if array_start >= 0:
                idx = array_start + 1
            recovered_count = 0
            while idx < len(content):
                # Skip whitespace and array syntax
                while idx < len(content) and content[idx] in ' \t\n\r,[]':
                    idx += 1
                if idx >= len(content):
                    break
                try:
                    obj, end_idx = decoder.raw_decode(content, idx)
                    if isinstance(obj, dict) and "name" in obj:
                        concepts.append(obj)
                        recovered_count += 1
                    elif isinstance(obj, list):
                        concepts.extend(obj)
                        recovered_count += len(obj)
                    idx = end_idx
                except json.JSONDecodeError:
                    # Skip this character and try next position
                    idx += 1
            if concepts:
                print(f"[BedrockService] Stage 4 recovery: {recovered_count} concepts extracted incrementally")
                return concepts
            print("[BedrockService] All parsing stages failed")
            return []
        except Exception as e:
            print(f"[ERROR] Error parsing concepts: {e}")
            return []
    def _validate_scoring_field(self, concept: Dict[str, Any]) -> bool:
        """
        Validate that a concept has proper scoring metadata.
        Args:
            concept: Concept dictionary to validate
        Returns:
            True if scoring is valid, False otherwise
        """
        scoring = concept.get("scoring", {})
        if not isinstance(scoring, dict):
            return False
        keywords = scoring.get("keywords", [])
        aliases = scoring.get("aliases", [])
        # Must have at least some keywords for scoring
        if not isinstance(keywords, list) or len(keywords) < 1:
            return False
        # Aliases are optional but must be a list if present
        if not isinstance(aliases, list):
            return False
        return True
