const SHARED_NOTES_KEY = 'retirementPlannerSharedNotes_v1';
let sharedNotesText = '';
function loadSharedNotes() {
  try { return localStorage.getItem(SHARED_NOTES_KEY) || ''; } catch (e) { return ''; }
}
// Skips the textarea the user is actively typing in (document.activeElement) so syncing the OTHER
// (currently hidden) pages' copies never yanks the caret position out from under whichever one is
// focused — every other instance still gets the latest text immediately, so switching pages mid-edit
// always shows what was just typed.
function renderSharedNotesTextareas() {
  document.querySelectorAll('.shared-notes-textarea').forEach(el => {
    if (el !== document.activeElement && el.value !== sharedNotesText) el.value = sharedNotesText;
  });
}
function updateSharedNotes(value) {
  sharedNotesText = value;
  try { localStorage.setItem(SHARED_NOTES_KEY, value); } catch (e) { /* storage unavailable, ignore */ }
  renderSharedNotesTextareas();
  markPlannerLocalSaved();
}

function daysSince(isoString) {
  if (!isoString) return Infinity;
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000*60*60*24);
}

function renderBackupReminder() {
  const banner = els('backupReminderBanner');
  if (!banner) return;
  let lastBackup = null, lastDismissed = null;
  try { lastBackup = localStorage.getItem(LAST_BACKUP_KEY); lastDismissed = localStorage.getItem(BACKUP_REMINDER_DISMISSED_KEY); } catch (e) { /* storage unavailable, ignore */ }
  const stale = daysSince(lastBackup) >= BACKUP_REMINDER_STALE_DAYS;
  const recentlyDismissed = daysSince(lastDismissed) < BACKUP_REMINDER_SNOOZE_DAYS;
  if (!stale || recentlyDismissed) { banner.style.display = 'none'; return; }
  const textEl = els('backupReminderText');
  if (textEl) {
    textEl.textContent = lastBackup
      ? `It's been over ${BACKUP_REMINDER_STALE_DAYS} days since your last JSON backup. Download a new recovery copy from Settings.`
      : "You haven't downloaded a JSON backup yet. Settings provides a one-click recovery copy.";
  }
  banner.style.display = 'flex';
}

function dismissBackupReminder() {
  try { localStorage.setItem(BACKUP_REMINDER_DISMISSED_KEY, new Date().toISOString()); } catch (e) { /* storage unavailable, ignore */ }
  const banner = els('backupReminderBanner');
  if (banner) banner.style.display = 'none';
}

// Every localStorage key prefix the standalone Accounts & Cards tracker (see TRACKER_HTML) uses for its
// own data — credit card register/categories, the four bank account registers and their opening
// balances, per-account notes, trip tracking, and receipt attachments (dynamically keyed per-receipt).
// The tracker manages all of this itself via its own private sGet/sSet helpers (a separate closure this
// script can't call into), but localStorage itself is just a page-level Web API, not scoped to any
// particular <script> block or closure — so it's read/written directly here instead.
const ACCOUNTS_CARDS_STORAGE_PREFIXES = ['cc-', 'chk-', 'mike-', 'savings-', 'hysa-', 'active-trip', 'rcpt-'];
function readAccountsCardsBackup() {
  const backup = {};
  try {
    Object.keys(localStorage).forEach(k => {
      if (ACCOUNTS_CARDS_STORAGE_PREFIXES.some(p => k === p || k.startsWith(p))) backup[k] = localStorage.getItem(k);
    });
  } catch (e) { /* storage unavailable, ignore */ }
  return backup;
}
function restoreAccountsCardsBackup(backup) {
  if (!backup || typeof backup !== 'object') return;
  try {
    Object.keys(localStorage).filter(k => ACCOUNTS_CARDS_STORAGE_PREFIXES.some(p => k === p || k.startsWith(p)))
      .forEach(k => localStorage.removeItem(k));
    Object.keys(backup).forEach(k => { if (backup[k] != null) localStorage.setItem(k, backup[k]); });
  } catch (e) { /* storage unavailable, ignore */ }
}

