# Production Environment Configuration
# SensaAI Serverless Infrastructure

environment = "prod"
aws_region  = "us-east-1"

# Production URLs - UPDATE these with your actual domain
cognito_callback_urls = [
  "https://app.SensaAI.com/callback",
  "https://SensaAI.com/callback"
]

cognito_logout_urls = [
  "https://app.SensaAI.com"
]

cors_allowed_origins = [
  "https://app.SensaAI.com",
  "https://SensaAI.com"
]
