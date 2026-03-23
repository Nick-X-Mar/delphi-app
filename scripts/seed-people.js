import pool from '../lib/db';

// Sample data for people
const samplePeople = [
  { first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com', salutation: 'Mr.', guest_type: 'speaker', room_type: 'single', mobile_phone: '+1234567890', company: 'Tech Corp', job_title: 'CEO' },
  { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.johnson@example.com', salutation: 'Ms.', guest_type: 'speaker', room_type: 'double', mobile_phone: '+1234567891', company: 'Innovation Labs', job_title: 'CTO' },
  { first_name: 'Michael', last_name: 'Williams', email: 'michael.williams@example.com', salutation: 'Mr.', guest_type: 'guest', room_type: 'single', mobile_phone: '+1234567892', company: 'Global Solutions', job_title: 'Director' },
  { first_name: 'Emily', last_name: 'Brown', email: 'emily.brown@example.com', salutation: 'Ms.', guest_type: 'press', room_type: 'single', mobile_phone: '+1234567893', company: 'News Media', job_title: 'Journalist' },
  { first_name: 'David', last_name: 'Jones', email: 'david.jones@example.com', salutation: 'Mr.', guest_type: 'speaker', room_type: 'double', mobile_phone: '+1234567894', company: 'Future Tech', job_title: 'VP Engineering' },
  { first_name: 'Jessica', last_name: 'Garcia', email: 'jessica.garcia@example.com', salutation: 'Ms.', guest_type: 'guest', room_type: 'single', mobile_phone: '+1234567895', company: 'Design Studio', job_title: 'Creative Director' },
  { first_name: 'Robert', last_name: 'Miller', email: 'robert.miller@example.com', salutation: 'Mr.', guest_type: 'speaker', room_type: 'single', mobile_phone: '+1234567896', company: 'Data Analytics Inc', job_title: 'Chief Data Officer' },
  { first_name: 'Amanda', last_name: 'Davis', email: 'amanda.davis@example.com', salutation: 'Ms.', guest_type: 'press', room_type: 'single', mobile_phone: '+1234567897', company: 'Tech Review', job_title: 'Editor' },
  { first_name: 'Christopher', last_name: 'Rodriguez', email: 'christopher.rodriguez@example.com', salutation: 'Mr.', guest_type: 'guest', room_type: 'double', mobile_phone: '+1234567898', company: 'Startup Hub', job_title: 'Founder' },
  { first_name: 'Michelle', last_name: 'Martinez', email: 'michelle.martinez@example.com', salutation: 'Ms.', guest_type: 'speaker', room_type: 'single', mobile_phone: '+1234567899', company: 'AI Research', job_title: 'Lead Researcher' },
  { first_name: 'Daniel', last_name: 'Hernandez', email: 'daniel.hernandez@example.com', salutation: 'Mr.', guest_type: 'guest', room_type: 'single', mobile_phone: '+1234567900', company: 'Cloud Services', job_title: 'Solutions Architect' },
  { first_name: 'Laura', last_name: 'Lopez', email: 'laura.lopez@example.com', salutation: 'Ms.', guest_type: 'press', room_type: 'single', mobile_phone: '+1234567901', company: 'Digital Magazine', job_title: 'Senior Writer' },
  { first_name: 'James', last_name: 'Wilson', email: 'james.wilson@example.com', salutation: 'Mr.', guest_type: 'speaker', room_type: 'double', mobile_phone: '+1234567902', company: 'Blockchain Ventures', job_title: 'CEO' },
  { first_name: 'Ashley', last_name: 'Anderson', email: 'ashley.anderson@example.com', salutation: 'Ms.', guest_type: 'guest', room_type: 'single', mobile_phone: '+1234567903', company: 'Marketing Pro', job_title: 'CMO' },
  { first_name: 'Matthew', last_name: 'Thomas', email: 'matthew.thomas@example.com', salutation: 'Mr.', guest_type: 'speaker', room_type: 'single', mobile_phone: '+1234567904', company: 'Security Systems', job_title: 'Chief Security Officer' },
  { first_name: 'Nicole', last_name: 'Taylor', email: 'nicole.taylor@example.com', salutation: 'Ms.', guest_type: 'press', room_type: 'single', mobile_phone: '+1234567905', company: 'Tech News', job_title: 'Reporter' },
  { first_name: 'Andrew', last_name: 'Moore', email: 'andrew.moore@example.com', salutation: 'Mr.', guest_type: 'guest', room_type: 'double', mobile_phone: '+1234567906', company: 'Consulting Group', job_title: 'Senior Partner' },
  { first_name: 'Stephanie', last_name: 'Jackson', email: 'stephanie.jackson@example.com', salutation: 'Ms.', guest_type: 'speaker', room_type: 'single', mobile_phone: '+1234567907', company: 'Green Energy', job_title: 'Sustainability Director' },
  { first_name: 'Joshua', last_name: 'White', email: 'joshua.white@example.com', salutation: 'Mr.', guest_type: 'guest', room_type: 'single', mobile_phone: '+1234567908', company: 'Finance Corp', job_title: 'CFO' },
  { first_name: 'Melissa', last_name: 'Harris', email: 'melissa.harris@example.com', salutation: 'Ms.', guest_type: 'press', room_type: 'single', mobile_phone: '+1234567909', company: 'Business Weekly', job_title: 'Columnist' },
  { first_name: 'Ryan', last_name: 'Clark', email: 'ryan.clark@example.com', salutation: 'Mr.', guest_type: 'speaker', room_type: 'double', mobile_phone: '+1234567910', company: 'Software Solutions', job_title: 'VP Product' },
  { first_name: 'Rachel', last_name: 'Lewis', email: 'rachel.lewis@example.com', salutation: 'Ms.', guest_type: 'guest', room_type: 'single', mobile_phone: '+1234567911', company: 'HR Innovations', job_title: 'CHRO' },
  { first_name: 'Kevin', last_name: 'Robinson', email: 'kevin.robinson@example.com', salutation: 'Mr.', guest_type: 'speaker', room_type: 'single', mobile_phone: '+1234567912', company: 'Mobile Apps Inc', job_title: 'CTO' },
  { first_name: 'Kimberly', last_name: 'Walker', email: 'kimberly.walker@example.com', salutation: 'Ms.', guest_type: 'press', room_type: 'single', mobile_phone: '+1234567913', company: 'Tech Blog', job_title: 'Editor-in-Chief' },
  { first_name: 'Brian', last_name: 'Young', email: 'brian.young@example.com', salutation: 'Mr.', guest_type: 'guest', room_type: 'double', mobile_phone: '+1234567914', company: 'E-commerce Platform', job_title: 'VP Operations' },
];

// Generate dates for check-in/check-out (2-3 days from now, staying 3-5 nights)
const getDates = () => {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 3) + 2);
  const nights = Math.floor(Math.random() * 3) + 3;
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);
  
  return {
    checkin_date: checkIn.toISOString().split('T')[0],
    checkout_date: checkOut.toISOString().split('T')[0]
  };
};

