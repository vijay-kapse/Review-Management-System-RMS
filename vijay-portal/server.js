const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const Database = require('better-sqlite3');

const app = express();
const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3005);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || process.env.EXTERNAL_BASE || '';
const PUBLIC_PATH_PREFIX = normalizePathPrefix(process.env.PUBLIC_PATH_PREFIX || '');
const IS_VERCEL = process.env.VERCEL === '1';
const SESSION_COOKIE = 'vijay_portal_session';
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const DEFAULT_APP_EMAIL = process.env.DEFAULT_APP_EMAIL || 'vkapse@binghamton.edu';
const DEFAULT_APP_NAME = process.env.DEFAULT_APP_NAME || 'Vijay';
const ARGUS_TARGET = process.env.ARGUS_TARGET || 'http://127.0.0.1:3011';
const CHATBOT_TARGET = process.env.CHATBOT_TARGET || 'http://127.0.0.1:3010';
const SURVEY_TARGET = process.env.SURVEY_TARGET || 'http://127.0.0.1:8201';
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:8100';
const SYSREVIEW_TARGET = process.env.SYSREVIEW_TARGET || 'http://127.0.0.1:3013';
const SURVEY_STATIC_DIR = process.env.SURVEY_STATIC_DIR || '/home/vkapse/unified-apps/survey/survey_group8/static';
const SERVERLESS_FS_HINTS = ['/var/task', '/opt/rust'];
const RUN_DIR = `${process.cwd()} ${__dirname}`;
const IS_SERVERLESS_FS = IS_VERCEL
  || Boolean(process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT)
  || SERVERLESS_FS_HINTS.some((hint) => RUN_DIR.includes(hint));
const DEFAULT_DATA_DIR = IS_SERVERLESS_FS ? '/tmp/rms-portal-data' : path.join(__dirname, 'data');
const DATA_DIR = process.env.PORTAL_DATA_DIR || DEFAULT_DATA_DIR;
const DB_PATH = process.env.PORTAL_DB_PATH || path.join(DATA_DIR, 'portal_auth.db');
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : (IS_VERCEL || PUBLIC_BASE_URL.startsWith('https://'));
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: COOKIE_SECURE,
  path: '/',
  maxAge: SESSION_TTL_MS,
};

app.use(cookieParser());
app.set('trust proxy', true);
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));

function normalizePathPrefix(prefix) {
  const raw = String(prefix || '').trim();
  if (!raw || raw === '/') return '';
  const normalized = `/${raw.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '' : normalized;
}

function stripPublicPrefix(value) {
  const pathValue = String(value || '/');
  if (!PUBLIC_PATH_PREFIX) return pathValue || '/';
  if (pathValue === PUBLIC_PATH_PREFIX) return '/';
  if (pathValue.startsWith(`${PUBLIC_PATH_PREFIX}/`)) {
    return pathValue.slice(PUBLIC_PATH_PREFIX.length) || '/';
  }
  return pathValue || '/';
}

function publicPath(value = '/') {
  const pathValue = String(value || '/');
  if (!PUBLIC_PATH_PREFIX) return pathValue;
  if (!pathValue.startsWith('/')) return pathValue;
  if (pathValue === PUBLIC_PATH_PREFIX || pathValue.startsWith(`${PUBLIC_PATH_PREFIX}/`)) return pathValue;
  if (pathValue === '/') return `${PUBLIC_PATH_PREFIX}/`;
  return `${PUBLIC_PATH_PREFIX}${pathValue}`;
}

function publicRedirectTarget(target) {
  const value = String(target || '/');
  if (!PUBLIC_PATH_PREFIX) return value;
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  return publicPath(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldRewriteTextResponse(proxyRes) {
  const contentType = String(proxyRes.headers?.['content-type'] || '').toLowerCase();
  return [
    'text/html',
    'text/css',
    'application/javascript',
    'text/javascript',
    'application/json',
  ].some((type) => contentType.includes(type));
}

function rewriteMountPathForPublicPrefix(responseBuffer, proxyRes, mountPath, extraMountPaths = []) {
  const contentType = String(proxyRes.headers?.['content-type'] || '').toLowerCase();
  if (!PUBLIC_PATH_PREFIX || !shouldRewriteTextResponse(proxyRes)) {
    return responseBuffer;
  }

  const publicMountPath = publicPath(mountPath);
  if (publicMountPath === mountPath) return responseBuffer;

  const originalBody = responseBuffer.toString('utf8');
  let rewrittenBody = originalBody;

  [mountPath, ...extraMountPaths].forEach((pathToRewrite) => {
    const publicPathToRewrite = publicPath(pathToRewrite);
    if (publicPathToRewrite === pathToRewrite) return;
    const sourcePattern = new RegExp(`(?<!${escapeRegExp(PUBLIC_PATH_PREFIX)})${escapeRegExp(pathToRewrite)}(?=\\b|/)`, 'g');
    rewrittenBody = rewrittenBody.replace(sourcePattern, publicPathToRewrite);
  });

  if (mountPath === '/sysreview' && contentType.includes('javascript')) {
    const mountName = mountPath.replace(/^\/+/, '');
    const publicMountName = publicMountPath.replace(/^\/+/, '');
    const sysreviewBasePattern = new RegExp(`(const\\s+[A-Za-z_$][\\w$]*=)"${escapeRegExp(mountName)}"(,[A-Za-z_$][\\w$]*="argus")`);
    rewrittenBody = rewrittenBody.replace(sysreviewBasePattern, `$1"${publicMountName}"$2`);
  }

  return rewrittenBody === originalBody ? responseBuffer : rewrittenBody;
}

function publicProxyRedirectTarget(location, mountPath, upstreamTarget) {
  const value = String(location || '');
  if (!value) return value;

  let pathValue = value;
  if (!value.startsWith('/')) {
    try {
      const redirectUrl = new URL(value);
      const upstreamUrl = new URL(upstreamTarget);
      const localhostNames = new Set(['127.0.0.1', 'localhost']);
      const sameOrigin = redirectUrl.origin === upstreamUrl.origin
        || (
          localhostNames.has(redirectUrl.hostname)
          && localhostNames.has(upstreamUrl.hostname)
          && redirectUrl.protocol === upstreamUrl.protocol
          && redirectUrl.port === upstreamUrl.port
        );
      if (!sameOrigin) return value;
      pathValue = `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
    } catch (_error) {
      return value;
    }
  }

  const duplicateMountPrefix = `${mountPath}${mountPath}/`;
  while (pathValue.startsWith(duplicateMountPrefix)) {
    pathValue = `${mountPath}/${pathValue.slice(duplicateMountPrefix.length)}`;
  }

  if (!pathValue.startsWith(mountPath)) {
    pathValue = `${mountPath}${pathValue.startsWith('/') ? '' : '/'}${pathValue}`;
  }

  return publicRedirectTarget(pathValue);
}

