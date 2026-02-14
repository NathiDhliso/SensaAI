# Authentication

**Last Updated:** February 14, 2026
**Status:** MANDATORY - Understand this before modifying auth flows.

---

## Overview

SensaAI uses AWS Cognito for authentication. Two login paths exist:

1. **OAuth 2.0 + PKCE** - Redirect to Cognito Hosted UI, exchange code for tokens via Lambda
2. **Direct credentials** - Email + password sent to auth Lambda, which calls Cognito `USER_PASSWORD_AUTH`

Tokens (access, id, refresh) are returned as JSON and stored in Zustand persist (localStorage). The access token is sent as `Authorization: Bearer` header on every API request.

---

## Infrastructure

### Two Environments (dev / prod) - Completely Separate

Each environment has its own Cognito User Pool, App Client, Identity Pool, API Gateway, and Lambda functions. Users created in one pool do NOT exist in the other.

| Resource | Dev | Prod |
|----------|-----|------|
| Auth Lambda | `sensapbl-auth-dev` | `sensapbl-auth-prod` |
| API Gateway | `sensapbl-api-dev` | `sensapbl-api-prod` |
| Cognito Domain | `sensapbl-dev.auth.us-east-1.amazoncognito.com` | `sensapbl-prod.auth.us-east-1.amazoncognito.com` |
| Terraform State | `sensapbl-terraform-state` key `dev/` | `sensapbl-terraform-state` key `prod/` |

### Drift Prevention

Cognito resources have `lifecycle { prevent_destroy = true }` in Terraform to prevent accidental pool deletion (which wipes all users). Protected resources:
- `aws_cognito_user_pool.main`
- `aws_cognito_user_pool_client.main`
- `aws_cognito_user_pool_domain.main`
- `aws_cognito_identity_pool.main`

### Amplify Environment Sync

After any Terraform apply or Lambda redeployment, run the sync script to align Amplify frontend env vars with the deployed backend:

```powershell
.\infra\scripts\push-amplify-env.ps1 -Environment prod -TriggerBuild
```

This script reads Cognito config directly from the deployed auth Lambda (source of truth), validates the pool exists, discovers the API Gateway endpoint, and pushes all values to Amplify app + branch level. Use `-DryRun` to preview changes without applying.

---

## Auth Flow

### OAuth Login (Cognito Hosted UI)
```
User clicks "Sign In with Google/Social"
  -> auth-store.ts login()
  -> Generate PKCE code_verifier + code_challenge
  -> Store code_verifier in localStorage (temporary)
  -> Redirect to Cognito /oauth2/authorize
  -> User authenticates on Cognito hosted UI
  -> Cognito redirects to /auth/callback with ?code=...
  -> AuthCallback.tsx extracts code from URL
  -> auth-store.ts handleCallback(code)
  -> authSessionApi.exchangeCode(code, redirect_uri, code_verifier)
  -> POST /auth/exchange -> Lambda exchanges code for tokens
  -> Frontend stores tokens in Zustand persist, sets isAuthenticated = true
  -> Navigate to /
```

### Direct Login (Email + Password)
```
User enters email + password on Login page
  -> auth-store.ts loginWithCredentials(email, password)
  -> authSessionApi.loginWithCredentials(email, password)
  -> POST /auth/login -> Lambda calls Cognito USER_PASSWORD_AUTH
  -> Returns { user, tokens } as JSON
  -> Frontend stores tokens in Zustand persist, sets isAuthenticated = true
```

### Sign Up
```
User enters name + email + password on SignUp page
  -> auth-store.ts signUp(email, password, name)
  -> Direct Cognito SDK call (SignUpCommand) from browser
  -> User receives branded verification email (Custom Message Lambda)
  -> ConfirmSignUp page: auth-store.ts confirmSignUp(email, code)
  -> Direct Cognito SDK call (ConfirmSignUpCommand) from browser
  -> Navigate to /login
```

---

## Session Management

### Token Storage
- Tokens stored in Zustand persist (localStorage key: `sensapbl-auth`)
- Access token sent as `Authorization: Bearer` header via `apiClient`
- On 401 response, API client dispatches `auth:unauthorized` window event

### Validation
- On app mount, `auth-store` rehydrates from localStorage (Zustand `persist`)
- If `isAuthenticated` is true on rehydrate, `validateSession()` fires after 100ms
- `validateSession()` calls `GET /auth/validate` with Bearer token
- If invalid, attempts `refreshSession()` once before clearing auth state

### Refresh
- `refreshSession()` calls `POST /auth/refresh` with refresh_token in body
- On success, tokens updated in store, `lastValidated` timestamp updated
- On auth error (401/403), all auth state cleared, user redirected to /login

### Unauthorized Events
- `initializeAuthListeners()` listens for `auth:unauthorized` window events
- API client fires this event on 401 responses
- Handler attempts refresh, clears state if refresh fails

---

## Security Model

| Concern | Implementation |
|---------|---------------|
| Token storage | Zustand persist (localStorage), sent as Authorization: Bearer header |
| PKCE | SHA-256 code challenge, 64-char random verifier (OAuth flow only) |
| API requests | Authorization: Bearer header on every request (except skipAuth endpoints) |
| Session validation | Lambda decodes JWT from Bearer header via `GET /auth/validate` |
| Token refresh | Lambda calls Cognito REFRESH_TOKEN_AUTH via `POST /auth/refresh` |
| Logout | Lambda GlobalSignOut + frontend clears Zustand state + redirect to /login |
| JWT authorizer | Enabled in prod only (`enable_jwt_authorizer` in API Gateway module) |
| Generation access | Email allowlist enforced at both backend (403) and frontend (UI hidden) |

