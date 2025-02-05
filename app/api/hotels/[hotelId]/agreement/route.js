import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { uploadAgreement, getAgreementUrl, deleteAgreement } from '@/lib/s3';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';
const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1';

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

// POST - Upload agreement file
export async function POST(request, { params }) {
  const hotelId = params.hotelId;
  
  // Debug environment
  console.log('[S3 Upload] Environment check:', {
    environment: process.env.NODE_ENV,
    isProd,
    bucket: BUCKET_NAME,
    region: REGION,
    lambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    execution_env: process.env.AWS_EXECUTION_ENV,
    available_aws_vars: Object.keys(process.env).filter(key => key.startsWith('AWS_')),
    delphi_vars: Object.keys(process.env).filter(key => key.includes('DELPHI')),
    has_access_key: !!process.env.DELPHI_AWS_ACCESS_KEY,
    has_secret_key: !!process.env.DELPHI_AWS_SECRET_KEY,
    access_key_length: process.env.DELPHI_AWS_ACCESS_KEY?.length,
    secret_key_length: process.env.DELPHI_AWS_SECRET_KEY?.length,
    role_arn: process.env.AWS_LAMBDA_ROLE_ARN,
    lambda_function_name: process.env.AWS_LAMBDA_FUNCTION_NAME,
    lambda_task_root: process.env.LAMBDA_TASK_ROOT
  });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[S3 Upload] Processing file:', {
      hotelId,
      fileName: file.name,
      fileType: file.type,
      bucketName: BUCKET_NAME
    });

    const filename = `hotels/${hotelId}/agreement/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type || 'application/pdf',
      ServerSideEncryption: 'AES256'
    }));

    const fileUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${filename}`;
    
    console.log('[S3 Upload] File uploaded successfully:', {
      fileUrl,
      key: filename
    });

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
      return Response.json({ error: 'Hotel not found' }, { status: 404 });
    }
    
    return Response.json({ fileUrl });
  } catch (error) {
    console.error('[S3 Upload] Error:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorName: error.name,
      bucket: BUCKET_NAME,
      region: REGION,
      isProd,
      environment: process.env.NODE_ENV
    });
    
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove agreement file
export async function DELETE(request, { params }) {
  const { hotelId } = params;

  try {
    // First get the current file URL
    const getQuery = 'SELECT agreement_file_link FROM hotels WHERE hotel_id = $1';
    const { rows } = await pool.query(getQuery, [hotelId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const currentFileUrl = rows[0].agreement_file_link;

    if (currentFileUrl) {
      // Delete from S3
      const key = currentFileUrl.split('.amazonaws.com/')[1];
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
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

// GET - Get agreement file
export async function GET(request, { params }) {
  try {
    const { hotelId } = await params;

    // First, get the agreement file link from the database
    const query = 'SELECT agreement_file_link FROM hotels WHERE hotel_id = $1';
    const { rows } = await pool.query(query, [hotelId]);

    if (rows.length === 0 || !rows[0].agreement_file_link) {
      return NextResponse.json({ error: 'Agreement file not found' }, { status: 404 });
    }

    // Extract key from the full S3 URL
    const key = rows[0].agreement_file_link.split('.amazonaws.com/')[1];
    
    // Generate a signed URL that expires in 1 hour
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error getting agreement file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 