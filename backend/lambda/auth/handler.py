"""
Auth Lambda Handler
Serverless authentication for SensaAI — replaces Express auth routes.

Returns tokens as JSON (no cookies) for cross-origin API Gateway usage.
Frontend stores tokens in memory/localStorage and sends via Authorization header.

Routes (determined by rawPath + HTTP method):
  POST /auth/exchange  — OAuth code exchange → tokens + user
  POST /auth/login     — Credentials login → tokens + user
  POST /auth/refresh   — Refresh token → new access_token
  GET  /auth/validate  — Decode JWT from Authorization header → user info
  POST /auth/logout    — (optional) Cognito GlobalSignOut
"""
import json
import os
import base64
import logging
from typing import Any, Dict, Optional
from urllib import request as urllib_request
from urllib.parse import urlencode
from urllib.error import HTTPError

import boto3

from shared.utils import api_response, get_cors_origin

# ============================================================================
# Configuration
# ============================================================================
logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")
COGNITO_DOMAIN = os.environ.get("COGNITO_DOMAIN", "")  # e.g. sensapbl-pilot
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
COGNITO_CLIENT_SECRET = os.environ.get("COGNITO_CLIENT_SECRET", "")

cognito_client = boto3.client("cognito-idp", region_name=AWS_REGION)


# ============================================================================
# Helpers
# ============================================================================

def _get_token_endpoint() -> str:
    """Build Cognito OAuth2 token endpoint URL."""
    domain = COGNITO_DOMAIN.replace("https://", "").replace("http://", "").rstrip("/")
    if not domain:
        raise ValueError("COGNITO_DOMAIN is not configured")
    if "amazoncognito.com" not in domain:
        domain = f"{domain}.auth.{AWS_REGION}.amazoncognito.com"
    return f"https://{domain}/oauth2/token"


def _get_token_request_headers() -> Dict[str, str]:
    """Headers for Cognito /oauth2/token requests."""
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    if COGNITO_CLIENT_SECRET:
        credentials = f"{COGNITO_CLIENT_ID}:{COGNITO_CLIENT_SECRET}"
        b64 = base64.b64encode(credentials.encode()).decode()
        headers["Authorization"] = f"Basic {b64}"
    return headers


def _decode_jwt_payload(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode a JWT payload without signature verification.
    Sufficient for extracting user info from Cognito-issued tokens.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        # URL-safe base64 decode with padding
        payload_b64 = parts[1]
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes)
    except Exception as e:
        logger.warning(f"JWT decode failed: {e}")
        return None


def _extract_user(id_token: str) -> Dict[str, Any]:
    """Extract user info from a Cognito ID token."""
    payload = _decode_jwt_payload(id_token)
    if not payload:
        raise ValueError("Invalid ID token")
    return {
        "id": payload.get("sub", ""),
        "email": payload.get("email", payload.get("username", "")),
        "name": payload.get("name"),
    }


def _get_bearer_token(event: Dict[str, Any]) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    headers = event.get("headers", {}) or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


# ============================================================================
# Route Handlers
# ============================================================================

