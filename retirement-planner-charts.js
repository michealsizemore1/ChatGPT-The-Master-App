function wrapChartLabel(label, maxChars) {
  // Narrower wrap on mobile — the y-axis label column has much less real pixel width to work with
  // there than on a wide desktop screen, so the same 20-char line that fit fine on desktop can still
  // run into the plot area on a phone.
  maxChars = maxChars || (isMobile() ? 14 : 20);
  const words = String(label).split(' ');
  const lines = [];
  let current = '';
  words.forEach(word => {
    const candidate = current ? current + ' ' + word : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.length > 1 ? lines : label;
}

// Sizes a horizontal bar chart's card to fit however many bars it has AND how many lines its
// (possibly wrapped) labels take up, so nothing is cramped, overlapping, or clipped regardless
// of item count or label length. Used by every horizontal bar chart in the tool.
function sizeHorizontalChartCard(canvas, labels) {
  if (!canvas) return;
  const card = canvas.closest('.mini-chart-card');
  if (!card) return;
  const n = (labels || []).length;
  const maxLines = (labels || []).reduce((m, l) => Math.max(m, Array.isArray(l) ? l.length : 1), 1);
  const perBar = 34 + (maxLines - 1) * 16;
  const fitHeight = Math.min(620, Math.max(230, n * perBar + 70));
  card.style.height = fitHeight + 'px';
  card.style.maxHeight = fitHeight + 'px';
}

function barConfig(labels, values, opts) {
  opts = opts || {};
  const fmt = v => opts.percent ? (Math.round(v*10)/10)+'%' : (opts.plain ? Math.round(v)+(opts.suffix||'') : fmtMoneyK(v));
  const fmtFull = v => opts.percent ? (Math.round(v*10)/10)+'%' : (opts.plain ? Math.round(v)+(opts.suffix||'') : fmtMoney(v));
  const chartLabels = opts.horizontal ? labels.map(l => wrapChartLabel(l)) : labels;
  return {
    type: 'bar',
    data: { labels: chartLabels, datasets: [{
      data: values, backgroundColor: labels.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]), borderRadius: 4,
      // Read by the barValueLabels plugin; opt-in per chart so crowded charts stay clean.
      showValues: !!opts.showValues, valueFormatter: fmtFull
    }] },
    options: {
      indexAxis: opts.horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', axis: opts.horizontal ? 'y' : 'x', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          callbacks: { label: item => fmtFull(item.parsed[opts.horizontal ? 'x' : 'y']) }
        }
      },
      scales: {
        // "grace" adds headroom past the longest bar so its value label isn't clipped at the chart edge.
        x: opts.horizontal ? { ticks: { callback: fmt }, grace: opts.showValues ? '15%' : 0 } : { ticks: { autoSkip: false, font:{size:isMobile()?11:13} } },
        // autoSkip:false on the category axis guarantees every bar gets its own visible label —
        // without it, Chart.js silently drops labels (and makes bars look "missing") once there
        // isn't quite enough room, which is exactly what happened with 10 named expense items.
        y: opts.horizontal ? { ticks: { autoSkip: false, font:{size:isMobile()?11:13} } } : { ticks: { callback: fmt }, grace: opts.showValues ? '15%' : 0 }
      }
    }
  };
}

function buildChartConfig(pageId, snap) {
  switch (pageId) {
    case 'moneyflows':
      return barConfig(['Traditional TSP','Roth TSP','Agency Match','Brokerage (all pies)'],
        [snap.tradContribFirstYear, snap.rothContribFirstYear, snap.matchContribFirstYear, snap.brokerageContribution], { showValues:true });
    case 'investments':
      return barConfig(['Traditional TSP','Roth TSP','Brokerage (all pies)','Cash (bank)'],
        [snap.tradTSPBalance, snap.rothTSPBalance, snap.brokerageBalance, snap.cashTotal], { showValues:true });
    case 'housing':
      return barConfig(['Current annual rent','Housing cost at retirement'], [snap.currentRentAnnual, snap.housingCostAtRetirement], { showValues:true });
    case 'expenses':
      // Utilities/Subscriptions bars show the item name (e.g. Verizon) rather than repeating the category.
      // Values follow the header's Must Spend / Like to Spend toggle.
      return barConfig(
        expenses.map(e => (e.category==='Utilities' || e.category==='Subscriptions') ? (e.name||'Unnamed') : e.category),
        expenses.map(expenseValForBasis), { horizontal:true, showValues:true }
      );
    case 'debt':
      return barConfig(debts.map(d=>d.name||d.category), debts.map(d=>+d.balance||0), { horizontal:true, showValues:true });
    case 'income':
      return barConfig(["Job income (today's $)",'Your Social Security','Spousal Benefit','Military Pension','Govt Civil Service','VA Disability','Annuity'],
        [snap.inputs.currentIncome, snap.ssAtRetirement, snap.spousalAtRetirement, snap.pensionAtRetirement, snap.pension2AtRetirement, snap.vaDisabilityAtRetirement, snap.annuityAtRetirement], { horizontal:true, showValues:true });
    case 'taxes':
      return barConfig(['Gross withdrawn from accounts','Net spending covered'], [snap.grossWithdrawalFirstYear, snap.netSpendingFirstYear], { showValues:true });
    case 'medical':
      return barConfig(['Tricare (annual)','Tricare HVD (annual)','Your Part B (annual)',"Spouse's Part B (annual)",'Medicare HVD (annual)'],
        [(+els('tricareMonthly').value||0)*12,
         ((+els('tricareHearingMonthly').value||0)+(+els('tricareVisionMonthly').value||0)+(+els('tricareDentalMonthly').value||0))*12,
         (+els('partBUserMonthly').value||0)*12, (+els('partBSpouseMonthly').value||0)*12,
         ((+els('hearingMonthly').value||0)+(+els('visionMonthly').value||0)+(+els('dentalMonthly').value||0))*12], { showValues:true });
    case 'insurance':
      return barConfig(insurancePolicies.map(p=>p.name||'Policy'), insurancePolicies.map(p=>+p.premium||0), { horizontal:true, showValues:true });
    default:
      return null;
  }
}

// ---------- Chart range navigator (« Age X · Lifetime · Age X »), Boldin-style ----------
// Always shows the full timeline; «/» pins one year's tooltip and Lifetime un-pins it. Display only.
const chartRangeState = {}; // keyed by chart key: { selectedAge } — null selectedAge = Lifetime (nothing pinned)

function getProjectionAgeBounds() {
  const rows = lastSnapshot ? lastSnapshot.rows : null;
  if (!rows || !rows.length) return [0, 0];
  return [rows[0].age, rows[rows.length - 1].age];
}

