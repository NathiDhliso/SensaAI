# Dev Environment Variables

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cognito_callback_urls" {
  description = "Cognito OAuth callback URLs"
  type        = list(string)
}

variable "cognito_logout_urls" {
  description = "Cognito logout redirect URLs"
  type        = list(string)
}

variable "cognito_domain_prefix" {
  description = "Cognito hosted UI domain prefix (must be globally unique)"
  type        = string
  default     = "sensaai"
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for API Gateway"
  type        = list(string)
}