function saveState(includePortableData = false, suppressCloudSync = false) {
  const fields = {};
  document.querySelectorAll('.page input, .page select').forEach(el => {
    if (!el.id || el.id === 'anthropicApiKey') return;
    fields[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  // Checkpoint history is part of the retirement plan backup. Accounts & Cards and Document Vault use
  // their own storage/export paths and deliberately remain outside this planner state.
  const activePageEl = document.querySelector('.page.active');
  const activePage = activePageEl && activePageEl.dataset.page ? activePageEl.dataset.page : 'dashboard';
  const state = {
    schemaVersion:2,
    fields, expenses, brokeragePies, debts, futureExpenses, windfalls, insurancePolicies,
    withdrawalOrderState, withdrawalModeCustom, withdrawalExcludedKeys, withdrawalProportionMode,
    withdrawalProportions, excessIncomeDestinationPieName, rothConversionSourceName,
    allocationExplorerStrategy, selectedExplorerAnalysis, sharedNotesText, checkpointBaseline,
    checkpointHistory, spendingBasis, jobLossDate, dollarView, activePage
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable, ignore */ }
  if (!suppressCloudSync) markPlannerLocalSaved();
  // Accounts & Cards remains a separate tool and is intentionally excluded from planner backups.
  return state;
}

function applyState(state) {
  if (!state) return false;
  if (Array.isArray(state.expenses)) expenses = state.expenses;
  if (Array.isArray(state.brokeragePies)) {
    brokeragePies = state.brokeragePies;
    // Backward-compatible migration for backups that predate account types. The user's
    // "All Things Bucket" is a Roth IRA; other legacy pies remain taxable unless changed.
    brokeragePies.forEach(p => {
      if (!p.accountType) p.accountType = /^all things bucket$/i.test((p.name || '').trim()) ? 'roth_ira' : 'taxable';
      if (p.fee == null) p.fee = 0;
    });
  }
  if (Array.isArray(state.debts)) debts = state.debts;
  if (Array.isArray(state.futureExpenses)) futureExpenses = state.futureExpenses;
  if (Array.isArray(state.windfalls)) windfalls = state.windfalls;
  if (Array.isArray(state.insurancePolicies)) {
    insurancePolicies = state.insurancePolicies;
    insurancePolicies.forEach(p => { if (/(sbp|spb)/i.test(p.name || '')) p.survivorContinues = false; });
  }
  if (Array.isArray(state.withdrawalOrderState)) withdrawalOrderState = state.withdrawalOrderState;
  if (typeof state.withdrawalModeCustom === 'boolean') withdrawalModeCustom = state.withdrawalModeCustom;
  if (Array.isArray(state.withdrawalExcludedKeys)) withdrawalExcludedKeys = state.withdrawalExcludedKeys;
  if (state.withdrawalProportionMode === 'balance' || state.withdrawalProportionMode === 'percent') withdrawalProportionMode = state.withdrawalProportionMode;
  if (state.withdrawalProportions && typeof state.withdrawalProportions === 'object') withdrawalProportions = { ...state.withdrawalProportions };
  if (typeof state.excessIncomeDestinationPieName === 'string') excessIncomeDestinationPieName = state.excessIncomeDestinationPieName;
  if (typeof state.rothConversionSourceName === 'string') rothConversionSourceName = state.rothConversionSourceName;
  if (typeof state.allocationExplorerStrategy === 'string') allocationExplorerStrategy = state.allocationExplorerStrategy;
  if (isKnownExplorerAnalysis(state.selectedExplorerAnalysis)) selectedExplorerAnalysis = state.selectedExplorerAnalysis;
  // Portable scenario/display/navigation settings used to live only in separate localStorage keys.
  // Keeping them in the state object is essential for identical calculations after a JSON restore or
  // cloud load on another device—especially Job Loss date and spending basis.
  if (state.spendingBasis === 'liketo' || state.spendingBasis === 'mustspend' || state.spendingBasis === 'jobloss') {
    spendingBasis = state.spendingBasis;
    try { localStorage.setItem(SPENDING_BASIS_KEY, spendingBasis); } catch (e) {}
    document.querySelectorAll('#spendingBasisToggle .dollar-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === spendingBasis));
  }
  if (typeof state.jobLossDate === 'string' && state.jobLossDate) {
    jobLossDate = state.jobLossDate;
    try { localStorage.setItem(JOB_LOSS_DATE_KEY, jobLossDate); } catch (e) {}
    const jobLossEl = els('jobLossDate');
    if (jobLossEl) jobLossEl.value = jobLossDate;
  }
  if (state.dollarView === 'real' || state.dollarView === 'nominal') {
    dollarView = state.dollarView;
    try { localStorage.setItem(DOLLAR_VIEW_KEY, dollarView); } catch (e) {}
    document.querySelectorAll('#dollarToggle .dollar-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === dollarView));
  }
  if (typeof state.activePage === 'string' && PAGE_LABELS[state.activePage]) {
    try { localStorage.setItem(ACTIVE_PAGE_KEY, state.activePage); } catch (e) {}
  }
  if (isKnownExplorerAnalysis(state.selectedExplorerAnalysis)) {
    try { localStorage.setItem(EXPLORER_ANALYSIS_KEY, state.selectedExplorerAnalysis); } catch (e) {}
  }
  // Deliberately NOT syncing state.sharedNotesText here. This function runs on every normal boot (via
  // loadState()), and the copy of sharedNotesText baked into this state blob is only as fresh as the
  // last time saveState() happened to run for some unrelated field — notes themselves persist through
  // their own dedicated key (SHARED_NOTES_KEY) on every keystroke and deliberately skip the full
  // saveState() pipeline (see the Shared Notes section) to avoid a laggy Monte Carlo re-run on every
  // character typed. If this function overwrote SHARED_NOTES_KEY with whatever stale copy is sitting in
  // this blob, a note typed since the last unrelated field edit would get silently discarded the very
  // next time the page loads — that was exactly the bug (notes not sticking, or seeming to have a size
  // limit as they got reverted to an older, shorter version). The one legitimate case where a backup's
  // notes SHOULD win — an explicit Restore from Backup — handles this itself, right after calling this
  // function, instead of it happening implicitly on every single boot.
  if (state.fields) {
    Object.keys(state.fields).forEach(id => {
      if (id === 'anthropicApiKey') return;
      const el = els(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!state.fields[id];
      else el.value = state.fields[id];
    });
  }
  return true;
}

function loadState() {
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
  if (!raw) return false;
  let state;
  try { state = JSON.parse(raw); } catch (e) { return false; }
  return applyState(state);
}

function readSharedInvestmentsForPlanner() {
  try { return JSON.parse(localStorage.getItem(SHARED_INVESTMENT_KEY) || 'null'); } catch (e) { return null; }
}

function renderMsizInvestmentSnapshot(shared) {
  if (!shared) return;
  const balances = shared.balances || {};
  const holdings = shared.holdings || {};
  const tsp = (Number(balances.traditionalTsp) || 0) + (Number(balances.rothTsp) || 0);
  const allThings = ['SCHD','QQQM','IBIT'].reduce((sum, symbol) => sum + (Number(holdings[symbol]) || 0), 0);
  const sgov = Number(holdings.SGOV) || 0;
  const hysa = Number(balances.hysa) || 0;
  const total = tsp + allThings + sgov + hysa;
  const put = (id, value) => { const el = els(id); if (el) el.textContent = fmtMoney(value); };
  put('msizSnapTotal', total);
  put('msizSnapTsp', tsp);
  put('msizSnapAllThings', allThings);
  put('msizSnapSgov', sgov);
  put('msizSnapHysa', hysa);
  const updated = els('msizSnapUpdated');
  if (updated) {
    const stamp = shared.updatedAt ? new Date(shared.updatedAt) : null;
    updated.textContent = stamp && !Number.isNaN(stamp.getTime())
      ? 'Last synchronized ' + stamp.toLocaleString()
      : 'Synchronized from MSIZ Terminal';
  }
}

function applySharedInvestmentsToPlanner(shared) {
  shared = shared || readSharedInvestmentsForPlanner();
  if (!shared || !shared.balances) return false;
  const setValue = (id, value) => { const el = els(id); if (el && value != null && Number.isFinite(Number(value))) el.value = Number(value); };
  setValue('tradTSPBalance', shared.balances.traditionalTsp);
  setValue('rothTSPBalance', shared.balances.rothTsp);
  setValue('hysaBalance', shared.balances.hysa);
  setValue('tradTSPPct', shared.rates && shared.rates.traditionalTspPct);
  setValue('rothTSPPct', shared.rates && shared.rates.rothTspPct);
  const holdings = shared.holdings || {};
  const contributions = shared.contributions || {};
  const allThingsBalance = ['SCHD','QQQM','IBIT'].reduce((sum, symbol) => sum + (Number(holdings[symbol]) || 0), 0);
  const allThingsContribution = ['SCHD','QQQM','IBIT'].reduce((sum, symbol) => sum + (Number(contributions[symbol]) || 0), 0);
  const upsertPie = (matcher, defaults, balance, contribution) => {
    let index = brokeragePies.findIndex(pie => matcher.test(String(pie.name || '').trim()));
    const current = index >= 0 ? brokeragePies[index] : defaults;
    const updated = { ...current, balance, contribution };
    if (index >= 0) brokeragePies[index] = updated;
    else brokeragePies.push(updated);
  };
  upsertPie(/^all things bucket$/i,
    { name:'All Things Bucket', accountType:'roth_ira', riskType:'equity', cashRate:4.5, fee:0 },
    allThingsBalance, allThingsContribution);
  upsertPie(/^(sgov|sequence of returns risk)(?:\s*\([^)]*\))?$/i,
    { name:'SGOV', accountType:'taxable', riskType:'cash', cashRate:4.5, fee:0 },
    Number(holdings.SGOV) || 0, Number(contributions.SGOV) || 0);
  if (els('brokeragePieRows')) renderBrokeragePieRows();
  if (els('pieContributionRows')) renderPieContributionRows();
  renderMsizInvestmentSnapshot(shared);
  return true;
}

// ---------- Expenses (dynamic rows, monthly $ amounts) ----------
const EXPENSE_CATEGORIES = ['Food & Groceries','Transportation','Healthcare','Utilities','Entertainment & Travel','Personal Care','Shopping','Gifts & Donations','Subscriptions','Pet Care','Personal Support','Other'];
// "amount" is the "Like to Spend" figure — the only one the engine actually uses. "mustSpend" is the
// essential-floor figure Boldin shows alongside it; it's captured for reference/future stress-testing
// but doesn't itself change the projection. Existing rows default mustSpend = amount (essential utility
// bills), except the two clearly-discretionary ones, which default to $0.
let expenses = [];
function renderExpenseRows() {
  const container = els('expenseRows');
  container.innerHTML = expenses.map((e,i) => `
    <div class="row-item expense-row">
      <input type="text" value="${e.name||''}" placeholder="Name" oninput="updateExpense(${i},'name',this.value)">
      <select onchange="updateExpense(${i},'category',this.value)">
        ${EXPENSE_CATEGORIES.map(c => `<option value="${c}" ${c===e.category?'selected':''}>${c}</option>`).join('')}
      </select>
      <input type="number" value="${e.jobLoss != null ? e.jobLoss : (e.mustSpend != null ? e.mustSpend : e.amount)}" step="10" title="Test column: what you'd spend on this if you lost your job" oninput="updateExpense(${i},'jobLoss',this.value)">
      <input type="number" value="${e.mustSpend != null ? e.mustSpend : e.amount}" step="10" oninput="updateExpense(${i},'mustSpend',this.value)">
      <input type="number" value="${e.amount}" step="10" oninput="updateExpense(${i},'amount',this.value)">
      <button class="remove-btn" onclick="removeExpense(${i})" title="Remove">×</button>
    </div>
    <div class="expense-date-row">
      <label>Starts <input type="month" value="${e.startDateValue||''}" title="Leave blank if this expense already applies from the start of the plan" onchange="updateExpenseDate(${i},'start',this.value)"></label>
      <label>Ends <input type="month" value="${e.endDateValue||''}" title="Leave blank if this expense continues for the rest of the plan" onchange="updateExpenseDate(${i},'end',this.value)"></label>
      <span class="expense-date-hint">${expenseDateHint(e)}</span>
    </div>
  `).join('');
  updateExpenseTotals();
}
// Short plain-language readout of a row's active window, shown next to its Starts/Ends pickers so it's
// obvious at a glance whether a date restriction is actually in effect — easy to miss otherwise since an
// empty month input just looks like any other blank field.
function expenseDateHint(e) {
  if (e.startAge == null && e.endAge == null) return 'Active for the whole plan';
  if (e.startAge != null && e.endAge != null) return `Active age ${e.startAge}–${e.endAge}`;
  if (e.startAge != null) return `Starts at age ${e.startAge}`;
  return `Ends at age ${e.endAge}`;
}
// Starts/Ends date pickers store BOTH the raw month string (startDateValue/endDateValue, purely so the
// picker redisplays what was chosen after a reload) and the age it converts to (startAge/endAge — null on
// either side means unbounded on that side), the same age-anchored-on-currentAge convention Future Expenses/
// Windfalls/Job Loss already use (see monthToAge). The engine (projectRun, via ctx.expensesForYear) only
// ever reads startAge/endAge, never the date strings, so this matches the loop's own age-based year steps
// exactly instead of needing a separate calendar-date comparison every iteration.
function updateExpenseDate(i, which, monthVal) {
  const ageField = which === 'start' ? 'startAge' : 'endAge';
  const dateField = which === 'start' ? 'startDateValue' : 'endDateValue';
  if (!monthVal) { expenses[i][ageField] = null; expenses[i][dateField] = ''; }
  else { expenses[i][ageField] = monthToAge(monthVal, +els('currentAge').value); expenses[i][dateField] = monthVal; }
  renderExpenseRows();
  render();
}
function updateExpenseTotals() {
  els('expenseTotal').textContent = fmtMoney(expenses.reduce((s,e) => s + (+e.amount||0), 0)) + '/mo';
  els('expenseMustSpendTotal').textContent = fmtMoney(expenses.reduce((s,e) => s + (e.mustSpend != null ? +e.mustSpend : (+e.amount || 0)), 0)) + '/mo';
  if (els('expenseJobLossTotal')) {
    els('expenseJobLossTotal').textContent = fmtMoney(expenses.reduce((s,e) => s + (e.jobLoss != null ? +e.jobLoss : (e.mustSpend != null ? +e.mustSpend : (+e.amount || 0))), 0)) + '/mo';
  }
}
function updateExpense(i, field, value) {
  expenses[i][field] = (field==='amount' || field==='mustSpend' || field==='jobLoss') ? +value : value;
  updateExpenseTotals();
  render();
}
function addExpense() { expenses.push({ name:'New expense', category:'Other', amount:50, mustSpend:50, jobLoss:0, startAge:null, endAge:null, startDateValue:'', endDateValue:'' }); renderExpenseRows(); render(); }
function removeExpense(i) { expenses.splice(i,1); renderExpenseRows(); render(); }

// Read-only combined view on the Expenses page: shows Housing/Debt/Insurance alongside the
// Recurring Expenses list purely for visibility. It sums numbers already entered on their own
// pages/arrays — it never writes back to them, so nothing here changes what the Monte Carlo
// engine counts. Housing uses rows[0] (today) from the deterministic run, which already reflects
// rent or an already-purchased mortgage + property tax/insurance, whichever applies right now.
function renderCombinedExpensesCard(rows, inputs) {
  if (!els('combinedGrandTotal')) return;
  const expensesMonthly = expenses.reduce((s,e) => s + expenseValForBasis(e), 0);
  const debtMonthly = debts.reduce((s,d) => s + (+d.payment || 0), 0);
  const insuranceMonthly = insurancePolicies.reduce((s,p) => s + (+p.premium || 0), 0);
  const housingMonthly = (rows && rows.length ? rows[0].housingCost : 0) / 12;
  els('combinedExpenses').textContent = fmtMoney(expensesMonthly) + '/mo';
  els('combinedHousing').textContent = fmtMoney(housingMonthly) + '/mo';
  els('combinedDebt').textContent = fmtMoney(debtMonthly) + '/mo';
  els('combinedInsurance').textContent = fmtMoney(insuranceMonthly) + '/mo';
  els('combinedGrandTotal').textContent = fmtMoney(expensesMonthly + housingMonthly + debtMonthly + insuranceMonthly) + '/mo';
}

// Live "if this happens" readout on the Survivorship page itself. The engine only applies this
// what-if on the Explorers page (never the main plan/Monte Carlo score), so without this readout
// checking the boxes here produces no visible change anywhere until you navigate to Explorers —
// this gives instant feedback right where you're setting the age/elections/eligibility.
function renderSurvivorshipSummary(inputs, rows) {
  const body = els('survivorshipSummaryBody');
  if (!body) return;
  if (!inputs.survivorshipDeathAge || inputs.survivorshipDeathAge <= 0) {
    body.innerHTML = `<p style="font-size:16.5px;color:var(--muted);margin:0;">Enter an assumed age above to see what this scenario would pay your spouse. Right now this is off — no age is set.</p>`;
    return;
  }
  // Every figure in this card is grown from today's $ out to the assumed death age, so it reflects
  // "what it would look like at that point" rather than a flat today's-$ estimate. Guaranteed income
  // streams grow at their own rate (same as the engine): SBP with the underlying pension's growth
  // rate, DIC and the SS survivor benefit with SS COLA. Expenses/insurance/medical use General
  // Inflation / Medical Inflation (Assumptions page), same as the real yearly engine.
  const yearsToDeath = Math.max(0, inputs.survivorshipDeathAge - inputs.currentAge);
  const ageGap = inputs.currentAge - inputs.spouseCurrentAge;
  const spouseAgeAtDeath = inputs.survivorshipDeathAge - ageGap;
  const ltcActiveAtDeath = inputs.ltcEnabled && spouseAgeAtDeath >= inputs.ltcStartAge && spouseAgeAtDeath < inputs.ltcStartAge + inputs.ltcDuration;
  const genInflatorToDeath = Math.pow(1 + inputs.inflation, yearsToDeath);
  const medInflatorToDeath = Math.pow(1 + inputs.medicalInflation, yearsToDeath);
  const sbp1Monthly = (inputs.sbp1Enabled ? inputs.sbp1Annual/12 : 0) * Math.pow(1 + inputs.pensionGrowth, yearsToDeath);
  const sbp2Monthly = (inputs.sbp2Enabled ? inputs.sbp2Annual/12 : 0) * Math.pow(1 + inputs.pension2Growth, yearsToDeath);
  const dicMonthly = (inputs.dicEligible ? inputs.dicMonthlyAmount : 0) * Math.pow(1 + inputs.ssCola, yearsToDeath);
  const dicAidAttendanceMonthly = (inputs.dicEligible && inputs.dicAidAttendanceEnabled && ltcActiveAtDeath)
    ? inputs.dicAidAttendanceMonthly * Math.pow(1 + inputs.ssCola, yearsToDeath)
    : 0;
  const ssSurvivorMonthly = (inputs.ssMonthly || 0) * Math.pow(1 + inputs.ssCola, yearsToDeath);
  const guaranteedMonthly = sbp1Monthly + sbp2Monthly + dicMonthly + dicAidAttendanceMonthly + ssSurvivorMonthly;
  const ltcMonthly = ltcActiveAtDeath ? inputs.ltcAnnualCost * medInflatorToDeath / 12 : 0;

  // Same Tricare/Part B/FEDVIP logic the engine uses once survivorship is active, evaluated at the
  // assumed death age. Tricare's premium drops to $0 once she reaches Medicare age herself — Tricare
  // For Life continues as coverage behind the scenes (wrapping around Medicare), but it has no added
  // premium beyond Part B, so there's no Tricare cost left to count once she's on Medicare.
  const spouseOnMedicareAtDeath = spouseAgeAtDeath >= inputs.medicareAge;
  const medicalContinues = inputs.survivorMedicalContinues !== false;
  const medicalMonthlyToday = !medicalContinues ? 0 : (
    (spouseOnMedicareAtDeath ? 0 : (inputs.tricareMonthly + inputs.tricareHearingMonthly + inputs.tricareVisionMonthly + inputs.tricareDentalMonthly))
    + (spouseOnMedicareAtDeath ? inputs.partBSpouseMonthly : 0)
    + (spouseOnMedicareAtDeath ? (inputs.survivorFedvipMonthly || 0) : 0)
  );
  const medicalMonthly = medicalMonthlyToday * medInflatorToDeath;

  // Only items still checked "continues" on the checklist above count here, at each item's edited
  // override amount if one was set — matches the engine's survivor-filtered totals instead of the
  // full household lists. Healthcare-category expenses grow with Medical Inflation, like the engine;
  // everything else (and insurance) grows with General Inflation. Debt payments are fixed loan
  // payments and don't inflate, matching the engine. Housing uses the actual projected cost at that
  // age (already grown at its own rent/appreciation rate) unless overridden, in which case the
  // override grows with General Inflation.
  const survivorVal = (item, key) => (item.survivorAmount != null && item.survivorAmount !== '') ? (+item.survivorAmount || 0) : (+item[key] || 0);
  const expensesMonthlyNonMedToday = expenses.reduce((s,e) => s + ((e.survivorContinues !== false && e.category !== 'Healthcare') ? survivorVal(e,'amount') : 0), 0);
  const expensesMonthlyMedToday = expenses.reduce((s,e) => s + ((e.survivorContinues !== false && e.category === 'Healthcare') ? survivorVal(e,'amount') : 0), 0);
  const expensesMonthly = expensesMonthlyNonMedToday * genInflatorToDeath + expensesMonthlyMedToday * medInflatorToDeath;
  const debtMonthly = debts.reduce((s,d) => s + (d.survivorContinues !== false ? survivorVal(d,'payment') : 0), 0);
  const insuranceMonthly = insurancePolicies.reduce((s,p) => s + (p.survivorContinues !== false ? survivorVal(p,'premium') : 0), 0) * genInflatorToDeath;
  const deathAgeRow = rows && rows.length ? (rows.find(r => r.age === inputs.survivorshipDeathAge) || rows[rows.length-1]) : null;
  const housingMonthly = inputs.survivorHousingContinues === false ? 0
    : (inputs.survivorHousingAmountOverride != null ? inputs.survivorHousingAmountOverride * genInflatorToDeath : (deathAgeRow ? deathAgeRow.housingCost / 12 : 0));
  const totalExpensesMonthly = expensesMonthly + housingMonthly + debtMonthly + insuranceMonthly + medicalMonthly + ltcMonthly;
  const drawdownMonthly = Math.max(0, totalExpensesMonthly - guaranteedMonthly);

  body.innerHTML = `
    <p style="font-size:16.5px;color:var(--muted);margin:0 0 10px;line-height:1.6;">Starting at age <b>${inputs.survivorshipDeathAge}</b>${yearsToDeath > 0 ? ` (${yearsToDeath} year${yearsToDeath===1?'':'s'} from now)` : ''} in this scenario: both pensions and VA disability stop, Social Security drops to the survivor benefit, and the detailed survivor expense selections and overrides below determine spending. Expense figures are grown using General and Medical Inflation; guaranteed income uses its own growth rates.</p>
    <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:16.5px;"><span>SBP — Military Pension</span><span>${inputs.sbp1Enabled ? fmtMoney(sbp1Monthly)+'/mo' : 'Not elected — $0'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:16.5px;"><span>Survivor annuity — Government Civil Service</span><span>${inputs.sbp2Enabled ? fmtMoney(sbp2Monthly)+'/mo' : 'Not elected — $0'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:16.5px;"><span>VA DIC</span><span>${inputs.dicEligible ? fmtMoney(dicMonthly)+'/mo' : 'Not eligible — $0'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:16.5px;"><span>DIC Aid &amp; Attendance addition</span><span>${!inputs.dicAidAttendanceEnabled ? 'Not selected — $0' : (!inputs.dicEligible ? 'Requires DIC — $0' : (ltcActiveAtDeath ? fmtMoney(dicAidAttendanceMonthly)+'/mo' : `Begins during LTC at spouse age ${inputs.ltcStartAge}`))}</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:16.5px;"><span>Her Tricare/Part B/FEDVIP (${!medicalContinues ? 'turned off below' : (spouseOnMedicareAtDeath ? 'on Medicare — Part B + FEDVIP only, no Tricare premium' : 'pre-Medicare, Tricare')})</span><span>${fmtMoney(medicalMonthly)}/mo</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:16.5px;"><span>Spouse long-term care</span><span>${ltcActiveAtDeath ? fmtMoney(ltcMonthly)+'/mo' : `Begins at spouse age ${inputs.ltcStartAge}`}</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:16.5px;"><span>Investment drawdown (covers the rest of spending)</span><span>${fmtMoney(drawdownMonthly)}/mo</span></div>
    <div class="total-row"><span>Total covering spouse's spending</span><span>${fmtMoney(guaranteedMonthly + drawdownMonthly)}/mo</span></div>
    <p style="font-size:16px;color:var(--muted);margin:8px 0 0;line-height:1.5;">This updates the moment you check a box above. To see how the withdrawals affect the confidence score and portfolio longevity, visit the <b>Explorers</b> page — the "You predecease your spouse..." row there reflects these same settings.</p>
  `;
}

function renderSurvivorTaxSummary(inputs) {
  const body = els('survivorTaxSummaryBody');
  if (!body) return;
  if (!inputs.survivorshipDeathAge || inputs.survivorshipDeathAge <= 0) {
    body.innerHTML = '<p style="font-size:16.5px;color:var(--muted);margin:0;">Enter an assumed death age above to calculate the survivor tax summary.</p>';
    return;
  }
  const scenarioInputs = { ...inputs, survivorshipEnabled:true };
  const scenario = projectRun(scenarioInputs, buildContext(scenarioInputs), false);
  const targetAge = inputs.survivorshipDeathAge + 1;
  const row = scenario.rows.find(r => r.age >= targetAge);
  if (!row) {
    body.innerHTML = '<p style="font-size:16.5px;color:var(--muted);margin:0;">The selected death age is at or beyond the projection horizon, so there is no full survivor tax year to display.</p>';
    return;
  }
  const federal = Math.max(0, row.federalTaxAnnual || 0);
  const state = Math.max(0, row.stateTaxAnnual || 0);
  const fica = Math.max(0, row.ficaTaxAnnual || 0);
  const grossIncome = Math.max(0, row.income || 0) + Math.max(0, row.guaranteedIncome || 0) + Math.max(0, row.grossWithdrawal || 0);
  const afterTaxIncome = Math.max(0, grossIncome - federal - state - fica);
  const filingLabel = row.taxFilingStatus === 'single'
    ? 'Single'
    : (inputs.survivorQualifyingSpouseTwoYears ? 'Qualifying Surviving Spouse / joint-rate assumptions' : 'Married Filing Jointly');
  const display = value => fmtMoney(dv(value || 0, row.age, inputs));
  const spouseAge = row.spouseAge != null ? row.spouseAge : row.age - (inputs.currentAge - inputs.spouseCurrentAge);
  body.innerHTML = `
    <p style="font-size:16.5px;color:var(--muted);margin:0 0 10px;line-height:1.55;">Estimated first full survivor tax year: your modeled age <b>${row.age}</b>, spouse age <b>${spouseAge}</b>. Amounts follow the Today's $ / Future $ selection in the header.</p>
    <div style="display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:16.5px;"><span>Filing status</span><b style="color:var(--text);text-align:right;">${filingLabel}</b></div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:16.5px;"><span>Estimated MAGI</span><b style="color:var(--text);">${display(row.magiEstimateAnnual)}</b></div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:16.5px;"><span>Standard deduction</span><b style="color:var(--text);">${display(row.standardDeductionAnnual)}</b></div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:16.5px;"><span>Estimated taxable income</span><b style="color:var(--text);">${display(row.taxableIncomeEstimateAnnual)}</b></div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:16.5px;"><span>Federal income tax</span><b style="color:var(--text);">${display(federal)}</b></div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:16.5px;"><span>Idaho income tax</span><b style="color:var(--text);">${display(state)}</b></div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;color:var(--muted);font-size:16.5px;"><span>IRMAA surcharge</span><b style="color:var(--text);">${fmtMoney(dv(row.irmaaSurchargeMonthly || 0, row.age, inputs))}/mo per Medicare enrollee</b></div>
    <div class="total-row"><span>Estimated income after federal/state tax</span><span>${display(afterTaxIncome)}/yr</span></div>
    <p style="font-size:15.5px;color:var(--muted);margin:9px 0 0;line-height:1.5;">This is a planning estimate from the survivor scenario, not a tax return. DIC and DIC Aid &amp; Attendance remain tax-free; taxable SBP, survivor annuity, Social Security taxation, Traditional withdrawals and conversions are included by the tax engine.</p>
  `;
}

// Two snapshot bar charts, styled the same way as the Income/Expenses page charts, showing
// what the spouse would receive and spend under this what-if — in today's dollars, matching
// the "If This Happens" text above (same numbers, just visualized like every other section).
// Plus a "by year" chart (same style as the Income/Expenses/Gap pages) tracking both totals
// across the whole projection, run through this scenario (survivorship kicks in at the
// assumed age; before that, the numbers are identical to the baseline plan).
function renderSurvivorshipCharts(inputs, rows, ctx) {
  const incomeCanvas = els('chart_survivorship_income');
  const expenseCanvas = els('chart_survivorship_expenses');
  if (!incomeCanvas || !expenseCanvas) return;

  // Every figure below is grown from today's $ out to the assumed death age (see renderSurvivorshipSummary
  // for the matching text-card version). Guaranteed income streams grow at their own rate, same as the
  // engine: SBP with the underlying pension's growth rate, DIC and the SS survivor benefit with SS COLA.
  const yearsToDeath = Math.max(0, inputs.survivorshipDeathAge - inputs.currentAge);
  const ageGap = inputs.currentAge - inputs.spouseCurrentAge;
  const spouseAgeAtDeath = inputs.survivorshipDeathAge - ageGap;
  const ltcActiveAtDeath = inputs.ltcEnabled && spouseAgeAtDeath >= inputs.ltcStartAge && spouseAgeAtDeath < inputs.ltcStartAge + inputs.ltcDuration;
  const genInflatorToDeath = Math.pow(1 + inputs.inflation, yearsToDeath);
  const medInflatorToDeath = Math.pow(1 + inputs.medicalInflation, yearsToDeath);
  const sbp1Monthly = (inputs.sbp1Enabled ? inputs.sbp1Annual/12 : 0) * Math.pow(1 + inputs.pensionGrowth, yearsToDeath);
  const sbp2Monthly = (inputs.sbp2Enabled ? inputs.sbp2Annual/12 : 0) * Math.pow(1 + inputs.pension2Growth, yearsToDeath);
  const dicMonthly = (inputs.dicEligible ? inputs.dicMonthlyAmount : 0) * Math.pow(1 + inputs.ssCola, yearsToDeath);
  const dicAidAttendanceMonthly = (inputs.dicEligible && inputs.dicAidAttendanceEnabled && ltcActiveAtDeath)
    ? inputs.dicAidAttendanceMonthly * Math.pow(1 + inputs.ssCola, yearsToDeath)
    : 0;
  const ssMonthly = (inputs.ssMonthly || 0) * Math.pow(1 + inputs.ssCola, yearsToDeath); // survivor benefit = the full amount of the deceased's own SS
  const guaranteedAnnual = ssMonthly*12 + sbp1Monthly*12 + sbp2Monthly*12 + dicMonthly*12 + dicAidAttendanceMonthly*12;
  const ltcAnnual = ltcActiveAtDeath ? inputs.ltcAnnualCost * medInflatorToDeath : 0;

  // Tricare's premium drops to $0 once she's on Medicare — TFL keeps her covered at no added cost
  // beyond Part B. Medical/expense figures use General Inflation / Medical Inflation, matching the
  // real yearly engine, instead of staying flat at today's $.
  const spouseOnMedicareAtDeath = spouseAgeAtDeath >= inputs.medicareAge;
  const medicalContinues = inputs.survivorMedicalContinues !== false;
  const medicalMonthlyToday = !medicalContinues ? 0 : (
    (spouseOnMedicareAtDeath ? 0 : (inputs.tricareMonthly + inputs.tricareHearingMonthly + inputs.tricareVisionMonthly + inputs.tricareDentalMonthly))
    + (spouseOnMedicareAtDeath ? inputs.partBSpouseMonthly : 0)
    + (spouseOnMedicareAtDeath ? (inputs.survivorFedvipMonthly || 0) : 0)
  );
  const medicalMonthly = medicalMonthlyToday * medInflatorToDeath;

  // Only items still checked "continues" on the checklist count here, at each item's edited override
  // amount if one was set. Healthcare-category expenses grow with Medical Inflation; everything else
  // (and insurance) grows with General Inflation. Debt payments don't inflate (fixed loan payments).
  // Housing uses the actual projected cost at that age unless overridden.
  const survivorVal = (item, key) => (item.survivorAmount != null && item.survivorAmount !== '') ? (+item.survivorAmount || 0) : (+item[key] || 0);
  const expensesMonthlyNonMedToday = expenses.reduce((s,e) => s + ((e.survivorContinues !== false && e.category !== 'Healthcare') ? survivorVal(e,'amount') : 0), 0);
  const expensesMonthlyMedToday = expenses.reduce((s,e) => s + ((e.survivorContinues !== false && e.category === 'Healthcare') ? survivorVal(e,'amount') : 0), 0);
  const expensesMonthly = expensesMonthlyNonMedToday * genInflatorToDeath + expensesMonthlyMedToday * medInflatorToDeath;
  const debtMonthly = debts.reduce((s,d) => s + (d.survivorContinues !== false ? survivorVal(d,'payment') : 0), 0);
  const insuranceMonthly = insurancePolicies.reduce((s,p) => s + (p.survivorContinues !== false ? survivorVal(p,'premium') : 0), 0) * genInflatorToDeath;
  const deathAgeRow = rows && rows.length ? (rows.find(r => r.age === inputs.survivorshipDeathAge) || rows[rows.length-1]) : null;
  const housingMonthly = inputs.survivorHousingContinues === false ? 0
    : (inputs.survivorHousingAmountOverride != null ? inputs.survivorHousingAmountOverride * genInflatorToDeath : (deathAgeRow ? deathAgeRow.housingCost / 12 : 0));
  const expenseTotalAnnual = (expensesMonthly + housingMonthly + debtMonthly + insuranceMonthly + medicalMonthly) * 12 + ltcAnnual;

  // Guaranteed income (SS/SBP/DIC) rarely covers 100% of expenses on its own — whatever's left
  // has to come from withdrawing the portfolio (TSP/brokerage/cash), same as it does for the
  // baseline plan's own Surplus/(Gap) & Withdrawals math. Without this bar, the income chart
  // understated what actually funds the spouse's spending.
  const investmentDrawdownAnnual = Math.max(0, expenseTotalAnnual - guaranteedAnnual);

  const incomeConfig = barConfig(
    ['SS Survivor Benefit', 'SBP (Military Pension)', 'Survivor Annuity (Govt)', 'VA DIC', 'DIC Aid & Attendance', 'Investment Drawdown'],
    [ssMonthly*12, sbp1Monthly*12, sbp2Monthly*12, dicMonthly*12, dicAidAttendanceMonthly*12, investmentDrawdownAnnual],
    { horizontal: true, showValues: true }
  );

  const expenseLabels = ['Recurring expenses', 'Housing', 'Debt payments', 'Insurance premiums', 'Medical (Tricare/Part B/FEDVIP)', 'Long-term care'];
  const expenseValues = [expensesMonthly*12, housingMonthly*12, debtMonthly*12, insuranceMonthly*12, medicalMonthly*12, ltcAnnual];
  const expenseConfig = barConfig(expenseLabels, expenseValues, { horizontal: true, showValues: true });

  [[incomeCanvas, incomeConfig, 'survivorship_income'], [expenseCanvas, expenseConfig, 'survivorship_expenses']]
    .forEach(([canvas, config, key]) => {
      // Same dynamic-height sizing used for every other horizontal bar chart, so a 4-bar
      // chart here looks the same as a 4-bar chart anywhere else in the tool.
      sizeHorizontalChartCard(canvas, config.data.labels);
      ensureChartHorizontalScroll(canvas, 460);
      // Destroy + recreate rather than mutating .data/.options in place: Chart.js only reliably
      // picks up a changed plugin config (like barValueLabels here) on construction, so an
      // in-place update on an existing instance can leave it stuck on the options object from
      // whenever the chart was first built — silently dropping both the value labels and, if the
      // interaction/tooltip config also came along for the ride, hover as well.
      if (charts[key]) charts[key].destroy();
      charts[key] = new Chart(canvas.getContext('2d'), config);
    });

  const yearlyCanvas = els('chart_survivorship_yearly');
  const drawdownCanvas = els('chart_survivorship_drawdown');
  if ((yearlyCanvas || drawdownCanvas) && ctx) {
    // Run the actual scenario (survivorshipEnabled: true) across every year, rather than just
    // the snapshot math above — this reflects the real engine, including guardrails, taxes, and
    // the age gate (numbers match the baseline plan before the assumed age, then diverge after).
    const scenarioInputs = { ...inputs, survivorshipEnabled: true };
    const scenarioRows = projectRun(scenarioInputs, ctx, false).rows;
    const ages = scenarioRows.map(r => r.age);

    if (yearlyCanvas) {
      const key = 'survivorship_yearly';
      const config = yearlyBarConfig(ages, [
        { label: 'Total income (guaranteed + withdrawals)', data: scenarioRows.map(r => dv((r.guaranteedIncomeAfterTax != null ? r.guaranteedIncomeAfterTax : (r.guaranteedIncome || 0)) + (r.grossWithdrawal || 0), r.age, inputs)) },
        { label: 'Total expenses', data: scenarioRows.map(r => dv((r.spending || 0) + (r.ltcCost || 0), r.age, inputs)) }
      ]);
      if (charts[key]) charts[key].destroy();
      ensureChartHorizontalScroll(yearlyCanvas, ages.length * 13);
      charts[key] = new Chart(yearlyCanvas.getContext('2d'), config);
      applyChartRange(key);
    }

    if (drawdownCanvas) {
      // Investment drawdown = grossWithdrawal, the actual amount pulled from TSP/brokerage/HYSA that
      // year to cover whatever total expenses aren't already covered by guaranteed income (SS survivor
      // benefit, SBP, DIC). The VGLI lump sum entered above lands in the brokerage pies the year this
      // scenario starts, so its effect shows up here as smaller (or zero) drawdown for as long as it lasts.
      const key = 'survivorship_drawdown';
      const config = yearlyBarConfig(ages, [
        { label: 'Investment drawdown', data: scenarioRows.map(r => dv(r.grossWithdrawal || 0, r.age, inputs)) }
      ]);
      if (charts[key]) charts[key].destroy();
      ensureChartHorizontalScroll(drawdownCanvas, ages.length * 13);
      charts[key] = new Chart(drawdownCanvas.getContext('2d'), config);
      applyChartRange(key);
    }
  }
}

// Toggles whether a single expense/debt/insurance item continues after survivorship starts, and lets its
// amount be overridden for that scenario. Both stored right on the item itself (item.survivorContinues,
// item.survivorAmount — default continuing at the normal amount when unset) so they ride along with that
// item's own array in saveState/loadState — no separate persistence plumbing needed.
function survivorArrByName(arrName) {
  if (arrName === 'expenses') return expenses;
  if (arrName === 'debts') return debts;
  if (arrName === 'futureExpenses') return futureExpenses;
  return insurancePolicies;
}
function setSurvivorContinues(arrName, i, checked) {
  const arr = survivorArrByName(arrName);
  if (arr[i]) arr[i].survivorContinues = checked;
  render();
}
function setSurvivorAmount(arrName, i, value) {
  const arr = survivorArrByName(arrName);
  if (arr[i]) arr[i].survivorAmount = value === '' ? null : +value;
  render();
}

// Itemized "which expenses continue" checklist on the Survivorship page — every recurring cost from the
// Expenses, Debt, and Insurance pages, each with its own on/off toggle and an editable amount (defaulting
// to its normal amount, in case it would change rather than disappear). Read directly from the same arrays
// those pages edit, so it always matches what's there.
function renderSurvivorExpenseChecklist() {
  const body = els('survivorExpenseChecklistBody');
  if (!body) return;
  const itemRow = (arrName, i, item, label, keyName, suffix) => {
    const normalAmount = +item[keyName] || 0;
    const overrideVal = (item.survivorAmount != null && item.survivorAmount !== '') ? item.survivorAmount : '';
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;color:var(--muted);font-size:16px;gap:10px;">
      <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer;">
        <input type="checkbox" ${item.survivorContinues===false?'':'checked'} onchange="setSurvivorContinues('${arrName}',${i},this.checked)">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</span>
      </label>
      <span style="flex:0 0 auto;display:flex;align-items:center;gap:4px;">$<input type="number" value="${overrideVal !== '' ? overrideVal : normalAmount}" step="5" ${item.survivorContinues===false?'disabled':''} style="width:80px;padding:4px 6px;font-size:15px;" onchange="setSurvivorAmount('${arrName}',${i},this.value)">${suffix != null ? suffix : '/mo'}</span>
    </div>`;
  };
  const section = (title, arrName, arr, labelFn, keyName, suffix) => `
    <div class="mini-label" style="margin:10px 0 2px;">${title}</div>
    ${arr.length ? arr.map((item,i) => itemRow(arrName, i, item, labelFn(item), keyName, suffix)).join('') : `<p style="font-size:15px;color:var(--muted);margin:2px 0;">Nothing entered yet.</p>`}
  `;
  // Future / one-time expenses each hit at their own specific age (or age range, if recurring), not every
  // month — so the label spells out when, and the $ figure reads as a per-hit or per-year amount instead
  // of "/mo" like the always-on recurring costs above.
  const futureExpenseLabel = f => `${f.name || 'Future expense'} (age ${f.age}${f.recurring && f.endAge ? '–' + f.endAge : ''}${f.recurring ? '/yr' : ', one-time'})`;
  body.innerHTML = section('Expenses', 'expenses', expenses, e => e.name || e.category, 'amount')
    + section('Debts', 'debts', debts, d => d.name || d.category || 'Debt', 'payment')
    + section('Insurance premiums', 'insurancePolicies', insurancePolicies, p => p.name || p.type || 'Policy', 'premium')
    + section('Future / One-Time Expenses', 'futureExpenses', futureExpenses, futureExpenseLabel, 'amount', '');
}

// ---------- Future / one-time planned expenses (dynamic rows) ----------
let futureExpenses = [];
function renderFutureExpenseRows() {
  const container = els('futureExpenseRows');
  if (!container) return;
  container.innerHTML = futureExpenses.map((f,i) => `
    <div class="row-item future-row">
      <input type="text" value="${f.name||''}" placeholder="Description" oninput="updateFutureExpense(${i},'name',this.value)">
      <div class="age-cell">
        <input type="number" value="${f.age}" step="1" title="Your age when it hits" oninput="updateFutureExpense(${i},'age',this.value)">
        <input type="month" value="${f.dateValue||''}" title="Or pick a month/year" onchange="setFutureExpenseAgeFromDate(${i}, this.value)">
      </div>
      <input type="number" value="${f.amount}" step="100" title="${f.recurring ? 'Amount PER YEAR, today\u2019s $ (recurring rows are annual, not monthly)' : 'Amount, today\u2019s $ (one-time)'}" oninput="updateFutureExpense(${i},'amount',this.value)">
      <select onchange="updateFutureExpense(${i},'recurring',this.value)">
        <option value="false" ${!f.recurring?'selected':''}>One-time</option>
        <option value="true" ${f.recurring?'selected':''}>Yearly until...</option>
      </select>
      <button class="remove-btn" onclick="removeFutureExpense(${i})" title="Remove">×</button>
    </div>
    ${f.recurring ? `<div class="row-item future-row" style="margin-top:-4px;"><span></span><span></span><span></span><input type="number" value="${f.endAge||f.age}" step="1" placeholder="End age" oninput="updateFutureExpense(${i},'endAge',this.value)"><span></span></div>` : ''}
  `).join('');
}
function updateFutureExpense(i, field, value) {
  if (field === 'recurring') futureExpenses[i][field] = value === 'true';
  else if (field === 'name') futureExpenses[i][field] = value;
  else futureExpenses[i][field] = +value;
  // Editing the age number directly should push the pinned date picker to match it, not blank it out
  // and leave the user guessing what calendar date that age actually falls on. Update the sibling
  // month input in place (not a full renderFutureExpenseRows()) so the age field being typed into
  // doesn't lose keyboard focus mid-keystroke.
  if (field === 'age') {
    futureExpenses[i].dateValue = ageToMonthValue(els('birthDate') ? els('birthDate').value : '', futureExpenses[i].age);
    const rows = els('futureExpenseRows');
    const cell = rows ? rows.querySelectorAll('.age-cell')[i] : null;
    const monthInput = cell ? cell.querySelector('input[type="month"]') : null;
    if (monthInput) monthInput.value = futureExpenses[i].dateValue || '';
  }
  if (field === 'recurring') renderFutureExpenseRows();
  render();
}
function addFutureExpense() { futureExpenses.push({ name:'New future expense', age:60, amount:1000, recurring:false, endAge:null }); renderFutureExpenseRows(); render(); }
function removeFutureExpense(i) { futureExpenses.splice(i,1); renderFutureExpenseRows(); render(); }
// Shared month/year -> age converter for dynamic-row date pickers (future expenses, windfalls).
function monthToAge(monthVal, basisAge) {
  if (!monthVal) return basisAge;
  const [ty, tm] = monthVal.split('-').map(Number);
  // Anchor on the person's actual birth year/month (same precise calendar-age logic as
  // computeAgeFromBirthDate) rather than approximating from "today" + elapsed months from
  // basisAge — the old approximation assumed basisAge was exact as of today, which is only
  // true if today happens to fall on the birthday, and silently produced off-by-one ages
  // for anyone whose birthday hasn't occurred yet this calendar year.
  const birthDateStr = els('birthDate') ? els('birthDate').value : '';
  const [by, bm] = (birthDateStr || '').split('-').map(Number);
  if (by && bm) {
    let age = ty - by;
    if (tm < bm) age--;
    return Math.max(1, age);
  }
  const today = new Date();
  const monthsAway = (ty - today.getFullYear()) * 12 + (tm - 1 - today.getMonth());
  return Math.max(1, Math.round(basisAge + monthsAway / 12));
}
// One-time self-heal, run once at boot (see bottom of script, after birthDate/spouseBirthDate are
// synced) for plans saved before monthToAge/dateToAge/syncAgeDate/syncRetirementDate were corrected
// to anchor on the actual birth date. A date picker's *stored* age (expenses[].startAge/endAge,
// futureExpenses[].age, windfalls[].age, or a milestone's own Age field) was computed once at the
// moment it was picked and then persisted as a plain number — simply fixing the conversion functions
// doesn't retroactively correct a number that's already sitting in someone's saved plan. This
// re-derives every stored age from its paired date field using the corrected math, so an existing
// plan self-corrects on load instead of requiring every date to be manually re-picked. Harmless
// no-op for anyone whose stored ages already happen to be exact.
function recomputeAgesFromDates() {
  const currentAge = +els('currentAge').value;
  expenses.forEach(e => {
    if (e.startDateValue) e.startAge = monthToAge(e.startDateValue, currentAge);
    if (e.endDateValue) e.endAge = monthToAge(e.endDateValue, currentAge);
  });
  futureExpenses.forEach(fe => { if (fe.dateValue) fe.age = monthToAge(fe.dateValue, currentAge); });
  windfalls.forEach(w => { if (w.dateValue) w.age = monthToAge(w.dateValue, currentAge); });
  [
    ['pensionAgeDate', 'pensionAge', 'pensionAgeDateHint', 'currentAge'],
    ['pension2AgeDate', 'pension2Age', 'pension2AgeDateHint', 'currentAge'],
    ['vaDisabilityAgeDate', 'vaDisabilityAge', 'vaDisabilityAgeDateHint', 'currentAge'],
    ['ssAgeDate', 'ssAge', 'ssAgeDateHint', 'currentAge'],
    ['spouseSSAgeDate', 'spouseSSAge', 'spouseSSAgeDateHint', 'spouseAge'],
    ['spousalStartAgeDate', 'spousalStartAge', 'spousalStartAgeDateHint', 'spouseAge'],
    ['annuityStartAgeDate', 'annuityStartAge', 'annuityStartAgeDateHint', 'currentAge'],
    ['purchaseAgeDate', 'purchaseAge', 'purchaseAgeDateHint', 'currentAge'],
    ['ltcStartAgeDate', 'ltcStartAge', 'ltcStartAgeDateHint', 'spouseAge'],
  ].forEach(([dateId, ageId, hintId, basisId]) => {
    if (els(dateId) && els(dateId).value) syncAgeDate(dateId, ageId, hintId, basisId);
  });
  // The saved Retirement age is the primary selection. Its paired date was already synchronized at
  // the moment either control was changed, so startup should update only the date hint—not derive a
  // different age and undo the user's saved retirement-age button selection.
  if (els('retirementDate') && els('retirementDate').value) syncRetirementDate(false);
  renderExpenseRows();
  renderFutureExpenseRows();
  renderWindfallRows();
}
// Inverse of monthToAge: given a whole-years-away target age (e.g. a debt payoff age from the
// year-resolution amortization schedule), return a human "Mon YYYY" estimate of the calendar date —
// anchored on the person's actual birth month, not whatever calendar month it happens to be today.
function ageToMonthYear(currentAge, targetAge, birthMonth) {
  if (targetAge === null || targetAge === undefined || isNaN(targetAge)) return '';
  const yearsAway = Math.round(targetAge - currentAge);
  const today = new Date();
  const bm = birthMonth || (today.getMonth() + 1);
  const target = new Date(today.getFullYear() + yearsAway, bm - 1, 1);
  return target.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}
function setFutureExpenseAgeFromDate(i, monthVal) {
  if (!monthVal) return;
  futureExpenses[i].age = monthToAge(monthVal, +els('currentAge').value);
  futureExpenses[i].dateValue = monthVal;
  renderFutureExpenseRows();
  render();
}

// ---------- Windfalls (dynamic rows, one-time inflows: inheritance, home sale, bonus, etc.) ----------
let windfalls = [];
function renderWindfallRows() {
  const container = els('windfallRows');
  if (!container) return;
  container.innerHTML = windfalls.map((w,i) => `
    <div class="row-item windfall-row">
      <input type="text" value="${w.name||''}" placeholder="Description" oninput="updateWindfall(${i},'name',this.value)">
      <div class="age-cell">
        <input type="number" value="${w.age}" step="1" title="Your age when received" oninput="updateWindfall(${i},'age',this.value)">
        <input type="month" value="${w.dateValue||''}" title="Or pick a month/year" onchange="setWindfallAgeFromDate(${i}, this.value)">
      </div>
      <input type="number" value="${w.amount}" step="1000" title="Amount ($)" oninput="updateWindfall(${i},'amount',this.value)">
      <select onchange="updateWindfall(${i},'destination',this.value)">
        <option value="Brokerage" ${w.destination==='Brokerage'?'selected':''}>Into Brokerage</option>
        <option value="Cash" ${w.destination==='Cash'?'selected':''}>Into HYSA</option>
      </select>
      <button class="remove-btn" onclick="removeWindfall(${i})" title="Remove">×</button>
    </div>
  `).join('');
}
function updateWindfall(i, field, value) {
  windfalls[i][field] = (field==='age'||field==='amount') ? +value : value;
  // Same age->date reverse sync as future expenses: keep the pinned month picker matched to the
  // typed age instead of blanking it, updated in place so the age field doesn't lose focus mid-keystroke.
  if (field === 'age') {
    windfalls[i].dateValue = ageToMonthValue(els('birthDate') ? els('birthDate').value : '', windfalls[i].age);
    const rows = els('windfallRows');
    const cell = rows ? rows.querySelectorAll('.age-cell')[i] : null;
    const monthInput = cell ? cell.querySelector('input[type="month"]') : null;
    if (monthInput) monthInput.value = windfalls[i].dateValue || '';
  }
  render();
}
function addWindfall() { windfalls.push({ name:'New windfall', age:60, amount:10000, destination:'Brokerage' }); renderWindfallRows(); render(); }
function removeWindfall(i) { windfalls.splice(i,1); renderWindfallRows(); render(); }
function setWindfallAgeFromDate(i, monthVal) {
  if (!monthVal) return;
  windfalls[i].age = monthToAge(monthVal, +els('currentAge').value);
  windfalls[i].dateValue = monthVal;
  renderWindfallRows();
  render();
}

// ---------- Insurance policies (dynamic rows, informational — Estate & Insurance page) ----------
const INSURANCE_TYPES = ['Life','Long-Term Care','Auto','Home/Renters','Umbrella','Disability','Other'];
let insurancePolicies = [];
function renderInsuranceRows() {
  const container = els('insuranceRows');
  if (!container) return;
  container.innerHTML = insurancePolicies.map((p,i) => `
    <div class="row-item insurance-row">
      <input type="text" value="${p.name||''}" placeholder="Policy name" oninput="updateInsurancePolicy(${i},'name',this.value)">
      <select onchange="updateInsurancePolicy(${i},'type',this.value)">
        ${INSURANCE_TYPES.map(t => `<option value="${t}" ${t===p.type?'selected':''}>${t}</option>`).join('')}
      </select>
      <input type="number" value="${p.premium}" step="1" oninput="updateInsurancePolicy(${i},'premium',this.value)">
      <input type="number" value="${p.coverage}" step="1000" oninput="updateInsurancePolicy(${i},'coverage',this.value)">
      <button class="remove-btn" onclick="removeInsurancePolicy(${i})" title="Remove">×</button>
    </div>
  `).join('');
  els('insuranceTotal').textContent = fmtMoney(insurancePolicies.reduce((s,p) => s + (+p.premium||0), 0)) + '/mo';
}
function updateInsurancePolicy(i, field, value) {
  insurancePolicies[i][field] = (field==='premium'||field==='coverage') ? +value : value;
  if (field === 'name' && /(sbp|spb)/i.test(value || '')) insurancePolicies[i].survivorContinues = false;
  els('insuranceTotal').textContent = fmtMoney(insurancePolicies.reduce((s,p) => s + (+p.premium||0), 0)) + '/mo';
  render();
}
function addInsurancePolicy() { insurancePolicies.push({ name:'New policy', type:'Other', premium:0, coverage:0 }); renderInsuranceRows(); render(); }
function removeInsurancePolicy(i) { insurancePolicies.splice(i,1); renderInsuranceRows(); render(); }

// ---------- Brokerage pies (dynamic rows, M1 Finance) ----------
let brokeragePies = [];
function renderBrokeragePieRows() {
  const container = els('brokeragePieRows');
  container.innerHTML = brokeragePies.map((p,i) => `
    <div class="row-item pie-row">
      <input type="text" value="${p.name}" placeholder="Pie name" oninput="updateBrokeragePie(${i},'name',this.value)">
      <input type="number" value="${p.balance}" step="0.01" oninput="updateBrokeragePie(${i},'balance',this.value)">
      <select onchange="updateBrokeragePie(${i},'accountType',this.value)">
        <option value="taxable" ${(p.accountType||'taxable')==='taxable'?'selected':''}>Taxable</option>
        <option value="roth_ira" ${p.accountType==='roth_ira'?'selected':''}>Roth IRA</option>
      </select>
      <select onchange="updateBrokeragePie(${i},'riskType',this.value)">
        <option value="equity" ${(p.riskType||'equity')==='equity'?'selected':''}>Market-linked</option>
        <option value="cash" ${p.riskType==='cash'?'selected':''}>Cash-like (fixed)</option>
      </select>
      <input type="number" value="${p.cashRate!=null?p.cashRate:4.5}" step="0.1" placeholder="Rate %" title="Fixed annual rate (%) used only when Risk profile = Cash-like" style="display:${p.riskType==='cash'?'block':'none'}" oninput="updateBrokeragePie(${i},'cashRate',this.value)">
      <input type="number" value="${p.fee!=null?p.fee:0}" min="0" max="5" step="0.01" placeholder="Fee %" title="Annual fee or expense ratio (%) subtracted from this pie's return" oninput="updateBrokeragePie(${i},'fee',this.value)">
      <button class="remove-btn" onclick="removeBrokeragePie(${i})" title="Remove">×</button>
    </div>
  `).join('');
  els('brokeragePieTotal').textContent = fmtMoney(brokeragePies.reduce((s,p) => s + (+p.balance||0), 0));
  renderExcessIncomeDestinationOptions();
  renderRothConversionSourceOptions();
}
function updateBrokeragePie(i, field, value) {
  brokeragePies[i][field] = (field==='balance' || field==='cashRate' || field==='fee') ? +value : value;
  els('brokeragePieTotal').textContent = fmtMoney(brokeragePies.reduce((s,p) => s + (+p.balance||0), 0));
  if (field === 'name') { renderPieContributionRows(); renderExcessIncomeDestinationOptions(); renderRothConversionSourceOptions(); }
  if (field === 'riskType' || field === 'accountType') { renderBrokeragePieRows(); renderWithdrawalOrderRows(); }
  render();
}
function addBrokeragePie() { brokeragePies.push({ name:'New pie', balance:1000, contribution:0, accountType:'taxable', riskType:'equity', cashRate:4.5, fee:0 }); renderBrokeragePieRows(); renderPieContributionRows(); render(); }
function removeBrokeragePie(i) { brokeragePies.splice(i,1); renderBrokeragePieRows(); renderPieContributionRows(); render(); }

// ---------- Excess income savings destination: a single named pie (e.g. a cash-like SGOV pie), not spread across all pies ----------
let excessIncomeDestinationPieName = '';
function renderExcessIncomeDestinationOptions() {
  const sel = els('excessIncomeDestinationPie');
  if (!sel) return;
  if (!brokeragePies.length) {
    excessIncomeDestinationPieName = '';
    sel.innerHTML = '<option value="">HYSA (automatic fallback)</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  if (!brokeragePies.some(p => p.name === excessIncomeDestinationPieName) && brokeragePies.length) {
    excessIncomeDestinationPieName = brokeragePies[0].name;
  }
  sel.innerHTML = brokeragePies.map((p,i) => `<option value="${p.name}" ${p.name===excessIncomeDestinationPieName?'selected':''}>${p.name || 'Pie '+(i+1)}</option>`).join('');
}
function updateExcessIncomeDestination(name) {
  excessIncomeDestinationPieName = name;
  render();
}

// ---------- Roth Conversion: tax-payment source account (HYSA or a specific brokerage pie) ----------
// Same pattern as excessIncomeDestinationPieName above — a dynamically-populated <select> whose
// options get rebuilt via innerHTML whenever brokeragePies changes, so the selected value has to be
// tracked in its own module-level variable rather than relying on the DOM to remember it.
let rothConversionSourceName = 'hysa';
function renderRothConversionSourceOptions() {
  const sel = els('rothConversionTaxSource');
  if (!sel) return;
  if (rothConversionSourceName !== 'hysa' && !brokeragePies.some(p => p.name === rothConversionSourceName)) {
    rothConversionSourceName = 'hysa';
  }
  const pieOptions = brokeragePies.map((p,i) => `<option value="${p.name}" ${p.name===rothConversionSourceName?'selected':''}>${p.name || 'Pie '+(i+1)}</option>`).join('');
  sel.innerHTML = `<option value="hysa" ${rothConversionSourceName==='hysa'?'selected':''}>HYSA (bank)</option>` + pieOptions;
}
function updateRothConversionSource(name) {
  rothConversionSourceName = name;
  render();
}

// ---------- Per-pie monthly contributions (Money Flows page; shares brokeragePies array) ----------
function renderPieContributionRows() {
  const container = els('pieContributionRows');
  if (!container) return;
  container.innerHTML = brokeragePies.map((p,i) => `
    <div class="row-item contrib-row">
      <span class="pie-name-label">${p.name || 'Unnamed pie'}</span>
      <input type="number" value="${p.contribution||0}" step="10" oninput="updatePieContribution(${i},this.value)">
    </div>
  `).join('');
  els('pieContributionTotal').textContent = fmtMoney(brokeragePies.reduce((s,p) => s + (+p.contribution||0), 0)) + '/mo';
}
function updatePieContribution(i, value) {
  brokeragePies[i].contribution = +value;
  els('pieContributionTotal').textContent = fmtMoney(brokeragePies.reduce((s,p) => s + (+p.contribution||0), 0)) + '/mo';
  render();
}

// ---------- Withdrawal Strategy: ordered list of every individual account money gets drawn from in retirement ----------
// Order is a flat array of account keys: 'trad', 'roth', 'hysa', and 'pie_0'..'pie_N-1' (index into brokeragePies).
let withdrawalOrderState = ["trad","hysa","roth"];
let withdrawalModeCustom = true;
// Accounts checked OFF in the Withdrawal Strategy list — kept as a separate array (rather than removing
// them from withdrawalOrderState) so an excluded account still shows in the list at its usual position,
// with its usual balance, and un-excluding it later doesn't lose whatever order position it had. Only
// affects the voluntary spending-gap waterfall below; Required Minimum Distributions are still forced
// out of Trad TSP regardless (see rmdAge below), since those aren't optional.
let withdrawalExcludedKeys = [];
// How a simultaneous ("multiple accounts at once") withdrawal splits across the accounts that ARE
// included: 'balance' (default — proportional to that year's actual balance, exactly the original
// behavior) or 'percent' (fixed weights you set yourself in withdrawalProportions, independent of how
// each account's balance drifts over time).
let withdrawalProportionMode = 'percent';
let withdrawalProportions = {}; // { [accountKey]: percent } — only read when withdrawalProportionMode === 'percent'

function getWithdrawalAccountKeys() {
  return ['trad', ...brokeragePies.map((_, i) => 'pie_' + i), 'hysa', 'roth'];
}

// "Traditional" order: conventional withdrawal sequencing — taxable brokerage pies first, then the tax-deferred
// TSP, then the HYSA cash reserve, with Roth TSP held back last since it grows tax-free.
function defaultWithdrawalOrder() {
  return [...brokeragePies.map((_, i) => 'pie_' + i), 'trad', 'hysa', 'roth'];
}

// Keeps withdrawalOrderState valid as pies are added/removed: drops stale keys, appends any new ones at the end.
function normalizeWithdrawalOrder() {
  const validKeys = getWithdrawalAccountKeys();
  withdrawalOrderState = withdrawalOrderState.filter(k => validKeys.includes(k));
  validKeys.forEach(k => { if (!withdrawalOrderState.includes(k)) withdrawalOrderState.push(k); });
}

// Drops exclusions for accounts that no longer exist (e.g. a removed brokerage pie) — a newly-added
// account is never excluded by default, same as it's never left out of withdrawalOrderState by default.
function normalizeWithdrawalExclusions() {
  const validKeys = getWithdrawalAccountKeys();
  withdrawalExcludedKeys = withdrawalExcludedKeys.filter(k => validKeys.includes(k));
}

// Drops stale keys and gives any newly-relevant included account an even starting share of 100%, so a
// just-added account (or one just un-excluded) doesn't silently sit at 0% — used as relative weights at
// withdrawal time (see projectRun()), so this doesn't need to add up to exactly 100, but starting even
// keeps the numbers meaning what they look like they mean until the user adjusts them.
function normalizeWithdrawalProportions() {
  const validKeys = getWithdrawalAccountKeys();
  Object.keys(withdrawalProportions).forEach(k => { if (!validKeys.includes(k)) delete withdrawalProportions[k]; });
  const included = validKeys.filter(k => !withdrawalExcludedKeys.includes(k));
  const missing = included.filter(k => withdrawalProportions[k] === undefined);
  if (missing.length) {
    const evenShare = included.length ? Math.round(100 / included.length) : 0;
    missing.forEach(k => { withdrawalProportions[k] = evenShare; });
  }
}

function withdrawalAccountInfo(key) {
  if (key === 'trad') return { label: 'Traditional TSP', badge: 'Tax-deferred · 401(k)', balance: +els('tradTSPBalance').value || 0 };
  if (key === 'roth') return { label: 'Roth TSP', badge: 'Roth · Roth 401(k)', balance: +els('rothTSPBalance').value || 0 };
  if (key === 'hysa') return { label: 'HYSA / Cash Reserve', badge: 'Taxable · Savings', balance: +els('hysaBalance').value || 0 };
  const idx = +key.split('_')[1];
  const pie = brokeragePies[idx];
  const isRothIra = pie && pie.accountType === 'roth_ira';
  return { label: pie ? (pie.name || `Pie ${idx + 1}`) : 'Removed pie', badge: isRothIra ? 'Roth · Roth IRA' : 'Taxable · Investment', balance: pie ? (+pie.balance || 0) : 0 };
}

function setWithdrawalMode(isCustom) {
  withdrawalModeCustom = isCustom;
  if (!isCustom) withdrawalOrderState = defaultWithdrawalOrder();
  renderWithdrawalOrderRows();
  render();
}

function moveWithdrawalOrder(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= withdrawalOrderState.length) return;
  const [item] = withdrawalOrderState.splice(index, 1);
  withdrawalOrderState.splice(newIndex, 0, item);
  renderWithdrawalOrderRows();
  render();
}

function toggleWithdrawalExcluded(key) {
  const idx = withdrawalExcludedKeys.indexOf(key);
  if (idx === -1) withdrawalExcludedKeys.push(key); else withdrawalExcludedKeys.splice(idx, 1);
  renderWithdrawalOrderRows();
  render();
}

function setWithdrawalProportionMode(mode) {
  withdrawalProportionMode = mode === 'percent' ? 'percent' : 'balance';
  renderWithdrawalOrderRows();
  render();
}

function updateWithdrawalProportion(key, value) {
  withdrawalProportions[key] = Math.max(0, +value || 0);
  renderWithdrawalOrderRows();
  render();
}

function renderWithdrawalOrderRows() {
  const container = els('withdrawalOrderRows');
  if (!container) return;
  normalizeWithdrawalOrder();
  normalizeWithdrawalExclusions();
  normalizeWithdrawalProportions();
  const tPill = els('withdrawModeTraditionalPill'), cPill = els('withdrawModeCustomPill');
  if (tPill) tPill.classList.toggle('active', !withdrawalModeCustom);
  if (cPill) cPill.classList.toggle('active', withdrawalModeCustom);

  const simultaneous = !!(els('withdrawSimultaneous') && els('withdrawSimultaneous').checked);
  const percentMode = simultaneous && withdrawalProportionMode === 'percent';

  const modeRow = els('withdrawalProportionModeRow');
  if (modeRow) modeRow.style.display = simultaneous ? 'flex' : 'none';
  const balPill = els('withdrawProportionBalancePill'), pctPill = els('withdrawProportionPercentPill');
  if (balPill) balPill.classList.toggle('active', withdrawalProportionMode !== 'percent');
  if (pctPill) pctPill.classList.toggle('active', withdrawalProportionMode === 'percent');

  container.innerHTML = withdrawalOrderState.map((key, i) => {
    const info = withdrawalAccountInfo(key);
    const excluded = withdrawalExcludedKeys.includes(key);
    const disabledAttr = (withdrawalModeCustom && !simultaneous && !excluded) ? '' : 'disabled';
    const pct = withdrawalProportions[key] || 0;
    const trailing = (percentMode && !excluded)
      ? `<div class="withdraw-order-pct-wrap"><input type="number" class="withdraw-order-pct" min="0" max="100" step="1" value="${pct}" onchange="updateWithdrawalProportion('${key}', this.value)">%</div>`
      : `<div class="withdraw-order-arrows">
          <button type="button" ${disabledAttr} onclick="moveWithdrawalOrder(${i}, -1)" aria-label="Move up">▲</button>
          <button type="button" ${disabledAttr} onclick="moveWithdrawalOrder(${i}, 1)" aria-label="Move down">▼</button>
        </div>`;
    return `
    <div class="withdraw-order-row${excluded ? ' withdraw-order-excluded' : ''}">
      <input type="checkbox" class="withdraw-order-checkbox" ${excluded ? '' : 'checked'} onchange="toggleWithdrawalExcluded('${key}')" title="${excluded ? 'Excluded — never drawn from to cover a spending gap' : 'Included in the withdrawal order'}">
      <span class="withdraw-order-num">${i + 1}</span>
      <div class="withdraw-order-info">
        <div class="withdraw-order-name">${info.label}</div>
        <div class="withdraw-order-badge">${info.badge}${excluded ? ' · Excluded' : ''}</div>
      </div>
      <div class="withdraw-order-balance">${fmtMoney(info.balance)}</div>
      ${trailing}
    </div>`;
  }).join('');

  // Live total so setting fixed percentages doesn't require doing the arithmetic by hand — these are
  // used as relative weights at withdrawal time (see projectRun()), so it doesn't strictly need to add
  // up to 100, but it should for the numbers on screen to mean what they look like they mean.
  const pctTotalEl = els('withdrawalPctTotal');
  if (pctTotalEl) {
    if (percentMode) {
      const included = withdrawalOrderState.filter(k => !withdrawalExcludedKeys.includes(k));
      const total = included.reduce((s, k) => s + (withdrawalProportions[k] || 0), 0);
      pctTotalEl.style.display = 'block';
      pctTotalEl.textContent = Math.abs(total - 100) < 0.5
        ? `Total: ${total}%`
        : `Total: ${total}% — these are used as relative weights, so this doesn't have to be exactly 100%, but it usually should be for the percentages above to mean what they say.`;
    } else {
      pctTotalEl.style.display = 'none';
    }
  }
}

// ---------- Debt (dynamic rows) ----------
