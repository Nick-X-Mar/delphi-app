export async function POST(request, { params }) {
  try {
    const { name, description, total_rooms, base_price_per_night } = await request.json();
    const id = params.id;

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
      INSERT INTO room_types (
        hotel_id,
        name,
        description,
        total_rooms,
        base_price_per_night
      ) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [id, name, description, parseInt(total_rooms), formattedBasePrice];

    const { rows } = await pool.query(query, values);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 