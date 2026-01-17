import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { useAuthStore } from '@/store/auth-store';

export type BedrockConfig = {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  useCognito?: boolean;
};

export type BedrockMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type BedrockTool = {
  type: string;
  name: string;
};

let clientInstance: BedrockRuntimeClient | null = null;
let currentRegion: string | null = null;

export async function getBedrockClient(config: BedrockConfig): Promise<BedrockRuntimeClient> {
  // For Cognito authentication, validate the session first
  // Note: Tokens are now in HttpOnly cookies - we just need to ensure session is valid
  if (config.useCognito) {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated) {
      // Try to validate session in case cookies are still valid
      const isValid = await authState.validateSession();
      if (!isValid) {
        throw new Error('User not authenticated');
      }
    }
  }

  // Create a unique config key for caching the client
  const authState = useAuthStore.getState();
  const configKey = JSON.stringify({ ...config, userId: authState.user?.id || 'none' });

  if (!clientInstance || currentRegion !== configKey) {
    let credentials;

    if (config.useCognito) {
      const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;
      const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;

      if (!identityPoolId || !userPoolId) {
        throw new Error('Cognito configuration missing');
      }

      // Note: Since we're using HttpOnly cookies, the Cognito Identity Pool
      // will need to be configured for authenticated/unauthenticated access
      // The actual token exchange happens server-side via the API gateway
      credentials = fromCognitoIdentityPool({
        clientConfig: { region: config.region },
        identityPoolId,
        // For HttpOnly cookie auth, we use unauthenticated identity pool access
        // and let the API gateway handle actual authentication
      });
    } else if (config.accessKeyId && config.secretAccessKey) {
      credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    } else {
      throw new Error('Invalid Bedrock Configuration: No credentials provided');
    }

    clientInstance = new BedrockRuntimeClient({
      region: config.region,
      credentials,
    });
    currentRegion = configKey;
  }

  return clientInstance;
}

export async function invokeClaudeModel(
  client: BedrockRuntimeClient,
  messages: BedrockMessage[],
  systemPrompt: string,
  maxTokens: number = 4000,
  tools?: BedrockTool[],
  abortSignal?: AbortSignal
): Promise<string> {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    ...(tools && { tools }),
  };

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  if (abortSignal?.aborted) {
    throw new Error('Generation cancelled by user');
  }

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return extractTextFromBedrockResponse(responseBody);
}

export async function* invokeClaudeModelStream(
  client: BedrockRuntimeClient,
  messages: BedrockMessage[],
  systemPrompt: string,
  maxTokens: number = 64000,
  abortSignal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  if (abortSignal?.aborted) {
    throw new Error('Generation cancelled by user');
  }

  const response = await client.send(command);

  if (!response.body) {
    throw new Error('No response body from Bedrock');
  }

  for await (const event of response.body) {
    if (abortSignal?.aborted) {
      throw new Error('Generation cancelled by user');
    }
    if (event.chunk) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}

interface BedrockContentBlock {
  type: string;
  text?: string;
}

interface BedrockResponse {
  content?: BedrockContentBlock[];
}

function extractTextFromBedrockResponse(response: BedrockResponse): string {
  if (response.content && Array.isArray(response.content)) {
    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text || '')
      .join('\n');
  }
  return '';
}

export function parseJsonFromResponse<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }
  return JSON.parse(jsonMatch[0]) as T;
}
