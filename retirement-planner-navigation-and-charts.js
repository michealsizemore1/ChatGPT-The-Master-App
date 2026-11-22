if (typeof Chart !== 'undefined') {
  Chart.defaults.font.size = 13; Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  // Draws the value on each bar. Opt-in via dataset.showValues / dataset.valueFormatter (set by
  // barConfig's opts.showValues); dataset properties always survive Chart.js's option merging.
  Chart.register({
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
      // A draw error here must never break the chart (this hook runs for every chart).
      try {
        const { ctx } = chart;
        const horizontal = chart.options && chart.options.indexAxis === 'y';
        chart.data.datasets.forEach((dataset, di) => {
          if (!dataset.showValues) return;
          const formatter = dataset.valueFormatter;
          const meta = chart.getDatasetMeta(di);
          if (!meta || meta.hidden) return;
          meta.data.forEach((bar, i) => {
            if (!bar) return;
            const value = dataset.data[i];
            if (value == null || isNaN(value)) return;
            const label = String(formatter ? formatter(value) : value);
            const pos = bar.tooltipPosition ? bar.tooltipPosition() : bar;
            if (pos.x == null || pos.y == null || isNaN(pos.x) || isNaN(pos.y)) return;
            ctx.save();
            // Smaller pill on phones so neighboring labels don't collide.
            const mobile = isMobile();
            const fontPx = mobile ? 11 : 13;
            ctx.font = "600 " + fontPx + "px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
            // Black pill behind the label, white text on top — computed as one box centered on a
            // single anchor point, so the same code handles both horizontal and vertical bars instead
            // of juggling separate textAlign/textBaseline combinations for each orientation.
            const textW = ctx.measureText(label).width;
            const padX = mobile ? 4 : 6, padY = mobile ? 2 : 3, boxH = fontPx + padY*2;
            const boxW = textW + padX*2;
            let boxX, boxY;
            if (horizontal) {
              boxY = pos.y - boxH/2;
              boxX = value < 0 ? (pos.x - 6 - boxW) : (pos.x + 6);
            } else {
              boxX = pos.x - boxW/2;
              boxY = value < 0 ? (pos.y + 4) : (pos.y - 4 - boxH);
            }
            const r = 4;
            ctx.beginPath();
            ctx.moveTo(boxX + r, boxY);
            ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
            ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
            ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
            ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
            ctx.closePath();
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, boxX + boxW/2, boxY + boxH/2);
            ctx.restore();
          });
        });
      } catch (err) {
        console.error('barValueLabels plugin error (ignored, chart rendering continues):', err);
      }
    }
  });
  // Draws $ amount + % on each pie slice (same opt-in as barValueLabels). Slices under 6% are skipped.
  Chart.register({
    id: 'pieValueLabels',
    afterDatasetsDraw(chart) {
      try {
        // Pie/doughnut only: bar charts also set showValues and would get a duplicate label.
        if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;
        chart.data.datasets.forEach((dataset, di) => {
          if (!dataset.showValues) return;
          const formatter = dataset.valueFormatter;
          const meta = chart.getDatasetMeta(di);
          if (!meta || meta.hidden) return;
          const total = dataset.data.reduce((s, v) => s + (+v || 0), 0);
          meta.data.forEach((arc, i) => {
            if (!arc) return;
            const value = dataset.data[i];
            if (value == null || isNaN(value) || value === 0) return;
            const pct = total ? Math.round(value / total * 100) : 0;
            if (pct < 6) return;
            const label = String(formatter ? formatter(value) : value) + ' (' + pct + '%)';
            const pos = arc.tooltipPosition ? arc.tooltipPosition() : arc.getCenterPoint();
            if (pos.x == null || pos.y == null || isNaN(pos.x) || isNaN(pos.y)) return;
            const { ctx } = chart;
            ctx.save();
            ctx.font = "600 " + (isMobile() ? 10 : 12) + "px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.65)';
            ctx.shadowBlur = 4;
            ctx.fillText(label, pos.x, pos.y);
            ctx.restore();
          });
        });
      } catch (err) {
        console.error('pieValueLabels plugin error (ignored, chart rendering continues):', err);
      }
    }
  });
  // Dashed baseline at the current confidence score on the Sensitivity/Tornado chart. Opt-in via
  // chart.tornadoBaselineValue.
  Chart.register({
    id: 'tornadoBaseline',
    afterDatasetsDraw(chart) {
      try {
        if (chart.tornadoBaselineValue == null) return;
        const xScale = chart.scales && chart.scales.x;
        if (!xScale) return;
        const xPos = xScale.getPixelForValue(chart.tornadoBaselineValue);
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        ctx.save();
        ctx.strokeStyle = '#7f95a8';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xPos, chartArea.top);
        ctx.lineTo(xPos, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
      } catch (err) {
        console.error('tornadoBaseline plugin error (ignored, chart rendering continues):', err);
      }
    }
  });
}
// ---------- Mobile-aware chart sizing ----------
// isMobile() drives smaller fonts/labels; ensureChartHorizontalScroll() gives crowded charts a minimum
// width and lets the card scroll sideways instead of squeezing bars.
function isMobile() {
  return window.innerWidth <= 700;
}
function ensureChartHorizontalScroll(canvas, desiredWidthPx) {
  if (!canvas) return;
  const card = canvas.closest('.mini-chart-card');
  if (!card) return;
  let inner = canvas.parentElement;
  if (!inner.classList || !inner.classList.contains('chart-scroll-inner')) {
    inner = document.createElement('div');
    inner.className = 'chart-scroll-inner';
    canvas.parentElement.insertBefore(inner, canvas);
    inner.appendChild(canvas);
  }
  card.classList.add('chart-scroll-outer');
  const cardWidth = card.clientWidth || 0;
  inner.style.width = (desiredWidthPx > cardWidth ? desiredWidthPx : cardWidth) + 'px';
}
let charts = {};
let lastSnapshot = null;
let dollarView = 'nominal'; // 'nominal' (future $) | 'real' (today's $)
const DOLLAR_VIEW_KEY = 'retirementPlannerDollarView_v1';
// Which Expenses column ('liketo' / 'mustspend') sets baseline spending for every
// projection. The Must Spend floor for guardrails is always the essentials total regardless.
let spendingBasis = 'liketo'; // 'liketo' | 'mustspend'
const SPENDING_BASIS_KEY = 'retirementPlannerSpendingBasis_v1';