// Finds the data-array index for a given age, whether the chart uses category labels
// (yearly bar charts: labels like 'Age 62') or {x,y} points (the Dashboard line chart).
function findAgeIndex(chart, age) {
  if (chart.data.labels && chart.data.labels.length) {
    // Exact "Age N" match first, then prefix match for labels like "Age N (spouse)".
    const exact = chart.data.labels.indexOf('Age ' + age);
    if (exact !== -1) return exact;
    return chart.data.labels.findIndex(label => typeof label === 'string' && label.match(/^Age\s+(\d+)/i) && +label.match(/^Age\s+(\d+)/i)[1] === age);
  }
  const ds = chart.data.datasets && chart.data.datasets[0];
  if (!ds || !ds.data) return -1;
  return ds.data.findIndex(pt => pt && typeof pt === 'object' && pt.x === age);
}

// Converts the clicked bar/point index back to the projection age. Savings charts use
// labels such as "Age 65"; the point and row fallbacks also support other chart shapes.
function chartAgeAtIndex(chart, index) {
  const label = chart && chart.data && chart.data.labels ? chart.data.labels[index] : null;
  const match = typeof label === 'string' ? label.match(/^Age\s+(\d+)/i) : null;
  if (match) return +match[1];
  const ds = chart && chart.data && chart.data.datasets && chart.data.datasets[0];
  const point = ds && ds.data ? ds.data[index] : null;
  if (point && typeof point === 'object' && Number.isFinite(+point.x)) return +point.x;
  const row = lastSnapshot && lastSnapshot.rows ? lastSnapshot.rows[index] : null;
  return row && Number.isFinite(+row.age) ? +row.age : null;
}

// Chart.js normally treats a click as a temporary tooltip only. The range navigator
// needs the clicked age stored in its own state so Previous/Next can move from that
// exact year instead of still thinking the chart is in Lifetime mode.
function enableChartRangeClickSelection(config, chartKey) {
  if (!config || !config.options) return;
  const originalOnClick = config.options.onClick;
  config.options.onClick = function(event, elements, chart) {
    if (typeof originalOnClick === 'function') originalOnClick(event, elements, chart);
    const hit = elements && elements.length ? elements[0] : null;
    if (!hit) return;
    const age = chartAgeAtIndex(chart, hit.index);
    if (!Number.isFinite(age)) return;
    chartRangeState[chartKey] = { selectedAge: age };
    applyChartRange(chartKey);
  };
}

// Maps a projection age to its calendar year, using the same currentAge anchor as the
// Year-by-year detail table, so the range-nav indicator and that table always agree.
function ageToCalendarYear(age) {
  const currentAge = lastSnapshot && lastSnapshot.inputs ? lastSnapshot.inputs.currentAge : null;
  if (currentAge == null) return null;
  return new Date().getFullYear() + (age - currentAge);
}

function chartRangeNav(chartKey, action) {
  const [minAge, maxAge] = getProjectionAgeBounds();
  if (!chartRangeState[chartKey]) chartRangeState[chartKey] = { selectedAge: null };
  const st = chartRangeState[chartKey];
  if (action === 'lifetime') {
    st.selectedAge = null;
  } else if (st.selectedAge == null) {
    st.selectedAge = action === 'next' ? maxAge : minAge;
  } else {
    const delta = action === 'next' ? 1 : -1;
    st.selectedAge = Math.min(Math.max(st.selectedAge + delta, minAge), maxAge);
  }
  applyChartRange(chartKey);
}

function applyChartRange(chartKey) {
  const chart = charts[chartKey];
  const [minAge, maxAge] = getProjectionAgeBounds();
  if (!chartRangeState[chartKey]) chartRangeState[chartKey] = { selectedAge: null };
  const st = chartRangeState[chartKey];
  // Our labels and readout must always update; pinning Chart.js's tooltip is isolated in try/catch.
  if (chart) {
    try {
      if (st.selectedAge == null) {
        chart.setActiveElements([]);
        if (chart.tooltip) chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      } else {
        const idx = findAgeIndex(chart, st.selectedAge);
        if (idx > -1) {
          const active = chart.data.datasets.map((_, datasetIndex) => ({ datasetIndex, index: idx }));
          chart.setActiveElements(active);
          // Anchor the tooltip at the selected bar's real position (not the canvas corner).
          let pos = { x: 0, y: 0 };
          for (const el of active) {
            const meta = chart.getDatasetMeta(el.datasetIndex);
            const item = meta && meta.data && meta.data[el.index];
            if (item) { pos = { x: item.x, y: item.y }; break; }
          }
          if (chart.tooltip) chart.tooltip.setActiveElements(active, pos);
        }
      }
      chart.update();
    } catch (err) {
      console.error('Chart range-nav tooltip pin failed (labels/readout still updated):', err);
    }
  }
  updateRangeReadout(chartKey, chart);
  updateChartRangeUi(chartKey, minAge, maxAge);
}

// Reliable readout of the selected year's values, read straight from the chart data.
function updateRangeReadout(chartKey, chart) {
  const readout = document.querySelector(`.range-readout[data-chart="${chartKey}"]`);
  if (!readout) return;
  const st = chartRangeState[chartKey];
  if (!st || st.selectedAge == null || !chart) {
    readout.style.display = 'none';
    readout.textContent = '';
    return;
  }
  let idx = -1, parts = [];
  try {
    idx = findAgeIndex(chart, st.selectedAge);
    if (idx > -1) {
      parts = (chart.data.datasets || []).map(ds => {
        const raw = ds.data[idx];
        const val = raw && typeof raw === 'object' ? raw.y : raw;
        return (ds.label || 'Value') + ': ' + (typeof val === 'number' ? fmtMoney(val) : '—');
      });
    }
  } catch (err) {
    console.error('Range readout failed to read chart data:', err);
  }
  if (idx < 0) {
    readout.style.display = 'none';
    readout.textContent = '';
    return;
  }
  const yr = ageToCalendarYear(st.selectedAge);
  const yearText = yr != null ? yr : ('Age ' + st.selectedAge);
  readout.textContent = yearText + '  —  ' + parts.join('   ·   ');
  readout.style.display = 'block';
}

function updateChartRangeUi(chartKey, minAge, maxAge) {
  const nav = document.querySelector(`.chart-range-nav[data-chart="${chartKey}"]`);
  if (!nav) return;
  const st = chartRangeState[chartKey] || { selectedAge: null };
  const lifetimeBtn = nav.querySelector('.lifetime');
  const prevBtn = nav.querySelector('.range-prev');
  const nextBtn = nav.querySelector('.range-next');
  const prevLabel = prevBtn ? prevBtn.querySelector('.range-nav-label') : null;
  const nextLabel = nextBtn ? nextBtn.querySelector('.range-nav-label') : null;
  // Once a year is selected, all three controls read as one consecutive run of calendar
  // years (e.g. « 2039   2040   2041 »), so stepping prev/next always lands on the
  // adjacent year shown right next to the button you clicked.
  const yearLabel = (age) => {
    const yr = ageToCalendarYear(age);
    return yr != null ? String(yr) : 'Age ' + age;
  };
  if (lifetimeBtn) lifetimeBtn.textContent = 'Lifetime';
  if (st.selectedAge == null) {
    if (lifetimeBtn) lifetimeBtn.classList.add('active');
    if (prevLabel) prevLabel.textContent = yearLabel(minAge);
    if (nextLabel) nextLabel.textContent = yearLabel(maxAge);
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;
  } else {
    if (lifetimeBtn) lifetimeBtn.classList.remove('active');
    const prevAge = Math.max(minAge, st.selectedAge - 1);
    const nextAge = Math.min(maxAge, st.selectedAge + 1);
    if (prevLabel) prevLabel.textContent = yearLabel(prevAge);
    if (nextLabel) nextLabel.textContent = yearLabel(nextAge);
    if (prevBtn) prevBtn.disabled = st.selectedAge <= minAge;
    if (nextBtn) nextBtn.disabled = st.selectedAge >= maxAge;
  }
}

