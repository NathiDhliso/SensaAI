# Pilot Environment Configuration
# Serverless-only for initial deployment

terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "SensaAI-terraform-state"
    key            = "pilot/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Load the root module with pilot-specific configuration
module "SensaAI" {
  source = "../../"

  environment = var.environment
  aws_region  = var.aws_region

  # Cognito
  cognito_callback_urls = var.cognito_callback_urls
  cognito_logout_urls   = var.cognito_logout_urls

  # API Gateway CORS
  cors_allowed_origins = var.cors_allowed_origins
}

# ==============================================================================
# OUTPUTS - Use these to configure your frontend .env
# ==============================================================================

output "cognito_user_pool_id" {
  description = "VITE_COGNITO_USER_POOL_ID"
  value       = module.SensaAI.cognito_user_pool_id
}

output "cognito_client_id" {
  description = "VITE_COGNITO_CLIENT_ID"
  value       = module.SensaAI.cognito_client_id
}

output "cognito_domain" {
  description = "Cognito domain for OAuth"
  value       = module.SensaAI.cognito_domain
}

output "api_endpoint" {
  description = "VITE_API_ENDPOINT - Base URL for all API calls"
  value       = module.SensaAI.api_endpoint
}

output "api_generate_url" {
  description = "POST endpoint for concept generation"
  value       = module.SensaAI.api_generate_url
}

output "api_concepts_url" {
  description = "GET endpoint for concept queries"
  value       = module.SensaAI.api_concepts_url
}

output "s3_content_bucket" {
  description = "S3 bucket for content"
  value       = module.SensaAI.s3_content_bucket
}

output "dynamodb_concepts_table" {
  description = "DynamoDB concepts table name"
  value       = module.SensaAI.dynamodb_concepts_table
}
