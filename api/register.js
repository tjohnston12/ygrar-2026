// api/register.js — create a racer account (status: Pending payment).
// After this returns, the client calls /api/stripe-checkout to collect the $5/racer.
// Wrapped in try/catch so any failure (e.g. an unknown Airtable field name) returns
// clean JSON { error } instead of a raw 500 — which previously surfaced on the client
// as the cryptic WebKit "The string did not match the expected pattern." message.

import { create, findOne, esc } from '../lib/airtable.js';
import { hashPassword } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      fullName, email, password, phone, type,        // type: Solo / Team captain / Team member
      teamName, emergencyName, emergencyPhone,
      profilePhotoUrl, waiverName,                    // waiver typed-name signature
      spcaDonated,                                    // honor-system: racer confirms they donated to the SPCA
      cities,                                         // array of city names the racer is competing in
      guardianConsent,                                // true when a parent/guardian signed for youth (under 16)
      children,                                       // array of child names registered under this adult
    } = req.body || {};

    if (!fullName || !email || !password || !waiverName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // No duplicate accounts.
    const existing = await findOne('Racers', `{Email}='${esc(email)}'`);
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

    // children may arrive as ["Name", ...] or [{name, photo}, ...]
    const childList = Array.isArray(children) ? children : [];
    const childNames = childList.map((c) => (typeof c === 'string' ? c : (c && c.name) || '')).filter(Boolean);
    const childPhotos = childList.map((c) => (c && c.photo) || '').filter(Boolean);

    const racer = await create('Racers', {
      'Full name': fullName,
      'Email': email,
      'Password hash': await hashPassword(password),
      'Phone': phone || '',
      'Type': type || 'Solo',
      'Team name': teamName || '',
      'Emergency contact name': emergencyName || '',
      'Emergency contact phone': emergencyPhone || '',
      'Profile photo URL': profilePhotoUrl || '',
      'Waiver signed': true,
      'Waiver signed at': new Date().toISOString(),
      'Waiver signature name': waiverName,
      'SPCA donated': !!spcaDonated,             // honor system — racer confirmed their donation
      'Cities': Array.isArray(cities) ? cities.join(', ') : (cities || ''),
      'Guardian consent': !!guardianConsent,
      'Children': childNames.join(', '),
      'Children photos': childPhotos.join(', '),
      'Registration status': 'Pending payment',
      'Registered at': new Date().toISOString(),
    });

    // Don't leak the hash back to the browser.
    delete racer['Password hash'];
    return res.status(200).json({ racer });
  } catch (err) {
    // Surface the real reason (Airtable field errors, etc.) as readable JSON.
    console.error('register error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
}
