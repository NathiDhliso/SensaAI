output "generate_concepts_function_name" {
  description = "Name of the generate concepts Lambda function"
  value       = aws_lambda_function.generate_concepts.function_name
}

output "generate_concepts_function_arn" {
  description = "ARN of the generate concepts Lambda function"
  value       = aws_lambda_function.generate_concepts.arn
}

output "generate_concepts_invoke_arn" {
  description = "Invoke ARN for API Gateway integration"
  value       = aws_lambda_function.generate_concepts.invoke_arn
}

output "query_concepts_function_name" {
  description = "Name of the query concepts Lambda function"
  value       = aws_lambda_function.query_concepts.function_name
}

output "query_concepts_function_arn" {
  description = "ARN of the query concepts Lambda function"
  value       = aws_lambda_function.query_concepts.arn
}

output "query_concepts_invoke_arn" {
  description = "Invoke ARN for API Gateway integration"
  value       = aws_lambda_function.query_concepts.invoke_arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}