function ensureOrUpdateChart(pageId, snap) {
  if (pageId === 'dashboard' || pageId === 'explorers') return; // handled separately
  const config = buildChartConfig(pageId, snap);
  if (!config) return;
  const canvas = els('chart_' + pageId);
  // Size horizontal bar charts to fit the bar count and any multi-line labels.
  if (config.options.indexAxis === 'y' && canvas) {
    sizeHorizontalChartCard(canvas, config.data.labels);
    // On a narrow phone viewport the category-label column and the plot area both get squeezed
    // into whatever's left of a much narrower canvas — give the chart a guaranteed minimum width
    // (label column + room for bars/value labels) and let it scroll horizontally instead.
    ensureChartHorizontalScroll(canvas, 460);
  } else if (canvas) {
    // Vertical bar charts (Personal & Family's "Years to retirement", Housing, Taxes snapshot,
    // etc.) usually have very few bars, but their value-label pills are still a fixed pixel size —
    // on a very narrow phone a couple of bars can still crowd together without a small width floor.
    ensureChartHorizontalScroll(canvas, 280);
  }
  if (charts[pageId]) {
    charts[pageId].data = config.data;
    charts[pageId].options = config.options;
    charts[pageId].update();
  } else {
    if (!canvas) return;
    charts[pageId] = new Chart(canvas.getContext('2d'), config);
  }
}

// ---------- Per-section "by year" charts, for sections with inflation-adjusted dollar items ----------
// Each series pulls straight from the deterministic projection rows, so bars reflect that item's own
// growth assumption (General/Medical Inflation, SS COLA, or its own yearly-increase %) compounding over time.
const YEARLY_CHART_PAGES = ['income', 'moneyflows', 'housing', 'expenses', 'medical', 'gap', 'taxes', 'incomeexpenses']; // 'incomeexpenses' renders on the Gap page

function yearlyBarConfig(ages, series, opts) {
  opts = opts || {};
  const datasets = series.map((s, i) => ({
    label: s.label,
    data: s.data,
    // A series can supply its own color; otherwise it gets the rotating CHART_COLORS palette.
    backgroundColor: s.backgroundColor || CHART_COLORS[i % CHART_COLORS.length],
    borderRadius: 3,
    // Optional stack group id: datasets with the same id stack into one column. The Gap chart uses two ids
    // so Surplus/(Gap) and the withdrawal breakdown sit side by side.
    stack: s.stack
  }));
  return {
    type: 'bar',
    // opts.labels overrides the "Age N" labels (e.g. "Age 71 (spouse)" once the survivor is alone).
    data: { labels: opts.labels || ages.map(a => 'Age ' + a), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', axis: 'x', intersect: false },
      plugins: {
        legend: { display: series.length > 1, position: 'bottom', labels: { boxWidth: 12, font: { size: isMobile()?11:13 } } },
        tooltip: {
          enabled: true,
          callbacks: {
            label: item => item.dataset.label + ': ' + fmtMoney(item.parsed.y),
            // Opt-in per chart via opts.bracketLabels (one string per age/bar, e.g. the Taxes page's
            // Estimated Taxes chart showing "22% federal bracket") — printed once per hovered bar,
            // below the per-series $ lines above, instead of repeating on every dataset row.
            footer: items => (opts.bracketLabels && items.length) ? opts.bracketLabels[items[0].dataIndex] : undefined
          }
        }
      },
      scales: {
        x: { stacked: !!opts.stacked, ticks: { autoSkip: true, maxTicksLimit: opts.maxTicksLimit || 10, font: { size: isMobile()?11:13 } } },
        y: { stacked: !!opts.stacked, ticks: { callback: v => fmtMoneyK(v), font: { size: isMobile()?11:13 } } }
      }
    }
  };
}

