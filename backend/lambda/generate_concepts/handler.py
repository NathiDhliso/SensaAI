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

When invoked via API Gateway (synchronously), the handler creates the job
record and self-invokes asynchronously to avoid the 30s API Gateway timeout.

@module generate_concepts/handler
"""
import json
import os
from typing import Any, Dict
import boto3
from shared.utils import generate_id, api_response
from .services import BedrockService, DynamoService

# Initialize services (cold start optimization)
bedrock_service = BedrockService()
dynamo_service = DynamoService()

# Lambda client for self-invocation
lambda_client = boto3.client("lambda", region_name=os.environ.get("AWS_REGION", "us-east-1"))
FUNCTION_NAME = os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "sensapbl-generate-concepts-pilot")
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

        # Check if this is a /concepts/repair route (no action needed in body)
        raw_path = event.get("rawPath", "")
        if raw_path == "/concepts/repair":
            request["action"] = "repair"

        if not request.get("subject"):
            print("[Handler] ERROR: Subject is required")
            return api_response(400, {"error": "Subject is required"})

        # Route based on action
        action = request.get("action", "generate")
        if action == "repair":
            return _handle_repair(request)
        elif action == "_async_generate":
            # Internal: async self-invocation - run full generation
            print("[Handler] Running async generation (self-invoked)")
            return _handle_generate(request)
        else:
            # Check if invoked via API Gateway (synchronously) by looking for
            # requestContext.http or routeKey - indicators of API Gateway v2
            is_api_gateway = bool(
                event.get("requestContext", {}).get("http")
                or event.get("routeKey")
            )

            if is_api_gateway:
                # API Gateway has a 30s timeout. Generation takes much longer.
                # Create job, self-invoke async, return immediately.
                return _handle_generate_async(request, event)
            else:
                # Direct/async invocation (from Express backend or self)
                return _handle_generate(request)
    except Exception as e:
        print(f"[Handler] UNHANDLED ERROR: {str(e)}")
        return api_response(500, {"error": str(e)})
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
        "trunks": body.get("trunks", []),
        "action": body.get("action", "generate"),
        "conceptName": body.get("conceptName"),
        "issue": body.get("issue"),
        "_skip_job_creation": body.get("_skip_job_creation", False),
    }
def _handle_generate(request: Dict[str, Any]) -> Dict[str, Any]:
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
    trunks = request.get("trunks", [])
    skip_job_creation = request.get("_skip_job_creation", False)
    print(f"[Handler] Generate: subject={subject}, userId={user_id}, jobId={job_id}")
    if trunks:
        print(f"[Handler] User-defined trunks ({len(trunks)}): {trunks}")
    if not skip_job_creation:
        # Step 1: Create job record
        print(f"[Handler] Creating job record...")
        dynamo_service.create_job(job_id, user_id, session_id, subject)
        # Step 2: Initialize subject metadata for tracking
        print(f"[Handler] Initializing subject metadata...")
        dynamo_service.initialize_subject_metadata(user_id, session_id, subject)
    else:
        print(f"[Handler] Job record already created by async dispatcher, skipping...")

    # Step 3: Generate concepts with Bedrock (parallel 5-partition strategy)
    # The prompt dynamically analyzes the subject - no hardcoded blueprints needed
    print(f"[Handler] Starting parallel generation for: {subject}")
    if context:
        print(f"[Handler] Using user-provided context ({len(context)} chars)")
    try:
        concepts, classification = bedrock_service.generate_concepts(subject, context, trunks=trunks)
        print(f"[Handler] Generation complete: {len(concepts)} concepts")
        if classification:
            print(f"[Handler] Classification: {classification.get('subjectType', 'unknown')}")
    except Exception as e:
        print(f"[Handler] ERROR: Bedrock generation failed: {str(e)}")
        dynamo_service.mark_job_failed(job_id, user_id, str(e))
        return api_response(500, {"error": f"Generation failed: {str(e)}"})
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
    })


def _handle_generate_async(request: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle API Gateway invocation by creating the job record and self-invoking
    asynchronously. Returns immediately with in_progress status to avoid
    the 30s API Gateway timeout.
    """
    subject = request["subject"]
    user_id = request["userId"]
    session_id = request["sessionId"]
    job_id = request["jobId"]
    context = request["context"]

    print(f"[Handler] Async dispatch: subject={subject}, userId={user_id}, jobId={job_id}")

    # Step 1: Create job record immediately
    dynamo_service.create_job(job_id, user_id, session_id, subject)
    dynamo_service.initialize_subject_metadata(user_id, session_id, subject)

    # Step 2: Self-invoke asynchronously to run the actual generation
    async_payload = {
        "body": json.dumps({
            "subject": subject,
            "userId": user_id,
            "sessionId": session_id,
            "jobId": job_id,
            "context": context,
            "trunks": request.get("trunks", []),
            "action": "_async_generate",
            "_skip_job_creation": True,
        })
    }

    try:
        lambda_client.invoke(
            FunctionName=FUNCTION_NAME,
            InvocationType="Event",  # Async invocation
            Payload=json.dumps(async_payload),
        )
        print(f"[Handler] Async self-invocation dispatched for job {job_id}")
    except Exception as e:
        print(f"[Handler] ERROR: Failed to self-invoke: {str(e)}")
        dynamo_service.mark_job_failed(job_id, user_id, f"Failed to start generation: {str(e)}")
        return api_response(500, {"error": f"Failed to start generation: {str(e)}"}, event)

    # Step 3: Return immediately with in_progress status
    return api_response(200, {
        "jobId": job_id,
        "sessionId": session_id,
        "status": "in_progress",
        "conceptCount": 0,
    }, event)


def _handle_repair(request: Dict[str, Any]) -> Dict[str, Any]:
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
        })
    print(f"[Handler] Repair: concept={concept_name}, issue={issue}")
    repaired_concept = bedrock_service.repair_concept(subject, concept_name, issue)
    if not repaired_concept:
        return api_response(500, {"error": "Failed to repair concept"})
    return api_response(200, {
        "status": "completed",
        "concept": repaired_concept,
    })
