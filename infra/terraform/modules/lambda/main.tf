# Lambda Functions for SensaAI Learning Pipeline
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
          var.jobs_table_arn,
          var.userdata_table_arn
        ]
      },
      # CLM DynamoDB table access
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
          var.clm_audits_table_arn,
          "${var.clm_audits_table_arn}/index/*",
          var.clm_versions_table_arn,
          "${var.clm_versions_table_arn}/index/*",
          var.clm_changelog_table_arn,
          "${var.clm_changelog_table_arn}/index/*"
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
      },
      # Cognito access (for auth Lambda)
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:InitiateAuth",
          "cognito-idp:GlobalSignOut",
          "cognito-idp:AdminGetUser"
        ]
        Resource = "arn:aws:cognito-idp:*:*:userpool/*"
      },
      # Lambda self-invocation (for async generation pattern)
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = aws_lambda_function.generate_concepts.arn
      },
      # CLM orchestrator → auditor Lambda cross-invocation
      {
        Effect = "Allow"
        Action = ["lambda:InvokeFunction"]
        Resource = [
          "arn:aws:lambda:*:*:function:${var.project_name}-clm-orchestrator-${var.environment}",
          "arn:aws:lambda:*:*:function:${var.project_name}-clm-schema-auditor-${var.environment}",
          "arn:aws:lambda:*:*:function:${var.project_name}-clm-content-auditor-${var.environment}",
          "arn:aws:lambda:*:*:function:${var.project_name}-clm-coverage-auditor-${var.environment}"
        ]
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
  description         = "Python dependencies for SensaAI Lambda functions"
  compatible_runtimes = ["python3.12"]
  
  filename         = "${path.module}/layer.zip"
  source_code_hash = local.layer_exists ? filebase64sha256("${path.module}/layer.zip") : null
}


# ==============================================================================
# GENERATE CONCEPTS LAMBDA
# ==============================================================================

# Clean __pycache__ before archiving — the archive_file excludes pattern only
# matches top-level entries, not nested __pycache__ dirs in subpackages.
resource "null_resource" "clean_pycache" {
  triggers = {
    # Re-run whenever source files change
    source_hash = sha256(join("", [
      for f in fileset(var.source_dir, "**/*.py") :
      filesha256("${var.source_dir}/${f}")
    ]))
  }
  provisioner "local-exec" {
    command     = "Get-ChildItem -Path '${replace(var.source_dir, "/", "\\")}' -Directory -Filter '__pycache__' -Recurse | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue; Get-ChildItem -Path '${replace(var.source_dir, "/", "\\")}' -Filter '*.pyc' -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue"
    interpreter = ["pwsh", "-NoProfile", "-Command"]
  }
}

data "archive_file" "lambda_code" {
  depends_on  = [null_resource.clean_pycache]
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
      ENVIRONMENT                     = var.environment
      CONCEPTS_TABLE                  = var.concepts_table_name
      JOBS_TABLE                      = var.jobs_table_name
      LOG_LEVEL                       = var.environment == "prod" ? "INFO" : "DEBUG"
      BEDROCK_MODEL_ID                = var.bedrock_model_id
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
  publish       = true

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
      USERDATA_TABLE = var.userdata_table_name
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
      ENVIRONMENT                     = var.environment
      LOG_LEVEL                       = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "gym-ai"
  })
}

# ==============================================================================
# AUTH LAMBDA
# ==============================================================================

resource "aws_lambda_function" "auth" {
  function_name = "${var.project_name}-auth-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "auth.handler.lambda_handler"
  runtime       = "python3.12"

  timeout     = var.auth_timeout
  memory_size = var.auth_memory_size

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT          = var.environment
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
      COGNITO_CLIENT_ID    = var.cognito_client_id
      COGNITO_DOMAIN       = var.cognito_domain
      AWS_REGION_OVERRIDE  = var.aws_region
      LOG_LEVEL            = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "auth"
  })
}

# ==============================================================================
# CLM ORCHESTRATOR LAMBDA
# ==============================================================================

