const { chromium } = require('playwright');

async function testInvoiceSending() {
  console.log('🚀 Starting invoice sending test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Sign in with user credentials (requires manual setup)
    console.log('🔐 Signing in...');
    // TODO: Replace with actual user credentials after account creation
    await page.fill('input[type="email"]', 'your-email@domain.com');
    await page.fill('input[type="password"]', 'your-password');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Navigate to customers
    console.log('👥 Navigating to customers...');
    await page.click('a[href="/customers"]');
    await page.waitForLoadState('networkidle');

    // Check if test customer already exists
    const existingCustomer = await page.locator('text=Test Customer').first();
    if (await existingCustomer.count() === 0) {
      console.log('➕ Creating test customer...');
      
      // Create new customer
      await page.click('text=Add customer');
      await page.waitForLoadState('networkidle');
      
      // Fill customer form
      await page.fill('input[name="businessName"]', 'Test Customer');
      await page.fill('input[name="primaryContact"]', 'John Doe');
      await page.fill('input[name="email"]', 'ekosolarize@gmail.com');
      await page.fill('input[name="phone"]', '+1234567890');
      
      // Save customer
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    } else {
      console.log('✅ Test customer already exists');
    }

    // Navigate to invoices
    console.log('📄 Navigating to invoices...');
    await page.click('a[href="/invoices"]');
    await page.waitForLoadState('networkidle');

    // Create new invoice
    console.log('➕ Creating new invoice...');
    await page.click('text=New invoice');
    await page.waitForLoadState('networkidle');

    // Select customer
    await page.click('[role="combobox"]');
    await page.waitForTimeout(1000);
    await page.click('text=Test Customer');

    // Add line item
    console.log('📝 Adding line item...');
    await page.fill('input[name="lineItems.0.description"]', 'Test Service');
    await page.fill('input[name="lineItems.0.amount"]', '100');

    // Set due date (30 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dueDateString = futureDate.toISOString().split('T')[0];
    await page.fill('input[name="dueDate"]', dueDateString);

    // Save as draft first
    console.log('💾 Saving invoice as draft...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Now send the invoice
    console.log('📧 Sending invoice...');
    await page.click('text=Send invoice');
    
    // Wait for success message
    await page.waitForTimeout(3000);
    
    // Check for success indicators
    const successMessage = await page.locator('text=Invoice sent').first();
    const errorMessage = await page.locator('text=Send failed').first();
    
    if (await successMessage.count() > 0) {
      console.log('✅ SUCCESS: Invoice sent successfully!');
      console.log('📧 Check ekosolarize@gmail.com for the invoice email');
    } else if (await errorMessage.count() > 0) {
      console.log('❌ ERROR: Invoice sending failed');
      // Get error details
      const errorText = await page.textContent('text=Send failed');
      console.log('Error details:', errorText);
    } else {
      console.log('⚠️  Unclear result - check server logs');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testInvoiceSending().catch(console.error);