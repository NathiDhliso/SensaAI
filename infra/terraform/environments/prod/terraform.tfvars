# Production Environment Configuration
# SensaAI Serverless Infrastructure

environment = "prod"
aws_region  = "us-east-1"

cognito_callback_urls = [
  "https://sensaai.co.za/callback",
  "https://sensaai.co.za/auth/callback",
  "https://www.sensaai.co.za/callback",
  "https://www.sensaai.co.za/auth/callback"
]

cognito_logout_urls = [
  "https://sensaai.co.za",
  "https://www.sensaai.co.za"
]

cors_allowed_origins = [
  "https://sensaai.co.za",
  "https://www.sensaai.co.za"
]

# Cross-account credentials should be set via environment variables:
# export TF_VAR_cross_account_access_key_id="your-key-id"
# export TF_VAR_cross_account_secret_access_key="your-secret-key"
# Or use AWS SSM Parameter Store / Secrets Manager
