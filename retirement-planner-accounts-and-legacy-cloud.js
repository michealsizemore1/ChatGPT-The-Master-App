let trackerFrameLoaded = false;
let trackerShadowRoot = null;
function loadTrackerFrame() {
  if (trackerFrameLoaded) return;
  const host = els('trackerHost');
  if (!host) return;
  const shadow = host.attachShadow({ mode: 'open' });
  trackerShadowRoot = shadow;

  const styleMatch = TRACKER_HTML.match(/<style>([\s\S]*?)<\/style>/);
  const bodyMatch = TRACKER_HTML.match(/<body>([\s\S]*?)<script>/);
  const scriptMatch = TRACKER_HTML.match(/<script>([\s\S]*?)<\/script>/);
  if (!styleMatch || !bodyMatch || !scriptMatch) return;

  // The tracker's own top-level CSS was written for a standalone page (:root for its color
  // variables, html,body for full-viewport flex layout) — neither selector matches anything
  // inside a shadow root, so both are rewritten to :host, which is the shadow-root equivalent.
  const scopedCss = styleMatch[1]
    .replace(':root', ':host')
    .split('html,body').join(':host');
  shadow.innerHTML = '<style>' + scopedCss + '</style>' + bodyMatch[1];

  window.__trackerDoc = {
    getElementById: id => shadow.getElementById(id),
    querySelector: sel => shadow.querySelector(sel),
    querySelectorAll: sel => shadow.querySelectorAll(sel),
    createElement: tag => document.createElement(tag),
    addEventListener: (...args) => document.addEventListener(...args),
    body: document.body,
    head: document.head
  };

  // innerHTML never executes <script> tags (by design, everywhere on the web) — so the tracker's
  // script is pulled out and re-created as a real <script> element, which does execute on insert.
  let scriptSrc = scriptMatch[1];
  scriptSrc = scriptSrc.replace('(function(){', '(function(document){');
  scriptSrc = scriptSrc.replace(/\}\)\(\);\s*$/, '})(window.__trackerDoc);');
  const s = document.createElement('script');
  s.textContent = scriptSrc;
  document.body.appendChild(s);
  document.body.removeChild(s);

  trackerFrameLoaded = true;
}
// Accounts & Cards (the credit card/bank register tracker below) is a standalone tool for tracking
// real day-to-day transactions — it is deliberately NOT wired into the retirement projection or Monte
// Carlo in any way. An earlier version of this page synced the Bank Accounts fields (checkingBalance/
// savingsBalance/hysaBalance) live from the tracker's own registers on every render(), which meant
// adding or editing a transaction on the Accounts & Cards page silently changed those three balances,
// which changed readInputs()'s output, which changed runMonteCarlo()'s seed (built from JSON.stringify
// of the full inputs object) — so the Monte Carlo score could visibly shift even though nothing on any
// retirement-planning page itself had been touched. That sync has been removed entirely: Checking/
// Savings/HYSA on the Investments page are now always plain, manually-edited fields, exactly like every
// other balance in the plan, and nothing entered on the Accounts & Cards page reaches the engine.
// The 'storage' event only fires in OTHER windows/tabs than the one that made the change — kept here
// (render() alone now, no tracker sync) purely so this planner stays visually current if it's ever open
// in two browser tabs at once and a field is changed in one of them.
window.addEventListener('storage', () => { render(); });

// ---------- Credit Card spending breakdown (category / merchant pie charts) ----------
// Reads straight from the 'cc-register' localStorage key the embedded tracker itself reads and
// writes — same document, same storage, so this is always the true current data with no dependency
// on the tracker's own render cycle or any cross-context event.
function readCCExpenses() {
  let txns = [];
  try { txns = JSON.parse(localStorage.getItem('cc-register') || '[]'); } catch (e) { txns = []; }
  return txns.filter(t => t.type === 'expense');
}

function trackerBankBalance(prefix) {
  let txns = [], opening = 0;
  try {
    txns = JSON.parse(localStorage.getItem(prefix + '-register') || '[]');
    opening = +(localStorage.getItem(prefix + '-open-bal') || 0);
  } catch (e) { return null; }
  if (!Array.isArray(txns)) return null;
  return opening + txns.reduce((sum, t) => sum + (t.type === 'deposit' ? (+t.amount || 0) : -(+t.amount || 0)), 0);
}

function syncSavingsAndHysaFromTracker() {
  const savings = trackerBankBalance('savings'), hysa = trackerBankBalance('hysa');
  if (savings == null || hysa == null) { alert('Accounts & Cards balances could not be read.'); return; }
  if (!confirm(`Replace the Investments balances with Accounts & Cards?\n\nSavings: ${fmtMoney(savings)}\nHYSA: ${fmtMoney(hysa)}`)) return;
  els('savingsBalance').value = Math.round(savings * 100) / 100;
  els('hysaBalance').value = Math.round(hysa * 100) / 100;
  const status = els('accountSyncStatus');
  if (status) status.textContent = `Synced ${new Date().toLocaleString()}: Savings ${fmtMoney(savings)}, HYSA ${fmtMoney(hysa)}.`;
  saveState(); render();
}
// Groups a list of expense transactions by whatever keyFn returns (category text, or merchant/
// description text), summing amounts per group, sorted largest-first. Caps the slice count at
// maxSlices by folding the smallest groups into a single "Other" slice, since merchant names in
// particular can vary a lot and a 20-slice pie chart isn't readable.
function groupSum(items, keyFn, maxSlices) {
  const totals = {};
  items.forEach(t => {
    const raw = (keyFn(t) || '').trim();
    const k = raw || 'Uncategorized';
    totals[k] = (totals[k] || 0) + (+t.amount || 0);
  });
  let entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (maxSlices && entries.length > maxSlices) {
    const head = entries.slice(0, maxSlices - 1);
    const otherTotal = entries.slice(maxSlices - 1).reduce((s, e) => s + e[1], 0);
    entries = head.concat([['Other', otherTotal]]);
  }
  return entries;
}
function ccPieConfig(entries) {
  return {
    type: 'pie',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{
        data: entries.map(e => e[1]),
        backgroundColor: entries.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 1,
        borderColor: '#fff',
        // Read by the pieValueLabels plugin (registered above) to draw $ + % on each slice.
        showValues: true, valueFormatter: fmtMoney
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
              const pct = total ? Math.round(ctx.parsed / total * 100) : 0;
              return ' ' + ctx.label + ': ' + fmtMoney(ctx.parsed) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  };
}
function renderCCSpendingCharts() {
  const catCanvas = els('ccCategoryChart');
  const merchCanvas = els('ccMerchantChart');
  const emptyNote = els('ccChartsEmptyNote');
  if (!catCanvas || !merchCanvas) return;
  const expenses = readCCExpenses();
  const hasData = expenses.length > 0;
  catCanvas.parentElement.style.display = hasData ? '' : 'none';
  merchCanvas.parentElement.style.display = hasData ? '' : 'none';
  if (emptyNote) emptyNote.style.display = hasData ? 'none' : 'block';
  if (!hasData) return;

  const categoryExpenses = [];
  expenses.forEach(t => {
    if (Array.isArray(t.splits) && t.splits.length) t.splits.forEach(s => categoryExpenses.push({ cat:s.cat, amount:+s.amount||0 }));
    else if (typeof t.cat === 'string' && t.cat.includes(',')) {
      const cats = t.cat.split(',').map(c => c.trim()).filter(Boolean);
      const rawAmounts = typeof t.catAmts === 'string' ? t.catAmts.split(',').map(a => a.trim()) : [];
      const amounts = cats.map((_, i) => rawAmounts[i] === '' || rawAmounts[i] == null ? null : +rawAmounts[i]);
      const specified = amounts.reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0);
      const unspecifiedCount = amounts.filter(amount => !Number.isFinite(amount)).length;
      const unallocated = Math.max(0, (+t.amount || 0) - specified);
      cats.forEach((cat, i) => categoryExpenses.push({
        cat,
        amount: Number.isFinite(amounts[i]) ? amounts[i] : (unspecifiedCount ? unallocated / unspecifiedCount : 0)
      }));
    } else categoryExpenses.push(t);
  });
  const catEntries = groupSum(categoryExpenses, t => t.cat, 8);
  const merchEntries = groupSum(expenses, t => t.desc, 8);

  if (charts.ccCategory) charts.ccCategory.destroy();
  charts.ccCategory = new Chart(catCanvas.getContext('2d'), ccPieConfig(catEntries));
  if (charts.ccMerchant) charts.ccMerchant.destroy();
  charts.ccMerchant = new Chart(merchCanvas.getContext('2d'), ccPieConfig(merchEntries));
}
// Transactions added/edited inside the embedded tracker don't fire any event this page can listen
// for, so while the Accounts & Cards page is the one on screen, re-check every couple seconds and
// redraw if anything changed — cheap, and means the pies stay current without a manual refresh.
let lastCCExpenseSnapshot = '';
setInterval(() => {
  const activePage = document.querySelector('.page.active');
  if (!activePage || activePage.dataset.page !== 'accounts') return;
  const snapshot = localStorage.getItem('cc-register') || '';
  if (snapshot === lastCCExpenseSnapshot) return;
  lastCCExpenseSnapshot = snapshot;
  renderCCSpendingCharts();
}, 1500);

