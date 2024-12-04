variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "iam_role_arn" {
  description = "ARN of the IAM role to assume"
  type        = string
} 