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
  default     = "sensapbl"
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

variable "cross_account_role_arn" {
  description = "IAM role ARN in the Bedrock account for cross-account access"
  type        = string
  default     = ""
}

variable "bedrock_access_key_id" {
  description = "AWS access key ID for the Bedrock account (693582801685)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "bedrock_secret_access_key" {
  description = "AWS secret access key for the Bedrock account (693582801685)"
  type        = string
  default     = ""
  sensitive   = true
}
