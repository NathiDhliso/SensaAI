"""
Query Concepts Lambda Handler
Provides paginated access to concepts stored in DynamoDB.
Supports filtering by tier for lazy loading in the frontend.
Also handles Subject Management (List & Delete).
Also handles Job Progress polling for streaming generation.
"""
import json
import os
from typing import Any, Dict, List, Optional
import boto3
from boto3.dynamodb.conditions import Key, Attr
# Import shared utilities
from shared.utils import (
    api_response,
    parse_cursor,
    create_cursor,
    create_gsi1_pk,
    create_pk,
    create_subject_sk,
    TIERS,
)
# Environment variables
CONCEPTS_TABLE = os.environ.get("CONCEPTS_TABLE", "sensapbl-concepts-dev")
JOBS_TABLE = os.environ.get("JOBS_TABLE", "sensapbl-jobs-dev")
USERDATA_TABLE = os.environ.get("USERDATA_TABLE", "sensapbl-userdata-dev")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")
# Default page size
DEFAULT_LIMIT = 25
MAX_LIMIT = 100
# AWS clients
dynamodb = boto3.resource("dynamodb")

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for concept queries and subject management

    Supports HTTP methods:
    - GET: Query concepts, list subjects, job progress, etc. (via query params)
    - DELETE: Delete a subject and its concepts

    Query Parameters:
    - action: 'get_concepts' (default), 'list_subjects', 'delete_subject',
    'get_job_progress', 'get_latest_concepts'
    - userId: User ID (required)
    - sessionId: Session ID (required for get/delete/progress)
    - jobId: Job ID (required for job progress)
    - tier: Filter by tier (optional: root, trunk, leaf)
    - limit: Number of items per page
    - cursor: Pagination cursor
    - afterOrder: For get_latest_concepts, only return concepts with order > this value
    """
    try:
        # Check for DELETE method (used by frontend apiClient.delete)
        http_method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
        raw_path = event.get("rawPath", "")

        if http_method == "DELETE":
            path_params = event.get("pathParameters", {}) or {}
            params = event.get("queryStringParameters", {}) or {}
            subject_id = path_params.get("subjectId") or params.get("sessionId")
            user_id = params.get("userId")
            if not user_id or not subject_id:
                return api_response(400, {"error": "userId (query param) and subjectId (path) are required"}, event)
            return handle_delete_subject(user_id, subject_id, event)

        # Path-based routing for userdata endpoints
        if http_method == "PUT" and "/concepts/userdata" in raw_path:
            body = json.loads(event.get("body", "{}"))
            user_id = body.get("userId")
            data_key = body.get("dataKey")
            data = body.get("data")
            if not user_id or not data_key or data is None:
                return api_response(400, {"error": "userId, dataKey, and data are required"}, event)
            return handle_put_userdata(user_id, data_key, data, event)

        if http_method == "POST" and "/concepts/userdata" in raw_path:
            body = json.loads(event.get("body", "{}"))
            # Support both path-based batch and action-based batch
            user_id = body.get("userId")
            items = body.get("items", [])
            if not user_id or not items:
                return api_response(400, {"error": "userId and items are required"}, event)
            return handle_batch_put_userdata(user_id, items, event)

        if http_method == "GET" and "/concepts/userdata" in raw_path:
            params = event.get("queryStringParameters", {}) or {}
            user_id = params.get("userId")
            if not user_id:
                return api_response(400, {"error": "userId is required"}, event)
            prefix = params.get("prefix", "")
            return handle_get_userdata(user_id, prefix, event)

        if http_method == "POST":
            body = json.loads(event.get("body", "{}"))
            action = body.get("action")
            if action == "batch_put_userdata":
                user_id = body.get("userId")
                items = body.get("items", [])
                if not user_id or not items:
                    return api_response(400, {"error": "userId and items are required"}, event)
                return handle_batch_put_userdata(user_id, items, event)


        # Parse query parameters
        params = event.get("queryStringParameters", {}) or {}
        path_params = event.get("pathParameters", {}) or {}
        raw_path = event.get("rawPath", "")
        route_key = event.get("routeKey", "")

        # Route-aware dispatching for API Gateway paths
        # GET /concepts/jobs → list all jobs for a user
        # GET /concepts/jobs/{jobId} → get specific job status
        if raw_path.startswith("/concepts/jobs") or route_key.startswith("GET /concepts/jobs"):
            user_id = params.get("userId")
            if not user_id:
                return api_response(400, {"error": "userId is required"}, event)
            job_id = path_params.get("jobId")
            if job_id:
                return handle_get_job_status(user_id, job_id, event)
            else:
                return handle_list_jobs(user_id, event)

        action = params.get("action", "get_concepts")

        if action == "list_public":
            return handle_list_public(event)

        user_id = params.get("userId")
        if not user_id:
            return api_response(400, {"error": "userId is required"}, event)
        if action == "toggle_public":
            job_id = params.get("jobId")
            is_public = params.get("isPublic", "true").lower() == "true"
            if not job_id:
                return api_response(400, {"error": "jobId is required"}, event)
            return handle_toggle_public(user_id, job_id, is_public, event)
        elif action == "get_public_content":
            job_id = params.get("jobId")
            owner_id = params.get("ownerId")
            if not job_id or not owner_id:
                return api_response(400, {"error": "jobId and ownerId are required"}, event)
            return handle_get_public_content(owner_id, job_id, event)
        elif action == "get_userdata":
            prefix = params.get("prefix", "")
            return handle_get_userdata(user_id, prefix, event)
        elif action == "put_userdata":
            data_key = params.get("dataKey")
            data_json = params.get("data")
            if not data_key or not data_json:
                return api_response(400, {"error": "dataKey and data are required"}, event)
            import json as _json
            data = _json.loads(data_json)
            return handle_put_userdata(user_id, data_key, data, event)
        elif action == "list_subjects":
            return handle_list_subjects(user_id, event)
        elif action == "delete_subject":
            session_id = params.get("sessionId")
            if not session_id:
                return api_response(400, {"error": "sessionId is required for deletion"}, event)
            return handle_delete_subject(user_id, session_id, event)
        elif action == "get_job_progress":
            job_id = params.get("jobId")
            if not job_id:
                return api_response(400, {"error": "jobId is required for progress"}, event)
            return handle_get_job_progress(user_id, job_id, event)
        elif action == "get_latest_concepts":
            session_id = params.get("sessionId")
            if not session_id:
                return api_response(400, {"error": "sessionId is required"}, event)
            after_order = int(params.get("afterOrder", 0))
            limit = min(int(params.get("limit", 10)), 50)
            return handle_get_latest_concepts(user_id, session_id, after_order, limit, event)
        else:
            # Default: get_concepts
            session_id = params.get("sessionId")
            if not session_id:
                return api_response(400, {"error": "sessionId is required"}, event)
            tier = params.get("tier")
            limit = min(int(params.get("limit", DEFAULT_LIMIT)), MAX_LIMIT)
            cursor = params.get("cursor")
            if tier and tier not in TIERS:
                return api_response(400, {"error": f"Invalid tier. Must be one of: {', '.join(TIERS)}"}, event)
            concepts, next_cursor = query_concepts(
                user_id=user_id,
                session_id=session_id,
                tier=tier,
                limit=limit,
                cursor=cursor,
            )
            return api_response(200, {
                "concepts": concepts,
                "nextCursor": next_cursor,
                "hasMore": next_cursor is not None,
                "count": len(concepts),
            }, event)
    except Exception as e:
        return api_response(500, {"error": str(e)}, event)

def handle_list_subjects(user_id: str, event=None) -> Dict[str, Any]:
    """
    List all subjects generated by a specific user.
    """
    table = dynamodb.Table(CONCEPTS_TABLE)
    user_pk = f"USER#{user_id}"
    # Query for all items where PK = USER#{userId} and SK starts with SUBJECT#
    response = table.query(
        KeyConditionExpression=Key("PK").eq(user_pk) & Key("SK").begins_with("SUBJECT#")
    )
    subjects = []
    for item in response.get("Items", []):
        subjects.append({
            "sessionId": item.get("sessionId"),
            "subject": item.get("subject"),
            "conceptCount": int(item.get("conceptCount", 0)),
            "createdAt": int(item.get("createdAt", 0)),
            "expiresAt": int(item.get("expiresAt", 0)),
        })
    # Sort by createdAt desc
    subjects.sort(key=lambda x: x["createdAt"], reverse=True)
    return api_response(200, {
        "subjects": subjects,
        "count": len(subjects)
    }, event)


def handle_list_jobs(user_id: str, event=None) -> Dict[str, Any]:
    """
    List all generation jobs for a user from the JOBS_TABLE.
    Matches Express backend GET /concepts/jobs behavior.
    Returns { jobs: [...] } format expected by the frontend.
    """
    jobs_table = dynamodb.Table(JOBS_TABLE)
    try:
        response = jobs_table.scan(
            FilterExpression=Attr("userId").eq(user_id)
        )
        jobs = []
        for item in response.get("Items", []):
            jobs.append({
                "jobId": item.get("jobId"),
                "status": item.get("status"),
                "subject": item.get("subject"),
                "createdAt": int(item.get("createdAt", 0)),
                "conceptCount": int(item.get("conceptCount", 0)),
                "sessionId": item.get("sessionId"),
                "isPublic": bool(item.get("isPublic", False)),
            })
        # Sort by createdAt desc
        jobs.sort(key=lambda x: x["createdAt"], reverse=True)
        return api_response(200, {"jobs": jobs}, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to list jobs: {str(e)}"}, event)


def handle_get_job_status(user_id: str, job_id: str, event=None) -> Dict[str, Any]:
    """
    Get status of a specific generation job from the JOBS_TABLE.
    Matches Express backend GET /concepts/jobs/:jobId behavior.
    """
    jobs_table = dynamodb.Table(JOBS_TABLE)
    try:
        response = jobs_table.get_item(
            Key={"jobId": job_id, "userId": user_id}
        )
        item = response.get("Item")
        if not item:
            return api_response(404, {"error": "Job not found"}, event)
        return api_response(200, {
            "jobId": item.get("jobId"),
            "userId": item.get("userId"),
            "sessionId": item.get("sessionId"),
            "subject": item.get("subject"),
            "status": item.get("status"),
            "conceptCount": int(item.get("conceptCount", 0)),
            "error": item.get("error"),
            "classification": item.get("classification"),
        }, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to get job status: {str(e)}"}, event)

def handle_delete_subject(user_id: str, subject_or_job_id: str, event=None) -> Dict[str, Any]:
    """
    Securely delete a subject and all its concepts.
    Only allows deletion if the userId matches the PK.
    The subject_or_job_id may be a sessionId OR a jobId (frontend sends jobId).
    We resolve to the real sessionId by checking the jobs table first.
    """
    table = dynamodb.Table(CONCEPTS_TABLE)
    jobs_table = dynamodb.Table(JOBS_TABLE)

    session_id = subject_or_job_id
    job_id = subject_or_job_id
    try:
        job_result = jobs_table.get_item(Key={"jobId": subject_or_job_id, "userId": user_id})
        if "Item" in job_result and job_result["Item"].get("sessionId"):
            session_id = job_result["Item"]["sessionId"]
            print(f"[Delete] Resolved jobId={subject_or_job_id} -> sessionId={session_id}")
    except Exception as e:
        print(f"[Delete] Job lookup failed (proceeding with id as sessionId): {str(e)}")

    user_pk = f"USER#{user_id}"
    subject_sk = create_subject_sk(session_id)
    try:
        table.delete_item(
            Key={
                "PK": user_pk,
                "SK": subject_sk
            }
        )
    except Exception as e:
        return api_response(500, {"error": f"Failed to delete metadata: {str(e)}"}, event)

    concepts_pk = create_pk(user_id, session_id)
    response = table.query(
        KeyConditionExpression=Key("PK").eq(concepts_pk)
    )
    items_to_delete = response.get("Items", [])
    while response.get("LastEvaluatedKey"):
        response = table.query(
            KeyConditionExpression=Key("PK").eq(concepts_pk),
            ExclusiveStartKey=response["LastEvaluatedKey"]
        )
        items_to_delete.extend(response.get("Items", []))

    with table.batch_writer() as batch:
        for item in items_to_delete:
            batch.delete_item(
                Key={
                    "PK": item["PK"],
                    "SK": item["SK"]
                }
            )

    jobs_deleted = 0
    try:
        jobs_table.delete_item(Key={"jobId": job_id, "userId": user_id})
        jobs_deleted += 1
    except Exception:
        pass
    if session_id != subject_or_job_id:
        try:
            job_scan = jobs_table.scan(
                FilterExpression=Attr("sessionId").eq(session_id) & Attr("userId").eq(user_id)
            )
            for job_item in job_scan.get("Items", []):
                jobs_table.delete_item(
                    Key={"jobId": job_item["jobId"], "userId": job_item["userId"]}
                )
                jobs_deleted += 1
        except Exception as e:
            print(f"[Delete] Warning: Failed to clean up extra job records: {str(e)}")

    print(f"[Delete] Complete - sessionId={session_id}, concepts={len(items_to_delete)}, jobs={jobs_deleted}")
    return api_response(200, {
        "status": "deleted",
        "sessionId": session_id,
        "itemsDeleted": len(items_to_delete) + 1 + jobs_deleted
    }, event)

def handle_get_job_progress(user_id: str, job_id: str, event=None) -> Dict[str, Any]:
    """
    Get real-time progress of a streaming generation job.
    Returns current concept count, latest concept name, and job status.
    Used by frontend to poll for updates during generation.
    Args:
    user_id: User identifier
    job_id: Job identifier
    Returns:
    API response with job progress details
    """
    jobs_table = dynamodb.Table(JOBS_TABLE)
    try:
        response = jobs_table.get_item(
            Key={"jobId": job_id, "userId": user_id}
        )
        item = response.get("Item")
        if not item:
            return api_response(404, {"error": "Job not found"}, event)
        return api_response(200, {
            "jobId": job_id,
            "sessionId": item.get("sessionId"),
            "subject": item.get("subject"),
            "status": item.get("status", "unknown"),
            "conceptCount": int(item.get("conceptCount", 0)),
            "latestConcept": item.get("latestConcept", ""),
            "updatedAt": int(item.get("updatedAt", 0)),
            "error": item.get("error"),
        }, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to get job progress: {str(e)}"}, event)

def handle_get_latest_concepts(
        user_id: str,
        session_id: str,
        after_order: int,
        limit: int,
        event=None
) -> Dict[str, Any]:
    """
    Get concepts that were added after a certain order number.
    Used for incremental polling during streaming generation.
    Frontend tracks the last order received and polls for newer concepts.
    Args:
    user_id: User identifier
    session_id: Session identifier
    after_order: Only return concepts with order > this value
    limit: Maximum concepts to return
    Returns:
    API response with new concepts and metadata
    """
    table = dynamodb.Table(CONCEPTS_TABLE)
    pk = create_pk(user_id, session_id)
    try:
        # Query all concepts for this session
        response = table.query(
            KeyConditionExpression=Key("PK").eq(pk),
            # Filter out metadata items
            FilterExpression=Attr("type").not_exists()
        )
        items = response.get("Items", [])
        # Transform and filter by order
        concepts = []
        for item in items:
            concept = transform_item_to_concept_full(item)
            if concept.get("order", 0) > after_order:
                concepts.append(concept)
        # Sort by order and limit
        concepts.sort(key=lambda x: x.get("order", 0))
        concepts = concepts[:limit]
        # Get the highest order we're returning
        max_order = max((c.get("order", 0) for c in concepts), default=after_order)
        # Get subject metadata for status
        user_pk = f"USER#{user_id}"
        subject_sk = create_subject_sk(session_id)
        meta_response = table.get_item(
            Key={"PK": user_pk, "SK": subject_sk}
        )
        metadata = meta_response.get("Item", {})
        return api_response(200, {
            "concepts": concepts,
            "count": len(concepts),
            "lastOrder": max_order,
            "totalCount": int(metadata.get("conceptCount", 0)),
            "status": metadata.get("status", "unknown"),
        }, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to get latest concepts: {str(e)}"}, event)

def query_concepts(
        user_id: str,
        session_id: str,
        tier: Optional[str] = None,
        limit: int = DEFAULT_LIMIT,
        cursor: Optional[str] = None,
) -> tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Query concepts from DynamoDB with optional tier filtering
    Uses GSI for efficient tier-based queries
    """
    table = dynamodb.Table(CONCEPTS_TABLE)
    gsi1_pk = create_gsi1_pk(user_id, session_id)
    # Build query parameters
    query_params = {
        "IndexName": "tier-index",
        "KeyConditionExpression": "GSI1PK = :pk",
        "ExpressionAttributeValues": {":pk": gsi1_pk},
        "Limit": limit,
    }
    # Add tier filter if specified
    if tier:
        query_params["KeyConditionExpression"] += " AND begins_with(GSI1SK, :tier)"
        query_params["ExpressionAttributeValues"][":tier"] = f"TIER#{tier}"
    # Add pagination cursor
    exclusive_start_key = parse_cursor(cursor)
    if exclusive_start_key:
        query_params["ExclusiveStartKey"] = exclusive_start_key
    # Execute query
    response = table.query(**query_params)
    # Transform items to concept format
    concepts = [transform_item_to_concept(item) for item in response.get("Items", [])]
    # Create next cursor
    last_evaluated_key = response.get("LastEvaluatedKey")
    next_cursor = create_cursor(last_evaluated_key)
    return concepts, next_cursor

