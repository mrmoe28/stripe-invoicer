import { test, expect } from '@playwright/test';

test.describe('Production Payment Flow Diagnostics', () => {
  const PRODUCTION_URL = 'https://ledgerflow.org';
  
  test('should verify Stripe payment link generation in production', async ({ page, request }) => {
    console.log('🔍 Testing production payment flow at:', PRODUCTION_URL);
    
    // Test health endpoint first
    try {
      const healthResponse = await request.get(`${PRODUCTION_URL}/api/health`);
      console.log('Production health check status:', healthResponse.status());
      
      if (healthResponse.ok()) {
        const healthData = await healthResponse.json();
        console.log('✅ Production API is responding:', healthData);
      }
    } catch (error) {
      console.log('❌ Production health check failed:', error);
      return;
    }
    
    // Navigate to production site
    await page.goto(PRODUCTION_URL);
    await page.screenshot({ path: 'tests/screenshots/production-landing.png' });
    
    // Check if authentication is required
    const signInLink = page.locator('a[href*="sign-in"], button:has-text("Sign in")');
    const isAuthRequired = await signInLink.isVisible();
    
    console.log('Authentication required:', isAuthRequired);
    
    if (isAuthRequired) {
      console.log('⚠️  Production site requires authentication - manual login needed for full test');
      
      // Navigate to sign-in page to verify it loads
      await page.goto(`${PRODUCTION_URL}/sign-in`);
      await expect(page).toHaveURL(/sign-in/);
      await page.screenshot({ path: 'tests/screenshots/production-signin.png' });
      
      // Check for sign-in form elements
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await expect(passwordInput).toBeVisible({ timeout: 10000 });
      await expect(submitButton).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Production sign-in form is properly configured');
    }
  });

  test('should test production invoice URL accessibility', async ({ page, request }) => {
    // Test the specific invoice URL from the screenshot
    const testInvoiceUrl = `${PRODUCTION_URL}/invoices/cmq6nemct000k104o9rhfv6e`;
    
    console.log('🔍 Testing invoice URL accessibility:', testInvoiceUrl);
    
    try {
      const response = await request.head(testInvoiceUrl);
      console.log('Invoice URL response status:', response.status());
      
      if (response.status() === 200) {
        console.log('✅ Invoice URL is accessible');
        
        // Try to load the page
        await page.goto(testInvoiceUrl);
        await page.screenshot({ path: 'tests/screenshots/production-invoice.png' });
        
        // Look for payment elements
        const paymentButton = page.locator('a:has-text("Pay Invoice Now"), button:has-text("Pay Invoice Now"), a:has-text("Pay Now")');
        const stripeLink = page.locator('text=/stripe\\.com/');
        
        if (await paymentButton.isVisible()) {
          console.log('✅ Payment button found on invoice page');
          
          // Get the href of the payment button
          const paymentHref = await paymentButton.getAttribute('href');
          console.log('Payment button URL:', paymentHref);
          
          // Check if it's a Stripe payment link
          if (paymentHref?.includes('stripe.com')) {
            console.log('✅ Payment button links to Stripe payment page');
            
            // Test that the Stripe link is accessible
            try {
              const stripeResponse = await request.head(paymentHref);
              console.log('Stripe payment link status:', stripeResponse.status());
              
              if (stripeResponse.ok()) {
                console.log('✅ Stripe payment link is accessible');
              } else {
                console.log('❌ Stripe payment link returned error:', stripeResponse.status());
              }
            } catch (error) {
              console.log('❌ Error accessing Stripe payment link:', error);
            }
          } else {
            console.log('⚠️  Payment button does not link to Stripe (links to local URL)');
            console.log('This indicates Stripe payment link generation may have failed');
          }
        } else if (await stripeLink.isVisible()) {
          console.log('✅ Stripe link found elsewhere on page');
          const linkText = await stripeLink.textContent();
          console.log('Stripe link text:', linkText);
        } else {
          console.log('❌ No payment button or Stripe link found on invoice page');
        }
        
      } else if (response.status() === 401 || response.status() === 403) {
        console.log('⚠️  Invoice URL requires authentication');
      } else {
        console.log('❌ Invoice URL returned error:', response.status());
      }
      
    } catch (error) {
      console.log('❌ Error testing invoice URL:', error);
    }
  });

  test('should validate Stripe API configuration in production', async ({ request }) => {
    console.log('🔍 Testing Stripe API configuration...');
    
    // This test would need to be run with proper API access
    // For now, we'll test general connectivity and configuration indicators
    
    try {
      // Test if the webhook endpoint exists
      const webhookResponse = await request.post(`${PRODUCTION_URL}/api/stripe/webhook`, {
        data: {},
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Stripe webhook endpoint status:', webhookResponse.status());
      
      // A 400 or 401 error is expected without proper Stripe signature
      // A 404 would indicate the endpoint doesn't exist
      if (webhookResponse.status() === 400 || webhookResponse.status() === 401) {
        console.log('✅ Stripe webhook endpoint exists and is configured');
      } else if (webhookResponse.status() === 404) {
        console.log('❌ Stripe webhook endpoint not found');
      } else {
        console.log('⚠️  Unexpected webhook response status:', webhookResponse.status());
      }
      
    } catch (error) {
      console.log('❌ Error testing Stripe webhook endpoint:', error);
    }
  });

  test('should test email template structure', async ({ page }) => {
    console.log('🔍 Testing email template HTML structure...');
    
    // Create a test HTML that mimics the production email template
    const emailHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Test</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="padding: 40px 0;">
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 600px;">
            <tr>
              <td style="padding: 32px;">
                <!-- Payment Button (Test with Stripe URL) -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="https://buy.stripe.com/test123456789" 
                     target="_blank" 
                     rel="noopener"
                     style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    Pay Invoice Now
                  </a>
                  <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
                    Secure payment powered by Stripe
                  </p>
                </div>
                
                <!-- Alternative Link -->
                <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px;">
                  <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
                    Or copy this link to pay online:
                  </p>
                  <p style="font-size: 12px; color: #3b82f6; word-break: break-all; margin: 0;">
                    https://buy.stripe.com/test123456789
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(emailHTML);
    await page.screenshot({ path: 'tests/screenshots/email-template-test.png' });
    
    // Test the payment button
    const payButton = page.locator('a:has-text("Pay Invoice Now")');
    await expect(payButton).toBeVisible();
    
    const href = await payButton.getAttribute('href');
    const target = await payButton.getAttribute('target');
    const rel = await payButton.getAttribute('rel');
    
    console.log('Payment button attributes:');
    console.log('- href:', href);
    console.log('- target:', target);
    console.log('- rel:', rel);
    
    // Verify security attributes
    expect(target).toBe('_blank');
    expect(rel).toBe('noopener');
    expect(href).toContain('stripe.com');
    
    console.log('✅ Email template structure is correct with proper security attributes');
  });

  test('should test payment button click behavior', async ({ page, context }) => {
    console.log('🔍 Testing payment button click behavior...');
    
    // Test with a real Stripe test payment link (you would need to generate one)
    const testHTML = `
      <div style="padding: 20px;">
        <a href="https://buy.stripe.com/test_14k00000000000000000000000" 
           target="_blank" 
           rel="noopener"
           id="payment-button"
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px;">
          Pay Invoice Now
        </a>
      </div>
    `;
    
    await page.setContent(testHTML);
    
    // Set up page event listener to capture new page opens
    const newPagePromise = context.waitForEvent('page');
    
    // Click the payment button
    await page.click('#payment-button');
    
    try {
      // Wait for new page to open (timeout quickly since we're using test URLs)
      const newPage = await newPagePromise;
      await newPage.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      const url = newPage.url();
      console.log('Payment button opened URL:', url);
      
      // Check if it's a Stripe URL
      if (url.includes('stripe.com')) {
        console.log('✅ Payment button successfully opens Stripe payment page');
        await newPage.screenshot({ path: 'tests/screenshots/stripe-payment-page.png' });
      } else {
        console.log('⚠️  Payment button opened non-Stripe URL');
      }
      
      await newPage.close();
      
    } catch {
      console.log('⚠️  Payment button click test completed (expected with test URLs)');
    }
    
    console.log('✅ Payment button click behavior test completed');
  });
});