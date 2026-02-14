# Authentication

**Last Updated:** February 14, 2026
**Status:** MANDATORY — Understand this before modifying auth flows.

---

## Overview

SensaAI uses AWS Cognito for authentication with OAuth 2.0 + PKCE flow. Tokens are managed via HttpOnly cookies set by the backend. The frontend never stores raw tokens — it relies on `credentials: 'include'` on every API request.

---

## Auth Flow

### OAuth Login (Cognito Hosted UI)
```
User clicks "Sign In with Google/Social"
  → auth-store.ts login()
  → Generate PKCE code_verifier + code_challenge
  → Store code_verifier in localStorage (temporary)
  → Redirect to Cognito /oauth2/authorize
  → User authenticates on Cognito hosted UI
  → Cognito redirects to /auth/callback with ?code=...
  → AuthCallback.tsx extracts code from URL
  → auth-store.ts handleCallback(code)
  → authSessionApi.exchangeCode(code, redirect_uri, code_verifier)
  → Backend exchanges code for tokens, sets HttpOnly cookies
  → Frontend receives user object, sets isAuthenticated = true
  → localStorage code_verifier cleared
  → Navigate to /
```

### Direct Login (Email + Password)
```
User enters email + password on Login page
  → auth-store.ts loginWithCredentials(email, password)
  → authSessionApi.loginWithCredentials(email, password)
  → Backend authenticates via Cognito, sets HttpOnly cookies
  → Frontend receives user object, sets isAuthenticated = true
```

### Sign Up
```
User enters name + email + password on SignUp page
  → auth-store.ts signUp(email, password, name)
  → Direct Cognito SDK call (SignUpCommand) — no backend needed
  → User receives verification email
  → ConfirmSignUp page: auth-store.ts confirmSignUp(email, code)
  → Direct Cognito SDK call (ConfirmSignUpCommand)
  → Navigate to /login
```

---

## Session Management

### Validation
- On app mount, `auth-store` rehydrates from localStorage (persisted via Zustand `persist`)
- If `isAuthenticated` is true on rehydrate, `validateSession()` fires after 100ms
- `validateSession()` calls `authSessionApi.validateSession()` — backend checks HttpOnly cookie
- If invalid, attempts `refreshSession()` once before clearing auth state

### Refresh
- `refreshSession()` calls `authSessionApi.refreshSession()` — backend uses refresh_token cookie
- On success, `lastValidated` timestamp updated
- On auth error (401/403), all auth state cleared, user redirected to /login

### Unauthorized Events
- `initializeAuthListeners()` listens for `auth:unauthorized` window events
- API client fires this event on 401 responses
- Handler attempts refresh, clears state if refresh fails

---

## Security Model

| Concern | Implementation |
|---------|---------------|
| Token storage | HttpOnly cookies set by backend — NOT accessible to JavaScript |
| PKCE | SHA-256 code challenge, 64-char random verifier |
| API requests | `credentials: 'include'` on every fetch call |
| Session validation | Backend-side cookie verification via `/auth/session/validate` |
| Token refresh | Backend-side using refresh_token cookie |
| Logout | Backend clears cookies + frontend clears Zustand state + redirect |
| Generation access | Email allowlist enforced at both backend (403) and frontend (UI hidden) |

---

## Generation Access Control (Allowlist)

Content generation is restricted to approved email addresses, enforced independently at both layers:

- **Backend:** `backend/lambda/shared/utils.py` → `ALLOWED_GENERATOR_EMAILS` set, `is_generation_allowed(event)` extracts the user email from Cognito claims using `email` first, then `username`/`cognito:username` fallback (for access tokens). Returns 403 for non-allowlisted users on `generate` action.
- **Frontend:** `src/shared/constants/generator-allowlist.ts` → `isGenerationAllowed()` reads email from `useAuthStore`. Hides generation UI for non-allowlisted users.
- `repair` and `suggest_structure` Lambda actions are NOT gated by the allowlist.

---

## Branded Email Templates (Custom Message Lambda)

Cognito fires a Custom Message Lambda trigger for every auth email. The Lambda returns branded HTML per trigger type.

| Trigger | Email Subject | When Sent |
|---------|--------------|----------|
| `CustomMessage_SignUp` | "SensaAI — Verify Your Email" | New user signs up |
| `CustomMessage_ForgotPassword` | "SensaAI — Reset Your Password" | User requests password reset |
| `CustomMessage_ResendCode` | "SensaAI — Your New Verification Code" | User clicks "Resend Code" |
| `CustomMessage_AdminCreateUser` | "SensaAI — You've Been Invited" | Admin creates a user account |

**Lambda:** `backend/lambda/custom_message/handler.py`
**Terraform:** `infra/terraform/modules/cognito/main.tf` — `aws_lambda_function.custom_message` + `lambda_config.custom_message` on user pool

The `verification_message_template` block remains as a fallback if the Lambda fails. The Lambda is lightweight (128MB, 5s timeout, Python 3.12) with its own IAM role (CloudWatch logs only).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/store/auth-store.ts` | Zustand store: login, signUp, confirmSignUp, handleCallback, validateSession, refreshSession, logout |
| `src/pages/Login.tsx` | Email + password login form |
| `src/pages/SignUp.tsx` | Registration form |
| `src/pages/ConfirmSignUp.tsx` | Email verification code entry |
| `src/pages/ForgotPassword.tsx` | Password reset flow |
| `src/pages/AuthCallback.tsx` | OAuth redirect handler — extracts `code` param, calls `handleCallback` |
| `src/components/auth/ProtectedRoute.tsx` | Route guard — redirects to /login if not authenticated |
| `src/components/settings/SettingsPanel.tsx` | Account section with user info + Sign Out button |
| `src/shared/api/client.ts` | API client with `credentials: 'include'`, `authSessionApi` methods |
| `backend/lambda/custom_message/handler.py` | Cognito Custom Message Lambda — branded HTML email templates |
| `backend/src/features/auth/routes/` | Express auth routes: code exchange, session validate, refresh, logout |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain (e.g., `https://sensaai-dev.auth.us-east-1.amazoncognito.com`) |
| `VITE_COGNITO_CLIENT_ID` | Cognito app client ID |
| `VITE_COGNITO_REDIRECT_URI` | OAuth callback URL (default: `{origin}/auth/callback`) |
| `VITE_AWS_REGION` | AWS region (default: `us-east-1`) |

---

## Error Handling

`formatAuthError()` maps Cognito error codes to user-friendly messages:

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
// NEVER store tokens in localStorage or state
set({ tokens: jwtToken }); // FORBIDDEN — tokens live in HttpOnly cookies only

// NEVER skip ProtectedRoute for authenticated pages
<Route path="/study/:id" element={<Study />} /> // WRONG — needs ProtectedRoute wrapper

// NEVER call Cognito token endpoint directly from frontend
// Use backend /auth routes which set HttpOnly cookies

// NEVER redirect to /settings for login
// Login is always at /login, settings is a slide-out panel
```
