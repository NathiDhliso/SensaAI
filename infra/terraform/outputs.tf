# SensaAI Infrastructure Outputs
# Frontend configuration values

# ==============================================================================
# COGNITO - Authentication
# ==============================================================================

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID - use in frontend AWS config"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID - use in frontend AWS config"
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

# ==============================================================================
# S3 - Content Storage
# ==============================================================================

output "s3_content_bucket" {
  description = "S3 bucket for content storage"
  value       = module.s3.content_bucket_name
}

# ==============================================================================
# DYNAMODB - Data Storage
# ==============================================================================

output "dynamodb_concepts_table" {
  description = "DynamoDB table name for concepts"
  value       = module.dynamodb.concepts_table_name
}

output "dynamodb_jobs_table" {
  description = "DynamoDB table name for generation jobs"
  value       = module.dynamodb.jobs_table_name
}

output "dynamodb_userdata_table" {
  description = "DynamoDB table name for user data"
  value       = module.dynamodb.userdata_table_name
}

# ==============================================================================
# LAMBDA - Functions
# ==============================================================================

output "lambda_generate_function" {
  description = "Lambda function name for concept generation"
  value       = module.lambda.generate_concepts_function_name
}

output "lambda_query_function" {
  description = "Lambda function name for concept queries"
  value       = module.lambda.query_concepts_function_name
}

# ==============================================================================
# API GATEWAY - Endpoints (USE THESE IN FRONTEND)
# ==============================================================================

output "api_endpoint" {
  description = "API Gateway base endpoint - set as VITE_API_ENDPOINT in .env"
  value       = module.api_gateway.api_endpoint
}

output "api_generate_url" {
  description = "Full URL for POST /generate endpoint"
  value       = module.api_gateway.generate_endpoint
}

output "api_concepts_url" {
  description = "Base URL for GET /concepts/{subjectId} endpoint"
  value       = module.api_gateway.concepts_endpoint
}

output "api_jobs_url" {
  description = "Base URL for GET /jobs/{jobId} endpoint"
  value       = module.api_gateway.jobs_endpoint
}

# ==============================================================================
# CLM OUTPUTS
# ==============================================================================

output "clm_audits_table_name" {
  description = "Name of the CLM audits table"
  value       = module.dynamodb.clm_audits_table_name
}

output "clm_versions_table_name" {
  description = "Name of the CLM versions table"
  value       = module.dynamodb.clm_versions_table_name
}

output "clm_changelog_table_name" {
  description = "Name of the CLM changelog table"
  value       = module.dynamodb.clm_changelog_table_name
}
