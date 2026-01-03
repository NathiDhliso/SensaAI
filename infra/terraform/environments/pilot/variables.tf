# Pilot Environment Variables

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "availability_zones" {
  type = list(string)
}

variable "eks_node_types" {
  type = list(string)
}

variable "eks_desired_nodes" {
  type = number
}

variable "eks_min_nodes" {
  type = number
}

variable "eks_max_nodes" {
  type = number
}

variable "db_instance_class" {
  type = string
}

variable "db_storage_gb" {
  type = number
}

variable "redis_node_type" {
  type = string
}

variable "cognito_callback_urls" {
  type = list(string)
}

variable "cognito_logout_urls" {
  type = list(string)
}
