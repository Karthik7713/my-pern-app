// server/src/app.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const db = require('./db');


const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const transactionsRouter = require('./routes/transactions');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');
const booksRouter = require('./routes/books');

const app = express();

// Middleware
// Ensure CORS allows the Authorization header so browser clients can send JWTs
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- Existing users router ---
app.use('/api/users', usersRouter);
// New routes
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api', reportsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/books', booksRouter);

// Serve uploaded receipt files
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static('uploads'));

// --- Debug / health route ---
app.get('/api/ping', (req, res) => res.json({ ok: 1 }));

// Optional test endpoints: enable by setting `ENABLE_TEST_CONN=true` in environment.
if (process.env.ENABLE_TEST_CONN === 'true') {
  // Helper: ensure test_conn table + index exist
  async function ensureTestConnTable() {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS test_conn (
        id SERIAL PRIMARY KEY,
        name TEXT
      );
    `);

    await db.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS test_conn_name_unique
      ON test_conn (name);
    `);
  }

  // GET /api/testconn  -> returns up to 100 latest rows
  app.get('/api/testconn', async (req, res) => {
    try {
      await ensureTestConnTable();
      const { rows } = await db.pool.query(
        `SELECT * FROM test_conn ORDER BY id DESC LIMIT 100`
      );
      res.json({ rows });
    } catch (err) {
      console.error('DB error (GET /api/testconn):', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/testconn -> body: { name: "someName" }
  // Inserts name idempotently (no duplicate names). Returns inserted/existing row.
  app.post('/api/testconn', async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Missing or invalid "name" in request body' });
      }

      const cleanName = name.trim();

      await ensureTestConnTable();

      const query = `
        WITH ins AS (
          INSERT INTO test_conn (name)
          VALUES ($1)
          ON CONFLICT (name) DO NOTHING
          RETURNING *
        )
        SELECT * FROM ins
        UNION
        SELECT * FROM test_conn WHERE name = $1
        LIMIT 1;
      `;

      const { rows } = await db.pool.query(query, [cleanName]);

      if (rows.length === 0) {
        return res.status(500).json({ error: 'Failed to insert or retrieve row' });
      }

      res.status(201).json({ row: rows[0] });
    } catch (err) {
      console.error('DB error (POST /api/testconn):', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// --- 404 handler ---
app.use((req, res) => res.status(404).send('Not Found'));

// --- Start server only when run directly (prevents tests from spawning a server)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '127.0.0.1';

  console.log(`Attempting to bind server to ${HOST}:${PORT} (pid=${process.pid})`);

  // bind explicitly to the configured HOST so we can diagnose loopback vs external issues
  const server = app.listen(PORT, HOST, () => {
    try {
      const addr = server.address();
      console.log(`Server successfully listening on ${addr.address}:${addr.port} (family=${addr.family})`);
    } catch (e) {
      console.log(`Server listening callback fired (PORT=${PORT}).`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use — change PORT or kill the process using it.`);
      process.exit(1);
    } else {
      console.error('Server error during startup:', err);
    }
  });
}

module.exports = app;
