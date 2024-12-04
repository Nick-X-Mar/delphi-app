# AWS IAM Configuration Documentation

This directory contains the configuration files for AWS IAM roles, policies, users, and groups used in our Terraform deployment.

## Steps Followed

1. **Create the IAM Role:**
   - Created a role named `TerraformExecutionRole` with the following trust relationship:
     - Allows the `sts:AssumeRole` action for the specified resource.
   - **Trust Policy Document:**
     - The trust relationship is defined in `aws_iam/roles/terraform-execution-role.json`.
     - Example trust policy:
       ```json
       {
           "Version": "2012-10-17",
           "Statement": [
               {
                   "Effect": "Allow",
                   "Principal": {
                       "Service": "ec2.amazonaws.com"
                   },
                   "Action": "sts:AssumeRole"
               }
           ]
       }
       ```
   - **Update Trust Relationship:**
     - Use the following AWS CLI command to update the trust relationship:
       ```bash
       aws iam update-assume-role-policy --role-name TerraformExecutionRole --policy-document file://aws_iam/roles/terraform-execution-role.json
       ```

2. **Define the IAM Policy:**
   - Created a policy named `user-policy` with permissions to assume the `TerraformExecutionRole`.

3. **Create the IAM User:**
   - Created a user named `terraform-deployer`.
   - Attached the `user-policy` to the user.
   - Added the user to the `terraform-group`.

4. **Create the IAM Group:**
   - Created a group named `terraform-group`.
   - Attached the `user-policy` to the group.

## Notes

- Ensure that sensitive information is not included in these files.
- Use these JSON files to automate IAM setup using AWS CLI or Terraform.