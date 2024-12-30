import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export async function uploadAgreement(hotelId, file) {
  const key = `agreements/hotels/${hotelId}/${Date.now()}.pdf`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: 'application/pdf',
    ServerSideEncryption: 'AES256' // Ensure server-side encryption
  }));

  return `s3://${BUCKET_NAME}/${key}`;
}

export async function getAgreementUrl(s3Url) {
  // Extract key from s3:// URL
  const key = s3Url.replace(`s3://${BUCKET_NAME}/`, '');
  
  // Generate a signed URL that expires in 1 hour
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteAgreement(s3Url) {
  // Extract key from s3:// URL
  const key = s3Url.replace(`s3://${BUCKET_NAME}/`, '');
  
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  }));
} 