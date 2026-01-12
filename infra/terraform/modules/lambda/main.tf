# Lambda Functions for Learning Generation Pipeline
# Two functions: generate_concepts (async) and query_concepts (sync)

# IAM Role for Lambda execution
resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-execution-${var.environment}"

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

  tags = var.tags
}

# IAM Policy for Lambda permissions
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
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.concepts_table_arn,
          "${var.concepts_table_arn}/index/*",
          var.jobs_table_arn
        ]
      },
      # Bedrock access for content generation
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


# Archive the source code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/lambda.zip"
  excludes    = ["__pycache__", "tests", ".pytest_cache", "venv", ".venv", ".git"]
}

# Generate Concepts Lambda Function
resource "aws_lambda_function" "generate_concepts" {
  function_name = "${var.project_name}-generate-concepts-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "generate_concepts.handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      CONCEPTS_TABLE = var.concepts_table_name
      JOBS_TABLE     = var.jobs_table_name
      ENVIRONMENT    = var.environment
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-generate-concepts-${var.environment}"
    Environment = var.environment
  })
}

# Query Concepts Lambda Function (lightweight, fast)
resource "aws_lambda_function" "query_concepts" {
  function_name = "${var.project_name}-query-concepts-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "query_concepts.handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = 30          # Short timeout for queries
  memory_size   = 512         # Smaller memory footprint

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      CONCEPTS_TABLE = var.concepts_table_name
      ENVIRONMENT    = var.environment
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-query-concepts-${var.environment}"
    Environment = var.environment
  })
}

# Provisioned Concurrency (optional - eliminates cold starts)
resource "aws_lambda_provisioned_concurrency_config" "query_concepts" {
  count = var.enable_provisioned_concurrency ? 1 : 0

  function_name                     = aws_lambda_function.query_concepts.function_name
  provisioned_concurrent_executions = var.provisioned_concurrent_executions
  qualifier                         = aws_lambda_function.query_concepts.version
}

# CloudWatch Log Groups with retention
resource "aws_cloudwatch_log_group" "generate_concepts" {
  name              = "/aws/lambda/${aws_lambda_function.generate_concepts.function_name}"
  retention_in_days = 30

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "query_concepts" {
  name              = "/aws/lambda/${aws_lambda_function.query_concepts.function_name}"
  retention_in_days = 30

  tags = var.tags
}
