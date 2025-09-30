#!/bin/bash

# Email Subdomain Setup Script for ledgerflow.org
# This script helps set up mail.ledgerflow.org for Resend email delivery

echo "🚀 Email Subdomain Setup for Resend"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl is required but not installed${NC}"
    exit 1
fi

echo -e "${BLUE}📋 DNS Records Needed for mail.ledgerflow.org${NC}"
echo ""
echo "Add these DNS records to your domain provider:"
echo ""
echo "1. MX Record:"
echo "   Host: mail"
echo "   Value: feedback-smtp.us-east-1.amazonses.com"
echo "   Priority: 10"
echo ""
echo "2. SPF Record:"
echo "   Type: TXT"
echo "   Host: mail"
echo "   Value: v=spf1 include:amazonses.com ~all"
echo ""
echo "3. DKIM Records (Get these from Resend after adding domain):"
echo "   Type: CNAME"
echo "   Host: resend._domainkey.mail"
echo "   Value: [From Resend]"
echo ""
echo "   Type: CNAME"
echo "   Host: resend2._domainkey.mail"  
echo "   Value: [From Resend]"
echo ""
echo "   Type: CNAME"
echo "   Host: resend3._domainkey.mail"
echo "   Value: [From Resend]"
echo ""

# Check DNS propagation
echo -e "${BLUE}🔍 Checking DNS propagation...${NC}"
echo ""

# Check if mail subdomain exists
if nslookup mail.ledgerflow.org > /dev/null 2>&1; then
    echo -e "${GREEN}✅ mail.ledgerflow.org DNS exists${NC}"
else
    echo -e "${YELLOW}⚠️  mail.ledgerflow.org DNS not yet configured${NC}"
fi

# Check MX record
echo "Checking MX record for mail.ledgerflow.org..."
if dig MX mail.ledgerflow.org +short | grep -q "amazonses.com"; then
    echo -e "${GREEN}✅ MX record configured correctly${NC}"
else
    echo -e "${YELLOW}⚠️  MX record not yet configured${NC}"
fi

# Check SPF record
echo "Checking SPF record for mail.ledgerflow.org..."
if dig TXT mail.ledgerflow.org +short | grep -q "amazonses.com"; then
    echo -e "${GREEN}✅ SPF record configured correctly${NC}"
else
    echo -e "${YELLOW}⚠️  SPF record not yet configured${NC}"
fi

echo ""
echo -e "${BLUE}📧 Next Steps:${NC}"
echo ""
echo "1. Add the DNS records above to your domain provider"
echo "2. Go to https://resend.com/domains"
echo "3. Click 'Add Domain' and enter: mail.ledgerflow.org"
echo "4. Copy the DKIM records from Resend and add them to DNS"
echo "5. Wait 5-30 minutes for DNS propagation"
echo "6. Verify the domain in Resend dashboard"
echo ""
echo -e "${GREEN}🎉 Once verified, your emails will be properly authenticated!${NC}"
echo ""

# Test Resend API if key is available
if [ ! -z "$RESEND_API_KEY" ]; then
    echo -e "${BLUE}🧪 Testing Resend API connection...${NC}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        https://api.resend.com/domains)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Resend API connection successful${NC}"
        
        # List domains
        echo "Current domains in Resend:"
        curl -s -X GET \
            -H "Authorization: Bearer $RESEND_API_KEY" \
            https://api.resend.com/domains | \
            python3 -m json.tool 2>/dev/null || echo "No domains found or JSON parsing failed"
    else
        echo -e "${YELLOW}⚠️  Resend API connection failed (HTTP $response)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  RESEND_API_KEY not found in environment${NC}"
fi

echo ""
echo -e "${BLUE}📖 For detailed instructions, see:${NC}"
echo "- SUBDOMAIN_DNS_SETUP.md"
echo "- RESEND_EMAIL_SETUP.md"
echo ""