import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { uploadAgreement, getAgreementUrl, deleteAgreement } from '@/lib/s3';

// GET agreement download URL
export async function GET(request, { params }) {
  const { id } = params;
  try {
    // Get the agreement URL from the database
    const { rows } = await pool.query(
      'SELECT agreement_file_link FROM hotels WHERE hotel_id = $1',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    if (!rows[0].agreement_file_link) {
      return NextResponse.json({ error: 'No agreement found' }, { status: 404 });
    }

    // Generate a signed URL for downloading
    const downloadUrl = await getAgreementUrl(rows[0].agreement_file_link);
    return NextResponse.json({ url: downloadUrl });
  } catch (error) {
    console.error('Error getting agreement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT/Update agreement
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Get the current agreement URL if exists
    const { rows: existingRows } = await pool.query(
      'SELECT agreement_file_link FROM hotels WHERE hotel_id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Delete the old file if exists
    if (existingRows[0].agreement_file_link) {
      await deleteAgreement(existingRows[0].agreement_file_link);
    }

    // Upload the new file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const s3Url = await uploadAgreement(id, fileBuffer);

    // Update the database with the new URL
    const { rows } = await pool.query(
      'UPDATE hotels SET agreement_file_link = $1, updated_at = CURRENT_TIMESTAMP WHERE hotel_id = $2 RETURNING *',
      [s3Url, id]
    );

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error updating agreement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE agreement
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    // Get the current agreement URL
    const { rows } = await pool.query(
      'SELECT agreement_file_link FROM hotels WHERE hotel_id = $1',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    if (rows[0].agreement_file_link) {
      // Delete from S3
      await deleteAgreement(rows[0].agreement_file_link);

      // Update database
      await pool.query(
        'UPDATE hotels SET agreement_file_link = NULL, updated_at = CURRENT_TIMESTAMP WHERE hotel_id = $1',
        [id]
      );
    }

    return NextResponse.json({ message: 'Agreement deleted successfully' });
  } catch (error) {
    console.error('Error deleting agreement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 