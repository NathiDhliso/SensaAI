# Terraform Outputs

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = module.cognito.client_id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = module.cognito.domain
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = module.cognito.identity_pool_id
}

output "s3_content_bucket" {
  description = "S3 bucket for content storage"
  value       = module.s3.content_bucket_name
}

# Serverless Learning Pipeline Outputs
output "dynamodb_concepts_table" {
  description = "DynamoDB table name for concepts"
  value       = module.dynamodb.concepts_table_name
}

output "dynamodb_jobs_table" {
  description = "DynamoDB table name for generation jobs"
  value       = module.dynamodb.jobs_table_name
}

output "lambda_generate_function" {
  description = "Lambda function name for concept generation"
  value       = module.lambda.generate_concepts_function_name
}

output "lambda_query_function" {
  description = "Lambda function name for concept queries"
  value       = module.lambda.query_concepts_function_name
}

# API Gateway Outputs
output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL for frontend configuration"
  value       = module.api_gateway.api_endpoint
}

output "api_gateway_stage_url" {
  description = "API Gateway stage invoke URL"
  value       = module.api_gateway.stage_invoke_url
}

output "api_generate_endpoint" {
  description = "Full URL for the generate concepts endpoint"
  value       = module.api_gateway.generate_endpoint
}

output "api_concepts_endpoint" {
  description = "Base URL for the concepts query endpoint"
  value       = module.api_gateway.concepts_endpoint
}

output "api_jobs_endpoint" {
  description = "Base URL for the jobs status endpoint"
  value       = module.api_gateway.jobs_endpoint
}
