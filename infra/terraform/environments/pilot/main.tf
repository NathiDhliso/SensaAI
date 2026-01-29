# Pilot Environment Main Configuration
# Serverless-first architecture for pilot phase

terraform {
  required_version = ">= 1.6.0"

  # For pilot, use local state (migrate to S3 for production)
  # backend "s3" {
  #   bucket         = "sensapbl-terraform-state"
  #   key            = "pilot/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# Load the root module
module "sensapbl" {
  source = "../../"

  environment = var.environment
  aws_region  = var.aws_region

  cognito_callback_urls = var.cognito_callback_urls
  cognito_logout_urls   = var.cognito_logout_urls
  cors_allowed_origins  = var.cors_allowed_origins
}

# Cognito outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID for authentication"
  value       = module.sensapbl.cognito_user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = module.sensapbl.cognito_client_id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = module.sensapbl.cognito_domain
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = module.sensapbl.cognito_identity_pool_id
}

# Storage outputs
output "s3_content_bucket" {
  description = "S3 bucket for content storage"
  value       = module.sensapbl.s3_content_bucket
}

output "dynamodb_concepts_table" {
  description = "DynamoDB table name for concepts"
  value       = module.sensapbl.dynamodb_concepts_table
}

output "dynamodb_jobs_table" {
  description = "DynamoDB table name for generation jobs"
  value       = module.sensapbl.dynamodb_jobs_table
}

# Lambda outputs
output "lambda_generate_function" {
  description = "Lambda function name for concept generation"
  value       = module.sensapbl.lambda_generate_function
}

output "lambda_query_function" {
  description = "Lambda function name for concept queries"
  value       = module.sensapbl.lambda_query_function
}

# API Gateway outputs for frontend configuration
output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL - use this in frontend .env"
  value       = module.sensapbl.api_gateway_endpoint
}

output "api_generate_endpoint" {
  description = "Full URL for the generate concepts endpoint"
  value       = module.sensapbl.api_generate_endpoint
}

output "api_concepts_endpoint" {
  description = "Base URL for the concepts query endpoint"
  value       = module.sensapbl.api_concepts_endpoint
}

output "api_jobs_endpoint" {
  description = "Base URL for the jobs status endpoint"
  value       = module.sensapbl.api_jobs_endpoint
}
