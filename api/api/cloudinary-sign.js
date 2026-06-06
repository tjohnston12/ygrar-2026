// /api/cloudinary-sign.js
// Generates a one-time signature so racers can upload straight to Cloudinary.
// Your API SECRET stays here on the server and is never sent to the browser.
//
// Vercel env vars to set (Project > Settings > Environment Variables):
//   CLOUDINARY_CLOUD_NAME   (not secret)
//   CLOUDINARY_API_KEY      (not secret)
//   CLOUDINARY_API_SECRET   (SECRET — never expose this)

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // RECOMMENDED: confirm the racer is logged in before signing
  // (reuse the same JWT/Airtable check your other endpoints use).
  // This is what actually stops strangers spamming your free tier.
  // e.g. if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  const timestamp = Math.round(Date.now() / 1000);

  // These params MUST match exactly what the client sends to Cloudinary.
  // Keeping race photos in their own folder separates them from your employee app.
  const paramsToSign = {
    timestamp,
    folder: 'ygtar',
  };

  // Cloudinary signature = SHA-1 of "key=value&key=value" (keys sorted A–Z),
  // with your API secret appended to the end.
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');

  return res.status(200).json({
    signature,
    timestamp,
    folder: paramsToSign.folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}

// If your other apps use CommonJS instead of ESM, swap the top line for:
//   const crypto = require('crypto');
// and the export for:
//   module.exports = async function handler(req, res) { ... }
