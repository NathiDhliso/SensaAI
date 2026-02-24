# Production Environment Configuration
# SensaAI Serverless Infrastructure — Account 693582801685

environment = "prod"
aws_region  = "us-east-1"

cognito_domain_prefix = "sensaai"

cognito_callback_urls = [
  "https://sensaai.co.za/callback",
  "https://sensaai.co.za/auth/callback",
  "https://www.sensaai.co.za/callback",
  "https://www.sensaai.co.za/auth/callback",
  "https://main.drikovpxn2p54.amplifyapp.com/callback",
  "https://main.drikovpxn2p54.amplifyapp.com/auth/callback"
]

cognito_logout_urls = [
  "https://sensaai.co.za",
  "https://www.sensaai.co.za",
  "https://main.drikovpxn2p54.amplifyapp.com"
]

cors_allowed_origins = [
  "https://sensaai.co.za",
  "https://www.sensaai.co.za",
  "https://main.drikovpxn2p54.amplifyapp.com"
]
