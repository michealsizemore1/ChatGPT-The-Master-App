function prorateFirstYear(age, eligibilityAge, fullAmount, birthMonth, currentAge, startDateRaw = '') {
  if (age < eligibilityAge) return 0;
  if (age === eligibilityAge && eligibilityAge > currentAge) {
    const selectedMonth = +(String(startDateRaw || '').split('-')[1]) || birthMonth || 1;
    return fullAmount * ((13 - selectedMonth) / 12);
  }
  return fullAmount;
}

function setSocialSecurityAge(age) {
  const ageInput = els('ssAge');
  const monthlyInput = els('ssMonthly');
  if (!ageInput || !monthlyInput || age < 62 || age > 70) return;
  // Preserve the same underlying full-retirement-age benefit while moving between
  // claiming ages. This prevents the selected age from changing only the start date
  // while incorrectly leaving the monthly benefit unchanged.
  const currentInputs = readInputs();
  const adjustedMonthly = ssMonthlyAtAge(currentInputs, age);
  monthlyInput.value = Math.round(adjustedMonthly * 100) / 100;
  ageInput.value = age;
  monthlyInput.dispatchEvent(new Event('input', { bubbles:true }));
  ageInput.dispatchEvent(new Event('input', { bubbles:true }));
  ageInput.dispatchEvent(new Event('change', { bubbles:true }));
}
// Job income is either fully counted (every age below retirementAge) or fully zeroed (every age at or
// above it) — accurate for every full year on either side, but the ONE year you actually retire is
// usually only partially worked. E.g. turning 55 in November and retiring at the very end of December is
// about 7 weeks of that age-year still on the job, not the full 12 months the "< retirementAge" branch
// assumes for every other working year, and not the 0 months the post-retirement branch assumes for
// every later year either. Computes what fraction of that one transition year (from the birthday that
// starts the age-retirementAge year, through the actual retirement date) was still spent working, so the
// displayed income for that single row can be pro-rated instead of silently dropping to $0 a few weeks
// early. Purely a display-layer refinement — r.income only feeds charts/reports/the AI summary, never
// the actual withdrawal/contribution math (nothing in projectRun's post-retirement branch reads it) — so
// this can't disturb any real dollar-flow calculation, Monte Carlo result, or account balance.
function workingFractionOfFinalYear(inputs) {
  const [by, bm, bd] = (inputs.birthDateRaw || '').split('-').map(Number);
  const [ry, rm, rd] = (inputs.retirementDateRaw || '').split('-').map(Number);
  if (!by || !bm || !ry || !rm) return 1; // no usable dates on file — fall back to the old "fully worked" assumption
  const ageYearStart = new Date(by + inputs.retirementAge, bm - 1, bd || 1);
  const retireDate = new Date(ry, rm - 1, rd || 1);
  const daysWorked = (retireDate - ageYearStart) / (24*60*60*1000);
  return Math.max(0, Math.min(1, daysWorked / 365.25));
}
// ---------- Brokerage pie helpers: the pool is tracked as one balance per pie, not one lumped sum ----------
function sumPies(arr) { return arr.reduce((s, b) => s + b, 0); }
function isRothIraPie(inputs, i) {
  return !!(inputs.brokeragePieAccountTypes && inputs.brokeragePieAccountTypes[i] === 'roth_ira');
}
function isTaxableCashPie(inputs, i) {
  return !isRothIraPie(inputs, i) && !!(inputs.brokeragePieRiskTypes && inputs.brokeragePieRiskTypes[i] === 'cash');
}
function taxableCashInterestForYear(inputs, pieBalances, hysaBalance, savingsBalance, checkingBalance) {
  const pieInterest = pieBalances.reduce((s, b, i) => {
    if (!isTaxableCashPie(inputs, i)) return s;
    const grossRate = inputs.brokeragePieCashRates ? inputs.brokeragePieCashRates[i] : 0.045;
    const rate = netReturnAfterFee(grossRate, inputs.brokeragePieFees ? inputs.brokeragePieFees[i] : 0);
    return s + Math.max(0, b) * Math.max(0, rate || 0);
  }, 0);
  // HYSA/checking/savings interest is also ordinary taxable interest. Their current rates may be zero,
  // but keeping them here prevents future balances or rate changes from silently escaping the tax model.
  return pieInterest
    + Math.max(0, hysaBalance) * Math.max(0, inputs.hysaRate || 0)
    + Math.max(0, savingsBalance) * Math.max(0, inputs.cashRate || 0)
    + Math.max(0, checkingBalance) * Math.max(0, inputs.cashRate || 0);
}
// Applies a pooled inflow/outflow across all pies proportionally to their current balance (a positive delta
// deposits, a negative delta withdraws). Withdrawals "water-fill" over a few rounds so a pie that runs dry
// hands its unmet share to the others, and every pie is floored at 0. Returns an array (same length/order as
// pieBalances) of how much each individual pie's balance actually changed — positive for a deposit, negative
// for a withdrawal — so callers that need to know (e.g. attributing a Long-Term Care or Future Expense pull
// to the Income Gap & Withdrawals per-account breakdown) can do so; most callers just ignore the return value.
function applyPooledDelta(pieBalances, delta) {
  const before = pieBalances.slice();
  if (!pieBalances.length || Math.abs(delta) < 1e-9) return pieBalances.map(() => 0);
  if (delta > 0) {
    const total = sumPies(pieBalances);
    if (total <= 0) { pieBalances[0] += delta; }
    else { for (let i = 0; i < pieBalances.length; i++) pieBalances[i] += delta * (pieBalances[i] / total); }
  } else {
    let remaining = -delta;
    for (let round = 0; round < pieBalances.length && remaining > 0.01; round++) {
      const activeIdx = pieBalances.map((b, i) => i).filter(i => pieBalances[i] > 0.01);
      if (!activeIdx.length) break;
      const total = activeIdx.reduce((s, i) => s + pieBalances[i], 0);
      if (total <= 0) break;
      const target = remaining;
      activeIdx.forEach(i => {
        const take = Math.min(target * (pieBalances[i] / total), pieBalances[i]);
        pieBalances[i] -= take;
        remaining -= take;
      });
    }
    for (let i = 0; i < pieBalances.length; i++) if (pieBalances[i] < 0) pieBalances[i] = 0;
  }
  return pieBalances.map((b, i) => b - before[i]);
}

// ---------- RMD (Required Minimum Distribution) ----------
// IRS Uniform Lifetime Table (effective 2022+, Pub 590-B) — divides a Traditional-account balance by the
// factor for your current age to get the minimum amount that must come out that year. Only applies to
// Traditional TSP; Roth TSP is exempt. Floors at the age-120 factor for any age beyond the published table.
const RMD_UNIFORM_LIFETIME_TABLE = {
  72:27.4, 73:26.5, 74:25.5, 75:24.6, 76:23.7, 77:22.9, 78:22.0, 79:21.1, 80:20.2,
  81:19.4, 82:18.5, 83:17.7, 84:16.8, 85:16.0, 86:15.2, 87:14.4, 88:13.7, 89:12.9, 90:12.2,
  91:11.5, 92:10.8, 93:10.1, 94:9.5, 95:8.9, 96:8.4, 97:7.8, 98:7.3, 99:6.8, 100:6.4,
  101:6.0, 102:5.6, 103:5.2, 104:4.9, 105:4.6, 106:4.3, 107:4.1, 108:3.9, 109:3.7, 110:3.5,
  111:3.4, 112:3.3, 113:3.1, 114:3.0, 115:2.9, 116:2.8, 117:2.7, 118:2.5, 119:2.3, 120:2.0
};
function rmdDivisor(age) {
  const a = Math.min(120, Math.max(72, Math.round(age)));
  return RMD_UNIFORM_LIFETIME_TABLE[a] || 2.0;
}

// ---------- IRMAA (Income-Related Monthly Adjustment Amount) ----------
// CMS-published 2026 Part B surcharge tiers for Married Filing Jointly (confirmed via the November 2025
// CMS announcement) — the MAGI thresholds and surcharge dollar amounts here are current as of this
// update, but should still be checked against current IRS/CMS guidance as RMD/IRMAA-relevant ages
// actually approach, since these are republished annually. Returns the today's-$ monthly surcharge for a
// given (already inflation-adjusted-for-comparison) MAGI; the caller applies medicalInflator on top, same
// as the Part B premium fields it's added to.
const IRMAA_BRACKETS_MFJ_BASE = [
  { magi: 218000, surcharge: 81.20 },
  { magi: 274000, surcharge: 202.90 },
  { magi: 342000, surcharge: 324.60 },
  { magi: 410000, surcharge: 446.30 },
  { magi: 750000, surcharge: 487.00 }
];
const IRMAA_BRACKETS_SINGLE_BASE = [
  { magi: 109000, surcharge: 81.20 },
  { magi: 137000, surcharge: 202.90 },
  { magi: 171000, surcharge: 324.60 },
  { magi: 205000, surcharge: 446.30 },
  { magi: 500000, surcharge: 487.00 }
];
function irmaaMonthlySurcharge(magiNominal, thresholdInflator, filingStatus = 'mfj') {
  const brackets = filingStatus === 'single' ? IRMAA_BRACKETS_SINGLE_BASE : IRMAA_BRACKETS_MFJ_BASE;
  let surcharge = 0;
  for (const tier of brackets) {
    if (magiNominal > tier.magi * thresholdInflator) surcharge = tier.surcharge;
  }
  return surcharge;
}

