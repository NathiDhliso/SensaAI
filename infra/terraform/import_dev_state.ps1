# Import existing AWS resources into Terraform state (dev environment)
# Run from: infra\terraform\
# Usage: .\import_dev_state.ps1
# Skips resources already in state. Uses single-quoted args for PowerShell safety.

$ErrorActionPreference = 'Continue'
$failed = [System.Collections.ArrayList]::new()
$skipped = 0
$ok = 0

# Grab current state once
$stateList = terraform state list 2>&1

function TFImport {
    param([string]$addr, [string]$id)
    if ($stateList -contains $addr) {
        Write-Host "  SKIP $addr (already in state)" -ForegroundColor DarkGray
        $script:skipped++
        return
    }
    Write-Host "  Importing $addr ..." -NoNewline
    $output = terraform import -no-color '-var-file=environments/dev/terraform.tfvars' '-var=environment=dev' $addr $id 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ' OK' -ForegroundColor Green
        $script:ok++
    } else {
        $errLine = ($output | Select-String -Pattern 'Error:' | Select-Object -First 1)
        Write-Host " FAILED" -ForegroundColor Yellow
        if ($errLine) { Write-Host "    $errLine" -ForegroundColor DarkYellow }
        [void]$script:failed.Add("$addr <- $id")
    }
}

Write-Host '=== Terraform State Import (dev) ===' -ForegroundColor Cyan

# --- DynamoDB Tables (skip concepts + userdata already in state) ---
Write-Host "`nDynamoDB..." -ForegroundColor Blue
TFImport 'module.dynamodb.aws_dynamodb_table.concepts'       'sensapbl-concepts-dev'
TFImport 'module.dynamodb.aws_dynamodb_table.generation_jobs' 'sensapbl-jobs-dev'
TFImport 'module.dynamodb.aws_dynamodb_table.userdata'        'sensapbl-userdata-dev'
TFImport 'module.dynamodb.aws_dynamodb_table.clm_audits'     'sensapbl-clm-audits-dev'
TFImport 'module.dynamodb.aws_dynamodb_table.clm_versions'   'sensapbl-clm-versions-dev'
TFImport 'module.dynamodb.aws_dynamodb_table.clm_changelog'  'sensapbl-clm-changelog-dev'

# --- S3 ---
Write-Host "`nS3..." -ForegroundColor Blue
TFImport 'module.s3.aws_s3_bucket.content' 'sensapbl-dev-content-311964231104'

# --- IAM Roles ---
Write-Host "`nIAM Roles..." -ForegroundColor Blue
TFImport 'module.lambda.aws_iam_role.lambda_execution'     'sensapbl-lambda-dev'
TFImport 'module.cognito.aws_iam_role.custom_message'      'sensapbl-dev-custom-message-lambda'
TFImport 'module.cognito.aws_iam_role.authenticated'       'sensapbl-dev-cognito-authenticated'
TFImport 'module.cognito.aws_iam_role.unauthenticated'     'sensapbl-dev-cognito-unauthenticated'

# --- IAM Role Policies (inline) ---
Write-Host "`nIAM Role Policies..." -ForegroundColor Blue
TFImport 'module.lambda.aws_iam_role_policy.lambda_policy'             'sensapbl-lambda-dev:sensapbl-lambda-policy-dev'
TFImport 'module.cognito.aws_iam_role_policy.custom_message_logs'      'sensapbl-dev-custom-message-lambda:sensapbl-dev-custom-message-logs'
TFImport 'module.cognito.aws_iam_role_policy.authenticated_policy'     'sensapbl-dev-cognito-authenticated:sensapbl-dev-authenticated-policy'
TFImport 'module.cognito.aws_iam_role_policy.unauthenticated_policy'   'sensapbl-dev-cognito-unauthenticated:sensapbl-dev-unauthenticated-policy'

# --- Lambda Functions ---
Write-Host "`nLambda Functions..." -ForegroundColor Blue
TFImport 'module.lambda.aws_lambda_function.generate_concepts'  'sensapbl-generate-concepts-dev'
TFImport 'module.lambda.aws_lambda_function.query_concepts'     'sensapbl-query-concepts-dev'
TFImport 'module.lambda.aws_lambda_function.gym_ai'             'sensapbl-gym-ai-dev'
TFImport 'module.lambda.aws_lambda_function.auth'               'sensapbl-auth-dev'
TFImport 'module.cognito.aws_lambda_function.custom_message'    'sensapbl-dev-custom-message'

# --- Lambda Layer ---
Write-Host "`nLambda Layer..." -ForegroundColor Blue
TFImport 'module.lambda.aws_lambda_layer_version.python_deps[0]' 'arn:aws:lambda:us-east-1:311964231104:layer:sensapbl-python-deps-dev:5'

# --- Lambda Permissions ---
Write-Host "`nLambda Permissions..." -ForegroundColor Blue
TFImport 'module.api_gateway.aws_lambda_permission.generate_concepts' 'sensapbl-generate-concepts-dev/AllowAPIGatewayInvoke'
TFImport 'module.api_gateway.aws_lambda_permission.query_concepts'    'sensapbl-query-concepts-dev/AllowAPIGatewayInvoke'
TFImport 'module.api_gateway.aws_lambda_permission.gym_ai'            'sensapbl-gym-ai-dev/AllowAPIGatewayInvoke'
TFImport 'module.api_gateway.aws_lambda_permission.auth'              'sensapbl-auth-dev/AllowAPIGatewayInvoke'

