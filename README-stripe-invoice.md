## Stripe Invoice Paylink (Checkout) — Quick Start

1) Env:
   - STRIPE_SECRET_KEY=sk_test_***
   - STRIPE_WEBHOOK_SECRET=whsec_***
   - For local: NEXT_PUBLIC_SITE_URL=http://localhost:3000
   - On Vercel: remove NEXT_PUBLIC_SITE_URL; `https://${VERCEL_URL}` will be used.

2) Start dev:
   - pnpm dev

3) Create a Checkout URL for a given invoice:
   curl -X POST http://localhost:3000/api/checkout \
     -H "Content-Type: application/json" \
     -d '{
       "invoiceId": "INV-1008",
       "amount_cents": 2599,
       "currency": "usd",
       "customer_email": "customer@example.com",
       "description": "Consulting invoice #INV-1008"
     }'

   Response: { "url": "https://checkout.stripe.com/c/pay_cs_..." }

   Put that URL in your email button.

4) Webhook:
   - In Stripe Dashboard → Developers → Webhooks, add an endpoint:
     https://YOUR-DOMAIN/api/webhooks/stripe
     Events: at least `checkout.session.completed`
   - Use the signing secret as STRIPE_WEBHOOK_SECRET.
   - On success, we mark invoice paid (replace demo store with your DB write).

5) Common gotchas:
   - Use LIVE keys for production emails; TEST keys only work in test mode.
   - success_url/cancel_url must be full HTTPS in production.
   - Each invoice should create its own Checkout Session to track status cleanly.