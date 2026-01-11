"""
Generate Concepts Lambda Handler

Receives a generation request, invokes Bedrock Claude, parses concepts,
and stores them in DynamoDB for paginated retrieval.
"""
import json
import os
import re
from typing import Any, Dict, List, Optional

import boto3
from botocore.config import Config

# Import shared utilities
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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

# Environment variables
CONCEPTS_TABLE = os.environ.get("CONCEPTS_TABLE", "sensapbl-concepts-dev")
JOBS_TABLE = os.environ.get("JOBS_TABLE", "sensapbl-jobs-dev")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

# AWS clients
dynamodb = boto3.resource("dynamodb")
bedrock = boto3.client(
    "bedrock-runtime",
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
        store_concepts(concepts_table, user_id, session_id, concepts)
        
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


def generate_concepts_with_bedrock(subject: str, context: str = "") -> List[Dict[str, Any]]:
    """
    Invoke Bedrock Claude to generate learning concepts
    """
    system_prompt = get_system_prompt(subject)
    
    user_message = f"""Generate a comprehensive learning curriculum for: {subject}

{f"Additional context: {context}" if context else ""}

Return a JSON array of concepts with the following structure for each concept:
{{
    "id": "unique-concept-id",
    "name": "Concept Name",
    "tier": "foundation" | "keystone" | "utility",
    "stageId": "PREPARE" | "MODEL" | "DELIVER",
    "description": "Brief description",
    "keyPoints": ["point1", "point2", "point3"],
    "prerequisiteWeight": 0.0-1.0,
    "displayProperties": {{
        "emoji": "📚",
        "category": "category-name"
    }}
}}

Generate 30-50 concepts covering all tiers and stages comprehensively."""

    response = bedrock.invoke_model(
        modelId="anthropic.claude-3-sonnet-20240229-v1:0",
        contentType="application/json",
        accept="application/json",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_message}
            ],
        }),
    )
    
    response_body = json.loads(response["body"].read())
    content = response_body.get("content", [{}])[0].get("text", "")
    
    # Parse JSON from response
    concepts = parse_concepts_from_response(content)
    
    # Assign tiers if not specified
    for i, concept in enumerate(concepts):
        if "tier" not in concept or concept["tier"] not in TIERS:
            # Distribute across tiers based on position
            concept["tier"] = assign_tier_by_position(i, len(concepts))
        if "stageId" not in concept or concept["stageId"] not in STAGES:
            concept["stageId"] = assign_stage_by_tier(concept["tier"])
        if "id" not in concept:
            concept["id"] = generate_id()
            
    return concepts


def parse_concepts_from_response(content: str) -> List[Dict[str, Any]]:
    """
    Extract JSON array from Claude's response
    """
    # Try to find JSON array in response
    json_match = re.search(r'\[[\s\S]*\]', content)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    
    # Try to parse entire response as JSON
    try:
        result = json.loads(content)
        if isinstance(result, list):
            return result
        if isinstance(result, dict) and "concepts" in result:
            return result["concepts"]
    except json.JSONDecodeError:
        pass
    
    # Fallback: return empty list
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


def store_concepts(table: Any, user_id: str, session_id: str, concepts: List[Dict[str, Any]]) -> None:
    """
    Store concepts in DynamoDB using batch write for efficiency
    """
    pk = create_pk(user_id, session_id)
    gsi1_pk = create_gsi1_pk(user_id, session_id)
    
    # Batch write in chunks of 25 (DynamoDB limit)
    with table.batch_writer() as batch:
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
                    "createdAt": get_ttl_timestamp(0),
                    "expiresAt": get_ttl_timestamp(168),  # TTL after 7 days
                }
            )


def get_system_prompt(subject: str) -> str:
    """
    Return system prompt for content generation
    Matches the TypeScript system-prompt.ts patterns
    """
    return f"""You are an expert learning curriculum designer creating content for the SENSA learning platform.

Your goal is to create a comprehensive, well-structured curriculum for: {subject}

TIER DEFINITIONS:
- foundation: Core concepts that must be understood first. Building blocks.
- keystone: Central concepts that connect multiple ideas. The "meat" of the subject.
- utility: Practical applications and specialized tools. How to use the knowledge.

STAGE DEFINITIONS (Lifecycle):
- PREPARE: Introduction, context, prerequisites
- MODEL: Deep exploration, examples, patterns
- DELIVER: Application, integration, mastery

REQUIREMENTS:
1. Each concept must have exactly 3+ keyPoints
2. Use positive framing (what TO do, not what NOT to do)
3. Be specific and actionable
4. Assign appropriate tier based on concept nature
5. Ensure logical dependencies (foundation before keystone)
6. Include emojis for visual categorization

Return ONLY valid JSON array, no markdown formatting."""