function applyProxyRedirect(proxyRes, mountPath, upstreamTarget) {
  const location = proxyRes.headers?.location;
  if (location) {
    proxyRes.headers.location = publicProxyRedirectTarget(location, mountPath, upstreamTarget);
  }
}

function createPublicPrefixResponseHandler(mountPath, upstreamTarget, extraMountPaths = []) {
  if (!PUBLIC_PATH_PREFIX) {
    return (proxyRes) => applyProxyRedirect(proxyRes, mountPath, upstreamTarget);
  }

  return (proxyRes, _req, res) => {
    applyProxyRedirect(proxyRes, mountPath, upstreamTarget);

    const chunks = [];
    proxyRes.on('data', (chunk) => chunks.push(chunk));
    proxyRes.on('end', () => {
      const responseBuffer = Buffer.concat(chunks);
      const rewrittenResponse = rewriteMountPathForPublicPrefix(responseBuffer, proxyRes, mountPath, extraMountPaths);
      const outputBuffer = Buffer.isBuffer(rewrittenResponse)
        ? rewrittenResponse
        : Buffer.from(String(rewrittenResponse), 'utf8');

      Object.entries(proxyRes.headers || {}).forEach(([name, value]) => {
        const lowerName = name.toLowerCase();
        if (lowerName === 'content-length' || lowerName === 'transfer-encoding') return;
        res.setHeader(name, value);
      });

      res.statusCode = proxyRes.statusCode || 200;
      res.setHeader('content-length', String(outputBuffer.length));
      res.end(outputBuffer);
    });
    proxyRes.on('error', () => {
      if (!res.headersSent) {
        res.status(502).send('Proxy response error');
      } else {
        res.end();
      }
    });
  };
}

app.use((req, res, next) => {
  if (PUBLIC_PATH_PREFIX && (req.url === PUBLIC_PATH_PREFIX || req.url.startsWith(`${PUBLIC_PATH_PREFIX}/`))) {
    req.url = req.url.slice(PUBLIC_PATH_PREFIX.length) || '/';
  }

  const redirect = res.redirect.bind(res);
  res.redirect = (statusOrUrl, maybeUrl) => {
    if (typeof statusOrUrl === 'number') {
      return redirect(statusOrUrl, publicRedirectTarget(maybeUrl));
    }
    return redirect(publicRedirectTarget(statusOrUrl));
  };

  next();
});

app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '1d' }));
app.get('/favicon.ico', (_req, res) => {
  res.redirect(publicPath('/assets/logos/rms-favicon.svg'));
});

function ensureDbDirectory(dbPath) {
  if (!dbPath || dbPath === ':memory:') return;
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
}

let db;
try {
  ensureDbDirectory(DB_PATH);
  db = new Database(DB_PATH);
} catch (error) {
  console.warn(`[rms-portal] Failed to open DB at ${DB_PATH}. Falling back to in-memory DB.`, error);
  db = new Database(':memory:');
}
if (IS_SERVERLESS_FS) {
  console.info(`[rms-portal] Serverless filesystem detected. Using DB path: ${DB_PATH}`);
}
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS portal_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    google_sub TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS portal_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_portal_sessions_user_id ON portal_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires_at ON portal_sessions(expires_at);
`);

const findUserByEmailStmt = db.prepare(`
  SELECT *
  FROM portal_users
  WHERE email = ?
`);

const findUserByGoogleSubStmt = db.prepare(`
  SELECT *
  FROM portal_users
  WHERE google_sub = ?
