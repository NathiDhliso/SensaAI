"""
Shared utilities for Lambda functions
"""
import json
import os
import uuid
import time
from typing import Any, Dict, List, Optional
from decimal import Decimal


# DynamoDB requires Decimal instead of float
class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types from DynamoDB"""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def generate_id() -> str:
    """Generate a unique ID for concepts/jobs"""
    return str(uuid.uuid4())


def get_ttl_timestamp(hours: int = 24) -> int:
    """Get TTL timestamp for DynamoDB expiration"""
    return int(time.time()) + (hours * 3600)


def create_pk(user_id: str, session_id: str) -> str:
    """Create partition key for concepts table"""
    return f"USER#{user_id}#SESSION#{session_id}"


def create_sk(tier: str, concept_id: str) -> str:
    """Create sort key for concepts table"""
    return f"TIER#{tier}#CONCEPT#{concept_id}"


def create_gsi1_pk(user_id: str, session_id: str) -> str:
    """Create GSI1 partition key for tier-based queries"""
    return f"USER#{user_id}#SESSION#{session_id}"


def create_gsi1_sk(tier: str, concept_id: str) -> str:
    """Create GSI1 sort key for tier-based queries"""
    return f"TIER#{tier}#{concept_id}"


def api_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create API Gateway response with CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def parse_cursor(cursor: Optional[str]) -> Optional[Dict[str, Any]]:
    """Parse pagination cursor from base64"""
    if not cursor:
        return None
    try:
        import base64
        decoded = base64.b64decode(cursor).decode("utf-8")
        return json.loads(decoded)
    except Exception:
        return None


def create_cursor(last_evaluated_key: Optional[Dict[str, Any]]) -> Optional[str]:
    """Create pagination cursor from DynamoDB LastEvaluatedKey"""
    if not last_evaluated_key:
        return None
    try:
        import base64
        encoded = json.dumps(last_evaluated_key).encode("utf-8")
        return base64.b64encode(encoded).decode("utf-8")
    except Exception:
        return None


# Tier definitions matching TypeScript types
TIERS = ["foundation", "keystone", "utility"]

# Lifecycle stages
STAGES = ["PREPARE", "MODEL", "DELIVER"]
