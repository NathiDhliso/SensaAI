# SensaPBL Infrastructure - Terraform Root Module

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SensaPBL"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  cluster_name          = "sensapbl-${var.environment}"
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  public_subnet_ids     = module.vpc.public_subnet_ids
  node_instance_types   = var.eks_node_types
  desired_capacity      = var.eks_desired_nodes
  min_capacity          = var.eks_min_nodes
  max_capacity          = var.eks_max_nodes

  depends_on = [module.vpc]
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  identifier              = "sensapbl-${var.environment}"
  environment             = var.environment
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_storage_gb
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]

  depends_on = [module.vpc]
}

# ElastiCache Redis Module
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id              = "sensapbl-${var.environment}"
  environment             = var.environment
  node_type               = var.redis_node_type
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]

  depends_on = [module.vpc]
}

# Cognito User Pool
module "cognito" {
  source = "./modules/cognito"

  user_pool_name = "sensapbl-${var.environment}"
  environment    = var.environment
  callback_urls  = var.cognito_callback_urls
  logout_urls    = var.cognito_logout_urls
  domain_prefix  = "sensapbl-${var.environment}"
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"

  environment = var.environment
}

# ECR Repositories
module "ecr" {
  source = "./modules/ecr"

  environment = var.environment
}

# DynamoDB Tables for Concepts Storage
module "dynamodb" {
  source = "./modules/dynamodb"

  environment  = var.environment
  project_name = "sensapbl"

  tags = {
    Component = "ServerlessLearning"
  }
}

# Lambda Functions for Concept Generation and Queries
module "lambda" {
  source = "./modules/lambda"

  environment         = var.environment
  project_name        = "sensapbl"
  concepts_table_arn  = module.dynamodb.concepts_table_arn
  concepts_table_name = module.dynamodb.concepts_table_name
  jobs_table_arn      = module.dynamodb.jobs_table_arn
  jobs_table_name     = module.dynamodb.jobs_table_name

  # Optional: Enable for production to eliminate cold starts
  enable_provisioned_concurrency    = var.environment == "prod"
  provisioned_concurrent_executions = 1

  tags = {
    Component = "ServerlessLearning"
  }

  depends_on = [module.dynamodb]
}

# Configure Kubernetes provider after EKS is created
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}
