// api/comments.js — gallery photo comments.
//   GET  ?photoId=...   -> { comments: [{id,name,text,at}] }
//   POST { photoId, text } (auth) -> { comment }

import { create, find, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { photoId } = req.query || {};
    if (!photoId) return res.status(400).json({ error: 'photoId required' });
    const rows = await find('Comments', {
      filter: `{Photo ID}='${esc(photoId)}'`,
      sort: [{ field: 'Posted at', direction: 'asc' }],
    });
    return res.status(200).json({
      comments: rows.map((r) => ({ id: r.id, name: r['Racer name'] || 'Racer', text: r.Text || '', at: r['Posted at'] })),
    });
  }

  if (req.method === 'POST') {
    const racer = requireAuth(req, res);
    if (!racer) return;
    const { photoId, text } = req.body || {};
    if (!photoId || !text) return res.status(400).json({ error: 'photoId and text required' });
    const c = await create('Comments', {
      'Photo': [photoId],
      'Photo ID': photoId,
      'Racer name': racer.name || 'Racer',
      'Racer ID': racer.id,
      'Text': text,
      'Posted at': new Date().toISOString(),
    });
    return res.status(200).json({ comment: { id: c.id, name: racer.name || 'Racer', text, at: c['Posted at'] } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
