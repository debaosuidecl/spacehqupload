/**
 * SpaceHQ — secure server
 * --------------------------------------------------
 * Server-side authentication. The dashboard HTML is NEVER sent to the
 * browser unless the request carries a valid, logged-in session cookie.
 *
 * Security features (carried over from the shea.biz platform):
 *   - Password stored only as a bcrypt hash in .env (never plaintext, never in front end)
 *   - HTTP-only, SameSite session cookies (set Secure=true behind HTTPS)
 *   - Login brute-force rate limiting
 *   - Helmet security headers (incl. a Content-Security-Policy)
 *   - Constant-time-ish credential check (always runs bcrypt.compare)
 *   - Session regeneration on login to prevent fixation
 *   - Optional TOTP two-factor authentication
 *
 * This is a MODULE-FREE skeleton: the auth shell, security, and storage layers
 * are here and working, but no business modules are mounted. Add your own
 * modules where marked "ADD YOUR MODULE ROUTES HERE" below (and their UI in
 * protected/dashboard.html).
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const audit = require('./lib/auditLog');
const twofa = require('./lib/twofa');

const app = express();

// ---- Config (from environment) ----
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

const AUTH_USER = (process.env.AUTH_USER || '').toLowerCase();
const AUTH_PASS_HASH = process.env.AUTH_PASS_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

if (!AUTH_USER || !AUTH_PASS_HASH || !SESSION_SECRET) {
  console.error(
    '\n[FATAL] Missing required environment variables.\n' +
    'Set AUTH_USER, AUTH_PASS_HASH and SESSION_SECRET in your .env file.\n' +
    'Generate a password hash with:  npm run hash "your-password"\n'
  );
  process.exit(1);
}

// Behind a reverse proxy (nginx/Caddy) so Secure cookies + client IPs work.
app.set('trust proxy', 1);

// Real client IP, accounting for Cloudflare (CF-Connecting-IP) and nginx headers.
// Used for audit logging of logins so the Logs show the actual visitor's IP.
function clientIp(req) {
  return (req.headers['cf-connecting-ip']
    || req.headers['x-real-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip
    || '').replace(/^::ffff:/, '');
}
app.locals.clientIp = clientIp;

// ---- Security headers ----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // The dashboard uses small inline <style>/<script> blocks and inline SVG.
        scriptSrc: ["'self'", "'unsafe-inline'"],
        // The UI wires navigation with inline onclick/oninput/onchange handlers.
        // Helmet defaults script-src-attr to 'none', which blocks them (so the
        // menu can't switch views). Allow inline event handlers:
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        styleSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ---- Sessions (HTTP-only cookie) ----
// Sessions are persisted via blobStore (file or MongoDB) so they survive server
// restarts and deploys — no being logged out every time you push updates.
const BlobSessionStore = require('./lib/sessionStore');
app.use(
  session({
    name: 'spacehq.sid',
    store: new BlobSessionStore(),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // refresh expiry on activity
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD, // requires HTTPS in production
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// ---- Auth guard ----
// Use this on every module route you add so it stays behind the login.
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  // A browser navigating to a page should land on the login screen. But an API
  // caller must get a machine-readable answer: redirecting a fetch() to /login
  // makes it either parse an HTML page as JSON, or bounce between /login and the
  // catch-all until it throws. A 401 + a marker header lets the dashboard say
  // "your session expired" plainly instead of failing silently.
  const url = req.originalUrl || req.url || '';
  const wantsJson = url.startsWith('/api/') || req.xhr || (req.get('accept') || '').includes('application/json');
  if (wantsJson) {
    res.set('X-Auth-Required', '1');
    return res.status(401).json({ error: 'Your session has expired — please sign in again.', code: 'AUTH' });
  }
  return res.redirect('/login');
}
app.locals.requireAuth = requireAuth;

// ---- Rate limiter for the login endpoint ----
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ---- Static assets for the login page (CSS/images live in /public) ----
app.use('/public', express.static(path.join(__dirname, 'public')));

// ================= AUTH ROUTES =================

// Login page (public)
app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login handler
app.post('/login', loginLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  // Always run bcrypt.compare to avoid leaking whether the username exists.
  const userOk = username === AUTH_USER;
  let passOk = false;
  try {
    passOk = await bcrypt.compare(password, AUTH_PASS_HASH);
  } catch (_) {
    passOk = false;
  }

  if (userOk && passOk) {
    const need2fa = twofa.status().enabled && !process.env.DISABLE_2FA;
    // Prevent session fixation: issue a fresh session on login.
    req.session.regenerate((err) => {
      if (err) return res.redirect('/login?error=1');
      if (need2fa) {
        // Password OK but not authenticated yet — hold a "pending" state and ask
        // for the 2FA code. This session grants NO access until /login/2fa passes.
        req.session.pending2fa = true;
        req.session.pendingUser = username;
        return req.session.save(() => res.redirect('/login?twofa=1'));
      }
      req.session.authenticated = true;
      req.session.user = username;
      audit.log({ user: username, area: 'Auth', action: 'Login', detail: 'success', ip: clientIp(req) });
      req.session.save(() => res.redirect('/'));
    });
  } else {
    audit.log({ user: username || 'unknown', area: 'Auth', action: 'Login failed', detail: (userOk ? 'wrong password' : 'unknown username') + ' — ' + (req.get('user-agent') || '').slice(0, 80), ip: clientIp(req) });
    return res.redirect('/login?error=1');
  }
});

// Second factor step — only reachable when a password has just been accepted.
app.post('/login/2fa', loginLimiter, express.urlencoded({ extended: false }), (req, res) => {
  if (!(req.session && req.session.pending2fa)) return res.redirect('/login');
  const token = String((req.body && req.body.token) || '').trim();
  const username = req.session.pendingUser;
  if (twofa.verifyLogin(token)) {
    req.session.regenerate((err) => {
      if (err) return res.redirect('/login?twofa=1&error=1');
      req.session.authenticated = true;
      req.session.user = username;
      audit.log({ user: username, area: 'Auth', action: 'Login', detail: '2FA verified', ip: clientIp(req) });
      req.session.save(() => res.redirect('/'));
    });
  } else {
    audit.log({ user: username || 'unknown', area: 'Auth', action: 'Login failed', detail: '2FA code rejected', ip: clientIp(req) });
    res.redirect('/login?twofa=1&error=1');
  }
});

// Logout
app.get('/logout', (req, res) => {
  const user = (req.session && req.session.user) || 'unknown';
  audit.log({ user, area: 'Auth', action: 'Logout', ip: clientIp(req) });
  req.session.destroy(() => {
    res.clearCookie('spacehq.sid');
    res.redirect('/login');
  });
});

// ================= SECURITY INFRASTRUCTURE ROUTES =================
// These are part of the security layer (not business modules), so they stay.
// They're reachable once you build a Settings/Logs UI that calls them.

// Two-factor (TOTP) management: GET /api/2fa/status, POST /api/2fa/{setup,enable,disable,recovery}
app.use('/api/2fa', requireAuth, require('./routes/twofa'));

// Audit log: GET /api/logs?limit=500, POST /api/logs/event
app.use('/api/logs', requireAuth, require('./routes/logs'));

// ================= ADD YOUR MODULE ROUTES HERE =================
// Build each module as routes/<name>.js exporting an express.Router(), then
// mount it behind the auth guard, e.g.:
//
//   app.use('/api/widgets', requireAuth, require('./routes/widgets'));
//
// (Public, no-login endpoints — e.g. an intake form clients fill in — should be
//  mounted ABOVE this block, before the auth-guarded routes and the catch-all.)
// ==============================================================

// ---- Protected dashboard (served only to a valid session) ----
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'protected', 'dashboard.html'));
});

// Who's logged in (used by the dashboard to show the username).
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// Health check (public).
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Anything else -> send to login (keeps protected files unreachable).
app.use((req, res) => res.redirect('/login'));

// ---- Startup ----
// When MONGODB_URI is set, connect to Mongo and hydrate the blob-store cache so
// the synchronous stores serve reads instantly. Without it, this is a no-op and
// storage uses the local file/SQLite backend.
async function start() {
  const mongo = require('./lib/mongo');
  const blobStore = require('./lib/blobStore');
  try {
    if (mongo.enabled()) {
      await mongo.connect();
      await blobStore.init();
      console.log(`MongoDB connected (db: ${mongo.dbName()})`);
    } else {
      await blobStore.init();
    }
  } catch (e) {
    console.error('Startup storage init failed:', e && e.message);
    if (mongo.enabled()) { console.error('Refusing to start with an unreachable MongoDB. Check MONGODB_URI.'); process.exit(1); }
  }
  const server = app.listen(PORT, () => {
    console.log(`SpaceHQ running on http://localhost:${PORT}  (env: ${NODE_ENV}, storage: ${mongo.enabled() ? 'MongoDB' : 'file/SQLite'})`);
  });
  // Allow very large uploads (future bulk-import modules) past Node's default
  // 5-minute request timeout.
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.setTimeout(0);
}
start();
