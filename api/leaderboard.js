// api/leaderboard.js — public standings. 1 point per verified CP.
// Returns overall totals plus a per-discipline breakdown.

import { find } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verified proofs only.
  const proofs = await find('Proof Submissions', { filter: "{Status}='Verified'" });
  const cps = await find('CPs');
  const racers = await find('Racers');

  const cpDiscipline = Object.fromEntries(cps.map((c) => [c.id, c.Discipline]));
  const cpCity = Object.fromEntries(cps.map((c) => [c.id, c.City || '']));
  const racerName = Object.fromEntries(racers.map((r) => [r.id, r['Full name']]));

  // Optional ?city= filter — only count CPs in that city.
  const city = (req.query && req.query.city) ? String(req.query.city) : '';

  const table = {};
  for (const p of proofs) {
    const racerId = (p.Racer || [])[0];
    const cpId = (p.CP || [])[0];
    if (!racerId || !cpId) continue;
    if (city && cpCity[cpId] !== city) continue;
    const disc = cpDiscipline[cpId] || 'Other';
    if (!table[racerId]) table[racerId] = { total: 0, Hiking: 0, Biking: 0, Paddling: 0 };
    table[racerId].total += 1;
    if (table[racerId][disc] != null) table[racerId][disc] += 1;
  }

  const standings = Object.entries(table)
    .map(([racerId, s]) => ({ name: racerName[racerId] || 'Unknown', ...s }))
    .sort((a, b) => b.total - a.total);

  return res.status(200).json({ standings, city });
}
