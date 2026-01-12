"""
Generate Concepts Lambda Handler

Receives a generation request, invokes Bedrock Claude, parses concepts,
and stores them in DynamoDB for paginated retrieval.
"""
import json
import os
import re
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
    api_response,
    TIERS,
    STAGES,
)
from shared.system_prompt import get_system_prompt

# Environment variables
CONCEPTS_TABLE = os.environ.get("CONCEPTS_TABLE", "sensapbl-concepts-dev")
JOBS_TABLE = os.environ.get("JOBS_TABLE", "sensapbl-jobs-dev")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

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
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        subject = body.get("subject")
        user_id = body.get("userId", "anonymous")
        session_id = body.get("sessionId", generate_id())
        context_text = body.get("context", "")
        
        if not subject:
            return api_response(400, {"error": "Subject is required"})
        
        # Create job record
        job_id = generate_id()
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
        
        # Generate content with Bedrock
        try:
            concepts = generate_concepts_with_bedrock(subject, context_text)
        except Exception as e:
            # Update job status on failure
            jobs_table.update_item(
                Key={"jobId": job_id, "userId": user_id},
                UpdateExpression="SET #status = :status, #error = :error",
                ExpressionAttributeNames={"#status": "status", "#error": "error"},
                ExpressionAttributeValues={":status": "failed", ":error": str(e)},
            )
            return api_response(500, {"error": f"Generation failed: {str(e)}"})
        
        # Store concepts in DynamoDB
        concepts_table = dynamodb.Table(CONCEPTS_TABLE)
        store_concepts(concepts_table, user_id, session_id, concepts, subject)
        
        # Update job status to completed
        jobs_table.update_item(
            Key={"jobId": job_id, "userId": user_id},
            UpdateExpression="SET #status = :status, conceptCount = :count",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": "completed",
                ":count": len(concepts),
            },
        )
        
        return api_response(200, {
            "jobId": job_id,
            "sessionId": session_id,
            "status": "completed",
            "conceptCount": len(concepts),
        })
        
    except Exception as e:
        return api_response(500, {"error": str(e)})


import concurrent.futures

def generate_concepts_with_bedrock(subject: str, context: str = "") -> List[Dict[str, Any]]:
    """
    Silver Bullet Generation: Parallel execution for maximum speed and volume.
    Splits the 70 concepts into 2 parallel requests (Part 1 & Part 2) to bypass token limits.
    """
    from shared.system_prompt import get_silver_bullet_prompt
    
    # Logging removed to prevent stdout capture by local dev server
    # silver_bullet_prompt = get_silver_bullet_prompt(subject)
    
    def generate_part(part_num: int):
        prompt = get_silver_bullet_prompt(subject, part_num, context)
        
        try:
            response = bedrock.invoke_model(
                modelId="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
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
            
            return parse_concepts_from_response(raw_content)
            
        except Exception as e:
            # logger.error(f"Error in Part {part_num}: {e}")
            return []

    # Run all 4 parts in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(generate_part, i) for i in range(1, 5)]
        
        results = [f.result() for f in futures]
    
    all_expanded_concepts = []
    for part_concepts in results:
        all_expanded_concepts.extend(part_concepts)
    
    # Filter out any non-dict items (e.g. strings) that might have slipped through the parser
    all_expanded_concepts = [c for c in all_expanded_concepts if isinstance(c, dict)]
    
    # Post-process: assign tiers/stages if missing
    for i, concept in enumerate(all_expanded_concepts):
        if "id" not in concept:
            concept["id"] = generate_id()
        
        # Ensure tier consistency
        if i < 14: # First 20%
             concept["tier"] = concept.get("tier", "foundation")
        elif i < 42: # Next 40%
             concept["tier"] = concept.get("tier", "keystone")
        else:
             concept["tier"] = concept.get("tier", "utility")
             
        # Normalize fields
        concept["stageId"] = concept.get("stageId", "PREPARE")
        if "mnemonic" not in concept:
            concept["mnemonic"] = {}
            
    return all_expanded_concepts


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
                    "keyPoints": concept.get("keyPoints", []),
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
                    "outdegree": concept.get("outdegree", 0),
                    "createdAt": get_ttl_timestamp(0),
                    "expiresAt": get_ttl_timestamp(168),  # TTL after 7 days
                }
            )


# Note: get_system_prompt is now imported from shared.system_prompt
# This ensures the full SENSA learning science (SHAPE, tiers, mnemonics,
# confusion pairs, learning paths) is preserved in Lambda generation
