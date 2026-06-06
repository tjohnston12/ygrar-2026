// api/send-email.js — transactional email + admin campaigns via Resend.
// Exports sendEmail() for use by other functions (e.g. the Stripe webhook),
// and also works as a POST endpoint for the admin campaign manager.

import { Resend } from 'resend';
import { requireAdmin } from '../lib/auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  return resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    html,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Only the admin (you) can blast campaigns. Tighten this check as needed,
  // e.g. compare racer.email to your admin address.
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { to, subject, html } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, html required' });
  }

  // `to` may be an array for a campaign send.
  const result = await sendEmail({ to, subject, html });
  return res.status(200).json({ result });
}
