// api/cp-flag.js — a logged-in racer flags a control point that looks wrong
// (bad location, private land, unsafe, etc.). Increments a count + logs the reason
// so the organizer can review it in the admin tool. The CP stays live until reviewed.

import { findOne, update, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const racer = requireAuth(req, res);
  if (!racer) return;

  const { cpId, reason } = req.body || {};
  if (!cpId) return res.status(400).json({ error: 'cpId required' });

  const cp = await findOne('CPs', `RECORD_ID()='${esc(cpId)}'`);
  if (!cp) return res.status(404).json({ error: 'Control point not found' });

  const count = (cp['Flag count'] || 0) + 1;
  const stamp = new Date().toISOString().slice(0, 10);
  const note = `[${stamp}] ${racer.name || 'Racer'}: ${(reason || '').toString().slice(0, 200) || '(no reason given)'}`;
  const existing = cp['Flag reason'] ? cp['Flag reason'] + '\n' : '';

  await update('CPs', cpId, {
    'Flagged': true,
    'Flag count': count,
    'Flag reason': existing + note,
  });

  return res.status(200).json({ ok: true, flagCount: count });
}
