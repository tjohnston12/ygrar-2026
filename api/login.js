// api/login.js — email + password login against the Racers table.

import { findOne, esc } from '../lib/airtable.js';
import { checkPassword, signToken } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const racer = await findOne('Racers', `{Email}='${esc(email)}'`);
  if (!racer || !racer['Password hash']) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const ok = await checkPassword(password, racer['Password hash']);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken({ id: racer.id, email: racer.Email, name: racer['Full name'], isAdmin: !!racer['Is admin'] });
  return res.status(200).json({
    token,
    racer: { id: racer.id, name: racer['Full name'], email: racer.Email, isAdmin: !!racer['Is admin'], profilePhoto: racer['Profile photo URL'] || '' },
  });
}
