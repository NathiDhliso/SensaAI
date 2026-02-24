# SensaAI Infrastructure Variables
# Serverless-only configuration

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Cognito
variable "cognito_callback_urls" {
  description = "Allowed callback URLs for Cognito OAuth"
  type        = list(string)
  default     = ["http://localhost:5173/callback"]
}

variable "cognito_logout_urls" {
  description = "Allowed logout URLs for Cognito"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

# Cognito Domain Prefix (globally unique across all AWS accounts)
variable "cognito_domain_prefix" {
  description = "Cognito hosted UI domain prefix (must be globally unique)"
  type        = string
  default     = "sensaai"
}

# API Gateway CORS
variable "cors_allowed_origins" {
  description = "Allowed CORS origins for API Gateway"
  type        = list(string)
  default     = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175"
  ]
}

# NOTE: Cross-account Bedrock variables removed.
# All services now run on account 693582801685 (single-account architecture).
# Lambda uses its IAM execution role for Bedrock access directly.