function setRetirementAge(age) {
  const ageInput = els('retirementAge');
  if (!ageInput) return;
  ageInput.value = age;
  // Use precisely the same event path as entering the age manually. The field's own oninput handler
  // updates the retirement date, while the delegated input/change handlers protect the local
  // value, save it, and render the selected pill. Maintaining a
  // separate button-only save path allowed the control to say "Saved" while later restoring the
  // previous field value.
  ageInput.dispatchEvent(new Event('input', { bubbles:true }));
  ageInput.dispatchEvent(new Event('change', { bubbles:true }));
}

// Reverse of syncRetirementDate below: fires when the Retirement age field itself (or one of the
// 55/56/57 quick pills) is edited, so "Planned last working day" and its hint stay in step instead
// of sitting frozen at whatever date was last set (or the page default) while the age moves on.
// Defaults to the last calendar day of the target month, matching the field's own "last working day"
// framing and its original Dec 31 default.
function syncRetirementDateFromAge(shouldRender = true) {
  const ageEl = els('retirementAge');
  const dateEl = els('retirementDate');
  if (!ageEl || !dateEl) return;
  const targetAge = +ageEl.value;
  if (isNaN(targetAge)) return;
  const currentAge = +els('currentAge').value;
  const birthDateStr = els('birthDate') ? els('birthDate').value : '';
  // Unlike every other age-based milestone field (LTC start age, Medicare age, pension age, etc.), which
  // are genuinely tied to your actual birthday and correctly use ageToMonthValue's birth-month math,
  // "Planned last working day" isn't a birthday-triggered event at all — it's just whichever calendar
  // date you choose to stop working. It used to reuse ageToMonthValue (birth month) here too, which meant
  // every time the Retirement age field changed — typing a new number, or clicking one of the 55-59 quick
  // pills — this unconditionally overwrote the date back to the LAST DAY OF YOUR BIRTH MONTH (November 30
  // for a November birthday), silently discarding a deliberately-chosen date like December 31 every time.
  // Defaults to December 31 of the year you turn the target age instead, matching this field's own
  // original "planned last working day of the year" framing (see the two-col label above) — so changing
  // ages no longer fights a manually-set December 31 (or any other custom month/day already sitting here).
  const [by] = (birthDateStr || '').split('-').map(Number);
  const y = by ? (by + Math.round(targetAge)) : (new Date().getFullYear() + Math.round(targetAge - currentAge));
  dateEl.value = y + '-12-31';
  const hintEl = els('retirementDateHint');
  if (hintEl) {
    const monthsAway = Math.round((targetAge - currentAge) * 12);
    const yrs = Math.floor(Math.abs(monthsAway) / 12), mo = Math.abs(monthsAway) % 12;
    const label = new Date(y, 11, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    hintEl.textContent = monthsAway >= 0
      ? `≈ ${yrs} yr${yrs !== 1 ? 's' : ''} ${mo} mo from today — ${label}`
      : `That's in the past — ${label}`;
  }
  if (shouldRender) render();
}
function syncRetirementDate(force) {
  const dateVal = els('retirementDate').value;
  if (!dateVal) return;
  const today = new Date();
  const target = new Date(dateVal + 'T00:00:00');
  const msPerYear = 365.25*24*60*60*1000;
  const yearsAway = (target - today) / msPerYear;
  const currentAge = +els('currentAge').value;
  // Anchor the implied age on the real birth date (day precision), not elapsed-time-from-today —
  // same fix as monthToAge/dateToAge/syncAgeDate. The date itself is still a freely-chosen calendar
  // date (not birthday-locked, see comment above syncAgeFromRetirementAge), but whatever date you
  // land on still corresponds to one specific real age, which this now computes exactly.
  const birthDateStr = els('birthDate') ? els('birthDate').value : '';
  const [by, bm, bd] = (birthDateStr || '').split('-').map(Number);
  const [ty, tm, td] = dateVal.split('-').map(Number);
  const impliedAge = (by && bm)
    ? (ty - by - ((tm > bm || (tm === bm && (bd ? td >= bd : true))) ? 0 : 1))
    : Math.round(currentAge + yearsAway);
  if (force) els('retirementAge').value = Math.max(1, impliedAge);
  const months = Math.round(yearsAway*12);
  const y = Math.floor(months/12), m = months%12;
  els('retirementDateHint').textContent = yearsAway >= 0
    ? `≈ ${y} yr${y!==1?'s':''} ${m} mo from today — sets retirement age to ${Math.max(1,impliedAge)}`
    : `That date is in the past — pick a future date`;
  render();
}

// Generic month/year -> age sync, mirrors syncRetirementDate() for any age-based milestone field.
// basisAgeFieldId is whichever person's current age the target date should be measured against
// (currentAge for the user's own milestones, spouseAge for spouse-anchored ones like LTC start age).
function syncAgeDate(dateFieldId, ageFieldId, hintFieldId, basisAgeFieldId) {
  const dateEl = els(dateFieldId);
  if (!dateEl) return;
  const dateVal = dateEl.value;
  const hintEl = els(hintFieldId);
  if (!dateVal) { if (hintEl) hintEl.textContent = ''; return; }
  const basisAge = +els(basisAgeFieldId).value;
  const [y, m] = dateVal.split('-').map(Number);
  const today = new Date();
  const monthsAway = (y - today.getFullYear()) * 12 + (m - 1 - today.getMonth());
  // Anchor the actual stored age on the real birth year/month (same fix as monthToAge/dateToAge)
  // rather than the "today + elapsed months" approximation — spouse-basis fields (spousalStartAge,
  // ltcStartAge) anchor on the spouse's own birth date, mirroring syncDateFromAge's reverse direction.
  const birthDateFieldId = basisAgeFieldId === 'spouseAge' ? 'spouseBirthDate' : 'birthDate';
  const birthDateStr = els(birthDateFieldId) ? els(birthDateFieldId).value : '';
  const [by, bm] = (birthDateStr || '').split('-').map(Number);
  const impliedAge = (by && bm) ? (y - by - (m < bm ? 1 : 0)) : Math.round(basisAge + monthsAway / 12);
  els(ageFieldId).value = Math.max(1, impliedAge);
  if (hintEl) {
    const yrs = Math.floor(Math.abs(monthsAway) / 12), mo = Math.abs(monthsAway) % 12;
    hintEl.textContent = monthsAway >= 0
      ? `≈ ${yrs} yr${yrs !== 1 ? 's' : ''} ${mo} mo from today — sets age to ${Math.max(1, impliedAge)}`
      : `That date is in the past`;
  }
  render();
}

// Inverse of the monthsAway math inside syncAgeDate above: given a target age and the actual
// birthdate ("YYYY-MM-DD") it's measured from, returns a "YYYY-MM" string suitable for an
// <input type="month">'s .value. Anchored on the real birth year/month, not "today" — a birthday
// always lands in the same calendar month every year, so this is exact, not an approximation, and
// it no longer defaults to whatever month it happens to be right now (e.g. July) instead of the
// person's actual birth month (e.g. November).
function ageToMonthValue(birthDateStr, targetAge) {
  if (targetAge === null || targetAge === undefined || isNaN(targetAge) || !birthDateStr) return '';
  const [by, bm] = birthDateStr.split('-').map(Number);
  if (!by || !bm) return '';
  const y = by + Math.round(targetAge);
  return y + '-' + String(bm).padStart(2, '0');
}
// Authoritative direction: your actual birthdate never needs "correcting" the way a plain age
// number does, so a real birthdate (not just a birth month, and not a manually-bumped "current age")
// drives currentAge/spouseAge automatically — including re-computing them fresh on every page load,
// so the age never goes stale between birthdays the way a hand-typed number would.
function computeAgeFromBirthDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthdayThisYear = (today.getMonth() + 1 > m) || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthdayThisYear) age--;
  return age;
}
function syncAgeFromBirthDate(dateFieldId, ageFieldId, monthFieldId, hintFieldId) {
  const dateEl = els(dateFieldId);
  if (!dateEl || !dateEl.value) return;
  const age = computeAgeFromBirthDate(dateEl.value);
  if (age === null) return;
  const ageEl = els(ageFieldId);
  if (ageEl) ageEl.value = age;
  const [y, m, d] = dateEl.value.split('-').map(Number);
  const monthEl = els(monthFieldId);
  if (monthEl) monthEl.value = m;
  const hintEl = els(hintFieldId);
  if (hintEl) {
    const label = new Date(y, m - 1, d).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    hintEl.textContent = `${label} — currently ${age} years old`;
  }
  render();
}

