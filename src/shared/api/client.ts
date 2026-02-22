/**
 * API Client for SensaAI Backend
 * 
 * Uses token-based authentication via Authorization: Bearer header.
 * Tokens read from zustand persist storage (localStorage).
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
  /** Request timeout in milliseconds. Defaults to DEFAULT_REQUEST_TIMEOUT_MS. Set 0 to disable. */
  timeout?: number;
}

/** Default timeout for API requests (30 seconds). Prevents fetch from hanging indefinitely. */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  body?: unknown;
  code?: string;
  requestMethod?: string;
  requestPath?: string;
  isNetworkError?: boolean;
  isAbortError?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractMessageFromBody(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === 'string') {
    const value = body.trim();
    return value ? value : null;
  }
  if (isRecord(body)) {
    const candidates = ['error', 'message', 'detail', 'error_description'] as const;
    for (const key of candidates) {
      const value = body[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}

function extractCodeFromBody(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  const code = body.code;
  return typeof code === 'string' && code.trim() ? code : undefined;
}

function getDefaultMessageForStatus(status: number): string {
  if (status === 400) return 'Request was invalid. Please check your input and try again.';
  if (status === 401) return 'Session expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'Requested resource was not found.';
  if (status === 409) return 'The request could not be completed due to a conflict.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Server error. Please try again shortly.';
  return 'Request failed. Please try again.';
}

function createApiError(params: {
  message: string;
  status?: number;
  statusText?: string;
  body?: unknown;
  code?: string;
  requestMethod?: string;
  requestPath?: string;
  isNetworkError?: boolean;
  isAbortError?: boolean;
}): ApiError {
  const error = new Error(params.message) as ApiError;
  error.status = params.status;
  error.statusText = params.statusText;
  error.body = params.body;
  error.code = params.code;
  error.requestMethod = params.requestMethod;
  error.requestPath = params.requestPath;
  error.isNetworkError = params.isNetworkError;
  error.isAbortError = params.isAbortError;
  return error;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && (
    'status' in error ||
    'isNetworkError' in error ||
    'isAbortError' in error ||
    'requestPath' in error
  );
}

export function isAuthError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.status === 401 || error.status === 403 || error.code === 'SESSION_EXPIRED';
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('session expired') || message.includes('unauthorized');
  }
  return false;
}

export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (isApiError(error)) {
    const bodyMessage = extractMessageFromBody(error.body);
    if (bodyMessage) return bodyMessage;
    if (error.message) return error.message;
    if (typeof error.status === 'number') return getDefaultMessageForStatus(error.status);
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

// ============================================================================
// TOKEN ACCESSOR (reads from zustand persist storage to avoid circular imports)
// ============================================================================
function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('sensaai-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.tokens?.id_token || parsed?.state?.tokens?.access_token || null;
    }
  } catch {
    return null;
  }
  return null;
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================
class ApiClient {
  private getHeaders(options?: ApiRequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!options?.skipAuth) {
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    if (options?.headers) {
      const customHeaders = options.headers as Record<string, string>;
      Object.assign(headers, customHeaders);
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
      credentials: 'include',
    };

    if (options?.signal) {
      fetchOptions.signal = options.signal;
    }

    if (body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    return fetchOptions;
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    if (response.status === 204 || response.status === 205) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        return await response.json();
      }

      const text = await response.text();
      if (!text) return null;

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch {
      return null;
    }
  }

  private async createResponseError(
    response: Response,
    requestMethod: string,
    requestPath: string,
    shouldNotifyUnauthorized: boolean
  ): Promise<ApiError> {
    const body = await this.parseResponseBody(response);
    const bodyMessage = extractMessageFromBody(body);
    const message = bodyMessage || getDefaultMessageForStatus(response.status);
    const code = extractCodeFromBody(body);

    if (response.status === 401 && shouldNotifyUnauthorized) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return createApiError({
      message,
      status: response.status,
      statusText: response.statusText,
      body,
      code,
      requestMethod,
      requestPath
    });
  }

