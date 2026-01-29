# SensaPBL Infrastructure Variables
# Serverless-only configuration

variable "environment" {
  description = "Environment name (pilot, staging, prod)"
  type        = string
  default     = "pilot"
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