resource "aws_lambda_function" "clm_orchestrator" {
  function_name = "${var.project_name}-clm-orchestrator-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "clm_orchestrator.handler.lambda_handler"
  runtime       = "python3.12"

  timeout     = 300 # 5 min — coordinates multiple auditor invocations
  memory_size = 512

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT              = var.environment
      CLM_AUDITS_TABLE         = var.clm_audits_table_name
      CONCEPTS_TABLE           = var.concepts_table_name
      JOBS_TABLE               = var.jobs_table_name
      SCHEMA_AUDITOR_FUNCTION  = "${var.project_name}-clm-schema-auditor-${var.environment}"
      CONTENT_AUDITOR_FUNCTION = "${var.project_name}-clm-content-auditor-${var.environment}"
      COVERAGE_AUDITOR_FUNCTION = "${var.project_name}-clm-coverage-auditor-${var.environment}"
      LOG_LEVEL                = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "clm-orchestrator"
  })
}

# ==============================================================================
# CLM SCHEMA AUDITOR LAMBDA
# ==============================================================================

resource "aws_lambda_function" "clm_schema_auditor" {
  function_name = "${var.project_name}-clm-schema-auditor-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "clm_schema_auditor.handler.lambda_handler"
  runtime       = "python3.12"

  timeout     = 120
  memory_size = 512

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT      = var.environment
      CLM_AUDITS_TABLE = var.clm_audits_table_name
      BEDROCK_MODEL_ID = var.bedrock_model_id
      LOG_LEVEL        = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "clm-schema-auditor"
  })
}

# ==============================================================================
# CLM CONTENT AUDITOR LAMBDA
# ==============================================================================

resource "aws_lambda_function" "clm_content_auditor" {
  function_name = "${var.project_name}-clm-content-auditor-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "clm_content_auditor.handler.lambda_handler"
  runtime       = "python3.12"

  timeout     = 300 # 5 min — AI-powered content analysis
  memory_size = 1024

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT      = var.environment
      CLM_AUDITS_TABLE = var.clm_audits_table_name
      BEDROCK_MODEL_ID = var.bedrock_model_id
      LOG_LEVEL        = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "clm-content-auditor"
  })
}

# ==============================================================================
# CLM COVERAGE AUDITOR LAMBDA
# ==============================================================================

resource "aws_lambda_function" "clm_coverage_auditor" {
  function_name = "${var.project_name}-clm-coverage-auditor-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "clm_coverage_auditor.handler.lambda_handler"
  runtime       = "python3.12"

  timeout     = 120
  memory_size = 512

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT      = var.environment
      CLM_AUDITS_TABLE = var.clm_audits_table_name
      BEDROCK_MODEL_ID = var.bedrock_model_id
      LOG_LEVEL        = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "clm-coverage-auditor"
  })
}

# ==============================================================================
# CLM UPDATE EXECUTOR LAMBDA
# ==============================================================================

resource "aws_lambda_function" "clm_update_executor" {
  function_name = "${var.project_name}-clm-update-executor-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "clm_update_executor.handler.lambda_handler"
  runtime       = "python3.12"

  timeout     = 120
  memory_size = 512

  filename         = data.archive_file.lambda_code.output_path
  source_code_hash = data.archive_file.lambda_code.output_base64sha256

  layers = length(aws_lambda_layer_version.python_deps) > 0 ? [
    aws_lambda_layer_version.python_deps[0].arn
  ] : []

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      CLM_AUDITS_TABLE    = var.clm_audits_table_name
      CLM_VERSIONS_TABLE  = var.clm_versions_table_name
      CLM_CHANGELOG_TABLE = var.clm_changelog_table_name
      CONCEPTS_TABLE      = var.concepts_table_name
      LOG_LEVEL           = var.environment == "prod" ? "INFO" : "DEBUG"
    }
  }

  tags = merge(var.tags, {
    Function = "clm-update-executor"
  })
}

# ==============================================================================
# CLOUDWATCH LOG GROUPS
# ==============================================================================

resource "aws_cloudwatch_log_group" "clm_orchestrator" {
  name              = "/aws/lambda/${aws_lambda_function.clm_orchestrator.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "clm_schema_auditor" {
  name              = "/aws/lambda/${aws_lambda_function.clm_schema_auditor.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "clm_content_auditor" {
  name              = "/aws/lambda/${aws_lambda_function.clm_content_auditor.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "clm_coverage_auditor" {
  name              = "/aws/lambda/${aws_lambda_function.clm_coverage_auditor.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "clm_update_executor" {
  name              = "/aws/lambda/${aws_lambda_function.clm_update_executor.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${aws_lambda_function.auth.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

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