async function seedPeople() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate string-based seed IDs using timestamp prefix
    const seedPrefix = 'SEED-' + Date.now().toString().slice(-6);

    console.log(`Starting to insert ${samplePeople.length} people with prefix ${seedPrefix}...`);
    
    // Get current timestamp
    const timestampResult = await client.query("SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AS current_time");
    const currentTimestamp = timestampResult.rows[0].current_time;
    
    // Get all events to optionally link people
    const eventsResult = await client.query('SELECT event_id FROM events ORDER BY event_id LIMIT 1');
    const eventId = eventsResult.rows.length > 0 ? eventsResult.rows[0].event_id : null;
    
    let insertedCount = 0;
    
    for (let i = 0; i < samplePeople.length; i++) {
      const person = samplePeople[i];
      const personId = seedPrefix + '-' + String(i + 1).padStart(3, '0');
      const dates = getDates();
      
      // Insert into people table
      const insertPeopleQuery = `
        INSERT INTO people (
          person_id,
          salutation,
          first_name,
          last_name,
          email,
          mobile_phone,
          room_type,
          guest_type,
          checkin_date,
          checkout_date,
          company,
          job_title,
          app_synced,
          synced_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (person_id) DO NOTHING
        RETURNING person_id
      `;
      
      const peopleValues = [
        personId,
        person.salutation,
        person.first_name,
        person.last_name,
        person.email,
        person.mobile_phone,
        person.room_type,
        person.guest_type,
        dates.checkin_date,
        dates.checkout_date,
        person.company,
        person.job_title,
        true,
        currentTimestamp,
        currentTimestamp,
        currentTimestamp
      ];
      
      const peopleResult = await client.query(insertPeopleQuery, peopleValues);
      
      if (peopleResult.rows.length > 0) {
        // Insert into people_details table
        const insertDetailsQuery = `
          INSERT INTO people_details (
            person_id,
            company,
            job_title,
            room_size,
            notes,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (person_id) DO UPDATE SET
            company = EXCLUDED.company,
            job_title = EXCLUDED.job_title,
            room_size = EXCLUDED.room_size,
            notes = EXCLUDED.notes,
            updated_at = EXCLUDED.updated_at
        `;
        
        const roomSize = person.room_type === 'single' ? 1 : 2;
        const detailsValues = [
          personId,
          person.company,
          person.job_title,
          roomSize,
          `Sample person for testing - ${person.first_name} ${person.last_name}`,
          currentTimestamp
        ];
        
        await client.query(insertDetailsQuery, detailsValues);
        
        // Optionally link to first event if it exists
        if (eventId) {
          const linkEventQuery = `
            INSERT INTO event_people (event_id, person_id)
            VALUES ($1, $2)
            ON CONFLICT (event_id, person_id) DO NOTHING
          `;
          await client.query(linkEventQuery, [eventId, personId]);
        }
        
        insertedCount++;
      }
    }
    
    await client.query('COMMIT');
    console.log(`Successfully inserted ${insertedCount} people into the database.`);
    if (eventId) {
      console.log(`Linked ${insertedCount} people to event_id ${eventId}.`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding people:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed function
seedPeople()
  .then(() => {
    console.log('Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });

