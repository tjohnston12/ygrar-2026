// api/photo-like.js — add a like to a gallery photo.
// POST { photoId }  (requires login) -> { likes }

import { findOne, update, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const racer = requireAuth(req, res);
  if (!racer) return;

  const { photoId } = req.body || {};
  if (!photoId) return res.status(400).json({ error: 'photoId required' });

  const photo = await findOne('Photos', `RECORD_ID()='${esc(photoId)}'`);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const likes = (photo.Likes || 0) + 1;
  await update('Photos', photoId, { 'Likes': likes });
  return res.status(200).json({ likes });
}
