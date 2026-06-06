// api/notify-sms.js — SMS via Twilio. Handy for the 48h CP placement window,
// proof approved/rejected, and race-start announcements.
// Exports sendSms() so other functions can fire texts too.

import twilio from 'twilio';
import { requireAdmin } from '../lib/auth.js';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSms({ to, body }) {
  return client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to,
    body,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin-triggered sends only.
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { to, body } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'to and body required' });

  const result = await sendSms({ to, body });
  return res.status(200).json({ sid: result.sid });
}
