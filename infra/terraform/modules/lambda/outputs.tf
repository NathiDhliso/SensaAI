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

output "auth_function_name" {
  description = "Name of the auth Lambda function"
  value       = aws_lambda_function.auth.function_name
}

output "auth_function_arn" {
  description = "ARN of the auth Lambda function"
  value       = aws_lambda_function.auth.arn
}

output "auth_invoke_arn" {
  description = "Invoke ARN for API Gateway integration"
  value       = aws_lambda_function.auth.invoke_arn
}

# CLM Lambda Outputs

output "clm_orchestrator_function_name" {
  description = "Name of the CLM orchestrator Lambda function"
  value       = aws_lambda_function.clm_orchestrator.function_name
}

output "clm_orchestrator_function_arn" {
  description = "ARN of the CLM orchestrator Lambda function"
  value       = aws_lambda_function.clm_orchestrator.arn
}

output "clm_schema_auditor_function_name" {
  description = "Name of the CLM schema auditor Lambda function"
  value       = aws_lambda_function.clm_schema_auditor.function_name
}

output "clm_content_auditor_function_name" {
  description = "Name of the CLM content auditor Lambda function"
  value       = aws_lambda_function.clm_content_auditor.function_name
}

output "clm_coverage_auditor_function_name" {
  description = "Name of the CLM coverage auditor Lambda function"
  value       = aws_lambda_function.clm_coverage_auditor.function_name
}

output "clm_update_executor_function_name" {
  description = "Name of the CLM update executor Lambda function"
  value       = aws_lambda_function.clm_update_executor.function_name
}
