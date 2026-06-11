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

  // One point per racer per CP: collect each racer's DISTINCT claimed CPs.
  // A CP's claim time is the racer's earliest verified visit to it.
  const byRacer = {}; // racerId -> Map(cpId -> earliest claim ts)
  for (const p of proofs) {
    const racerId = (p.Racer || [])[0];
    const cpId = (p.CP || [])[0];
    if (!racerId || !cpId) continue;
    if (city && cpCity[cpId] !== city) continue;
    const ts = Date.parse(p['Captured at'] || p['Submitted at'] || '') || 0;
    const r = byRacer[racerId] || (byRacer[racerId] = { cps: new Map() });
    const prev = r.cps.get(cpId);
    if (prev === undefined || ts < prev) r.cps.set(cpId, ts);
  }

  const standings = Object.entries(byRacer)
    .map(([racerId, r]) => {
      let total = 0, Hiking = 0, Biking = 0, Paddling = 0, lastTs = 0;
      for (const [cpId, ts] of r.cps) {
        total += 1;
        const disc = cpDiscipline[cpId] || 'Other';
        if (disc === 'Hiking') Hiking += 1;
        else if (disc === 'Biking') Biking += 1;
        else if (disc === 'Paddling') Paddling += 1;
        if (ts > lastTs) lastTs = ts;
      }
      return { name: racerName[racerId] || 'Unknown', total, Hiking, Biking, Paddling, lastTs };
    })
    // Most points first; ties go to whoever reached their last CP earliest.
    .sort((a, b) => (b.total - a.total) || (a.lastTs - b.lastTs))
    .map(({ lastTs, ...rest }) => rest); // don't leak the raw timestamp;

  return res.status(200).json({ standings, city });
}
