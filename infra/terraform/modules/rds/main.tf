# RDS PostgreSQL Module for SensaPBL (Simplified)

resource "aws_db_subnet_group" "main" {
  name       = "sensapbl-${var.environment}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "sensapbl-${var.environment}-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "sensapbl-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sensapbl-${var.environment}-rds-sg"
  }
}

resource "aws_db_instance" "main" {
  identifier     = var.identifier
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 2
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "sensapbl"
  username = "sensapbl"
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period  = 7
  skip_final_snapshot      = true
  delete_automated_backups = true

  tags = {
    Name = "sensapbl-${var.environment}-db"
  }
}
