# API Gateway v2 (HTTP API) for Lambda Functions
# Uses HTTP API (v2) for lower latency and cost vs REST API

# HTTP API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  description   = "SensaPBL Learning API"

  cors_configuration {
    allow_origins     = var.cors_allowed_origins
    allow_methods     = ["GET", "POST", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"]
    expose_headers    = ["Content-Type"]
    allow_credentials = true
    max_age           = 300
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-api-${var.environment}"
  })
}

# Default stage with auto-deploy
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  tags = var.tags
}

# CloudWatch Log Group for API access logs
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = 30

  tags = var.tags
}

# ==============================================================================
# Generate Concepts Route (POST /generate)
# ==============================================================================

resource "aws_apigatewayv2_integration" "generate_concepts" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.generate_concepts_invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000 # 30s max for HTTP API
}

resource "aws_apigatewayv2_route" "generate_concepts" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /generate"
  target    = "integrations/${aws_apigatewayv2_integration.generate_concepts.id}"

  # JWT Authorizer (optional, for authenticated routes)
  authorization_type = var.enable_jwt_authorizer ? "JWT" : "NONE"
  authorizer_id      = var.enable_jwt_authorizer ? aws_apigatewayv2_authorizer.cognito[0].id : null
}

# Lambda permission for API Gateway to invoke generate_concepts
resource "aws_lambda_permission" "generate_concepts" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.generate_concepts_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ==============================================================================
# Query Concepts Route (GET /concepts/{subjectId})
# ==============================================================================

resource "aws_apigatewayv2_integration" "query_concepts" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.query_concepts_invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000 # 10s for queries
}

resource "aws_apigatewayv2_route" "query_concepts" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /concepts/{subjectId}"
  target    = "integrations/${aws_apigatewayv2_integration.query_concepts.id}"

  authorization_type = var.enable_jwt_authorizer ? "JWT" : "NONE"
  authorizer_id      = var.enable_jwt_authorizer ? aws_apigatewayv2_authorizer.cognito[0].id : null
}

# Query by tier route
resource "aws_apigatewayv2_route" "query_concepts_by_tier" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /concepts/{subjectId}/{tier}"
  target    = "integrations/${aws_apigatewayv2_integration.query_concepts.id}"

  authorization_type = var.enable_jwt_authorizer ? "JWT" : "NONE"
  authorizer_id      = var.enable_jwt_authorizer ? aws_apigatewayv2_authorizer.cognito[0].id : null
}

# Lambda permission for API Gateway to invoke query_concepts
resource "aws_lambda_permission" "query_concepts" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.query_concepts_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ==============================================================================
# Job Status Route (GET /jobs/{jobId})
# ==============================================================================

resource "aws_apigatewayv2_route" "job_status" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /jobs/{jobId}"
  target    = "integrations/${aws_apigatewayv2_integration.query_concepts.id}"

  authorization_type = var.enable_jwt_authorizer ? "JWT" : "NONE"
  authorizer_id      = var.enable_jwt_authorizer ? aws_apigatewayv2_authorizer.cognito[0].id : null
}

# ==============================================================================
# Gym AI Route (POST /gym-ai)
# ==============================================================================

resource "aws_apigatewayv2_integration" "gym_ai" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.gym_ai_invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "gym_ai" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /gym-ai"
  target    = "integrations/${aws_apigatewayv2_integration.gym_ai.id}"

  authorization_type = var.enable_jwt_authorizer ? "JWT" : "NONE"
  authorizer_id      = var.enable_jwt_authorizer ? aws_apigatewayv2_authorizer.cognito[0].id : null
}

resource "aws_lambda_permission" "gym_ai" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.gym_ai_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ==============================================================================
# Cognito JWT Authorizer (optional)
# ==============================================================================

resource "aws_apigatewayv2_authorizer" "cognito" {
  count = var.enable_jwt_authorizer ? 1 : 0

  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-cognito-authorizer"

  jwt_configuration {
    audience = [var.cognito_client_id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}
