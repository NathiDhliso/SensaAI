# Backend Deployment Comparison: Dev vs Prod

## Current Situation

### Dev (localhost:3000)
✅ **Full Express Backend Running**
- All routes available
- `/api/v1/auth/*` - Authentication
- `/api/v1/concepts/*` - Concept generation & queries
- `/api/v1/content/*` - Content management
- `/api/v1/gym-ai/*` - AI gym activities
- `/api/v1/proxy/*` - Proxy for external resources

### Prod (API Gateway)
⚠️ **Only Lambda Functions Deployed**
- ✅ `/auth/session/*` - Auth Lambda (deployed)
- ✅ `/generate` - Generate Lambda (deployed)
- ✅ `/concepts/*` - Query Lambda (deployed)
- ✅ `/gym-ai` - Gym AI Lambda (deployed)
- ❌ `/content/*` - NOT deployed
- ❌ `/proxy/*` - NOT deployed
- ❌ Other Express routes - NOT deployed

## The Problem

Your frontend on production (`https://main.dckqci84h8ffk.amplifyapp.com`) is trying to call endpoints that don't exist because:

1. **API Gateway only has Lambda functions** - not the full Express backend
2. **Some routes are missing** - content, proxy, and other Express-only routes
3. **Different URL structure** - API Gateway uses different paths than Express

## Solutions

### Option 1: Deploy Full Express Backend (Recommended)

Deploy the Express server to AWS so all routes are available.

**Pros:**
- All routes work immediately
- No code changes needed
- Matches dev environment exactly

**Cons:**
- Costs ~$15/month (EC2 or Elastic Beanstalk)
- Requires server management

**How to Deploy:**

#### A. Using Elastic Beanstalk (Easiest)
```powershell
# Install EB CLI (if not already)
pip install awsebcli

# Deploy
.\DEPLOY_BACKEND.ps1
```

This will:
1. Package your backend
2. Deploy to Elastic Beanstalk
3. Give you a URL like: `http://sensapbl-backend.elasticbeanstalk.com`

Then update Amplify:
```powershell
aws amplify update-app `
  --app-id dckqci84h8ffk `
  --region us-east-1 `
  --environment-variables VITE_API_URL=http://YOUR-EB-URL/api/v1
```

#### B. Using AWS App Runner (Serverless)
```powershell
# Build Docker image
cd backend
docker build -t sensapbl-backend .

# Push to ECR and deploy to App Runner
# (requires Docker and ECR setup)
```

### Option 2: Create Lambda Functions for Missing Routes

Convert the missing Express routes to Lambda functions.

**Pros:**
- Fully serverless
- Lower cost (~$5/month)
- Auto-scaling

**Cons:**
- Requires code conversion
- More complex deployment
- Need to create Lambda for each route

**Missing Routes to Convert:**
1. Content routes (`/api/v1/content/*`)
2. Proxy routes (`/api/v1/proxy/*`)

### Option 3: Hybrid Approach (Current + Express)

Keep Lambda functions for heavy operations, deploy Express for other routes.

**Setup:**
1. Deploy Express backend to Elastic Beanstalk
2. Keep existing Lambda functions
3. Frontend calls Express for most routes
4. Express can call Lambda functions internally if needed

## Recommended Approach

**For Quick Fix:** Deploy Express backend to Elastic Beanstalk

**Steps:**
1. Run `.\DEPLOY_BACKEND.ps1`
2. Wait for deployment (~10 minutes)
3. Update `VITE_API_URL` in Amplify
4. Redeploy frontend

**For Long-term:** Gradually migrate to Lambda functions

## Current API Gateway Routes

```
POST /gym-ai                      ✅ Deployed
GET /concepts/{subjectId}/{tier}  ✅ Deployed
POST /generate                    ✅ Deployed
POST /auth/session/clear          ✅ Deployed
OPTIONS /auth/session/login       ✅ Deployed
GET /concepts/{subjectId}         ✅ Deployed
GET /jobs/{jobId}                 ✅ Deployed
POST /auth/session/login          ✅ Deployed
GET /auth/session/validate        ✅ Deployed
POST /auth/session/refresh        ✅ Deployed
```

## Missing Routes (Need Express Backend)

```
/api/v1/content/*                 ❌ Not deployed
/api/v1/proxy/*                   ❌ Not deployed
/health                           ❌ Not deployed
/ready                            ❌ Not deployed
```

## Quick Test

Check if a route exists on production:

```powershell
# Test auth (should work)
curl https://c4kxjdukwj.execute-api.us-east-1.amazonaws.com/auth/session/validate

# Test content (will fail - not deployed)
curl https://c4kxjdukwj.execute-api.us-east-1.amazonaws.com/content/list
```

## Next Steps

1. **Decide on deployment strategy** (Elastic Beanstalk recommended)
2. **Deploy Express backend** using `DEPLOY_BACKEND.ps1`
3. **Update Amplify environment variables** with new backend URL
4. **Test all routes** to ensure they work

---

**Status**: Express backend not deployed on production
**Impact**: Some features won't work on production
**Solution**: Deploy Express backend to Elastic Beanstalk
**ETA**: ~15 minutes to deploy
