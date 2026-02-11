# Terraform Import Script - Import existing AWS resources into state
# Run from: infra/terraform/environments/pilot/

$ErrorActionPreference = "Continue"

# Cognito
Write-Host "=== Importing Cognito ===" -ForegroundColor Cyan
terraform import "module.sensapbl.module.cognito.aws_cognito_user_pool.main" "us-east-1_nNdVox578"
terraform import "module.sensapbl.module.cognito.aws_cognito_user_pool_client.main" "1f2i3813o3f1jdet7j6ifo1eea/us-east-1_nNdVox578"
terraform import "module.sensapbl.module.cognito.aws_cognito_user_pool_domain.main" "sensapbl-pilot"
terraform import "module.sensapbl.module.cognito.aws_cognito_identity_pool.main" "us-east-1:96adc9f1-c9b8-42b2-9ff6-12af81a1895a"
terraform import "module.sensapbl.module.cognito.aws_iam_role.authenticated" "sensapbl-pilot-cognito-authenticated"
terraform import "module.sensapbl.module.cognito.aws_iam_role.unauthenticated" "sensapbl-pilot-cognito-unauthenticated"
terraform import "module.sensapbl.module.cognito.aws_iam_role_policy.authenticated_policy" "sensapbl-pilot-cognito-authenticated:sensapbl-pilot-authenticated-policy"
terraform import "module.sensapbl.module.cognito.aws_iam_role_policy.unauthenticated_policy" "sensapbl-pilot-cognito-unauthenticated:sensapbl-pilot-unauthenticated-policy"
terraform import "module.sensapbl.module.cognito.aws_cognito_identity_pool_roles_attachment.main" "us-east-1:96adc9f1-c9b8-42b2-9ff6-12af81a1895a"

# Lambda
Write-Host "=== Importing Lambda ===" -ForegroundColor Cyan
terraform import "module.sensapbl.module.lambda.aws_iam_role.lambda_execution" "sensapbl-lambda-pilot"
terraform import "module.sensapbl.module.lambda.aws_iam_role_policy.lambda_policy" "sensapbl-lambda-pilot:sensapbl-lambda-policy-pilot"
terraform import "module.sensapbl.module.lambda.aws_lambda_function.generate_concepts" "sensapbl-generate-concepts-pilot"
terraform import "module.sensapbl.module.lambda.aws_lambda_function.query_concepts" "sensapbl-query-concepts-pilot"
terraform import "module.sensapbl.module.lambda.aws_lambda_function.gym_ai" "sensapbl-gym-ai-pilot"
terraform import 'module.sensapbl.module.lambda.aws_lambda_layer_version.python_deps[0]' "arn:aws:lambda:us-east-1:311964231104:layer:sensapbl-python-deps-pilot:1"
terraform import "module.sensapbl.module.lambda.aws_cloudwatch_log_group.generate_concepts" "/aws/lambda/sensapbl-generate-concepts-pilot"
terraform import "module.sensapbl.module.lambda.aws_cloudwatch_log_group.query_concepts" "/aws/lambda/sensapbl-query-concepts-pilot"
terraform import "module.sensapbl.module.lambda.aws_cloudwatch_log_group.gym_ai" "/aws/lambda/sensapbl-gym-ai-pilot"

# API Gateway
Write-Host "=== Importing API Gateway ===" -ForegroundColor Cyan
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_api.main" "c4kxjdukwj"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_stage.default" "c4kxjdukwj/`$default"
terraform import "module.sensapbl.module.api_gateway.aws_cloudwatch_log_group.api_logs" "/aws/apigateway/sensapbl-api-pilot"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_integration.generate_concepts" "c4kxjdukwj/kslpqk3"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_integration.query_concepts" "c4kxjdukwj/bfihphm"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_integration.gym_ai" "c4kxjdukwj/oxtu2kn"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.generate_concepts" "c4kxjdukwj/3an14le"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.query_concepts" "c4kxjdukwj/7ec59s4"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.query_concepts_by_tier" "c4kxjdukwj/1y4x4bo"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.job_status" "c4kxjdukwj/8xl3hs6"
terraform import "module.sensapbl.module.api_gateway.aws_apigatewayv2_route.gym_ai" "c4kxjdukwj/0oytxac"
terraform import "module.sensapbl.module.api_gateway.aws_lambda_permission.generate_concepts" "sensapbl-generate-concepts-pilot/sensapbl-api-pilot-generate"
terraform import "module.sensapbl.module.api_gateway.aws_lambda_permission.query_concepts" "sensapbl-query-concepts-pilot/sensapbl-api-pilot-query"
terraform import "module.sensapbl.module.api_gateway.aws_lambda_permission.gym_ai" "sensapbl-gym-ai-pilot/sensapbl-api-pilot-gym-ai"

# S3
Write-Host "=== Importing S3 ===" -ForegroundColor Cyan
terraform import "module.sensapbl.module.s3.aws_s3_bucket.content" "sensapbl-pilot-content-311964231104"
terraform import "module.sensapbl.module.s3.aws_s3_bucket_versioning.content" "sensapbl-pilot-content-311964231104"
terraform import "module.sensapbl.module.s3.aws_s3_bucket_server_side_encryption_configuration.content" "sensapbl-pilot-content-311964231104"
terraform import "module.sensapbl.module.s3.aws_s3_bucket_public_access_block.content" "sensapbl-pilot-content-311964231104"
terraform import "module.sensapbl.module.s3.aws_s3_bucket_cors_configuration.content" "sensapbl-pilot-content-311964231104"

Write-Host "`n=== Import Complete ===" -ForegroundColor Green
Write-Host "Run 'terraform plan' to check for drift" -ForegroundColor Yellow
