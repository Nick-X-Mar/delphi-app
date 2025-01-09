import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST update all events' active status
export async function POST() {
    try {
        await pool.query('SELECT update_all_events_active_status()');
        return NextResponse.json({ message: 'Events active status updated successfully' });
    } catch (error) {
        console.error('Error updating events active status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 