function projectRun(inputs, ctx, randomize, shocks) {
  shocks = shocks || {};
  let balTrad = inputs.tradTSPBalance, balRoth = inputs.rothTSPBalance;
  let balBrokeragePies = inputs.brokeragePieBalances.slice();
  let balChecking = inputs.checkingBalance, balSavings = inputs.savingsBalance, balHYSA = inputs.hysaBalance;
  let income = inputs.currentIncome;
  let depletionAge = null, firstShortfallAge = null, firstShortfallReason = null, shortfallEver = false;
  let investableAtRetirement = null, cashAtRetirement = null;
  let initialWithdrawalRate = null;
  // Roth Conversion planner lifetime totals — accumulated across every year the conversion runs,
  // returned at the end alongside the other summary figures (see the return statement below).
  let totalRothConverted = 0, totalRothConversionTax = 0;
  // IRMAA lookback proxy: last iteration's approximate MAGI, used as this year's IRMAA basis (see the
  // comment above medicarePremiumBase below) — starts at 0 since there's no prior year before the plan begins.
  const magiHistory = [];
  const magiFilingStatusHistory = [];
  const rows = [];

  for (let age = inputs.currentAge; age <= ctx.effectiveLifeExpectancy; age++) {
    const y = age - inputs.currentAge;
    // Allocation Explorer scenarios can supply a life-stage model. Only those comparison runs use
    // the changing mean/volatility; the real plan continues to use its normal pre/post assumptions.
    const allocationPointThisYear = inputs.allocationExplorerStrategy
      ? allocationPointForAge(inputs.allocationExplorerStrategy, age, inputs.retirementAge)
      : null;
    // Income and spending are projected in nominal dollars, so annually indexed federal figures must
    // rise as well. Social Security provisional-income thresholds remain fixed by statute separately.
    const spouseAgeThisYear = age - ctx.ageGap;
    const survivorshipActive = !!(inputs.survivorshipEnabled && inputs.survivorshipDeathAge && age >= inputs.survivorshipDeathAge);
    const yearsAfterPrimaryDeath = survivorshipActive ? age - inputs.survivorshipDeathAge : 0;
    // The year of death remains eligible for a joint return. The optional qualifying-surviving-spouse
    // window is available only when the user confirms the dependent-child requirement is met.
    const survivorJointReturnYear = survivorshipActive && (
      yearsAfterPrimaryDeath === 0 ||
      (inputs.survivorQualifyingSpouseTwoYears && yearsAfterPrimaryDeath <= 2)
    );
    const taxFilingStatusThisYear = survivorshipActive && !survivorJointReturnYear ? 'single' : 'mfj';
    const taxThresholdInflator = Math.pow(1 + inputs.inflation, y);
    const federalBracketsThisYear = inflationIndexedBrackets(
      taxFilingStatusThisYear === 'single' ? FEDERAL_BRACKETS_SINGLE : FEDERAL_BRACKETS_MFJ,
      taxThresholdInflator
    );
    const ltcgBracketsThisYear = inflationIndexedBrackets(
      taxFilingStatusThisYear === 'single' ? LTCG_BRACKETS_SINGLE : LTCG_BRACKETS_MFJ,
      taxThresholdInflator
    );
    const standardDeductionThisYear = (
      taxFilingStatusThisYear === 'single' ? inputs.survivorSingleStdDeduction : inputs.stdDeduction
    ) * taxThresholdInflator;
    const markShortfall = (reason) => {
      shortfallEver = true;
      if (firstShortfallAge === null) { firstShortfallAge = age; firstShortfallReason = reason; }
    };
    const startInvestable = balTrad + balRoth + sumPies(balBrokeragePies);
    // Savings page (per-account year-by-year chart): snapshot every tracked account's balance right
    // here, before ANYTHING this year touches it (contributions, growth, mortgage/LTC/Future Expense
    // draws, RMD, Roth conversion, or the main spending withdrawal all happen after this line) — the
    // true start-of-year balance each account's own begin→contrib→return→withdrawal→end waterfall is
    // built from, at the row push near the bottom of this loop.
    const acctBegin = { trad: balTrad, roth: balRoth, hysa: balHYSA };
    balBrokeragePies.forEach((b, i) => { acctBegin['pie_'+i] = b; });
    // Job Loss test toggle (header): only actually changes anything once BOTH the header basis is set to
    // 'jobloss' AND this year is at/after the specific age the job loss is assumed to happen (inputs.jobLossAge,
    // set from the date field under the toggle) — years before that still run on the normal Like to Spend
    // baseline, same as if the toggle weren't on at all.
    const jobLossActive = spendingBasis === 'jobloss' && inputs.jobLossAge != null && age >= inputs.jobLossAge;
    // Job Loss test: if this involuntary separation happens before the calendar year you turn 55
    // (ctx.jobLossQualifiesForRuleOf55 — see buildContext), Traditional TSP isn't just penalized before
    // 59.5, it's genuinely unavailable as a withdrawal source at all until then — a real TSP/401(k) rule,
    // independent of the blanket "Rule of 55 applies" toggle (Taxes page), which only reflects the
    // baseline plan's assumption of separating at 55+. Every place below that could otherwise pull from
    // Traditional TSP during a Job Loss year checks this first.
    // Job loss before the calendar year of turning 55 disqualifies Rule of 55, meaning BOTH
    // Traditional TSP is off-limits until 59.5 when job loss disqualifies Rule of 55 — no
    // penalty-free separation withdrawal is available, so any Trad draw before 59.5 would trigger
    // the 10% early-withdrawal penalty. Roth TSP *contributions* are always penalty-free (only
    // earnings face the penalty before 59.5), so Roth stays in the withdrawal order as a bridge
    // source for the ages-55-to-59.5 gap. Brokerage pies and HYSA remain accessible throughout.
    const tradAvailableForJobLoss = !(jobLossActive && !ctx.jobLossQualifiesForRuleOf55 && age < 59.5);
    const rothAvailableByAge = age >= 59.5;
    // Personal strategy: after a pre-55 separation, remove both TSP accounts from the withdrawal
    // waterfall until age 59.5. Cash and brokerage accounts provide the bridge instead.
    const effectiveWithdrawalOrder = inputs.withdrawalOrder.filter(k =>
      (k !== 'trad' || tradAvailableForJobLoss) && (k !== 'roth' || rothAvailableByAge));

    // Hoisted up here (rather than declared down near the rest of this year's stats, below) so the
    // mortgage down payment / Long-Term Care / Future Expenses pulls just below — which can all happen
    // in ANY year, not just retirement years — can also record which specific account(s) they actually
    // came out of. Previously only the main retirement withdrawal waterfall (further down) populated
    // these, so a LTC bill or a planned future expense that dipped into Traditional TSP, Roth TSP, HYSA,
    // or a brokerage pie would silently vanish from the Income Gap & Withdrawals / Income-by-Year
    // per-account breakdowns and from the lifetime gross-withdrawal total, even though the account
    // balance itself was correctly reduced. Checking/savings pulls still aren't tracked here, matching
    // how the main waterfall itself only ever draws from trad/roth/hysa/pies, never checking/savings.
    let grossWithdrawal = 0;
    const withdrawalByAccount = {};
    // Savings page: mirrors withdrawalByAccount but for money moving IN — Trad/Roth/match payroll
    // contributions, per-pie contributions, the excess-income sweep, and (post-retirement) a Roth
    // conversion's inflow to Roth. Reset fresh every year, same as withdrawalByAccount.
    const contribByAccount = {};
    const addPooledWithdrawal = (deltas) => {
      let total = 0;
      deltas.forEach((delta, i) => {
        if (delta >= 0) return;
        const amt = -delta;
        withdrawalByAccount['pie_'+i] = (withdrawalByAccount['pie_'+i] || 0) + amt;
        total += amt;
      });
      grossWithdrawal += total;
    };
    const addDirectWithdrawal = (key, amt) => {
      if (!(amt > 0)) return;
      withdrawalByAccount[key] = (withdrawalByAccount[key] || 0) + amt;
      grossWithdrawal += amt;
    };
    // Shared sequential waterfall for "special" draws (Long-Term Care, Future/planned expenses) that can
    // happen in ANY year, pre- or post-retirement — strictly one account at a time, in the exact order
    // configured on the Money Flows page (inputs.withdrawalOrder — Trad TSP, then each brokerage pie
    // individually, then HYSA, then Roth, by default), fully draining each before moving to the next.
    // Previously LTC and Future Expenses each had their own hardcoded fallback order (LTC: Roth first,
    // tax-free; Future Expenses: HYSA/savings/checking first) that ignored the user's configured order and
    // could raid a brokerage pie reserved for a specific purpose (e.g. "Sequence of Returns Risk" T-bills)
    // well before Traditional TSP was touched.
    // When supplied, amountNeeded is treated as a NET dollar figure (mirroring takeFrom() below) and the
    // actual balance drawn from a taxable account is grossed up so the account still nets the full amount
    // needed after tax, with the tax split into federalTaxAnnual/stateTaxAnnual the same way takeFrom()
    // does. Only usable post-retirement, since that's the only point in the loop where ordinaryIncomeStack
    // exists — pre-retirement calls (and the mortgage down payment draw, which runs before that for the
    // year) omit this argument and keep pulling plain, ungrossed-up dollar amounts, same as before.
    // taxCtx (optional 3rd arg) is { earlyPenalty, stackBox: { v: <running ordinary-taxable-income
    // total for this year, boxed in an object so this closure — declared outside the post-retirement
    // block where that running total actually lives — can read/update it across the call> } }. Gross-up
    // is bracket-blended (solveGrossForNet/taxOwedOnIncrement) rather than one flat rate applied to the
    // whole amount — see those functions for why that matters.
    const withdrawInOrder = (amountNeeded, order, taxCtx) => {
      let remain = amountNeeded;
      for (const key of order) {
        if (remain <= 0.01) break;
        if (key === 'trad') {
          if (taxCtx) {
            const flatAdd = inputs.idahoRate + taxCtx.earlyPenalty;
            const desiredGross = solveGrossForNet(taxCtx.stackBox.v, remain, federalBracketsThisYear, flatAdd);
            const take = Math.min(desiredGross, Math.max(0, balTrad));
            const taxAmt = taxOwedOnIncrement(taxCtx.stackBox.v, take, federalBracketsThisYear, flatAdd);
            const netTake = Math.min(remain, take - taxAmt);
            balTrad -= take; remain -= netTake; addDirectWithdrawal('trad', take);
            taxCtx.stackBox.v += take;
            const stateTaxAmt = inputs.idahoRate * take;
            stateTaxAnnual += stateTaxAmt; federalTaxAnnual += taxAmt - stateTaxAmt;
          } else {
            const take = Math.min(remain, balTrad);
            balTrad -= take; remain -= take; addDirectWithdrawal('trad', take);
          }
        }
        else if (key === 'roth') { const take = Math.min(remain, balRoth); balRoth -= take; remain -= take; addDirectWithdrawal('roth', take); }
        else if (key === 'hysa') { const take = Math.min(remain, balHYSA); balHYSA -= take; remain -= take; addDirectWithdrawal('hysa', take); }
        else if (key === 'savings') { const take = Math.min(remain, balSavings); balSavings -= take; remain -= take; addDirectWithdrawal('savings', take); }
        else if (key === 'checking') { const take = Math.min(remain, balChecking); balChecking -= take; remain -= take; addDirectWithdrawal('checking', take); }
        else if (key.startsWith('pie_')) {
          const idx = +key.slice(4);
          if (balBrokeragePies[idx] !== undefined) {
            const alreadyAfterTax = isRothIraPie(inputs, idx) || isTaxableCashPie(inputs, idx);
            if (taxCtx && !alreadyAfterTax) {
              const desiredGross = solveGrossForNetTaxablePortion(taxCtx.stackBox.v, remain, ltcgBracketsThisYear, inputs.idahoRate, inputs.brokerageTaxablePct);
              const take = Math.min(desiredGross, Math.max(0, balBrokeragePies[idx]));
              const taxAmt = taxOwedOnTaxablePortion(taxCtx.stackBox.v, take, ltcgBracketsThisYear, inputs.idahoRate, inputs.brokerageTaxablePct);
              const netTake = Math.min(remain, take - taxAmt);
              balBrokeragePies[idx] -= take; remain -= netTake; addDirectWithdrawal(key, take);
              const stateTaxAmt = inputs.idahoRate * take * inputs.brokerageTaxablePct;
              stateTaxAnnual += stateTaxAmt; federalTaxAnnual += taxAmt - stateTaxAmt;
              // LTCG-taxed pie draws don't add to the ordinary-income stack (a different income type for
              // bracket purposes) — matches takeFrom() below.
            } else {
              const take = Math.min(remain, balBrokeragePies[idx]);
              balBrokeragePies[idx] -= take; remain -= take; addDirectWithdrawal(key, take);
            }
          }
        }
      }
      return remain; // whatever's left unmet, if the whole order runs dry
    };

    // Mortgage down payment: checking/savings/HYSA are already after-tax cash, so no gross-up applies to
    // those (correct as-is). The brokerage-pie fallback below still pulls a plain dollar amount rather than
    // grossing up for LTCG tax the way Future Expenses now does above — this runs earlier in the year's
    // iteration than guaranteedIncome/taxableBeforeWithdrawal/this year's marginal rates are computed, so
    // there isn't yet a tax rate available to gross up against without a larger reordering of the loop.
    // Currently inactive for this plan (buyHome is off), so left as the pre-existing simplified behavior.
    if (ctx.mortgageSchedule && y === ctx.mortgageSchedule.purchaseYearIdx) {
      let remaining = ctx.mortgageSchedule.downPayment;
      const t1 = Math.min(remaining, balChecking); balChecking -= t1; remaining -= t1;
      const t2 = Math.min(remaining, balSavings); balSavings -= t2; remaining -= t2;
      const t3 = Math.min(remaining, balHYSA); balHYSA -= t3; remaining -= t3;
      addDirectWithdrawal('hysa', t3);
      if (remaining > 0) {
        if (remaining - sumPies(balBrokeragePies) > 0.01) markShortfall('homePurchase');
        addPooledWithdrawal(applyPooledDelta(balBrokeragePies, -remaining));
      }
    }

    // Long-term care for spouse: Roth TSP is the preferred first source. If Roth cannot cover the bill,
    // essential care falls back to every other accessible household resource: brokerage pies, eligible
    // Traditional TSP, HYSA, savings, and checking. A simulation fails only when the complete household
    // waterfall is exhausted, rather than merely because one preferred account ran short.
    // The cost itself is computed here every year, pre- or post-retirement (it's stored on the row below
    // regardless), but the actual draw only happens right here for pre-retirement years, since there's no
    // "totalSpending"/"guaranteedIncomeAfterTax" concept yet before retirementAge. Post-retirement years
    // instead first offset this cost against that year's guaranteed-income surplus (if any) inside the
    // post-retirement branch, right after `need` is computed further down, and only then fall back to Roth.
    let ltcCostThisYear = 0;
    let ltcVaAidIncomeThisYear = 0;
    const ltcActiveThisYear = inputs.ltcEnabled && spouseAgeThisYear >= inputs.ltcStartAge && spouseAgeThisYear < inputs.ltcStartAge + inputs.ltcDuration;
    if (ltcActiveThisYear) {
      const medicalInflatorNow = Math.pow(1+inputs.medicalInflation, y);
      ltcCostThisYear = inputs.ltcAnnualCost * medicalInflatorNow;
      // The dependent-spouse A&A amount is an add-on to the living veteran's tax-free VA compensation,
      // not a discount applied to the care bill. It grows with the plan's VA increase assumption.
      ltcVaAidIncomeThisYear = (inputs.ltcVaSpouseAidMonthly || 0) * 12 * Math.pow(1+inputs.vaDisabilityGrowth, y);
      if (age < inputs.retirementAge) {
        const fromRoth = Math.min(ltcCostThisYear, balRoth); balRoth -= fromRoth; addDirectWithdrawal('roth', fromRoth);
        const ltcFallbackOrder = [
          ...balBrokeragePies.map((_, i) => 'pie_'+i),
          ...(tradAvailableForJobLoss ? ['trad'] : []),
          'hysa', 'savings', 'checking'
        ];
        const ltcUnfunded = withdrawInOrder(ltcCostThisYear - fromRoth, ltcFallbackOrder);
        if (ltcUnfunded > 0.01) markShortfall('longTermCare');
      }
    }

    // Future / one-time planned expenses: hit at a specific age (or a recurring range), drawn in your
    // configured withdrawal order (Money Flows page) — Traditional TSP first by default, same as everyday
    // spending and Long-Term Care above — instead of the old cash-first fallback (HYSA/savings/checking),
    // which used to raid the emergency HYSA reserve for a planned vehicle purchase or vacation before ever
    // touching Traditional TSP.
    // Survivorship what-if: only items still checked "continues" on the Survivorship page's checklist count,
    // at each item's edited override amount if one was set — same per-item pattern as expenses/debts/insurance.
    // Explorers "What If I..." cards (e.g. "an unexpected $50k expense in 5 years") inject a synthetic entry
    // via ctx.futureExpensesOverride instead of touching the real futureExpenses list, so trying a scenario
    // never risks mutating what's actually entered on the Housing/Money Flows page.
    // The cost itself is computed here every year, pre- or post-retirement (it's stored on the row below
    // regardless), but the actual draw via withdrawInOrder only happens right here for pre-retirement years,
    // same reasoning as LTC above. Post-retirement years instead first offset this cost against that year's
    // guaranteed-income surplus (if any) inside the post-retirement branch, right after `need` is computed
    // further down, and only pull the remainder (if any) via withdrawInOrder there.
    let futureExpenseCostThisYear = 0;
    (ctx.futureExpensesOverride || futureExpenses).forEach(f => {
      const hits = f.recurring ? (age >= f.age && age <= (f.endAge || f.age)) : (age === f.age);
      if (!hits) return;
      if (survivorshipActive && f.survivorContinues === false) return;
      const amt = (survivorshipActive && f.survivorAmount != null && f.survivorAmount !== '') ? (+f.survivorAmount || 0) : (+f.amount || 0);
      futureExpenseCostThisYear += amt * Math.pow(1+inputs.inflation, y);
    });
    if (futureExpenseCostThisYear > 0 && age < inputs.retirementAge) {
      const feRemaining = withdrawInOrder(futureExpenseCostThisYear, effectiveWithdrawalOrder);
      if (feRemaining > 0.01) markShortfall('futureExpense');
    }

    // Windfalls: one-time inflows at a specific age, deposited into the chosen account.
    windfalls.forEach(w => {
      if (age === w.age) {
        if (w.destination === 'Cash') balHYSA += (+w.amount || 0);
        else applyPooledDelta(balBrokeragePies, +w.amount || 0);
      }
    });

    // Survivorship what-if: the life insurance lump sum (e.g. VGLI, entered on the Survivorship page)
    // pays out the year this scenario starts, landing in the brokerage pies as another resource that
    // helps fund the surviving spouse's expenses — same one-time-inflow treatment as a windfall above.
    // Gated on survivorshipEnabled, which the main plan/Monte Carlo run never sets, so this never affects
    // the baseline plan.
    if (inputs.survivorshipEnabled && inputs.survivorshipDeathAge && age === inputs.survivorshipDeathAge) {
      applyPooledDelta(balBrokeragePies, +inputs.survivorLifeInsuranceAmount || 0);
    }

    // Survivorship what-if: use the filtered debt schedules (only debts marked as continuing after you're
    // gone) once survivorship is active, instead of the full household debt list.
    const debtSchedulesForYear = survivorshipActive ? ctx.debtSchedulesSurvivor : ctx.debtSchedules;
    const debtBalanceThisYear = debtSchedulesForYear.reduce((s,d) => s + (d.balanceAtYearEnd[y] ?? 0), 0);
    const debtPaymentThisYear = debtSchedulesForYear.reduce((s,d) => s + (d.paymentDuringYear[y] ?? 0), 0);
    const vehicleAssetsThisYear = debts.reduce((sum, debt) => {
      if (debt.category !== 'Auto Loan' || !(+debt.assetValue > 0)) return sum;
      const startAge = debt.startAge != null && debt.startAge !== '' ? +debt.startAge : inputs.currentAge;
      if (age < startAge) return sum;
      const yearsOwned = Math.max(0, age - startAge);
      return sum + (+debt.assetValue || 0) * Math.pow(1 - Math.min(1, Math.max(0, (+debt.assetDepreciation || 0) / 100)), yearsOwned);
    }, 0);
    const homeValueThisYear = ctx.mortgageSchedule ? ctx.mortgageSchedule.homeValue[y] : 0;
    const homeEquityThisYear = ctx.mortgageSchedule ? ctx.mortgageSchedule.equity[y] : 0;
    const mortgagePmtThisYear = ctx.mortgageSchedule ? ctx.mortgageSchedule.annualPayment[y] : 0;
    const inflator = Math.pow(1+inputs.inflation, y);
    const medicalInflator = Math.pow(1+inputs.medicalInflation, y);
    const ssInflator = Math.pow(1+inputs.ssCola, y);
    const pensionInflator = Math.pow(1+inputs.pensionGrowth, y);
    const pension2Inflator = Math.pow(1+inputs.pension2Growth, y);
    const vaInflator = Math.pow(1+inputs.vaDisabilityGrowth, y);
    const annuityInflator = Math.pow(1+inputs.annuityGrowth, y);
    let housingCost;
    if (ctx.mortgageSchedule && y >= ctx.mortgageSchedule.purchaseYearIdx) {
      housingCost = mortgagePmtThisYear + homeValueThisYear*inputs.propTaxInsPct;
    } else {
      housingCost = inputs.rentMonthly*12*Math.pow(1+inputs.rentGrowth, y);
    }
    // Survivorship what-if: housing can be marked as not continuing (e.g. the house is sold), zeroing the
    // cost, or given a flat override amount (e.g. downsizing to a smaller place) instead of the actual
    // projected rent/mortgage figure.
    if (survivorshipActive) {
      if (inputs.survivorHousingContinues === false) housingCost = 0;
      else if (inputs.survivorHousingAmountOverride != null) housingCost = inputs.survivorHousingAmountOverride * 12 * inflator;
    }
    // Insurance policy premiums (from the Insurance page) grow with General Inflation and apply in every year,
    // not just retirement. In the survivorship what-if, only policies marked as continuing are counted.
    const insurancePremiumMonthlyForYear = survivorshipActive ? inputs.insurancePremiumMonthlySurvivor : inputs.insurancePremiumMonthly;
    const insurancePremiumAnnual = (insurancePremiumMonthlyForYear || 0) * 12 * inflator;

    // grossWithdrawal and withdrawalByAccount are declared earlier in this loop iteration (right after
    // jobLossActive, above the mortgage/LTC/Future Expenses pulls) so those pre-retirement-capable draws
    // can also feed into them — not redeclared here, just continuing to accumulate onto the same objects.
    let contributions=0, withdrawal=0, guaranteedIncome=0, guaranteedIncomeAfterTax=0, spending=0, spousalBenefit=0, ssAmount=0, pensionAmount=0, pension2Amount=0, vaDisabilityAmount=0, annuityAmount=0, sbpAmount=0, dicAmount=0, dicAidAttendanceAmount=0, essentialFloor=0, transitionJobIncome=0, transitionTradContrib=0;
    let fedMarginal=null, ltcgMarginal=null;
    // Hoisted so the row-push below (shared by both branches) can expose the already-computed IRMAA
    // surcharge for display/charting purposes — irmaaSurchargeMonthly itself stays a local const right
    // where it's used (Medicare premium calc, post-retirement only) so this doesn't touch that existing
    // math at all, just mirrors the value out for the row.
    let irmaaSurchargeMonthlyForRow = 0;
    let tradContribOut=0, rothContribOut=0, matchContribOut=0;
    let medicalCostAnnual=0, expensesCategoriesAnnual=0, excessIncomeSaved=0, recurringLivingCostThisYear=0, taxableInterestIncome=0, investmentFeesAnnual=0, spendingPhaseMultiplier=1;
    // Taxes page ("Estimated Taxes" chart) — Federal income tax + Idaho state tax (split back out of the
    // blended withdrawal rate below) plus FICA payroll tax (Social Security + Medicare, working years only).
    let federalTaxAnnual=0, stateTaxAnnual=0, ficaTaxAnnual=0;
    let rothConversionAmount=0, rothConversionTax=0;

    // Guaranteed income streams each start on their own eligibility age (Pension/VA Disability/SS/etc.
    // pages), independent of the "retirement age" used for the contribution-vs-withdrawal split below.
    // A military pension and VA disability, in particular, routinely start well before someone actually
    // stops working a second career — hoisted up here (computed every year, not just once age reaches
    // retirementAge) so they show up on the Income chart and get put to use as soon as they're eligible,
    // instead of being silently held at $0 until retirementAge is reached.
    // Each stream is prorated for the single calendar year it first kicks in (see prorateFirstYear above),
    // using whichever spouse's birthday actually governs that milestone — the spousal SS benefit follows the
    // spouse's own birth month, everything else follows the primary's.
    ssAmount = prorateFirstYear(age, inputs.ssAge, inputs.ssMonthly*12*ssInflator, inputs.birthMonth, inputs.currentAge, inputs.ssStartDateRaw);
    spousalBenefit = inputs.spouseWorks
      ? prorateFirstYear(age, ctx.effectiveSpouseOwnSSStartAge, inputs.spouseSSMonthly*12*ssInflator, inputs.spouseBirthMonth, inputs.currentAge, inputs.spouseSSStartDateRaw)
      : prorateFirstYear(age, ctx.effectiveSpousalStartAge, spousalMonthlyBenefit(inputs)*12*ssInflator, inputs.spouseBirthMonth, inputs.currentAge, inputs.spousalStartDateRaw);
    // Real-world Social Security survivor rule: once you're past your own life expectancy, your spouse steps up
    // from the ~50% spousal benefit to your full benefit as a 100% survivor benefit. ssAmount itself doesn't
    // need to change to reflect that (it already computes your full benefit — the dollars just keep flowing,
    // now to your spouse as the survivor instead of to you), but the spousal supplement goes away since the
    // survivor benefit replaces it rather than stacking on top of it. The separate survivorship scenario
    // additionally stops primary-only income and applies configured SBP/DIC and survivor expenses.
    // Death timing is intentionally modeled only when a separate survivorship scenario enables it.
    const primaryDeceased = survivorshipActive;
    pensionAmount = prorateFirstYear(age, inputs.pensionAge, inputs.pensionAnnual*pensionInflator, inputs.birthMonth, inputs.currentAge, inputs.pensionStartDateRaw);
    pension2Amount = prorateFirstYear(age, inputs.pension2Age, inputs.pension2Annual*pension2Inflator, inputs.birthMonth, inputs.currentAge, inputs.pension2StartDateRaw);
    vaDisabilityAmount = prorateFirstYear(age, inputs.vaDisabilityAge, inputs.vaDisabilityAnnual*vaInflator, inputs.birthMonth, inputs.currentAge, inputs.vaDisabilityStartDateRaw);
    annuityAmount = prorateFirstYear(age, inputs.annuityStartAge, inputs.annuityMonthly*12*annuityInflator, inputs.birthMonth, inputs.currentAge, inputs.annuityStartDateRaw);
    if (survivorshipActive) {
      // Pension(s) and VA disability stopped with the primary member's death; the ~50% spousal SS rate is
      // replaced by the full 100% survivor benefit (already what ssAmount computes, so it's left as-is and
      // spousalBenefit is zeroed instead of double-counting both).
      // The survivor receives the larger of the two Social Security records, not both benefits.
      ssAmount = Math.max(ssAmount, spousalBenefit);
      pensionAmount = 0; pension2Amount = 0; vaDisabilityAmount = 0; ltcVaAidIncomeThisYear = 0; spousalBenefit = 0;
      sbpAmount = (inputs.sbp1Enabled ? inputs.sbp1Annual*pensionInflator : 0) + (inputs.sbp2Enabled ? inputs.sbp2Annual*pension2Inflator : 0);
      dicAmount = inputs.dicEligible ? inputs.dicMonthlyAmount*12*ssInflator : 0;
      // Survivor DIC A&A replaces the living-veteran dependent-spouse add-on and is available only
      // while the spouse's modeled LTC need is active. Both amounts are tax-free, but never overlap.
      dicAidAttendanceAmount = (inputs.dicEligible && inputs.dicAidAttendanceEnabled && ltcActiveThisYear)
        ? inputs.dicAidAttendanceMonthly*12*ssInflator
        : 0;
    }
    guaranteedIncome = ssAmount + spousalBenefit + pensionAmount + pension2Amount + vaDisabilityAmount + ltcVaAidIncomeThisYear + annuityAmount + sbpAmount + dicAmount + dicAidAttendanceAmount;
    const idahoMilitaryPensionDeduction = inputs.idahoMilitaryDeductionEnabled
      ? Math.min(Math.max(0, pensionAmount), Math.max(0, inputs.idahoMilitaryDeductionAnnual || 0) * inflator)
      : 0;

    // Start/end-dated expenses: which recurring expense rows actually count this year, filtered by age
    // against each row's optional startAge/endAge (see expenseActiveAtAge/computeExpenseTotals above) —
    // recomputed every year of the loop (both branches below read from it) so a row with a Starts/Ends
    // date actually turns on or off at the right point in the projection instead of counting for every
    // year of the plan the way it did before this feature existed.
    const expTotalsThisYear = ctx.expensesForYear(age);

    if (age < inputs.retirementAge) {
      const preMean = allocationPointThisYear ? allocationPointThisYear.expectedReturn : inputs.preReturn;
      const preVolatility = allocationPointThisYear ? allocationPointThisYear.volatility : inputs.preStdev;
      const preR = (shocks.pre && shocks.pre[y] !== undefined) ? shocks.pre[y]
        : (randomize ? randMarketReturn(preMean, preVolatility, inputs.enhancedMonteCarlo) : preMean);
      if (y > 0) income *= (1+inputs.incomeGrowth);
      // Job Loss test: once active, the paycheck is gone for good — zeroing it here (rather than just
      // skipping this year's raise) means every dollar figure derived from income below (FICA, TSP/match
      // contributions, taxable wages) correctly falls to zero too, and it stays zero in every later year
      // since income only ever grows off its own prior value.
      // In a survivorship run Michael's salary and payroll contributions stop at death,
      // even when the assumed death occurs before the planned retirement age.
      const employmentEnded = jobLossActive || survivorshipActive;
      if (employmentEnded) income = 0;
      // FICA payroll tax on job income (working years only — pension/SS/withdrawals aren't FICA-taxable).
      // Social Security's 6.2% share is capped at the wage base (grown here with General Inflation as a
      // stand-in for real wage-base growth, since it isn't itself an input); Medicare's 1.45% has no cap,
      // plus the additional 0.9% Medicare surtax above $250k (MFJ) — a fixed statutory threshold that
      // doesn't get inflated, unlike the wage base.
      const ssWageBaseThisYear = inputs.ssWageBase * Math.pow(1+inputs.inflation, y);
      const ssTaxThisYear = Math.min(income, ssWageBaseThisYear) * 0.062;
      const medicareTaxThisYear = income * 0.0145 + Math.max(0, income - 250000) * 0.009;
      ficaTaxAnnual = ssTaxThisYear + medicareTaxThisYear;
      const tradContrib = income*inputs.tradPct;
      const rothContrib = income*inputs.rothPct;
      const matchContrib = income*Math.min(inputs.tradPct+inputs.rothPct, inputs.matchCapPct);
      // Federal + Idaho income tax on working-years income, for the Taxes page's Estimated Taxes chart —
      // wages minus the pre-tax Traditional TSP contribution (Roth isn't pre-tax, so it stays in the taxable
      // base), plus any guaranteed income already flowing before retirementAge (a military pension or VA
      // disability routinely starts mid-career), same provisional-income SS treatment as the post-retirement
      // calc below. Purely informational for the chart — doesn't feed back into contributions or spending,
      // matching how FICA above is handled, so it can't disturb the rest of the projection.
      // T-bill/cash-account interest is taxable as ordinary income in the year earned. It remains
      // invested in the account, but the associated income tax reduces this year's spendable cash.
      taxableInterestIncome = taxableCashInterestForYear(inputs, balBrokeragePies, balHYSA, balSavings, balChecking);
      const otherTaxableWorkingYears = (income - tradContrib) + pensionAmount + pension2Amount + annuityAmount + taxableInterestIncome;
      const taxableSSWorkingYears = taxableSocialSecurity(ssAmount+spousalBenefit, otherTaxableWorkingYears, taxFilingStatusThisYear);
      const taxableWorkingYears = Math.max(0, otherTaxableWorkingYears + taxableSSWorkingYears - standardDeductionThisYear);
      federalTaxAnnual += taxOwedFromBrackets(taxableWorkingYears, federalBracketsThisYear);
      // Idaho excludes Social Security, including the portion taxable on the federal return.
      const idahoTaxableWorkingYears = Math.max(0, otherTaxableWorkingYears - idahoMilitaryPensionDeduction - standardDeductionThisYear);
      stateTaxAnnual += idahoTaxOwed(idahoTaxableWorkingYears, inputs.idahoRate, inflator, taxFilingStatusThisYear);
      fedMarginal = marginalRateFromBrackets(taxableWorkingYears, federalBracketsThisYear);
      // Brokerage pie contributions come from the same paycheck as the TSP %-based ones, so they grow with the
      // same raise assumption — and stop along with it once Job Loss is active, same reasoning as income above.
      const pieContribsMonthly = employmentEnded ? (inputs.brokeragePieContributionsMonthly || []).map(() => 0) : (inputs.brokeragePieContributionsMonthly || []);
      const brokerageContribThisYear = pieContribsMonthly.reduce((s,c) => s + (+c||0), 0) * 12 * Math.pow(1+inputs.incomeGrowth, y);
      // Excess income savings: whatever's left of your paycheck (plus any guaranteed income already
      // flowing in, e.g. a military pension or VA disability that started before you actually retired)
      // after contributions and recurring living costs, times the chosen %, gets swept into Brokerage
      // on top of the fixed contributions above. Guaranteed income doesn't get a TSP-style elective
      // contribution % applied to it — that only applies to actual paycheck income — so it's added
      // here rather than into tradContrib/rothContrib/matchContrib above.
      // Job Loss test: recurring living costs switch to the Job Loss expense column once active — same
      // basis the post-retirement branch below uses, just gated by age here too instead of unconditionally.
      // Survivorship what-if: if the assumed predecease age falls before retirementAge, switch to the
      // survivor-only expense columns here too — mirrors the post-retirement branch's expensesNonMedicalForYear/
      // expensesMedicalForYear logic (housingCost/debtPaymentThisYear/insurancePremiumAnnual above are already
      // survivorship-aware regardless of pre/post retirement since they're computed once, hoisted above this split).
      const preRetireNonMedical = survivorshipActive
        ? (jobLossActive ? expTotalsThisYear.jobLossNonMedicalSurvivor : expTotalsThisYear.nonMedicalSurvivor)
        : (jobLossActive ? expTotalsThisYear.jobLossNonMedical : expTotalsThisYear.nonMedical);
      const preRetireMedical = survivorshipActive
        ? (jobLossActive ? expTotalsThisYear.jobLossMedicalSurvivor : expTotalsThisYear.medicalSurvivor)
        : (jobLossActive ? expTotalsThisYear.jobLossMedical : expTotalsThisYear.medical);
      // Hoisted to the per-year let-block above (rather than declared with const, right here, the way
      // this line originally read) so it survives past this if-block and can be pushed onto the row
      // below — the "Income vs Expenses" page's combined chart needs a real total-expenses figure for
      // pre-retirement years too, not just post-retirement ones (where `spending` already serves that
      // role). Every other pre-retirement local this depends on (preRetireNonMedical/Medical, housingCost,
      // debtPaymentThisYear, insurancePremiumAnnual) is unchanged — this is purely a scope change, not a
      // formula change.
      recurringLivingCostThisYear = (preRetireNonMedical * inflator + preRetireMedical * medicalInflator) + housingCost + debtPaymentThisYear + insurancePremiumAnnual;
      // Working-year federal/state/FICA tax (federalTaxAnnual/stateTaxAnnual/ficaTaxAnnual, all already
      // computed above for this year) now comes out before what's left counts as "excess" — previously
      // this used gross pay, silently assuming the whole paycheck was available to contribute/spend/save
      // with no tax bite taken out of it first, which overstated how much slack there actually was to
      // sweep into Brokerage below.
      const excessIncomeAvailable = Math.max(0, income + guaranteedIncome - tradContrib - rothContrib - brokerageContribThisYear - recurringLivingCostThisYear - federalTaxAnnual - stateTaxAnnual - ficaTaxAnnual);
      // Paid-off debt redirect: recurringLivingCostThisYear above already reflects a lower debtPaymentThisYear
      // once a debt (e.g. a car loan) is fully paid off, which is what makes excessIncomeAvailable bigger —
      // but by default that freed amount just blends into the general slack and only gets swept at whatever
      // % Excess Income Savings is set to (or not at all, if that's 0%), so it can silently look like it just
      // evaporates instead of visibly going somewhere. With this toggle on, the exact former payment of any
      // debt that's paid off by this year (100% of it, not just the % above) gets carved out and swept into
      // the same destination pie unconditionally, on top of the %-based sweep on whatever's left — same
      // 1:1 index correspondence between ctx.debtSchedules and the debts array used everywhere else that
      // reads a debt's schedule. Excluded: debts that never pay off, and any that started already at $0
      // balance (nothing to free). Capped at excessIncomeAvailable so this can never claim more than the
      // year's actual slack contains.
      const paidOffDebtRedirectRaw = (inputs.redirectPaidOffDebtPayments && !employmentEnded) ? debts.reduce((sum, d, i) => {
        const sched = ctx.debtSchedules[i];
        if (!sched || sched.neverPaysOff || (+d.balance || 0) <= 0) return sum;
        if ((sched.balanceAtYearEnd[y] ?? 0) > 0.01) return sum;
        // Prorate the transition year: a debt that pays off mid-year still made some real payments
        // that year (sched.paymentDuringYear[y]), so only the amount actually freed up (the nominal
        // annual payment minus what was actually still paid) counts as newly "freed" this year — every
        // full year after payoff, paymentDuringYear[y] is 0, so the whole payment counts as freed.
        return sum + Math.max(0, (+d.payment || 0) * 12 - (sched.paymentDuringYear[y] || 0));
      }, 0) : 0;
      const paidOffDebtRedirect = Math.min(paidOffDebtRedirectRaw, excessIncomeAvailable);
      // Job Loss test: any surplus left over (guaranteed income exceeds job-loss spending) gets swept
      // into HYSA rather than a brokerage pie — you're no longer making paycheck-style contributions,
      // but the pension/VA cash still needs somewhere to land. Pre-retirement surplus goes to HYSA;
      // post-retirement this is irrelevant (jobLossActive = false at and after retirementAge).
      const jobLossSurplusToHYSA = employmentEnded ? excessIncomeAvailable : 0;
      excessIncomeSaved = employmentEnded ? 0 : (Math.max(0, excessIncomeAvailable - paidOffDebtRedirect) * (inputs.excessIncomeSavingsPct || 0) + paidOffDebtRedirect);
      // Job Loss test: pre-retirement years never had a withdrawal mechanism before this feature, because a
      // shortfall wasn't possible — your paycheck was always assumed to at least cover living costs, so any
      // gap just silently zeroed out excessIncomeSaved above instead of drawing anything down. With income
      // gone, that assumption breaks, so cover a real gap the same cash-first, then-brokerage, then-Roth,
      // then-Traditional order used everywhere else in this engine for an unplanned shortfall (LTC, future
      // expenses) — rather than pretending the bills simply don't get paid.
      if (employmentEnded) {
        const preRetireNeed = Math.max(0, recurringLivingCostThisYear + federalTaxAnnual + stateTaxAnnual + ficaTaxAnnual - (income + guaranteedIncome));
        if (preRetireNeed > 0.01) {
          let preRemaining = preRetireNeed;
          const j1 = Math.min(preRemaining, balHYSA); balHYSA -= j1; preRemaining -= j1;
          addDirectWithdrawal('hysa', j1);
          const j2 = Math.min(preRemaining, balSavings); balSavings -= j2; preRemaining -= j2;
          const j3 = Math.min(preRemaining, balChecking); balChecking -= j3; preRemaining -= j3;
          if (preRemaining > 0) {
            const preBrokerageAvailable = sumPies(balBrokeragePies);
            const fromPreBrokerage = Math.min(preRemaining, preBrokerageAvailable);
            addPooledWithdrawal(applyPooledDelta(balBrokeragePies, -fromPreBrokerage)); preRemaining -= fromPreBrokerage;
            if (preRemaining > 0) {
              // Personal strategy: do not withdraw from either TSP account before 59.5 after
              // a pre-55 separation, even though Roth contribution access can differ legally.
              const fromPreRoth = rothAvailableByAge ? Math.min(preRemaining, balRoth) : 0; balRoth -= fromPreRoth; preRemaining -= fromPreRoth;
              addDirectWithdrawal('roth', fromPreRoth);
              if (preRemaining > 0 && tradAvailableForJobLoss) {
                const fromPreTrad = Math.min(preRemaining, balTrad); balTrad -= fromPreTrad; preRemaining -= fromPreTrad;
                addDirectWithdrawal('trad', fromPreTrad);
              }
            }
            if (preRemaining > 0.01) markShortfall('preRetirementGap');
          }
        }
      }
      tradContribOut = tradContrib; rothContribOut = rothContrib; matchContribOut = matchContrib;
      contributions = tradContrib+rothContrib+matchContrib+brokerageContribThisYear+excessIncomeSaved;
      contribByAccount.trad = (contribByAccount.trad||0) + tradContrib + matchContrib;
      contribByAccount.roth = (contribByAccount.roth||0) + rothContrib;
      investmentFeesAnnual += Math.max(0, balTrad) * inputs.tradTSPFee + Math.max(0, balRoth) * inputs.rothTSPFee;
      balTrad = balTrad*(1+netReturnAfterFee(preR, inputs.tradTSPFee)) + tradContrib + matchContrib;
      balRoth = balRoth*(1+netReturnAfterFee(preR, inputs.rothTSPFee)) + rothContrib;
      // Each pie grows independently and receives its own monthly contribution (annualized + grown with income).
      // Cash-like pies (e.g. a T-bills/SGOV bridge) grow at their own fixed rate instead of the market return —
      // they're meant to be de-risked ballast, not exposed to the same volatility as equity holdings.
      for (let i = 0; i < balBrokeragePies.length; i++) {
        const pieContribThisYear = (+pieContribsMonthly[i] || 0) * 12 * Math.pow(1+inputs.incomeGrowth, y);
        const pieRate = (inputs.brokeragePieRiskTypes && inputs.brokeragePieRiskTypes[i] === 'cash')
          ? (inputs.brokeragePieCashRates ? inputs.brokeragePieCashRates[i] : 0.045) : preR;
        const pieFee = inputs.brokeragePieFees ? inputs.brokeragePieFees[i] : 0;
        investmentFeesAnnual += Math.max(0, balBrokeragePies[i]) * Math.max(0, pieFee || 0);
        balBrokeragePies[i] = balBrokeragePies[i]*(1+netReturnAfterFee(pieRate, pieFee)) + pieContribThisYear;
        contribByAccount['pie_'+i] = (contribByAccount['pie_'+i]||0) + pieContribThisYear;
      }
      // Excess income goes entirely into the single chosen pie (e.g. a cash-like SGOV pie), not spread across all pies.
      const excessDestIdx = brokeragePies.findIndex(p => p.name === inputs.excessIncomeDestinationPieName);
      let excessIncomeFallbackToHYSA = 0;
      if (excessDestIdx >= 0 && excessDestIdx < balBrokeragePies.length) {
        balBrokeragePies[excessDestIdx] += excessIncomeSaved;
        contribByAccount['pie_'+excessDestIdx] = (contribByAccount['pie_'+excessDestIdx]||0) + excessIncomeSaved;
      }
      else if (balBrokeragePies.length) applyPooledDelta(balBrokeragePies, excessIncomeSaved);
      else {
        excessIncomeFallbackToHYSA = excessIncomeSaved;
        contribByAccount.hysa = (contribByAccount.hysa || 0) + excessIncomeSaved;
      }
      balChecking *= (1+inputs.cashRate); balSavings *= (1+inputs.cashRate); balHYSA = balHYSA*(1+inputs.hysaRate) + jobLossSurplusToHYSA + excessIncomeFallbackToHYSA;
      // IRMAA lookback proxy: this year's approximate MAGI (taxable wages after the pre-tax Traditional TSP
      // contribution, plus the taxable share of any guaranteed income already flowing), carried forward as
      // next year's IRMAA basis — see the post-retirement branch below for why a 1-year lookback is used
      // instead of computing IRMAA off the same year's own income.
      magiHistory[y] = Math.max(0, otherTaxableWorkingYears + taxableSocialSecurity(ssAmount+spousalBenefit, otherTaxableWorkingYears, taxFilingStatusThisYear));
      magiFilingStatusHistory[y] = taxFilingStatusThisYear;
    } else {
      // The age-year in which retirement occurs can contain a partial final working period.
      // Include that salary, payroll contributions, agency match, brokerage saving, and FICA in
      // the actual cash-flow calculation—not merely in the chart's display value.
      if (age === inputs.retirementAge && !survivorshipActive) {
        const workFraction = workingFractionOfFinalYear(inputs);
        transitionJobIncome = income * (y > 0 ? (1 + inputs.incomeGrowth) : 1) * workFraction;
        transitionTradContrib = transitionJobIncome * inputs.tradPct;
        const transitionRothContrib = transitionJobIncome * inputs.rothPct;
        const transitionMatchContrib = transitionJobIncome * Math.min(inputs.tradPct + inputs.rothPct, inputs.matchCapPct);
        const transitionPieContribs = (inputs.brokeragePieContributionsMonthly || []).map(c =>
          (+c || 0) * 12 * Math.pow(1 + inputs.incomeGrowth, y) * workFraction
        );
        balTrad += transitionTradContrib + transitionMatchContrib;
        balRoth += transitionRothContrib;
        transitionPieContribs.forEach((amount, i) => {
          if (balBrokeragePies[i] != null) balBrokeragePies[i] += amount;
          if (amount > 0) contribByAccount['pie_'+i] = (contribByAccount['pie_'+i] || 0) + amount;
        });
        tradContribOut = transitionTradContrib;
        rothContribOut = transitionRothContrib;
        matchContribOut = transitionMatchContrib;
        contributions = transitionTradContrib + transitionRothContrib + transitionMatchContrib + transitionPieContribs.reduce((s,v) => s+v, 0);
        contribByAccount.trad = (contribByAccount.trad || 0) + transitionTradContrib + transitionMatchContrib;
        contribByAccount.roth = (contribByAccount.roth || 0) + transitionRothContrib;
        const ssWageBaseThisYear = inputs.ssWageBase * Math.pow(1 + inputs.inflation, y);
        ficaTaxAnnual = Math.min(transitionJobIncome, ssWageBaseThisYear) * 0.062 +
          transitionJobIncome * 0.0145 + Math.max(0, transitionJobIncome - 250000) * 0.009;
        guaranteedIncome += transitionJobIncome;
      }
      if (investableAtRetirement === null) {
        investableAtRetirement = startInvestable;
        cashAtRetirement = balChecking + balSavings + balHYSA;
      }
      const yearsSinceRetirement = age - inputs.retirementAge;
      const postMean = allocationPointThisYear ? allocationPointThisYear.expectedReturn : inputs.postReturn;
      const postVolatility = allocationPointThisYear ? allocationPointThisYear.volatility : inputs.postStdev;
      const postR = (shocks.post && shocks.post[yearsSinceRetirement] !== undefined) ? shocks.post[yearsSinceRetirement]
        : (randomize ? randMarketReturn(postMean, postVolatility, inputs.enhancedMonteCarlo) : postMean);
      const spendMult = inputs.spendingMultiplier == null ? 1 : inputs.spendingMultiplier;
      const explorerDiscretionaryMult = inputs.discretionarySpendingMultiplier == null ? 1 : inputs.discretionarySpendingMultiplier;
      // Survivorship what-if (Explorers page only, gated on inputs.survivorshipEnabled which the main plan never sets):
      // once past the assumed age the primary member predeceases the spouse, pension(s)/VA disability/spousal SS stop
      // and SBP/DIC (if configured) take over instead. (survivorshipActive itself is computed further up, before
      // this branch, so the debt/housing/insurance totals above it can respect it too.)
      // Healthcare coverage: Tricare covers whichever of you hasn't yet reached Medicare age; each of you separately
      // picks up a Part B premium once you individually reach Medicare age (no Part D for either of you). Tricare
      // itself stops costing anything once someone reaches Medicare age — Tricare For Life continues as coverage
      // behind the scenes, but it has no separate premium beyond Part B, so there's nothing left to count once
      // both of you are on Medicare (or, in the survivorship what-if, once your spouse individually is).
      // Survivorship what-if: once you've predeceased your spouse, your own Part B premium stops outright, and
      // her Tricare premium stops the moment she reaches Medicare age herself (same no-added-cost rule as above).
      // Your FEDVIP plan (hearing/vision/dental) was your enrollment covering both of you, so it doesn't just
      // disappear — she needs her own once she reaches Medicare age herself, using whatever's entered on the
      // Survivorship page for that cost.
      const userOnMedicare = age >= inputs.medicareAge;
      const spouseOnMedicare = spouseAgeThisYear >= inputs.medicareAge;
      const onTricare = survivorshipActive ? !spouseOnMedicare : (!userOnMedicare || !spouseOnMedicare);
      // Survivorship what-if: her whole Tricare/Part B/FEDVIP picture can be turned off entirely via the
      // "Her Tricare/Part B/FEDVIP continues" checkbox on the Survivorship page (an escape hatch for an
      // edge case like being fully covered another way) — checked by default, so this normally has no effect.
      const medicalContinuesForSurvivor = !survivorshipActive || inputs.survivorMedicalContinues !== false;
      // IRMAA (Income-Related Monthly Adjustment Amount): a Medicare Part B surcharge above certain household
      // MAGI thresholds. Real IRMAA uses a 2-year-old MAGI figure, so the modeled MAGI history uses the
      // same two-year lag. Before two modeled years exist, no surcharge is assumed because the planner
      // does not have the earlier tax returns. Thresholds and surcharges use the published 2026 CMS figures;
      // verify against current IRS/CMS guidance as
      // RMD/IRMAA-relevant ages actually approach. Thresholds grow with General Inflation (same simplification
      // used for the Social Security wage base elsewhere); the surcharge itself is left in today's $ and rides
      // along with medicalInflator below, same as the Part B premium fields it's added to. Applied per spouse
      // who is actually on Medicare that year, since IRMAA is assessed per Medicare enrollee off the shared
      // household MAGI.
      const irmaaThresholdInflator = Math.pow(1+inputs.inflation, y);
      const irmaaLookbackMagi = y >= 2 ? (magiHistory[y - 2] || 0) : 0;
      const irmaaLookbackFilingStatus = y >= 2 ? (magiFilingStatusHistory[y - 2] || 'mfj') : taxFilingStatusThisYear;
      const irmaaSurchargeMonthly = irmaaMonthlySurcharge(irmaaLookbackMagi, irmaaThresholdInflator, irmaaLookbackFilingStatus);
      irmaaSurchargeMonthlyForRow = irmaaSurchargeMonthly;
      const medicarePremiumBase = !medicalContinuesForSurvivor ? 0 : (
        (onTricare ? inputs.tricareMonthly + inputs.tricareHearingMonthly + inputs.tricareVisionMonthly + inputs.tricareDentalMonthly : 0) +
        (survivorshipActive ? 0 : (userOnMedicare ? inputs.partBUserMonthly + irmaaSurchargeMonthly : 0)) +
        (spouseOnMedicare ? inputs.partBSpouseMonthly + irmaaSurchargeMonthly : 0) +
        (survivorshipActive
          ? (spouseOnMedicare ? inputs.survivorFedvipMonthly : 0)
          : (userOnMedicare ? (inputs.hearingMonthly + inputs.visionMonthly + inputs.dentalMonthly) : 0))
      ) * 12;
      medicalCostAnnual = medicarePremiumBase * medicalInflator;
      // Survivorship what-if: use only the expenses marked as continuing (toggled on the Survivorship page),
      // at each item's edited override amount if one was set, instead of the full household expense list.
      // spendingBasis ('liketo' default, 'mustspend', or the test 'jobloss' basis, all via the header
      // toggle) picks which Expenses-page column this year's baseline spending starts from, BEFORE any
      // guardrail cut runs. The Must Spend *floor* two lines below is intentionally left alone either
      // way — it's always the true essential-only total regardless of which basis is currently selected.
      // Job Loss spending only applies during the pre-retirement unemployment window (ages 53-54 in this plan).
      // In retirement, spending always uses Like to Spend amounts — only the TSP access restriction persists.
      // Job Loss spending only applies pre-retirement (unemployment period). Once retired, spending
      // reverts to Like to Spend — the reduced job-loss column only models the involuntary gap before
      // age 55, not a permanent retirement lifestyle cut. TSP access restrictions (tradAvailableForJobLoss)
      // still apply through 59.5 regardless, since that's a legal Rule of 55 constraint, not a spending choice.
      // Current plan choice overrides the older explanatory notes above: Job Loss spending continues
      // after retirement until age 59.5, then the plan returns to Like to Spend.
      const jobLossBridgeSpendingActive = jobLossActive && age < 59.5;
      const expensesNonMedicalForYear = survivorshipActive
        ? (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendNonMedicalSurvivor : jobLossBridgeSpendingActive ? expTotalsThisYear.jobLossNonMedicalSurvivor : expTotalsThisYear.nonMedicalSurvivor)
        : (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendNonMedical : jobLossBridgeSpendingActive ? expTotalsThisYear.jobLossNonMedical : expTotalsThisYear.nonMedical);
      const expensesMedicalForYear = survivorshipActive
        ? (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendMedicalSurvivor : jobLossBridgeSpendingActive ? expTotalsThisYear.jobLossMedicalSurvivor : expTotalsThisYear.medicalSurvivor)
        : (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendMedical : jobLossBridgeSpendingActive ? expTotalsThisYear.jobLossMedical : expTotalsThisYear.medical);
      // Must Spend floor for this year's recurring expenses only (housing/debt/insurance/Tricare-Medicare
      // premiums/SBP premiums don't have a discretionary counterpart modeled, so they're treated as 100%
      // essential below rather than needing their own Must Spend split).
      const mustSpendNonMedicalForYear = survivorshipActive ? expTotalsThisYear.mustSpendNonMedicalSurvivor : expTotalsThisYear.mustSpendNonMedical;
      const mustSpendMedicalForYear = survivorshipActive ? expTotalsThisYear.mustSpendMedicalSurvivor : expTotalsThisYear.mustSpendMedical;
      const mustSpendCategoriesAnnual = mustSpendNonMedicalForYear * inflator + mustSpendMedicalForYear * medicalInflator;
      if (inputs.spendingPhasesEnabled) {
        spendingPhaseMultiplier = age <= inputs.goGoEndAge
          ? inputs.goGoSpendingPct
          : age <= inputs.slowGoEndAge ? inputs.slowGoSpendingPct : inputs.noGoSpendingPct;
      }
      const selectedCategoriesAnnual = expensesNonMedicalForYear * inflator + expensesMedicalForYear * medicalInflator;
      const discretionaryCategoriesAnnual = Math.max(0, selectedCategoriesAnnual - mustSpendCategoriesAnnual);
      expensesCategoriesAnnual = mustSpendCategoriesAnnual +
        discretionaryCategoriesAnnual * spendMult * explorerDiscretionaryMult * spendingPhaseMultiplier;
      const expensesInflated = expensesCategoriesAnnual + medicalCostAnnual;
      // SBP premiums are modeled as ordinary Insurance rows while the covered person is alive. They are
      // not added again here, which would double-count the user's Military SBP policy.
      const sbpPremiumAnnual = 0;
      let totalSpending = expensesInflated + housingCost + debtPaymentThisYear + insurancePremiumAnnual + sbpPremiumAnnual;
      // Everything except the discretionary slice of recurring expenses is treated as 100% essential —
      // housing, debt payments, insurance premiums, SBP premiums, and Tricare/Medicare/FEDVIP premiums
      // (medicalCostAnnual, already folded into expensesInflated above) don't have a Must Spend split.
      essentialFloor = mustSpendCategoriesAnnual + medicalCostAnnual + housingCost + debtPaymentThisYear + insurancePremiumAnnual + sbpPremiumAnnual;
      // Do not apply survivorSpendingPct again here: the detailed survivor continue/override fields
      // already build the surviving spouse's expenses item by item. Multiplying the result again would
      // reduce the same costs twice. The percentage remains visible as a planning reference only.

      // ssAmount/spousalBenefit/pensionAmount/pension2Amount/vaDisabilityAmount/annuityAmount/sbpAmount/
      // dicAmount/guaranteedIncome are all computed once, above, before the retirement-age branch split —
      // each stream starts on its own eligibility age regardless of retirementAge.

      // Real federal marginal brackets (2026 MFJ) + Idaho's flat state rate.
      // SS/spousal benefit taxed via the real IRS provisional-income method (taxableSocialSecurity above),
      // not a flat 85% assumption; VA disability and DIC excluded (tax-free); pensions/annuity/SBP fully taxable.
      taxableInterestIncome = taxableCashInterestForYear(inputs, balBrokeragePies, balHYSA, balSavings, balChecking);
      const otherTaxableGuaranteed = pensionAmount + pension2Amount + annuityAmount + sbpAmount + taxableInterestIncome + Math.max(0, transitionJobIncome - transitionTradContrib);
      const taxableGuaranteed = otherTaxableGuaranteed + taxableSocialSecurity(ssAmount+spousalBenefit, otherTaxableGuaranteed, taxFilingStatusThisYear);
      const taxableBeforeWithdrawal = Math.max(0, taxableGuaranteed - standardDeductionThisYear);
      // Guaranteed income doesn't arrive tax-free — actual federal + Idaho tax owed on it (progressive, using the
      // standard deduction) is deducted before comparing it against spending, instead of treating it at face value.
      const fedTaxOnGuaranteed = taxOwedFromBrackets(taxableBeforeWithdrawal, federalBracketsThisYear);
      // Idaho starts from federal income but subtracts taxable Social Security.
      const idahoTaxableGuaranteed = Math.max(0, otherTaxableGuaranteed - idahoMilitaryPensionDeduction - standardDeductionThisYear);
      const idahoTaxOnGuaranteed = idahoTaxOwed(idahoTaxableGuaranteed, inputs.idahoRate, inflator, taxFilingStatusThisYear);
      guaranteedIncomeAfterTax = Math.max(0, guaranteedIncome - fedTaxOnGuaranteed - idahoTaxOnGuaranteed - ficaTaxAnnual);
      // Seed this year's Federal/State totals with the guaranteed-income tax computed above; takeFrom()
      // (withdrawal loop, further down) adds each account's share on top as it runs.
      federalTaxAnnual += fedTaxOnGuaranteed;
      stateTaxAnnual += idahoTaxOnGuaranteed;

      const need0 = Math.max(0, totalSpending - guaranteedIncomeAfterTax);
      if (initialWithdrawalRate === null && startInvestable > 0) initialWithdrawalRate = need0/startInvestable;

      if (inputs.guardrailsEnabled && initialWithdrawalRate !== null && startInvestable > 0) {
        const currentRate = need0/startInvestable;
        if (currentRate < initialWithdrawalRate*(1-inputs.guardBand)) totalSpending *= (1+inputs.guardAdj);
        // Downward cut only: never trims spending below the Must Spend essential floor, no matter how
        // large a cut the guardrail % would otherwise call for.
        else if (currentRate > initialWithdrawalRate*(1+inputs.guardBand)) totalSpending = Math.max(essentialFloor, totalSpending*(1-inputs.guardAdj));
      }
      spending = totalSpending;
      const need = Math.max(0, totalSpending - guaranteedIncomeAfterTax);

      // Marginal rates for this year's withdrawal-driven tax (moved up from just below the LTC/Future
      // Expenses block, so LTC/Future Expenses draws — right below — can use the same rates to gross up
      // and record tax the same way takeFrom() does further down). Traditional TSP withdrawals before 59.5
      // avoid the 10% early-withdrawal penalty under the Rule of 55 (separating from federal service in the
      // year you turn 55+); if that assumption is turned off, the penalty applies to any Traditional TSP
      // withdrawal taken before 59.5. Marginal bracket for the withdrawal itself stacks on top of the same
      // guaranteed-income taxable base above.
      const earlyPenalty = (!inputs.ruleOf55Applies && age < 59.5) ? 0.10 : 0;
      fedMarginal = marginalRateFromBrackets(taxableBeforeWithdrawal + need, federalBracketsThisYear);
      ltcgMarginal = marginalRateFromBrackets(taxableBeforeWithdrawal + need, ltcgBracketsThisYear);
      // fedMarginal/ltcgMarginal above are kept purely for display (the "22% federal bracket" style
      // labels on the Taxes page) — actual withdrawal tax below is no longer a flat rate derived from
      // these; it's computed bracket-by-bracket per withdrawal via solveGrossForNet/taxOwedOnIncrement,
      // using the running ordinaryIncomeStack so multiple withdrawals in the same year (LTC/Future
      // Expenses, RMD, a Roth conversion, and the main spending gap) each see accurate brackets instead
      // of every one of them independently assuming it's the only draw competing for the lower brackets.
      let ordinaryIncomeStack = taxableBeforeWithdrawal;

      // Long-Term Care and Future Expenses (both computed unconditionally, earlier in this loop iteration,
      // before this retirement-age branch split) get first claim on this year's guaranteed-income surplus —
      // whatever's left of guaranteedIncomeAfterTax after totalSpending is covered — before either one
      // touches an investment account, matching the same "guaranteed income first" principle everyday
      // spending already follows via `need` just above. LTC claims the shared surplus pool first (essential
      // care cost), Future Expenses gets whatever's left after that (more discretionary/planned); any amount
      // beyond the surplus falls back to each draw's normal account order (LTC: Roth first, then all other
      // accessible household resources; Future Expenses: withdrawInOrder, same as
      // the pre-retirement branch above). Pre-retirement years never reach this code — they already drew
      // immediately, with no surplus check, back at LTC's/Future Expenses' original position earlier in the
      // loop, since totalSpending/guaranteedIncomeAfterTax have no pre-retirement equivalent.
      // Future Expenses' account draw here (beyond what the guaranteed-income surplus covers) is grossed up
      // for tax the same way the main spending waterfall's takeFrom() below is — a Trad TSP or brokerage-pie
      // pull to cover, say, a $12,000 vehicle purchase actually needs to remove more than $12,000 from the
      // account so the taxable event it triggers doesn't quietly shrink the $12,000 itself, and the resulting
      // tax bill is now recorded into federalTaxAnnual/stateTaxAnnual like any other withdrawal. The Roth
      // portion of LTC is tax-free; taxable fallback accounts are grossed up and taxed normally.
      let guaranteedIncomeSurplus = Math.max(0, guaranteedIncomeAfterTax - totalSpending);
      if (ltcCostThisYear > 0) {
        const ltcFromSurplus = Math.min(ltcCostThisYear, guaranteedIncomeSurplus);
        guaranteedIncomeSurplus -= ltcFromSurplus;
        const ltcRemainingAfterSurplus = ltcCostThisYear - ltcFromSurplus;
        const fromRoth = Math.min(ltcRemainingAfterSurplus, balRoth); balRoth -= fromRoth; addDirectWithdrawal('roth', fromRoth);
        const ltcFallbackOrder = [
          ...balBrokeragePies.map((_, i) => 'pie_'+i),
          ...(effectiveWithdrawalOrder.includes('trad') ? ['trad'] : []),
          'hysa', 'savings', 'checking'
        ];
        const ltcTaxCtx = { earlyPenalty, stackBox: { v: ordinaryIncomeStack } };
        const ltcUnfunded = withdrawInOrder(ltcRemainingAfterSurplus - fromRoth, ltcFallbackOrder, ltcTaxCtx);
        ordinaryIncomeStack = ltcTaxCtx.stackBox.v;
        if (ltcUnfunded > 0.01) markShortfall('longTermCare');
      }
      if (futureExpenseCostThisYear > 0) {
        const feFromSurplus = Math.min(futureExpenseCostThisYear, guaranteedIncomeSurplus);
        guaranteedIncomeSurplus -= feFromSurplus;
        const feRemainingAfterSurplus = futureExpenseCostThisYear - feFromSurplus;
        const feTaxCtx = { earlyPenalty, stackBox: { v: ordinaryIncomeStack } };
        const feRemaining = withdrawInOrder(feRemainingAfterSurplus, effectiveWithdrawalOrder, feTaxCtx);
        ordinaryIncomeStack = feTaxCtx.stackBox.v;
        if (feRemaining > 0.01) markShortfall('futureExpense');
      }

      // Same cash-vs-equity split applies post-retirement: a cash-like pie keeps growing at its own fixed
      // rate instead of getting swept up in the same market volatility as the rest of the portfolio.
      let brokPiesGrown = balBrokeragePies.map((b, i) => {
        const pieRate = (inputs.brokeragePieRiskTypes && inputs.brokeragePieRiskTypes[i] === 'cash')
          ? (inputs.brokeragePieCashRates ? inputs.brokeragePieCashRates[i] : 0.045) : postR;
        const pieFee = inputs.brokeragePieFees ? inputs.brokeragePieFees[i] : 0;
        investmentFeesAnnual += Math.max(0, b) * Math.max(0, pieFee || 0);
        return b*(1+netReturnAfterFee(pieRate, pieFee));
      });
      investmentFeesAnnual += Math.max(0, balTrad) * inputs.tradTSPFee + Math.max(0, balRoth) * inputs.rothTSPFee;
      let tradGrown = balTrad*(1+netReturnAfterFee(postR, inputs.tradTSPFee)),
          rothGrown = balRoth*(1+netReturnAfterFee(postR, inputs.rothTSPFee));
      // HYSA now participates in the withdrawal pool, so it's grown here (before withdrawal) instead of the blanket line below.
      let hysaGrown = balHYSA*(1+inputs.hysaRate);
      let remaining = need;

      // Withdrawal accounts: each has a current (post-growth) balance. Traditional TSP and each brokerage
      // pie get grossed up bracket-by-bracket (solveGrossForNet, using the running ordinaryIncomeStack)
      // so a NET dollar taken out correctly reflects only the tax bracket(s) it actually falls in,
      // instead of one flat rate applied to the whole withdrawal. Roth and HYSA are already after-tax.
      const acctTaxInfo = { trad: { brackets: federalBracketsThisYear, flatAdd: inputs.idahoRate + earlyPenalty } };
      const bal = { trad: tradGrown, roth: rothGrown, hysa: hysaGrown };
      brokPiesGrown.forEach((b, i) => {
        bal['pie_'+i] = b;
        // Roth IRA pies are after-tax accounts, so they follow the same tax-free takeFrom()
        // path as Roth TSP/HYSA rather than the taxable brokerage gross-up path.
        if (!isRothIraPie(inputs, i) && !isTaxableCashPie(inputs, i)) {
          acctTaxInfo['pie_'+i] = { brackets: ltcgBracketsThisYear, flatAdd: inputs.idahoRate, taxablePct: inputs.brokerageTaxablePct };
        }
      });
      const takeFrom = (key, desiredNet) => {
        if (desiredNet <= 0 || bal[key] === undefined) return;
        const info = acctTaxInfo[key];
        if (!info) {
          // Roth / HYSA: already after-tax, no gross-up needed.
          const netTaken = Math.min(desiredNet, Math.max(0, bal[key]));
          bal[key] -= netTaken;
          remaining -= netTaken;
          grossWithdrawal += netTaken;
          withdrawalByAccount[key] = (withdrawalByAccount[key] || 0) + netTaken;
          return;
        }
        const desiredGross = info.taxablePct == null
          ? solveGrossForNet(ordinaryIncomeStack, desiredNet, info.brackets, info.flatAdd)
          : solveGrossForNetTaxablePortion(ordinaryIncomeStack, desiredNet, info.brackets, info.flatAdd, info.taxablePct);
        const grossTaken = Math.min(desiredGross, Math.max(0, bal[key]));
        const taxAmt = info.taxablePct == null
          ? taxOwedOnIncrement(ordinaryIncomeStack, grossTaken, info.brackets, info.flatAdd)
          : taxOwedOnTaxablePortion(ordinaryIncomeStack, grossTaken, info.brackets, info.flatAdd, info.taxablePct);
        const netTaken = Math.min(desiredNet, grossTaken - taxAmt);
        bal[key] -= grossTaken;
        remaining -= netTaken;
        grossWithdrawal += grossTaken;
        withdrawalByAccount[key] = (withdrawalByAccount[key] || 0) + grossTaken;
        // Traditional TSP draws stack onto ordinary income for bracket purposes; LTCG-taxed pie draws
        // read the same stack to find their bracket but don't add to it (different income type).
        if (key === 'trad') ordinaryIncomeStack += grossTaken;
        // Split this withdrawal's tax back into Federal vs Idaho-state shares for the Taxes page's
        // Estimated Taxes chart — Idaho's flat rate on the gross is always the state slice; whatever's
        // left (bracket-blended federal + early-withdrawal penalty for Traditional TSP, or the federal
        // LTCG amount for brokerage pie sales) is the federal slice.
        const stateTaxAmt = inputs.idahoRate * grossTaken * (info.taxablePct == null ? 1 : info.taxablePct);
        stateTaxAnnual += stateTaxAmt;
        federalTaxAnnual += taxAmt - stateTaxAmt;
      };

      // Required Minimum Distributions (RMD): once you reach rmdAge, the IRS forces a withdrawal from
      // Traditional TSP every year — whether you actually need the money for spending or not — computed off
      // balTrad as it stood at the start of this year (before this year's growth, i.e. the prior year-end
      // balance), divided by the IRS Uniform Lifetime Table factor for your current age (rmdDivisor above).
      // Roth TSP is never subject to RMDs. Taxed at the same ordinary rate as any other Traditional withdrawal
      // and tracked in withdrawalByAccount the same way a normal takeFrom() call would, but — unlike a normal
      // need-driven withdrawal — it isn't capped by how much you actually need this year: any leftover after
      // covering spending is swept into Brokerage (the same destination pie excess income savings uses)
      // instead of just sitting there or vanishing from the projection.
      const rmdOwnerAge = survivorshipActive && inputs.survivorSpousalRollover ? spouseAgeThisYear : age;
      if (inputs.rmdAge && rmdOwnerAge >= inputs.rmdAge && balTrad > 0.01) {
        const rmdRequiredGross = Math.min(bal.trad, balTrad / rmdDivisor(rmdOwnerAge));
        // RMD age is always well past 59.5, so no early-withdrawal penalty applies — bracket-blended
        // federal tax (stacked on the running ordinaryIncomeStack) + Idaho's flat rate.
        const rmdTaxAmt = taxOwedOnIncrement(ordinaryIncomeStack, rmdRequiredGross, federalBracketsThisYear, inputs.idahoRate);
        const rmdRequiredNet = rmdRequiredGross - rmdTaxAmt;
        bal.trad -= rmdRequiredGross;
        grossWithdrawal += rmdRequiredGross;
        withdrawalByAccount.trad = (withdrawalByAccount.trad || 0) + rmdRequiredGross;
        ordinaryIncomeStack += rmdRequiredGross;
        const rmdStateTaxAmt = inputs.idahoRate * rmdRequiredGross;
        stateTaxAnnual += rmdStateTaxAmt;
        federalTaxAnnual += rmdTaxAmt - rmdStateTaxAmt;
        const rmdAppliedToNeed = Math.min(rmdRequiredNet, remaining);
        remaining -= rmdAppliedToNeed;
        const rmdSurplusNet = rmdRequiredNet - rmdAppliedToNeed;
        if (rmdSurplusNet > 0.01) {
          const rmdDestIdx = brokeragePies.findIndex(p => p.name === inputs.excessIncomeDestinationPieName);
          if (rmdDestIdx >= 0 && bal['pie_'+rmdDestIdx] !== undefined) bal['pie_'+rmdDestIdx] += rmdSurplusNet;
          else {
            const pk = Object.keys(bal).find(k => k.startsWith('pie_'));
            if (pk) bal[pk] += rmdSurplusNet;
            else {
              bal.hysa += rmdSurplusNet;
              contribByAccount.hysa = (contribByAccount.hysa || 0) + rmdSurplusNet;
            }
          }
        }
      }

      // Roth Conversion planner (Taxes page): during the configured post-retirement window, move
      // Traditional TSP dollars into Roth TSP each year, taxed as ordinary income the same way any
      // other Trad withdrawal is (progressive federal brackets + Idaho flat rate), but the resulting
      // tax bill is paid from a SEPARATE account (HYSA or a specific brokerage pie) rather than out of
      // the TSP itself — pulling the tax from inside the conversion would shrink the amount that
      // actually lands in Roth, defeating the point of converting in the first place. Runs after RMD
      // above (real IRS rule: this year's RMD isn't itself convertible — it has to come out as a normal
      // distribution first, then whatever's left in Trad can be converted), and is NOT gated by
      // tradAvailableForJobLoss/Rule of 55 the way an actual distribution is — a Roth conversion is an
      // in-plan rollover, not a "separation withdrawal," so it isn't subject to the 10%-early-withdrawal/
      // Rule-of-55 restriction that only applies to money actually leaving the TSP as spendable cash.
      if (inputs.rothConversionEnabled && age >= inputs.rothConversionStartAge && age <= inputs.rothConversionEndAge && bal.trad > 0.01) {
        const desiredConversion = Math.min(inputs.rothConversionAnnualAmount, bal.trad);
        if (desiredConversion > 0.01) {
          // Stacked on top of ordinaryIncomeStack (this year's guaranteed income plus any LTC/Future-
          // Expense/RMD draws already recorded above) PLUS this year's still-to-come gap-driven
          // withdrawal (`need`) — the same conservative "assume the main withdrawal happens too"
          // assumption the original version used, so the conversion doesn't claim brackets the main
          // withdrawal will actually need, just computed bracket-by-bracket now (taxOwedOnIncrement)
          // instead of applying one flat top-marginal rate to the whole conversion amount. No
          // early-withdrawal penalty — conversions aren't distributions.
          const convBase = ordinaryIncomeStack + need;
          const desiredTax = taxOwedOnIncrement(convBase, desiredConversion, federalBracketsThisYear, inputs.idahoRate);
          // Cap the conversion so its tax bill never exceeds what the configured source account can
          // actually cover this year — better to convert less than to overdraw HYSA/a brokerage pie
          // negative, and better than silently paying the tax out of the TSP itself.
          const sourceKey = inputs.rothConversionTaxSource === 'hysa' ? 'hysa' : ('pie_' + brokeragePies.findIndex(p => p.name === inputs.rothConversionTaxSource));
          const sourceAvailable = bal[sourceKey] !== undefined ? Math.max(0, bal[sourceKey]) : 0;
          const scale = desiredTax > sourceAvailable && desiredTax > 0 ? sourceAvailable / desiredTax : 1;
          const actualConversion = desiredConversion * scale;
          const actualTax = desiredTax * scale;
          if (actualConversion > 0.01) {
            bal.trad -= actualConversion;
            bal.roth += actualConversion;
            if (bal[sourceKey] !== undefined) bal[sourceKey] -= actualTax;
            // Savings page: a conversion isn't spending or investment growth for either account — it's
            // an internal transfer. Recorded as a Roth "contribution" here; the matching Trad side is
            // folded into savingsWithdrawByAccount (built at the row push below) rather than the real
            // withdrawalByAccount, so it doesn't also change the IRMAA MAGI lookback proxy or the
            // Income Gap & Withdrawals page, which read the real withdrawalByAccount for other reasons.
            contribByAccount.roth = (contribByAccount.roth||0) + actualConversion;
            rothConversionAmount = actualConversion;
            rothConversionTax = actualTax;
            totalRothConverted += actualConversion;
            totalRothConversionTax += actualTax;
            ordinaryIncomeStack += actualConversion;
            // Recorded into the same Federal/Idaho split as every other withdrawal-driven tax on this
            // page, so the conversion's tax bill shows up in the Estimated Taxes chart and lifetime
            // totals without any extra wiring there.
            const convStateTaxAmt = inputs.idahoRate * actualConversion;
            stateTaxAnnual += convStateTaxAmt;
            federalTaxAnnual += actualTax - convStateTaxAmt;
          }
        }
      }

      if (inputs.withdrawalSimultaneous) {
        // Split the need across the checked accounts, "water-filling" over a few rounds so accounts
        // that run dry hand off their unmet share to the others still selected. effectiveWithdrawalOrder
        // already excludes 'trad' during a Job Loss year that doesn't qualify for Rule of 55 and hasn't
        // reached 59.5 yet, so bal.trad simply never gets touched in that case.
        let selected = effectiveWithdrawalOrder.filter(k => bal[k] !== undefined);
        if (inputs.withdrawalProportionMode === 'percent') {
          // Fixed weights the user set on the Money Flows page, instead of that year's balance — an
          // account's share of each year's withdrawal stays constant even as balances drift apart over
          // time, unlike the balance-weighted path below. Weights are relative (renormalized against
          // whichever accounts are still active each round), so they don't need to add up to exactly 100.
          for (let round = 0; round < selected.length && remaining > 0.01; round++) {
            const active = selected.filter(k => bal[k] > 0.01);
            if (!active.length) break;
            const totalPct = active.reduce((s, k) => s + (inputs.withdrawalProportions[k] || 0), 0);
            if (totalPct <= 0) break; // none of the still-active accounts have a weight set — nothing left to allocate this round
            const roundTarget = remaining;
            active.forEach(k => takeFrom(k, roundTarget * ((inputs.withdrawalProportions[k] || 0) / totalPct)));
          }
        } else {
          // Default: split proportionally by that year's actual balance.
          for (let round = 0; round < selected.length && remaining > 0.01; round++) {
            const active = selected.filter(k => bal[k] > 0.01);
            if (!active.length) break;
            const totalBal = active.reduce((s, k) => s + bal[k], 0);
            if (totalBal <= 0) break;
            const roundTarget = remaining;
            active.forEach(k => takeFrom(k, roundTarget * (bal[k] / totalBal)));
          }
        }
      } else {
        // Sequential waterfall: drain the 1st account fully before touching the 2nd, then the 3rd.
        effectiveWithdrawalOrder.forEach(key => { if (remaining > 0.01) takeFrom(key, remaining); });
      }

      // Taxable Traditional withdrawals and Roth conversions can cause a larger share of Social
      // Security to become federally taxable. Recompute that share after the year's ordinary-income
      // draws, then fund the incremental federal tax from after-tax accounts so it reduces the plan's
      // real balances rather than appearing only as an informational tax number.
      const ordinaryDrawsThisYear = (withdrawalByAccount.trad || 0) + rothConversionAmount;
      const ssTaxableAfterWithdrawals = taxableSocialSecurity(
        ssAmount + spousalBenefit,
        otherTaxableGuaranteed + ordinaryDrawsThisYear,
        taxFilingStatusThisYear
      );
      const correctedFederalTaxable = Math.max(0,
        otherTaxableGuaranteed + ordinaryDrawsThisYear + ssTaxableAfterWithdrawals - standardDeductionThisYear
      );
      const priorFederalTaxable = Math.max(0, taxableBeforeWithdrawal + ordinaryDrawsThisYear);
      const socialSecurityTaxCorrection = Math.max(0,
        taxOwedFromBrackets(correctedFederalTaxable, federalBracketsThisYear) -
        taxOwedFromBrackets(priorFederalTaxable, federalBracketsThisYear)
      );
      if (socialSecurityTaxCorrection > 0.01) {
        federalTaxAnnual += socialSecurityTaxCorrection;
        let taxRemaining = socialSecurityTaxCorrection;
        const payTaxFrom = key => {
          if (taxRemaining <= 0.01 || bal[key] == null) return;
          const paid = Math.min(taxRemaining, Math.max(0, bal[key]));
          bal[key] -= paid; taxRemaining -= paid; grossWithdrawal += paid;
          withdrawalByAccount[key] = (withdrawalByAccount[key] || 0) + paid;
        };
        // Prefer truly after-tax sources. This avoids creating another ordinary-income withdrawal
        // that would itself change the taxable Social Security calculation again.
        payTaxFrom('hysa'); payTaxFrom('roth');
        Object.keys(bal).filter(k => k.startsWith('pie_')).forEach(payTaxFrom);
        if (taxRemaining > 1) markShortfall('taxOnSocialSecurity');
      }

      withdrawal = need - remaining;
      if (remaining > 1) markShortfall('recurringSpending');

      balTrad = Math.max(0, bal.trad); balRoth = Math.max(0, bal.roth); balHYSA = Math.max(0, bal.hysa);
      balBrokeragePies = balBrokeragePies.map((_, i) => Math.max(0, bal['pie_'+i]));
      balChecking *= (1+inputs.cashRate); balSavings *= (1+inputs.cashRate);

      // IRMAA lookback proxy (see the comment above medicarePremiumBase): carry this year's approximate MAGI
      // — taxable guaranteed income, this year's actual gross Traditional TSP withdrawal (which now
      // includes any RMD forced out above), any Roth conversion amount (ordinary income in the year it
      // happens, same as a Trad withdrawal — MAGI doesn't distinguish why money left Traditional TSP),
      // and the user-entered gain portion of market-linked taxable-account sales. Cash-like taxable
      // interest is already included in taxableGuaranteed above in the year earned, so withdrawing its
      // principal is deliberately excluded here; Roth IRA withdrawals are excluded as tax-free.
      const brokerageWithdrawalTotal = balBrokeragePies.reduce((s, _, i) =>
        s + ((!isRothIraPie(inputs, i) && !isTaxableCashPie(inputs, i)) ? (withdrawalByAccount['pie_'+i] || 0) : 0), 0);
      magiHistory[y] = Math.max(0, taxableGuaranteed + (withdrawalByAccount.trad || 0) + rothConversionAmount + brokerageWithdrawalTotal * inputs.brokerageTaxablePct);
      magiFilingStatusHistory[y] = taxFilingStatusThisYear;

      const endInvestable = balTrad + balRoth + sumPies(balBrokeragePies);
      if (endInvestable <= 0 && depletionAge === null && startInvestable > 0) depletionAge = age;
    }

    const investable = balTrad + balRoth + sumPies(balBrokeragePies);
    const cash = balChecking + balSavings + balHYSA;
    const netWorth = investable + cash + homeEquityThisYear + vehicleAssetsThisYear - debtBalanceThisYear;

    if (!randomize) {
      // Savings page: the Trad side of a Roth conversion is folded into a COPY of withdrawalByAccount
      // (not the real one — see the comment at the conversion block above) so Trad's own
      // begin→contrib→return→withdrawal→end waterfall balances correctly without disturbing anything
      // else downstream that reads the real withdrawalByAccount (IRMAA lookback, Income Gap page, etc.).
      const savingsWithdrawByAccount = { ...withdrawalByAccount };
      if (rothConversionAmount > 0) savingsWithdrawByAccount.trad = (savingsWithdrawByAccount.trad||0) + rothConversionAmount;
      const acctEnd = { trad: balTrad, roth: balRoth, hysa: balHYSA };
      balBrokeragePies.forEach((b, i) => { acctEnd['pie_'+i] = b; });
      rows.push({
        age, spouseAge: age - ctx.ageGap,
        income: age < inputs.retirementAge ? income : (age === inputs.retirementAge ? transitionJobIncome : null),
        contributions, tradContribOut, rothContribOut, matchContribOut,
        guaranteedIncome, guaranteedIncomeAfterTax, spousalBenefit, ssAmount, pensionAmount, pension2Amount, vaDisabilityAmount, ltcVaAidIncome: ltcVaAidIncomeThisYear, annuityAmount, sbpAmount, dicAmount, dicAidAttendanceAmount, spending, withdrawal, grossWithdrawal, withdrawalByAccount, ltcCost: ltcCostThisYear,
        investable, cash, debtBalance: debtBalanceThisYear, homeEquity: homeEquityThisYear, vehicleAssets: vehicleAssetsThisYear, netWorth, housingCost, futureExpenseCost: futureExpenseCostThisYear,
        medicalCostAnnual, expensesCategoriesAnnual, excessIncomeSaved, insurancePremiumAnnual, essentialFloor, primaryDeceased, recurringLivingCostThisYear,
        investmentFeesAnnual, spendingPhaseMultiplier, taxFilingStatus: taxFilingStatusThisYear,
        fedMarginalRate: fedMarginal, ltcgMarginalRate: age >= inputs.retirementAge ? ltcgMarginal : null,
        irmaaSurchargeMonthly: irmaaSurchargeMonthlyForRow,
        standardDeductionAnnual: standardDeductionThisYear,
        magiEstimateAnnual: Math.max(0, magiHistory[y] || 0),
        taxableIncomeEstimateAnnual: Math.max(0, (magiHistory[y] || 0) - standardDeductionThisYear),
        federalTaxAnnual, stateTaxAnnual, ficaTaxAnnual, taxableInterestIncome,
        balTrad, balRoth, rothConversionAmount, rothConversionTax,
        balBrokeragePies: balBrokeragePies.slice(), acctBegin, acctEnd, contribByAccount, savingsWithdrawByAccount
      });
    }
  }

  if (investableAtRetirement === null) {
    investableAtRetirement = balTrad + balRoth + sumPies(balBrokeragePies);
    cashAtRetirement = balChecking + balSavings + balHYSA;
  }

  return { rows, investableAtRetirement, cashAtRetirement, depletionAge, firstShortfallAge, firstShortfallReason, success: !shortfallEver, initialWithdrawalRate, totalRothConverted, totalRothConversionTax };
}

