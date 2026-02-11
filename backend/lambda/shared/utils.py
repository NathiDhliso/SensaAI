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


def create_subject_sk(session_id: str) -> str:
    """Create sort key for subject metadata"""
    return f"SUBJECT#{session_id}"


def create_gsi1_pk(user_id: str, session_id: str) -> str:
    """Create GSI1 partition key for tier-based queries"""
    return f"USER#{user_id}#SESSION#{session_id}"


def create_gsi1_sk(tier: str, concept_id: str) -> str:
    """Create GSI1 sort key for tier-based queries"""
    return f"TIER#{tier}#{concept_id}"


# Allowed origins for CORS
ALLOWED_ORIGINS = [
    "https://main.dckqci84h8ffk.amplifyapp.com",
    "https://sensapbl.com",
    "https://www.sensapbl.com",
    "https://app.sensapbl.com",
    "https://sensaai.com",
    "https://www.sensaai.com",
    "http://localhost:5173",
    "http://localhost:3000",
]


def get_cors_origin(event=None):
    """Get the appropriate CORS origin for the response."""
    if not event:
        return ALLOWED_ORIGINS[0]
    headers = event.get("headers", {}) or {}
    origin = headers.get("origin") or headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        return origin
    if origin.startswith("http://localhost:"):
        return origin
    return ALLOWED_ORIGINS[0]


def api_response(status_code, body, event=None, cookies=None):
    """Create API Gateway response with CORS headers."""
    origin = get_cors_origin(event)
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization,Cookie",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Credentials": "true",
    }
    response = {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, cls=DecimalEncoder),
    }
    if cookies:
        response["cookies"] = cookies
        response["multiValueHeaders"] = {
            **{k: [v] for k, v in headers.items()},
            "Set-Cookie": cookies,
        }
    return response


def create_session_cookie(token, name="session_token", max_age=3600, secure=True, http_only=True, same_site="Strict"):
    """Create a properly formatted Set-Cookie header value."""
    parts = [f"{name}={token}"]
    if max_age:
        parts.append(f"Max-Age={max_age}")
    parts.append("Path=/")
    if http_only:
        parts.append("HttpOnly")
    if secure:
        parts.append("Secure")
    if same_site:
        parts.append(f"SameSite={same_site}")
    return "; ".join(parts)


def clear_session_cookie(name="session_token"):
    """Create a Set-Cookie header that clears/expires a cookie."""
    return f"{name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict"


def parse_cursor(cursor=None):
    """Parse pagination cursor from base64"""
    if not cursor:
        return None
    try:
        import base64
        decoded = base64.b64decode(cursor).decode("utf-8")
        return json.loads(decoded)
    except Exception:
        return None


def create_cursor(last_evaluated_key=None):
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
TIERS = ["root", "trunk", "leaf"]
# Lifecycle stages
STAGES = ["PREPARE", "MODEL", "DELIVER"]