`);

const insertUserStmt = db.prepare(`
  INSERT INTO portal_users (
    email,
    display_name,
    password_hash,
    password_salt,
    google_sub,
    created_at,
    updated_at,
    last_login_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const updatePasswordUserStmt = db.prepare(`
  UPDATE portal_users
  SET display_name = ?, password_hash = ?, password_salt = ?, updated_at = ?, last_login_at = ?
  WHERE id = ?
`);

const updateGoogleUserStmt = db.prepare(`
  UPDATE portal_users
  SET display_name = ?, google_sub = ?, updated_at = ?, last_login_at = ?
  WHERE id = ?
`);

const touchUserLoginStmt = db.prepare(`
  UPDATE portal_users
  SET display_name = ?, updated_at = ?, last_login_at = ?
  WHERE id = ?
`);

const insertSessionStmt = db.prepare(`
  INSERT INTO portal_sessions (
    user_id,
    token_hash,
    created_at,
    expires_at,
    last_seen_at,
    user_agent,
    ip_address
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const findSessionByTokenStmt = db.prepare(`
  SELECT
    portal_sessions.id AS session_id,
    portal_sessions.user_id,
    portal_sessions.created_at AS session_created_at,
    portal_sessions.expires_at,
    portal_users.email,
    portal_users.display_name,
    portal_users.google_sub,
    portal_users.last_login_at
  FROM portal_sessions
  JOIN portal_users ON portal_users.id = portal_sessions.user_id
  WHERE portal_sessions.token_hash = ?
    AND portal_sessions.expires_at > ?
`);

const updateSessionSeenStmt = db.prepare(`
  UPDATE portal_sessions
  SET last_seen_at = ?
  WHERE id = ?
`);

const deleteSessionByTokenStmt = db.prepare(`
  DELETE FROM portal_sessions
  WHERE token_hash = ?
`);

const deleteExpiredSessionsStmt = db.prepare(`
  DELETE FROM portal_sessions
  WHERE expires_at <= ?
`);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function defaultDisplayName(email = '') {
  return email.split('@')[0] || DEFAULT_APP_NAME;
}

function sanitizeDisplayName(value = '', email = '') {
  const trimmed = String(value || '').trim();
  return (trimmed || defaultDisplayName(email)).slice(0, 120);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return '';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString('hex'),
  };
}

function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(derived, expected);
}

function getSessionToken(req) {
  const raw = req.cookies?.[SESSION_COOKIE];
  return typeof raw === 'string' && raw ? raw : '';
}

function parseSession(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  const currentTime = nowIso();
  deleteExpiredSessionsStmt.run(currentTime);
  const row = findSessionByTokenStmt.get(hashToken(token), currentTime);
  if (!row) return null;
  updateSessionSeenStmt.run(currentTime, row.session_id);
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    email: row.email,
    name: row.display_name || defaultDisplayName(row.email),
    googleSub: row.google_sub || '',
    createdAt: row.session_created_at,
    expiresAt: row.expires_at,
    lastLoginAt: row.last_login_at,
  };
}

function writeSession(req, res, user) {
  const existingToken = getSessionToken(req);
  if (existingToken) {
    deleteSessionByTokenStmt.run(hashToken(existingToken));
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const currentTime = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  insertSessionStmt.run(
    user.id,
    hashToken(token),
    currentTime,
    expiresAt,
    currentTime,
    String(req.get('user-agent') || '').slice(0, 255),
    String(req.ip || '').slice(0, 120)
  );

  res.cookie(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

function clearSession(req, res) {
  const token = getSessionToken(req);
  if (token) {
    deleteSessionByTokenStmt.run(hashToken(token));
  }
  res.clearCookie(SESSION_COOKIE, { path: '/', sameSite: 'lax', secure: SESSION_COOKIE_OPTIONS.secure });
  res.clearCookie('token', { path: '/', sameSite: 'lax', secure: SESSION_COOKIE_OPTIONS.secure });
}

async function ensureSysreviewToken(req, res) {
  const identity = getPortalIdentity(req);
  if (!identity?.email || req.cookies?.token) {
    return;
  }

  const params = new URLSearchParams({
    email: identity.email,
    firstName: identity.firstName || identity.name || DEFAULT_APP_NAME,
    lastName: identity.lastName || 'User',
    username: identity.email.split('@')[0],
  });

  const response = await fetch(`${SYSREVIEW_TARGET}/sysreview/api/v1/auth/shared-login?${params.toString()}`, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Sysreview shared login failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.authToken) {
    throw new Error('Sysreview shared login did not return an auth token.');
  }

  res.cookie('token', payload.authToken, {
    sameSite: 'lax',
    secure: SESSION_COOKIE_OPTIONS.secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

function createPasswordUser({ email, displayName, password }) {
  const normalizedEmail = normalizeEmail(email);
  const name = sanitizeDisplayName(displayName, normalizedEmail);
  const timestamp = nowIso();
  const { salt, hash } = buildPasswordHash(password);
  insertUserStmt.run(normalizedEmail, name, hash, salt, null, timestamp, timestamp, timestamp);
  return findUserByEmailStmt.get(normalizedEmail);
}

function upsertGoogleUser(profile) {
  const normalizedEmail = normalizeEmail(profile.email);
  const displayName = sanitizeDisplayName(profile.name, normalizedEmail);
  const timestamp = nowIso();

  let user = findUserByGoogleSubStmt.get(profile.googleSub);
  if (user) {
    updateGoogleUserStmt.run(displayName, profile.googleSub, timestamp, timestamp, user.id);
    return findUserByEmailStmt.get(normalizedEmail) || findUserByGoogleSubStmt.get(profile.googleSub);
  }

  user = findUserByEmailStmt.get(normalizedEmail);
  if (user) {
    updateGoogleUserStmt.run(displayName, profile.googleSub, timestamp, timestamp, user.id);
    return findUserByEmailStmt.get(normalizedEmail);
  }

  insertUserStmt.run(normalizedEmail, displayName, null, null, profile.googleSub, timestamp, timestamp, timestamp);
  return findUserByEmailStmt.get(normalizedEmail);
}

async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google login is not configured on this server yet.');
  }
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) {
    throw new Error('Google token verification failed.');
  }
  const payload = await response.json();
  if (!payload?.email || payload.email_verified !== 'true') {
    throw new Error('Google account email is missing or unverified.');
  }
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
    throw new Error('Unexpected Google token issuer.');
  }
  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google client ID mismatch.');
  }
  return {
    email: payload.email,
    name: payload.name || payload.given_name || payload.email.split('@')[0],
    googleSub: payload.sub,
    picture: payload.picture || '',
  };
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function createPortalJwt(session) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    email: session.email,
    username: session.email.split('@')[0],
    firstName: session.name || session.email.split('@')[0],
    lastName: '',
    userId: session.email,
    exp: nowSeconds + 7 * 24 * 60 * 60,
    iat: nowSeconds,
  };
  return `${base64urlJson({ alg: 'none', typ: 'JWT' })}.${base64urlJson(payload)}.portal`;
}

function requireLogin(req, res, next) {
  const session = parseSession(req);
  if (!session?.email) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  req.portalSession = session;
  next();
}

function getAppIdentity(req) {
  const session = parseSession(req);
  const email = String(req.query.email || session?.email || DEFAULT_APP_EMAIL).trim();
  const name = String(req.query.name || session?.name || DEFAULT_APP_NAME).trim();
  return {
    email,
    name,
    username: email.split('@')[0] || 'user',
  };
}

function getPortalIdentity(req) {
  const session = req.portalSession || parseSession(req);
  if (!session?.email) {
    return null;
  }
  const email = String(session.email).trim();
  const fullName = String(session.name || '').trim();
  const name = fullName || email.split('@')[0] || DEFAULT_APP_NAME;
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || name;
  const lastName = parts.slice(1).join(' ');
  return {
    email,
    name,
    username: email.split('@')[0] || 'user',
    firstName,
    lastName,
  };
}

function renderArgusBootstrap(res, identity) {
  const argusUser = {
    email: identity.email,
    username: identity.username,
    first_name: identity.name || identity.username,
    last_name: '',
    id: identity.email,
  };
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Launching ARGUS</title>
</head>
<body>
  <script>
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(argusUser))});
    fetch(${JSON.stringify(publicPath('/api/results/'))}, { credentials: 'include' })
      .catch(() => null)
      .finally(() => {
        window.location.replace(${JSON.stringify(publicPath('/argus/home'))});
      });
  </script>
</body>
</html>`);
}

