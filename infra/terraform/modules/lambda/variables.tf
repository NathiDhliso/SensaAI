# Lambda Module Variables

variable "environment" {
  description = "Environment name (pilot, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "sensapbl"
}

# DynamoDB Integration
variable "concepts_table_arn" {
  description = "ARN of the concepts DynamoDB table"
  type        = string
}

variable "concepts_table_name" {
  description = "Name of the concepts DynamoDB table"
  type        = string
}

variable "jobs_table_arn" {
  description = "ARN of the jobs DynamoDB table"
  type        = string
}

variable "jobs_table_name" {
  description = "Name of the jobs DynamoDB table"
  type        = string
}

# Source Configuration
variable "source_dir" {
  description = "Path to the Lambda source code directory"
  type        = string
}

# Generate Concepts Lambda Configuration
variable "generate_timeout" {
  description = "Timeout for generate_concepts Lambda (seconds)"
  type        = number
  default     = 900  # 15 minutes for long LLM calls
}

variable "generate_memory_size" {
  description = "Memory size for generate_concepts Lambda (MB)"
  type        = number
  default     = 10240  # 10GB for parallel processing
}

# Query Concepts Lambda Configuration
variable "query_timeout" {
  description = "Timeout for query_concepts Lambda (seconds)"
  type        = number
  default     = 30
}

variable "query_memory_size" {
  description = "Memory size for query_concepts Lambda (MB)"
  type        = number
  default     = 512
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Provisioned Concurrency (optional)
variable "enable_provisioned_concurrency" {
  description = "Enable provisioned concurrency for query Lambda"
  type        = bool
  default     = false
}

variable "provisioned_concurrent_executions" {
  description = "Number of provisioned concurrent executions"
  type        = number
  default     = 1
}

# Tags
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
