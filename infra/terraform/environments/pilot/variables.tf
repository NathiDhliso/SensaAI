# Pilot Environment Variables
# Serverless-first architecture - simplified variable set

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

variable "cognito_callback_urls" {
  description = "Allowed callback URLs for Cognito OAuth flow"
  type        = list(string)
}

variable "cognito_logout_urls" {
  description = "Allowed logout URLs for Cognito"
  type        = list(string)
}

variable "cors_allowed_origins" {
  description = "Allowed CORS origins for API Gateway"
  type        = list(string)
}

# Legacy variables (kept for backward compatibility, not used in serverless mode)
# These can be removed once migration to serverless-only is confirmed

variable "vpc_cidr" {
  description = "[LEGACY] VPC CIDR block - not used in serverless mode"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "[LEGACY] Availability zones - not used in serverless mode"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "eks_node_types" {
  description = "[LEGACY] EKS node instance types - not used in serverless mode"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_desired_nodes" {
  description = "[LEGACY] EKS desired node count - not used in serverless mode"
  type        = number
  default     = 2
}

variable "eks_min_nodes" {
  description = "[LEGACY] EKS minimum node count - not used in serverless mode"
  type        = number
  default     = 1
}

variable "eks_max_nodes" {
  description = "[LEGACY] EKS maximum node count - not used in serverless mode"
  type        = number
  default     = 4
}

variable "db_instance_class" {
  description = "[LEGACY] RDS instance class - not used in serverless mode"
  type        = string
  default     = "db.t3.micro"
}

variable "db_storage_gb" {
  description = "[LEGACY] RDS storage in GB - not used in serverless mode"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "[LEGACY] ElastiCache node type - not used in serverless mode"
  type        = string
  default     = "cache.t3.micro"
}
