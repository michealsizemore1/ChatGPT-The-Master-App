// The 'storage' event only fires in OTHER windows/tabs than the one that made the change, so this
// keeps the planner visually current if it's open in two tabs and a field changes in one of them.
window.addEventListener('storage', () => { render(); });

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

// ---------- Local-only planner state (formerly network cloud sync) ----------
// This file used to include a full account sign-in / network-sync system (legacy online service). That
// system's UI never actually shipped -- its sign-in overlay and account fields (cloudAuthOverlay,
// cloudSignInSettingsBtn, cloudAccountEmail, etc.) don't exist anywhere in this page's HTML -- and its
// sync functions had no live callers left, so in practice the planner has always run entirely from
// local browser storage already. The dead sync code has been removed. What remains below is the small
// set of *_KEY constants still used to purge any leftover session data an older build may have left in
// this browser, plus the genuinely-used "remember the last retirement-age selection across a reload"
// mechanism, which reuses a couple of the same storage helpers.
const CLOUD_LAST_SYNC_KEY = 'retirementPlannerCloudLastSync_v1';
const CLOUD_DIRTY_KEY = 'retirementPlannerCloudDirty_v1';
const CLOUD_RESET_PENDING_KEY = 'retirementPlannerCloudResetPending_v1';
const CLOUD_EMAIL_KEY = 'retirementPlannerCloudEmail_v1';
const RETIREMENT_AGE_PENDING_KEY = 'retirementPlannerRetirementAgePending_v1';
const PLANNER_AUTH_STORAGE_KEY = 'retirementPlannerLegacyRemoteAuth_v2';
const PLANNER_REFRESH_STORAGE_KEY = 'retirementPlannerRefreshToken_v2';
const PLANNER_ACCESS_STORAGE_KEY = 'retirementPlannerAccessToken_v2';
const PLANNER_EXPIRY_STORAGE_KEY = 'retirementPlannerTokenExpiry_v2';
const PLANNER_USER_STORAGE_KEY = 'retirementPlannerCloudUser_v2';
const PLANNER_SESSION_DB_NAME = 'retirementPlannerSecureSession_v2';

function cloudStorageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function cloudStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
}
function rememberRetirementAgeSelection(age) {
  const selectedAge = Number(age);
  if (!Number.isFinite(selectedAge)) return;
  const selectedAt = new Date().toISOString();
  // A retirement-age button can be selected while the page is still starting up, and that deliberate
  // selection must win over whatever loadState() is about to restore.
  cloudStorageSet(RETIREMENT_AGE_PENDING_KEY, JSON.stringify({ age:selectedAge, selectedAt }));
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
function applyPendingRetirementAgeSelection() {
  const pending = readPendingRetirementAgeSelection();
  if (!pending) return false;
  const ageEl = els('retirementAge');
  if (!ageEl) return false;
  ageEl.value = pending.age;
  // Restoring this one field on its own, without a full render() here, avoids running the planner
  // halfway through startup before the rest of loadState()'s fields have been restored.
  syncRetirementDateFromAge(false);
  return true;
}
async function initPlannerCloudSync() {
  // One-time cleanup: earlier builds stored network cloud-sync session data under these keys. The
  // planner now runs entirely from local storage, so purge any leftover legacy records on load.
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
