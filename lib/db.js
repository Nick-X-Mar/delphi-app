import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

// Determine if we're connecting to AWS RDS (either from local dev or production)
const isAWSConnection = isProduction || process.env.DB_HOST?.includes('rds.amazonaws.com');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ...(isAWSConnection && { ssl: { rejectUnauthorized: false } }) // Add SSL only for AWS connections
};

const pool = new Pool(config);

// Add error handling for connection issues
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'ECONNREFUSED') {
    console.error('Connection refused. Check if database is running and configuration is correct.');
  }
  process.exit(-1);
});

// Add connection testing
pool.on('connect', () => {
  // Connection established
});

export default pool; 