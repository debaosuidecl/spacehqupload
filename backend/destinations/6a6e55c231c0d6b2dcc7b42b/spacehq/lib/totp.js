/**
 * TOTP (RFC 6238) / HOTP (RFC 4226) — time-based one-time passwords compatible
 * with Google Authenticator, Authy, 1Password, etc. Pure Node crypto, no deps.
 */
const crypto = require('crypto');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32encode(buf) {
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.substr(i, 5), 2)];
  const rem = bits.length % 5;
  if (rem) out += B32[parseInt(bits.substr(bits.length - rem).padEnd(5, '0'), 2)];
  return out;
}
function base32decode(str) {
  str = String(str || '').replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = '';
  for (const c of str) { const idx = B32.indexOf(c); if (idx < 0) continue; bits += idx.toString(2).padStart(5, '0'); }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
  return Buffer.from(bytes);
}

function generateSecret(bytes = 20) { return base32encode(crypto.randomBytes(bytes)); }

function hotp(secretB32, counter) {
  const key = base32decode(secretB32);
  const buf = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { buf[i] = c & 0xff; c = Math.floor(c / 256); }
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0xf;
  const bin = ((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) | ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}

function totp(secretB32, t = Date.now(), step = 30) { return hotp(secretB32, Math.floor(t / 1000 / step)); }

// Verify with a ±`window` step tolerance (clock drift). Constant-time compare.
function verify(secretB32, token, window = 1, t = Date.now(), step = 30) {
  token = String(token || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  const c = Math.floor(t / 1000 / step);
  const tBuf = Buffer.from(token);
  for (let i = -window; i <= window; i++) {
    const cand = Buffer.from(hotp(secretB32, c + i));
    if (cand.length === tBuf.length && crypto.timingSafeEqual(cand, tBuf)) return true;
  }
  return false;
}

function otpauthURL(secretB32, label, issuer) {
  const lbl = encodeURIComponent(issuer + ':' + label);
  return `otpauth://totp/${lbl}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = { generateSecret, hotp, totp, verify, otpauthURL, base32encode, base32decode };
