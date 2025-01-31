import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
console.log('Environment:', process.env.NODE_ENV);
console.log('Is Production:', isProduction);

// Log all environment variables (except password)
console.log('Database Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  ssl: isProduction,
  // Do not log password
});

if (!process.env.DB_HOST) {
  console.error('DB_HOST environment variable is not set!');
}

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'delphiapp',
  ssl: {
    rejectUnauthorized: false // Required for RDS SSL connections
  }
});

// Add error handling for connection issues
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'ECONNREFUSED') {
    console.error('Connection refused. Check if DB_HOST is set correctly:', process.env.DB_HOST);
  }
  process.exit(-1);
});

// Add connection testing
pool.on('connect', () => {
  console.log('Successfully connected to database on host:', process.env.DB_HOST);
});

// Test the connection immediately
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client:', err.stack);
    if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Current connection settings:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        ssl: isProduction
      });
    }
    return;
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('Database connection test successful:', result.rows[0]);
  });
});

export default pool; 