---

## Generation Access Control (Allowlist)

Content generation is restricted to approved email addresses, enforced independently at both layers:

- **Backend:** `backend/lambda/shared/utils.py` - `ALLOWED_GENERATOR_EMAILS` set, `is_generation_allowed(event)` extracts the user email from Cognito claims using `email` first, then `username`/`cognito:username` fallback (for access tokens). Returns 403 for non-allowlisted users on `generate` action.
- **Frontend:** `src/shared/constants/generator-allowlist.ts` - `isGenerationAllowed()` reads email from `useAuthStore`. Hides generation UI for non-allowlisted users.
- `repair` and `suggest_structure` Lambda actions are NOT gated by the allowlist.

---

## Branded Email Templates (Custom Message Lambda)

Cognito fires a Custom Message Lambda trigger for every auth email. The Lambda returns branded HTML per trigger type.

| Trigger | Email Subject | When Sent |
|---------|--------------|----------|
| `CustomMessage_SignUp` | "SensaAI - Verify Your Email" | New user signs up |
| `CustomMessage_ForgotPassword` | "SensaAI - Reset Your Password" | User requests password reset |
| `CustomMessage_ResendCode` | "SensaAI - Your New Verification Code" | User clicks "Resend Code" |
| `CustomMessage_AdminCreateUser` | "SensaAI - You've Been Invited" | Admin creates a user account |

**Lambda:** `backend/lambda/custom_message/handler.py`
**Terraform:** `infra/terraform/modules/cognito/main.tf` - `aws_lambda_function.custom_message` + `lambda_config.custom_message` on user pool

The `verification_message_template` block remains as a fallback if the Lambda fails. The Lambda is lightweight (128MB, 5s timeout, Python 3.12) with its own IAM role (CloudWatch logs only).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/store/auth-store.ts` | Zustand store: login, signUp, confirmSignUp, handleCallback, validateSession, refreshSession, logout |
| `src/shared/api/client.ts` | API client with Bearer auth, `authSessionApi` methods, `auth:unauthorized` event dispatch |
| `src/pages/Login.tsx` | Email + password login form |
| `src/pages/SignUp.tsx` | Registration form |
| `src/pages/ConfirmSignUp.tsx` | Email verification code entry |
| `src/pages/ForgotPassword.tsx` | Password reset flow |
| `src/pages/AuthCallback.tsx` | OAuth redirect handler - extracts `code` param, calls `handleCallback` |
| `src/components/auth/ProtectedRoute.tsx` | Route guard - redirects to /login if not authenticated |
| `backend/lambda/auth/handler.py` | Auth Lambda: /auth/exchange, /auth/login, /auth/refresh, /auth/validate, /auth/logout |
| `backend/lambda/custom_message/handler.py` | Cognito Custom Message Lambda - branded HTML email templates |
| `infra/terraform/modules/cognito/main.tf` | Cognito Terraform module with lifecycle protection |
| `infra/scripts/push-amplify-env.ps1` | Amplify env sync script (reads from deployed Lambda config) |

---

## Environment Variables

### Frontend (Amplify / .env)

| Variable | Purpose |
|----------|---------|
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain |
| `VITE_COGNITO_REDIRECT_URI` | OAuth callback URL (default: `{origin}/auth/callback`) |
| `VITE_AWS_REGION` | AWS region (default: `us-east-1`) |
| `VITE_API_URL` | API Gateway base URL |

### Backend (Lambda env vars, set by Terraform)

| Variable | Purpose |
|----------|---------|
| `COGNITO_USER_POOL_ID` | Pool ID for JWT validation and auth calls |
| `COGNITO_CLIENT_ID` | App Client ID for Cognito InitiateAuth |
| `COGNITO_DOMAIN` | Domain prefix for OAuth token endpoint |

---

## Error Handling

`formatAuthError()` in `auth-store.ts` maps Cognito error codes to user-friendly messages:

| Cognito Error | User Message |
|--------------|-------------|
| `UsernameExistsException` | "An account with this email already exists." |
| `InvalidPasswordException` | "Password does not meet requirements." |
| `CodeMismatchException` | "Invalid verification code." |
| `ExpiredCodeException` | "Verification code has expired." |
| `TooManyRequestsException` | "Too many attempts. Please wait." |
| `UserNotConfirmedException` | "Please verify your email before signing in." |
| `NotAuthorizedException` | "Invalid email or password." |
| 401 status | "Your session has expired." |
| 500+ status | "Authentication service temporarily unavailable." |
| Network error | "Please check your connection." |

---

## Forbidden Patterns

```typescript
// NEVER skip ProtectedRoute for authenticated pages
<Route path="/study/:id" element={<Study />} /> // WRONG - needs ProtectedRoute wrapper

// NEVER call Cognito token endpoint directly from frontend (except SignUp/ConfirmSignUp)
// Use backend /auth routes via authSessionApi

// NEVER redirect to /settings for login
// Login is always at /login, settings is a slide-out panel

// NEVER hardcode pool IDs or client IDs in frontend code
// They come from VITE_* environment variables

// NEVER mix dev and prod Cognito config
// Run push-amplify-env.ps1 after any infrastructure change
```
