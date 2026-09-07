const FEDERAL_BRACKETS_MFJ = [
  { upTo: 24800, rate: 0.10 },
  { upTo: 100800, rate: 0.12 },
  { upTo: 211400, rate: 0.22 },
  { upTo: 403550, rate: 0.24 },
  { upTo: 512450, rate: 0.32 },
  { upTo: 768700, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];
// 2026 Federal brackets for a surviving spouse filing Single.
const FEDERAL_BRACKETS_SINGLE = [
  { upTo: 12400, rate: 0.10 },
  { upTo: 50400, rate: 0.12 },
  { upTo: 105700, rate: 0.22 },
  { upTo: 201775, rate: 0.24 },
  { upTo: 256225, rate: 0.32 },
  { upTo: 640600, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];
// 2026 long-term capital gains brackets, MFJ
const LTCG_BRACKETS_MFJ = [
  { upTo: 98900, rate: 0.00 },
  { upTo: 613700, rate: 0.15 },
  { upTo: Infinity, rate: 0.20 }
];
const LTCG_BRACKETS_SINGLE = [
  { upTo: 49450, rate: 0.00 },
  { upTo: 545500, rate: 0.15 },
  { upTo: Infinity, rate: 0.20 }
];
function inflationIndexedBrackets(brackets, factor) {
  return brackets.map(b => ({ upTo: Number.isFinite(b.upTo) ? b.upTo * factor : Infinity, rate: b.rate }));
}
// ---------- Social Security taxation: IRS provisional-income method ----------
// Replaces a flat "85% of benefits is taxable" assumption with the IRS's actual tiered formula (the
// simplified/"quick calculation" version of the Social Security Benefits Worksheet, which matches the
// full worksheet's result in the vast majority of real situations). Provisional income = other taxable
// income + tax-exempt interest + half of Social Security benefits; the taxable share of SS then steps up
// through three tiers (0% / up to 50% / up to 85%) instead of jumping straight to 85% for everyone.
// The $32,000/$44,000 MFJ thresholds are intentionally left un-inflated — unlike most tax figures in this
// engine, these have been fixed in the tax code since 1993 and are not indexed for inflation (the
// so-called Social Security "stealth tax": as incomes rise with inflation, more of each benefit becomes
// taxable over time, exactly as real law works). "Other income" here is every other already-known
// taxable guaranteed income source (pension/annuity/SBP) — like the rest of this pre-withdrawal tax
// estimate, it doesn't attempt to fold in this year's Trad TSP/brokerage withdrawal amount, since that
// isn't known until after the withdrawal waterfall runs later on; this mirrors the same scope limitation
// the surrounding federal tax estimate already has, rather than introducing a new one.
function taxableSocialSecurity(ssBenefits, otherTaxableIncome, filingStatus = 'mfj') {
  const ss = Math.max(0, ssBenefits);
  if (ss <= 0) return 0;
  const other = Math.max(0, otherTaxableIncome);
  const provisionalIncome = other + 0.5 * ss;
  const lowerThreshold = filingStatus === 'single' ? 25000 : 32000;
  const upperThreshold = filingStatus === 'single' ? 34000 : 44000;
  const lowerTierMaximum = filingStatus === 'single' ? 4500 : 6000;
  if (provisionalIncome <= lowerThreshold) return 0;
  if (provisionalIncome <= upperThreshold) return Math.min(0.5 * ss, 0.5 * (provisionalIncome - lowerThreshold));
  return Math.min(0.85 * ss, 0.85 * (provisionalIncome - upperThreshold) + Math.min(lowerTierMaximum, 0.5 * ss));
}
function marginalRateFromBrackets(taxableIncome, brackets) {
  const income = Math.max(0, taxableIncome);
  for (const b of brackets) { if (income <= b.upTo) return b.rate; }
  return brackets[brackets.length-1].rate;
}
// Progressive tax actually owed on a given taxable income, summed bracket-by-bracket (not just the marginal rate).
function taxOwedFromBrackets(taxableIncome, brackets) {
  const income = Math.max(0, taxableIncome);
  let tax = 0, lower = 0;
  for (const b of brackets) {
    if (income <= lower) break;
    tax += (Math.min(income, b.upTo) - lower) * b.rate;
    lower = b.upTo;
  }
  return tax;
}
const IDAHO_ZERO_BAND_MFJ = 9622;
const IDAHO_ZERO_BAND_SINGLE = 4811;
function idahoTaxOwed(taxableIncome, rate, inflationFactor = 1, filingStatus = 'mfj') {
  const zeroBand = filingStatus === 'single' ? IDAHO_ZERO_BAND_SINGLE : IDAHO_ZERO_BAND_MFJ;
  return Math.max(0, Math.max(0, taxableIncome) - zeroBand * inflationFactor) * Math.max(0, rate);
}

// A spouse's retirement benefit is based on the worker's Primary Insurance Amount (the age-67
// benefit for this plan), not on the worker's reduced age-62 or delayed age-70 payment. For a spouse
// born in 1960 or later, claiming before FRA 67 reduces the base spousal amount by 25/36 of 1% per
// month for the first 36 months and 5/12 of 1% for each additional month. Waiting past FRA does not
// increase a regular spousal benefit.
function spousalEarlyClaimMultiplier(startAge, fraAge = 67) {
  const monthsEarly = Math.max(0, Math.round((fraAge - Math.min(fraAge, +startAge || fraAge)) * 12));
  const first36 = Math.min(36, monthsEarly);
  const additional = Math.max(0, monthsEarly - 36);
  return Math.max(0, 1 - first36 * (0.25 / 36) - additional * (0.05 / 12));
}

function spousalMonthlyBenefit(inputs) {
  const workerPia = ssMonthlyAtAge(inputs, 67);
  return workerPia * Math.max(0, Math.min(0.5, inputs.spousalPct || 0))
    * spousalEarlyClaimMultiplier(inputs.spousalStartAge, 67);
}
function netReturnAfterFee(grossReturn, annualFee) {
  return Math.max(-0.999, (+grossReturn || 0) - Math.max(0, +annualFee || 0));
}
function taxOwedOnTaxablePortion(baseTaxableIncome, grossAmount, brackets, flatAddOnRate, taxablePct) {
  const taxableAmount = Math.max(0, grossAmount) * Math.max(0, Math.min(1, taxablePct));
  return taxOwedOnIncrement(baseTaxableIncome, taxableAmount, brackets, flatAddOnRate);
}
function solveGrossForNetTaxablePortion(baseTaxableIncome, netTarget, brackets, flatAddOnRate, taxablePct) {
  if (netTarget <= 0) return 0;
  let low = netTarget, high = Math.max(netTarget * 2, netTarget + 1);
  const netFromGross = gross => gross - taxOwedOnTaxablePortion(baseTaxableIncome, gross, brackets, flatAddOnRate, taxablePct);
  while (netFromGross(high) < netTarget && high < netTarget * 20 + 1) high *= 2;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (netFromGross(mid) >= netTarget) high = mid; else low = mid;
  }
  return high;
}
// Tax owed on an INCREMENTAL amount stacked on top of baseTaxableIncome — e.g. the real tax bill
// triggered by a withdrawal when other taxable income already fills the lower brackets — computed
// bracket-by-bracket (not a single flat rate applied to the whole increment, which is what you get by
// naively using marginalRateFromBrackets on the total and multiplying it by the whole withdrawal: that
// overstates the tax, and therefore the gross withdrawal needed, any time the withdrawal itself spans
// more than one bracket). flatAddOnRate is a rate that applies uniformly regardless of which federal
// bracket a dollar falls in (Idaho's flat state rate, and/or the Rule-of-55 10% early-withdrawal
// penalty for Traditional TSP) — added on top of the bracket-blended federal amount.
function taxOwedOnIncrement(baseTaxableIncome, grossAmount, brackets, flatAddOnRate) {
  if (grossAmount <= 0) return 0;
  const base = Math.max(0, baseTaxableIncome);
  return (taxOwedFromBrackets(base + grossAmount, brackets) - taxOwedFromBrackets(base, brackets)) + flatAddOnRate * grossAmount;
}
// Inverse of taxOwedOnIncrement: solves for the GROSS amount that must be withdrawn so that, after tax
// on just that increment (bracket-by-bracket, stacked on top of baseTaxableIncome), the account nets
// exactly netTarget. Walks the brackets from baseTaxableIncome upward, using each bracket's own rate
// only for the slice of the withdrawal that actually falls in it.
function solveGrossForNet(baseTaxableIncome, netTarget, brackets, flatAddOnRate) {
  if (netTarget <= 0) return 0;
  let cursor = Math.max(0, baseTaxableIncome);
  let remainingNet = netTarget;
  let gross = 0;
  for (const b of brackets) {
    if (cursor >= b.upTo) continue;
    const roomInSegment = b.upTo - cursor; // Infinity for the top, open-ended bracket
    const combinedRate = b.rate + flatAddOnRate;
    const netAvailableInSegment = roomInSegment * (1 - combinedRate);
    if (remainingNet <= netAvailableInSegment) {
      gross += remainingNet / (1 - combinedRate);
      remainingNet = 0;
      break;
    }
    gross += roomInSegment;
    remainingNet -= netAvailableInSegment;
    cursor = b.upTo;
  }
  return gross;
}

// ---------- Page navigation (hamburger drawer) ----------