// Whether a single recurring expense row counts as "active" in a given projection year (age) — both
// startAge and endAge are optional (null/undefined = unbounded on that side), so a row with neither set
// (every row that existed before this feature, and every new row by default) behaves exactly as before:
// active for the whole plan. Set via the Starts/Ends date pickers on the Expenses page (updateExpenseDate),
// which convert the picked calendar month into an age anchored on today's currentAge — the same convention
// Future Expenses/Windfalls/Job Loss already use (see monthToAge).
function expenseActiveAtAge(e, age) {
  return (e.startAge == null || age >= e.startAge) && (e.endAge == null || age <= e.endAge);
}
// Same math as buildContext's expensesXxx totals below, factored out so it can be rerun against any subset
// of the expenses array — the full list (what buildContext itself still uses for its own static fields,
// kept for backward compatibility with their one remaining non-projectRun consumer) or, per projection year,
// only the rows expenseActiveAtAge() says are active that year (see expensesForYear, in buildContext's
// return value below, which projectRun() actually calls every year instead of reading the static fields).
function computeExpenseTotals(list) {
  const total = list.reduce((s,e) => s + (+e.amount || 0), 0) * 12;
  const medical = list.filter(e => e.category === 'Healthcare').reduce((s,e) => s + (+e.amount || 0), 0) * 12;
  const nonMedical = total - medical;
  const mustSpendVal = e => (e.mustSpend != null ? +e.mustSpend : (+e.amount || 0));
  const mustSpendTotal = list.reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendMedical = list.filter(e => e.category === 'Healthcare').reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendNonMedical = mustSpendTotal - mustSpendMedical;
  const jobLossVal = e => (e.jobLoss != null ? +e.jobLoss : mustSpendVal(e));
  const jobLossTotal = list.reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const jobLossMedical = list.filter(e => e.category === 'Healthcare').reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const jobLossNonMedical = jobLossTotal - jobLossMedical;
  const survivorVal = item => (item.survivorAmount != null && item.survivorAmount !== '') ? (+item.survivorAmount || 0) : (+item.amount || 0);
  const survivorList = list.filter(e => e.survivorContinues !== false);
  const totalSurvivor = survivorList.reduce((s,e) => s + survivorVal(e), 0) * 12;
  const medicalSurvivor = survivorList.filter(e => e.category === 'Healthcare').reduce((s,e) => s + survivorVal(e), 0) * 12;
  const nonMedicalSurvivor = totalSurvivor - medicalSurvivor;
  const mustSpendTotalSurvivor = survivorList.reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendMedicalSurvivor = survivorList.filter(e => e.category === 'Healthcare').reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendNonMedicalSurvivor = mustSpendTotalSurvivor - mustSpendMedicalSurvivor;
  const jobLossTotalSurvivor = survivorList.reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const jobLossMedicalSurvivor = survivorList.filter(e => e.category === 'Healthcare').reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const jobLossNonMedicalSurvivor = jobLossTotalSurvivor - jobLossMedicalSurvivor;
  return {
    nonMedical, medical,
    mustSpendNonMedical, mustSpendMedical,
    jobLossNonMedical, jobLossMedical,
    nonMedicalSurvivor, medicalSurvivor,
    mustSpendNonMedicalSurvivor, mustSpendMedicalSurvivor,
    jobLossNonMedicalSurvivor, jobLossMedicalSurvivor
  };
}
function buildContext(inputs) {
  const ageGap = inputs.currentAge - inputs.spouseCurrentAge;
  // Plan through whichever spouse lives longer, expressed in the primary user's age terms.
  const effectiveLifeExpectancy = Math.max(inputs.lifeExpectancy, inputs.spouseLifeExpectancy + ageGap);
  const maxYears = effectiveLifeExpectancy - inputs.currentAge;
  const effectiveSpousalStartAge = Math.max(inputs.ssAge, ageGap + inputs.spousalStartAge);
  const effectiveSpouseOwnSSStartAge = ageGap + inputs.spouseSSAge;
  // Job Loss test: Rule of 55 only waives the 10% early-withdrawal penalty (and, more fundamentally, only
  // makes a TSP "separation withdrawal" available at all before 59.5) if you separate from federal service
  // in the calendar year you turn 55 or later — a year-based test, not a birthday-precise one. The global
  // "Rule of 55 applies" toggle (Taxes page) is a blanket assumption for the whole plan, but Job Loss is
  // specifically testing an involuntary EARLY separation, which could easily land before that threshold —
  // in which case Traditional TSP isn't just penalized, it's genuinely off-limits as a withdrawal source
  // until age 59.5, no matter how the global toggle is set. Only meaningful when a Job Loss date is actually
  // set; defaults to true (no restriction) if it isn't, since there's nothing to disqualify.
  const jobLossYear = inputs.jobLossDateRaw ? +String(inputs.jobLossDateRaw).slice(0, 4) : null;
  const turns55Year = inputs.birthDateRaw ? +String(inputs.birthDateRaw).slice(0, 4) + 55 : null;
  const jobLossQualifiesForRuleOf55 = !jobLossYear || !turns55Year || jobLossYear >= turns55Year;
  const debtStartMonthOffset = d => (d.startAge != null && d.startAge !== '') ? Math.max(0, Math.round((d.startAge - inputs.currentAge) * 12)) : 0;
  const debtSchedules = debts.map(d => buildDebtSchedule(d, maxYears, debtStartMonthOffset(d)));
  const mortgageSchedule = inputs.buyHome ? buildMortgageSchedule(inputs, maxYears) : null;
  // Expense amounts are entered monthly; annualize here so the rest of the engine works in annual $.
  const expensesTotal = expenses.reduce((s,e) => s + (+e.amount || 0), 0) * 12;
  const expensesMedical = expenses.filter(e => e.category === 'Healthcare').reduce((s,e) => s + (+e.amount || 0), 0) * 12;
  const expensesNonMedical = expensesTotal - expensesMedical;
  // "Must Spend" totals — the essential floor guardrails won't cut below (see the guardrail-cut branch
  // in projectRun). Falls back to the full "Like to Spend" amount for any row saved before this field
  // existed, matching the same fallback the Expenses page row rendering already uses.
  const mustSpendVal = e => (e.mustSpend != null ? +e.mustSpend : (+e.amount || 0));
  const expensesMustSpendTotal = expenses.reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const expensesMustSpendMedical = expenses.filter(e => e.category === 'Healthcare').reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const expensesMustSpendNonMedical = expensesMustSpendTotal - expensesMustSpendMedical;
  // "Job Loss" totals — a test third spending basis (Expenses page), same shape as Must Spend, falling
  // back to Must Spend (which itself falls back to Like to Spend) for any row that hasn't had a Job
  // Loss amount set yet.
  const jobLossVal = e => (e.jobLoss != null ? +e.jobLoss : mustSpendVal(e));
  const expensesJobLossTotal = expenses.reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const expensesJobLossMedical = expenses.filter(e => e.category === 'Healthcare').reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const expensesJobLossNonMedical = expensesJobLossTotal - expensesJobLossMedical;
  // Survivorship what-if: a parallel set of totals that only include expenses/debts marked as continuing
  // after you're gone (item.survivorContinues, toggled on the Survivorship page — defaults to continuing
  // when unset), using each item's edited override amount (item.survivorAmount) if the user set one,
  // otherwise its normal amount. Used instead of the totals above only once survivorshipActive is true
  // in projectRun().
  const survivorVal = item => (item.survivorAmount != null && item.survivorAmount !== '') ? (+item.survivorAmount || 0) : (+item.amount || 0);
  const debtSchedulesSurvivor = debts.filter(d => d.survivorContinues !== false).map(d => {
    const survivorPayment = (d.survivorAmount != null && d.survivorAmount !== '') ? (+d.survivorAmount || 0) : d.payment;
    return buildDebtSchedule({ ...d, payment: survivorPayment }, maxYears, debtStartMonthOffset(d));
  });
  const expensesTotalSurvivor = expenses.filter(e => e.survivorContinues !== false).reduce((s,e) => s + survivorVal(e), 0) * 12;
  const expensesMedicalSurvivor = expenses.filter(e => e.category === 'Healthcare' && e.survivorContinues !== false).reduce((s,e) => s + survivorVal(e), 0) * 12;
  const expensesNonMedicalSurvivor = expensesTotalSurvivor - expensesMedicalSurvivor;
  // Must Spend, survivorship-filtered (same "continuing" filter as the Like-to-Spend survivor totals
  // above) — no separate survivor override amount for Must Spend itself, just the plain per-row floor.
  const expensesMustSpendTotalSurvivor = expenses.filter(e => e.survivorContinues !== false).reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const expensesMustSpendMedicalSurvivor = expenses.filter(e => e.category === 'Healthcare' && e.survivorContinues !== false).reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const expensesMustSpendNonMedicalSurvivor = expensesMustSpendTotalSurvivor - expensesMustSpendMedicalSurvivor;
  // Job Loss, survivorship-filtered (same "continuing" filter as everything else above).
  const expensesJobLossTotalSurvivor = expenses.filter(e => e.survivorContinues !== false).reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const expensesJobLossMedicalSurvivor = expenses.filter(e => e.category === 'Healthcare' && e.survivorContinues !== false).reduce((s,e) => s + jobLossVal(e), 0) * 12;
  const expensesJobLossNonMedicalSurvivor = expensesJobLossTotalSurvivor - expensesJobLossMedicalSurvivor;
  return {
    maxYears, ageGap, effectiveLifeExpectancy, effectiveSpousalStartAge, effectiveSpouseOwnSSStartAge, debtSchedules, mortgageSchedule,
    jobLossQualifiesForRuleOf55,
    expensesTotal, expensesMedical, expensesNonMedical,
    expensesMustSpendTotal, expensesMustSpendMedical, expensesMustSpendNonMedical,
    expensesJobLossTotal, expensesJobLossMedical, expensesJobLossNonMedical,
    debtSchedulesSurvivor, expensesTotalSurvivor, expensesMedicalSurvivor, expensesNonMedicalSurvivor,
    expensesMustSpendTotalSurvivor, expensesMustSpendMedicalSurvivor, expensesMustSpendNonMedicalSurvivor,
    expensesJobLossTotalSurvivor, expensesJobLossMedicalSurvivor, expensesJobLossNonMedicalSurvivor,
    // Per-year expense totals, filtered by each row's optional Starts/Ends date range (expenseActiveAtAge)
    // — projectRun() calls this once every year of the loop instead of reading the static fields above,
    // so a childcare cost that ends in 5 years or a hobby that starts in retirement actually turns off/on
    // at the right point instead of counting for the whole plan like the static fields above always do.
    expensesForYear: (age) => computeExpenseTotals(expenses.filter(e => expenseActiveAtAge(e, age)))
  };
}

