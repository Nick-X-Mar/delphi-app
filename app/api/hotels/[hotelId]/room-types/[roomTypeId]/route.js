export async function PUT(request, { params }) {
  try {
    const { name, description, total_rooms, base_price_per_night } = await request.json();
    const { id, roomId } = params;

    // Validate required fields
    if (!name || !total_rooms || !base_price_per_night) {
      return NextResponse.json({
        error: 'Name, total rooms, and base price per night are required'
      }, { status: 400 });
    }

    // Validate numeric fields
    if (parseInt(total_rooms) <= 0) {
      return NextResponse.json({
        error: 'Total rooms must be greater than 0'
      }, { status: 400 });
    }

    // Format base price to have two decimal places
    const formattedBasePrice = Number(base_price_per_night).toFixed(2);

    // Validate that the formatted price is a valid number and greater than 0
    if (isNaN(formattedBasePrice) || parseFloat(formattedBasePrice) <= 0) {
      return NextResponse.json({
        error: 'Base price per night must be a valid number greater than 0'
      }, { status: 400 });
    }

    const query = `
      UPDATE room_types 
      SET 
        name = $1,
        description = $2,
        total_rooms = $3,
        base_price_per_night = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE hotel_id = $5 AND room_type_id = $6
      RETURNING *
    `;

    const values = [name, description, parseInt(total_rooms), formattedBasePrice, id, roomId];

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 