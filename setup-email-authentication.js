#!/usr/bin/env node

// Email Authentication Setup Script
// Sets up SPF, DKIM, and DMARC records for better deliverability

const { execSync } = require('child_process');

console.log('🔐 Email Authentication Setup');
console.log('==============================');
console.log('');

function runCommand(command) {
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return result.trim();
  } catch (error) {
    return null;
  }
}

function checkDNS(type, domain, expectedContent) {
  console.log(`🔍 Checking ${type} record for ${domain}...`);
  
  let command;
  switch(type) {
    case 'SPF':
      command = `dig TXT ${domain} +short`;
      break;
    case 'DMARC':
      command = `dig TXT _dmarc.${domain} +short`;
      break;
    case 'DKIM':
      command = `dig CNAME resend._domainkey.${domain} +short`;
      break;
    default:
      return false;
  }
  
  const result = runCommand(command);
  
  if (result && (expectedContent ? result.includes(expectedContent) : true)) {
    console.log(`✅ ${type} record found: ${result}`);
    return true;
  } else {
    console.log(`❌ ${type} record not found or incorrect`);
    return false;
  }
}

// Check current DNS status
console.log('📋 Current DNS Authentication Status:');
console.log('');

const domain = 'ledgerflow.org';
const spfExists = checkDNS('SPF', domain, 'spf1');
const dmarcExists = checkDNS('DMARC', domain);
const dkimExists = checkDNS('DKIM', domain);

console.log('');
console.log('📝 DNS Records to Add:');
console.log('');

if (!spfExists) {
  console.log('🔴 SPF Record (Missing):');
  console.log('   Type: TXT');
  console.log('   Host: @ (or root domain)');
  console.log('   Value: v=spf1 include:_spf.resend.com ~all');
  console.log('   TTL: 3600');
  console.log('');
  
  console.log('   📋 What this does:');
  console.log('   - Authorizes Resend to send emails from your domain');
  console.log('   - Prevents email spoofing');
  console.log('   - Improves deliverability to major email providers');
  console.log('');
}

if (!dmarcExists) {
  console.log('🔴 DMARC Record (Missing):');
  console.log('   Type: TXT');
  console.log('   Host: _dmarc');
  console.log('   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@ledgerflow.org; sp=quarantine; adkim=r; aspf=r');
  console.log('   TTL: 3600');
  console.log('');
  
  console.log('   📋 What this does:');
  console.log('   - Tells email providers how to handle unauthenticated emails');
  console.log('   - Provides reports on email authentication');
  console.log('   - Significantly reduces spam classification');
  console.log('');
}

if (!dkimExists) {
  console.log('🔴 DKIM Records (Missing):');
  console.log('   ⚠️  Get these from Resend Dashboard:');
  console.log('   1. Go to https://resend.com/domains');
  console.log('   2. Click on ledgerflow.org');
  console.log('   3. Copy the 3 CNAME records');
  console.log('   4. Add them to your DNS provider');
  console.log('');
  
  console.log('   📋 What this does:');
  console.log('   - Digitally signs your emails');
  console.log('   - Verifies email content hasn\'t been tampered with');
  console.log('   - Required by most email providers for inbox delivery');
  console.log('');
}

console.log('🚀 Implementation Steps:');
console.log('');

console.log('Step 1: Add DNS Records');
console.log('- Log into your DNS provider (Vercel/Cloudflare/etc.)');
console.log('- Add the records shown above');
console.log('- Wait 5-30 minutes for propagation');
console.log('');

console.log('Step 2: Verify in Resend');
console.log('- Go to Resend Dashboard → Domains');
console.log('- Click "Verify" next to ledgerflow.org');
console.log('- All records should show green checkmarks');
console.log('');

console.log('Step 3: Test Email Deliverability');
console.log('- Send test emails to Gmail, Outlook, Yahoo');
console.log('- Check spam folders');
console.log('- Use mail-tester.com for scoring');
console.log('');

// Check if Resend API is available
const resendKey = process.env.RESEND_API_KEY;
if (resendKey) {
  console.log('🧪 Testing Resend API Connection...');
  
  try {
    const testCommand = `curl -s -X GET -H "Authorization: Bearer ${resendKey}" https://api.resend.com/domains`;
    const result = runCommand(testCommand);
    
    if (result) {
      console.log('✅ Resend API connected successfully');
      console.log('📊 Current domains in your Resend account:');
      
      try {
        const domains = JSON.parse(result);
        if (domains.data && domains.data.length > 0) {
          domains.data.forEach(domain => {
            console.log(`   - ${domain.name}: ${domain.status}`);
          });
        } else {
          console.log('   - No domains found');
        }
      } catch (e) {
        console.log('   - Unable to parse domain list');
      }
    }
  } catch (error) {
    console.log('❌ Unable to connect to Resend API');
  }
  
  console.log('');
}

console.log('📊 Email Authentication Scorecard:');
console.log('');
console.log(`SPF Record:  ${spfExists ? '✅ PASS' : '❌ FAIL'}`);
console.log(`DKIM Records: ${dkimExists ? '✅ PASS' : '❌ FAIL'}`);
console.log(`DMARC Policy: ${dmarcExists ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

const score = [spfExists, dkimExists, dmarcExists].filter(Boolean).length;
const total = 3;
console.log(`📈 Authentication Score: ${score}/${total} (${Math.round(score/total*100)}%)`);
console.log('');

if (score === total) {
  console.log('🎉 Excellent! Your email authentication is fully configured.');
  console.log('   Emails should now have much better deliverability.');
} else if (score >= 2) {
  console.log('⚠️  Good progress! Add the missing records to achieve 100% authentication.');
} else {
  console.log('🔴 Email authentication needs immediate attention.');
  console.log('   Current setup may cause emails to go to spam.');
}

console.log('');
console.log('💡 Pro Tips:');
console.log('- Start with SPF record - easiest to implement');
console.log('- DKIM has the biggest impact on deliverability');
console.log('- DMARC provides the best long-term protection');
console.log('- Test with multiple email providers');
console.log('- Monitor email metrics in Resend dashboard');
console.log('');

console.log('📖 Next: Run node optimize-email-content.js');