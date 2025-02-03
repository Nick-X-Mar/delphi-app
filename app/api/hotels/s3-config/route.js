import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  const isProd = process.env.NODE_ENV === 'production';
  const TERRAFORM_ROLE = 'arn:aws:iam::529088278315:role/TerraformExecutionRole';
  
  // Test S3 access
  let s3Status = 'Not tested';
  let s3Error = null;
  
  try {
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1'
    });
    
    const command = new ListBucketsCommand({});
    await s3Client.send(command);
    s3Status = 'Success - Can access S3';
  } catch (error) {
    s3Status = `Error - ${error.message}`;
    s3Error = {
      code: error.code,
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  const config = {
    // Environment info
    environment: process.env.NODE_ENV,
    isProd,
    
    // S3 Configuration
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    bucketName: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,
    
    // Credentials info
    credentialsMode: isProd ? 'Using TerraformExecutionRole via Amplify' : 'Using local AWS credentials',
    roleArn: TERRAFORM_ROLE,
    
    // S3 Access Test
    s3AccessTest: s3Status,
    s3Error: s3Error,
    
    // Important note for debugging
    note: isProd 
      ? 'In production, using TerraformExecutionRole through Amplify'
      : 'In development, using TerraformExecutionRole through local credentials'
  };

  return Response.json(config);
} 