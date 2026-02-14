variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "sensaai"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
