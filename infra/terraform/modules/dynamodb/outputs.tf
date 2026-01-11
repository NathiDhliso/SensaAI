output "concepts_table_name" {
  description = "Name of the concepts DynamoDB table"
  value       = aws_dynamodb_table.concepts.name
}

output "concepts_table_arn" {
  description = "ARN of the concepts DynamoDB table"
  value       = aws_dynamodb_table.concepts.arn
}

output "jobs_table_name" {
  description = "Name of the generation jobs DynamoDB table"
  value       = aws_dynamodb_table.generation_jobs.name
}

output "jobs_table_arn" {
  description = "ARN of the generation jobs DynamoDB table"
  value       = aws_dynamodb_table.generation_jobs.arn
}