function buildYearlyChartConfig(pageId, snap) {
  const rows = snap.rows, inputs = snap.inputs;
  if (!rows || !rows.length || !inputs) return null;
  const ages = rows.map(r => r.age);
  const d = (val, age) => dv(val || 0, age, inputs);
  switch (pageId) {
    case 'moneyflows':
      return yearlyBarConfig(ages, [
        { label: 'Job income (annual raise %)', data: rows.map(r => d(r.income, r.age)) },
        { label: 'Contributions (TSP + brokerage + excess)', data: rows.map(r => d(r.contributions, r.age)) },
        { label: 'Of which, excess income saved', data: rows.map(r => d(r.excessIncomeSaved, r.age)) }
      ]);
    case 'housing':
      return yearlyBarConfig(ages, [
        { label: 'Housing cost (rent growth / home appreciation)', data: rows.map(r => d(r.housingCost, r.age)) }
      ]);
    case 'expenses':
      return yearlyBarConfig(ages, [
        { label: 'Recurring expenses (General/Medical Inflation)', data: rows.map(r => d(r.expensesCategoriesAnnual, r.age)) },
        { label: 'Future / one-time expenses (General Inflation)', data: rows.map(r => d(r.futureExpenseCost, r.age)) }
      ], { stacked: true });
    case 'income': {
      // In retirement, withdrawals from each account count as that year's income, one series per account
      // drawn from, stacked with guaranteed income in one column.
      const accountKeys = getWithdrawalAccountKeys();
      const usedKeys = accountKeys.filter(k => rows.some(r => (r.withdrawalByAccount && r.withdrawalByAccount[k]) > 0.5));
      // Social Security is split into two series (yours, then the survivor's) once you're deceased, either
      // past your life expectancy (always on) or at the Survivorship what-if's earlier age (only when that
      // what-if is enabled).
      const deceasedFor = r => !!r.primaryDeceased || !!(inputs.survivorshipEnabled && inputs.survivorshipDeathAge && r.age >= inputs.survivorshipDeathAge);
      const hasAnyDeath = rows.some(deceasedFor);
      const ssSeries = hasAnyDeath ? [
        { label: 'Social Security (your benefit)', data: rows.map(r => d(deceasedFor(r) ? 0 : r.ssAmount, r.age)) },
        { label: 'Social Security (survivor benefit)', data: rows.map(r => d(deceasedFor(r) ? r.ssAmount : 0, r.age)) }
      ] : [
        { label: 'Social Security (SS COLA)', data: rows.map(r => d(r.ssAmount, r.age)) }
      ];
      // SBP/DIC only ever populate from the Survivorship what-if's own block in projectRun (never from the
      // always-on primaryDeceased rule above, which is narrowly scoped to SS/spousal only) — so these stay
      // at $0 and get filtered out below unless that what-if is actually active.
      const survivorExtraSeries = [
        { label: 'SBP Survivor Annuity', data: rows.map(r => d(r.sbpAmount, r.age)) },
        { label: 'DIC (VA Survivor Benefit)', data: rows.map(r => d(r.dicAmount, r.age)) },
        { label: 'DIC Aid & Attendance add-on', data: rows.map(r => d(r.dicAidAttendanceAmount, r.age)) }
      ].filter(s => s.data.some(v => v > 0.5));
      const ltcVaAidSeries = rows.some(r => (r.ltcVaAidIncome || 0) > 0.5)
        ? [{ label: 'VA spouse A&A add-on (tax-free)', data: rows.map(r => d(r.ltcVaAidIncome || 0, r.age)) }]
        : [];
      return yearlyBarConfig(ages, [
        { label: 'Job income (annual raise %)', data: rows.map(r => d(r.income, r.age)) },
        ...ssSeries,
        { label: inputs.spouseWorks ? "Spouse's Own Social Security (SS COLA)" : 'Spousal Benefit (SS COLA)', data: rows.map(r => d(r.spousalBenefit, r.age)) },
        { label: 'Military Pension (own yearly increase %)', data: rows.map(r => d(r.pensionAmount, r.age)) },
        { label: 'Govt Civil Service (own yearly increase %)', data: rows.map(r => d(r.pension2Amount, r.age)) },
        { label: 'VA Disability (own yearly increase %)', data: rows.map(r => d(r.vaDisabilityAmount, r.age)) },
        ...ltcVaAidSeries,
        { label: 'Annuity (own yearly increase %)', data: rows.map(r => d(r.annuityAmount, r.age)) },
        ...survivorExtraSeries,
        ...usedKeys.map(k => ({
          label: 'Withdrawn from: ' + withdrawalAccountInfo(k).label,
          data: rows.map(r => d((r.withdrawalByAccount && r.withdrawalByAccount[k]) || 0, r.age))
        }))
      ], {
        stacked: true,
        // After a death, the row tracks the surviving spouse, so label it with their age.
        labels: hasAnyDeath ? rows.map(r => deceasedFor(r) ? ('Age ' + r.spouseAge + ' (spouse)') : ('Age ' + r.age + ' (you)')) : undefined
      });
    }
    case 'medical':
      return yearlyBarConfig(ages, [
        { label: 'Tricare + Part B + FEDVIP (Medical Inflation)', data: rows.map(r => d(r.medicalCostAnnual, r.age)) },
        { label: 'LTC cost (spouse, Medical Inflation)', data: rows.map(r => d(r.ltcCost, r.age)) }
      ]);
    case 'taxes': {
      // One bracket readout per year for the tooltip footer — federal marginal bracket always applies
      // (working-years wages or withdrawal-time ordinary income); the LTCG bracket only ever applies
      // once withdrawals start, so it's appended only for years that actually have one.
      const bracketLabels = rows.map(r => {
        const fedPct = r.fedMarginalRate != null ? Math.round(r.fedMarginalRate*100) + '% federal bracket' : null;
        const ltcgPct = r.ltcgMarginalRate != null ? Math.round(r.ltcgMarginalRate*100) + '% LTCG bracket' : null;
        return [fedPct, ltcgPct].filter(Boolean).join(' · ') || null;
      });
      return yearlyBarConfig(ages, [
        { label: 'Federal Income Tax', data: rows.map(r => d(r.federalTaxAnnual, r.age)) },
        { label: 'State Income Tax', data: rows.map(r => d(r.stateTaxAnnual, r.age)) },
        { label: 'FICA', data: rows.map(r => d(r.ficaTaxAnnual, r.age)) }
      ], { stacked: true, bracketLabels });
    }
    case 'gap': {
      // One bar series per account actually drawn from (stack 'withdrawal'), with Surplus/(Gap) in its own
      // stack ('surplus') so it sits beside rather than on top.
      const accountKeys = getWithdrawalAccountKeys();
      const usedKeys = accountKeys.filter(k => rows.some(r => (r.withdrawalByAccount && r.withdrawalByAccount[k]) > 0.5));
      return yearlyBarConfig(ages, [
        { label: 'Surplus / (Gap), after tax', data: rows.map(r => d((r.guaranteedIncomeAfterTax != null ? r.guaranteedIncomeAfterTax : (r.guaranteedIncome || 0)) - (r.spending || 0), r.age)), stack: 'surplus' },
        ...usedKeys.map(k => ({
          label: 'Withdrawn from: ' + withdrawalAccountInfo(k).label,
          data: rows.map(r => d((r.withdrawalByAccount && r.withdrawalByAccount[k]) || 0, r.age)),
          stack: 'withdrawal'
        }))
      ], { stacked: true });
    }
    case 'incomeexpenses': {
      // Two series from a $0 baseline: income (job + every guaranteed source) vs total expenses (housing,
      // debt, insurance, recurring bills, medical premiums, plus Future/One-Time Expenses). Portfolio
      // withdrawals are left out of income on purpose, since they exist to fill the gap. r.spending applies
      // from retirement age; r.recurringLivingCostThisYear covers earlier years.
      const totalExpensesForYear = r => (r.age < inputs.retirementAge ? (r.recurringLivingCostThisYear || 0) : (r.spending || 0)) + (r.futureExpenseCost || 0);
      const incomeVals = rows.map(r => d((r.income || 0) + (r.guaranteedIncome || 0), r.age));
      const expenseVals = rows.map(r => d(totalExpensesForYear(r), r.age));
      // Tooltip lines listing each Future/One-Time Expense active that year, using projectRun's same
      // hit-test and inflation formula so they match what was actually withdrawn.
      const futureExpenseFooterLines = rows.map(r => {
        const y = r.age - inputs.currentAge;
        const survivorCutoff = inputs.survivorshipEnabled && inputs.survivorshipDeathAge && r.age >= inputs.survivorshipDeathAge;
        const hits = futureExpenses.filter(f => {
          const hit = f.recurring ? (r.age >= f.age && r.age <= (f.endAge || f.age)) : (r.age === f.age);
          if (!hit) return false;
          if (survivorCutoff && f.survivorContinues === false) return false;
          return true;
        });
        if (!hits.length) return [];
        return hits.map(f => {
          const baseAmt = (survivorCutoff && f.survivorAmount != null && f.survivorAmount !== '') ? (+f.survivorAmount || 0) : (+f.amount || 0);
          const amtNominal = baseAmt * Math.pow(1 + inputs.inflation, y);
          // Same today's-dollars conversion as the bars, so the line matches the Real/Nominal toggle.
          return '  • ' + (f.name || 'Future expense') + ': ' + fmtMoney(d(amtNominal, r.age)) + ' (included in Total Expenses)';
        });
      });
      // Same itemized tooltip lines for debt payments (already in Total Expenses), rebuilt with
      // buildDebtSchedule since this function only receives rows/inputs.
      const maxYearsForDebt = ages.length ? ages[ages.length - 1] - inputs.currentAge : 0;
      const debtSchedulesForChart = debts.map(dbt => {
        const offset = (dbt.startAge != null && dbt.startAge !== '') ? Math.max(0, Math.round((dbt.startAge - inputs.currentAge) * 12)) : 0;
        return buildDebtSchedule(dbt, maxYearsForDebt, offset);
      });
      const debtFooterLines = rows.map((r, idx) => {
        const lines = [];
        debts.forEach((dbt, di) => {
          const sched = debtSchedulesForChart[di];
          const pmt = sched.paymentDuringYear[idx] || 0;
          if (pmt > 0.5) lines.push('  • ' + (dbt.name || dbt.category || 'Debt') + ': ' + fmtMoney(d(pmt, r.age)) + ' (included in Total Expenses)');
        });
        return lines;
      });
      const expenseFooterLines = rows.map((r, idx) => {
        const lines = [...(futureExpenseFooterLines[idx] || []), ...(debtFooterLines[idx] || [])];
        return lines.length ? lines : undefined;
      });
      // One category per age with two non-null datasets so Chart.js groups each income/expense pair side
      // by side (null placeholders caused the pairs to look mismatched).
      const cfg = yearlyBarConfig(ages, [
        { label: 'Total Income (job + guaranteed, before tax)', data: incomeVals, backgroundColor: '#1f7a6c' },
        { label: 'Total Expenses', data: expenseVals, backgroundColor: '#c0392b' }
      ], { bracketLabels: expenseFooterLines });
      return cfg;
    }
    default:
      return null;
  }
}

