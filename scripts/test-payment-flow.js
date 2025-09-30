#!/usr/bin/env node

/**
 * Test script to validate the complete Stripe payment flow
 * Usage: node scripts/test-payment-flow.js [invoice-id]
 */

const VERCEL_URL = process.env.VERCEL_URL || 'https://stripe-invoicer-gamma.vercel.app';

async function testPaymentFlow(invoiceId) {
  console.log('🧪 Testing complete Stripe payment flow...\n');
  
  if (!invoiceId) {
    console.error('❌ Please provide an invoice ID as argument');
    console.log('Usage: node scripts/test-payment-flow.js [invoice-id]');
    process.exit(1);
  }

  const tests = [
    {
      name: 'Public Invoice Page Access',
      url: `${VERCEL_URL}/public/invoices/${invoiceId}`,
      expectedStatus: 200,
    },
    {
      name: 'Payment Success Page Access',
      url: `${VERCEL_URL}/payment-success?invoice=${invoiceId}`,
      expectedStatus: 200,
    },
    {
      name: 'Stripe Webhook Endpoint',
      url: `${VERCEL_URL}/api/stripe/webhook`,
      method: 'GET',
      expectedStatus: 405, // Method not allowed for GET
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        method: test.method || 'GET',
        headers: {
          'User-Agent': 'Test-Script/1.0'
        }
      });
      
      if (response.status === test.expectedStatus) {
        console.log(`   ✅ PASS - Status: ${response.status}`);
        passed++;
      } else {
        console.log(`   ❌ FAIL - Expected: ${test.expectedStatus}, Got: ${response.status}`);
        failed++;
      }

      // Log response headers for debugging
      console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Payment flow infrastructure is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }

  return failed === 0;
}

// Additional middleware security tests
async function testSecurityHeaders() {
  console.log('\n🔒 Testing security headers...');
  
  const securityTests = [
    {
      name: 'CVE-2025-29927 Protection',
      url: `${VERCEL_URL}/dashboard`,
      headers: {
        'x-middleware-subrequest': 'middleware',
        'User-Agent': 'Security-Test/1.0'
      },
      expectedStatus: 403,
    }
  ];

  for (const test of securityTests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        headers: test.headers
      });
      
      if (response.status === test.expectedStatus) {
        console.log(`   ✅ PASS - Blocked malicious request (Status: ${response.status})`);
      } else {
        console.log(`   ⚠️  UNEXPECTED - Status: ${response.status} (Expected: ${test.expectedStatus})`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
    }
  }
}

// Main execution
if (require.main === module) {
  const invoiceId = process.argv[2];
  
  (async () => {
    const success = await testPaymentFlow(invoiceId);
    await testSecurityHeaders();
    
    process.exit(success ? 0 : 1);
  })();
}

module.exports = { testPaymentFlow, testSecurityHeaders };