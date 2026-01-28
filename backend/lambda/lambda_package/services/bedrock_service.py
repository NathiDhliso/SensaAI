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
    RETRY_BACKOFF_BASE = 2  # Exponential backoff: 2, 4, 8 seconds
    MIN_CONCEPTS_THRESHOLD = 40  # Minimum acceptable concepts for success
    MAX_WORKERS = 3  # Concurrent API requests
    NUM_PARTITIONS = 5  # Number of parallel generation parts

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

    def generate_concepts(self, subject: str, context: str = "") -> List[Dict[str, Any]]:
        """
        Generate concepts using parallel partitioned requests.
        
        This method splits generation into 5 parallel requests to bypass
        token limits and maximize throughput.
        
        Args:
            subject: The subject to generate concepts for
            context: Additional context for generation
            
        Returns:
            List of validated concept dictionaries
        """
        from shared.system_prompt import get_silver_bullet_prompt

        def generate_part_with_retry(part_num: int) -> List[Dict[str, Any]]:
            """Generate a single partition with retry logic."""
            # Stagger start times to avoid rate limits
            if part_num > 1:
                time.sleep(1.5 * part_num)

            prompt = get_silver_bullet_prompt(subject, part_num, context)
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
                            "max_tokens": 8192,
                            "temperature": 0.7,
                            "messages": [{"role": "user", "content": prompt}],
                        }),
                    )

                    response_body = json.loads(response.get("body").read())
                    raw_content = response_body.get("content", [])[0].get("text", "")
                    print(f"[BedrockService] Part {part_num}: Got {len(raw_content)} chars")

                    parsed = self._parse_concepts_from_response(raw_content)
                    print(f"[BedrockService] Part {part_num}: Parsed {len(parsed)} concepts")

                    # Validate each concept
                    validated = [c for c in parsed if self._validate_concept(c)]
                    print(f"[BedrockService] Part {part_num}: Validated {len(validated)} concepts")

                    if validated:
                        return validated

                    last_error = f"Part {part_num}: All {len(parsed)} concepts failed validation"

                except Exception as e:
                    last_error = str(e)
                    print(f"[BedrockService] Part {part_num}: Error on attempt {attempt + 1}: {last_error}")

                # Exponential backoff (except on last attempt)
                if attempt < self.MAX_RETRIES - 1:
                    sleep_time = self.RETRY_BACKOFF_BASE ** (attempt + 1)
                    time.sleep(sleep_time)

            print(f"[ERROR] generate_part_with_retry failed after {self.MAX_RETRIES} attempts: {last_error}")
            return []

        # Run all parts in parallel with controlled concurrency
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.MAX_WORKERS) as executor:
            futures = [
                executor.submit(generate_part_with_retry, i)
                for i in range(1, self.NUM_PARTITIONS + 1)
            ]
            results = [f.result() for f in futures]

        # Combine all results
        all_concepts = []
        for part_concepts in results:
            all_concepts.extend(part_concepts)

        # Filter and validate
        all_concepts = [
            c for c in all_concepts if isinstance(c, dict) and c.get("name")
        ]

        # Check minimum threshold
        if len(all_concepts) < self.MIN_CONCEPTS_THRESHOLD:
            print(f"[WARNING] Only {len(all_concepts)} concepts (threshold: {self.MIN_CONCEPTS_THRESHOLD})")

        # Post-process: assign tiers/stages
        all_concepts = self._post_process_concepts(all_concepts)

        return all_concepts

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
                    "temperature": 0.5,  # Lower temperature for precision
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
        
        Args:
            concept: Concept dictionary to validate
            
        Returns:
            True if concept is valid, False otherwise
        """
        if not isinstance(concept, dict):
            return False

        # Must have a name
        if not concept.get("name"):
            return False

        # Must have tier (foundation, keystone, utility)
        valid_tiers = {"foundation", "keystone", "utility"}
        if concept.get("tier") not in valid_tiers:
            return False

        # Must have mnemonic with at least anchor or story
        mnemonic = concept.get("mnemonic", {})
        if not isinstance(mnemonic, dict):
            return False
        if not mnemonic.get("anchor") and not mnemonic.get("story"):
            return False

        # Must have SHAPE with at least simpleCore
        shape = concept.get("shape", {})
        if not isinstance(shape, dict):
            return False
        if not shape.get("simpleCore"):
            return False

        return True

    def _post_process_concepts(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Post-process concepts to ensure required fields and tier assignment.
        
        Args:
            concepts: List of concepts to process
            
        Returns:
            Processed concepts with IDs, tiers, and stages
        """
        from shared.utils import generate_id

        for i, concept in enumerate(concepts):
            if "id" not in concept:
                concept["id"] = generate_id()

            # Ensure tier consistency based on position
            if i < 14:  # First 20%
                concept["tier"] = concept.get("tier", "foundation")
            elif i < 42:  # Next 40%
                concept["tier"] = concept.get("tier", "keystone")
            else:
                concept["tier"] = concept.get("tier", "utility")

            # Normalize fields
            concept["stageId"] = concept.get("stageId", "PREPARE")
            if "mnemonic" not in concept:
                concept["mnemonic"] = {}

        return concepts

    def _parse_concepts_from_response(self, content: str) -> List[Dict[str, Any]]:
        """
        Robustly parse JSON content, handling common LLM formatting issues.
        
        Handles:
        - Markdown code blocks
        - Trailing commas
        - Truncated JSON
        - Mixed content
        
        Args:
            content: Raw response content from LLM
            
        Returns:
            List of parsed concept dictionaries
        """
        try:
            # 1. Strip markdown
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            # 2. Try Regex Extraction first (most reliable for mixed content)
            json_array_pattern = r'\[\s*\{.*?\}\s*\]'
            match = re.search(json_array_pattern, content, re.DOTALL)

            if match:
                json_str = match.group(0)
                try:
                    result = json.loads(json_str)
                    return result
                except json.JSONDecodeError:
                    pass

            # 3. Try Direct Parse
            try:
                result = json.loads(content)
                if isinstance(result, list):
                    return result
                elif isinstance(result, dict) and "concepts" in result:
                    return result["concepts"]
            except json.JSONDecodeError:
                pass

            # 4. Try robust extraction for truncated JSON
            concepts = []
            decoder = json.JSONDecoder()
            idx = 0
            
            while idx < len(content):
                try:
                    obj, end_idx = decoder.raw_decode(content, idx)
                    if isinstance(obj, dict) and "name" in obj:
                        concepts.append(obj)
                    elif isinstance(obj, list):
                        concepts.extend(obj)
                    idx = end_idx
                    # Skip whitespace/commas
                    while idx < len(content) and content[idx] in ' \t\n\r,[]':
                        idx += 1
                except json.JSONDecodeError:
                    idx += 1

            if concepts:
                return concepts

            return []

        except Exception as e:
            print(f"[ERROR] Error parsing concepts: {e}")
            return []