function ensureOrUpdateYearlyChart(pageId, snap) {
  if (!YEARLY_CHART_PAGES.includes(pageId)) return;
  const config = buildYearlyChartConfig(pageId, snap);
  if (!config) return;
  const key = pageId + '_yearly';
  // Remember the tapped year on every yearly chart so Back/Next step from it.
  enableChartRangeClickSelection(config, key);
  // One bar per projected year (often 40-50 years, "Lifetime" view shows them all at once) — on a
  // narrow phone viewport that's not enough pixels for every bar to stay legible, so give the chart
  // a guaranteed minimum width and let the card scroll horizontally instead of squeezing bars thin.
  const numBars = (config.data.labels || []).length;
  // Widen the per-age pixel budget by the number of stack groups so side-by-side bars don't look merged.
  const stackGroupCount = new Set((config.data.datasets || []).map(ds => ds.stack || '_default')).size;
  const pxPerBar = 13 + Math.max(0, stackGroupCount - 1) * 10;
  if (charts[key]) {
    charts[key].data = config.data;
    charts[key].options = config.options;
    ensureChartHorizontalScroll(charts[key].canvas, numBars * pxPerBar);
    charts[key].update();
    applyChartRange(key);
  } else {
    const canvas = els('chart_' + pageId + '_yearly');
    if (!canvas) return;
    ensureChartHorizontalScroll(canvas, numBars * pxPerBar);
    charts[key] = new Chart(canvas.getContext('2d'), config);
    applyChartRange(key);
  }
}

// ---------- Brokerage-by-portfolio breakdown charts (dedicated canvas so the 3 pies aren't dwarfed by TSP balances) ----------
const PIE_CHART_PAGES = ['moneyflows', 'investments'];

function buildPieChartConfig(pageId) {
  if (!brokeragePies.length) return null;
  const labels = brokeragePies.map(p => p.name || 'Pie');
  if (pageId === 'moneyflows') {
    return barConfig(labels, brokeragePies.map(p => (+p.contribution || 0) * 12), { horizontal: true, showValues: true });
  }
  if (pageId === 'investments') {
    return barConfig(labels, brokeragePies.map(p => +p.balance || 0), { horizontal: true, showValues: true });
  }
  return null;
}

function ensureOrUpdatePieChart(pageId, snap) {
  if (!PIE_CHART_PAGES.includes(pageId)) return;
  const config = buildPieChartConfig(pageId);
  if (!config) return;
  const key = pageId + '_pies';
  const canvas = els('chart_' + pageId + '_pies');
  if (canvas) {
    sizeHorizontalChartCard(canvas, config.data.labels);
    ensureChartHorizontalScroll(canvas, 460);
  }
  if (charts[key]) {
    charts[key].data = config.data;
    charts[key].options = config.options;
    charts[key].update();
  } else {
    if (!canvas) return;
    charts[key] = new Chart(canvas.getContext('2d'), config);
  }
}

function refreshSectionCharts(pageId, snap) {
  ensureOrUpdateChart(pageId, snap);
  ensureOrUpdateYearlyChart(pageId, snap);
  // The Gap page also hosts the Income vs Expenses chart (chart key 'incomeexpenses_yearly').
  if (pageId === 'gap') ensureOrUpdateYearlyChart('incomeexpenses', snap);
  ensureOrUpdatePieChart(pageId, snap);
}

// ---------- Allocation Explorer: life-stage allocation comparison ----------
const ALLOCATION_STAGE_INFO = [
  { key:'accumulation', label:'Accumulation', when:'20+ years before retirement' },
  { key:'build', label:'Build', when:'10-19 years before retirement' },
  { key:'transition', label:'Transition', when:'5-9 years before retirement' },
  { key:'retirement', label:'Retirement Zone', when:'5 years before through 5 years after' },
  { key:'distribution', label:'Distribution', when:'5+ years after retirement' }
];
const ALLOCATION_MODELS = {
  conservative: {
    name:'Conservative', short:'Highest stability', description:'Capital preservation with the largest fixed-income and cash cushion.',
    equity:[70,65,60,30,30], cash:[1,2,4,12,16], returns:[6.51,6.31,6.12,5.00,4.98], volatility:[11.29,10.61,9.92,6.27,6.02]
  },
  moderately_conservative: {
    name:'Moderately Conservative', short:'Stability first', description:'More stability while retaining measured long-term growth.',
    equity:[75,70,65,40,40], cash:[1,2,4,10,14], returns:[6.69,6.50,6.31,5.37,5.36], volatility:[11.90,11.22,10.53,7.40,7.21]
  },
  moderate: {
    name:'Moderate', short:'Balanced', description:'Balances growth and stability with a pronounced retirement-zone shift.',
    equity:[80,75,70,50,50], cash:[1,2,4,8,12], returns:[6.87,6.68,6.49,5.74,5.73], volatility:[12.52,11.84,11.15,8.60,8.46]
  },
  moderately_aggressive: {
    name:'Moderately Aggressive', short:'Growth leaning', description:'Strong equity exposure with a meaningful retirement buffer.',
    equity:[85,80,75,60,60], cash:[1,2,4,6,10], returns:[7.05,6.86,6.67,6.11,6.10], volatility:[13.14,12.46,11.77,9.84,9.74]
  },
  aggressive: {
    name:'Aggressive', short:'Highest growth', description:'The most equity exposure and the widest expected annual swings.',
    equity:[90,85,80,70,70], cash:[1,2,4,4,8], returns:[7.23,7.05,6.86,6.48,6.48], volatility:[13.77,13.09,12.40,11.11,11.04]
  }
};

