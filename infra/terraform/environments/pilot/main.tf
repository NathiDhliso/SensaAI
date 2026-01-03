# Pilot Environment Main Configuration

terraform {
  required_version = ">= 1.6.0"

  # For pilot, use local state (migrate to S3 for production)
  # backend "s3" {
  #   bucket         = "sensapbl-terraform-state"
  #   key            = "pilot/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

# Load the root module
module "sensapbl" {
  source = "../../"

  environment        = var.environment
  aws_region         = var.aws_region
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones

  eks_node_types    = var.eks_node_types
  eks_desired_nodes = var.eks_desired_nodes
  eks_min_nodes     = var.eks_min_nodes
  eks_max_nodes     = var.eks_max_nodes

  db_instance_class = var.db_instance_class
  db_storage_gb     = var.db_storage_gb

  redis_node_type = var.redis_node_type

  cognito_callback_urls = var.cognito_callback_urls
  cognito_logout_urls   = var.cognito_logout_urls
}

# Re-export all outputs
output "vpc_id" {
  value = module.sensapbl.vpc_id
}

output "eks_cluster_name" {
  value = module.sensapbl.eks_cluster_name
}

output "eks_cluster_endpoint" {
  value = module.sensapbl.eks_cluster_endpoint
}

output "rds_endpoint" {
  value     = module.sensapbl.rds_endpoint
  sensitive = true
}

output "cognito_user_pool_id" {
  value = module.sensapbl.cognito_user_pool_id
}

output "cognito_client_id" {
  value = module.sensapbl.cognito_client_id
}

output "ecr_frontend_url" {
  value = module.sensapbl.ecr_frontend_url
}

output "ecr_backend_url" {
  value = module.sensapbl.ecr_backend_url
}
