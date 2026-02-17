# DynamoDB Table for Learning Concepts
# Single-table design optimized for tier-based lazy loading

resource "aws_dynamodb_table" "concepts" {
  name         = "${var.project_name}-concepts-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # Cost-effective for variable workloads

  # Partition Key: USER#userId#SESSION#sessionId
  hash_key = "PK"
  # Sort Key: TIER#tierName#CONCEPT#conceptId
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI for tier-based queries
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "tier-index"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old sessions (optional)
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  # Point-in-time recovery for production safety
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-concepts-${var.environment}"
    Environment = var.environment
  })
}

# DynamoDB Table for Generation Jobs (async tracking)
resource "aws_dynamodb_table" "generation_jobs" {
  name         = "${var.project_name}-jobs-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "jobId"
  range_key = "userId"

  attribute {
    name = "jobId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  # TTL to auto-delete completed jobs after 24 hours
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-jobs-${var.environment}"
    Environment = var.environment
  })
}

# DynamoDB Table for User Data (learning progress, preferences, reviews)
# Single-table design: PK=userId, SK=dataKey (e.g. REVIEW#conceptId, STATS#focus)
resource "aws_dynamodb_table" "userdata" {
  name         = "${var.project_name}-userdata-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "userId"
  range_key = "dataKey"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "dataKey"
    type = "S"
  }

  # Point-in-time recovery for production safety
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-userdata-${var.environment}"
    Environment = var.environment
  })
}