// The reverse direction of syncAgeDate: fires when the AGE number field itself is edited directly
// (which is how most people actually use these fields — the month/year picker is the secondary,
// optional way in). Without this, editing the age left the date picker and its hint exactly where
// they started (usually blank), so there was no way to tell what calendar year a given age actually
// falls in without doing the math yourself. Keeps both fields — and the hint — in sync no matter
// which one you actually typed into.
function syncDateFromAge(ageFieldId, dateFieldId, hintFieldId, basisAgeFieldId) {
  const ageEl = els(ageFieldId);
  const dateEl = els(dateFieldId);
  if (!ageEl || !dateEl) return;
  const targetAge = +ageEl.value;
  if (isNaN(targetAge)) return;
  const basisAge = +els(basisAgeFieldId).value;
  // Spouse-basis milestones (spousalStartAge, ltcStartAge) anchor on the spouse's own birth month;
  // everything else anchors on your birth month.
  const birthDateFieldId = basisAgeFieldId === 'spouseAge' ? 'spouseBirthDate' : 'birthDate';
  const birthDateStr = els(birthDateFieldId) ? els(birthDateFieldId).value : '';
  const monthVal = ageToMonthValue(birthDateStr, targetAge);
  if (!monthVal) return;
  dateEl.value = monthVal;
  const hintEl = els(hintFieldId);
  if (hintEl) {
    const monthsAway = Math.round((targetAge - basisAge) * 12);
    const yrs = Math.floor(Math.abs(monthsAway) / 12), mo = Math.abs(monthsAway) % 12;
    const [y, m] = monthVal.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    hintEl.textContent = monthsAway >= 0
      ? `≈ ${yrs} yr${yrs !== 1 ? 's' : ''} ${mo} mo from today — ${label}`
      : `That's in the past — ${label}`;
  }
  render();
}

// ---------- Long-term care: type-of-care presets (Boise, ID area estimates, today's $) ----------
// Sources: Genworth/CareScout Cost of Care Survey (state + Boise-area figures) and current local
// caregiver rate listings. These are starting points, not locked numbers — the Annual cost field
// stays freely editable after picking a type.
const VA_SPOUSE_AA_MONTHLY_2026 = 201.41;
const LTC_CARE_TYPE_COSTS = {
  inhome_parttime: 31200,   // ~20 hrs/wk at ~$30/hr
  inhome_parttime_va: 31200,
  va_spouse_aa_only: 0,
  inhome_fulltime: 78000,   // ~50 hrs/wk at ~$30/hr
  assisted_living: 54000,   // Boise-area facilities run below Idaho's ~$60k/yr statewide median
  memory_care: 72000,       // assisted living + typical memory-care add-on
  nursing_home: 120000,     // semi-private skilled nursing, Idaho runs above the national median
  medicaid_spenddown: 120000, // conservative private-pay baseline until Medicaid eligibility is established
  family: 12000,            // incidentals/respite/supplies, not a full wage replacement
  none: 0
};
function updateLtcCareType(type) {
  if (type === 'custom') { render(); return; }
  const cost = LTC_CARE_TYPE_COSTS[type];
  if (cost !== undefined) els('ltcAnnualCost').value = cost;
  render();
}
function renderLtcVaAidReadout() {
  const readout = els('ltcVaAidReadout');
  const type = els('ltcCareType') ? els('ltcCareType').value : 'custom';
  if (!readout) return;
  if (type === 'medicaid_spenddown') {
    readout.style.display = 'block';
    readout.innerHTML = `<b>Selected strategy:</b> Use accessible savings for care, then apply for Idaho Medicaid long-term-care coverage. The projection uses the entered private-pay cost and identifies when household resources can no longer cover it; it does not presume approval or erase the cost automatically. Idaho's 2026 published long-term-care limits include a $3,002 monthly individual income limit and $2,000 individual resource limit, but medical-level-of-care rules, community-spouse protections, exempt assets, income contribution, the five-year transfer review, and estate recovery can materially change the result. Review this strategy with Idaho Medicaid and an elder-law attorney before relying on it.`;
    return;
  }
  const includesVaAid = type === 'inhome_parttime_va' || type === 'va_spouse_aa_only';
  readout.style.display = includesVaAid ? 'block' : 'none';
  if (!includesVaAid) {
    readout.textContent = '';
    return;
  }
  const annualBenefit = VA_SPOUSE_AA_MONTHLY_2026 * 12;
  if (type === 'va_spouse_aa_only') {
    readout.innerHTML = `<b>Selected model:</b> ${fmtMoney(VA_SPOUSE_AA_MONTHLY_2026)}/month (${fmtMoney(annualBenefit)}/year) of tax-free VA compensation during the selected care period, with no paid-care expense entered.`;
    return;
  }
  const annualCareCost = Math.max(0, +(els('ltcAnnualCost') ? els('ltcAnnualCost').value : 0) || 0);
  readout.innerHTML = `<b>Selected model:</b> ${fmtMoney(annualCareCost)}/year of part-time in-home care plus ${fmtMoney(VA_SPOUSE_AA_MONTHLY_2026)}/month (${fmtMoney(annualBenefit)}/year) of tax-free VA compensation. First-year net household cost: ${fmtMoney(Math.max(0, annualCareCost - annualBenefit))}, before future medical inflation and VA increases.`;
}

