/**
 * /api/2fa/* — two-factor (TOTP) management for the admin (session-authenticated).
 *   GET  /status     { enabled, recoveryLeft }
 *   POST /setup       begin setup → { secret, otpauth, qr, recovery }
 *   POST /enable      { token } confirm a code to turn 2FA on
 *   POST /disable     { token } turn 2FA off (code or recovery code)
 *   POST /recovery    { token } regenerate recovery codes
 */
const express = require('express');
const twofa = require('../lib/twofa');
const audit = require('../lib/auditLog');

const router = express.Router();
router.use(express.json());
const user = (req) => (req.session && req.session.user) || 'admin';

router.get('/status', (req, res) => res.json(twofa.status()));

router.post('/setup', async (req, res) => {
  const d = twofa.startSetup(user(req));
  let qr = null;
  try { const QR = require('qrcode'); qr = await QR.toDataURL(d.otpauth, { margin: 1, width: 220 }); } catch (_) { /* qrcode optional — UI falls back to the secret key */ }
  res.json({ secret: d.secret, otpauth: d.otpauth, recovery: d.recovery, qr });
});

router.post('/enable', (req, res) => {
  const r = twofa.enable((req.body && req.body.token) || '');
  if (r.ok) audit.log({ user: user(req), area: 'Auth', action: 'Enabled 2FA' });
  res.status(r.ok ? 200 : 400).json(r);
});

router.post('/disable', (req, res) => {
  const r = twofa.disable((req.body && req.body.token) || '');
  if (r.ok) audit.log({ user: user(req), area: 'Auth', action: 'Disabled 2FA' });
  res.status(r.ok ? 200 : 400).json(r);
});

router.post('/recovery', (req, res) => {
  const r = twofa.regenerateRecovery((req.body && req.body.token) || '');
  if (r.ok) audit.log({ user: user(req), area: 'Auth', action: 'Regenerated 2FA recovery codes' });
  res.status(r.ok ? 200 : 400).json(r);
});

module.exports = router;
