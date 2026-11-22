const HISTORICAL_SP500_RETURNS = {
  1928:0.4361,1929:-0.0842,1930:-0.2490,1931:-0.4334,1932:-0.0819,1933:0.5399,1934:-0.0144,1935:0.4767,
  1936:0.3392,1937:-0.3503,1938:0.3112,1939:-0.0041,1940:-0.0978,1941:-0.1159,1942:0.2034,1943:0.2590,
  1944:0.1975,1945:0.3644,1946:-0.0807,1947:0.0571,1948:0.0550,1949:0.1879,1950:0.3171,1951:0.2402,
  1952:0.1837,1953:-0.0099,1954:0.5262,1955:0.3156,1956:0.0656,1957:-0.1078,1958:0.4336,1959:0.1196,
  1960:0.0047,1961:0.2689,1962:-0.0873,1963:0.2280,1964:0.1648,1965:0.1245,1966:-0.1006,1967:0.2398,
  1968:0.1106,1969:-0.0850,1970:0.0401,1971:0.1431,1972:0.1898,1973:-0.1466,1974:-0.2647,1975:0.3720,
  1976:0.2384,1977:-0.0718,1978:0.0656,1979:0.1844,1980:0.3242,1981:-0.0491,1982:0.2155,1983:0.2256,
  1984:0.0627,1985:0.3173,1986:0.1867,1987:0.0525,1988:0.1661,1989:0.3169,1990:-0.0310,1991:0.3047,
  1992:0.0762,1993:0.1008,1994:0.0132,1995:0.3758,1996:0.2296,1997:0.3336,1998:0.2858,1999:0.2104,
  2000:-0.0910,2001:-0.1189,2002:-0.2210,2003:0.2868,2004:0.1088,2005:0.0491,2006:0.1579,2007:0.0549,
  2008:-0.3700,2009:0.2646,2010:0.1506,2011:0.0211,2012:0.1600,2013:0.3239,2014:0.1369,2015:0.0138,
  2016:0.1196,2017:0.2183,2018:-0.0438,2019:0.3149,2020:0.1840,2021:0.2871,2022:-0.1811,2023:0.2629,
  2024:0.2502,2025:0.1788
};
const HISTORICAL_YEARS = Object.keys(HISTORICAL_SP500_RETURNS).map(Number).sort((a,b) => a-b);
const HISTORICAL_FIRST_YEAR = HISTORICAL_YEARS[0], HISTORICAL_LAST_YEAR = HISTORICAL_YEARS[HISTORICAL_YEARS.length-1];
// Builds a {pre, post} shocks object pinning the actual historical return for each year from `startYear`.
// Returns null if the data runs out before the plan ends (that start year can't be tested).
function buildHistoricalShocks(inputs, ctx, startYear) {
  const totalYears = ctx.maxYears; // currentAge .. effectiveLifeExpectancy, inclusive span
  if (startYear + totalYears > HISTORICAL_LAST_YEAR) return null;
  const shocks = { pre: {}, post: {} };
  for (let y = 0; y <= totalYears; y++) {
    const age = inputs.currentAge + y;
    const ret = HISTORICAL_SP500_RETURNS[startYear + y];
    if (age < inputs.retirementAge) shocks.pre[y] = ret;
    else shocks.post[age - inputs.retirementAge] = ret;
  }
  return shocks;
}
// Runs the plan once per historical start year (the history is the draw) and counts how many it
// survives. Cheap enough to run automatically.
function runHistoricalBacktest(inputs, ctx) {
  const results = [];
  for (let startYear = HISTORICAL_FIRST_YEAR; startYear <= HISTORICAL_LAST_YEAR; startYear++) {
    const shocks = buildHistoricalShocks(inputs, ctx, startYear);
    if (!shocks) continue;
    const det = projectRun(inputs, ctx, false, shocks);
    const lastRow = det.rows.length ? det.rows[det.rows.length - 1] : null;
    results.push({
      startYear, success: det.success,
      endingBalance: lastRow ? lastRow.investable : 0,
      depletionAge: det.depletionAge
    });
  }
  const successCount = results.filter(r => r.success).length;
  return { results, successRate: results.length ? (successCount / results.length * 100) : null };
}

