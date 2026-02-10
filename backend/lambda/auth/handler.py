"""
Auth Lambda Handler
Handles authentication endpoints for Cognito
"""
import json
import os
import base64
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

from shared.utils import api_response


def lambda_handler(event, context):
    """Main Lambda handler for auth endpoints"""
    
    try:
        http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
        path = event.get('rawPath', '')
        
        print(f"[Auth Lambda] Method: {http_method}, Path: {path}")
        
        if http_method == 'OPTIONS':
            return api_response(200, {}, event)
        
        body = {}
        if event.get('body'):
            body = json.loads(event['body'])
        
        if 'login' in path:
            return handle_login(body, event)
        elif 'validate' in path:
            return handle_validate(event)
        elif 'refresh' in path:
            return handle_refresh(event)
        elif 'clear' in path:
            return handle_clear(event)
        else:
            return api_response(404, {'error': 'Route not found'}, event)
            
    except Exception as e:
        print(f"[Auth Lambda] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return api_response(500, {'error': 'Internal server error', 'details': str(e)}, event)

def handle_login(body, event):
    """Handle login with credentials"""
    email = body.get('email')
    password = body.get('password')
    
    print(f"[Auth Lambda] Login attempt for: {email}")
    
    if not email or not password:
        return api_response(400, {'error': 'Email and password required'}, event)
    
    if os.environ.get('SKIP_AUTH') == 'true':
        print("[Auth Lambda] SKIP_AUTH enabled, bypassing Cognito")
        user = {
            'id': 'dev-user',
            'email': 'dev@SensaAI.com',
            'name': 'Developer'
        }
        return api_response(200, {'user': user}, event, cookies=[
            'access_token=dev-access-token; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=3600',
            'refresh_token=dev-refresh-token; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000'
        ])
    
    try:
        import boto3
    except ImportError as e:
        print(f"[Auth Lambda] boto3 not available: {e}")
        return api_response(500, {'error': 'boto3 not available in Lambda environment'}, event)
    
    try:
        cognito = boto3.client('cognito-idp', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        
        response = cognito.initiate_auth(
            ClientId=os.environ['COGNITO_CLIENT_ID'],
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password
            }
        )
        
        auth_result = response['AuthenticationResult']
        id_token = auth_result['IdToken']
        user = extract_user_from_token(id_token)
        
        print(f"[Auth Lambda] Login successful for: {email}")
        
        return api_response(200, {'user': user}, event, cookies=[
            f"access_token={auth_result['AccessToken']}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age={auth_result.get('ExpiresIn', 3600)}",
            f"refresh_token={auth_result['RefreshToken']}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000"
        ])
        
    except Exception as e:
        error_name = getattr(e, 'response', {}).get('Error', {}).get('Code', type(e).__name__)
        print(f"[Auth Lambda] Cognito error: {error_name} - {str(e)}")
        
        if error_name == 'NotAuthorizedException':
            return api_response(401, {'error': 'Invalid email or password'}, event)
        else:
            return api_response(500, {'error': 'Authentication failed', 'details': str(e)}, event)

def handle_validate(event):
    """Validate current session"""
    cookies = event.get('cookies', [])
    access_token = None
    
    for cookie in cookies:
        if cookie.startswith('access_token='):
            access_token = cookie.split('=', 1)[1]
            break
    
    if not access_token:
        return api_response(200, {'valid': False}, event)
    
    if os.environ.get('SKIP_AUTH') == 'true':
        return api_response(200, {
            'valid': True,
            'user': {
                'id': 'dev-user',
                'email': 'dev@SensaAI.com',
                'name': 'Developer'
            }
        }, event)
    
    try:
        user = extract_user_from_token(access_token)
        return api_response(200, {'valid': True, 'user': user}, event)
    except:
        return api_response(200, {'valid': False}, event)

def handle_refresh(event):
    """Refresh session"""
    cookies = event.get('cookies', [])
    refresh_token = None
    
    for cookie in cookies:
        if cookie.startswith('refresh_token='):
            refresh_token = cookie.split('=', 1)[1]
            break
    
    if not refresh_token:
        return api_response(401, {'error': 'No refresh token'}, event)
    
    import boto3
    cognito = boto3.client('cognito-idp', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
    
    try:
        response = cognito.initiate_auth(
            ClientId=os.environ['COGNITO_CLIENT_ID'],
            AuthFlow='REFRESH_TOKEN_AUTH',
            AuthParameters={
                'REFRESH_TOKEN': refresh_token
            }
        )
        
        auth_result = response['AuthenticationResult']
        
        return api_response(200, {'success': True}, event, cookies=[
            f"access_token={auth_result['AccessToken']}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age={auth_result.get('ExpiresIn', 3600)}"
        ])
        
    except Exception as e:
        print(f"Refresh error: {str(e)}")
        return api_response(401, {'error': 'Session expired'}, event)

def handle_clear(event):
    """Clear session (logout)"""
    return api_response(200, {'success': True}, event, cookies=[
        'access_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0',
        'refresh_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
    ])

def extract_user_from_token(token):
    """Extract user info from JWT token"""
    try:
        # Decode JWT payload (second part)
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError('Invalid token format')
        
        payload = parts[1]
        # Add padding if needed
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        
        decoded = base64.b64decode(payload)
        data = json.loads(decoded)
        
        return {
            'id': data.get('sub'),
            'email': data.get('email') or data.get('username'),
            'name': data.get('name')
        }
    except Exception as e:
        print(f"Token decode error: {str(e)}")
        raise
