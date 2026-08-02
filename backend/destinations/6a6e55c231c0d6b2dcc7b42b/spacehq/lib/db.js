/**
 * Shared SQLite database — built on Node's built-in SQLite (node:sqlite).
 *
 * This is the relational-storage foundation for your future modules. It opens a
 * single database file (data/spacehq.db) tuned for throughput and hands you the
 * connection so each module can create its own tables and prepared statements.
 *
 * Two storage layers ship with this skeleton, use whichever fits a module:
 *   - lib/db.js       (this file)  — SQLite, for large/relational/queryable data
 *   - lib/blobStore.js             — one JSON document per key, for small state
 *
 * Requires Node 22+ run with --experimental-sqlite (already set by the
 * package.json "start"/"dev" scripts and the systemd unit in deploy/).
 *
 * Example (in a future module):
 *   const db = require('../lib/db').get();
 *   db.exec(`CREATE TABLE IF NOT EXISTS widgets(
 *     id INTEGER PRIMARY KEY AUTOINCREMENT,
 *     name TEXT, created_at TEXT DEFAULT (datetime('now'))
 *   );`);
 *   const insert = db.prepare('INSERT INTO widgets(name) VALUES (?)');
 *   insert.run('hello');
 *   const rows = db.prepare('SELECT * FROM widgets ORDER BY id DESC').all();
 */
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'spacehq.db');

let db = null;

/** Open (once) and return the shared database connection. */
function get() {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  db = new DatabaseSync(DB_FILE);
  // Pragmas tuned for a write-heavy, single-writer web app.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 15000;
    PRAGMA temp_store = MEMORY;
    PRAGMA foreign_keys = ON;
  `);
  return db;
}

/** Close the connection (used on shutdown; optional). */
function close() {
  if (db) { try { db.close(); } catch (_) {} db = null; }
}

module.exports = { get, close, DB_FILE };
