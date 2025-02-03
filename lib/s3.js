import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

// Initialize S3 client
const s3Client = new S3Client({
  region: 'eu-central-1',
  // In development: use local credentials with role assumption
  // In production: let AWS SDK use the Amplify role credentials automatically
  ...(isDev && {
    credentials: fromIni({
      filepath: path.join(process.cwd(), '.aws', 'credentials'),
      configFilepath: path.join(process.cwd(), '.aws', 'config'),
      profile: 'delphi-role'
    })
  })
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

if (isDev) {
  console.log('S3 Client Configuration:', {
    region: 'eu-central-1',
    bucketName: BUCKET_NAME
  });
}

export async function uploadAgreement(hotelId, file) {
  if (isDev) {
    console.log('Uploading agreement:', {
      hotelId,
      fileName: file.name,
      fileType: file.type,
      bucketName: BUCKET_NAME
    });
  }

  // Generate unique filename
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

    const fileUrl = `https://${BUCKET_NAME}.s3.${s3Client.config.region}.amazonaws.com/${filename}`;
    
    if (isDev) {
      console.log('Successfully uploaded file:', {
        url: fileUrl,
        key: filename
      });
    }

    return fileUrl;
  } catch (error) {
    console.error('Error uploading to S3:', {
      error: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId
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