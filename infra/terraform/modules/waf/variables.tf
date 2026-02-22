variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "scope" {
  description = "WAF scope: REGIONAL for ALB/REST API, CLOUDFRONT for CloudFront distributions"
  type        = string
  default     = "CLOUDFRONT"

  validation {
    condition     = contains(["REGIONAL", "CLOUDFRONT"], var.scope)
    error_message = "scope must be REGIONAL or CLOUDFRONT"
  }
}

variable "rate_limit" {
  description = "Maximum requests per 5-minute window per IP before blocking"
  type        = number
  default     = 2000
}

variable "enable_logging" {
  description = "Enable WAF request logging to CloudWatch"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
