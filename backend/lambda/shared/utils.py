"""
Shared utilities for Lambda functions
"""
import json
import os
import uuid
import time
import base64
import logging
from typing import Any, Dict, List, Optional
from decimal import Decimal

logger = logging.getLogger()


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
    "https://sensaai.co.za",
    "https://www.sensaai.co.za",
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
TIERS = ["trunk", "branch", "leaf"]
# Lifecycle stages
STAGES = ["PREPARE", "MODEL", "DELIVER"]


ALLOWED_GENERATOR_ROLES = {"admin", "curator", "generator"}


def _extract_role_from_event(event: Dict[str, Any]) -> Optional[str]:
    """Extract user role from JWT claims (API Gateway) or request body (Express proxy)."""
    # Try JWT claims first (direct API Gateway invocation)
    jwt_claims = (event.get("requestContext") or {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    role = jwt_claims.get("custom:role")
    if role:
        return role.lower()
    # Check cognito:groups (may be a JSON-encoded list)
    groups = jwt_claims.get("cognito:groups")
    if groups:
        if isinstance(groups, str):
            try:
                groups = json.loads(groups)
            except (json.JSONDecodeError, TypeError):
                groups = [groups]
        if isinstance(groups, list) and groups:
            return groups[0].lower()
    # Fallback: role passed in body by Express backend
    try:
        body = event.get("body")
        if isinstance(body, str):
            body = json.loads(body)
        if isinstance(body, dict):
            body_role = body.get("role")
            if body_role:
                return str(body_role).lower()
    except Exception:
        pass
    return None


def _mask_email(email: Optional[str]) -> Optional[str]:
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*" if local else "*"
    else:
        masked_local = local[0] + ("*" * (len(local) - 2)) + local[-1]
    return f"{masked_local}@{domain}"


def _extract_email_from_payload(payload: Dict[str, Any]) -> Optional[str]:
    email = payload.get("email") or payload.get("username") or payload.get("cognito:username") or ""
    email = str(email).lower()
    if email and "@" in email:
        return email
    return None


def get_generation_access_diagnostics(event: Dict[str, Any]) -> Dict[str, Any]:
    headers = event.get("headers") or {}
    request_context = event.get("requestContext") or {}
    jwt_claims = request_context.get("authorizer", {}).get("jwt", {}).get("claims", {}) or {}
    jwt_email = _extract_email_from_payload(jwt_claims)
    auth_header = headers.get("authorization") or headers.get("Authorization") or ""
    bearer_payload = {}
    bearer_email = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload_b64 = token.split(".")[1]
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            bearer_payload = json.loads(base64.b64decode(payload_b64))
            bearer_email = _extract_email_from_payload(bearer_payload)
        except Exception:
            bearer_payload = {}
            bearer_email = None
    effective_email = jwt_email or bearer_email
    return {
        "rawPath": event.get("rawPath"),
        "routeKey": event.get("routeKey"),
        "host": headers.get("host") or headers.get("Host"),
        "origin": headers.get("origin") or headers.get("Origin"),
        "hasAuthorizationHeader": bool(auth_header),
        "jwtClaimKeys": sorted(jwt_claims.keys())[:25],
        "bearerClaimKeys": sorted(bearer_payload.keys())[:25],
        "maskedEmail": _mask_email(effective_email),
        "emailSource": "jwt_claims" if jwt_email else ("bearer_payload" if bearer_email else "none"),
        "role": _extract_role_from_event(event),
        "isAllowed": _extract_role_from_event(event) in ALLOWED_GENERATOR_ROLES if _extract_role_from_event(event) else False,
    }


def _resolve_email_from_access_token(access_token: str) -> Optional[str]:
    try:
        import boto3
        client = boto3.client("cognito-idp", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        response = client.get_user(AccessToken=access_token)
        for attr in response.get("UserAttributes", []):
            if attr["Name"] == "email":
                return attr["Value"].lower()
    except Exception as e:
        logger.warning(f"Cognito GetUser fallback failed: {e}")
    return None


def extract_email_from_event(event: Dict[str, Any]) -> Optional[str]:
    jwt_claims = (event.get("requestContext") or {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    email = _extract_email_from_payload(jwt_claims)
    if email:
        return email
    headers = event.get("headers") or {}
    auth_header = headers.get("authorization") or headers.get("Authorization") or ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload_b64 = token.split(".")[1]
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            payload = json.loads(base64.b64decode(payload_b64))
            email = _extract_email_from_payload(payload)
            if email:
                return email
        except Exception:
            pass
        email = _resolve_email_from_access_token(token)
        if email:
            return email
    return None


def is_generation_allowed(event: Dict[str, Any]) -> bool:
    role = _extract_role_from_event(event)
    if role and role in ALLOWED_GENERATOR_ROLES:
        return True
    # Fallback: check email for backward-compatibility during migration
    email = extract_email_from_event(event)
    if not email:
        return False
    # Log a deprecation warning so we know to assign roles to these users
    logger.warning(f"Generation allowed via email fallback (no role set): {_mask_email(email)}")
    return False
