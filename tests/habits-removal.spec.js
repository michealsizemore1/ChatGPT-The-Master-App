const { test, expect } = require('@playwright/test');

// Verifies that Udemy, Financial Videos, and Read-or-Listen habit cards are removed
// from the Habits tab (habits2) and never get re-created by the auto-sync logic.
test.describe('Udemy / Financial Videos / Read-or-Listen removed from Habits', () => {
  test('pre-existing habit cards for these three are deleted on sync and stay gone', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/daily-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // Seed a pre-migration state with all three habits present, as if they'd
    // been auto-created by an older version of the app.
    await page.evaluate(() => {
      const seeded = {
        habits: [
          { id: 'h2-auto-udemy', name: 'Complete a Udemy Lesson', category: 'Growth', autoSource: 'udemy' },
          { id: 'h2-auto-retirement-videos', name: 'Watch Financial Videos', category: 'Growth', autoSource: 'retirement-videos' },
          { id: 'h2-auto-library', name: 'Read or Listen Daily', category: 'Growth', autoSource: 'library' },
          { id: 'h2-auto-stretch', name: 'Daily Stretching', category: 'Health', autoSource: 'stretch' },
        ],
        logs: {},
        dismissedAuto: [],
      };
      localStorage.setItem('habits2_state', JSON.stringify(seeded));
      localStorage.removeItem('habits2_udemy_financial_library_removed_v1');
    });

    // Switch to the Habits tab, which triggers h2Render() -> h2SyncFromJournal().
    await page.evaluate(() => switchTab('habits2', null));
    await page.waitForTimeout(300);

    const listText = await page.locator('#h2HabitList').innerText();
    expect(listText).not.toMatch(/Complete a Udemy Lesson/);
    expect(listText).not.toMatch(/Watch Financial Videos/);
    expect(listText).not.toMatch(/Read or Listen Daily/);
    // Unrelated habits must be unaffected.
    expect(listText).toMatch(/Daily Stretching/);

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('habits2_state') || '{}'));
    const autoSources = state.habits.map((h) => h.autoSource);
    expect(autoSources).not.toContain('udemy');
    expect(autoSources).not.toContain('retirement-videos');
    expect(autoSources).not.toContain('library');
    expect(state.dismissedAuto).toEqual(expect.arrayContaining(['udemy', 'retirement-videos', 'library']));

    // Re-render again (simulating a later visit) and confirm they don't come back.
    await page.evaluate(() => switchTab('habits2', null));
    await page.waitForTimeout(300);
    const listText2 = await page.locator('#h2HabitList').innerText();
    expect(listText2).not.toMatch(/Complete a Udemy Lesson/);
    expect(listText2).not.toMatch(/Watch Financial Videos/);
    expect(listText2).not.toMatch(/Read or Listen Daily/);

    expect(errors).toEqual([]);
  });

  test('fresh install (no prior habit data) never creates these three either', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/daily-planner.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    // Truly fresh install: wipe everything (not just the habit state — an
    // already-run background sync during the first goto() can otherwise leave
    // one-time "already linked" flags behind) and reload.
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.evaluate(() => switchTab('habits2', null));
    await page.waitForTimeout(300);

    const listText = await page.locator('#h2HabitList').innerText();
    expect(listText).not.toMatch(/Complete a Udemy Lesson/);
    expect(listText).not.toMatch(/Watch Financial Videos/);
    expect(listText).not.toMatch(/Read or Listen Daily/);
    // Other force-created habits should still show up normally.
    expect(listText).toMatch(/Daily Stretching/);
    expect(listText).toMatch(/Reach 64 oz Water/);

    expect(errors).toEqual([]);
  });
});
