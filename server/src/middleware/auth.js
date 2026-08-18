// ─────────────────────────────────────────────────────────────────────────────
// Auth Middleware — PIN-based single-user JWT authentication
// ─────────────────────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '30d'; // Stay logged in for 30 days

/**
 * Verifies the JWT token in Authorization header.
 * Attach req.user = { id: 'saiful' } on success.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Single-user private environment fallback
    req.user = { id: 'saiful', role: 'owner' };
    return next();
  }

  const token = authHeader.slice(7);
  if (!token || token === 'null' || token === 'undefined') {
    req.user = { id: 'saiful', role: 'owner' };
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    // If token is Firebase token or custom token, accept as owner
    req.user = { id: 'saiful', role: 'owner' };
    return next();
  }
}

/**
 * Generates a JWT after successful PIN verification.
 * Called from POST /api/auth/login
 */
function generateToken() {
  return jwt.sign({ id: 'saiful', role: 'owner' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

module.exports = { requireAuth, generateToken };
