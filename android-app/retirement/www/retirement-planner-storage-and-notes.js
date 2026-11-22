// The 'storage' event only fires in OTHER windows/tabs than the one that made the change, so this
// keeps the planner visually current if it's open in two tabs and a field changes in one of them.
window.addEventListener('storage', () => { render(); });

function setRetirementAge(age) {
  const ageInput = els('retirementAge');
  if (!ageInput) return;
  ageInput.value = age;
  // Use the same event path as typing the age, so the date updates and the value is saved the normal way.
  ageInput.dispatchEvent(new Event('input', { bubbles:true }));
  ageInput.dispatchEvent(new Event('change', { bubbles:true }));
}

// Reverse of syncRetirementDate: when the Retirement age (or a quick pill) changes, move "Planned last
// working day" to match.
function syncRetirementDateFromAge(shouldRender = true) {
  const ageEl = els('retirementAge');
  const dateEl = els('retirementDate');
  if (!ageEl || !dateEl) return;
  const targetAge = +ageEl.value;
  if (isNaN(targetAge)) return;
  const currentAge = +els('currentAge').value;
  const birthDateStr = els('birthDate') ? els('birthDate').value : '';
  // Retirement isn't a birthday event, so default to Dec 31 of the year you reach the target age (not
  // the end of your birth month), and don't overwrite a custom date.
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
  // Compute the implied age from the real birth date (day precision).
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

// Target age + birth date ("YYYY-MM-DD") -> "YYYY-MM" for an <input type="month">, anchored on the
// birth month.
function ageToMonthValue(birthDateStr, targetAge) {
  if (targetAge === null || targetAge === undefined || isNaN(targetAge) || !birthDateStr) return '';
  const [by, bm] = birthDateStr.split('-').map(Number);
  if (!by || !bm) return '';
  const y = by + Math.round(targetAge);
  return y + '-' + String(bm).padStart(2, '0');
}
// Birth date drives currentAge/spouseAge, recomputed on every load so ages never go stale.
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

// Reverse of syncAgeDate: when the age number is edited, update the date picker and its hint.
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
// Sources: Genworth/CareScout Cost of Care Survey and local caregiver rates. Starting points only; the
// Annual cost field stays editable.
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
// Backup reminder: the plan only lives in this browser unless you download a backup. LAST_BACKUP_KEY
// records when you last did.
const LAST_BACKUP_KEY = 'retirementPlannerLastBackup_v1';
const BACKUP_REMINDER_DISMISSED_KEY = 'retirementPlannerBackupReminderDismissed_v1';
const BACKUP_REMINDER_STALE_DAYS = 30;
const BACKUP_REMINDER_SNOOZE_DAYS = 7;

// ---------- Retirement-age selection ----------
const RETIREMENT_AGE_PENDING_KEY = 'retirementPlannerRetirementAgePending_v1';

function rememberRetirementAgeSelection(age) {
  const selectedAge = Number(age);
  if (!Number.isFinite(selectedAge)) return;
  // A retirement-age button can be selected while the page is still starting up, and that deliberate
  // selection must win over whatever loadState() is about to restore.
  try {
    localStorage.setItem(RETIREMENT_AGE_PENDING_KEY, JSON.stringify({ age:selectedAge, selectedAt:new Date().toISOString() }));
  } catch (e) { /* storage unavailable */ }
}
function readPendingRetirementAgeSelection() {
  try {
    const pending = JSON.parse(localStorage.getItem(RETIREMENT_AGE_PENDING_KEY) || 'null');
    return pending && Number.isFinite(Number(pending.age)) && pending.selectedAt ? {
      age:Number(pending.age),
      selectedAt:String(pending.selectedAt)
    } : null;
  } catch (e) {
    return null;
  }
}
function applyPendingRetirementAgeSelection() {
  const pending = readPendingRetirementAgeSelection();
  if (!pending) return false;
  const ageEl = els('retirementAge');
  if (!ageEl) return false;
  ageEl.value = pending.age;
  // Restore just this field (no full render()) so the planner doesn't run before loadState() finishes.
  syncRetirementDateFromAge(false);
  return true;
}

// ---------- Old data cleanup (Settings) ----------
// Leftovers nothing reads any more: the retired Accounts & Cards tracker (its exact keys plus "rcpt-"
// receipt photos), removed cloud sign-in records, and the retired Job Loss date. M&C Money uses
// different keys and isn't affected.
const OLD_PLANNER_DATA_KEYS = [
  'cc-register', 'cc-categories', 'cc-trips', 'cc-notes', 'active-trip',
  'chk-register', 'chk-open-bal', 'chk-notes',
  'mike-register', 'mike-open-bal', 'mike-notes',
  'savings-register', 'savings-open-bal', 'savings-notes',
  'hysa-register', 'hysa-open-bal', 'hysa-notes',
  'retirementPlannerCloudLastSync_v1', 'retirementPlannerCloudDirty_v1', 'retirementPlannerCloudResetPending_v1',
  'retirementPlannerCloudEmail_v1', 'retirementPlannerLegacyRemoteAuth_v2', 'retirementPlannerRefreshToken_v2',
  'retirementPlannerAccessToken_v2', 'retirementPlannerTokenExpiry_v2', 'retirementPlannerCloudUser_v2',
  'retirementPlannerJobLossDate_v1'
];
const OLD_PLANNER_DATA_PREFIX = 'rcpt-';
const OLD_PLANNER_SESSION_DB = 'retirementPlannerSecureSession_v2';

function findOldPlannerData() {
  const keys = [];
  let chars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (OLD_PLANNER_DATA_KEYS.includes(k) || k.startsWith(OLD_PLANNER_DATA_PREFIX)) {
        keys.push(k);
        chars += k.length + (localStorage.getItem(k) || '').length;
      }
    }
  } catch (e) { /* storage unavailable */ }
  return { keys, bytes: chars * 2 }; // browsers store localStorage as UTF-16
}
function renderOldDataCleanup() {
  const card = els('oldDataCleanupCard');
  if (!card) return;
  const found = findOldPlannerData();
  card.style.display = found.keys.length ? '' : 'none';
  const note = els('oldDataCleanupNote');
  if (note) {
    const kb = Math.max(1, Math.round(found.bytes / 1024));
    note.textContent = `${found.keys.length} leftover item${found.keys.length === 1 ? '' : 's'} (about ${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}) from features this planner no longer has (Accounts & Cards, cloud sign-in, Job Loss).`;
  }
}
function clearOldPlannerData() {
  const found = findOldPlannerData();
  if (!found.keys.length) { renderOldDataCleanup(); return; }
  if (!confirm('Delete leftover data from removed features (old Accounts & Cards registers, notes and receipt photos, old cloud sign-in records, and the Job Loss date) from this browser?\n\nYour retirement plan, Document Vault and the M&C Money app are not affected. This cannot be undone.')) return;
  try {
    found.keys.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    if (window.indexedDB) indexedDB.deleteDatabase(OLD_PLANNER_SESSION_DB);
  } catch (e) { /* storage unavailable */ }
  renderOldDataCleanup();
  alert('Old data cleared.');
}

// ---------- Shared Notes (one card per page, all editing the SAME text) ----------
// One note shown on every page; all textareas are kept in step. Saved to SHARED_NOTES_KEY on every
// keystroke without a full render() (which would rerun Monte Carlo), and included in backups.