const monteCarloScoreCache = new Map();
function runMonteCarlo(inputs, ctx, N, shocks) {
  const cacheKey = JSON.stringify([spendingBasis, N, shocks || {}, inputs, expenses, debts, futureExpenses, windfalls, insurancePolicies, brokeragePies]);
  if (monteCarloScoreCache.has(cacheKey)) return monteCarloScoreCache.get(cacheKey);
  // Use common random market paths for every plan with the same simulation count/shock set. This makes
  // before/after and scenario comparisons isolate the actual input change instead of also changing the
  // random sample. Results remain reproducible across devices and refreshes.
  const seedSource = 'retirement-planner-common-paths-v2|' + JSON.stringify(shocks||{}) + '|' + N;
  mcRandom = mulberry32(hashStringToSeed(seedSource));
  let successes = 0;
  for (let i = 0; i < N; i++) { if (projectRun(inputs, ctx, true, shocks).success) successes++; }
  const score = successes / N * 100;
  if (monteCarloScoreCache.size > 120) monteCarloScoreCache.clear();
  monteCarloScoreCache.set(cacheKey, score);
  return score;
}

function renderMonteCarloAssumptions(inputs, ctx) {
  const host = els('mcAssumptionsSummary');
  if (!host) return;
  host.innerHTML = `Automatic score: <b>1,000 simulations</b><br>
    Planning horizon: age <b>${inputs.currentAge}</b> through <b>${ctx.effectiveLifeExpectancy}</b><br>
    Returns before retirement: <b>${(inputs.preReturn*100).toFixed(1)}%</b> average / <b>${(inputs.preStdev*100).toFixed(1)}%</b> volatility<br>
    Returns during retirement: <b>${(inputs.postReturn*100).toFixed(1)}%</b> average / <b>${(inputs.postStdev*100).toFixed(1)}%</b> volatility<br>
    Return distribution: <b>${inputs.enhancedMonteCarlo ? 'Fat-tailed mixture (enhanced)' : 'Normal distribution'}</b><br>
    General inflation: <b>${(inputs.inflation*100).toFixed(1)}%</b>; medical inflation: <b>${(inputs.medicalInflation*100).toFixed(1)}%</b><br>
    Primary score: <b>${inputs.enhancedMonteCarlo ? 'enhanced conservative fat-tailed returns' : 'standard normal returns'}</b>; Overview also shows a normal-distribution comparison score.<br>
    Success means every modeled expense is funded after all eligible accessible household accounts are considered.`;
}

