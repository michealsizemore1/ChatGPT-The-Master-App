const DEBT_CATEGORIES = ['Credit Card','Auto Loan','Student Loan','Personal Loan','Medical Debt','Other'];
let debts = [];
function renderDebtRows() {
  const container = els('debtRows');
  container.innerHTML = debts.map((d,i) => `
    <div class="row-item debt-row">
      <input type="text" value="${d.name||''}" placeholder="Name" oninput="updateDebt(${i},'name',this.value)" title="Name — shown wherever this debt's payments are itemized (Income vs Expenses chart, Debt Payoff Plan)">
      <select onchange="updateDebt(${i},'category',this.value)">
        ${DEBT_CATEGORIES.map(c => `<option value="${c}" ${c===d.category?'selected':''}>${c}</option>`).join('')}
      </select>
      <input type="number" value="${d.balance}" step="500" oninput="updateDebt(${i},'balance',this.value)" title="Balance">
      <input type="number" value="${d.apr}" step="0.5" oninput="updateDebt(${i},'apr',this.value)" title="APR (%)">
      <input type="number" value="${d.startAge != null ? d.startAge : ''}" placeholder="Now" step="1" min="0" oninput="updateDebt(${i},'startAge',this.value)" title="Start age — leave blank for a debt you already have; set this for a future loan (e.g. a planned vehicle purchase)">
      <input type="number" value="${d.termYears != null ? d.termYears : ''}" placeholder="—" step="1" min="1" oninput="updateDebt(${i},'termYears',this.value)" title="Loan term in years — optional; auto-computes the monthly payment for you">
      <input type="number" id="debtPayment${i}" value="${d.payment}" step="25" oninput="updateDebt(${i},'payment',this.value)" title="Monthly payment"${d.termYears ? ' disabled' : ''}>
      <input type="number" value="${d.assetValue != null ? d.assetValue : 0}" step="500" min="0" oninput="updateDebt(${i},'assetValue',this.value)" title="Current value, or purchase value for a future vehicle">
      <input type="number" value="${d.assetDepreciation != null ? d.assetDepreciation : 15}" step="1" min="0" max="100" oninput="updateDebt(${i},'assetDepreciation',this.value)" title="Annual vehicle depreciation rate">
      <button class="remove-btn" onclick="removeDebt(${i})" title="Remove">×</button>
    </div>
  `).join('');
  els('debtTotal').textContent = fmtMoney(debts.reduce((s,d) => s + (+d.balance||0), 0));
}
function updateDebt(i, field, value) {
  const d = debts[i];
  if (field==='balance'||field==='apr'||field==='payment'||field==='assetValue'||field==='assetDepreciation') {
    d[field] = +value;
  } else if (field==='startAge'||field==='termYears') {
    d[field] = value === '' ? null : +value;
  } else {
    d[field] = value;
  }
  // A term (in years) is an opt-in convenience: when set, it auto-computes the monthly payment from
  // balance/APR/term (same amortization-payment formula the home-purchase mortgage feature already
  // uses) instead of making you hand-calculate it. Clearing the term hands manual control back.
  if (d.termYears) {
    d.payment = Math.round(mortgagePayment(Math.max(0, +d.balance||0), +d.apr||0, +d.termYears) * 100) / 100;
    const payEl = els('debtPayment'+i);
    if (payEl) { payEl.value = d.payment; payEl.disabled = true; }
  } else if (field === 'termYears') {
    const payEl = els('debtPayment'+i);
    if (payEl) payEl.disabled = false;
  }
  els('debtTotal').textContent = fmtMoney(debts.reduce((s,d) => s + (+d.balance||0), 0));
  render();
}
function addDebt() { debts.push({ name:'New debt', category:'Other', balance:5000, apr:10, payment:150, startAge:null, termYears:null, assetValue:0, assetDepreciation:15 }); renderDebtRows(); render(); }
function removeDebt(i) { debts.splice(i,1); renderDebtRows(); render(); }

