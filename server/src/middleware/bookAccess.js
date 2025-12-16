const pool = require('../db');

async function userHasAccessToBook(userId, bookId) {
  if (!bookId) return false;
  try {
    const qNew = `SELECT b.id, b.owner_userid, bm.role FROM books b LEFT JOIN book_members bm ON b.id = bm.book_id AND bm.user_userid::text = $1::text WHERE b.id = $2 LIMIT 1`;
    const qLegacy = `SELECT b.id, b.owner_userid, bm.role FROM books b LEFT JOIN book_members bm ON b.id = bm.book_id AND bm.user_id::text = $1::text WHERE b.id = $2 LIMIT 1`;
    let rows;
    try {
      rows = (await pool.query(qNew, [String(userId), bookId])).rows;
    } catch (err) {
      console.warn('userHasAccessToBook: new column query failed, trying legacy', err?.message || err);
      rows = (await pool.query(qLegacy, [String(userId), bookId])).rows;
    }
    if (!rows || rows.length === 0) return false;
    const r = rows[0];
    if (!r) return false;
    if (r.owner_userid && String(r.owner_userid) === String(userId)) return true;
    if (r.role) return true; // member exists
    return false;
  } catch (err) {
    console.error('userHasAccessToBook error', err);
    return false;
  }
}

// Express middleware: expects book id in req.params.bookId or req.body.book_id or req.query.book_id
async function requireBookAccess(req, res, next) {
  const bookId = req.params.bookId || req.body.book_id || req.query.book_id;
  if (!bookId) return res.status(400).json({ status: 'error', error: 'Missing book id' });
  const userId = req.user && (req.user.id || req.user.userId || req.user.userid);
  const ok = await userHasAccessToBook(userId, bookId);
  if (!ok && req.user && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Access denied to book' });
  // attach book id and allow
  req.bookId = bookId;
  next();
}

module.exports = { userHasAccessToBook, requireBookAccess };
