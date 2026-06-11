// api/leaderboard-post.js — returns the weekly leaderboard already formatted as a
// Facebook-ready post, for a Zapier "Webhooks by Zapier (GET)" step to fetch and
// hand to the "Facebook Pages — Create Page Post" action.
//
// GET /api/leaderboard-post            -> overall top 10
// GET /api/leaderboard-post?city=Moncton&top=5
// Response: { message, generatedAt, count, standings:[{rank,name,total}] }

import { find } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

const SITE = 'https://yourchoicear.com';

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const city = (req.query && req.query.city) ? String(req.query.city) : '';
  const top = Math.max(1, Math.min(20, parseInt((req.query && req.query.top) || '10', 10) || 10));

  const proofs = await find('Proof Submissions', { filter: "{Status}='Verified'" });
  const cps = await find('CPs');
  const racers = await find('Racers');

  const cpCity = Object.fromEntries(cps.map((c) => [c.id, c.City || '']));
  const racerName = Object.fromEntries(racers.map((r) => [r.id, r['Full name']]));

  const table = {};
  for (const p of proofs) {
    const racerId = (p.Racer || [])[0];
    const cpId = (p.CP || [])[0];
    if (!racerId || !cpId) continue;
    if (city && cpCity[cpId] !== city) continue;
    if (!table[racerId]) table[racerId] = { total: 0, lastTs: 0 };
    table[racerId].total += 1;
    const ts = Date.parse(p['Captured at'] || p['Submitted at'] || '') || 0;
    if (ts > table[racerId].lastTs) table[racerId].lastTs = ts;
  }

  const standings = Object.entries(table)
    .map(([racerId, s]) => ({ name: racerName[racerId] || 'Unknown', total: s.total, lastTs: s.lastTs }))
    .sort((a, b) => (b.total - a.total) || (a.lastTs - b.lastTs))
    .slice(0, top)
    .map((s, i) => ({ rank: i + 1, name: s.name, total: s.total }));

  // Date in Atlantic time, e.g. "Monday, June 15"
  const dateLabel = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Halifax', weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date());

  const heading = city ? `🏆 YCAR 2026 — ${city} leaderboard` : '🏆 YCAR 2026 — Leaderboard';
  let message;
  if (!standings.length) {
    message =
      `${heading}\n${dateLabel}\n\n` +
      `The board is wide open — no control points claimed yet this week. ` +
      `Lace up, pump the tires, grab a paddle, and get your name up here!\n\n` +
      `Race the live map 👉 ${SITE}\n#YourChoiceAR #ExploreNB #HikeBikePaddle`;
  } else {
    const medal = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const lines = standings
      .map((s) => `${medal[s.rank] || (s.rank + '.')} ${s.name} — ${s.total} pt${s.total === 1 ? '' : 's'}`)
      .join('\n');
    message =
      `${heading}\n${dateLabel}\n\n${lines}\n\n` +
      `Every control point is a point — and reaching one first lets you place the next. ` +
      `See the full live standings 👉 ${SITE}\n#YourChoiceAR #ExploreNB #HikeBikePaddle`;
  }

  return res.status(200).json({
    message,
    generatedAt: new Date().toISOString(),
    city: city || 'overall',
    count: standings.length,
    standings,
  });
}
