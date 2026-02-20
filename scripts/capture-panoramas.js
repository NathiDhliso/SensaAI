#!/usr/bin/env node

/**
 * Quick Screenshot Capture Script
 * Captures panoramic views of all major frontend pages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n=== SensaAI Frontend Screenshot Capture ===\n');

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  console.log('Creating screenshots directory...');
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Check if dev server is running
console.log('Checking development server...');
try {
  const http = require('http');
  const req = http.get('http://localhost:5173', (res) => {
    if (res.statusCode === 200) {
      console.log('✓ Development server is running\n');
      runScreenshotTests();
    }
  });
  req.on('error', () => {
    console.error('✗ Development server is not running');
    console.log('\nPlease start the dev server first:');
    console.log('  npm run dev\n');
    process.exit(1);
  });
  req.end();
} catch (error) {
  console.error('Error checking dev server:', error.message);
  process.exit(1);
}

function runScreenshotTests() {
  console.log('Running Playwright screenshot tests...\n');
  
  try {
    execSync('npx playwright test tests/capture-screenshots.spec.ts --headed', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n=== Screenshot Capture Complete ===\n');
    console.log('Screenshots saved to: ./screenshots/\n');
    console.log('To view the test report:');
    console.log('  npm run test:e2e:report\n');
  } catch (error) {
    console.error('\nScreenshot capture failed:', error.message);
    process.exit(1);
  }
}
