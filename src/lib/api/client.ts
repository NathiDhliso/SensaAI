// API Client for SensaPBL Backend
// Handles authentication and API calls

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

interface ApiClientConfig {
    getToken: () => Promise<string | null>;
}

class ApiClient {
    private config: ApiClientConfig | null = null;

    configure(config: ApiClientConfig) {
        this.config = config;
    }

    private async getHeaders(): Promise<HeadersInit> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.config) {
            const token = await this.config.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    async get<T>(path: string): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'GET',
            headers: await this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async post<T>(path: string, data?: unknown): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async delete<T>(path: string): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers: await this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // SSE streaming for generation
    async *stream(path: string): AsyncGenerator<{ content?: string; status?: string; error?: string; done?: boolean }> {
        const headers = await this.getHeaders();

        const response = await fetch(`${API_BASE}${path}`, {
            method: 'GET',
            headers: {
                ...headers,
                'Accept': 'text/event-stream',
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
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

export const apiClient = new ApiClient();