// Deflates a value anchored at a given future age back to today's purchasing power, using General Inflation.
// No-op when dollarView is 'nominal'.
function dv(value, age, inputs) {
  if (dollarView !== 'real' || value === null || value === undefined) return value;
  const y = age - inputs.currentAge;
  return value / Math.pow(1 + inputs.inflation, y);
}

function setDollarView(mode) {
  dollarView = mode;
  document.querySelectorAll('#dollarToggle .dollar-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  try { localStorage.setItem(DOLLAR_VIEW_KEY, mode); } catch (e) { /* storage unavailable, ignore */ }
  render();
  const activePage = document.querySelector('.page.active');
  if (activePage && activePage.dataset.page === 'explorers') renderExplorers();
}

function setSpendingBasis(mode) {
  spendingBasis = mode;
  document.querySelectorAll('#spendingBasisToggle .dollar-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  try { localStorage.setItem(SPENDING_BASIS_KEY, mode); } catch (e) { /* storage unavailable, ignore */ }
  render();
  const activePage = document.querySelector('.page.active');
  if (activePage && activePage.dataset.page === 'explorers') renderExplorers();
}
// An expense row's value for the selected basis (Must Spend falls back to Like to Spend, as in buildContext).
function expenseValForBasis(e) {
  const mustSpend = e.mustSpend != null ? +e.mustSpend : (+e.amount || 0);
  if (spendingBasis === 'mustspend') return mustSpend;
  return +e.amount || 0;
}

const PAGE_LABELS = {
  dashboard:'Overview', personal:'Personal & Family', income:'Income', survivorship:'Survivorship', moneyflows:'Money Flows',
  investments:'Investments', housing:'Housing', expenses:'Expenses', debt:'Debt',
  gap:'Income, Expenses & Withdrawals', medical:'Medical', estate:'Estate Planning', vault:'Document Vault', insurance:'Insurance',
  taxes:'Taxes', assumptions:'Assumptions & Guardrails',
  explorers:'Explorers', coach:'Coach', wellness:'Financial Wellness', savings:'Savings', settings:'Settings'
};
const MY_PLAN_PAGES = ['personal','income','expenses','insurance','investments','assumptions','estate','debt','moneyflows','medical','housing'];
const INSIGHTS_PAGES = ['gap','savings','taxes'];
const EXPLORER_ANALYSIS_KEY = 'retirementPlannerExplorerAnalysis_v1';
const EXPLORER_ANALYSES = {
  retirementtiming:'Retirement Timing', market:'Market Explorer', allocation:'Allocation Explorer',
  historical:'Historical Backtest', socialsecurity:'Social Security Claiming',
  sustainablespending:'Sustainable Spending',
  comparison:'Scenario Comparison', sensitivity:'Sensitivity Analysis'
};
// Also where saved links to the removed What If I... / What-If Scenarios / Market Risk tools now land.
const DEFAULT_EXPLORER_ANALYSIS = 'comparison';
let selectedExplorerAnalysis = DEFAULT_EXPLORER_ANALYSIS;

function toggleMenu() {
  collapseNavDropdowns();
  els('sidenav').classList.toggle('open');
  els('navOverlay').classList.toggle('open');
}
function closeMenu() {
  els('sidenav').classList.remove('open');
  els('navOverlay').classList.remove('open');
  collapseNavDropdowns();
}
function collapseNavDropdowns() {
  document.querySelectorAll('#sidenav .nav-dropdown.open').forEach(group => group.classList.remove('open'));
}

function toggleMyPlanMenu(event) {
  if (event) event.stopPropagation();
  const group = els('myPlanNavGroup');
  if (group) group.classList.toggle('open');
}

function toggleInsightsMenu(event) {
  if (event) event.stopPropagation();
  const group = els('insightsNavGroup');
  if (group) group.classList.toggle('open');
}

function toggleExplorerMenu(event) {
  if (event) event.stopPropagation();
  const group = els('explorerNavGroup');
  if (group) group.classList.toggle('open');
}
function isKnownExplorerAnalysis(analysisId) {
  return Object.prototype.hasOwnProperty.call(EXPLORER_ANALYSES, analysisId);
}
function readInitialExplorerAnalysis() {
  let analysisId = '';
  try {
    const parts = decodeURIComponent(location.hash.slice(1)).split('/');
    if (parts[0] === 'explorers') analysisId = parts[1] || '';
  } catch (e) { analysisId = ''; }
  if (!isKnownExplorerAnalysis(analysisId)) {
    try { analysisId = localStorage.getItem(EXPLORER_ANALYSIS_KEY) || ''; } catch (e) { analysisId = ''; }
  }
  if (!isKnownExplorerAnalysis(analysisId) && isKnownExplorerAnalysis(selectedExplorerAnalysis)) analysisId = selectedExplorerAnalysis;
  return isKnownExplorerAnalysis(analysisId) ? analysisId : DEFAULT_EXPLORER_ANALYSIS;
}
function activateExplorerAnalysis(analysisId, scrollToSection = true, persist = true) {
  if (!isKnownExplorerAnalysis(analysisId)) analysisId = DEFAULT_EXPLORER_ANALYSIS;
  selectedExplorerAnalysis = analysisId;
  const page = document.querySelector('.page[data-page="explorers"]');
  if (!page) return;
  const cards = page.querySelectorAll('[data-explorer-analysis]');
  // Explorers behaves as separate subsections, not a long accordion: only the analysis selected in
  // the hamburger submenu is present on screen. Print CSS deliberately reveals all of them again.
  cards.forEach(card => {
    const selected = card.dataset.explorerAnalysis === analysisId;
    card.classList.toggle('explorer-analysis-hidden', !selected);
    card.classList.toggle('collapsed', !selected);
  });
  const target = page.querySelector(`[data-explorer-analysis="${analysisId}"]`);
  if (target) { target.classList.remove('collapsed'); target.classList.remove('explorer-analysis-hidden'); }
  document.querySelectorAll('.nav-subitem[data-explorer-nav]').forEach(item => item.classList.toggle('active', item.dataset.explorerNav === analysisId));
  els('currentPageLabel').textContent = 'Explorers - ' + EXPLORER_ANALYSES[analysisId];
  if (persist) {
    try {
      localStorage.setItem(EXPLORER_ANALYSIS_KEY, analysisId);
      localStorage.setItem(ACTIVE_PAGE_KEY, 'explorers');
    } catch (e) { /* storage unavailable, ignore */ }
    saveState();
  }
  const analysisHash = '#explorers/' + encodeURIComponent(analysisId);
  if (location.hash !== analysisHash) {
    try { history.replaceState(null, '', analysisHash); } catch (e) { /* URL marker is optional */ }
  }
  if (analysisId === 'retirementtiming') renderRetirementTimingAnalysis();
  if (scrollToSection && target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior:'smooth', block:'start' });
      window.dispatchEvent(new Event('resize'));
    }, 30);
  } else {
    window.dispatchEvent(new Event('resize'));
  }
}
function showExplorerAnalysis(analysisId) {
  if (!isKnownExplorerAnalysis(analysisId)) return;
  const alreadyOnExplorers = document.querySelector('.page.active')?.dataset.page === 'explorers';
  if (!alreadyOnExplorers) showPage('explorers');
  activateExplorerAnalysis(analysisId, true, true);
  closeMenu();
}