  private createNetworkError(
    error: unknown,
    requestMethod: string,
    requestPath: string
  ): ApiError {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return createApiError({
        message: 'Request was cancelled.',
        requestMethod,
        requestPath,
        isAbortError: true,
        isNetworkError: true
      });
    }

    const offline =
      typeof navigator !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(navigator, 'onLine') &&
      navigator.onLine === false;

    return createApiError({
      message: offline
        ? 'You appear to be offline. Check your connection and try again.'
        : 'Network error. Unable to reach the server.',
      requestMethod,
      requestPath,
      isNetworkError: true
    });
  }

  private async request<T>(
    method: string,
    path: string,
    options?: ApiRequestOptions,
    body?: unknown
  ): Promise<T> {
    const fetchOptions = this.buildFetchOptions(method, options, body);

    // Apply a default timeout via AbortController so fetch can never hang indefinitely.
    // If the caller already provided a signal, chain both so either can abort.
    const timeoutMs = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0 && !fetchOptions.signal) {
      const controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, fetchOptions);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      // Distinguish timeout aborts from user-initiated aborts
      if (error instanceof DOMException && error.name === 'AbortError' && timeoutMs > 0) {
        throw createApiError({
          message: `Request timed out after ${timeoutMs / 1000}s. The server may be slow or unreachable.`,
          requestMethod: method,
          requestPath: path,
          isNetworkError: true
        });
      }
      throw this.createNetworkError(error, method, path);
    }
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      throw await this.createResponseError(response, method, path, !options?.skipAuth);
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const parsed = await this.parseResponseBody(response);
    return parsed as T;
  }

  /**
  * Make a GET request
  */
  async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  /**
  * Make a POST request
  */
  async post<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, options, data);
  }

  /**
  * Make a PUT request
  */
  async put<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', path, options, data);
  }

  /**
  * Make a DELETE request
  */
  async delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /**
  * SSE streaming for generation
  */
  async *stream(
    path: string,
    options?: ApiRequestOptions
  ): AsyncGenerator<{ content?: string; status?: string; error?: string; done?: boolean }> {
    const headers = this.getHeaders(options);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method: 'GET',
        headers: {
          ...headers,
          Accept: 'text/event-stream'
        },
        credentials: 'include',
        signal: options?.signal
      });
    } catch (error) {
      throw this.createNetworkError(error, 'GET', path);
    }

    if (!response.ok) {
      throw await this.createResponseError(response, 'GET', path, !options?.skipAuth);
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
 * Authentication session management via Lambda token API.
 * Tokens stored in zustand persist (localStorage) and sent as Authorization header.
 */
export interface AuthTokens {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  preferredUsername?: string;
  role?: 'learner' | 'curator' | 'admin';
}

export interface UpdateProfileRequest {
  name?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  preferredUsername?: string;
}

export const authSessionApi = {
  async exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    return apiClient.post('/auth/exchange', {
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    }, { skipAuth: true });
  },

  async loginWithCredentials(
    email: string,
    password: string
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    return apiClient.post('/auth/login', {
      email,
      password
    }, { skipAuth: true });
  },

  async refreshSession(refreshToken: string): Promise<{ access_token: string; id_token: string; expires_in: number }> {
    return apiClient.post('/auth/refresh', { refresh_token: refreshToken }, { skipAuth: true });
  },

  async clearSession(): Promise<{ success: boolean }> {
    try {
      return await apiClient.post('/auth/logout');
    } catch {
      return { success: true };
    }
  },

  async validateSession(): Promise<{
    valid: boolean;
    user?: AuthUser;
  }> {
    try {
      return await apiClient.get('/auth/validate');
    } catch {
      return { valid: false };
    }
  },

  async getProfile(): Promise<{ user: AuthUser }> {
    return apiClient.get('/auth/profile');
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<{ user: AuthUser }> {
    return apiClient.put('/auth/profile', payload);
  }
};