def transform_item_to_concept(item: Dict[str, Any]) -> Dict[str, Any]:
    order = item.get("order", 0)
    if not order:
        concept_id = item.get("conceptId", "")
        if concept_id:
            import re
            match = re.search(r'-(\d+)$', concept_id)
            if match:
                order = int(match.group(1))
    return {
        "id": item.get("conceptId"),
        "name": item.get("name", "Unnamed"),
        "tier": item.get("tier", "leaf"),
        "treeLevel": item.get("treeLevel", item.get("tier", "leaf")),
        "parentName": item.get("parentName"),
        "trunkDomain": item.get("trunkDomain", ""),
        "stageId": item.get("stageId", "PREPARE"),
        "order": order,
        "description": item.get("description", ""),
        "tierJustification": item.get("tierJustification", ""),
        "whyYouNeed": item.get("whyYouNeed", ""),
        "technicalDetails": item.get("technicalDetails", ""),
        "workedExample": item.get("workedExample", {}),
        "keyPoints": item.get("keyPoints", []),
        "cognitiveLevel": item.get("cognitiveLevel", "understand"),
        "commonPitfalls": item.get("commonPitfalls", []),
        "prerequisiteWeight": float(item.get("prerequisiteWeight", 0.5)),
        "displayProperties": item.get("displayProperties", {}),
        "mnemonic": item.get("mnemonic", {}),
        "phase1": item.get("phase1", {}),
        "phase2": item.get("phase2", []),
        "phase3": item.get("phase3", {}),
        "shape": item.get("shape", {}),
        "criticalDistinctions": item.get("criticalDistinctions", []),
        "designBoundaries": item.get("designBoundaries", []),
        "examFocus": item.get("examFocus", []),
        "dependencies": item.get("dependencies", []),
        "connections": item.get("connections", []),
        "outdegree": int(item.get("outdegree", 0)),
        "scoring": item.get("scoring", {}),
    }

