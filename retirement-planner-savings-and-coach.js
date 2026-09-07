function acctReturn(row, key) {
  const begin = (row.acctBegin && row.acctBegin[key]) || 0;
  const end = (row.acctEnd && row.acctEnd[key]) || 0;
  const contrib = (row.contribByAccount && row.contribByAccount[key]) || 0;
  const withdrawal = (row.savingsWithdrawByAccount && row.savingsWithdrawByAccount[key]) || 0;
  return end - begin - contrib + withdrawal;
}

function renderSavingsPage() {
  if (!lastSnapshot || !lastSnapshot.rows || !lastSnapshot.rows.length) return;
  const rows = lastSnapshot.rows, inputs = lastSnapshot.inputs;
  const ages = rows.map(r => r.age);
  const d = (val, age) => dv(val || 0, age, inputs);

  // Only accounts that actually ever hold a balance, get contributed to, earn returns, or get drawn
  // from anywhere in the projection — an unused/empty brokerage pie doesn't clutter three charts and
  // three legend tables with an all-zero series.
  const accountKeys = getWithdrawalAccountKeys().filter(k => rows.some(r =>
    Math.abs((r.acctEnd && r.acctEnd[k]) || 0) > 0.5 ||
    Math.abs((r.contribByAccount && r.contribByAccount[k]) || 0) > 0.5 ||
    Math.abs((r.savingsWithdrawByAccount && r.savingsWithdrawByAccount[k]) || 0) > 0.5
  ));

  // ---- Chart 1: Savings Balances (each account's own ending balance that year, stacked) ----
  const balancesConfig = yearlyBarConfig(ages, accountKeys.map(k => ({
    label: withdrawalAccountInfo(k).label,
    data: rows.map(r => d((r.acctEnd && r.acctEnd[k]) || 0, r.age))
  })), { stacked: true });
  enableChartRangeClickSelection(balancesConfig, 'savings_balances');
  const balancesCanvas = els('chart_savings_balances');
  if (charts.savings_balances) {
    charts.savings_balances.data = balancesConfig.data; charts.savings_balances.options = balancesConfig.options; charts.savings_balances.update();
  } else if (balancesCanvas) {
    charts.savings_balances = new Chart(balancesCanvas.getContext('2d'), balancesConfig);
  }
  applyChartRange('savings_balances');

  // Legend table: the final projected year's balance by account (matches the chart's rightmost bar) —
  // hover/pin the chart itself (range-nav above the chart) to see any other year's breakdown instead.
  const swatch = color => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-right:7px;vertical-align:middle;"></span>`;
  const lastRow = rows[rows.length - 1];
  const lastYearCalendar = ageToCalendarYear(lastRow.age);
  if (els('savingsBalancesTable')) {
    const total = accountKeys.reduce((s,k) => s + d((lastRow.acctEnd && lastRow.acctEnd[k]) || 0, lastRow.age), 0);
    els('savingsBalancesTable').innerHTML = `
      <div style="border:1px solid var(--border);border-radius:8px;padding:14px 16px;">
        <div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:10px;">${lastYearCalendar != null ? lastYearCalendar : 'Age ' + lastRow.age}${lastRow.spouseAge != null ? ' · Spouse ' + lastRow.spouseAge : ''}</div>
        ${accountKeys.map((k,i) => `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:15.5px;"><span>${swatch(CHART_COLORS[i%CHART_COLORS.length])}${withdrawalAccountInfo(k).label}</span><span>${fmtMoney(d((lastRow.acctEnd&&lastRow.acctEnd[k])||0, lastRow.age))}</span></div>`).join('')}
        <div class="total-row"><span>Total</span><span>${fmtMoney(total)}</span></div>
      </div>
    `;
  }

  // ---- Chart 2: Contributions and Investment Returns (per account, stacked) ----
  const contribSeries = [];
  accountKeys.forEach(k => {
    if (k === 'trad') {
      contribSeries.push({ label: 'Employee Contributions: Traditional TSP', data: rows.map(r => d(r.tradContribOut, r.age)) });
      contribSeries.push({ label: 'Employer Match: Traditional TSP', data: rows.map(r => d(r.matchContribOut, r.age)) });
    } else if (k === 'roth') {
      contribSeries.push({ label: 'Employee Contributions: Roth TSP', data: rows.map(r => d(r.rothContribOut, r.age)) });
    } else if (k !== 'hysa') {
      contribSeries.push({ label: 'Monthly Savings: ' + withdrawalAccountInfo(k).label, data: rows.map(r => d((r.contribByAccount && r.contribByAccount[k]) || 0, r.age)) });
    }
    contribSeries.push({ label: 'Returns: ' + withdrawalAccountInfo(k).label, data: rows.map(r => d(acctReturn(r, k), r.age)) });
  });
  const contribConfig = yearlyBarConfig(ages, contribSeries, { stacked: true });
  enableChartRangeClickSelection(contribConfig, 'savings_contrib');
  const contribCanvas = els('chart_savings_contrib');
  if (charts.savings_contrib) {
    charts.savings_contrib.data = contribConfig.data; charts.savings_contrib.options = contribConfig.options; charts.savings_contrib.update();
  } else if (contribCanvas) {
    charts.savings_contrib = new Chart(contribCanvas.getContext('2d'), contribConfig);
  }
  applyChartRange('savings_contrib');

  if (els('savingsContribTable')) {
    const lifetimeRows = contribSeries.map(s => ({ label: s.label, total: s.data.reduce((sum,v) => sum+v, 0) }));
    const grandTotal = lifetimeRows.reduce((s,r) => s+r.total, 0);
    els('savingsContribTable').innerHTML = `
      <div style="border:1px solid var(--border);border-radius:8px;padding:14px 16px;">
        <div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:10px;">Lifetime</div>
        ${lifetimeRows.map((r,i) => `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:15.5px;"><span>${swatch(CHART_COLORS[i%CHART_COLORS.length])}${r.label}</span><span>${fmtMoney(r.total)}</span></div>`).join('')}
        <div class="total-row"><span>Total</span><span>${fmtMoney(grandTotal)}</span></div>
      </div>
    `;
  }

  // ---- Chart 3: Savings Drawdowns and Transfers (per account, stacked) ----
  const drawdownConfig = yearlyBarConfig(ages, accountKeys.map(k => ({
    label: 'Withdrawn from: ' + withdrawalAccountInfo(k).label,
    data: rows.map(r => d((r.savingsWithdrawByAccount && r.savingsWithdrawByAccount[k]) || 0, r.age))
  })), { stacked: true });
  enableChartRangeClickSelection(drawdownConfig, 'savings_drawdowns');
  const drawdownCanvas = els('chart_savings_drawdowns');
  if (charts.savings_drawdowns) {
    charts.savings_drawdowns.data = drawdownConfig.data; charts.savings_drawdowns.options = drawdownConfig.options; charts.savings_drawdowns.update();
  } else if (drawdownCanvas) {
    charts.savings_drawdowns = new Chart(drawdownCanvas.getContext('2d'), drawdownConfig);
  }
  applyChartRange('savings_drawdowns');

  if (els('savingsDrawdownsTable')) {
    const lifetimeRows = accountKeys.map((k,i) => ({ label: 'Withdrawn from: ' + withdrawalAccountInfo(k).label, total: rows.reduce((s,r) => s + d((r.savingsWithdrawByAccount && r.savingsWithdrawByAccount[k]) || 0, r.age), 0), i }));
    const grandTotal = lifetimeRows.reduce((s,r) => s+r.total, 0);
    els('savingsDrawdownsTable').innerHTML = `
      <div style="border:1px solid var(--border);border-radius:8px;padding:14px 16px;">
        <div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:10px;">Lifetime</div>
        ${lifetimeRows.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:15.5px;"><span>${swatch(CHART_COLORS[r.i%CHART_COLORS.length])}${r.label}</span><span>${fmtMoney(r.total)}</span></div>`).join('')}
        <div class="total-row"><span>Total</span><span>${fmtMoney(grandTotal)}</span></div>
      </div>
    `;
  }
}

// ---------- Coach: rule-based suggestions ----------
function generateCoachSuggestions(inputs, ctx, result, score) {
  const tips = [];
  const add = (severity, icon, text) => tips.push({ severity, icon, text });

  if (score >= 80) add('good', '✓', `Your confidence score is ${Math.round(score)}% — strong. Small changes are more about optimizing than fixing a shortfall.`);
  else if (score >= 60) add('medium', '!', `Your confidence score is ${Math.round(score)}% — good, but there's room to firm it up. Consider the guardrails, contribution rate, and expense items below.`);
  else add('high', '⚠', `Your confidence score is ${Math.round(score)}% — worth attention. Consider retiring later, spending less, or contributing more before locking in your date (see the Explorers page for specific scenarios).`);

  if (!inputs.guardrailsEnabled) add('medium', '!', 'Dynamic spending guardrails are off. Turning them on (Assumptions page) lets spending flex down slightly in bad markets, which typically raises your confidence score.');

  const highInterestDebt = debts.filter(d => (+d.apr||0) > 15);
  if (highInterestDebt.length) add('high', '⚠', `You're carrying ${highInterestDebt.length} debt${highInterestDebt.length>1?'s':''} above 15% APR (${highInterestDebt.map(d=>d.name).join(', ')}). Paying these down first usually beats any investment return.`);

  const totalMonthlyExpenses = expenses.reduce((s,e)=>s+expenseValForBasis(e),0) + inputs.rentMonthly;
  const cashOnHand = inputs.checkingBalance + inputs.savingsBalance;
  if (cashOnHand < totalMonthlyExpenses*3) add('medium', '!', `Checking + savings (${fmtMoney(cashOnHand)}) covers less than 3 months of your recurring monthly bills (${fmtMoney(totalMonthlyExpenses)}/mo). Consider building a bigger cash cushion before retirement, separate from the HYSA.`);

  const contribPct = inputs.tradPct + inputs.rothPct;
  if (contribPct < inputs.matchCapPct) add('high', '⚠', `You're contributing ${(contribPct*100).toFixed(1)}% of income to TSP but the agency matches up to ${(inputs.matchCapPct*100).toFixed(1)}%. You're leaving free match money on the table.`);

  if (inputs.ltcEnabled) {
    const ltcTotalCost = inputs.ltcAnnualCost * inputs.ltcDuration;
    if (inputs.rothTSPBalance < ltcTotalCost * 0.5) add('medium', '!', `Long-term care is modeled at ~${fmtMoney(ltcTotalCost)} total, funded from Roth TSP first. Your current Roth balance (${fmtMoney(inputs.rothTSPBalance)}) may not fully cover it by itself — the model then uses Brokerage, eligible Traditional TSP, and available cash reserves.`);
  }

  const rothShare = inputs.rothTSPBalance / Math.max(1, inputs.tradTSPBalance + inputs.rothTSPBalance);
  if (rothShare < 0.2) add('low', 'i', `Only ${(rothShare*100).toFixed(0)}% of your TSP is Roth. More Roth gives you tax-free withdrawal flexibility later — worth a look given your Traditional TSP withdrawals are taxed at your marginal rate.`);

  if (!inputs.ruleOf55Applies) add('medium', '!', "Rule of 55 is turned off on the Taxes page, so Traditional TSP withdrawals before 59½ are modeled with a 10% penalty. If you're separating from federal service at 55+ and leaving the money in TSP, turn it back on.");

  if (result.depletionAge) add('high', '⚠', `The deterministic projection runs out of investable money at age ${result.depletionAge}. Check the Explorers page for what-if scenarios (retire later, spend less, delay Social Security) that might close the gap.`);

  const bigExpenses = expenses.filter(e => expenseValForBasis(e) > totalMonthlyExpenses*0.25);
  if (bigExpenses.length) add('low', 'i', `${bigExpenses.map(e=>e.name).join(', ')} make up a large share of your monthly expenses. Worth double-checking these are modeled at the right amount since they move the plan a lot.`);

  if (!tips.length) add('good', '✓', "Nothing stands out. Your plan looks internally consistent based on the checks this Coach runs.");

  return tips;
}

function renderCoachTips() {
  const container = els('coachTips');
  if (!container) return;
  const wellnessSummary = els('wellnessSummaryDetail') ? els('wellnessSummaryDetail').textContent : '';
  container.innerHTML = `
    <p style="font-size:16px;color:var(--muted);line-height:1.55;margin:0 0 14px;">${wellnessSummary || 'Financial Wellness identifies the plan areas that deserve attention without blending them into one score.'}</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;">
      <button type="button" class="add-btn" onclick="showPage('wellness')">Review Financial Wellness</button>
      <button type="button" class="add-btn" onclick="showExplorerAnalysis('retirementtiming')">Test Retirement Timing</button>
      <button type="button" class="add-btn" onclick="toggleFloatingAi(true)">Discuss With Ask AI</button>
    </div>`;
}

// ---------- Coach: optional AI chat (direct browser call to Anthropic API, only if a key is set) ----------
// Global "Ask AI" floating panel: available on every page via the fixed bottom-right button,
// so the user doesn't have to navigate to the Coach page just to ask a question.
function toggleFloatingAi(forceOpen) {
  const panel = els('floatingAiPanel');
  if (!panel) return;
  const shouldOpen = forceOpen !== undefined ? forceOpen : (panel.style.display === 'none');
  panel.style.display = shouldOpen ? 'flex' : 'none';
  if (shouldOpen) {
    renderCoachAiGate();
    // Re-render from the persisted history every time the panel opens, rather than trusting whatever the
    // DOM happened to be left showing — coachChatLog's innerHTML isn't kept in sync while the panel is
    // closed (nothing re-renders a hidden panel), so this is what makes a conversation started earlier in
    // the session (or in a previous session, since history now persists to localStorage) actually show up
    // again instead of opening to an empty log.
    renderCoachChatLog();
    const input = els('coachChatInput');
    if (input) input.focus();
  }
}

// The Coach page has its own full-size question field. It feeds the same saved conversation used by
// the floating Ask AI panel so there is one continuous chat history, regardless of where a question starts.
function askFromQuestionField(fieldId) {
  const pageInput = els(fieldId);
  const question = (pageInput && pageInput.value || '').trim();
  if (!question) {
    if (pageInput) pageInput.focus();
    return;
  }

  toggleFloatingAi(true);
  const chatInput = els('coachChatInput');
  if (!chatInput) return;
  chatInput.value = question;

  // Keep the question visible on the Coach page if a key has not been entered yet. The open
  // conversation panel explains where to add it, and no text is lost while the user does that.
  const key = (els('anthropicApiKey') && els('anthropicApiKey').value || '').trim();
  if (!key) return;

  pageInput.value = '';
  sendCoachChatMessage();
}
function askFromCoachPage() { askFromQuestionField('coachPageQuestion'); }
function askFromSettingsPage() { askFromQuestionField('coachSettingsQuestion'); }

function renderCoachAiGate() {
  const gate = els('coachAiGate');
  const box = els('coachChatBox');
  if (!gate || !box) return;
  const key = (els('anthropicApiKey') && els('anthropicApiKey').value || '').trim();
  if (key) {
    gate.innerHTML = '';
    box.style.display = 'block';
  } else {
    gate.innerHTML = '<p style="font-size:16px;color:var(--muted);line-height:1.55;margin:0;">Add your own Anthropic API key on the <b>Settings</b> page to turn this on. Nothing is sent anywhere until you do.</p>';
    box.style.display = 'none';
  }
  const clearBtn = els('coachChatClearBtn');
  if (clearBtn) clearBtn.style.display = (key && coachChatHistory.length) ? 'inline-block' : 'none';
}

// Full plan snapshot sent as the system prompt's context on every question — deliberately comprehensive
// (every major lever in the app, plus the full year-by-year projection) rather than the handful of
// headline numbers this used to send, so the AI can actually analyze the plan in the kind of depth a
// normal Claude conversation would, instead of only being able to comment on 5-6 numbers. Built entirely
// from readInputs()'s return value and the typed arrays (expenses/debts/insurancePolicies/brokeragePies/
// withdrawal-order state) — NEVER from saveState()'s `fields` blob or any generic dump of every DOM input,
// since `fields` is the one place the Anthropic API key itself (anthropicApiKey) lives; keeping this
// function's inputs restricted to named, individually-read values makes it structurally impossible for
// the key to end up inside a request sent to Anthropic's own servers.
function buildPlanSummaryForAI() {
  const inputs = readInputs();
  const ctx = buildContext(inputs);
  const result = projectRun(inputs, ctx, false);
  const score = runMonteCarlo(inputs, ctx, 300);
  const basisLabel = spendingBasis === 'jobloss' ? 'Job Loss' : spendingBasis === 'mustspend' ? 'Must Spend' : 'Like to Spend';
  const firstRetireRow = result.rows.find(r => r.age >= inputs.retirementAge) || result.rows[result.rows.length - 1];
  const pct = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%';

  const lines = [];
  lines.push('=== HOUSEHOLD ===');
  lines.push(`You: age ${inputs.currentAge}, life expectancy ${inputs.lifeExpectancy}, planning to retire at ${inputs.retirementAge}. Spouse: age ${inputs.spouseCurrentAge}, life expectancy ${inputs.spouseLifeExpectancy}${inputs.spouseWorks ? ', still working' : ', not working'}. Idaho resident (state income tax ${pct(inputs.idahoRate)} flat).`);

  lines.push('\n=== CURRENT BALANCES ===');
  lines.push(`Traditional TSP: ${fmtMoney(inputs.tradTSPBalance)} (contributing ${pct(inputs.tradPct)} of pay). Roth TSP: ${fmtMoney(inputs.rothTSPBalance)} (contributing ${pct(inputs.rothPct)} of pay). Agency match caps at ${pct(inputs.matchCapPct)} of pay.`);
  lines.push(`M1 Finance accounts: ${brokeragePies.length ? brokeragePies.map(p => `${p.name || 'Pie'} ${fmtMoney(p.balance)} (${p.accountType === 'roth_ira' ? 'Roth IRA' : 'taxable'}, ${p.riskType === 'cash' ? 'cash-like, fixed ' + pct((p.cashRate || 4.5) / 100) : 'market-linked'}, contributing $${p.contribution || 0}/mo)`).join('; ') : 'none'}.`);
  lines.push(`Cash: Checking ${fmtMoney(inputs.checkingBalance)}, Savings ${fmtMoney(inputs.savingsBalance)}, HYSA ${fmtMoney(inputs.hysaBalance)} (HYSA APY ${pct(inputs.hysaRate)}, Checking/Savings APY ${pct(inputs.cashRate)}).`);

  lines.push('\n=== GUARANTEED INCOME ===');
  lines.push(inputs.spouseWorks
    ? `Social Security: $${inputs.ssMonthly}/mo starting age ${inputs.ssAge}; spouse's own benefit $${inputs.spouseSSMonthly}/mo starting at spouse age ${inputs.spouseSSAge} (both use ${pct(inputs.ssCola)}/yr COLA).`
    : `Social Security: $${inputs.ssMonthly}/mo starting age ${inputs.ssAge} (COLA ${pct(inputs.ssCola)}/yr). Spousal benefit: ${pct(inputs.spousalPct)} of your benefit starting at spouse age ${inputs.spousalStartAge}.`);
  lines.push(`Military pension: $${inputs.pensionAnnual}/yr starting age ${inputs.pensionAge} (grows ${pct(inputs.pensionGrowth)}/yr). Govt Civil Service pension: $${inputs.pension2Annual}/yr starting age ${inputs.pension2Age} (grows ${pct(inputs.pension2Growth)}/yr).`);
  lines.push(`VA disability: $${inputs.vaDisabilityAnnual}/yr starting age ${inputs.vaDisabilityAge}, tax-free (grows ${pct(inputs.vaDisabilityGrowth)}/yr). Annuity: $${inputs.annuityMonthly}/mo starting age ${inputs.annuityStartAge} (grows ${pct(inputs.annuityGrowth)}/yr).`);

  lines.push(`\n=== RECURRING EXPENSES (monthly $, header toggle currently on "${basisLabel}") ===`);
  lines.push(expenses.length ? expenses.map(e => {
    const dateNote = (e.startAge != null || e.endAge != null) ? ` [only active age ${e.startAge != null ? e.startAge : 'plan start'}–${e.endAge != null ? e.endAge : 'plan end'}]` : '';
    return `${e.name || 'Unnamed'} (${e.category}): Like to Spend $${e.amount}, Must Spend $${e.mustSpend != null ? e.mustSpend : e.amount}, Job Loss $${e.jobLoss != null ? e.jobLoss : (e.mustSpend != null ? e.mustSpend : e.amount)}${dateNote}`;
  }).join('; ') : 'none entered');
  lines.push(`Housing: $${inputs.rentMonthly || 0}/mo rent${inputs.buyHome ? ', planning to buy a home during the plan' : ''}.`);
  lines.push(`Debt: ${debts.length ? debts.map(d => `${d.name || d.category} ${fmtMoney(d.balance)} balance at ${d.apr}% APR, $${d.payment}/mo payment`).join('; ') : 'none'}.`);
  lines.push(`Insurance premiums: ${insurancePolicies.length ? insurancePolicies.map(p => `${p.name} $${p.premium}/mo`).join('; ') : 'none'}.`);
  lines.push(`Future/one-time expenses: ${futureExpenses.length ? futureExpenses.map(f => `${f.name} $${f.amount} at age ${f.age}${f.recurring ? ` yearly through age ${f.endAge || f.age}` : ' (one-time)'}`).join('; ') : 'none'}.`);
  lines.push(`Windfalls: ${windfalls.length ? windfalls.map(w => `${w.name} ${fmtMoney(w.amount)} at age ${w.age}, into ${w.destination}`).join('; ') : 'none'}.`);

  lines.push('\n=== ASSUMPTIONS & GUARDRAILS ===');
  lines.push(`Pre-retirement return ${pct(inputs.preReturn)} (stdev ${pct(inputs.preStdev)}). Post-retirement return ${pct(inputs.postReturn)} (stdev ${pct(inputs.postStdev)}). General inflation ${pct(inputs.inflation)}/yr. Medical inflation ${pct(inputs.medicalInflation)}/yr.`);
  lines.push(`Dynamic spending guardrails: ${inputs.guardrailsEnabled ? `ON — band ±${pct(inputs.guardBand)} around the initial withdrawal rate, adjusts spending ${pct(inputs.guardAdj)} when triggered (never cuts below the Must Spend floor)` : 'OFF — spending never adjusts based on portfolio performance'}. Rule of 55: ${inputs.ruleOf55Applies ? 'applies (no early-withdrawal penalty on Traditional TSP if separating at 55+)' : 'does not apply (10% penalty before 59½)'}.`);

  lines.push('\n=== WITHDRAWAL STRATEGY (Money Flows page) ===');
  lines.push(`Order accounts are drawn from to cover a spending gap: ${inputs.withdrawalOrder.length ? inputs.withdrawalOrder.map(k => withdrawalAccountInfo(k).label).join(' → ') : 'none (all accounts excluded)'}${(typeof withdrawalExcludedKeys !== 'undefined' && withdrawalExcludedKeys.length) ? `. Excluded entirely from withdrawal: ${withdrawalExcludedKeys.map(k => withdrawalAccountInfo(k).label).join(', ')}` : ''}.`);
  lines.push(`Mode: ${inputs.withdrawalSimultaneous ? `simultaneous — ${inputs.withdrawalProportionMode === 'percent' ? 'split by the fixed percentages set for each account' : 'split proportionally by each account’s current balance'}` : 'sequential — fully drains one account before moving to the next, in the order above'}.`);

  lines.push('\n=== PROJECTION RESULTS ===');
  lines.push(`Monte Carlo confidence score: ${Math.round(score)}%. Investable balance at retirement: ${fmtMoney(result.investableAtRetirement)}. ${result.depletionAge ? `Portfolio depletes at age ${result.depletionAge} in the deterministic run.` : `Portfolio never depletes in the deterministic run — lasts through age ${ctx.effectiveLifeExpectancy}.`}`);
  if (firstRetireRow) {
    const gap = (firstRetireRow.spending || 0) - (firstRetireRow.guaranteedIncomeAfterTax || 0);
    lines.push(`At retirement (age ${firstRetireRow.age}): guaranteed income after tax ${fmtMoney(firstRetireRow.guaranteedIncomeAfterTax)}/yr, spending ${fmtMoney(firstRetireRow.spending)}/yr — ${gap > 0 ? `a gap of ${fmtMoney(gap)}/yr drawn from accounts` : `a surplus of ${fmtMoney(-gap)}/yr, no withdrawal needed that year`}.`);
  }

  lines.push('\n=== YEAR-BY-YEAR PROJECTION (age: pre-tax income [job+guaranteed], total expenses, net worth, all in today’s-dollar-equivalent $K) ===');
  lines.push(result.rows.map(r => {
    const inc = (r.income || 0) + (r.guaranteedIncome || 0);
    const exp = r.age < inputs.retirementAge ? (r.recurringLivingCostThisYear || 0) : (r.spending || 0);
    return `${r.age}: inc ${fmtMoneyK(inc)}, exp ${fmtMoneyK(exp)}, net worth ${fmtMoneyK(r.netWorth)}`;
  }).join(' | '));

  return lines.join('\n');
}

// Escapes text for safe insertion as HTML (used for the user's own typed question, and as the fallback
// path if marked.js hasn't loaded) — builds it via a detached element's textContent so the browser itself
// does the escaping instead of a hand-rolled regex.
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}
// Renders an AI reply's markdown (headers, bold, lists, code blocks, etc.) as real HTML via marked.js —
// matching how a normal Claude chat actually displays formatted answers, instead of the old plain-text
// wall with manual <br> substitution. Falls back to the old escaped-plain-text behavior if the CDN script
// hasn't loaded yet (slow connection, blocked domain, etc.) so a reply is still readable either way.
function renderMarkdown(text) {
  if (window.marked && typeof window.marked.parse === 'function') {
    try { return marked.parse(text || ''); } catch (e) { /* fall through to plain-text fallback below */ }
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// Chat history persists in this browser (same trust boundary as the Anthropic API key itself, which
// already lives in localStorage) so the conversation is still there next time the panel is opened —
// previously an in-memory-only array, wiped by any page refresh. "New chat" (clearCoachChat, below) is
// the explicit way to reset it.
const COACH_CHAT_HISTORY_KEY = 'retirementPlannerAskAiHistory_v1';
let coachChatHistory = [];
try {
  const savedChat = JSON.parse(localStorage.getItem(COACH_CHAT_HISTORY_KEY) || '[]');
  if (Array.isArray(savedChat)) coachChatHistory = savedChat;
} catch (e) { coachChatHistory = []; }
function saveCoachChatHistory() {
  try { localStorage.setItem(COACH_CHAT_HISTORY_KEY, JSON.stringify(coachChatHistory)); } catch (e) { /* storage unavailable, ignore */ }
}
// Renders the full saved history into the chat log — called when the panel opens, and after every send/
// clear, so the log always reflects coachChatHistory exactly (rather than being incrementally patched in
// more than one place, which is how UI/state could quietly drift out of sync).
function renderCoachChatLog() {
  const log = els('coachChatLog');
  if (!log) return;
  log.innerHTML = coachChatHistory.map(m => m.role === 'user'
    ? `<div class="chat-msg user">${escapeHtml(m.content)}</div>`
    : `<div class="chat-msg ai">${renderMarkdown(m.content)}</div>`
  ).join('');
  log.scrollTop = log.scrollHeight;
  const clearBtn = els('coachChatClearBtn');
  if (clearBtn) clearBtn.style.display = coachChatHistory.length ? 'inline-block' : 'none';
}
function clearCoachChat() {
  if (coachChatHistory.length && !confirm('Start a new conversation? This clears the current chat history in this browser.')) return;
  coachChatHistory = [];
  saveCoachChatHistory();
  renderCoachChatLog();
}

async function sendCoachChatMessage() {
  const input = els('coachChatInput');
  const question = (input.value || '').trim();
  if (!question) return;
  const key = (els('anthropicApiKey').value || '').trim();
  if (!key) { renderCoachAiGate(); return; }

  const log = els('coachChatLog');
  const sendBtn = els('coachChatSend');
  coachChatHistory.push({ role: 'user', content: question });
  saveCoachChatHistory();
  log.innerHTML += `<div class="chat-msg user">${escapeHtml(question)}</div>`;
  input.value = '';
  sendBtn.disabled = true;
  log.innerHTML += `<div class="chat-msg ai" id="coachChatPending">Thinking…</div>`;
  log.scrollTop = log.scrollHeight;
  const clearBtn = els('coachChatClearBtn');
  if (clearBtn) clearBtn.style.display = 'inline-block';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        stream: true,
        system: `You are a sharp, candid financial planning analyst embedded in a personal retirement planner web app, with full access to the user's actual plan data below. Answer like a knowledgeable advisor who has genuinely reviewed their numbers — be specific, reference their real figures (dollar amounts, ages, percentages) rather than speaking in generalities, and give thorough, well-reasoned analysis when the question calls for it rather than a shallow summary. Use markdown formatting (headers, bold, bullet/numbered lists, tables) where it makes a longer answer easier to scan. Use general financial knowledge for anything outside the plan snapshot. This is not licensed financial advice — you can note that briefly once near the start of the conversation, not on every message.\n\nPLAN SNAPSHOT:\n${buildPlanSummaryForAI()}`,
        messages: coachChatHistory
      })
    });

    const pending = els('coachChatPending');
    if (!resp.ok) {
      let msg = `Request failed (${resp.status})`;
      try { const data = await resp.json(); msg = (data && data.error && data.error.message) || msg; } catch (e) { /* body wasn't JSON */ }
      if (pending) pending.outerHTML = `<div class="chat-msg ai">Error: ${escapeHtml(msg)}</div>`;
      coachChatHistory.pop(); // don't leave a user turn in history with no matching reply
      saveCoachChatHistory();
      return;
    }

    // Streamed response (stream:true above): Anthropic sends Server-Sent Events, one JSON object per
    // "data: " line. The only event type that carries actual reply text is content_block_delta with a
    // text_delta — each one is appended and the pending bubble is re-rendered through renderMarkdown()
    // so formatting (a list that's still being written, etc.) updates live instead of only appearing once
    // the whole response finishes, which is what gives this the real-time "normal Claude chat" feel
    // instead of a single "Thinking…" then a static dump of the whole answer at once.
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', assistantText = '', streamError = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // last line may be incomplete — carried over to the next chunk
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        let evt;
        try { evt = JSON.parse(jsonStr); } catch (e) { continue; }
        if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
          assistantText += evt.delta.text;
          if (pending) pending.innerHTML = renderMarkdown(assistantText);
          log.scrollTop = log.scrollHeight;
        } else if (evt.type === 'error') {
          streamError = (evt.error && evt.error.message) || 'Stream error';
        }
      }
    }

    if (streamError && !assistantText) {
      if (pending) pending.outerHTML = `<div class="chat-msg ai">Error: ${escapeHtml(streamError)}</div>`;
      coachChatHistory.pop();
      saveCoachChatHistory();
    } else {
      const finalText = assistantText || '(no response)';
      if (pending) { pending.removeAttribute('id'); pending.innerHTML = renderMarkdown(finalText); }
      coachChatHistory.push({ role: 'assistant', content: finalText });
      saveCoachChatHistory();
    }
  } catch (e) {
    const pending = els('coachChatPending');
    if (pending) pending.outerHTML = `<div class="chat-msg ai">Couldn't reach the API from this browser (${escapeHtml(e.message)}). This may be blocked by CORS depending on your browser/extensions.</div>`;
    coachChatHistory.pop();
    saveCoachChatHistory();
  } finally {
    sendBtn.disabled = false;
    log.scrollTop = log.scrollHeight;
  }
}