def handle_exchange(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /auth/exchange
    Exchange OAuth authorization code for tokens via Cognito /oauth2/token.
    """
    try:
        body = json.loads(event.get("body", "{}") or "{}")
    except json.JSONDecodeError:
        return api_response(400, {"error": "Invalid JSON body"}, event)

    code = body.get("code")
    redirect_uri = body.get("redirect_uri")
    code_verifier = body.get("code_verifier")

    if not code or not redirect_uri:
        return api_response(400, {"error": "code and redirect_uri are required"}, event)

    # Build token request
    params = {
        "grant_type": "authorization_code",
        "client_id": COGNITO_CLIENT_ID,
        "code": code,
        "redirect_uri": redirect_uri,
    }
    if code_verifier:
        params["code_verifier"] = code_verifier

    try:
        token_endpoint = _get_token_endpoint()
        logger.info(f"Exchanging code at: {token_endpoint}")

        req = urllib_request.Request(
            token_endpoint,
            data=urlencode(params).encode("utf-8"),
            headers=_get_token_request_headers(),
            method="POST",
        )
        with urllib_request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        user = _extract_user(data["id_token"])

        return api_response(200, {
            "user": user,
            "tokens": {
                "access_token": data["access_token"],
                "id_token": data["id_token"],
                "refresh_token": data.get("refresh_token", ""),
                "expires_in": data.get("expires_in", 3600),
            },
        }, event)

    except HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        logger.error(f"Token exchange failed: {e.code} {error_body}")
        return api_response(e.code, {"error": "Failed to exchange code"}, event)
    except Exception as e:
        logger.error(f"Exchange error: {e}")
        return api_response(500, {"error": "Internal server error"}, event)


def handle_login(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /auth/login
    Direct login with email/password via Cognito USER_PASSWORD_AUTH.
    """
    try:
        body = json.loads(event.get("body", "{}") or "{}")
    except json.JSONDecodeError:
        return api_response(400, {"error": "Invalid JSON body"}, event)

    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        return api_response(400, {"error": "Email and password are required"}, event)

    try:
        response = cognito_client.initiate_auth(
            AuthFlow="USER_PASSWORD_AUTH",
            ClientId=COGNITO_CLIENT_ID,
            AuthParameters={
                "USERNAME": email,
                "PASSWORD": password,
            },
        )
        auth_result = response.get("AuthenticationResult", {})

        if not auth_result.get("AccessToken") or not auth_result.get("IdToken"):
            return api_response(500, {"error": "Incomplete authentication result"}, event)

        user = _extract_user(auth_result["IdToken"])

        return api_response(200, {
            "user": user,
            "tokens": {
                "access_token": auth_result["AccessToken"],
                "id_token": auth_result["IdToken"],
                "refresh_token": auth_result.get("RefreshToken", ""),
                "expires_in": auth_result.get("ExpiresIn", 3600),
            },
        }, event)

    except cognito_client.exceptions.NotAuthorizedException:
        return api_response(401, {"error": "Invalid email or password"}, event)
    except cognito_client.exceptions.UserNotConfirmedException:
        return api_response(403, {"error": "Please verify your email first"}, event)
    except cognito_client.exceptions.UserNotFoundException:
        return api_response(401, {"error": "Invalid email or password"}, event)
    except Exception as e:
        logger.error(f"Login error: {e}")
        return api_response(500, {"error": "Authentication failed"}, event)


def handle_refresh(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /auth/refresh
    Refresh access token using refresh_token from request body.
    """
    try:
        body = json.loads(event.get("body", "{}") or "{}")
    except json.JSONDecodeError:
        return api_response(400, {"error": "Invalid JSON body"}, event)

    refresh_token = body.get("refresh_token")
    if not refresh_token:
        return api_response(401, {"error": "refresh_token is required"}, event)

    try:
        response = cognito_client.initiate_auth(
            AuthFlow="REFRESH_TOKEN_AUTH",
            ClientId=COGNITO_CLIENT_ID,
            AuthParameters={
                "REFRESH_TOKEN": refresh_token,
            },
        )
        auth_result = response.get("AuthenticationResult", {})

        if not auth_result.get("AccessToken"):
            return api_response(500, {"error": "Incomplete refresh result"}, event)

        return api_response(200, {
            "access_token": auth_result["AccessToken"],
            "id_token": auth_result.get("IdToken", ""),
            "expires_in": auth_result.get("ExpiresIn", 3600),
        }, event)

    except cognito_client.exceptions.NotAuthorizedException:
        return api_response(401, {"error": "Session expired, please login again"}, event)
    except Exception as e:
        logger.error(f"Refresh error: {e}")
        return api_response(500, {"error": "Failed to refresh session"}, event)


def handle_validate(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    GET /auth/validate
    Decode JWT from Authorization header and check expiry.
    No backend call needed — pure local JWT decode.
    """
    token = _get_bearer_token(event)
    if not token:
        return api_response(200, {"valid": False}, event)

    payload = _decode_jwt_payload(token)
    if not payload or not payload.get("sub") or not payload.get("exp"):
        return api_response(200, {"valid": False}, event)

    import time
    if time.time() >= payload["exp"]:
        return api_response(200, {"valid": False}, event)

    user = {
        "id": payload["sub"],
        "email": payload.get("email", payload.get("username", "")),
        "name": payload.get("name"),
    }
    return api_response(200, {"valid": True, "user": user}, event)


def handle_logout(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /auth/logout
    Optional: call Cognito GlobalSignOut to invalidate all sessions server-side.
    """
    token = _get_bearer_token(event)
    if token:
        try:
            cognito_client.global_sign_out(AccessToken=token)
        except Exception as e:
            logger.warning(f"Global sign out failed (non-fatal): {e}")

    return api_response(200, {"success": True}, event)


# ============================================================================
# Lambda Entry Point
# ============================================================================

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Route requests based on path and HTTP method."""
    logger.info(f"Auth Lambda invoked: {event.get('rawPath', '')} {event.get('requestContext', {}).get('http', {}).get('method', '')}")

    # Handle OPTIONS preflight
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return api_response(200, {}, event)

    raw_path = event.get("rawPath", "")

    # Route mapping
    routes = {
        ("POST", "/auth/exchange"): handle_exchange,
        ("POST", "/auth/login"): handle_login,
        ("POST", "/auth/refresh"): handle_refresh,
        ("GET", "/auth/validate"): handle_validate,
        ("POST", "/auth/logout"): handle_logout,
    }

    handler = routes.get((http_method, raw_path))
    if handler:
        return handler(event)

    return api_response(404, {"error": f"Not found: {http_method} {raw_path}"}, event)