// ---------- Persistence (localStorage) so values survive a page refresh ----------
const STORAGE_KEY = 'retirementPlannerState_v1';
const SHARED_INVESTMENT_KEY = 'mlma_investment_sync_v1';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'retirementPlannerAnthropicApiKey_v1';

function saveAnthropicApiKeyLocal() {
  const input = els('anthropicApiKey');
  if (!input) return;
  const key = (input.value || '').trim();
  try {
    if (key) localStorage.setItem(ANTHROPIC_API_KEY_STORAGE_KEY, key);
    else localStorage.removeItem(ANTHROPIC_API_KEY_STORAGE_KEY);
  } catch (e) { /* browser storage unavailable */ }
}
function restoreAnthropicApiKeyLocal() {
  const input = els('anthropicApiKey');
  if (!input) return;
  try { input.value = localStorage.getItem(ANTHROPIC_API_KEY_STORAGE_KEY) || ''; } catch (e) { input.value = ''; }
}
function clearAnthropicApiKeyLocal() {
  try { localStorage.removeItem(ANTHROPIC_API_KEY_STORAGE_KEY); } catch (e) { /* ignore */ }
  const input = els('anthropicApiKey');
  if (input) input.value = '';
}
const ACTIVE_PAGE_KEY = 'retirementPlannerActivePage_v1';
let allocationExplorerStrategy = 'moderate';
// Backup reminder: since this tool is a single offline HTML file with no server, everything you enter
// only ever lives in this one browser's localStorage unless you explicitly download a JSON backup — a
// browser data wipe, a new device, or even just clearing site data loses it all silently. LAST_BACKUP_KEY
// tracks when you last actually clicked "Download backup," separate from STORAGE_KEY (which just tracks
// your plan data itself and says nothing about whether it's ever been exported anywhere else).
const LAST_BACKUP_KEY = 'retirementPlannerLastBackup_v1';
const BACKUP_REMINDER_DISMISSED_KEY = 'retirementPlannerBackupReminderDismissed_v1';
const BACKUP_REMINDER_STALE_DAYS = 30;
const BACKUP_REMINDER_SNOOZE_DAYS = 7;

// ---------- Legacy cloud functions retained only for backup compatibility ----------
// Network synchronization is disabled; the planner operates entirely from local browser storage.
const PLANNER_SITE_URL = 'https://michealsizemore1.github.io/2026-ChatGPT-Retirement-Planner/';
const CLOUD_LAST_SYNC_KEY = 'retirementPlannerCloudLastSync_v1';
const CLOUD_DIRTY_KEY = 'retirementPlannerCloudDirty_v1';
const CLOUD_RESET_PENDING_KEY = 'retirementPlannerCloudResetPending_v1';
const CLOUD_EMAIL_KEY = 'retirementPlannerCloudEmail_v1';
const RETIREMENT_AGE_PENDING_KEY = 'retirementPlannerRetirementAgePending_v1';
// Version 2 deliberately isolates the official legacy online service client from old planner tabs that used the
// original hand-built refresh-token code. Those older tabs can remain open in browser history and
// rotate a shared v1 token, invalidating the current page's session. A one-time fresh sign-in creates
// a clean v2 session that older builds cannot read or overwrite.
const PLANNER_AUTH_STORAGE_KEY = 'retirementPlannerLegacyRemoteAuth_v2';
const PLANNER_REFRESH_STORAGE_KEY = 'retirementPlannerRefreshToken_v2';
const PLANNER_ACCESS_STORAGE_KEY = 'retirementPlannerAccessToken_v2';
const PLANNER_EXPIRY_STORAGE_KEY = 'retirementPlannerTokenExpiry_v2';
const PLANNER_USER_STORAGE_KEY = 'retirementPlannerCloudUser_v2';
const PLANNER_SESSION_DB_NAME = 'retirementPlannerSecureSession_v2';
const PLANNER_SESSION_DB_STORE = 'session';
const CLOUD_SYNC_DELAY_MS = 1400;

let plannerCloudSession = null;
let plannerCloudUser = null;
let plannerCloudReady = false;
let plannerCloudTrackChanges = false;
let plannerCloudApplying = false;
let plannerCloudSyncing = false;
let plannerCloudSyncPending = false;
let plannerCloudSyncTimer = null;
let plannerCloudHandlingUserId = null;
let plannerCloudRefreshPromise = null;
let plannerLegacyRemoteClient = null;
let plannerCloudLocalEditDuringInit = false;
let plannerCloudStartupRetryCount = 0;
let plannerCloudRecoveryCount = 0;
let plannerCloudRecoveryTimer = null;

function plannerSessionDbOpen() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(PLANNER_SESSION_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PLANNER_SESSION_DB_STORE)) db.createObjectStore(PLANNER_SESSION_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Session database unavailable'));
  });
}
function plannerSessionDbTimeout(promise, milliseconds = 3000) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Session database timed out')), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
async function plannerSessionDbSet(session) {
  try {
    const db = await plannerSessionDbTimeout(plannerSessionDbOpen());
    await plannerSessionDbTimeout(new Promise((resolve, reject) => {
      const tx = db.transaction(PLANNER_SESSION_DB_STORE, 'readwrite');
      tx.objectStore(PLANNER_SESSION_DB_STORE).put(session, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Session could not be saved'));
    }));
    db.close();
    return true;
  } catch (e) { return false; }
}
async function plannerSessionDbRemove() {
  try {
    const db = await plannerSessionDbTimeout(plannerSessionDbOpen());
    await plannerSessionDbTimeout(new Promise((resolve, reject) => {
      const tx = db.transaction(PLANNER_SESSION_DB_STORE, 'readwrite');
      tx.objectStore(PLANNER_SESSION_DB_STORE).delete('current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Session could not be removed'));
    }));
    db.close();
  } catch (e) { /* local sign-out still continues */ }
}

function cloudStorageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function cloudStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
}
function cloudStorageRemove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
}
function rememberRetirementAgeSelection(age) {
  const selectedAge = Number(age);
  if (!Number.isFinite(selectedAge)) return;
  const selectedAt = new Date().toISOString();
  cloudStorageSet(RETIREMENT_AGE_PENDING_KEY, JSON.stringify({ age:selectedAge, selectedAt }));
  // Do not depend on plannerCloudTrackChanges here. A retirement-age button can be selected while
  // session restoration is still running, and that deliberate selection must win on the next load.
  cloudStorageSet(CLOUD_DIRTY_KEY, selectedAt);
}
function readPendingRetirementAgeSelection() {
  try {
    const pending = JSON.parse(cloudStorageGet(RETIREMENT_AGE_PENDING_KEY) || 'null');
    return pending && Number.isFinite(Number(pending.age)) && pending.selectedAt ? {
      age:Number(pending.age),
      selectedAt:String(pending.selectedAt)
    } : null;
  } catch (e) {
    return null;
  }
}
function applyPendingRetirementAgeSelection(remoteUpdatedAt = null) {
  const pending = readPendingRetirementAgeSelection();
  if (!pending) return false;
  if (remoteUpdatedAt && !timestampAfter(pending.selectedAt, remoteUpdatedAt, 0)) return false;
  const ageEl = els('retirementAge');
  if (!ageEl) return false;
  ageEl.value = pending.age;
  // Cloud application performs one controlled render after every field has been restored. Rendering
  // here would run the entire planner halfway through that restore and can touch optional UI elements
  // before their section has been rebuilt.
  syncRetirementDateFromAge(false);
  return true;
}
function plannerAuthCookieGet(key) {
  try {
    const prefix = encodeURIComponent(key) + '=';
    const part = document.cookie.split('; ').find(item => item.startsWith(prefix));
    return part ? decodeURIComponent(part.slice(prefix.length)) : null;
  } catch (e) {
    return null;
  }
}
function plannerAuthCookieSet(key, value) {
  try {
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
    return plannerAuthCookieGet(key) === value;
  } catch (e) {
    return false;
  }
}
function plannerAuthCookieRemove(key) {
  try { document.cookie = `${encodeURIComponent(key)}=; Max-Age=0; Path=/; SameSite=Lax; Secure`; } catch (e) { /* unavailable */ }
}
// legacy online service normally persists in localStorage. Mirroring the same session into sessionStorage and a
// first-party cookie makes ordinary refreshes resilient on browsers that selectively block one
// storage mechanism. Sign out removes all three copies.
const plannerAuthStorage = {
  getItem(key) {
    try {
      const localValue = window.localStorage && window.localStorage.getItem(key);
      if (localValue) return localValue;
    } catch (e) { /* try the next browser store */ }
    try {
      const sessionValue = window.sessionStorage && window.sessionStorage.getItem(key);
      if (sessionValue) return sessionValue;
    } catch (e) { /* try the cookie fallback */ }
    return plannerAuthCookieGet(key);
  },
  setItem(key, value) {
    let saved = false;
    try { window.localStorage.setItem(key, value); saved = window.localStorage.getItem(key) === value || saved; } catch (e) { /* fallback below */ }
    try { window.sessionStorage.setItem(key, value); saved = window.sessionStorage.getItem(key) === value || saved; } catch (e) { /* fallback below */ }
    saved = plannerAuthCookieSet(key, value) || saved;
    if (!saved) throw new Error('This browser is blocking the storage needed to retain your sign-in.');
  },
  removeItem(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* continue */ }
    try { window.sessionStorage.removeItem(key); } catch (e) { /* continue */ }
    plannerAuthCookieRemove(key);
  }
};
function getPlannerLegacyRemoteClient() {
  if (plannerLegacyRemoteClient) return plannerLegacyRemoteClient;
  if (!window.legacyRemote || typeof window.legacyRemote.createClient !== 'function') {
    throw new Error('The secure synchronization library did not load. Check the internet connection and refresh once.');
  }
  plannerLegacyRemoteClient = window.legacyRemote.createClient(PLANNER_REMOTE_URL, PLANNER_REMOTE_PUBLISHABLE_KEY, {
    auth:{
      storage:plannerAuthStorage,
      storageKey:PLANNER_AUTH_STORAGE_KEY,
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:false
    }
  });
  return plannerLegacyRemoteClient;
}
function formatCloudTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
}
function setCloudStatus(state, shortText, detail) {
  const badge = els('cloudSyncBadge');
  if (badge) badge.dataset.state = state;
  const badgeText = els('cloudSyncBadgeText');
  if (badgeText) badgeText.textContent = shortText;
  const status = els('cloudSettingsStatus');
  if (status) status.textContent = shortText;
  const statusDetail = els('cloudStatusDetail');
  if (statusDetail && detail) statusDetail.textContent = detail;
  const dot = els('cloudSettingsDot');
  if (dot) {
    const colors = { saved:'#4ed1a2', syncing:'#7ec8ff', offline:'#f49a8f', error:'#f49a8f', checking:'#f0b44d', unsigned:'#f0b44d', unsaved:'#f0b44d' };
    dot.style.background = colors[state] || colors.checking;
  }
}
function updateCloudAccountUi() {
  const email = plannerCloudUser && plannerCloudUser.email ? plannerCloudUser.email : '';
  const emailEl = els('cloudAccountEmail');
  if (emailEl) emailEl.textContent = email || 'Not signed in — this device is using its local copy';
  const signInBtn = els('cloudSignInSettingsBtn');
  const signOutBtn = els('cloudSignOutBtn');
  const syncBtn = els('cloudSyncNowBtn');
  if (signInBtn) signInBtn.style.display = email ? 'none' : '';
  if (signOutBtn) signOutBtn.style.display = email ? '' : 'none';
  if (syncBtn) syncBtn.disabled = !email;
}
function showCloudAuthMessage(message, isError = false) {
  const el = els('cloudAuthMessage');
  if (!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
  el.classList.toggle('error', !!isError);
}
function showPlannerSignIn() {
  const overlay = els('cloudAuthOverlay');
  if (overlay) overlay.style.display = 'flex';
  const checking = els('cloudAuthChecking');
  const intro = els('cloudAuthIntro');
  const form = els('cloudAuthForm');
  const forgot = els('cloudForgotPasswordBtn');
  const offlineHelp = els('cloudAuthOfflineHelp');
  if (checking) checking.style.display = 'none';
  if (intro) intro.style.display = '';
  if (form) form.style.display = '';
  if (forgot) forgot.style.display = '';
  if (offlineHelp) offlineHelp.style.display = '';
  const remembered = cloudStorageGet(CLOUD_EMAIL_KEY);
  const email = els('cloudAuthEmail');
  if (email && remembered && !email.value) email.value = remembered;
  setTimeout(() => { const target = email && !email.value ? email : els('cloudAuthPassword'); if (target) target.focus(); }, 50);
}
function hidePlannerSignIn() {
  const overlay = els('cloudAuthOverlay');
  if (overlay) overlay.style.display = 'none';
  showCloudAuthMessage('');
}
function continuePlannerOffline() {
  hidePlannerSignIn();
  plannerCloudTrackChanges = true;
  setCloudStatus('offline', 'Offline', 'Changes are protected on this device and will synchronize after you sign in with an internet connection.');
  updateCloudAccountUi();
}
function savePlannerCloudSession(session) {
  plannerCloudSession = session || null;
  if (session) {
    try { plannerAuthStorage.setItem(PLANNER_AUTH_STORAGE_KEY, JSON.stringify(session)); } catch (e) { /* compact fallback below */ }
    // The complete session can exceed a browser cookie's size limit. Keep the small rotating refresh
    // credential and the other essential pieces separately so the session can be rebuilt instantly
    // after refresh even if a browser discarded the larger local-storage record.
    plannerAuthStorage.setItem(PLANNER_REFRESH_STORAGE_KEY, session.refresh_token);
    plannerAuthStorage.setItem(PLANNER_ACCESS_STORAGE_KEY, session.access_token);
    plannerAuthStorage.setItem(PLANNER_EXPIRY_STORAGE_KEY, String(session.expires_at || 0));
    plannerAuthStorage.setItem(PLANNER_USER_STORAGE_KEY, JSON.stringify({
      id:session.user && session.user.id || '',
      email:session.user && session.user.email || ''
    }));
  } else {
    plannerAuthStorage.removeItem(PLANNER_AUTH_STORAGE_KEY);
    plannerAuthStorage.removeItem(PLANNER_REFRESH_STORAGE_KEY);
    plannerAuthStorage.removeItem(PLANNER_ACCESS_STORAGE_KEY);
    plannerAuthStorage.removeItem(PLANNER_EXPIRY_STORAGE_KEY);
    plannerAuthStorage.removeItem(PLANNER_USER_STORAGE_KEY);
  }
}
function readPlannerStoredSessionAny() {
  try {
    const raw = plannerAuthStorage.getItem(PLANNER_AUTH_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const session = saved && saved.currentSession ? saved.currentSession : saved;
      if (session && session.access_token && session.refresh_token && session.user) return session;
    }
  } catch (e) {
    // Fall through to the compact refresh credential.
  }
  const refreshToken = plannerAuthStorage.getItem(PLANNER_REFRESH_STORAGE_KEY);
  if (!refreshToken) return null;
  const accessToken = plannerAuthStorage.getItem(PLANNER_ACCESS_STORAGE_KEY);
  const expiresAt = Number(plannerAuthStorage.getItem(PLANNER_EXPIRY_STORAGE_KEY) || 0);
  let user = null;
  try { user = JSON.parse(plannerAuthStorage.getItem(PLANNER_USER_STORAGE_KEY) || 'null'); } catch (e) { user = null; }
  return {
    refresh_token:refreshToken,
    access_token:accessToken || '',
    expires_at:expiresAt,
    user:user && user.id ? user : null
  };
}
async function plannerLegacyRemoteRequest(path, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = Object.assign({
      apikey:PLANNER_REMOTE_PUBLISHABLE_KEY,
      'Content-Type':'application/json'
    }, options.headers || {});
    const response = await fetch(PLANNER_REMOTE_URL + path, Object.assign({}, options, { headers, signal:controller.signal }));
    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = text; }
    }
    if (!response.ok) {
      const message = data && (data.msg || data.message || data.error_description || data.error)
        ? (data.msg || data.message || data.error_description || data.error)
        : `legacy online service returned ${response.status}.`;
      const requestError = new Error(message);
      requestError.status = response.status;
      throw requestError;
    }
    return data;
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('The secure cloud request timed out. Your local copy remains available.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
async function refreshPlannerCloudSession(session) {
  // A refresh token rotates when it is used. During page startup several asynchronous tasks can ask
  // for a session at nearly the same moment; sharing one refresh promise prevents a second request
  // from trying to reuse the just-rotated token and producing a false Sync error.
  if (plannerCloudRefreshPromise) return plannerCloudRefreshPromise;
  plannerCloudRefreshPromise = (async () => {
    const client = getPlannerLegacyRemoteClient();
    const result = await client.auth.refreshSession({ refresh_token:session.refresh_token });
    if (result.error) throw result.error;
    const refreshed = result.data && result.data.session;
    if (!refreshed) throw new Error('The saved secure session could not be renewed. Sign in once to reconnect this device.');
    savePlannerCloudSession(refreshed);
    await plannerSessionDbSet(refreshed);
    return refreshed;
  })();
  try {
    return await plannerCloudRefreshPromise;
  } finally {
    plannerCloudRefreshPromise = null;
  }
}
async function ensurePlannerCloudSession() {
  const client = getPlannerLegacyRemoteClient();
  const result = await client.auth.getSession();
  if (result.error) throw result.error;
  let session = result.data && result.data.session;
  if (!session) {
    const stored = plannerCloudSession || readPlannerStoredSessionAny();
    if (!stored || !stored.refresh_token) return null;
    session = await refreshPlannerCloudSession(stored);
  }
  plannerCloudSession = session;
  savePlannerCloudSession(session);
  return session;
}
async function plannerDatabaseRequest(path, options = {}, timeoutMs = 20000, allowAuthRetry = true) {
  let session = await ensurePlannerCloudSession();
  if (!session) throw new Error('Sign in before synchronizing.');
  options.headers = Object.assign({}, options.headers || {}, { Authorization:`Bearer ${session.access_token}` });
  try {
    return await plannerLegacyRemoteRequest('/rest/v1/' + path, options, timeoutMs);
  } catch (e) {
    // legacy online service can invalidate an otherwise unexpired access token after a browser refresh. Refresh the
    // session once and repeat the authenticated request instead of displaying a Sync error that vanishes
    // as soon as the user presses Synchronize now.
    if (allowAuthRetry && e && (e.status === 401 || e.status === 403) && session.refresh_token) {
      session = await refreshPlannerCloudSession(session);
      const retryOptions = Object.assign({}, options, {
        headers:Object.assign({}, options.headers || {}, { Authorization:`Bearer ${session.access_token}` })
      });
      return plannerDatabaseRequest(path, retryOptions, timeoutMs, false);
    }
    throw e;
  }
}

async function loadPlannerCloudRow(userId) {
  // legacy online service projects and mobile connections can need an extra moment immediately after a refresh.
  // The manual Sync button succeeding after the first load failed showed that the request itself was
  // valid. Retry this read once before presenting an error; GET is safe to repeat and no plan is changed.
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rows = await plannerDatabaseRequest('retirement_plans?select=plan_data,updated_at&user_id=eq.' +
        encodeURIComponent(userId) + '&limit=1', { method:'GET' }, 20000);
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    } catch (e) {
      lastError = e;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastError || new Error('The secure cloud copy could not be loaded.');
}
function plannerAuthStorageWorks() {
  const probeKey = 'retirementPlannerStorageProbe_v1';
  try {
    plannerAuthStorage.setItem(probeKey, 'ok');
    const works = plannerAuthStorage.getItem(probeKey) === 'ok';
    plannerAuthStorage.removeItem(probeKey);
    return works;
  } catch (e) {
    return false;
  }
}
async function sendPlannerPasswordReset() {
  const email = (els('cloudAuthEmail') && els('cloudAuthEmail').value || '').trim();
  if (!email) { showCloudAuthMessage('Enter your email address first, then select Forgot password.', true); return; }
  try {
    await plannerLegacyRemoteRequest('/auth/v1/recover?redirect_to=' + encodeURIComponent(PLANNER_SITE_URL), {
      method:'POST',
      body:JSON.stringify({ email })
    });
    showCloudAuthMessage('Password-reset instructions were sent if that email belongs to the planner account.');
  } catch (e) {
    showCloudAuthMessage(e && e.message ? e.message : 'The password-reset email could not be sent.', true);
  }
}
async function completePlannerPasswordRecovery() {
  const newPassword = prompt('Enter a new planner password (at least 8 characters).');
  if (!newPassword) {
    showPlannerSignIn();
    showCloudAuthMessage('The password was not changed. You can reopen the reset link when ready.', true);
    return;
  }
  if (newPassword.length < 8) {
    alert('For safety, use a password with at least 8 characters.');
    return completePlannerPasswordRecovery();
  }
  try {
    const session = await ensurePlannerCloudSession();
    if (!session) throw new Error('The password-reset session has expired. Request a new reset email.');
    const updatedUser = await plannerLegacyRemoteRequest('/auth/v1/user', {
      method:'PUT',
      headers:{ Authorization:`Bearer ${session.access_token}` },
      body:JSON.stringify({ password:newPassword })
    });
    session.user = updatedUser;
    savePlannerCloudSession(session);
    await plannerSessionDbSet(session);
    alert('Your planner password was updated. The synchronized plan will now load.');
    await handlePlannerCloudSession(session);
  } catch (e) {
    showPlannerSignIn();
    showCloudAuthMessage(e && e.message ? e.message : 'The password could not be updated.', true);
  }
}
function markPlannerCloudDirty() {
  if (!plannerCloudTrackChanges || plannerCloudApplying) return;
  cloudStorageSet(CLOUD_DIRTY_KEY, new Date().toISOString());
  setCloudStatus(navigator.onLine === false ? 'offline' : 'unsaved', navigator.onLine === false ? 'Offline' : 'Saving…',
    navigator.onLine === false ? 'The latest changes are safe on this device and will synchronize when online.' : 'A recent change is waiting to be synchronized.');
}
function schedulePlannerCloudSync() {
  return;
  if (!plannerCloudTrackChanges || plannerCloudApplying || plannerCloudSyncing) return;
  markPlannerCloudDirty();
  clearTimeout(plannerCloudSyncTimer);
  if (!plannerCloudUser || navigator.onLine === false) return;
  plannerCloudSyncTimer = setTimeout(() => syncCloudNow(false), CLOUD_SYNC_DELAY_MS);
}
function timestampAfter(a, b, toleranceMs = 1000) {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  return isFinite(ta) && isFinite(tb) && ta > tb + toleranceMs;
}
function clearPlannerCloudRecoveryTimer() {
  if (plannerCloudRecoveryTimer) clearTimeout(plannerCloudRecoveryTimer);
  plannerCloudRecoveryTimer = null;
}
function discardPendingLocalCloudEdits() {
  cloudStorageRemove(CLOUD_DIRTY_KEY);
  cloudStorageRemove(RETIREMENT_AGE_PENDING_KEY);
  plannerCloudLocalEditDuringInit = false;
}
async function applyPlannerCloudState(state, remoteUpdatedAt) {
  if (!state || typeof state !== 'object') return;
  plannerCloudApplying = true;
  try {
    applyState(state);
    // A retirement-age button selection made on this device is a protected local edit. If it is
    // newer than the cloud row being loaded, restore it after applying that row so age 57 cannot be
    // replaced by an older saved age 55 during refresh.
    applyPendingRetirementAgeSelection(remoteUpdatedAt);
    if (typeof state.sharedNotesText === 'string') {
      sharedNotesText = state.sharedNotesText;
      cloudStorageSet(SHARED_NOTES_KEY, sharedNotesText);
      renderSharedNotesTextareas();
    }
    if (state.checkpointBaseline !== undefined) { checkpointBaseline = state.checkpointBaseline; persistCheckpointBaseline(); }
    if (Array.isArray(state.checkpointHistory)) { checkpointHistory = state.checkpointHistory; persistCheckpointHistory(); }
    try {
      renderExpenseRows(); renderBrokeragePieRows(); renderPieContributionRows(); renderDebtRows();
      renderFutureExpenseRows(); renderWindfallRows(); renderInsuranceRows();
      const route = state.activePage && PAGE_LABELS[state.activePage] ? state.activePage : readInitialPage();
      if (route) activatePageShell(route);
      if (route === 'explorers' && isKnownExplorerAnalysis(state.selectedExplorerAnalysis)) {
        activateExplorerAnalysis(state.selectedExplorerAnalysis, false, false);
      }
      render();
      collapsePlannerCards();
    } catch (renderError) {
      // Synchronization has already restored the plan fields at this point. A missing or optional
      // display element must not turn a valid cloud load into a Sync error, leave the dirty marker
      // behind, and repeatedly ask the user to resolve the same device conflict.
      console.error('Planner display refresh after cloud load failed:', renderError);
    }
    saveState();
  } finally {
    plannerCloudApplying = false;
  }
  if (remoteUpdatedAt) cloudStorageSet(CLOUD_LAST_SYNC_KEY, remoteUpdatedAt);
  cloudStorageRemove(CLOUD_DIRTY_KEY);
}
async function pushCurrentPlanToCloud() {
  if (!plannerCloudUser) throw new Error('Sign in before synchronizing.');
  const pendingRetirementAge = readPendingRetirementAgeSelection();
  if (pendingRetirementAge) applyPendingRetirementAgeSelection();
  const state = saveState();
  const updatedAt = new Date().toISOString();
  const rows = await plannerDatabaseRequest('retirement_plans?on_conflict=user_id&select=plan_data,updated_at', {
    method:'POST',
    headers:{ Prefer:'resolution=merge-duplicates,return=representation' },
    body:JSON.stringify({
      user_id:plannerCloudUser.id,
      plan_data:state,
      updated_at:updatedAt
    })
  });
  const savedRow = Array.isArray(rows) ? rows[0] : rows;
  const confirmedAt = savedRow && savedRow.updated_at ? savedRow.updated_at : updatedAt;
  if (pendingRetirementAge) {
    const confirmedAge = savedRow && savedRow.plan_data && savedRow.plan_data.fields
      ? Number(savedRow.plan_data.fields.retirementAge) : NaN;
    if (confirmedAge !== Number(pendingRetirementAge.age)) {
      cloudStorageSet(CLOUD_DIRTY_KEY, pendingRetirementAge.selectedAt);
      throw new Error('The selected retirement age was kept safely on this device but was not confirmed by the cloud. Synchronization will retry.');
    }
  }
  cloudStorageSet(CLOUD_LAST_SYNC_KEY, confirmedAt);
  cloudStorageRemove(CLOUD_DIRTY_KEY);
  if (pendingRetirementAge) cloudStorageRemove(RETIREMENT_AGE_PENDING_KEY);
  return confirmedAt;
}
async function handlePlannerCloudSession(session) {
  if (!session || !session.user) {
    plannerCloudUser = null;
    plannerCloudReady = true;
    plannerCloudTrackChanges = false;
    updateCloudAccountUi();
    setCloudStatus('unsigned', 'Sign in', 'Sign in to securely load and synchronize your plan. The local copy remains on this device.');
    showPlannerSignIn();
    return;
  }
  if (plannerCloudHandlingUserId === session.user.id) return;
  plannerCloudHandlingUserId = session.user.id;
  plannerCloudUser = session.user;
  cloudStorageSet(CLOUD_EMAIL_KEY, session.user.email || '');
  updateCloudAccountUi();
  setCloudStatus('syncing', 'Loading…', 'Checking legacy online service for the latest saved plan.');
  try {
    plannerCloudSession = session;
    const data = await loadPlannerCloudRow(session.user.id);
    const resetPending = cloudStorageGet(CLOUD_RESET_PENDING_KEY) === '1';
    const pendingRetirementAge = readPendingRetirementAgeSelection();
    const localDirtyAt = cloudStorageGet(CLOUD_DIRTY_KEY) || (pendingRetirementAge && pendingRetirementAge.selectedAt);
    const lastSyncAt = cloudStorageGet(CLOUD_LAST_SYNC_KEY);
    if (resetPending) {
      cloudStorageRemove(CLOUD_RESET_PENDING_KEY);
      plannerCloudTrackChanges = true;
      const savedAt = await pushCurrentPlanToCloud();
      setCloudStatus('saved', 'Saved', `The reset plan was synchronized ${formatCloudTime(savedAt)}.`);
    } else if (!data) {
      plannerCloudTrackChanges = true;
      const savedAt = await pushCurrentPlanToCloud();
      setCloudStatus('saved', 'Saved', `This device created the first secure cloud copy ${formatCloudTime(savedAt)}.`);
    } else if (plannerCloudLocalEditDuringInit) {
      // A person can tap a field while the initial cloud read is still in progress. Preserve that
      // deliberate edit instead of letting the just-finished remote load snap the control back.
      plannerCloudTrackChanges = true;
      const savedAt = await pushCurrentPlanToCloud();
      plannerCloudLocalEditDuringInit = false;
      setCloudStatus('saved', 'Saved', `Your change was synchronized ${formatCloudTime(savedAt)}.`);
    } else {
      const cloudChangedSinceLastSync = !!lastSyncAt && timestampAfter(data.updated_at, lastSyncAt);
      if (localDirtyAt && cloudChangedSinceLastSync) {
        const useThisDevice = confirm('This device and another device both have unsynchronized planner changes. Select OK to keep this device’s version, or Cancel to load the newer cloud version.');
        if (useThisDevice) {
          plannerCloudTrackChanges = true;
          const savedAt = await pushCurrentPlanToCloud();
          setCloudStatus('saved', 'Saved', `This device’s version was synchronized ${formatCloudTime(savedAt)}.`);
        } else {
          discardPendingLocalCloudEdits();
          await applyPlannerCloudState(data.plan_data, data.updated_at);
          setCloudStatus('saved', 'Saved', `The latest cloud version from ${formatCloudTime(data.updated_at)} is loaded.`);
        }
      } else if (localDirtyAt && !lastSyncAt) {
        // A device that was deliberately used offline before its first successful sync keeps its local
        // work rather than silently discarding it just because a cloud row already exists.
        const useThisDevice = confirm('This device has offline planner changes and a cloud plan also exists. Select OK to keep this device’s version, or Cancel to load the cloud version.');
        if (useThisDevice) {
          plannerCloudTrackChanges = true;
          const savedAt = await pushCurrentPlanToCloud();
          setCloudStatus('saved', 'Saved', `This device’s offline work was synchronized ${formatCloudTime(savedAt)}.`);
        } else {
          discardPendingLocalCloudEdits();
          await applyPlannerCloudState(data.plan_data, data.updated_at);
          setCloudStatus('saved', 'Saved', `The cloud version from ${formatCloudTime(data.updated_at)} is loaded.`);
        }
      } else if (localDirtyAt && !cloudChangedSinceLastSync) {
        // This device has a saved change and the cloud copy has not changed since the last successful
        // sync. The local change is therefore the newer version. Push it instead of reloading the older
        // cloud row—which previously made retirement-age selections snap back after a quick refresh.
        plannerCloudTrackChanges = true;
        const savedAt = await pushCurrentPlanToCloud();
        setCloudStatus('saved', 'Saved', `This device's pending change was synchronized ${formatCloudTime(savedAt)}.`);
      } else {
        await applyPlannerCloudState(data.plan_data, data.updated_at);
        setCloudStatus('saved', 'Saved', `The latest cloud version from ${formatCloudTime(data.updated_at)} is loaded.`);
      }
    }
    plannerCloudStartupRetryCount = 0;
    plannerCloudRecoveryCount = 0;
    clearPlannerCloudRecoveryTimer();
    plannerCloudReady = true;
    plannerCloudTrackChanges = true;
    hidePlannerSignIn();
    updateCloudAccountUi();
  } catch (e) {
    plannerCloudReady = true;
    plannerCloudTrackChanges = true;
    hidePlannerSignIn();
    updateCloudAccountUi();
    clearPlannerCloudRecoveryTimer();
    setCloudStatus(navigator.onLine === false ? 'offline' : 'error', navigator.onLine === false ? 'Offline' : 'Sync error',
      `The local copy is still available. ${e && e.message ? e.message : 'legacy online service could not be reached.'}`);
  } finally {
    plannerCloudHandlingUserId = null;
  }
}
async function syncCloudNow(userInitiated = false) {
  clearTimeout(plannerCloudSyncTimer);
  if (userInitiated) clearPlannerCloudRecoveryTimer();
  if (!plannerCloudUser) {
    if (userInitiated) showPlannerSignIn();
    return false;
  }
  if (navigator.onLine === false) {
    markPlannerCloudDirty();
    setCloudStatus('offline', 'Offline', 'The latest changes are safe on this device and will synchronize when internet access returns.');
    return false;
  }
  if (plannerCloudSyncing) {
    plannerCloudSyncPending = true;
    return false;
  }
  plannerCloudSyncing = true;
  if (userInitiated) cloudStorageSet(CLOUD_DIRTY_KEY, new Date().toISOString());
  setCloudStatus('syncing', 'Syncing…', 'Comparing this device with the secure cloud copy.');
  try {
    const rows = await plannerDatabaseRequest('retirement_plans?select=plan_data,updated_at&user_id=eq.' +
      encodeURIComponent(plannerCloudUser.id) + '&limit=1', { method:'GET' });
    const remote = Array.isArray(rows) && rows.length ? rows[0] : null;
    const lastSyncAt = cloudStorageGet(CLOUD_LAST_SYNC_KEY);
    const pendingRetirementAge = readPendingRetirementAgeSelection();
    const localDirtyAt = cloudStorageGet(CLOUD_DIRTY_KEY) || (pendingRetirementAge && pendingRetirementAge.selectedAt);
    const cloudChangedSinceLastSync = remote && lastSyncAt && timestampAfter(remote.updated_at, lastSyncAt);
    if (localDirtyAt && cloudChangedSinceLastSync) {
      if (!userInitiated) {
        setCloudStatus('error', 'Review sync', 'Another device changed the cloud plan while this device also had changes. Select “Synchronize now” to choose which version to keep.');
        return false;
      }
      const useThisDevice = confirm('Another device has changed the cloud plan. Select OK to replace it with this device’s current plan, or Cancel to load the cloud version.');
      if (!useThisDevice) {
        discardPendingLocalCloudEdits();
        await applyPlannerCloudState(remote.plan_data, remote.updated_at);
        setCloudStatus('saved', 'Saved', `The cloud version from ${formatCloudTime(remote.updated_at)} is loaded.`);
        return true;
      }
    }
    const savedAt = await pushCurrentPlanToCloud();
    clearPlannerCloudRecoveryTimer();
    plannerCloudRecoveryCount = 0;
    setCloudStatus('saved', 'Saved', `All planner changes were synchronized ${formatCloudTime(savedAt)}.`);
    return true;
  } catch (e) {
    markPlannerCloudDirty();
    setCloudStatus(navigator.onLine === false ? 'offline' : 'error', navigator.onLine === false ? 'Offline' : 'Sync error',
      `The local copy is safe. ${e && e.message ? e.message : 'legacy online service could not be reached.'}`);
    return false;
  } finally {
    plannerCloudSyncing = false;
    if (plannerCloudSyncPending) {
      plannerCloudSyncPending = false;
      schedulePlannerCloudSync();
    }
  }
}
async function initPlannerCloudSync() {
  plannerCloudSession = null;
  plannerCloudUser = null;
  plannerCloudReady = true;
  plannerCloudTrackChanges = false;
  try {
    [CLOUD_DIRTY_KEY, CLOUD_LAST_SYNC_KEY, CLOUD_RESET_PENDING_KEY, CLOUD_EMAIL_KEY,
      PLANNER_AUTH_STORAGE_KEY, PLANNER_REFRESH_STORAGE_KEY, PLANNER_ACCESS_STORAGE_KEY,
      PLANNER_EXPIRY_STORAGE_KEY, PLANNER_USER_STORAGE_KEY].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    if (window.indexedDB) indexedDB.deleteDatabase(PLANNER_SESSION_DB_NAME);
  } catch (e) {}
}
window.addEventListener('online', () => {
  if (plannerCloudUser) syncCloudNow(false);
  else setCloudStatus('unsigned', 'Sign in', 'Internet access is available. Sign in to synchronize this device.');
});
window.addEventListener('offline', () => {
  markPlannerCloudDirty();
  setCloudStatus('offline', 'Offline', 'The latest changes are safe on this device and will synchronize when internet access returns.');
});

// ---------- Shared Notes (one card per page, all editing the SAME text) ----------
// A single note that follows you across every page — type on Taxes, switch to Income, it's already
// there. Every page has its own <textarea class="shared-notes-textarea" ...> in the DOM at once (only
// the active page's is visible, via the normal .page/.page.active CSS), so "sync" just means keeping
// all of those textareas' .value in lockstep with one shared in-memory string. Persists via its own
// direct localStorage key (SHARED_NOTES_KEY) on every keystroke — deliberately NOT routed through the
// full render()/saveState() pipeline (see the .shell change-listener above), since that reruns a
// 1000-simulation Monte Carlo and would make typing feel laggy. It's also folded into saveState()'s
// returned state object (see `sharedNotesText` there) purely so it round-trips through the JSON
// backup/restore file, not because typing itself relies on that path.
