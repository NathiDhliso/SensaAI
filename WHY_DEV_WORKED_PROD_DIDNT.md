# Why Dev Worked But Prod Didn't

## The Architecture Difference

### Development (localhost:3000)
```
Frontend → Express Backend (TypeScript) → AWS Services
         backend/src/                    (Cognito, DynamoDB, S3)
```

**Key Point**: Lambda code in `backend/lambda/` is NEVER used in dev!

### Production (AWS)
```
Frontend → API Gateway → Lambda Functions (Python) → AWS Services
                        backend/lambda/              (Cognito, DynamoDB, S3)
```

**Key Point**: Express code in `backend/src/` is NEVER used in prod!

## What Happened

### Timeline of Events

1. **Initial State**: Everything working
   - Dev: Express backend working fine
   - Prod: Lambda functions working fine

2. **My Mistake**: Manual Lambda edits
   - I tried to update Lambda code directly
   - Introduced Python indentation errors
   - Deployed broken code to AWS

3. **Result**:
   - ✅ Dev kept working (uses Express, not Lambda)
   - ❌ Prod broke (uses Lambda with indentation errors)

### The Indentation Errors

**What I broke:**
```python
# WRONG (what I deployed)
try:
 # comment
 code()  # Only 1 space indent - Python syntax error!

# CORRECT (what it should be)
try:
    # comment
    code()  # 4 spaces indent
```

**Files affected:**
- `backend/lambda/query_concepts/handler.py` ❌
- `backend/lambda/generate_concepts/handler.py` ❌
- `backend/lambda/gym_ai/handler.py` ❌
- `backend/lambda/shared/utils.py` ❌

## Why I Didn't Delete Working Code

**The working code was always in git!**

I never committed the broken code. I only deployed it to AWS. The git repository still had the correct code, I just needed to restore it.

## The Fix

1. Restored all Lambda files from working git commits
2. Redeployed all Lambda functions with correct code
3. Verified Python syntax before deploying

## Current Status

### All Lambda Functions Fixed ✅

```bash
# Query Lambda
aws lambda update-function-code \
  --function-name sensapbl-query-concepts-pilot \
  --zip-file fileb://query_concepts.zip
  
# Generate Lambda  
aws lambda update-function-code \
  --function-name sensapbl-generate-concepts-pilot \
  --zip-file fileb://generate_concepts.zip
  
# Gym AI Lambda
aws lambda update-function-code \
  --function-name sensapbl-gym-ai-pilot \
  --zip-file fileb://gym_ai.zip
```

## Lessons Learned

### 1. Two Separate Codebases
- **Dev**: `backend/src/` (TypeScript/Express)
- **Prod**: `backend/lambda/` (Python/Lambda)
- Changes to one don't affect the other!

### 2. Always Test Python Syntax
```bash
python -m py_compile backend/lambda/*/handler.py
```

### 3. Indentation Matters in Python
- Python uses indentation for code blocks
- Mixing spaces/tabs causes errors
- Always use 4 spaces (not tabs)

### 4. Manual Deployments Are Risky
- Should use Terraform for Lambda deployments
- Manual updates can introduce errors
- Always test locally first

## Why This Architecture?

### Development Benefits
- Fast iteration with hot reload
- Easy debugging with TypeScript
- No AWS deployment needed for testing

### Production Benefits
- Serverless scaling
- Pay per use
- No server management

### The Tradeoff
- Two codebases to maintain
- Different languages (TypeScript vs Python)
- Must keep both in sync functionally

## Future Improvements

### Option 1: Use Terraform for Lambda Deployments
```hcl
resource "aws_lambda_function" "generate" {
  filename      = "lambda.zip"
  function_name = "sensapbl-generate-concepts-pilot"
  # ... configuration
}
```

### Option 2: Deploy Express to AWS
- Use Elastic Beanstalk or ECS
- Single codebase for dev and prod
- No Lambda/Express duplication

### Option 3: Use Lambda for Dev Too
- Run Lambda functions locally with SAM
- Same code in dev and prod
- More complex dev setup

## Summary

**Dev worked because:**
- Uses Express backend (`backend/src/`)
- Lambda code never touched

**Prod broke because:**
- Uses Lambda functions (`backend/lambda/`)
- I deployed code with Python indentation errors

**I didn't delete code:**
- Working code always in git
- Just deployed broken code to AWS
- Restored from git and redeployed

**Now fixed:**
- All Lambda functions restored
- Production working again
- Git has correct code

---

**Key Takeaway**: Dev and Prod use completely different code! Changes to Lambda don't affect dev, and changes to Express don't affect prod.
