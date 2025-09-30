# Stripe Webhook Configuration Guide

## Production Webhook Setup

### 1. Stripe Dashboard Configuration

1. **Login to Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Switch to **Production** mode (toggle in left sidebar)

2. **Create Webhook Endpoint**
   - Navigate to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Set endpoint URL: `https://stripe-invoicer-gamma.vercel.app/api/stripe/webhook`
   - Select events to listen for:
     - `checkout.session.completed` (Primary for Payment Links)
     - `checkout.session.expired`
     - `payment_intent.succeeded` (Fallback)
     - `payment_intent.payment_failed`

3. **Copy Webhook Secret**
   - After creating the webhook, click on it
   - Click **Reveal** next to "Signing secret"
   - Copy the secret (starts with `whsec_`)

### 2. Vercel Environment Variables

Add these environment variables in Vercel dashboard:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # Your live secret key
STRIPE_WEBHOOK_SECRET=whsec_... # The webhook signing secret from step 1.3

# App Configuration
NEXT_PUBLIC_APP_URL=https://stripe-invoicer-gamma.vercel.app
NODE_ENV=production
```

### 3. Database Migration

The payment schema has been updated with new fields. Run this in production:

```bash
# After deploying, run this to update the database schema
pnpm prisma db push
```

### 4. Testing Webhooks

Use the Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

### 5. Webhook Events Flow

1. **Customer Clicks Payment Link**
   - Redirects to Stripe Checkout
   - Customer completes payment
   - Stripe sends `checkout.session.completed` webhook

2. **Webhook Processing**
   - Verifies signature using `STRIPE_WEBHOOK_SECRET`
   - Updates invoice status to "PAID"
   - Creates payment record
   - Sends email notification

3. **Success Redirect**
   - Customer redirected to `/payment-success?invoice=<id>`
   - No authentication required for this page

### 6. Public Invoice Access

Customers can view invoices at: `/public/invoices/[invoiceId]`
- No authentication required
- Only shows SENT, OVERDUE, or PAID invoices (not DRAFT)

### 7. Security Features

- **CVE-2025-29927 Protection**: Blocks requests with `x-middleware-subrequest` header
- **Route Exclusions**: Public routes excluded from authentication middleware
- **Signature Verification**: All webhooks verified with Stripe signature

### 8. Monitoring & Debugging

Check these logs in Vercel:
- Functions → api/stripe/webhook
- Look for webhook processing logs with 🔗 emoji
- Verify invoice status updates in database

### 9. Common Issues

**Webhook 400 Errors:**
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Verify endpoint URL matches exactly
- Ensure webhook is in production mode

**Payment Success Page Redirect Issues:**
- Verify `/payment-success` is excluded from middleware
- Check `NEXT_PUBLIC_APP_URL` environment variable

**Public Invoice Access Issues:**
- Ensure `/public` routes are excluded from middleware
- Verify invoice status is not DRAFT

### 10. Test Checklist

- [ ] Webhook endpoint responds to GET with 405
- [ ] Public invoice page loads without authentication
- [ ] Payment success page loads without authentication
- [ ] Stripe webhook processes checkout.session.completed
- [ ] Invoice status updates to PAID after payment
- [ ] Email notifications sent after payment

### 11. Production Monitoring

Monitor these metrics:
- Webhook success rate (should be >99%)
- Payment completion rate
- Email delivery rate
- Public invoice access (should not redirect to login)