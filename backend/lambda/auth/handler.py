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

def lambda_handler(event, context):
    """Main Lambda handler for auth endpoints"""
    
    try:
        # Parse the route
        route_key = event.get('routeKey', '')
        http_method = event.get('requestContext', {}).get('http', {}).get('method', '')
        path = event.get('rawPath', '')
        
        print(f"[Auth Lambda] Route: {route_key}, Method: {http_method}, Path: {path}")
        
        # CORS headers
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': os.environ.get('CORS_ORIGIN', '*'),
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        }
        
        # Handle OPTIONS for CORS preflight
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        # Parse body
        body = {}
        if event.get('body'):
            body = json.loads(event['body'])
        
        # Route to appropriate handler
        if 'login' in path:
            return handle_login(body, headers)
        elif 'validate' in path:
            return handle_validate(event, headers)
        elif 'refresh' in path:
            return handle_refresh(event, headers)
        elif 'clear' in path:
            return handle_clear(headers)
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Route not found'})
            }
            
    except Exception as e:
        print(f"[Auth Lambda] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': os.environ.get('CORS_ORIGIN', '*'),
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

def handle_login(body, headers):
    """Handle login with credentials"""
    email = body.get('email')
    password = body.get('password')
    
    print(f"[Auth Lambda] Login attempt for: {email}")
    
    if not email or not password:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Email and password required'})
        }
    
    # Development mode bypass
    if os.environ.get('SKIP_AUTH') == 'true':
        print("[Auth Lambda] SKIP_AUTH enabled, bypassing Cognito")
        user = {
            'id': 'dev-user',
            'email': 'dev@sensapbl.com',
            'name': 'Developer'
        }
        
        # Set cookies
        cookie_headers = headers.copy()
        cookie_headers['Set-Cookie'] = [
            'access_token=dev-access-token; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600',
            'refresh_token=dev-refresh-token; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000'
        ]
        
        return {
            'statusCode': 200,
            'headers': cookie_headers,
            'body': json.dumps({'user': user})
        }
    
    # Use Cognito USER_PASSWORD_AUTH
    try:
        import boto3
        print("[Auth Lambda] Importing boto3")
    except ImportError as e:
        print(f"[Auth Lambda] boto3 not available: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'boto3 not available in Lambda environment'})
        }
    
    try:
        cognito = boto3.client('cognito-idp', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        
        print(f"[Auth Lambda] Calling Cognito InitiateAuth")
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
        
        # Extract user from ID token
        user = extract_user_from_token(id_token)
        
        print(f"[Auth Lambda] Login successful for: {email}")
        
        # Set cookies
        cookie_headers = headers.copy()
        cookie_headers['Set-Cookie'] = [
            f"access_token={auth_result['AccessToken']}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age={auth_result.get('ExpiresIn', 3600)}",
            f"refresh_token={auth_result['RefreshToken']}; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000"
        ]
        
        return {
            'statusCode': 200,
            'headers': cookie_headers,
            'body': json.dumps({'user': user})
        }
        
    except Exception as e:
        error_name = getattr(e, 'response', {}).get('Error', {}).get('Code', type(e).__name__)
        print(f"[Auth Lambda] Cognito error: {error_name} - {str(e)}")
        
        if error_name == 'NotAuthorizedException':
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid email or password'})
            }
        else:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'Authentication failed', 'details': str(e)})
            }

def handle_validate(event, headers):
    """Validate current session"""
    # Get access token from cookie
    cookies = event.get('cookies', [])
    access_token = None
    
    for cookie in cookies:
        if cookie.startswith('access_token='):
            access_token = cookie.split('=', 1)[1]
            break
    
    if not access_token:
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'valid': False})
        }
    
    # Development mode
    if os.environ.get('SKIP_AUTH') == 'true':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'valid': True,
                'user': {
                    'id': 'dev-user',
                    'email': 'dev@sensapbl.com',
                    'name': 'Developer'
                }
            })
        }
    
    # Decode and validate token
    try:
        user = extract_user_from_token(access_token)
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'valid': True, 'user': user})
        }
    except:
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'valid': False})
        }

def handle_refresh(event, headers):
    """Refresh session"""
    # Get refresh token from cookie
    cookies = event.get('cookies', [])
    refresh_token = None
    
    for cookie in cookies:
        if cookie.startswith('refresh_token='):
            refresh_token = cookie.split('=', 1)[1]
            break
    
    if not refresh_token:
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({'error': 'No refresh token'})
        }
    
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
        
        # Set new access token cookie
        cookie_headers = headers.copy()
        cookie_headers['Set-Cookie'] = f"access_token={auth_result['AccessToken']}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age={auth_result.get('ExpiresIn', 3600)}"
        
        return {
            'statusCode': 200,
            'headers': cookie_headers,
            'body': json.dumps({'success': True})
        }
        
    except Exception as e:
        print(f"Refresh error: {str(e)}")
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({'error': 'Session expired'})
        }

def handle_clear(headers):
    """Clear session (logout)"""
    cookie_headers = headers.copy()
    cookie_headers['Set-Cookie'] = [
        'access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
        'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0'
    ]
    
    return {
        'statusCode': 200,
        'headers': cookie_headers,
        'body': json.dumps({'success': True})
    }

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
