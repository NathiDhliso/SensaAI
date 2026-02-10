# Infrastructure Audit: Terraform vs Actual AWS Resources

## Summary
⚠️ **CRITICAL**: Some production resources were deployed manually and are NOT managed by Terraform!

## What Terraform SHOULD Manage (per main.tf)

### ✅ Cognito
- User Pool: `sensapbl-pilot`
- User Pool Client
- Identity Pool
- **Status**: ✅ Managed by Terraform

### ✅ DynamoDB Tables
- `sensapbl-concepts-pilot` - Concepts storage with GSI
- `sensapbl-jobs-pilot` - Job tracking
- **Status**: ✅ Managed by Terraform

### ✅ Lambda Functions (3 functions per Terraform)
- `sensapbl-generate-concepts-pilot` - Generate concepts
- `sensapbl-query-concepts-pilot` - Query concepts
- `sensapbl-gym-ai-pilot` - AI gym activities
- **Status**: ✅ Managed by Terraform

### ✅ API Gateway
- HTTP API with routes for Lambda functions
- **Status**: ✅ Managed by Terraform

### ✅ S3 Buckets
- `sensapbl-pilot-content-311964231104` - Content storage
- **Status**: ✅ Managed by Terraform

## What's Actually Deployed in AWS

### Lambda Functions (4 total)
1. ✅ `sensapbl-generate-concepts-pilot` - Terraform managed
2. ✅ `sensapbl-query-concepts-pilot` - Terraform managed (I updated this manually!)
3. ✅ `sensapbl-gym-ai-pilot` - Terraform managed
4. ❌ `sensapbl-auth-lambda` - **NOT in Terraform!**

### DynamoDB Tables (2 total)
1. ✅ `sensapbl-concepts-pilot` - Terraform managed
2. ✅ `sensapbl-jobs-pilot` - Terraform managed

### S3 Buckets (2 total)
1. ✅ `sensapbl-pilot-content-311964231104` - Terraform managed
2. ❌ `sensapbl-deployments-311964231104` - **NOT in Terraform!** (Created by deployment script)

### API Gateway Routes
✅ Most routes managed by Terraform
❌ Auth routes (`/auth/session/*`) - **NOT in Terraform!**

## DRIFT DETECTED! 🚨

### 1. Auth Lambda Function
**Resource**: `sensapbl-auth-lambda`
**Status**: ❌ Deployed manually via `DEPLOY_AUTH_LAMBDA.ps1`
**Risk**: Will be orphaned if Terraform destroys/recreates infrastructure
**Action Needed**: Import into Terraform or document as manual resource

### 2. Query Concepts Lambda
**Resource**: `sensapbl-query-concepts-pilot`
**Status**: ⚠️ Managed by Terraform BUT I manually updated the code!
**Risk**: Next Terraform apply will overwrite my changes
**Action Needed**: Update Lambda source code in `backend/lambda/query_concepts/` and run Terraform apply

### 3. API Gateway Auth Routes
**Resource**: Routes for `/auth/session/*`
**Status**: ❌ Created manually
**Risk**: Not tracked by Terraform
**Action Needed**: Add auth Lambda module to Terraform

### 4. Deployment S3 Bucket
**Resource**: `sensapbl-deployments-311964231104`
**Status**: ❌ Created by deployment script
**Risk**: Low - only used for deployments
**Action Needed**: None (can remain manual)

## Terraform State Location
- **Backend**: S3
- **Bucket**: `sensapbl-terraform-state`
- **Key**: `pilot/terraform.tfstate`
- **Lock Table**: `terraform-locks`
- **Status**: ✅ Remote state configured

## Recommendations

### Immediate Actions Required

1. **Revert Query Lambda Changes**
   ```powershell
   # My manual update will be lost on next Terraform apply
   # Need to update source code instead
   ```

2. **Import Auth Lambda to Terraform**
   ```hcl
   # Add to infra/terraform/modules/lambda/main.tf
   resource "aws_lambda_function" "auth" {
     function_name = "sensapbl-auth-${var.environment}"
     # ... configuration
   }
   ```

3. **Add Auth Routes to API Gateway Module**
   ```hcl
   # Add to infra/terraform/modules/api_gateway/main.tf
   resource "aws_apigatewayv2_route" "auth_login" {
     api_id    = aws_apigatewayv2_api.main.id
     route_key = "POST /auth/session/login"
     target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
   }
   ```

### Long-term Strategy

1. **All infrastructure should be in Terraform**
   - No manual Lambda deployments
   - No manual API Gateway changes
   - Use Terraform for all AWS resources

2. **Deployment Workflow**
   ```
   Code Change → Git Push → Terraform Apply → Lambda Updated
   ```

3. **Current Workaround**
   - Frontend changes: Git push → Amplify auto-deploys ✅
   - Lambda changes: Manual zip + AWS CLI update ❌ (should be Terraform)
   - Infrastructure: Terraform apply ✅

## Current State Summary

| Resource | Terraform Managed | Manually Created | Drift Risk |
|----------|------------------|------------------|------------|
| Cognito | ✅ | ❌ | Low |
| DynamoDB | ✅ | ❌ | Low |
| S3 Content Bucket | ✅ | ❌ | Low |
| Generate Lambda | ✅ | ❌ | Low |
| Query Lambda | ✅ | ⚠️ Manual update | **HIGH** |
| Gym AI Lambda | ✅ | ❌ | Low |
| Auth Lambda | ❌ | ✅ | **HIGH** |
| API Gateway (main) | ✅ | ❌ | Low |
| API Gateway (auth) | ❌ | ✅ | **HIGH** |
| Deployment Bucket | ❌ | ✅ | Low |

## What Happens on Next Terraform Apply?

1. ✅ Cognito, DynamoDB, S3 - No changes
2. ⚠️ Query Lambda - **MY CHANGES WILL BE LOST!**
3. ❌ Auth Lambda - Ignored (not in Terraform)
4. ❌ Auth API Routes - Ignored (not in Terraform)

## Action Plan

### Option 1: Quick Fix (Current State)
- Keep auth Lambda manual
- Document it clearly
- Don't run Terraform apply until we fix drift

### Option 2: Proper Fix (Recommended)
1. Add auth Lambda to Terraform
2. Add auth routes to API Gateway module
3. Update query Lambda source code
4. Run `terraform apply` to sync everything

### Option 3: Hybrid (Pragmatic)
1. Keep auth Lambda manual for now
2. Update query Lambda source code in repo
3. Run Terraform apply to update query Lambda
4. Add auth to Terraform later

## Immediate Risk

**If you run `terraform apply` right now:**
- ✅ Most resources will be fine
- ⚠️ Query Lambda will revert to old code (breaking production!)
- ❌ Auth Lambda will be ignored (stays working)

**Recommendation**: Don't run `terraform apply` until we update the query Lambda source code in the repo.

---

**Status**: Infrastructure partially managed by Terraform
**Risk Level**: MEDIUM (manual changes will be lost)
**Next Step**: Update Lambda source code before running Terraform
