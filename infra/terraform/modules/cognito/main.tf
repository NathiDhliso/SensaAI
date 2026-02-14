# Cognito User Pool Module for SensaPBL

resource "aws_cognito_user_pool" "main" {
  name = var.user_pool_name

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "SensaPBL - Verify your email"
    email_message        = "Your verification code is {####}"
  }

  lambda_config {
    custom_message = aws_lambda_function.custom_message.arn
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  tags = {
    Name = "sensapbl-${var.environment}-user-pool"
  }

  depends_on = [aws_lambda_function.custom_message]
}

# =============================================================================
# Custom Message Lambda - Branded Email Templates
# =============================================================================

data "archive_file" "custom_message" {
  type        = "zip"
  source_dir  = "${var.lambda_source_dir}/custom_message"
  output_path = "${path.module}/custom_message.zip"
}

resource "aws_iam_role" "custom_message" {
  name = "sensapbl-${var.environment}-custom-message-lambda"

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
}

resource "aws_iam_role_policy" "custom_message_logs" {
  name = "sensapbl-${var.environment}-custom-message-logs"
  role = aws_iam_role.custom_message.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

resource "aws_lambda_function" "custom_message" {
  function_name = "sensapbl-${var.environment}-custom-message"
  role          = aws_iam_role.custom_message.arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = 5
  memory_size   = 128

  filename         = data.archive_file.custom_message.output_path
  source_code_hash = data.archive_file.custom_message.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = {
    Name     = "sensapbl-${var.environment}-custom-message"
    Function = "custom-message"
  }
}

resource "aws_lambda_permission" "cognito_custom_message" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.custom_message.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_cloudwatch_log_group" "custom_message" {
  name              = "/aws/lambda/${aws_lambda_function.custom_message.function_name}"
  retention_in_days = 14
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "sensapbl-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true

  lifecycle {
    ignore_changes = [generate_secret]
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# =============================================================================
# Cognito Identity Pool - For AWS SDK Authentication (S3, DynamoDB access)
# =============================================================================

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "sensapbl-${var.environment}-identity-pool"
  allow_unauthenticated_identities = true # Allow guest access for basic operations

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }

  tags = {
    Name = "sensapbl-${var.environment}-identity-pool"
  }
}

# IAM Role for Authenticated Users
resource "aws_iam_role" "authenticated" {
  name = "sensapbl-${var.environment}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "cognito-identity.amazonaws.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
        }
        "ForAnyValue:StringLike" = {
          "cognito-identity.amazonaws.com:amr" = "authenticated"
        }
      }
    }]
  })
}

# IAM Role for Unauthenticated (Guest) Users
resource "aws_iam_role" "unauthenticated" {
  name = "sensapbl-${var.environment}-cognito-unauthenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "cognito-identity.amazonaws.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
        }
        "ForAnyValue:StringLike" = {
          "cognito-identity.amazonaws.com:amr" = "unauthenticated"
        }
      }
    }]
  })
}

# IAM Policy for Authenticated Users - S3 and DynamoDB access
resource "aws_iam_role_policy" "authenticated_policy" {
  name = "sensapbl-${var.environment}-authenticated-policy"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::sensapbl-${var.environment}-content-*/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/sensapbl-concepts-${var.environment}",
          "arn:aws:dynamodb:*:*:table/sensapbl-jobs-${var.environment}"
        ]
      }
    ]
  })
}

# IAM Policy for Unauthenticated Users - Read only
resource "aws_iam_role_policy" "unauthenticated_policy" {
  name = "sensapbl-${var.environment}-unauthenticated-policy"
  role = aws_iam_role.unauthenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::sensapbl-${var.environment}-content/public/*"
      }
    ]
  })
}

# Attach roles to Identity Pool
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated"   = aws_iam_role.authenticated.arn
    "unauthenticated" = aws_iam_role.unauthenticated.arn
  }
}
