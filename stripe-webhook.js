// api/potw.js — current week's photo-of-the-week tallies.
// GET -> { week, counts: {photoId: n}, leaderId }

import { find, esc } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const week = isoWeek();
  const votes = await find('Votes', { filter: `{Week}='${esc(week)}'` });
  const counts = {};
  votes.forEach((v) => { const id = v['Photo ID']; if (id) counts[id] = (counts[id] || 0) + 1; });

  let leaderId = null, max = 0;
  for (const [id, n] of Object.entries(counts)) { if (n > max) { max = n; leaderId = id; } }

  return res.status(200).json({ week, counts, leaderId });
}
