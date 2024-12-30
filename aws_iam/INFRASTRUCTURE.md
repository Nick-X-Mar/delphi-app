# Delphi App Infrastructure

This document outlines the AWS infrastructure setup for the Delphi application using Terraform.

## IAM Setup

### Roles and Permissions

1. **TerraformExecutionRole**
   - Role used by Terraform for infrastructure management
   - Has the following policies attached:
     - `AmazonEC2FullAccess`
     - `AmazonRDSFullAccess`
     - `AmazonS3FullAccess`
     - `AmplifyBackendDeployFullAccess`

2. **terraform-deployer User**
   - IAM user for running Terraform commands
   - Has permissions to assume the TerraformExecutionRole
   - Policy attached:
     ```json
     {
         "Version": "2012-10-17",
         "Statement": [
             {
                 "Effect": "Allow",
                 "Action": "sts:AssumeRole",
                 "Resource": "arn:aws:iam::529088278315:role/TerraformExecutionRole"
             }
         ]
     }
     ```
   - Additional S3 permissions:
     ```json
     {
         "Version": "2012-10-17",
         "Statement": [
             {
                 "Sid": "Statement1",
                 "Effect": "Allow",
                 "Action": [
                     "s3:CreateBucket",
                     "s3:PutBucketPolicy",
                     "s3:PutBucketPublicAccessBlock",
                     "s3:PutEncryptionConfiguration",
                     "s3:PutBucketVersioning"
                 ],
                 "Resource": "arn:aws:s3:::*"
             }
         ]
     }
     ```

### AWS Credentials Configuration
- AWS credentials are configured using `aws configure`
- Credentials are stored in `~/.aws/credentials`
- No need for `.env` file with AWS credentials
- Region is set to `eu-central-1`

## Components

### S3 Bucket
- **Name**: `delphi-app-private-storage`
- **Configuration**:
  - Private access only
  - Server-side encryption (AES256)
  - Versioning enabled
  - Public access blocked

### RDS PostgreSQL Database
- **Instance**: `db.t4g.micro` (ARM-based, cost-effective)
- **Version**: PostgreSQL 15.5
- **Storage**: 20GB GP3
- **Configuration**:
  - Publicly accessible for development
  - Encrypted storage
  - Weekly backups (7-day retention)
  - Maintenance window: Monday 04:00-05:00
  - Backup window: 03:00-04:00
  - Auto minor version upgrades enabled

### Networking (Default VPC)
- Using default VPC: `vpc-04393667964efb0cc`
- Private subnets for RDS:
  - `subnet-0e33e29117a9d22b4`
  - `subnet-092846fa9f11449c6`
  - `subnet-0e948c812c7b8d0cd`

### Security Groups
1. **RDS Security Group**:
   - Allows PostgreSQL (5432) from application security group
   - Allows access from any IP for development (0.0.0.0/0)
   - Name: `delphi-app-postgres-sg`

2. **Application Security Group**:
   - Allows all outbound traffic
   - Will be used by the Amplify application
   - Name: `delphi-app-sg`

## File Structure
```
├── main.tf              # Main infrastructure configuration
├── variables.tf         # Variable definitions
├── terraform.tfvars     # Non-sensitive variable values
├── secrets.tfvars       # Sensitive data (not in git)
└── .gitignore          # Git ignore patterns
```

## Deployment Process
1. Configure AWS credentials:
   ```bash
   aws configure
   ```

2. Initialize Terraform:
   ```bash
   terraform init
   ```

3. Plan changes:
   ```bash
   terraform plan -var-file="terraform.tfvars" -var-file="secrets.tfvars" -out=tfplan
   ```

4. Apply changes:
   ```bash
   terraform apply "tfplan"
   ```

## Security Notes
- All sensitive data in `secrets.tfvars` (gitignored)
- Database publicly accessible for development (consider restricting in production)
- Security groups configured for development access
- Encryption at rest enabled
- Regular backups configured
- Role-based access control implemented through IAM

## Cost Optimization
- Using `t4g.micro` instance (ARM-based)
- GP3 storage for better performance/cost ratio
- No multi-AZ deployment
- Performance Insights disabled
- Basic monitoring only