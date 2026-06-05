# You Got This Adventure Race (YGTAR) — App

Backend + integration skeleton for the **You Got This Adventure Race**, hosted by
Natural Selection Adventure Racing. Race runs **June 13 – September 30, 2026** across
three disciplines: hiking, biking, paddling.

**Stack:** GitHub → Vercel (hosting + serverless API) · Airtable (database) ·
Cloudinary (photo hosting) · Stripe (payments) · Resend (email) · Twilio (SMS) ·
Bluehost (marketing site that embeds the widgets).

---

## What's in here

```
ygtar-app/
├── api/                      Vercel serverless functions (your backend)
│   ├── register.js           create a racer account
│   ├── login.js              email + password login -> token
│   ├── stripe-checkout.js    $5/racer registration + swag checkout
│   ├── stripe-webhook.js     marks paid, sends receipt
│   ├── cloudinary-sign.js    signs photo uploads (protects your free tier)
│   ├── save-cp-photo.js      GPS-verifies CP proof, records it
│   ├── leaderboard.js        standings (1 point per verified CP)
│   ├── gallery.js            list / submit adventure photos
│   ├── send-email.js         receipts + admin campaigns (Resend)
│   └── notify-sms.js         placement offers etc. (Twilio)
├── lib/                      shared helpers (airtable, auth, cors)
├── public/
│   ├── index.html            app shell — drop your prototype screens here
│   └── widgets/scoreboard.js embeddable leaderboard for your website
├── src/uploadPhoto.js        client helper: reads GPS, uploads to Cloudinary
├── .env.example              every key you need to set
└── package.json
```

The **screens you prototyped** (home, registration, gallery, swag, admin) go into
`public/` and call the API endpoints above. The backend plumbing is done.

---

## Setup — do these in order

### 1. Get the code running locally
1. Install [Node.js](https://nodejs.org) (LTS) and the Vercel CLI: `npm i -g vercel`
2. In this folder: `npm install`
3. Copy `.env.example` to `.env.local` and fill in keys as you create each account below.
4. Run `vercel dev` to test locally.

### 2. Airtable — build the base
1. Create a base called **YGTAR 2026**. Copy its Base ID (starts with `app…`) into `AIRTABLE_BASE_ID`.
2. Create a Personal Access Token at airtable.com/create/tokens with data read/write
   scope on this base. Put it in `AIRTABLE_TOKEN`.
3. Create these tables and fields (field type in brackets):

   **Racers**
   - Full name [Single line text]
   - Email [Email]
   - Password hash [Single line text]
   - Phone [Phone]
   - Type [Single select: Solo / Team captain / Team member]
   - Team name [Single line text]
   - Emergency contact name [Single line text]
   - Emergency contact phone [Phone]
   - Profile photo URL [Single line text]
   - Waiver signed [Checkbox]
   - Waiver signed at [Date]
   - Waiver signature name [Single line text]
   - SPCA receipt URL [Single line text]
   - SPCA receipt status [Single select: Pending / Approved / Rejected]
   - Registration status [Single select: Pending payment / Active / Inactive]
   - Amount paid [Currency]
   - Registered at [Date]

   **CPs** (Control Points)
   - Name [Single line text]
   - Discipline [Single select: Hiking / Biking / Paddling / Sponsored]
   - Chain position [Number]
   - Status [Single select: Pending / Live / Removed]
   - Latitude [Number, precision 6]
   - Longitude [Number, precision 6]
   - Location description [Single line text]
   - Difficulty [Number] (1–5, set by the racer who places it)
   - Placed by [Link → Racers]
   - Last verified at [Date]

   **Proof Submissions**
   - Racer [Link → Racers]
   - CP [Link → CPs]
   - Photo URL [Single line text]
   - Latitude [Number, precision 6]
   - Longitude [Number, precision 6]
   - Distance (m) [Number]
   - Status [Single select: Verified / Rejected / Pending]
   - Submitted at [Date]

   **Photos** (gallery)
   - Racer [Link → Racers]
   - Photo URL [Single line text]
   - Caption [Single line text]
   - Discipline [Single select: Hiking / Biking / Paddling]
   - CP [Link → CPs]
   - Location [Single line text]
   - Status [Single select: Pending review / Approved / Rejected]
   - Likes [Number]
   - Photo of the week [Checkbox]
   - Posted at [Date]

   **Swag Orders**
   - Stripe session [Single line text]
   - Email [Email]
   - Amount paid [Currency]
   - Status [Single select: New / Printing / Shipped]
   - Ordered at [Date]

   (Add **Teams**, **Sponsors**, **Email Campaigns** later as you need them.)

### 3. Cloudinary — photo hosting
You already use this in your employee app, so reuse that account.
1. Put your cloud name / API key / API secret into the three `CLOUDINARY_*` vars.
2. The code uploads race photos into a `ygtar` folder so they stay separate from
   your employee app's assets.

### 4. Stripe — payments
1. You already have an account. Grab your **Secret key** → `STRIPE_SECRET_KEY`
   (use the `sk_test_` key while testing).
2. No products to pre-create — the code builds line items on the fly
   ($5/racer registration; swag passed in from the store screen).
3. Create a **webhook**: Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://YOUR-VERCEL-APP.vercel.app/api/stripe-webhook`
   - Event: `checkout.session.completed`
   - Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.

### 5. Resend — email
1. Create an API key → `RESEND_API_KEY`.
2. Verify your sending domain (so mail from `info@naturalselectionar.com` lands).
3. Set `FROM_EMAIL=info@naturalselectionar.com`.

### 6. Twilio — SMS
1. From your existing account, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   and your Twilio number as `TWILIO_FROM_NUMBER` (E.164 format, e.g. +1506…).

### 7. Deploy
1. Push this folder to a **GitHub** repo.
2. In Vercel, **Import** the repo (same as your other apps — push = deploy).
3. Add every variable from `.env.example` under Project → Settings → Environment Variables.
4. Point your domain at the Vercel project.
5. Update the webhook URL and the widget URL to your real Vercel/domain address.

### 8. Embed the website widget
On your Bluehost site, add:
```html
<div id="ygtar-scoreboard"></div>
<script src="https://YOUR-VERCEL-APP.vercel.app/widgets/scoreboard.js"></script>
```

---

## Security notes (worth not skipping)
- `CLOUDINARY_API_SECRET`, `STRIPE_SECRET_KEY`, `AIRTABLE_TOKEN`, `TWILIO_AUTH_TOKEN`,
  and `JWT_SECRET` are **server-side only** — they live in Vercel env vars and never
  ship to the browser.
- `cloudinary-sign.js` should confirm the racer is logged in before signing (there's a
  commented hook for it) so nobody can burn your free tier with forged signatures.
- `save-cp-photo.js` reads GPS from the **original** file at upload time, because
  Cloudinary strips EXIF — that's what keeps your CP verification honest.

## Where the prototype screens fit
Each screen you built maps to endpoints above. Easiest path: bring them in one at a
time (registration first, then CP submission, then gallery), wiring each screen's
buttons to the matching `/api/...` call. Happy to port them in that order whenever
you're ready.