function isKnownPage(pageId) {
  return Array.from(document.querySelectorAll('#sidenav [data-page]'))
    .some(item => item.dataset.page === pageId);
}

function activatePageShell(pageId) {
  if (!isKnownPage(pageId)) pageId = 'dashboard';
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === pageId));
  document.querySelectorAll('#sidenav [data-page]').forEach(n => n.classList.toggle('active', n.dataset.page === pageId));
  els('currentPageLabel').textContent = PAGE_LABELS[pageId] || pageId;
  const inMyPlan = MY_PLAN_PAGES.includes(pageId);
  const inInsights = INSIGHTS_PAGES.includes(pageId);
  collapseNavDropdowns();
  if (els('myPlanNavToggle')) els('myPlanNavToggle').classList.toggle('active', inMyPlan);
  if (els('insightsNavToggle')) els('insightsNavToggle').classList.toggle('active', inInsights);
  return pageId;
}

// Income vs Expenses was merged into the Gap page; old links and saved sections open the merged page.
const MERGED_PAGES = { incomeexpenses: 'gap' };
function readInitialPage() {
  let pageId = '';
  try { pageId = decodeURIComponent(location.hash.slice(1)).split('/')[0]; } catch (e) { pageId = ''; }
  pageId = MERGED_PAGES[pageId] || pageId;
  if (!isKnownPage(pageId)) {
    try { pageId = localStorage.getItem(ACTIVE_PAGE_KEY) || ''; } catch (e) { pageId = ''; }
    pageId = MERGED_PAGES[pageId] || pageId;
  }
  return isKnownPage(pageId) ? pageId : '';
}

