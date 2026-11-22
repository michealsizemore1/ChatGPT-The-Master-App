// Smoke tests for the Retirement Planner Android app's own copy of the planner
// (android-app/retirement/www/, packed into the APK by .github/workflows/retirement-app.yml).
// The website's retirement-planner.html is covered separately in smoke.spec.js.
const { test, expect } = require('@playwright/test');

const APP = '/android-app/retirement/www/retirement-planner.html';

test.describe('Retirement Planner app copy', () => {
  test('loads every script, throws nothing, and opens every section', async ({ page }) => {
    const pageErrors = [];
    const failed = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('requestfailed', (req) => failed.push(req.url()));

    const response = await page.goto(APP, { waitUntil: 'load' });
    expect(response && response.ok()).toBeTruthy();
    await page.waitForTimeout(1500);

    const localFailures = failed.filter((u) => u.includes('/android-app/retirement/www/'));
    expect(localFailures, `Failed script requests: ${localFailures.join(', ')}`).toEqual([]);
    await expect(page).toHaveTitle(/Retirement/i);

    const sections = await page.$$eval('#sidenav [data-page]', (els) => [...new Set(els.map((e) => e.dataset.page))]);
    expect(sections.length).toBeGreaterThan(10);
    for (const id of sections) {
      if (id === 'explorers') continue; // its submenu toggle isn't a section switch
      await page.evaluate((x) => showPage(x), id);
      await page.waitForTimeout(150);
    }
    expect(pageErrors, `Uncaught JS error(s):\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('Back steps through visited sections, then to Overview, then lets the app close', async ({ page }) => {
    await page.goto(APP, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { showPage('dashboard'); showPage('income'); showPage('taxes'); });
    const active = () => page.evaluate(() => document.querySelector('.page.active').dataset.page);
    expect(await page.evaluate(() => handleAndroidBack())).toBe(true);
    expect(await active()).toBe('income');
    expect(await page.evaluate(() => handleAndroidBack())).toBe(true);
    expect(await active()).toBe('dashboard');
    expect(await page.evaluate(() => handleAndroidBack())).toBe(false);
  });

  test('app-only cards stay hidden outside the Android app', async ({ page }) => {
    await page.goto(APP, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    for (const id of ['appUpdateCard', 'appLockCard', 'autoBackupBox']) {
      await expect(page.locator('#' + id)).toBeHidden();
    }
  });
});