// ---------- Document Vault: client-side document upload, keyword search, and AI Q&A ----------
// Storage: IndexedDB, not localStorage. Two problems came out of the original localStorage-only design:
// (1) localStorage's small, synchronous, per-origin quota (often just a few MB — sometimes tighter still
// on a file:// page, which is how this tool is normally opened) is shared with the main plan's own
// STORAGE_KEY. A handful of large documents could push total usage over that limit, and depending on the
// browser a quota failure can end up costing more than just the one write that failed. (2) Only extracted
// text was ever kept, never the original file, so there was never anything to actually open or download —
// "Your Documents" only ever showed searchable text, never the document itself.
// IndexedDB fixes both: it's a completely separate storage mechanism from localStorage, so a large vault
// can never contend with or endanger the main plan's saved data; it stores the original file as a real
// Blob with no size penalty; and its real-world quota is dramatically larger than localStorage's (typically
// a meaningful share of free disk space, easily hundreds of MB or more, vs. localStorage's usual 5-10 MB).
// Nothing here ever leaves the browser except the specific document text sent to Anthropic if you use
// Ask AI below (and only after you've added your own API key on Settings).
// Note: a plain `esc()` HTML-escaping helper already exists elsewhere in this file, but it's defined
// inside the embedded credit-card tracker sub-app (only decoded/loaded once you visit Accounts & Cards),
// so it can't be relied on here — this exact kind of "defined only if another page happened to load
// first" bug bit an earlier chart (see the esc() ReferenceError fix). vaultEsc() below is this section's
// own, always-available copy.
