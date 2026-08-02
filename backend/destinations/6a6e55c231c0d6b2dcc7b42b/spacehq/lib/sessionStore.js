/**
 * Persistent session store for express-session, backed by blobStore (file or
 * MongoDB — the same durable storage as every other module).
 *
 * Why this exists: express-session's DEFAULT store keeps sessions in memory, so
 * every time the Node process restarts (which happens on every deploy) ALL
 * logins are dropped and everyone has to sign in again. Storing sessions in the
 * platform's durable store means a refresh — or a deploy — keeps you logged in
 * until the cookie genuinely expires.
 *
 * Each session is one blob: 'sess_<sid>' = { ...sessionData, __expires }.
 */
const { Store } = require('express-session');
const blob = require('./blobStore');

const PREFIX = 'sess_';
const key = (sid) => PREFIX + sid;
const DEFAULT_TTL = 1000 * 60 * 60 * 8; // 8h, matches the cookie maxAge

function expiryOf(sess) {
  if (sess && sess.cookie && sess.cookie.expires) {
    const t = new Date(sess.cookie.expires).getTime();
    if (!isNaN(t)) return t;
  }
  return Date.now() + DEFAULT_TTL;
}

class BlobSessionStore extends Store {
  get(sid, cb) {
    try {
      const data = blob.read(key(sid), null);
      if (!data) return cb(null, null);
      if (data.__expires && Date.now() > data.__expires) {
        blob.remove(key(sid));
        return cb(null, null);
      }
      const sess = Object.assign({}, data);
      delete sess.__expires;
      return cb(null, sess);
    } catch (e) { return cb(e); }
  }

  set(sid, sess, cb) {
    try {
      const data = Object.assign({}, sess, { __expires: expiryOf(sess) });
      blob.write(key(sid), data);
      return cb && cb(null);
    } catch (e) { return cb && cb(e); }
  }

  destroy(sid, cb) {
    try { blob.remove(key(sid)); return cb && cb(null); }
    catch (e) { return cb && cb(e); }
  }

  // Called by rolling sessions on each request — refresh the expiry.
  touch(sid, sess, cb) {
    try {
      const existing = blob.read(key(sid), null);
      if (existing) { existing.__expires = expiryOf(sess); blob.write(key(sid), existing); }
      return cb && cb(null);
    } catch (e) { return cb && cb(e); }
  }
}

module.exports = BlobSessionStore;
