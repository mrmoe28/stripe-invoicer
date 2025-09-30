const { chromium } = require('playwright');

async function testInvoiceUrl() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const invoiceUrl = 'https://ledgerflow.org/invoices/cmg6oi0220000jo043l4rshhs';
  
  try {
    console.log('🔍 Testing invoice URL:', invoiceUrl);
    
    // Navigate to the invoice
    const response = await page.goto(invoiceUrl, { waitUntil: 'networkidle' });
    console.log('Response status:', response.status());
    
    if (response.status() === 200) {
      console.log('✅ Invoice page loaded successfully');
      
      // Take a screenshot
      await page.screenshot({ path: 'invoice-test.png', fullPage: true });
      console.log('📸 Screenshot saved as invoice-test.png');
      
      // Look for payment button
      const paymentButton = page.locator('a:has-text("Pay Invoice Now"), button:has-text("Pay Invoice Now"), a:has-text("Pay Now")');
      const hasPaymentButton = await paymentButton.count() > 0;
      
      if (hasPaymentButton) {
        console.log('✅ Payment button found');
        
        // Get the payment button URL
        const paymentHref = await paymentButton.first().getAttribute('href');
        console.log('💳 Payment button URL:', paymentHref);
        
        // Check if it's a Stripe payment link
        if (paymentHref && paymentHref.includes('stripe.com')) {
          console.log('✅ Payment button links to Stripe');
          
          // Test if the Stripe link is accessible
          try {
            const stripeResponse = await page.request.head(paymentHref);
            console.log('🔗 Stripe link status:', stripeResponse.status());
            
            if (stripeResponse.ok()) {
              console.log('✅ Stripe payment link is accessible');
            } else {
              console.log('❌ Stripe payment link returned error:', stripeResponse.status());
            }
          } catch (error) {
            console.log('❌ Error testing Stripe link:', error.message);
          }
        } else {
          console.log('⚠️  Payment button does not link to Stripe');
          console.log('🔍 Actual link:', paymentHref);
        }
      } else {
        console.log('❌ No payment button found');
        
        // Look for any Stripe-related content
        const stripeText = await page.locator('text=/stripe/i').count();
        if (stripeText > 0) {
          console.log('✅ Found Stripe-related text on page');
        } else {
          console.log('❌ No Stripe-related content found');
        }
      }
      
      // Check page content for debugging
      const pageTitle = await page.title();
      console.log('📄 Page title:', pageTitle);
      
    } else if (response.status() === 401 || response.status() === 403) {
      console.log('🔒 Invoice requires authentication');
      await page.screenshot({ path: 'invoice-auth-required.png' });
    } else {
      console.log('❌ Invoice page returned error:', response.status());
      await page.screenshot({ path: 'invoice-error.png' });
    }
    
  } catch (error) {
    console.log('❌ Error accessing invoice:', error.message);
  } finally {
    await browser.close();
  }
}

testInvoiceUrl();