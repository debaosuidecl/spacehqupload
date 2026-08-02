/**
 * Append-only audit log. Each entry is one JSON line in data/audit.log.
 * Used for the admin Logs module: auth events, data API changes, and app
 * actions posted by the front end.
 */
const fs = require('fs');
const path = require('path');
const mongo = require('./mongo');
const blob = require('./blobStore');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'audit.log');
const MAX_RETURN = 1000;
const BLOB = 'audit-log';
const CAP = 5000; // retained entries in Mongo mode

function ensure() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 }); }

function log(entry) {
  const e = Object.assign({ ts: new Date().toISOString() }, entry);
  if (mongo.enabled()) {
    const arr = blob.read(BLOB, []);
    arr.push(e);
    if (arr.length > CAP) arr.splice(0, arr.length - CAP);
    blob.write(BLOB, arr);
    return e;
  }
  ensure();
  try { fs.appendFileSync(FILE, JSON.stringify(e) + '\n', { mode: 0o600 }); } catch (_) {}
  return e;
}

function recent(limit = 200) {
  limit = Math.min(Math.max(parseInt(limit, 10) || 200, 1), MAX_RETURN);
  if (mongo.enabled()) {
    const arr = blob.read(BLOB, []);
    return arr.slice(-limit).reverse();
  }
  ensure();
  if (!fs.existsSync(FILE)) return [];
  let lines;
  try { lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean); } catch (_) { return []; }
  return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean).reverse();
}

module.exports = { log, recent };
