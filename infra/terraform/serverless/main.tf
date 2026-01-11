# SensaPBL Serverless Learning Pipeline
# Standalone Terraform config for DynamoDB + Lambda only
# This can be deployed independently without VPC/EKS

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment (dev/staging/prod)"
}

variable "aws_region" {
  type        = string
  default     = "af-south-1"
  description = "AWS region for deployment"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SensaPBL"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "ServerlessLearning"
    }
  }
}

# ==========================================
# DynamoDB Tables
# ==========================================

resource "aws_dynamodb_table" "concepts" {
  name         = "sensapbl-concepts-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "tier-index"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  tags = {
    Name = "Concepts Table"
  }
}

resource "aws_dynamodb_table" "jobs" {
  name         = "sensapbl-jobs-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "jobId"
  range_key    = "userId"

  attribute {
    name = "jobId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Name = "Generation Jobs Table"
  }
}

# ==========================================
# IAM Role for Lambda
# ==========================================

resource "aws_iam_role" "lambda_execution" {
  name = "sensapbl-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.concepts.arn,
          "${aws_dynamodb_table.concepts.arn}/index/*",
          aws_dynamodb_table.jobs.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ==========================================
# Lambda Functions
# ==========================================

# Placeholder zip (will be replaced by actual deployment)
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"
  
  source {
    content  = "# Placeholder - deploy actual code separately"
    filename = "placeholder.py"
  }
}

resource "aws_lambda_function" "generate_concepts" {
  function_name = "sensapbl-generate-concepts-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = 900 # 15 minutes for large generations
  memory_size   = 10240 # 10GB for heavy AI processing

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      CONCEPTS_TABLE = aws_dynamodb_table.concepts.name
      JOBS_TABLE     = aws_dynamodb_table.jobs.name
      ENVIRONMENT    = var.environment
    }
  }

  tags = {
    Name = "Generate Concepts Lambda"
  }
}

resource "aws_lambda_function" "query_concepts" {
  function_name = "sensapbl-query-concepts-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      CONCEPTS_TABLE = aws_dynamodb_table.concepts.name
      ENVIRONMENT    = var.environment
    }
  }

  tags = {
    Name = "Query Concepts Lambda"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "generate_concepts" {
  name              = "/aws/lambda/${aws_lambda_function.generate_concepts.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "query_concepts" {
  name              = "/aws/lambda/${aws_lambda_function.query_concepts.function_name}"
  retention_in_days = 14
}

# ==========================================
# Outputs
# ==========================================

output "concepts_table_name" {
  value = aws_dynamodb_table.concepts.name
}

output "jobs_table_name" {
  value = aws_dynamodb_table.jobs.name
}

output "generate_function_name" {
  value = aws_lambda_function.generate_concepts.function_name
}

output "generate_function_arn" {
  value = aws_lambda_function.generate_concepts.arn
}

output "query_function_name" {
  value = aws_lambda_function.query_concepts.function_name
}

output "query_function_arn" {
  value = aws_lambda_function.query_concepts.arn
}
