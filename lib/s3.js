import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1';

console.log('[S3] Initializing client:', {
  environment: process.env.NODE_ENV,
  isDev,
  bucket: BUCKET_NAME,
  region: REGION,
  usingAmplifyCredentials: !isDev,
  amplifyRole: process.env.AWS_ROLE_ARN || 'Not available'
});

if (!BUCKET_NAME) {
  throw new Error('NEXT_PUBLIC_AWS_BUCKET_NAME environment variable is not set');
}

// Initialize S3 client with different credentials based on environment
const s3Client = new S3Client({
  region: REGION,
  credentials: isDev 
    ? fromIni({
        filepath: path.join(process.cwd(), '.aws', 'credentials'),
        configFilepath: path.join(process.cwd(), '.aws', 'config'),
        profile: 'delphi-role'
      })
    : undefined // In production, let Amplify handle credentials automatically
});

// Test the connection and check credentials
console.log('[S3] Testing connection...');
s3Client.config.credentials().then(creds => {
  console.log('[S3] Resolved credentials:', {
    accessKeyId: creds.accessKeyId,
    expiration: creds.expiration,
    identityId: creds.identityId,
    roleArn: process.env.AWS_ROLE_ARN,
    sessionToken: !!creds.sessionToken
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
      isDev,
      environment: process.env.NODE_ENV,
      roleArn: process.env.AWS_ROLE_ARN || 'Not available'
    });
  }
});

export async function uploadAgreement(hotelId, file) {
  console.log('[S3] Starting upload:', {
    hotelId,
    fileName: file.name,
    fileType: file.type,
    bucketName: BUCKET_NAME,
    region: REGION,
    environment: process.env.NODE_ENV,
    isDev,
    usingRole: 'arn:aws:iam::529088278315:role/TerraformExecutionRole'
  });

  const filename = `hotels/${hotelId}/agreement/${Date.now()}-${file.name}`;
  
  // Convert file to buffer if it's not already
  const buffer = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());

  try {
    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type || 'application/pdf',
      ServerSideEncryption: 'AES256'
    }));

    const fileUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${filename}`;
    
    console.log('[S3] Upload successful:', {
      fileUrl,
      key: filename,
      bucket: BUCKET_NAME,
      region: REGION,
      usingRole: 'arn:aws:iam::529088278315:role/TerraformExecutionRole'
    });
    
    return fileUrl;
  } catch (error) {
    console.error('[S3] Upload error:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorName: error.name,
      errorStack: error.stack,
      bucket: BUCKET_NAME,
      region: REGION,
      isDev,
      usingRole: 'arn:aws:iam::529088278315:role/TerraformExecutionRole'
    });
    throw error;
  }
}

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