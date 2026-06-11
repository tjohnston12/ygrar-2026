// api/save-cp-photo.js — a racer submits GPS-verified photo proof for a CP.
// The client (uploadPhoto.js) has already uploaded to Cloudinary and read the
// photo's GPS. Here we check the coordinates are close enough to the CP, then
// record the proof. If verified, this racer earns the right to place the next CP.

import { create, find, findOne, update, esc } from '../lib/airtable.js';
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

// The claim time is the photo's capture time when we trust it, falling back to
// "now" (submission time). Backstop against a wrong/spoofed device clock: never
// accept a capture time in the future (allow 2 min of skew).
function claimTimeFrom(capturedAt) {
  const now = Date.now();
  if (capturedAt) {
    const t = Date.parse(capturedAt);
    if (!Number.isNaN(t) && t <= now + 2 * 60 * 1000) return new Date(t).toISOString();
  }
  return new Date(now).toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const racer = requireAuth(req, res);
  if (!racer) return; // 401 already sent

  // Must have completed registration payment (status set to Active by the Stripe webhook).
  const me = await findOne('Racers', `RECORD_ID()='${esc(racer.id)}'`);
  if (!me || me['Registration status'] !== 'Active') {
    return res.status(403).json({ error: 'Please complete your registration payment before submitting control point proof.' });
  }

  const { cpId, url, latitude, longitude, capturedAt } = req.body || {};
  if (!cpId || !url || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'cpId, url, latitude, longitude required' });
  }

  const claimTime = claimTimeFrom(capturedAt);

  const cp = await findOne('CPs', `RECORD_ID()='${esc(cpId)}'`);
  if (!cp) return res.status(404).json({ error: 'Control point not found' });

  // #2 — must be registered in this CP's city to claim it (blank-city CPs stay open to all).
  const myCities = new Set(String(me.Cities || '').split(',').map((s) => s.trim()).filter(Boolean));
  if (cp.City && !myCities.has(cp.City)) {
    return res.status(403).json({ error: `You're not registered in ${cp.City}. Add that city from the Control points page to claim control points there.` });
  }

  // #1 — one point per racer per CP. If this racer already has a verified visit to this
  // CP, don't create a duplicate or re-trigger placement; it only counts once.
  const verifiedProofs = await find('Proof Submissions', { filter: "{Status}='Verified'" });
  const alreadyClaimed = verifiedProofs.some(
    (p) => (p.Racer || [])[0] === racer.id && (p.CP || [])[0] === cpId
  );
  if (alreadyClaimed) {
    return res.status(200).json({
      verified: true,
      alreadyClaimed: true,
      message: "You've already claimed this control point — it only counts once.",
    });
  }

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
    'Captured at': claimTime,
    'Submitted at': new Date().toISOString(),
  });

  // First verified visit reserves the next slot in this chain: we drop in a
  // placeholder ("waiting for [team] to place a new one") attributed to this team.
  // Placing fills it in (-> Live); declining removes it; until then it shows as waiting.
  let earnedPlacement = false, placeholderId = null;
  if (verified) {
    await update('CPs', cpId, { 'Last verified at': claimTime });

    const teamName = (me['Team name'] || '').trim() || me['Full name'] || racer.name || 'A racer';
    const nextChain = (cp['Chain position'] || 0) + 1;
    const slot = `AND({Discipline}='${esc(cp.Discipline || '')}', {City}='${esc(cp.City || '')}', {Chain position}=${nextChain}, OR({Status}='Pending', {Status}='Live'))`;
    const existing = await findOne('CPs', slot);

    if (existing) {
      // Slot already spoken for. Only contestable while it's still Pending (not yet Live).
      if (existing.Status === 'Pending') {
        const heldByMe = (existing['Placed by'] || []).includes(racer.id);
        if (heldByMe) {
          earnedPlacement = true; placeholderId = existing.id;
        } else {
          // Fair play: whoever physically arrived first (earliest capture time) keeps the
          // placement, even if a slower-signal racer reached it first but submitted later.
          const heldSince = Date.parse(existing['Reserved at'] || '') || Infinity;
          if (Date.parse(claimTime) < heldSince) {
            await update('CPs', existing.id, {
              'Placed by': [racer.id],
              'Placed by team': teamName,
              'Reserved at': claimTime,
            });
            earnedPlacement = true; placeholderId = existing.id;
          }
        }
      }
      // If it's already Live, the next CP physically exists — nothing to reassign.
    } else {
      const ph = await create('CPs', {
        'Name': 'Awaiting placement',
        'Discipline': cp.Discipline || '',
        'City': cp.City || '',
        'Chain position': nextChain,
        'Status': 'Pending',
        'Placed by': [racer.id],
        'Placed by team': teamName,
        'Reserved at': claimTime,
      });
      earnedPlacement = true; placeholderId = ph.id;
    }
  }

  return res.status(200).json({
    verified,
    distanceMetres: Math.round(metres),
    proofId: proof.id,
    earnedPlacement,
    placeholderId,
    message: verified
      ? 'Verified! You can place the next CP in this chain.'
      : `Photo was ${Math.round(metres)} m from the control point — try getting closer.`,
  });
}
