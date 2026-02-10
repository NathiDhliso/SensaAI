# Complete Deployment Guide

This guide will help you deploy both the backend and frontend to AWS.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Cloud                                │
│                                                              │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │  AWS Amplify     │         │  Elastic Beanstalk      │  │
│  │  (Frontend)      │────────>│  (Backend API)          │  │
│  │  Static Site     │  HTTP   │  Express Server         │  │
│  └──────────────────┘         └─────────────────────────┘  │
│                                          │                   │
│                                          ↓                   │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │  API Gateway     │         │  DynamoDB               │  │
│  │  (Lambda)        │         │  (Concepts Storage)     │  │
│  └──────────────────┘         └─────────────────────────┘  │
│           │                                                  │
│           ↓                                                  │
│  ┌──────────────────┐                                       │
│  │  Lambda          │                                       │
│  │  (Generate/Query)│                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS CLI** installed and configured
   ```powershell
   aws configure
   ```

2. **EB CLI** (Elastic Beanstalk CLI)
   ```powershell
   pip install awsebcli
   # or
   pipx install awsebcli
   ```

3. **Node.js** and **npm** installed

## Step 1: Deploy Backend to Elastic Beanstalk

### Option A: Automated Deployment (Recommended)

Run the deployment script:

```powershell
.\DEPLOY_BACKEND.ps1
```

This script will:
- Check for EB CLI
- Initialize Elastic Beanstalk (if needed)
- Build the backend
- Deploy to AWS
- Display the backend URL

### Option B: Manual Deployment

```powershell
# Navigate to backend
cd backend

# Initialize EB (first time only)
eb init -p "Node.js 20" sensapbl-backend --region us-east-1

# Create environment (first time only)
eb create sensapbl-backend-prod --instance-type t3.small

# Build
npm run build

# Deploy
eb deploy

# Get URL
eb status
```

### Set Backend Environment Variables

After deployment, set these environment variables in EB:

```powershell
eb setenv \
  AWS_REGION=us-east-1 \
  NODE_ENV=production \
  COGNITO_USER_POOL_ID=us-east-1_nNdVox578 \
  COGNITO_CLIENT_ID=1f2i3813o3f1jdet7j6ifo1eea \
  COGNITO_DOMAIN=sensapbl-pilot.auth.us-east-1.amazoncognito.com \
  CONCEPTS_TABLE=sensapbl-concepts-pilot \
  JOBS_TABLE=sensapbl-jobs-pilot \
  GENERATE_LAMBDA=sensapbl-generate-concepts-pilot \
  CORS_ORIGINS=https://main.dckqci84h8ffk.amplifyapp.com
```

**Note**: Replace the CORS_ORIGINS with your actual Amplify URL.

## Step 2: Configure Amplify Environment Variables

### Option A: Using AWS Console

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app
3. Go to: **App settings** > **Environment variables**
4. Click **Manage variables**
5. Add these variables:

```
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_nNdVox578
VITE_COGNITO_CLIENT_ID=1f2i3813o3f1jdet7j6ifo1eea
VITE_COGNITO_DOMAIN=sensapbl-pilot.auth.us-east-1.amazoncognito.com
VITE_COGNITO_IDENTITY_POOL_ID=us-east-1:96adc9f1-c9b8-42b2-9ff6-12af81a1895a
VITE_COGNITO_REDIRECT_URI=https://main.dckqci84h8ffk.amplifyapp.com/auth/callback
VITE_AWS_S3_BUCKET_NAME=sensapbl-pilot-content-311964231104
VITE_AWS_DYNAMODB_TABLE_NAME=sensapbl-concepts-pilot
VITE_GYM_AI_URL=https://c4kxjdukwj.execute-api.us-east-1.amazonaws.com
VITE_API_URL=http://YOUR-BACKEND-URL.elasticbeanstalk.com/api/v1
```

**IMPORTANT**: Replace `YOUR-BACKEND-URL` with the actual URL from Step 1.

6. Save changes
7. Amplify will automatically redeploy

### Option B: Using AWS CLI

```powershell
# Get your Amplify App ID
aws amplify list-apps --region us-east-1

# Update environment variables
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --region us-east-1 \
  --environment-variables \
    VITE_AWS_REGION=us-east-1 \
    VITE_API_URL=http://YOUR-BACKEND-URL.elasticbeanstalk.com/api/v1 \
    # ... (add all other variables)
```

### Option C: Using Helper Script

```powershell
.\SET_AMPLIFY_ENV.ps1
```

This will show you all the variables and guide you through the process.

## Step 3: Verify Deployment

### Test Backend

```powershell
# Health check
curl http://YOUR-BACKEND-URL.elasticbeanstalk.com/health

# Should return: {"status":"ok"}
```

### Test Frontend

1. Go to your Amplify URL: `https://main.dckqci84h8ffk.amplifyapp.com`
2. Try to log in
3. Check browser console for errors

## Step 4: Update CORS Settings

If you get CORS errors, update the backend CORS settings:

```powershell
cd backend
eb setenv CORS_ORIGINS=https://main.dckqci84h8ffk.amplifyapp.com,http://localhost:5173
```

## Troubleshooting

### Backend Issues

**Check logs:**
```powershell
cd backend
eb logs
```

**SSH into instance:**
```powershell
eb ssh
```

**Restart:**
```powershell
eb restart
```

### Frontend Issues

**Check build logs in Amplify Console:**
1. Go to Amplify Console
2. Select your app
3. Click on the latest build
4. Review build logs

**Common issues:**
- Missing environment variables → Add them in Amplify Console
- CORS errors → Update CORS_ORIGINS in backend
- 404 on API calls → Check VITE_API_URL is correct

### Authentication Issues

**Verify Cognito settings:**
```powershell
aws cognito-idp describe-user-pool --user-pool-id us-east-1_nNdVox578
```

**Check redirect URIs in Cognito:**
1. Go to Cognito Console
2. Select your User Pool
3. App integration > App client settings
4. Verify callback URLs include your Amplify URL

## Monitoring

### Backend Monitoring

```powershell
# View environment health
eb health

# View recent logs
eb logs --stream
```

### Frontend Monitoring

Check CloudWatch logs in AWS Console:
- Amplify > Your App > Monitoring

## Cost Optimization

**Elastic Beanstalk:**
- Instance type: t3.small (~$15/month)
- Auto-scaling: Set min=1, max=2
- Consider using t3.micro for development

**Amplify:**
- Free tier: 1000 build minutes/month
- Hosting: ~$0.15/GB served

## Cleanup

To delete resources:

```powershell
# Delete backend
cd backend
eb terminate sensapbl-backend-prod

# Delete Amplify app (via console or CLI)
aws amplify delete-app --app-id YOUR_APP_ID
```

## Next Steps

1. Set up custom domain (optional)
2. Enable HTTPS with SSL certificate
3. Set up CI/CD pipeline
4. Configure monitoring and alerts
5. Set up backup strategy for DynamoDB

## Support

If you encounter issues:
1. Check logs (eb logs, Amplify console)
2. Verify environment variables
3. Check AWS service quotas
4. Review IAM permissions
