// server/src/db.js
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:NewServerPassword@localhost:7713/my_pern_db';

const pool = new Pool({
  connectionString,
});

// helper to query
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
