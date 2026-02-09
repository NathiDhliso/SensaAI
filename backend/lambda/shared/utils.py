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
# Allowed origins for CORS (supports HttpOnly cookie auth)
ALLOWED_ORIGINS = [
 "https://sensapbl.com",
 "https://www.sensapbl.com",
 "https://app.sensapbl.com",
 "http://localhost:5173", # Vite dev server
 "http://localhost:3000", # Alternative dev port
]
def get_cors_origin(event: Optional[Dict[str, Any]] = None) -> str:
 """
 Get the appropriate CORS origin for the response.
 For cookie-based auth, we cannot use '*' - must return the actual origin.
 Falls back to first allowed origin if no match found.
 Args:
 event: Lambda event containing request headers
 Returns:
 Allowed origin string
 """
 if not event:
 return ALLOWED_ORIGINS[0]
 headers = event.get("headers", {}) or {}
 # Headers might be lowercase in API Gateway v2
 origin = headers.get("origin") or headers.get("Origin", "")
 if origin in ALLOWED_ORIGINS:
 return origin
 # For development, allow localhost variants
 if origin.startswith("http://localhost:"):
 return origin
 return ALLOWED_ORIGINS[0]
def api_response(
 status_code: int,
 body: Dict[str, Any],
 event: Optional[Dict[str, Any]] = None,
 cookies: Optional[List[str]] = None,
) -> Dict[str, Any]:
 """
 Create API Gateway response with CORS headers.
 Supports:
 - Dynamic CORS origin for cookie-based auth
 - Set-Cookie headers for session management
 - Credentials support for cross-origin cookies
 Args:
 status_code: HTTP status code
 body: Response body dictionary
 event: Original Lambda event for CORS origin detection
 cookies: Optional list of Set-Cookie header values
 Returns:
 API Gateway response dictionary
 """
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
 # Add cookies if provided
 if cookies:
 # API Gateway v2 format for multiple cookies
 response["cookies"] = cookies
 # Also set multiValueHeaders for v1 compatibility
 response["multiValueHeaders"] = {
 **{k: [v] for k, v in headers.items()},
 "Set-Cookie": cookies,
 }
 return response
def create_session_cookie(
 token: str,
 name: str = "session_token",
 max_age: int = 3600,
 secure: bool = True,
 http_only: bool = True,
 same_site: str = "Strict",
) -> str:
 """
 Create a properly formatted Set-Cookie header value.
 Args:
 token: Token value to store in cookie
 name: Cookie name
 max_age: Cookie lifetime in seconds
 secure: Whether to set Secure flag (HTTPS only)
 http_only: Whether to set HttpOnly flag (no JS access)
 same_site: SameSite policy ('Strict', 'Lax', 'None')
 Returns:
 Set-Cookie header value string
 """
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
def clear_session_cookie(name: str = "session_token") -> str:
 """
 Create a Set-Cookie header that clears/expires a cookie.
 Args:
 name: Cookie name to clear
 Returns:
 Set-Cookie header value that expires the cookie
 """
 return f"{name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict"
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
TIERS = ["root", "trunk", "leaf"]
# Lifecycle stages
STAGES = ["PREPARE", "MODEL", "DELIVER"]