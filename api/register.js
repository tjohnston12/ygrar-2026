// api/register.js — create a racer account (status: Pending payment).
// After this returns, the client calls /api/stripe-checkout to collect the $5/racer.

import { create, findOne, esc } from '../lib/airtable.js';
import { hashPassword } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    fullName, email, password, phone, type,        // type: Solo / Team captain / Team member
    teamName, emergencyName, emergencyPhone,
    profilePhotoUrl, waiverName,                    // waiver typed-name signature
    spcaDonated,                                    // honor-system: racer confirms they donated to the SPCA
    cities,                                         // array of city names the racer is competing in
    guardianConsent,                                // true when a parent/guardian signed for youth (under 16)
    children,                                        // array of child names registered under this adult
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

  // A solo racer who registers children is a self-contained "family unit":
  // auto-group them under a family team name so the roster shows them together
  // instead of as a lone solo. These are NOT joinable by others — teams.js
  // excludes Type='Family' from the join-a-team picker.
  let effectiveType = type || 'Solo';
  let effectiveTeam = teamName || '';
  if (effectiveType === 'Solo' && childNames.length > 0) {
    effectiveType = 'Family';
    const lastName = (fullName || '').trim().split(/\s+/).pop() || 'Adventure';
    effectiveTeam = `${lastName} Family`;
  }

  const racer = await create('Racers', {
    'Full name': fullName,
    'Email': email,
    'Password hash': await hashPassword(password),
    'Phone': phone || '',
    'Type': effectiveType,
    'Team name': effectiveTeam,
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
}
