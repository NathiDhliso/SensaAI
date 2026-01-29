# SensaPBL Infrastructure - Terraform Root Module

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
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SensaPBL"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Cognito User Pool
module "cognito" {
  source = "./modules/cognito"

  user_pool_name = "sensapbl-${var.environment}"
  environment    = var.environment
  callback_urls  = var.cognito_callback_urls
  logout_urls    = var.cognito_logout_urls
  domain_prefix  = "sensapbl-${var.environment}"
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"

  environment = var.environment
}

# DynamoDB Tables for Concepts Storage
module "dynamodb" {
  source = "./modules/dynamodb"

  environment  = var.environment
  project_name = "sensapbl"

  tags = {
    Component = "ServerlessLearning"
  }
}

# Lambda Functions for Concept Generation and Queries
module "lambda" {
  source = "./modules/lambda"

  environment         = var.environment
  project_name        = "sensapbl"
  concepts_table_arn  = module.dynamodb.concepts_table_arn
  concepts_table_name = module.dynamodb.concepts_table_name

  jobs_table_arn      = module.dynamodb.jobs_table_arn
  jobs_table_name     = module.dynamodb.jobs_table_name

  source_dir = "${path.module}/../../backend/lambda"

  # Optional: Enable for production to eliminate cold starts
  enable_provisioned_concurrency    = var.environment == "prod"
  provisioned_concurrent_executions = 1

  tags = {
    Component = "ServerlessLearning"
  }

  depends_on = [module.dynamodb]
}

# API Gateway v2 (HTTP API) for Lambda Functions
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

  # CORS for frontend
  cors_allowed_origins = var.cors_allowed_origins

  # Throttling - conservative for pilot
  throttling_burst_limit = var.environment == "pilot" ? 50 : 200
  throttling_rate_limit  = var.environment == "pilot" ? 25 : 100

  # JWT Authorization - disabled for pilot, enable in prod
  enable_jwt_authorizer = var.environment == "prod"
  cognito_user_pool_id  = module.cognito.user_pool_id
  cognito_client_id     = module.cognito.client_id

  tags = {
    Component = "ServerlessLearning"
  }

  depends_on = [module.lambda]
}
