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
    spcaReceiptUrl,                                 // Cloudinary URL of the donation receipt
  } = req.body || {};

  if (!fullName || !email || !password || !waiverName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // No duplicate accounts.
  const existing = await findOne('Racers', `{Email}='${esc(email)}'`);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

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
    'SPCA receipt URL': spcaReceiptUrl || '',
    'SPCA receipt status': 'Pending',          // you review within 24h
    'Registration status': 'Pending payment',
    'Registered at': new Date().toISOString(),
  });

  // Don't leak the hash back to the browser.
  delete racer['Password hash'];
  return res.status(200).json({ racer });
}
