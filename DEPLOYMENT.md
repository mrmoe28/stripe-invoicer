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

1. Connect your GitHub repository to Vercel
2. Set the environment variables in Vercel dashboard
3. Deploy from the main branch

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