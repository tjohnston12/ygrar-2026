// api/save-cp-photo.js — a racer submits GPS-verified photo proof for a CP.
// The client (uploadPhoto.js) has already uploaded to Cloudinary and read the
// photo's GPS. Here we check the coordinates are close enough to the CP, then
// record the proof. If verified, this racer earns the right to place the next CP.

import { create, findOne, update, esc } from '../lib/airtable.js';
import { requireAuth } from '../lib/auth.js';

const MATCH_METRES = 75; // how close the photo's GPS must be to count

// Haversine distance in metres between two lat/lng points.
function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const racer = requireAuth(req, res);
  if (!racer) return; // 401 already sent

  const { cpId, url, latitude, longitude } = req.body || {};
  if (!cpId || !url || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'cpId, url, latitude, longitude required' });
  }

  const cp = await findOne('CPs', `RECORD_ID()='${esc(cpId)}'`);
  if (!cp) return res.status(404).json({ error: 'Control point not found' });

  const metres = distanceMetres(latitude, longitude, cp.Latitude, cp.Longitude);
  const verified = metres <= MATCH_METRES;

  const proof = await create('Proof Submissions', {
    'Racer': [racer.id],
    'CP': [cpId],
    'Photo URL': url,
    'Latitude': latitude,
    'Longitude': longitude,
    'Distance (m)': Math.round(metres),
    'Status': verified ? 'Verified' : 'Rejected',
    'Submitted at': new Date().toISOString(),
  });

  // First verified visit earns a 48h offer to place the next CP in this chain.
  // (The offer/queue logic can run from an Airtable automation or a follow-up
  //  endpoint — left as a hook here so you can decide the exact rule.)
  if (verified) {
    await update('CPs', cpId, { 'Last verified at': new Date().toISOString() });
  }

  return res.status(200).json({
    verified,
    distanceMetres: Math.round(metres),
    proofId: proof.id,
    message: verified
      ? 'Verified! You can place the next CP in this chain.'
      : `Photo was ${Math.round(metres)} m from the control point — try getting closer.`,
  });
}
