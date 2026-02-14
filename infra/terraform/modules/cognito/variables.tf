variable "user_pool_name" {
  description = "Name of the Cognito user pool"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "callback_urls" {
  description = "Allowed callback URLs"
  type        = list(string)
}

variable "logout_urls" {
  description = "Allowed logout URLs"
  type        = list(string)
}

variable "domain_prefix" {
  description = "Domain prefix for hosted UI"
  type        = string
}

variable "lambda_source_dir" {
  description = "Path to the Lambda source directory containing custom_message/"
  type        = string
}
