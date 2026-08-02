#!/usr/bin/env node
/**
 * Generate a bcrypt hash for a password, plus a random session secret and a
 * data-encryption key. Copy the printed values into your .env file.
 *
 * Usage:
 *   npm run hash "your-new-password"
 *   node scripts/hash-password.js "your-new-password"
 *
 * Never commit .env.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node scripts/hash-password.js "your-password"');
  process.exit(1);
}

const rounds = 12;
const hash = bcrypt.hashSync(pw, rounds);
const secret = crypto.randomBytes(48).toString('hex');
const encKey = crypto.randomBytes(32).toString('hex');

console.log('\nAdd these to your .env file:\n');
console.log('AUTH_PASS_HASH=' + hash);
console.log('SESSION_SECRET=' + secret);
console.log('DATA_ENC_KEY=' + encKey);
console.log('\n(Generate a fresh SESSION_SECRET only if you want to invalidate existing sessions.)');
console.log('(Keep DATA_ENC_KEY stable — changing it makes previously encrypted data, e.g. your 2FA secret, unreadable.)\n');
