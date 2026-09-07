const { test, expect } = require('@playwright/test');

// Verifies that Udemy, Financial Videos, Read-or-Listen, Daily Stretching, and Daily
// Reflection habit cards are all removed from the Habits tab (habits2) and never get
// re-created by the auto-sync logic.
test.describe('Habits removed per user request', () => {
  test('pre-existing habit cards for all five are deleted on sync and stay gone', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/daily-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const seeded = {
        habits: [
          { id: 'h2-auto-udemy', name: 'Complete a Udemy Lesson', category: 'Growth', autoSource: 'udemy' },
          { id: 'h2-auto-retirement-videos', name: 'Watch Financial Videos', category: 'Growth', autoSource: 'retirement-videos' },
          { id: 'h2-auto-library', name: 'Read or Listen Daily', category: 'Growth', autoSource: 'library' },
          { id: 'h2-auto-stretch', name: 'Daily Stretching', category: 'Health', autoSource: 'stretch' },
          { id: 'h2-auto-daily-reflection', name: 'Daily Reflection', category: 'Growth', autoSource: 'daily-reflection' },
          { id: 'h2-auto-hydration', name: 'Reach 64 oz Water', category: 'Health', autoSource: 'hydration' },
        ],
        logs: {},
        dismissedAuto: [],
      };
      localStorage.setItem('habits2_state', JSON.stringify(seeded));
      localStorage.removeItem('habits2_udemy_financial_library_removed_v1');
      localStorage.removeItem('habits2_stretch_reflection_removed_v1');
    });

    await page.evaluate(() => switchTab('habits2', null));
    await page.waitForTimeout(300);

    const listText = await page.locator('#h2HabitList').innerText();
    expect(listText).not.toMatch(/Complete a Udemy Lesson/);
    expect(listText).not.toMatch(/Watch Financial Videos/);
    expect(listText).not.toMatch(/Read or Listen Daily/);
    expect(listText).not.toMatch(/Daily Stretching/);
    expect(listText).not.toMatch(/Daily Reflection/);
    // Unrelated habit must be unaffected.
    expect(listText).toMatch(/Reach 64 oz Water/);

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('habits2_state') || '{}'));
    const autoSources = state.habits.map((h) => h.autoSource);
    ['udemy', 'retirement-videos', 'library', 'stretch', 'daily-reflection'].forEach((id) => {
      expect(autoSources).not.toContain(id);
    });
    expect(state.dismissedAuto).toEqual(
      expect.arrayContaining(['udemy', 'retirement-videos', 'library', 'stretch', 'daily-reflection'])
    );

    // Re-render again (simulating a later visit) and confirm they don't come back.
    await page.evaluate(() => switchTab('habits2', null));
    await page.waitForTimeout(300);
    const listText2 = await page.locator('#h2HabitList').innerText();
    expect(listText2).not.toMatch(/Complete a Udemy Lesson/);
    expect(listText2).not.toMatch(/Watch Financial Videos/);
    expect(listText2).not.toMatch(/Read or Listen Daily/);
    expect(listText2).not.toMatch(/Daily Stretching/);
    expect(listText2).not.toMatch(/Daily Reflection/);

    expect(errors).toEqual([]);
  });

  test('fresh install (no prior habit data) never creates any of the five either', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/daily-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.evaluate(() => switchTab('habits2', null));
    await page.waitForTimeout(300);

    const listText = await page.locator('#h2HabitList').innerText();
    expect(listText).not.toMatch(/Complete a Udemy Lesson/);
    expect(listText).not.toMatch(/Watch Financial Videos/);
    expect(listText).not.toMatch(/Read or Listen Daily/);
    expect(listText).not.toMatch(/Daily Stretching/);
    expect(listText).not.toMatch(/Daily Reflection/);
    // Other force-created habits should still show up normally.
    expect(listText).toMatch(/Reach 64 oz Water/);
    expect(listText).toMatch(/Evening Planning/);
    expect(listText).toMatch(/Sleep Routine/);

    expect(errors).toEqual([]);
  });
});
