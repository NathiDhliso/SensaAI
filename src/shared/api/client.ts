/**
 * API Client for SensaPBL Backend
 * 
 * Supports two authentication modes:
 * 1. HttpOnly Cookie auth (preferred, more secure)
 * 2. Bearer token auth (fallback for compatibility)
 * 
 * Cookie-based auth uses `credentials: 'include'` to send cookies automatically.
 * The backend sets HttpOnly cookies that JavaScript cannot access directly.
 * 
 * @module lib/api/client
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
// ============================================================================
// TYPES
// ============================================================================
interface ApiClientConfig {
 /** Legacy token getter for Bearer auth fallback */
 getToken?: () => Promise<string | null>;
 /** Enable cookie-based authentication (default: true) */
 useCookieAuth?: boolean;
}
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
// API CLIENT CLASS
// ============================================================================
class ApiClient {
 private config: ApiClientConfig = { useCookieAuth: true };
 /**
 * Configure the API client
 */
 configure(config: ApiClientConfig) {
 this.config = { ...this.config, ...config };
 }
 /**
 * Check if cookie-based authentication is enabled
 */
 get usesCookieAuth(): boolean {
 return this.config.useCookieAuth ?? true;
 }
 /**
 * Build request headers
 */
 private async getHeaders(options?: ApiRequestOptions): Promise<HeadersInit> {
 const headers: HeadersInit = {
 'Content-Type': 'application/json',
 ...options?.headers
 };
 // For cookie auth, credentials are sent via cookies automatically
 // Only add Bearer token if not using cookie auth
 if (!this.config.useCookieAuth && this.config.getToken && !options?.skipAuth) {
 const token = await this.config.getToken();
 if (token) {
 (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
 }
 }
 return headers;
 }
 /**
 * Build fetch options with credentials
 */
 private async buildFetchOptions(
 method: string,
 options?: ApiRequestOptions,
 body?: unknown
 ): Promise<RequestInit> {
 const fetchOptions: RequestInit = {
 method,
 headers: await this.getHeaders(options),
 // Include credentials for cookie-based auth
 credentials: this.config.useCookieAuth ? 'include' : 'same-origin'
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
 // Emit auth error event for store to handle
 window.dispatchEvent(new CustomEvent('auth:unauthorized'));
 }
 throw error;
 }
 /**
 * Make a GET request
 */
 async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
 const fetchOptions = await this.buildFetchOptions('GET', options);
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
 const fetchOptions = await this.buildFetchOptions('POST', options, data);
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
 const fetchOptions = await this.buildFetchOptions('PUT', options, data);
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
 const fetchOptions = await this.buildFetchOptions('DELETE', options);
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
 const headers = await this.getHeaders(options);
 const response = await fetch(`${API_BASE}${path}`, {
 method: 'GET',
 headers: {
 ...headers,
 Accept: 'text/event-stream'
 },
 credentials: this.config.useCookieAuth ? 'include' : 'same-origin',
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
 * Authentication session management using HttpOnly cookies.
 * These functions coordinate with the backend to set/clear session cookies.
 */
export const authSessionApi = {
 /**
 * Exchange auth code for session cookies (OAuth callback)
 * Backend will set HttpOnly cookies in response
 */
 async exchangeCode(
 code: string,
 redirectUri: string,
 codeVerifier: string
 ): Promise<{ user: { id: string; email: string; name?: string } }> {
 return apiClient.post('/auth/session', {
 code,
 redirect_uri: redirectUri,
 code_verifier: codeVerifier
 });
 },
 /**
 * Login with credentials and receive session cookies
 * Backend will set HttpOnly cookies in response
 */
 async loginWithCredentials(
 email: string,
 password: string
 ): Promise<{ user: { id: string; email: string; name?: string } }> {
 return apiClient.post('/auth/session/login', {
 email,
 password
 });
 },
 /**
 * Refresh the session cookies
 * Backend will refresh and reset HttpOnly cookies
 */
 async refreshSession(): Promise<{ success: boolean }> {
 return apiClient.post('/auth/session/refresh');
 },
 /**
 * Clear session cookies (logout)
 * Backend will expire the HttpOnly cookies
 */
 async clearSession(): Promise<{ success: boolean }> {
 return apiClient.post('/auth/session/clear');
 },
 /**
 * Check if current session is valid
 * Verifies cookies are present and not expired
 */
 async validateSession(): Promise<{
 valid: boolean;
 user?: { id: string; email: string; name?: string };
 }> {
 try {
 return await apiClient.get('/auth/session/validate');
 } catch {
 return { valid: false };
 }
 }
};