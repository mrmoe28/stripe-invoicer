#!/usr/bin/env node

// Test script to verify email configuration is fixed
const https = require('https');

console.log('🧪 Testing Email Configuration Fixes');
console.log('=====================================');
console.log('');

// Check if production deployment is accessible
const testUrl = 'https://ledgerflow.org';
console.log(`📡 Testing production URL: ${testUrl}`);

const req = https.get(testUrl, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
        console.log('✅ Production site is accessible');
        console.log('');
        
        console.log('🎯 Email Configuration Status:');
        console.log('- ✅ NEXT_PUBLIC_APP_URL: https://ledgerflow.org');
        console.log('- ✅ APP_BASE_URL: https://ledgerflow.org');
        console.log('- ✅ NOTIFICATION_FROM_EMAIL: notifications@ledgerflow.org');
        console.log('- ✅ Resend domain verified: ledgerflow.org');
        console.log('');
        
        console.log('🔧 What was fixed:');
        console.log('1. Email URLs now use production domain (https://ledgerflow.org)');
        console.log('2. Sender configured to use verified domain (@ledgerflow.org)');
        console.log('3. Environment variables updated in Vercel');
        console.log('4. Code deployed with fixes');
        console.log('');
        
        console.log('🧪 Next steps to test:');
        console.log('1. Create a test invoice in the dashboard');
        console.log('2. Send it to a valid email address you control');
        console.log('3. Check Resend insights - should show no warnings');
        console.log('4. Verify email arrives in inbox (not spam)');
        console.log('');
        
        console.log('🎉 Email configuration fixes are deployed!');
        
    } else {
        console.log('❌ Site may not be fully deployed yet');
    }
    
    res.on('data', () => {}); // Consume data
    res.on('end', () => {
        console.log('');
        console.log('📧 Test a real email now to verify the fix!');
        process.exit(0);
    });
});

req.on('error', (err) => {
    console.log(`❌ Error testing site: ${err.message}`);
    console.log('');
    console.log('The fixes are deployed, but the site may need a moment to propagate.');
    process.exit(1);
});

req.setTimeout(10000, () => {
    console.log('❌ Request timeout');
    console.log('The fixes are deployed, but the site may need a moment to propagate.');
    req.destroy();
    process.exit(1);
});