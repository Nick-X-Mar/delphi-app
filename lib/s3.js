import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';
const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1';

console.log('[S3] Initializing client:', {
  environment: process.env.NODE_ENV,
  isProd,
  bucket: BUCKET_NAME,
  region: REGION
});

if (!BUCKET_NAME) {
  throw new Error('NEXT_PUBLIC_AWS_BUCKET_NAME environment variable is not set');
}

// Initialize S3 client with different credentials based on environment
console.log('[S3] Environment check:', {
  environment: process.env.NODE_ENV,
  isProd,
  bucket: BUCKET_NAME,
  region: REGION,
  lambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
  has_access_key: !!process.env.DELPHI_AWS_ACCESS_KEY,
  has_secret_key: !!process.env.DELPHI_AWS_SECRET_KEY,
  env_vars: Object.keys(process.env).filter(key => 
    key.includes('DELPHI') || 
    key.includes('AWS') || 
    key.includes('NODE')
  ),
  access_key_length: process.env.DELPHI_AWS_ACCESS_KEY?.length,
  secret_key_length: process.env.DELPHI_AWS_SECRET_KEY?.length
});

// Create credentials object based on environment
const getCredentials = () => {
  console.log('[S3] Getting credentials for environment:', {
    isProd,
    has_access_key: !!process.env.DELPHI_AWS_ACCESS_KEY,
    has_secret_key: !!process.env.DELPHI_AWS_SECRET_KEY,
    access_key_length: process.env.DELPHI_AWS_ACCESS_KEY?.length,
    secret_key_length: process.env.DELPHI_AWS_SECRET_KEY?.length
  });

  if (isProd) {
    if (!process.env.DELPHI_AWS_ACCESS_KEY || !process.env.DELPHI_AWS_SECRET_KEY) {
      console.error('[S3] Missing credentials:', {
        has_access_key: !!process.env.DELPHI_AWS_ACCESS_KEY,
        has_secret_key: !!process.env.DELPHI_AWS_SECRET_KEY,
        available_env_vars: Object.keys(process.env).filter(key => 
          key.includes('DELPHI') || 
          key.includes('AWS') || 
          key.includes('NODE')
        )
      });
      throw new Error('AWS credentials not found in environment variables');
    }
    return Promise.resolve({
      accessKeyId: process.env.DELPHI_AWS_ACCESS_KEY,
      secretAccessKey: process.env.DELPHI_AWS_SECRET_KEY
    });
  } else {
    return fromIni({
      filepath: path.join(process.cwd(), '.aws', 'credentials'),
      configFilepath: path.join(process.cwd(), '.aws', 'config'),
      profile: 'delphi-role'
    })();
  }
};

const s3Client = new S3Client({
  region: REGION,
  credentials: getCredentials,
  maxAttempts: 3,
  retryMode: 'standard'
});

// Test the connection and check credentials
console.log('[S3] Testing connection...');
s3Client.config.credentials().then(creds => {
  console.log('[S3] Resolved credentials:', {
    accessKeyId: creds.accessKeyId,
    expiration: creds.expiration,
    hasSessionToken: !!creds.sessionToken
  });
}).catch(error => {
  console.error('[S3] Failed to resolve credentials:', error);
});

s3Client.send(new GetObjectCommand({
  Bucket: BUCKET_NAME,
  Key: 'test.txt'
})).catch(error => {
  if (error.name === 'NoSuchKey') {
    console.log('[S3] Connection successful (bucket access verified)');
  } else {
    console.error('[S3] Connection test failed:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorName: error.name,
      errorStack: error.stack,
      bucket: BUCKET_NAME,
      region: REGION,
      isProd,
      environment: process.env.NODE_ENV
    });
  }
});

export async function getAgreementUrl(fileUrl) {
  // Extract key from the full S3 URL
  const key = fileUrl.split('.amazonaws.com/')[1];
  
  // Generate a signed URL that expires in 1 hour
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteAgreement(fileUrl) {
  // Extract key from the full S3 URL
  const key = fileUrl.split('.amazonaws.com/')[1];
  
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  }));
} 