const RMS_COMPONENTS = [
  {
    key: 'trace',
    name: 'TRACE',
    fullName: 'Tracking, Reporting, Analyzing, Curating, and Extracting data',
    logo: '/assets/logos/trace-logo.svg',
    route: '/launch/sysreview',
    directRoute: '/sysreview/',
    accent: 'blue',
    description: 'Design keyword queries, fetch literature, categorize articles, and track relevance across disciplines.',
  },
  {
    key: 'argus',
    name: 'ARGUS',
    fullName: 'Technology-assisted reading assistant',
    logo: '/assets/logos/argus-logo.svg',
    route: '/launch/argus',
    directRoute: '/argus/',
    accent: 'graphite',
    description: 'Read across large document sets quickly, compare findings, and extract key insights from research literature.',
  },
  {
    key: 'quest',
    name: 'QUEST',
    fullName: 'Querying Uploads for Educational and Scholarly Texts',
    logo: '/assets/logos/quest-logo.svg',
    route: '/launch/chatbot',
    directRoute: '/chatbot/',
    accent: 'teal',
    description: 'Upload scholarly texts and ask plain-English questions for contextual, research-informed responses.',
  },
  {
    key: 'spark',
    name: 'SPARK',
    fullName: 'Survey Platform for Academic Research and Knowledge',
    logo: '/assets/logos/spark-logo.svg',
    route: '/launch/survey',
    directRoute: '/survey/',
    accent: 'amber',
    description: 'Create academic surveys and summarize crisp, fact-based research information for systematic reviews.',
  },
];

const RMS_LOGO_PATH = '/assets/logos/rms-logo.svg';
const RMS_FAVICON_PATH = '/assets/logos/rms-favicon.svg';

function componentCards({ authenticated = false } = {}) {
  return RMS_COMPONENTS.map((component, index) => `
    <article class="app-card accent-${component.accent}" style="--stagger:${index}">
      <div class="app-card__top">
        <img class="app-logo" src="${publicPath(component.logo)}" alt="${component.name} logo" />
        <span class="app-status">${authenticated ? 'Ready' : 'Unified route'}</span>
      </div>
      <h2 class="sr-only">${component.name}</h2>
      <p class="app-full-name">${component.fullName}</p>
      <p>${component.description}</p>
      <div class="actions">
        <a class="btn btn-secondary" href="${publicPath(authenticated ? component.route : component.directRoute)}">
          ${authenticated ? `Launch ${component.name}` : `Open ${component.name}`}
        </a>
      </div>
    </article>
  `).join('');
}

