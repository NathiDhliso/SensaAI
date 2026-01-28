"""
Generate Concepts Lambda Handler

Receives a generation request, invokes Bedrock Claude, parses concepts,
and stores them in DynamoDB for paginated retrieval.
"""
import json
import os
import re
import time
from typing import Any, Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from botocore.config import Config

# Import shared utilities
from shared.utils import (
    generate_id,
    get_ttl_timestamp,
    create_pk,
    create_sk,
    create_gsi1_pk,
    create_gsi1_sk,
    create_subject_sk,
    api_response,
    TIERS,
    STAGES,
)
from shared.system_prompt import get_system_prompt, get_surgical_fix_prompt

# Environment variables
CONCEPTS_TABLE = os.environ.get("CONCEPTS_TABLE", "sensapbl-concepts-pilot")
JOBS_TABLE = os.environ.get("JOBS_TABLE", "sensapbl-jobs-pilot")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "pilot")

# AWS clients
dynamodb = boto3.resource("dynamodb")
bedrock = boto3.client(
    "bedrock-runtime",
    region_name="us-east-1",
    config=Config(
        retries={"max_attempts": 3, "mode": "adaptive"},
        read_timeout=900,
    ),
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for content generation
    
    Expects:
    - body.subject: Subject to generate content for
    - body.userId: User ID for storage
    - body.sessionId: Session ID for this generation
    - body.context: Optional additional context
    """
    print(f"[Lambda] Handler invoked with event type: {type(event)}")
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        subject = body.get("subject")
        user_id = body.get("userId", "anonymous")
        session_id = body.get("sessionId", generate_id())
        job_id = body.get("jobId", generate_id())
        context_text = body.get("context", "")
        action = body.get("action", "generate")
        
        print(f"[Lambda] Parsed request: subject={subject}, userId={user_id}, sessionId={session_id}, jobId={job_id}, action={action}")
        
        if action == "repair":
            concept_name = body.get("conceptName")
            issue = body.get("issue")
            if not concept_name or not issue:
                return api_response(400, {"error": "conceptName and issue are required for repair"})
                
            repaired_concept = repair_concept_with_bedrock(subject, concept_name, issue)
            if not repaired_concept:
                return api_response(500, {"error": "Failed to repair concept"})
                
            return api_response(200, {
                "status": "completed",
                "concept": repaired_concept
            })
        
        if not subject:
            print("[Lambda] ERROR: Subject is required")
            return api_response(400, {"error": "Subject is required"})
        
        # Create job record
        print(f"[Lambda] Creating initial job record in DynamoDB for jobId={job_id}...")
        jobs_table = dynamodb.Table(JOBS_TABLE)
        jobs_table.put_item(
            Item={
                "jobId": job_id,
                "userId": user_id,
                "sessionId": session_id,
                "subject": subject,
                "status": "in_progress",
                "createdAt": get_ttl_timestamp(0),
                "expiresAt": get_ttl_timestamp(24),  # TTL after 24 hours
            }
        )
        print("[Lambda] Job record created")
        
        # Generate content with Bedrock
        print(f"[Lambda] Starting Bedrock generation for subject: {subject}")
        try:
            concepts = generate_concepts_with_bedrock(subject, context_text)
            print(f"[Lambda] Bedrock generation complete. Got {len(concepts)} concepts")
        except Exception as e:
            # Update job status on failure
            print(f"[Lambda] ERROR: Bedrock generation failed: {str(e)}")
            jobs_table.update_item(
                Key={"jobId": job_id, "userId": user_id},
                UpdateExpression="SET #status = :status, #error = :error",
                ExpressionAttributeNames={"#status": "status", "#error": "error"},
                ExpressionAttributeValues={":status": "failed", ":error": str(e)},
            )
            return api_response(500, {"error": f"Generation failed: {str(e)}"})
        
        # Store concepts in DynamoDB
        print(f"[Lambda] Storing {len(concepts)} concepts to DynamoDB...")
        concepts_table = dynamodb.Table(CONCEPTS_TABLE)
        store_concepts(concepts_table, user_id, session_id, concepts, subject)
        print("[Lambda] Concepts stored successfully")
        
        # Update job status to completed
        print(f"[Lambda] Updating job status to 'completed' for jobId={job_id}")
        jobs_table.update_item(
            Key={"jobId": job_id, "userId": user_id},
            UpdateExpression="SET #status = :status, conceptCount = :count",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": "completed",
                ":count": len(concepts),
            },
        )
        print(f"[Lambda] Job status updated to 'completed'. Returning success response.")
        
        return api_response(200, {
            "jobId": job_id,
            "sessionId": session_id,
            "status": "completed",
            "conceptCount": len(concepts),
        })
        
    except Exception as e:
        print(f"[Lambda] UNHANDLED ERROR: {str(e)}")
        return api_response(500, {"error": str(e)})


import concurrent.futures

def generate_concepts_with_bedrock(subject: str, context: str = "") -> List[Dict[str, Any]]:
    """
    Silver Bullet Generation: Parallel execution for maximum speed and volume.
    Splits the 70 concepts into 5 parallel requests to bypass token limits.
    
    Hardening (v4.1):
    - Retry logic with exponential backoff per partition
    - Concept validation for mandatory fields
    - Minimum concept threshold for partial failure detection
    """
    # get_silver_bullet_prompt is imported at module level
    from shared.system_prompt import get_silver_bullet_prompt
    import time
    
    MAX_RETRIES = 3
    RETRY_BACKOFF_BASE = 2  # Exponential backoff: 2, 4, 8 seconds
    MIN_CONCEPTS_THRESHOLD = 40  # Minimum acceptable concepts for a successful job
    
    def validate_concept(concept: Dict[str, Any]) -> bool:
        """Validate that a concept has mandatory fields for frontend rendering."""
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
    
    def generate_part_with_retry(part_num: int) -> List[Dict[str, Any]]:
        """Generate a single partition with retry logic."""
        # Stagger start times to avoid hitting API rate limits all at once
        # Part 1 starts immediately, others wait 1.5s * part_num
        if part_num > 1:
            time.sleep(1.5 * part_num)
            
        prompt = get_silver_bullet_prompt(subject, part_num, context)
        last_error = None
        
        # Use environment variable for model ID with fallback to Sonnet 3.5
        model_id = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
        print(f"[Lambda] Part {part_num}: Starting Bedrock call with model={model_id}")
        
        for attempt in range(MAX_RETRIES):
            try:
                print(f"[Lambda] Part {part_num}: Attempt {attempt + 1}/{MAX_RETRIES}")
                response = bedrock.invoke_model(
                    modelId=model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 8192,
                        "temperature": 0.7,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ]
                    })
                )
                
                response_body = json.loads(response.get("body").read())
                raw_content = response_body.get("content", [])[0].get("text", "")
                print(f"[Lambda] Part {part_num}: Got {len(raw_content)} chars from Bedrock")
                
                parsed = parse_concepts_from_response(raw_content)
                print(f"[Lambda] Part {part_num}: Parsed {len(parsed)} concepts")
                
                # Validate each concept
                validated = [c for c in parsed if validate_concept(c)]
                print(f"[Lambda] Part {part_num}: Validated {len(validated)} concepts")
                
                # If we got at least some valid concepts, return them
                if validated:
                    return validated
                
                # If parse succeeded but validation failed for all, retry
                last_error = f"Part {part_num}: All {len(parsed)} concepts failed validation"
                
            except Exception as e:
                last_error = str(e)
                print(f"[Lambda] Part {part_num}: Error on attempt {attempt + 1}: {last_error}")
            
            # Exponential backoff before retry (except on last attempt)
            if attempt < MAX_RETRIES - 1:
                sleep_time = RETRY_BACKOFF_BASE ** (attempt + 1)
                time.sleep(sleep_time)
        
        # All retries exhausted
        # Log error for debugging (will appear in CloudWatch)
        print(f"[ERROR] generate_part_with_retry failed after {MAX_RETRIES} attempts: {last_error}")
        return []

    # Run all 5 parts with staggered start and controlled concurrency to avoid throttling
    # Changed from 4 to 5 parts (smaller batches = more reliable)
    # Reduced max_workers to 3 to reduce rate limiting probability
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        # Add a small delay based on part number to stagger the API calls
        futures = []
        for i in range(1, 6):
            # We don't sleep here because submit is instant, we sleep inside the task
            futures.append(executor.submit(generate_part_with_retry, i))
            
        results = [f.result() for f in futures]
    
    all_expanded_concepts = []
    for part_concepts in results:
        all_expanded_concepts.extend(part_concepts)
    
    # Filter out any non-dict items or items without names that might have slipped through
    all_expanded_concepts = [c for c in all_expanded_concepts if isinstance(c, dict) and c.get("name")]
    
    # Check minimum threshold
    if len(all_expanded_concepts) < MIN_CONCEPTS_THRESHOLD:
        print(f"[WARNING] Only {len(all_expanded_concepts)} concepts generated (threshold: {MIN_CONCEPTS_THRESHOLD})")
        # We still return what we have, but the caller can check the count
    
    # Post-process: assign tiers/stages if missing
    for i, concept in enumerate(all_expanded_concepts):
        if "id" not in concept:
            concept["id"] = generate_id()
        
        # Ensure tier consistency based on position if not already set correctly
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
            
    return all_expanded_concepts


def repair_concept_with_bedrock(subject: str, concept_name: str, issue: str) -> Optional[Dict[str, Any]]:
    """
    Surgically repair a single concept using Bedrock
    """
    prompt = get_surgical_fix_prompt(subject, concept_name, issue)
    
    try:
        # Use environment variable for model ID with fallback to Sonnet 3.5
        model_id = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
        
        response = bedrock.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "temperature": 0.5, # Lower temperature for precision
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })
        )
        
        response_body = json.loads(response.get("body").read())
        content = response_body.get("content", [])[0].get("text", "")
        
        # Parse the single concept
        concepts = parse_concepts_from_response(content)
        if concepts and len(concepts) > 0:
            return concepts[0]
            
        return None
        
    except Exception as e:
        print(f"[ERROR] Repair failed: {e}")
        return None


def parse_concepts_from_response(content: str) -> List[Dict[str, Any]]:
    """
    Robustly parsing of JSON content, handling common LLM formatting issues
    like markdown blocks, trailing commas, or truncation.
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
        
        # logger.info(f"PARSE_CONCEPTS: content starts with '{content[:100]}...'")

        # 2. Try Regex Extraction first (most reliable for mixed content)
        # Matches [ ... ] block
        json_array_pattern = r'\[\s*\{.*?\}\s*\]'
        match = re.search(json_array_pattern, content, re.DOTALL)
        
        if match:
            json_str = match.group(0)
            try:
                result = json.loads(json_str)
                # logger.info(f"PARSE_CONCEPTS: regex extraction found {len(result)} items")
                return result
            except json.JSONDecodeError as e:
                pass
                # logger.warning(f"PARSE_CONCEPTS: regex extraction failed: {e}")
        
        # 3. Try Direct Parse
        try:
            result = json.loads(content)
            if isinstance(result, list):
                # logger.info(f"PARSE_CONCEPTS: direct parse found {len(result)} items")
                return result
            elif isinstance(result, dict) and "concepts" in result:
                # logger.info(f"PARSE_CONCEPTS: dict parse found {len(result['concepts'])} concepts")
                return result["concepts"]
        except json.JSONDecodeError:
            pass

        # 4. Try robust extraction for truncated JSON
        # logger.info("Trying robust extraction for truncated JSON...")
        concepts = []
        # Find all complete JSON objects { ... }
        # This regex balances braces to some extent but isn't perfect
        # A simple approach: split by "}," and re-assemble
        
        # Better: iteratively find largest valid JSON objects
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
                idx += 1 # Advance character by character if stuck
                
        if concepts:
            # logger.info(f"Robust extraction found {len(concepts)} concepts")
            return concepts

        return []

    except Exception as e:
        # logger.error(f"Error parsing concepts: {e}")
        return []


def assign_tier_by_position(index: int, total: int) -> str:
    """Assign tier based on concept position"""
    if index < total * 0.3:
        return "foundation"
    elif index < total * 0.7:
        return "keystone"
    else:
        return "utility"


def assign_stage_by_tier(tier: str) -> str:
    """Assign default stage based on tier"""
    stage_mapping = {
        "foundation": "PREPARE",
        "keystone": "MODEL",
        "utility": "DELIVER",
    }
    return stage_mapping.get(tier, "PREPARE")


def store_concepts(table: Any, user_id: str, session_id: str, concepts: List[Dict[str, Any]], subject_name: str) -> None:
    """
    Store concepts in DynamoDB using batch write for efficiency.
    Also stores a Metadata Item to allow listing subjects by user.
    """
    from shared.utils import create_pk, create_sk, create_gsi1_pk, create_gsi1_sk, create_subject_sk, get_ttl_timestamp, generate_id

    pk = create_pk(user_id, session_id)
    gsi1_pk = create_gsi1_pk(user_id, session_id)
    
    # Metadata item for listing subjects
    # PK = USER#{userId}, SK = SUBJECT#{sessionId}
    # This allows Querying PK=USER#{userId} to get all subjects for that user
    user_pk = f"USER#{user_id}"
    subject_sk = create_subject_sk(session_id)
    
    metadata_item = {
        "PK": user_pk,
        "SK": subject_sk,
        "GSI1PK": user_pk, # Optional: if we want to sort/filter by user in GSI
        "GSI1SK": subject_sk,
        "userId": user_id,
        "sessionId": session_id,
        "subject": subject_name,
        "conceptCount": len(concepts),
        "createdAt": get_ttl_timestamp(0),
        "updatedAt": get_ttl_timestamp(0),
        "expiresAt": get_ttl_timestamp(168), # 7 days
        "type": "SUBJECT_METADATA"
    }

    # Batch write in chunks of 25 (DynamoDB limit)
    with table.batch_writer() as batch:
        # 1. Write the metadata item first
        batch.put_item(Item=metadata_item)

        # 2. Write all concepts
        for concept in concepts:
            concept_id = concept.get("id", generate_id())
            tier = concept.get("tier", "foundation")
            
            batch.put_item(
                Item={
                    "PK": pk,
                    "SK": create_sk(tier, concept_id),
                    "GSI1PK": gsi1_pk,
                    "GSI1SK": create_gsi1_sk(tier, concept_id),
                    "conceptId": concept_id,
                    "tier": tier,
                    "stageId": concept.get("stageId", "PREPARE"),
                    "name": concept.get("name", "Unnamed Concept"),
                    "description": concept.get("description", ""),
                    "tierJustification": concept.get("tierJustification", ""),
                    "whyYouNeed": concept.get("whyYouNeed", ""),
                    "technicalDetails": concept.get("technicalDetails", ""),
                    "workedExample": concept.get("workedExample", {}),
                    "keyPoints": concept.get("keyPoints", []),
                    "cognitiveLevel": concept.get("cognitiveLevel", "understand"),
                    "commonPitfalls": concept.get("commonPitfalls", []),
                    "prerequisiteWeight": str(concept.get("prerequisiteWeight", 0.5)),
                    "displayProperties": concept.get("displayProperties", {}),
                    # Store full SENSA learning science data
                    "mnemonic": concept.get("mnemonic", {}),
                    "phase1": concept.get("phase1", {}),
                    "phase2": concept.get("phase2", []),
                    "phase3": concept.get("phase3", {}),
                    "shape": concept.get("shape", {}),
                    "criticalDistinctions": concept.get("criticalDistinctions", []),
                    "designBoundaries": concept.get("designBoundaries", []),
                    "examFocus": concept.get("examFocus", []),
                    "dependencies": concept.get("dependencies", []),
                    "connections": concept.get("connections", []),
                    "outdegree": concept.get("outdegree", 0),
                    "createdAt": get_ttl_timestamp(0),
                    "expiresAt": get_ttl_timestamp(168),  # TTL after 7 days
                }
            )