// ---------- Monte Carlo Failure Diagnostics & Historical Crisis Stress Test ----------
function runMonteCarloDiagnosticsV2(inputs, ctx, N) {
  // Match the Overview seed exactly so the diagnostic score describes the same market paths.
  const seedSource = 'retirement-planner-common-paths-v2|{}|' + N;
  mcRandom = mulberry32(hashStringToSeed(seedSource));
  let successes = 0;
  const ages = [], reasons = {};
  for (let i=0; i<N; i++) {
    const result = projectRun(inputs, ctx, true);
    if (result.success) successes++;
    else {
      ages.push(result.firstShortfallAge != null ? result.firstShortfallAge : (result.depletionAge || inputs.retirementAge));
      const reason = result.firstShortfallReason || 'recurringSpending';
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
  }
  ages.sort((a,b)=>a-b);
  const failures = N-successes;
  return { score:successes/N*100, successes, failures, reasons,
    early:ages.filter(a=>a<=inputs.retirementAge+10).length,
    medianAge:ages.length?ages[Math.floor(ages.length/2)]:null };
}
function renderMCDiagnosticsV2(inputs, ctx) {
  const host = els('mcDiagnosticsCard');
  if (!host) return;
  const active = runMonteCarloDiagnosticsV2(inputs, ctx, 1000);
  const fixed = inputs.guardrailsEnabled ? runMonteCarloDiagnosticsV2({ ...inputs, guardrailsEnabled:false }, ctx, 1000) : active;
  const guarded = inputs.guardrailsEnabled ? active : runMonteCarloDiagnosticsV2({ ...inputs, guardrailsEnabled:true }, ctx, 1000);
  const labels = { recurringSpending:'Recurring retirement spending', preRetirementGap:'Pre-retirement income gap', futureExpense:'Planned future expense', longTermCare:'Long-term care', homePurchase:'Home purchase' };
  const reasonRows = Object.entries(active.reasons).sort((a,b)=>b[1]-a[1]).map(([key,count]) => `<tr><td>${labels[key]||key}</td><td>${count}</td><td>${Math.round(count/active.failures*100)}%</td></tr>`).join('');
  const failureBody = active.failures ? `<p><b>${Math.round(active.early/active.failures*100)}%</b> of failed runs first fall short by age ${inputs.retirementAge+10}. Median first-shortfall age: <b>${active.medianAge}</b>.</p><div class="table-scroll"><table><thead><tr><th>First cause of failure</th><th>Runs</th><th>Share</th></tr></thead><tbody>${reasonRows}</tbody></table></div>` : '<p style="color:var(--good);font-weight:700;">All 1,000 simulations succeeded.</p>';
  const diff = guarded.score-fixed.score;
  host.innerHTML = `<div class="card no-autocollapse" style="border-left:4px solid var(--primary);"><h3 onclick="toggleCard(this)">Monte Carlo Failure Diagnostics</h3>${failureBody}<div class="results-grid" style="margin-top:14px;"><div class="stat"><div class="label">Fixed spending</div><div class="value">${Math.round(fixed.score)}%</div></div><div class="stat"><div class="label">With guardrails</div><div class="value">${Math.round(guarded.score)}%</div></div><div class="stat"><div class="label">Guardrail difference</div><div class="value">${diff>=0?'+':''}${Math.round(diff)} points</div></div></div><p style="font-size:13px;color:var(--muted);">Both scores use the same 1,000 market paths. Guardrails cannot cut Must Spend, housing, debt, insurance, or medical costs.</p></div>`;
}
function renderCrisisStressTestV2(inputs, ctx) {
  const host = els('crisisStressCard');
  if (!host) return;
  const periods = [
    {name:'Great Depression',year:1929,years:10}, {name:'1966-82 inflation and weak markets',year:1966,years:17},
    {name:'Dot-com bust',year:2000,years:10}, {name:'Global financial crisis',year:2008,years:5},
    {name:'2022 stock-market decline',year:2022,years:4}
  ];
  const labels = { recurringSpending:'Recurring spending', preRetirementGap:'Pre-retirement gap', futureExpense:'Planned expense', longTermCare:'Long-term care', homePurchase:'Home purchase' };
  const results = periods.map(period => {
    const shocks={pre:{},post:{}};
    for(let y=0;y<period.years && y<=ctx.maxYears;y++){
      const ret=HISTORICAL_SP500_RETURNS[period.year+y]; if(ret==null) break;
      const age=inputs.currentAge+y;
      if(age<inputs.retirementAge) shocks.pre[y]=ret; else shocks.post[age-inputs.retirementAge]=ret;
    }
    return {...period,result:projectRun(inputs,ctx,false,shocks)};
  });
  const rows=results.map(({name,year,years,result})=>{const last=result.rows[result.rows.length-1];return `<tr><td>${name}</td><td>${year}</td><td>${years} years</td><td style="font-weight:700;color:${result.success?'var(--good)':'var(--danger)'};">${result.success?'Survives':'Shortfall'}</td><td>${result.success?'None':`Age ${result.firstShortfallAge||'-'} - ${labels[result.firstShortfallReason]||'Uncovered need'}`}</td><td>${fmtMoneyK(dv(last?last.investable:0,ctx.effectiveLifeExpectancy,inputs))}</td></tr>`;}).join('');
  host.innerHTML=`<div class="card no-autocollapse" style="border-left:4px solid #5a4fcf;"><h3 onclick="toggleCard(this)">Named Historical Stress Tests</h3><p style="font-size:15px;color:var(--muted);">Each named period uses its actual S&amp;P 500 returns, then returns to your regular assumptions. Inflation remains your selected assumption.</p><div class="table-scroll"><table><thead><tr><th>Period</th><th>Starts</th><th>Actual sequence</th><th>Result</th><th>First shortfall</th><th>Ending investable</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function renderHistoricalBacktest(inputs, ctx) {
  const backtest = runHistoricalBacktest(inputs, ctx);
  const headlineEl = els('historicalBacktestHeadline');
  if (headlineEl) {
    headlineEl.innerHTML = (backtest.successRate === null || !backtest.results.length)
      ? 'Your plan’s horizon is longer than the historical data available to test it against.'
      : `<b>${Math.round(backtest.successRate)}%</b> of real historical stretches (starting anywhere from ${backtest.results[0].startYear} to ${backtest.results[backtest.results.length-1].startYear}) would have fully funded this plan, based on actual S&amp;P 500 returns for however many years your plan runs from each starting point.`;
  }
  const canvas = els('chart_historical_backtest');
  if (!canvas || !backtest.results.length) return;
  const labels = backtest.results.map(r => String(r.startYear));
  const data = backtest.results.map(r => dv(r.endingBalance, inputs.lifeExpectancy, inputs));
  const colors = backtest.results.map(r => r.success ? '#1f7a6c' : '#c0392b');
  const config = {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Ending investable balance', data, backgroundColor: colors, borderRadius: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: items => items.length ? 'Retiring starting ' + labels[items[0].dataIndex] : '',
            label: item => {
              const r = backtest.results[item.dataIndex];
              // No depletion age when the shortfall came from an uncovered pre-retirement Future Expense.
              return r.success ? 'Survived — ending balance ' + fmtMoney(item.parsed.y)
                : r.depletionAge ? 'Ran out of money at age ' + r.depletionAge
                : 'Hit a shortfall along the way';
            }
          }
        }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 15, font: { size: isMobile()?10:12 } } },
        y: { ticks: { callback: v => fmtMoneyK(v) } }
      }
    }
  };
  // 53+ bars: give each room and let the card scroll sideways.
  ensureChartHorizontalScroll(canvas, backtest.results.length * 13);
  if (charts.explorers_historical) {
    charts.explorers_historical.data = config.data; charts.explorers_historical.options = config.options; charts.explorers_historical.update();
  } else {
    charts.explorers_historical = new Chart(canvas.getContext('2d'), config);
  }
}

// ---------- Explorers: shared scenario helpers ----------
// Market Explorer's "three year sequence" preset; the same shocks back Scenario Comparison's
// "Sequence of returns risk" entry so the two stay identical.
const SEQUENCE_OF_RETURNS_SHOCKS = { post: { 0: -0.25, 1: -0.15, 2: 0.05 } };

// One scenario ({ name, apply?, special?, shocks? }) through a deterministic run plus a 1000-sim Monte
// Carlo. Used by Social Security Claiming.
function runExplorerScenario(scenario, baseInputs, baseCtx) {
  let inputs = baseInputs, ctx = baseCtx;
  if (scenario.special === 'payoffDebt') {
    const totalDebt = debts.reduce((s,d) => s + (+d.balance || 0), 0);
    const reducedTotal = Math.max(0, baseInputs.brokerageBalance - totalDebt);
    // Scale every pie down by the same % so the pooled total drops by totalDebt, keeping relative pie weights intact.
    const scale = baseInputs.brokerageBalance > 0 ? reducedTotal / baseInputs.brokerageBalance : 0;
    inputs = { ...baseInputs, brokerageBalance: reducedTotal, brokeragePieBalances: baseInputs.brokeragePieBalances.map(b => b * scale) };
    ctx = { ...baseCtx, debtSchedules: [] };
  } else if (scenario.apply) {
    inputs = scenario.apply(baseInputs);
  }
  const shocks = scenario.shocks || {};
  const det = projectRun(inputs, ctx, false, shocks);
  // 1000 runs, matching the Dashboard's baseline confidence score, so every Explorers scenario is
  // directly comparable to it (and to each other) at the same simulation count.
  const score = runMonteCarlo(inputs, ctx, 1000, shocks);
  const lastRow = det.rows.length ? det.rows[det.rows.length - 1] : null;
  return {
    name: scenario.name,
    investableAtRetirement: det.investableAtRetirement,
    retirementAge: inputs.retirementAge,
    depletionAge: det.depletionAge,
    endingBalance: lastRow ? lastRow.investable : det.investableAtRetirement,
    endingNetWorth: lastRow ? lastRow.netWorth : 0,
    endAge: lastRow ? lastRow.age : inputs.retirementAge,
    score
  };
}

// ---------- Explorers: Sensitivity / Tornado analysis ----------
// Moves five levers up and down one at a time to show which one moves the score most. About 3,300
// simulations, so it runs only from the "Run Analysis" button and is cached in sensitivityResults.
const SENSITIVITY_LEVERS = [
  { name: 'Retirement age',
    low: inp => ({ ...inp, retirementAge: inp.retirementAge - 2 }), lowLabel: '2 yrs earlier',
    high: inp => ({ ...inp, retirementAge: inp.retirementAge + 2 }), highLabel: '2 yrs later' },
  { name: 'Retirement spending',
    low: inp => ({ ...inp, spendingMultiplier: 0.9 }), lowLabel: '10% less',
    high: inp => ({ ...inp, spendingMultiplier: 1.1 }), highLabel: '10% more' },
  { name: 'Investment returns',
    low: inp => ({ ...inp, preReturn: inp.preReturn - 0.01, postReturn: inp.postReturn - 0.01 }), lowLabel: '1%/yr lower',
    high: inp => ({ ...inp, preReturn: inp.preReturn + 0.01, postReturn: inp.postReturn + 0.01 }), highLabel: '1%/yr higher' },
  { name: 'Social Security claiming age',
    low: inp => ({ ...inp, ssAge: 62, ssMonthly: ssMonthlyAtAge(inp, 62) }), lowLabel: 'Claim at 62',
    high: inp => ({ ...inp, ssAge: 70, ssMonthly: ssMonthlyAtAge(inp, 70) }), highLabel: 'Delay to 70' },
  { name: 'Guardrail band width',
    low: inp => ({ ...inp, guardBand: Math.max(0.05, inp.guardBand - 0.10) }), lowLabel: '10pp narrower',
    high: inp => ({ ...inp, guardBand: Math.min(0.40, inp.guardBand + 0.10) }), highLabel: '10pp wider' }
];

function runSensitivityAnalysis(inputs, ctx) {
  // 300 sims on every side so all bars compare directly. ctx is reused (these levers don't affect
  // buildContext()).
  const baselineScore = runMonteCarlo(inputs, ctx, 300);
  const results = SENSITIVITY_LEVERS.map(lever => {
    const scoreLow = runMonteCarlo(lever.low(inputs), ctx, 300);
    const scoreHigh = runMonteCarlo(lever.high(inputs), ctx, 300);
    const lowIsLowerScore = scoreLow <= scoreHigh;
    return {
      name: lever.name,
      lowScore: Math.min(scoreLow, scoreHigh),
      highScore: Math.max(scoreLow, scoreHigh),
      // Labels follow whichever variant actually produced the lower/higher score, not which side of
      // the lever ("low"/"high" input value) they came from — a tornado bar reads left-to-right by
      // resulting score, so the label needs to track the score, not the input direction.
      lowVariantLabel: lowIsLowerScore ? lever.lowLabel : lever.highLabel,
      highVariantLabel: lowIsLowerScore ? lever.highLabel : lever.lowLabel,
      span: Math.abs(scoreHigh - scoreLow)
    };
  });
  results.sort((a, b) => b.span - a.span);
  return { baselineScore, results };
}

let sensitivityResults = null;
function runSensitivityAnalysisAndRender() {
  const btn = els('sensitivityRunBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  // setTimeout lets the browser actually paint the disabled/"Running…" button state before the
  // synchronous ~3,300-simulation loop below blocks the main thread for a moment.
  setTimeout(() => {
    const inputs = readInputs();
    const ctx = buildContext(inputs);
    sensitivityResults = runSensitivityAnalysis(inputs, ctx);
    renderSensitivityAnalysis();
    if (btn) { btn.disabled = false; btn.textContent = 'Re-run Analysis'; }
  }, 20);
}

function renderSensitivityAnalysis() {
  const wrap = els('sensitivityResultWrap');
  if (!wrap) return;
  if (!sensitivityResults) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  const readout = els('sensitivityBaselineReadout');
  if (readout) readout.textContent = Math.round(sensitivityResults.baselineScore) + '%';

  const canvas = els('chart_sensitivity');
  if (!canvas) return;
  const labels = sensitivityResults.results.map(r => wrapChartLabel(r.name));
  const data = sensitivityResults.results.map(r => [r.lowScore, r.highScore]);
  const colors = sensitivityResults.results.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  const config = {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 4 }] },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          callbacks: {
            label: item => {
              const r = sensitivityResults.results[item.dataIndex];
              return `${r.lowVariantLabel}: ${Math.round(r.lowScore)}%  →  ${r.highVariantLabel}: ${Math.round(r.highScore)}%`;
            }
          }
        }
      },
      scales: {
        x: { min: 0, max: 100, ticks: { callback: v => v + '%' } },
        y: { ticks: { autoSkip: false, font: { size: isMobile() ? 11 : 13 } } }
      }
    }
  };
  sizeHorizontalChartCard(canvas, labels);
  if (charts.explorers_sensitivity) {
    charts.explorers_sensitivity.data = config.data;
    charts.explorers_sensitivity.options = config.options;
    charts.explorers_sensitivity.tornadoBaselineValue = sensitivityResults.baselineScore;
    charts.explorers_sensitivity.update();
  } else {
    charts.explorers_sensitivity = new Chart(canvas.getContext('2d'), config);
    charts.explorers_sensitivity.tornadoBaselineValue = sensitivityResults.baselineScore;
    charts.explorers_sensitivity.update();
  }
}

// ---------- Social Security Claiming-Age Optimizer ----------
// SSA adjustment factors vs. FRA 67 (born 1960+): -5/9 of 1% per month for the first 36 months early,
// -5/12 of 1% per month beyond that, +2/3 of 1% per month delayed to 70.
const SS_CLAIMING_FACTORS = { 62:0.700, 63:0.750, 64:0.800, 65:0.8667, 66:0.9333, 67:1.000, 68:1.080, 69:1.160, 70:1.240 };
// The entered age/amount is backed out to a PIA so every candidate age uses the same benefit. Ages
// outside 62-70 clamp to the nearest edge rather than getting a 1.0 factor.
function ssClaimingFactorForAge(age) {
  const clamped = Math.max(62, Math.min(70, Math.round(age)));
  return SS_CLAIMING_FACTORS[clamped] || 1;
}
function ssMonthlyAtAge(baseInputs, targetAge) {
  const enteredFactor = ssClaimingFactorForAge(baseInputs.ssAge);
  const pia = baseInputs.ssMonthly / enteredFactor;
  const targetFactor = ssClaimingFactorForAge(targetAge);
  return pia * targetFactor;
}
function runSSClaimingComparison(inputs, ctx) {
  const candidateAges = Array.from(new Set([62, 65, 67, 70, inputs.ssAge]))
    .filter(age => age >= 62 && age <= 70)
    .sort((a,b) => a-b);
  return candidateAges.map(age => {
    const scenario = {
      name: (age === inputs.ssAge ? 'Age ' + age + ' (current plan)' : 'Claim at age ' + age),
      apply: inp => ({ ...inp, ssAge: age, ssMonthly: ssMonthlyAtAge(inputs, age) })
    };
    const result = runExplorerScenario(scenario, inputs, ctx);
    return { ...result, ssAge: age, ssMonthly: ssMonthlyAtAge(inputs, age) };
  });
}
let ssComparisonResults = null;
function runSSComparisonAndRender() {
  const btn = els('ssComparisonRunBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  // Same setTimeout-before-blocking-work pattern as the Sensitivity Analysis button above, so the
  // disabled/"Running…" state actually paints before the ~5,000-simulation loop below runs synchronously.
  setTimeout(() => {
    const inputs = readInputs();
    const ctx = buildContext(inputs);
    ssComparisonResults = runSSClaimingComparison(inputs, ctx);
    renderSSComparison(inputs);
    if (btn) { btn.disabled = false; btn.textContent = 'Re-run Analysis'; }
  }, 20);
}
function renderSSComparison(inputs) {
  const wrap = els('ssComparisonResultWrap');
  if (!wrap) return;
  if (!ssComparisonResults) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  inputs = inputs || readInputs();
  const rowsHtml = ssComparisonResults.map(r => `
    <tr${r.ssAge === inputs.ssAge ? ' style="font-weight:700;"' : ''}>
      <td>${r.name}</td>
      <td>${fmtMoney(r.ssMonthly)}/mo</td>
      <td>${fmtMoney(dv(r.endingNetWorth, r.endAge, inputs))}</td>
      <td>${Math.round(r.score)}%</td>
    </tr>`).join('');
  if (els('ssComparisonRows')) els('ssComparisonRows').innerHTML = rowsHtml;
  const config = barConfig(ssComparisonResults.map(r => r.name), ssComparisonResults.map(r => r.score), { percent:true, horizontal:true, showValues:true });
  const canvas = els('chart_sscomparison');
  if (canvas) {
    sizeHorizontalChartCard(canvas, config.data.labels);
    if (charts.explorers_sscomparison) {
      charts.explorers_sscomparison.data = config.data; charts.explorers_sscomparison.options = config.options; charts.explorers_sscomparison.update();
    } else {
      charts.explorers_sscomparison = new Chart(canvas.getContext('2d'), config);
    }
  }
}

// ---------- Scenario Comparison (multi-select, side-by-side) ----------
// One shape for every scenario: build(inputs, ctx) => {inputs, ctx, shocks}, so any mix can be compared
// in one table/chart. Kept separate from the What-If lists so changes there can't break this.
const COMPARE_SCENARIO_LIBRARY = [
  { name: 'Retire 2 years earlier', build: (inputs, ctx) => ({ inputs: { ...inputs, retirementAge: inputs.retirementAge - 2 }, ctx }) },
  { name: 'Retire 2 years later', build: (inputs, ctx) => ({ inputs: { ...inputs, retirementAge: inputs.retirementAge + 2 }, ctx }) },
  { name: 'Spend 10% less in retirement', build: (inputs, ctx) => ({ inputs: { ...inputs, spendingMultiplier: 0.9 }, ctx }) },
  { name: 'Spend 10% more in retirement', build: (inputs, ctx) => ({ inputs: { ...inputs, spendingMultiplier: 1.1 }, ctx }) },
  { name: 'Claim Social Security at 62', build: (inputs, ctx) => ({ inputs: { ...inputs, ssAge: 62, ssMonthly: ssMonthlyAtAge(inputs, 62) }, ctx }) },
  { name: 'Delay Social Security to 70', build: (inputs, ctx) => ({ inputs: { ...inputs, ssAge: 70, ssMonthly: ssMonthlyAtAge(inputs, 70) }, ctx }) },
  { name: 'Contribute 5% more to TSP', build: (inputs, ctx) => ({ inputs: { ...inputs, tradPct: inputs.tradPct + 0.05 }, ctx }) },
  { name: 'Pay off all debt today',
    build: (inputs, ctx) => {
      const totalDebt = debts.reduce((s,d) => s + (+d.balance || 0), 0);
      const reducedTotal = Math.max(0, inputs.brokerageBalance - totalDebt);
      const scale = inputs.brokerageBalance > 0 ? reducedTotal / inputs.brokerageBalance : 0;
      return { inputs: { ...inputs, brokerageBalance: reducedTotal, brokeragePieBalances: inputs.brokeragePieBalances.map(b => b * scale) }, ctx: { ...ctx, debtSchedules: [] } };
    } },
  { name: 'Live 5 years longer than expected',
    build: (inputs) => { const newInputs = { ...inputs, lifeExpectancy: inputs.lifeExpectancy + 5 }; return { inputs: newInputs, ctx: buildContext(newInputs) }; } },
  { name: 'Achieve 1% higher average return', build: (inputs, ctx) => ({ inputs: { ...inputs, preReturn: inputs.preReturn + 0.01, postReturn: inputs.postReturn + 0.01 }, ctx }) },
  { name: 'Achieve 1% lower average return', build: (inputs, ctx) => ({ inputs: { ...inputs, preReturn: inputs.preReturn - 0.01, postReturn: inputs.postReturn - 0.01 }, ctx }) },
  { name: 'Take out a $50k loan',
    build: (inputs, ctx) => {
      const payment = mortgagePayment(50000, 9, 5);
      const loanSchedule = buildDebtSchedule({ apr: 9, balance: 50000, payment }, ctx.maxYears);
      return { inputs: { ...inputs, hysaBalance: inputs.hysaBalance + 50000 }, ctx: { ...ctx, debtSchedules: [...ctx.debtSchedules, loanSchedule] } };
    } },
  { name: 'Have an unexpected $50k expense in 5 years',
    build: (inputs, ctx) => ({ inputs, ctx: { ...ctx, futureExpensesOverride: [...futureExpenses, { name: 'Unexpected expense', age: inputs.currentAge + 5, amount: 50000, recurring: false }] } }) },
  { name: '2008-style crash right after retiring', build: (inputs, ctx) => ({ inputs, ctx, shocks: { post: { 1: -0.37 } } }) },
  { name: 'Prolonged bear market (-3%/yr)', build: (inputs, ctx) => ({ inputs: { ...inputs, preReturn: inputs.preReturn - 0.03, postReturn: inputs.postReturn - 0.03 }, ctx }) },
  { name: 'High inflation (+3%)', build: (inputs, ctx) => ({ inputs: { ...inputs, inflation: inputs.inflation + 0.03, medicalInflation: inputs.medicalInflation + 0.03, ssCola: inputs.ssCola + 0.01 }, ctx }) },
  { name: 'Sequence of returns risk (rough first 3 yrs)', build: (inputs, ctx) => ({ inputs, ctx, shocks: SEQUENCE_OF_RETURNS_SHOCKS }) },
  { name: 'Stagflation (weak returns + high inflation)', build: (inputs, ctx) => ({ inputs: { ...inputs, preReturn: inputs.preReturn - 0.03, postReturn: inputs.postReturn - 0.03, inflation: inputs.inflation + 0.03, medicalInflation: inputs.medicalInflation + 0.03, ssCola: inputs.ssCola + 0.01 }, ctx }) }
];
// The library plus, once a death age is set on the Survivorship page, the survivorship what-if
// (never part of the baseline plan or the confidence score).
function compareScenarioList() {
  const deathAgeEl = els('survivorshipDeathAge');
  const deathAge = deathAgeEl ? (+deathAgeEl.value || 0) : 0;
  if (!(deathAge > 0)) return COMPARE_SCENARIO_LIBRARY;
  return [...COMPARE_SCENARIO_LIBRARY, {
    name: `You predecease your spouse at age ${deathAge} (SBP + DIC)`,
    build: (inputs, ctx) => ({ inputs: { ...inputs, survivorshipEnabled: true }, ctx })
  }];
}
let selectedCompareScenarios = [];
function toggleCompareScenario(idx) {
  const pos = selectedCompareScenarios.indexOf(idx);
  if (pos >= 0) selectedCompareScenarios.splice(pos, 1); else selectedCompareScenarios.push(idx);
  renderCompareCardGrid();
}
function renderCompareCardGrid() {
  const grid = els('compareCardGrid');
  if (!grid) return;
  // Drop a selected survivorship entry if the death age was cleared since it was picked.
  const list = compareScenarioList();
  selectedCompareScenarios = selectedCompareScenarios.filter(i => i < list.length);
  grid.innerHTML = list.map((s, i) => `
    <div class="whatif-card multi ${selectedCompareScenarios.includes(i) ? 'selected' : ''}" onclick="toggleCompareScenario(${i})">
      <span>${s.name}</span>
      <span class="whatif-radio"></span>
    </div>
  `).join('');
}
// One entry through a deterministic run plus a 1000-sim Monte Carlo; also returns `rows` for the
// savings-over-time chart.
function runComparisonEntry(name, inputs, ctx, shocks) {
  shocks = shocks || {};
  const det = projectRun(inputs, ctx, false, shocks);
  const score = runMonteCarlo(inputs, ctx, 1000, shocks);
  const lastRow = det.rows.length ? det.rows[det.rows.length - 1] : null;
  return {
    name, investableAtRetirement: det.investableAtRetirement, retirementAge: inputs.retirementAge,
    depletionAge: det.depletionAge, endingBalance: lastRow ? lastRow.investable : det.investableAtRetirement,
    endingNetWorth: lastRow ? lastRow.netWorth : 0, endAge: lastRow ? lastRow.age : inputs.retirementAge,
    score, rows: det.rows
  };
}
function runScenarioCompare(baseInputs, baseCtx, selectedIndices) {
  const entries = [runComparisonEntry('Current Plan', baseInputs, baseCtx)];
  const list = compareScenarioList();
  selectedIndices.forEach(i => {
    const s = list[i];
    if (!s) return;
    const built = s.build(baseInputs, baseCtx);
    entries.push(runComparisonEntry(s.name, built.inputs, built.ctx, built.shocks));
  });
  return entries;
}
let compareResults = null;
function runScenarioCompareAndRender() {
  const btn = els('compareRunBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  // Same setTimeout-before-blocking-work pattern as Sensitivity/SS Comparison above, so the disabled/
  // "Running…" state actually paints before the (numSelected+1) x 1000-simulation loop runs synchronously.
  setTimeout(() => {
    const inputs = readInputs();
    const ctx = buildContext(inputs);
    compareResults = runScenarioCompare(inputs, ctx, selectedCompareScenarios);
    renderScenarioCompare(inputs);
    if (btn) { btn.disabled = false; btn.textContent = 'Re-run Comparison'; }
  }, 20);
}
function renderScenarioCompare(inputs) {
  const wrap = els('compareResultWrap');
  if (!wrap) return;
  if (!compareResults) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  inputs = inputs || readInputs();
  const rowsHtml = compareResults.map(r => `
    <tr${r.name === 'Current Plan' ? ' style="font-weight:700;"' : ''}>
      <td>${r.name}</td>
      <td>${fmtMoney(dv(r.investableAtRetirement, r.retirementAge, inputs))}</td>
      <td>${fmtMoney(dv(r.endingBalance, r.endAge, inputs))}</td>
      <td>${fmtMoney(dv(r.endingNetWorth, r.endAge, inputs))}</td>
      <td>${r.depletionAge ? 'Age ' + r.depletionAge : 'Never'}</td>
      <td>${Math.round(r.score)}%</td>
    </tr>`).join('');
  if (els('compareRows')) els('compareRows').innerHTML = rowsHtml;

  const scoreConfig = barConfig(compareResults.map(r => r.name), compareResults.map(r => r.score), { percent:true, horizontal:true, showValues:true });
  const scoreCanvas = els('chart_compare_score');
  if (scoreCanvas) {
    sizeHorizontalChartCard(scoreCanvas, scoreConfig.data.labels);
    ensureChartHorizontalScroll(scoreCanvas, 460);
    if (charts.explorers_compare_score) { charts.explorers_compare_score.data = scoreConfig.data; charts.explorers_compare_score.options = scoreConfig.options; charts.explorers_compare_score.update(); }
    else charts.explorers_compare_score = new Chart(scoreCanvas.getContext('2d'), scoreConfig);
  }

  // Savings-over-time overlay: one line per entry (baseline + each selected scenario) on a shared age
  // axis — the same "investable + cash" figure the What-If Cards savings chart above uses, just able to
  // show however many scenarios are selected at once instead of only one against baseline.
  const savingsCanvas = els('chart_compare_savings');
  if (savingsCanvas) {
    const longestRows = compareResults.reduce((longest, r) => r.rows.length > longest.length ? r.rows : longest, []);
    const ages = longestRows.map(r => r.age);
    const savingsByYear = rows => ages.map((age, i) => rows[i] ? dv(rows[i].investable + rows[i].cash, rows[i].age, inputs) : null);
    const series = compareResults.map((r, i) => ({
      label: r.name, data: savingsByYear(r.rows),
      borderColor: r.name === 'Current Plan' ? '#132a3e' : CHART_COLORS[(i-1) % CHART_COLORS.length],
      backgroundColor: r.name === 'Current Plan' ? '#132a3e' : CHART_COLORS[(i-1) % CHART_COLORS.length],
      borderWidth: r.name === 'Current Plan' ? 3 : 2, fill: false, pointRadius: 0, tension: 0
    }));
    const config = {
      type: 'line',
      data: { labels: ages.map(a => 'Age ' + a), datasets: series },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', axis: 'x', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: isMobile()?11:13 } } },
          tooltip: { enabled: true, callbacks: { label: item => item.dataset.label + ': ' + fmtMoney(item.parsed.y) } }
        },
        scales: {
          x: { ticks: { autoSkip: true, maxTicksLimit: 12, font: { size: isMobile()?11:13 } } },
          y: { ticks: { callback: v => fmtMoneyK(v) } }
        }
      }
    };
    ensureChartHorizontalScroll(savingsCanvas, ages.length * 13);
    if (charts.explorers_compare_savings) { charts.explorers_compare_savings.data = config.data; charts.explorers_compare_savings.options = config.options; charts.explorers_compare_savings.update(); }
    else charts.explorers_compare_savings = new Chart(savingsCanvas.getContext('2d'), config);
  }
}

// ---------- Withdrawal Order Optimizer (Money Flows page) ----------
// Scores a handful of realistic withdrawal orders (taxable-first, tax-deferred-first, cash-first,
// tax-free-first) against your real accounts with Monte Carlo, using runComparisonEntry.
const WITHDRAWAL_ORDER_STRATEGIES = [
  { name: 'Your current order', buildOrder: (keys, current) => current },
  { name: 'Taxable-first (brokerage → Traditional → cash → Roth last)',
    buildOrder: keys => [...keys.filter(k => k.startsWith('pie_')), 'trad', 'hysa', 'roth'].filter(k => keys.includes(k)) },
  { name: 'Traditional-first (spend down tax-deferred before RMDs force it)',
    buildOrder: keys => ['trad', ...keys.filter(k => k.startsWith('pie_')), 'hysa', 'roth'].filter(k => keys.includes(k)) },
  { name: 'Cash-first (preserve tax-advantaged growth longest)',
    buildOrder: keys => ['hysa', ...keys.filter(k => k.startsWith('pie_')), 'trad', 'roth'].filter(k => keys.includes(k)) },
  { name: 'Roth-first (spend tax-free growth first)',
    buildOrder: keys => ['roth', ...keys.filter(k => k.startsWith('pie_')), 'trad', 'hysa'].filter(k => keys.includes(k)) }
];
function runWithdrawalOrderOptimizer(inputs, ctx) {
  // Respect any accounts the user has excluded from withdrawals (e.g. a protected
  // HYSA emergency fund) — only compare orderings across the accounts actually in play.
  const keys = getWithdrawalAccountKeys().filter(k => inputs.withdrawalOrder.includes(k));
  return WITHDRAWAL_ORDER_STRATEGIES.map(strat => {
    const order = strat.buildOrder(keys, inputs.withdrawalOrder);
    const entry = runComparisonEntry(strat.name, { ...inputs, withdrawalOrder: order }, ctx);
    return { ...entry, order };
  });
}
let withdrawalOrderOptimizerResults = null;
function runWithdrawalOrderOptimizerAndRender() {
  const btn = els('withdrawalOptimizerRunBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  setTimeout(() => {
    const inputs = readInputs();
    const ctx = buildContext(inputs);
    withdrawalOrderOptimizerResults = runWithdrawalOrderOptimizer(inputs, ctx);
    renderWithdrawalOrderOptimizer(inputs);
    if (btn) { btn.disabled = false; btn.textContent = 'Re-run'; }
  }, 20);
}
function withdrawalAccountLabel(k) {
  if (k === 'trad') return 'Traditional TSP';
  if (k === 'roth') return 'Roth TSP';
  if (k === 'hysa') return 'HYSA/Cash';
  const pie = brokeragePies[+String(k).split('_')[1]];
  return pie ? (pie.name || 'Brokerage pie') : k;
}
function renderWithdrawalOrderOptimizer(inputs) {
  const wrap = els('withdrawalOptimizerResultWrap');
  if (!wrap) return;
  if (!withdrawalOrderOptimizerResults) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  inputs = inputs || readInputs();
  const best = withdrawalOrderOptimizerResults.reduce((b, r) => r.score > b.score ? r : b, withdrawalOrderOptimizerResults[0]);
  const headlineEl = els('withdrawalOptimizerHeadline');
  if (headlineEl) {
    headlineEl.innerHTML = best.name === 'Your current order'
      ? `Your current order already scores best of these (<b>${Math.round(best.score)}%</b>).`
      : `Best of these: <b>${best.name}</b> — <b>${Math.round(best.score)}%</b> confidence score.`;
  }
  const rowsHtml = withdrawalOrderOptimizerResults.map(r => `
    <tr${r === best ? ' style="font-weight:700;"' : ''}>
      <td>${r.name}</td>
      <td>${r.order.map(withdrawalAccountLabel).join(' → ')}</td>
      <td>${fmtMoney(dv(r.endingNetWorth, r.endAge, inputs))}</td>
      <td>${Math.round(r.score)}%</td>
    </tr>`).join('');
  if (els('withdrawalOptimizerRows')) els('withdrawalOptimizerRows').innerHTML = rowsHtml;
  const config = barConfig(withdrawalOrderOptimizerResults.map(r => r.name), withdrawalOrderOptimizerResults.map(r => r.score), { percent:true, horizontal:true, showValues:true });
  const canvas = els('chart_withdrawal_optimizer');
  if (canvas) {
    sizeHorizontalChartCard(canvas, config.data.labels);
    if (charts.withdrawal_optimizer) { charts.withdrawal_optimizer.data = config.data; charts.withdrawal_optimizer.options = config.options; charts.withdrawal_optimizer.update(); }
    else charts.withdrawal_optimizer = new Chart(canvas.getContext('2d'), config);
  }
}

// ---------- Plan vs. Actual Checkpoint Tracker (Investments page) ----------
// Pin the plan's projection as a baseline, then save checkpoints of real balances and compare each to
// what the baseline projected for that age. Stored in their own keys, separate from the main state.
const CHECKPOINT_BASELINE_KEY = 'retirementPlannerCheckpointBaseline_v1';
const CHECKPOINT_HISTORY_KEY = 'retirementPlannerCheckpointHistory_v1';
let checkpointBaseline = null;
let checkpointHistory = [];

function loadCheckpointData() {
  try {
    const rawBaseline = localStorage.getItem(CHECKPOINT_BASELINE_KEY);
    if (rawBaseline) checkpointBaseline = JSON.parse(rawBaseline);
  } catch (e) { /* storage unavailable or corrupt, ignore */ }
  try {
    const rawHistory = localStorage.getItem(CHECKPOINT_HISTORY_KEY);
    if (rawHistory) checkpointHistory = JSON.parse(rawHistory) || [];
  } catch (e) { /* storage unavailable or corrupt, ignore */ }
}
function persistCheckpointBaseline() {
  try { localStorage.setItem(CHECKPOINT_BASELINE_KEY, JSON.stringify(checkpointBaseline)); } catch (e) { /* storage unavailable, ignore */ }
}
function persistCheckpointHistory() {
  try { localStorage.setItem(CHECKPOINT_HISTORY_KEY, JSON.stringify(checkpointHistory)); } catch (e) { /* storage unavailable, ignore */ }
}

function actualCheckpointToday(inputs) {
  const investable = inputs.tradTSPBalance + inputs.rothTSPBalance + inputs.brokerageBalance;
  const cash = inputs.checkingBalance + inputs.savingsBalance + inputs.hysaBalance;
  const currentDebt = debts.reduce((sum, debt) => {
    const startsInFuture = debt.startAge != null && debt.startAge !== '' && +debt.startAge > inputs.currentAge;
    return sum + (startsInFuture ? 0 : (+debt.balance || 0));
  }, 0);
  const currentVehicles = debts.reduce((sum, debt) => {
    const activeNow = debt.startAge == null || debt.startAge === '' || +debt.startAge <= inputs.currentAge;
    return sum + (activeNow && debt.category === 'Auto Loan' ? (+debt.assetValue || 0) : 0);
  }, 0);
  return { age: inputs.currentAge, investable, netWorth: investable + cash + currentVehicles - currentDebt };
}

function setCheckpointBaseline() {
  const inputs = readInputs();
  const ctx = buildContext(inputs);
  const result = projectRun(inputs, ctx, false);
  checkpointBaseline = {
    createdDate: new Date().toISOString().slice(0,10),
    createdAge: inputs.currentAge,
    rows: result.rows.map(r => r.age === inputs.currentAge
      ? actualCheckpointToday(inputs)
      : ({ age: r.age, investable: r.investable, netWorth: r.netWorth }))
  };
  persistCheckpointBaseline();
  renderCheckpointTracker(inputs, result.rows);
}

function resetCheckpointBaseline() {
  if (!confirm('Reset the baseline? Your saved checkpoint history will stay, but drift will be recalculated against a new baseline once you set one.')) return;
  checkpointBaseline = null;
  persistCheckpointBaseline();
  const inputs = readInputs();
  renderCheckpointTracker(inputs, null);
}

function baselineProjectedAtAge(age) {
  if (!checkpointBaseline) return null;
  return checkpointBaseline.rows.find(r => r.age === age) || null;
}

function saveCheckpointSnapshot() {
  if (!checkpointBaseline) return;
  const inputs = readInputs();
  const ctx = buildContext(inputs);
  const result = projectRun(inputs, ctx, false);
  const cur = actualCheckpointToday(inputs);
  checkpointHistory.push({ date: new Date().toISOString().slice(0,10), age: inputs.currentAge, investable: cur.investable, netWorth: cur.netWorth });
  persistCheckpointHistory();
  renderCheckpointTracker(inputs, result.rows);
}

function deleteCheckpointEntry(idx) {
  checkpointHistory.splice(idx, 1);
  persistCheckpointHistory();
  const inputs = readInputs();
  renderCheckpointTracker(inputs, null);
}

function renderCheckpointTracker(inputs, rows) {
  const noBaselineEl = els('checkpointNoBaseline');
  const hasBaselineEl = els('checkpointHasBaseline');
  if (!noBaselineEl || !hasBaselineEl) return;
  if (!checkpointBaseline) {
    noBaselineEl.style.display = 'block';
    hasBaselineEl.style.display = 'none';
    return;
  }
  noBaselineEl.style.display = 'none';
  hasBaselineEl.style.display = 'block';
  if (els('checkpointBaselineInfo')) els('checkpointBaselineInfo').textContent = `Baseline set ${checkpointBaseline.createdDate}, at age ${checkpointBaseline.createdAge}.`;

  const rowsHtml = checkpointHistory.map((cp, idx) => ({ cp, idx })).slice().reverse().map(({ cp, idx }) => {
    const base = baselineProjectedAtAge(cp.age);
    const baseInvestable = base ? base.investable : null;
    const drift = baseInvestable != null ? cp.investable - baseInvestable : null;
    const driftPct = baseInvestable ? (drift / baseInvestable * 100) : null;
    const driftColor = drift == null ? 'var(--muted)' : (drift >= 0 ? 'var(--teal)' : '#c0392b');
    const driftText = drift == null ? 'No baseline data for this age' : `${drift >= 0 ? '+' : ''}${fmtMoney(drift)}${driftPct != null ? ' (' + driftPct.toFixed(1) + '%)' : ''}`;
    return `<tr>
      <td>${cp.date}</td>
      <td>Age ${cp.age}</td>
      <td>${fmtMoney(cp.investable)}</td>
      <td>${baseInvestable != null ? fmtMoney(baseInvestable) : '—'}</td>
      <td style="color:${driftColor};font-weight:600;">${driftText}</td>
      <td><button class="remove-btn" onclick="deleteCheckpointEntry(${idx})" title="Delete this checkpoint">×</button></td>
    </tr>`;
  }).join('');
  if (els('checkpointRows')) els('checkpointRows').innerHTML = rowsHtml || '<tr><td colspan="6" style="color:var(--muted);">No checkpoints saved yet — click "Save Checkpoint" any time you update your real account balances.</td></tr>';

  const ages = checkpointBaseline.rows.map(r => r.age);
  const baseVals = checkpointBaseline.rows.map(r => dv(r.investable, r.age, inputs));
  const actualByAge = {};
  checkpointHistory.forEach(cp => { actualByAge[cp.age] = cp.investable; });
  const actualVals = ages.map(a => actualByAge[a] != null ? dv(actualByAge[a], a, inputs) : null);
  const canvas = els('chart_checkpoint_tracker');
  if (canvas) {
    const config = {
      type: 'line',
      data: {
        labels: ages.map(a => 'Age ' + a),
        datasets: [
          { label: 'Original Plan (Baseline)', data: baseVals, borderColor: '#1f7a6c', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.15 },
          { label: 'Actual (Checkpoints)', data: actualVals, borderColor: '#c0392b', backgroundColor: '#c0392b', borderWidth: 0, pointRadius: 6, pointHoverRadius: 7, showLine: false, spanGaps: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { ticks: { callback: v => fmtMoney(v) } } },
        plugins: { legend: { display: true, position: 'bottom' } }
      }
    };
    if (charts.checkpoint_tracker) { charts.checkpoint_tracker.data = config.data; charts.checkpoint_tracker.options = config.options; charts.checkpoint_tracker.update(); }
    else charts.checkpoint_tracker = new Chart(canvas.getContext('2d'), config);
  }
}

// ---------- Inherited-Account Tax Breakdown (Estate Planning page) ----------
// Roughly what heirs would net at the plan's final row: Roth TSP tax-free; Traditional TSP taxed as
// ordinary income over 10 years (SECURE Act) at one assumed flat rate; taxable brokerage and home get a
// stepped-up basis; cash is after-tax; remaining debt is subtracted. Illustrative only; beneficiary
// designations, state law, trusts and probate aren't modeled.
function renderInheritedAccountBreakdown(inputs, rows) {
  const wrap = els('heirBreakdownWrap');
  if (!wrap || !rows.length) return;
  const last = rows[rows.length - 1];
  const heirRate = Math.max(0, Math.min(100, +els('heirTaxRate').value || 0)) / 100;

  const trad = Math.max(0, last.balTrad || 0);
  const roth = Math.max(0, last.balRoth || 0);
  const taxableBrokerage = Math.max(0, (last.balBrokeragePies || []).reduce((s, b, i) =>
    s + ((!inputs.brokeragePieAccountTypes || inputs.brokeragePieAccountTypes[i] !== 'roth_ira') ? b : 0), 0));
  const rothIra = Math.max(0, (last.balBrokeragePies || []).reduce((s, b, i) =>
    s + ((inputs.brokeragePieAccountTypes && inputs.brokeragePieAccountTypes[i] === 'roth_ira') ? b : 0), 0));
  const cash = Math.max(0, last.cash || 0);
  const homeEquity = Math.max(0, last.homeEquity || 0);
  const debt = Math.max(0, last.debtBalance || 0);

  const tradTaxOwed = trad * heirRate;
  const tradAfterTax = trad - tradTaxOwed;
  const grossEstate = trad + roth + rothIra + taxableBrokerage + cash + homeEquity;
  const afterTaxEstate = tradAfterTax + roth + rothIra + taxableBrokerage + cash + homeEquity - debt;
  const d = v => dv(v, last.age, inputs);

  if (els('heirBreakdownHeadline')) {
    els('heirBreakdownHeadline').innerHTML = `At age ${last.age} (the last modeled year), your plan projects a gross estate of <b>${fmtMoney(d(grossEstate))}</b>. After an assumed ${(heirRate*100).toFixed(0)}% tax on inherited Traditional TSP withdrawals and paying off any remaining debt, heirs would net roughly <b>${fmtMoney(d(afterTaxEstate))}</b>.`;
  }

  const rowsData = [
    { label: 'Traditional TSP', gross: trad, tax: tradTaxOwed, net: tradAfterTax, note: `Taxed as ordinary income to heirs over 10 years — ${(heirRate*100).toFixed(0)}% assumed rate` },
    { label: 'Roth TSP', gross: roth, tax: 0, net: roth, note: 'Tax-free to heirs' },
    { label: 'Roth IRA', gross: rothIra, tax: 0, net: rothIra, note: 'Tax-free to heirs' },
    { label: 'Brokerage (taxable)', gross: taxableBrokerage, tax: 0, net: taxableBrokerage, note: 'Step-up in cost basis at death — no capital gains tax on an immediate sale' },
    { label: 'Home equity', gross: homeEquity, tax: 0, net: homeEquity, note: homeEquity > 0 ? 'Step-up in cost basis at death' : 'Not modeling a home purchase' },
    { label: 'Cash (checking/savings/HYSA)', gross: cash, tax: 0, net: cash, note: 'Already after-tax' },
    { label: 'Less: remaining debt', gross: -debt, tax: 0, net: -debt, note: debt > 0 ? 'Paid off before heirs receive the remainder' : 'No debt remaining' }
  ];
  if (els('heirBreakdownRows')) {
    els('heirBreakdownRows').innerHTML = rowsData.map(r => `
      <tr>
        <td>${r.label}</td>
        <td>${fmtMoney(d(r.gross))}</td>
        <td>${r.tax > 0 ? '-' + fmtMoney(d(r.tax)) : '—'}</td>
        <td style="font-weight:600;">${fmtMoney(d(r.net))}</td>
        <td style="color:var(--muted);font-size:14px;">${r.note}</td>
      </tr>`).join('') + `
      <tr style="font-weight:700;border-top:2px solid var(--border);">
        <td>Total to heirs (after tax)</td><td></td><td></td><td>${fmtMoney(d(afterTaxEstate))}</td><td></td>
      </tr>`;
  }

  const canvas = els('chart_heir_breakdown');
  if (canvas) {
    const labels = ['Traditional TSP', 'Roth TSP', 'Roth IRA', 'Brokerage', 'Home equity', 'Cash'];
    const grossVals = [trad, roth, rothIra, taxableBrokerage, homeEquity, cash].map(d);
    const netVals = [tradAfterTax, roth, rothIra, taxableBrokerage, homeEquity, cash].map(d);
    const config = {
      type: 'bar',
      data: {
        labels: labels.map(l => wrapChartLabel(l)),
        datasets: [
          { label: 'Gross balance', data: grossVals, backgroundColor: '#8aa0b8', borderRadius: 3 },
          { label: 'Net to heirs (after tax)', data: netVals, backgroundColor: '#1f7a6c', borderRadius: 3 }
        ]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'nearest', axis: 'y', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: isMobile()?11:13 } } },
          tooltip: { enabled: true, callbacks: { label: item => item.dataset.label + ': ' + fmtMoney(item.parsed.x) } }
        },
        scales: {
          x: { ticks: { callback: v => fmtMoney(v) } },
          y: { ticks: { autoSkip: false, font: { size: isMobile()?11:13 } } }
        }
      }
    };
    sizeHorizontalChartCard(canvas, labels);
    if (charts.heir_breakdown) { charts.heir_breakdown.data = config.data; charts.heir_breakdown.options = config.options; charts.heir_breakdown.update(); }
    else charts.heir_breakdown = new Chart(canvas.getContext('2d'), config);
  }
}

// ---------- Market Explorer (Explorers page, mimics Boldin's own Market Downturn tab) ----------
// Shocks object pinning `returnDuringDownturn` for `durationYears` from `startAge`, split into pre/post
// retirement buckets automatically.
function buildDownturnShocks(inputs, startAge, durationYears, returnDuringDownturn) {
  const shocks = { pre: {}, post: {} };
  for (let i = 0; i < durationYears; i++) {
    const age = startAge + i;
    if (age < inputs.retirementAge) shocks.pre[age - inputs.currentAge] = returnDuringDownturn;
    else shocks.post[age - inputs.retirementAge] = returnDuringDownturn;
  }
  return shocks;
}
function successBucketText(score) {
  if (score < 15) return 'Under 15%';
  if (score < 50) return '15–49%';
  if (score < 75) return '50–74%';
  if (score < 95) return '75–94%';
  return '95%+';
}
const MARKET_EXPLORER_PRESETS = [
  { key: 'decade', name: 'A decade of poor returns' },
  { key: 'threeyear', name: 'A three year sequence of bad returns' },
  { key: 'custom', name: 'Create a Downturn' }
];
let marketExplorerScenario = 'custom'; // matches Boldin's own default-selected card
function selectMarketExplorerScenario(key) {
  if (!MARKET_EXPLORER_PRESETS.some(p => p.key === key)) return;
  marketExplorerScenario = key;
  // Update the cards/custom panel before the 1,000-run calculation starts so the click is visible.
  renderMarketExplorerCards();
  const result = els('marketExplorerResult');
  if (result) result.innerHTML = '<div class="market-explorer-detail">Calculating this market scenario...</div>';
  setTimeout(() => {
    const inputs = readInputs();
    renderMarketExplorer(inputs, buildContext(inputs));
  }, 20);
}
function renderMarketExplorerCards() {
  const grid = els('marketExplorerCardGrid');
  if (!grid) return;
  grid.innerHTML = MARKET_EXPLORER_PRESETS.map(p => `
    <button type="button" class="whatif-card ${marketExplorerScenario === p.key ? 'selected' : ''}" onclick="selectMarketExplorerScenario('${p.key}')">
      <span>${p.name}</span>
      <span class="whatif-radio"></span>
    </button>
  `).join('');
  const panel = els('marketExplorerCustomPanel');
  if (panel) panel.style.display = marketExplorerScenario === 'custom' ? 'block' : 'none';
}
// Turns whichever card is selected into a concrete shocks object + display metadata.
function buildMarketExplorerShocksAndMeta(inputs) {
  if (marketExplorerScenario === 'decade') {
    const startAge = Math.max(inputs.currentAge, inputs.retirementAge);
    return { shocks: buildDownturnShocks(inputs, startAge, 10, 0.01), name: 'A decade of poor returns' };
  }
  if (marketExplorerScenario === 'threeyear') {
    return { shocks: SEQUENCE_OF_RETURNS_SHOCKS, name: 'A three year sequence of bad returns' };
  }
  const startAgeEl = els('mktExplorerStartAge');
  const durationEl = els('mktExplorerDuration');
  const dropPctEl = els('mktExplorerDropPct');
  const startAge = (startAgeEl && startAgeEl.value !== '') ? +startAgeEl.value : inputs.retirementAge;
  const duration = Math.max(1, (durationEl && durationEl.value !== '') ? +durationEl.value : 3);
  const dropPct = (dropPctEl && dropPctEl.value !== '' && !isNaN(+dropPctEl.value)) ? +dropPctEl.value : 25;
  return {
    shocks: buildDownturnShocks(inputs, startAge, duration, -dropPct / 100),
    name: 'Create a Downturn', startAge, duration, dropPct
  };
}
function renderMarketExplorerResult(score, meta) {
  const el = els('marketExplorerResult');
  if (!el) return;
  const bucket = successBucketText(score);
  const headline = marketExplorerScenario === 'custom'
    ? `Based on a custom downturn your Chance of Success could be <b>${bucket}</b>`
    : `Based on "${meta.name}" your Chance of Success could be <b>${bucket}</b>`;
  let detail = '';
  if (marketExplorerScenario === 'custom') {
    detail = `<div class="market-explorer-detail">Start of downturn: Age <b>${meta.startAge}</b> &nbsp;&nbsp; Annual returns during downturn: <b>-${meta.dropPct}%/yr</b> &nbsp;&nbsp; Downturn duration: <b>${meta.duration} year${meta.duration===1?'':'s'}</b></div>`;
  }
  el.innerHTML = `<div class="market-explorer-headline">${headline}</div>${detail}`;
}
function marketExplorerChartConfig(ages, baseData, scenarioData) {
  return {
    type: 'bar',
    data: {
      labels: ages.map(a => 'Age ' + a),
      datasets: [
        { type: 'bar', label: 'Savings (current plan)', data: baseData, backgroundColor: '#132a3e', borderRadius: 3, order: 2 },
        { type: 'line', label: 'New Projections with Market Risk', data: scenarioData, borderColor: '#e08c2b', backgroundColor: '#e08c2b', borderDash: [5,3], pointRadius: 2, pointBackgroundColor: '#e08c2b', tension: 0, fill: false, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', axis: 'x', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 13 } } },
        tooltip: { enabled: true, callbacks: { label: item => item.dataset.label + ': ' + fmtMoney(item.parsed.y) } }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 10, font: { size: 13 } } },
        y: { ticks: { callback: v => fmtMoneyK(v) } }
      }
    }
  };
}
function renderMarketExplorerChart(inputs, ctx, shocks) {
  const canvas = els('chart_market_explorer');
  if (!canvas) return;
  const baseRows = projectRun(inputs, ctx, false).rows;
  const scenarioRows = projectRun(inputs, ctx, false, shocks).rows;
  // Pad to the longer run in case a scenario ever changes the horizon length.
  const longerRows = scenarioRows.length > baseRows.length ? scenarioRows : baseRows;
  const ages = longerRows.map(r => r.age);
  const savingsByYear = rows => ages.map((age, i) => rows[i] ? dv(rows[i].investable + rows[i].cash, rows[i].age, inputs) : null);
  const key = 'market_explorer';
  const config = marketExplorerChartConfig(ages, savingsByYear(baseRows), savingsByYear(scenarioRows));
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(canvas.getContext('2d'), config);
  applyChartRange(key);
}
function renderMarketExplorer(inputs, ctx) {
  renderMarketExplorerCards();
  const meta = buildMarketExplorerShocksAndMeta(inputs);
  renderMarketExplorerChart(inputs, ctx, meta.shocks);
  const score = runMonteCarlo(inputs, ctx, 1000, meta.shocks);
  renderMarketExplorerResult(score, meta);
}

// ---------- Per-section chart configs ----------
// Wraps a long label into stacked lines so names aren't cut off in a horizontal bar chart.