function page(title, body, session) {
  const nav = session?.email
    ? `<div class="nav-links"><span class="session-chip">Signed in as <strong>${escapeHtml(session.email)}</strong></span><a class="nav-link" href="${publicPath('/logout')}">Logout</a></div>`
    : `<div class="nav-links"><a class="nav-link" href="${publicPath('/login')}">Login</a><a class="nav-cta" href="${publicPath('/signup')}">Sign up</a></div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="${publicPath(RMS_FAVICON_PATH)}" />
  <link rel="shortcut icon" href="${publicPath('/favicon.ico')}" />
  <style>
    :root {
      --ink: #111114;
      --muted: #5f6368;
      --soft: #f5f5f7;
      --panel: rgba(255,255,255,0.72);
      --panel-strong: rgba(255,255,255,0.88);
      --line: rgba(17,17,20,0.10);
      --blue: #0071e3;
      --shadow: 0 24px 70px rgba(20,24,34,0.10);
      --radius-xl: 34px;
      --radius-lg: 24px;
    }
    * { box-sizing: border-box; }
    html { min-height: 100%; background: #f5f5f7; }
    body {
      min-height: 100vh;
      margin: 0;
      font-family: "Avenir Next", "Helvetica Neue", Helvetica, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 8%, rgba(0,113,227,0.18), transparent 28%),
        radial-gradient(circle at 84% 16%, rgba(52,199,89,0.14), transparent 24%),
        radial-gradient(circle at 70% 86%, rgba(255,149,0,0.16), transparent 30%),
        linear-gradient(180deg, #fbfbfd 0%, #f2f2f4 52%, #ffffff 100%);
      overflow-x: hidden;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(rgba(255,255,255,0.26) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.24) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 68%);
    }
    .shell { position: relative; max-width: 1180px; margin: 0 auto; padding: 26px 22px 58px; }
    .topbar {
      position: sticky;
      top: 14px;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 54px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.64);
      border: 1px solid rgba(255,255,255,0.82);
      border-radius: 999px;
      box-shadow: 0 12px 38px rgba(0,0,0,0.07);
      backdrop-filter: blur(28px) saturate(1.35);
      -webkit-backdrop-filter: blur(28px) saturate(1.35);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding-left: 8px;
      font-size: 15px;
      font-weight: 760;
      letter-spacing: 0;
    }
    .brand-logo {
      display: block;
      width: clamp(156px, 22vw, 220px);
      height: auto;
    }
    .hero-logo {
      position: relative;
      display: block;
      width: min(360px, 82vw);
      height: auto;
      margin: 0 0 20px;
    }
    .nav-links { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .nav-link, .nav-cta {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 8px 14px;
      border-radius: 999px;
      color: var(--ink);
      text-decoration: none;
      font-size: 14px;
      font-weight: 680;
    }
    .nav-link:hover { background: rgba(0,0,0,0.05); }
    .nav-cta { background: #111114; color: #fff; box-shadow: 0 12px 24px rgba(0,0,0,0.16); }
    .session-chip { color: var(--muted); font-size: 13px; padding: 0 10px; }
    .hero {
      position: relative;
      overflow: hidden;
      padding: clamp(34px, 6vw, 74px);
      margin-bottom: 26px;
      border: 1px solid rgba(255,255,255,0.82);
      border-radius: var(--radius-xl);
      background: linear-gradient(145deg, rgba(255,255,255,0.88), rgba(255,255,255,0.56));
      box-shadow: var(--shadow);
      backdrop-filter: blur(26px) saturate(1.35);
      -webkit-backdrop-filter: blur(26px) saturate(1.35);
      animation: rise 560ms ease both;
    }
    .hero::after {
      content: "";
      position: absolute;
      width: 420px;
      height: 420px;
      right: -140px;
      top: -170px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0,113,227,0.18), transparent 62%);
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      padding: 8px 12px;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 999px;
      background: rgba(255,255,255,0.72);
      color: #4d5561;
      font-size: 12px;
      font-weight: 760;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .hero h1 {
      position: relative;
      max-width: 880px;
      margin: 0 0 18px;
      font-size: 74px;
      line-height: 1;
      letter-spacing: 0;
      font-weight: 800;
    }
    .hero p {
      position: relative;
      max-width: 800px;
      margin: 0;
      color: var(--muted);
      line-height: 1.58;
      font-size: 21px;
    }
    .hero .actions { position: relative; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
    .grid-auth { align-items: start; }
    .app-card, .card, form.card {
      position: relative;
      overflow: hidden;
      min-height: 260px;
      padding: 26px;
      border: 1px solid rgba(255,255,255,0.88);
      border-radius: var(--radius-lg);
      background: var(--panel);
      box-shadow: 0 18px 44px rgba(30,34,45,0.08);
      backdrop-filter: blur(24px) saturate(1.3);
      -webkit-backdrop-filter: blur(24px) saturate(1.3);
      animation: rise 560ms ease both;
      animation-delay: calc(var(--stagger, 0) * 70ms);
    }
    .app-card::after {
      content: "";
      position: absolute;
      inset: auto -36px -72px auto;
      width: 170px;
      height: 170px;
      border-radius: 50%;
      background: var(--accent-glow, rgba(0,113,227,0.12));
      filter: blur(2px);
    }
    .app-card__top {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
    }
    .app-logo {
      display: block;
      width: min(220px, 100%);
      height: 70px;
      object-fit: contain;
      object-position: left center;
    }
    .app-status {
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.72);
      color: #59606a;
      font-size: 12px;
      font-weight: 760;
    }
    .app-card h2, .card h2 { margin: 0 0 8px; font-size: 29px; letter-spacing: 0; }
    .app-card p, .card p { color: var(--muted); line-height: 1.5; margin: 0; }
    .app-full-name { min-height: 48px; color: #24272d !important; font-weight: 700; margin-bottom: 12px !important; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .accent-blue { --accent: #0071e3; --accent-glow: rgba(0,113,227,0.16); }
    .accent-graphite { --accent: #2f3540; --accent-glow: rgba(47,53,64,0.14); }
    .accent-teal { --accent: #00a6a6; --accent-glow: rgba(0,166,166,0.15); }
    .accent-amber { --accent: #ff9f0a; --accent-glow: rgba(255,159,10,0.18); }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 12px 18px;
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      text-decoration: none;
      font-size: 15px;
      font-weight: 760;
      letter-spacing: 0;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn-primary { background: #111114; color: #fff; box-shadow: 0 16px 34px rgba(0,0,0,0.18); }
    .btn-secondary { background: rgba(255,255,255,0.86); color: #111114; border: 1px solid rgba(0,0,0,0.10); }
    form.card { min-height: 0; max-width: none; background: var(--panel-strong); }
    label { display: block; margin: 18px 0 7px; color: #2b2f36; font-size: 13px; font-weight: 760; }
    input {
      width: 100%;
      padding: 15px 16px;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 16px;
      background: rgba(255,255,255,0.82);
      color: var(--ink);
      font: inherit;
      font-size: 15px;
      outline: none;
      transition: border 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }
    input:focus { border-color: rgba(0,113,227,0.72); box-shadow: 0 0 0 4px rgba(0,113,227,0.13); background: white; }
    .hint, .error {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 18px;
      line-height: 1.45;
      font-size: 14px;
    }
    .hint { background: rgba(0,113,227,0.08); color: #174ea6; border: 1px solid rgba(0,113,227,0.12); }
    .error { background: rgba(255,59,48,0.08); color: #b42318; border: 1px solid rgba(255,59,48,0.13); }
    code { background: rgba(0,0,0,0.06); padding: 2px 7px; border-radius: 8px; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin: -4px 0 26px;
    }
    .metric {
      padding: 18px;
      border-radius: 22px;
      background: rgba(255,255,255,0.58);
      border: 1px solid rgba(255,255,255,0.82);
      box-shadow: 0 12px 30px rgba(20,24,34,0.06);
    }
    .metric strong { display: block; font-size: 28px; letter-spacing: 0; }
    .metric span { color: var(--muted); font-size: 13px; font-weight: 700; }
    @keyframes rise {
      from { opacity: 0; transform: translateY(16px) scale(0.99); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (max-width: 720px) {
      .shell { padding: 16px 14px 34px; }
      .topbar { position: static; border-radius: 22px; align-items: flex-start; flex-direction: column; }
      .hero { padding: 32px 24px; border-radius: 28px; }
      .hero h1 { font-size: 42px; }
      .hero p { font-size: 17px; }
      .app-card, .card, form.card { min-height: auto; padding: 22px; }
      .session-chip { padding-left: 0; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <div class="brand"><img class="brand-logo" src="${publicPath(RMS_LOGO_PATH)}" alt="RMS - Review Management System" /></div>
      ${nav}
    </div>
    ${body}
  </div>
</body>
</html>`;
}

