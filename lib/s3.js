import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1';

// Immediate configuration logging
console.log('[S3] Module Configuration:', {
  bucketName: BUCKET_NAME,
  region: REGION,
  environment: process.env.NODE_ENV,
  isDev
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
    : defaultProvider(),
  maxAttempts: 3
});

// Test credentials on initialization
async function testS3Credentials() {
  try {
    console.log('[S3] Testing credentials...');
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: '_test/credentials-test.txt',
      Body: 'Testing credentials',
      ContentType: 'text/plain'
    }));
    console.log('[S3] Credentials test successful');
    
    // Clean up test file
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: '_test/credentials-test.txt'
    }));
  } catch (error) {
    console.error('[S3] Credentials test failed:', {
      error: error.message,
      code: error.code,
      region: REGION,
      bucket: BUCKET_NAME,
      isDev
    });
  }
}

// Run the test when the module loads
testS3Credentials();

export async function uploadAgreement(hotelId, file) {
  console.log('[S3] Starting upload:', {
    hotelId,
    fileName: file.name,
    fileType: file.type,
    bucketName: BUCKET_NAME,
    region: REGION,
    environment: process.env.NODE_ENV,
    isDev
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
      region: REGION
    });
    
    return fileUrl;
  } catch (error) {
    console.error('[S3] Upload error:', {
      errorMessage: error.message,
      errorCode: error.code,
      bucket: BUCKET_NAME,
      region: REGION,
      isDev
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