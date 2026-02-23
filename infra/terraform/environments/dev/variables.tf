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
  default     = "sensapbl-dev-v2"
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for API Gateway"
  type        = list(string)
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
