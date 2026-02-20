import { test } from '@playwright/test';

test('Extract AZ-104 Subject ID', async ({ page }) => {
  await page.goto('/library', { storageState: 'playwright/.auth/learner.json' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Get all result cards
  const cards = await page.locator('[class*="resultCard"], [class*="card"]').all();
  
  console.log(`\nFound ${cards.length} cards in library\n`);
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const text = await card.textContent();
    
    if (text && (text.toLowerCase().includes('az-104') || text.toLowerCase().includes('azure administrator'))) {
      console.log(`✓ Found AZ-104 card at index ${i}`);
      console.log(`Text: ${text.substring(0, 100)}...`);
      
      // Try to find the View button and extract href
      const viewBtn = card.locator('button:has-text("View")');
      const learnBtn = card.locator('button:has-text("Learn")');
      
      // Check if buttons exist
      const hasView = await viewBtn.count() > 0;
      const hasLearn = await learnBtn.count() > 0;
      
      console.log(`Has View button: ${hasView}`);
      console.log(`Has Learn button: ${hasLearn}`);
      
      // Try to get onclick or parent link
      if (hasView) {
        const onClick = await viewBtn.first().evaluate((el) => {
          // Check parent for navigation
          const parent = el.closest('[class*="card"]');
          if (parent) {
            const allButtons = parent.querySelectorAll('button');
            for (const btn of allButtons) {
              const text = btn.textContent || '';
              if (text.includes('View') || text.includes('Learn')) {
                // Try to find data attributes or onclick
                const attrs = btn.attributes;
                for (let i = 0; i < attrs.length; i++) {
                  console.log(`${attrs[i].name}: ${attrs[i].value}`);
                }
              }
            }
          }
          return el.getAttribute('onclick') || el.getAttribute('data-id') || '';
        });
        console.log(`onClick/data: ${onClick}`);
      }
      
      // Try to extract from the card's data attributes
      const cardId = await card.evaluate((el) => {
        return el.getAttribute('data-id') || el.getAttribute('id') || el.className;
      });
      console.log(`Card ID/Class: ${cardId}`);
      
      // Look for any links in the card
      const links = await card.locator('a').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href) {
          console.log(`Link href: ${href}`);
          if (href.includes('/launchpad/') || href.includes('/study/')) {
            const match = href.match(/\/(launchpad|study)\/([^?/]+)/);
            if (match) {
              console.log(`\n✅ SUBJECT ID FOUND: ${match[2]}\n`);
              console.log(`Update SUBJECT_ID in tests/capture-interactive.spec.ts to: '${match[2]}'`);
            }
          }
        }
      }
      
      break;
    }
  }
  
  // Also try to click View and capture the URL
  const az104Text = page.locator('text=/az-104|azure administrator/i').first();
  if (await az104Text.isVisible({ timeout: 3000 }).catch(() => false)) {
    const card = az104Text.locator('xpath=ancestor::*[contains(@class, "card")]').first();
    const viewBtn = card.locator('button:has-text("View")').first();
    
    if (await viewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\nAttempting to click View button...');
      await viewBtn.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      console.log(`Current URL: ${url}`);
      
      const match = url.match(/\/(launchpad|study)\/([^?/]+)/);
      if (match) {
        console.log(`\n✅ SUBJECT ID FROM URL: ${match[2]}\n`);
        console.log(`Update SUBJECT_ID in tests/capture-interactive.spec.ts to: '${match[2]}'`);
      }
    }
  }
});
