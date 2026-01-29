# Pilot Environment Configuration
# SensaPBL Serverless Infrastructure

environment = "pilot"
aws_region  = "us-east-1"

# Cognito OAuth URLs
cognito_callback_urls = [
  "http://localhost:5173/callback",
  "http://localhost:5173/auth/callback",
  "http://localhost:5174/callback",
  "http://localhost:5175/callback"
]

cognito_logout_urls = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
]

# API Gateway CORS
cors_allowed_origins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
]