// Collapse/expand a card by clicking its title. Purely a display toggle —
// doesn't touch any field values, so nothing here affects the plan or Monte Carlo score.
function toggleCard(h3) {
  h3.parentElement.classList.toggle('collapsed');
  // A just-expanded card's charts were sized at zero; a resize event makes Chart.js re-measure them.
  window.dispatchEvent(new Event('resize'));
}

// A card is collapsible only when its direct heading actually uses toggleCard(). Applying the rule
// by behavior instead of by page name keeps every section consistent while leaving structural cards
// (embedded tools, score tiles, wellness summaries, etc.) alone when they have no clickable heading.
function collapsePlannerCards(root = document) {
  root.querySelectorAll('.card').forEach(card => {
    if (!card.classList.contains('no-autocollapse') && card.querySelector(':scope > h3[onclick*="toggleCard"]')) {
      card.classList.add('collapsed');
    }
  });
}

function showPage(pageId, persistPage = true) {
  pageId = activatePageShell(pageId);
  // Save immediately after the visible section changes. Page-specific charts and tools initialize
  // below; none of them should be able to prevent the navigation choice from being remembered.
  if (persistPage) {
    try { localStorage.setItem(ACTIVE_PAGE_KEY, pageId); } catch (e) { /* storage unavailable, ignore */ }
    // Explorers is a two-part route: the page plus the exact analysis. Never collapse it to plain
    // #explorers, because a refresh during that brief state would lose the selected subsection.
    const pageHash = pageId === 'explorers'
      ? '#explorers/' + encodeURIComponent(isKnownExplorerAnalysis(selectedExplorerAnalysis) ? selectedExplorerAnalysis : readInitialExplorerAnalysis())
      : '#' + encodeURIComponent(pageId);
    if (location.hash !== pageHash) {
      try { history.replaceState(null, '', pageHash); }
      catch (e) { try { location.hash = pageHash; } catch (ignored) {} }
    }
    saveState();
  }
  // Collapse every collapsible card (those with <h3 onclick="toggleCard(this)">) on each visit. Always-open
  // cards use <h2> and must not get .collapsed, which would hide everything in them.
  const activePage = document.querySelector(`.page[data-page="${pageId}"]`);
  if (activePage) collapsePlannerCards(activePage);
  if (lastSnapshot) refreshSectionCharts(pageId, lastSnapshot);
  if (pageId === 'explorers') renderExplorers();
  if (pageId === 'coach') { renderCoachTips(); renderCoachAiGate(); }
  if (pageId === 'vault') { renderVaultDocuments(); renderVaultAiGate(); renderVaultSearch(); }
  if (pageId === 'savings') renderSavingsPage();
  closeMenu();
}
