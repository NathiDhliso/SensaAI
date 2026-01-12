variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "sensapbl"
}

variable "concepts_table_arn" {
  description = "ARN of the concepts DynamoDB table"
  type        = string
}

variable "concepts_table_name" {
  description = "Name of the concepts DynamoDB table"
  type        = string
}

variable "jobs_table_arn" {
  description = "ARN of the generation jobs DynamoDB table"
  type        = string
}

variable "jobs_table_name" {
  description = "Name of the generation jobs DynamoDB table"
  type        = string
}

variable "lambda_memory_size" {
  description = "Memory size for Lambda functions in MB"
  type        = number
  default     = 10240 # 10GB for heavy generation workloads
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 900 # 15 minutes max
}

variable "enable_provisioned_concurrency" {
  description = "Enable provisioned concurrency to eliminate cold starts"
  type        = bool
  default     = false
}

variable "provisioned_concurrent_executions" {
  description = "Number of provisioned concurrent executions"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

variable "source_dir" {
  description = "Path to the Lambda source code directory"
  type        = string
}
