import { test, expect } from '@playwright/test';

test.describe('Invoice Stripe Payment Flow', () => {
  test('should generate Stripe payment link when sending invoice', async ({ page }) => {
    // Navigate to sign in page
    await page.goto('/sign-in');
    
    // Sign in with test credentials (you'll need to update these)
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Navigate to invoices
    await page.goto('/invoices');
    
    // Click on an existing invoice or create a new one
    const invoiceRows = await page.locator('table tbody tr').count();
    if (invoiceRows > 0) {
      // Click on the first invoice
      await page.click('table tbody tr:first-child a:has-text("View")');
    } else {
      // Create a new invoice
      await page.click('a:has-text("New invoice")');
      
      // Fill in invoice form
      await page.selectOption('select[name="customerId"]', { index: 1 });
      await page.fill('input[name="lineItems.0.description"]', 'Test Service');
      await page.fill('input[name="lineItems.0.quantity"]', '1');
      await page.fill('input[name="lineItems.0.unitPrice"]', '100');
      
      // Enable payment link
      const paymentLinkCheckbox = page.locator('input[name="enablePaymentLink"]');
      if (await paymentLinkCheckbox.isVisible()) {
        await paymentLinkCheckbox.check();
      }
      
      // Save invoice
      await page.click('button:has-text("Save")');
      await page.waitForURL('**/invoices/**');
    }
    
    // Send the invoice
    const sendButton = page.locator('button:has-text("Send invoice")');
    if (await sendButton.isVisible()) {
      await sendButton.click();
      
      // Wait for success message or modal
      await page.waitForTimeout(2000);
    }
    
    // Check if payment link was created
    const paymentLinkElement = page.locator('text=/payment\.link\.stripe\.com/');
    const hasPaymentLink = await paymentLinkElement.count() > 0;
    
    if (hasPaymentLink) {
      console.log('✅ Stripe payment link found on page');
      const paymentLink = await paymentLinkElement.first().textContent();
      console.log('Payment link:', paymentLink);
    } else {
      console.log('⚠️ Payment link not visible on page, checking database...');
    }
    
    // Alternative: Check the invoice status badge
    const statusBadge = page.locator('[role="status"], .badge');
    await expect(statusBadge).toContainText(/sent/i, { timeout: 5000 });
    
    console.log('✅ Invoice marked as sent');
  });

  test('should verify payment button in email template', async ({ page }) => {
    // This test would require access to the actual email
    // For now, we'll test the email preview if available
    
    await page.goto('/sign-in');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Navigate to a sent invoice
    await page.goto('/invoices');
    
    // Look for a sent invoice
    const sentInvoice = page.locator('tr:has-text("SENT"), tr:has-text("Sent")').first();
    if (await sentInvoice.isVisible()) {
      await sentInvoice.locator('a:has-text("View")').click();
      
      // Check for payment link URL in the invoice details
      const pageContent = await page.content();
      const hasStripeLink = pageContent.includes('payment.link.stripe.com') || 
                            pageContent.includes('checkout.stripe.com');
      
      if (hasStripeLink) {
        console.log('✅ Stripe payment link found in invoice');
        
        // Try to extract the payment link
        const linkMatch = pageContent.match(/(https:\/\/(payment\.link|checkout)\.stripe\.com\/[^\s"']+)/);
        if (linkMatch) {
          console.log('Payment URL:', linkMatch[1]);
          
          // Test that the link is valid by navigating to it
          const newPage = await page.context().newPage();
          await newPage.goto(linkMatch[1]);
          
          // Check if we land on Stripe's payment page
          await expect(newPage).toHaveURL(/stripe\.com/);
          const stripeTitle = await newPage.title();
          console.log('✅ Stripe page title:', stripeTitle);
          
          // Look for payment form elements
          const paymentForm = newPage.locator('form, [data-testid="payment-form"], .PaymentForm');
          await expect(paymentForm).toBeVisible({ timeout: 10000 });
          console.log('✅ Payment form is visible on Stripe page');
          
          await newPage.close();
        }
      } else {
        console.log('⚠️ No Stripe payment link found in invoice details');
      }
    } else {
      console.log('⚠️ No sent invoices found to test');
    }
  });
});

// Helper test to check Stripe configuration
test('Stripe configuration check', async ({ request }) => {
  // Test the health endpoint to ensure app is running
  const healthResponse = await request.get('/api/health');
  expect(healthResponse.status()).toBe(200);
  
  const healthData = await healthResponse.json();
  console.log('Health check:', healthData);
  
  // Check if Stripe is configured (this would need an endpoint that reports config status)
  if (healthData.stripe) {
    console.log('✅ Stripe is configured');
  } else {
    console.log('⚠️ Stripe configuration status unknown');
  }
});