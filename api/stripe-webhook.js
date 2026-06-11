// api/stripe-webhook.js — Stripe calls this after a successful payment.
// Marks the racer Active (registration) or records a swag order, then emails a receipt.
//
// IMPORTANT: Stripe signature verification needs the RAW request body, so we
// turn off Vercel's automatic body parser below.

import Stripe from 'stripe';
import { update, create, findOne, esc } from '../lib/airtable.js';
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
      const racer = await update('Racers', racerId, {
        'Registration status': 'Active',
        'Amount paid': (session.amount_total || 0) / 100,
      });
      if (session.customer_details?.email) {
        const first = (racer['Full name'] || '').split(' ')[0] || 'there';
        const kids = (racer['Children'] || '').split(',').map((s) => s.trim()).filter(Boolean);
        const kidLine = kids.length
          ? `<p>And a big welcome to your junior adventurer${kids.length > 1 ? 's' : ''}, ${kids.join(' and ')} — we can't wait to see you out on the course!</p>`
          : '';
        await sendEmail({
          to: session.customer_details.email,
          subject: "You're registered for YCAR 2026!",
          html: `<p>Hi ${first}, you're all set for the Your Choice Adventure Race. Good luck out there!</p>
                 ${kidLine}
                 <p>See you out there,<br>Natural Selection Adventure Racing</p>`,
        });
      }
    } else if (kind === 'add-cities' && racerId) {
      // Credit the newly-paid cities to the racer (merge, de-duped) and bump amount paid.
      const newCities = String(session.metadata?.cities || '')
        .split('|').map((s) => s.trim()).filter(Boolean);
      if (newCities.length) {
        const me = await findOne('Racers', `RECORD_ID()='${esc(racerId)}'`);
        const owned = String((me && me.Cities) || '').split(',').map((s) => s.trim()).filter(Boolean);
        const merged = [...new Set([...owned, ...newCities])];
        const racer = await update('Racers', racerId, {
          'Cities': merged.join(', '),
          'Amount paid': ((me && me['Amount paid']) || 0) + (session.amount_total || 0) / 100,
        });
        if (session.customer_details?.email) {
          const first = (racer['Full name'] || '').split(' ')[0] || 'there';
          await sendEmail({
            to: session.customer_details.email,
            subject: 'You added a city to your YCAR 2026 race',
            html: `<p>Hi ${first}, you're now racing in ${newCities.join(' and ')}. The control points there are unlocked on your map — good luck!</p>
                   <p>See you out there,<br>Natural Selection Adventure Racing</p>`,
          });
        }
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
  } else if (event.type === 'checkout.session.expired') {
    // The racer started registering but never completed payment within Stripe's
    // window. Nudge them to come back and finish — but only if they're still unpaid.
    const session = event.data.object;
    const { kind, racerId } = session.metadata || {};
    if (kind === 'registration' && racerId) {
      const racer = await findOne('Racers', `RECORD_ID()='${esc(racerId)}'`);
      if (racer && racer['Registration status'] === 'Pending payment' && racer['Email']) {
        const first = (racer['Full name'] || '').split(' ')[0] || 'there';
        await sendEmail({
          to: racer['Email'],
          subject: "Your YCAR 2026 registration didn't finish",
          html: `<p>Hi ${first}, it looks like your registration payment didn't go through, so you're not signed up for the Your Choice Adventure Race yet.</p>
                 <p>No worries — you can pick up right where you left off and finish in a minute:</p>
                 <p><a href="https://yourchoicear.com/register.html">Complete your registration &rarr;</a></p>
                 <p>If you ran into trouble or this was a mistake, just reply to this email.</p>
                 <p>Hope to see you out there,<br>Natural Selection Adventure Racing</p>`,
        });
      }
    }
  }

  return res.status(200).json({ received: true });
}
