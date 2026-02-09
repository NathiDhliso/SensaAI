# Lambda Module Outputs

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

output "gym_ai_function_name" {
  description = "Name of the gym AI Lambda function"
  value       = aws_lambda_function.gym_ai.function_name
}

output "gym_ai_function_arn" {
  description = "ARN of the gym AI Lambda function"
  value       = aws_lambda_function.gym_ai.arn
}

output "gym_ai_invoke_arn" {
  description = "Invoke ARN for API Gateway integration"
  value       = aws_lambda_function.gym_ai.invoke_arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "lambda_layer_arn" {
  description = "ARN of the Python dependencies layer (if created)"
  value       = length(aws_lambda_layer_version.python_deps) > 0 ? aws_lambda_layer_version.python_deps[0].arn : null
}
