import { test, expect } from '@playwright/test';

test.describe('Basic App Functionality', () => {
  test('should load the homepage and redirect to sign-in', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3000/');
    
    // Should redirect to sign-in page
    await expect(page).toHaveURL(/.*sign-in.*/);
    
    // Check that the page title is correct
    await expect(page).toHaveTitle('Ledgerflow');
  });

  test('should display sign-in form correctly', async ({ page }) => {
    // Go directly to sign-in page
    await page.goto('http://localhost:3000/sign-in');
    
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

  test('should load sign-up page', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto('http://localhost:3000/sign-up');
    
    // Should load successfully (not redirect)
    await expect(page).toHaveURL('http://localhost:3000/sign-up');
    await expect(page).toHaveTitle('Ledgerflow');
  });

  test('should handle API health check', async ({ page, request }) => {
    // Test API health endpoint
    const response = await request.get('http://localhost:3000/api/health');
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('uptime');
  });

  test('should handle unauthenticated API requests properly', async ({ request }) => {
    // Test protected API endpoint without authentication
    const response = await request.get('http://localhost:3000/api/invoices');
    
    // Should redirect (307) or return unauthorized
    expect([307, 401, 403]).toContain(response.status());
  });

  test('should render page without JavaScript errors', async ({ page }) => {
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
    
    // Navigate to sign-in page
    await page.goto('http://localhost:3000/sign-in');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that no errors occurred
    expect(errors).toHaveLength(0);
  });

  test('should have working form interactions', async ({ page }) => {
    await page.goto('http://localhost:3000/sign-in');
    
    // Fill out the form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    // Check that values were entered
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[name="password"]')).toHaveValue('testpassword');
    
    // Check that submit button is clickable
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });
});