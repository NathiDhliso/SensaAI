# Authentication 404 Error - Solution

## Problem
The frontend deployed on AWS Amplify is trying to call `/api/v1/auth/session/login`, but there's no backend server to handle the request, resulting in a 404 error.

## Root Cause
- **Frontend**: Deployed as a static site on AWS Amplify
- **Backend**: Express server with auth routes is NOT deployed
- **Current Setup**: Only Lambda functions (generate, query, gym-ai) are deployed via API Gateway

## Solutions

### Option 1: Local Development (Immediate Fix)

For local development, you need to run both frontend and backend:

1. **Start the Backend**:
   ```powershell
   .\RESTART_BACKEND.ps1
   ```
   Or manually:
   ```powershell
   cd backend
   npm run dev
   ```

2. **Start the Frontend**:
   ```powershell
   npm run dev
   ```

3. **Access**: http://localhost:5173

The `.env` file is now configured to point to `http://localhost:3000/api/v1` for local development.

### Option 2: Deploy Backend to AWS (Production Fix)

You need to deploy the Express backend. Here are your options:

#### A. AWS Elastic Beanstalk (Recommended - Easy)
```bash
# Install EB CLI
pip install awsebcli

# Initialize EB in backend folder
cd backend
eb init -p node.js sensapbl-backend --region us-east-1

# Create environment
eb create sensapbl-backend-prod

# Deploy
eb deploy
```

After deployment, update `.env`:
```env
VITE_API_URL=http://sensapbl-backend-prod.us-east-1.elasticbeanstalk.com/api/v1
```

#### B. AWS ECS/Fargate (Scalable)
- Create a Docker container for the backend
- Deploy to ECS with Fargate
- Use Application Load Balancer

#### C. Convert Auth to Lambda Functions (Serverless)
Create Lambda functions for each auth endpoint and add them to API Gateway (similar to gym-ai).

### Option 3: Use Cognito Hosted UI (Simplest for Production)

Instead of custom auth endpoints, use Cognito's built-in hosted UI:

1. Update auth flow to use Cognito Hosted UI
2. Remove dependency on backend auth routes
3. Use only Lambda functions for business logic

## Recommended Approach

**For Production**: Use Option 2A (Elastic Beanstalk) or Option 3 (Cognito Hosted UI)

**For Development**: Use Option 1 (Local Backend)

## Current Status

✅ Build errors fixed (TypeScript compilation successful)
✅ Local development configured (`.env` updated)
❌ Backend not deployed to production
❌ Amplify deployment cannot authenticate users

## Next Steps

1. **Immediate**: Use local development setup
2. **Short-term**: Deploy backend to Elastic Beanstalk
3. **Long-term**: Consider migrating to fully serverless (Lambda + Cognito Hosted UI)
