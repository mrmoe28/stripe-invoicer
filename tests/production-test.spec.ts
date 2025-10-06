import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://ledgerflow.org';

test.describe('Production Site Testing', () => {
  test('should load production homepage and redirect to sign-in', async ({ page }) => {
    // Navigate to the production homepage
    await page.goto(PRODUCTION_URL);
    
    // Should redirect to sign-in page
    await expect(page).toHaveURL(/.*sign-in.*/);
    
    // Check that the page title is correct
    await expect(page).toHaveTitle('Ledgerflow');
  });

  test('should display production sign-in form correctly', async ({ page }) => {
    // Go directly to production sign-in page
    await page.goto(`${PRODUCTION_URL}/sign-in`);
    
    // Check page title
    await expect(page).toHaveTitle('Ledgerflow');
    
    // Check for sign-in form elements
    await expect(page.locator('h3')).toContainText('Sign in to Ledgerflow');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
    
    // Check for sign-up link
    await expect(page.locator('a[href="/sign-up"]')).toContainText('Sign up');
  });

  test('should load production sign-up page', async ({ page }) => {
    // Navigate to production sign-up page
    await page.goto(`${PRODUCTION_URL}/sign-up`);
    
    // Should load successfully
    await expect(page).toHaveURL(`${PRODUCTION_URL}/sign-up`);
    await expect(page).toHaveTitle('Ledgerflow');
  });

  test('should handle production API health check', async ({ page, request }) => {
    // Test production API health endpoint
    const response = await request.get(`${PRODUCTION_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('uptime');
  });

  test('should render production page without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Navigate to production sign-in page
    await page.goto(`${PRODUCTION_URL}/sign-in`);
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that no critical errors occurred
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('service-worker') &&
      !error.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have working production form interactions', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/sign-in`);
    
    // Fill out the form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    // Check that values were entered
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[name="password"]')).toHaveValue('testpassword');
    
    // Check that submit button is clickable
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('should have proper HTTPS and security headers', async ({ request }) => {
    const response = await request.get(PRODUCTION_URL);
    
    // Check HTTPS is working
    expect(response.url()).toMatch(/^https:/);
    
    // Check for security headers (common ones)
    const headers = response.headers();
    expect(headers['strict-transport-security']).toBeTruthy();
    expect(headers['server']).toBe('cloudflare'); // Verify Cloudflare is serving
  });

  test('should have fast page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${PRODUCTION_URL}/sign-in`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should handle 404 pages properly on production', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto(`${PRODUCTION_URL}/nonexistent-page-12345`);
    
    // Should redirect to sign-in (due to auth middleware) or show 404
    // The exact behavior depends on your middleware setup
    const url = page.url();
    expect(url.includes('sign-in') || url.includes('404')).toBeTruthy();
  });
});