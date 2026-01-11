"""
Query Concepts Lambda Handler

Provides paginated access to concepts stored in DynamoDB.
Supports filtering by tier for lazy loading in the frontend.
"""
import json
import os
from typing import Any, Dict, List, Optional

import boto3

# Import shared utilities
# Import shared utilities
from shared.utils import (
    api_response,
    parse_cursor,
    create_cursor,
    create_gsi1_pk,
    TIERS,
)

# Environment variables
CONCEPTS_TABLE = os.environ.get("CONCEPTS_TABLE", "sensapbl-concepts-dev")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

# Default page size
DEFAULT_LIMIT = 25
MAX_LIMIT = 100

# AWS clients
dynamodb = boto3.resource("dynamodb")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for concept queries
    
    Query Parameters:
    - userId: User ID (required)
    - sessionId: Session ID (required)
    - tier: Filter by tier (optional: foundation, keystone, utility)
    - limit: Number of items per page (default: 25, max: 100)
    - cursor: Pagination cursor from previous response
    """
    try:
        # Parse query parameters
        params = event.get("queryStringParameters", {}) or {}
        user_id = params.get("userId")
        session_id = params.get("sessionId")
        tier = params.get("tier")
        limit = min(int(params.get("limit", DEFAULT_LIMIT)), MAX_LIMIT)
        cursor = params.get("cursor")
        
        if not user_id or not session_id:
            return api_response(400, {"error": "userId and sessionId are required"})
        
        if tier and tier not in TIERS:
            return api_response(400, {"error": f"Invalid tier. Must be one of: {', '.join(TIERS)}"})
        
        # Query DynamoDB
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
        })
        
    except Exception as e:
        return api_response(500, {"error": str(e)})


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
    """
    Transform DynamoDB item to concept format matching TypeScript types
    """
    return {
        "id": item.get("conceptId"),
        "name": item.get("name", "Unnamed"),
        "tier": item.get("tier", "foundation"),
        "stageId": item.get("stageId", "PREPARE"),
        "description": item.get("description", ""),
        "keyPoints": item.get("keyPoints", []),
        "prerequisiteWeight": float(item.get("prerequisiteWeight", 0.5)),
        "displayProperties": item.get("displayProperties", {}),
    }


# Health check endpoint for simple GET requests
def health_check(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Simple health check for Lambda"""
    return api_response(200, {"status": "healthy", "service": "query_concepts"})
