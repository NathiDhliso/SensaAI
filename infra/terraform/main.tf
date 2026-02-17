# SensaAI Infrastructure - Terraform Root Module
# 
# Serverless-first architecture for the learning platform:
# - Cognito: User authentication
# - DynamoDB: Data storage (concepts, jobs)
# - Lambda: Compute (generate, query)
# - API Gateway: HTTP API endpoints
# - S3: Static content storage

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SensaAI"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ==============================================================================
# COGNITO - User Authentication
# ==============================================================================

module "cognito" {
  source = "./modules/cognito"

  user_pool_name    = "sensapbl-${var.environment}"
  environment       = var.environment
  callback_urls     = var.cognito_callback_urls
  logout_urls       = var.cognito_logout_urls
  domain_prefix     = "${var.cognito_domain_prefix}-${var.environment}"
  lambda_source_dir = "${path.module}/../../backend/lambda"
}

# ==============================================================================
# S3 - Content Storage
# ==============================================================================

module "s3" {
  source = "./modules/s3"

  environment = var.environment
}

# ==============================================================================
# DYNAMODB - Data Storage
# ==============================================================================

module "dynamodb" {
  source = "./modules/dynamodb"

  environment  = var.environment
  project_name = "sensapbl"

  tags = {
    Component = "DataStorage"
  }
}

# ==============================================================================
# LAMBDA - Serverless Compute
# ==============================================================================

module "lambda" {
  source = "./modules/lambda"

  environment  = var.environment
  project_name = "sensapbl"

  # DynamoDB integration
  concepts_table_arn  = module.dynamodb.concepts_table_arn
  concepts_table_name = module.dynamodb.concepts_table_name
  jobs_table_arn      = module.dynamodb.jobs_table_arn
  jobs_table_name     = module.dynamodb.jobs_table_name
  userdata_table_arn  = module.dynamodb.userdata_table_arn
  userdata_table_name = module.dynamodb.userdata_table_name

  # Lambda source code
  source_dir = "${path.module}/../../backend/lambda"

  # Configuration (dev uses lower memory to reduce cost)
  generate_timeout     = 900
  generate_memory_size = var.environment == "dev" ? 3008 : 10240
  query_timeout        = 30
  query_memory_size    = 512

  # Auth Lambda Cognito config
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.client_id
  cognito_domain       = "${var.cognito_domain_prefix}-${var.environment}"
  aws_region           = var.aws_region

  # Bedrock model for concept generation
  bedrock_model_id = "us.anthropic.claude-sonnet-4-20250514-v1:0"

  # Provisioned concurrency (production only)
  enable_provisioned_concurrency    = var.environment == "prod"
  provisioned_concurrent_executions = 1

  tags = {
    Component = "Compute"
  }

  depends_on = [module.dynamodb]
}

# ==============================================================================
# API GATEWAY - HTTP API Endpoints
# ==============================================================================

module "api_gateway" {
  source = "./modules/api_gateway"

  environment  = var.environment
  project_name = "sensapbl"
  aws_region   = var.aws_region

  # Lambda integration
  generate_concepts_function_name = module.lambda.generate_concepts_function_name
  generate_concepts_invoke_arn    = module.lambda.generate_concepts_invoke_arn
  query_concepts_function_name    = module.lambda.query_concepts_function_name
  query_concepts_invoke_arn       = module.lambda.query_concepts_invoke_arn
  gym_ai_function_name            = module.lambda.gym_ai_function_name
  gym_ai_invoke_arn               = module.lambda.gym_ai_invoke_arn
  auth_function_name              = module.lambda.auth_function_name
  auth_invoke_arn                 = module.lambda.auth_invoke_arn

  # CORS configuration
  cors_allowed_origins = var.cors_allowed_origins

  # Throttling (conservative for dev)
  throttling_burst_limit = var.environment == "dev" ? 50 : 200
  throttling_rate_limit  = var.environment == "dev" ? 25 : 100

  # JWT Authorization (disabled for dev)
  enable_jwt_authorizer = var.environment == "prod"
  cognito_user_pool_id  = module.cognito.user_pool_id
  cognito_client_id     = module.cognito.client_id

  tags = {
    Component = "API"
  }

  depends_on = [module.lambda]
}
