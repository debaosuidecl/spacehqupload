/**
 * Document ("blob") store used by every small module store. Each logical name
 * holds one JSON value (an object or array) — exactly the shape these modules
 * already kept in a single JSON file.
 *
 *   File mode  (no MONGODB_URI): read/write data/<name>.json — identical to the
 *              platform's original behavior, so nothing changes without Mongo.
 *   Mongo mode (MONGODB_URI set): documents live in the `blobs` collection
 *              ({ _id:name, value }). The whole collection is hydrated into an
 *              in-memory cache at startup, so reads stay synchronous and module
 *              code (and all the routes) need no async changes. Writes update the
 *              cache immediately and upsert to Mongo write-through.
 */
const fs = require('fs');
const path = require('path');
const mongo = require('./mongo');

const DATA_DIR = path.join(__dirname, '..', 'data');
const COLL = 'blobs';

const cache = new Map(); // name -> value (mongo mode only)
let ready = false;

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
function ensureDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 }); }
function fileFor(name) { return path.join(DATA_DIR, name + '.json'); }

// Hydrate the cache at startup (Mongo mode only). No-op in file mode.
async function init() {
  if (!mongo.enabled()) { ready = true; return; }
  await mongo.connect();
  const docs = await mongo.collection(COLL).find({}).toArray();
  cache.clear();
  for (const d of docs) cache.set(d._id, d.value);
  ready = true;
}

function read(name, fallback) {
  if (mongo.enabled()) {
    return cache.has(name) ? clone(cache.get(name)) : (fallback === undefined ? null : fallback);
  }
  try {
    ensureDir();
    if (!fs.existsSync(fileFor(name))) return fallback === undefined ? null : fallback;
    return JSON.parse(fs.readFileSync(fileFor(name), 'utf8'));
  } catch (_) { return fallback === undefined ? null : fallback; }
}

function write(name, value) {
  if (mongo.enabled()) {
    cache.set(name, clone(value));
    // write-through; errors are logged but don't block the synchronous caller.
    mongo.collection(COLL).updateOne({ _id: name }, { $set: { value, updatedAt: new Date() } }, { upsert: true })
      .catch((e) => console.error('[blobStore] write failed for', name, e && e.message));
    return value;
  }
  ensureDir();
  fs.writeFileSync(fileFor(name), JSON.stringify(value, null, 2), { mode: 0o600 });
  return value;
}

function remove(name) {
  if (mongo.enabled()) { cache.delete(name); mongo.collection(COLL).deleteOne({ _id: name }).catch(() => {}); return true; }
  try { fs.unlinkSync(fileFor(name)); } catch (_) {}
  return true;
}

module.exports = { init, read, write, remove, isReady: () => ready, enabled: mongo.enabled };