app.get(['/', '/index.html'], (req, res) => {
  const session = parseSession(req);
  const body = `
    <section class="hero">
      <img class="hero-logo" src="${publicPath(RMS_LOGO_PATH)}" alt="RMS - Review Management System" />
      <div class="eyebrow">RMS - Review Management System</div>
      <h1>A focused workspace for systematic review work.</h1>
      <p>RMS brings TRACE, ARGUS, QUEST, and SPARK into one calm, secure entry point for literature discovery, assisted reading, scholarly Q&A, and academic survey workflows.</p>
      <div class="actions">
        <a class="btn btn-primary" href="${publicPath(session?.email ? '/apps' : '/login')}">${session?.email ? 'Open RMS workspace' : 'Sign in to RMS'}</a>
        ${session?.email ? `<a class="btn btn-secondary" href="${publicPath('/logout')}">Logout</a>` : ''}
      </div>
    </section>
    <div class="metrics">
      <div class="metric"><strong>4</strong><span>Integrated components</span></div>
      <div class="metric"><strong>1</strong><span>Unified access point</span></div>
      <div class="metric"><strong>0</strong><span>Separate app login screens</span></div>
    </div>
    <div class="grid">
      ${componentCards({ authenticated: Boolean(session?.email) })}
    </div>`;
  res.send(page('Review Management System', body, session));
});

app.get(['/login', '/unified-login.html'], (req, res) => {
  const session = parseSession(req);
  const next = publicPath(stripPublicPrefix(req.query.next || '/apps'));
  const mode = req.query.mode === 'signup' ? 'signup' : 'login';
  if (session?.email) {
    return res.redirect(next);
  }
  const error = req.query.error ? `<div class="error">${escapeHtml(req.query.error)}</div>` : '';
  const message = req.query.message ? `<div class="hint">${escapeHtml(req.query.message)}</div>` : '';
  const googleSection = GOOGLE_CLIENT_ID
    ? `
      <div class="hint">
        <strong>Google login</strong><br />
        Use your Google account for the shared platform login, or keep using the email sign-in below.
      </div>
      <div id="g_id_onload"
        data-client_id="${escapeHtml(GOOGLE_CLIENT_ID)}"
        data-context="signin"
        data-ux_mode="popup"
        data-callback="handleGoogleCredential">
      </div>
      <div class="actions" style="margin-top:14px">
        <div class="g_id_signin" data-type="standard" data-shape="pill" data-theme="outline" data-text="signin_with" data-size="large"></div>
      </div>
      <script src="https://accounts.google.com/gsi/client" async defer></script>
      <script>
        async function handleGoogleCredential(response) {
          const formData = new URLSearchParams();
          formData.set('credential', response.credential);
          formData.set('next', ${JSON.stringify(next)});
          const loginResponse = await fetch(${JSON.stringify(publicPath('/auth/google'))}, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          });
          if (loginResponse.redirected) {
            window.location.href = loginResponse.url;
            return;
          }
          const result = await loginResponse.json().catch(() => ({ error: 'Google sign-in failed.' }));
          window.location.href = ${JSON.stringify(publicPath('/login'))} + '?error=' + encodeURIComponent(result.error || 'Google sign-in failed.') + '&next=' + encodeURIComponent(${JSON.stringify(next)});
        }
      </script>`
    : `
      <div class="hint">
        <strong>Google login ready</strong><br />
        Set <code>GOOGLE_CLIENT_ID</code> for the portal process to enable Google-based sign-in on this page.
      </div>`;
  const body = `
    <section class="hero">
      <img class="hero-logo" src="${publicPath(RMS_LOGO_PATH)}" alt="RMS - Review Management System" />
      <div class="eyebrow">Secure RMS access</div>
      <h1>${mode === 'signup' ? 'Create your RMS account.' : 'One login for the full RMS workspace.'}</h1>
      <p>Use one secure account for TRACE, ARGUS, QUEST, and SPARK. Passwords are hashed on the server, and RMS stores opaque session records instead of placing identity data in browser cookies.</p>
    </section>
    <div class="grid grid-auth">
      <form class="card" method="post" action="${publicPath('/login')}">
        <h2>Login</h2>
        <p>Continue into the Review Management System without separate app-level login screens.</p>
        ${googleSection}
        <input type="hidden" name="next" value="${escapeHtml(next)}" />
        <label for="login-email">Email</label>
        <input id="login-email" name="email" type="email" placeholder="researcher@example.edu" autocomplete="email" required />
        <label for="login-password">Password</label>
        <input id="login-password" name="password" type="password" placeholder="Your password" autocomplete="current-password" required />
        <div class="actions">
          <button class="btn btn-primary" type="submit">Login</button>
          <a class="btn btn-secondary" href="${publicPath('/')}">Back to home</a>
        </div>
      </form>
      <form class="card" method="post" action="${publicPath('/signup')}">
        <h2>Sign Up</h2>
        <p>Create a secure RMS account stored on this server.</p>
        <input type="hidden" name="next" value="${escapeHtml(next)}" />
        <label for="signup-name">Display name</label>
        <input id="signup-name" name="name" type="text" placeholder="Researcher" autocomplete="name" required />
        <label for="signup-email">Email</label>
        <input id="signup-email" name="email" type="email" placeholder="researcher@example.edu" autocomplete="email" required />
        <label for="signup-password">Password</label>
        <input id="signup-password" name="password" type="password" placeholder="At least 8 characters" autocomplete="new-password" required />
        <label for="signup-confirm-password">Confirm password</label>
        <input id="signup-confirm-password" name="confirmPassword" type="password" placeholder="Re-enter your password" autocomplete="new-password" required />
        <div class="actions">
          <button class="btn btn-primary" type="submit">Create account</button>
        </div>
        <div class="hint">Password rules: at least 8 characters, including at least one letter and one number.</div>
      </form>
    </div>
    ${message}
    ${error}`;
  res.send(page('RMS Login', body, session));
});

