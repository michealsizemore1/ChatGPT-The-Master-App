// @ts-check
// BeyondStride was disconnected from the Command Center (Nov 2026).
// The runs it had shared must stay in Activities (copied into the page's own list once), its shared copies must be
// cleared, and the page must load without errors and without the BeyondStride bridge scripts.
const { test, expect } = require('@playwright/test');

test('BeyondStride disconnect: shared runs are kept, shared copies cleared, no page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/daily-planner.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('bs_activities', JSON.stringify({ list: [
      { id: 1763600000000, date: '2026-11-19', type: 'Run', title: 'Easy Run', distance: 5.2, duration: '45:00' },
    ] }));
    localStorage.setItem('bs_plan_days', JSON.stringify({ days: { '2026-11-21': 'Easy 4 miles' }, at: Date.now() }));
  });
  await page.reload({ waitUntil: 'load' });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('bs_activities')), { timeout: 15000 }).toBeNull();
  const r = await page.evaluate(() => ({
    plan: localStorage.getItem('bs_plan_days'),
    kept: getActivities().filter((a) => a.date === '2026-11-19' && a.title === 'Easy Run').length,
    bridge: typeof window.bsReviewFetch + '/' + typeof window.ccNative,
  }));
  expect(r.plan).toBeNull();
  expect(r.kept).toBe(1);
  expect(r.bridge).toBe('undefined/undefined');
  // A second visit doesn't add the run again.
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => getActivities().filter((a) => a.date === '2026-11-19').length)).toBe(1);
  expect(errors).toEqual([]);
});
