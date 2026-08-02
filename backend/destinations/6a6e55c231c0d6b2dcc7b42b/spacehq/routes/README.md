# routes/

Each module you build is one file here that exports an `express.Router()`.

Two routes ship with the skeleton (they're security infrastructure, not modules):

- `twofa.js` — `/api/2fa/*` two-factor (TOTP) management
- `logs.js` — `/api/logs` audit log

## Adding a module route

1. Create `routes/widgets.js`:

   ```js
   const express = require('express');
   const router = express.Router();
   router.use(express.json());

   router.get('/', (req, res) => res.json({ widgets: [] }));
   router.post('/', (req, res) => { /* ...create... */ res.json({ ok: true }); });

   module.exports = router;
   ```

2. Mount it in `server.js` behind the auth guard, in the
   "ADD YOUR MODULE ROUTES HERE" block:

   ```js
   app.use('/api/widgets', requireAuth, require('./routes/widgets'));
   ```

Public (no-login) endpoints — e.g. a form a client fills in — must be mounted
**above** the auth-guarded routes and the catch-all redirect in `server.js`.
