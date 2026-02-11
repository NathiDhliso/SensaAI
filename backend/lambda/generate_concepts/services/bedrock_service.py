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
    def generate_concepts(self, subject: str, context: str = "") -> tuple:
        from shared.system_prompt import get_silver_bullet_prompt
        classification = self.classify_subject(subject, context)
        def generate_part_with_retry(part_num: int) -> List[Dict[str, Any]]:
            if part_num > 1:
                time.sleep(1.5 * part_num)
            prompt = get_silver_bullet_prompt(subject, part_num, context, classification)
            last_error = None
            print(f"[BedrockService] Part {part_num}: Starting with model={self.model_id}")
            for attempt in range(self.MAX_RETRIES):
                try:
                    print(f"[BedrockService] Part {part_num}: Attempt {attempt + 1}/{self.MAX_RETRIES}")
                    response = self.client.invoke_model(
                        modelId=self.model_id,
                        contentType="application/json",
                        accept="application/json",
                        body=json.dumps({
                            "anthropic_version": "bedrock-2023-05-31",
                            "max_tokens": 16384,
                            "temperature": 0.7,
                            "messages": [{"role": "user", "content": prompt}],
                        }),
                    )
                    response_body = json.loads(response.get("body").read())
                    raw_content = response_body.get("content", [])[0].get("text", "")
                    print(f"[BedrockService] Part {part_num}: Got {len(raw_content)} chars")
                    parsed = self._parse_concepts_from_response(raw_content)
                    print(f"[BedrockService] Part {part_num}: Parsed {len(parsed)} concepts")
                    validated = [c for c in parsed if self._validate_concept(c)]
                    print(f"[BedrockService] Part {part_num}: Validated {len(validated)} concepts")
                    if validated:
                        return validated
                    last_error = f"Part {part_num}: All {len(parsed)} concepts failed validation"
                except Exception as e:
                    last_error = str(e)
                    print(f"[BedrockService] Part {part_num}: Error on attempt {attempt + 1}: {last_error}")
                    if attempt < self.MAX_RETRIES - 1:
                        sleep_time = self.RETRY_BACKOFF_BASE ** (attempt + 1)
                        time.sleep(sleep_time)
            print(f"[ERROR] generate_part_with_retry failed after {self.MAX_RETRIES} attempts: {last_error}")
            return []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.MAX_WORKERS) as executor:
            futures = [
                executor.submit(generate_part_with_retry, i)
                for i in range(1, self.NUM_PARTITIONS + 1)
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
    def _validate_concept(self, concept: Dict[str, Any]) -> bool:
        """
        Validate that a concept has mandatory fields for frontend rendering.
        Tier is NOT required from LLM — it is computed from the connection graph.
        """
        if not isinstance(concept, dict):
            return False
        if not concept.get("name"):
            return False
        mnemonic = concept.get("mnemonic", {})
        if not isinstance(mnemonic, dict):
            return False
        if not mnemonic.get("anchor") and not mnemonic.get("story"):
            return False
        shape = concept.get("shape", {})
        if not isinstance(shape, dict):
            return False
        if not shape.get("simpleCore"):
            return False
        connections = concept.get("connections", [])
        if not isinstance(connections, list) or len(connections) < 1:
            print(f"[BedrockService] Validation fail: '{concept.get('name')}' has no connections")
            return False
        valid_levels = {"remember", "understand", "apply", "analyze", "evaluate", "create"}
        level = (concept.get("cognitiveLevel") or "").lower().strip()
        if level not in valid_levels:
            print(f"[BedrockService] Validation fail: '{concept.get('name')}' missing cognitiveLevel")
            return False
        return True
    def _compute_tiers_from_graph(self, concepts: List[Dict[str, Any]]) -> None:
        """
        Compute tiers deterministically from the connection graph.
        Algorithm:
        - Build a directed graph from connections (requires, enables, etc.)
        - For directional types (requires, enables, is-part-of, is-type-of, causes, constrains),
        determine which direction implies "A depends on B" vs "A is depended upon by B"
        - Compute in-degree (how many concepts point TO this one) and
        out-degree (how many concepts this one points TO)
        - Assign tiers:
            ROOT: in_degree == 0 AND out_degree >= 1 (entry points)
            TRUNK: in_degree >= 1 AND out_degree >= 1 (connectors)
            LEAF: out_degree == 0 OR isolated (terminal/specialized)
        """
        name_to_idx = {}
        for i, c in enumerate(concepts):
            key = c.get("name", "").strip().lower()
            if key:
                name_to_idx[key] = i
        n = len(concepts)
        in_degree = [0] * n
        out_degree = [0] * n
        DEPENDENCY_TYPES = {"requires", "is-part-of", "is-type-of"}
        ENABLEMENT_TYPES = {"enables", "causes", "constrains"}
        total_connections = 0
        phantom_connections = 0
        for i, concept in enumerate(concepts):
            connections = concept.get("connections", [])
            if not isinstance(connections, list):
                continue
            for conn in connections:
                if not isinstance(conn, dict):
                    continue
                target_name = conn.get("target", "").strip().lower()
                conn_type = conn.get("type", "").strip().lower()
                target_idx = name_to_idx.get(target_name)
                total_connections += 1
                if target_idx is None:
                    phantom_connections += 1
                    continue
                if conn_type in DEPENDENCY_TYPES:
                    out_degree[i] += 1
                    in_degree[target_idx] += 1
                elif conn_type in ENABLEMENT_TYPES:
                    in_degree[i] += 1
                    out_degree[target_idx] += 1
                else:
                    out_degree[i] += 1
                    in_degree[target_idx] += 1
        for i, concept in enumerate(concepts):
            ind = in_degree[i]
            outd = out_degree[i]
            if ind == 0 and outd >= 1:
                concept["tier"] = "root"
            elif ind >= 1 and outd >= 1:
                concept["tier"] = "trunk"
            else:
                concept["tier"] = "leaf"
        tier_counts = {"root": 0, "trunk": 0, "leaf": 0}
        for c in concepts:
            tier_counts[c["tier"]] = tier_counts.get(c["tier"], 0) + 1
        print(f"[BedrockService] Tier distribution: {tier_counts}")
        if total_connections > 0:
            phantom_pct = (phantom_connections / total_connections) * 100
            print(f"[BedrockService] Connections: {total_connections} total, {phantom_connections} phantom ({phantom_pct:.0f}%)")
            if phantom_pct > 10:
                print(f"[WARNING] >10% phantom connections — tier distribution may be distorted")
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
    def _post_process_concepts(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Post-process concepts: assign IDs, compute tiers from connection graph,
        enforce Bloom's distribution, and normalize required fields.
        """
        from shared.utils import generate_id
        for concept in concepts:
            if "id" not in concept:
                concept["id"] = generate_id()
            concept.pop("tier", None)
            concept.pop("tierJustification", None)
            concept["stageId"] = concept.get("stageId", "PREPARE")
            if "mnemonic" not in concept:
                concept["mnemonic"] = {}
            if not self._validate_scoring_field(concept):
                name_words = [w.lower() for w in concept.get("name", "").split() if len(w) > 2]
                concept["scoring"] = {
                    "keywords": name_words[:5] if name_words else [],
                    "aliases": [],
                }
        self._compute_tiers_from_graph(concepts)
        self._enforce_blooms_distribution(concepts)
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
