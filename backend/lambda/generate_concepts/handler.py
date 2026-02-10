"""
Generate Concepts Lambda Handler (Refactored)

This handler acts as a controller/router, delegating business logic to services:
- BedrockService: LLM invocation and response parsing
- DynamoService: Job and concept persistence

The handler is responsible for:
1. Request parsing and validation
2. Routing based on action type
3. Orchestrating service calls
4. Response formatting

@module generate_concepts/handler
"""

from typing import Any, Dict

from shared.utils import generate_id, api_response
from .services import BedrockService, DynamoService


# Initialize services (cold start optimization)
bedrock_service = BedrockService()
dynamo_service = DynamoService()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for content generation.
    
    Routes requests based on the 'action' field:
    - 'generate' (default): Generate concepts for a subject
    - 'repair': Fix a single concept
    
    Expected request body:
    - subject: Subject to generate content for (required)
    - userId: User ID for storage (default: 'anonymous')
    - sessionId: Session ID for this generation (auto-generated)
    - jobId: Job ID for tracking (auto-generated)
    - context: Optional additional context
    - action: 'generate' | 'repair'
    
    For repair action:
    - conceptName: Name of concept to repair
    - issue: Description of the issue
    
    Returns:
        API Gateway response with job status and concept count
    """
    print(f"[Handler] Invoked with event type: {type(event)}")

    try:
        # Parse and validate request
        request = _parse_request(event)
        
        if not request.get("subject"):
            print("[Handler] ERROR: Subject is required")
            return api_response(400, {"error": "Subject is required"}, event)

        # Route based on action
        action = request.get("action", "generate")
        
        if action == "repair":
            return _handle_repair(request, event)
        else:
            return _handle_generate(request, event)

    except Exception as e:
        print(f"[Handler] UNHANDLED ERROR: {str(e)}")
        return api_response(500, {"error": str(e)}, event)


def _parse_request(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse and normalize request from API Gateway event.
    
    Args:
        event: Lambda event from API Gateway
        
    Returns:
        Normalized request dictionary with defaults
    """
    import json
    
    body = json.loads(event.get("body", "{}"))
    
    return {
        "subject": body.get("subject"),
        "userId": body.get("userId", "anonymous"),
        "sessionId": body.get("sessionId", generate_id()),
        "jobId": body.get("jobId", generate_id()),
        "context": body.get("context", ""),
        "action": body.get("action", "generate"),
        "conceptName": body.get("conceptName"),
        "issue": body.get("issue"),
    }


def _handle_generate(request: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle concept generation request using parallel Bedrock calls.
    
    Orchestrates:
    1. Job creation in DynamoDB
    2. Subject metadata initialization
    3. Parallel concept generation via Bedrock (5 partitions)
    4. Concept storage in DynamoDB
    5. Job status update
    
    Args:
        request: Parsed request dictionary
        
    Returns:
        API response with job status
    """
    subject = request["subject"]
    user_id = request["userId"]
    session_id = request["sessionId"]
    job_id = request["jobId"]
    context = request["context"]

    print(f"[Handler] Generate: subject={subject}, userId={user_id}, jobId={job_id}")

    # Step 1: Create job record
    print(f"[Handler] Creating job record...")
    dynamo_service.create_job(job_id, user_id, session_id, subject)

    # Step 2: Initialize subject metadata for tracking
    print(f"[Handler] Initializing subject metadata...")
    dynamo_service.initialize_subject_metadata(user_id, session_id, subject)

    # Step 3: Generate concepts with Bedrock (parallel 5-partition strategy)
    # The prompt dynamically analyzes the subject - no hardcoded blueprints needed
    print(f"[Handler] Starting parallel generation for: {subject}")
    if context:
        print(f"[Handler] Using user-provided context ({len(context)} chars)")
    try:
        concepts, classification = bedrock_service.generate_concepts(subject, context)
        print(f"[Handler] Generation complete: {len(concepts)} concepts")
        if classification:
            print(f"[Handler] Classification: {classification.get('subjectType', 'unknown')}")
    except Exception as e:
        print(f"[Handler] ERROR: Bedrock generation failed: {str(e)}")
        dynamo_service.mark_job_failed(job_id, user_id, str(e))
        return api_response(500, {"error": f"Generation failed: {str(e)}"}, event)

    # Step 4: Store concepts in DynamoDB
    print(f"[Handler] Storing concepts...")
    dynamo_service.store_concepts(user_id, session_id, concepts, subject)

    # Step 5: Mark job as completed with classification data
    print(f"[Handler] Marking job completed...")
    dynamo_service.mark_job_completed(job_id, user_id, len(concepts), classification)

    print(f"[Handler] Success: {len(concepts)} concepts generated for job {job_id}")
    return api_response(200, {
        "jobId": job_id,
        "sessionId": session_id,
        "status": "completed",
        "conceptCount": len(concepts),
        "classification": classification,
    }, event)


def _handle_repair(request: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle single concept repair request.
    
    Args:
        request: Parsed request dictionary with conceptName and issue
        
    Returns:
        API response with repaired concept
    """
    subject = request["subject"]
    concept_name = request.get("conceptName")
    issue = request.get("issue")

    if not concept_name or not issue:
        return api_response(400, {
            "error": "conceptName and issue are required for repair"
        }, event)

    print(f"[Handler] Repair: concept={concept_name}, issue={issue}")

    repaired_concept = bedrock_service.repair_concept(subject, concept_name, issue)
    
    if not repaired_concept:
        return api_response(500, {"error": "Failed to repair concept"}, event)

    return api_response(200, {
        "status": "completed",
        "concept": repaired_concept,
    }, event)
