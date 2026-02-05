# Production Deployment Guide

## Environment Variables for Production

The following environment variables must be set in your production deployment platform (Vercel, Netlify, Railway, etc.):

### Critical URLs (Fix for Authentication Issues)
```bash
NEXTAUTH_URL="https://ledgerflow.org"
NEXT_PUBLIC_APP_URL="https://ledgerflow.org"
APP_BASE_URL="https://ledgerflow.org"
```

### Database
```bash
DATABASE_URL="postgresql://username:password@your-neon-endpoint.neon.tech/dbname?sslmode=require"
```

### Authentication
```bash
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET_HERE"
```

### Stripe
```bash
STRIPE_SECRET_KEY="sk_live_YOUR_STRIPE_SECRET_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"
```

### Email & Messaging
```bash
RESEND_API_KEY="re_YOUR_RESEND_API_KEY_HERE"
# IMPORTANT: Use a subdomain like mail.ledgerflow.org to avoid spam filters
NOTIFICATION_FROM_EMAIL="notifications@mail.ledgerflow.org"
NOTIFICATION_FROM_NAME="Ledgerflow"
INVOICE_ALERT_RECIPIENTS="your-email@domain.com"

TWILIO_ACCOUNT_SID="YOUR_TWILIO_ACCOUNT_SID_HERE"
TWILIO_AUTH_TOKEN="YOUR_TWILIO_AUTH_TOKEN_HERE"
TWILIO_MESSAGING_SERVICE_SID="YOUR_TWILIO_MESSAGING_SERVICE_SID_HERE"
TWILIO_FROM_NUMBER="+1YOUR_TWILIO_PHONE_NUMBER"
```

## Vercel Deployment

### Link this repo so Vercel recognizes the project

1. In **Vercel Dashboard** → **Add New** → **Project** (or open your existing Ledgerflow / stripe-invoicer project).
2. **Import** from Git and select the repo: **mrmoe28/stripe-invoicer** (this repo). Branch: **main**.
3. Confirm **Root Directory** is **.** (project root). Do not use a subfolder.
4. In **Project Settings** → **General** → **Build Cache**: click **Clear Build Cache**, then trigger a new deployment (Deployments → ⋮ on latest → Redeploy, or push a commit).

### If deployments don’t start on push

- In **Project Settings** → **Git**: ensure **Connected Git Repository** is **mrmoe28/stripe-invoicer** and the **Production Branch** is **main**.
- This repo includes a **vercel.json** (framework: nextjs, pnpm) so Vercel detects the project correctly.

### Deploy steps

1. Connect the GitHub repo **mrmoe28/stripe-invoicer** to Vercel (see above).
2. Set the environment variables in the Vercel dashboard.
3. Deploy from the **main** branch (auto-deploys on push, or deploy manually).

### If build fails: "STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_NEW is not set"

The build fails during "Collecting page data" for `/api/invoices` when these env vars are missing. Set them so the build succeeds:

- **Local build:** Create `.env.local` in the project root with:
  - `STRIPE_SECRET_KEY=sk_test_build_placeholder`
  - `STRIPE_SECRET_KEY_NEW=` (empty is fine)
- **Vercel / CI:** Add in Vercel → Project → Settings → Environment Variables (for Production, Preview, Development):
  - **STRIPE_SECRET_KEY** — Use your Stripe secret key, or a placeholder for build only (e.g. `sk_test_build_placeholder`) if you use Square only and don't need Stripe.
  - **STRIPE_SECRET_KEY_NEW** — Optional; only if you use key rotation.

Then redeploy (or run `pnpm run build` again locally).

## Manual Environment Setup

Copy `.env.production` to your deployment platform or use the individual variables above.

## Fixes Applied

1. **Authentication redirect fix**: Updated sign-up form to use `window.location.href` for reliable navigation
2. **Production URLs**: All environment variables now use `https://ledgerflow.org` instead of localhost
3. **Secure cookies**: NextAuth configured to use secure cookies in production
4. **Debug mode**: Disabled in production for better performance
5. **Email URLs fixed**: Invoice notification emails now use production URLs instead of localhost:3000
6. **Email subdomain**: Configured to use mail.ledgerflow.org subdomain to avoid spam filters

## Testing

After deployment, test:
1. Sign-up flow: Should redirect to dashboard after successful account creation
2. Sign-in flow: Should authenticate and redirect properly
3. All API endpoints should return correct responses