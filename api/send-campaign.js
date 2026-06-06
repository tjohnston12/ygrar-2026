// api/send-campaign.js — send an email campaign to an audience.
// POST { audience, subject, html } (auth) -> { sent, total, audience }
// Merge tags supported per-recipient: {{name}} {{first_name}} {{email}} {{team}}

import { find } from '../lib/airtable.js';
import { requireAdmin } from '../lib/auth.js';
import { sendEmail } from './send-email.js';
import { audienceFilter } from './racers.js';

function render(t, r) {
  const full = r['Full name'] || '';
  return (t || '')
    .split('{{name}}').join(full)
    .split('{{first_name}}').join(full.split(' ')[0] || '')
    .split('{{email}}').join(r.Email || '')
    .split('{{team}}').join(r['Team name'] || '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { audience, subject, html } = req.body || {};
  if (!subject || !html) return res.status(400).json({ error: 'subject and html required' });

  const rows = await find('Racers', { filter: audienceFilter(audience || 'all') });
  const recipients = rows.filter((r) => r.Email);

  // NOTE: large lists may hit Resend rate limits — chunk/queue if your roster grows.
  const results = await Promise.allSettled(
    recipients.map((r) => sendEmail({ to: r.Email, subject: render(subject, r), html: render(html, r) }))
  );
  const sent = results.filter((x) => x.status === 'fulfilled').length;
  return res.status(200).json({ sent, total: recipients.length, audience: audience || 'all' });
}
