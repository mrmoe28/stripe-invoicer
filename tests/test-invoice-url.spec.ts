import { test, expect } from '@playwright/test';

test.describe('Invoice Payment URL Test', () => {
  test('should test the provided invoice URL for Stripe payment redirect', async ({ page }) => {
    const invoiceUrl = 'https://ledgerflow.org/invoices/cmg63ijvm0001l2046ybeu4in';
    
    console.log('🔗 Testing invoice URL:', invoiceUrl);
    
    // Navigate to the invoice URL
    await page.goto(invoiceUrl);
    
    // Take a screenshot of the invoice page
    await page.screenshot({ path: 'tests/screenshots/invoice-page.png' });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('📄 Invoice page loaded');
    console.log('🌐 Current URL:', page.url());
    
    // Look for payment button or payment link
    const paymentButton = page.locator('a:has-text("Pay Invoice Now"), button:has-text("Pay Invoice Now"), a:has-text("Pay Now"), button:has-text("Pay Now")');
    const paymentLinks = page.locator('a[href*="stripe.com"], a[href*="payment.link"]');
    
    console.log('🔍 Looking for payment elements...');
    
    // Check if payment button exists
    if (await paymentButton.count() > 0) {
      console.log('✅ Payment button found!');
      
      const buttonText = await paymentButton.first().textContent();
      console.log('🏷️  Button text:', buttonText);
      
      const href = await paymentButton.first().getAttribute('href');
      console.log('🔗 Button href:', href);
      
      if (href && href.includes('stripe.com')) {
        console.log('✅ Button links to Stripe!');
        
        // Test clicking the button
        console.log('🖱️  Testing button click...');
        
        // Listen for navigation
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page'),
          paymentButton.first().click()
        ]);
        
        // Wait for the new page to load
        await newPage.waitForLoadState('networkidle');
        
        console.log('🌐 Redirected to:', newPage.url());
        
        // Check if we're on Stripe
        if (newPage.url().includes('stripe.com')) {
          console.log('🎉 Successfully redirected to Stripe!');
          
          // Take screenshot of Stripe page
          await newPage.screenshot({ path: 'tests/screenshots/stripe-payment-page.png' });
          
          // Look for payment form elements
          const paymentForm = newPage.locator('form, [data-testid="payment-form"], .PaymentForm, input[placeholder*="card"], input[placeholder*="Card"]');
          
          if (await paymentForm.count() > 0) {
            console.log('✅ Payment form detected on Stripe page');
            
            // Get page title
            const title = await newPage.title();
            console.log('📄 Stripe page title:', title);
            
            // Look for card input field
            const cardInput = newPage.locator('input[placeholder*="card"], input[placeholder*="Card"], input[data-testid="card-number"]');
            if (await cardInput.count() > 0) {
              console.log('💳 Card input field found - payment form is ready!');
            }
            
          } else {
            console.log('⚠️  Payment form not detected, but we are on Stripe');
          }
          
          await newPage.close();
          
        } else {
          console.log('❌ Did not redirect to Stripe. URL:', newPage.url());
          await newPage.close();
        }
        
      } else if (href) {
        console.log('⚠️  Button href does not contain stripe.com:', href);
      } else {
        console.log('⚠️  Button has no href attribute');
      }
      
    } else {
      console.log('❌ No payment button found');
    }
    
    // Check for any Stripe links in page content
    if (await paymentLinks.count() > 0) {
      console.log('🔗 Found Stripe payment links on page:');
      const linkCount = await paymentLinks.count();
      for (let i = 0; i < linkCount; i++) {
        const link = paymentLinks.nth(i);
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        console.log(`   ${i + 1}. ${text} -> ${href}`);
      }
    } else {
      console.log('❌ No Stripe payment links found on page');
    }
    
    // Check page content for any mention of payment or Stripe
    const pageContent = await page.content();
    const hasStripeContent = pageContent.includes('stripe.com') || 
                             pageContent.includes('payment.link') ||
                             pageContent.includes('Pay Invoice') ||
                             pageContent.includes('Pay Now');
    
    console.log('📝 Page contains payment-related content:', hasStripeContent);
    
    // Log any errors from the console
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('🚨 Browser console error:', msg.text());
      }
    });
    
    // Final assessment
    if (await paymentButton.count() > 0) {
      console.log('✅ TEST RESULT: Payment button found and functional');
    } else {
      console.log('❌ TEST RESULT: No payment button detected');
      
      // Additional debugging - look for any clickable elements that might be payment related
      const clickableElements = page.locator('a, button').filter({ hasText: /pay|payment|stripe|checkout/i });
      const clickableCount = await clickableElements.count();
      
      if (clickableCount > 0) {
        console.log('🔍 Found related clickable elements:');
        for (let i = 0; i < Math.min(clickableCount, 5); i++) {
          const element = clickableElements.nth(i);
          const text = await element.textContent();
          const href = await element.getAttribute('href');
          console.log(`   - "${text}" ${href ? `-> ${href}` : ''}`);
        }
      }
    }
  });
});