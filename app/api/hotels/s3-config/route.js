import { S3Client, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import path from 'path';

export async function GET() {
  const isProd = process.env.NODE_ENV === 'production';
  const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
  const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1';
  
  console.log('[S3 Config] Starting S3 test...', {
    environment: process.env.NODE_ENV,
    isProd,
    bucket: BUCKET_NAME,
    region: REGION,
    usingAmplifyCredentials: isProd
  });
  
  // Test S3 access
  let s3Status = 'Not tested';
  let s3Error = null;
  let bucketContents = [];
  
  try {
    const s3Client = new S3Client({
      region: REGION,
      credentials: isProd 
        ? undefined // In production, let Amplify handle credentials automatically
        : fromIni({
            filepath: path.join(process.cwd(), '.aws', 'credentials'),
            configFilepath: path.join(process.cwd(), '.aws', 'config'),
            profile: 'delphi-role'
          })
    });
    
    console.log('[S3 Config] Testing bucket access...');
    
    // First test basic access with ListBuckets
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResult = await s3Client.send(listBucketsCommand);
    console.log('[S3 Config] Found buckets:', bucketsResult.Buckets?.map(b => b.Name));
    
    // Then list contents of our specific bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Delimiter: '/'  // Use delimiter to get "folder" structure
    });
    
    const listResult = await s3Client.send(listCommand);
    console.log('[S3 Config] Bucket contents:', {
      files: listResult.Contents?.map(item => item.Key),
      prefixes: listResult.CommonPrefixes?.map(prefix => prefix.Prefix)
    });
    
    bucketContents = {
      files: listResult.Contents?.map(item => ({
        key: item.Key,
        size: item.Size,
        modified: item.LastModified
      })) || [],
      folders: listResult.CommonPrefixes?.map(prefix => prefix.Prefix) || []
    };
    
    s3Status = 'Success - Can access S3 and list contents';
  } catch (error) {
    console.error('[S3 Config] Error testing S3:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorName: error.name,
      errorStack: error.stack,
      bucket: BUCKET_NAME,
      region: REGION,
      isProd,
      environment: process.env.NODE_ENV
    });
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
    region: REGION,
    bucketName: BUCKET_NAME,
    
    // Credentials info
    credentialsMode: isProd ? 'Using Amplify managed credentials' : 'Using local AWS credentials',
    
    // S3 Access Test
    s3AccessTest: s3Status,
    s3Error: s3Error,
    bucketContents,
    
    // Important note for debugging
    note: isProd 
      ? 'In production, using Amplify managed credentials'
      : 'In development, using local AWS credentials'
  };

  console.log('[S3 Config] Final configuration:', config);
  return Response.json(config);
} 