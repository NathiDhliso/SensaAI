# Terraform Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.endpoint
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = module.cognito.client_id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = module.cognito.domain
}

output "s3_content_bucket" {
  description = "S3 bucket for content storage"
  value       = module.s3.content_bucket_name
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = module.ecr.frontend_repository_url
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = module.ecr.backend_repository_url
}

# Serverless Learning Pipeline Outputs
output "dynamodb_concepts_table" {
  description = "DynamoDB table name for concepts"
  value       = module.dynamodb.concepts_table_name
}

output "dynamodb_jobs_table" {
  description = "DynamoDB table name for generation jobs"
  value       = module.dynamodb.jobs_table_name
}

output "lambda_generate_function" {
  description = "Lambda function name for concept generation"
  value       = module.lambda.generate_concepts_function_name
}

output "lambda_query_function" {
  description = "Lambda function name for concept queries"
  value       = module.lambda.query_concepts_function_name
}
