// api/stripe-webhook.js — Stripe calls this after a successful payment.
// Marks the racer Active (registration) or records a swag order, then emails a receipt.
//
// IMPORTANT: Stripe signature verification needs the RAW request body, so we
// turn off Vercel's automatic body parser below.

import Stripe from 'stripe';
import { update, create } from '../lib/airtable.js';
import { sendEmail } from './send-email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      raw,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { kind, racerId } = session.metadata || {};

    if (kind === 'registration' && racerId) {
      await update('Racers', racerId, {
        'Registration status': 'Active',
        'Amount paid': (session.amount_total || 0) / 100,
      });
      if (session.customer_details?.email) {
        await sendEmail({
          to: session.customer_details.email,
          subject: "You're registered for YGTAR 2026!",
          html: `<p>You're all set for the You Got This Adventure Race. Good luck out there!</p>
                 <p>— Natural Selection Adventure Racing</p>`,
        });
      }
    } else if (kind === 'swag') {
      await create('Swag Orders', {
        'Stripe session': session.id,
        'Email': session.customer_details?.email || '',
        'Amount paid': (session.amount_total || 0) / 100,
        'Status': 'New',
        'Ordered at': new Date().toISOString(),
      });
    }
  }

  return res.status(200).json({ received: true });
}
