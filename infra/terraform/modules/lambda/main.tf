# Lambda Functions for SensaPBL Learning Pipeline
# 
# Deploys two Lambda functions:
# - generate_concepts: Long-running LLM-based concept generation (15 min timeout)
# - query_concepts: Fast concept retrieval (30s timeout)
#
# Uses Lambda Layers for Python dependencies to reduce deployment size

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# ==============================================================================
# IAM ROLE
# ==============================================================================

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      # DynamoDB access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Scan"
        ]
        Resource = [
          var.concepts_table_arn,
          "${var.concepts_table_arn}/index/*",
          var.jobs_table_arn
        ]
      },
      # Bedrock access for LLM
      {
        Effect   = "Allow"
        Action   = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      }
    ]
  })
}

# ==============================================================================
# LAMBDA LAYER (Python Dependencies)
# ==============================================================================

# Check if layer exists - if not, functions will work without it (using inline deps)
locals {
  layer_exists = fileexists("${path.module}/layer.zip")
}

# The layer should be pre-built and placed in the specified path
# Use scripts/package_lambda.ps1 (Windows) or package_lambda.sh (Unix) to create it
resource "aws_lambda_layer_version" "python_deps" {
  count = local.layer_exists ? 1 : 0

  layer_name          = "${var.project_name}-python-deps-${var.environment}"
  description         = "Python dependencies for SensaPBL Lambda functions"
  compatible_runtimes = ["python3.12"]
  
  filename         = "${path.module}/layer.zip"
  source_code_hash = local.layer_exists ? filebase64sha256("${path.module}/layer.zip") : null
}


# ==============================================================================
# GENERATE CONCEPTS LAMBDA
# ==============================================================================

data "archive_file" "lambda_code" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/lambda_code.zip"
  excludes    = [
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    "tests",
    "venv",
    ".venv",
    ".git",
    "requirements.txt"
  ]
}

resource "aws_lambda_function" "generate_concepts" {
  function_name = "${var.project_name}-generate-concepts-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "generate_concepts.handler.lambda_handler"
  runtime       = "python3.12"

  # Long timeout for LLM calls
  timeout     = var.generate_timeout
  memory_size = var.generate_memory_size

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  # Attach layer if it exists
  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      CONCEPTS_TABLE = var.concepts_table_name
      JOBS_TABLE     = var.jobs_table_name
      LOG_LEVEL      = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "generate-concepts"
  })
}

# ==============================================================================
# QUERY CONCEPTS LAMBDA
# ==============================================================================

resource "aws_lambda_function" "query_concepts" {
  function_name = "${var.project_name}-query-concepts-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "query_concepts.handler.lambda_handler"
  runtime       = "python3.12"

  # Short timeout for queries
  timeout     = var.query_timeout
  memory_size = var.query_memory_size

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  # Attach layer if it exists
  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      CONCEPTS_TABLE = var.concepts_table_name
      JOBS_TABLE     = var.jobs_table_name
      LOG_LEVEL      = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "query-concepts"
  })
}

# ==============================================================================
# GYM AI LAMBDA
# ==============================================================================

resource "aws_lambda_function" "gym_ai" {
  function_name = "${var.project_name}-gym-ai-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "gym_ai.handler.lambda_handler"
  runtime       = "python3.12"

  timeout     = var.gym_ai_timeout
  memory_size = var.gym_ai_memory_size

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT = var.environment
      LOG_LEVEL   = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "gym-ai"
  })
}

# ==============================================================================
# CLOUDWATCH LOG GROUPS
# ==============================================================================

resource "aws_cloudwatch_log_group" "gym_ai" {
  name              = "/aws/lambda/${aws_lambda_function.gym_ai.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "generate_concepts" {
  name              = "/aws/lambda/${aws_lambda_function.generate_concepts.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "query_concepts" {
  name              = "/aws/lambda/${aws_lambda_function.query_concepts.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ==============================================================================
# PROVISIONED CONCURRENCY (Optional - eliminates cold starts)
# ==============================================================================

resource "aws_lambda_provisioned_concurrency_config" "query_concepts" {
  count = var.enable_provisioned_concurrency ? 1 : 0

  function_name                     = aws_lambda_function.query_concepts.function_name
  provisioned_concurrent_executions = var.provisioned_concurrent_executions
  qualifier                         = aws_lambda_function.query_concepts.version
}
