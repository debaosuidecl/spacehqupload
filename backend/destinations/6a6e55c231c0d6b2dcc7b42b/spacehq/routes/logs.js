/**
 * /api/logs — admin audit log (session-authenticated, mounted behind the guard).
 *   GET  /api/logs?limit=500   → recent log entries (newest first)
 *   POST /api/logs/event       → record an app action from the front end
 */
const express = require('express');
const audit = require('../lib/auditLog');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ logs: audit.recent(req.query.limit || 500) });
});

router.post('/event', express.json(), (req, res) => {
  const { action, area, detail } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action is required' });
  audit.log({
    user: (req.session && req.session.user) || 'admin',
    area: String(area || 'App').slice(0, 60),
    action: String(action).slice(0, 200),
    detail: String(detail || '').slice(0, 500),
    source: 'app',
    ip: req.ip,
  });
  res.json({ ok: true });
});

module.exports = router;
