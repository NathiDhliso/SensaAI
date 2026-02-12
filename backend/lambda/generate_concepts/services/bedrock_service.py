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
    NUM_PARTITIONS = 5 # Number of parallel generation parts
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
            "BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0"
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
    def generate_concepts(self, subject: str, context: str = "", trunks: list = None) -> tuple:
        from shared.system_prompt import get_tree_generation_prompt, _get_exam_domains
        if trunks and len(trunks) >= 2:
            print(f"[BedrockService] Using {len(trunks)} user-defined trunks (skipping classification)")
            equal_weight = round(1.0 / len(trunks), 2)
            domains = [{"name": t, "weight": equal_weight, "subtopics": []} for t in trunks]
            classification = self.classify_subject(subject, context)
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
                time.sleep(1.5 * domain_index)
            domain = domains[domain_index]
            prompt = get_tree_generation_prompt(
                subject=subject,
                domain=domain,
                domain_index=domain_index,
                total_domains=num_partitions,
                context=context,
                classification=classification,
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
                            "max_tokens": 16384,
                            "temperature": 0.3,
                            "system": system_msg,
                            "messages": [{"role": "user", "content": user_msg}],
                        }),
                    )
                    response_body = json.loads(response.get("body").read())
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
        all_concepts = self._post_process_concepts(all_concepts)
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
        user_part += "\n\nIMPORTANT REMINDER: Every field must contain REAL technical content specific to the concept. Do NOT use placeholder patterns like 'Why X matters', 'Think of X as a building block', 'Detailed explanation of Y', 'Proper use of X vs Common misunderstanding', or empty Q/A fields. Concepts with generic filler will be rejected and you will be asked to regenerate. Write as if you are a subject matter expert authoring a study guide."
        return system_part, user_part
    TEMPLATE_REGEX_PATTERNS = None

    @classmethod
    def _get_template_patterns(cls):
        if cls.TEMPLATE_REGEX_PATTERNS is None:
            cls.TEMPLATE_REGEX_PATTERNS = [
                re.compile(r"^why\s+.+\s+matters", re.IGNORECASE),
                re.compile(r"^think of\s+.+\s+as a", re.IGNORECASE),
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
        exam = concept.get("examFocus", [])
        if isinstance(exam, list):
            for item in exam:
                text = item if isinstance(item, str) else str(item)
                if self._is_template_content(text, name):
                    print(f"[BedrockService] Template examFocus in '{name}': '{text[:80]}'")
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
        name_set = {c.get("name", "").strip().lower() for c in concepts if c.get("name")}
        branch_names = {c.get("name", "").strip().lower() for c in concepts if c.get("treeLevel") == "branch"}
        trunk_names = {c.get("name", "").strip().lower() for c in concepts if c.get("treeLevel") == "trunk"}
        total_connections = 0
        enables_count = 0
        for concept in concepts:
            connections = concept.get("connections", [])
            if not isinstance(connections, list):
                concept["connections"] = []
                connections = concept["connections"]
            for conn in connections:
                if not isinstance(conn, dict):
                    continue
                conn_type = (conn.get("type") or "enables").lower().strip()
                if conn_type in LEGACY_MAP:
                    conn["type"] = LEGACY_MAP[conn_type]
                    conn_type = conn["type"]
                if conn_type not in VALID_TYPES:
                    conn["type"] = "enables"
                    conn_type = "enables"
                total_connections += 1
                if conn_type == "enables":
                    enables_count += 1
            level = concept.get("treeLevel", "leaf")
            parent = concept.get("parentName", "")
            if len(connections) < 2 and level != "trunk":
                existing_targets = {(c.get("target") or "").strip().lower() for c in connections}
                if parent and parent.strip().lower() not in existing_targets:
                    connections.append({"target": parent, "type": "is-part-of"})
        if total_connections > 0:
            enables_pct = enables_count / total_connections
            print(f"[BedrockService] TRACES: {enables_count}/{total_connections} enables ({enables_pct*100:.0f}%)")
            if enables_pct > 0.40:
                CONSTRAINT_KEYWORDS = [
                    "security", "policy", "rbac", "role", "permission", "limit",
                    "quota", "budget", "compliance", "governance", "lock", "firewall",
                    "nsg", "rule", "restrict", "deny", "block", "filter", "scope",
                ]
                PREREQUISITE_KEYWORDS = [
                    "identity", "authentication", "network", "vnet", "subnet",
                    "resource group", "subscription", "tenant", "dns", "ip address",
                    "storage account", "key vault", "certificate",
                ]
                CAUSAL_KEYWORDS = [
                    "trigger", "alert", "event", "log", "metric", "diagnostic",
                    "backup", "failover", "replication", "scaling", "autoscale",
                    "deployment", "provision", "migration",
                ]
                TAXONOMIC_KEYWORDS = [
                    "type", "kind", "tier", "sku", "variant", "mode", "class",
                    "category", "family", "series", "generation",
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
