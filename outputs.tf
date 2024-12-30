output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_database_name" {
  description = "The name of the database"
  value       = aws_db_instance.postgres.db_name
}

output "rds_connection_command" {
  description = "Command to connect to the database using psql"
  value       = "psql -h ${aws_db_instance.postgres.endpoint} -U ${aws_db_instance.postgres.username} -d ${aws_db_instance.postgres.db_name}"
  sensitive   = false
} 