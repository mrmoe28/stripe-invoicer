const { chromium } = require('playwright');

async function openStripePayment() {
  console.log('🚀 Opening Stripe payment page...');
  
  const browser = await chromium.launch({ 
    headless: false, // Open in visible browser
    slowMo: 1000 // Slow down for better visibility
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:3001');
    
    // Check if we need to sign in
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('sign-in') || await page.locator('a[href="/sign-in"]').isVisible()) {
      console.log('🔐 Sign-in required. Please sign in manually to continue...');
      
      // Navigate to sign-in if not already there
      if (!currentUrl.includes('sign-in')) {
        await page.goto('http://localhost:3001/sign-in');
      }
      
      // Wait for user to sign in (detect when URL changes to dashboard)
      console.log('⏳ Waiting for sign-in...');
      await page.waitForURL('**/dashboard', { timeout: 60000 });
      console.log('✅ Signed in successfully!');
    }
    
    // Navigate to invoices
    console.log('📄 Navigating to invoices...');
    await page.goto('http://localhost:3001/invoices');
    
    // Look for existing invoices
    const invoiceRows = await page.locator('table tbody tr').count();
    console.log(`Found ${invoiceRows} existing invoices`);
    
    let invoiceUrl = null;
    
    if (invoiceRows > 0) {
      // Check if any invoice already has a payment link
      console.log('🔍 Checking existing invoices for payment links...');
      
      // Click on the first invoice to view details
      await page.click('table tbody tr:first-child a:has-text("View")');
      await page.waitForLoadState('networkidle');
      
      // Look for payment link in the page content
      const pageContent = await page.content();
      const stripeUrlMatch = pageContent.match(/(https:\/\/payment\.link\.stripe\.com\/[^"'\s<>]+)/);
      
      if (stripeUrlMatch) {
        invoiceUrl = stripeUrlMatch[1];
        console.log('✅ Found existing Stripe payment link:', invoiceUrl);
      } else {
        console.log('❌ No payment link found in existing invoice');
        
        // Try to send the invoice to generate a payment link
        const sendButton = page.locator('button:has-text("Send invoice")');
        if (await sendButton.isVisible()) {
          console.log('📧 Sending invoice to generate payment link...');
          await sendButton.click();
          await page.waitForTimeout(3000);
          
          // Check again for payment link
          const updatedContent = await page.content();
          const newStripeUrlMatch = updatedContent.match(/(https:\/\/payment\.link\.stripe\.com\/[^"'\s<>]+)/);
          if (newStripeUrlMatch) {
            invoiceUrl = newStripeUrlMatch[1];
            console.log('✅ Generated new Stripe payment link:', invoiceUrl);
          }
        }
      }
    }
    
    if (!invoiceUrl) {
      console.log('💳 Creating new invoice with payment link...');
      
      // Navigate to create new invoice
      await page.goto('http://localhost:3001/invoices/new');
      
      // Wait for the form to load
      await page.waitForSelector('form');
      
      // Fill in the invoice form
      console.log('📝 Filling invoice form...');
      
      // Select first customer
      const customerSelect = page.locator('select[name="customerId"]');
      if (await customerSelect.isVisible()) {
        await customerSelect.selectOption({ index: 1 });
      }
      
      // Fill in line item
      await page.fill('input[name="lineItems.0.description"]', 'Test Payment Service');
      await page.fill('input[name="lineItems.0.quantity"]', '1');
      await page.fill('input[name="lineItems.0.unitPrice"]', '99.99');
      
      // Enable payment link
      const paymentLinkCheckbox = page.locator('input[name="enablePaymentLink"]');
      if (await paymentLinkCheckbox.isVisible()) {
        await paymentLinkCheckbox.check();
        console.log('✅ Enabled payment link option');
      }
      
      // Set status to SENT to trigger payment link generation
      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('SENT');
      }
      
      // Save the invoice
      console.log('💾 Saving invoice...');
      await page.click('button[type="submit"]:has-text("Save")');
      
      // Wait for redirect and load
      await page.waitForURL('**/invoices/**');
      await page.waitForLoadState('networkidle');
      
      // Look for the generated payment link
      const newPageContent = await page.content();
      const finalStripeUrlMatch = newPageContent.match(/(https:\/\/payment\.link\.stripe\.com\/[^"'\s<>]+)/);
      if (finalStripeUrlMatch) {
        invoiceUrl = finalStripeUrlMatch[1];
        console.log('✅ Created invoice with payment link:', invoiceUrl);
      }
    }
    
    if (invoiceUrl) {
      console.log('🎉 Opening Stripe payment page...');
      
      // Open payment link in a new tab
      const paymentPage = await browser.newPage();
      await paymentPage.goto(invoiceUrl);
      
      // Wait for Stripe page to load
      await paymentPage.waitForLoadState('networkidle');
      
      console.log('✅ Stripe payment page opened!');
      console.log('💳 You can now test the payment flow');
      
      // Keep the browser open for manual testing
      console.log('🖱️  Browser will stay open for manual testing. Close when done.');
      
      // Wait for user interaction (don't close automatically)
      await new Promise(() => {}); // Keep running indefinitely
      
    } else {
      console.log('❌ Failed to create or find payment link');
      console.log('Please check Stripe configuration and try again');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the function
openStripePayment().catch(console.error);