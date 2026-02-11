/**
 * API Client for SensaAI Backend
 * 
 * Uses Bearer JWT token authentication via Authorization header.
 * Tokens are managed by the auth store (Zustand).
 * On 401, dispatches auth:unauthorized event for the store to handle.
 * 
 * @module lib/api/client
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// ============================================================================
// TYPES
// ============================================================================
interface ApiRequestOptions {
 /** Skip authentication for this request */
 skipAuth?: boolean;
 /** Custom headers to include */
 headers?: HeadersInit;
 /** AbortSignal for request cancellation */
 signal?: AbortSignal;
}

interface ApiError extends Error {
 status: number;
 statusText: string;
 body?: unknown;
}

// ============================================================================
// TOKEN ACCESSOR (set by auth store on init)
// ============================================================================
type TokenGetter = () => string | null;
let _getToken: TokenGetter = () => null;

/**
 * Register the token getter from auth store.
 * Called once during app initialization.
 */
export function registerTokenGetter(getter: TokenGetter): void {
 _getToken = getter;
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================
class ApiClient {
 /**
 * Build request headers with Bearer token
 */
 private getHeaders(options?: ApiRequestOptions): HeadersInit {
 const headers: Record<string, string> = {
 'Content-Type': 'application/json',
 };

 // Add custom headers
 if (options?.headers) {
 const customHeaders = options.headers as Record<string, string>;
 Object.assign(headers, customHeaders);
 }

 // Add Bearer token unless auth is skipped
 if (!options?.skipAuth) {
 const token = _getToken();
 if (token) {
 headers['Authorization'] = `Bearer ${token}`;
 }
 }

 return headers;
 }

 /**
 * Build fetch options
 */
 private buildFetchOptions(
 method: string,
 options?: ApiRequestOptions,
 body?: unknown
 ): RequestInit {
 const fetchOptions: RequestInit = {
 method,
 headers: this.getHeaders(options),
 };

 if (options?.signal) {
 fetchOptions.signal = options.signal;
 }

 if (body !== undefined) {
 fetchOptions.body = JSON.stringify(body);
 }

 return fetchOptions;
 }

 /**
 * Handle API errors with detailed information
 */
 private async handleError(response: Response): Promise<never> {
 let body: unknown;
 try {
 body = await response.json();
 } catch {
 body = await response.text().catch(() => null);
 }

 const error = new Error(
 `API Error: ${response.status} ${response.statusText} - ${typeof body === 'object' ? JSON.stringify(body) : String(body)}`
 ) as ApiError;
 error.status = response.status;
 error.statusText = response.statusText;
 error.body = body;

 // Handle specific error codes
 if (response.status === 401) {
 window.dispatchEvent(new CustomEvent('auth:unauthorized'));
 }

 throw error;
 }

 /**
 * Make a GET request
 */
 async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
 const fetchOptions = this.buildFetchOptions('GET', options);
 const response = await fetch(`${API_BASE}${path}`, fetchOptions);
 if (!response.ok) {
 return this.handleError(response);
 }
 return response.json();
 }

 /**
 * Make a POST request
 */
 async post<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
 const fetchOptions = this.buildFetchOptions('POST', options, data);
 const response = await fetch(`${API_BASE}${path}`, fetchOptions);
 if (!response.ok) {
 return this.handleError(response);
 }
 return response.json();
 }

 /**
 * Make a PUT request
 */
 async put<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
 const fetchOptions = this.buildFetchOptions('PUT', options, data);
 const response = await fetch(`${API_BASE}${path}`, fetchOptions);
 if (!response.ok) {
 return this.handleError(response);
 }
 return response.json();
 }

 /**
 * Make a DELETE request
 */
 async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
 const fetchOptions = this.buildFetchOptions('DELETE', options);
 const response = await fetch(`${API_BASE}${path}`, fetchOptions);
 if (!response.ok) {
 return this.handleError(response);
 }
 return response.json();
 }

 /**
 * SSE streaming for generation
 */
 async *stream(
 path: string,
 options?: ApiRequestOptions
 ): AsyncGenerator<{ content?: string; status?: string; error?: string; done?: boolean }> {
 const headers = this.getHeaders(options);
 const response = await fetch(`${API_BASE}${path}`, {
 method: 'GET',
 headers: {
 ...headers,
 Accept: 'text/event-stream'
 },
 signal: options?.signal
 });

 if (!response.ok) {
 return this.handleError(response);
 }

 const reader = response.body?.getReader();
 const decoder = new TextDecoder();

 if (!reader) {
 throw new Error('No response body');
 }

 let buffer = '';
 while (true) {
 const { done, value } = await reader.read();
 if (done) break;

 buffer += decoder.decode(value, { stream: true });
 const lines = buffer.split('\n');
 buffer = lines.pop() || '';

 for (const line of lines) {
 if (line.startsWith('data: ')) {
  try {
  const data = JSON.parse(line.slice(6));
  yield data;
  if (data.done) return;
  } catch {
  // Skip malformed lines
  }
 }
 }
 }
 }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
export const apiClient = new ApiClient();

// ============================================================================
// AUTH SESSION API
// ============================================================================
/**
 * Authentication session management using Bearer JWT tokens.
 * Tokens returned as JSON, stored in auth store.
 */
interface AuthTokensResponse {
 access_token: string;
 id_token: string;
 refresh_token: string;
 expires_in: number;
}

export const authSessionApi = {
 /**
 * Exchange auth code for tokens (OAuth callback)
 * Returns user + tokens as JSON
 */
 async exchangeCode(
 code: string,
 redirectUri: string,
 codeVerifier: string
 ): Promise<{ user: { id: string; email: string; name?: string }; tokens: AuthTokensResponse }> {
 return apiClient.post('/auth/exchange', {
 code,
 redirect_uri: redirectUri,
 code_verifier: codeVerifier
 }, { skipAuth: true });
 },

 /**
 * Login with credentials and receive tokens
 * Returns user + tokens as JSON
 */
 async loginWithCredentials(
 email: string,
 password: string
 ): Promise<{ user: { id: string; email: string; name?: string }; tokens: AuthTokensResponse }> {
 return apiClient.post('/auth/login', {
 email,
 password
 }, { skipAuth: true });
 },

 /**
 * Refresh the access token using refresh_token
 * Returns new access_token + expires_in
 */
 async refreshSession(refreshToken: string): Promise<{ access_token: string; id_token: string; expires_in: number }> {
 return apiClient.post('/auth/refresh', {
 refresh_token: refreshToken
 }, { skipAuth: true });
 },

 /**
 * Logout — calls Cognito GlobalSignOut via auth Lambda
 */
 async clearSession(): Promise<{ success: boolean }> {
 try {
 return await apiClient.post('/auth/logout');
 } catch {
 return { success: true }; // Don't fail logout
 }
 },

 /**
 * Check if current session is valid
 * Uses the Bearer token in Authorization header
 */
 async validateSession(): Promise<{
 valid: boolean;
 user?: { id: string; email: string; name?: string };
 }> {
 try {
 return await apiClient.get('/auth/validate');
 } catch {
 return { valid: false };
 }
 }
};