# --- Cognito ---
Write-Host "`nCognito..." -ForegroundColor Blue
TFImport 'module.cognito.aws_cognito_user_pool.main'                              'us-east-1_vNseSD26p'
TFImport 'module.cognito.aws_cognito_user_pool_client.main'                       'us-east-1_vNseSD26p/mif4j59jfd5armi6a254r55la'
TFImport 'module.cognito.aws_cognito_identity_pool.main'                          'us-east-1:f30c5127-d9d0-4e0b-84af-1201d9b1c84f'
TFImport 'module.cognito.aws_cognito_user_pool_domain.main'                       'sensapbl-dev-v2-dev'
TFImport 'module.cognito.aws_cognito_identity_pool_roles_attachment.main'         'us-east-1:f30c5127-d9d0-4e0b-84af-1201d9b1c84f'

# --- API Gateway ---
Write-Host "`nAPI Gateway..." -ForegroundColor Blue
TFImport 'module.api_gateway.aws_apigatewayv2_api.main'                      'ldppp79nj5'
TFImport 'module.api_gateway.aws_apigatewayv2_stage.default'                 'ldppp79nj5/$default'
TFImport 'module.api_gateway.aws_apigatewayv2_integration.generate_concepts' 'ldppp79nj5/1059v6i'
TFImport 'module.api_gateway.aws_apigatewayv2_integration.query_concepts'    'ldppp79nj5/5iu4ux6'
TFImport 'module.api_gateway.aws_apigatewayv2_integration.gym_ai'            'ldppp79nj5/f39ianq'
TFImport 'module.api_gateway.aws_apigatewayv2_integration.auth'              'ldppp79nj5/wc0i6rc'
TFImport 'module.api_gateway.aws_apigatewayv2_route.generate_concepts'       'ldppp79nj5/7u44yth'
TFImport 'module.api_gateway.aws_apigatewayv2_route.query_concepts'          'ldppp79nj5/ni2j3u8'
TFImport 'module.api_gateway.aws_apigatewayv2_route.query_concepts_by_params' 'ldppp79nj5/psfmbeq'
TFImport 'module.api_gateway.aws_apigatewayv2_route.query_concepts_by_tier'  'ldppp79nj5/0lubab8'
TFImport 'module.api_gateway.aws_apigatewayv2_route.job_status'              'ldppp79nj5/eglwmi8'
TFImport 'module.api_gateway.aws_apigatewayv2_route.gym_ai'                  'ldppp79nj5/61aby6e'
TFImport 'module.api_gateway.aws_apigatewayv2_route.auth_exchange'           'ldppp79nj5/8qdfof4'
TFImport 'module.api_gateway.aws_apigatewayv2_route.auth_login'              'ldppp79nj5/symrju4'
TFImport 'module.api_gateway.aws_apigatewayv2_route.auth_refresh'            'ldppp79nj5/916gtys'
TFImport 'module.api_gateway.aws_apigatewayv2_route.auth_validate'           'ldppp79nj5/ylsu877'
TFImport 'module.api_gateway.aws_apigatewayv2_route.auth_logout'             'ldppp79nj5/r066fri'
TFImport 'module.api_gateway.aws_apigatewayv2_route.auth_get_profile'        'ldppp79nj5/1yw6ekn'
TFImport 'module.api_gateway.aws_apigatewayv2_route.auth_update_profile'     'ldppp79nj5/4icvkj9'
TFImport 'module.api_gateway.aws_apigatewayv2_route.delete_subject'          'ldppp79nj5/9fk5jc0'
TFImport 'module.api_gateway.aws_apigatewayv2_route.concepts_repair'         'ldppp79nj5/i5u2r59'
TFImport 'module.api_gateway.aws_apigatewayv2_route.concepts_jobs'           'ldppp79nj5/sqzg721'
TFImport 'module.api_gateway.aws_apigatewayv2_route.concepts_job_status'     'ldppp79nj5/w84ioma'
TFImport 'module.api_gateway.aws_apigatewayv2_route.userdata_get'            'ldppp79nj5/bew7el8'
TFImport 'module.api_gateway.aws_apigatewayv2_route.userdata_put'            'ldppp79nj5/e4h7dy0'
TFImport 'module.api_gateway.aws_apigatewayv2_route.userdata_batch'          'ldppp79nj5/iz9ivt0'

# --- CloudWatch Log Groups ---
Write-Host "`nCloudWatch Log Groups..." -ForegroundColor Blue
TFImport 'module.lambda.aws_cloudwatch_log_group.generate_concepts'  '/aws/lambda/sensapbl-generate-concepts-dev'
TFImport 'module.lambda.aws_cloudwatch_log_group.query_concepts'     '/aws/lambda/sensapbl-query-concepts-dev'
TFImport 'module.lambda.aws_cloudwatch_log_group.gym_ai'             '/aws/lambda/sensapbl-gym-ai-dev'
TFImport 'module.lambda.aws_cloudwatch_log_group.auth'               '/aws/lambda/sensapbl-auth-dev'
TFImport 'module.cognito.aws_cloudwatch_log_group.custom_message'    '/aws/lambda/sensapbl-dev-custom-message'
TFImport 'module.api_gateway.aws_cloudwatch_log_group.api_logs'      '/aws/apigateway/sensapbl-dev'

# --- Summary ---
Write-Host ''
Write-Host '=== Import Complete ===' -ForegroundColor Cyan
Write-Host "  Succeeded: $ok" -ForegroundColor Green
Write-Host "  Skipped:   $skipped" -ForegroundColor DarkGray
if ($failed.Count -gt 0) {
    Write-Host "  Failed ($($failed.Count)):" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
} else {
    Write-Host '  Failed:    0' -ForegroundColor Green
}
