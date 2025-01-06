import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import pool from '@/lib/db';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const stsClient = new STSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to get temporary credentials
async function getTemporaryCredentials() {
  const command = new AssumeRoleCommand({
    RoleArn: "arn:aws:iam::529088278315:role/TerraformExecutionRole",
    RoleSessionName: "DelphiAppS3Session",
    DurationSeconds: 3600, // 1 hour
  });

  const response = await stsClient.send(command);
  return {
    accessKeyId: response.Credentials.AccessKeyId,
    secretAccessKey: response.Credentials.SecretAccessKey,
    sessionToken: response.Credentials.SessionToken,
  };
}

// Initialize S3 client with role assumption
async function getS3Client() {
  const credentials = await getTemporaryCredentials();
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: credentials,
  });
}

// POST - Upload agreement file
export async function POST(request, { params }) {
  const { hotelId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const filename = `hotels/${hotelId}/agreement/${Date.now()}-${file.name}`;

    // Get S3 client with assumed role
    const s3Client = await getS3Client();

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }));

    // Generate file URL
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

    // Update hotel record with new agreement file link
    const query = `
      UPDATE hotels 
      SET 
        agreement_file_link = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE hotel_id = $2
      RETURNING *
    `;

    const { rows } = await pool.query(query, [fileUrl, hotelId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove agreement file
export async function DELETE(request, { params }) {
  const { hotelId } = await params;

  try {
    // First get the current file URL
    const getQuery = 'SELECT agreement_file_link FROM hotels WHERE hotel_id = $1';
    const { rows } = await pool.query(getQuery, [hotelId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const currentFileUrl = rows[0].agreement_file_link;

    if (currentFileUrl) {
      // Extract the key from the URL
      const urlParts = currentFileUrl.split('.amazonaws.com/');
      const key = urlParts[1];

      // Get S3 client with assumed role
      const s3Client = await getS3Client();

      // Delete from S3
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }));
    }

    // Update hotel record to remove agreement file link
    const updateQuery = `
      UPDATE hotels 
      SET 
        agreement_file_link = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE hotel_id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [hotelId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Agreement file deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { hotelId } = await params;

    // First, get the agreement file link from the database
    const query = 'SELECT agreement_file_link FROM hotels WHERE hotel_id = $1';
    const { rows } = await pool.query(query, [hotelId]);

    if (rows.length === 0 || !rows[0].agreement_file_link) {
      return NextResponse.json({ error: 'Agreement file not found' }, { status: 404 });
    }

    // Extract the key from the URL
    const urlParts = rows[0].agreement_file_link.split('.amazonaws.com/');
    const fileKey = urlParts[1];

    // Get S3 client with assumed role
    const s3Client = await getS3Client();

    // Generate a pre-signed URL for the S3 object
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error getting agreement file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 