app.post('/login', (req, res) => {
  const email = normalizeEmail(req.body.email || '');
  const password = String(req.body.password || '');
  const next = String(req.body.next || '/apps');
  if (!email || !password) {
    return res.redirect(`/login?error=${encodeURIComponent('Email and password are required.')}&next=${encodeURIComponent(next)}`);
  }

  const user = findUserByEmailStmt.get(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return res.redirect(`/login?error=${encodeURIComponent('Invalid email or password.')}&next=${encodeURIComponent(next)}`);
  }

  const timestamp = nowIso();
  const displayName = sanitizeDisplayName(user.display_name, user.email);
  touchUserLoginStmt.run(displayName, timestamp, timestamp, user.id);
  writeSession(req, res, { ...user, id: user.id, display_name: displayName });
  res.redirect(next);
});

app.post('/signup', (req, res) => {
  const email = normalizeEmail(req.body.email || '');
  const name = sanitizeDisplayName(req.body.name || '', email);
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const next = String(req.body.next || '/apps');

  if (!name || !email || !password || !confirmPassword) {
    return res.redirect(`/login?mode=signup&error=${encodeURIComponent('All sign-up fields are required.')}&next=${encodeURIComponent(next)}`);
  }
  if (!isValidEmail(email)) {
    return res.redirect(`/login?mode=signup&error=${encodeURIComponent('Please enter a valid email address.')}&next=${encodeURIComponent(next)}`);
  }
  if (password !== confirmPassword) {
    return res.redirect(`/login?mode=signup&error=${encodeURIComponent('Passwords do not match.')}&next=${encodeURIComponent(next)}`);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.redirect(`/login?mode=signup&error=${encodeURIComponent(passwordError)}&next=${encodeURIComponent(next)}`);
  }

  if (findUserByEmailStmt.get(email)) {
    return res.redirect(`/login?error=${encodeURIComponent('An account with that email already exists.')}&next=${encodeURIComponent(next)}`);
  }

  const user = createPasswordUser({ email, displayName: name, password });
  writeSession(req, res, user);
  res.redirect(next);
});

app.get('/signup', (req, res) => {
  const next = String(req.query.next || '/apps');
  res.redirect(`/login?mode=signup&next=${encodeURIComponent(next)}`);
});

app.post('/auth/google', async (req, res) => {
  const credential = String(req.body.credential || '');
  const next = String(req.body.next || '/apps');
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential.' });
  }
  try {
    const profile = await verifyGoogleCredential(credential);
    const user = upsertGoogleUser(profile);
    writeSession(req, res, user);
    res.redirect(next);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Google sign-in failed.' });
  }
});

app.get('/unified-login/:app', (req, res) => {
  const nextByApp = {
    survey: '/launch/survey',
    argus: '/launch/argus',
    sysreview: '/launch/sysreview',
    chatbot: '/launch/chatbot',
  };
  const next = nextByApp[req.params.app] || '/apps';
  res.redirect(`/login?next=${encodeURIComponent(next)}`);
});

app.get(['/logout', '/unified-logout.html'], (req, res) => {
  const next = String(req.query.next || '/');
  clearSession(req, res);
  res.clearCookie('sessionid', { path: '/' });
  res.clearCookie('csrftoken', { path: '/' });
  res.redirect(next.startsWith('/') ? next : '/');
});

app.get('/apps', requireLogin, (req, res) => {
  const body = `
    <section class="hero">
      <img class="hero-logo" src="${publicPath(RMS_LOGO_PATH)}" alt="RMS - Review Management System" />
      <div class="eyebrow">RMS workspace</div>
      <h1>Choose your research workflow.</h1>
      <p>You are signed in once through RMS. Launch TRACE, ARGUS, QUEST, or SPARK below without separate app-level login screens.</p>
    </section>
    <div class="metrics">
      <div class="metric"><strong>TRACE</strong><span>Query and evidence tracking</span></div>
      <div class="metric"><strong>ARGUS</strong><span>Assisted document reading</span></div>
      <div class="metric"><strong>QUEST</strong><span>Research-aware Q&A</span></div>
      <div class="metric"><strong>SPARK</strong><span>Academic survey collection</span></div>
    </div>
    <div class="grid">
      ${componentCards({ authenticated: true })}
    </div>`;
  res.send(page('RMS Workspace', body, req.portalSession));
});

const surveyProxy = createProxyMiddleware({
  target: SURVEY_TARGET,
  changeOrigin: true,
  xfwd: true,
  selfHandleResponse: Boolean(PUBLIC_PATH_PREFIX),
  pathRewrite: (path) => {
    if (path.startsWith('/survey/static/')) {
      return path;
    }
    return path.replace(/^\/survey/, '') || '/';
  },
  on: {
    proxyReq(proxyReq, req) {
      proxyReq.setHeader('accept-encoding', 'identity');
      proxyReq.setHeader('X-Forwarded-Prefix', '/survey');
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
      proxyReq.setHeader('Host', req.headers.host || '');
      proxyReq.setHeader('X-Portal-Auth-Mode', 'shared-session');
      const identity = getPortalIdentity(req);
      if (identity) {
        proxyReq.setHeader('X-Portal-User-Email', identity.email);
        proxyReq.setHeader('X-Portal-User-Name', identity.name);
        proxyReq.setHeader('X-Portal-User-First-Name', identity.firstName);
        proxyReq.setHeader('X-Portal-User-Last-Name', identity.lastName);
        proxyReq.setHeader('X-Portal-User-Username', identity.username);
      }
      fixRequestBody(proxyReq, req);
    },
    proxyRes: createPublicPrefixResponseHandler('/survey', SURVEY_TARGET),
  },
});

app.get('/launch/survey', requireLogin, (_req, res) => {
  res.redirect('/survey/');
});

