# Terraform Status - Quick Answer

## Your Question: "so all lambda dynadb indexdb etc all in prod and terraform knows about this?"

### Short Answer
**Mostly YES, but with important exceptions:**

✅ **Terraform Manages:**
- Cognito (user pool, client, identity pool)
- DynamoDB tables (concepts, jobs) with GSI indexes
- 3 Lambda functions (generate, query, gym-ai)
- API Gateway with routes
- S3 content bucket
- IAM roles and policies

❌ **NOT in Terraform (deployed manually):**
- Auth Lambda (`sensapbl-auth-lambda`)
- Auth API Gateway routes (`/auth/session/*`)
- Deployment S3 bucket

⚠️ **DRIFT WARNING:**
- I manually updated the query Lambda code today
- Next Terraform apply will overwrite my changes!

## What's in Production

### Lambda Functions (4 total)
```
✅ sensapbl-generate-concepts-pilot  (Terraform)
⚠️ sensapbl-query-concepts-pilot     (Terraform, but I modified it!)
✅ sensapbl-gym-ai-pilot              (Terraform)
❌ sensapbl-auth-lambda               (Manual - NOT in Terraform)
```

### DynamoDB Tables (2 total)
```
✅ sensapbl-concepts-pilot  (Terraform)
   - GSI: tier-index (for filtering by tier)
✅ sensapbl-jobs-pilot      (Terraform)
```

### API Gateway Routes
```
✅ POST /generate                    (Terraform)
✅ GET /concepts/{subjectId}         (Terraform)
✅ GET /concepts/{subjectId}/{tier}  (Terraform)
✅ GET /concepts/jobs                (Terraform)
✅ GET /concepts/jobs/{jobId}        (Terraform)
✅ GET /jobs/{jobId}                 (Terraform)
✅ POST /gym-ai                      (Terraform)

❌ POST /auth/session/login          (Manual)
❌ GET /auth/session/validate        (Manual)
❌ POST /auth/session/refresh        (Manual)
❌ POST /auth/session/clear          (Manual)
❌ OPTIONS /auth/session/login       (Manual)
```

### S3 Buckets (2 total)
```
✅ sensapbl-pilot-content-311964231104  (Terraform)
❌ sensapbl-deployments-311964231104    (Manual - for deployment artifacts)
```

## The Problem

### Today's Changes
1. I updated the query Lambda code manually (not through Terraform)
2. This created "drift" - AWS state doesn't match Terraform state
3. If you run `terraform apply`, it will revert my changes!

### The Auth Lambda Issue
- Auth Lambda was deployed manually using `DEPLOY_AUTH_LAMBDA.ps1`
- It's NOT in Terraform configuration
- Terraform doesn't know it exists
- This is fine for now, but not ideal long-term

## What You Should Do

### Immediate (Before Next Terraform Apply)
1. **Don't run `terraform apply` yet** - it will break production!
2. The query Lambda changes I made need to be in the source code first

### Short-term Fix
Since I only changed the query Lambda to auto-detect the action from the path, but then we fixed it in the frontend instead, we're actually OK! The Lambda code in Terraform is still correct.

### Long-term (Recommended)
1. Add auth Lambda to Terraform configuration
2. Add auth routes to API Gateway module
3. All future changes through Terraform only

## Current Deployment Workflow

### Frontend (Working Great)
```
Code Change → Git Push → Amplify Auto-Deploy ✅
```

### Lambda (Mixed)
```
Generate/Query/Gym: Terraform manages ✅
Auth Lambda: Manual deployment ❌
```

### Infrastructure (Terraform)
```
terraform apply → Updates AWS resources ✅
```

## Bottom Line

**Yes, Terraform knows about most of your infrastructure:**
- ✅ All DynamoDB tables and indexes
- ✅ 3 out of 4 Lambda functions
- ✅ Most API Gateway routes
- ✅ Cognito, S3, IAM

**But NOT everything:**
- ❌ Auth Lambda (manual)
- ❌ Auth API routes (manual)

**Current Risk:**
- LOW - Everything is working
- The manual auth Lambda is stable
- Just don't run `terraform apply` without checking first

**Recommendation:**
- Keep using Terraform for infrastructure changes
- Document the manual auth Lambda
- Consider adding it to Terraform later when you have time
