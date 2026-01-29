# API Gateway Module Outputs

output "api_endpoint" {
  description = "The API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_id" {
  description = "The API Gateway ID"
  value       = aws_apigatewayv2_api.main.id
}

output "api_execution_arn" {
  description = "The API Gateway execution ARN (for Lambda permissions)"
  value       = aws_apigatewayv2_api.main.execution_arn
}

output "stage_invoke_url" {
  description = "The invoke URL for the default stage"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "generate_endpoint" {
  description = "Full URL for the generate concepts endpoint"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/generate"
}

output "concepts_endpoint" {
  description = "Base URL for the concepts query endpoint"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/concepts"
}

output "jobs_endpoint" {
  description = "Base URL for the jobs status endpoint"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/jobs"
}
