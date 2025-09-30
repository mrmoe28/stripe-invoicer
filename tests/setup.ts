// Global test setup
import '@playwright/test';

// Create screenshots directory
import { mkdir } from 'fs/promises';
import { join } from 'path';

const screenshotsDir = join(process.cwd(), 'tests', 'screenshots');

export async function setupTests() {
  try {
    await mkdir(screenshotsDir, { recursive: true });
    console.log('Created screenshots directory');
  } catch (error) {
    console.log('Screenshots directory already exists or error:', error);
  }
}

// Call setup
setupTests();