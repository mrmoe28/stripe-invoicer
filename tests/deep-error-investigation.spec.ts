import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://ledgerflow.org';

test.describe('Deep Error Investigation', () => {
  test('should capture all types of errors including failed resource loads', async ({ page }) => {
    const allErrors: string[] = [];
    const networkRequests: string[] = [];
    const failedRequests: string[] = [];
    
    // Capture all network requests
    page.on('request', request => {
      networkRequests.push(`REQUEST: ${request.method()} ${request.url()}`);
    });
    
    // Capture all responses including failures
    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      
      if (status >= 400) {
        failedRequests.push(`FAILED: ${status} ${response.statusText()} - ${url}`);
        allErrors.push(`HTTP ${status}: ${url}`);
      }
      
      // Log redirects as they might indicate issues
      if (status >= 300 && status < 400) {
        allErrors.push(`REDIRECT ${status}: ${url}`);
      }
    });
    
    // Capture console messages (all types)
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        allErrors.push(`CONSOLE ERROR: ${text}`);
      } else if (type === 'warning') {
        allErrors.push(`CONSOLE WARNING: ${text}`);
      } else if (type === 'log' && text.includes('error')) {
        allErrors.push(`CONSOLE LOG (error-related): ${text}`);
      }
    });
    
    // Capture JavaScript errors
    page.on('pageerror', error => {
      allErrors.push(`JS ERROR: ${error.name}: ${error.message}`);
      if (error.stack) {
        allErrors.push(`STACK: ${error.stack}`);
      }
    });
    
    // Capture request failures
    page.on('requestfailed', request => {
      allErrors.push(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    console.log('Starting deep investigation of production site...');
    
    try {
      // Navigate with detailed monitoring
      await page.goto(PRODUCTION_URL, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log('✓ Initial navigation completed');
      
      // Wait for any delayed errors
      await page.waitForTimeout(5000);
      
      // Try to trigger any lazy-loaded errors by interacting with the page
      await page.hover('input[name="email"]');
      await page.click('input[name="email"]');
      await page.fill('input[name="email"]', 'test@example.com');
      
      await page.hover('input[name="password"]');
      await page.click('input[name="password"]');
      await page.fill('input[name="password"]', 'test123');
      
      // Hover over buttons to trigger any hover states
      await page.hover('button[type="submit"]');
      await page.hover('a[href="/sign-up"]');
      
      console.log('✓ User interactions completed');
      
      // Check for any AJAX/fetch errors by attempting form submission
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Wait to see if submission triggers any errors
      await page.waitForTimeout(3000);
      
      console.log('✓ Form submission attempted');
      
    } catch (error) {
      allErrors.push(`NAVIGATION/INTERACTION ERROR: ${error.message}`);
    }
    
    // Report all findings
    console.log('\n=== COMPREHENSIVE ERROR REPORT ===');
    console.log(`Total errors found: ${allErrors.length}`);
    console.log(`Failed network requests: ${failedRequests.length}`);
    
    if (allErrors.length > 0) {
      console.log('\n--- ALL ERRORS ---');
      allErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (failedRequests.length > 0) {
      console.log('\n--- FAILED REQUESTS ---');
      failedRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req}`);
      });
    }
    
    // Take screenshot showing current state
    await page.screenshot({ 
      path: 'tests/screenshots/deep-investigation.png', 
      fullPage: true 
    });
    
    console.log('\n--- NETWORK SUMMARY ---');
    console.log(`Total network requests: ${networkRequests.length}`);
    
    // Show unique domains being requested
    const domains = [...new Set(networkRequests.map(req => {
      try {
        return new URL(req.split(' ')[1]).hostname;
      } catch {
        return 'unknown';
      }
    }))];
    console.log(`Domains contacted: ${domains.join(', ')}`);
    
    console.log('=== END COMPREHENSIVE REPORT ===\n');
    
    // The test will pass but log all issues found
    if (allErrors.length > 0) {
      console.log(`⚠️  Found ${allErrors.length} potential issues - see detailed log above`);
    }
  });
  
  test('should test browser console access and developer tools info', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/sign-in`);
    
    // Get browser info
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`Browser: ${userAgent}`);
    
    // Check for any global error handlers
    const hasErrorHandlers = await page.evaluate(() => {
      return {
        windowErrorHandler: typeof window.onerror !== 'undefined',
        unhandledRejectionHandler: typeof window.onunhandledrejection !== 'undefined',
        errorEventListeners: window.addEventListener ? 'available' : 'not available'
      };
    });
    
    console.log('Error handling setup:', hasErrorHandlers);
    
    // Check if any global variables indicate errors
    const globalErrors = await page.evaluate(() => {
      const errors = [];
      
      // Check for common error indicators
      if (typeof window.webpackJsonp === 'undefined' && document.querySelector('script[src*="webpack"]')) {
        errors.push('Webpack may not have loaded properly');
      }
      
      // Check for hydration errors (common in SSR/Next.js)
      const hydrationWarnings = document.querySelectorAll('[data-reactroot]');
      if (hydrationWarnings.length === 0 && document.querySelector('#__next')) {
        errors.push('React hydration may have issues');
      }
      
      return errors;
    });
    
    if (globalErrors.length > 0) {
      console.log('Potential global errors:');
      globalErrors.forEach(error => console.log(`- ${error}`));
    }
  });
});