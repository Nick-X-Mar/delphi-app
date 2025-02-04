import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { uploadAgreement, getAgreementUrl, deleteAgreement } from '@/lib/s3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';
const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1';

// Initialize S3 client with different credentials based on environment
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

// POST - Upload agreement file
export async function POST(request, { params }) {
  const hotelId = params.hotelId;
  
  console.log('[S3 Upload] Starting S3 test...', {
    environment: process.env.NODE_ENV,
    isProd,
    bucket: BUCKET_NAME,
    region: REGION,
    usingAmplifyCredentials: isProd
  });

  try {
    // Initialize S3 client inside the request
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

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[S3 Upload] Processing upload:', {
      hotelId,
      fileName: file.name,
      fileType: file.type,
      bucketName: BUCKET_NAME,
      region: REGION,
      environment: process.env.NODE_ENV,
      isProd
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
    
    console.log('[S3 Upload] Upload successful:', {
      fileUrl,
      key: filename,
      bucket: BUCKET_NAME,
      region: REGION
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
      errorStack: error.stack,
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
      // Delete from S3 using our centralized function
      await deleteAgreement(currentFileUrl);
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

    // Get signed URL using our centralized function
    const signedUrl = await getAgreementUrl(rows[0].agreement_file_link);

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error getting agreement file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 