function allocationLerp(a, b, t) { return a + (b-a) * Math.max(0, Math.min(1, t)); }
function allocationStageForAge(age, retirementAge) {
  const yearsToRetirement = retirementAge - age;
  if (yearsToRetirement >= 20) return 0;
  if (yearsToRetirement >= 10) return 1;
  if (yearsToRetirement > 5) return 2;
  if (yearsToRetirement >= -5) return 3;
  return 4;
}
function allocationPointForAge(strategyKey, age, retirementAge) {
  const model = ALLOCATION_MODELS[strategyKey] || ALLOCATION_MODELS.moderate;
  const d = retirementAge - age;
  let from = 0, to = 0, t = 0;
  if (d >= 20) { from = to = 0; }
  else if (d >= 10) { from = 0; to = 1; t = (20-d)/10; }
  else if (d >= 5) { from = 1; to = 2; t = (10-d)/5; }
  else if (d >= 0) { from = 2; to = 3; t = (5-d)/5; }
  else if (d >= -5) { from = 3; to = 4; t = (-d)/5; }
  else { from = to = 4; }
  const equity = allocationLerp(model.equity[from], model.equity[to], t);
  const cash = allocationLerp(model.cash[from], model.cash[to], t);
  return {
    age, stage:ALLOCATION_STAGE_INFO[allocationStageForAge(age, retirementAge)].label,
    equity, cash, fixedIncome:Math.max(0, 100-equity-cash),
    expectedReturn:allocationLerp(model.returns[from], model.returns[to], t)/100,
    volatility:allocationLerp(model.volatility[from], model.volatility[to], t)/100
  };
}

