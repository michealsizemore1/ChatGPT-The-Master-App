if (typeof Chart !== 'undefined') {
  Chart.defaults.font.size = 13; Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  // Draws the actual value on/next to each bar — opt-in per chart via a flag set directly on the
  // dataset itself (dataset.showValues / dataset.valueFormatter, set from barConfig()'s opts.showValues)
  // rather than through chart.options.plugins.barValueLabels. Reading it off the dataset sidesteps any
  // question of whether Chart.js's options-merge machinery actually exposes a custom plugin's config
  // object the way core options (scales, tooltip callbacks, etc.) are exposed — dataset properties are
  // plain data, always intact, and pieContribution/pieBalance access already proves that works reliably.
  Chart.register({
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
      // Defensive: a draw-time error here must never be allowed to break the chart's own
      // rendering/hover for the rest of Chart.js's render pipeline (afterDatasetsDraw runs
      // for every registered plugin on every chart, so one bad plugin can otherwise poison
      // the whole draw call).
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
            // Smaller font + tighter padding on mobile — the pill is drawn at a fixed pixel size
            // regardless of canvas width, so on a narrow phone viewport (where bars are already
            // thinner and closer together) the full-size desktop pill is disproportionately large
            // and collides with its neighbors.
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
  // Draws the $ amount + % directly on each pie slice — same opt-in pattern as barValueLabels
  // above (dataset.showValues / dataset.valueFormatter), just reading arc centers instead of bar
  // positions. Tiny slices (<6% of the total) skip their label since there's no room to fit text
  // without it spilling outside the arc.
  Chart.register({
    id: 'pieValueLabels',
    afterDatasetsDraw(chart) {
      try {
        // This plugin computes "value (percent of the whole)" — only meaningful for a pie/doughnut,
        // where every slice really is a share of one total. It used to be gated on dataset.showValues
        // alone, which every bar chart ALSO sets (via barConfig's opts.showValues) to get its own
        // barValueLabels pill — so this plugin was firing on every bar chart too, drawing a second,
        // unboxed white "value (N%)" label directly on top of barValueLabels' solid black pill at the
        // same position. Against a light chart background that second label was nearly invisible and
        // just muddied the real one. Restricting to actual pie charts fixes both problems at once.
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
  // Draws a dashed vertical baseline marker on the Sensitivity/Tornado chart (Explorers page) at the
  // plan's current confidence score, so each lever's low→high span reads visually against where you
  // actually stand today. Opt-in via chart.tornadoBaselineValue (a plain number set directly on the
  // chart instance after creation) rather than chart.options.plugins, same reasoning as barValueLabels
  // above — a plain instance property is guaranteed to survive Chart.js's internal option merging.
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
// The chart CSS/canvas system below was tuned on a wide desktop screen: fixed pixel font sizes for
// axis ticks and the value-label pills, and container heights (not widths) that adapt to item count.
// On a narrow phone viewport none of that adapts — the canvas width shrinks to the screen, but bar
// count, label text, and font sizes stay exactly the same, so bars/labels that had comfortable room
// on desktop visually collide on mobile. isMobile() drives smaller fonts/labels below; the
// ensureChartHorizontalScroll() helper gives bar-heavy or label-heavy charts a guaranteed minimum
// pixel width and lets the card scroll horizontally instead of squeezing bars to unreadable thinness.
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
// Which Expenses-page column ('liketo' or 'mustspend') drives the actual baseline spending used
// every year by projectRun() — and therefore the guardrails, the dashboard, the Gap page, Explorers,
// and every Monte Carlo run, since they all flow through buildContext()/projectRun(). The Must Spend
// *floor* (guardrails never cutting below it) is unaffected by this toggle either way — it's always
// the true essential-only total; this only changes what spending STARTS at before any guardrail cut.
let spendingBasis = 'liketo'; // 'liketo' | 'mustspend' | 'jobloss' (test)
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
// Which per-item dollar value a single expense row contributes, given whichever basis is currently
// selected in the header toggle — same fallback chain the engine itself uses in buildContext (Must
// Spend falls back to Like to Spend if left blank; Job Loss falls back to Must Spend, then Like to
// Spend). Used by every UI element on the Expenses page (chart, combined-total card) so they all switch
// together with the toggle instead of the chart/totals staying frozen on Like to Spend regardless of
// which basis is actually selected.
function expenseValForBasis(e) {
  const mustSpend = e.mustSpend != null ? +e.mustSpend : (+e.amount || 0);
  if (spendingBasis === 'mustspend') return mustSpend;
  if (spendingBasis === 'jobloss') return e.jobLoss != null ? +e.jobLoss : mustSpend;
  return +e.amount || 0;
}

// Job Loss test: the specific calendar date the header toggle's Job Loss basis actually kicks in on —
// lives outside .page like dollarView/spendingBasis above, so it gets its own dedicated localStorage key
// rather than the generic per-page saveState() mechanism.
let jobLossDate = '2026-12-31';
const JOB_LOSS_DATE_KEY = 'retirementPlannerJobLossDate_v1';
// Converts an arbitrary future (or past) calendar date into the whole-number age it falls in, the same
// year-resolution every other age in this engine works at — a job loss "3 months from now" and one
// "11 months from now" both land in the same projection year, which is the right precision for an
// annual simulation even though the date picker itself is precise to the day.
function dateToAge(dateStr, currentAge) {
  if (!dateStr) return null;
  // Anchor on the actual birth date (day precision, same logic as computeAgeFromBirthDate) rather
  // than approximating via elapsed time from today — see monthToAge for why the old approach was
  // off by one for anyone whose birthday hasn't occurred yet this calendar year.
  const birthDateStr = els('birthDate') ? els('birthDate').value : '';
  const [by, bm, bd] = (birthDateStr || '').split('-').map(Number);
  if (by && bm) {
    const [ty, tm, td] = dateStr.split('-').map(Number);
    let age = ty - by;
    const hadBirthday = (tm > bm) || (tm === bm && (bd ? td >= bd : true));
    if (!hadBirthday) age--;
    return Math.max(0, age);
  }
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yearsAway = (target - today) / (365.25*24*60*60*1000);
  return Math.max(0, Math.round(currentAge + yearsAway));
}
function setJobLossDate(value) {
  jobLossDate = value;
  try { localStorage.setItem(JOB_LOSS_DATE_KEY, value); } catch (e) { /* storage unavailable, ignore */ }
  const hintEl = els('jobLossDateHint');
  if (hintEl) {
    if (!value) { hintEl.textContent = ''; }
    else {
      const currentAge = +els('currentAge').value;
      const age = dateToAge(value, currentAge);
      const today = new Date(), target = new Date(value + 'T00:00:00');
      const monthsAway = Math.round((target - today) / (30.437*24*60*60*1000));
      hintEl.textContent = monthsAway <= 0 ? `≈ age ${age}` : `≈ ${monthsAway} mo away — age ${age}`;
    }
  }
  render();
}
const PAGE_LABELS = {
  dashboard:'Overview', personal:'Personal & Family', income:'Income', survivorship:'Survivorship', moneyflows:'Money Flows',
  investments:'Investments', housing:'Housing', expenses:'Expenses', incomeexpenses:'Income vs Expenses', debt:'Debt',
  gap:'Income Gap & Withdrawals', medical:'Medical', estate:'Estate Planning', vault:'Document Vault', insurance:'Insurance',
  taxes:'Taxes', assumptions:'Assumptions & Guardrails',
  explorers:'Explorers', coach:'Coach', wellness:'Financial Wellness', savings:'Savings', settings:'Settings'
};
const MY_PLAN_PAGES = ['personal','income','expenses','insurance','investments','assumptions','estate','debt','moneyflows','medical','housing'];
const INSIGHTS_PAGES = ['incomeexpenses','gap','savings','taxes'];
const EXPLORER_ANALYSIS_KEY = 'retirementPlannerExplorerAnalysis_v1';
const EXPLORER_ANALYSES = {
  whatif:'What If I...', retirementtiming:'Retirement Timing', market:'Market Explorer', allocation:'Allocation Explorer',
  historical:'Historical Backtest', socialsecurity:'Social Security Claiming',
  sustainablespending:'Sustainable Spending',
  comparison:'Scenario Comparison', whatifresults:'What-If Scenario Results',
  marketrisk:'Market Risk Scenarios', sensitivity:'Sensitivity Analysis'
};
let selectedExplorerAnalysis = 'whatif';

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
  return isKnownExplorerAnalysis(analysisId) ? analysisId : 'whatif';
}
function activateExplorerAnalysis(analysisId, scrollToSection = true, persist = true) {
  if (!isKnownExplorerAnalysis(analysisId)) analysisId = 'whatif';
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

function readInitialPage() {
  let pageId = '';
  try { pageId = decodeURIComponent(location.hash.slice(1)).split('/')[0]; } catch (e) { pageId = ''; }
  if (!isKnownPage(pageId)) {
    try { pageId = localStorage.getItem(ACTIVE_PAGE_KEY) || ''; } catch (e) { pageId = ''; }
  }
  return isKnownPage(pageId) ? pageId : '';
}

// Collapse/expand a card by clicking its title. Purely a display toggle —
// doesn't touch any field values, so nothing here affects the plan or Monte Carlo score.
function toggleCard(h3) {
  h3.parentElement.classList.toggle('collapsed');
  // A chart inside a card that was just un-collapsed (display:none -> visible) has been sitting at
  // zero size the whole time, so Chart.js's own responsive layout never had a real size to work
  // with — dispatching a resize event is what Chart.js's responsive plugin listens for, and forces
  // every chart on the page (cheap, since there are never more than a handful) to recompute its
  // canvas size against whatever's actually visible right now.
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
  // Every collapsible card collapses each time its section is visited, so you always land on a clean,
  // scannable list of titles. Only cards with an actual <h3 onclick="toggleCard(this)"> header are
  // collapsible — a few cards (What If I..., Market Explorer) use a plain <h2> instead because they're
  // meant to always stay open, and must NOT get the .collapsed class: the CSS rule that hides a
  // collapsed card's body (.card.collapsed > *:not(h3){display:none}) would hide literally everything
  // in them, since they have no h3 to spare.
  const activePage = document.querySelector(`.page[data-page="${pageId}"]`);
  if (activePage) collapsePlannerCards(activePage);
  if (lastSnapshot) refreshSectionCharts(pageId, lastSnapshot);
  if (pageId === 'explorers') renderExplorers();
  if (pageId === 'coach') { renderCoachTips(); renderCoachAiGate(); }
  if (pageId === 'vault') { renderVaultDocuments(); renderVaultAiGate(); renderVaultSearch(); }
  if (pageId === 'savings') renderSavingsPage();
  closeMenu();
}

// ---------- Accounts & Cards: embedded credit-card/checking/savings/HYSA tracker ----------
// The tracker is a full standalone app in its own right (its own <html>/<head>/<script>, own
// render loop, own "categories"/"transactions"/"$"/"save" globals, etc). It used to run inside an
// iframe via srcdoc, which was supposed to inherit this page's origin and share localStorage with
// it — but on a file:// page, real-world browser behavior for srcdoc iframes turned out to be
// unreliable (isolated storage, blocked file pickers), not the spec-ideal same-origin behavior.
// So instead, the tracker's markup and CSS are attached directly into THIS page via a Shadow DOM,
// which is genuinely part of the same document — there is no origin question at all, storage is
// automatically shared, and file dialogs work normally. Shadow DOM keeps the tracker's CSS (.card,
// .btn, .modal-ov, etc — all names this page also uses) fully scoped so nothing bleeds through in
// either direction. The one thing Shadow DOM doesn't do for free is JS: the tracker's ~1300 lines
// call plain document.getElementById/querySelector to find ITS OWN elements, and the real global
// document can't see inside a shadow root. Rather than editing all of that code, its own top-level
// IIFE is given a substitute "document" as a parameter — one whose lookup methods are redirected
// into the shadow root, while everything else (creating elements, the global Escape-key handler)
// still goes to the real document, since those aren't shadow-root-specific.
