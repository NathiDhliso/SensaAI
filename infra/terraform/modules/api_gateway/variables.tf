# API Gateway Module Variables

variable "environment" {
  description = "Environment name (pilot, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "SensaAI"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Lambda Integration
variable "generate_concepts_function_name" {
  description = "Name of the generate concepts Lambda function"
  type        = string
}

variable "generate_concepts_invoke_arn" {
  description = "Invoke ARN of the generate concepts Lambda function"
  type        = string
}

variable "query_concepts_function_name" {
  description = "Name of the query concepts Lambda function"
  type        = string
}

variable "query_concepts_invoke_arn" {
  description = "Invoke ARN of the query concepts Lambda function"
  type        = string
}

variable "gym_ai_function_name" {
  description = "Name of the gym AI Lambda function"
  type        = string
}

variable "gym_ai_invoke_arn" {
  description = "Invoke ARN of the gym AI Lambda function"
  type        = string
}

# CORS Configuration
variable "cors_allowed_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
}

# Throttling
variable "throttling_burst_limit" {
  description = "API Gateway burst limit"
  type        = number
  default     = 100
}

variable "throttling_rate_limit" {
  description = "API Gateway rate limit (requests per second)"
  type        = number
  default     = 50
}

# JWT Authorizer (Cognito)
variable "enable_jwt_authorizer" {
  description = "Enable JWT authorization via Cognito"
  type        = bool
  default     = false # Disabled for pilot - enable in prod
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID for JWT validation"
  type        = string
  default     = ""
}

variable "cognito_client_id" {
  description = "Cognito App Client ID for JWT audience"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
