# Resend Email Configuration Guide

## Current Issues to Fix

Based on Resend email insights, you have two main issues:

### 1. ❌ Link URLs Don't Match Sending Domain
- **Problem**: Your emails contain `localhost:3000` or incorrect URLs while sending from `ledgerflow.org`
- **Impact**: Triggers spam filters and reduces deliverability

### 2. ⚠️ Not Using a Subdomain
- **Problem**: Sending from root domain instead of a subdomain
- **Impact**: Can affect domain reputation and email deliverability

## Step-by-Step Fix

### Step 1: Set Up Email Subdomain in Your DNS

Add these DNS records to your domain provider (Vercel, Cloudflare, etc.):

```
Type: MX
Name: mail (or mail.ledgerflow.org)
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: 3600
```

```
Type: TXT
Name: mail (or mail.ledgerflow.org)
Value: "v=spf1 include:amazonses.com ~all"
TTL: 3600
```

### Step 2: Configure Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add new domain: `mail.ledgerflow.org`
3. Follow Resend's verification steps
4. Wait for DNS propagation (5-30 minutes)

### Step 3: Update Vercel Environment Variables

In your Vercel project settings, update these variables:

```bash
# CRITICAL - Must be production URL
NEXT_PUBLIC_APP_URL=https://ledgerflow.org
APP_BASE_URL=https://ledgerflow.org

# Email configuration - Use subdomain
NOTIFICATION_FROM_EMAIL=notifications@mail.ledgerflow.org
NOTIFICATION_FROM_NAME=Ledgerflow

# Your Resend API key (keep existing)
RESEND_API_KEY=re_YOUR_API_KEY_HERE
```

### Step 4: Code Updates Already Applied

✅ We've already fixed these in the code:
- `lib/services/invoice-notification-service.ts` - Uses production URLs
- `lib/services/payment-link-service.ts` - Uses production URLs  
- `lib/services/notification-service.ts` - Uses subdomain for sender

### Step 5: Verify the Fix

After deploying with updated environment variables:

1. Send a test invoice
2. Check Resend dashboard for new email
3. Click "Insights" tab
4. Verify no more warnings about:
   - Link/domain mismatch
   - Missing subdomain

## Environment Variable Checklist

Make sure ALL of these are set in Vercel:

- [ ] `NEXT_PUBLIC_APP_URL` = `https://ledgerflow.org`
- [ ] `APP_BASE_URL` = `https://ledgerflow.org`
- [ ] `NEXTAUTH_URL` = `https://ledgerflow.org`
- [ ] `NOTIFICATION_FROM_EMAIL` = `notifications@mail.ledgerflow.org`
- [ ] `NOTIFICATION_FROM_NAME` = `Ledgerflow`
- [ ] `RESEND_API_KEY` = Your actual Resend API key

## Testing Email Delivery

Once configured, test with:

1. Create a test invoice
2. Send to your email
3. Check that:
   - Email arrives in inbox (not spam)
   - Links point to `https://ledgerflow.org`
   - Sender shows as `Ledgerflow <notifications@mail.ledgerflow.org>`

## Troubleshooting

If emails still have issues:

1. **Check DNS propagation**: Use [dnschecker.org](https://dnschecker.org) to verify records
2. **Verify in Resend**: Domain should show as "Verified" in Resend dashboard
3. **Check environment variables**: Ensure Vercel has redeployed with new values
4. **Clear Resend cache**: Sometimes Resend caches old configurations

## Support Links

- [Resend DNS Setup](https://resend.com/docs/dashboard/domains/introduction)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [SPF Record Guide](https://resend.com/docs/dashboard/domains/spf)