let allocationExplorerCache = null;
let allocationExplorerCacheKey = '';
function allocationExplorerSignature(inputs) {
  return JSON.stringify({ strategy:allocationExplorerStrategy, spendingBasis, inputs, expenses, brokeragePies, debts, futureExpenses, windfalls, insurancePolicies });
}
function selectAllocationStrategy(key) {
  if (!ALLOCATION_MODELS[key]) return;
  allocationExplorerStrategy = key;
  allocationExplorerCache = null;
  allocationExplorerCacheKey = '';
  saveState();
  renderAllocationStrategyCards();
  const status = els('allocationExplorerStatus');
  if (status) status.textContent = 'Calculating the full-plan comparison...';
  setTimeout(() => {
    const inputs = readInputs();
    renderAllocationExplorer(inputs, buildContext(inputs));
  }, 20);
}
function renderAllocationStrategyCards() {
  const grid = els('allocationStrategyGrid');
  if (!grid) return;
  if (!ALLOCATION_MODELS[allocationExplorerStrategy]) allocationExplorerStrategy = 'moderate';
  grid.innerHTML = Object.entries(ALLOCATION_MODELS).map(([key, model]) => `
    <button type="button" class="allocation-strategy ${allocationExplorerStrategy===key?'selected':''}" onclick="selectAllocationStrategy('${key}')">
      <div class="allocation-strategy-name">${model.name}</div>
      <div class="allocation-strategy-detail">${model.short}<br>${model.description}</div>
      ${allocationExplorerStrategy===key?'<span class="allocation-selected-label">Selected</span>':''}
    </button>`).join('');
}
function getAllocationExplorerResults(inputs, ctx) {
  const signature = allocationExplorerSignature(inputs);
  if (allocationExplorerCache && allocationExplorerCacheKey === signature) return allocationExplorerCache;
  const current = runComparisonEntry('Current Plan', inputs, ctx);
  const modelInputs = { ...inputs, allocationExplorerStrategy };
  const model = runComparisonEntry(ALLOCATION_MODELS[allocationExplorerStrategy].name, modelInputs, ctx);
  allocationExplorerCacheKey = signature;
  allocationExplorerCache = { current, model, modelInputs };
  return allocationExplorerCache;
}
function allocationRetirementMarkerPlugin() {
  return {
    id:'allocationRetirementMarker',
    afterDraw(chart, args, opts) {
      if (!chart.scales.x || opts.age == null) return;
      const x = chart.scales.x.getPixelForValue(opts.age);
      const area = chart.chartArea;
      chart.ctx.save();
      chart.ctx.strokeStyle = '#7b8794'; chart.ctx.setLineDash([5,4]); chart.ctx.lineWidth = 1.25;
      chart.ctx.beginPath(); chart.ctx.moveTo(x, area.top); chart.ctx.lineTo(x, area.bottom); chart.ctx.stroke();
      chart.ctx.fillStyle = '#66717e'; chart.ctx.font = '12px Arial'; chart.ctx.fillText('Retirement', Math.min(x+5, area.right-64), area.top+13);
      chart.ctx.restore();
    }
  };
}
function renderAllocationExplorer(inputs, ctx) {
  if (!els('allocationStrategyGrid')) return;
  renderAllocationStrategyCards();
  const modelDef = ALLOCATION_MODELS[allocationExplorerStrategy] || ALLOCATION_MODELS.moderate;
  const results = getAllocationExplorerResults(inputs, ctx);
  const currentPoint = allocationPointForAge(allocationExplorerStrategy, inputs.currentAge, inputs.retirementAge);
  const status = els('allocationExplorerStatus');
  if (status) status.innerHTML = `<b>${modelDef.name}</b> starts your current age in the <b>${currentPoint.stage}</b> stage: ${currentPoint.equity.toFixed(0)}% equity, ${currentPoint.fixedIncome.toFixed(0)}% fixed income, and ${currentPoint.cash.toFixed(0)}% cash.`;

  const current = results.current, modeled = results.model;
  const outcomes = els('allocationExplorerOutcomes');
  if (outcomes) outcomes.innerHTML = [
    ['Monte Carlo Confidence', Math.round(modeled.score)+'%', Math.round(current.score)+'%'],
    ['Ending Investable Savings', fmtMoney(dv(modeled.endingBalance, modeled.endAge, inputs)), fmtMoney(dv(current.endingBalance, current.endAge, inputs))],
    ['Ending Estate / Net Worth', fmtMoney(dv(modeled.endingNetWorth, modeled.endAge, inputs)), fmtMoney(dv(current.endingNetWorth, current.endAge, inputs))]
  ].map(v => `<div class="allocation-outcome"><div class="allocation-label">${v[0]}</div><div class="allocation-model-value">${v[1]}</div><div class="allocation-current-value">Current plan: ${v[2]}</div></div>`).join('');

  const ages = [];
  for (let age=inputs.currentAge; age<=ctx.effectiveLifeExpectancy; age++) ages.push(age);
  const points = ages.map(age => allocationPointForAge(allocationExplorerStrategy, age, inputs.retirementAge));
  const mixData = {
    datasets:[
      {label:'Equity',data:points.map(p=>({x:p.age,y:p.equity})),borderColor:'#1f7a6c',backgroundColor:'rgba(31,122,108,.50)',pointRadius:0,fill:true,stack:'mix',tension:.25},
      {label:'Fixed income',data:points.map(p=>({x:p.age,y:p.fixedIncome})),borderColor:'#4f78b8',backgroundColor:'rgba(79,120,184,.42)',pointRadius:0,fill:true,stack:'mix',tension:.25},
      {label:'Cash',data:points.map(p=>({x:p.age,y:p.cash})),borderColor:'#d6a84b',backgroundColor:'rgba(214,168,75,.55)',pointRadius:0,fill:true,stack:'mix',tension:.25}
    ]
  };
  const mixOptions = {responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},allocationRetirementMarker:{age:inputs.retirementAge},tooltip:{callbacks:{title:items=>`Age ${items[0].parsed.x} - ${points[items[0].dataIndex].stage}`,label:item=>`${item.dataset.label}: ${item.parsed.y.toFixed(1)}%`}}},scales:{x:{type:'linear',title:{display:true,text:'Age'},ticks:{stepSize:5}},y:{stacked:true,min:0,max:100,title:{display:true,text:'Allocation'},ticks:{callback:v=>v+'%'}}}};
  const mixCanvas = els('chart_allocation_mix');
  if (mixCanvas) {
    if (charts.explorers_allocation_mix) { charts.explorers_allocation_mix.data=mixData; charts.explorers_allocation_mix.options=mixOptions; charts.explorers_allocation_mix.update(); }
    else charts.explorers_allocation_mix = new Chart(mixCanvas.getContext('2d'), {type:'line',data:mixData,options:mixOptions,plugins:[allocationRetirementMarkerPlugin()]});
  }

  const savingsData = {datasets:[
    {label:'Current Plan',data:current.rows.map(r=>({x:r.age,y:dv(r.investable,r.age,inputs)})),borderColor:'#66717e',borderWidth:2,pointRadius:0,tension:.2},
    {label:modelDef.name,data:modeled.rows.map(r=>({x:r.age,y:dv(r.investable,r.age,inputs)})),borderColor:'#1f7a6c',backgroundColor:'rgba(31,122,108,.08)',borderWidth:2.5,pointRadius:0,tension:.2,fill:true}
  ]};
  const savingsOptions = {responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},allocationRetirementMarker:{age:inputs.retirementAge},tooltip:{callbacks:{title:items=>'Age '+items[0].parsed.x,label:item=>item.dataset.label+': '+fmtMoney(item.parsed.y)}}},scales:{x:{type:'linear',title:{display:true,text:'Age'},ticks:{stepSize:5}},y:{title:{display:true,text:dollarView==='real'?"Today's dollars":'Future dollars'},ticks:{callback:v=>fmtMoneyK(v)}}}};
  const savingsCanvas = els('chart_allocation_savings');
  if (savingsCanvas) {
    if (charts.explorers_allocation_savings) { charts.explorers_allocation_savings.data=savingsData; charts.explorers_allocation_savings.options=savingsOptions; charts.explorers_allocation_savings.update(); }
    else charts.explorers_allocation_savings = new Chart(savingsCanvas.getContext('2d'), {type:'line',data:savingsData,options:savingsOptions,plugins:[allocationRetirementMarkerPlugin()]});
  }

  const technical = els('allocationExplorerTechnical');
  if (technical) technical.innerHTML = `<div class="table-scroll"><table style="min-width:760px"><thead><tr><th>Life Stage</th><th>When</th><th>Equity</th><th>Fixed Income</th><th>Cash</th><th>Expected Return</th><th>Volatility</th></tr></thead><tbody>${ALLOCATION_STAGE_INFO.map((s,i)=>{
    const fixed=Math.max(0,100-modelDef.equity[i]-modelDef.cash[i]);
    return `<tr><td>${s.label}</td><td>${s.when}</td><td>${modelDef.equity[i]}%</td><td>${fixed}%</td><td>${modelDef.cash[i]}%</td><td>${modelDef.returns[i].toFixed(2)}%</td><td>${modelDef.volatility[i].toFixed(2)}%</td></tr>`;
  }).join('')}</tbody></table></div><p style="font-size:14.5px;color:var(--muted);line-height:1.55;">Your current plan assumes ${(inputs.preReturn*100).toFixed(1)}% return / ${(inputs.preStdev*100).toFixed(1)}% volatility before retirement and ${(inputs.postReturn*100).toFixed(1)}% / ${(inputs.postStdev*100).toFixed(1)}% after retirement. The strategy model changes those assumptions gradually by life stage. Published equity, return, and volatility values are used directly; the cash sleeve scales from 1% in accumulation to ${modelDef.cash[4]}% in distribution, with fixed income filling the remainder.</p>`;
}

