# SpaceHQ

A secure, server-side authenticated dashboard — the clean starting point for
SpaceHQ.ca. It reuses the exact framework, security model, UI, and storage
layers from the previous marketing platform, **with no business modules**. You
add those one at a time.

## What's included

**Framework** — Node.js + [Express](https://expressjs.com/) (CommonJS). The
dashboard HTML is served only to a valid, logged-in session; unauthenticated
requests are redirected to the login page.

**Security**
- Password stored only as a **bcrypt** hash in `.env` (never plaintext, never in the front end)
- **HTTP-only, SameSite** session cookies (Secure in production, behind HTTPS)
- **Helmet** security headers, including a Content-Security-Policy
- **Login rate limiting** (10 attempts / 15 min / IP)
- **Session regeneration** on login (prevents fixation)
- Constant-time-ish credential check (always runs `bcrypt.compare`)
- Optional **two-factor authentication** (TOTP — Google Authenticator / Authy / 1Password), with encrypted secret and one-time recovery codes
- Append-only **audit log** of auth events and app actions

**Storage** — works with zero external services by default:
- `lib/blobStore.js` — one JSON document per key (small state), under `data/`
- `lib/db.js` — shared **SQLite** (`node:sqlite`) for large/relational data
- Sessions persist via `lib/sessionStore.js`, so a deploy/restart doesn't log everyone out
- Optional **MongoDB**: set `MONGODB_URI` and every store switches over transparently

**UI** — the same design system as before: sidebar + topbar layout, panels,
stats, tables, tags, forms, modals, toasts, an off-canvas mobile drawer, and a
session-expiry watchdog. The Modules area of the sidebar is empty and ready.

## Requirements

- **Node.js 22 or newer** (the SQLite layer uses `node:sqlite`, run via
  `--experimental-sqlite` — already set in the npm scripts).

## Setup

```bash
npm install

# Generate a password hash + secrets, then paste the printed lines into .env
cp .env.example .env
npm run hash "your-password"          # prints AUTH_PASS_HASH, SESSION_SECRET, DATA_ENC_KEY
#   ...edit .env: set AUTH_USER and paste the three printed values...

npm start                              # http://localhost:3000
```

Sign in at `/`. On first run you'll be redirected to `/login`.

## Enabling two-factor authentication

2FA is off until you turn it on. The management endpoints already exist
(`/api/2fa/status`, `/setup`, `/enable`, `/disable`, `/recovery`) — wire them
into a Settings module UI when you build one. Break-glass: set `DISABLE_2FA=1`
in `.env` and restart to sign in and reset it if you're ever locked out.

## Project layout

```
server.js            Auth + security shell. Mount your module routes where marked.
scripts/
  hash-password.js   Generate bcrypt hash + secrets.
lib/
  auditLog.js        Append-only audit log (file or Mongo).
  blobStore.js       JSON document store (file or Mongo).
  db.js              Shared SQLite connection for relational modules.
  mongo.js           Optional MongoDB connection (used when MONGODB_URI is set).
  sessionStore.js    Durable session store (survives restarts/deploys).
  cryptoStore.js     AES-256-GCM encrypt/decrypt helpers.
  twofa.js, totp.js  Two-factor authentication.
routes/
  twofa.js, logs.js  Security infrastructure routes (kept). See routes/README.md.
public/
  login.html         Login + 2FA page.
protected/
  dashboard.html     The authenticated app shell (empty of modules).
```

## Adding a module

A module is four small pieces. To add a "Widgets" module:

1. **Nav item** — in `protected/dashboard.html`, inside the sidebar Modules area:

   ```html
   <div class="nav-item" data-view="widgets" onclick="go(this)">
     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/></svg>
     Widgets
   </div>
   ```

2. **View** — in the `.content` area of the same file:

   ```html
   <section class="view" id="view-widgets">
     <div class="panel">
       <div class="panel-head"><h3>Widgets</h3></div>
       <div class="empty">Your widgets go here.</div>
     </div>
   </section>
   ```

   Optionally add a `META.widgets = { title, sub, action }` entry in the script
   so the topbar updates when the view opens.

3. **Route** — create `routes/widgets.js` (see `routes/README.md`) and mount it
   in `server.js`:

   ```js
   app.use('/api/widgets', requireAuth, require('./routes/widgets'));
   ```

4. **Storage (if needed)** — a `lib/widgetsStore.js` using `blobStore` (JSON) or
   `db` (SQLite), depending on scale.

Every module's front-end `fetch()` calls automatically get the session-expiry
watchdog, so a background save can never fail silently.

## Deploying

Run behind nginx/Caddy with HTTPS (the app sets `trust proxy` and Secure cookies
in production). Set `NODE_ENV=production`. Keep `data/` and `.env` off version
control (already in `.gitignore`), and back up `data/`.
