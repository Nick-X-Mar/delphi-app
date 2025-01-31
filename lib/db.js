import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
console.log('Environment:', process.env.NODE_ENV);
console.log('Is Production:', isProduction);

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME || 'delphiapp',
  ssl: isProduction ? {
    rejectUnauthorized: false // Required for RDS SSL connections
  } : false
});

// Add error handling for connection issues
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Add connection testing
pool.on('connect', () => {
  console.log('Connected to database on host:', process.env.DB_HOST);
  console.log('Database connection config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: isProduction
  });
});

export default pool; 