let sustainableSpendingResults = null;
function sustainableRecurringMonthly(multiplier) {
  const likeMonthly = expenses.reduce((sum, item) => sum + Math.max(0, +item.amount || 0), 0);
  const mustMonthly = expenses.reduce((sum, item) => {
    const amount = item.mustSpend == null || item.mustSpend === '' ? (+item.amount || 0) : (+item.mustSpend || 0);
    return sum + Math.max(0, amount);
  }, 0);
  return mustMonthly + Math.max(0, likeMonthly - mustMonthly) * multiplier;
}
function findSustainableSpendingMultiplier(inputs, ctx, targetScore, simulations = 500) {
  const scoreAt = multiplier => runMonteCarlo(
    { ...inputs, discretionarySpendingMultiplier: multiplier },
    ctx,
    simulations
  );
  const minimumScore = scoreAt(0);
  if (minimumScore + 1e-9 < targetScore) {
    return { attainable:false, multiplier:0, score:minimumScore };
  }
  let low = 0, high = 3;
  const highScore = scoreAt(high);
  if (highScore >= targetScore) {
    return { attainable:true, multiplier:high, score:highScore, capped:true };
  }
  for (let i = 0; i < 10; i++) {
    const midpoint = (low + high) / 2;
    if (scoreAt(midpoint) >= targetScore) low = midpoint;
    else high = midpoint;
  }
  return { attainable:true, multiplier:low, score:scoreAt(low), capped:false };
}
function renderSustainableSpendingResults() {
  const host = els('sustainableSpendingResult');
  if (!host) return;
  if (!sustainableSpendingResults) {
    host.innerHTML = '<p style="color:var(--muted);font-size:14px;">Run the analysis to estimate the recurring Like-to-Spend amount supported at 80%, 85%, and 90% confidence.</p>';
    return;
  }
  const currentMonthly = sustainableSpendingResults.currentMonthly;
  const rows = sustainableSpendingResults.targets.map(result => {
    if (!result.attainable) {
      return `<tr><td>${result.target}%</td><td colspan="3">Not attainable by reducing discretionary recurring spending alone</td><td>${Math.round(result.score)}%</td></tr>`;
    }
    const monthly = sustainableRecurringMonthly(result.multiplier);
    const difference = monthly - currentMonthly;
    return `<tr>
      <td>${result.target}%</td>
      <td>${fmtMoney(monthly)}/mo</td>
      <td>${difference >= 0 ? '+' : ''}${fmtMoney(difference)}/mo</td>
      <td>${Math.round(result.multiplier * 100)}% of current discretionary spending${result.capped ? ' (analysis cap)' : ''}</td>
      <td>${Math.round(result.score)}%</td>
    </tr>`;
  }).join('');
  host.innerHTML = `
    <div class="metric-grid" style="margin-bottom:14px;">
      <div class="metric-card"><span>Current Like-to-Spend</span><strong>${fmtMoney(currentMonthly)}/mo</strong></div>
      <div class="metric-card"><span>Current modeled confidence</span><strong>${Math.round(sustainableSpendingResults.baselineScore)}%</strong></div>
    </div>
    <div class="table-scroll"><table style="min-width:720px;">
      <thead><tr><th>Target</th><th>Estimated recurring spending</th><th>Change from current</th><th>Discretionary level</th><th>Tested score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p style="font-size:13px;color:var(--muted);line-height:1.5;margin-top:10px;">This changes only the portion above Must Spend. Housing, debt, insurance, medical premiums, future expenses, and other fixed essentials remain fully modeled. Results use 500 common-path simulations and are planning estimates, not spending guarantees.</p>`;
}
function runSustainableSpendingAndRender() {
  const button = els('sustainableSpendingRunBtn');
  if (button) { button.disabled = true; button.textContent = 'Running analysis…'; }
  setTimeout(() => {
    const savedBasis = spendingBasis;
    try {
      spendingBasis = 'liketo';
      const inputs = readInputs();
      const ctx = buildContext(inputs);
      const baselineScore = runMonteCarlo({ ...inputs, discretionarySpendingMultiplier:1 }, ctx, 500);
      const targets = [80, 85, 90].map(target => ({
        target,
        ...findSustainableSpendingMultiplier(inputs, ctx, target, 500)
      }));
      sustainableSpendingResults = {
        currentMonthly:sustainableRecurringMonthly(1),
        baselineScore,
        targets
      };
      renderSustainableSpendingResults();
    } finally {
      spendingBasis = savedBasis;
      if (button) { button.disabled = false; button.textContent = 'Run Sustainable Spending Analysis'; }
    }
  }, 30);
}

let retirementTimingRunToken = 0;
function renderRetirementTimingAnalysis() {
  const host = els('compareBox');
  if (!host) return;
  const runToken = ++retirementTimingRunToken;
  host.innerHTML = `
    <div class="note" style="display:flex;align-items:center;gap:10px;">
      <span aria-hidden="true">⏳</span>
      <span><b>Calculating retirement ages 55 through 59…</b><br>This may take a few moments on a phone.</span>
    </div>`;
  // Yield once so the loading message paints before the five 1,000-path comparisons begin.
  setTimeout(() => {
    if (runToken !== retirementTimingRunToken ||
        selectedExplorerAnalysis !== 'retirementtiming' ||
        document.querySelector('.page.active')?.dataset.page !== 'explorers') return;
    const inputs = readInputs();
    const ctx = buildContext(inputs);
    const ageOptions = [55, 56, 57, 58, 59];
    const ageRuns = ageOptions.map(age => ({
      age,
      det: projectRun({...inputs, retirementAge:age}, ctx, false),
      score: runMonteCarlo({...inputs, retirementAge:age}, ctx, 1000)
    }));
    if (runToken !== retirementTimingRunToken) return;
    host.innerHTML = `
      <div class="retirement-timing-grid">
        ${ageRuns.map(r => {
          const endingRow = r.det.rows && r.det.rows.length ? r.det.rows[r.det.rows.length - 1] : null;
          const endingNetWorth = endingRow ? endingRow.netWorth : 0;
          const scoreClass = r.score >= 80 ? 'strong' : r.score >= 60 ? 'good' : r.score >= 40 ? 'caution' : 'risk';
          const isCurrent = r.age === inputs.retirementAge;
          return `
          <div class="retirement-timing-card ${isCurrent ? 'current' : ''}">
            <div class="retirement-timing-head">
              <div class="retirement-timing-age">Retire at ${r.age}</div>
              ${isCurrent ? '<span class="retirement-timing-badge">Current plan</span>' : ''}
            </div>
            <div class="retirement-timing-score-label">Confidence score</div>
            <div class="retirement-timing-score ${scoreClass}">${Math.round(r.score)}%</div>
            <div class="retirement-timing-row"><span>Investable at retirement</span><strong>${fmtMoneyK(dv(r.det.investableAtRetirement, r.age, inputs))}</strong></div>
            <div class="retirement-timing-row"><span>Ending net worth</span><strong>${fmtMoneyK(dv(endingNetWorth, endingRow ? endingRow.age : r.age, inputs))}</strong></div>
            <div class="retirement-timing-longevity ${r.det.depletionAge ? 'warn' : ''}">${r.det.depletionAge ? 'Runs out at age ' + r.det.depletionAge : 'Lasts through age ' + ctx.effectiveLifeExpectancy}</div>
          </div>`;
        }).join('')}
      </div>`;
  }, 30);
}

function renderExplorers() {
  const inputs = readInputs();
  const ctx = buildContext(inputs);
  renderMarketExplorer(inputs, ctx);
  renderAllocationExplorer(inputs, ctx);
  renderHistoricalBacktest(inputs, ctx);
  renderSustainableSpendingResults();
  renderCompareCardGrid();
  // Cheap redraw only — never recomputes. If sensitivityResults/ssComparisonResults/compareResults are
  // still null (never run yet, or Reset Everything cleared them), these just keep their card's
  // placeholder state hidden and return.
  renderSensitivityAnalysis();
  renderSSComparison(inputs);
  renderScenarioCompare(inputs);
}

// ---------- Savings page: per-account balances, contributions/returns, and drawdowns by year ----------
// From projectRun()'s per-account tracking. Returns are the reconciling plug:
// returns = end - begin - contributions + withdrawals.
