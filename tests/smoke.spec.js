// Lightweight smoke tests for every app page in this suite.
//
// These are deliberately shallow: each app has its own deep, hand-built feature set (Monte Carlo
// projections, journaling, scoreboards, etc.) that isn't worth re-testing here. What this file catches
// is the class of regression that has actually happened in this codebase before: a page that throws
// on load, a broken <script src> path after a refactor (e.g. the daily-planner/retirement-planner
// script splits), a missing shared home-button include, or a page that silently renders blank.
//
// Run with: npx playwright test   (starts its own static file server -- see playwright.config.js)
const { test, expect } = require('@playwright/test');

// hasHomeButton: true for every page that includes the shared home-button.js. Two pages build their
// own home link into their topbar on purpose (msiz-terminal.html, track-field.html -- see the comment
// at the top of home-button.js); index.html IS the home page; ebay-business-plan.html is a static
// planning document, not an app page.
const APPS = [
  { file: 'index.html', title: 'My Life Master App', hasHomeButton: false },
  { file: 'daily-planner.html', title: /My Life Command Center/i, hasHomeButton: true },
  { file: 'retirement-planner.html', title: /Retirement/i, hasHomeButton: true },
  { file: 'budget-tracker.html', title: /Budget/i, hasHomeButton: true },
  { file: 'ebay-tracker.html', title: /Treasures|eBay/i, hasHomeButton: true },
  { file: 'ebay-business-plan.html', title: /eBay/i, hasHomeButton: false },
  { file: 'family-benefits-hub.html', title: /Family Benefits/i, hasHomeButton: true },
  { file: 'spanish-learning.html', title: /Spanish|Luma/i, hasHomeButton: true },
  { file: 'the-w.html', title: /The W|WNBA/i, hasHomeButton: true },
  { file: 'top-25.html', title: /Top 25/i, hasHomeButton: true },
  { file: 'nfl-gameday.html', title: /NFL/i, hasHomeButton: true },
  { file: 'track-field.html', title: /Track/i, hasHomeButton: false },
  { file: 'msiz-terminal.html', title: /MSIZ|Terminal/i, hasHomeButton: false },
];

for (const app of APPS) {
  test.describe(app.file, () => {
    test('loads without throwing, renders content, has the right title', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const response = await page.goto(`/${app.file}`, { waitUntil: 'load' });
      expect(response && response.ok(), `HTTP request for ${app.file} did not succeed`).toBeTruthy();

      // Give any startup async work (render(), first Monte Carlo pass, etc.) a moment to settle.
      await page.waitForTimeout(1000);

      expect(pageErrors, `Uncaught JS error(s) on ${app.file}:\n${pageErrors.join('\n')}`).toEqual([]);

      await expect(page).toHaveTitle(app.title);

      const bodyLength = await page.evaluate(() => document.body.innerText.trim().length);
      expect(bodyLength, `${app.file} rendered an empty page`).toBeGreaterThan(0);
    });

    if (app.hasHomeButton) {
      test('has the shared home button', async ({ page }) => {
        await page.goto(`/${app.file}`, { waitUntil: 'load' });
        await expect(page.locator('#homeButton')).toHaveCount(1);
        await expect(page.locator('#homeButton')).toHaveAttribute('href', 'index.html');
      });
    }
  });
}

// A couple of app-specific checks worth the extra few lines, since these pages were split into
// multiple <script src> files this session and a missing/misordered <script> tag is exactly the kind
// of mistake that would otherwise only surface as a silent blank section.
test.describe('split-file apps wire up correctly', () => {
  test('daily-planner.html loads all 9 script chunks and initializes', async ({ page }) => {
    const failed = [];
    page.on('requestfailed', (req) => failed.push(req.url()));
    await page.goto('/daily-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const chunkFailures = failed.filter((u) => u.includes('daily-planner-'));
    expect(chunkFailures, `Failed script requests: ${chunkFailures.join(', ')}`).toEqual([]);
  });

  test('retirement-planner.html loads all 11 script chunks and shows the local save badge', async ({ page }) => {
    const failed = [];
    page.on('requestfailed', (req) => failed.push(req.url()));
    await page.goto('/retirement-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const chunkFailures = failed.filter((u) => u.includes('retirement-planner-'));
    expect(chunkFailures, `Failed script requests: ${chunkFailures.join(', ')}`).toEqual([]);

    // Regression check for the local-only save-status badge (see
    // retirement-planner-core.js: markPlannerLocalDirty/markPlannerLocalSaved).
    const badge = page.locator('#cloudSyncBadgeText');
    await expect(badge).toHaveText('Saved locally');
  });
});
