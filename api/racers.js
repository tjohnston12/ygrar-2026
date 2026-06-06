// api/racers.js — audience size + a small name sample for the campaign manager.
// GET ?audience=all|active|pending|captains  (auth) -> { audience, count, sample }
// Privacy: returns a count and a few first names only — never the full email list.

import { find } from '../lib/airtable.js';
import { requireAdmin } from '../lib/auth.js';

export function audienceFilter(a) {
  switch (a) {
    case 'active':   return "{Registration status}='Active'";
    case 'pending':  return "{Registration status}='Pending payment'";
    case 'captains': return "{Type}='Team captain'";
    default:         return "NOT({Email}='')";
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const audience = (req.query && req.query.audience) || 'all';
  const rows = await find('Racers', { filter: audienceFilter(audience) });
  const withEmail = rows.filter((r) => r.Email);
  const sample = withEmail.slice(0, 5).map((r) => (r['Full name'] || 'Racer').split(' ')[0]);
  return res.status(200).json({ audience, count: withEmail.length, sample });
}
