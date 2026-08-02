/**
 * Encryption helpers (AES-256-GCM) used across the platform to protect secrets
 * at rest — e.g. the 2FA TOTP secret, and any credentials your future modules
 * choose to store. The 32-byte key comes from DATA_ENC_KEY (64 hex chars) in
 * .env.
 *
 *   encrypt(plaintext) -> { iv, tag, data }   (all base64)
 *   decrypt({ iv, tag, data }) -> plaintext
 *
 * If you change DATA_ENC_KEY, anything previously encrypted can no longer be
 * decrypted, so keep it stable (and secret).
 */
const crypto = require('crypto');

function getKey() {
  const hex = process.env.DATA_ENC_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'DATA_ENC_KEY must be 64 hex characters (32 bytes). Generate one with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64') };
}

function decrypt(blob) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(blob.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  return decipher.update(Buffer.from(blob.data, 'base64'), undefined, 'utf8') + decipher.final('utf8');
}

module.exports = { getKey, encrypt, decrypt };