app.get('/launch/chatbot', requireLogin, (req, res) => {
  const q = new URLSearchParams({ sharedEmail: req.portalSession.email, next: '/chatbot/static/index.html?portalReady=1' });
  res.redirect(`/chatbot/shared-entry?${q.toString()}`);
});

app.get('/launch/argus', requireLogin, (req, res) => {
  renderArgusBootstrap(res, getPortalIdentity(req));
});

app.get('/launch/sysreview', requireLogin, async (req, res, next) => {
  try {
    await ensureSysreviewToken(req, res);
    res.redirect('/sysreview/ui/dashboard');
  } catch (error) {
    next(error);
  }
});

app.get(['/survey', '/survey/'], (req, res, next) => {
  surveyProxy(req, res, next);
});

app.post(['/survey/accounts/logout', '/survey/accounts/logout/'], (req, res) => {
  clearSession(req, res);
  res.clearCookie('sessionid', { path: '/' });
  res.clearCookie('csrftoken', { path: '/' });
  res.redirect('/survey/?logged_out=1');
});

app.get(['/survey/accounts/login', '/survey/accounts/login/', '/survey/accounts/signup', '/survey/accounts/signup/'], (req, res) => {
  const session = parseSession(req);
  if (session?.email) {
    return res.redirect('/survey/');
  }
  res.redirect(`/login?next=${encodeURIComponent('/launch/survey')}`);
});

app.get(['/sysreview/ui/auth', '/sysreview/ui/auth/'], (req, res) => {
  const session = parseSession(req);
  if (session?.email) {
    return res.redirect('/launch/sysreview');
  }
  res.redirect(`/login?next=${encodeURIComponent('/launch/sysreview')}`);
});

app.get(['/argus', '/argus/', '/argus/login', '/argus/login/', '/argus/register', '/argus/register/'], (req, res) => {
  const identity = getPortalIdentity(req);
  if (!identity) {
    return res.redirect(`/login?next=${encodeURIComponent('/launch/argus')}`);
  }
  renderArgusBootstrap(res, identity);
});

app.get(['/chatbot', '/chatbot/', '/chatbot/static/index.html'], requireLogin, (req, res, next) => {
  if (req.query.portalReady === '1') {
    return next();
  }

  const q = new URLSearchParams({
    sharedEmail: req.portalSession.email,
    next: '/chatbot/static/index.html?portalReady=1',
  });
  res.redirect(`/chatbot/shared-entry?${q.toString()}`);
});

app.get(/^\/argus\/.+/, (req, res, next) => {
  if (!getPortalIdentity(req)) {
    return res.redirect(`/login?next=${encodeURIComponent('/launch/argus')}`);
  }

  next();
});

app.use('/api', (req, _res, next) => {
  const identity = getPortalIdentity(req);
  if (identity) {
    req.headers['x-portal-auth-mode'] = 'shared-session';
    req.headers['x-portal-user-email'] = identity.email;
    req.headers['x-portal-user-name'] = identity.name;
    req.headers['x-portal-user-first-name'] = identity.firstName;
    req.headers['x-portal-user-last-name'] = identity.lastName;
  }
  next();
}, createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  xfwd: true,
  on: {
    proxyReq(proxyReq, req) {
      fixRequestBody(proxyReq, req);
    },
  },
  pathRewrite: (path) => path.startsWith('/api') ? path : `/api${path}`,
}));

app.use('/argus', createProxyMiddleware({
  target: ARGUS_TARGET,
  changeOrigin: true,
  selfHandleResponse: Boolean(PUBLIC_PATH_PREFIX),
  pathRewrite: (path) => path.replace(/^\/argus/, '') || '/',
  on: {
    proxyReq(proxyReq, req) {
      proxyReq.setHeader('accept-encoding', 'identity');
      fixRequestBody(proxyReq, req);
    },
    proxyRes: createPublicPrefixResponseHandler('/argus', ARGUS_TARGET, ['/api']),
  },
}));

app.use('/chatbot', requireLogin, (req, _res, next) => {
  req.headers['x-forwarded-prefix'] = '/chatbot';
  if (req.portalSession?.email) req.headers['x-portal-user'] = req.portalSession.email;
  next();
}, createProxyMiddleware({
  target: CHATBOT_TARGET,
  changeOrigin: true,
  pathRewrite: (path) => path.startsWith('/chatbot') ? path : `/chatbot${path}`,
  on: {
    proxyReq(proxyReq, req) {
      fixRequestBody(proxyReq, req);
    },
    proxyRes(proxyRes) {
      const location = proxyRes.headers.location;
      if (location && location.startsWith('/')) proxyRes.headers.location = publicRedirectTarget(location);
    },
  },
}));

app.use('/survey/static', express.static(SURVEY_STATIC_DIR));
app.use('/survey', surveyProxy);

app.use('/sysreview', requireLogin, (req, res, next) => {
  ensureSysreviewToken(req, res)
    .then(() => {
      req.headers['x-forwarded-prefix'] = '/sysreview';
      if (req.portalSession?.email) req.headers['x-portal-user'] = req.portalSession.email;
      next();
    })
    .catch(next);
}, createProxyMiddleware({
  target: SYSREVIEW_TARGET,
  changeOrigin: true,
  xfwd: true,
  selfHandleResponse: Boolean(PUBLIC_PATH_PREFIX),
  pathRewrite: (path) => path.startsWith('/sysreview') ? path : `/sysreview${path}`,
  on: {
    proxyReq(proxyReq, req) {
      proxyReq.setHeader('accept-encoding', 'identity');
      fixRequestBody(proxyReq, req);
    },
    proxyRes: createPublicPrefixResponseHandler('/sysreview', SYSREVIEW_TARGET),
  },
}));

if (!IS_SERVERLESS_FS) {
  app.listen(PORT, HOST, () => {
    const displayUrl = PUBLIC_BASE_URL || `http://${HOST}:${PORT}`;
    console.log(`RMS portal listening on ${displayUrl}`);
  });
}

module.exports = app;
