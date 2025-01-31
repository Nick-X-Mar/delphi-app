import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
console.log('Environment:', process.env.NODE_ENV);
console.log('Is Production:', isProduction);

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

console.log('Database Config:', {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  ssl: config.ssl,
  // Do not log password
});

const pool = new Pool(config);

// Add error handling for connection issues
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'ECONNREFUSED') {
    console.error('Connection refused. Check if database is running and configuration is correct:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl
    });
  }
  process.exit(-1);
});

// Add connection testing
pool.on('connect', () => {
  console.log('Successfully connected to database on host:', config.host);
});

// Test the connection immediately
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client:', err.stack);
    if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Current connection settings:', {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        ssl: config.ssl
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