// ---------- Debt amortization schedule (return-independent, computed once per render) ----------
// startMonthOffset lets a debt originate in the future instead of already existing today — e.g. a
// planned Vehicle Purchase financed at age 62 rather than a loan you're already carrying. Before that
// many months elapse, the debt simply doesn't exist yet (balance $0, no payment); amortization begins
// exactly at that month using the debt's real balance/APR/payment. Defaults to 0 (starts now), which
// reproduces the exact original behavior for every pre-existing debt.
function buildDebtSchedule(debt, maxYears, startMonthOffset) {
  startMonthOffset = Math.max(0, Math.round(startMonthOffset || 0));
  const r = debt.apr/100/12;
  const neverPaysOff = r > 0 && debt.payment <= debt.balance*r;
  const balanceAtYearEnd = new Array(maxYears+1).fill(0);
  const paymentDuringYear = new Array(maxYears+1).fill(0);
  if (debt.balance <= 0) {
    // Already-paid-off (or no) debt: zero balance throughout, counts as paid off this month (0).
    return { balanceAtYearEnd, paymentDuringYear, neverPaysOff: false, payoffMonthIndex: 0 };
  }
  if (neverPaysOff) {
    for (let y=0; y<=maxYears; y++) {
      const monthsElapsedByYearEnd = (y+1)*12;
      const activeMonths = Math.max(0, Math.min(12, monthsElapsedByYearEnd - startMonthOffset));
      paymentDuringYear[y] = debt.payment * activeMonths;
      balanceAtYearEnd[y] = monthsElapsedByYearEnd > startMonthOffset ? debt.balance : 0;
    }
    // A debt that never pays off has no payoff month at all, regardless of when it originates.
    return { balanceAtYearEnd, paymentDuringYear, neverPaysOff, payoffMonthIndex: null };
  }
  let bal = 0, y = 0, paidThisYear = 0, month = 0, originated = false;
  // Exact number of months from today until the balance actually hits zero, tracked at the same
  // monthly resolution the amortization math itself already runs at — independent of anyone's age or
  // birthday, since a payoff date is purely a function of balance/APR/payment (and, now, origination
  // timing), not a milestone tied to a person's calendar. Only balanceAtYearEnd/paymentDuringYear (the
  // arrays the rest of the engine needs) get rolled up to yearly resolution; this stays at the true
  // monthly precision.
  let payoffMonthIndex = null;
  while (month < maxYears*12) {
    if (!originated && month >= startMonthOffset) { bal = debt.balance; originated = true; }
    if (originated && bal > 0.01) {
      const interest = bal*r;
      let principal = debt.payment - interest;
      if (principal > bal) principal = bal;
      bal -= principal;
      paidThisYear += interest + principal;
    }
    month++;
    if (originated && bal <= 0.01 && payoffMonthIndex === null) payoffMonthIndex = month;
    if (month % 12 === 0) { balanceAtYearEnd[y] = bal; paymentDuringYear[y] = paidThisYear; y++; paidThisYear = 0; }
  }
  if (month % 12 !== 0 && y <= maxYears) { balanceAtYearEnd[y] = bal; paymentDuringYear[y] = paidThisYear; y++; }
  for (; y <= maxYears; y++) { balanceAtYearEnd[y] = 0; paymentDuringYear[y] = 0; }
  return { balanceAtYearEnd, paymentDuringYear, neverPaysOff, payoffMonthIndex };
}

// ---------- Mortgage helpers ----------
function mortgagePayment(principal, aprPct, termYears) {
  const r = aprPct/100/12, n = termYears*12;
  if (r === 0) return principal/n;
  return principal * r*Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
}
function mortgageBalanceAfter(principal, aprPct, termYears, monthsElapsed) {
  const r = aprPct/100/12, n = termYears*12;
  const M = mortgagePayment(principal, aprPct, termYears);
  const k = Math.min(monthsElapsed, n);
  if (k <= 0) return principal;
  if (r === 0) return Math.max(0, principal - M*k);
  const bal = principal*Math.pow(1+r,k) - M*((Math.pow(1+r,k)-1)/r);
  return Math.max(0, bal);
}
function buildMortgageSchedule(inputs, maxYears) {
  const purchaseYearIdx = inputs.purchaseAge - inputs.currentAge;
  const principal = inputs.homePrice * (1 - inputs.downPct);
  const M = mortgagePayment(principal, inputs.mortgageRate, inputs.mortgageTerm);
  const homeValue = new Array(maxYears+1).fill(0);
  const mortgageBalance = new Array(maxYears+1).fill(0);
  const annualPayment = new Array(maxYears+1).fill(0);
  const equity = new Array(maxYears+1).fill(0);
  for (let y = 0; y <= maxYears; y++) {
    if (y < purchaseYearIdx) continue;
    const yearsOwned = y - purchaseYearIdx;
    homeValue[y] = inputs.homePrice * Math.pow(1+inputs.homeAppreciation, yearsOwned);
    const monthsElapsed = Math.min((yearsOwned+1)*12, inputs.mortgageTerm*12);
    mortgageBalance[y] = mortgageBalanceAfter(principal, inputs.mortgageRate, inputs.mortgageTerm, monthsElapsed);
    annualPayment[y] = (yearsOwned*12 < inputs.mortgageTerm*12) ? M*12 : 0;
    equity[y] = homeValue[y] - mortgageBalance[y];
  }
  return { homeValue, mortgageBalance, annualPayment, equity, purchaseYearIdx, downPayment: inputs.homePrice*inputs.downPct };
}

