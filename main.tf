provider "aws" {
  region = var.aws_region

  assume_role {
    role_arn = var.iam_role_arn
  }
}

resource "aws_s3_bucket" "app_bucket" {
  bucket = var.bucket_name
}

# Make the bucket private
resource "aws_s3_bucket_public_access_block" "app_bucket_access" {
  bucket = aws_s3_bucket.app_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "app_bucket_encryption" {
  bucket = aws_s3_bucket.app_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning
resource "aws_s3_bucket_versioning" "app_bucket_versioning" {
  bucket = aws_s3_bucket.app_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Create RDS subnet group
resource "aws_db_subnet_group" "postgres" {
  name       = "delphi-app-postgres-subnet"
  subnet_ids = var.subnet_ids
}

# Create a security group for RDS
resource "aws_security_group" "rds" {
  name        = "delphi-app-postgres-sg"
  description = "Security group for PostgreSQL RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # Allow access from any IP for development
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Create Application Security Group
resource "aws_security_group" "app" {
  name        = "delphi-app-sg"
  description = "Security group for Delphi application"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Create RDS PostgreSQL instance
resource "aws_db_instance" "postgres" {
  identifier           = "delphi-app-db"
  engine              = "postgres"
  engine_version      = "15.5"
  instance_class      = "db.t4g.micro"
  allocated_storage   = 20
  storage_type        = "gp3"

  db_name             = "delphiapp"
  username            = var.db_username
  password            = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot    = true
  publicly_accessible    = true

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  multi_az              = false

  # Performance Insights disabled by default (saves cost)

  # Enable encryption
  storage_encrypted = true

  # Enable automatic minor version upgrades for security patches
  auto_minor_version_upgrade = true

  # Cost-effective monitoring
  monitoring_interval = 0
}