function renderDataQualityChecklist(inputs) {
  const host=els('dataQualityChecklist'); if(!host)return;
  const issues=[];
  const add=(level,text)=>issues.push({level,text});
  if(!inputs.birthDateRaw)add('high','Primary birthdate is blank; calendar-year Rule of 55 and age/date syncing are less reliable.');
  if(!inputs.retirementDateRaw)add('medium','Planned last working day is blank; the final working year cannot be prorated precisely.');
  if(spendingBasis==='jobloss'&&!inputs.jobLossDateRaw)add('high','Job Loss is selected but no Job Loss date is set.');
  const missingMust=expenses.filter(e=>e.mustSpend==null||e.mustSpend==='').length;
  const missingJob=expenses.filter(e=>e.jobLoss==null||e.jobLoss==='').length;
  if(missingMust)add('medium',`${missingMust} expense row(s) have no explicit Must Spend amount and use a fallback.`);
  if(missingJob)add('medium',`${missingJob} expense row(s) have no explicit Job Loss amount and use Must Spend as a fallback.`);
  if(inputs.sbp1Enabled && !insurancePolicies.some(p => /(sbp|spb)/i.test(p.name || '') && (+p.premium || 0) > 0)) add('high','SBP is enabled, but no SBP premium appears in Insurance. Add the monthly deduction there so gross pension income is not overstated.');
  if(expenses.some(e => /^to cindy$/i.test((e.name || '').trim())) && inputs.rentMonthly > 0) add('medium','Confirm that “To Cindy” does not already include rent, utilities, insurance, or other separately listed costs.');
  if(inputs.partBUserMonthly < 202.9 || inputs.partBSpouseMonthly < 202.9) add('low','A Medicare Part B amount is below the 2026 standard premium of $202.90/month; confirm that the lower amount is intentional.');
  debts.forEach(d=>{if(d.startAge!=null&&d.startAge!==''&&!d.termYears&&!d.payment)add('high',`${d.name||'Future debt'} has a start age but no term or payment.`);if(d.category==='Auto Loan'&&!(+d.assetValue>0))add('low',`${d.name||'Auto loan'} has no vehicle value; net worth remains conservative.`);});
  if(!issues.length){host.innerHTML='<div class="note" style="margin:0;">✓ No data-quality issues detected.</div>';return;}
  host.innerHTML=issues.map(i=>`<div style="padding:8px 10px;margin:6px 0;border-left:4px solid ${i.level==='high'?'#c0392b':i.level==='medium'?'#e08c2b':'#8892a0'};background:#f8fafc;font-size:15px;">${i.text}</div>`).join('');
}

