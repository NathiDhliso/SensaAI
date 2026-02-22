# Dev Environment Configuration
# SensaAI Serverless Infrastructure

environment = "dev"
aws_region  = "us-east-1"

# Cognito OAuth URLs
cognito_callback_urls = [
  "http://localhost:5173/callback",
  "http://localhost:5173/auth/callback",
  "http://localhost:5174/callback",
  "http://localhost:5175/callback",
  "https://main.dckqci84h8ffk.amplifyapp.com/callback",
  "https://main.dckqci84h8ffk.amplifyapp.com/auth/callback",
  "https://sensaai.co.za/callback",
  "https://sensaai.co.za/auth/callback",
  "https://www.sensaai.co.za/callback",
  "https://www.sensaai.co.za/auth/callback"
]

cognito_logout_urls = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://main.dckqci84h8ffk.amplifyapp.com",
  "https://sensaai.co.za",
  "https://www.sensaai.co.za"
]

# API Gateway CORS
cors_allowed_origins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://main.dckqci84h8ffk.amplifyapp.com",
  "https://sensaai.co.za",
  "https://www.sensaai.co.za"
]

# Cross-account IAM role for Bedrock should be set via environment variables:
# export TF_VAR_cross_account_role_arn="arn:aws:iam::BEDROCK_ACCOUNT_ID:role/YOUR_ROLE"
# Or use AWS SSM Parameter Store / Secrets Manager
