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

  const { proofId, name, location, latitude, longitude, difficulty, familyFriendly } = req.body || {};
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

  const cp = await create('CPs', {
    'Name': name,
    'Discipline': parent ? (parent.Discipline || '') : '',
    'Status': 'Live',                       // racer-placed points go live right away
    'Latitude': parseFloat(latitude),
    'Longitude': parseFloat(longitude),
    'Location description': location || '',
    'Difficulty': difficulty ? parseInt(difficulty, 10) : null,
    'Chain position': parent ? ((parent['Chain position'] || 0) + 1) : null,
    'City': parent ? (parent.City || '') : '',
    'Family friendly': !!familyFriendly,
    'Placed by': [racer.id],
  });

  return res.status(200).json({ cp });
}
