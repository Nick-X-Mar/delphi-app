import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Test S3 access
  let s3Status = 'Not tested';
  try {
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1'
    });
    
    const command = new ListBucketsCommand({});
    await s3Client.send(command);
    s3Status = 'Success - Can access S3';
  } catch (error) {
    s3Status = `Error - ${error.message}`;
  }
  
  const config = {
    // Environment info
    environment: process.env.NODE_ENV,
    isProd,
    
    // S3 Configuration
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    bucketName: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,
    
    // Credentials info
    credentialsMode: isProd ? 'Using Amplify role' : 'Using local AWS credentials',
    amplifyRole: 'arn:aws:iam::529088278315:role/Aplify',
    
    // S3 Access Test
    s3AccessTest: s3Status,
    
    // Important note for debugging
    note: isProd 
      ? 'In production, using Amplify role with S3FullAccess'
      : 'In development, using local AWS credentials from ~/.aws/credentials'
  };

  return Response.json(config);
} 