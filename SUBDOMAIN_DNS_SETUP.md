# Setting Up mail.ledgerflow.org Subdomain for Resend

## Step 1: Add DNS Records in Your Domain Provider

You need to add these DNS records where your domain is hosted (Vercel, Cloudflare, Namecheap, etc.):

### Required DNS Records for Resend

1. **MX Record** (for receiving emails)
```
Type: MX
Host/Name: mail
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: 3600 (or Auto)
```

2. **SPF Record** (for email authentication)
```
Type: TXT
Host/Name: mail
Value: v=spf1 include:amazonses.com ~all
TTL: 3600 (or Auto)
```

3. **DKIM Records** (Resend will provide these)
```
Type: CNAME
Host/Name: resend._domainkey.mail
Value: [Will be provided by Resend]
TTL: 3600 (or Auto)

Type: CNAME  
Host/Name: resend2._domainkey.mail
Value: [Will be provided by Resend]
TTL: 3600 (or Auto)

Type: CNAME
Host/Name: resend3._domainkey.mail
Value: [Will be provided by Resend]
TTL: 3600 (or Auto)
```

## Step 2: Add Domain in Resend Dashboard

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter: `mail.ledgerflow.org`
4. Select your region (usually US East)
5. Click "Add"

## Step 3: Copy DNS Records from Resend

After adding the domain, Resend will show you:

1. **3 CNAME records** for DKIM authentication
2. **1 TXT record** for domain verification

Copy these and add them to your DNS provider.

## Step 4: Verify Domain in Resend

1. After adding all DNS records, wait 5-30 minutes for DNS propagation
2. In Resend dashboard, click "Verify DNS Records"
3. All records should show green checkmarks

## Step 5: Update Your Vercel Environment Variables

Go to your Vercel project settings and update:

```bash
NOTIFICATION_FROM_EMAIL=notifications@mail.ledgerflow.org
```

## DNS Setup by Provider

### If Using Vercel Domains:
1. Go to https://vercel.com/dashboard/domains
2. Click on `ledgerflow.org`
3. Go to "DNS Records" tab
4. Add the records above

### If Using Cloudflare:
1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to "DNS" → "Records"
4. Click "Add Record"
5. Add each record listed above

### If Using Namecheap:
1. Sign in to Namecheap
2. Go to "Domain List"
3. Click "Manage" next to ledgerflow.org
4. Go to "Advanced DNS"
5. Add the records above

## Verification Checklist

- [ ] Added MX record for mail subdomain
- [ ] Added SPF TXT record
- [ ] Added 3 DKIM CNAME records from Resend
- [ ] Added domain verification TXT record from Resend
- [ ] Waited for DNS propagation (5-30 minutes)
- [ ] Verified domain in Resend dashboard (all green checkmarks)
- [ ] Updated NOTIFICATION_FROM_EMAIL in Vercel to use @mail.ledgerflow.org

## Testing

Once verified, test by:
1. Sending a test email from your application
2. Check the email headers - should show:
   - From: notifications@mail.ledgerflow.org
   - SPF: PASS
   - DKIM: PASS

## Troubleshooting

### DNS Not Propagating?
- Use [dnschecker.org](https://dnschecker.org) to check if records are visible
- DNS can take up to 48 hours, but usually 5-30 minutes

### Resend Shows "Pending"?
- Double-check all DNS records match exactly what Resend provided
- Make sure you're adding records for `mail` subdomain, not the root domain

### Still Getting Spam Warnings?
- Ensure all environment variables in Vercel are updated
- Redeploy your application after updating environment variables
- Clear any email service caches

## Need Help?

- [Resend DNS Documentation](https://resend.com/docs/dashboard/domains/introduction)
- [Resend Support](https://resend.com/support)
- DNS Provider Support (Vercel/Cloudflare/etc.)