const { Pool } = require('pg');
console.log('Testing connection with:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function test() {
  try {
    const result = await pool.query('SELECT id, name FROM tags WHERE tenant_id = 1 LIMIT 3');
    console.log('Success:', result.rows);
  } catch (error) {
    console.error('Error details:', error);
  }
  process.exit(0);
}

test();
