# Pilot Environment Configuration for SensaPBL

environment = "pilot"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# EKS Configuration - Small for pilot
eks_node_types    = ["t3.medium"]
eks_desired_nodes = 2
eks_min_nodes     = 1
eks_max_nodes     = 4

# RDS Configuration - Minimal for pilot
db_instance_class = "db.t3.micro"
db_storage_gb     = 20

# ElastiCache Configuration - Single node for pilot
redis_node_type = "cache.t3.micro"

# Cognito Configuration
cognito_callback_urls = [
  "http://localhost:5173/callback",
  "http://localhost:5173/auth/callback",
  "https://sensapbl.com/callback",
  "https://sensapbl.com/auth/callback"
]

cognito_logout_urls = [
  "http://localhost:5173",
  "http://localhost:5173/",
  "https://sensapbl.com",
  "https://sensapbl.com/"
]