function runHighPrecisionMonteCarlo() {
  const out = els('mcHighPrecisionResult');
  if (out) out.textContent = 'Running 5,000 simulations…';
  setTimeout(() => {
    const inputs = readInputs(), ctx = buildContext(inputs);
    const score = runMonteCarlo(inputs, ctx, 5000);
    if (out) out.textContent = `Higher-precision household score: ${score.toFixed(1)}% (5,000 simulations)`;
  }, 20);
}

// ---------- Historical Sequence-of-Returns Backtest ----------
// Real S&P 500 total-return-by-year (price return + reinvested dividends), 1928-2025, sourced from
// Slickcharts (which compiles from the index provider) — used to replay your ACTUAL plan against every
// real historical stretch of market history long enough to cover it, instead of only the randomly-drawn
// Monte Carlo years. This is the same idea cFIREsim/FIRECalc are built on: "how would my plan have
// actually done starting retirement in 1966, or 2000, or 1929?" rather than a statistical approximation.
// Deliberately returns-only, not a full historical-everything simulation — inflation stays at your
// assumed rate rather than that specific historical year's real inflation, since the engine compounds
// inflation as a single scalar rate throughout (Math.pow(1+inputs.inflation, y)) in dozens of places, and
// swapping that for a properly-varying year-by-year rate would be a much larger, riskier change for a
// secondary/supplementary check like this one. Applied to BOTH pre- and post-retirement years uniformly
// (one blended equity series for the whole plan) — a reasonable fit given your own portfolio is nearly
// all stocks/cash in both phases, not a mix that would need separate historical series per phase.
