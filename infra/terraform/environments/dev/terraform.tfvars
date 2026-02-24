# Dev Environment Configuration
# SensaAI Serverless Infrastructure

environment = "dev"
aws_region  = "us-east-1"

# Cognito domain prefix — globally unique
cognito_domain_prefix = "sensaai-dev"

# Cognito OAuth URLs
cognito_callback_urls = [
  "http://localhost:5173/callback",
  "http://localhost:5173/auth/callback",
  "http://localhost:5174/callback",
  "http://localhost:5175/callback",
  "https://sensaai.co.za/callback",
  "https://sensaai.co.za/auth/callback",
  "https://www.sensaai.co.za/callback",
  "https://www.sensaai.co.za/auth/callback",
  "https://main.drikovpxn2p54.amplifyapp.com/callback",
  "https://main.drikovpxn2p54.amplifyapp.com/auth/callback"
]

cognito_logout_urls = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://sensaai.co.za",
  "https://www.sensaai.co.za",
  "https://main.drikovpxn2p54.amplifyapp.com"
]

# API Gateway CORS
cors_allowed_origins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://sensaai.co.za",
  "https://www.sensaai.co.za",
  "https://main.drikovpxn2p54.amplifyapp.com"
]