def transform_item_to_concept_full(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform DynamoDB item to FULL concept format for streaming UI.
    Includes all fields needed for real-time rendering during generation.
    """
    # Get order from SK if not present as attribute
    order = item.get("order", 0)
    if not order:
        # Try to extract from conceptId (format: concept-P1-001)
        concept_id = item.get("conceptId", "")
        if concept_id:
            import re
            match = re.search(r'-(\d+)$', concept_id)
            if match:
                order = int(match.group(1))
    return {
        "id": item.get("conceptId"),
        "name": item.get("name", "Unnamed"),
        "tier": item.get("tier", "leaf"),
        "stageId": item.get("stageId", "PREPARE"),
        "order": order,
        "description": item.get("description", ""),
        "tierJustification": item.get("tierJustification", ""),
        "whyYouNeed": item.get("whyYouNeed", ""),
        "technicalDetails": item.get("technicalDetails", ""),
        "workedExample": item.get("workedExample", {}),
        "keyPoints": item.get("keyPoints", []),
        "cognitiveLevel": item.get("cognitiveLevel", "understand"),
        "commonPitfalls": item.get("commonPitfalls", []),
        "prerequisiteWeight": float(item.get("prerequisiteWeight", 0.5)),
        "displayProperties": item.get("displayProperties", {}),
        # SENSA learning science
        "mnemonic": item.get("mnemonic", {}),
        "phase1": item.get("phase1", {}),
        "phase2": item.get("phase2", []),
        "phase3": item.get("phase3", {}),
        "shape": item.get("shape", {}),
        "criticalDistinctions": item.get("criticalDistinctions", []),
        "designBoundaries": item.get("designBoundaries", []),
        "examFocus": item.get("examFocus", []),
        "dependencies": item.get("dependencies", []),
        "connections": item.get("connections", []),
        "outdegree": int(item.get("outdegree", 0)),
    }

def handle_toggle_public(user_id: str, job_id: str, is_public: bool, event=None) -> Dict[str, Any]:
    jobs_table = dynamodb.Table(JOBS_TABLE)
    try:
        jobs_table.update_item(
            Key={"jobId": job_id, "userId": user_id},
            UpdateExpression="SET isPublic = :val",
            ExpressionAttributeValues={":val": is_public},
            ConditionExpression="attribute_exists(jobId)",
        )
        return api_response(200, {"jobId": job_id, "isPublic": is_public}, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to toggle public: {str(e)}"}, event)


def handle_list_public(event=None) -> Dict[str, Any]:
    jobs_table = dynamodb.Table(JOBS_TABLE)
    try:
        response = jobs_table.scan(
            FilterExpression=Attr("isPublic").eq(True) & Attr("status").eq("completed")
        )
        jobs = []
        for item in response.get("Items", []):
            jobs.append({
                "jobId": item.get("jobId"),
                "subject": item.get("subject"),
                "createdAt": int(item.get("createdAt", 0)),
                "conceptCount": int(item.get("conceptCount", 0)),
                "sessionId": item.get("sessionId"),
                "ownerId": item.get("userId"),
                "isPublic": True,
            })
        jobs.sort(key=lambda x: x["createdAt"], reverse=True)
        return api_response(200, {"jobs": jobs}, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to list public content: {str(e)}"}, event)


def handle_get_public_content(owner_id: str, job_id: str, event=None) -> Dict[str, Any]:
    jobs_table = dynamodb.Table(JOBS_TABLE)
    try:
        response = jobs_table.get_item(Key={"jobId": job_id, "userId": owner_id})
        item = response.get("Item")
        if not item or not item.get("isPublic"):
            return api_response(404, {"error": "Public content not found"}, event)
        session_id = item.get("sessionId", job_id)
        table = dynamodb.Table(CONCEPTS_TABLE)
        pk = create_pk(owner_id, session_id)
        concept_response = table.query(
            KeyConditionExpression=Key("PK").eq(pk),
            FilterExpression=Attr("type").not_exists()
        )
        concepts = [transform_item_to_concept(c) for c in concept_response.get("Items", [])]
        return api_response(200, {
            "jobId": job_id,
            "subject": item.get("subject"),
            "ownerId": owner_id,
            "conceptCount": len(concepts),
            "concepts": concepts,
            "classification": item.get("classification"),
        }, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to get public content: {str(e)}"}, event)


# Health check endpoint for simple GET requests
def health_check(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Simple health check for Lambda"""
    return api_response(200, {"status": "healthy", "service": "query_concepts"})


# ==============================================================================
# USER DATA HANDLERS
# ==============================================================================

def handle_get_userdata(user_id: str, prefix: str, event=None) -> Dict[str, Any]:
    """
    Get user data items, optionally filtered by SK prefix.
    """
    table = dynamodb.Table(USERDATA_TABLE)
    try:
        if prefix:
            response = table.query(
                KeyConditionExpression=Key("userId").eq(user_id) & Key("dataKey").begins_with(prefix)
            )
        else:
            response = table.query(
                KeyConditionExpression=Key("userId").eq(user_id)
            )
        items = []
        for item in response.get("Items", []):
            items.append({
                "userId": item.get("userId"),
                "dataKey": item.get("dataKey"),
                "data": item.get("data"),
                "updatedAt": int(item.get("updatedAt", 0)),
            })
        return api_response(200, {"items": items, "count": len(items)}, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to get user data: {str(e)}"}, event)


def handle_put_userdata(user_id: str, data_key: str, data: Any, event=None) -> Dict[str, Any]:
    """
    Upsert a single user data item.
    """
    import time
    table = dynamodb.Table(USERDATA_TABLE)
    try:
        table.put_item(Item={
            "userId": user_id,
            "dataKey": data_key,
            "data": data,
            "updatedAt": int(time.time()),
        })
        return api_response(200, {"status": "ok", "dataKey": data_key}, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to put user data: {str(e)}"}, event)


def handle_batch_put_userdata(user_id: str, items: List[Dict[str, Any]], event=None) -> Dict[str, Any]:
    """
    Batch upsert user data items (max 25 per batch).
    """
    import time
    table = dynamodb.Table(USERDATA_TABLE)
    now = int(time.time())
    try:
        with table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item={
                    "userId": user_id,
                    "dataKey": item["dataKey"],
                    "data": item["data"],
                    "updatedAt": now,
                })
        return api_response(200, {"status": "ok", "count": len(items)}, event)
    except Exception as e:
        return api_response(500, {"error": f"Failed to batch put user data: {str(e)}"}, event)
