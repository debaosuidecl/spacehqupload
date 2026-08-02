/**
 * Shared MongoDB connection. The whole platform uses MongoDB when MONGODB_URI is
 * set in .env; otherwise every store falls back to its original file/SQLite
 * backend (so the app still runs with no Mongo at all).
 *
 *   MONGODB_URI   e.g. mongodb+srv://user:pass@cluster.mongodb.net  (Atlas)
 *                 or   mongodb://127.0.0.1:27017
 *   MONGODB_DB    database name (default: "spacehq")
 *
 * Uses the official `mongodb` driver (installed only when you go Mongo — run
 * `npm install` on the server after setting MONGODB_URI).
 */
let client = null;
let database = null;
let connecting = null;

function enabled() { return !!process.env.MONGODB_URI; }
function dbName() { return process.env.MONGODB_DB || 'spacehq'; }

// Connect once. Safe to call repeatedly; returns the same DB handle.
async function connect() {
  if (!enabled()) return null;
  if (database) return database;
  if (connecting) return connecting;
  connecting = (async () => {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(process.env.MONGODB_URI, { ignoreUndefined: true });
    await client.connect();
    database = client.db(dbName());
    return database;
  })();
  try { return await connecting; }
  finally { connecting = null; }
}

function db() {
  if (!database) throw new Error('MongoDB not connected yet — call connect() at startup');
  return database;
}
function collection(name) { return db().collection(name); }
async function close() { if (client) { try { await client.close(); } catch (_) {} client = null; database = null; } }

module.exports = { enabled, connect, db, collection, close, dbName };
