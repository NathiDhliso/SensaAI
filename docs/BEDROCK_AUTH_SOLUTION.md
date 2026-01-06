# AWS Bedrock Authentication Solution

## The Problem

You're seeing a **403 Forbidden** error because AWS Bedrock cannot be accessed directly from a browser with just an API key. The "Bedrock API Key" shown in the AWS console is a reference identifier, not an authentication token.

## Why This Happens

1. **CORS Restrictions**: AWS Bedrock endpoints don't allow direct browser requests
2. **AWS SigV4 Authentication**: Bedrock requires proper AWS credential signing
3. **Security**: Browser-based AWS credentials pose security risks

## Solution Options

### Option 1: Backend Proxy Server (Recommended)

Create a simple Express.js backend:

```javascript
// server.js
const express = require('express');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const app = express();
app.use(express.json());

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post('/api/bedrock/invoke', async (req, res) => {
  try {
    const { messages, systemPrompt, maxTokens } = req.body;
    
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-sonnet-4-20250514-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens || 4000,
        system: systemPrompt,
        messages,
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    res.json(responseBody);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Proxy server running on port 3001'));
```

Then update your frontend to call this proxy instead of Bedrock directly.

### Option 2: AWS Cognito Identity Pool

1. Create a Cognito Identity Pool in AWS Console
2. Configure IAM role with Bedrock permissions
3. Update the app to use Cognito credentials:

```typescript
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: fromCognitoIdentityPool({
    identityPoolId: 'us-east-1:your-identity-pool-id',
    clientConfig: { region: 'us-east-1' },
  }),
});
```

### Option 3: Development with AWS CLI (Local Only)

For local development, if you have AWS CLI configured:

1. Run `aws configure` and enter your credentials
2. The AWS SDK will automatically use these credentials
3. **Never commit credentials to git**

## Quick Fix for Testing

If you want to test locally right now:

1. Install AWS CLI
2. Run `aws configure` and enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-east-1)
3. The app will use these credentials automatically

## Recommended Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │─────▶│  Backend API │─────▶│ AWS Bedrock │
│  (React App)│      │  (Express.js)│      │   (Claude)  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  AWS Secrets │
                     │   Manager    │
                     └──────────────┘
```

## Next Steps

Choose one of the solutions above based on your needs:
- **Production**: Use Option 1 (Backend Proxy)
- **Scalable**: Use Option 2 (Cognito)
- **Quick Test**: Use Option 3 (AWS CLI)

Would you like me to implement any of these solutions for you?
