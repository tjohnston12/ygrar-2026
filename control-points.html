// lib/auth.js — password hashing + login tokens.
// Racers log in with email + password; we store only the HASH in Airtable.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Issue a token after a successful login.
export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// Verify the token on protected endpoints. Returns the payload, or null.
export function verifyToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Convenience guard for use at the top of protected API functions.
// Returns the racer payload, or sends a 401 and returns null.
export function requireAuth(req, res) {
  const racer = verifyToken(req);
  if (!racer) {
    res.status(401).json({ error: 'Not logged in' });
    return null;
  }
  return racer;
}

// Guard for admin-only endpoints. The token carries isAdmin (set at login from
// the racer's "Is admin" checkbox), so this can't be forged client-side.
export function requireAdmin(req, res) {
  const racer = verifyToken(req);
  if (!racer) {
    res.status(401).json({ error: 'Not logged in' });
    return null;
  }
  if (!racer.isAdmin) {
    res.status(403).json({ error: 'Admins only' });
    return null;
  }
  return racer;
}
