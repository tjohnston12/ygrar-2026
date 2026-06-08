// api/cp-place.js — the team holding a reserved slot fills in their placeholder.
// action 'place'  -> placeholder becomes a Live control point (with photo + coords).
// action 'decline'-> placeholder is removed (Status 'Removed'), freeing the slot.
// Racer-placed points go live immediately; other racers can flag them for review.

import { findOne, update, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const racer = requireAuth(req, res);
  if (!racer) return;

  const { action, cpId, name, location, latitude, longitude, difficulty, familyFriendly, photoUrl } = req.body || {};
  if (!cpId) return res.status(400).json({ error: 'cpId (the reserved placeholder) is required.' });

  // The placeholder must exist, be awaiting placement (Pending), and belong to this racer.
  const ph = await findOne('CPs', `RECORD_ID()='${esc(cpId)}'`);
  if (!ph) return res.status(404).json({ error: 'That reserved slot no longer exists.' });
  if (ph.Status !== 'Pending' || !(ph['Placed by'] || []).includes(racer.id)) {
    return res.status(403).json({ error: 'This slot isn\'t yours to place.' });
  }

  if (action === 'decline') {
    await update('CPs', cpId, { 'Status': 'Removed' });
    return res.status(200).json({ declined: true });
  }

  // Place it.
  if (!name || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'name, latitude and longitude are required.' });
  }
  const cp = await update('CPs', cpId, {
    'Name': name,
    'Status': 'Live',
    'Latitude': parseFloat(latitude),
    'Longitude': parseFloat(longitude),
    'Location description': location || '',
    'Difficulty': difficulty ? parseInt(difficulty, 10) : null,
    'Family friendly': !!familyFriendly,
    'Photo URL': photoUrl || '',
  });

  return res.status(200).json({ cp });
}
