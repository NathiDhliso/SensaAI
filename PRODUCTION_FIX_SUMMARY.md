# Production Content Generation Fix

## Problem
User could log in successfully on production but couldn't generate content. The error was:
```
Error: API Error: 400 - {"error":"sessionId is required"}
```

## Root Cause
The frontend was calling `/concepts/jobs?userId=...` but the Lambda function expected an `action` query parameter to determine which operation to perform. Without the `action` parameter, it defaulted to `get_concepts` which requires a `sessionId`.

## Solution
Updated the frontend API client to include the correct `action` query parameters:

### Changes Made

1. **Fixed `listJobs` API call** (`src/shared/api/concepts.ts`)
   - Before: `/concepts/jobs?userId=${userId}`
   - After: `/concepts/jobs?userId=${userId}&action=list_subjects`

2. **Fixed `getJobStatus` API call** (`src/shared/api/concepts.ts`)
   - Before: `/concepts/jobs/${jobId}?userId=${userId}`
   - After: `/concepts?userId=${userId}&action=get_job_progress&jobId=${jobId}`

3. **Fixed TypeScript warning** (`src/shared/services/audio.ts`)
   - Changed unused `reject` parameter to `_reject`

## Deployment Status
✅ Code pushed to GitHub
✅ Amplify build triggered automatically
⏳ Waiting for Amplify deployment to complete (~5 minutes)

## Testing
Once Amplify deployment completes, test the following:

1. **Login**: https://main.dckqci84h8ffk.amplifyapp.com/login
   - Email: nkosinathi.dhliso@gmail.com
   - Password: [your password]

2. **Generate Content**: https://main.dckqci84h8ffk.amplifyapp.com/generate
   - Enter a subject (e.g., "AWS Solutions Architect")
   - Click "Generate"
   - Should see concepts being generated

3. **View Saved Results**: https://main.dckqci84h8ffk.amplifyapp.com/saved
   - Should see list of previously generated content

## API Endpoints Working
✅ POST /auth/session/login - Authentication
✅ GET /auth/session/validate - Session validation
✅ POST /auth/session/refresh - Token refresh
✅ POST /auth/session/clear - Logout
✅ POST /generate - Generate concepts
✅ GET /concepts/jobs - List user's generation jobs
✅ GET /concepts?action=get_job_progress - Get job status
✅ GET /concepts/{subjectId} - Get concepts for a subject
✅ GET /concepts/{subjectId}/{tier} - Get concepts by tier
✅ POST /gym-ai - AI gym activities

## What Was NOT Needed
- ❌ Deploying Express backend to Elastic Beanstalk
- ❌ Creating new Lambda functions
- ❌ Modifying Lambda code
- ❌ Adding new API Gateway routes

The issue was simply that the frontend wasn't sending the correct query parameters that the Lambda expected.

## Next Steps
1. Wait for Amplify build to complete
2. Test content generation on production
3. If successful, all features should work as expected

## Monitoring
Check Amplify build status:
```powershell
aws amplify list-jobs --app-id dckqci84h8ffk --branch-name main --region us-east-1 --max-results 1
```

Check Lambda logs if issues persist:
```powershell
aws logs tail /aws/lambda/sensapbl-query-concepts-pilot --region us-east-1 --follow
```

---

**Status**: Fix deployed, waiting for Amplify build
**ETA**: ~5 minutes
**Impact**: Content generation should work on production after deployment
