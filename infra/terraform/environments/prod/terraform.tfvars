# Production Environment Configuration
# SensaPBL Serverless Infrastructure

environment = "prod"
aws_region  = "us-east-1"

# Production URLs - UPDATE these with your actual domain
cognito_callback_urls = [
  "https://app.sensapbl.com/callback",
  "https://sensapbl.com/callback"
]

cognito_logout_urls = [
  "https://app.sensapbl.com"
]

cors_allowed_origins = [
  "https://app.sensapbl.com",
  "https://sensapbl.com"
]
