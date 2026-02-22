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
  bedrock_model_id = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
  
  # Cross account (IAM role for Bedrock access)
  cross_account_role_arn = var.cross_account_role_arn

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

# ==============================================================================
# API SERVER LAMBDA — Express app (serverless-http wrapper)
# Handles: ALL /api/v1/* routes (CLM curator, content, concepts proxy layer)
# Cost: ~$0/month on free tier (1M requests free), ~$0.20/M after
# ==============================================================================

data "archive_file" "api_server" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/lambda_bundle.js"
  output_path = "${path.module}/api_server_lambda.zip"
}

resource "aws_lambda_function" "api_server" {
  function_name    = "sensapbl-api-server-${var.environment}"
  role             = module.lambda.lambda_execution_role_arn
  handler          = "lambda_bundle.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 512

  filename         = data.archive_file.api_server.output_path
  source_code_hash = data.archive_file.api_server.output_base64sha256

  environment {
    variables = {
      NODE_ENV                    = var.environment == "prod" ? "production" : "development"
      ENVIRONMENT                 = var.environment
      AWS_REGION_NAME             = var.aws_region
      CORS_ORIGINS                = join(",", var.cors_allowed_origins)
      # DynamoDB tables
      CONCEPTS_TABLE              = module.dynamodb.concepts_table_name
      JOBS_TABLE                  = module.dynamodb.jobs_table_name
      USERDATA_TABLE              = module.dynamodb.userdata_table_name
      CLM_AUDITS_TABLE            = module.dynamodb.clm_audits_table_name
      CLM_VERSIONS_TABLE          = module.dynamodb.clm_versions_table_name
      CLM_CHANGELOG_TABLE         = module.dynamodb.clm_changelog_table_name
      # Cognito
      COGNITO_USER_POOL_ID        = module.cognito.user_pool_id
      COGNITO_CLIENT_ID           = module.cognito.client_id
      COGNITO_REGION              = var.aws_region
      # Python Lambda names (Express backend invokes them for generation)
      GENERATE_LAMBDA_NAME        = module.lambda.generate_concepts_function_name
      QUERY_LAMBDA_NAME           = module.lambda.query_concepts_function_name
      GYM_AI_LAMBDA_NAME          = module.lambda.gym_ai_function_name
    }
  }

  tags = {
    Component = "APIServer"
    Project   = "SensaAI"
  }

  depends_on = [module.lambda, module.dynamodb, module.cognito]
}

# API Gateway integration — all Express routes go through one Lambda
resource "aws_apigatewayv2_integration" "api_server" {
  api_id                 = module.api_gateway.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api_server.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

# Catch-all route: ANY /api/v1/{proxy+}
resource "aws_apigatewayv2_route" "api_server_proxy" {
  api_id    = module.api_gateway.api_id
  route_key = "ANY /api/v1/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.api_server.id}"
}

# Health check route
resource "aws_apigatewayv2_route" "api_server_health" {
  api_id    = module.api_gateway.api_id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.api_server.id}"
}

# Grant API Gateway permission to invoke the Express Lambda
resource "aws_lambda_permission" "api_server" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_server.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.api_execution_arn}/*/*"
}

output "api_server_function_name" {
  description = "Express API Server Lambda function name"
  value       = aws_lambda_function.api_server.function_name
}



module "waf" {
  source = "./modules/waf"

  environment  = var.environment
  project_name = "sensapbl"

  # CLOUDFRONT scope — associate with a CloudFront distribution fronting the
  # HTTP API. WAF cannot attach directly to API Gateway v2 HTTP APIs.
  scope      = "CLOUDFRONT"
  rate_limit = var.environment == "prod" ? 2000 : 5000

  enable_logging     = var.environment == "prod"
  log_retention_days = var.environment == "prod" ? 90 : 14

  tags = {
    Component = "Security"
  }
}
