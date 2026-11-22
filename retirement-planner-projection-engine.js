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
// Fraction of the retirement year actually worked (from the birthday starting that age-year to the
// retirement date). Pro-rates that one year's income and its TSP/match/brokerage contributions; every
// other year is fully working or fully retired.
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
// Spreads a deposit (+) or withdrawal (-) across pies by balance. Withdrawals water-fill so a dry pie
// passes its share on; pies floor at 0. Returns each pie's change, for callers that attribute draws.
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
// IRS Uniform Lifetime Table (2022+, Pub 590-B): balance / factor for your age. Traditional TSP only
// (Roth is exempt). Ages past the table use the age-120 factor.
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
// 2026 CMS Part B surcharge tiers, Married Filing Jointly. Republished yearly, so re-check as Medicare
// age approaches. Returns the today's-$ monthly surcharge; the caller applies medicalInflator.
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
    // Start-of-year balances for the Savings page, before anything this year touches them.
    const acctBegin = { trad: balTrad, roth: balRoth, hysa: balHYSA };
    balBrokeragePies.forEach((b, i) => { acctBegin['pie_'+i] = b; });
    // Personal strategy: Roth TSP stays out of the withdrawal order until age 59.5.
    const rothAvailableByAge = age >= 59.5;
    const effectiveWithdrawalOrder = inputs.withdrawalOrder.filter(k => k !== 'roth' || rothAvailableByAge);

    // Declared here so mortgage/LTC/Future Expense draws (any year) also record which accounts they came
    // from, in the per-account breakdowns and lifetime totals. Checking/savings aren't tracked here.
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
    // Sequential waterfall for LTC and Future Expense draws, in any year: one account at a time in the
    // Money Flows order, draining each before the next. With taxCtx ({ earlyPenalty, stackBox: { v } },
    // post-retirement only), amountNeeded is net and taxable accounts are grossed up bracket by bracket,
    // with the tax recorded as federal/state. Without it, plain dollar amounts are pulled.
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

    // Mortgage down payment: cash accounts need no gross-up. The brokerage fallback isn't grossed up for
    // LTCG because this runs before the year's tax rates exist. Inactive while buyHome is off.
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

    // Long-term care for spouse: Roth first, then every other accessible resource (brokerage, eligible
    // Traditional TSP, HYSA, savings, checking); a run fails only when all are exhausted. Pre-retirement
    // the draw happens here; post-retirement the cost is first offset by any guaranteed-income surplus
    // further down.
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
          'trad',
          'hysa', 'savings', 'checking'
        ];
        const ltcUnfunded = withdrawInOrder(ltcCostThisYear - fromRoth, ltcFallbackOrder);
        if (ltcUnfunded > 0.01) markShortfall('longTermCare');
      }
    }

    // Future / one-time expenses at an age or age range, drawn in the Money Flows order. Survivorship counts
    // only items marked as continuing (at any override amount). What-If cards inject entries via
    // ctx.futureExpensesOverride, never the real list. Pre-retirement the draw happens here;
    // post-retirement it's first offset by any guaranteed-income surplus.
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

    // Survivorship what-if: the life insurance lump sum (e.g. VGLI) lands in the brokerage pies the year
    // the scenario starts. Never affects the baseline plan.
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

    // grossWithdrawal and withdrawalByAccount are declared earlier in this loop iteration (above the
    // mortgage/LTC/Future Expenses pulls) so those pre-retirement-capable draws
    // can also feed into them — not redeclared here, just continuing to accumulate onto the same objects.
    let contributions=0, withdrawal=0, guaranteedIncome=0, guaranteedIncomeAfterTax=0, spending=0, spousalBenefit=0, ssAmount=0, pensionAmount=0, pension2Amount=0, vaDisabilityAmount=0, annuityAmount=0, sbpAmount=0, dicAmount=0, dicAidAttendanceAmount=0, essentialFloor=0, transitionJobIncome=0, transitionTradContrib=0;
    let fedMarginal=null, ltcgMarginal=null;
    // Mirror of the IRMAA surcharge for the row (display only).
    let irmaaSurchargeMonthlyForRow = 0;
    let tradContribOut=0, rothContribOut=0, matchContribOut=0;
    let medicalCostAnnual=0, expensesCategoriesAnnual=0, excessIncomeSaved=0, recurringLivingCostThisYear=0, taxableInterestIncome=0, investmentFeesAnnual=0, spendingPhaseMultiplier=1;
    // Taxes page ("Estimated Taxes" chart) — Federal income tax + Idaho state tax (split back out of the
    // blended withdrawal rate below) plus FICA payroll tax (Social Security + Medicare, working years only).
    let federalTaxAnnual=0, stateTaxAnnual=0, ficaTaxAnnual=0;
    let rothConversionAmount=0, rothConversionTax=0;

    // Guaranteed income starts at each stream's own eligibility age, independent of retirement age (a
    // military pension or VA disability often starts mid-career). The first year is prorated by the birth
    // month that governs it (spouse's for spousal SS, otherwise the primary's).
    ssAmount = prorateFirstYear(age, inputs.ssAge, inputs.ssMonthly*12*ssInflator, inputs.birthMonth, inputs.currentAge, inputs.ssStartDateRaw);
    spousalBenefit = inputs.spouseWorks
      ? prorateFirstYear(age, ctx.effectiveSpouseOwnSSStartAge, inputs.spouseSSMonthly*12*ssInflator, inputs.spouseBirthMonth, inputs.currentAge, inputs.spouseSSStartDateRaw)
      : prorateFirstYear(age, ctx.effectiveSpousalStartAge, spousalMonthlyBenefit(inputs)*12*ssInflator, inputs.spouseBirthMonth, inputs.currentAge, inputs.spousalStartDateRaw);
    // Past your life expectancy, your spouse gets your full benefit as a 100% survivor benefit (ssAmount
    // already is your full benefit) and the spousal supplement stops. The survivorship scenario also stops
    // primary-only income and applies SBP/DIC and survivor expenses.
    const primaryDeceased = survivorshipActive;
    pensionAmount = prorateFirstYear(age, inputs.pensionAge, inputs.pensionAnnual*pensionInflator, inputs.birthMonth, inputs.currentAge, inputs.pensionStartDateRaw);
    pension2Amount = prorateFirstYear(age, inputs.pension2Age, inputs.pension2Annual*pension2Inflator, inputs.birthMonth, inputs.currentAge, inputs.pension2StartDateRaw);
    vaDisabilityAmount = prorateFirstYear(age, inputs.vaDisabilityAge, inputs.vaDisabilityAnnual*vaInflator, inputs.birthMonth, inputs.currentAge, inputs.vaDisabilityStartDateRaw);
    annuityAmount = prorateFirstYear(age, inputs.annuityStartAge, inputs.annuityMonthly*12*annuityInflator, inputs.birthMonth, inputs.currentAge, inputs.annuityStartDateRaw);
    if (survivorshipActive) {
      // Pension and VA disability stop at the primary's death. The survivor gets the larger of the two SS
      // records, not both.
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

    // Recurring expenses active this year (by each row's optional start/end age).
    const expTotalsThisYear = ctx.expensesForYear(age);

    if (age < inputs.retirementAge) {
      const preMean = allocationPointThisYear ? allocationPointThisYear.expectedReturn : inputs.preReturn;
      const preVolatility = allocationPointThisYear ? allocationPointThisYear.volatility : inputs.preStdev;
      const preR = (shocks.pre && shocks.pre[y] !== undefined) ? shocks.pre[y]
        : (randomize ? randMarketReturn(preMean, preVolatility, inputs.enhancedMonteCarlo) : preMean);
      if (y > 0) income *= (1+inputs.incomeGrowth);
      // In a survivorship run, the primary's salary stops at death (even before the planned retirement
      // age), which zeroes FICA, TSP contributions and taxable wages too.
      const employmentEnded = survivorshipActive;
      if (employmentEnded) income = 0;
      // FICA on job income only: 6.2% SS up to the wage base (grown with General Inflation), 1.45% Medicare
      // uncapped, plus 0.9% above $250k MFJ (a fixed statutory threshold).
      const ssWageBaseThisYear = inputs.ssWageBase * Math.pow(1+inputs.inflation, y);
      const ssTaxThisYear = Math.min(income, ssWageBaseThisYear) * 0.062;
      const medicareTaxThisYear = income * 0.0145 + Math.max(0, income - 250000) * 0.009;
      ficaTaxAnnual = ssTaxThisYear + medicareTaxThisYear;
      const tradContrib = income*inputs.tradPct;
      const rothContrib = income*inputs.rothPct;
      const matchContrib = income*Math.min(inputs.tradPct+inputs.rothPct, inputs.matchCapPct);
      // Working-years federal + Idaho tax for the Taxes chart: wages minus pre-tax Traditional TSP, plus any
      // guaranteed income already flowing (SS via provisional income). Informational only. Cash/T-bill
      // interest is taxed as ordinary income in the year earned and reduces spendable cash.
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
      // same raise assumption — and stop along with it once employment ends, same reasoning as income above.
      const pieContribsMonthly = employmentEnded ? (inputs.brokeragePieContributionsMonthly || []).map(() => 0) : (inputs.brokeragePieContributionsMonthly || []);
      const brokerageContribThisYear = pieContribsMonthly.reduce((s,c) => s + (+c||0), 0) * 12 * Math.pow(1+inputs.incomeGrowth, y);
      // Excess income savings: what's left of pay plus guaranteed income after contributions, living costs
      // and taxes, times the chosen %, goes to Brokerage. Survivorship before retirement switches to the
      // survivor-only expense columns.
      const preRetireNonMedical = survivorshipActive ? expTotalsThisYear.nonMedicalSurvivor : expTotalsThisYear.nonMedical;
      const preRetireMedical = survivorshipActive ? expTotalsThisYear.medicalSurvivor : expTotalsThisYear.medical;
      // Kept on the row so Income vs Expenses has a pre-retirement total-expenses figure.
      recurringLivingCostThisYear = (preRetireNonMedical * inflator + preRetireMedical * medicalInflator) + housingCost + debtPaymentThisYear + insurancePremiumAnnual;
      // Taxes (federal/state/FICA) come out before anything counts as excess.
      const excessIncomeAvailable = Math.max(0, income + guaranteedIncome - tradContrib - rothContrib - brokerageContribThisYear - recurringLivingCostThisYear - federalTaxAnnual - stateTaxAnnual - ficaTaxAnnual);
      // Paid-off debt redirect: with the toggle on, 100% of a paid-off debt's former payment goes to the
      // excess-income destination pie, on top of the %-based sweep. Excludes debts that never pay off or
      // started at $0, and is capped at the year's available slack.
      const paidOffDebtRedirectRaw = (inputs.redirectPaidOffDebtPayments && !employmentEnded) ? debts.reduce((sum, d, i) => {
        const sched = ctx.debtSchedules[i];
        if (!sched || sched.neverPaysOff || (+d.balance || 0) <= 0) return sum;
        if ((sched.balanceAtYearEnd[y] ?? 0) > 0.01) return sum;
        // Payoff year: only the part of the annual payment not actually paid counts as freed.
        return sum + Math.max(0, (+d.payment || 0) * 12 - (sched.paymentDuringYear[y] || 0));
      }, 0) : 0;
      const paidOffDebtRedirect = Math.min(paidOffDebtRedirectRaw, excessIncomeAvailable);
      // After employment ends, any surplus (guaranteed income above spending) goes to HYSA.
      const noPaycheckSurplusToHYSA = employmentEnded ? excessIncomeAvailable : 0;
      excessIncomeSaved = employmentEnded ? 0 : (Math.max(0, excessIncomeAvailable - paidOffDebtRedirect) * (inputs.excessIncomeSavingsPct || 0) + paidOffDebtRedirect);
      // With no paycheck, cover the pre-retirement shortfall from cash first, then other accounts.
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
              // Personal strategy: no Roth TSP withdrawals before 59.5.
              const fromPreRoth = rothAvailableByAge ? Math.min(preRemaining, balRoth) : 0; balRoth -= fromPreRoth; preRemaining -= fromPreRoth;
              addDirectWithdrawal('roth', fromPreRoth);
              if (preRemaining > 0) {
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
      balChecking *= (1+inputs.cashRate); balSavings *= (1+inputs.cashRate); balHYSA = balHYSA*(1+inputs.hysaRate) + noPaycheckSurplusToHYSA + excessIncomeFallbackToHYSA;
      // IRMAA lookback proxy: this year's approximate MAGI, stored for the two-year lag used later.
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
      // Healthcare: Tricare covers whoever isn't on Medicare yet; each person adds Part B at Medicare age (no
      // Part D). Tricare For Life has no premium beyond Part B. Survivorship: your Part B stops, her Tricare
      // stops at her Medicare age, and she needs her own FEDVIP (cost from the Survivorship page).
      const userOnMedicare = age >= inputs.medicareAge;
      const spouseOnMedicare = spouseAgeThisYear >= inputs.medicareAge;
      const onTricare = survivorshipActive ? !spouseOnMedicare : (!userOnMedicare || !spouseOnMedicare);
      // Survivorship what-if: her whole Tricare/Part B/FEDVIP picture can be turned off entirely via the
      // "Her Tricare/Part B/FEDVIP continues" checkbox on the Survivorship page (an escape hatch for an
      // edge case like being fully covered another way) — checked by default, so this normally has no effect.
      const medicalContinuesForSurvivor = !survivorshipActive || inputs.survivorMedicalContinues !== false;
      // IRMAA uses MAGI from two years earlier (none assumed until two modeled years exist). 2026 CMS figures;
      // thresholds grow with General Inflation, the surcharge rides medicalInflator. Applied per spouse on
      // Medicare, off the shared household MAGI.
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
      // Baseline spending comes from the header basis (Like to Spend / Must Spend) before any guardrail
      // cut; survivorship uses only continuing items. The Must Spend floor is always the essentials total.
      const expensesNonMedicalForYear = survivorshipActive
        ? (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendNonMedicalSurvivor : expTotalsThisYear.nonMedicalSurvivor)
        : (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendNonMedical : expTotalsThisYear.nonMedical);
      const expensesMedicalForYear = survivorshipActive
        ? (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendMedicalSurvivor : expTotalsThisYear.medicalSurvivor)
        : (spendingBasis === 'mustspend' ? expTotalsThisYear.mustSpendMedical : expTotalsThisYear.medical);
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

      // Before 59.5, Traditional TSP withdrawals carry the 10% penalty unless Rule of 55 applies (separating
      // in the year you turn 55+). fedMarginal/ltcgMarginal stack on the guaranteed-income base.
      const earlyPenalty = (!inputs.ruleOf55Applies && age < 59.5) ? 0.10 : 0;
      fedMarginal = marginalRateFromBrackets(taxableBeforeWithdrawal + need, federalBracketsThisYear);
      ltcgMarginal = marginalRateFromBrackets(taxableBeforeWithdrawal + need, ltcgBracketsThisYear);
      // fedMarginal/ltcgMarginal are for display only. Actual withdrawal tax is bracket by bracket against the
      // running ordinaryIncomeStack, so multiple draws in one year (LTC, Future Expenses, RMD, conversion,
      // spending gap) each see the right brackets.
      let ordinaryIncomeStack = taxableBeforeWithdrawal;

      // LTC, then Future Expenses, get first claim on any guaranteed-income surplus before touching accounts.
      // The rest uses each draw's normal order (LTC: Roth first, then everything else; Future Expenses:
      // withdrawInOrder). Future Expense draws from taxable accounts are grossed up and their tax recorded.
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

      // Traditional TSP and brokerage pies are grossed up bracket by bracket; Roth and HYSA are after-tax.
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
        // Split the tax into Idaho (flat rate on the gross) and federal (the rest, including any penalty or LTCG).
        const stateTaxAmt = inputs.idahoRate * grossTaken * (info.taxablePct == null ? 1 : info.taxablePct);
        stateTaxAnnual += stateTaxAmt;
        federalTaxAnnual += taxAmt - stateTaxAmt;
      };

      // RMDs from rmdAge: prior year-end Traditional TSP balance / Uniform Lifetime factor, taxed as ordinary
      // income whether needed or not. Anything beyond this year's need is swept to the excess-income pie.
      // Roth is exempt.
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

      // Roth Conversion planner: in the set window, move Traditional TSP to Roth, taxed as ordinary income
      // (federal brackets + Idaho), with the tax paid from a separate account so the full amount lands in
      // Roth. Runs after the RMD (an RMD can't be converted). Not limited by Rule of 55, since a conversion is
      // an in-plan rollover, not a distribution.
      if (inputs.rothConversionEnabled && age >= inputs.rothConversionStartAge && age <= inputs.rothConversionEndAge && bal.trad > 0.01) {
        const desiredConversion = Math.min(inputs.rothConversionAnnualAmount, bal.trad);
        if (desiredConversion > 0.01) {
          // Taxed on top of ordinaryIncomeStack plus this year's coming spending withdrawal (`need`), bracket by
          // bracket. No early-withdrawal penalty.
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
            // A conversion is an internal transfer: recorded as a Roth contribution, and the Trad side goes into
            // savingsWithdrawByAccount (not withdrawalByAccount, which feeds IRMAA and the Gap page).
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
        // Split the need across checked accounts, water-filling so dry accounts hand off their share.
        // effectiveWithdrawalOrder already excludes 'roth' before 59.5.
        let selected = effectiveWithdrawalOrder.filter(k => bal[k] !== undefined);
        if (inputs.withdrawalProportionMode === 'percent') {
          // Fixed user weights (relative, renormalized each round) instead of balance weights.
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

      // Traditional withdrawals and conversions can make more Social Security taxable. Recompute after the
      // year's ordinary draws and pay the extra federal tax from after-tax accounts.
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

      // IRMAA lookback proxy: MAGI = taxable guaranteed income + gross Traditional TSP withdrawals (incl.
      // RMD) + Roth conversions + the gain portion of market-linked taxable sales. Cash interest is already
      // counted when earned; Roth withdrawals are tax-free.
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
      // Copy of withdrawalByAccount with the conversion's Trad side added, for the Savings page only.
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

// Is an expense row active at this age? startAge/endAge are optional (missing = open-ended), set from
// the Starts/Ends pickers on the Expenses page.
function expenseActiveAtAge(e, age) {
  return (e.startAge == null || age >= e.startAge) && (e.endAge == null || age <= e.endAge);
}
// Expense totals for any subset of rows: the full list (buildContext's static fields) or the rows active
// in a given year (expensesForYear).
function computeExpenseTotals(list) {
  const total = list.reduce((s,e) => s + (+e.amount || 0), 0) * 12;
  const medical = list.filter(e => e.category === 'Healthcare').reduce((s,e) => s + (+e.amount || 0), 0) * 12;
  const nonMedical = total - medical;
  const mustSpendVal = e => (e.mustSpend != null ? +e.mustSpend : (+e.amount || 0));
  const mustSpendTotal = list.reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendMedical = list.filter(e => e.category === 'Healthcare').reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendNonMedical = mustSpendTotal - mustSpendMedical;
  const survivorVal = item => (item.survivorAmount != null && item.survivorAmount !== '') ? (+item.survivorAmount || 0) : (+item.amount || 0);
  const survivorList = list.filter(e => e.survivorContinues !== false);
  const totalSurvivor = survivorList.reduce((s,e) => s + survivorVal(e), 0) * 12;
  const medicalSurvivor = survivorList.filter(e => e.category === 'Healthcare').reduce((s,e) => s + survivorVal(e), 0) * 12;
  const nonMedicalSurvivor = totalSurvivor - medicalSurvivor;
  const mustSpendTotalSurvivor = survivorList.reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendMedicalSurvivor = survivorList.filter(e => e.category === 'Healthcare').reduce((s,e) => s + mustSpendVal(e), 0) * 12;
  const mustSpendNonMedicalSurvivor = mustSpendTotalSurvivor - mustSpendMedicalSurvivor;
  return {
    nonMedical, medical,
    mustSpendNonMedical, mustSpendMedical,
    nonMedicalSurvivor, medicalSurvivor,
    mustSpendNonMedicalSurvivor, mustSpendMedicalSurvivor
  };
}
function buildContext(inputs) {
  const ageGap = inputs.currentAge - inputs.spouseCurrentAge;
  // Plan through whichever spouse lives longer, expressed in the primary user's age terms.
  const effectiveLifeExpectancy = Math.max(inputs.lifeExpectancy, inputs.spouseLifeExpectancy + ageGap);
  const maxYears = effectiveLifeExpectancy - inputs.currentAge;
  const effectiveSpousalStartAge = Math.max(inputs.ssAge, ageGap + inputs.spousalStartAge);
  const effectiveSpouseOwnSSStartAge = ageGap + inputs.spouseSSAge;
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
  // Survivorship totals: only items marked as continuing, at any override amount. Used once
  // survivorshipActive is true.
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
  return {
    maxYears, ageGap, effectiveLifeExpectancy, effectiveSpousalStartAge, effectiveSpouseOwnSSStartAge, debtSchedules, mortgageSchedule,
    expensesTotal, expensesMedical, expensesNonMedical,
    expensesMustSpendTotal, expensesMustSpendMedical, expensesMustSpendNonMedical,
    debtSchedulesSurvivor, expensesTotalSurvivor, expensesMedicalSurvivor, expensesNonMedicalSurvivor,
    expensesMustSpendTotalSurvivor, expensesMustSpendMedicalSurvivor, expensesMustSpendNonMedicalSurvivor,
    // Per-year totals honoring each row's Starts/Ends range; projectRun() calls this every year.
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
  if(!inputs.birthDateRaw)add('high','Primary birthdate is blank; age/date syncing is less reliable.');
  if(!inputs.retirementDateRaw)add('medium','Planned last working day is blank; the final working year cannot be prorated precisely.');
  const missingMust=expenses.filter(e=>e.mustSpend==null||e.mustSpend==='').length;
  if(missingMust)add('medium',`${missingMust} expense row(s) have no explicit Must Spend amount and use a fallback.`);
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
// S&P 500 total return by year (price + dividends), 1928-2025, from Slickcharts. Replays the plan
// against every long-enough historical stretch (like cFIREsim/FIRECalc). Returns only; inflation stays
// at your assumed rate. One series for both pre- and post-retirement years.
