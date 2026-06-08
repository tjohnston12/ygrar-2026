// api/cp-place.js — a racer who just verified a CP places the NEXT one in that
// discipline's chain. It goes live immediately (community-flagged if there's an issue).
// Requires: logged in, paid (Active), and a Verified proof (passed as proofId).

import { create, findOne, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const racer = requireAuth(req, res);
  if (!racer) return;

  const me = await findOne('Racers', `RECORD_ID()='${esc(racer.id)}'`);
  if (!me || me['Registration status'] !== 'Active') {
    return res.status(403).json({ error: 'Complete your registration payment to place control points.' });
  }

  const { proofId, name, location, latitude, longitude, difficulty, familyFriendly, photoUrl } = req.body || {};
  if (!proofId || !name || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'proofId, name, latitude and longitude are required.' });
  }

  // The proof proves this racer earned the right to place the next CP in this chain.
  const proof = await findOne('Proof Submissions', `RECORD_ID()='${esc(proofId)}'`);
  if (!proof || proof.Status !== 'Verified' || !(proof.Racer || []).includes(racer.id)) {
    return res.status(403).json({ error: 'You can only place the next point after verifying one yourself.' });
  }

  const parentId = (proof.CP || [])[0];
  const parent = parentId ? await findOne('CPs', `RECORD_ID()='${esc(parentId)}'`) : null;
  const nextChain = parent ? ((parent['Chain position'] || 0) + 1) : null;

  // Single-slot guard: if someone has already taken this slot (pending or live), it's spoken for.
  if (parent && nextChain != null) {
    const existing = await findOne('CPs',
      `AND({Discipline}='${esc(parent.Discipline || '')}', {City}='${esc(parent.City || '')}', {Chain position}=${nextChain}, OR({Status}='Pending', {Status}='Live'))`);
    if (existing) return res.status(409).json({ error: 'Someone is already placing the next point in this chain — it\'s been taken.' });
  }

  // Team/racer name to show on the pending placement.
  const teamName = (me['Team name'] || '').trim() || me['Full name'] || racer.name || 'A racer';

  const cp = await create('CPs', {
    'Name': name,
    'Discipline': parent ? (parent.Discipline || '') : '',
    'Status': 'Pending',                    // placements are pending review, shown by team name
    'Latitude': parseFloat(latitude),
    'Longitude': parseFloat(longitude),
    'Location description': location || '',
    'Difficulty': difficulty ? parseInt(difficulty, 10) : null,
    'Chain position': nextChain,
    'City': parent ? (parent.City || '') : '',
    'Family friendly': !!familyFriendly,
    'Placed by': [racer.id],
    'Placed by team': teamName,
    'Photo URL': photoUrl || '',
  });

  return res.status(200).json({ cp });
}
