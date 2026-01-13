# Input Variables for SensaPBL Infrastructure

variable "environment" {
  description = "Environment name (pilot, growth, production)"
  type        = string
  default     = "pilot"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Cognito Variables
variable "cognito_callback_urls" {
  description = "Allowed callback URLs for Cognito"
  type        = list(string)
  default     = ["http://localhost:5173/callback"]
}

variable "cognito_logout_urls" {
  description = "Allowed logout URLs for Cognito"
  type        = list(string)
  default     = ["http://localhost:5173"]
}
