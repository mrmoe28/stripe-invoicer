import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://ledgerflow.org';

test.describe('Production Error Investigation', () => {
  test('should capture all console errors and network failures', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    const pageErrors: string[] = [];
    
    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`CONSOLE ERROR: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        consoleErrors.push(`CONSOLE WARNING: ${msg.text()}`);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      pageErrors.push(`PAGE ERROR: ${error.message}\nStack: ${error.stack}`);
    });
    
    // Capture network failures
    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push(`NETWORK ERROR: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });
    
    // Navigate to production site
    console.log('Navigating to production site...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(3000);
    
    // Log all captured errors
    console.log('\n=== PRODUCTION ERROR REPORT ===');
    console.log(`Console Errors (${consoleErrors.length}):`);
    consoleErrors.forEach(error => console.log(error));
    
    console.log(`\nPage Errors (${pageErrors.length}):`);
    pageErrors.forEach(error => console.log(error));
    
    console.log(`\nNetwork Errors (${networkErrors.length}):`);
    networkErrors.forEach(error => console.log(error));
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/production-current-state.png', fullPage: true });
    
    console.log('\nScreenshot saved to: tests/screenshots/production-current-state.png');
    console.log('=== END ERROR REPORT ===\n');
    
    // Force the test to show all errors even if some are expected
    if (consoleErrors.length > 0 || pageErrors.length > 0 || networkErrors.length > 0) {
      console.log('ERRORS DETECTED - Investigate the logged errors above');
    }
  });

  test('should test specific functionality that might be broken', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    try {
      // Try to navigate to sign-in page
      await page.goto(`${PRODUCTION_URL}/sign-in`, { timeout: 15000 });
      console.log('✓ Sign-in page loaded');
      
      // Check if form elements are actually visible and functional
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✓ Email input visible');
      
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✓ Password input visible');
      
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✓ Submit button visible');
      
      // Try to interact with the form
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpass');
      console.log('✓ Form inputs working');
      
    } catch (error) {
      console.log(`✗ Error during functionality test: ${error.message}`);
      errors.push(`Functionality test failed: ${error.message}`);
    }
    
    if (errors.length > 0) {
      console.log('\nFunctionality test errors:');
      errors.forEach(error => console.log(`- ${error}`));
    }
  });

  test('should check API endpoints for actual responses', async ({ request }) => {
    console.log('\n=== API ENDPOINT TESTING ===');
    
    try {
      const healthResponse = await request.get(`${PRODUCTION_URL}/api/health`);
      console.log(`Health endpoint: ${healthResponse.status()} ${healthResponse.statusText()}`);
      
      if (healthResponse.ok()) {
        const body = await healthResponse.json();
        console.log('Health response:', body);
      } else {
        console.log('Health endpoint failed - checking response text');
        const text = await healthResponse.text();
        console.log('Error response:', text.substring(0, 500));
      }
    } catch (error) {
      console.log(`Health endpoint error: ${error.message}`);
    }
    
    try {
      const authResponse = await request.get(`${PRODUCTION_URL}/api/auth/session`);
      console.log(`Auth session endpoint: ${authResponse.status()} ${authResponse.statusText()}`);
      
      const body = await authResponse.json();
      console.log('Auth session response:', body);
    } catch (error) {
      console.log(`Auth session error: ${error.message}`);
    }
    
    console.log('=== END API TESTING ===\n');
  });
});