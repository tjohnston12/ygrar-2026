// api/gallery.js — adventure photo gallery.
//   GET  -> list approved photos (optionally ?discipline=Hiking)
//   POST -> submit a new photo (goes in as "Pending review" for you to approve)

import { create, find, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { discipline } = req.query || {};
    let filter = "{Status}='Approved'";
    if (discipline) filter = `AND({Status}='Approved', {Discipline}='${esc(discipline)}')`;
    const photos = await find('Photos', {
      filter,
      sort: [{ field: 'Posted at', direction: 'desc' }],
    });
    return res.status(200).json({ photos });
  }

  if (req.method === 'POST') {
    const racer = requireAuth(req, res);
    if (!racer) return;

    const { url, caption, discipline, cpId, location, junior } = req.body || {};
    if (!url) return res.status(400).json({ error: 'Photo url required' });

    const photo = await create('Photos', {
      'Racer': [racer.id],
      'Photo URL': url,
      'Caption': caption || '',
      'Discipline': discipline || '',
      'CP': cpId ? [cpId] : undefined,
      'Location': location || '',
      'Junior': !!junior,
      'Status': 'Pending review',   // approve before it shows publicly
      'Likes': 0,
      'Posted at': new Date().toISOString(),
    });
    return res.status(200).json({ photo });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
