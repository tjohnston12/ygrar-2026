// api/photo-vote.js — cast your photo-of-the-week vote (one per racer per week).
// Voting is scoped to the ISO week, so it naturally "opens" fresh every Monday.
// POST { photoId } (auth) -> { week, photoId, count, changed }

import { create, update, find, findOne, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const racer = requireAuth(req, res);
  if (!racer) return;

  const { photoId } = req.body || {};
  if (!photoId) return res.status(400).json({ error: 'photoId required' });

  const week = isoWeek();
  const existing = await findOne('Votes', `AND({Racer ID}='${esc(racer.id)}',{Week}='${esc(week)}')`);
  if (existing) {
    await update('Votes', existing.id, { 'Photo': [photoId], 'Photo ID': photoId });
  } else {
    await create('Votes', { 'Photo': [photoId], 'Photo ID': photoId, 'Racer ID': racer.id, 'Week': week });
  }

  const votes = await find('Votes', { filter: `AND({Photo ID}='${esc(photoId)}',{Week}='${esc(week)}')` });
  return res.status(200).json({ week, photoId, count: votes.length, changed: !!existing });
}
