import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: 5432,
  database: 'delphiapp',
  ssl: {
    rejectUnauthorized: false // Required for RDS SSL connections
  }
});

export default pool; 