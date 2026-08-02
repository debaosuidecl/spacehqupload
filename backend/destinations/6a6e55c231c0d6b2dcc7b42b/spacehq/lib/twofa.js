/**
 * Two-factor authentication (TOTP) state for the admin login.
 *
 * Stored in blob 'twofa':
 *   { enabled, encSecret, recovery:[{hash,used}], pendingSecret, pendingRecovery }
 * The TOTP secret is encrypted at rest (DATA_ENC_KEY). Recovery codes are stored
 * only as SHA-256 hashes (one-time use), so they can be verified but not read back.
 *
 * Break-glass: if you lose your authenticator AND your recovery codes, set
 * DISABLE_2FA=1 in .env and restart — login then skips the 2FA step so you can
 * sign in and reset it. (server.js honors that flag.)
 */
const crypto = require('crypto');
const { encrypt, decrypt } = require('./cryptoStore');
const blob = require('./blobStore');
const totp = require('./totp');

const BLOB = 'twofa';
const ISSUER = 'SpaceHQ';

function read() { return blob.read(BLOB, {}) || {}; }
function write(o) { blob.write(BLOB, o); }

function status() {
  const c = read();
  return { enabled: !!(c.enabled && c.encSecret), recoveryLeft: ((c.recovery) || []).filter((r) => !r.used).length };
}

function genRecovery(n = 10) { const out = []; for (let i = 0; i < n; i++) out.push(crypto.randomBytes(5).toString('hex')); return out; }
function hashCode(c) { return crypto.createHash('sha256').update(String(c).toLowerCase().replace(/[\s-]/g, '')).digest('hex'); }

// Begin setup: create a pending secret + recovery codes (returned once, in clear).
function startSetup(label) {
  const secret = totp.generateSecret();
  const recovery = genRecovery();
  const c = read();
  c.pendingSecret = encrypt(secret);
  c.pendingRecovery = recovery.map((x) => ({ hash: hashCode(x), used: false }));
  write(c);
  return { secret, otpauth: totp.otpauthURL(secret, label || 'admin', ISSUER), recovery };
}

// Confirm a code from the authenticator to turn 2FA on.
function enable(token) {
  const c = read();
  if (!c.pendingSecret) return { ok: false, error: 'Start setup first.' };
  const secret = decrypt(c.pendingSecret);
  if (!totp.verify(secret, token)) return { ok: false, error: 'That code did not match. Make sure your device clock is correct and try again.' };
  c.enabled = true; c.encSecret = c.pendingSecret; c.recovery = c.pendingRecovery;
  delete c.pendingSecret; delete c.pendingRecovery;
  write(c);
  return { ok: true };
}

function consumeRecovery(code, c) {
  const h = hashCode(code);
  const r = (c.recovery || []).find((x) => !x.used && x.hash === h);
  if (r) { r.used = true; return true; }
  return false;
}

// Used at login. Accepts a current TOTP code OR an unused recovery code.
function verifyLogin(token) {
  const c = read();
  if (!c.enabled || !c.encSecret) return true; // 2FA off → nothing to check
  try { if (totp.verify(decrypt(c.encSecret), token)) return true; } catch (_) {}
  if (consumeRecovery(token, c)) { write(c); return true; }
  return false;
}

// Turn 2FA off — requires a current code or a recovery code.
function disable(token) {
  const c = read();
  if (!c.enabled) return { ok: true };
  let ok = false;
  try { ok = totp.verify(decrypt(c.encSecret), token); } catch (_) {}
  if (!ok) ok = consumeRecovery(token, c);
  if (!ok) return { ok: false, error: 'That code did not match.' };
  write({ enabled: false });
  return { ok: true };
}

// Issue a fresh set of recovery codes (invalidates the old ones).
function regenerateRecovery(token) {
  const c = read();
  if (!c.enabled) return { ok: false, error: '2FA is not enabled.' };
  let ok = false;
  try { ok = totp.verify(decrypt(c.encSecret), token); } catch (_) {}
  if (!ok) return { ok: false, error: 'That code did not match.' };
  const recovery = genRecovery();
  c.recovery = recovery.map((x) => ({ hash: hashCode(x), used: false }));
  write(c);
  return { ok: true, recovery };
}

module.exports = { status, startSetup, enable, disable, verifyLogin, regenerateRecovery };