// ---------- Random normal (Box-Muller) ----------
// Seeded RNG so the Monte Carlo confidence score is reproducible for a given set of inputs — a plain page
// refresh (same data, nothing changed) reproduces the exact same score instead of jittering randomly.
// Only actually changing an input reseeds (and thus can change) the result.
function hashStringToSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let mcRandom = Math.random; // reseeded at the start of every runMonteCarlo() batch below
function randNormal(mean, stdev) {
  let u = 1 - mcRandom(), v = mcRandom();
  let z = Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
  // A raw Gaussian draw is technically unbounded, so an extreme tail sample (rare, but not impossible
  // across thousands of simulated years) could otherwise imply losing more than 100% of an account's
  // value in one year — not possible for a real, non-leveraged investment. Floor at -100%.
  return Math.max(-1, mean + z*stdev);
}
function randMarketReturn(mean, stdev, enhanced) {
  // A small high-volatility mixture produces fatter tails than a single Gaussian while preserving
  // the user's selected long-run mean. This better represents occasional crash/boom years.
  const effectiveStdev = enhanced && mcRandom() < 0.12 ? stdev * 2.25 : stdev;
  return randNormal(mean, effectiveStdev);
}

// ---------- Read all inputs ----------
function readInputs() {
  return {
    currentAge: +els('currentAge').value,
    retirementAge: +els('retirementAge').value,
    jobLossAge: dateToAge(jobLossDate, +els('currentAge').value),
    // Raw calendar strings (not just ages) so the Rule of 55 qualification check below can compare actual
    // years rather than fractional ages — Rule of 55 is a calendar-year test (separate from federal service
    // in the year you turn 55, or later), not a birthday-precise one.
    jobLossDateRaw: jobLossDate,
    birthDateRaw: els('birthDate') ? els('birthDate').value : '',
    // Raw retirement date string (not just retirementAge) so the final working year's job income can be
    // pro-rated against the actual calendar date you stop working, rather than assuming a clean 12-month
    // cutoff at the start of the age-year you retire in — see workingFractionOfFinalYear below.
    retirementDateRaw: els('retirementDate') ? els('retirementDate').value : '',
    lifeExpectancy: +els('lifeExpectancy').value,
    birthMonth: +els('birthMonth').value || 1,
    currentIncome: +els('currentIncome').value,
    incomeGrowth: +els('incomeGrowth').value/100,
    tradTSPBalance: +els('tradTSPBalance').value,
    rothTSPBalance: +els('rothTSPBalance').value,
    tradTSPFee: Math.max(0, (+els('tradTSPFee').value || 0)/100),
    rothTSPFee: Math.max(0, (+els('rothTSPFee').value || 0)/100),
    brokerageBalance: brokeragePies.reduce((s,p) => s + (+p.balance || 0), 0),
    brokerageContribution: brokeragePies.reduce((s,p) => s + (+p.contribution || 0), 0) * 12,
    tradPct: +els('tradTSPPct').value/100,
    rothPct: +els('rothTSPPct').value/100,
    matchCapPct: +els('matchPct').value/100,
    excessIncomeSavingsPct: +els('excessIncomeSavingsPct').value/100,
    excessIncomeDestinationPieName: excessIncomeDestinationPieName,
    redirectPaidOffDebtPayments: els('redirectPaidOffDebtPayments') ? els('redirectPaidOffDebtPayments').checked : false,
    insurancePremiumMonthly: insurancePolicies.reduce((s,p) => s + (+p.premium || 0), 0),
    // Survivorship what-if: only policies still checked "continues," using each one's edited override
    // amount if the user set one on the Survivorship page, otherwise its normal premium.
    insurancePremiumMonthlySurvivor: insurancePolicies.filter(p => p.survivorContinues !== false)
      .reduce((s,p) => s + ((p.survivorAmount != null && p.survivorAmount !== '') ? (+p.survivorAmount || 0) : (+p.premium || 0)), 0),
    survivorHousingContinues: els('survivorHousingContinues') ? els('survivorHousingContinues').checked : true,
    brokeragePieBalances: brokeragePies.map(p => +p.balance || 0),
    brokeragePieContributionsMonthly: brokeragePies.map(p => +p.contribution || 0),
    brokeragePieAccountTypes: brokeragePies.map(p => p.accountType || 'taxable'),
    brokeragePieRiskTypes: brokeragePies.map(p => p.riskType || 'equity'),
    brokeragePieCashRates: brokeragePies.map(p => (+p.cashRate || 4.5)/100),
    brokeragePieFees: brokeragePies.map(p => Math.max(0, (+p.fee || 0)/100)),
    // Excluded accounts are dropped here rather than in the engine itself — effectiveWithdrawalOrder
    // (projectRun()) is built directly from this array, so an excluded account is simply never a
    // candidate to draw from, in both the sequential and simultaneous paths, with no further engine
    // changes needed. withdrawalOrderState itself (the full list, used for the on-screen order/UI)
    // stays untouched so an excluded account keeps its position if it's ever re-included.
    withdrawalOrder: withdrawalOrderState.filter(k => !withdrawalExcludedKeys.includes(k)),
    withdrawalSimultaneous: els('withdrawSimultaneous').checked,
    withdrawalProportionMode,
    withdrawalProportions: { ...withdrawalProportions },
    checkingBalance: +els('checkingBalance').value,
    savingsBalance: +els('savingsBalance').value,
    hysaBalance: +els('hysaBalance').value,
    cashRate: +els('cashRate').value/100,
    hysaRate: +els('hysaRate').value/100,
    preReturn: +els('preReturn').value/100,
    postReturn: +els('postReturn').value/100,
    preStdev: +els('preStdev').value/100,
    postStdev: +els('postStdev').value/100,
    enhancedMonteCarlo: els('enhancedMonteCarlo') ? els('enhancedMonteCarlo').checked : false,
    inflation: +els('inflation').value/100,
    medicalInflation: +els('medicalInflation').value/100,
    ssCola: +els('ssCola').value/100,
    ssMonthly: +els('ssMonthly').value,
    ssAge: +els('ssAge').value,
    ssStartDateRaw: els('ssAgeDate') ? els('ssAgeDate').value : '',
    pensionAnnual: +els('pensionAnnual').value,
    pensionGrowth: +els('pensionGrowth').value/100,
    pension2Annual: +els('pension2Annual').value,
    pension2Growth: +els('pension2Growth').value/100,
    pension2Age: +els('pension2Age').value,
    pension2StartDateRaw: els('pension2AgeDate') ? els('pension2AgeDate').value : '',
    survivorshipDeathAge: +els('survivorshipDeathAge').value || 0,
    // survivorshipEnabled is intentionally omitted from the main inputs. It is enabled only by the
    // standalone Survivorship and Explorers scenario runs.
    survivorSpendingPct: +els('survivorSpendingPct').value/100 || 1,
    survivorLifeInsuranceAmount: +els('survivorLifeInsuranceAmount').value || 0,
    sbp1Enabled: els('sbp1Enabled').checked,
    sbp1Pct: +els('sbp1Pct').value/100,
    sbp1Annual: (+els('pensionAnnual').value) * (+els('sbp1Pct').value/100),
    sbp1PremiumMonthly: +els('sbp1PremiumMonthly').value,
    sbp2Enabled: els('sbp2Enabled').checked,
    sbp2Pct: +els('sbp2Pct').value/100,
    sbp2Annual: (+els('pension2Annual').value) * (+els('sbp2Pct').value/100),
    sbp2PremiumMonthly: +els('sbp2PremiumMonthly').value,
    dicEligible: els('dicEligible').checked,
    dicMonthlyAmount: +els('dicMonthlyAmount').value,
    dicAidAttendanceEnabled: els('dicAidAttendanceEnabled') ? els('dicAidAttendanceEnabled').checked : false,
    dicAidAttendanceMonthly: els('dicAidAttendanceMonthly') ? (+els('dicAidAttendanceMonthly').value || 0) : 0,
    survivorQualifyingSpouseTwoYears: els('survivorQualifyingSpouseTwoYears') ? els('survivorQualifyingSpouseTwoYears').checked : false,
    survivorSingleStdDeduction: els('survivorSingleStdDeduction') ? (+els('survivorSingleStdDeduction').value || 16100) : 16100,
    survivorSpousalRollover: els('survivorSpousalRollover') ? els('survivorSpousalRollover').checked : true,
    survivorFedvipMonthly: +els('survivorFedvipMonthly').value || 0,
    survivorMedicalContinues: els('survivorMedicalContinues') ? els('survivorMedicalContinues').checked : true,
    survivorHousingAmountOverride: (els('survivorHousingAmountOverride') && els('survivorHousingAmountOverride').value !== '') ? +els('survivorHousingAmountOverride').value : null,
    vaDisabilityAnnual: +els('vaDisabilityAnnual').value,
    vaDisabilityGrowth: +els('vaDisabilityGrowth').value/100,
    vaDisabilityAge: +els('vaDisabilityAge').value,
    vaDisabilityStartDateRaw: els('vaDisabilityAgeDate') ? els('vaDisabilityAgeDate').value : '',
    pensionAge: +els('pensionAge').value,
    pensionStartDateRaw: els('pensionAgeDate') ? els('pensionAgeDate').value : '',
    annuityMonthly: +els('annuityMonthly').value,
    annuityStartAge: +els('annuityStartAge').value,
    annuityStartDateRaw: els('annuityStartAgeDate') ? els('annuityStartAgeDate').value : '',
    annuityGrowth: +els('annuityGrowth').value/100,
    spouseCurrentAge: +els('spouseAge').value,
    spouseLifeExpectancy: +els('spouseLifeExpectancy').value,
    spouseBirthMonth: +els('spouseBirthMonth').value || 1,
    spouseWorks: els('spouseWorks').checked,
    spouseSSMonthly: els('spouseSSMonthly') ? (+els('spouseSSMonthly').value || 0) : 0,
    spouseSSAge: els('spouseSSAge') ? (+els('spouseSSAge').value || 67) : 67,
    spouseSSStartDateRaw: els('spouseSSAgeDate') ? els('spouseSSAgeDate').value : '',
    spousalPct: +els('spousalPct').value/100,
    spousalStartAge: +els('spousalStartAge').value,
    spousalStartDateRaw: els('spousalStartAgeDate') ? els('spousalStartAgeDate').value : '',
    ltcEnabled: els('ltcEnabled').checked,
    ltcStartAge: +els('ltcStartAge').value,
    ltcDuration: +els('ltcDuration').value,
    ltcAnnualCost: +els('ltcAnnualCost').value,
    ltcCareType: els('ltcCareType') ? els('ltcCareType').value : 'custom',
    ltcVaSpouseAidMonthly: els('ltcCareType') && (els('ltcCareType').value === 'inhome_parttime_va' || els('ltcCareType').value === 'va_spouse_aa_only') ? VA_SPOUSE_AA_MONTHLY_2026 : 0,
    medicareAge: +els('medicareAge').value,
    rmdAge: +els('rmdAge').value || 75,
    tricareMonthly: +els('tricareMonthly').value,
    tricareHearingMonthly: +els('tricareHearingMonthly').value,
    tricareVisionMonthly: +els('tricareVisionMonthly').value,
    tricareDentalMonthly: +els('tricareDentalMonthly').value,
    partBUserMonthly: +els('partBUserMonthly').value,
    partBSpouseMonthly: +els('partBSpouseMonthly').value,
    hearingMonthly: +els('hearingMonthly').value,
    visionMonthly: +els('visionMonthly').value,
    dentalMonthly: +els('dentalMonthly').value,
    rentMonthly: +els('rentMonthly').value,
    rentGrowth: +els('rentGrowth').value/100,
    buyHome: els('buyHome').checked,
    purchaseAge: +els('purchaseAge').value,
    homePrice: +els('homePrice').value,
    downPct: +els('downPct').value/100,
    mortgageRate: +els('mortgageRate').value,
    mortgageTerm: +els('mortgageTerm').value,
    propTaxInsPct: +els('propTaxInsPct').value/100,
    homeAppreciation: +els('homeAppreciation').value/100,
    stdDeduction: +els('stdDeduction').value,
    brokerageTaxablePct: Math.max(0, Math.min(1, (+els('brokerageTaxablePct').value || 0) / 100)),
    idahoRate: +els('idahoRate').value/100,
    idahoMilitaryDeductionEnabled: els('idahoMilitaryDeductionEnabled') ? els('idahoMilitaryDeductionEnabled').checked : false,
    idahoMilitaryDeductionAnnual: els('idahoMilitaryDeductionAnnual') ? Math.max(0, +els('idahoMilitaryDeductionAnnual').value || 0) : 0,
    ssWageBase: +els('ssWageBase').value,
    ruleOf55Applies: els('ruleOf55Applies').checked,
    guardrailsEnabled: els('guardrailsEnabled').checked,
    // A blank field (e.g. from a saved state captured while the field happened to be empty — the
    // guardBand field itself is now hidden, only ever written by the slider, but guardAdj is still a
    // plain visible number input someone could clear) silently coerces to 0 via +'' otherwise, which
    // isn't "no adjustment configured," it's actively wrong: a 0% band or 0% adjustment makes the upper/
    // current/lower guardrail figures collapse to the exact same number, which looks like a bug rather
    // than a deliberately-chosen setting. Falls back to each field's own HTML default (20%/10%) instead.
    guardBand: (els('guardBand').value === '' ? 20 : +els('guardBand').value)/100,
    guardAdj: (els('guardAdj').value === '' ? 10 : +els('guardAdj').value)/100,
    spendingPhasesEnabled: els('spendingPhasesEnabled') ? els('spendingPhasesEnabled').checked : false,
    goGoEndAge: els('goGoEndAge') ? (+els('goGoEndAge').value || 74) : 74,
    slowGoEndAge: els('slowGoEndAge') ? (+els('slowGoEndAge').value || 84) : 84,
    goGoSpendingPct: els('goGoSpendingPct') ? (+els('goGoSpendingPct').value || 0)/100 : 1,
    slowGoSpendingPct: els('slowGoSpendingPct') ? (+els('slowGoSpendingPct').value || 0)/100 : 0.9,
    noGoSpendingPct: els('noGoSpendingPct') ? (+els('noGoSpendingPct').value || 0)/100 : 0.8,
    // Roth Conversion planner (Taxes page): converts Traditional TSP to Roth TSP each year during a
    // configured post-retirement window, paying the resulting tax bill from a separate account (never
    // from the TSP itself, which would shrink the value of the conversion). rothConversionTaxSource is
    // a dynamically-populated select (HYSA or a specific brokerage pie) tracked the same way
    // excessIncomeDestinationPieName is — see rothConversionSourceName below.
    rothConversionEnabled: els('rothConversionEnabled') ? els('rothConversionEnabled').checked : false,
    rothConversionStartAge: els('rothConversionStartAge') ? +els('rothConversionStartAge').value || 55 : 55,
    rothConversionEndAge: els('rothConversionEndAge') ? +els('rothConversionEndAge').value || 75 : 75,
    rothConversionAnnualAmount: els('rothConversionAnnualAmount') ? +els('rothConversionAnnualAmount').value || 0 : 0,
    rothConversionTaxSource: rothConversionSourceName
  };
}

// ---------- Core projection engine (shared by deterministic run, Monte Carlo, and Explorer scenarios) ----------
// Prorates the first calendar year a birthday-triggered income (pension, VA disability, SS, annuity, spousal
// benefit) is received: the "age" loop advances one full year per row, but someone whose birthday falls partway
// through the year (e.g. November) only actually collects that income from their birthday through Dec 31 in the
// year they first become eligible — a fraction of the 12 months this engine would otherwise credit. A January
// birthday (the default) computes to a full 12/12, so this is a no-op for anyone who doesn't set it.
// Only applies to a milestone strictly in the future (eligibilityAge > currentAge) — anything whose eligibility
// age is already at or before today's age (e.g. a pension already being drawn) is treated as already fully
// active for the whole current year, not freshly starting, so it isn't clipped down to a couple months.
