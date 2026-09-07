const { test, expect } = require('@playwright/test');

// Verifies the restored "Audible weekly goal" feature: logging today's audiobook
// listening time under the Library tab, and setting/seeing a weekly goal for it.
test.describe('Audible weekly goal (Library tab)', () => {
  test('can log listening time under Library and it persists', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/daily-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // Switch to the Library tab (its nav button lives inside the collapsed
    // hamburger dropdown, so drive the tab switch directly).
    await page.evaluate(() => switchTab('library', null));
    await page.waitForTimeout(200);

    // The new inputs should exist and be visible.
    await expect(page.locator('#gaAudiobookText')).toBeVisible();
    await expect(page.locator('#gaAudiobookTime')).toBeVisible();
    await expect(page.locator('.tri-check[data-key="gaAudiobook"]')).toHaveCount(1);

    // Enter today's listening.
    await page.fill('#gaAudiobookText', 'Atomic Habits');
    await page.fill('#gaAudiobookTime', '45 min');
    await page.locator('#gaAudiobookTime').dispatchEvent('input');
    await page.waitForTimeout(300);

    // Confirm it saved into today's planner_<date> record.
    const saved = await page.evaluate(() => {
      const todayKey = Object.keys(localStorage).find((k) => k.startsWith('planner_'));
      if (!todayKey) return null;
      const d = JSON.parse(localStorage.getItem(todayKey));
      return { text: d.gaAudiobookText, time: d.gaAudiobookTime };
    });
    expect(saved).toEqual({ text: 'Atomic Habits', time: '45 min' });

    expect(errors).toEqual([]);
  });

  test('weekly Audible goal can be set and shows a progress bar', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/daily-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // Log listening time for today first (Library tab), so there is an actual to show.
    await page.evaluate(() => switchTab('library', null));
    await page.waitForTimeout(200);
    await page.fill('#gaAudiobookTime', '90 min');
    await page.locator('#gaAudiobookTime').dispatchEvent('input');
    await page.waitForTimeout(300);

    // Go to the Weekly tab and set a weekly Audible goal.
    await page.evaluate(() => switchTab('weekly', null));
    await page.waitForTimeout(200);
    await page.evaluate(() => toggleGoalsSettings());
    await page.waitForTimeout(200);
    await expect(page.locator('#gAudible')).toBeVisible();
    await page.fill('#gAudible', '120');
    await page.evaluate(() => saveGoals());
    await page.waitForTimeout(300);

    const goals = await page.evaluate(() => JSON.parse(localStorage.getItem('weekly_goals') || '{}'));
    expect(goals.Audible).toBe(120);

    const barText = await page.locator('#goalBars').innerText();
    expect(barText).toMatch(/Audiobook/);
    // 90 minutes logged against a 120-minute goal.
    expect(barText).toMatch(/1h 30m/);

    expect(errors).toEqual([]);
  });
});
