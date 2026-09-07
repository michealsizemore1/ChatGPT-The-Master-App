
// Full source of the standalone Accounts & Cards tracker app, loaded into a same-origin srcdoc
// iframe (see loadTrackerFrame() below) so it shares this page's localStorage while staying fully
// isolated in its own document — no risk of colliding with this page's own render()/save()/etc.
let TRACKER_HTML = '';
TRACKER_HTML += `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>Cindy's Credit Card Register v9</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#f0f2f5; --surface:#fff; --border:#e0e4ea;
  --primary:#2563eb; --primary-hover:#1d4ed8;
  --danger:#dc2626; --success:#16a34a;
  --text:#1e293b; --muted:#64748b;
}
html,body { height:100vh; overflow:hidden; display:flex; flex-direction:column;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  background:var(--bg); color:var(--text); }
header { flex-shrink:0; background:var(--primary); color:#fff;
  padding:10px 20px; display:flex; align-items:center; justify-content:space-between;
  box-shadow:0 2px 8px rgba(0,0,0,.15); }
header h1 { font-size:1.15rem; font-weight:700; }
header p  { font-size:.75rem; opacity:.8; margin-top:1px; }
.hbal .lbl { font-size:.7rem; opacity:.8; text-align:right; }
.hbal .amt { font-size:1.35rem; font-weight:700; }

.toolbar { flex-shrink:0; background:#1d4ed8; padding:6px 20px;
  display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
.toolbar .tlbl { font-size:.68rem; color:rgba(255,255,255,.55);
  text-transform:uppercase; letter-spacing:.06em; }
.btn-tb { background:rgba(255,255,255,.15); color:#fff;
  border:1px solid rgba(255,255,255,.3); }
.btn-tb:hover { background:rgba(255,255,255,.25); }

.page-body { flex:1; overflow:hidden; display:flex; flex-direction:column;
  padding:10px 16px; gap:8px; }

.summary { flex-shrink:0; display:grid; grid-template-columns:repeat(6,1fr); gap:8px; }
.card { background:var(--surface); border-radius:8px; padding:8px 12px;
  border:1px solid var(--border); box-shadow:0 1px 3px rgba(0,0,0,.05); }
.card .lbl { font-size:.67rem; color:var(--muted); text-transform:uppercase;
  letter-spacing:.05em; margin-bottom:2px; }
.card .val { font-size:1.1rem; font-weight:700; }
.card.exp .val { color:var(--danger); }
.card.ret .val { color:var(--success); }
.card.pay .val { color:#7c3aed; }
.card.bal .val { color:var(--primary); }
.card.uncl .val { color:#d97706; }
.card.uncl-ret .val { color:#15803d; }

.form-card { flex-shrink:0; background:var(--surface); border-radius:8px;
  border:1px solid var(--border); padding:9px 14px;
  display:flex; flex-wrap:wrap; gap:7px; align-items:flex-end; justify-content:center; }
.form-card .f   { min-width:110px; flex:1; max-width:190px; }
.form-card .ft  { min-width:180px; flex:1.5; max-width:250px; }
.form-card .fd  { min-width:150px; flex:2; max-width:270px; }
.form-card .category-field { min-width:340px; flex:2.6; max-width:520px; }
.form-card .who-field { min-width:140px; max-width:180px; }
.category-controls {
  display:grid;
  grid-template-columns:minmax(120px,1fr) auto auto auto;
  gap:4px;
  align-items:stretch;
}
.category-controls select { min-width:0; }
.category-controls .btn { padding-left:8px; padding-right:8px; }
.form-actions {
  display:flex; gap:6px; align-items:flex-end; flex:0 0 auto;
  min-width:150px; justify-content:flex-start; flex-wrap:wrap;
}

.fl label { display:block; font-size:.66rem; font-weight:600; color:var(--muted);
  margin-bottom:3px; text-transform:uppercase; letter-spacing:.04em; }
.fl input,.fl select { width:100%; padding:6px 9px; border:1px solid var(--border);
  border-radius:6px; font-size:.83rem; color:var(--text); background:#fafbfc;
  transition:border-color .15s,box-shadow .15s; outline:none; }
.fl input:focus,.fl select:focus { border-color:var(--primary);
  box-shadow:0 0 0 3px rgba(37,99,235,.1); background:#fff; }

.type-toggle { display:flex; gap:4px; }
.type-toggle input[type=radio] { display:none; }
.type-toggle label { flex:1; text-align:center; padding:6px 4px;
  border-radius:6px; border:1px solid var(--border); font-size:.78rem;
  font-weight:600; cursor:pointer; background:#fafbfc; color:var(--muted);
  transition:all .15s; }
.type-toggle input:checked+label.el { background:#fee2e2; color:var(--danger); border-color:#fca5a5; }
.type-toggle input:checked+label.rl { background:#dcfce7; color:var(--success); border-color:#86efac; }
.type-toggle input:checked+label.pl { background:#ede9fe; color:#7c3aed; border-color:#c4b5fd; }

.who-toggle { display:flex; gap:4px; }
.who-toggle input[type=radio] { display:none; }
.who-toggle label { flex:1; text-align:center; padding:6px 4px;
  border-radius:6px; border:1px solid var(--border); font-size:.78rem;
  font-weight:600; cursor:pointer; background:#fafbfc; color:var(--muted);
  transition:all .15s; }
.who-toggle input:checked+label.ml { background:#dbeafe; color:#1d4ed8; border-color:#93c5fd; }
.who-toggle input:checked+label.wl { background:#fce7f3; color:#be185d; border-color:#f9a8d4; }

.btn { padding:6px 13px; border-radius:6px; font-size:.83rem; font-weight:600;
  cursor:pointer; border:none; transition:background .15s,transform .05s; white-space:nowrap; }
.btn:active { transform:scale(.97); }
.btn-primary { background:var(--primary); color:#fff; }
.btn-primary:hover { background:var(--primary-hover); }
.btn-sm { padding:3px 8px; font-size:.75rem; }
.btn-ghost  { background:transparent; color:var(--muted); border:1px solid var(--border); }
.btn-ghost:hover { background:var(--bg); }
.btn-danger { background:#fee2e2; color:var(--danger); border:1px solid #fecaca; }
.btn-danger:hover { background:#fecaca; }
.btn-edit   { background:#eff6ff; color:var(--primary); border:1px solid #bfdbfe; }
.btn-edit:hover { background:#dbeafe; }
.btn-export { background:#f0fdf4; color:var(--success); border:1px solid #bbf7d0; }
.btn-uncl   { background:#fefce8; color:#92400e; border:1px solid #fde68a; }
.btn-uncl.active { background:#fde68a; }

.filters-card { flex-shrink:0; background:var(--surface); border-radius:8px;
  border:1px solid var(--border); padding:9px 14px;
  display:flex; gap:7px; align-items:flex-end; justify-content:center; flex-wrap:wrap; }
.filters-card .f { min-width:110px; flex:1; max-width:180px; }
.filter-actions { display:flex; gap:6px; align-items:flex-end; }

.filter-total { flex-shrink:0; display:none; background:#eff6ff;
  border:1px solid #bfdbfe; border-radius:7px; padding:6px 12px;
  font-size:.8rem; color:#1d4ed8; align-items:center; gap:10px; flex-wrap:wrap; }
.filter-total.on { display:flex; }
.filter-total strong { font-weight:700; }

.table-card { flex:1; min-height:0; background:var(--surface);
  border-radius:8px; border:1px solid var(--border);
  box-shadow:0 1px 3px rgba(0,0,0,.05);
  display:flex; flex-direction:column; overflow:hidden; }
.table-hdr { flex-shrink:0; display:flex; align-items:center;
  justify-content:space-between; padding:8px 14px;
  border-bottom:1px solid var(--border); gap:8px; flex-wrap:wrap; }
.table-hdr h2 { font-size:.87rem; font-weight:600; }
.table-hdr .thr { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
.table-hdr span { font-size:.75rem; color:var(--muted); }
.tscroll { flex:1; overflow-y:auto; overflow-x:hidden; }

/* Single table — auto layout adapts to content */
table { width:100%; border-collapse:collapse; table-layout:auto; }
thead th { position:sticky; top:0; z-index:1; text-align:left; padding:7px 8px;
  font-size:.64rem; text-transform:uppercase; letter-spacing:.06em;
  color:var(--muted); font-weight:600; background:#f8fafc;
  border-bottom:1px solid var(--border); white-space:nowrap; }
thead th.sortable { cursor:pointer; user-select:none; }
thead th.sortable:hover { background:#f0f2f5; }
.sarr { margin-left:2px; opacity:.4; }
.sarr.on { opacity:1; }

tbody tr { border-bottom:1px solid var(--border); }
tbody tr:last-child { border-bottom:none; }
tbody tr.exp-row { background:#fffafa; }
tbody tr.ret-row { background:#fafffa; }
tbody tr.pay-row { background:#faf8ff; }
tbody tr.exp-row:hover { background:#fef2f2; }
tbody tr.ret-row:hover { background:#f0fdf4; }
tbody tr.pay-row:hover { background:#f5f3ff; }
tbody tr.unclrd  { opacity:.72; }

td { padding:7px 8px; font-size:.82rem; vertical-align:middle; }
td.clr-cell { width:32px; text-align:center; }
.clr-cb { width:15px; height:15px; cursor:pointer; accent-color:var(--success); }
td.date-cell { white-space:nowrap; color:var(--muted); font-size:.78rem; width:82px; }
td.desc-cell { min-width:80px; max-width:1px; width:100%; } /* stretches */
td.amt-cell  { white-space:nowrap; text-align:right; width:80px; }
td.act-cell  { white-space:nowrap; text-align:center; width:58px; overflow:visible; }
td.cat-cell  { white-space:nowrap; width:92px; }
td.type-cell { white-space:nowrap; width:68px; }
td.bal-cell  { white-space:nowrap; text-align:right; width:90px; }

.desc-main { font-weight:500; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:100%; display:block; }
.desc-sub  { font-size:.7rem; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:block; }

.badge { display:inline-block; padding:2px 6px; border-radius:20px; font-size:.64rem; font-weight:600; }
.b-exp { background:#fee2e2; color:var(--danger); }
.b-ret { background:#dcfce7; color:var(--success); }
.b-pay { background:#ede9fe; color:#7c3aed; }
.catbdg { display:inline-block; padding:2px 6px; border-radius:20px;
  font-size:.64rem; font-weight:500; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }

.amt-exp,.amt-expense { color:#dc2626 !important; font-weight:700; font-variant-numeric:tabular-nums; }
.amt-ret,.amt-return  { color:#16a34a !important; font-weight:700; font-variant-numeric:tabular-nums; }
.amt-pay,.amt-payment { color:#7c3aed !important; font-weight:700; font-variant-numeric:tabular-nums; }
.amt-bal { font-weight:600; font-variant-numeric:tabular-nums; color:var(--primary); }
.amt-bal.neg { color:var(--danger); }

.empty-state { text-align:center; padding:36px 20px; color:var(--muted); }
.empty-state .icon { font-size:2rem; margin-bottom:8px; }


.ai-modal-wrap { background:var(--surface); border-radius:14px;
  width:440px; max-width:95vw; max-height:82vh;
  box-shadow:0 20px 60px rgba(0,0,0,.25);
  display:flex; flex-direction:column; overflow:hidden; }
.ai-mhdr { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  padding:12px 16px; display:flex; align-items:center;
  justify-content:space-between; flex-shrink:0; }
.ai-mhdr h3 { font-size:.9rem; font-weight:700; }
.ai-mhdr p  { font-size:.7rem; opacity:.85; margin-top:1px; }
.ai-mhdr button { background:rgba(255,255,255,.2); border:none; color:#fff;
  width:26px; height:26px; border-radius:50%; cursor:pointer; font-size:.9rem;
  display:flex; align-items:center; justify-content:center; }
.ai-msgs { flex:1; overflow-y:auto; padding:12px;
  display:flex; flex-direction:column; gap:9px; min-height:180px; }
.ai-msg { max-width:90%; padding:8px 12px; border-radius:12px;
  font-size:.82rem; line-height:1.55; white-space:pre-wrap; }
.ai-msg.bot  { background:#f1f5f9; color:var(--text); align-self:flex-start; border-bottom-left-radius:3px; }
.ai-msg.user { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; align-self:flex-end; border-bottom-right-radius:3px; }
.ai-chips { display:flex; flex-wrap:wrap; gap:5px; padding:0 12px 8px; flex-shrink:0; }
.ai-chip { padding:3px 9px; border-radius:20px; font-size:.72rem; font-weight:500;
  background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe; cursor:pointer; }
.ai-chip:hover { background:#ddd6fe; }
.ai-irow { display:flex; gap:7px; padding:9px 12px 12px;
  border-top:1px solid var(--border); flex-shrink:0; }
.ai-irow input { flex:1; padding:7px 11px; border:1px solid var(--border);
  border-radius:20px; font-size:.84rem; outline:none; color:var(--text); }
.ai-irow input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.ai-irow button { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  border:none; border-radius:20px; padding:7px 14px; font-size:.84rem; font-weight:600; cursor:pointer; }

.modal-ov { display:none; position:fixed; inset:0; background:rgba(0,0,0,.45);
  z-index:100; align-items:center; justify-content:center; }
.modal-ov.open { display:flex; }
.modal { background:var(--surface); border-radius:12px; padding:22px;
  width:520px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,.25); }
.modal h2 { font-size:1rem; font-weight:700; margin-bottom:16px; }
.mgrid { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
.mgrid .f.full { grid-column:1/-1; }
.mfooter { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }

/* Notes card */
.notes-card { flex-shrink:0; background:#fefce8; border:1px solid #fde68a;
  border-radius:8px; padding:8px 12px; }
.notes-card .notes-hdr { display:flex; align-items:center;
  justify-content:space-between; margin-bottom:5px; }
.notes-card .notes-hdr span { font-size:.7rem; font-weight:700;
  color:#92400e; text-transform:uppercase; letter-spacing:.05em; }
.notes-card .notes-hdr small { font-size:.65rem; color:#b45309; }
.notes-card textarea { width:100%; border:none; background:transparent;
  resize:none; font-size:.82rem; color:#1e293b; outline:none;
  font-family:inherit; line-height:1.5; min-height:52px; }

/* Tabs */
.tabs { flex-shrink:0; display:flex; background:#1e40af; padding:0 16px; gap:2px; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.tabs::-webkit-scrollbar { display:none; }
.tab-btn { flex-shrink:0; padding:9px 14px; font-size:.82rem; font-weight:600;
  color:rgba(255,255,255,.6); background:transparent; border:none;
  cursor:pointer; border-bottom:3px solid transparent; transition:all .15s; }
.tab-btn:hover { color:#fff; }
.tab-btn.active { color:#fff; border-bottom-color:#fff; }

/* 4-column summary (checking) */
.summary-4 { flex-shrink:0; display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
@media (max-width:700px) { .summary-4 { grid-template-columns:1fr 1fr; } }

/* Checking-specific row colours */
tbody tr.dep-row { background:#fafffa; }
tbody tr.wth-row { background:#fffafa; }
tbody tr.dep-row:hover { background:#f0fdf4; }
tbody tr.wth-row:hover { background:#fef2f2; }

/* Receipt Scanner */
.scan-modal-body { display:flex; flex-direction:column; gap:14px; }
.scan-drop-zone { border:2px dashed #cbd5e1; border-radius:12px; padding:28px 16px; text-align:center; background:#f8fafc; transition:border-color .15s; }
.scan-drop-zone.drag-over { border-color:#2563eb; background:#eff6ff; }
.scan-drop-icon { font-size:2.2rem; margin-bottom:8px; }
.scan-drop-zone p { color:#64748b; font-size:.84rem; margin:6px 0 12px; }
.scan-hint { font-size:.73rem !important; color:#94a3b8 !important; margin-top:4px !important; }
.scan-preview-img { max-width:100%; max-height:180px; object-fit:contain; border-radius:8px; display:block; margin:0 auto; }
.scan-prog-wrap { text-align:center; }
.scan-status-txt { font-size:.82rem; color:#475569; margin-bottom:8px; }
.scan-bar { height:7px; background:#e2e8f0; border-radius:4px; overflow:hidden; }
.scan-fill { height:100%; background:#2563eb; border-radius:4px; transition:width .25s; }
.scan-result-fields { display:flex; flex-wrap:wrap; gap:10px; }
.scan-result-fields .f,.scan-result-fields .fd { flex:1 1 140px; display:flex; flex-direction:column; gap:4px; }
.scan-result-fields .fd { flex:1 1 100%; }
.scan-result-fields label { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#64748b; }
.scan-result-fields input,.scan-result-fields select { padding:7px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:.84rem; color:#1e293b; outline:none; width:100%; }
.scan-raw-pre { font-size:.71rem; background:#f1f5f9; padding:8px 10px; border-radius:6px; max-height:110px; overflow:auto; white-space:pre-wrap; margin-top:6px; color:#475569; }
.btn-scan { background:#0f172a; color:#fff; border:none; }
.btn-scan:hover { background:#1e293b; }

/* Mobile overrides — only structural, no column tricks */
@media (max-width:1100px) {
  .summary { grid-template-columns:repeat(3,1fr); }
  .form-card { justify-content:flex-start; }
  .form-card .category-field { flex-basis:340px; }
}
@media (max-width:700px) {
  html,body { height:auto !important; overflow:auto !important; display:block !important; }
  .page-body { display:block; overflow:visible; height:auto; padding:8px 10px; }
  .page-body>* { margin-bottom:8px; }
  .table-card { display:block; flex:none; min-height:auto; overflow:visible; }
  .tscroll { overflow-x:hidden; overflow-y:visible; max-height:none; }
  .summary { grid-template-columns:1fr 1fr; }
  .form-card { align-items:stretch; }
  .form-card .f,.form-card .fd,.form-card .ft,.form-card .category-field,.form-card .who-field {
    max-width:100%; min-width:0; flex-basis:100%;
  }
  .form-actions { width:100%; min-width:0; }
  .filters-card { flex-direction:column; align-items:stretch; }
  .filters-card .f { max-width:100%; }
  .filter-actions { justify-content:flex-end; }
}
@media (max-width:430px) {
  .category-controls { grid-template-columns:1fr repeat(3,auto); }
  .category-controls select { grid-column:1/-1; }
  .category-controls .btn { min-height:34px; }
}
</style>
</head>
<body>

<header>
  <div><h1 id="page-title">&#x1F4B3; Cindy's Credit Card Register</h1><p id="page-sub">My Credit Card</p></div>
  <span style="font-size:.65rem;background:rgba(255,255,255,.18);color:#fff;padding:2px 7px;border-radius:10px;font-weight:700;letter-spacing:.04em;align-self:center;">v9</span>
  <div class="hbal">
    <div class="lbl">Current Balance</div>
    <div class="amt" id="hdr-bal">$0.00</div>
  </div>
</header>

<div class="toolbar">
  <span class="tlbl">Data</span>
  <button class="btn btn-tb btn-sm" id="btn-backup">&#x1F4BE; Backup</button>
  <button class="btn btn-tb btn-sm" id="btn-restore">&#x1F4C2; Restore</button>
  <button class="btn btn-tb btn-sm" id="btn-import">&#x1F4E5; Import CSV</button>
  <button class="btn btn-tb btn-sm" id="btn-trip">&#x2708;&#xFE0F; Trip</button>
  <span id="trip-indicator" style="display:none;background:#065f46;color:#fff;font-size:.72rem;padding:3px 9px;border-radius:12px;font-weight:600;white-space:nowrap;"></span>
  <button class="btn btn-tb btn-sm" id="btn-undo" disabled style="opacity:.45;">&#x21B6; Undo</button>
  <button class="btn btn-tb btn-sm" id="btn-redo" disabled style="opacity:.45;">&#x21B7; Redo</button>
  <button class="btn btn-tb btn-sm" id="btn-ai">&#x1F916; AI Assistant</button>
  <input type="file" id="restore-file" accept=".json" style="display:none">
  <input type="file" id="import-file" accept=".csv,.txt" style="display:none">
</div>

<div class="tabs">
  <button class="tab-btn active" id="tab-cc">&#x1F4B3; Credit Card</button>
  <button class="tab-btn" id="tab-chk">&#x1F3E6; Cindy's Checking</button>
  <button class="tab-btn" id="tab-mike">&#x1F3E6; Mike's Checking</button>
  <button class="tab-btn" id="tab-savings">&#x1F4B0; Savings</button>
  <button class="tab-btn" id="tab-hysa">&#x1F4C8; HYSA</button>
</div>

<div id="cc-pane" class="page-body">

  <div class="summary">
    <div class="card exp"><div class="lbl">&#x2713; Cleared Expenses</div><div class="val" id="s-exp">$0.00</div></div>
    <div class="card ret"><div class="lbl">&#x2713; Cleared Returns</div><div class="val" id="s-ret">$0.00</div></div>
    <div class="card pay"><div class="lbl">&#x2713; Cleared Payments</div><div class="val" id="s-pay">$0.00</div></div>
    <div class="card bal"><div class="lbl">&#x1F4B3; Total Owed</div><div class="val" id="s-bal">$0.00</div></div>
    <div class="card uncl"><div class="lbl">&#x26A0; Uncleared Charges</div><div class="val" id="s-uncl">$0.00</div></div>
    <div class="card uncl-ret"><div class="lbl">&#x21A9; Uncleared Returns</div><div class="val" id="s-uncl-ret">$0.00</div></div>
  </div>

  <div class="form-card">
    <div class="f fl"><label>Date</label><input type="date" id="txn-date"></div>
    <div class="fd fl"><label>Description</label><input type="text" id="txn-desc" placeholder="e.g. Starbucks, Amazon…" maxlength="100"></div>
    <div class="f fl"><label>Amount ($)</label><input type="number" id="txn-amt" placeholder="0.00" min="0.01" step="0.01"></div>
    <div class="f fl category-field" style="flex:1 1 100%;max-width:none;min-width:0;">
      <label>Category</label>
      <div class="category-controls" style="width:100%;">
        <select id="txn-cat" style="flex:1;min-width:0;"></select>
        <button class="btn btn-ghost btn-sm" id="btn-split-cat" title="Split this purchase across categories">Split</button>
        <button class="btn btn-ghost btn-sm" id="btn-delete-cat" title="Delete selected category">Delete</button>
        <button class="btn btn-ghost btn-sm" id="btn-show-cat" style="flex-shrink:0;padding:6px 8px;">＋</button>
      </div>
      <div id="cat-row" style="display:none;margin-top:4px;display:none;gap:4px;">
        <input type="text" id="new-cat" placeholder="New category…" maxlength="40"
          style="flex:1;padding:5px 8px;font-size:.8rem;border:1px solid var(--border);border-radius:5px;outline:none;color:var(--text);">
        <button class="btn btn-primary btn-sm" id="btn-save-cat">Add</button>
        <button class="btn btn-ghost btn-sm" id="btn-cancel-cat">&#x2715;</button>
      </div>
    </div>
    <div class="ft fl">
      <label>Type</label>
      <div class="type-toggle">
        <input type="radio" name="txn-type" id="te" value="expense" checked>
        <label for="te" class="el">Expense</label>
        <input type="radio" name="txn-type" id="tr" value="return">
        <label for="tr" class="rl">Return</label>
        <input type="radio" name="txn-type" id="tp" value="payment">
        <label for="tp" class="pl">Payment</label>
      </div>
    </div>
    <div class="f fl who-field">
      <label>Who</label>
      <div class="who-toggle">
        <input type="radio" name="txn-who" id="wm" value="me">
        <label for="wm" class="ml">&#x1F464; Me</label>
        <input type="radio" name="txn-who" id="ww" value="wife" checked>
        <label for="ww" class="wl">&#x1F469; Wife</label>
      </div>
    </div>
    <div class="form-actions">
      <div class="fl"><label style="color:transparent;">.</label><button class="btn btn-primary" id="btn-add">+ Add</button></div>
      <div class="fl" style="display:flex;align-items:flex-end;gap:4px;">
        <button class="btn btn-ghost btn-sm" id="cc-cam-btn" title="Take photo">&#x1F4F7;</button>
        <button class="btn btn-ghost btn-sm" id="cc-lib-btn" title="Choose from library">&#x1F5BC;</button>
        <img id="cc-photo-thumb" src="" style="display:none;height:30px;border-radius:3px;cursor:pointer;border:1px solid #e0e4ea;" title="Tap to remove">
        <input type="file" id="cc-cam-inp" accept="image/*" capture="environment" style="display:none">
        <input type="file" id="cc-lib-inp" accept="image/*" style="display:none">
      </div>
    </div>
    <span id="form-err" style="color:var(--danger);font-size:.78rem;flex-basis:100%;text-align:center;"></span>
  </div>

  <div class="filters-card">
    <div class="f fl"><label>Search</label><input type="text" id="f-search" placeholder="e.g. Starbucks…"></div>
    <div class="f fl"><label>Category</label><select id="f-cat"></select></div>
    <div class="f fl"><label>Type</label>
      <select id="f-type">
        <option value="">All Types</option>
        <option value="expense">Expenses</option>
        <option value="return">Returns</option>
        <option value="payment">Payments</option>
      </select>
    </div>
    <div class="f fl"><label>From</label><input type="date" id="f-from"></div>
    <div class="f fl"><label>To</label><input type="date" id="f-to"></div>
    <div class="filter-actions">
      <button class="btn btn-ghost btn-sm" id="btn-clr-filter">Clear</button>
      <button class="btn btn-export btn-sm" id="btn-export">&#x2B07; Export CSV</button>
    </div>
  </div>

  <div class="filter-total" id="filter-total">
    <span>&#x1F50D; Filter results:</span>
    <strong id="ft-count"></strong>
    <span id="ft-detail"></span>
  </div>

  <div class="notes-card">
    <div class="notes-hdr"><span>&#x1F4DD; Notes</span><small>auto-saved</small></div>
    <textarea id="cc-notes" placeholder="Jot down anything — due dates, credit limit, reminders…" rows="2"></textarea>
  </div>

  <div class="table-card">
    <div class="table-hdr">
      <h2>Transactions</h2>
      <div class="thr">
        <span id="row-count">0 transactions</span>
        <button class="btn btn-uncl btn-sm" id="btn-uncl">&#x26A0; Uncleared First</button>
        <button class="btn btn-danger btn-sm" id="btn-clr-all">Clear All</button>
      </div>
    </div>
    <div class="tscroll">
      <table id="txn-table">
        <thead id="txn-head"></thead>
        <tbody id="txn-body"></tbody>
      </table>
      <div id="empty-state" class="empty-state">
        <div class="icon">&#x1F9FE;</div>
        <p>No transactions yet. Add your first one above.</p>
      </div>
    </div>
  </div>

</div>

</div><!-- /cc-pane -->

<!-- Checking Pane -->
<div id="chk-pane" class="page-body" style="display:none;">

  <div class="form-card" style="justify-content:flex-start;">
    <div class="f fl"><label>Opening Balance ($)</label><input type="number" id="chk-open" placeholder="0.00" step="0.01" min="0"></div>
    <div class="form-actions"><div class="fl"><label style="color:transparent;">.</label><button class="btn btn-ghost" id="chk-btn-set-open">Set</button></div></div>
    <span id="chk-open-note" style="font-size:.75rem;color:#64748b;align-self:flex-end;padding-bottom:7px;"></span>
  </div>

  <div class="summary-4">
    <div class="card bal"><div class="lbl">&#x1F4B0; Account Balance</div><div class="val" id="chk-s-bal">$0.00</div></div>
    <div class="card ret"><div class="lbl">&#x2713; Cleared Balance</div><div class="val" id="chk-s-clr">$0.00</div></div>
    <div class="card uncl-ret"><div class="lbl">&#x26A0; Pending Deposits</div><div class="val" id="chk-s-pdep">$0.00</div></div>
    <div class="card uncl"><div class="lbl">&#x26A0; Pending Withdrawals</div><div class="val" id="chk-s-pwth">$0.00</div></div>
  </div>

  <div class="form-card">
    <div class="f fl"><label>Date</label><input type="date" id="chk-date"></div>
    <div class="fd fl"><label>Description</label><input type="text" id="chk-desc" placeholder="e.g. Paycheck, Rent…" maxlength="100"></div>
    <div class="f fl"><label>Amount ($)</label><input type="number" id="chk-amt" placeholder="0.00" min="0.01" step="0.01"></div>
    <div class="f fl category-field" style="flex:1 1 100%;max-width:none;min-width:0;">
      <label>Category</label>
      <div class="category-controls" style="width:100%;">
        <select id="chk-cat" style="flex:1;min-width:0;"></select>
        <button class="btn btn-sm" id="chk-btn-split-cat">Split</button>
        <button class="btn btn-sm" id="chk-btn-delete-cat">Delete</button>
        <button class="btn btn-sm" id="chk-btn-show-cat" style="flex-shrink:0;padding:6px 10px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-weight:700;">+</button>
      </div>
      <div id="chk-cat-row" style="display:none;margin-top:4px;gap:4px;">
        <input type="text" id="chk-new-cat" placeholder="New category…" maxlength="40"
          style="flex:1;padding:5px 8px;font-size:.8rem;border:1px solid #cbd5e1;border-radius:5px;outline:none;color:#1e293b;">
        <button class="btn btn-sm" id="chk-btn-save-cat" style="background:#2563eb;color:#fff;font-weight:600;">Add</button>
        <button class="btn btn-sm" id="chk-btn-cancel-cat" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">&#x2715;</button>
      </div>
    </div>
    <div class="ft fl">
      <label>Type</label>
      <div class="type-toggle">
        <input type="radio" name="chk-type" id="chk-dep" value="deposit" checked>
        <label for="chk-dep" class="rl">&#x2B06; Deposit</label>
        <input type="radio" name="chk-type" id="chk-wth" value="withdrawal">
        <label for="chk-wth" class="el">&#x2B07; Withdrawal</label>
      </div>
    </div>
    <div class="form-actions">
      <div class="fl"><label style="color:transparent;">.</label><button class="btn btn-primary" id="chk-btn-add">+ Add</button></div>
      <div class="fl" style="display:flex;align-items:flex-end;gap:4px;">
        <button class="btn btn-ghost btn-sm" id="chk-cam-btn" title="Take photo">&#x1F4F7;</button>
        <button class="btn btn-ghost btn-sm" id="chk-lib-btn" title="Choose from library">&#x1F5BC;</button>
        <img id="chk-photo-thumb" src="" style="display:none;height:30px;border-radius:3px;cursor:pointer;border:1px solid #e0e4ea;" title="Tap to remove">
        <input type="file" id="chk-cam-inp" accept="image/*" capture="environment" style="display:none">
        <input type="file" id="chk-lib-inp" accept="image/*" style="display:none">
      </div>
    </div>
    <span id="chk-form-err" style="color:#dc2626;font-size:.78rem;flex-basis:100%;text-align:center;"></span>
  </div>

  <div class="filters-card">
    <div class="f fl"><label>Search</label><input type="text" id="chk-f-search" placeholder="Search…"></div>
    <div class="f fl"><label>Type</label>
      <select id="chk-f-type">
        <option value="">All Types</option>
        <option value="deposit">Deposits</option>
        <option value="withdrawal">Withdrawals</option>
      </select>
    </div>
    <div class="f fl"><label>From</label><input type="date" id="chk-f-from"></div>
    <div class="f fl"><label>To</label><input type="date" id="chk-f-to"></div>
    <div class="filter-actions">
      <button class="btn btn-ghost btn-sm" id="chk-btn-clr-filter">Clear</button>
      <button class="btn btn-export btn-sm" id="chk-btn-export">&#x2B07; Export CSV</button>
    </div>
  </div>

  <div class="notes-card">
    <div class="notes-hdr"><span>&#x1F4DD; Notes</span><small>auto-saved</small></div>
    <textarea id="chk-notes" placeholder="Jot down anything — account number, routing number, reminders…" rows="2"></textarea>
  </div>

  <div class="table-card">
    <div class="table-hdr">
      <h2>Transactions</h2>
      <div class="thr">
        <span id="chk-row-count">0 transactions</span>
        <button class="btn btn-uncl btn-sm" id="chk-btn-uncl">&#x26A0; Uncleared First</button>
        <button class="btn btn-danger btn-sm" id="chk-btn-clr-all">Clear All</button>
      </div>
    </div>
    <div class="tscroll">
      <table id="chk-table"><thead id="chk-head"></thead><tbody id="chk-body"></tbody></table>
      <div id="chk-empty" class="empty-state"><div class="icon">&#x1F3E6;</div><p>No transactions yet.</p></div>
    </div>
  </div>

</div><!-- /chk-pane -->

<!-- Mike's Checking Pane -->
<div id="mike-pane" class="page-body" style="display:none;">

  <div class="form-card" style="justify-content:flex-start;">
    <div class="f fl"><label>Opening Balance ($)</label><input type="number" id="mike-open" placeholder="0.00" step="0.01" min="0"></div>
    <div class="form-actions"><div class="fl"><label style="color:transparent;">.</label><button class="btn btn-ghost" id="mike-btn-set-open">Set</button></div></div>
    <span id="mike-open-note" style="font-size:.75rem;color:#64748b;align-self:flex-end;padding-bottom:7px;"></span>
  </div>

  <div class="summary-4">
    <div class="card bal"><div class="lbl">&#x1F4B0; Account Balance</div><div class="val" id="mike-s-bal">$0.00</div></div>
    <div class="card ret"><div class="lbl">&#x2713; Cleared Balance</div><div class="val" id="mike-s-clr">$0.00</div></div>
    <div class="card uncl-ret"><div class="lbl">&#x26A0; Pending Deposits</div><div class="val" id="mike-s-pdep">$0.00</div></div>
    <div class="card uncl"><div class="lbl">&#x26A0; Pending Withdrawals</div><div class="val" id="mike-s-pwth">$0.00</div></div>
  </div>

  <div class="form-card">
    <div class="f fl"><label>Date</label><input type="date" id="mike-date"></div>
    <div class="fd fl"><label>Description</label><input type="text" id="mike-desc" placeholder="e.g. Paycheck, Rent…" maxlength="100"></div>
    <div class="f fl"><label>Amount ($)</label><input type="number" id="mike-amt" placeholder="0.00" min="0.01" step="0.01"></div>
    <div class="f fl category-field" style="flex:1 1 100%;max-width:none;min-width:0;">
      <label>Category</label>
      <div class="category-controls" style="width:100%;">
        <select id="mike-cat" style="flex:1;min-width:0;"></select>
        <button class="btn btn-sm" id="mike-btn-split-cat">Split</button>
        <button class="btn btn-sm" id="mike-btn-delete-cat">Delete</button>
        <button class="btn btn-sm" id="mike-btn-show-cat" style="flex-shrink:0;padding:6px 10px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-weight:700;">+</button>
      </div>
      <div id="mike-cat-row" style="display:none;margin-top:4px;gap:4px;">
        <input type="text" id="mike-new-cat" placeholder="New category…" maxlength="40"
          style="flex:1;padding:5px 8px;font-size:.8rem;border:1px solid #cbd5e1;border-radius:5px;outline:none;color:#1e293b;">
        <button class="btn btn-sm" id="mike-btn-save-cat" style="background:#2563eb;color:#fff;font-weight:600;">Add</button>
        <button class="btn btn-sm" id="mike-btn-cancel-cat" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">&#x2715;</button>
      </div>
    </div>
    <div class="ft fl">
      <label>Type</label>
      <div class="type-toggle">
        <input type="radio" name="mike-type" id="mike-dep" value="deposit" checked>
        <label for="mike-dep" class="rl">&#x2B06; Deposit</label>
        <input type="radio" name="mike-type" id="mike-wth" value="withdrawal">
        <label for="mike-wth" class="el">&#x2B07; Withdrawal</label>
      </div>
    </div>
    <div class="form-actions">
      <div class="fl"><label style="color:transparent;">.</label><button class="btn btn-primary" id="mike-btn-add">+ Add</button></div>
      <div class="fl" style="display:flex;align-items:flex-end;gap:4px;">
        <button class="btn btn-ghost btn-sm" id="mike-cam-btn" title="Take photo">&#x1F4F7;</button>
        <button class="btn btn-ghost btn-sm" id="mike-lib-btn" title="Choose from library">&#x1F5BC;</button>
        <img id="mike-photo-thumb" src="" style="display:none;height:30px;border-radius:3px;cursor:pointer;border:1px solid #e0e4ea;" title="Tap to remove">
        <input type="file" id="mike-cam-inp" accept="image/*" capture="environment" style="display:none">
        <input type="file" id="mike-lib-inp" accept="image/*" style="display:none">
      </div>
    </div>
    <span id="mike-form-err" style="color:#dc2626;font-size:.78rem;flex-basis:100%;text-align:center;"></span>
  </div>

  <div class="filters-card">
    <div class="f fl"><label>Search</label><input type="text" id="mike-f-search" placeholder="Search…"></div>
    <div class="f fl"><label>Type</label>
      <select id="mike-f-type">
        <option value="">All Types</option>
        <option value="deposit">Deposits</option>
        <option value="withdrawal">Withdrawals</option>
      </select>
    </div>
    <div class="f fl"><label>From</label><input type="date" id="mike-f-from"></div>
    <div class="f fl"><label>To</label><input type="date" id="mike-f-to"></div>
    <div class="filter-actions">
      <button class="btn btn-ghost btn-sm" id="mike-btn-clr-filter">Clear</button>
      <button class="btn btn-export btn-sm" id="mike-btn-export">&#x2B07; Export CSV</button>
    </div>
  </div>

  <div class="notes-card">
    <div class="notes-hdr"><span>&#x1F4DD; Notes</span><small>auto-saved</small></div>
    <textarea id="mike-notes" placeholder="Jot down anything — account number, routing number, reminders…" rows="2"></textarea>
  </div>

  <div class="table-card">
    <div class="table-hdr">
      <h2>Transactions</h2>
      <div class="thr">
        <span id="mike-row-count">0 transactions</span>
        <button class="btn btn-uncl btn-sm" id="mike-btn-uncl">&#x26A0; Uncleared First</button>
        <button class="btn btn-danger btn-sm" id="mike-btn-clr-all">Clear All</button>
      </div>
    </div>
    <div class="tscroll">
      <table id="mike-table"><thead id="mike-head"></thead><tbody id="mike-body"></tbody></table>
      <div id="mike-empty" class="empty-state"><div class="icon">&#x1F3E6;</div><p>No transactions yet.</p></div>
    </div>
  </div>

</div><!-- /mike-pane -->

<div id="savings-pane" class="page-body" style="display:none;">

  <div class="form-card" style="justify-content:flex-start;">
    <div class="f fl"><label>Opening Balance ($)</label><input type="number" id="savings-open" placeholder="0.00" step="0.01" min="0"></div>
    <div class="form-actions"><div class="fl"><label style="color:transparent;">.</label><button class="btn btn-ghost" id="savings-btn-set-open">Set</button></div></div>
    <span id="savings-open-note" style="font-size:.75rem;color:#64748b;align-self:flex-end;padding-bottom:7px;"></span>
  </div>

  <div class="summary-4">
    <div class="card bal"><div class="lbl">&#x1F4B0; Account Balance</div><div class="val" id="savings-s-bal">$0.00</div></div>
    <div class="card ret"><div class="lbl">&#x2713; Cleared Balance</div><div class="val" id="savings-s-clr">$0.00</div></div>
    <div class="card uncl-ret"><div class="lbl">&#x26A0; Pending Deposits</div><div class="val" id="savings-s-pdep">$0.00</div></div>
    <div class="card uncl"><div class="lbl">&#x26A0; Pending Withdrawals</div><div class="val" id="savings-s-pwth">$0.00</div></div>
  </div>

  <div class="form-card">
    <div class="f fl"><label>Date</label><input type="date" id="savings-date"></div>
    <div class="fd fl"><label>Description</label><input type="text" id="savings-desc" placeholder="e.g. Transfer, Interest…" maxlength="100"></div>
    <div class="f fl"><label>Amount ($)</label><input type="number" id="savings-amt" placeholder="0.00" min="0.01" step="0.01"></div>
    <div class="f fl category-field" style="flex:1 1 100%;max-width:none;min-width:0;">
      <label>Category</label>
      <div class="category-controls" style="width:100%;">
        <select id="savings-cat" style="flex:1;min-width:0;"></select>
        <button class="btn btn-sm" id="savings-btn-split-cat">Split</button>
        <button class="btn btn-sm" id="savings-btn-delete-cat">Delete</button>
        <button class="btn btn-sm" id="savings-btn-show-cat" style="flex-shrink:0;padding:6px 10px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-weight:700;">+</button>
      </div>
      <div id="savings-cat-row" style="display:none;margin-top:4px;gap:4px;">
        <input type="text" id="savings-new-cat" placeholder="New category…" maxlength="40"
          style="flex:1;padding:5px 8px;font-size:.8rem;border:1px solid #cbd5e1;border-radius:5px;outline:none;color:#1e293b;">
        <button class="btn btn-sm" id="savings-btn-save-cat" style="background:#2563eb;color:#fff;font-weight:600;">Add</button>
        <button class="btn btn-sm" id="savings-btn-cancel-cat" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">&#x2715;</button>
      </div>
    </div>
    <div class="ft fl">
      <label>Type</label>
      <div class="type-toggle">
        <input type="radio" name="savings-type" id="savings-dep" value="deposit" checked>
        <label for="savings-dep" class="rl">&#x2B06; Deposit</label>
        <input type="radio" name="savings-type" id="savings-wth" value="withdrawal">
        <label for="savings-wth" class="el">&#x2B07; Withdrawal</label>
      </div>
    </div>
    <div class="form-actions">
      <div class="fl"><label style="color:transparent;">.</label><button class="btn btn-primary" id="savings-btn-add">+ Add</button></div>
      <div class="fl" style="display:flex;align-items:flex-end;gap:4px;">
        <button class="btn btn-ghost btn-sm" id="savings-cam-btn" title="Take photo">&#x1F4F7;</button>
        <button class="btn btn-ghost btn-sm" id="savings-lib-btn" title="Choose from library">&#x1F5BC;</button>
        <img id="savings-photo-thumb" src="" style="display:none;height:30px;border-radius:3px;cursor:pointer;border:1px solid #e0e4ea;" title="Tap to remove">
        <input type="file" id="savings-cam-inp" accept="image/*" capture="environment" style="display:none">
        <input type="file" id="savings-lib-inp" accept="image/*" style="display:none">
      </div>
    </div>
    <span id="savings-form-err" style="color:#dc2626;font-size:.78rem;flex-basis:100%;text-align:center;"></span>
  </div>

  <div class="filters-card">
    <div class="f fl"><label>Search</label><input type="text" id="savings-f-search" placeholder="Search…"></div>
    <div class="f fl"><label>Type</label>
      <select id="savings-f-type">
        <option value="">All Types</option>
        <option value="deposit">Deposits</option>
        <option value="withdrawal">Withdrawals</option>
      </select>
    </div>
    <div class="f fl"><label>From</label><input type="date" id="savings-f-from"></div>
    <div class="f fl"><label>To</label><input type="date" id="savings-f-to"></div>
    <div class="filter-actions">
      <button class="btn btn-ghost btn-sm" id="savings-btn-clr-filter">Clear</button>
      <button class="btn btn-export btn-sm" id="savings-btn-export">&#x2B07; Export CSV</button>
    </div>
  </div>

  <div class="notes-card">
    <div class="notes-hdr"><span>&#x1F4DD; Notes</span><small>auto-saved</small></div>
    <textarea id="savings-notes" placeholder="Jot down anything — account number, routing number, reminders…" rows="2"></textarea>
  </div>
`;
TRACKER_HTML += `  <div class="table-card">
    <div class="table-hdr">
      <h2>Transactions</h2>
      <div class="thr">
        <span id="savings-row-count">0 transactions</span>
        <button class="btn btn-uncl btn-sm" id="savings-btn-uncl">&#x26A0; Uncleared First</button>
        <button class="btn btn-danger btn-sm" id="savings-btn-clr-all">Clear All</button>
      </div>
    </div>
    <div class="tscroll">
      <table id="savings-table"><thead id="savings-head"></thead><tbody id="savings-body"></tbody></table>
      <div id="savings-empty" class="empty-state"><div class="icon">&#x1F3E6;</div><p>No transactions yet.</p></div>
    </div>
  </div>

</div><!-- /savings-pane -->

<div id="hysa-pane" class="page-body" style="display:none;">

  <div class="form-card" style="justify-content:flex-start;">
    <div class="f fl"><label>Opening Balance ($)</label><input type="number" id="hysa-open" placeholder="0.00" step="0.01" min="0"></div>
    <div class="form-actions"><div class="fl"><label style="color:transparent;">.</label><button class="btn btn-ghost" id="hysa-btn-set-open">Set</button></div></div>
    <span id="hysa-open-note" style="font-size:.75rem;color:#64748b;align-self:flex-end;padding-bottom:7px;"></span>
  </div>

  <div class="summary-4">
    <div class="card bal"><div class="lbl">&#x1F4B0; Account Balance</div><div class="val" id="hysa-s-bal">$0.00</div></div>
    <div class="card ret"><div class="lbl">&#x2713; Cleared Balance</div><div class="val" id="hysa-s-clr">$0.00</div></div>
    <div class="card uncl-ret"><div class="lbl">&#x26A0; Pending Deposits</div><div class="val" id="hysa-s-pdep">$0.00</div></div>
    <div class="card uncl"><div class="lbl">&#x26A0; Pending Withdrawals</div><div class="val" id="hysa-s-pwth">$0.00</div></div>
  </div>

  <div class="form-card">
    <div class="f fl"><label>Date</label><input type="date" id="hysa-date"></div>
    <div class="fd fl"><label>Description</label><input type="text" id="hysa-desc" placeholder="e.g. Transfer, Interest…" maxlength="100"></div>
    <div class="f fl"><label>Amount ($)</label><input type="number" id="hysa-amt" placeholder="0.00" min="0.01" step="0.01"></div>
    <div class="f fl category-field" style="flex:1 1 100%;max-width:none;min-width:0;">
      <label>Category</label>
      <div class="category-controls" style="width:100%;">
        <select id="hysa-cat" style="flex:1;min-width:0;"></select>
        <button class="btn btn-sm" id="hysa-btn-split-cat">Split</button>
        <button class="btn btn-sm" id="hysa-btn-delete-cat">Delete</button>
        <button class="btn btn-sm" id="hysa-btn-show-cat" style="flex-shrink:0;padding:6px 10px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-weight:700;">+</button>
      </div>
      <div id="hysa-cat-row" style="display:none;margin-top:4px;gap:4px;">
        <input type="text" id="hysa-new-cat" placeholder="New category…" maxlength="40"
          style="flex:1;padding:5px 8px;font-size:.8rem;border:1px solid #cbd5e1;border-radius:5px;outline:none;color:#1e293b;">
        <button class="btn btn-sm" id="hysa-btn-save-cat" style="background:#2563eb;color:#fff;font-weight:600;">Add</button>
        <button class="btn btn-sm" id="hysa-btn-cancel-cat" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">&#x2715;</button>
      </div>
    </div>
    <div class="ft fl">
      <label>Type</label>
      <div class="type-toggle">
        <input type="radio" name="hysa-type" id="hysa-dep" value="deposit" checked>
        <label for="hysa-dep" class="rl">&#x2B06; Deposit</label>
        <input type="radio" name="hysa-type" id="hysa-wth" value="withdrawal">
        <label for="hysa-wth" class="el">&#x2B07; Withdrawal</label>
      </div>
    </div>
    <div class="form-actions">
      <div class="fl"><label style="color:transparent;">.</label><button class="btn btn-primary" id="hysa-btn-add">+ Add</button></div>
      <div class="fl" style="display:flex;align-items:flex-end;gap:4px;">
        <button class="btn btn-ghost btn-sm" id="hysa-cam-btn" title="Take photo">&#x1F4F7;</button>
        <button class="btn btn-ghost btn-sm" id="hysa-lib-btn" title="Choose from library">&#x1F5BC;</button>
        <img id="hysa-photo-thumb" src="" style="display:none;height:30px;border-radius:3px;cursor:pointer;border:1px solid #e0e4ea;" title="Tap to remove">
        <input type="file" id="hysa-cam-inp" accept="image/*" capture="environment" style="display:none">
        <input type="file" id="hysa-lib-inp" accept="image/*" style="display:none">
      </div>
    </div>
    <span id="hysa-form-err" style="color:#dc2626;font-size:.78rem;flex-basis:100%;text-align:center;"></span>
  </div>

  <div class="filters-card">
    <div class="f fl"><label>Search</label><input type="text" id="hysa-f-search" placeholder="Search…"></div>
    <div class="f fl"><label>Type</label>
      <select id="hysa-f-type">
        <option value="">All Types</option>
        <option value="deposit">Deposits</option>
        <option value="withdrawal">Withdrawals</option>
      </select>
    </div>
    <div class="f fl"><label>From</label><input type="date" id="hysa-f-from"></div>
    <div class="f fl"><label>To</label><input type="date" id="hysa-f-to"></div>
    <div class="filter-actions">
      <button class="btn btn-ghost btn-sm" id="hysa-btn-clr-filter">Clear</button>
      <button class="btn btn-export btn-sm" id="hysa-btn-export">&#x2B07; Export CSV</button>
    </div>
  </div>

  <div class="notes-card">
    <div class="notes-hdr"><span>&#x1F4DD; Notes</span><small>auto-saved</small></div>
    <textarea id="hysa-notes" placeholder="Jot down anything — account number, routing number, reminders…" rows="2"></textarea>
  </div>

  <div class="table-card">
    <div class="table-hdr">
      <h2>Transactions</h2>
      <div class="thr">
        <span id="hysa-row-count">0 transactions</span>
        <button class="btn btn-uncl btn-sm" id="hysa-btn-uncl">&#x26A0; Uncleared First</button>
        <button class="btn btn-danger btn-sm" id="hysa-btn-clr-all">Clear All</button>
      </div>
    </div>
    <div class="tscroll">
      <table id="hysa-table"><thead id="hysa-head"></thead><tbody id="hysa-body"></tbody></table>
      <div id="hysa-empty" class="empty-state"><div class="icon">&#x1F3E6;</div><p>No transactions yet.</p></div>
    </div>
  </div>

</div><!-- /hysa-pane -->

<!-- Checking Edit Modal -->
<div class="modal-ov" id="chk-edit-modal">
  <div class="modal">
    <h2>&#x270F;&#xFE0F; Edit Transaction</h2>
    <div class="mgrid">
      <div class="f fl"><label>Date</label><input type="date" id="chk-e-date"></div>
      <div class="f fl"><label>Amount ($)</label><input type="number" id="chk-e-amt" min="0.01" step="0.01"></div>
      <div class="f full fl"><label>Description</label><input type="text" id="chk-e-desc" maxlength="100"></div>
      <div class="f fl"><label>Category</label><select id="chk-e-cat"></select></div>
      <div class="f fl"><label>Trip</label><select id="chk-e-trip"></select></div>
      <div class="f fl">
        <label>Type</label>
        <div class="type-toggle">
          <input type="radio" name="chk-e-type" id="chk-ed" value="deposit">
          <label for="chk-ed" class="rl">&#x2B06; Deposit</label>
          <input type="radio" name="chk-e-type" id="chk-ew" value="withdrawal">
          <label for="chk-ew" class="el">&#x2B07; Withdrawal</label>
        </div>
      </div>
      <div class="f fl" style="display:flex;align-items:center;gap:8px;padding-top:18px;">
        <input type="checkbox" id="chk-e-cleared" style="width:16px;height:16px;accent-color:#16a34a;cursor:pointer;">
        <label for="chk-e-cleared" style="font-size:.84rem;color:#1e293b;text-transform:none;letter-spacing:0;font-weight:500;cursor:pointer;">Cleared</label>
      </div>
    </div>
    <div class="mfooter">
      <button class="btn btn-ghost" id="chk-btn-cancel-edit">Cancel</button>
      <button class="btn btn-primary" id="chk-btn-save-edit">Save Changes</button>
    </div>
    <div id="chk-edit-err" style="color:#dc2626;font-size:.78rem;margin-top:8px;text-align:right;"></div>
  </div>
</div>

<!-- Mike's Checking Edit Modal -->
<div class="modal-ov" id="mike-edit-modal">
  <div class="modal">
    <h2>&#x270F;&#xFE0F; Edit Transaction</h2>
    <div class="mgrid">
      <div class="f fl"><label>Date</label><input type="date" id="mike-e-date"></div>
      <div class="f fl"><label>Amount ($)</label><input type="number" id="mike-e-amt" min="0.01" step="0.01"></div>
      <div class="f full fl"><label>Description</label><input type="text" id="mike-e-desc" maxlength="100"></div>
      <div class="f fl"><label>Category</label><select id="mike-e-cat"></select></div>
      <div class="f fl"><label>Trip</label><select id="mike-e-trip"></select></div>
      <div class="f fl">
        <label>Type</label>
        <div class="type-toggle">
          <input type="radio" name="mike-e-type" id="mike-ed" value="deposit">
          <label for="mike-ed" class="rl">&#x2B06; Deposit</label>
          <input type="radio" name="mike-e-type" id="mike-ew" value="withdrawal">
          <label for="mike-ew" class="el">&#x2B07; Withdrawal</label>
        </div>
      </div>
      <div class="f fl" style="display:flex;align-items:center;gap:8px;padding-top:18px;">
        <input type="checkbox" id="mike-e-cleared" style="width:16px;height:16px;accent-color:#16a34a;cursor:pointer;">
        <label for="mike-e-cleared" style="font-size:.84rem;color:#1e293b;text-transform:none;letter-spacing:0;font-weight:500;cursor:pointer;">Cleared</label>
      </div>
    </div>
    <div class="mfooter">
      <button class="btn btn-ghost" id="mike-btn-cancel-edit">Cancel</button>
      <button class="btn btn-primary" id="mike-btn-save-edit">Save Changes</button>
    </div>
    <div id="mike-edit-err" style="color:#dc2626;font-size:.78rem;margin-top:8px;text-align:right;"></div>
  </div>
</div>

<div class="modal-ov" id="savings-edit-modal">
  <div class="modal">
    <h2>&#x270F;&#xFE0F; Edit Transaction</h2>
    <div class="mgrid">
      <div class="f fl"><label>Date</label><input type="date" id="savings-e-date"></div>
      <div class="f fl"><label>Amount ($)</label><input type="number" id="savings-e-amt" min="0.01" step="0.01"></div>
      <div class="f full fl"><label>Description</label><input type="text" id="savings-e-desc" maxlength="100"></div>
      <div class="f fl"><label>Category</label><select id="savings-e-cat"></select></div>
      <div class="f fl"><label>Trip</label><select id="savings-e-trip"></select></div>
      <div class="f fl">
        <label>Type</label>
        <div class="type-toggle">
          <input type="radio" name="savings-e-type" id="savings-ed" value="deposit">
          <label for="savings-ed" class="rl">&#x2B06; Deposit</label>
          <input type="radio" name="savings-e-type" id="savings-ew" value="withdrawal">
          <label for="savings-ew" class="el">&#x2B07; Withdrawal</label>
        </div>
      </div>
      <div class="f fl" style="display:flex;align-items:center;gap:8px;padding-top:18px;">
        <input type="checkbox" id="savings-e-cleared" style="width:16px;height:16px;accent-color:#16a34a;cursor:pointer;">
        <label for="savings-e-cleared" style="font-size:.84rem;color:#1e293b;text-transform:none;letter-spacing:0;font-weight:500;cursor:pointer;">Cleared</label>
      </div>
    </div>
    <div class="mfooter">
      <button class="btn btn-ghost" id="savings-btn-cancel-edit">Cancel</button>
      <button class="btn btn-primary" id="savings-btn-save-edit">Save Changes</button>
    </div>
    <div id="savings-edit-err" style="color:#dc2626;font-size:.78rem;margin-top:8px;text-align:right;"></div>
  </div>


<!--  HYSA Edit Modal -->
<div class="modal-ov" id="hysa-edit-modal">
  <div class="modal">
    <h2>&#x270F;&#xFE0F; Edit Transaction</h2>
    <div class="mgrid">
      <div class="f fl"><label>Date</label><input type="date" id="hysa-e-date"></div>
      <div class="f fl"><label>Amount ($)</label><input type="number" id="hysa-e-amt" min="0.01" step="0.01"></div>
      <div class="f full fl"><label>Description</label><input type="text" id="hysa-e-desc" maxlength="100"></div>
      <div class="f fl"><label>Category</label><select id="hysa-e-cat"></select></div>
      <div class="f fl"><label>Trip</label><select id="hysa-e-trip"></select></div>
      <div class="f fl">
        <label>Type</label>
        <div class="type-toggle">
          <input type="radio" name="hysa-e-type" id="hysa-ed" value="deposit">
          <label for="hysa-ed" class="rl">&#x2B06; Deposit</label>
          <input type="radio" name="hysa-e-type" id="hysa-ew" value="withdrawal">
          <label for="hysa-ew" class="el">&#x2B07; Withdrawal</label>
        </div>
      </div>
      <div class="f fl" style="display:flex;align-items:center;gap:8px;padding-top:18px;">
        <input type="checkbox" id="hysa-e-cleared" style="width:16px;height:16px;accent-color:#16a34a;cursor:pointer;">
        <label for="hysa-e-cleared" style="font-size:.84rem;color:#1e293b;text-transform:none;letter-spacing:0;font-weight:500;cursor:pointer;">Cleared</label>
      </div>
    </div>
    <div class="mfooter">
      <button class="btn btn-ghost" id="hysa-btn-cancel-edit">Cancel</button>
      <button class="btn btn-primary" id="hysa-btn-save-edit">Save Changes</button>
    </div>
    <div id="hysa-edit-err" style="color:#dc2626;font-size:.78rem;margin-top:8px;text-align:right;"></div>
  </div>


<!-- Receipt Scanner Modal -->
<div class="modal-ov" id="scan-modal">
  <div class="modal" style="max-width:480px;">
    <h2>&#x1F4F7; Scan Receipt</h2>
    <div class="scan-modal-body">

      <!-- State 1: upload / drop -->
      <div id="scan-s-upload">
        <div class="scan-drop-zone" id="scan-drop">
          <div class="scan-drop-icon">&#x1F9FE;</div>
          <p>Drop a receipt image here, or</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" id="scan-camera-btn">&#x1F4F7; Take Photo</button>
            <button class="btn btn-ghost" id="scan-library-btn">&#x1F5BC; Choose from Library</button>
          </div>
          <input type="file" id="scan-file-camera" accept="image/*" capture="environment" style="display:none">
          <input type="file" id="scan-file-library" accept="image/*" style="display:none">
          <p class="scan-hint">Works on mobile camera, screenshots &amp; scanned receipts</p>
        </div>
      </div>

      <!-- State 2: processing -->
      <div id="scan-s-proc" style="display:none;">
        <img id="scan-prev-img" class="scan-preview-img" alt="receipt preview">
        <div class="scan-prog-wrap" style="margin-top:12px;">
          <div class="scan-status-txt" id="scan-status">Reading receipt…</div>
          <div class="scan-bar"><div class="scan-fill" id="scan-fill" style="width:0%"></div></div>
        </div>
      </div>

      <!-- State 3: results -->
      <div id="scan-s-res" style="display:none;">
        <img id="scan-res-img" class="scan-preview-img" alt="receipt" style="max-height:140px;margin-bottom:12px;">
        <div class="scan-result-fields">
          <div class="f"><label>Date</label><input type="date" id="scan-r-date"></div>
          <div class="f"><label>Amount ($)</label><input type="number" id="scan-r-amt" step="0.01" min="0.01" placeholder="0.00"></div>
          <div class="fd"><label>Merchant / Description</label><input type="text" id="scan-r-desc" maxlength="100"></div>
          <div class="f"><label>Category</label><select id="scan-r-cat"></select></div>
        </div>
        <div style="margin-top:10px;">
          <button class="btn btn-ghost btn-sm" id="scan-raw-toggle-btn">Show raw OCR text</button>
          <pre class="scan-raw-pre" id="scan-raw-pre" style="display:none;"></pre>
        </div>
        <div id="scan-res-err" style="color:#dc2626;font-size:.78rem;margin-top:6px;"></div>
      </div>

    </div>
    <div class="mfooter" style="margin-top:16px;">
      <button class="btn btn-ghost" id="scan-cancel-btn">Cancel</button>
      <button class="btn btn-ghost" id="scan-retry-btn" style="display:none;">&#x21BA; Try Another</button>
      <button class="btn btn-primary" id="scan-use-btn" style="display:none;">&#x2713; Use These Values</button>
    </div>
  </div>
</div>

<!-- Receipt Attach Modal -->
<div class="modal-ov" id="rcpt-attach-modal">
  <div class="modal" style="max-width:340px;">
    <h2>&#x1F4CE; Attach Receipt</h2>
    <p style="color:#64748b;font-size:.85rem;margin:8px 0 16px;">Save a photo of the receipt with this transaction.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <button class="btn btn-primary" id="rcpt-camera-btn">&#x1F4F7; Take Photo</button>
      <button class="btn btn-ghost" id="rcpt-library-btn">&#x1F5BC; Choose from Library</button>
    </div>
    <input type="file" id="rcpt-camera-inp" accept="image/*" capture="environment" style="display:none">
    <input type="file" id="rcpt-library-inp" accept="image/*" style="display:none">
    <div class="mfooter" style="margin-top:18px;">
      <button class="btn btn-ghost" id="rcpt-cancel-btn">Cancel</button>
    </div>
  </div>
</div>

<!-- Receipt View Modal -->
<div class="modal-ov" id="rcpt-view-modal">
  <div class="modal" style="max-width:500px;">
    <h2>&#x1F9FE; Receipt</h2>
    <div style="text-align:center;margin:10px 0;">
      <img id="rcpt-view-img" style="max-width:100%;max-height:58vh;border-radius:6px;border:1px solid #e0e4ea;" src="" alt="Receipt">
    </div>
    <div class="mfooter">
      <button class="btn btn-danger" id="rcpt-remove-btn">&#x1F5D1; Remove</button>
      <button class="btn btn-ghost" id="rcpt-view-close">Close</button>
    </div>
  </div>
</div>

<!-- Trip Modal -->
<div class="modal-ov" id="trip-modal">
  <div class="modal" style="max-width:440px;">
    <h2>&#x2708;&#xFE0F; Trip Mode</h2>
    <div id="trip-s-none">
      <p style="color:#64748b;font-size:.85rem;margin-bottom:14px;">Track spending across all accounts for a trip. Transactions added while a trip is active are automatically tagged.</p>
      <div class="f" style="margin-bottom:8px;"><label>Trip Name</label><input type="text" id="trip-name-inp" placeholder="e.g. Vegas July 2026" maxlength="60" style="width:100%;"></div>
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <div class="f" style="flex:1;"><label>Start Date</label><input type="date" id="trip-start-inp" style="width:100%;"></div>
        <div class="f" style="flex:1;"><label>Budget (optional)</label><input type="number" id="trip-budget-inp" placeholder="0.00" min="0" step="0.01" style="width:100%;"></div>
      </div>
      <div id="trip-none-err" style="color:#dc2626;font-size:.78rem;min-height:1rem;"></div>
      <div class="mfooter">
        <button class="btn btn-ghost" id="trip-close-btn">Cancel</button>
        <button class="btn btn-ghost" id="trip-history-btn">&#x1F4CB; Past Trips</button>
        <button class="btn btn-primary" id="trip-start-btn">Start Trip</button>
      </div>
    </div>
    <div id="trip-s-active" style="display:none;">
      <div id="trip-active-header"></div>
      <div id="trip-budget-bar"></div>
      <div id="trip-cat-list"></div>
      <div class="mfooter">
        <button class="btn btn-ghost" id="trip-close-btn2">Close</button>
        <button class="btn btn-danger" id="trip-end-btn">&#x1F3C1; End Trip</button>
      </div>
    </div>
    <div id="trip-s-history" style="display:none;">
      <div id="trip-history-list" style="max-height:340px;overflow-y:auto;"></div>
      <div class="mfooter"><button class="btn btn-ghost" id="trip-back-btn">&#x2190; Back</button></div>
    </div>
    <div id="trip-s-detail" style="display:none;">
      <div id="trip-detail-content" style="max-height:420px;overflow-y:auto;"></div>
      <div class="mfooter">
        <button class="btn btn-ghost" id="trip-detail-back-btn">&#x2190; Back</button>
        <button class="btn btn-danger btn-sm" id="trip-delete-btn">Delete</button>
      </div>
    </div>
  </div>
</div>

<!-- Edit Modal -->
<div class="modal-ov" id="edit-modal">
  <div class="modal">
    <h2>&#x270F;&#xFE0F; Edit Transaction</h2>
    <div class="mgrid">
      <div class="f fl"><label>Date</label><input type="date" id="e-date"></div>
      <div class="f fl"><label>Amount ($)</label><input type="number" id="e-amt" min="0.01" step="0.01"></div>
      <div class="f full fl"><label>Description</label><input type="text" id="e-desc" maxlength="100"></div>
      <div class="f fl"><label>Category</label><div style="display:flex;gap:4px;"><select id="e-cat" style="flex:1;"></select><button class="btn btn-ghost btn-sm" id="e-split-cat">Split</button></div></div>
      <div class="f fl"><label>Trip</label><select id="e-trip"></select></div>
      <div class="f fl">
        <label>Type</label>
        <div class="type-toggle">
          <input type="radio" name="e-type" id="ee" value="expense">
          <label for="ee" class="el">Expense</label>
          <input type="radio" name="e-type" id="er" value="return">
          <label for="er" class="rl">Return</label>
          <input type="radio" name="e-type" id="ep" value="payment">
          <label for="ep" class="pl">Payment</label>
        </div>
      </div>
      <div class="f fl">
        <label>Who</label>
        <div class="who-toggle">
          <input type="radio" name="e-who" id="ewm" value="me">
          <label for="ewm" class="ml">&#x1F464; Me</label>
          <input type="radio" name="e-who" id="eww" value="wife">
          <label for="eww" class="wl">&#x1F469; Wife</label>
        </div>
      </div>
      <div class="f fl" style="display:flex;align-items:center;gap:8px;padding-top:18px;">
        <input type="checkbox" id="e-cleared" style="width:16px;height:16px;accent-color:var(--success);cursor:pointer;">
        <label for="e-cleared" style="font-size:.84rem;color:var(--text);text-transform:none;letter-spacing:0;font-weight:500;cursor:pointer;">Cleared on statement</label>
      </div>
    </div>
    <div class="mfooter">
      <button class="btn btn-ghost" id="btn-cancel-edit">Cancel</button>
      <button class="btn btn-primary" id="btn-save-edit">Save Changes</button>
    </div>
    <div id="edit-err" style="color:var(--danger);font-size:.78rem;margin-top:8px;text-align:right;"></div>
  </div>
</div>


<div class="modal-ov" id="ai-modal">
  <div class="ai-modal-wrap">
    <div class="ai-mhdr">
      <div><h3>&#x2728; Register Assistant</h3><p>Ask anything about your transactions</p></div>
      <button id="btn-ai-close">&#x2715;</button>
    </div>
    <div class="ai-msgs" id="ai-msgs"></div>
    <div class="ai-chips">
      <span class="ai-chip" data-q="What's my current balance?">Balance</span>
      <span class="ai-chip" data-q="How much did I spend this month?">This month</span>
      <span class="ai-chip" data-q="How much did I spend this week?">This week</span>
      <span class="ai-chip" data-q="What are my top spending categories?">Top categories</span>
      <span class="ai-chip" data-q="Give me suggestions">Suggestions</span>
    </div>
    <div class="ai-irow">
      <input type="text" id="ai-in" placeholder="e.g. How much on Starbucks this month?">
      <button id="btn-ai-send">Send</button>
    </div>
  </div>
</div>

<script>
(function(){
'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────
var _mem={};
function sGet(k){try{return localStorage.getItem(k);}catch(e){return _mem[k]||null;}}
function sSet(k,v){try{localStorage.setItem(k,v);}catch(e){_mem[k]=v;}}

// ── State ─────────────────────────────────────────────────────────────────────
var transactions=JSON.parse(sGet('cc-register')||'[]');
var history=[], future=[], MAX_HISTORY=50;
var DEFAULT_CATS=['Groceries','Dining','Gas','Shopping','Travel','Entertainment','Healthcare','Utilities','Subscriptions','Other'];
var categories=JSON.parse(sGet('cc-categories')||'null')||DEFAULT_CATS.slice();
var sortField='date', sortAsc=false, unclFirst=false, editId=null;
var trips=JSON.parse(sGet('cc-trips')||'[]');
var activeTripId=(function(){var v=sGet('active-trip');return v?parseInt(v,10):null;})();

function snapshot(){
  history.push(JSON.stringify(transactions));
  if(history.length>MAX_HISTORY)history.shift();
  future=[];
  $('btn-undo').disabled=false;$('btn-undo').style.opacity='1';
  $('btn-redo').disabled=true;$('btn-redo').style.opacity='.45';
}
function save(){sSet('cc-register',JSON.stringify(transactions));}
function undo(){
  if(!history.length)return;
  future.push(JSON.stringify(transactions));
  transactions=JSON.parse(history.pop());
  save();renderAll();
  if(!history.length){$('btn-undo').disabled=true;$('btn-undo').style.opacity='.45';}
  $('btn-redo').disabled=false;$('btn-redo').style.opacity='1';
}
function redo(){
  if(!future.length)return;
  history.push(JSON.stringify(transactions));
  transactions=JSON.parse(future.pop());
  save();renderAll();
  $('btn-undo').disabled=false;$('btn-undo').style.opacity='1';
  if(!future.length){$('btn-redo').disabled=true;$('btn-redo').style.opacity='.45';}
}
function saveCats(){sSet('cc-categories',JSON.stringify(categories));}
function $(id){return document.getElementById(id);}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function pad(n){return String(n).padStart(2,'0');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmt(n){return '$'+Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function fmtS(n){return(n<0?'-':'')+'$'+Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function fmtD(d){var p=d.split('-');return p[1]+'/'+p[2]+'/'+p[0];}
function dStr(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function isMobile(){return window.innerWidth<=700;}

// ── Categories ────────────────────────────────────────────────────────────────
function renderCatSelects(keep){
  ['txn-cat','e-cat'].forEach(function(id){
    var s=$(id),pv=keep||s.value;
    s.innerHTML=categories.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('');
    if(pv)s.value=pv;
  });
  var fc=$('f-cat'),fp=fc.value;
  fc.innerHTML='<option value="">All Categories</option>'+categories.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('');
  if(fp)fc.value=fp;
}
function addCat(name){
  name=name.trim();
  if(!name||categories.indexOf(name)!==-1)return false;
  categories.push(name);saveCats();renderCatSelects(name);return true;
}
function splitLabel(t){
  if(!t.splits||t.splits.length<2)return t.cat||'Other';
  return t.splits.map(function(s){return s.cat+' '+fmt(s.amount);}).join(' / ');
}
function hasCategory(t,cat){
  return t.cat===cat||(t.splits||[]).some(function(s){return s.cat===cat;});
}
function askCategorySplits(total,current){
  if(!total||total<=0){alert('Enter the total purchase amount first.');return current||null;}
  var seed=(current&&current.length?current:[{cat:'Groceries',amount:total}]).map(function(s){return s.cat+'='+Number(s.amount).toFixed(2);}).join('; ');
  var raw=prompt('Split the $'+Number(total).toFixed(2)+' purchase. Use Category=Amount separated by semicolons. Example: Groceries=25; Household=15',seed);
  if(raw===null)return current||null;
  var parts=raw.split(';').map(function(x){return x.trim();}).filter(Boolean),splits=[];
  for(var i=0;i<parts.length;i++){
    var pos=parts[i].lastIndexOf('='),cat=pos>0?parts[i].slice(0,pos).trim():'',amt=pos>0?parseFloat(parts[i].slice(pos+1)):NaN;
    if(!cat||!amt||amt<=0){alert('Each split must look like Category=Amount.');return current||null;}
    if(categories.indexOf(cat)===-1)categories.push(cat);
    splits.push({cat:cat,amount:Math.round(amt*100)/100});
  }
  var sum=splits.reduce(function(s,x){return s+x.amount;},0);
  if(Math.abs(sum-total)>0.01){alert('Split amounts total $'+sum.toFixed(2)+', but the purchase is $'+Number(total).toFixed(2)+'.');return current||null;}
  saveCats();renderCatSelects(splits[0].cat);return splits.length>1?splits:null;
}
function reassignDeletedCategory(list,name){
  list.forEach(function(t){
    if(t.cat===name)t.cat='Other';
    if(t.splits){t.splits.forEach(function(s){if(s.cat===name)s.cat='Other';});}
  });
}
function deleteCategory(name){
  if(!name||name==='Other'){alert('The Other category cannot be deleted.');return;}
  if(!confirm('Delete "'+name+'"? Existing purchases using it will be reassigned to Other.'))return;
  if(categories.indexOf('Other')===-1)categories.push('Other');
  categories=categories.filter(function(c){return c!==name;});saveCats();
  reassignDeletedCategory(transactions,name);save();
  var regs=[['chk-register',typeof chk!=='undefined'?chk:null],['mike-register',typeof mike!=='undefined'?mike:null],['savings-register',typeof sav!=='undefined'?sav:null],['hysa-register',typeof hysa!=='undefined'?hysa:null]];
  regs.forEach(function(pair){var api=pair[1],list=api?api.getTxns():JSON.parse(sGet(pair[0])||'[]');reassignDeletedCategory(list,name);sSet(pair[0],JSON.stringify(list));if(api){api.renderCat();api.renderAll();}});
  renderCatSelects('Other');renderAll();
}
var ccPendingSplits=null,ccEditSplits=null;

// ── CRUD ──────────────────────────────────────────────────────────────────────
function addTxn(){
  var date=$('txn-date').value,desc=$('txn-desc').value.trim();
  var amt=parseFloat($('txn-amt').value),cat=$('txn-cat').value;
  var te=document.querySelector('input[name="txn-type"]:checked');
  var we=document.querySelector('input[name="txn-who"]:checked');
  var type=te?te.value:'expense',who=we?we.value:'me',err=$('form-err');
  if(!date){err.textContent='Please enter a date.';return;}
  if(!desc){err.textContent='Please enter a description.';return;}
  if(!amt||amt<=0){err.textContent='Please enter a valid amount.';return;}
  err.textContent='';
  snapshot();
  var newId=Date.now();
  transactions.push({id:newId,date:date,desc:desc,cat:ccPendingSplits?ccPendingSplits[0].cat:cat,splits:ccPendingSplits||undefined,type:type,amount:amt,cleared:false,who:who,trip:activeTripId||undefined});
  ccPendingSplits=null;
  if(ccPendingRcpt){sSet('rcpt-'+newId,ccPendingRcpt);ccPendingRcpt=null;$('cc-photo-thumb').style.display='none';$('cc-photo-thumb').src='';}
  save();renderAll();
  $('txn-desc').value='';$('txn-amt').value='';$('txn-date').value=todayStr();$('txn-desc').focus();
}
function delTxn(id){
  if(!confirm('Delete this transaction?'))return;
  snapshot();
  transactions=transactions.filter(function(t){return t.id!==id;});
  delRcptKey(id);
  save();renderAll();
}
function toggleCleared(id){
  var t=transactions.find(function(x){return x.id===id;});
  if(t){snapshot();t.cleared=!t.cleared;save();renderAll();}
}

// ── Edit ──────────────────────────────────────────────────────────────────────
function openEdit(id){
  var t=transactions.find(function(x){return x.id===id;});if(!t)return;
  editId=id;
  ccEditSplits=t.splits?JSON.parse(JSON.stringify(t.splits)):null;
  $('e-date').value=t.date;$('e-desc').value=t.desc;
  $('e-amt').value=t.amount;$('e-cleared').checked=!!t.cleared;
  var r=document.querySelector('input[name="e-type"][value="'+t.type+'"]');
  if(r)r.checked=true;
  var w=document.querySelector('input[name="e-who"][value="'+(t.who||'wife')+'"]');
  if(w)w.checked=true;
  $('edit-err').textContent='';renderCatSelects(t.cat);
  $('e-trip').innerHTML=buildTripOpts(t.trip||null);
  $('edit-modal').classList.add('open');
}
function closeEdit(){$('edit-modal').classList.remove('open');editId=null;ccEditSplits=null;}
function saveEdit(){
  var date=$('e-date').value,desc=$('e-desc').value.trim();
  var amt=parseFloat($('e-amt').value),cat=$('e-cat').value;
  var te=document.querySelector('input[name="e-type"]:checked');
  var we=document.querySelector('input[name="e-who"]:checked');
  var type=te?te.value:'expense',who=we?we.value:'me',err=$('edit-err');
  if(!date){err.textContent='Date required.';return;}
  if(!desc){err.textContent='Description required.';return;}
  if(!amt||amt<=0){err.textContent='Valid amount required.';return;}
  var i=transactions.findIndex(function(t){return t.id===editId;});if(i===-1)return;
  snapshot();
  var tripVal=$('e-trip').value;var tripId=tripVal?parseInt(tripVal,10):undefined;
  var priorSplits=ccEditSplits;
  if(priorSplits&&Math.abs(priorSplits.reduce(function(s,x){return s+x.amount;},0)-amt)>0.01)priorSplits=undefined;
  transactions[i]={id:transactions[i].id,date:date,desc:desc,cat:priorSplits?priorSplits[0].cat:cat,splits:priorSplits,type:type,amount:amt,cleared:$('e-cleared').checked,who:who,trip:tripId};
  save();renderAll();closeEdit();
}

// ── Filters ───────────────────────────────────────────────────────────────────
function getFiltered(){
  var s=$('f-search').value.toLowerCase().trim(),c=$('f-cat').value;
  var ty=$('f-type').value,fr=$('f-from').value,to=$('f-to').value;
  return transactions.filter(function(t){
    if(s&&t.desc.toLowerCase().indexOf(s)===-1)return false;
    if(c&&!hasCategory(t,c))return false;
    if(ty&&t.type!==ty)return false;
    if(fr&&t.date<fr)return false;
    if(to&&t.date>to)return false;
    return true;
  });
}
function filterActive(){
  return $('f-search').value.trim()||$('f-cat').value||$('f-type').value||$('f-from').value||$('f-to').value;
}

// ── Sort ──────────────────────────────────────────────────────────────────────
function toggleSort(f){
  sortAsc=(sortField===f)?!sortAsc:(f!=='date');
  sortField=f;renderTable();
}
function sorted(list){
  return list.slice().sort(function(a,b){
    if(unclFirst){var ac=a.cleared?1:0,bc=b.cleared?1:0;if(ac!==bc)return ac-bc;}
    var av=a[sortField],bv=b[sortField];
    if(sortField==='amount'){av=+av;bv=+bv;}
    if(av<bv)return sortAsc?-1:1;if(av>bv)return sortAsc?1:-1;return 0;
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll(){renderSummary();renderTable();}

function renderSummary(){
  var exp=0,ret=0,pay=0,uexp=0,uret=0,upay=0;
  transactions.forEach(function(t){
    var cleared=!!t.cleared;
    if(t.type==='expense'){if(cleared)exp+=t.amount;else uexp+=t.amount;}
    else if(t.type==='return'){if(cleared)ret+=t.amount;else uret+=t.amount;}
    else if(t.type==='payment'){if(cleared)pay+=t.amount;else upay+=t.amount;}
  });
  var totalOwed=(exp+uexp)-(ret+uret)-(pay+upay);
  $('s-exp').textContent=fmt(exp);$('s-ret').textContent=fmt(ret);
  $('s-pay').textContent=fmt(pay);$('s-bal').textContent=fmtS(totalOwed);
  $('s-uncl').textContent=fmt(uexp);
  $('s-uncl-ret').textContent=fmt(uret);
  $('hdr-bal').textContent=fmtS(totalOwed);
}

function buildBalMap(){
  var ch=transactions.slice().sort(function(a,b){if(a.date<b.date)return -1;if(a.date>b.date)return 1;return a.id-b.id;});
  var m={},r=0;
  ch.forEach(function(t){r+=(t.type==='expense')?t.amount:-t.amount;m[t.id]=r;});
  return m;
}

function arw(f){
  return sortField===f?('<span class="sarr on">'+(sortAsc?'↑':'↓')+'</span>'):'<span class="sarr"></span>';
}

function renderTable(){
  var rows=sorted(getFiltered()),bm=buildBalMap();
  var mobile=isMobile();

  // ── thead ──
  var head=$('txn-head');
  if(mobile){
    head.innerHTML='<tr>'+
      '<th style="width:32px;" title="Cleared">&#x2713;</th>'+
      '<th class="sortable" data-sort="date" style="width:76px;">Date '+arw('date')+'</th>'+
      '<th class="sortable" data-sort="desc">Description '+arw('desc')+'</th>'+
      '<th class="sortable" data-sort="amount" style="text-align:right;width:76px;">Amount '+arw('amount')+'</th>'+
      '<th style="text-align:center;width:62px;">Act.</th>'+
      '</tr>';
  } else {
    head.innerHTML='<tr>'+
      '<th style="width:32px;" title="Cleared">&#x2713;</th>'+
      '<th class="sortable" data-sort="date" style="width:88px;">Date '+arw('date')+'</th>'+
      '<th class="sortable" data-sort="desc">Description / Amount '+arw('desc')+'</th>'+
      '<th class="sortable" data-sort="cat" style="width:96px;">Category '+arw('cat')+'</th>'+
      '<th style="width:68px;">Type</th>'+
      '<th style="text-align:right;width:90px;">Balance</th>'+
      '<th style="text-align:center;width:66px;">Actions</th>'+
      '</tr>';
  }

  $('row-count').textContent=rows.length+' transaction'+(rows.length!==1?'s':'');

  // ── Filter total bar ──
  var ftBar=$('filter-total');
  if(filterActive()&&rows.length){
    var fe=0,fr=0,fp=0;
    rows.forEach(function(t){if(t.type==='expense')fe+=t.amount;else if(t.type==='return')fr+=t.amount;else fp+=t.amount;});
    var fn=fe-fr-fp,parts=[];
    if(fe)parts.push('Expenses: '+fmt(fe));if(fr)parts.push('Returns: '+fmt(fr));if(fp)parts.push('Payments: '+fmt(fp));
    parts.push('Net: '+fmtS(fn));
    $('ft-count').textContent=rows.length+' match'+(rows.length!==1?'es':'');
    $('ft-detail').textContent='— '+parts.join(' | ');
    ftBar.classList.add('on');
  } else {ftBar.classList.remove('on');}

  var body=$('txn-body'),empty=$('empty-state');
  if(!rows.length){body.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';

  var h='';
  rows.forEach(function(t){
    var bal=bm[t.id],neg=bal<0,clr=!!t.cleared;
    var cls=t.type+'-row'+(clr?'':' unclrd');
    var sign=t.type==='expense'?'+':'-';
    var amtColor=t.type==='expense'?'#dc2626':t.type==='return'?'#16a34a':'#7c3aed';
    var amtStyle='color:'+amtColor+';font-weight:700;';
    var isWife=(t.who==='wife'||!t.who);
    var whoColor=isWife?'#1e293b':'#2563eb';
    var whoStyle='color:'+whoColor+';font-weight:500;';
    var cb='<input type="checkbox" class="clr-cb" data-id="'+t.id+'"'+(clr?' checked':'')+' title="Mark cleared">';
    var eb='<button class="btn btn-edit btn-sm edit-btn" data-id="'+t.id+'">&#x270F;&#xFE0F;</button>';
    var db='<button class="btn btn-danger btn-sm del-btn" data-id="'+t.id+'" style="margin-left:2px">&#x2715;</button>';
    var hasRcpt=!!sGet('rcpt-'+t.id);
    var rb=hasRcpt?'<button class="btn btn-sm rcpt-view-btn" data-id="'+t.id+'" style="margin-left:2px;color:#059669;font-size:.9rem;" title="View receipt">&#x1F9FE;</button>':'';

    if(mobile){
      h+='<tr class="'+cls+'">';
      h+='<td class="clr-cell">'+cb+'</td>';
      h+='<td class="date-cell">'+fmtD(t.date)+'</td>';
      h+='<td class="desc-cell"><span class="desc-main" style="'+whoStyle+'" title="'+esc(t.desc)+'">'+esc(t.desc)+'</span><span class="desc-sub">'+esc(splitLabel(t))+'</span></td>';
      h+='<td class="amt-cell"><span style="'+amtStyle+'">'+sign+fmt(t.amount)+'</span></td>';
      h+='<td class="act-cell">'+rb+eb+db+'</td>';
      h+='</tr>';
    } else {
      h+='<tr class="'+cls+'">';
      h+='<td class="clr-cell">'+cb+'</td>';
      h+='<td class="date-cell">'+fmtD(t.date)+'</td>';
      h+='<td class="desc-cell"><span class="desc-main" style="'+whoStyle+'" title="'+esc(t.desc)+'">'+esc(t.desc)+'</span><span style="'+amtStyle+'font-size:.7rem;">'+sign+fmt(t.amount)+'</span></td>';
      h+='<td class="cat-cell"><span class="catbdg">'+esc(splitLabel(t))+'</span></td>';
      h+='<td class="type-cell"><span class="badge b-'+t.type+'">'+(t.type==='expense'?'Exp':t.type==='return'?'Ret':'Pay')+'</span></td>';
      h+='<td class="bal-cell"><span style="font-weight:600;color:'+(neg?'#dc2626':'#2563eb')+';">'+fmtS(bal)+'</span></td>';
      h+='<td class="act-cell">'+rb+eb+db+'</td>';
      h+='</tr>';
`;
TRACKER_HTML += `    }
  });
  body.innerHTML=h;
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(){
  var rows=sorted(getFiltered());if(!rows.length){alert('Nothing to export.');return;}
  var bm=buildBalMap();
  var lines=['Date,Description,Category,Type,Amount,Balance,Cleared'];
  rows.forEach(function(t){
    lines.push([t.date,'"'+t.desc.replace(/"/g,'""')+'"',t.cat,
      t.type==='expense'?'Expense':t.type==='return'?'Return':'Payment',
      (t.type==='expense'?'':'-')+t.amount.toFixed(2),bm[t.id].toFixed(2),t.cleared?'Yes':'No'].join(','));
  });
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));
  a.download='cc-register-'+todayStr()+'.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);
}

// ── CSV Import ────────────────────────────────────────────────────────────────
function parseCSVLine(line){
  var r=[],cur='',q=false;
  for(var i=0;i<line.length;i++){
    var c=line[i];
    if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}
    else if(c===','&&!q){r.push(cur.trim());cur='';}
    else cur+=c;
  }
  r.push(cur.trim());return r;
}
function normDate(raw){
  raw=raw.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  var m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return m[3]+'-'+pad(+m[1])+'-'+pad(+m[2]);
  m=raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);if(m)return m[3]+'-'+pad(+m[1])+'-'+pad(+m[2]);
  var d=new Date(raw);if(!isNaN(d))return dStr(d);return null;
}
function importCSV(file){
  var reader=new FileReader();
  reader.onload=function(e){
    var lines=e.target.result.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(function(l){return l.trim();});
    if(lines.length<2){alert('CSV has no data rows.');return;}
    var hdrs=parseCSVLine(lines[0]).map(function(h){return h.toLowerCase().replace(/[^a-z]/g,'');});
    function col(kws){
      for(var i=0;i<kws.length;i++){var idx=hdrs.indexOf(kws[i]);if(idx!==-1)return idx;}
      for(var i=0;i<kws.length;i++){for(var j=0;j<hdrs.length;j++){if(hdrs[j].indexOf(kws[i])!==-1)return j;}}return -1;
    }
    var ci={date:col(['date','transactiondate']),desc:col(['description','desc','memo','name','merchant','payee']),
      amount:col(['amount','amt','debit','credit']),cat:col(['category','cat']),
      type:col(['type','txntype']),cleared:col(['cleared','posted','status'])};
    if(ci.date===-1){alert('Cannot find Date column.');return;}
    if(ci.desc===-1){alert('Cannot find Description column.');return;}
    if(ci.amount===-1){alert('Cannot find Amount column.');return;}
    var added=0,dupes=0,skipped=0,newCats=[],toAdd=[];
    for(var i=1;i<lines.length;i++){
      var row=parseCSVLine(lines[i]);
      var date=normDate((row[ci.date]||''));if(!date){skipped++;continue;}
      var desc=(row[ci.desc]||'').trim();if(!desc){skipped++;continue;}
      var amt=parseFloat((row[ci.amount]||'').replace(/[$,\s]/g,''));if(isNaN(amt)||!amt){skipped++;continue;}
      var rawT=(row[ci.type]||'').trim().toLowerCase();
      var type=rawT==='expense'||rawT==='debit'?'expense':rawT==='return'||rawT==='refund'?'return':rawT==='payment'?'payment':amt<0?'return':'expense';
      amt=Math.abs(amt);
      var cat=(row[ci.cat]||'').trim()||'Other';
      var clr=/(yes|true|cleared|posted)/i.test(row[ci.cleared]||'');
      if(cat&&categories.indexOf(cat)===-1&&newCats.indexOf(cat)===-1)newCats.push(cat);
      toAdd.push({id:Date.now()+i,date:date,desc:desc,cat:cat,type:type,amount:amt,cleared:clr});added++;
    }
    if(!added){alert('No valid rows found.');return;}
    newCats.forEach(function(c){categories.push(c);});if(newCats.length){saveCats();renderCatSelects();}
    var ex={};transactions.forEach(function(t){ex[t.date+'|'+t.desc+'|'+t.amount]=true;});
    toAdd=toAdd.filter(function(t){var k=t.date+'|'+t.desc+'|'+t.amount;if(ex[k]){dupes++;return false;}ex[k]=true;return true;});
    toAdd.forEach(function(t){transactions.push(t);});save();renderAll();
    alert('Done! '+toAdd.length+' added'+(dupes?' · '+dupes+' dupes skipped':'')+(skipped?' · '+skipped+' invalid':'')+(newCats.length?' · New cats: '+newCats.join(', '):''));
  };
  reader.readAsText(file);
}

// ── Backup / Restore ──────────────────────────────────────────────────────────
function backup(){
  var data={version:7,exported:new Date().toISOString(),
    transactions:transactions,categories:categories,
    chkTxns:chk.getTxns(),chkOpenBal:chk.getOpenBal(),
    mikeTxns:mike.getTxns(),mikeOpenBal:mike.getOpenBal(),
    savingsTxns:sav.getTxns(),savingsOpenBal:sav.getOpenBal(),
    hysaTxns:hysa.getTxns(),hysaOpenBal:hysa.getOpenBal(),
    ccNotes:sGet('cc-notes')||'',chkNotes:sGet('chk-notes')||'',mikeNotes:sGet('mike-notes')||'',
    savingsNotes:sGet('savings-notes')||'',hysaNotes:sGet('hysa-notes')||''};
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download='register-backup-'+todayStr()+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);
}
function persistAll(){
  // Write directly to localStorage — bypasses the _mem fallback so we can detect failure
  var ok=true;
  try{
    localStorage.setItem('cc-register',JSON.stringify(transactions));
    localStorage.setItem('cc-categories',JSON.stringify(categories));
    localStorage.setItem('chk-register',JSON.stringify(chk.getTxns()));
    localStorage.setItem('chk-open-bal',chk.getOpenBal().toString());
    localStorage.setItem('mike-register',JSON.stringify(mike.getTxns()));
    localStorage.setItem('mike-open-bal',mike.getOpenBal().toString());
    localStorage.setItem('savings-register',JSON.stringify(sav.getTxns()));
    localStorage.setItem('savings-open-bal',sav.getOpenBal().toString());
    localStorage.setItem('hysa-register',JSON.stringify(hysa.getTxns()));
    localStorage.setItem('hysa-open-bal',hysa.getOpenBal().toString());
  }catch(e){ok=false;}
  return ok;
}
function restore(file){
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      if(!data.transactions||!Array.isArray(data.transactions)){alert('Invalid backup file.');return;}
      if(!confirm('Replace ALL data? Cannot be undone.'))return;
      // Update in-memory state first
      transactions=data.transactions;
      if(data.categories)categories=data.categories;
      if(data.chkTxns&&Array.isArray(data.chkTxns))chk.setTxns(data.chkTxns);
      if(data.chkOpenBal!=null)chk.setOpenBal(parseFloat(data.chkOpenBal)||0);
      if(data.mikeTxns&&Array.isArray(data.mikeTxns))mike.setTxns(data.mikeTxns);
      if(data.mikeOpenBal!=null)mike.setOpenBal(parseFloat(data.mikeOpenBal)||0);
      if(data.savingsTxns&&Array.isArray(data.savingsTxns))sav.setTxns(data.savingsTxns);
      if(data.savingsOpenBal!=null)sav.setOpenBal(parseFloat(data.savingsOpenBal)||0);
      if(data.hysaTxns&&Array.isArray(data.hysaTxns))hysa.setTxns(data.hysaTxns);
      if(data.hysaOpenBal!=null)hysa.setOpenBal(parseFloat(data.hysaOpenBal)||0);
      if(data.ccNotes!=null){sSet('cc-notes',data.ccNotes);$('cc-notes').value=data.ccNotes;}
      if(data.chkNotes!=null){sSet('chk-notes',data.chkNotes);$('chk-notes').value=data.chkNotes;}
      if(data.mikeNotes!=null){sSet('mike-notes',data.mikeNotes);$('mike-notes').value=data.mikeNotes;}
      if(data.savingsNotes!=null){sSet('savings-notes',data.savingsNotes);$('savings-notes').value=data.savingsNotes;}
      if(data.hysaNotes!=null){sSet('hysa-notes',data.hysaNotes);$('hysa-notes').value=data.hysaNotes;}
      // Persist everything
      var ok=persistAll();
      renderCatSelects();renderAll();
      if(activeTab==='chk')chk.activatePane();else if(activeTab==='mike')mike.activatePane();else if(activeTab==='savings')sav.activatePane();else if(activeTab==='hysa')hysa.activatePane();
      var cn=chk.getTxns().length,mn=mike.getTxns().length,sn=sav.getTxns().length,hn=hysa.getTxns().length;
      if(ok){
        alert('Restored! '+transactions.length+' CC + '+cn+' Chk + '+mn+' Mike + '+sn+' Savings + '+hn+' HYSA transactions loaded.');
      } else {
        alert('Restored in this session, but localStorage is unavailable in this environment — data may not survive a page refresh. Consider keeping the backup file handy.');
      }
    }catch(err){alert('Error: '+err.message);}
  };
  reader.readAsText(file);
}

// ── AI ────────────────────────────────────────────────────────────────────────
var MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
function parsePeriod(text){
  var now=new Date(),y=now.getFullYear(),m=now.getMonth(),d=now.getDate();
  if(/this week/.test(text)){var dw=now.getDay(),s=new Date(y,m,d-dw);return{start:dStr(s),end:dStr(now),label:'this week'};}
  if(/last week/.test(text)){var dw2=now.getDay();return{start:dStr(new Date(y,m,d-dw2-7)),end:dStr(new Date(y,m,d-dw2-1)),label:'last week'};}
  if(/this month/.test(text))return{start:y+'-'+pad(m+1)+'-01',end:dStr(now),label:'this month'};
  if(/last month/.test(text)){var lm=new Date(y,m-1,1),le=new Date(y,m,0);return{start:dStr(lm),end:dStr(le),label:'last month'};}
  if(/this year/.test(text))return{start:y+'-01-01',end:dStr(now),label:'this year'};
  if(/last year/.test(text))return{start:(y-1)+'-01-01',end:(y-1)+'-12-31',label:'last year'};
  for(var i=0;i<MONTHS.length;i++){if(text.indexOf(MONTHS[i])!==-1){var my=i>m?y-1:y;return{start:my+'-'+pad(i+1)+'-01',end:dStr(new Date(my,i+1,0)),label:MONTHS[i]};}}
  return null;
}
function inP(date,p){return date>=p.start&&date<=p.end;}
function findMerchant(text){
  var c=text.replace(/how much|did i spend|have i spent|spent|total|for|on|at|the|i|what|is|my|all|show|me|give|in|during|week|month|year|this|last|today|yesterday/g,' ')
    .replace(new RegExp(MONTHS.join('|'),'g'),' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  return c.split(' ').filter(function(w){return w.length>2;}).join(' ').trim()||null;
}
function aiQuery(q){
  var text=q.toLowerCase().trim(),t=transactions;
  if(!t.length)return "No transactions yet. Add some to get started!";
  var exp=t.filter(function(x){return x.type==='expense';}),ret=t.filter(function(x){return x.type==='return';});
  var pay=t.filter(function(x){return x.type==='payment';});
  var te=exp.reduce(function(s,x){return s+x.amount;},0),tr=ret.reduce(function(s,x){return s+x.amount;},0);
  var tp=pay.reduce(function(s,x){return s+x.amount;},0),bal=te-tr-tp;
  var period=parsePeriod(text),merchant=findMerchant(text);
  if(merchant&&merchant.length>1){
    var ml=merchant.toLowerCase(),ma=t.filter(function(x){return x.desc.toLowerCase().indexOf(ml)!==-1;});
    if(!ma.length){var wds=ml.split(' ').filter(function(w){return w.length>2;});if(wds.length)ma=t.filter(function(x){var dl=x.desc.toLowerCase();return wds.some(function(w){return dl.indexOf(w)!==-1;});});}
    if(ma.length){
      var mf=period?ma.filter(function(x){return inP(x.date,period);}):ma;
      if(!mf.length)return 'No "'+merchant+'" transactions found'+(period?' '+period.label:'')+'.';
      var mex=mf.filter(function(x){return x.type==='expense';}),mrt=mf.filter(function(x){return x.type==='return';});
      var mte=mex.reduce(function(s,x){return s+x.amount;},0),mtr=mrt.reduce(function(s,x){return s+x.amount;},0);
      var r='"'+merchant+'"'+(period?' ('+period.label+')':'')+':\n';
      r+='• '+mf.length+' transaction'+(mf.length!==1?'s':'')+'\n';
      if(mex.length)r+='• Expenses: '+fmt(mte)+'\n';if(mrt.length)r+='• Returns: '+fmt(mtr)+'\n';
      r+='• Net: '+fmtS(mte-mtr);
      var sl=mf.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,8);
      r+='\n\nTransactions:\n'+sl.map(function(x){return '  '+fmtD(x.date)+' — '+(x.type==='expense'?'+':'-')+fmt(x.amount)+(x.cleared?' ✓':'');}).join('\n');
      if(mf.length>8)r+='\n  … and '+(mf.length-8)+' more';
      return r;
    }
  }
  if(period){
    var pe=exp.filter(function(x){return inP(x.date,period);}),pr=ret.filter(function(x){return inP(x.date,period);}),pp=pay.filter(function(x){return inP(x.date,period);});
    var pet=pe.reduce(function(s,x){return s+x.amount;},0),prt=pr.reduce(function(s,x){return s+x.amount;},0),ppt=pp.reduce(function(s,x){return s+x.amount;},0);
    if(!pe.length&&!pr.length&&!pp.length)return 'No transactions for '+period.label+'.';
    var ct={};pe.forEach(function(x){ct[x.cat]=(ct[x.cat]||0)+x.amount;});
    var tc=Object.keys(ct).sort(function(a,b){return ct[b]-ct[a];}).slice(0,3);
    var r='Summary for '+period.label+':\n• Expenses: '+fmt(pet)+' ('+pe.length+' transactions)\n';
    if(prt)r+='• Returns: '+fmt(prt)+'\n';if(ppt)r+='• Payments: '+fmt(ppt)+'\n';
    r+='• Net: '+fmtS(pet-prt-ppt);
    if(tc.length)r+='\n\nTop categories:\n'+tc.map(function(c,i){return (i+1)+'. '+c+' — '+fmt(ct[c]);}).join('\n');
    return r;
  }
  if(/help/.test(text))return 'Try:\n• "How much on Starbucks this month?"\n• "Spending this week"\n• "How much this year?"\n• "Top categories"\n• "Balance"\n• "Suggestions"';
  if(/balance/.test(text))return 'Balance: '+fmtS(bal)+'\n\n• Expenses: '+fmt(te)+'\n• Returns: '+fmt(tr)+'\n• Payments: '+fmt(tp);
  if(/payment|paid/.test(text)){if(!pay.length)return 'No payments yet.';var lp=pay.slice().sort(function(a,b){return b.date.localeCompare(a.date);})[0];return 'Total payments: '+fmt(tp)+' ('+pay.length+' payments)\nMost recent: '+fmt(lp.amount)+' on '+fmtD(lp.date);}
  if(/return|refund/.test(text))return !ret.length?'No returns yet.':'Total returns: '+fmt(tr)+' ('+ret.length+' returns)';
  if(/cleared|uncleared|pending/.test(text)){var cl=t.filter(function(x){return x.cleared;}),uc=t.filter(function(x){return !x.cleared;});return 'Cleared: '+cl.length+'\nUncleared/pending: '+uc.length;}
  if(/biggest|largest|most expensive/.test(text)){if(!exp.length)return 'No expenses yet.';var big=exp.slice().sort(function(a,b){return b.amount-a.amount;})[0];return 'Biggest expense: '+fmt(big.amount)+'\n"'+big.desc+'" on '+fmtD(big.date);}
  if(/top.*categor|categor.*spend/.test(text)){var ct2={};exp.forEach(function(x){ct2[x.cat]=(ct2[x.cat]||0)+x.amount;});var rk=Object.keys(ct2).sort(function(a,b){return ct2[b]-ct2[a];}).slice(0,5);return rk.length?'Top categories:\n'+rk.map(function(c,i){return (i+1)+'. '+c+' — '+fmt(ct2[c]);}).join('\n'):'No expenses yet.';}
  if(/average|avg/.test(text))return !exp.length?'No expenses yet.':'Average expense: '+fmt(te/exp.length)+' ('+exp.length+' total)';
  if(/recent|latest/.test(text)){var n=5,mx=text.match(/last (\d+)/);if(mx)n=+mx[1];return 'Last '+n+':\n'+t.slice().sort(function(a,b){return b.date.localeCompare(a.date)||b.id-a.id;}).slice(0,n).map(function(x){return '• '+fmtD(x.date)+' '+x.desc+' '+(x.type==='expense'?'+':'-')+fmt(x.amount);}).join('\n');}
  if(/suggest|tip|advice|saving|budget/.test(text)){var tips=[],ct3={};exp.forEach(function(x){ct3[x.cat]=(ct3[x.cat]||0)+x.amount;});var rk3=Object.keys(ct3).sort(function(a,b){return ct3[b]-ct3[a];});if(rk3.length)tips.push('Top category: '+rk3[0]+' at '+fmt(ct3[rk3[0]])+'. Consider budgeting here.');if(!tp)tips.push('No payments recorded yet — log payments to track your balance accurately.');if(bal>500)tips.push('Balance is '+fmtS(bal)+'. A payment would reduce potential interest.');if(!tips.length)tips.push('Keep tracking! You\'re doing great.');return 'Suggestions:\n\n'+tips.join('\n\n');}
  for(var i=0;i<categories.length;i++){if(text.indexOf(categories[i].toLowerCase())!==-1){var ce=exp.filter(function(x){return x.cat.toLowerCase()===categories[i].toLowerCase();});var cet=ce.reduce(function(s,x){return s+x.amount;},0);return ce.length?'Spending in '+categories[i]+': '+fmt(cet)+' ('+ce.length+' transactions)':'No expenses in '+categories[i]+' yet.';}}
  return 'Not sure about that. Type "help" for examples.';
}

// ── AI UI ─────────────────────────────────────────────────────────────────────
function aiMsg(text,who){var b=$('ai-msgs'),d=document.createElement('div');d.className='ai-msg '+who;d.textContent=text;b.appendChild(d);b.scrollTop=b.scrollHeight;}
function aiSubmit(){var inp=$('ai-in'),q=inp.value.trim();if(!q)return;inp.value='';aiMsg(q,'user');setTimeout(function(){aiMsg(aiQuery(q),'bot');},80);}

// ── Events ────────────────────────────────────────────────────────────────────
$('btn-add').addEventListener('click',addTxn);
$('txn-amt').addEventListener('keydown',function(e){if(e.key==='Enter')addTxn();});

// Filters
['f-search','f-cat','f-type','f-from','f-to'].forEach(function(id){
  $(id).addEventListener(id==='f-search'?'input':'change',function(){renderTable();});
});
$('btn-clr-filter').addEventListener('click',function(){['f-search','f-cat','f-type','f-from','f-to'].forEach(function(id){$(id).value='';});renderTable();});
$('btn-export').addEventListener('click',exportCSV);

// Table actions — delegated to tbody
$('txn-body').addEventListener('click',function(e){
  var eb=e.target.closest('.edit-btn'),db=e.target.closest('.del-btn');
  var rv=e.target.closest('.rcpt-view-btn');
  if(eb)openEdit(parseInt(eb.getAttribute('data-id'),10));
  if(db)delTxn(parseInt(db.getAttribute('data-id'),10));
  if(rv)openRcptView(parseInt(rv.getAttribute('data-id'),10));
});
$('txn-body').addEventListener('change',function(e){
  var cb=e.target.closest('.clr-cb');if(cb)toggleCleared(parseInt(cb.getAttribute('data-id'),10));
});

// Sort — delegated to thead
$('txn-head').addEventListener('click',function(e){
  var th=e.target.closest('th.sortable');if(th)toggleSort(th.getAttribute('data-sort'));
});

// Uncleared first
$('btn-uncl').addEventListener('click',function(){unclFirst=!unclFirst;this.classList.toggle('active',unclFirst);renderTable();});

// Clear all
$('btn-clr-all').addEventListener('click',function(){if(!transactions.length)return;if(!confirm('Delete ALL transactions? Cannot be undone.'))return;snapshot();transactions=[];save();renderAll();});

// Edit modal
$('btn-cancel-edit').addEventListener('click',closeEdit);
$('btn-save-edit').addEventListener('click',saveEdit);
$('edit-modal').addEventListener('click',function(e){if(e.target===$('edit-modal'))closeEdit();});

// Backup / Restore / Import
$('btn-undo').addEventListener('click',undo);
$('btn-redo').addEventListener('click',redo);
$('btn-backup').addEventListener('click',backup);
$('btn-restore').addEventListener('click',function(){$('restore-file').click();});
$('restore-file').addEventListener('change',function(e){if(e.target.files[0]){restore(e.target.files[0]);e.target.value='';}});
$('btn-import').addEventListener('click',function(){$('import-file').click();});
$('import-file').addEventListener('change',function(e){if(e.target.files[0]){importCSV(e.target.files[0]);e.target.value='';}});

// Category add
$('btn-show-cat').addEventListener('click',function(){var r=$('cat-row');r.style.display=r.style.display==='flex'?'none':'flex';if(r.style.display==='flex')$('new-cat').focus();});
$('btn-cancel-cat').addEventListener('click',function(){$('cat-row').style.display='none';$('new-cat').value='';});
function submitCat(){var n=$('new-cat').value.trim();if(!n)return;if(!addCat(n)){$('new-cat').style.borderColor='var(--danger)';setTimeout(function(){$('new-cat').style.borderColor='';},1200);return;}$('new-cat').value='';$('cat-row').style.display='none';}
$('btn-save-cat').addEventListener('click',submitCat);
$('new-cat').addEventListener('keydown',function(e){if(e.key==='Enter')submitCat();if(e.key==='Escape'){$('cat-row').style.display='none';$('new-cat').value='';}});
$('btn-split-cat').addEventListener('click',function(){ccPendingSplits=askCategorySplits(parseFloat($('txn-amt').value),ccPendingSplits);if(ccPendingSplits)$('txn-cat').value=ccPendingSplits[0].cat;});
$('btn-delete-cat').addEventListener('click',function(){deleteCategory($('txn-cat').value);});
$('e-split-cat').addEventListener('click',function(){ccEditSplits=askCategorySplits(parseFloat($('e-amt').value),ccEditSplits);if(ccEditSplits)$('e-cat').value=ccEditSplits[0].cat;});

// AI
$('btn-ai').addEventListener('click',function(){$('ai-modal').classList.add('open');if(!$('ai-msgs').children.length)aiMsg('Hi! Ask me anything — try "How much on Starbucks this month?" or "Spending this week".','bot');setTimeout(function(){$('ai-in').focus();},50);});
$('btn-ai-close').addEventListener('click',function(){$('ai-modal').classList.remove('open');});
$('ai-modal').addEventListener('click',function(e){if(e.target===$('ai-modal'))$('ai-modal').classList.remove('open');});
$('btn-ai-send').addEventListener('click',aiSubmit);
$('ai-in').addEventListener('keydown',function(e){if(e.key==='Enter')aiSubmit();});
document.querySelectorAll('.ai-chip').forEach(function(c){c.addEventListener('click',function(){$('ai-in').value=c.getAttribute('data-q');aiSubmit();});});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeEdit();$('ai-modal').classList.remove('open');}});

// ── Checking Account Factory ──────────────────────────────────────────────────
function makeChecking(pfx,storeKey,openBalKey){
  var txns=JSON.parse(sGet(storeKey)||'[]');
  var openBal=parseFloat(sGet(openBalKey)||'0');
  var sortFld='date',sAsc=false,unclFirst=false,hist=[],editId=null,pendingRcpt=null,pendingSplits=null;

  function g(id){return document.getElementById(pfx+'-'+id);}

  function saveTxns(){sSet(storeKey,JSON.stringify(txns));}
  function snap(){
    hist.push(JSON.stringify(txns));
    if(hist.length>50)hist.shift();
    var b=document.getElementById('btn-undo');b.disabled=false;b.style.opacity='1';
  }

  function buildBalMap(){
    var s=txns.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:a.id-b.id;});
    var m={},r=openBal;
    s.forEach(function(t){r+=(t.type==='deposit')?t.amount:-t.amount;m[t.id]=r;});
    return m;
  }

  function renderCat(keep){
    [pfx+'-cat',pfx+'-e-cat'].forEach(function(id){
      var s=document.getElementById(id);if(!s)return;
      var pv=keep||s.value;
      s.innerHTML=categories.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('');
      if(pv)s.value=pv;
    });
  }

  function renderSummary(){
    var dep=0,wth=0,pdep=0,pwth=0,cdep=0,cwth=0;
    txns.forEach(function(t){
      var cl=!!t.cleared;
      if(t.type==='deposit'){dep+=t.amount;if(cl)cdep+=t.amount;else pdep+=t.amount;}
      else{wth+=t.amount;if(cl)cwth+=t.amount;else pwth+=t.amount;}
    });
    var bal=openBal+dep-wth,clr=openBal+cdep-cwth;
    g('s-bal').textContent=fmtS(bal);g('s-clr').textContent=fmtS(clr);
    g('s-pdep').textContent=fmt(pdep);g('s-pwth').textContent=fmt(pwth);
    document.getElementById('hdr-bal').textContent=fmtS(bal);
  }

  function arw(f){
    return sortFld===f?('<span class="sarr on">'+(sAsc?'↑':'↓')+'</span>'):'<span class="sarr"></span>';
  }

  function getFiltered(){
    var s=g('f-search').value.toLowerCase().trim(),ty=g('f-type').value;
    var fr=g('f-from').value,to=g('f-to').value;
    return txns.filter(function(t){
      if(s&&t.desc.toLowerCase().indexOf(s)===-1)return false;
      if(ty&&t.type!==ty)return false;
      if(fr&&t.date<fr)return false;
      if(to&&t.date>to)return false;
      return true;
    });
  }

  function doSort(list){
    return list.slice().sort(function(a,b){
      if(unclFirst){var ac=a.cleared?1:0,bc=b.cleared?1:0;if(ac!==bc)return ac-bc;}
      var av=a[sortFld],bv=b[sortFld];
      if(sortFld==='amount'){av=+av;bv=+bv;}
      if(av<bv)return sAsc?-1:1;if(av>bv)return sAsc?1:-1;return 0;
    });
  }

  function toggleSort(f){sAsc=(sortFld===f)?!sAsc:(f!=='date');sortFld=f;renderTable();}

  function renderTable(){
    var rows=doSort(getFiltered()),bm=buildBalMap(),mobile=isMobile();
    g('row-count').textContent=rows.length+' transaction'+(rows.length!==1?'s':'');
    var head=g('head');
    if(mobile){
      head.innerHTML='<tr>'+
        '<th style="width:32px;">&#x2713;</th>'+
        '<th class="sortable" data-sort="date" style="width:76px;">Date '+arw('date')+'</th>'+
        '<th class="sortable" data-sort="desc">Description '+arw('desc')+'</th>'+
        '<th class="sortable" data-sort="amount" style="text-align:right;width:76px;">Amount '+arw('amount')+'</th>'+
        '<th style="text-align:center;width:62px;">Act.</th></tr>';
    } else {
      head.innerHTML='<tr>'+
        '<th style="width:32px;">&#x2713;</th>'+
        '<th class="sortable" data-sort="date" style="width:88px;">Date '+arw('date')+'</th>'+
        '<th class="sortable" data-sort="desc">Description '+arw('desc')+'</th>'+
        '<th class="sortable" data-sort="cat" style="width:96px;">Category '+arw('cat')+'</th>'+
        '<th style="width:80px;">Type</th>'+
        '<th class="sortable" data-sort="amount" style="text-align:right;width:90px;">Amount '+arw('amount')+'</th>'+
        '<th style="text-align:right;width:90px;">Balance</th>'+
        '<th style="text-align:center;width:66px;">Actions</th></tr>';
    }
    var body=g('body'),empty=g('empty');
    if(!rows.length){body.innerHTML='';empty.style.display='block';return;}
    empty.style.display='none';
    var h='';
    rows.forEach(function(t){
      var bal=bm[t.id],neg=bal<0,clr=!!t.cleared;
      var isDep=t.type==='deposit';
      var cls=(isDep?'dep':'wth')+'-row'+(clr?'':' unclrd');
      var amtColor=isDep?'#16a34a':'#dc2626';
      var amtStyle='color:'+amtColor+';font-weight:700;';
      var sign=isDep?'+':'-';
      var cb='<input type="checkbox" class="'+pfx+'-clr-cb" data-id="'+t.id+'"'+(clr?' checked':'')+' title="Mark cleared">';
      var eb='<button class="btn btn-edit btn-sm '+pfx+'-edit-btn" data-id="'+t.id+'">&#x270F;&#xFE0F;</button>';
      var db='<button class="btn btn-danger btn-sm '+pfx+'-del-btn" data-id="'+t.id+'" style="margin-left:2px">&#x2715;</button>';
      var hasRcpt=!!sGet('rcpt-'+t.id);
      var rb=hasRcpt?'<button class="btn btn-sm '+pfx+'-rcpt-view" data-id="'+t.id+'" style="margin-left:2px;color:#059669;font-size:.9rem;" title="View receipt">&#x1F9FE;</button>':'';
      if(mobile){
        h+='<tr class="'+cls+'"><td class="clr-cell">'+cb+'</td>';
        h+='<td class="date-cell">'+fmtD(t.date)+'</td>';
        h+='<td class="desc-cell"><span class="desc-main" style="font-weight:500;" title="'+esc(t.desc)+'">'+esc(t.desc)+'</span><span class="desc-sub">'+esc(splitLabel(t))+'</span></td>';
        h+='<td class="amt-cell"><span style="'+amtStyle+'">'+sign+fmt(t.amount)+'</span></td>';
        h+='<td class="act-cell">'+rb+eb+db+'</td></tr>';
      } else {
        h+='<tr class="'+cls+'"><td class="clr-cell">'+cb+'</td>';
        h+='<td class="date-cell">'+fmtD(t.date)+'</td>';
        h+='<td class="desc-cell"><span class="desc-main" style="font-weight:500;" title="'+esc(t.desc)+'">'+esc(t.desc)+'</span></td>';
        h+='<td class="cat-cell"><span class="catbdg">'+esc(splitLabel(t))+'</span></td>';
        h+='<td class="type-cell"><span class="badge '+(isDep?'b-ret':'b-exp')+'">'+(isDep?'Dep':'Wth')+'</span></td>';
        h+='<td class="amt-cell"><span style="'+amtStyle+'">'+sign+fmt(t.amount)+'</span></td>';
        h+='<td class="bal-cell"><span style="font-weight:600;color:'+(neg?'#dc2626':'#2563eb')+';">'+fmtS(bal)+'</span></td>';
        h+='<td class="act-cell">'+rb+eb+db+'</td></tr>';
      }
    });
    body.innerHTML=h;
  }

  function renderAll(){renderSummary();renderTable();}

  function addTxn(){
    var date=g('date').value,desc=g('desc').value.trim();
    var amt=parseFloat(g('amt').value),cat=g('cat').value;
    var te=document.querySelector('input[name="'+pfx+'-type"]:checked');
    var type=te?te.value:'deposit',err=g('form-err');
    if(!date){err.textContent='Please enter a date.';return;}
    if(!desc){err.textContent='Please enter a description.';return;}
    if(!amt||amt<=0){err.textContent='Please enter a valid amount.';return;}
    err.textContent='';snap();
    var newId=Date.now();
    txns.push({id:newId,date:date,desc:desc,cat:pendingSplits?pendingSplits[0].cat:cat,splits:pendingSplits||undefined,type:type,amount:amt,cleared:false,trip:activeTripId||undefined});
    pendingSplits=null;
    if(pendingRcpt){sSet('rcpt-'+newId,pendingRcpt);pendingRcpt=null;g('photo-thumb').style.display='none';g('photo-thumb').src='';}
    saveTxns();renderAll();
    g('desc').value='';g('amt').value='';g('date').value=todayStr();g('desc').focus();
    // Cindy's Checking withdrawal → offer to mirror as CC payment
    if(pfx==='chk'&&type==='withdrawal'){
      if(confirm('Also add $'+amt.toFixed(2)+' as a payment in the Credit Card register?')){
        snapshot();
        transactions.push({id:newId+1,date:date,desc:desc,cat:'Payment',type:'payment',amount:amt,cleared:false,who:'wife',trip:activeTripId||undefined});
        save();
        if(activeTab==='cc')renderAll();
      }
    }
  }

  function delTxn(id){
    if(!confirm('Delete this transaction?'))return;
    snap();txns=txns.filter(function(t){return t.id!==id;});delRcptKey(id);saveTxns();renderAll();
  }

  function toggleCleared(id){
    var t=txns.find(function(x){return x.id===id;});
    if(t){snap();t.cleared=!t.cleared;saveTxns();renderAll();}
  }

  function openEdit(id){
    var t=txns.find(function(x){return x.id===id;});if(!t)return;
    editId=id;
    g('e-date').value=t.date;g('e-desc').value=t.desc;
    g('e-amt').value=t.amount;g('e-cleared').checked=!!t.cleared;
    var r=document.querySelector('input[name="'+pfx+'-e-type"][value="'+t.type+'"]');if(r)r.checked=true;
    g('edit-err').textContent='';renderCat(t.cat);
    g('e-trip').innerHTML=buildTripOpts(t.trip||null);
    g('edit-modal').classList.add('open');
  }

  function closeEdit(){g('edit-modal').classList.remove('open');editId=null;}

  function saveEdit(){
    var date=g('e-date').value,desc=g('e-desc').value.trim();
    var amt=parseFloat(g('e-amt').value),cat=g('e-cat').value;
    var te=document.querySelector('input[name="'+pfx+'-e-type"]:checked');
    var type=te?te.value:'deposit',err=g('edit-err');
    if(!date){err.textContent='Date required.';return;}
    if(!desc){err.textContent='Description required.';return;}
    if(!amt||amt<=0){err.textContent='Valid amount required.';return;}
    var i=txns.findIndex(function(t){return t.id===editId;});if(i===-1)return;
    snap();
    var tv=g('e-trip').value;var tid=tv?parseInt(tv,10):undefined;
    var oldSplits=txns[i].splits;
    if(oldSplits&&Math.abs(oldSplits.reduce(function(s,x){return s+x.amount;},0)-amt)>0.01)oldSplits=undefined;
    txns[i]={id:txns[i].id,date:date,desc:desc,cat:oldSplits?oldSplits[0].cat:cat,splits:oldSplits,type:type,amount:amt,cleared:g('e-cleared').checked,trip:tid};
    saveTxns();renderAll();closeEdit();
  }

  function exportCSV(){
    var rows=doSort(getFiltered());if(!rows.length){alert('Nothing to export.');return;}
    var bm=buildBalMap();
    var lines=['Date,Description,Category,Type,Amount,Balance,Cleared'];
    rows.forEach(function(t){
      lines.push([t.date,'"'+t.desc.replace(/"/g,'""')+'"',t.cat,
        t.type==='deposit'?'Deposit':'Withdrawal',
        (t.type==='deposit'?'':'-')+t.amount.toFixed(2),bm[t.id].toFixed(2),t.cleared?'Yes':'No'].join(','));
    });
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));
    a.download=pfx+'-register-'+todayStr()+'.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  }

  function submitCat(){
    var n=g('new-cat').value.trim();if(!n)return;
    if(!addCat(n)){g('new-cat').style.borderColor='#dc2626';setTimeout(function(){g('new-cat').style.borderColor='';},1200);return;}
    renderCat(n);
    g('new-cat').value='';g('cat-row').style.display='none';
  }

  function wireEvents(){
    g('btn-add').addEventListener('click',addTxn);
    g('amt').addEventListener('keydown',function(e){if(e.key==='Enter')addTxn();});
    g('btn-set-open').addEventListener('click',function(){
      var v=parseFloat(g('open').value);
      if(isNaN(v)||v<0){alert('Please enter a valid opening balance.');return;}
      openBal=v;sSet(openBalKey,v.toString());
      g('open-note').textContent='Opening balance: '+fmt(v);
      renderAll();
    });
    [pfx+'-f-search',pfx+'-f-type',pfx+'-f-from',pfx+'-f-to'].forEach(function(id){
      document.getElementById(id).addEventListener(id.indexOf('search')!==-1?'input':'change',function(){renderTable();});
    });
    g('btn-clr-filter').addEventListener('click',function(){
      ['f-search','f-type','f-from','f-to'].forEach(function(id){g(id).value='';});renderTable();
    });
    g('btn-export').addEventListener('click',exportCSV);
    g('btn-uncl').addEventListener('click',function(){unclFirst=!unclFirst;this.classList.toggle('active',unclFirst);renderTable();});
    g('btn-clr-all').addEventListener('click',function(){
      if(!txns.length)return;if(!confirm('Delete ALL transactions?'))return;
      snap();txns=[];saveTxns();renderAll();
    });
    g('head').addEventListener('click',function(e){
      var th=e.target.closest('th.sortable');if(th)toggleSort(th.getAttribute('data-sort'));
    });
    g('body').addEventListener('click',function(e){
      var eb=e.target.closest('.'+pfx+'-edit-btn'),db=e.target.closest('.'+pfx+'-del-btn');
      var rv=e.target.closest('.'+pfx+'-rcpt-view');
      if(eb)openEdit(parseInt(eb.getAttribute('data-id'),10));
      if(db)delTxn(parseInt(db.getAttribute('data-id'),10));
      if(rv)openRcptView(parseInt(rv.getAttribute('data-id'),10));
    });
    g('body').addEventListener('change',function(e){
      var cb=e.target.closest('.'+pfx+'-clr-cb');
      if(cb)toggleCleared(parseInt(cb.getAttribute('data-id'),10));
    });
    g('btn-cancel-edit').addEventListener('click',closeEdit);
    g('btn-save-edit').addEventListener('click',saveEdit);
    g('edit-modal').addEventListener('click',function(e){if(e.target===g('edit-modal'))closeEdit();});
    g('btn-show-cat').addEventListener('click',function(){
      var r=g('cat-row');r.style.display=r.style.display==='flex'?'none':'flex';
      if(r.style.display==='flex')g('new-cat').focus();
    });
    g('btn-cancel-cat').addEventListener('click',function(){g('cat-row').style.display='none';g('new-cat').value='';});
    g('btn-save-cat').addEventListener('click',submitCat);
    g('btn-split-cat').addEventListener('click',function(){pendingSplits=askCategorySplits(parseFloat(g('amt').value),pendingSplits);if(pendingSplits)g('cat').value=pendingSplits[0].cat;});
    g('btn-delete-cat').addEventListener('click',function(){deleteCategory(g('cat').value);});
    g('new-cat').addEventListener('keydown',function(e){
      if(e.key==='Enter')submitCat();
      if(e.key==='Escape'){g('cat-row').style.display='none';g('new-cat').value='';}
    });
    g('cam-btn').addEventListener('click',function(){g('cam-inp').click();});
    g('lib-btn').addEventListener('click',function(){g('lib-inp').click();});
    g('cam-inp').addEventListener('change',function(e){
      if(e.target.files[0]){compressImage(e.target.files[0],function(d){pendingRcpt=d;g('photo-thumb').src=d;g('photo-thumb').style.display='inline-block';});}
      e.target.value='';
    });
    g('lib-inp').addEventListener('change',function(e){
      if(e.target.files[0]){compressImage(e.target.files[0],function(d){pendingRcpt=d;g('photo-thumb').src=d;g('photo-thumb').style.display='inline-block';});}
      e.target.value='';
    });
    g('photo-thumb').addEventListener('click',function(){pendingRcpt=null;this.style.display='none';this.src='';});
  }

  return {
    getTxns:function(){return txns;},
    setTxns:function(arr){txns=arr;},
    getOpenBal:function(){return openBal;},
    setOpenBal:function(v){openBal=v;},
    renderAll:renderAll,
    renderCat:renderCat,
    closeEdit:closeEdit,
    wireEvents:wireEvents,
    activatePane:function(){
      g('open').value=openBal>0?openBal.toFixed(2):'';
      g('open-note').textContent=openBal>0?'Opening balance: '+fmt(openBal):'No opening balance set';
      renderCat();renderAll();
    }
  };
}

var chk=makeChecking('chk','chk-register','chk-open-bal');
var mike=makeChecking('mike','mike-register','mike-open-bal');
var sav=makeChecking('savings','savings-register','savings-open-bal');
var hysa=makeChecking('hysa','hysa-register','hysa-open-bal');
chk.wireEvents();
mike.wireEvents();
sav.wireEvents();
hysa.wireEvents();

// ── Tab Switching ─────────────────────────────────────────────────────────────
var activeTab='cc';
function switchTab(tab){
  activeTab=tab;
  ['cc-pane','chk-pane','mike-pane','savings-pane','hysa-pane'].forEach(function(id){$(id).style.display=id===tab+'-pane'?'':'none';});
  ['tab-cc','tab-chk','tab-mike','tab-savings','tab-hysa'].forEach(function(id){$(id).classList.toggle('active',id==='tab-'+tab);});
  if(tab==='cc'){$('page-title').textContent='💳 Cindy\'s Credit Card Register';$('page-sub').textContent='My Credit Card';renderAll();}
  else if(tab==='chk'){$('page-title').textContent='🏦 Cindy\'s Checking Account';$('page-sub').textContent='My Checking Account';chk.activatePane();}
  else if(tab==='mike'){$('page-title').textContent='🏦 Mike\'s Checking Account';$('page-sub').textContent='My Checking Account';mike.activatePane();}
  else if(tab==='savings'){$('page-title').textContent='💰 Savings Account';$('page-sub').textContent='Savings';sav.activatePane();}
  else{$('page-title').textContent='📈 HYSA Account';$('page-sub').textContent='High Yield Savings';hysa.activatePane();}
}

$('tab-cc').addEventListener('click',function(){switchTab('cc');});
$('tab-chk').addEventListener('click',function(){switchTab('chk');});
$('tab-mike').addEventListener('click',function(){switchTab('mike');});
$('tab-savings').addEventListener('click',function(){switchTab('savings');});
$('tab-hysa').addEventListener('click',function(){switchTab('hysa');});

// Resize
window.addEventListener('resize',function(){
  if(activeTab==='cc')renderTable();
  else if(activeTab==='chk')chk.renderAll();
  else if(activeTab==='mike')mike.renderAll();
  else if(activeTab==='savings')sav.renderAll();
  else hysa.renderAll();
});

// ── Receipt Image Storage ─────────────────────────────────────────────────────
var rcptTargetId=null;
var ccPendingRcpt=null;

function compressImage(file,cb){
  var reader=new FileReader();
  reader.onload=function(ev){
    var img=new Image();
    img.onload=function(){
      var maxW=900,w=img.width,h=img.height;
      if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      var c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      cb(c.toDataURL('image/jpeg',0.65));
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
}

function delRcptKey(id){
  try{localStorage.removeItem('rcpt-'+id);}catch(e){}
  try{delete _mem['rcpt-'+id];}catch(e){}
}

function openRcptAttach(id){
  rcptTargetId=id;
  $('rcpt-attach-modal').classList.add('open');
}

function openRcptView(id){
  var data=sGet('rcpt-'+id);if(!data)return;
  rcptTargetId=id;
  $('rcpt-view-img').src=data;
  $('rcpt-view-modal').classList.add('open');
}

function removeRcpt(){
  if(!confirm('Remove this receipt photo?'))return;
  delRcptKey(rcptTargetId);
  $('rcpt-view-modal').classList.remove('open');
  if(activeTab==='cc')renderTable();
  else if(activeTab==='chk')chk.renderAll();
  else mike.renderAll();
}

function attachRcptFile(file){
  if(!rcptTargetId)return;
  compressImage(file,function(data){
    sSet('rcpt-'+rcptTargetId,data);
    $('rcpt-attach-modal').classList.remove('open');
    if(activeTab==='cc')renderTable();
    else if(activeTab==='chk')chk.renderAll();
    else mike.renderAll();
  });
}

// ── Receipt Scanner ───────────────────────────────────────────────────────────
var scanTarget='cc';

function loadTesseract(cb){
  if(window.Tesseract){cb();return;}
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  s.onload=cb;
  s.onerror=function(){alert('Could not load OCR library. Check your internet connection and try again.');};
  document.head.appendChild(s);
}

function scanShowState(st){
  $('scan-s-upload').style.display=st==='upload'?'':'none';
  $('scan-s-proc').style.display=st==='proc'?'':'none';
  $('scan-s-res').style.display=st==='res'?'':'none';
  $('scan-retry-btn').style.display=st==='res'?'':'none';
  $('scan-use-btn').style.display=st==='res'?'':'none';
}

function openScanner(target){
  scanTarget=target;
  var sc=$('scan-r-cat');
  sc.innerHTML=categories.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('');
  scanShowState('upload');
  $('scan-drop').classList.remove('drag-over');
  $('scan-modal').classList.add('open');
}

`;
TRACKER_HTML += `function processReceiptFile(file){
  if(!file||!file.type.startsWith('image/')){alert('Please select an image file.');return;}
  var url=URL.createObjectURL(file);
  $('scan-prev-img').src=url;
  $('scan-res-img').src=url;
  scanShowState('proc');
  $('scan-fill').style.width='0%';
  $('scan-status').textContent='Loading OCR engine…';

  loadTesseract(function(){
    $('scan-status').textContent='Initialising…';
    Tesseract.recognize(file,'eng',{logger:function(m){
      if(m.status==='loading tesseract core'){$('scan-fill').style.width='10%';}
      else if(m.status==='initializing tesseract'){$('scan-fill').style.width='25%';}
      else if(m.status==='loading language traineddata'){$('scan-status').textContent='Loading language data…';$('scan-fill').style.width='40%';}
      else if(m.status==='initializing api'){$('scan-fill').style.width='60%';}
      else if(m.status==='recognizing text'){
        var p=Math.round(m.progress*100);
        $('scan-fill').style.width=Math.max(60,60+p*0.4)+'%';
        $('scan-status').textContent='Reading text… '+p+'%';
      }
    }}).then(function(result){
      $('scan-fill').style.width='100%';
      var text=result.data.text;
      $('scan-raw-pre').textContent=text;
      var parsed=parseReceiptText(text);
      $('scan-r-date').value=parsed.date||todayStr();
      $('scan-r-desc').value=parsed.merchant||'';
      $('scan-r-amt').value=parsed.amount?parsed.amount.toFixed(2):'';
      if(parsed.category)$('scan-r-cat').value=parsed.category;
      $('scan-res-err').textContent=(parsed.merchant||parsed.amount)?'':'OCR complete but details are unclear — please fill in manually.';
      scanShowState('res');
    }).catch(function(err){
      $('scan-status').textContent='Error: '+err.message;
    });
  });
}

function parseReceiptText(raw){
  var lines=raw.split('\n').map(function(l){return l.trim();}).filter(Boolean);

  var merchant='';
  for(var i=0;i<Math.min(lines.length,6);i++){
    var l=lines[i];
    if(l.length>=3&&!/^\d/.test(l)&&!/^(tel|phone|fax|www|http|\d{3}[\s\-\.]?\d{3})/i.test(l)){
      merchant=l.replace(/[*#|\\]/g,'').trim();
      if(merchant===merchant.toUpperCase()&&merchant.length>2){
        merchant=merchant.toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase();});
      }
      break;
    }
  }

  var date=null;
  var patterns=[
    {re:/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,fn:function(m){return m[3]+'-'+pad(+m[1])+'-'+pad(+m[2]);}},
    {re:/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?!\d)/,fn:function(m){var y=+m[3];y=y<50?2000+y:1900+y;return y+'-'+pad(+m[1])+'-'+pad(+m[2]);}},
    {re:/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,fn:function(m){return m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]);}},
    {re:/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})[,\s]+(\d{4})/i,fn:function(m){
      var mn={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      return m[3]+'-'+(mn[m[1].slice(0,3).toLowerCase()]||'01')+'-'+pad(+m[2]);
    }}
  ];
  for(var i=0;i<lines.length&&!date;i++){
    for(var j=0;j<patterns.length&&!date;j++){
      var m2=lines[i].match(patterns[j].re);
      if(m2){
        try{
          var d=patterns[j].fn(m2);
          var dt=new Date(d+'T12:00:00');
          if(!isNaN(dt.getTime())&&dt.getFullYear()>=2000&&dt.getFullYear()<=2035)date=d;
        }catch(e2){}
      }
    }
  }

  var amount=null;
  var totalRe=/(?:total|amount\s*due|balance\s*due|grand\s*total|sale\s*total|charged|you\s*paid)[^\d$]*\$?\s*(\d{1,5}\.?\d{0,2})/i;
  for(var i=lines.length-1;i>=0&&amount===null;i--){
    var m3=lines[i].match(totalRe);
    if(m3){var v=parseFloat(m3[1]);if(v>0&&v<50000)amount=v;}
  }
  if(amount===null){
    var allAmts=[],re2=/\$\s*(\d{1,5}\.\d{2})/g,mth;
    while((mth=re2.exec(raw))!==null){var v2=parseFloat(mth[1]);if(v2>0&&v2<50000)allAmts.push(v2);}
    if(allAmts.length){allAmts.sort(function(a,b){return b-a;});amount=allAmts[0];}
  }

  var n=(merchant+' '+raw).toLowerCase();
  var cat='Other';
  if(/starbucks|dunkin|coffee|cafe|restaurant|mcdonald|burger|pizza|taco|chipotle|subway|chick.fil|wendy|kfc|popeyes|diner|bistro|grill|sushi|chinese|thai|italian|deli|bakery/i.test(n))cat='Dining';
  else if(/walmart|target|costco|sam.s club|kroger|publix|safeway|whole foods|aldi|trader joe|food lion|winn.dixie|h.e.b|meijer|giant/i.test(n))cat='Groceries';
  else if(/shell|chevron|exxon|bp|mobil|speedway|marathon|sunoco|circle k|pilot|flying j|quiktrip|wawa|racetrac|sheetz|\bgas\b|fuel/i.test(n))cat='Gas';
  else if(/amazon|ebay|best buy|home depot|lowes|ikea|tj maxx|marshalls|ross|kohls|nordstrom|macy|gap|old navy/i.test(n))cat='Shopping';
  else if(/uber|lyft|delta|united|american airlines|southwest|jetblue|marriott|hilton|hyatt|airbnb|hotel|motel|inn|rental car/i.test(n))cat='Travel';
  else if(/netflix|hulu|spotify|apple|google play|disney|amazon prime|youtube|microsoft|adobe|subscription/i.test(n))cat='Subscriptions';
  else if(/cvs|walgreens|rite aid|pharmacy|hospital|clinic|\bdr\b|dental|vision|medical|health/i.test(n))cat='Healthcare';
  else if(/electric|utility|water bill|at.t|verizon|comcast|xfinity|t.mobile|spectrum|cox/i.test(n))cat='Utilities';
  else if(/amc|regal|cinemark|theater|cinema|bowling|dave.buster|entertainment/i.test(n))cat='Entertainment';
  else{for(var i=0;i<categories.length;i++){if(n.indexOf(categories[i].toLowerCase())!==-1){cat=categories[i];break;}}}

  return{merchant:merchant,date:date,amount:amount,category:cat};
}

function applyScanResult(){
  var date=$('scan-r-date').value,desc=$('scan-r-desc').value.trim();
  var amt=$('scan-r-amt').value,cat=$('scan-r-cat').value;
  if(scanTarget==='cc'){
    if(date)$('txn-date').value=date;
    if(desc)$('txn-desc').value=desc;
    if(amt)$('txn-amt').value=amt;
    if(cat)$('txn-cat').value=cat;
    $('txn-desc').focus();
  } else if(scanTarget==='chk'){
    if(date)$('chk-date').value=date;
    if(desc)$('chk-desc').value=desc;
    if(amt)$('chk-amt').value=amt;
    if(cat)$('chk-cat').value=cat;
    $('chk-desc').focus();
  } else {
    if(date)$('mike-date').value=date;
    if(desc)$('mike-desc').value=desc;
    if(amt)$('mike-amt').value=amt;
    if(cat)$('mike-cat').value=cat;
    $('mike-desc').focus();
  }
  $('scan-modal').classList.remove('open');
}

$('scan-camera-btn').addEventListener('click',function(){$('scan-file-camera').click();});
$('scan-library-btn').addEventListener('click',function(){$('scan-file-library').click();});
$('scan-file-camera').addEventListener('change',function(e){if(e.target.files[0]){processReceiptFile(e.target.files[0]);}e.target.value='';});
$('scan-file-library').addEventListener('change',function(e){if(e.target.files[0]){processReceiptFile(e.target.files[0]);}e.target.value='';});
$('scan-cancel-btn').addEventListener('click',function(){$('scan-modal').classList.remove('open');});
$('scan-retry-btn').addEventListener('click',function(){scanShowState('upload');});
$('scan-use-btn').addEventListener('click',applyScanResult);
$('scan-modal').addEventListener('click',function(e){if(e.target===$('scan-modal'))$('scan-modal').classList.remove('open');});
$('scan-raw-toggle-btn').addEventListener('click',function(){
  var pre=$('scan-raw-pre');
  var show=pre.style.display==='none';
  pre.style.display=show?'':'none';
  this.textContent=show?'Hide raw OCR text':'Show raw OCR text';
});
$('scan-drop').addEventListener('dragover',function(e){e.preventDefault();this.classList.add('drag-over');});
$('scan-drop').addEventListener('dragleave',function(){this.classList.remove('drag-over');});
$('scan-drop').addEventListener('drop',function(e){
  e.preventDefault();this.classList.remove('drag-over');
  var f=e.dataTransfer.files[0];if(f)processReceiptFile(f);
});

// Receipt modal events
document.getElementById('rcpt-camera-btn').addEventListener('click',function(){document.getElementById('rcpt-camera-inp').click();});
document.getElementById('rcpt-library-btn').addEventListener('click',function(){document.getElementById('rcpt-library-inp').click();});
document.getElementById('rcpt-camera-inp').addEventListener('change',function(e){if(e.target.files[0]){attachRcptFile(e.target.files[0]);}e.target.value='';});
document.getElementById('rcpt-library-inp').addEventListener('change',function(e){if(e.target.files[0]){attachRcptFile(e.target.files[0]);}e.target.value='';});
document.getElementById('rcpt-cancel-btn').addEventListener('click',function(){document.getElementById('rcpt-attach-modal').classList.remove('open');});
document.getElementById('rcpt-attach-modal').addEventListener('click',function(e){if(e.target===document.getElementById('rcpt-attach-modal'))document.getElementById('rcpt-attach-modal').classList.remove('open');});
document.getElementById('rcpt-remove-btn').addEventListener('click',removeRcpt);
document.getElementById('rcpt-view-close').addEventListener('click',function(){document.getElementById('rcpt-view-modal').classList.remove('open');});
document.getElementById('rcpt-view-modal').addEventListener('click',function(e){if(e.target===document.getElementById('rcpt-view-modal'))document.getElementById('rcpt-view-modal').classList.remove('open');});

// CC inline photo events
document.getElementById('cc-cam-btn').addEventListener('click',function(){document.getElementById('cc-cam-inp').click();});
document.getElementById('cc-lib-btn').addEventListener('click',function(){document.getElementById('cc-lib-inp').click();});
document.getElementById('cc-cam-inp').addEventListener('change',function(e){
  if(e.target.files[0]){compressImage(e.target.files[0],function(d){ccPendingRcpt=d;document.getElementById('cc-photo-thumb').src=d;document.getElementById('cc-photo-thumb').style.display='inline-block';});}
  e.target.value='';
});
document.getElementById('cc-lib-inp').addEventListener('change',function(e){
  if(e.target.files[0]){compressImage(e.target.files[0],function(d){ccPendingRcpt=d;document.getElementById('cc-photo-thumb').src=d;document.getElementById('cc-photo-thumb').style.display='inline-block';});}
  e.target.value='';
});
document.getElementById('cc-photo-thumb').addEventListener('click',function(){ccPendingRcpt=null;this.style.display='none';this.src='';});
// Notes
(function(){
  var ccN=document.getElementById('cc-notes'),chkN=document.getElementById('chk-notes'),mikeN=document.getElementById('mike-notes'),savN=document.getElementById('savings-notes'),hysaN=document.getElementById('hysa-notes');
  ccN.value=sGet('cc-notes')||'';
  chkN.value=sGet('chk-notes')||'';
  mikeN.value=sGet('mike-notes')||'';
  savN.value=sGet('savings-notes')||'';
  hysaN.value=sGet('hysa-notes')||'';
  ccN.addEventListener('input',function(){sSet('cc-notes',ccN.value);});
  chkN.addEventListener('input',function(){sSet('chk-notes',chkN.value);});
  mikeN.addEventListener('input',function(){sSet('mike-notes',mikeN.value);});
  savN.addEventListener('input',function(){sSet('savings-notes',savN.value);});
  hysaN.addEventListener('input',function(){sSet('hysa-notes',hysaN.value);});
})();

// Boot
renderCatSelects();
document.getElementById('txn-date').value=todayStr();
renderAll();


// Trip Mode
function buildTripOpts(selectedId){
  var h='<option value="">(No Trip)</option>';
  trips.forEach(function(t){
    h+='<option value="'+t.id+'"'+(t.id===selectedId?' selected':'')+'>'+esc(t.name)+(t.endDate?'':' ✈️')+'</option>';
  });
  return h;
}
function saveTrips(){sSet('cc-trips',JSON.stringify(trips));}
function getActiveTripObj(){return trips.find(function(t){return t.id===activeTripId;})||null;}
function getAllTripTxns(tripId){
  var all=[];
  transactions.forEach(function(t){if(t.trip===tripId)all.push({t:t,acct:'CC'});});
  chk.getTxns().forEach(function(t){if(t.trip===tripId)all.push({t:t,acct:"Cindy's Chk"});});
  mike.getTxns().forEach(function(t){if(t.trip===tripId)all.push({t:t,acct:"Mike's Chk"});});
  return all;
}
function tripSpent(txns){
  var s=0;
  txns.forEach(function(item){
    var t=item.t;
    if(t.type==='expense'||t.type==='withdrawal')s+=t.amount;
    else if(t.type==='return')s-=t.amount;
  });
  return s;
}
function updateTripIndicator(){
  var trip=getActiveTripObj();
  var ind=$('trip-indicator');
  if(trip){ind.textContent='✈️ '+trip.name;ind.style.display='';}
  else{ind.style.display='none';}
}
function startTrip(name,budget,startDate){
  var id=Date.now();
  trips.push({id:id,name:name,budget:budget||0,startDate:startDate,endDate:null});
  saveTrips();activeTripId=id;sSet('active-trip',id.toString());updateTripIndicator();
}
function endTrip(){
  var trip=getActiveTripObj();if(trip)trip.endDate=todayStr();
  saveTrips();activeTripId=null;sSet('active-trip','');updateTripIndicator();
}
function showTripState(st){
  ['none','active','history','detail'].forEach(function(s){
    $('trip-s-'+s).style.display=s===st?'':'none';
  });
}
function renderBudgetBar(trip,spent){
  if(trip.budget>0){
    var pct=Math.min(100,spent/trip.budget*100);
    var bc=pct>=90?'#dc2626':pct>=70?'#d97706':'#2563eb';
    var rem=trip.budget-spent;
    return '<div style="margin:10px 0 6px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:4px;">'
      +'<span>Budget: '+fmt(trip.budget)+'</span>'
      +'<span style="color:'+(pct>=90?'#dc2626':'#1e293b')+';">Spent: '+fmt(spent)+'</span></div>'
      +'<div style="background:#e2e8f0;border-radius:4px;height:8px;">'
      +'<div style="background:'+bc+';width:'+pct+'%;height:8px;border-radius:4px;"></div></div>'
      +'<div style="font-size:.78rem;color:'+(rem<0?'#dc2626':'#16a34a')+';">'
      +(rem>=0?fmt(rem)+' remaining':fmt(-rem)+' over budget')+'</div></div>';
  }
  return '<div style="margin:10px 0;font-size:.95rem;font-weight:600;">Total Spent: '+fmt(spent)+'</div>';
}
function renderCatBars(txns,spent){
  var cats={};
  txns.forEach(function(item){
    var t=item.t;
    if(t.type==='expense'||t.type==='withdrawal')cats[t.cat]=(cats[t.cat]||0)+t.amount;
  });
  var arr=Object.keys(cats).map(function(k){return{cat:k,amt:cats[k]};}).sort(function(a,b){return b.amt-a.amt;});
  if(!arr.length)return '<p style="color:#94a3b8;font-size:.85rem;text-align:center;padding:12px 0;">No transactions on this trip yet.</p>';
  var h='<div style="font-size:.72rem;font-weight:600;color:#64748b;margin:8px 0 5px;letter-spacing:.05em;">BY CATEGORY</div>';
  arr.forEach(function(c){
    var pct=spent>0?Math.round(c.amt/spent*100):0;
    h+='<div style="margin-bottom:5px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:.8rem;"><span>'+esc(c.cat)+'</span><span>'+fmt(c.amt)+'</span></div>'
      +'<div style="background:#e2e8f0;border-radius:2px;height:4px;"><div style="background:#2563eb;width:'+pct+'%;height:4px;border-radius:2px;"></div></div>'
      +'</div>';
  });
  return h;
}
function openTripModal(){
  var trip=getActiveTripObj();
  if(trip){
    var txns=getAllTripTxns(trip.id),spent=tripSpent(txns);
    $('trip-active-header').innerHTML='<h3 style="margin-bottom:2px;">'+esc(trip.name)+'</h3>'
      +'<p style="color:#64748b;font-size:.8rem;margin-bottom:8px;">Started '+fmtD(trip.startDate)+' &bull; '+txns.length+' transaction'+(txns.length!==1?'s':'')+'</p>';
    $('trip-budget-bar').innerHTML=renderBudgetBar(trip,spent);
    $('trip-cat-list').innerHTML=renderCatBars(txns,spent);
    showTripState('active');
  } else {
    $('trip-name-inp').value='';$('trip-budget-inp').value='';
    $('trip-start-inp').value=todayStr();$('trip-none-err').textContent='';
    showTripState('none');
  }
  $('trip-modal').classList.add('open');
}
function renderTripHistory(){
  var ended=trips.filter(function(t){return t.endDate;}).slice().reverse();
  if(!ended.length){
    $('trip-history-list').innerHTML='<p style="color:#94a3b8;text-align:center;padding:20px 0;">No past trips yet.</p>';return;
  }
  var h='';
  ended.forEach(function(trip){
    var txns=getAllTripTxns(trip.id),spent=tripSpent(txns);
    h+='<div class="trip-hist-row" data-id="'+trip.id+'" style="padding:10px;border:1px solid #e0e4ea;border-radius:6px;margin-bottom:8px;cursor:pointer;">'
      +'<div style="font-weight:600;">'+esc(trip.name)+'</div>'
      +'<div style="font-size:.78rem;color:#64748b;">'+fmtD(trip.startDate)+' – '+fmtD(trip.endDate)
      +' &bull; '+txns.length+' txn'+(txns.length!==1?'s':'')
      +' &bull; '+fmt(spent)+(trip.budget?' / '+fmt(trip.budget)+' budget':'')+'</div></div>';
  });
  $('trip-history-list').innerHTML=h;
  document.querySelectorAll('.trip-hist-row').forEach(function(row){
    row.addEventListener('click',function(){showTripDetail(parseInt(this.getAttribute('data-id'),10));});
  });
}
function showTripDetail(id){
  var trip=trips.find(function(t){return t.id===id;});if(!trip)return;
  $('trip-delete-btn').setAttribute('data-id',id);
  var txns=getAllTripTxns(id),spent=tripSpent(txns);
  var h='<h3 style="margin-bottom:2px;">'+esc(trip.name)+'</h3>'
    +'<p style="color:#64748b;font-size:.8rem;margin-bottom:8px;">'+fmtD(trip.startDate)+' – '+fmtD(trip.endDate)+'</p>';
  h+=renderBudgetBar(trip,spent);
  h+=renderCatBars(txns,spent);
  if(txns.length){
    h+='<div style="font-size:.72rem;font-weight:600;color:#64748b;margin:10px 0 4px;letter-spacing:.05em;">TRANSACTIONS</div>'
      +'<div style="border:1px solid #e0e4ea;border-radius:6px;overflow:hidden;">';
    txns.slice().sort(function(a,b){return a.t.date<b.t.date?-1:1;}).forEach(function(item){
      var t=item.t,isExp=(t.type==='expense'||t.type==='withdrawal');
      h+='<div style="padding:6px 8px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">'
        +'<div><div style="font-size:.82rem;font-weight:500;">'+esc(t.desc)+'</div>'
        +'<div style="font-size:.7rem;color:#64748b;">'+fmtD(t.date)+' &bull; '+esc(item.acct)+'</div></div>'
        +'<span style="font-weight:700;color:'+(isExp?'#dc2626':'#16a34a')+';">'+(isExp?'+':'−')+fmt(t.amount)+'</span></div>';
    });
    h+='</div>';
  }
  $('trip-detail-content').innerHTML=h;
  showTripState('detail');
}

// Trip events
$('btn-trip').addEventListener('click',openTripModal);
$('trip-modal').addEventListener('click',function(e){if(e.target===$('trip-modal'))$('trip-modal').classList.remove('open');});
$('trip-close-btn').addEventListener('click',function(){$('trip-modal').classList.remove('open');});
$('trip-close-btn2').addEventListener('click',function(){$('trip-modal').classList.remove('open');});
$('trip-start-btn').addEventListener('click',function(){
  var name=$('trip-name-inp').value.trim(),budget=parseFloat($('trip-budget-inp').value)||0,sd=$('trip-start-inp').value;
  if(!name){$('trip-none-err').textContent='Please enter a trip name.';return;}
  startTrip(name,budget,sd);openTripModal();
});
$('trip-history-btn').addEventListener('click',function(){renderTripHistory();showTripState('history');});
$('trip-end-btn').addEventListener('click',function(){if(!confirm('End this trip?'))return;endTrip();$('trip-modal').classList.remove('open');});
$('trip-back-btn').addEventListener('click',function(){showTripState('none');});
$('trip-detail-back-btn').addEventListener('click',function(){renderTripHistory();showTripState('history');});
$('trip-delete-btn').addEventListener('click',function(){
  var id=parseInt(this.getAttribute('data-id'),10);
  if(!confirm('Delete this trip record? (Transactions are kept.)'))return;
  trips=trips.filter(function(t){return t.id!==id;});saveTrips();renderTripHistory();
});
updateTripIndicator();

})();
<\/script>
</body>
</html>
`;
// TRACKER_HTML override: the block above (which built TRACKER_HTML via `+=` template literals) has a
// subtle bug — JS template literals silently strip backslashes before letters (e.g. \d, \s become just
// d, s) and resolve \' into a bare ', which corrupts the tracker's own regexes and string literals when
// the browser re-parses the srcdoc content. Base64 has no special characters, so decoding it here always
// reproduces the tracker's source byte-for-byte, with no escaping risk at all. This overwrites the
// TRACKER_HTML value computed above with the correct one.
const TRACKER_HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAiPgo8bWV0YSBodHRwLWVxdWl2PSJDYWNoZS1Db250cm9sIiBjb250ZW50PSJuby1jYWNoZSwgbm8tc3RvcmUsIG11c3QtcmV2YWxpZGF0ZSI+CjxtZXRhIGh0dHAtZXF1aXY9IlByYWdtYSIgY29udGVudD0ibm8tY2FjaGUiPgo8bWV0YSBodHRwLWVxdWl2PSJFeHBpcmVzIiBjb250ZW50PSIwIj4KPHRpdGxlPkNpbmR5J3MgQ3JlZGl0IENhcmQgUmVnaXN0ZXIgdjk8L3RpdGxlPgo8c3R5bGU+CiogeyBib3gtc2l6aW5nOiBib3JkZXItYm94OyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IH0KOnJvb3QgewogIC0tYmc6I2YwZjJmNTsgLS1zdXJmYWNlOiNmZmY7IC0tYm9yZGVyOiNlMGU0ZWE7CiAgLS1wcmltYXJ5OiMyNTYzZWI7IC0tcHJpbWFyeS1ob3ZlcjojMWQ0ZWQ4OwogIC0tZGFuZ2VyOiNkYzI2MjY7IC0tc3VjY2VzczojMTZhMzRhOwogIC0tdGV4dDojMWUyOTNiOyAtLW11dGVkOiM2NDc0OGI7Cn0KaHRtbCxib2R5IHsgaGVpZ2h0OjEwMHZoOyBvdmVyZmxvdzpoaWRkZW47IGRpc3BsYXk6ZmxleDsgZmxleC1kaXJlY3Rpb246Y29sdW1uOwogIGZvbnQtZmFtaWx5Oi1hcHBsZS1zeXN0ZW0sQmxpbmtNYWNTeXN0ZW1Gb250LCdTZWdvZSBVSScsc2Fucy1zZXJpZjsKICBiYWNrZ3JvdW5kOnZhcigtLWJnKTsgY29sb3I6dmFyKC0tdGV4dCk7IH0KaGVhZGVyIHsgZmxleC1zaHJpbms6MDsgYmFja2dyb3VuZDp2YXIoLS1wcmltYXJ5KTsgY29sb3I6I2ZmZjsKICBwYWRkaW5nOjEwcHggMjBweDsgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOwogIGJveC1zaGFkb3c6MCAycHggOHB4IHJnYmEoMCwwLDAsLjE1KTsgfQpoZWFkZXIgaDEgeyBmb250LXNpemU6MS4xNXJlbTsgZm9udC13ZWlnaHQ6NzAwOyB9CmhlYWRlciBwICB7IGZvbnQtc2l6ZTouNzVyZW07IG9wYWNpdHk6Ljg7IG1hcmdpbi10b3A6MXB4OyB9Ci5oYmFsIC5sYmwgeyBmb250LXNpemU6LjdyZW07IG9wYWNpdHk6Ljg7IHRleHQtYWxpZ246cmlnaHQ7IH0KLmhiYWwgLmFtdCB7IGZvbnQtc2l6ZToxLjM1cmVtOyBmb250LXdlaWdodDo3MDA7IH0KCi50b29sYmFyIHsgZmxleC1zaHJpbms6MDsgYmFja2dyb3VuZDojMWQ0ZWQ4OyBwYWRkaW5nOjZweCAyMHB4OwogIGRpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOyBnYXA6N3B4OyBmbGV4LXdyYXA6d3JhcDsgfQoudG9vbGJhciAudGxibCB7IGZvbnQtc2l6ZTouNjhyZW07IGNvbG9yOnJnYmEoMjU1LDI1NSwyNTUsLjU1KTsKICB0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOi4wNmVtOyB9Ci5idG4tdGIgeyBiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjE1KTsgY29sb3I6I2ZmZjsKICBib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsLjMpOyB9Ci5idG4tdGI6aG92ZXIgeyBiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjI1KTsgfQoKLnBhZ2UtYm9keSB7IGZsZXg6MTsgb3ZlcmZsb3c6aGlkZGVuOyBkaXNwbGF5OmZsZXg7IGZsZXgtZGlyZWN0aW9uOmNvbHVtbjsKICBwYWRkaW5nOjEwcHggMTZweDsgZ2FwOjhweDsgfQoKLnN1bW1hcnkgeyBmbGV4LXNocmluazowOyBkaXNwbGF5OmdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoNiwxZnIpOyBnYXA6OHB4OyB9Ci5jYXJkIHsgYmFja2dyb3VuZDp2YXIoLS1zdXJmYWNlKTsgYm9yZGVyLXJhZGl1czo4cHg7IHBhZGRpbmc6OHB4IDEycHg7CiAgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOyBib3gtc2hhZG93OjAgMXB4IDNweCByZ2JhKDAsMCwwLC4wNSk7IH0KLmNhcmQgLmxibCB7IGZvbnQtc2l6ZTouNjdyZW07IGNvbG9yOnZhcigtLW11dGVkKTsgdGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlOwogIGxldHRlci1zcGFjaW5nOi4wNWVtOyBtYXJnaW4tYm90dG9tOjJweDsgfQouY2FyZCAudmFsIHsgZm9udC1zaXplOjEuMXJlbTsgZm9udC13ZWlnaHQ6NzAwOyB9Ci5jYXJkLmV4cCAudmFsIHsgY29sb3I6dmFyKC0tZGFuZ2VyKTsgfQouY2FyZC5yZXQgLnZhbCB7IGNvbG9yOnZhcigtLXN1Y2Nlc3MpOyB9Ci5jYXJkLnBheSAudmFsIHsgY29sb3I6IzdjM2FlZDsgfQouY2FyZC5iYWwgLnZhbCB7IGNvbG9yOnZhcigtLXByaW1hcnkpOyB9Ci5jYXJkLnVuY2wgLnZhbCB7IGNvbG9yOiNkOTc3MDY7IH0KLmNhcmQudW5jbC1yZXQgLnZhbCB7IGNvbG9yOiMxNTgwM2Q7IH0KCi5mb3JtLWNhcmQgeyBmbGV4LXNocmluazowOyBiYWNrZ3JvdW5kOnZhcigtLXN1cmZhY2UpOyBib3JkZXItcmFkaXVzOjhweDsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7IHBhZGRpbmc6OXB4IDE0cHg7CiAgZGlzcGxheTpmbGV4OyBmbGV4LXdyYXA6d3JhcDsgZ2FwOjdweDsgYWxpZ24taXRlbXM6ZmxleC1lbmQ7IGp1c3RpZnktY29udGVudDpjZW50ZXI7IH0KLmZvcm0tY2FyZCAuZiAgIHsgbWluLXdpZHRoOjExMHB4OyBmbGV4OjE7IG1heC13aWR0aDoxOTBweDsgfQouZm9ybS1jYXJkIC5mdCAgeyBtaW4td2lkdGg6MTgwcHg7IGZsZXg6MS41OyBtYXgtd2lkdGg6MjUwcHg7IH0KLmZvcm0tY2FyZCAuZmQgIHsgbWluLXdpZHRoOjE1MHB4OyBmbGV4OjI7IG1heC13aWR0aDoyNzBweDsgfQouZm9ybS1hY3Rpb25zIHsgZGlzcGxheTpmbGV4OyBnYXA6NnB4OyBhbGlnbi1pdGVtczpmbGV4LWVuZDsgZmxleC1zaHJpbms6MDsgfQoKLmZsIGxhYmVsIHsgZGlzcGxheTpibG9jazsgZm9udC1zaXplOi42NnJlbTsgZm9udC13ZWlnaHQ6NjAwOyBjb2xvcjp2YXIoLS1tdXRlZCk7CiAgbWFyZ2luLWJvdHRvbTozcHg7IHRleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTsgbGV0dGVyLXNwYWNpbmc6LjA0ZW07IH0KLmZsIGlucHV0LC5mbCBzZWxlY3QgeyB3aWR0aDoxMDAlOyBwYWRkaW5nOjZweCA5cHg7IGJvcmRlcjoxcHggc29saWQgdmFyKC0tYm9yZGVyKTsKICBib3JkZXItcmFkaXVzOjZweDsgZm9udC1zaXplOi44M3JlbTsgY29sb3I6dmFyKC0tdGV4dCk7IGJhY2tncm91bmQ6I2ZhZmJmYzsKICB0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMTVzLGJveC1zaGFkb3cgLjE1czsgb3V0bGluZTpub25lOyB9Ci5mbCBpbnB1dDpmb2N1cywuZmwgc2VsZWN0OmZvY3VzIHsgYm9yZGVyLWNvbG9yOnZhcigtLXByaW1hcnkpOwogIGJveC1zaGFkb3c6MCAwIDAgM3B4IHJnYmEoMzcsOTksMjM1LC4xKTsgYmFja2dyb3VuZDojZmZmOyB9CgoudHlwZS10b2dnbGUgeyBkaXNwbGF5OmZsZXg7IGdhcDo0cHg7IH0KLnR5cGUtdG9nZ2xlIGlucHV0W3R5cGU9cmFkaW9dIHsgZGlzcGxheTpub25lOyB9Ci50eXBlLXRvZ2dsZSBsYWJlbCB7IGZsZXg6MTsgdGV4dC1hbGlnbjpjZW50ZXI7IHBhZGRpbmc6NnB4IDRweDsKICBib3JkZXItcmFkaXVzOjZweDsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOyBmb250LXNpemU6Ljc4cmVtOwogIGZvbnQtd2VpZ2h0OjYwMDsgY3Vyc29yOnBvaW50ZXI7IGJhY2tncm91bmQ6I2ZhZmJmYzsgY29sb3I6dmFyKC0tbXV0ZWQpOwogIHRyYW5zaXRpb246YWxsIC4xNXM7IH0KLnR5cGUtdG9nZ2xlIGlucHV0OmNoZWNrZWQrbGFiZWwuZWwgeyBiYWNrZ3JvdW5kOiNmZWUyZTI7IGNvbG9yOnZhcigtLWRhbmdlcik7IGJvcmRlci1jb2xvcjojZmNhNWE1OyB9Ci50eXBlLXRvZ2dsZSBpbnB1dDpjaGVja2VkK2xhYmVsLnJsIHsgYmFja2dyb3VuZDojZGNmY2U3OyBjb2xvcjp2YXIoLS1zdWNjZXNzKTsgYm9yZGVyLWNvbG9yOiM4NmVmYWM7IH0KLnR5cGUtdG9nZ2xlIGlucHV0OmNoZWNrZWQrbGFiZWwucGwgeyBiYWNrZ3JvdW5kOiNlZGU5ZmU7IGNvbG9yOiM3YzNhZWQ7IGJvcmRlci1jb2xvcjojYzRiNWZkOyB9Cgoud2hvLXRvZ2dsZSB7IGRpc3BsYXk6ZmxleDsgZ2FwOjRweDsgfQoud2hvLXRvZ2dsZSBpbnB1dFt0eXBlPXJhZGlvXSB7IGRpc3BsYXk6bm9uZTsgfQoud2hvLXRvZ2dsZSBsYWJlbCB7IGZsZXg6MTsgdGV4dC1hbGlnbjpjZW50ZXI7IHBhZGRpbmc6NnB4IDRweDsKICBib3JkZXItcmFkaXVzOjZweDsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOyBmb250LXNpemU6Ljc4cmVtOwogIGZvbnQtd2VpZ2h0OjYwMDsgY3Vyc29yOnBvaW50ZXI7IGJhY2tncm91bmQ6I2ZhZmJmYzsgY29sb3I6dmFyKC0tbXV0ZWQpOwogIHRyYW5zaXRpb246YWxsIC4xNXM7IH0KLndoby10b2dnbGUgaW5wdXQ6Y2hlY2tlZCtsYWJlbC5tbCB7IGJhY2tncm91bmQ6I2RiZWFmZTsgY29sb3I6IzFkNGVkODsgYm9yZGVyLWNvbG9yOiM5M2M1ZmQ7IH0KLndoby10b2dnbGUgaW5wdXQ6Y2hlY2tlZCtsYWJlbC53bCB7IGJhY2tncm91bmQ6I2ZjZTdmMzsgY29sb3I6I2JlMTg1ZDsgYm9yZGVyLWNvbG9yOiNmOWE4ZDQ7IH0KCi5idG4geyBwYWRkaW5nOjZweCAxM3B4OyBib3JkZXItcmFkaXVzOjZweDsgZm9udC1zaXplOi44M3JlbTsgZm9udC13ZWlnaHQ6NjAwOwogIGN1cnNvcjpwb2ludGVyOyBib3JkZXI6bm9uZTsgdHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4xNXMsdHJhbnNmb3JtIC4wNXM7IHdoaXRlLXNwYWNlOm5vd3JhcDsgfQouYnRuOmFjdGl2ZSB7IHRyYW5zZm9ybTpzY2FsZSguOTcpOyB9Ci5idG4tcHJpbWFyeSB7IGJhY2tncm91bmQ6dmFyKC0tcHJpbWFyeSk7IGNvbG9yOiNmZmY7IH0KLmJ0bi1wcmltYXJ5OmhvdmVyIHsgYmFja2dyb3VuZDp2YXIoLS1wcmltYXJ5LWhvdmVyKTsgfQouYnRuLXNtIHsgcGFkZGluZzozcHggOHB4OyBmb250LXNpemU6Ljc1cmVtOyB9Ci5idG4tZ2hvc3QgIHsgYmFja2dyb3VuZDp0cmFuc3BhcmVudDsgY29sb3I6dmFyKC0tbXV0ZWQpOyBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7IH0KLmJ0bi1naG9zdDpob3ZlciB7IGJhY2tncm91bmQ6dmFyKC0tYmcpOyB9Ci5idG4tZGFuZ2VyIHsgYmFja2dyb3VuZDojZmVlMmUyOyBjb2xvcjp2YXIoLS1kYW5nZXIpOyBib3JkZXI6MXB4IHNvbGlkICNmZWNhY2E7IH0KLmJ0bi1kYW5nZXI6aG92ZXIgeyBiYWNrZ3JvdW5kOiNmZWNhY2E7IH0KLmJ0bi1lZGl0ICAgeyBiYWNrZ3JvdW5kOiNlZmY2ZmY7IGNvbG9yOnZhcigtLXByaW1hcnkpOyBib3JkZXI6MXB4IHNvbGlkICNiZmRiZmU7IH0KLmJ0bi1lZGl0OmhvdmVyIHsgYmFja2dyb3VuZDojZGJlYWZlOyB9Ci5idG4tZXhwb3J0IHsgYmFja2dyb3VuZDojZjBmZGY0OyBjb2xvcjp2YXIoLS1zdWNjZXNzKTsgYm9yZGVyOjFweCBzb2xpZCAjYmJmN2QwOyB9Ci5idG4tdW5jbCAgIHsgYmFja2dyb3VuZDojZmVmY2U4OyBjb2xvcjojOTI0MDBlOyBib3JkZXI6MXB4IHNvbGlkICNmZGU2OGE7IH0KLmNhdC1jaGlwc3tkaXNwbGF5OmZsZXg7ZmxleC13cmFwOndyYXA7Z2FwOjRweDttYXJnaW4tdG9wOjRweDt9Ci5jYXQtY2hpcHtkaXNwbGF5OmlubGluZS1mbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MnB4O2JhY2tncm91bmQ6I2VmZjZmZjtjb2xvcjojMWU0MGFmO2JvcmRlcjoxcHggc29saWQgI2JmZGJmZTtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzoycHggOHB4O2ZvbnQtc2l6ZTouNzVyZW07Zm9udC13ZWlnaHQ6NTAwO30KLmNhdC1jaGlwLmRlbC1jaGlwe2JhY2tncm91bmQ6I2ZlZjJmMjtjb2xvcjojOTkxYjFiO2JvcmRlci1jb2xvcjojZmVjYWNhO30KLmNhdC1ybXtjdXJzb3I6cG9pbnRlcjtjb2xvcjojOTNjNWZkO2ZvbnQtd2VpZ2h0OjgwMDtwYWRkaW5nOjAgMnB4O2xpbmUtaGVpZ2h0OjE7fQouY2F0LXJtOmhvdmVye2NvbG9yOiNkYzI2MjY7fQouZGVsLWNoaXAgLmNhdC1ybXtjb2xvcjojZmNhNWE1O30KLmRlbC1jaGlwIC5jYXQtcm06aG92ZXJ7Y29sb3I6I2RjMjYyNjt9Ci5idG4tdW5jbC5hY3RpdmUgeyBiYWNrZ3JvdW5kOiNmZGU2OGE7IH0KCi5maWx0ZXJzLWNhcmQgeyBmbGV4LXNocmluazowOyBiYWNrZ3JvdW5kOnZhcigtLXN1cmZhY2UpOyBib3JkZXItcmFkaXVzOjhweDsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7IHBhZGRpbmc6OXB4IDE0cHg7CiAgZGlzcGxheTpmbGV4OyBnYXA6N3B4OyBhbGlnbi1pdGVtczpmbGV4LWVuZDsganVzdGlmeS1jb250ZW50OmNlbnRlcjsgZmxleC13cmFwOndyYXA7IH0KLmZpbHRlcnMtY2FyZCAuZiB7IG1pbi13aWR0aDoxMTBweDsgZmxleDoxOyBtYXgtd2lkdGg6MTgwcHg7IH0KLmZpbHRlci1hY3Rpb25zIHsgZGlzcGxheTpmbGV4OyBnYXA6NnB4OyBhbGlnbi1pdGVtczpmbGV4LWVuZDsgfQoKLmZpbHRlci10b3RhbCB7IGZsZXgtc2hyaW5rOjA7IGRpc3BsYXk6bm9uZTsgYmFja2dyb3VuZDojZWZmNmZmOwogIGJvcmRlcjoxcHggc29saWQgI2JmZGJmZTsgYm9yZGVyLXJhZGl1czo3cHg7IHBhZGRpbmc6NnB4IDEycHg7CiAgZm9udC1zaXplOi44cmVtOyBjb2xvcjojMWQ0ZWQ4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGdhcDoxMHB4OyBmbGV4LXdyYXA6d3JhcDsgfQouZmlsdGVyLXRvdGFsLm9uIHsgZGlzcGxheTpmbGV4OyB9Ci5maWx0ZXItdG90YWwgc3Ryb25nIHsgZm9udC13ZWlnaHQ6NzAwOyB9CgoudGFibGUtY2FyZCB7IGZsZXg6MTsgbWluLWhlaWdodDowOyBiYWNrZ3JvdW5kOnZhcigtLXN1cmZhY2UpOwogIGJvcmRlci1yYWRpdXM6OHB4OyBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7CiAgYm94LXNoYWRvdzowIDFweCAzcHggcmdiYSgwLDAsMCwuMDUpOwogIGRpc3BsYXk6ZmxleDsgZmxleC1kaXJlY3Rpb246Y29sdW1uOyBvdmVyZmxvdzpoaWRkZW47IH0KLnRhYmxlLWhkciB7IGZsZXgtc2hyaW5rOjA7IGRpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOwogIGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOyBwYWRkaW5nOjhweCAxNHB4OwogIGJvcmRlci1ib3R0b206MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7IGdhcDo4cHg7IGZsZXgtd3JhcDp3cmFwOyB9Ci50YWJsZS1oZHIgaDIgeyBmb250LXNpemU6Ljg3cmVtOyBmb250LXdlaWdodDo2MDA7IH0KLnRhYmxlLWhkciAudGhyIHsgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGdhcDo3cHg7IGZsZXgtd3JhcDp3cmFwOyB9Ci50YWJsZS1oZHIgc3BhbiB7IGZvbnQtc2l6ZTouNzVyZW07IGNvbG9yOnZhcigtLW11dGVkKTsgfQoudHNjcm9sbCB7IGZsZXg6MTsgb3ZlcmZsb3cteTphdXRvOyBvdmVyZmxvdy14OmhpZGRlbjsgfQoKLyogU2luZ2xlIHRhYmxlIOKAlCBhdXRvIGxheW91dCBhZGFwdHMgdG8gY29udGVudCAqLwp0YWJsZSB7IHdpZHRoOjEwMCU7IGJvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTsgdGFibGUtbGF5b3V0OmF1dG87IH0KdGhlYWQgdGggeyBwb3NpdGlvbjpzdGlja3k7IHRvcDowOyB6LWluZGV4OjE7IHRleHQtYWxpZ246bGVmdDsgcGFkZGluZzo3cHggOHB4OwogIGZvbnQtc2l6ZTouNjRyZW07IHRleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTsgbGV0dGVyLXNwYWNpbmc6LjA2ZW07CiAgY29sb3I6dmFyKC0tbXV0ZWQpOyBmb250LXdlaWdodDo2MDA7IGJhY2tncm91bmQ6I2Y4ZmFmYzsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOyB3aGl0ZS1zcGFjZTpub3dyYXA7IH0KdGhlYWQgdGguc29ydGFibGUgeyBjdXJzb3I6cG9pbnRlcjsgdXNlci1zZWxlY3Q6bm9uZTsgfQp0aGVhZCB0aC5zb3J0YWJsZTpob3ZlciB7IGJhY2tncm91bmQ6I2YwZjJmNTsgfQouc2FyciB7IG1hcmdpbi1sZWZ0OjJweDsgb3BhY2l0eTouNDsgfQouc2Fyci5vbiB7IG9wYWNpdHk6MTsgfQoKdGJvZHkgdHIgeyBib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOyB9CnRib2R5IHRyOmxhc3QtY2hpbGQgeyBib3JkZXItYm90dG9tOm5vbmU7IH0KdGJvZHkgdHIuZXhwLXJvdyB7IGJhY2tncm91bmQ6I2ZmZmFmYTsgfQp0Ym9keSB0ci5yZXQtcm93IHsgYmFja2dyb3VuZDojZmFmZmZhOyB9CnRib2R5IHRyLnBheS1yb3cgeyBiYWNrZ3JvdW5kOiNmYWY4ZmY7IH0KdGJvZHkgdHIuZXhwLXJvdzpob3ZlciB7IGJhY2tncm91bmQ6I2ZlZjJmMjsgfQp0Ym9keSB0ci5yZXQtcm93OmhvdmVyIHsgYmFja2dyb3VuZDojZjBmZGY0OyB9CnRib2R5IHRyLnBheS1yb3c6aG92ZXIgeyBiYWNrZ3JvdW5kOiNmNWYzZmY7IH0KdGJvZHkgdHIudW5jbHJkICB7IG9wYWNpdHk6LjcyOyB9Cgp0ZCB7IHBhZGRpbmc6N3B4IDhweDsgZm9udC1zaXplOi44MnJlbTsgdmVydGljYWwtYWxpZ246bWlkZGxlOyB9CnRkLmNsci1jZWxsIHsgd2lkdGg6MzJweDsgdGV4dC1hbGlnbjpjZW50ZXI7IH0KLmNsci1jYiB7IHdpZHRoOjE1cHg7IGhlaWdodDoxNXB4OyBjdXJzb3I6cG9pbnRlcjsgYWNjZW50LWNvbG9yOnZhcigtLXN1Y2Nlc3MpOyB9CnRkLmRhdGUtY2VsbCB7IHdoaXRlLXNwYWNlOm5vd3JhcDsgY29sb3I6dmFyKC0tbXV0ZWQpOyBmb250LXNpemU6Ljc4cmVtOyB3aWR0aDo4MnB4OyB9CnRkLmRlc2MtY2VsbCB7IG1pbi13aWR0aDo4MHB4OyBtYXgtd2lkdGg6MXB4OyB3aWR0aDoxMDAlOyB9IC8qIHN0cmV0Y2hlcyAqLwp0ZC5hbXQtY2VsbCAgeyB3aGl0ZS1zcGFjZTpub3dyYXA7IHRleHQtYWxpZ246cmlnaHQ7IHdpZHRoOjgwcHg7IH0KdGQuYWN0LWNlbGwgIHsgd2hpdGUtc3BhY2U6bm93cmFwOyB0ZXh0LWFsaWduOmNlbnRlcjsgd2lkdGg6NThweDsgb3ZlcmZsb3c6dmlzaWJsZTsgfQp0ZC5jYXQtY2VsbCAgeyB3aGl0ZS1zcGFjZTpub3dyYXA7IHdpZHRoOjkycHg7IH0KdGQudHlwZS1jZWxsIHsgd2hpdGUtc3BhY2U6bm93cmFwOyB3aWR0aDo2OHB4OyB9CnRkLmJhbC1jZWxsICB7IHdoaXRlLXNwYWNlOm5vd3JhcDsgdGV4dC1hbGlnbjpyaWdodDsgd2lkdGg6OTBweDsgfQoKLmRlc2MtbWFpbiB7IGZvbnQtd2VpZ2h0OjUwMDsgb3ZlcmZsb3c6aGlkZGVuOyB3aGl0ZS1zcGFjZTpub3dyYXA7IHRleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7IG1heC13aWR0aDoxMDAlOyBkaXNwbGF5OmJsb2NrOyB9Ci5kZXNjLXN1YiAgeyBmb250LXNpemU6LjdyZW07IGNvbG9yOnZhcigtLW11dGVkKTsgd2hpdGUtc3BhY2U6bm93cmFwOyBvdmVyZmxvdzpoaWRkZW47IHRleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7IG1heC13aWR0aDoxMDAlOyBkaXNwbGF5OmJsb2NrOyB9CgouYmFkZ2UgeyBkaXNwbGF5OmlubGluZS1ibG9jazsgcGFkZGluZzoycHggNnB4OyBib3JkZXItcmFkaXVzOjIwcHg7IGZvbnQtc2l6ZTouNjRyZW07IGZvbnQtd2VpZ2h0OjYwMDsgfQouYi1leHAgeyBiYWNrZ3JvdW5kOiNmZWUyZTI7IGNvbG9yOnZhcigtLWRhbmdlcik7IH0KLmItcmV0IHsgYmFja2dyb3VuZDojZGNmY2U3OyBjb2xvcjp2YXIoLS1zdWNjZXNzKTsgfQouYi1wYXkgeyBiYWNrZ3JvdW5kOiNlZGU5ZmU7IGNvbG9yOiM3YzNhZWQ7IH0KLmNhdGJkZyB7IGRpc3BsYXk6aW5saW5lLWJsb2NrOyBwYWRkaW5nOjJweCA2cHg7IGJvcmRlci1yYWRpdXM6MjBweDsKICBmb250LXNpemU6LjY0cmVtOyBmb250LXdlaWdodDo1MDA7IGJhY2tncm91bmQ6I2VmZjZmZjsgY29sb3I6IzFkNGVkODsgYm9yZGVyOjFweCBzb2xpZCAjYmZkYmZlOyB9CgouYW10LWV4cCwuYW10LWV4cGVuc2UgeyBjb2xvcjojZGMyNjI2ICFpbXBvcnRhbnQ7IGZvbnQtd2VpZ2h0OjcwMDsgZm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zOyB9Ci5hbXQtcmV0LC5hbXQtcmV0dXJuICB7IGNvbG9yOiMxNmEzNGEgIWltcG9ydGFudDsgZm9udC13ZWlnaHQ6NzAwOyBmb250LXZhcmlhbnQtbnVtZXJpYzp0YWJ1bGFyLW51bXM7IH0KLmFtdC1wYXksLmFtdC1wYXltZW50IHsgY29sb3I6IzdjM2FlZCAhaW1wb3J0YW50OyBmb250LXdlaWdodDo3MDA7IGZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtczsgfQouYW10LWJhbCB7IGZvbnQtd2VpZ2h0OjYwMDsgZm9udC12YXJpYW50LW51bWVyaWM6dGFidWxhci1udW1zOyBjb2xvcjp2YXIoLS1wcmltYXJ5KTsgfQouYW10LWJhbC5uZWcgeyBjb2xvcjp2YXIoLS1kYW5nZXIpOyB9CgouZW1wdHktc3RhdGUgeyB0ZXh0LWFsaWduOmNlbnRlcjsgcGFkZGluZzozNnB4IDIwcHg7IGNvbG9yOnZhcigtLW11dGVkKTsgfQouZW1wdHktc3RhdGUgLmljb24geyBmb250LXNpemU6MnJlbTsgbWFyZ2luLWJvdHRvbTo4cHg7IH0KCgouYWktbW9kYWwtd3JhcCB7IGJhY2tncm91bmQ6dmFyKC0tc3VyZmFjZSk7IGJvcmRlci1yYWRpdXM6MTRweDsKICB3aWR0aDo0NDBweDsgbWF4LXdpZHRoOjk1dnc7IG1heC1oZWlnaHQ6ODJ2aDsKICBib3gtc2hhZG93OjAgMjBweCA2MHB4IHJnYmEoMCwwLDAsLjI1KTsKICBkaXNwbGF5OmZsZXg7IGZsZXgtZGlyZWN0aW9uOmNvbHVtbjsgb3ZlcmZsb3c6aGlkZGVuOyB9Ci5haS1taGRyIHsgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCM2MzY2ZjEsIzhiNWNmNik7IGNvbG9yOiNmZmY7CiAgcGFkZGluZzoxMnB4IDE2cHg7IGRpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOwogIGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOyBmbGV4LXNocmluazowOyB9Ci5haS1taGRyIGgzIHsgZm9udC1zaXplOi45cmVtOyBmb250LXdlaWdodDo3MDA7IH0KLmFpLW1oZHIgcCAgeyBmb250LXNpemU6LjdyZW07IG9wYWNpdHk6Ljg1OyBtYXJnaW4tdG9wOjFweDsgfQouYWktbWhkciBidXR0b24geyBiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjIpOyBib3JkZXI6bm9uZTsgY29sb3I6I2ZmZjsKICB3aWR0aDoyNnB4OyBoZWlnaHQ6MjZweDsgYm9yZGVyLXJhZGl1czo1MCU7IGN1cnNvcjpwb2ludGVyOyBmb250LXNpemU6LjlyZW07CiAgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGp1c3RpZnktY29udGVudDpjZW50ZXI7IH0KLmFpLW1zZ3MgeyBmbGV4OjE7IG92ZXJmbG93LXk6YXV0bzsgcGFkZGluZzoxMnB4OwogIGRpc3BsYXk6ZmxleDsgZmxleC1kaXJlY3Rpb246Y29sdW1uOyBnYXA6OXB4OyBtaW4taGVpZ2h0OjE4MHB4OyB9Ci5haS1tc2cgeyBtYXgtd2lkdGg6OTAlOyBwYWRkaW5nOjhweCAxMnB4OyBib3JkZXItcmFkaXVzOjEycHg7CiAgZm9udC1zaXplOi44MnJlbTsgbGluZS1oZWlnaHQ6MS41NTsgd2hpdGUtc3BhY2U6cHJlLXdyYXA7IH0KLmFpLW1zZy5ib3QgIHsgYmFja2dyb3VuZDojZjFmNWY5OyBjb2xvcjp2YXIoLS10ZXh0KTsgYWxpZ24tc2VsZjpmbGV4LXN0YXJ0OyBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOjNweDsgfQouYWktbXNnLnVzZXIgeyBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzYzNjZmMSwjOGI1Y2Y2KTsgY29sb3I6I2ZmZjsgYWxpZ24tc2VsZjpmbGV4LWVuZDsgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6M3B4OyB9Ci5haS1jaGlwcyB7IGRpc3BsYXk6ZmxleDsgZmxleC13cmFwOndyYXA7IGdhcDo1cHg7IHBhZGRpbmc6MCAxMnB4IDhweDsgZmxleC1zaHJpbms6MDsgfQouYWktY2hpcCB7IHBhZGRpbmc6M3B4IDlweDsgYm9yZGVyLXJhZGl1czoyMHB4OyBmb250LXNpemU6LjcycmVtOyBmb250LXdlaWdodDo1MDA7CiAgYmFja2dyb3VuZDojZWRlOWZlOyBjb2xvcjojNmQyOGQ5OyBib3JkZXI6MXB4IHNvbGlkICNkZGQ2ZmU7IGN1cnNvcjpwb2ludGVyOyB9Ci5haS1jaGlwOmhvdmVyIHsgYmFja2dyb3VuZDojZGRkNmZlOyB9Ci5haS1pcm93IHsgZGlzcGxheTpmbGV4OyBnYXA6N3B4OyBwYWRkaW5nOjlweCAxMnB4IDEycHg7CiAgYm9yZGVyLXRvcDoxcHggc29saWQgdmFyKC0tYm9yZGVyKTsgZmxleC1zaHJpbms6MDsgfQouYWktaXJvdyBpbnB1dCB7IGZsZXg6MTsgcGFkZGluZzo3cHggMTFweDsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOwogIGJvcmRlci1yYWRpdXM6MjBweDsgZm9udC1zaXplOi44NHJlbTsgb3V0bGluZTpub25lOyBjb2xvcjp2YXIoLS10ZXh0KTsgfQouYWktaXJvdyBpbnB1dDpmb2N1cyB7IGJvcmRlci1jb2xvcjojNjM2NmYxOyBib3gtc2hhZG93OjAgMCAwIDNweCByZ2JhKDk5LDEwMiwyNDEsLjEyKTsgfQouYWktaXJvdyBidXR0b24geyBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzYzNjZmMSwjOGI1Y2Y2KTsgY29sb3I6I2ZmZjsKICBib3JkZXI6bm9uZTsgYm9yZGVyLXJhZGl1czoyMHB4OyBwYWRkaW5nOjdweCAxNHB4OyBmb250LXNpemU6Ljg0cmVtOyBmb250LXdlaWdodDo2MDA7IGN1cnNvcjpwb2ludGVyOyB9CgoubW9kYWwtb3YgeyBkaXNwbGF5Om5vbmU7IHBvc2l0aW9uOmZpeGVkOyBpbnNldDowOyBiYWNrZ3JvdW5kOnJnYmEoMCwwLDAsLjQ1KTsKICB6LWluZGV4OjEwMDsgYWxpZ24taXRlbXM6Y2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyB9Ci5tb2RhbC1vdi5vcGVuIHsgZGlzcGxheTpmbGV4OyB9Ci5tb2RhbCB7IGJhY2tncm91bmQ6dmFyKC0tc3VyZmFjZSk7IGJvcmRlci1yYWRpdXM6MTJweDsgcGFkZGluZzoyMnB4OwogIHdpZHRoOjUyMHB4OyBtYXgtd2lkdGg6OTV2dzsgYm94LXNoYWRvdzowIDIwcHggNjBweCByZ2JhKDAsMCwwLC4yNSk7IH0KLm1vZGFsIGgyIHsgZm9udC1zaXplOjFyZW07IGZvbnQtd2VpZ2h0OjcwMDsgbWFyZ2luLWJvdHRvbToxNnB4OyB9Ci5tZ3JpZCB7IGRpc3BsYXk6Z3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7IGdhcDoxMXB4OyB9Ci5tZ3JpZCAuZi5mdWxsIHsgZ3JpZC1jb2x1bW46MS8tMTsgfQoubWZvb3RlciB7IGRpc3BsYXk6ZmxleDsgZ2FwOjhweDsganVzdGlmeS1jb250ZW50OmZsZXgtZW5kOyBtYXJnaW4tdG9wOjE2cHg7IH0KCi8qIE5vdGVzIGNhcmQgKi8KLm5vdGVzLWNhcmQgeyBmbGV4LXNocmluazowOyBiYWNrZ3JvdW5kOiNmZWZjZTg7IGJvcmRlcjoxcHggc29saWQgI2ZkZTY4YTsKICBib3JkZXItcmFkaXVzOjhweDsgcGFkZGluZzo4cHggMTJweDsgfQoubm90ZXMtY2FyZCAubm90ZXMtaGRyIHsgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7CiAganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47IG1hcmdpbi1ib3R0b206NXB4OyB9Ci5ub3Rlcy1jYXJkIC5ub3Rlcy1oZHIgc3BhbiB7IGZvbnQtc2l6ZTouN3JlbTsgZm9udC13ZWlnaHQ6NzAwOwogIGNvbG9yOiM5MjQwMGU7IHRleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTsgbGV0dGVyLXNwYWNpbmc6LjA1ZW07IH0KLm5vdGVzLWNhcmQgLm5vdGVzLWhkciBzbWFsbCB7IGZvbnQtc2l6ZTouNjVyZW07IGNvbG9yOiNiNDUzMDk7IH0KLm5vdGVzLWNhcmQgdGV4dGFyZWEgeyB3aWR0aDoxMDAlOyBib3JkZXI6bm9uZTsgYmFja2dyb3VuZDp0cmFuc3BhcmVudDsKICByZXNpemU6bm9uZTsgZm9udC1zaXplOi44MnJlbTsgY29sb3I6IzFlMjkzYjsgb3V0bGluZTpub25lOwogIGZvbnQtZmFtaWx5OmluaGVyaXQ7IGxpbmUtaGVpZ2h0OjEuNTsgbWluLWhlaWdodDo1MnB4OyB9CgovKiBUYWJzICovCi50YWJzIHsgZmxleC1zaHJpbms6MDsgZGlzcGxheTpmbGV4OyBiYWNrZ3JvdW5kOiMxZTQwYWY7IHBhZGRpbmc6MCAxNnB4OyBnYXA6MnB4OyBvdmVyZmxvdy14OmF1dG87IC13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNoOyBzY3JvbGxiYXItd2lkdGg6bm9uZTsgfQoudGFiczo6LXdlYmtpdC1zY3JvbGxiYXIgeyBkaXNwbGF5Om5vbmU7IH0KLnRhYi1idG4geyBmbGV4LXNocmluazowOyBwYWRkaW5nOjlweCAxNHB4OyBmb250LXNpemU6LjgycmVtOyBmb250LXdlaWdodDo2MDA7CiAgY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwuNik7IGJhY2tncm91bmQ6dHJhbnNwYXJlbnQ7IGJvcmRlcjpub25lOwogIGN1cnNvcjpwb2ludGVyOyBib3JkZXItYm90dG9tOjNweCBzb2xpZCB0cmFuc3BhcmVudDsgdHJhbnNpdGlvbjphbGwgLjE1czsgfQoudGFiLWJ0bjpob3ZlciB7IGNvbG9yOiNmZmY7IH0KLnRhYi1idG4uYWN0aXZlIHsgY29sb3I6I2ZmZjsgYm9yZGVyLWJvdHRvbS1jb2xvcjojZmZmOyB9CgovKiA0LWNvbHVtbiBzdW1tYXJ5IChjaGVja2luZykgKi8KLnN1bW1hcnktNCB7IGZsZXgtc2hyaW5rOjA7IGRpc3BsYXk6Z3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg0LDFmcik7IGdhcDo4cHg7IH0KQG1lZGlhIChtYXgtd2lkdGg6NzAwcHgpIHsgLnN1bW1hcnktNCB7IGdyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyOyB9IH0KCi8qIENoZWNraW5nLXNwZWNpZmljIHJvdyBjb2xvdXJzICovCnRib2R5IHRyLmRlcC1yb3cgeyBiYWNrZ3JvdW5kOiNmYWZmZmE7IH0KdGJvZHkgdHIud3RoLXJvdyB7IGJhY2tncm91bmQ6I2ZmZmFmYTsgfQp0Ym9keSB0ci5kZXAtcm93OmhvdmVyIHsgYmFja2dyb3VuZDojZjBmZGY0OyB9CnRib2R5IHRyLnd0aC1yb3c6aG92ZXIgeyBiYWNrZ3JvdW5kOiNmZWYyZjI7IH0KCi8qIFJlY2VpcHQgU2Nhbm5lciAqLwouc2Nhbi1tb2RhbC1ib2R5IHsgZGlzcGxheTpmbGV4OyBmbGV4LWRpcmVjdGlvbjpjb2x1bW47IGdhcDoxNHB4OyB9Ci5zY2FuLWRyb3Atem9uZSB7IGJvcmRlcjoycHggZGFzaGVkICNjYmQ1ZTE7IGJvcmRlci1yYWRpdXM6MTJweDsgcGFkZGluZzoyOHB4IDE2cHg7IHRleHQtYWxpZ246Y2VudGVyOyBiYWNrZ3JvdW5kOiNmOGZhZmM7IHRyYW5zaXRpb246Ym9yZGVyLWNvbG9yIC4xNXM7IH0KLnNjYW4tZHJvcC16b25lLmRyYWctb3ZlciB7IGJvcmRlci1jb2xvcjojMjU2M2ViOyBiYWNrZ3JvdW5kOiNlZmY2ZmY7IH0KLnNjYW4tZHJvcC1pY29uIHsgZm9udC1zaXplOjIuMnJlbTsgbWFyZ2luLWJvdHRvbTo4cHg7IH0KLnNjYW4tZHJvcC16b25lIHAgeyBjb2xvcjojNjQ3NDhiOyBmb250LXNpemU6Ljg0cmVtOyBtYXJnaW46NnB4IDAgMTJweDsgfQouc2Nhbi1oaW50IHsgZm9udC1zaXplOi43M3JlbSAhaW1wb3J0YW50OyBjb2xvcjojOTRhM2I4ICFpbXBvcnRhbnQ7IG1hcmdpbi10b3A6NHB4ICFpbXBvcnRhbnQ7IH0KLnNjYW4tcHJldmlldy1pbWcgeyBtYXgtd2lkdGg6MTAwJTsgbWF4LWhlaWdodDoxODBweDsgb2JqZWN0LWZpdDpjb250YWluOyBib3JkZXItcmFkaXVzOjhweDsgZGlzcGxheTpibG9jazsgbWFyZ2luOjAgYXV0bzsgfQouc2Nhbi1wcm9nLXdyYXAgeyB0ZXh0LWFsaWduOmNlbnRlcjsgfQouc2Nhbi1zdGF0dXMtdHh0IHsgZm9udC1zaXplOi44MnJlbTsgY29sb3I6IzQ3NTU2OTsgbWFyZ2luLWJvdHRvbTo4cHg7IH0KLnNjYW4tYmFyIHsgaGVpZ2h0OjdweDsgYmFja2dyb3VuZDojZTJlOGYwOyBib3JkZXItcmFkaXVzOjRweDsgb3ZlcmZsb3c6aGlkZGVuOyB9Ci5zY2FuLWZpbGwgeyBoZWlnaHQ6MTAwJTsgYmFja2dyb3VuZDojMjU2M2ViOyBib3JkZXItcmFkaXVzOjRweDsgdHJhbnNpdGlvbjp3aWR0aCAuMjVzOyB9Ci5zY2FuLXJlc3VsdC1maWVsZHMgeyBkaXNwbGF5OmZsZXg7IGZsZXgtd3JhcDp3cmFwOyBnYXA6MTBweDsgfQouc2Nhbi1yZXN1bHQtZmllbGRzIC5mLC5zY2FuLXJlc3VsdC1maWVsZHMgLmZkIHsgZmxleDoxIDEgMTQwcHg7IGRpc3BsYXk6ZmxleDsgZmxleC1kaXJlY3Rpb246Y29sdW1uOyBnYXA6NHB4OyB9Ci5zY2FuLXJlc3VsdC1maWVsZHMgLmZkIHsgZmxleDoxIDEgMTAwJTsgfQouc2Nhbi1yZXN1bHQtZmllbGRzIGxhYmVsIHsgZm9udC1zaXplOi43MnJlbTsgZm9udC13ZWlnaHQ6NzAwOyB0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOi4wNGVtOyBjb2xvcjojNjQ3NDhiOyB9Ci5zY2FuLXJlc3VsdC1maWVsZHMgaW5wdXQsLnNjYW4tcmVzdWx0LWZpZWxkcyBzZWxlY3QgeyBwYWRkaW5nOjdweCAxMHB4OyBib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7IGJvcmRlci1yYWRpdXM6NnB4OyBmb250LXNpemU6Ljg0cmVtOyBjb2xvcjojMWUyOTNiOyBvdXRsaW5lOm5vbmU7IHdpZHRoOjEwMCU7IH0KLnNjYW4tcmF3LXByZSB7IGZvbnQtc2l6ZTouNzFyZW07IGJhY2tncm91bmQ6I2YxZjVmOTsgcGFkZGluZzo4cHggMTBweDsgYm9yZGVyLXJhZGl1czo2cHg7IG1heC1oZWlnaHQ6MTEwcHg7IG92ZXJmbG93OmF1dG87IHdoaXRlLXNwYWNlOnByZS13cmFwOyBtYXJnaW4tdG9wOjZweDsgY29sb3I6IzQ3NTU2OTsgfQouYnRuLXNjYW4geyBiYWNrZ3JvdW5kOiMwZjE3MmE7IGNvbG9yOiNmZmY7IGJvcmRlcjpub25lOyB9Ci5idG4tc2Nhbjpob3ZlciB7IGJhY2tncm91bmQ6IzFlMjkzYjsgfQoKLyogTW9iaWxlIG92ZXJyaWRlcyDigJQgb25seSBzdHJ1Y3R1cmFsLCBubyBjb2x1bW4gdHJpY2tzICovCkBtZWRpYSAobWF4LXdpZHRoOjExMDBweCkgewogIC5zdW1tYXJ5IHsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCgzLDFmcik7IH0KfQpAbWVkaWEgKG1heC13aWR0aDo3MDBweCkgewogIGh0bWwsYm9keSB7IGhlaWdodDphdXRvICFpbXBvcnRhbnQ7IG92ZXJmbG93OmF1dG8gIWltcG9ydGFudDsgZGlzcGxheTpibG9jayAhaW1wb3J0YW50OyB9CiAgLnBhZ2UtYm9keSB7IGRpc3BsYXk6YmxvY2s7IG92ZXJmbG93OnZpc2libGU7IGhlaWdodDphdXRvOyBwYWRkaW5nOjhweCAxMHB4OyB9CiAgLnBhZ2UtYm9keT4qIHsgbWFyZ2luLWJvdHRvbTo4cHg7IH0KICAudGFibGUtY2FyZCB7IGRpc3BsYXk6YmxvY2s7IGZsZXg6bm9uZTsgbWluLWhlaWdodDphdXRvOyBvdmVyZmxvdzp2aXNpYmxlOyB9CiAgLnRzY3JvbGwgeyBvdmVyZmxvdy14OmhpZGRlbjsgb3ZlcmZsb3cteTp2aXNpYmxlOyBtYXgtaGVpZ2h0Om5vbmU7IH0KICAuc3VtbWFyeSB7IGdyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyOyB9CiAgLmZvcm0tY2FyZCAuZiwuZm9ybS1jYXJkIC5mZCwuZm9ybS1jYXJkIC5mdCB7IG1heC13aWR0aDoxMDAlOyBmbGV4LWJhc2lzOjEwMCU7IH0KICAuZmlsdGVycy1jYXJkIHsgZmxleC1kaXJlY3Rpb246Y29sdW1uOyBhbGlnbi1pdGVtczpzdHJldGNoOyB9CiAgLmZpbHRlcnMtY2FyZCAuZiB7IG1heC13aWR0aDoxMDAlOyB9CiAgLmZpbHRlci1hY3Rpb25zIHsganVzdGlmeS1jb250ZW50OmZsZXgtZW5kOyB9Cn0KCi8qIFBsYW5uZXIgaW50ZWdyYXRpb246IGtlZXAgdHJhbnNhY3Rpb24gYWN0aW9ucyB2aXNpYmxlIGFuZCBhbGxvdyB0YWJsZSBzY3JvbGxpbmcuICovCi50c2Nyb2xsIHsgb3ZlcmZsb3cteDphdXRvICFpbXBvcnRhbnQ7IC13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOnRvdWNoOyB9CnRkLmFjdC1jZWxsIHsKICBwb3NpdGlvbjpzdGlja3k7IHJpZ2h0OjA7IHotaW5kZXg6MzsKICBtaW4td2lkdGg6MTA0cHg7IHdpZHRoOjEwNHB4OwogIGJhY2tncm91bmQ6I2ZmZjsKICBib3gtc2hhZG93Oi01cHggMCA4cHggcmdiYSgxNSwyMyw0MiwuMDgpOwp9CnRoZWFkIHRoOmxhc3QtY2hpbGQgewogIHBvc2l0aW9uOnN0aWNreTsgcmlnaHQ6MDsgei1pbmRleDo0OwogIG1pbi13aWR0aDoxMDRweDsgd2lkdGg6MTA0cHg7CiAgYmFja2dyb3VuZDojZjhmYWZjOwogIGJveC1zaGFkb3c6LTVweCAwIDhweCByZ2JhKDE1LDIzLDQyLC4wOCk7Cn0KdGQuYWN0LWNlbGwgLmJ0biB7IGRpc3BsYXk6aW5saW5lLWZsZXg7IGFsaWduLWl0ZW1zOmNlbnRlcjsganVzdGlmeS1jb250ZW50OmNlbnRlcjsgdmlzaWJpbGl0eTp2aXNpYmxlOyB9CkBtZWRpYSAobWF4LXdpZHRoOjcwMHB4KSB7CiAgLnRzY3JvbGwgeyBvdmVyZmxvdy14OmF1dG8gIWltcG9ydGFudDsgfQogIHRkLmFjdC1jZWxsLCB0aGVhZCB0aDpsYXN0LWNoaWxkIHsgbWluLXdpZHRoOjc2cHg7IHdpZHRoOjc2cHg7IH0KfQoKPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KCjxoZWFkZXI+CiAgPGRpdj48aDEgaWQ9InBhZ2UtdGl0bGUiPiYjeDFGNEIzOyBDaW5keSdzIENyZWRpdCBDYXJkIFJlZ2lzdGVyPC9oMT48cCBpZD0icGFnZS1zdWIiPk15IENyZWRpdCBDYXJkPC9wPjwvZGl2PgogIDxzcGFuIHN0eWxlPSJmb250LXNpemU6LjY1cmVtO2JhY2tncm91bmQ6cmdiYSgyNTUsMjU1LDI1NSwuMTgpO2NvbG9yOiNmZmY7cGFkZGluZzoycHggN3B4O2JvcmRlci1yYWRpdXM6MTBweDtmb250LXdlaWdodDo3MDA7bGV0dGVyLXNwYWNpbmc6LjA0ZW07YWxpZ24tc2VsZjpjZW50ZXI7Ij52OTwvc3Bhbj4KICA8ZGl2IGNsYXNzPSJoYmFsIj4KICAgIDxkaXYgY2xhc3M9ImxibCIgaWQ9Imhkci1sYmwiPk5ldCBBdmFpbGFibGU8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImFtdCIgaWQ9Imhkci1iYWwiPiQwLjAwPC9kaXY+CiAgPC9kaXY+CjwvaGVhZGVyPgoKPGRpdiBjbGFzcz0idG9vbGJhciI+CiAgPHNwYW4gY2xhc3M9InRsYmwiPkRhdGE8L3NwYW4+CiAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi10YiBidG4tc20iIGlkPSJidG4tYmFja3VwIj4mI3gxRjRCRTsgQmFja3VwPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi10YiBidG4tc20iIGlkPSJidG4tcmVzdG9yZSI+JiN4MUY0QzI7IFJlc3RvcmU8L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXRiIGJ0bi1zbSIgaWQ9ImJ0bi1pbXBvcnQiPiYjeDFGNEU1OyBJbXBvcnQgQ1NWPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi10YiBidG4tc20iIGlkPSJidG4tdHJpcCI+JiN4MjcwODsmI3hGRTBGOyBUcmlwPC9idXR0b24+CiAgPHNwYW4gaWQ9InRyaXAtaW5kaWNhdG9yIiBzdHlsZT0iZGlzcGxheTpub25lO2JhY2tncm91bmQ6IzA2NWY0Njtjb2xvcjojZmZmO2ZvbnQtc2l6ZTouNzJyZW07cGFkZGluZzozcHggOXB4O2JvcmRlci1yYWRpdXM6MTJweDtmb250LXdlaWdodDo2MDA7d2hpdGUtc3BhY2U6bm93cmFwOyI+PC9zcGFuPgogIDxidXR0b24gY2xhc3M9ImJ0biBidG4tdGIgYnRuLXNtIiBpZD0iYnRuLXVuZG8iIGRpc2FibGVkIHN0eWxlPSJvcGFjaXR5Oi40NTsiPiYjeDIxQjY7IFVuZG88L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXRiIGJ0bi1zbSIgaWQ9ImJ0bi1yZWRvIiBkaXNhYmxlZCBzdHlsZT0ib3BhY2l0eTouNDU7Ij4mI3gyMUI3OyBSZWRvPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi10YiBidG4tc20iIGlkPSJidG4tYWkiPiYjeDFGOTE2OyBBSSBBc3Npc3RhbnQ8L2J1dHRvbj4KICA8aW5wdXQgdHlwZT0iZmlsZSIgaWQ9InJlc3RvcmUtZmlsZSIgYWNjZXB0PSIuanNvbiIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJpbXBvcnQtZmlsZSIgYWNjZXB0PSIuY3N2LC50eHQiIHN0eWxlPSJkaXNwbGF5Om5vbmUiPgo8L2Rpdj4KCjxkaXYgY2xhc3M9InRhYnMiPgogIDxidXR0b24gY2xhc3M9InRhYi1idG4gYWN0aXZlIiBpZD0idGFiLWNjIj4mI3gxRjRCMzsgQ3JlZGl0IENhcmQ8L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJ0YWItYnRuIiBpZD0idGFiLWNoayI+JiN4MUYzRTY7IENpbmR5J3MgQ2hlY2tpbmc8L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJ0YWItYnRuIiBpZD0idGFiLW1pa2UiPiYjeDFGM0U2OyBNaWtlJ3MgQ2hlY2tpbmc8L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJ0YWItYnRuIiBpZD0idGFiLXNhdmluZ3MiPiYjeDFGNEIwOyBTYXZpbmdzPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0idGFiLWJ0biIgaWQ9InRhYi1oeXNhIj4mI3gxRjRDODsgSFlTQTwvYnV0dG9uPgo8L2Rpdj4KCjxkaXYgaWQ9ImNjLXBhbmUiIGNsYXNzPSJwYWdlLWJvZHkiPgoKICA8ZGl2IGNsYXNzPSJzdW1tYXJ5Ij4KICAgIDxkaXYgY2xhc3M9ImNhcmQgZXhwIj48ZGl2IGNsYXNzPSJsYmwiPiYjeDI3MTM7IENsZWFyZWQgRXhwZW5zZXM8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJzLWV4cCI+JDAuMDA8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQgcmV0Ij48ZGl2IGNsYXNzPSJsYmwiPiYjeDI3MTM7IENsZWFyZWQgUmV0dXJuczwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9InMtcmV0Ij4kMC4wMDwvZGl2PjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY2FyZCBwYXkiPjxkaXYgY2xhc3M9ImxibCI+JiN4MjcxMzsgQ2xlYXJlZCBQYXltZW50czwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9InMtcGF5Ij4kMC4wMDwvZGl2PjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY2FyZCBiYWwiPjxkaXYgY2xhc3M9ImxibCI+JiN4MUY0QjM7IFRvdGFsIE93ZWQ8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJzLWJhbCI+JDAuMDA8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQgdW5jbCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gyNkEwOyBVbmNsZWFyZWQgQ2hhcmdlczwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9InMtdW5jbCI+JDAuMDA8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQgdW5jbC1yZXQiPjxkaXYgY2xhc3M9ImxibCI+JiN4MjFBOTsgVW5jbGVhcmVkIFJldHVybnM8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJzLXVuY2wtcmV0Ij4kMC4wMDwvZGl2PjwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJmb3JtLWNhcmQiPgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkRhdGU8L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0idHhuLWRhdGUiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZmQgZmwiPjxsYWJlbD5EZXNjcmlwdGlvbjwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJ0eG4tZGVzYyIgcGxhY2Vob2xkZXI9ImUuZy4gU3RhcmJ1Y2tzLCBBbWF6b27igKYiIG1heGxlbmd0aD0iMTAwIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5BbW91bnQgKCQpPC9sYWJlbD48aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0idHhuLWFtdCIgcGxhY2Vob2xkZXI9IjAuMDAiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj4KICAgICAgPGxhYmVsPkNhdGVnb3J5PC9sYWJlbD4KICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo0cHg7Ij4KICAgICAgICA8c2VsZWN0IGlkPSJ0eG4tY2F0IiBzdHlsZT0iZmxleDoxO21pbi13aWR0aDowOyI+PC9zZWxlY3Q+CiAgICAgICAgPGlucHV0IHR5cGU9Im51bWJlciIgaWQ9InR4bi1jYXQtYW10IiBwbGFjZWhvbGRlcj0iJCBhbXQiIG1pbj0iMCIgc3RlcD0iMC4wMSIgc3R5bGU9IndpZHRoOjcycHg7cGFkZGluZzo2cHggNHB4O2ZvbnQtc2l6ZTouOHJlbTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7Ym9yZGVyLXJhZGl1czo1cHg7b3V0bGluZTpub25lO2NvbG9yOnZhcigtLXRleHQpOyI+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IGJ0bi1zbSIgaWQ9ImJ0bi1hZGQtY2F0LWNoaXAiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDlweDsiPkFkZDwvYnV0dG9uPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QgYnRuLXNtIiBpZD0iYnRuLXNob3ctY2F0IiBzdHlsZT0iZmxleC1zaHJpbms6MDtwYWRkaW5nOjZweCA4cHg7IiB0aXRsZT0iTmV3IGNhdGVnb3J5Ij7vvIs8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgaWQ9ImNjLWFkZC1jaGlwcyIgY2xhc3M9ImNhdC1jaGlwcyI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9ImNhdC1yb3ciIHN0eWxlPSJkaXNwbGF5Om5vbmU7bWFyZ2luLXRvcDo0cHg7ZGlzcGxheTpub25lO2dhcDo0cHg7Ij4KICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9Im5ldy1jYXQiIHBsYWNlaG9sZGVyPSJOZXcgY2F0ZWdvcnnigKYiIG1heGxlbmd0aD0iNDAiCiAgICAgICAgICBzdHlsZT0iZmxleDoxO3BhZGRpbmc6NXB4IDhweDtmb250LXNpemU6LjhyZW07Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO2JvcmRlci1yYWRpdXM6NXB4O291dGxpbmU6bm9uZTtjb2xvcjp2YXIoLS10ZXh0KTsiPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tcHJpbWFyeSBidG4tc20iIGlkPSJidG4tc2F2ZS1jYXQiPkFkZDwvYnV0dG9uPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QgYnRuLXNtIiBpZD0iYnRuLWNhbmNlbC1jYXQiPiYjeDI3MTU7PC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGlkPSJjYy1jYXQtZGVsLWxpc3QiIGNsYXNzPSJjYXQtY2hpcHMiIHN0eWxlPSJkaXNwbGF5Om5vbmU7bWFyZ2luLXRvcDoycHg7Ij48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iZnQgZmwiPgogICAgICA8bGFiZWw+VHlwZTwvbGFiZWw+CiAgICAgIDxkaXYgY2xhc3M9InR5cGUtdG9nZ2xlIj4KICAgICAgICA8aW5wdXQgdHlwZT0icmFkaW8iIG5hbWU9InR4bi10eXBlIiBpZD0idGUiIHZhbHVlPSJleHBlbnNlIiBjaGVja2VkPgogICAgICAgIDxsYWJlbCBmb3I9InRlIiBjbGFzcz0iZWwiPkV4cGVuc2U8L2xhYmVsPgogICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0idHhuLXR5cGUiIGlkPSJ0ciIgdmFsdWU9InJldHVybiI+CiAgICAgICAgPGxhYmVsIGZvcj0idHIiIGNsYXNzPSJybCI+UmV0dXJuPC9sYWJlbD4KICAgICAgICA8aW5wdXQgdHlwZT0icmFkaW8iIG5hbWU9InR4bi10eXBlIiBpZD0idHAiIHZhbHVlPSJwYXltZW50Ij4KICAgICAgICA8bGFiZWwgZm9yPSJ0cCIgY2xhc3M9InBsIj5QYXltZW50PC9sYWJlbD4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImYgZmwiPgogICAgICA8bGFiZWw+V2hvPC9sYWJlbD4KICAgICAgPGRpdiBjbGFzcz0id2hvLXRvZ2dsZSI+CiAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJ0eG4td2hvIiBpZD0id20iIHZhbHVlPSJtZSI+CiAgICAgICAgPGxhYmVsIGZvcj0id20iIGNsYXNzPSJtbCI+JiN4MUY0NjQ7IE1lPC9sYWJlbD4KICAgICAgICA8aW5wdXQgdHlwZT0icmFkaW8iIG5hbWU9InR4bi13aG8iIGlkPSJ3dyIgdmFsdWU9IndpZmUiIGNoZWNrZWQ+CiAgICAgICAgPGxhYmVsIGZvcj0id3ciIGNsYXNzPSJ3bCI+JiN4MUY0Njk7IFdpZmU8L2xhYmVsPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iZm9ybS1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iZmwiPjxsYWJlbCBzdHlsZT0iY29sb3I6dHJhbnNwYXJlbnQ7Ij4uPC9sYWJlbD48YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkiIGlkPSJidG4tYWRkIj4rIEFkZDwvYnV0dG9uPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmbCIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpmbGV4LWVuZDtnYXA6NHB4OyI+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJjYy1jYW0tYnRuIiB0aXRsZT0iVGFrZSBwaG90byI+JiN4MUY0Rjc7PC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJjYy1saWItYnRuIiB0aXRsZT0iQ2hvb3NlIGZyb20gbGlicmFyeSI+JiN4MUY1QkM7PC9idXR0b24+CiAgICAgICAgPGltZyBpZD0iY2MtcGhvdG8tdGh1bWIiIHNyYz0iIiBzdHlsZT0iZGlzcGxheTpub25lO2hlaWdodDozMHB4O2JvcmRlci1yYWRpdXM6M3B4O2N1cnNvcjpwb2ludGVyO2JvcmRlcjoxcHggc29saWQgI2UwZTRlYTsiIHRpdGxlPSJUYXAgdG8gcmVtb3ZlIj4KICAgICAgICA8aW5wdXQgdHlwZT0iZmlsZSIgaWQ9ImNjLWNhbS1pbnAiIGFjY2VwdD0iaW1hZ2UvKiIgY2FwdHVyZT0iZW52aXJvbm1lbnQiIHN0eWxlPSJkaXNwbGF5Om5vbmUiPgogICAgICAgIDxpbnB1dCB0eXBlPSJmaWxlIiBpZD0iY2MtbGliLWlucCIgYWNjZXB0PSJpbWFnZS8qIiBzdHlsZT0iZGlzcGxheTpub25lIj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxzcGFuIGlkPSJmb3JtLWVyciIgc3R5bGU9ImNvbG9yOnZhcigtLWRhbmdlcik7Zm9udC1zaXplOi43OHJlbTtmbGV4LWJhc2lzOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Ij48L3NwYW4+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImZpbHRlcnMtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+U2VhcmNoPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImYtc2VhcmNoIiBwbGFjZWhvbGRlcj0iZS5nLiBTdGFyYnVja3PigKYiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkNhdGVnb3J5PC9sYWJlbD48c2VsZWN0IGlkPSJmLWNhdCI+PC9zZWxlY3Q+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+VHlwZTwvbGFiZWw+CiAgICAgIDxzZWxlY3QgaWQ9ImYtdHlwZSI+CiAgICAgICAgPG9wdGlvbiB2YWx1ZT0iIj5BbGwgVHlwZXM8L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSJleHBlbnNlIj5FeHBlbnNlczwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9InJldHVybiI+UmV0dXJuczwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9InBheW1lbnQiPlBheW1lbnRzPC9vcHRpb24+CiAgICAgIDwvc2VsZWN0PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+RnJvbTwvbGFiZWw+PGlucHV0IHR5cGU9ImRhdGUiIGlkPSJmLWZyb20iPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlRvPC9sYWJlbD48aW5wdXQgdHlwZT0iZGF0ZSIgaWQ9ImYtdG8iPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZmlsdGVyLWFjdGlvbnMiPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IGJ0bi1zbSIgaWQ9ImJ0bi1jbHItZmlsdGVyIj5DbGVhcjwvYnV0dG9uPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWV4cG9ydCBidG4tc20iIGlkPSJidG4tZXhwb3J0Ij4mI3gyQjA3OyBFeHBvcnQgQ1NWPC9idXR0b24+CiAgICA8L2Rpdj4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0iZmlsdGVyLXRvdGFsIiBpZD0iZmlsdGVyLXRvdGFsIj4KICAgIDxzcGFuPiYjeDFGNTBEOyBGaWx0ZXIgcmVzdWx0czo8L3NwYW4+CiAgICA8c3Ryb25nIGlkPSJmdC1jb3VudCI+PC9zdHJvbmc+CiAgICA8c3BhbiBpZD0iZnQtZGV0YWlsIj48L3NwYW4+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9Im5vdGVzLWNhcmQiPgogICAgPGRpdiBjbGFzcz0ibm90ZXMtaGRyIj48c3Bhbj4mI3gxRjRERDsgTm90ZXM8L3NwYW4+PHNtYWxsPmF1dG8tc2F2ZWQ8L3NtYWxsPjwvZGl2PgogICAgPHRleHRhcmVhIGlkPSJjYy1ub3RlcyIgcGxhY2Vob2xkZXI9IkpvdCBkb3duIGFueXRoaW5nIOKAlCBkdWUgZGF0ZXMsIGNyZWRpdCBsaW1pdCwgcmVtaW5kZXJz4oCmIiByb3dzPSIyIj48L3RleHRhcmVhPgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJ0YWJsZS1jYXJkIj4KICAgIDxkaXYgY2xhc3M9InRhYmxlLWhkciI+CiAgICAgIDxoMj5UcmFuc2FjdGlvbnM8L2gyPgogICAgICA8ZGl2IGNsYXNzPSJ0aHIiPgogICAgICAgIDxzcGFuIGlkPSJyb3ctY291bnQiPjAgdHJhbnNhY3Rpb25zPC9zcGFuPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tdW5jbCBidG4tc20iIGlkPSJidG4tdW5jbCI+JiN4MjZBMDsgVW5jbGVhcmVkIEZpcnN0PC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1kYW5nZXIgYnRuLXNtIiBpZD0iYnRuLWNsci1hbGwiPkNsZWFyIEFsbDwvYnV0dG9uPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0idHNjcm9sbCI+CiAgICAgIDx0YWJsZSBpZD0idHhuLXRhYmxlIj4KICAgICAgICA8dGhlYWQgaWQ9InR4bi1oZWFkIj48L3RoZWFkPgogICAgICAgIDx0Ym9keSBpZD0idHhuLWJvZHkiPjwvdGJvZHk+CiAgICAgIDwvdGFibGU+CiAgICAgIDxkaXYgaWQ9ImVtcHR5LXN0YXRlIiBjbGFzcz0iZW1wdHktc3RhdGUiPgogICAgICAgIDxkaXYgY2xhc3M9Imljb24iPiYjeDFGOUZFOzwvZGl2PgogICAgICAgIDxwPk5vIHRyYW5zYWN0aW9ucyB5ZXQuIEFkZCB5b3VyIGZpcnN0IG9uZSBhYm92ZS48L3A+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgPC9kaXY+Cgo8L2Rpdj4KCjwvZGl2PjwhLS0gL2NjLXBhbmUgLS0+Cgo8IS0tIENoZWNraW5nIFBhbmUgLS0+CjxkaXYgaWQ9ImNoay1wYW5lIiBjbGFzcz0icGFnZS1ib2R5IiBzdHlsZT0iZGlzcGxheTpub25lOyI+CgogIDxkaXYgY2xhc3M9ImZvcm0tY2FyZCIgc3R5bGU9Imp1c3RpZnktY29udGVudDpmbGV4LXN0YXJ0OyI+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+T3BlbmluZyBCYWxhbmNlICgkKTwvbGFiZWw+PGlucHV0IHR5cGU9Im51bWJlciIgaWQ9ImNoay1vcGVuIiBwbGFjZWhvbGRlcj0iMC4wMCIgc3RlcD0iMC4wMSIgbWluPSIwIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZvcm0tYWN0aW9ucyI+PGRpdiBjbGFzcz0iZmwiPjxsYWJlbCBzdHlsZT0iY29sb3I6dHJhbnNwYXJlbnQ7Ij4uPC9sYWJlbD48YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IiBpZD0iY2hrLWJ0bi1zZXQtb3BlbiI+U2V0PC9idXR0b24+PC9kaXY+PC9kaXY+CiAgICA8c3BhbiBpZD0iY2hrLW9wZW4tbm90ZSIgc3R5bGU9ImZvbnQtc2l6ZTouNzVyZW07Y29sb3I6IzY0NzQ4YjthbGlnbi1zZWxmOmZsZXgtZW5kO3BhZGRpbmctYm90dG9tOjdweDsiPjwvc3Bhbj4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0ic3VtbWFyeS00Ij4KICAgIDxkaXYgY2xhc3M9ImNhcmQgYmFsIj48ZGl2IGNsYXNzPSJsYmwiPiYjeDFGNEIwOyBBY2NvdW50IEJhbGFuY2U8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJjaGstcy1iYWwiPiQwLjAwPC9kaXY+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIHJldCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gyNzEzOyBDbGVhcmVkIEJhbGFuY2U8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJjaGstcy1jbHIiPiQwLjAwPC9kaXY+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIHVuY2wtcmV0Ij48ZGl2IGNsYXNzPSJsYmwiPiYjeDI2QTA7IFBlbmRpbmcgRGVwb3NpdHM8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJjaGstcy1wZGVwIj4kMC4wMDwvZGl2PjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY2FyZCB1bmNsIj48ZGl2IGNsYXNzPSJsYmwiPiYjeDI2QTA7IFBlbmRpbmcgV2l0aGRyYXdhbHM8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJjaGstcy1wd3RoIj4kMC4wMDwvZGl2PjwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJmb3JtLWNhcmQiPgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkRhdGU8L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0iY2hrLWRhdGUiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZmQgZmwiPjxsYWJlbD5EZXNjcmlwdGlvbjwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJjaGstZGVzYyIgcGxhY2Vob2xkZXI9ImUuZy4gUGF5Y2hlY2ssIFJlbnTigKYiIG1heGxlbmd0aD0iMTAwIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5BbW91bnQgKCQpPC9sYWJlbD48aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0iY2hrLWFtdCIgcGxhY2Vob2xkZXI9IjAuMDAiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj4KICAgICAgPGxhYmVsPkNhdGVnb3J5PC9sYWJlbD4KICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo0cHg7Ij4KICAgICAgICA8c2VsZWN0IGlkPSJjaGstY2F0IiBzdHlsZT0iZmxleDoxO21pbi13aWR0aDowOyI+PC9zZWxlY3Q+CiAgICAgICAgPGlucHV0IHR5cGU9Im51bWJlciIgaWQ9ImNoay1jYXQtYW10IiBwbGFjZWhvbGRlcj0iJCBhbXQiIG1pbj0iMCIgc3RlcD0iMC4wMSIgc3R5bGU9IndpZHRoOjcycHg7cGFkZGluZzo2cHggNHB4O2ZvbnQtc2l6ZTouOHJlbTtib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7Ym9yZGVyLXJhZGl1czo1cHg7b3V0bGluZTpub25lO2NvbG9yOiMxZTI5M2I7Ij4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0iY2hrLWJ0bi1hZGQtY2F0LWNoaXAiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDlweDtiYWNrZ3JvdW5kOiMyNTYzZWI7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo2MDA7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0iY2hrLWJ0bi1zaG93LWNhdCIgc3R5bGU9ImZsZXgtc2hyaW5rOjA7cGFkZGluZzo2cHggMTBweDtiYWNrZ3JvdW5kOiNmMWY1Zjk7Y29sb3I6IzQ3NTU2OTtib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7Zm9udC13ZWlnaHQ6NzAwOyIgdGl0bGU9Ik5ldyBjYXRlZ29yeSI+KzwvYnV0dG9uPgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBpZD0iY2hrLWFkZC1jaGlwcyIgY2xhc3M9ImNhdC1jaGlwcyI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9ImNoay1jYXQtcm93IiBzdHlsZT0iZGlzcGxheTpub25lO21hcmdpbi10b3A6NHB4O2dhcDo0cHg7Ij4KICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImNoay1uZXctY2F0IiBwbGFjZWhvbGRlcj0iTmV3IGNhdGVnb3J54oCmIiBtYXhsZW5ndGg9IjQwIgogICAgICAgICAgc3R5bGU9ImZsZXg6MTtwYWRkaW5nOjVweCA4cHg7Zm9udC1zaXplOi44cmVtO2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTtib3JkZXItcmFkaXVzOjVweDtvdXRsaW5lOm5vbmU7Y29sb3I6IzFlMjkzYjsiPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tc20iIGlkPSJjaGstYnRuLXNhdmUtY2F0IiBzdHlsZT0iYmFja2dyb3VuZDojMjU2M2ViO2NvbG9yOiNmZmY7Zm9udC13ZWlnaHQ6NjAwOyI+QWRkPC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1zbSIgaWQ9ImNoay1idG4tY2FuY2VsLWNhdCIgc3R5bGU9ImJhY2tncm91bmQ6I2YxZjVmOTtjb2xvcjojNDc1NTY5O2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTsiPiYjeDI3MTU7PC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGlkPSJjaGstY2F0LWRlbC1saXN0IiBjbGFzcz0iY2F0LWNoaXBzIiBzdHlsZT0iZGlzcGxheTpub25lO21hcmdpbi10b3A6MnB4OyI+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZ0IGZsIj4KICAgICAgPGxhYmVsPlR5cGU8L2xhYmVsPgogICAgICA8ZGl2IGNsYXNzPSJ0eXBlLXRvZ2dsZSI+CiAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJjaGstdHlwZSIgaWQ9ImNoay1kZXAiIHZhbHVlPSJkZXBvc2l0IiBjaGVja2VkPgogICAgICAgIDxsYWJlbCBmb3I9ImNoay1kZXAiIGNsYXNzPSJybCI+JiN4MkIwNjsgRGVwb3NpdDwvbGFiZWw+CiAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJjaGstdHlwZSIgaWQ9ImNoay13dGgiIHZhbHVlPSJ3aXRoZHJhd2FsIj4KICAgICAgICA8bGFiZWwgZm9yPSJjaGstd3RoIiBjbGFzcz0iZWwiPiYjeDJCMDc7IFdpdGhkcmF3YWw8L2xhYmVsPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iZm9ybS1hY3Rpb25zIj4KICAgICAgPGRpdiBjbGFzcz0iZmwiPjxsYWJlbCBzdHlsZT0iY29sb3I6dHJhbnNwYXJlbnQ7Ij4uPC9sYWJlbD48YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkiIGlkPSJjaGstYnRuLWFkZCI+KyBBZGQ8L2J1dHRvbj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZmwiIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6ZmxleC1lbmQ7Z2FwOjRweDsiPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QgYnRuLXNtIiBpZD0iY2hrLWNhbS1idG4iIHRpdGxlPSJUYWtlIHBob3RvIj4mI3gxRjRGNzs8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IGJ0bi1zbSIgaWQ9ImNoay1saWItYnRuIiB0aXRsZT0iQ2hvb3NlIGZyb20gbGlicmFyeSI+JiN4MUY1QkM7PC9idXR0b24+CiAgICAgICAgPGltZyBpZD0iY2hrLXBob3RvLXRodW1iIiBzcmM9IiIgc3R5bGU9ImRpc3BsYXk6bm9uZTtoZWlnaHQ6MzBweDtib3JkZXItcmFkaXVzOjNweDtjdXJzb3I6cG9pbnRlcjtib3JkZXI6MXB4IHNvbGlkICNlMGU0ZWE7IiB0aXRsZT0iVGFwIHRvIHJlbW92ZSI+CiAgICAgICAgPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJjaGstY2FtLWlucCIgYWNjZXB0PSJpbWFnZS8qIiBjYXB0dXJlPSJlbnZpcm9ubWVudCIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgICAgPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJjaGstbGliLWlucCIgYWNjZXB0PSJpbWFnZS8qIiBzdHlsZT0iZGlzcGxheTpub25lIj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxzcGFuIGlkPSJjaGstZm9ybS1lcnIiIHN0eWxlPSJjb2xvcjojZGMyNjI2O2ZvbnQtc2l6ZTouNzhyZW07ZmxleC1iYXNpczoxMDAlO3RleHQtYWxpZ246Y2VudGVyOyI+PC9zcGFuPgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJmaWx0ZXJzLWNhcmQiPgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlNlYXJjaDwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJjaGstZi1zZWFyY2giIHBsYWNlaG9sZGVyPSJTZWFyY2jigKYiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlR5cGU8L2xhYmVsPgogICAgICA8c2VsZWN0IGlkPSJjaGstZi10eXBlIj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSIiPkFsbCBUeXBlczwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9ImRlcG9zaXQiPkRlcG9zaXRzPC9vcHRpb24+CiAgICAgICAgPG9wdGlvbiB2YWx1ZT0id2l0aGRyYXdhbCI+V2l0aGRyYXdhbHM8L29wdGlvbj4KICAgICAgPC9zZWxlY3Q+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5Gcm9tPC9sYWJlbD48aW5wdXQgdHlwZT0iZGF0ZSIgaWQ9ImNoay1mLWZyb20iPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlRvPC9sYWJlbD48aW5wdXQgdHlwZT0iZGF0ZSIgaWQ9ImNoay1mLXRvIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZpbHRlci1hY3Rpb25zIj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJjaGstYnRuLWNsci1maWx0ZXIiPkNsZWFyPC9idXR0b24+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZXhwb3J0IGJ0bi1zbSIgaWQ9ImNoay1idG4tZXhwb3J0Ij4mI3gyQjA3OyBFeHBvcnQgQ1NWPC9idXR0b24+CiAgICA8L2Rpdj4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0ibm90ZXMtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJub3Rlcy1oZHIiPjxzcGFuPiYjeDFGNEREOyBOb3Rlczwvc3Bhbj48c21hbGw+YXV0by1zYXZlZDwvc21hbGw+PC9kaXY+CiAgICA8dGV4dGFyZWEgaWQ9ImNoay1ub3RlcyIgcGxhY2Vob2xkZXI9IkpvdCBkb3duIGFueXRoaW5nIOKAlCBhY2NvdW50IG51bWJlciwgcm91dGluZyBudW1iZXIsIHJlbWluZGVyc+KApiIgcm93cz0iMiI+PC90ZXh0YXJlYT4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0idGFibGUtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJ0YWJsZS1oZHIiPgogICAgICA8aDI+VHJhbnNhY3Rpb25zPC9oMj4KICAgICAgPGRpdiBjbGFzcz0idGhyIj4KICAgICAgICA8c3BhbiBpZD0iY2hrLXJvdy1jb3VudCI+MCB0cmFuc2FjdGlvbnM8L3NwYW4+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi11bmNsIGJ0bi1zbSIgaWQ9ImNoay1idG4tdW5jbCI+JiN4MjZBMDsgVW5jbGVhcmVkIEZpcnN0PC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1kYW5nZXIgYnRuLXNtIiBpZD0iY2hrLWJ0bi1jbHItYWxsIj5DbGVhciBBbGw8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InRzY3JvbGwiPgogICAgICA8dGFibGUgaWQ9ImNoay10YWJsZSI+PHRoZWFkIGlkPSJjaGstaGVhZCI+PC90aGVhZD48dGJvZHkgaWQ9ImNoay1ib2R5Ij48L3Rib2R5PjwvdGFibGU+CiAgICAgIDxkaXYgaWQ9ImNoay1lbXB0eSIgY2xhc3M9ImVtcHR5LXN0YXRlIj48ZGl2IGNsYXNzPSJpY29uIj4mI3gxRjNFNjs8L2Rpdj48cD5ObyB0cmFuc2FjdGlvbnMgeWV0LjwvcD48L2Rpdj4KICAgIDwvZGl2PgogIDwvZGl2PgoKPC9kaXY+PCEtLSAvY2hrLXBhbmUgLS0+Cgo8IS0tIE1pa2UncyBDaGVja2luZyBQYW5lIC0tPgo8ZGl2IGlkPSJtaWtlLXBhbmUiIGNsYXNzPSJwYWdlLWJvZHkiIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ij4KCiAgPGRpdiBjbGFzcz0iZm9ybS1jYXJkIiBzdHlsZT0ianVzdGlmeS1jb250ZW50OmZsZXgtc3RhcnQ7Ij4KICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5PcGVuaW5nIEJhbGFuY2UgKCQpPC9sYWJlbD48aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0ibWlrZS1vcGVuIiBwbGFjZWhvbGRlcj0iMC4wMCIgc3RlcD0iMC4wMSIgbWluPSIwIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZvcm0tYWN0aW9ucyI+PGRpdiBjbGFzcz0iZmwiPjxsYWJlbCBzdHlsZT0iY29sb3I6dHJhbnNwYXJlbnQ7Ij4uPC9sYWJlbD48YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IiBpZD0ibWlrZS1idG4tc2V0LW9wZW4iPlNldDwvYnV0dG9uPjwvZGl2PjwvZGl2PgogICAgPHNwYW4gaWQ9Im1pa2Utb3Blbi1ub3RlIiBzdHlsZT0iZm9udC1zaXplOi43NXJlbTtjb2xvcjojNjQ3NDhiO2FsaWduLXNlbGY6ZmxleC1lbmQ7cGFkZGluZy1ib3R0b206N3B4OyI+PC9zcGFuPgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJzdW1tYXJ5LTQiPgogICAgPGRpdiBjbGFzcz0iY2FyZCBiYWwiPjxkaXYgY2xhc3M9ImxibCI+JiN4MUY0QjA7IEFjY291bnQgQmFsYW5jZTwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9Im1pa2Utcy1iYWwiPiQwLjAwPC9kaXY+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIHJldCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gyNzEzOyBDbGVhcmVkIEJhbGFuY2U8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJtaWtlLXMtY2xyIj4kMC4wMDwvZGl2PjwvZGl2PgogICAgPGRpdiBjbGFzcz0iY2FyZCB1bmNsLXJldCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gyNkEwOyBQZW5kaW5nIERlcG9zaXRzPC9kaXY+PGRpdiBjbGFzcz0idmFsIiBpZD0ibWlrZS1zLXBkZXAiPiQwLjAwPC9kaXY+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIHVuY2wiPjxkaXYgY2xhc3M9ImxibCI+JiN4MjZBMDsgUGVuZGluZyBXaXRoZHJhd2FsczwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9Im1pa2Utcy1wd3RoIj4kMC4wMDwvZGl2PjwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJmb3JtLWNhcmQiPgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkRhdGU8L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0ibWlrZS1kYXRlIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZkIGZsIj48bGFiZWw+RGVzY3JpcHRpb248L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0ibWlrZS1kZXNjIiBwbGFjZWhvbGRlcj0iZS5nLiBQYXljaGVjaywgUmVudOKApiIgbWF4bGVuZ3RoPSIxMDAiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkFtb3VudCAoJCk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJtaWtlLWFtdCIgcGxhY2Vob2xkZXI9IjAuMDAiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj4KICAgICAgPGxhYmVsPkNhdGVnb3J5PC9sYWJlbD4KICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo0cHg7Ij4KICAgICAgICA8c2VsZWN0IGlkPSJtaWtlLWNhdCIgc3R5bGU9ImZsZXg6MTttaW4td2lkdGg6MDsiPjwvc2VsZWN0PgogICAgICAgIDxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJtaWtlLWNhdC1hbXQiIHBsYWNlaG9sZGVyPSIkIGFtdCIgbWluPSIwIiBzdGVwPSIwLjAxIiBzdHlsZT0id2lkdGg6NzJweDtwYWRkaW5nOjZweCA0cHg7Zm9udC1zaXplOi44cmVtO2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTtib3JkZXItcmFkaXVzOjVweDtvdXRsaW5lOm5vbmU7Y29sb3I6IzFlMjkzYjsiPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tc20iIGlkPSJtaWtlLWJ0bi1hZGQtY2F0LWNoaXAiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDlweDtiYWNrZ3JvdW5kOiMyNTYzZWI7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo2MDA7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0ibWlrZS1idG4tc2hvdy1jYXQiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDEwcHg7YmFja2dyb3VuZDojZjFmNWY5O2NvbG9yOiM0NzU1Njk7Ym9yZGVyOjFweCBzb2xpZCAjY2JkNWUxO2ZvbnQtd2VpZ2h0OjcwMDsiIHRpdGxlPSJOZXcgY2F0ZWdvcnkiPis8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgaWQ9Im1pa2UtYWRkLWNoaXBzIiBjbGFzcz0iY2F0LWNoaXBzIj48L2Rpdj4KICAgICAgPGRpdiBpZD0ibWlrZS1jYXQtcm93IiBzdHlsZT0iZGlzcGxheTpub25lO21hcmdpbi10b3A6NHB4O2dhcDo0cHg7Ij4KICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9Im1pa2UtbmV3LWNhdCIgcGxhY2Vob2xkZXI9Ik5ldyBjYXRlZ29yeeKApiIgbWF4bGVuZ3RoPSI0MCIKICAgICAgICAgIHN0eWxlPSJmbGV4OjE7cGFkZGluZzo1cHggOHB4O2ZvbnQtc2l6ZTouOHJlbTtib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7Ym9yZGVyLXJhZGl1czo1cHg7b3V0bGluZTpub25lO2NvbG9yOiMxZTI5M2I7Ij4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0ibWlrZS1idG4tc2F2ZS1jYXQiIHN0eWxlPSJiYWNrZ3JvdW5kOiMyNTYzZWI7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo2MDA7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0ibWlrZS1idG4tY2FuY2VsLWNhdCIgc3R5bGU9ImJhY2tncm91bmQ6I2YxZjVmOTtjb2xvcjojNDc1NTY5O2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTsiPiYjeDI3MTU7PC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGlkPSJtaWtlLWNhdC1kZWwtbGlzdCIgY2xhc3M9ImNhdC1jaGlwcyIgc3R5bGU9ImRpc3BsYXk6bm9uZTttYXJnaW4tdG9wOjJweDsiPjwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmdCBmbCI+CiAgICAgIDxsYWJlbD5UeXBlPC9sYWJlbD4KICAgICAgPGRpdiBjbGFzcz0idHlwZS10b2dnbGUiPgogICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0ibWlrZS10eXBlIiBpZD0ibWlrZS1kZXAiIHZhbHVlPSJkZXBvc2l0IiBjaGVja2VkPgogICAgICAgIDxsYWJlbCBmb3I9Im1pa2UtZGVwIiBjbGFzcz0icmwiPiYjeDJCMDY7IERlcG9zaXQ8L2xhYmVsPgogICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0ibWlrZS10eXBlIiBpZD0ibWlrZS13dGgiIHZhbHVlPSJ3aXRoZHJhd2FsIj4KICAgICAgICA8bGFiZWwgZm9yPSJtaWtlLXd0aCIgY2xhc3M9ImVsIj4mI3gyQjA3OyBXaXRoZHJhd2FsPC9sYWJlbD4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZvcm0tYWN0aW9ucyI+CiAgICAgIDxkaXYgY2xhc3M9ImZsIj48bGFiZWwgc3R5bGU9ImNvbG9yOnRyYW5zcGFyZW50OyI+LjwvbGFiZWw+PGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IiBpZD0ibWlrZS1idG4tYWRkIj4rIEFkZDwvYnV0dG9uPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmbCIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpmbGV4LWVuZDtnYXA6NHB4OyI+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJtaWtlLWNhbS1idG4iIHRpdGxlPSJUYWtlIHBob3RvIj4mI3gxRjRGNzs8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IGJ0bi1zbSIgaWQ9Im1pa2UtbGliLWJ0biIgdGl0bGU9IkNob29zZSBmcm9tIGxpYnJhcnkiPiYjeDFGNUJDOzwvYnV0dG9uPgogICAgICAgIDxpbWcgaWQ9Im1pa2UtcGhvdG8tdGh1bWIiIHNyYz0iIiBzdHlsZT0iZGlzcGxheTpub25lO2hlaWdodDozMHB4O2JvcmRlci1yYWRpdXM6M3B4O2N1cnNvcjpwb2ludGVyO2JvcmRlcjoxcHggc29saWQgI2UwZTRlYTsiIHRpdGxlPSJUYXAgdG8gcmVtb3ZlIj4KICAgICAgICA8aW5wdXQgdHlwZT0iZmlsZSIgaWQ9Im1pa2UtY2FtLWlucCIgYWNjZXB0PSJpbWFnZS8qIiBjYXB0dXJlPSJlbnZpcm9ubWVudCIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgICAgPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJtaWtlLWxpYi1pbnAiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgICA8c3BhbiBpZD0ibWlrZS1mb3JtLWVyciIgc3R5bGU9ImNvbG9yOiNkYzI2MjY7Zm9udC1zaXplOi43OHJlbTtmbGV4LWJhc2lzOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Ij48L3NwYW4+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImZpbHRlcnMtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+U2VhcmNoPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9Im1pa2UtZi1zZWFyY2giIHBsYWNlaG9sZGVyPSJTZWFyY2jigKYiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlR5cGU8L2xhYmVsPgogICAgICA8c2VsZWN0IGlkPSJtaWtlLWYtdHlwZSI+CiAgICAgICAgPG9wdGlvbiB2YWx1ZT0iIj5BbGwgVHlwZXM8L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSJkZXBvc2l0Ij5EZXBvc2l0czwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9IndpdGhkcmF3YWwiPldpdGhkcmF3YWxzPC9vcHRpb24+CiAgICAgIDwvc2VsZWN0PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+RnJvbTwvbGFiZWw+PGlucHV0IHR5cGU9ImRhdGUiIGlkPSJtaWtlLWYtZnJvbSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+VG88L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0ibWlrZS1mLXRvIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZpbHRlci1hY3Rpb25zIj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJtaWtlLWJ0bi1jbHItZmlsdGVyIj5DbGVhcjwvYnV0dG9uPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWV4cG9ydCBidG4tc20iIGlkPSJtaWtlLWJ0bi1leHBvcnQiPiYjeDJCMDc7IEV4cG9ydCBDU1Y8L2J1dHRvbj4KICAgIDwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJub3Rlcy1jYXJkIj4KICAgIDxkaXYgY2xhc3M9Im5vdGVzLWhkciI+PHNwYW4+JiN4MUY0REQ7IE5vdGVzPC9zcGFuPjxzbWFsbD5hdXRvLXNhdmVkPC9zbWFsbD48L2Rpdj4KICAgIDx0ZXh0YXJlYSBpZD0ibWlrZS1ub3RlcyIgcGxhY2Vob2xkZXI9IkpvdCBkb3duIGFueXRoaW5nIOKAlCBhY2NvdW50IG51bWJlciwgcm91dGluZyBudW1iZXIsIHJlbWluZGVyc+KApiIgcm93cz0iMiI+PC90ZXh0YXJlYT4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0idGFibGUtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJ0YWJsZS1oZHIiPgogICAgICA8aDI+VHJhbnNhY3Rpb25zPC9oMj4KICAgICAgPGRpdiBjbGFzcz0idGhyIj4KICAgICAgICA8c3BhbiBpZD0ibWlrZS1yb3ctY291bnQiPjAgdHJhbnNhY3Rpb25zPC9zcGFuPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tdW5jbCBidG4tc20iIGlkPSJtaWtlLWJ0bi11bmNsIj4mI3gyNkEwOyBVbmNsZWFyZWQgRmlyc3Q8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWRhbmdlciBidG4tc20iIGlkPSJtaWtlLWJ0bi1jbHItYWxsIj5DbGVhciBBbGw8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InRzY3JvbGwiPgogICAgICA8dGFibGUgaWQ9Im1pa2UtdGFibGUiPjx0aGVhZCBpZD0ibWlrZS1oZWFkIj48L3RoZWFkPjx0Ym9keSBpZD0ibWlrZS1ib2R5Ij48L3Rib2R5PjwvdGFibGU+CiAgICAgIDxkaXYgaWQ9Im1pa2UtZW1wdHkiIGNsYXNzPSJlbXB0eS1zdGF0ZSI+PGRpdiBjbGFzcz0iaWNvbiI+JiN4MUYzRTY7PC9kaXY+PHA+Tm8gdHJhbnNhY3Rpb25zIHlldC48L3A+PC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj4KCjwvZGl2PjwhLS0gL21pa2UtcGFuZSAtLT4KCjxkaXYgaWQ9InNhdmluZ3MtcGFuZSIgY2xhc3M9InBhZ2UtYm9keSIgc3R5bGU9ImRpc3BsYXk6bm9uZTsiPgoKICA8ZGl2IGNsYXNzPSJmb3JtLWNhcmQiIHN0eWxlPSJqdXN0aWZ5LWNvbnRlbnQ6ZmxleC1zdGFydDsiPgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPk9wZW5pbmcgQmFsYW5jZSAoJCk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJzYXZpbmdzLW9wZW4iIHBsYWNlaG9sZGVyPSIwLjAwIiBzdGVwPSIwLjAxIiBtaW49IjAiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZm9ybS1hY3Rpb25zIj48ZGl2IGNsYXNzPSJmbCI+PGxhYmVsIHN0eWxlPSJjb2xvcjp0cmFuc3BhcmVudDsiPi48L2xhYmVsPjxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJzYXZpbmdzLWJ0bi1zZXQtb3BlbiI+U2V0PC9idXR0b24+PC9kaXY+PC9kaXY+CiAgICA8c3BhbiBpZD0ic2F2aW5ncy1vcGVuLW5vdGUiIHN0eWxlPSJmb250LXNpemU6Ljc1cmVtO2NvbG9yOiM2NDc0OGI7YWxpZ24tc2VsZjpmbGV4LWVuZDtwYWRkaW5nLWJvdHRvbTo3cHg7Ij48L3NwYW4+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9InN1bW1hcnktNCI+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIGJhbCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gxRjRCMDsgQWNjb3VudCBCYWxhbmNlPC9kaXY+PGRpdiBjbGFzcz0idmFsIiBpZD0ic2F2aW5ncy1zLWJhbCI+JDAuMDA8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQgcmV0Ij48ZGl2IGNsYXNzPSJsYmwiPiYjeDI3MTM7IENsZWFyZWQgQmFsYW5jZTwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9InNhdmluZ3Mtcy1jbHIiPiQwLjAwPC9kaXY+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIHVuY2wtcmV0Ij48ZGl2IGNsYXNzPSJsYmwiPiYjeDI2QTA7IFBlbmRpbmcgRGVwb3NpdHM8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJzYXZpbmdzLXMtcGRlcCI+JDAuMDA8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQgdW5jbCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gyNkEwOyBQZW5kaW5nIFdpdGhkcmF3YWxzPC9kaXY+PGRpdiBjbGFzcz0idmFsIiBpZD0ic2F2aW5ncy1zLXB3dGgiPiQwLjAwPC9kaXY+PC9kaXY+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImZvcm0tY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+RGF0ZTwvbGFiZWw+PGlucHV0IHR5cGU9ImRhdGUiIGlkPSJzYXZpbmdzLWRhdGUiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZmQgZmwiPjxsYWJlbD5EZXNjcmlwdGlvbjwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJzYXZpbmdzLWRlc2MiIHBsYWNlaG9sZGVyPSJlLmcuIFRyYW5zZmVyLCBJbnRlcmVzdOKApiIgbWF4bGVuZ3RoPSIxMDAiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkFtb3VudCAoJCk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJzYXZpbmdzLWFtdCIgcGxhY2Vob2xkZXI9IjAuMDAiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj4KICAgICAgPGxhYmVsPkNhdGVnb3J5PC9sYWJlbD4KICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo0cHg7Ij4KICAgICAgICA8c2VsZWN0IGlkPSJzYXZpbmdzLWNhdCIgc3R5bGU9ImZsZXg6MTttaW4td2lkdGg6MDsiPjwvc2VsZWN0PgogICAgICAgIDxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJzYXZpbmdzLWNhdC1hbXQiIHBsYWNlaG9sZGVyPSIkIGFtdCIgbWluPSIwIiBzdGVwPSIwLjAxIiBzdHlsZT0id2lkdGg6NzJweDtwYWRkaW5nOjZweCA0cHg7Zm9udC1zaXplOi44cmVtO2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTtib3JkZXItcmFkaXVzOjVweDtvdXRsaW5lOm5vbmU7Y29sb3I6IzFlMjkzYjsiPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tc20iIGlkPSJzYXZpbmdzLWJ0bi1hZGQtY2F0LWNoaXAiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDlweDtiYWNrZ3JvdW5kOiMyNTYzZWI7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo2MDA7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0ic2F2aW5ncy1idG4tc2hvdy1jYXQiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDEwcHg7YmFja2dyb3VuZDojZjFmNWY5O2NvbG9yOiM0NzU1Njk7Ym9yZGVyOjFweCBzb2xpZCAjY2JkNWUxO2ZvbnQtd2VpZ2h0OjcwMDsiIHRpdGxlPSJOZXcgY2F0ZWdvcnkiPis8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgaWQ9InNhdmluZ3MtYWRkLWNoaXBzIiBjbGFzcz0iY2F0LWNoaXBzIj48L2Rpdj4KICAgICAgPGRpdiBpZD0ic2F2aW5ncy1jYXQtcm93IiBzdHlsZT0iZGlzcGxheTpub25lO21hcmdpbi10b3A6NHB4O2dhcDo0cHg7Ij4KICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9InNhdmluZ3MtbmV3LWNhdCIgcGxhY2Vob2xkZXI9Ik5ldyBjYXRlZ29yeeKApiIgbWF4bGVuZ3RoPSI0MCIKICAgICAgICAgIHN0eWxlPSJmbGV4OjE7cGFkZGluZzo1cHggOHB4O2ZvbnQtc2l6ZTouOHJlbTtib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7Ym9yZGVyLXJhZGl1czo1cHg7b3V0bGluZTpub25lO2NvbG9yOiMxZTI5M2I7Ij4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0ic2F2aW5ncy1idG4tc2F2ZS1jYXQiIHN0eWxlPSJiYWNrZ3JvdW5kOiMyNTYzZWI7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo2MDA7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0ic2F2aW5ncy1idG4tY2FuY2VsLWNhdCIgc3R5bGU9ImJhY2tncm91bmQ6I2YxZjVmOTtjb2xvcjojNDc1NTY5O2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTsiPiYjeDI3MTU7PC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGlkPSJzYXZpbmdzLWNhdC1kZWwtbGlzdCIgY2xhc3M9ImNhdC1jaGlwcyIgc3R5bGU9ImRpc3BsYXk6bm9uZTttYXJnaW4tdG9wOjJweDsiPjwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmdCBmbCI+CiAgICAgIDxsYWJlbD5UeXBlPC9sYWJlbD4KICAgICAgPGRpdiBjbGFzcz0idHlwZS10b2dnbGUiPgogICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0ic2F2aW5ncy10eXBlIiBpZD0ic2F2aW5ncy1kZXAiIHZhbHVlPSJkZXBvc2l0IiBjaGVja2VkPgogICAgICAgIDxsYWJlbCBmb3I9InNhdmluZ3MtZGVwIiBjbGFzcz0icmwiPiYjeDJCMDY7IERlcG9zaXQ8L2xhYmVsPgogICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0ic2F2aW5ncy10eXBlIiBpZD0ic2F2aW5ncy13dGgiIHZhbHVlPSJ3aXRoZHJhd2FsIj4KICAgICAgICA8bGFiZWwgZm9yPSJzYXZpbmdzLXd0aCIgY2xhc3M9ImVsIj4mI3gyQjA3OyBXaXRoZHJhd2FsPC9sYWJlbD4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZvcm0tYWN0aW9ucyI+CiAgICAgIDxkaXYgY2xhc3M9ImZsIj48bGFiZWwgc3R5bGU9ImNvbG9yOnRyYW5zcGFyZW50OyI+LjwvbGFiZWw+PGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IiBpZD0ic2F2aW5ncy1idG4tYWRkIj4rIEFkZDwvYnV0dG9uPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmbCIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpmbGV4LWVuZDtnYXA6NHB4OyI+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJzYXZpbmdzLWNhbS1idG4iIHRpdGxlPSJUYWtlIHBob3RvIj4mI3gxRjRGNzs8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IGJ0bi1zbSIgaWQ9InNhdmluZ3MtbGliLWJ0biIgdGl0bGU9IkNob29zZSBmcm9tIGxpYnJhcnkiPiYjeDFGNUJDOzwvYnV0dG9uPgogICAgICAgIDxpbWcgaWQ9InNhdmluZ3MtcGhvdG8tdGh1bWIiIHNyYz0iIiBzdHlsZT0iZGlzcGxheTpub25lO2hlaWdodDozMHB4O2JvcmRlci1yYWRpdXM6M3B4O2N1cnNvcjpwb2ludGVyO2JvcmRlcjoxcHggc29saWQgI2UwZTRlYTsiIHRpdGxlPSJUYXAgdG8gcmVtb3ZlIj4KICAgICAgICA8aW5wdXQgdHlwZT0iZmlsZSIgaWQ9InNhdmluZ3MtY2FtLWlucCIgYWNjZXB0PSJpbWFnZS8qIiBjYXB0dXJlPSJlbnZpcm9ubWVudCIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgICAgPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJzYXZpbmdzLWxpYi1pbnAiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgICA8c3BhbiBpZD0ic2F2aW5ncy1mb3JtLWVyciIgc3R5bGU9ImNvbG9yOiNkYzI2MjY7Zm9udC1zaXplOi43OHJlbTtmbGV4LWJhc2lzOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Ij48L3NwYW4+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImZpbHRlcnMtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+U2VhcmNoPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InNhdmluZ3MtZi1zZWFyY2giIHBsYWNlaG9sZGVyPSJTZWFyY2jigKYiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlR5cGU8L2xhYmVsPgogICAgICA8c2VsZWN0IGlkPSJzYXZpbmdzLWYtdHlwZSI+CiAgICAgICAgPG9wdGlvbiB2YWx1ZT0iIj5BbGwgVHlwZXM8L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSJkZXBvc2l0Ij5EZXBvc2l0czwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9IndpdGhkcmF3YWwiPldpdGhkcmF3YWxzPC9vcHRpb24+CiAgICAgIDwvc2VsZWN0PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+RnJvbTwvbGFiZWw+PGlucHV0IHR5cGU9ImRhdGUiIGlkPSJzYXZpbmdzLWYtZnJvbSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+VG88L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0ic2F2aW5ncy1mLXRvIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZpbHRlci1hY3Rpb25zIj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJzYXZpbmdzLWJ0bi1jbHItZmlsdGVyIj5DbGVhcjwvYnV0dG9uPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWV4cG9ydCBidG4tc20iIGlkPSJzYXZpbmdzLWJ0bi1leHBvcnQiPiYjeDJCMDc7IEV4cG9ydCBDU1Y8L2J1dHRvbj4KICAgIDwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJub3Rlcy1jYXJkIj4KICAgIDxkaXYgY2xhc3M9Im5vdGVzLWhkciI+PHNwYW4+JiN4MUY0REQ7IE5vdGVzPC9zcGFuPjxzbWFsbD5hdXRvLXNhdmVkPC9zbWFsbD48L2Rpdj4KICAgIDx0ZXh0YXJlYSBpZD0ic2F2aW5ncy1ub3RlcyIgcGxhY2Vob2xkZXI9IkpvdCBkb3duIGFueXRoaW5nIOKAlCBhY2NvdW50IG51bWJlciwgcm91dGluZyBudW1iZXIsIHJlbWluZGVyc+KApiIgcm93cz0iMiI+PC90ZXh0YXJlYT4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0idGFibGUtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJ0YWJsZS1oZHIiPgogICAgICA8aDI+VHJhbnNhY3Rpb25zPC9oMj4KICAgICAgPGRpdiBjbGFzcz0idGhyIj4KICAgICAgICA8c3BhbiBpZD0ic2F2aW5ncy1yb3ctY291bnQiPjAgdHJhbnNhY3Rpb25zPC9zcGFuPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tdW5jbCBidG4tc20iIGlkPSJzYXZpbmdzLWJ0bi11bmNsIj4mI3gyNkEwOyBVbmNsZWFyZWQgRmlyc3Q8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWRhbmdlciBidG4tc20iIGlkPSJzYXZpbmdzLWJ0bi1jbHItYWxsIj5DbGVhciBBbGw8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InRzY3JvbGwiPgogICAgICA8dGFibGUgaWQ9InNhdmluZ3MtdGFibGUiPjx0aGVhZCBpZD0ic2F2aW5ncy1oZWFkIj48L3RoZWFkPjx0Ym9keSBpZD0ic2F2aW5ncy1ib2R5Ij48L3Rib2R5PjwvdGFibGU+CiAgICAgIDxkaXYgaWQ9InNhdmluZ3MtZW1wdHkiIGNsYXNzPSJlbXB0eS1zdGF0ZSI+PGRpdiBjbGFzcz0iaWNvbiI+JiN4MUYzRTY7PC9kaXY+PHA+Tm8gdHJhbnNhY3Rpb25zIHlldC48L3A+PC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj4KCjwvZGl2PjwhLS0gL3NhdmluZ3MtcGFuZSAtLT4KCjxkaXYgaWQ9Imh5c2EtcGFuZSIgY2xhc3M9InBhZ2UtYm9keSIgc3R5bGU9ImRpc3BsYXk6bm9uZTsiPgoKICA8ZGl2IGNsYXNzPSJmb3JtLWNhcmQiIHN0eWxlPSJqdXN0aWZ5LWNvbnRlbnQ6ZmxleC1zdGFydDsiPgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPk9wZW5pbmcgQmFsYW5jZSAoJCk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJoeXNhLW9wZW4iIHBsYWNlaG9sZGVyPSIwLjAwIiBzdGVwPSIwLjAxIiBtaW49IjAiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZm9ybS1hY3Rpb25zIj48ZGl2IGNsYXNzPSJmbCI+PGxhYmVsIHN0eWxlPSJjb2xvcjp0cmFuc3BhcmVudDsiPi48L2xhYmVsPjxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJoeXNhLWJ0bi1zZXQtb3BlbiI+U2V0PC9idXR0b24+PC9kaXY+PC9kaXY+CiAgICA8c3BhbiBpZD0iaHlzYS1vcGVuLW5vdGUiIHN0eWxlPSJmb250LXNpemU6Ljc1cmVtO2NvbG9yOiM2NDc0OGI7YWxpZ24tc2VsZjpmbGV4LWVuZDtwYWRkaW5nLWJvdHRvbTo3cHg7Ij48L3NwYW4+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9InN1bW1hcnktNCI+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIGJhbCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gxRjRCMDsgQWNjb3VudCBCYWxhbmNlPC9kaXY+PGRpdiBjbGFzcz0idmFsIiBpZD0iaHlzYS1zLWJhbCI+JDAuMDA8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQgcmV0Ij48ZGl2IGNsYXNzPSJsYmwiPiYjeDI3MTM7IENsZWFyZWQgQmFsYW5jZTwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9Imh5c2Etcy1jbHIiPiQwLjAwPC9kaXY+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjYXJkIHVuY2wtcmV0Ij48ZGl2IGNsYXNzPSJsYmwiPiYjeDI2QTA7IFBlbmRpbmcgRGVwb3NpdHM8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJoeXNhLXMtcGRlcCI+JDAuMDA8L2Rpdj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImNhcmQgdW5jbCI+PGRpdiBjbGFzcz0ibGJsIj4mI3gyNkEwOyBQZW5kaW5nIFdpdGhkcmF3YWxzPC9kaXY+PGRpdiBjbGFzcz0idmFsIiBpZD0iaHlzYS1zLXB3dGgiPiQwLjAwPC9kaXY+PC9kaXY+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImZvcm0tY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+RGF0ZTwvbGFiZWw+PGlucHV0IHR5cGU9ImRhdGUiIGlkPSJoeXNhLWRhdGUiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZmQgZmwiPjxsYWJlbD5EZXNjcmlwdGlvbjwvbGFiZWw+PGlucHV0IHR5cGU9InRleHQiIGlkPSJoeXNhLWRlc2MiIHBsYWNlaG9sZGVyPSJlLmcuIFRyYW5zZmVyLCBJbnRlcmVzdOKApiIgbWF4bGVuZ3RoPSIxMDAiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkFtb3VudCAoJCk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJoeXNhLWFtdCIgcGxhY2Vob2xkZXI9IjAuMDAiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj4KICAgICAgPGxhYmVsPkNhdGVnb3J5PC9sYWJlbD4KICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo0cHg7Ij4KICAgICAgICA8c2VsZWN0IGlkPSJoeXNhLWNhdCIgc3R5bGU9ImZsZXg6MTttaW4td2lkdGg6MDsiPjwvc2VsZWN0PgogICAgICAgIDxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJoeXNhLWNhdC1hbXQiIHBsYWNlaG9sZGVyPSIkIGFtdCIgbWluPSIwIiBzdGVwPSIwLjAxIiBzdHlsZT0id2lkdGg6NzJweDtwYWRkaW5nOjZweCA0cHg7Zm9udC1zaXplOi44cmVtO2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTtib3JkZXItcmFkaXVzOjVweDtvdXRsaW5lOm5vbmU7Y29sb3I6IzFlMjkzYjsiPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tc20iIGlkPSJoeXNhLWJ0bi1hZGQtY2F0LWNoaXAiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDlweDtiYWNrZ3JvdW5kOiMyNTYzZWI7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo2MDA7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0iaHlzYS1idG4tc2hvdy1jYXQiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDEwcHg7YmFja2dyb3VuZDojZjFmNWY5O2NvbG9yOiM0NzU1Njk7Ym9yZGVyOjFweCBzb2xpZCAjY2JkNWUxO2ZvbnQtd2VpZ2h0OjcwMDsiIHRpdGxlPSJOZXcgY2F0ZWdvcnkiPis8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgaWQ9Imh5c2EtYWRkLWNoaXBzIiBjbGFzcz0iY2F0LWNoaXBzIj48L2Rpdj4KICAgICAgPGRpdiBpZD0iaHlzYS1jYXQtcm93IiBzdHlsZT0iZGlzcGxheTpub25lO21hcmdpbi10b3A6NHB4O2dhcDo0cHg7Ij4KICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgaWQ9Imh5c2EtbmV3LWNhdCIgcGxhY2Vob2xkZXI9Ik5ldyBjYXRlZ29yeeKApiIgbWF4bGVuZ3RoPSI0MCIKICAgICAgICAgIHN0eWxlPSJmbGV4OjE7cGFkZGluZzo1cHggOHB4O2ZvbnQtc2l6ZTouOHJlbTtib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7Ym9yZGVyLXJhZGl1czo1cHg7b3V0bGluZTpub25lO2NvbG9yOiMxZTI5M2I7Ij4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0iaHlzYS1idG4tc2F2ZS1jYXQiIHN0eWxlPSJiYWNrZ3JvdW5kOiMyNTYzZWI7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo2MDA7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXNtIiBpZD0iaHlzYS1idG4tY2FuY2VsLWNhdCIgc3R5bGU9ImJhY2tncm91bmQ6I2YxZjVmOTtjb2xvcjojNDc1NTY5O2JvcmRlcjoxcHggc29saWQgI2NiZDVlMTsiPiYjeDI3MTU7PC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGlkPSJoeXNhLWNhdC1kZWwtbGlzdCIgY2xhc3M9ImNhdC1jaGlwcyIgc3R5bGU9ImRpc3BsYXk6bm9uZTttYXJnaW4tdG9wOjJweDsiPjwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmdCBmbCI+CiAgICAgIDxsYWJlbD5UeXBlPC9sYWJlbD4KICAgICAgPGRpdiBjbGFzcz0idHlwZS10b2dnbGUiPgogICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0iaHlzYS10eXBlIiBpZD0iaHlzYS1kZXAiIHZhbHVlPSJkZXBvc2l0IiBjaGVja2VkPgogICAgICAgIDxsYWJlbCBmb3I9Imh5c2EtZGVwIiBjbGFzcz0icmwiPiYjeDJCMDY7IERlcG9zaXQ8L2xhYmVsPgogICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0iaHlzYS10eXBlIiBpZD0iaHlzYS13dGgiIHZhbHVlPSJ3aXRoZHJhd2FsIj4KICAgICAgICA8bGFiZWwgZm9yPSJoeXNhLXd0aCIgY2xhc3M9ImVsIj4mI3gyQjA3OyBXaXRoZHJhd2FsPC9sYWJlbD4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZvcm0tYWN0aW9ucyI+CiAgICAgIDxkaXYgY2xhc3M9ImZsIj48bGFiZWwgc3R5bGU9ImNvbG9yOnRyYW5zcGFyZW50OyI+LjwvbGFiZWw+PGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IiBpZD0iaHlzYS1idG4tYWRkIj4rIEFkZDwvYnV0dG9uPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmbCIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpmbGV4LWVuZDtnYXA6NHB4OyI+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJoeXNhLWNhbS1idG4iIHRpdGxlPSJUYWtlIHBob3RvIj4mI3gxRjRGNzs8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IGJ0bi1zbSIgaWQ9Imh5c2EtbGliLWJ0biIgdGl0bGU9IkNob29zZSBmcm9tIGxpYnJhcnkiPiYjeDFGNUJDOzwvYnV0dG9uPgogICAgICAgIDxpbWcgaWQ9Imh5c2EtcGhvdG8tdGh1bWIiIHNyYz0iIiBzdHlsZT0iZGlzcGxheTpub25lO2hlaWdodDozMHB4O2JvcmRlci1yYWRpdXM6M3B4O2N1cnNvcjpwb2ludGVyO2JvcmRlcjoxcHggc29saWQgI2UwZTRlYTsiIHRpdGxlPSJUYXAgdG8gcmVtb3ZlIj4KICAgICAgICA8aW5wdXQgdHlwZT0iZmlsZSIgaWQ9Imh5c2EtY2FtLWlucCIgYWNjZXB0PSJpbWFnZS8qIiBjYXB0dXJlPSJlbnZpcm9ubWVudCIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgICAgPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJoeXNhLWxpYi1pbnAiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgICA8c3BhbiBpZD0iaHlzYS1mb3JtLWVyciIgc3R5bGU9ImNvbG9yOiNkYzI2MjY7Zm9udC1zaXplOi43OHJlbTtmbGV4LWJhc2lzOjEwMCU7dGV4dC1hbGlnbjpjZW50ZXI7Ij48L3NwYW4+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImZpbHRlcnMtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+U2VhcmNoPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9Imh5c2EtZi1zZWFyY2giIHBsYWNlaG9sZGVyPSJTZWFyY2jigKYiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlR5cGU8L2xhYmVsPgogICAgICA8c2VsZWN0IGlkPSJoeXNhLWYtdHlwZSI+CiAgICAgICAgPG9wdGlvbiB2YWx1ZT0iIj5BbGwgVHlwZXM8L29wdGlvbj4KICAgICAgICA8b3B0aW9uIHZhbHVlPSJkZXBvc2l0Ij5EZXBvc2l0czwvb3B0aW9uPgogICAgICAgIDxvcHRpb24gdmFsdWU9IndpdGhkcmF3YWwiPldpdGhkcmF3YWxzPC9vcHRpb24+CiAgICAgIDwvc2VsZWN0PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+RnJvbTwvbGFiZWw+PGlucHV0IHR5cGU9ImRhdGUiIGlkPSJoeXNhLWYtZnJvbSI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+VG88L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0iaHlzYS1mLXRvIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9ImZpbHRlci1hY3Rpb25zIj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCBidG4tc20iIGlkPSJoeXNhLWJ0bi1jbHItZmlsdGVyIj5DbGVhcjwvYnV0dG9uPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWV4cG9ydCBidG4tc20iIGlkPSJoeXNhLWJ0bi1leHBvcnQiPiYjeDJCMDc7IEV4cG9ydCBDU1Y8L2J1dHRvbj4KICAgIDwvZGl2PgogIDwvZGl2PgoKICA8ZGl2IGNsYXNzPSJub3Rlcy1jYXJkIj4KICAgIDxkaXYgY2xhc3M9Im5vdGVzLWhkciI+PHNwYW4+JiN4MUY0REQ7IE5vdGVzPC9zcGFuPjxzbWFsbD5hdXRvLXNhdmVkPC9zbWFsbD48L2Rpdj4KICAgIDx0ZXh0YXJlYSBpZD0iaHlzYS1ub3RlcyIgcGxhY2Vob2xkZXI9IkpvdCBkb3duIGFueXRoaW5nIOKAlCBhY2NvdW50IG51bWJlciwgcm91dGluZyBudW1iZXIsIHJlbWluZGVyc+KApiIgcm93cz0iMiI+PC90ZXh0YXJlYT4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0idGFibGUtY2FyZCI+CiAgICA8ZGl2IGNsYXNzPSJ0YWJsZS1oZHIiPgogICAgICA8aDI+VHJhbnNhY3Rpb25zPC9oMj4KICAgICAgPGRpdiBjbGFzcz0idGhyIj4KICAgICAgICA8c3BhbiBpZD0iaHlzYS1yb3ctY291bnQiPjAgdHJhbnNhY3Rpb25zPC9zcGFuPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tdW5jbCBidG4tc20iIGlkPSJoeXNhLWJ0bi11bmNsIj4mI3gyNkEwOyBVbmNsZWFyZWQgRmlyc3Q8L2J1dHRvbj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWRhbmdlciBidG4tc20iIGlkPSJoeXNhLWJ0bi1jbHItYWxsIj5DbGVhciBBbGw8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InRzY3JvbGwiPgogICAgICA8dGFibGUgaWQ9Imh5c2EtdGFibGUiPjx0aGVhZCBpZD0iaHlzYS1oZWFkIj48L3RoZWFkPjx0Ym9keSBpZD0iaHlzYS1ib2R5Ij48L3Rib2R5PjwvdGFibGU+CiAgICAgIDxkaXYgaWQ9Imh5c2EtZW1wdHkiIGNsYXNzPSJlbXB0eS1zdGF0ZSI+PGRpdiBjbGFzcz0iaWNvbiI+JiN4MUYzRTY7PC9kaXY+PHA+Tm8gdHJhbnNhY3Rpb25zIHlldC48L3A+PC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj4KCjwvZGl2PjwhLS0gL2h5c2EtcGFuZSAtLT4KCjwhLS0gQ2hlY2tpbmcgRWRpdCBNb2RhbCAtLT4KPGRpdiBjbGFzcz0ibW9kYWwtb3YiIGlkPSJjaGstZWRpdC1tb2RhbCI+CiAgPGRpdiBjbGFzcz0ibW9kYWwiPgogICAgPGgyPiYjeDI3MEY7JiN4RkUwRjsgRWRpdCBUcmFuc2FjdGlvbjwvaDI+CiAgICA8ZGl2IGNsYXNzPSJtZ3JpZCI+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5EYXRlPC9sYWJlbD48aW5wdXQgdHlwZT0iZGF0ZSIgaWQ9ImNoay1lLWRhdGUiPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+QW1vdW50ICgkKTwvbGFiZWw+PGlucHV0IHR5cGU9Im51bWJlciIgaWQ9ImNoay1lLWFtdCIgbWluPSIwLjAxIiBzdGVwPSIwLjAxIj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmdWxsIGZsIj48bGFiZWw+RGVzY3JpcHRpb248L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iY2hrLWUtZGVzYyIgbWF4bGVuZ3RoPSIxMDAiPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+Q2F0ZWdvcnk8L2xhYmVsPgogICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6NHB4O21hcmdpbi10b3A6MnB4OyI+CiAgICAgICAgICA8c2VsZWN0IGlkPSJjaGstZS1jYXQiIHN0eWxlPSJmbGV4OjE7bWluLXdpZHRoOjA7Ij48L3NlbGVjdD4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJjaGstZS1jYXQtYW10IiBwbGFjZWhvbGRlcj0iJCBhbXQiIG1pbj0iMCIgc3RlcD0iMC4wMSIgc3R5bGU9IndpZHRoOjcycHg7cGFkZGluZzo2cHggNHB4O2ZvbnQtc2l6ZTouOHJlbTtib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7Ym9yZGVyLXJhZGl1czo1cHg7b3V0bGluZTpub25lO2NvbG9yOiMxZTI5M2I7Ij4KICAgICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tcHJpbWFyeSBidG4tc20iIGlkPSJjaGstYnRuLWFkZC1lZGl0LWNoaXAiIHN0eWxlPSJmbGV4LXNocmluazowO3BhZGRpbmc6NnB4IDlweDsiPkFkZDwvYnV0dG9uPgogICAgICAgIDwvZGl2PgogICAgICAgIDxkaXYgaWQ9ImNoay1lZGl0LWNoaXBzIiBjbGFzcz0iY2F0LWNoaXBzIj48L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5UcmlwPC9sYWJlbD48c2VsZWN0IGlkPSJjaGstZS10cmlwIj48L3NlbGVjdD48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCI+CiAgICAgICAgPGxhYmVsPlR5cGU8L2xhYmVsPgogICAgICAgIDxkaXYgY2xhc3M9InR5cGUtdG9nZ2xlIj4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0iY2hrLWUtdHlwZSIgaWQ9ImNoay1lZCIgdmFsdWU9ImRlcG9zaXQiPgogICAgICAgICAgPGxhYmVsIGZvcj0iY2hrLWVkIiBjbGFzcz0icmwiPiYjeDJCMDY7IERlcG9zaXQ8L2xhYmVsPgogICAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJjaGstZS10eXBlIiBpZD0iY2hrLWV3IiB2YWx1ZT0id2l0aGRyYXdhbCI+CiAgICAgICAgICA8bGFiZWwgZm9yPSJjaGstZXciIGNsYXNzPSJlbCI+JiN4MkIwNzsgV2l0aGRyYXdhbDwvbGFiZWw+CiAgICAgICAgPC9kaXY+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O3BhZGRpbmctdG9wOjE4cHg7Ij4KICAgICAgICA8aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJjaGstZS1jbGVhcmVkIiBzdHlsZT0id2lkdGg6MTZweDtoZWlnaHQ6MTZweDthY2NlbnQtY29sb3I6IzE2YTM0YTtjdXJzb3I6cG9pbnRlcjsiPgogICAgICAgIDxsYWJlbCBmb3I9ImNoay1lLWNsZWFyZWQiIHN0eWxlPSJmb250LXNpemU6Ljg0cmVtO2NvbG9yOiMxZTI5M2I7dGV4dC10cmFuc2Zvcm06bm9uZTtsZXR0ZXItc3BhY2luZzowO2ZvbnQtd2VpZ2h0OjUwMDtjdXJzb3I6cG9pbnRlcjsiPkNsZWFyZWQ8L2xhYmVsPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ibWZvb3RlciI+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJjaGstYnRuLWNhbmNlbC1lZGl0Ij5DYW5jZWw8L2J1dHRvbj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IiBpZD0iY2hrLWJ0bi1zYXZlLWVkaXQiPlNhdmUgQ2hhbmdlczwvYnV0dG9uPgogICAgPC9kaXY+CiAgICA8ZGl2IGlkPSJjaGstZWRpdC1lcnIiIHN0eWxlPSJjb2xvcjojZGMyNjI2O2ZvbnQtc2l6ZTouNzhyZW07bWFyZ2luLXRvcDo4cHg7dGV4dC1hbGlnbjpyaWdodDsiPjwvZGl2PgogIDwvZGl2Pgo8L2Rpdj4KCjwhLS0gTWlrZSdzIENoZWNraW5nIEVkaXQgTW9kYWwgLS0+CjxkaXYgY2xhc3M9Im1vZGFsLW92IiBpZD0ibWlrZS1lZGl0LW1vZGFsIj4KICA8ZGl2IGNsYXNzPSJtb2RhbCI+CiAgICA8aDI+JiN4MjcwRjsmI3hGRTBGOyBFZGl0IFRyYW5zYWN0aW9uPC9oMj4KICAgIDxkaXYgY2xhc3M9Im1ncmlkIj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkRhdGU8L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0ibWlrZS1lLWRhdGUiPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+QW1vdW50ICgkKTwvbGFiZWw+PGlucHV0IHR5cGU9Im51bWJlciIgaWQ9Im1pa2UtZS1hbXQiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZnVsbCBmbCI+PGxhYmVsPkRlc2NyaXB0aW9uPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9Im1pa2UtZS1kZXNjIiBtYXhsZW5ndGg9IjEwMCI+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5DYXRlZ29yeTwvbGFiZWw+CiAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo0cHg7bWFyZ2luLXRvcDoycHg7Ij4KICAgICAgICAgIDxzZWxlY3QgaWQ9Im1pa2UtZS1jYXQiIHN0eWxlPSJmbGV4OjE7bWluLXdpZHRoOjA7Ij48L3NlbGVjdD4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJtaWtlLWUtY2F0LWFtdCIgcGxhY2Vob2xkZXI9IiQgYW10IiBtaW49IjAiIHN0ZXA9IjAuMDEiIHN0eWxlPSJ3aWR0aDo3MnB4O3BhZGRpbmc6NnB4IDRweDtmb250LXNpemU6LjhyZW07Ym9yZGVyOjFweCBzb2xpZCAjY2JkNWUxO2JvcmRlci1yYWRpdXM6NXB4O291dGxpbmU6bm9uZTtjb2xvcjojMWUyOTNiOyI+CiAgICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkgYnRuLXNtIiBpZD0ibWlrZS1idG4tYWRkLWVkaXQtY2hpcCIgc3R5bGU9ImZsZXgtc2hyaW5rOjA7cGFkZGluZzo2cHggOXB4OyI+QWRkPC9idXR0b24+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBpZD0ibWlrZS1lZGl0LWNoaXBzIiBjbGFzcz0iY2F0LWNoaXBzIj48L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5UcmlwPC9sYWJlbD48c2VsZWN0IGlkPSJtaWtlLWUtdHJpcCI+PC9zZWxlY3Q+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPgogICAgICAgIDxsYWJlbD5UeXBlPC9sYWJlbD4KICAgICAgICA8ZGl2IGNsYXNzPSJ0eXBlLXRvZ2dsZSI+CiAgICAgICAgICA8aW5wdXQgdHlwZT0icmFkaW8iIG5hbWU9Im1pa2UtZS10eXBlIiBpZD0ibWlrZS1lZCIgdmFsdWU9ImRlcG9zaXQiPgogICAgICAgICAgPGxhYmVsIGZvcj0ibWlrZS1lZCIgY2xhc3M9InJsIj4mI3gyQjA2OyBEZXBvc2l0PC9sYWJlbD4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0ibWlrZS1lLXR5cGUiIGlkPSJtaWtlLWV3IiB2YWx1ZT0id2l0aGRyYXdhbCI+CiAgICAgICAgICA8bGFiZWwgZm9yPSJtaWtlLWV3IiBjbGFzcz0iZWwiPiYjeDJCMDc7IFdpdGhkcmF3YWw8L2xhYmVsPgogICAgICAgIDwvZGl2PgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtwYWRkaW5nLXRvcDoxOHB4OyI+CiAgICAgICAgPGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0ibWlrZS1lLWNsZWFyZWQiIHN0eWxlPSJ3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2FjY2VudC1jb2xvcjojMTZhMzRhO2N1cnNvcjpwb2ludGVyOyI+CiAgICAgICAgPGxhYmVsIGZvcj0ibWlrZS1lLWNsZWFyZWQiIHN0eWxlPSJmb250LXNpemU6Ljg0cmVtO2NvbG9yOiMxZTI5M2I7dGV4dC10cmFuc2Zvcm06bm9uZTtsZXR0ZXItc3BhY2luZzowO2ZvbnQtd2VpZ2h0OjUwMDtjdXJzb3I6cG9pbnRlcjsiPkNsZWFyZWQ8L2xhYmVsPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ibWZvb3RlciI+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJtaWtlLWJ0bi1jYW5jZWwtZWRpdCI+Q2FuY2VsPC9idXR0b24+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tcHJpbWFyeSIgaWQ9Im1pa2UtYnRuLXNhdmUtZWRpdCI+U2F2ZSBDaGFuZ2VzPC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgaWQ9Im1pa2UtZWRpdC1lcnIiIHN0eWxlPSJjb2xvcjojZGMyNjI2O2ZvbnQtc2l6ZTouNzhyZW07bWFyZ2luLXRvcDo4cHg7dGV4dC1hbGlnbjpyaWdodDsiPjwvZGl2PgogIDwvZGl2Pgo8L2Rpdj4KCjxkaXYgY2xhc3M9Im1vZGFsLW92IiBpZD0ic2F2aW5ncy1lZGl0LW1vZGFsIj4KICA8ZGl2IGNsYXNzPSJtb2RhbCI+CiAgICA8aDI+JiN4MjcwRjsmI3hGRTBGOyBFZGl0IFRyYW5zYWN0aW9uPC9oMj4KICAgIDxkaXYgY2xhc3M9Im1ncmlkIj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkRhdGU8L2xhYmVsPjxpbnB1dCB0eXBlPSJkYXRlIiBpZD0ic2F2aW5ncy1lLWRhdGUiPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+QW1vdW50ICgkKTwvbGFiZWw+PGlucHV0IHR5cGU9Im51bWJlciIgaWQ9InNhdmluZ3MtZS1hbXQiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZnVsbCBmbCI+PGxhYmVsPkRlc2NyaXB0aW9uPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InNhdmluZ3MtZS1kZXNjIiBtYXhsZW5ndGg9IjEwMCI+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5DYXRlZ29yeTwvbGFiZWw+CiAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDo0cHg7bWFyZ2luLXRvcDoycHg7Ij4KICAgICAgICAgIDxzZWxlY3QgaWQ9InNhdmluZ3MtZS1jYXQiIHN0eWxlPSJmbGV4OjE7bWluLXdpZHRoOjA7Ij48L3NlbGVjdD4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJzYXZpbmdzLWUtY2F0LWFtdCIgcGxhY2Vob2xkZXI9IiQgYW10IiBtaW49IjAiIHN0ZXA9IjAuMDEiIHN0eWxlPSJ3aWR0aDo3MnB4O3BhZGRpbmc6NnB4IDRweDtmb250LXNpemU6LjhyZW07Ym9yZGVyOjFweCBzb2xpZCAjY2JkNWUxO2JvcmRlci1yYWRpdXM6NXB4O291dGxpbmU6bm9uZTtjb2xvcjojMWUyOTNiOyI+CiAgICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkgYnRuLXNtIiBpZD0ic2F2aW5ncy1idG4tYWRkLWVkaXQtY2hpcCIgc3R5bGU9ImZsZXgtc2hyaW5rOjA7cGFkZGluZzo2cHggOXB4OyI+QWRkPC9idXR0b24+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBpZD0ic2F2aW5ncy1lZGl0LWNoaXBzIiBjbGFzcz0iY2F0LWNoaXBzIj48L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5UcmlwPC9sYWJlbD48c2VsZWN0IGlkPSJzYXZpbmdzLWUtdHJpcCI+PC9zZWxlY3Q+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPgogICAgICAgIDxsYWJlbD5UeXBlPC9sYWJlbD4KICAgICAgICA8ZGl2IGNsYXNzPSJ0eXBlLXRvZ2dsZSI+CiAgICAgICAgICA8aW5wdXQgdHlwZT0icmFkaW8iIG5hbWU9InNhdmluZ3MtZS10eXBlIiBpZD0ic2F2aW5ncy1lZCIgdmFsdWU9ImRlcG9zaXQiPgogICAgICAgICAgPGxhYmVsIGZvcj0ic2F2aW5ncy1lZCIgY2xhc3M9InJsIj4mI3gyQjA2OyBEZXBvc2l0PC9sYWJlbD4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0ic2F2aW5ncy1lLXR5cGUiIGlkPSJzYXZpbmdzLWV3IiB2YWx1ZT0id2l0aGRyYXdhbCI+CiAgICAgICAgICA8bGFiZWwgZm9yPSJzYXZpbmdzLWV3IiBjbGFzcz0iZWwiPiYjeDJCMDc7IFdpdGhkcmF3YWw8L2xhYmVsPgogICAgICAgIDwvZGl2PgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCIgc3R5bGU9ImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjhweDtwYWRkaW5nLXRvcDoxOHB4OyI+CiAgICAgICAgPGlucHV0IHR5cGU9ImNoZWNrYm94IiBpZD0ic2F2aW5ncy1lLWNsZWFyZWQiIHN0eWxlPSJ3aWR0aDoxNnB4O2hlaWdodDoxNnB4O2FjY2VudC1jb2xvcjojMTZhMzRhO2N1cnNvcjpwb2ludGVyOyI+CiAgICAgICAgPGxhYmVsIGZvcj0ic2F2aW5ncy1lLWNsZWFyZWQiIHN0eWxlPSJmb250LXNpemU6Ljg0cmVtO2NvbG9yOiMxZTI5M2I7dGV4dC10cmFuc2Zvcm06bm9uZTtsZXR0ZXItc3BhY2luZzowO2ZvbnQtd2VpZ2h0OjUwMDtjdXJzb3I6cG9pbnRlcjsiPkNsZWFyZWQ8L2xhYmVsPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ibWZvb3RlciI+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJzYXZpbmdzLWJ0bi1jYW5jZWwtZWRpdCI+Q2FuY2VsPC9idXR0b24+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tcHJpbWFyeSIgaWQ9InNhdmluZ3MtYnRuLXNhdmUtZWRpdCI+U2F2ZSBDaGFuZ2VzPC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgaWQ9InNhdmluZ3MtZWRpdC1lcnIiIHN0eWxlPSJjb2xvcjojZGMyNjI2O2ZvbnQtc2l6ZTouNzhyZW07bWFyZ2luLXRvcDo4cHg7dGV4dC1hbGlnbjpyaWdodDsiPjwvZGl2PgogIDwvZGl2Pgo8L2Rpdj48IS0tIC9zYXZpbmdzLWVkaXQtbW9kYWwgLS0+Cgo8IS0tIEhZU0EgRWRpdCBNb2RhbCAtLT4KPGRpdiBjbGFzcz0ibW9kYWwtb3YiIGlkPSJoeXNhLWVkaXQtbW9kYWwiPgogIDxkaXYgY2xhc3M9Im1vZGFsIj4KICAgIDxoMj4mI3gyNzBGOyYjeEZFMEY7IEVkaXQgVHJhbnNhY3Rpb248L2gyPgogICAgPGRpdiBjbGFzcz0ibWdyaWQiPgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+RGF0ZTwvbGFiZWw+PGlucHV0IHR5cGU9ImRhdGUiIGlkPSJoeXNhLWUtZGF0ZSI+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5BbW91bnQgKCQpPC9sYWJlbD48aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0iaHlzYS1lLWFtdCIgbWluPSIwLjAxIiBzdGVwPSIwLjAxIj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmdWxsIGZsIj48bGFiZWw+RGVzY3JpcHRpb248L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iaHlzYS1lLWRlc2MiIG1heGxlbmd0aD0iMTAwIj48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPkNhdGVnb3J5PC9sYWJlbD4KICAgICAgICA8ZGl2IHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjRweDttYXJnaW4tdG9wOjJweDsiPgogICAgICAgICAgPHNlbGVjdCBpZD0iaHlzYS1lLWNhdCIgc3R5bGU9ImZsZXg6MTttaW4td2lkdGg6MDsiPjwvc2VsZWN0PgogICAgICAgICAgPGlucHV0IHR5cGU9Im51bWJlciIgaWQ9Imh5c2EtZS1jYXQtYW10IiBwbGFjZWhvbGRlcj0iJCBhbXQiIG1pbj0iMCIgc3RlcD0iMC4wMSIgc3R5bGU9IndpZHRoOjcycHg7cGFkZGluZzo2cHggNHB4O2ZvbnQtc2l6ZTouOHJlbTtib3JkZXI6MXB4IHNvbGlkICNjYmQ1ZTE7Ym9yZGVyLXJhZGl1czo1cHg7b3V0bGluZTpub25lO2NvbG9yOiMxZTI5M2I7Ij4KICAgICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tcHJpbWFyeSBidG4tc20iIGlkPSJoeXNhLWJ0bi1hZGQtZWRpdC1jaGlwIiBzdHlsZT0iZmxleC1zaHJpbms6MDtwYWRkaW5nOjZweCA5cHg7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGlkPSJoeXNhLWVkaXQtY2hpcHMiIGNsYXNzPSJjYXQtY2hpcHMiPjwvZGl2PgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCI+PGxhYmVsPlRyaXA8L2xhYmVsPjxzZWxlY3QgaWQ9Imh5c2EtZS10cmlwIj48L3NlbGVjdD48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZiBmbCI+CiAgICAgICAgPGxhYmVsPlR5cGU8L2xhYmVsPgogICAgICAgIDxkaXYgY2xhc3M9InR5cGUtdG9nZ2xlIj4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJyYWRpbyIgbmFtZT0iaHlzYS1lLXR5cGUiIGlkPSJoeXNhLWVkIiB2YWx1ZT0iZGVwb3NpdCI+CiAgICAgICAgICA8bGFiZWwgZm9yPSJoeXNhLWVkIiBjbGFzcz0icmwiPiYjeDJCMDY7IERlcG9zaXQ8L2xhYmVsPgogICAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJoeXNhLWUtdHlwZSIgaWQ9Imh5c2EtZXciIHZhbHVlPSJ3aXRoZHJhd2FsIj4KICAgICAgICAgIDxsYWJlbCBmb3I9Imh5c2EtZXciIGNsYXNzPSJlbCI+JiN4MkIwNzsgV2l0aGRyYXdhbDwvbGFiZWw+CiAgICAgICAgPC9kaXY+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6OHB4O3BhZGRpbmctdG9wOjE4cHg7Ij4KICAgICAgICA8aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJoeXNhLWUtY2xlYXJlZCIgc3R5bGU9IndpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7YWNjZW50LWNvbG9yOiMxNmEzNGE7Y3Vyc29yOnBvaW50ZXI7Ij4KICAgICAgICA8bGFiZWwgZm9yPSJoeXNhLWUtY2xlYXJlZCIgc3R5bGU9ImZvbnQtc2l6ZTouODRyZW07Y29sb3I6IzFlMjkzYjt0ZXh0LXRyYW5zZm9ybTpub25lO2xldHRlci1zcGFjaW5nOjA7Zm9udC13ZWlnaHQ6NTAwO2N1cnNvcjpwb2ludGVyOyI+Q2xlYXJlZDwvbGFiZWw+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJtZm9vdGVyIj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCIgaWQ9Imh5c2EtYnRuLWNhbmNlbC1lZGl0Ij5DYW5jZWw8L2J1dHRvbj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IiBpZD0iaHlzYS1idG4tc2F2ZS1lZGl0Ij5TYXZlIENoYW5nZXM8L2J1dHRvbj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0iaHlzYS1lZGl0LWVyciIgc3R5bGU9ImNvbG9yOiNkYzI2MjY7Zm9udC1zaXplOi43OHJlbTttYXJnaW4tdG9wOjhweDt0ZXh0LWFsaWduOnJpZ2h0OyI+PC9kaXY+CiAgPC9kaXY+CjwvZGl2PjwhLS0gL2h5c2EtZWRpdC1tb2RhbCAtLT4KCjwhLS0gUmVjZWlwdCBTY2FubmVyIE1vZGFsIC0tPgo8ZGl2IGNsYXNzPSJtb2RhbC1vdiIgaWQ9InNjYW4tbW9kYWwiPgogIDxkaXYgY2xhc3M9Im1vZGFsIiBzdHlsZT0ibWF4LXdpZHRoOjQ4MHB4OyI+CiAgICA8aDI+JiN4MUY0Rjc7IFNjYW4gUmVjZWlwdDwvaDI+CiAgICA8ZGl2IGNsYXNzPSJzY2FuLW1vZGFsLWJvZHkiPgoKICAgICAgPCEtLSBTdGF0ZSAxOiB1cGxvYWQgLyBkcm9wIC0tPgogICAgICA8ZGl2IGlkPSJzY2FuLXMtdXBsb2FkIj4KICAgICAgICA8ZGl2IGNsYXNzPSJzY2FuLWRyb3Atem9uZSIgaWQ9InNjYW4tZHJvcCI+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJzY2FuLWRyb3AtaWNvbiI+JiN4MUY5RkU7PC9kaXY+CiAgICAgICAgICA8cD5Ecm9wIGEgcmVjZWlwdCBpbWFnZSBoZXJlLCBvcjwvcD4KICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6OHB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7ZmxleC13cmFwOndyYXA7Ij4KICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IiBpZD0ic2Nhbi1jYW1lcmEtYnRuIj4mI3gxRjRGNzsgVGFrZSBQaG90bzwvYnV0dG9uPgogICAgICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IiBpZD0ic2Nhbi1saWJyYXJ5LWJ0biI+JiN4MUY1QkM7IENob29zZSBmcm9tIExpYnJhcnk8L2J1dHRvbj4KICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJzY2FuLWZpbGUtY2FtZXJhIiBhY2NlcHQ9ImltYWdlLyoiIGNhcHR1cmU9ImVudmlyb25tZW50IiBzdHlsZT0iZGlzcGxheTpub25lIj4KICAgICAgICAgIDxpbnB1dCB0eXBlPSJmaWxlIiBpZD0ic2Nhbi1maWxlLWxpYnJhcnkiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICAgICAgICA8cCBjbGFzcz0ic2Nhbi1oaW50Ij5Xb3JrcyBvbiBtb2JpbGUgY2FtZXJhLCBzY3JlZW5zaG90cyAmYW1wOyBzY2FubmVkIHJlY2VpcHRzPC9wPgogICAgICAgIDwvZGl2PgogICAgICA8L2Rpdj4KCiAgICAgIDwhLS0gU3RhdGUgMjogcHJvY2Vzc2luZyAtLT4KICAgICAgPGRpdiBpZD0ic2Nhbi1zLXByb2MiIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ij4KICAgICAgICA8aW1nIGlkPSJzY2FuLXByZXYtaW1nIiBjbGFzcz0ic2Nhbi1wcmV2aWV3LWltZyIgYWx0PSJyZWNlaXB0IHByZXZpZXciPgogICAgICAgIDxkaXYgY2xhc3M9InNjYW4tcHJvZy13cmFwIiBzdHlsZT0ibWFyZ2luLXRvcDoxMnB4OyI+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJzY2FuLXN0YXR1cy10eHQiIGlkPSJzY2FuLXN0YXR1cyI+UmVhZGluZyByZWNlaXB04oCmPC9kaXY+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJzY2FuLWJhciI+PGRpdiBjbGFzcz0ic2Nhbi1maWxsIiBpZD0ic2Nhbi1maWxsIiBzdHlsZT0id2lkdGg6MCUiPjwvZGl2PjwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICA8L2Rpdj4KCiAgICAgIDwhLS0gU3RhdGUgMzogcmVzdWx0cyAtLT4KICAgICAgPGRpdiBpZD0ic2Nhbi1zLXJlcyIgc3R5bGU9ImRpc3BsYXk6bm9uZTsiPgogICAgICAgIDxpbWcgaWQ9InNjYW4tcmVzLWltZyIgY2xhc3M9InNjYW4tcHJldmlldy1pbWciIGFsdD0icmVjZWlwdCIgc3R5bGU9Im1heC1oZWlnaHQ6MTQwcHg7bWFyZ2luLWJvdHRvbToxMnB4OyI+CiAgICAgICAgPGRpdiBjbGFzcz0ic2Nhbi1yZXN1bHQtZmllbGRzIj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImYiPjxsYWJlbD5EYXRlPC9sYWJlbD48aW5wdXQgdHlwZT0iZGF0ZSIgaWQ9InNjYW4tci1kYXRlIj48L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImYiPjxsYWJlbD5BbW91bnQgKCQpPC9sYWJlbD48aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0ic2Nhbi1yLWFtdCIgc3RlcD0iMC4wMSIgbWluPSIwLjAxIiBwbGFjZWhvbGRlcj0iMC4wMCI+PC9kaXY+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJmZCI+PGxhYmVsPk1lcmNoYW50IC8gRGVzY3JpcHRpb248L2xhYmVsPjxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0ic2Nhbi1yLWRlc2MiIG1heGxlbmd0aD0iMTAwIj48L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImYiPjxsYWJlbD5DYXRlZ29yeTwvbGFiZWw+PHNlbGVjdCBpZD0ic2Nhbi1yLWNhdCI+PC9zZWxlY3Q+PC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBzdHlsZT0ibWFyZ2luLXRvcDoxMHB4OyI+CiAgICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IGJ0bi1zbSIgaWQ9InNjYW4tcmF3LXRvZ2dsZS1idG4iPlNob3cgcmF3IE9DUiB0ZXh0PC9idXR0b24+CiAgICAgICAgICA8cHJlIGNsYXNzPSJzY2FuLXJhdy1wcmUiIGlkPSJzY2FuLXJhdy1wcmUiIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ij48L3ByZT4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGlkPSJzY2FuLXJlcy1lcnIiIHN0eWxlPSJjb2xvcjojZGMyNjI2O2ZvbnQtc2l6ZTouNzhyZW07bWFyZ2luLXRvcDo2cHg7Ij48L2Rpdj4KICAgICAgPC9kaXY+CgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJtZm9vdGVyIiBzdHlsZT0ibWFyZ2luLXRvcDoxNnB4OyI+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJzY2FuLWNhbmNlbC1idG4iPkNhbmNlbDwvYnV0dG9uPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IiBpZD0ic2Nhbi1yZXRyeS1idG4iIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ij4mI3gyMUJBOyBUcnkgQW5vdGhlcjwvYnV0dG9uPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkiIGlkPSJzY2FuLXVzZS1idG4iIHN0eWxlPSJkaXNwbGF5Om5vbmU7Ij4mI3gyNzEzOyBVc2UgVGhlc2UgVmFsdWVzPC9idXR0b24+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC9kaXY+Cgo8IS0tIFJlY2VpcHQgQXR0YWNoIE1vZGFsIC0tPgo8ZGl2IGNsYXNzPSJtb2RhbC1vdiIgaWQ9InJjcHQtYXR0YWNoLW1vZGFsIj4KICA8ZGl2IGNsYXNzPSJtb2RhbCIgc3R5bGU9Im1heC13aWR0aDozNDBweDsiPgogICAgPGgyPiYjeDFGNENFOyBBdHRhY2ggUmVjZWlwdDwvaDI+CiAgICA8cCBzdHlsZT0iY29sb3I6IzY0NzQ4Yjtmb250LXNpemU6Ljg1cmVtO21hcmdpbjo4cHggMCAxNnB4OyI+U2F2ZSBhIHBob3RvIG9mIHRoZSByZWNlaXB0IHdpdGggdGhpcyB0cmFuc2FjdGlvbi48L3A+CiAgICA8ZGl2IHN0eWxlPSJkaXNwbGF5OmZsZXg7Z2FwOjEwcHg7ZmxleC13cmFwOndyYXA7anVzdGlmeS1jb250ZW50OmNlbnRlcjsiPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkiIGlkPSJyY3B0LWNhbWVyYS1idG4iPiYjeDFGNEY3OyBUYWtlIFBob3RvPC9idXR0b24+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJyY3B0LWxpYnJhcnktYnRuIj4mI3gxRjVCQzsgQ2hvb3NlIGZyb20gTGlicmFyeTwvYnV0dG9uPgogICAgPC9kaXY+CiAgICA8aW5wdXQgdHlwZT0iZmlsZSIgaWQ9InJjcHQtY2FtZXJhLWlucCIgYWNjZXB0PSJpbWFnZS8qIiBjYXB0dXJlPSJlbnZpcm9ubWVudCIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICA8aW5wdXQgdHlwZT0iZmlsZSIgaWQ9InJjcHQtbGlicmFyeS1pbnAiIGFjY2VwdD0iaW1hZ2UvKiIgc3R5bGU9ImRpc3BsYXk6bm9uZSI+CiAgICA8ZGl2IGNsYXNzPSJtZm9vdGVyIiBzdHlsZT0ibWFyZ2luLXRvcDoxOHB4OyI+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJyY3B0LWNhbmNlbC1idG4iPkNhbmNlbDwvYnV0dG9uPgogICAgPC9kaXY+CiAgPC9kaXY+CjwvZGl2PgoKPCEtLSBSZWNlaXB0IFZpZXcgTW9kYWwgLS0+CjxkaXYgY2xhc3M9Im1vZGFsLW92IiBpZD0icmNwdC12aWV3LW1vZGFsIj4KICA8ZGl2IGNsYXNzPSJtb2RhbCIgc3R5bGU9Im1heC13aWR0aDo1MDBweDsiPgogICAgPGgyPiYjeDFGOUZFOyBSZWNlaXB0PC9oMj4KICAgIDxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO21hcmdpbjoxMHB4IDA7Ij4KICAgICAgPGltZyBpZD0icmNwdC12aWV3LWltZyIgc3R5bGU9Im1heC13aWR0aDoxMDAlO21heC1oZWlnaHQ6NTh2aDtib3JkZXItcmFkaXVzOjZweDtib3JkZXI6MXB4IHNvbGlkICNlMGU0ZWE7IiBzcmM9IiIgYWx0PSJSZWNlaXB0Ij4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ibWZvb3RlciI+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZGFuZ2VyIiBpZD0icmNwdC1yZW1vdmUtYnRuIj4mI3gxRjVEMTsgUmVtb3ZlPC9idXR0b24+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJyY3B0LXZpZXctY2xvc2UiPkNsb3NlPC9idXR0b24+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC9kaXY+Cgo8IS0tIFRyaXAgTW9kYWwgLS0+CjxkaXYgY2xhc3M9Im1vZGFsLW92IiBpZD0idHJpcC1tb2RhbCI+CiAgPGRpdiBjbGFzcz0ibW9kYWwiIHN0eWxlPSJtYXgtd2lkdGg6NDQwcHg7Ij4KICAgIDxoMj4mI3gyNzA4OyYjeEZFMEY7IFRyaXAgTW9kZTwvaDI+CiAgICA8ZGl2IGlkPSJ0cmlwLXMtbm9uZSI+CiAgICAgIDxwIHN0eWxlPSJjb2xvcjojNjQ3NDhiO2ZvbnQtc2l6ZTouODVyZW07bWFyZ2luLWJvdHRvbToxNHB4OyI+VHJhY2sgc3BlbmRpbmcgYWNyb3NzIGFsbCBhY2NvdW50cyBmb3IgYSB0cmlwLiBUcmFuc2FjdGlvbnMgYWRkZWQgd2hpbGUgYSB0cmlwIGlzIGFjdGl2ZSBhcmUgYXV0b21hdGljYWxseSB0YWdnZWQuPC9wPgogICAgICA8ZGl2IGNsYXNzPSJmIiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo4cHg7Ij48bGFiZWw+VHJpcCBOYW1lPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9InRyaXAtbmFtZS1pbnAiIHBsYWNlaG9sZGVyPSJlLmcuIFZlZ2FzIEp1bHkgMjAyNiIgbWF4bGVuZ3RoPSI2MCIgc3R5bGU9IndpZHRoOjEwMCU7Ij48L2Rpdj4KICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2dhcDoxMHB4O21hcmdpbi1ib3R0b206OHB4OyI+CiAgICAgICAgPGRpdiBjbGFzcz0iZiIgc3R5bGU9ImZsZXg6MTsiPjxsYWJlbD5TdGFydCBEYXRlPC9sYWJlbD48aW5wdXQgdHlwZT0iZGF0ZSIgaWQ9InRyaXAtc3RhcnQtaW5wIiBzdHlsZT0id2lkdGg6MTAwJTsiPjwvZGl2PgogICAgICAgIDxkaXYgY2xhc3M9ImYiIHN0eWxlPSJmbGV4OjE7Ij48bGFiZWw+QnVkZ2V0IChvcHRpb25hbCk8L2xhYmVsPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJ0cmlwLWJ1ZGdldC1pbnAiIHBsYWNlaG9sZGVyPSIwLjAwIiBtaW49IjAiIHN0ZXA9IjAuMDEiIHN0eWxlPSJ3aWR0aDoxMDAlOyI+PC9kaXY+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGlkPSJ0cmlwLW5vbmUtZXJyIiBzdHlsZT0iY29sb3I6I2RjMjYyNjtmb250LXNpemU6Ljc4cmVtO21pbi1oZWlnaHQ6MXJlbTsiPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJtZm9vdGVyIj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IiBpZD0idHJpcC1jbG9zZS1idG4iPkNhbmNlbDwvYnV0dG9uPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJ0cmlwLWhpc3RvcnktYnRuIj4mI3gxRjRDQjsgUGFzdCBUcmlwczwvYnV0dG9uPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tcHJpbWFyeSIgaWQ9InRyaXAtc3RhcnQtYnRuIj5TdGFydCBUcmlwPC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgICA8ZGl2IGlkPSJ0cmlwLXMtYWN0aXZlIiBzdHlsZT0iZGlzcGxheTpub25lOyI+CiAgICAgIDxkaXYgaWQ9InRyaXAtYWN0aXZlLWhlYWRlciI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InRyaXAtYnVkZ2V0LWJhciI+PC9kaXY+CiAgICAgIDxkaXYgaWQ9InRyaXAtY2F0LWxpc3QiPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJtZm9vdGVyIj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWdob3N0IiBpZD0idHJpcC1jbG9zZS1idG4yIj5DbG9zZTwvYnV0dG9uPgogICAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZGFuZ2VyIiBpZD0idHJpcC1lbmQtYnRuIj4mI3gxRjNDMTsgRW5kIFRyaXA8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgaWQ9InRyaXAtcy1oaXN0b3J5IiBzdHlsZT0iZGlzcGxheTpub25lOyI+CiAgICAgIDxkaXYgaWQ9InRyaXAtaGlzdG9yeS1saXN0IiBzdHlsZT0ibWF4LWhlaWdodDozNDBweDtvdmVyZmxvdy15OmF1dG87Ij48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0ibWZvb3RlciI+PGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCIgaWQ9InRyaXAtYmFjay1idG4iPiYjeDIxOTA7IEJhY2s8L2J1dHRvbj48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0idHJpcC1zLWRldGFpbCIgc3R5bGU9ImRpc3BsYXk6bm9uZTsiPgogICAgICA8ZGl2IGlkPSJ0cmlwLWRldGFpbC1jb250ZW50IiBzdHlsZT0ibWF4LWhlaWdodDo0MjBweDtvdmVyZmxvdy15OmF1dG87Ij48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0ibWZvb3RlciI+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1naG9zdCIgaWQ9InRyaXAtZGV0YWlsLWJhY2stYnRuIj4mI3gyMTkwOyBCYWNrPC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1kYW5nZXIgYnRuLXNtIiBpZD0idHJpcC1kZWxldGUtYnRuIj5EZWxldGU8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC9kaXY+Cgo8IS0tIEVkaXQgTW9kYWwgLS0+CjxkaXYgY2xhc3M9Im1vZGFsLW92IiBpZD0iZWRpdC1tb2RhbCI+CiAgPGRpdiBjbGFzcz0ibW9kYWwiPgogICAgPGgyPiYjeDI3MEY7JiN4RkUwRjsgRWRpdCBUcmFuc2FjdGlvbjwvaDI+CiAgICA8ZGl2IGNsYXNzPSJtZ3JpZCI+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5EYXRlPC9sYWJlbD48aW5wdXQgdHlwZT0iZGF0ZSIgaWQ9ImUtZGF0ZSI+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5BbW91bnQgKCQpPC9sYWJlbD48aW5wdXQgdHlwZT0ibnVtYmVyIiBpZD0iZS1hbXQiIG1pbj0iMC4wMSIgc3RlcD0iMC4wMSI+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZnVsbCBmbCI+PGxhYmVsPkRlc2NyaXB0aW9uPC9sYWJlbD48aW5wdXQgdHlwZT0idGV4dCIgaWQ9ImUtZGVzYyIgbWF4bGVuZ3RoPSIxMDAiPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIj48bGFiZWw+Q2F0ZWdvcnk8L2xhYmVsPgogICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtnYXA6NHB4O21hcmdpbi10b3A6MnB4OyI+CiAgICAgICAgICA8c2VsZWN0IGlkPSJlLWNhdCIgc3R5bGU9ImZsZXg6MTttaW4td2lkdGg6MDsiPjwvc2VsZWN0PgogICAgICAgICAgPGlucHV0IHR5cGU9Im51bWJlciIgaWQ9ImUtY2F0LWFtdCIgcGxhY2Vob2xkZXI9IiQgYW10IiBtaW49IjAiIHN0ZXA9IjAuMDEiIHN0eWxlPSJ3aWR0aDo3MnB4O3BhZGRpbmc6NnB4IDRweDtmb250LXNpemU6LjhyZW07Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpO2JvcmRlci1yYWRpdXM6NXB4O291dGxpbmU6bm9uZTtjb2xvcjp2YXIoLS10ZXh0KTsiPgogICAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1wcmltYXJ5IGJ0bi1zbSIgaWQ9ImJ0bi1hZGQtZWRpdC1jaGlwIiBzdHlsZT0iZmxleC1zaHJpbms6MDtwYWRkaW5nOjZweCA5cHg7Ij5BZGQ8L2J1dHRvbj4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGlkPSJjYy1lZGl0LWNoaXBzIiBjbGFzcz0iY2F0LWNoaXBzIj48L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPjxsYWJlbD5UcmlwPC9sYWJlbD48c2VsZWN0IGlkPSJlLXRyaXAiPjwvc2VsZWN0PjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJmIGZsIj4KICAgICAgICA8bGFiZWw+VHlwZTwvbGFiZWw+CiAgICAgICAgPGRpdiBjbGFzcz0idHlwZS10b2dnbGUiPgogICAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJlLXR5cGUiIGlkPSJlZSIgdmFsdWU9ImV4cGVuc2UiPgogICAgICAgICAgPGxhYmVsIGZvcj0iZWUiIGNsYXNzPSJlbCI+RXhwZW5zZTwvbGFiZWw+CiAgICAgICAgICA8aW5wdXQgdHlwZT0icmFkaW8iIG5hbWU9ImUtdHlwZSIgaWQ9ImVyIiB2YWx1ZT0icmV0dXJuIj4KICAgICAgICAgIDxsYWJlbCBmb3I9ImVyIiBjbGFzcz0icmwiPlJldHVybjwvbGFiZWw+CiAgICAgICAgICA8aW5wdXQgdHlwZT0icmFkaW8iIG5hbWU9ImUtdHlwZSIgaWQ9ImVwIiB2YWx1ZT0icGF5bWVudCI+CiAgICAgICAgICA8bGFiZWwgZm9yPSJlcCIgY2xhc3M9InBsIj5QYXltZW50PC9sYWJlbD4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiPgogICAgICAgIDxsYWJlbD5XaG88L2xhYmVsPgogICAgICAgIDxkaXYgY2xhc3M9Indoby10b2dnbGUiPgogICAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJlLXdobyIgaWQ9ImV3bSIgdmFsdWU9Im1lIj4KICAgICAgICAgIDxsYWJlbCBmb3I9ImV3bSIgY2xhc3M9Im1sIj4mI3gxRjQ2NDsgTWU8L2xhYmVsPgogICAgICAgICAgPGlucHV0IHR5cGU9InJhZGlvIiBuYW1lPSJlLXdobyIgaWQ9ImV3dyIgdmFsdWU9IndpZmUiPgogICAgICAgICAgPGxhYmVsIGZvcj0iZXd3IiBjbGFzcz0id2wiPiYjeDFGNDY5OyBXaWZlPC9sYWJlbD4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImYgZmwiIHN0eWxlPSJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7cGFkZGluZy10b3A6MThweDsiPgogICAgICAgIDxpbnB1dCB0eXBlPSJjaGVja2JveCIgaWQ9ImUtY2xlYXJlZCIgc3R5bGU9IndpZHRoOjE2cHg7aGVpZ2h0OjE2cHg7YWNjZW50LWNvbG9yOnZhcigtLXN1Y2Nlc3MpO2N1cnNvcjpwb2ludGVyOyI+CiAgICAgICAgPGxhYmVsIGZvcj0iZS1jbGVhcmVkIiBzdHlsZT0iZm9udC1zaXplOi44NHJlbTtjb2xvcjp2YXIoLS10ZXh0KTt0ZXh0LXRyYW5zZm9ybTpub25lO2xldHRlci1zcGFjaW5nOjA7Zm9udC13ZWlnaHQ6NTAwO2N1cnNvcjpwb2ludGVyOyI+Q2xlYXJlZCBvbiBzdGF0ZW1lbnQ8L2xhYmVsPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0ibWZvb3RlciI+CiAgICAgIDxidXR0b24gY2xhc3M9ImJ0biBidG4tZ2hvc3QiIGlkPSJidG4tY2FuY2VsLWVkaXQiPkNhbmNlbDwvYnV0dG9uPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkiIGlkPSJidG4tc2F2ZS1lZGl0Ij5TYXZlIENoYW5nZXM8L2J1dHRvbj4KICAgIDwvZGl2PgogICAgPGRpdiBpZD0iZWRpdC1lcnIiIHN0eWxlPSJjb2xvcjp2YXIoLS1kYW5nZXIpO2ZvbnQtc2l6ZTouNzhyZW07bWFyZ2luLXRvcDo4cHg7dGV4dC1hbGlnbjpyaWdodDsiPjwvZGl2PgogIDwvZGl2Pgo8L2Rpdj4KCgo8ZGl2IGNsYXNzPSJtb2RhbC1vdiIgaWQ9ImFpLW1vZGFsIj4KICA8ZGl2IGNsYXNzPSJhaS1tb2RhbC13cmFwIj4KICAgIDxkaXYgY2xhc3M9ImFpLW1oZHIiPgogICAgICA8ZGl2PjxoMz4mI3gyNzI4OyBSZWdpc3RlciBBc3Npc3RhbnQ8L2gzPjxwPkFzayBhbnl0aGluZyBhYm91dCB5b3VyIHRyYW5zYWN0aW9uczwvcD48L2Rpdj4KICAgICAgPGJ1dHRvbiBpZD0iYnRuLWFpLWNsb3NlIj4mI3gyNzE1OzwvYnV0dG9uPgogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJhaS1tc2dzIiBpZD0iYWktbXNncyI+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJhaS1jaGlwcyI+CiAgICAgIDxzcGFuIGNsYXNzPSJhaS1jaGlwIiBkYXRhLXE9IldoYXQncyBteSBjdXJyZW50IGJhbGFuY2U/Ij5CYWxhbmNlPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0iYWktY2hpcCIgZGF0YS1xPSJIb3cgbXVjaCBkaWQgSSBzcGVuZCB0aGlzIG1vbnRoPyI+VGhpcyBtb250aDwvc3Bhbj4KICAgICAgPHNwYW4gY2xhc3M9ImFpLWNoaXAiIGRhdGEtcT0iSG93IG11Y2ggZGlkIEkgc3BlbmQgdGhpcyB3ZWVrPyI+VGhpcyB3ZWVrPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0iYWktY2hpcCIgZGF0YS1xPSJXaGF0IGFyZSBteSB0b3Agc3BlbmRpbmcgY2F0ZWdvcmllcz8iPlRvcCBjYXRlZ29yaWVzPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0iYWktY2hpcCIgZGF0YS1xPSJHaXZlIG1lIHN1Z2dlc3Rpb25zIj5TdWdnZXN0aW9uczwvc3Bhbj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iYWktaXJvdyI+CiAgICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0iYWktaW4iIHBsYWNlaG9sZGVyPSJlLmcuIEhvdyBtdWNoIG9uIFN0YXJidWNrcyB0aGlzIG1vbnRoPyI+CiAgICAgIDxidXR0b24gaWQ9ImJ0bi1haS1zZW5kIj5TZW5kPC9idXR0b24+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC9kaXY+Cgo8c2NyaXB0PgooZnVuY3Rpb24oKXsKJ3VzZSBzdHJpY3QnOwoKLy8g4pSA4pSAIFN0b3JhZ2Ug4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACnZhciBfbWVtPXt9OwpmdW5jdGlvbiBzR2V0KGspe3RyeXtyZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0oayk7fWNhdGNoKGUpe3JldHVybiBfbWVtW2tdfHxudWxsO319CmZ1bmN0aW9uIHNTZXQoayx2KXt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayx2KTt9Y2F0Y2goZSl7X21lbVtrXT12O319CgovLyDilIDilIAgU3RhdGUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACnZhciB0cmFuc2FjdGlvbnM9SlNPTi5wYXJzZShzR2V0KCdjYy1yZWdpc3RlcicpfHwnW10nKTsKdmFyIGhpc3Rvcnk9W10sIGZ1dHVyZT1bXSwgTUFYX0hJU1RPUlk9NTA7CnZhciBERUZBVUxUX0NBVFM9WydHcm9jZXJpZXMnLCdEaW5pbmcnLCdHYXMnLCdTaG9wcGluZycsJ1RyYXZlbCcsJ0VudGVydGFpbm1lbnQnLCdIZWFsdGhjYXJlJywnVXRpbGl0aWVzJywnU3Vic2NyaXB0aW9ucycsJ090aGVyJ107CnZhciBjYXRlZ29yaWVzPUpTT04ucGFyc2Uoc0dldCgnY2MtY2F0ZWdvcmllcycpfHwnbnVsbCcpfHxERUZBVUxUX0NBVFMuc2xpY2UoKTsKdmFyIHNvcnRGaWVsZD0nZGF0ZScsIHNvcnRBc2M9ZmFsc2UsIHVuY2xGaXJzdD1mYWxzZSwgZWRpdElkPW51bGw7CnZhciBjY0FkZENhdHM9W10sIGNjRWRpdENhdHM9W107CnZhciB0cmlwcz1KU09OLnBhcnNlKHNHZXQoJ2NjLXRyaXBzJyl8fCdbXScpOwp2YXIgYWN0aXZlVHJpcElkPShmdW5jdGlvbigpe3ZhciB2PXNHZXQoJ2FjdGl2ZS10cmlwJyk7cmV0dXJuIHY/cGFyc2VJbnQodiwxMCk6bnVsbDt9KSgpOwoKZnVuY3Rpb24gc25hcHNob3QoKXsKICBoaXN0b3J5LnB1c2goSlNPTi5zdHJpbmdpZnkodHJhbnNhY3Rpb25zKSk7CiAgaWYoaGlzdG9yeS5sZW5ndGg+TUFYX0hJU1RPUlkpaGlzdG9yeS5zaGlmdCgpOwogIGZ1dHVyZT1bXTsKICAkKCdidG4tdW5kbycpLmRpc2FibGVkPWZhbHNlOyQoJ2J0bi11bmRvJykuc3R5bGUub3BhY2l0eT0nMSc7CiAgJCgnYnRuLXJlZG8nKS5kaXNhYmxlZD10cnVlOyQoJ2J0bi1yZWRvJykuc3R5bGUub3BhY2l0eT0nLjQ1JzsKfQpmdW5jdGlvbiBzYXZlKCl7c1NldCgnY2MtcmVnaXN0ZXInLEpTT04uc3RyaW5naWZ5KHRyYW5zYWN0aW9ucykpO30KZnVuY3Rpb24gdW5kbygpewogIGlmKCFoaXN0b3J5Lmxlbmd0aClyZXR1cm47CiAgZnV0dXJlLnB1c2goSlNPTi5zdHJpbmdpZnkodHJhbnNhY3Rpb25zKSk7CiAgdHJhbnNhY3Rpb25zPUpTT04ucGFyc2UoaGlzdG9yeS5wb3AoKSk7CiAgc2F2ZSgpO3JlbmRlckFsbCgpOwogIGlmKCFoaXN0b3J5Lmxlbmd0aCl7JCgnYnRuLXVuZG8nKS5kaXNhYmxlZD10cnVlOyQoJ2J0bi11bmRvJykuc3R5bGUub3BhY2l0eT0nLjQ1Jzt9CiAgJCgnYnRuLXJlZG8nKS5kaXNhYmxlZD1mYWxzZTskKCdidG4tcmVkbycpLnN0eWxlLm9wYWNpdHk9JzEnOwp9CmZ1bmN0aW9uIHJlZG8oKXsKICBpZighZnV0dXJlLmxlbmd0aClyZXR1cm47CiAgaGlzdG9yeS5wdXNoKEpTT04uc3RyaW5naWZ5KHRyYW5zYWN0aW9ucykpOwogIHRyYW5zYWN0aW9ucz1KU09OLnBhcnNlKGZ1dHVyZS5wb3AoKSk7CiAgc2F2ZSgpO3JlbmRlckFsbCgpOwogICQoJ2J0bi11bmRvJykuZGlzYWJsZWQ9ZmFsc2U7JCgnYnRuLXVuZG8nKS5zdHlsZS5vcGFjaXR5PScxJzsKICBpZighZnV0dXJlLmxlbmd0aCl7JCgnYnRuLXJlZG8nKS5kaXNhYmxlZD10cnVlOyQoJ2J0bi1yZWRvJykuc3R5bGUub3BhY2l0eT0nLjQ1Jzt9Cn0KZnVuY3Rpb24gc2F2ZUNhdHMoKXtzU2V0KCdjYy1jYXRlZ29yaWVzJyxKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7fQpmdW5jdGlvbiAkKGlkKXtyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO30KCi8vIOKUgOKUgCBIZWxwZXJzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgApmdW5jdGlvbiB0b2RheVN0cigpe3ZhciBkPW5ldyBEYXRlKCk7cmV0dXJuIGQuZ2V0RnVsbFllYXIoKSsnLScrcGFkKGQuZ2V0TW9udGgoKSsxKSsnLScrcGFkKGQuZ2V0RGF0ZSgpKTt9CmZ1bmN0aW9uIHBhZChuKXtyZXR1cm4gU3RyaW5nKG4pLnBhZFN0YXJ0KDIsJzAnKTt9CmZ1bmN0aW9uIGVzYyhzKXtyZXR1cm4gU3RyaW5nKHMpLnJlcGxhY2UoLyYvZywnJmFtcDsnKS5yZXBsYWNlKC88L2csJyZsdDsnKS5yZXBsYWNlKC8+L2csJyZndDsnKS5yZXBsYWNlKC8iL2csJyZxdW90OycpO30KZnVuY3Rpb24gZm10KG4pe3JldHVybiAnJCcrTWF0aC5hYnMobikudG9GaXhlZCgyKS5yZXBsYWNlKC9cQig/PShcZHszfSkrKD8hXGQpKS9nLCcsJyk7fQpmdW5jdGlvbiBmbXRTKG4pe3JldHVybihuPDA/Jy0nOicnKSsnJCcrTWF0aC5hYnMobikudG9GaXhlZCgyKS5yZXBsYWNlKC9cQig/PShcZHszfSkrKD8hXGQpKS9nLCcsJyk7fQpmdW5jdGlvbiBmbXREKGQpe3ZhciBwPWQuc3BsaXQoJy0nKTtyZXR1cm4gcFsxXSsnLycrcFsyXSsnLycrcFswXTt9CmZ1bmN0aW9uIGRTdHIoZCl7cmV0dXJuIGQuZ2V0RnVsbFllYXIoKSsnLScrcGFkKGQuZ2V0TW9udGgoKSsxKSsnLScrcGFkKGQuZ2V0RGF0ZSgpKTt9CmZ1bmN0aW9uIGlzTW9iaWxlKCl7cmV0dXJuIHdpbmRvdy5pbm5lcldpZHRoPD03MDA7fQoKLy8g4pSA4pSAIENhdGVnb3JpZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACmZ1bmN0aW9uIHJlbmRlckNhdFNlbGVjdHMoKXsKICBbJ3R4bi1jYXQnLCdlLWNhdCddLmZvckVhY2goZnVuY3Rpb24oaWQpewogICAgdmFyIHM9JChpZCk7aWYoIXMpcmV0dXJuOwogICAgcy5pbm5lckhUTUw9JzxvcHRpb24gdmFsdWU9IiI+4oCUIEFkZCBjYXRlZ29yeSDigJQ8L29wdGlvbj4nK2NhdGVnb3JpZXMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEubG9jYWxlQ29tcGFyZShiKTt9KS5tYXAoZnVuY3Rpb24oYyl7cmV0dXJuICc8b3B0aW9uIHZhbHVlPSInK2VzYyhjKSsnIj4nK2VzYyhjKSsnPC9vcHRpb24+Jzt9KS5qb2luKCcnKTsKICAgIHMudmFsdWU9Jyc7CiAgfSk7CiAgdmFyIGZjPSQoJ2YtY2F0JyksZnA9ZmMudmFsdWU7CiAgZmMuaW5uZXJIVE1MPSc8b3B0aW9uIHZhbHVlPSIiPkFsbCBDYXRlZ29yaWVzPC9vcHRpb24+JytjYXRlZ29yaWVzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBhLmxvY2FsZUNvbXBhcmUoYik7fSkubWFwKGZ1bmN0aW9uKGMpe3JldHVybiAnPG9wdGlvbiB2YWx1ZT0iJytlc2MoYykrJyI+Jytlc2MoYykrJzwvb3B0aW9uPic7fSkuam9pbignJyk7CiAgaWYoZnApZmMudmFsdWU9ZnA7Cn0KZnVuY3Rpb24gcmVuZGVyQ0NDaGlwcyhjb250YWluZXJJZCxhcnIpewogIHZhciBlbD0kKGNvbnRhaW5lcklkKTtpZighZWwpcmV0dXJuOwogIGVsLmlubmVySFRNTD1hcnIubWFwKGZ1bmN0aW9uKGl0ZW0pewogICAgdmFyIGNhdD10eXBlb2YgaXRlbT09PSdzdHJpbmcnP2l0ZW06aXRlbS5jYXQ7CiAgICB2YXIgYW10U3RyPXR5cGVvZiBpdGVtPT09J29iamVjdCcmJml0ZW0uYW10IT09bnVsbD8nIDxzbWFsbD4kJytwYXJzZUZsb2F0KGl0ZW0uYW10KS50b0ZpeGVkKDIpKyc8L3NtYWxsPic6Jyc7CiAgICByZXR1cm4gJzxzcGFuIGNsYXNzPSJjYXQtY2hpcCI+Jytlc2MoY2F0KSthbXRTdHIrJzxzcGFuIGNsYXNzPSJjYXQtcm0iIGRhdGEtY2F0PSInK2VzYyhjYXQpKyciPiYjeEQ3Ozwvc3Bhbj48L3NwYW4+JzsKICB9KS5qb2luKCcnKTsKfQpmdW5jdGlvbiByZW5kZXJDQ0NhdERlbExpc3QoKXsKICB2YXIgZWw9JCgnY2MtY2F0LWRlbC1saXN0Jyk7aWYoIWVsKXJldHVybjsKICBpZighY2F0ZWdvcmllcy5sZW5ndGgpe2VsLmlubmVySFRNTD0nPHNwYW4gc3R5bGU9ImZvbnQtc2l6ZTouNzRyZW07Y29sb3I6Izk0YTNiODsiPk5vIGNhdGVnb3JpZXMgeWV0Ljwvc3Bhbj4nO3JldHVybjt9CiAgZWwuaW5uZXJIVE1MPSc8c3BhbiBzdHlsZT0iZm9udC1zaXplOi43NHJlbTtjb2xvcjojNjQ3NDhiO2Rpc3BsYXk6YmxvY2s7d2lkdGg6MTAwJTttYXJnaW4tYm90dG9tOjJweDsiPiYjeDFGNUQxOyBDbGljayB0byBkZWxldGU6PC9zcGFuPicrCiAgICBjYXRlZ29yaWVzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBhLmxvY2FsZUNvbXBhcmUoYik7fSkubWFwKGZ1bmN0aW9uKGNhdCl7CiAgICAgIHJldHVybiAnPHNwYW4gY2xhc3M9ImNhdC1jaGlwIGRlbC1jaGlwIj4nK2VzYyhjYXQpKyc8c3BhbiBjbGFzcz0iY2F0LXJtIiBkYXRhLWNhdD0iJytlc2MoY2F0KSsnIiBkYXRhLWFjdGlvbj0iZGVsZXRlIj4mI3hENzs8L3NwYW4+PC9zcGFuPic7CiAgICB9KS5qb2luKCcnKTsKfQpmdW5jdGlvbiBkZWxldGVDYXQobmFtZSl7CiAgaWYoIWNvbmZpcm0oJ0RlbGV0ZSAiJytuYW1lKyciIGNhdGVnb3J5PyBFeGlzdGluZyB0cmFuc2FjdGlvbnMga2VlcCB0aGVpciBjYXRlZ29yaWVzLicpKXJldHVybjsKICB2YXIgaWR4PWNhdGVnb3JpZXMuaW5kZXhPZihuYW1lKTtpZihpZHg9PT0tMSlyZXR1cm47CiAgY2F0ZWdvcmllcy5zcGxpY2UoaWR4LDEpO3NhdmVDYXRzKCk7cmVuZGVyQ2F0U2VsZWN0cygpOwogIGNjQWRkQ2F0cz1jY0FkZENhdHMuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiAodHlwZW9mIHg9PT0nc3RyaW5nJz94OnguY2F0KSE9PW5hbWU7fSk7CiAgY2NFZGl0Q2F0cz1jY0VkaXRDYXRzLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4gKHR5cGVvZiB4PT09J3N0cmluZyc/eDp4LmNhdCkhPT1uYW1lO30pOwogIHJlbmRlckNDQ2hpcHMoJ2NjLWFkZC1jaGlwcycsY2NBZGRDYXRzKTsKICByZW5kZXJDQ0NoaXBzKCdjYy1lZGl0LWNoaXBzJyxjY0VkaXRDYXRzKTsKICByZW5kZXJDQ0NhdERlbExpc3QoKTsKICBbY2hrLG1pa2Usc2F2LGh5c2FdLmZvckVhY2goZnVuY3Rpb24oYSl7aWYoYS5yZW5kZXJDYXQpYS5yZW5kZXJDYXQoKTtpZihhLmNsZWFyQ2F0KWEuY2xlYXJDYXQobmFtZSk7fSk7Cn0KZnVuY3Rpb24gY2F0ZWdvcnlBbGxvY2F0aW9uc1ZhbGlkKGxpc3QsdG90YWwpe3ZhciB2YWxzPWxpc3QubWFwKGZ1bmN0aW9uKHgpe3JldHVybiB0eXBlb2YgeD09PSdvYmplY3QnP3guYW10Om51bGw7fSk7dmFyIGFueT12YWxzLnNvbWUoZnVuY3Rpb24odil7cmV0dXJuIHYhPT1udWxsJiZ2IT09dW5kZWZpbmVkJiYhaXNOYU4odik7fSk7aWYoIWFueSlyZXR1cm4gdHJ1ZTtpZih2YWxzLnNvbWUoZnVuY3Rpb24odil7cmV0dXJuIHY9PT1udWxsfHx2PT09dW5kZWZpbmVkfHxpc05hTih2KTt9KSlyZXR1cm4gZmFsc2U7dmFyIHN1bT12YWxzLnJlZHVjZShmdW5jdGlvbihzLHYpe3JldHVybiBzKygrdnx8MCk7fSwwKTtyZXR1cm4gTWF0aC5hYnMoc3VtLSgrdG90YWx8fDApKTwwLjAxO30KZnVuY3Rpb24gYWRkQ2F0KG5hbWUpewogIG5hbWU9bmFtZS50cmltKCk7CiAgaWYoIW5hbWV8fGNhdGVnb3JpZXMuaW5kZXhPZihuYW1lKSE9PS0xKXJldHVybiBmYWxzZTsKICBjYXRlZ29yaWVzLnB1c2gobmFtZSk7c2F2ZUNhdHMoKTtyZW5kZXJDYXRTZWxlY3RzKCk7cmV0dXJuIHRydWU7Cn0KCi8vIOKUgOKUgCBDUlVEIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgApmdW5jdGlvbiBhZGRUeG4oKXsKICB2YXIgZGF0ZT0kKCd0eG4tZGF0ZScpLnZhbHVlLGRlc2M9JCgndHhuLWRlc2MnKS52YWx1ZS50cmltKCk7CiAgdmFyIGFtdD1wYXJzZUZsb2F0KCQoJ3R4bi1hbXQnKS52YWx1ZSk7CiAgdmFyIHRlPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W25hbWU9InR4bi10eXBlIl06Y2hlY2tlZCcpOwogIHZhciB3ZT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFtuYW1lPSJ0eG4td2hvIl06Y2hlY2tlZCcpOwogIHZhciB0eXBlPXRlP3RlLnZhbHVlOidleHBlbnNlJyx3aG89d2U/d2UudmFsdWU6J21lJyxlcnI9JCgnZm9ybS1lcnInKTsKICBpZighZGF0ZSl7ZXJyLnRleHRDb250ZW50PSdQbGVhc2UgZW50ZXIgYSBkYXRlLic7cmV0dXJuO30KICBpZighZGVzYyl7ZXJyLnRleHRDb250ZW50PSdQbGVhc2UgZW50ZXIgYSBkZXNjcmlwdGlvbi4nO3JldHVybjt9CiAgaWYoIWFtdHx8YW10PD0wKXtlcnIudGV4dENvbnRlbnQ9J1BsZWFzZSBlbnRlciBhIHZhbGlkIGFtb3VudC4nO3JldHVybjt9CiAgaWYoIWNjQWRkQ2F0cy5sZW5ndGgpe2Vyci50ZXh0Q29udGVudD0nUGxlYXNlIHNlbGVjdCBhdCBsZWFzdCBvbmUgY2F0ZWdvcnkuJztyZXR1cm47fQogIGlmKCFjYXRlZ29yeUFsbG9jYXRpb25zVmFsaWQoY2NBZGRDYXRzLGFtdCkpe2Vyci50ZXh0Q29udGVudD0nQ2F0ZWdvcnkgYWxsb2NhdGlvbnMgbXVzdCBhbGwgaGF2ZSBhbW91bnRzIGFuZCBlcXVhbCB0aGUgdHJhbnNhY3Rpb24gdG90YWwuJztyZXR1cm47fQogIGVyci50ZXh0Q29udGVudD0nJzsKICBzbmFwc2hvdCgpOwogIHZhciBuZXdJZD1EYXRlLm5vdygpOwogIHZhciBjYXQ9Y2NBZGRDYXRzLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gdHlwZW9mIHg9PT0nc3RyaW5nJz94OnguY2F0O30pLmpvaW4oJywgJyk7CiAgdmFyIGNhdEFtdHM9Y2NBZGRDYXRzLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gdHlwZW9mIHg9PT0nb2JqZWN0JyYmeC5hbXQhPT1udWxsP3guYW10LnRvRml4ZWQoMik6Jyc7fSkuam9pbignLCAnKTsKICB0cmFuc2FjdGlvbnMucHVzaCh7aWQ6bmV3SWQsZGF0ZTpkYXRlLGRlc2M6ZGVzYyxjYXQ6Y2F0LGNhdEFtdHM6Y2F0QW10cyx0eXBlOnR5cGUsYW1vdW50OmFtdCxjbGVhcmVkOmZhbHNlLHdobzp3aG8sdHJpcDphY3RpdmVUcmlwSWR8fHVuZGVmaW5lZH0pOwogIGlmKGNjUGVuZGluZ1JjcHQpe3NTZXQoJ3JjcHQtJytuZXdJZCxjY1BlbmRpbmdSY3B0KTtjY1BlbmRpbmdSY3B0PW51bGw7JCgnY2MtcGhvdG8tdGh1bWInKS5zdHlsZS5kaXNwbGF5PSdub25lJzskKCdjYy1waG90by10aHVtYicpLnNyYz0nJzt9CiAgc2F2ZSgpO3JlbmRlckFsbCgpOwogIGNjQWRkQ2F0cz1bXTtyZW5kZXJDQ0NoaXBzKCdjYy1hZGQtY2hpcHMnLFtdKTsKICAkKCd0eG4tZGVzYycpLnZhbHVlPScnOyQoJ3R4bi1hbXQnKS52YWx1ZT0nJzskKCd0eG4tZGF0ZScpLnZhbHVlPXRvZGF5U3RyKCk7JCgndHhuLWRlc2MnKS5mb2N1cygpOwp9CmZ1bmN0aW9uIGRlbFR4bihpZCl7CiAgaWYoIWNvbmZpcm0oJ0RlbGV0ZSB0aGlzIHRyYW5zYWN0aW9uPycpKXJldHVybjsKICBzbmFwc2hvdCgpOwogIHRyYW5zYWN0aW9ucz10cmFuc2FjdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiB0LmlkIT09aWQ7fSk7CiAgZGVsUmNwdEtleShpZCk7CiAgc2F2ZSgpO3JlbmRlckFsbCgpOwp9CmZ1bmN0aW9uIHRvZ2dsZUNsZWFyZWQoaWQpewogIHZhciB0PXRyYW5zYWN0aW9ucy5maW5kKGZ1bmN0aW9uKHgpe3JldHVybiB4LmlkPT09aWQ7fSk7CiAgaWYodCl7c25hcHNob3QoKTt0LmNsZWFyZWQ9IXQuY2xlYXJlZDtzYXZlKCk7cmVuZGVyQWxsKCk7fQp9CgovLyDilIDilIAgRWRpdCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKZnVuY3Rpb24gb3BlbkVkaXQoaWQpewogIHZhciB0PXRyYW5zYWN0aW9ucy5maW5kKGZ1bmN0aW9uKHgpe3JldHVybiB4LmlkPT09aWQ7fSk7aWYoIXQpcmV0dXJuOwogIGVkaXRJZD1pZDsKICAkKCdlLWRhdGUnKS52YWx1ZT10LmRhdGU7JCgnZS1kZXNjJykudmFsdWU9dC5kZXNjOwogICQoJ2UtYW10JykudmFsdWU9dC5hbW91bnQ7JCgnZS1jbGVhcmVkJykuY2hlY2tlZD0hIXQuY2xlYXJlZDsKICB2YXIgcj1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFtuYW1lPSJlLXR5cGUiXVt2YWx1ZT0iJyt0LnR5cGUrJyJdJyk7CiAgaWYocilyLmNoZWNrZWQ9dHJ1ZTsKICB2YXIgdz1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFtuYW1lPSJlLXdobyJdW3ZhbHVlPSInKyh0Lndob3x8J3dpZmUnKSsnIl0nKTsKICBpZih3KXcuY2hlY2tlZD10cnVlOwogIHZhciBlQ2F0cz10LmNhdD90LmNhdC5zcGxpdCgnLCAnKS5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIHgudHJpbSgpO30pOltdLGVBbXRzPXQuY2F0QW10cz90LmNhdEFtdHMuc3BsaXQoJywgJyk6W107CiAgY2NFZGl0Q2F0cz1lQ2F0cy5tYXAoZnVuY3Rpb24oY2F0LGkpe3ZhciBhPWVBbXRzW2ldJiZlQW10c1tpXS50cmltKCk/cGFyc2VGbG9hdChlQW10c1tpXSk6bnVsbDtyZXR1cm4ge2NhdDpjYXQsYW10OmlzTmFOKGEpP251bGw6YX07fSk7CiAgcmVuZGVyQ2F0U2VsZWN0cygpO3JlbmRlckNDQ2hpcHMoJ2NjLWVkaXQtY2hpcHMnLGNjRWRpdENhdHMpOwogICQoJ2VkaXQtZXJyJykudGV4dENvbnRlbnQ9Jyc7CiAgJCgnZS10cmlwJykuaW5uZXJIVE1MPWJ1aWxkVHJpcE9wdHModC50cmlwfHxudWxsKTsKICAkKCdlZGl0LW1vZGFsJykuY2xhc3NMaXN0LmFkZCgnb3BlbicpOwp9CmZ1bmN0aW9uIGNsb3NlRWRpdCgpeyQoJ2VkaXQtbW9kYWwnKS5jbGFzc0xpc3QucmVtb3ZlKCdvcGVuJyk7ZWRpdElkPW51bGw7fQpmdW5jdGlvbiBzYXZlRWRpdCgpewogIHZhciBkYXRlPSQoJ2UtZGF0ZScpLnZhbHVlLGRlc2M9JCgnZS1kZXNjJykudmFsdWUudHJpbSgpOwogIHZhciBhbXQ9cGFyc2VGbG9hdCgkKCdlLWFtdCcpLnZhbHVlKTsKICB2YXIgdGU9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbbmFtZT0iZS10eXBlIl06Y2hlY2tlZCcpOwogIHZhciB3ZT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFtuYW1lPSJlLXdobyJdOmNoZWNrZWQnKTsKICB2YXIgdHlwZT10ZT90ZS52YWx1ZTonZXhwZW5zZScsd2hvPXdlP3dlLnZhbHVlOidtZScsZXJyPSQoJ2VkaXQtZXJyJyk7CiAgaWYoIWRhdGUpe2Vyci50ZXh0Q29udGVudD0nRGF0ZSByZXF1aXJlZC4nO3JldHVybjt9CiAgaWYoIWRlc2Mpe2Vyci50ZXh0Q29udGVudD0nRGVzY3JpcHRpb24gcmVxdWlyZWQuJztyZXR1cm47fQogIGlmKCFhbXR8fGFtdDw9MCl7ZXJyLnRleHRDb250ZW50PSdWYWxpZCBhbW91bnQgcmVxdWlyZWQuJztyZXR1cm47fQogIGlmKCFjY0VkaXRDYXRzLmxlbmd0aCl7ZXJyLnRleHRDb250ZW50PSdQbGVhc2Ugc2VsZWN0IGF0IGxlYXN0IG9uZSBjYXRlZ29yeS4nO3JldHVybjt9CiAgaWYoIWNhdGVnb3J5QWxsb2NhdGlvbnNWYWxpZChjY0VkaXRDYXRzLGFtdCkpe2Vyci50ZXh0Q29udGVudD0nQ2F0ZWdvcnkgYWxsb2NhdGlvbnMgbXVzdCBhbGwgaGF2ZSBhbW91bnRzIGFuZCBlcXVhbCB0aGUgdHJhbnNhY3Rpb24gdG90YWwuJztyZXR1cm47fQogIHZhciBjYXQ9Y2NFZGl0Q2F0cy5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIHR5cGVvZiB4PT09J3N0cmluZyc/eDp4LmNhdDt9KS5qb2luKCcsICcpOwogIHZhciBjYXRBbXRzPWNjRWRpdENhdHMubWFwKGZ1bmN0aW9uKHgpe3JldHVybiB0eXBlb2YgeD09PSdvYmplY3QnJiZ4LmFtdCE9PW51bGw/eC5hbXQudG9GaXhlZCgyKTonJzt9KS5qb2luKCcsICcpOwogIHZhciBpPXRyYW5zYWN0aW9ucy5maW5kSW5kZXgoZnVuY3Rpb24odCl7cmV0dXJuIHQuaWQ9PT1lZGl0SWQ7fSk7aWYoaT09PS0xKXJldHVybjsKICBzbmFwc2hvdCgpOwogIHZhciB0cmlwVmFsPSQoJ2UtdHJpcCcpLnZhbHVlO3ZhciB0cmlwSWQ9dHJpcFZhbD9wYXJzZUludCh0cmlwVmFsLDEwKTp1bmRlZmluZWQ7CiAgdHJhbnNhY3Rpb25zW2ldPXtpZDp0cmFuc2FjdGlvbnNbaV0uaWQsZGF0ZTpkYXRlLGRlc2M6ZGVzYyxjYXQ6Y2F0LGNhdEFtdHM6Y2F0QW10cyx0eXBlOnR5cGUsYW1vdW50OmFtdCxjbGVhcmVkOiQoJ2UtY2xlYXJlZCcpLmNoZWNrZWQsd2hvOndobyx0cmlwOnRyaXBJZH07CiAgc2F2ZSgpO3JlbmRlckFsbCgpO2Nsb3NlRWRpdCgpOwp9CgovLyDilIDilIAgRmlsdGVycyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKZnVuY3Rpb24gZ2V0RmlsdGVyZWQoKXsKICB2YXIgcz0kKCdmLXNlYXJjaCcpLnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpLGM9JCgnZi1jYXQnKS52YWx1ZTsKICB2YXIgdHk9JCgnZi10eXBlJykudmFsdWUsZnI9JCgnZi1mcm9tJykudmFsdWUsdG89JCgnZi10bycpLnZhbHVlOwogIHJldHVybiB0cmFuc2FjdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKHQpewogICAgaWYocyYmdC5kZXNjLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzKT09PS0xKXJldHVybiBmYWxzZTsKICAgIGlmKGMmJnQuY2F0LnNwbGl0KCcsICcpLmluZGV4T2YoYyk9PT0tMSlyZXR1cm4gZmFsc2U7CiAgICBpZih0eSYmdC50eXBlIT09dHkpcmV0dXJuIGZhbHNlOwogICAgaWYoZnImJnQuZGF0ZTxmcilyZXR1cm4gZmFsc2U7CiAgICBpZih0byYmdC5kYXRlPnRvKXJldHVybiBmYWxzZTsKICAgIHJldHVybiB0cnVlOwogIH0pOwp9CmZ1bmN0aW9uIGZpbHRlckFjdGl2ZSgpewogIHJldHVybiAkKCdmLXNlYXJjaCcpLnZhbHVlLnRyaW0oKXx8JCgnZi1jYXQnKS52YWx1ZXx8JCgnZi10eXBlJykudmFsdWV8fCQoJ2YtZnJvbScpLnZhbHVlfHwkKCdmLXRvJykudmFsdWU7Cn0KCi8vIOKUgOKUgCBTb3J0IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgApmdW5jdGlvbiB0b2dnbGVTb3J0KGYpewogIHNvcnRBc2M9KHNvcnRGaWVsZD09PWYpPyFzb3J0QXNjOihmIT09J2RhdGUnKTsKICBzb3J0RmllbGQ9ZjtyZW5kZXJUYWJsZSgpOwp9CmZ1bmN0aW9uIHNvcnRlZChsaXN0KXsKICByZXR1cm4gbGlzdC5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXsKICAgIGlmKHVuY2xGaXJzdCl7dmFyIGFjPWEuY2xlYXJlZD8xOjAsYmM9Yi5jbGVhcmVkPzE6MDtpZihhYyE9PWJjKXJldHVybiBhYy1iYzt9CiAgICB2YXIgYXY9YVtzb3J0RmllbGRdLGJ2PWJbc29ydEZpZWxkXTsKICAgIGlmKHNvcnRGaWVsZD09PSdhbW91bnQnKXthdj0rYXY7YnY9K2J2O30KICAgIGlmKGF2PGJ2KXJldHVybiBzb3J0QXNjPy0xOjE7aWYoYXY+YnYpcmV0dXJuIHNvcnRBc2M/MTotMTtyZXR1cm4gMDsKICB9KTsKfQoKLy8g4pSA4pSAIFJlbmRlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKZnVuY3Rpb24gY2F0QmFkZ2VzKHQpewogIHZhciBjYXRzPXQuY2F0P3QuY2F0LnNwbGl0KCcsICcpOltdOwogIHZhciBhbXRzPXQuY2F0QW10cz90LmNhdEFtdHMuc3BsaXQoJywgJyk6W107CiAgcmV0dXJuIGNhdHMubWFwKGZ1bmN0aW9uKGNhdCxpKXsKICAgIHZhciBhPWFtdHNbaV0mJmFtdHNbaV0udHJpbSgpP3BhcnNlRmxvYXQoYW10c1tpXSk6bnVsbDsKICAgIHJldHVybiAnPHNwYW4gY2xhc3M9ImNhdGJkZyI+Jytlc2MoY2F0LnRyaW0oKSkrKGEhPT1udWxsJiYhaXNOYU4oYSk/JyA8c21hbGw+JCcrYS50b0ZpeGVkKDIpKyc8L3NtYWxsPic6JycpKyc8L3NwYW4+JzsKICB9KS5qb2luKCcgJyk7Cn0KZnVuY3Rpb24gY2F0RGVzYyh0KXsKICB2YXIgY2F0cz10LmNhdD90LmNhdC5zcGxpdCgnLCAnKTpbXTsKICB2YXIgYW10cz10LmNhdEFtdHM/dC5jYXRBbXRzLnNwbGl0KCcsICcpOltdOwogIHJldHVybiBjYXRzLm1hcChmdW5jdGlvbihjYXQsaSl7CiAgICB2YXIgYT1hbXRzW2ldJiZhbXRzW2ldLnRyaW0oKT9wYXJzZUZsb2F0KGFtdHNbaV0pOm51bGw7CiAgICByZXR1cm4gZXNjKGNhdC50cmltKCkpKyhhIT09bnVsbCYmIWlzTmFOKGEpPycgJCcrYS50b0ZpeGVkKDIpOicnKTsKICB9KS5qb2luKCcsICcpOwp9CmZ1bmN0aW9uIHJlbmRlckFsbCgpe3JlbmRlclN1bW1hcnkoKTtyZW5kZXJUYWJsZSgpO30KCmZ1bmN0aW9uIHJlbmRlclN1bW1hcnkoKXsKICB2YXIgZXhwPTAscmV0PTAscGF5PTAsdWV4cD0wLHVyZXQ9MCx1cGF5PTA7CiAgdHJhbnNhY3Rpb25zLmZvckVhY2goZnVuY3Rpb24odCl7CiAgICB2YXIgY2xlYXJlZD0hIXQuY2xlYXJlZDsKICAgIGlmKHQudHlwZT09PSdleHBlbnNlJyl7aWYoY2xlYXJlZClleHArPXQuYW1vdW50O2Vsc2UgdWV4cCs9dC5hbW91bnQ7fQogICAgZWxzZSBpZih0LnR5cGU9PT0ncmV0dXJuJyl7aWYoY2xlYXJlZClyZXQrPXQuYW1vdW50O2Vsc2UgdXJldCs9dC5hbW91bnQ7fQogICAgZWxzZSBpZih0LnR5cGU9PT0ncGF5bWVudCcpe2lmKGNsZWFyZWQpcGF5Kz10LmFtb3VudDtlbHNlIHVwYXkrPXQuYW1vdW50O30KICB9KTsKICB2YXIgdG90YWxPd2VkPShleHArdWV4cCktKHJldCt1cmV0KS0ocGF5K3VwYXkpOwogIHZhciBjaGtEZXA9MCxjaGtXdGg9MDsKICBjaGsuZ2V0VHhucygpLmZvckVhY2goZnVuY3Rpb24odCl7aWYodC50eXBlPT09ImRlcG9zaXQiKWNoa0RlcCs9dC5hbW91bnQ7ZWxzZSBjaGtXdGgrPXQuYW1vdW50O30pOwogIHZhciBjaGtCYWw9Y2hrLmdldE9wZW5CYWwoKStjaGtEZXAtY2hrV3RoOwogIHZhciBuZXRBdmFpbD1jaGtCYWwtdG90YWxPd2VkOwogICQoJ3MtZXhwJykudGV4dENvbnRlbnQ9Zm10KGV4cCk7JCgncy1yZXQnKS50ZXh0Q29udGVudD1mbXQocmV0KTsKICAkKCdzLXBheScpLnRleHRDb250ZW50PWZtdChwYXkpOwogICQoJ3MtYmFsJykudGV4dENvbnRlbnQ9Zm10Uyh0b3RhbE93ZWQpOyQoJ3MtdW5jbCcpLnRleHRDb250ZW50PWZtdCh1ZXhwKTsKICAkKCdzLXVuY2wtcmV0JykudGV4dENvbnRlbnQ9Zm10KHVyZXQpOwogICQoJ2hkci1iYWwnKS50ZXh0Q29udGVudD1mbXRTKG5ldEF2YWlsKTsKICB2YXIgaGw9JCgnaGRyLWxibCcpO2lmKGhsKWhsLnRleHRDb250ZW50PSdOZXQgQXZhaWxhYmxlJzsKfQoKZnVuY3Rpb24gYnVpbGRCYWxNYXAoKXsKICB2YXIgY2g9dHJhbnNhY3Rpb25zLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe2lmKGEuZGF0ZTxiLmRhdGUpcmV0dXJuIC0xO2lmKGEuZGF0ZT5iLmRhdGUpcmV0dXJuIDE7cmV0dXJuIGEuaWQtYi5pZDt9KTsKICB2YXIgbT17fSxyPTA7CiAgY2guZm9yRWFjaChmdW5jdGlvbih0KXtyKz0odC50eXBlPT09J2V4cGVuc2UnKT90LmFtb3VudDotdC5hbW91bnQ7bVt0LmlkXT1yO30pOwogIHJldHVybiBtOwp9CgpmdW5jdGlvbiBhcncoZil7CiAgcmV0dXJuIHNvcnRGaWVsZD09PWY/KCc8c3BhbiBjbGFzcz0ic2FyciBvbiI+Jysoc29ydEFzYz8n4oaRJzon4oaTJykrJzwvc3Bhbj4nKTonPHNwYW4gY2xhc3M9InNhcnIiPjwvc3Bhbj4nOwp9CgpmdW5jdGlvbiByZW5kZXJUYWJsZSgpewogIHZhciByb3dzPXNvcnRlZChnZXRGaWx0ZXJlZCgpKSxibT1idWlsZEJhbE1hcCgpOwogIHZhciBtb2JpbGU9aXNNb2JpbGUoKTsKCiAgLy8g4pSA4pSAIHRoZWFkIOKUgOKUgAogIHZhciBoZWFkPSQoJ3R4bi1oZWFkJyk7CiAgaWYobW9iaWxlKXsKICAgIGhlYWQuaW5uZXJIVE1MPSc8dHI+JysKICAgICAgJzx0aCBzdHlsZT0id2lkdGg6MzJweDsiIHRpdGxlPSJDbGVhcmVkIj4mI3gyNzEzOzwvdGg+JysKICAgICAgJzx0aCBjbGFzcz0ic29ydGFibGUiIGRhdGEtc29ydD0iZGF0ZSIgc3R5bGU9IndpZHRoOjc2cHg7Ij5EYXRlICcrYXJ3KCdkYXRlJykrJzwvdGg+JysKICAgICAgJzx0aCBjbGFzcz0ic29ydGFibGUiIGRhdGEtc29ydD0iZGVzYyI+RGVzY3JpcHRpb24gJythcncoJ2Rlc2MnKSsnPC90aD4nKwogICAgICAnPHRoIGNsYXNzPSJzb3J0YWJsZSIgZGF0YS1zb3J0PSJhbW91bnQiIHN0eWxlPSJ0ZXh0LWFsaWduOnJpZ2h0O3dpZHRoOjc2cHg7Ij5BbW91bnQgJythcncoJ2Ftb3VudCcpKyc8L3RoPicrCiAgICAgICc8dGggc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3dpZHRoOjYycHg7Ij5BY3QuPC90aD4nKwogICAgICAnPC90cj4nOwogIH0gZWxzZSB7CiAgICBoZWFkLmlubmVySFRNTD0nPHRyPicrCiAgICAgICc8dGggc3R5bGU9IndpZHRoOjMycHg7IiB0aXRsZT0iQ2xlYXJlZCI+JiN4MjcxMzs8L3RoPicrCiAgICAgICc8dGggY2xhc3M9InNvcnRhYmxlIiBkYXRhLXNvcnQ9ImRhdGUiIHN0eWxlPSJ3aWR0aDo4OHB4OyI+RGF0ZSAnK2FydygnZGF0ZScpKyc8L3RoPicrCiAgICAgICc8dGggY2xhc3M9InNvcnRhYmxlIiBkYXRhLXNvcnQ9ImRlc2MiPkRlc2NyaXB0aW9uIC8gQW1vdW50ICcrYXJ3KCdkZXNjJykrJzwvdGg+JysKICAgICAgJzx0aCBjbGFzcz0ic29ydGFibGUiIGRhdGEtc29ydD0iY2F0IiBzdHlsZT0id2lkdGg6OTZweDsiPkNhdGVnb3J5ICcrYXJ3KCdjYXQnKSsnPC90aD4nKwogICAgICAnPHRoIHN0eWxlPSJ3aWR0aDo2OHB4OyI+VHlwZTwvdGg+JysKICAgICAgJzx0aCBzdHlsZT0idGV4dC1hbGlnbjpyaWdodDt3aWR0aDo5MHB4OyI+QmFsYW5jZTwvdGg+JysKICAgICAgJzx0aCBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7d2lkdGg6NjZweDsiPkFjdGlvbnM8L3RoPicrCiAgICAgICc8L3RyPic7CiAgfQoKICAkKCdyb3ctY291bnQnKS50ZXh0Q29udGVudD1yb3dzLmxlbmd0aCsnIHRyYW5zYWN0aW9uJysocm93cy5sZW5ndGghPT0xPydzJzonJyk7CgogIC8vIOKUgOKUgCBGaWx0ZXIgdG90YWwgYmFyIOKUgOKUgAogIHZhciBmdEJhcj0kKCdmaWx0ZXItdG90YWwnKTsKICBpZihmaWx0ZXJBY3RpdmUoKSYmcm93cy5sZW5ndGgpewogICAgdmFyIGZlPTAsZnI9MCxmcD0wOwogICAgcm93cy5mb3JFYWNoKGZ1bmN0aW9uKHQpe2lmKHQudHlwZT09PSdleHBlbnNlJylmZSs9dC5hbW91bnQ7ZWxzZSBpZih0LnR5cGU9PT0ncmV0dXJuJylmcis9dC5hbW91bnQ7ZWxzZSBmcCs9dC5hbW91bnQ7fSk7CiAgICB2YXIgZm49ZmUtZnItZnAscGFydHM9W107CiAgICBpZihmZSlwYXJ0cy5wdXNoKCdFeHBlbnNlczogJytmbXQoZmUpKTtpZihmcilwYXJ0cy5wdXNoKCdSZXR1cm5zOiAnK2ZtdChmcikpO2lmKGZwKXBhcnRzLnB1c2goJ1BheW1lbnRzOiAnK2ZtdChmcCkpOwogICAgcGFydHMucHVzaCgnTmV0OiAnK2ZtdFMoZm4pKTsKICAgICQoJ2Z0LWNvdW50JykudGV4dENvbnRlbnQ9cm93cy5sZW5ndGgrJyBtYXRjaCcrKHJvd3MubGVuZ3RoIT09MT8nZXMnOicnKTsKICAgICQoJ2Z0LWRldGFpbCcpLnRleHRDb250ZW50PSfigJQgJytwYXJ0cy5qb2luKCcgfCAnKTsKICAgIGZ0QmFyLmNsYXNzTGlzdC5hZGQoJ29uJyk7CiAgfSBlbHNlIHtmdEJhci5jbGFzc0xpc3QucmVtb3ZlKCdvbicpO30KCiAgdmFyIGJvZHk9JCgndHhuLWJvZHknKSxlbXB0eT0kKCdlbXB0eS1zdGF0ZScpOwogIGlmKCFyb3dzLmxlbmd0aCl7Ym9keS5pbm5lckhUTUw9Jyc7ZW1wdHkuc3R5bGUuZGlzcGxheT0nYmxvY2snO3JldHVybjt9CiAgZW1wdHkuc3R5bGUuZGlzcGxheT0nbm9uZSc7CgogIHZhciBoPScnOwogIHJvd3MuZm9yRWFjaChmdW5jdGlvbih0KXsKICAgIHZhciBiYWw9Ym1bdC5pZF0sbmVnPWJhbDwwLGNscj0hIXQuY2xlYXJlZDsKICAgIHZhciBjbHM9dC50eXBlKyctcm93JysoY2xyPycnOicgdW5jbHJkJyk7CiAgICB2YXIgc2lnbj10LnR5cGU9PT0nZXhwZW5zZSc/JysnOictJzsKICAgIHZhciBhbXRDb2xvcj10LnR5cGU9PT0nZXhwZW5zZSc/JyNkYzI2MjYnOnQudHlwZT09PSdyZXR1cm4nPycjMTZhMzRhJzonIzdjM2FlZCc7CiAgICB2YXIgYW10U3R5bGU9J2NvbG9yOicrYW10Q29sb3IrJztmb250LXdlaWdodDo3MDA7JzsKICAgIHZhciBpc1dpZmU9KHQud2hvPT09J3dpZmUnfHwhdC53aG8pOwogICAgdmFyIHdob0NvbG9yPWlzV2lmZT8nIzFlMjkzYic6JyMyNTYzZWInOwogICAgdmFyIHdob1N0eWxlPSdjb2xvcjonK3dob0NvbG9yKyc7Zm9udC13ZWlnaHQ6NTAwOyc7CiAgICB2YXIgY2I9JzxpbnB1dCB0eXBlPSJjaGVja2JveCIgY2xhc3M9ImNsci1jYiIgZGF0YS1pZD0iJyt0LmlkKyciJysoY2xyPycgY2hlY2tlZCc6JycpKycgdGl0bGU9Ik1hcmsgY2xlYXJlZCI+JzsKICAgIHZhciBlYj0nPGJ1dHRvbiBjbGFzcz0iYnRuIGJ0bi1lZGl0IGJ0bi1zbSBlZGl0LWJ0biIgZGF0YS1pZD0iJyt0LmlkKyciPiYjeDI3MEY7JiN4RkUwRjs8L2J1dHRvbj4nOwogICAgdmFyIGRiPSc8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWRhbmdlciBidG4tc20gZGVsLWJ0biIgZGF0YS1pZD0iJyt0LmlkKyciIHN0eWxlPSJtYXJnaW4tbGVmdDoycHgiPiYjeDI3MTU7PC9idXR0b24+JzsKICAgIHZhciBoYXNSY3B0PSEhc0dldCgncmNwdC0nK3QuaWQpOwogICAgdmFyIHJiPWhhc1JjcHQ/JzxidXR0b24gY2xhc3M9ImJ0biBidG4tc20gcmNwdC12aWV3LWJ0biIgZGF0YS1pZD0iJyt0LmlkKyciIHN0eWxlPSJtYXJnaW4tbGVmdDoycHg7Y29sb3I6IzA1OTY2OTtmb250LXNpemU6LjlyZW07IiB0aXRsZT0iVmlldyByZWNlaXB0Ij4mI3gxRjlGRTs8L2J1dHRvbj4nOicnOwoKICAgIGlmKG1vYmlsZSl7CiAgICAgIGgrPSc8dHIgY2xhc3M9IicrY2xzKyciPic7CiAgICAgIGgrPSc8dGQgY2xhc3M9ImNsci1jZWxsIj4nK2NiKyc8L3RkPic7CiAgICAgIGgrPSc8dGQgY2xhc3M9ImRhdGUtY2VsbCI+JytmbXREKHQuZGF0ZSkrJzwvdGQ+JzsKICAgICAgaCs9Jzx0ZCBjbGFzcz0iZGVzYy1jZWxsIj48c3BhbiBjbGFzcz0iZGVzYy1tYWluIiBzdHlsZT0iJyt3aG9TdHlsZSsnIiB0aXRsZT0iJytlc2ModC5kZXNjKSsnIj4nK2VzYyh0LmRlc2MpKyc8L3NwYW4+PHNwYW4gY2xhc3M9ImRlc2Mtc3ViIj4nK2NhdERlc2ModCkrJzwvc3Bhbj48L3RkPic7CiAgICAgIGgrPSc8dGQgY2xhc3M9ImFtdC1jZWxsIj48c3BhbiBzdHlsZT0iJythbXRTdHlsZSsnIj4nK3NpZ24rZm10KHQuYW1vdW50KSsnPC9zcGFuPjwvdGQ+JzsKICAgICAgaCs9Jzx0ZCBjbGFzcz0iYWN0LWNlbGwiPicrcmIrZWIrZGIrJzwvdGQ+JzsKICAgICAgaCs9JzwvdHI+JzsKICAgIH0gZWxzZSB7CiAgICAgIGgrPSc8dHIgY2xhc3M9IicrY2xzKyciPic7CiAgICAgIGgrPSc8dGQgY2xhc3M9ImNsci1jZWxsIj4nK2NiKyc8L3RkPic7CiAgICAgIGgrPSc8dGQgY2xhc3M9ImRhdGUtY2VsbCI+JytmbXREKHQuZGF0ZSkrJzwvdGQ+JzsKICAgICAgaCs9Jzx0ZCBjbGFzcz0iZGVzYy1jZWxsIj48c3BhbiBjbGFzcz0iZGVzYy1tYWluIiBzdHlsZT0iJyt3aG9TdHlsZSsnIiB0aXRsZT0iJytlc2ModC5kZXNjKSsnIj4nK2VzYyh0LmRlc2MpKyc8L3NwYW4+PHNwYW4gc3R5bGU9IicrYW10U3R5bGUrJ2ZvbnQtc2l6ZTouN3JlbTsiPicrc2lnbitmbXQodC5hbW91bnQpKyc8L3NwYW4+PC90ZD4nOwogICAgICBoKz0nPHRkIGNsYXNzPSJjYXQtY2VsbCI+JytjYXRCYWRnZXModCkrJzwvdGQ+JzsKICAgICAgaCs9Jzx0ZCBjbGFzcz0idHlwZS1jZWxsIj48c3BhbiBjbGFzcz0iYmFkZ2UgYi0nK3QudHlwZSsnIj4nKyh0LnR5cGU9PT0nZXhwZW5zZSc/J0V4cCc6dC50eXBlPT09J3JldHVybic/J1JldCc6J1BheScpKyc8L3NwYW4+PC90ZD4nOwogICAgICBoKz0nPHRkIGNsYXNzPSJiYWwtY2VsbCI+PHNwYW4gc3R5bGU9ImZvbnQtd2VpZ2h0OjYwMDtjb2xvcjonKyhuZWc/JyNkYzI2MjYnOicjMjU2M2ViJykrJzsiPicrZm10UyhiYWwpKyc8L3NwYW4+PC90ZD4nOwogICAgICBoKz0nPHRkIGNsYXNzPSJhY3QtY2VsbCI+JytyYitlYitkYisnPC90ZD4nOwogICAgICBoKz0nPC90cj4nOwogICAgfQogIH0pOwogIGJvZHkuaW5uZXJIVE1MPWg7Cn0KCi8vIOKUgOKUgCBFeHBvcnQgQ1NWIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgApmdW5jdGlvbiBleHBvcnRDU1YoKXsKICB2YXIgcm93cz1zb3J0ZWQoZ2V0RmlsdGVyZWQoKSk7aWYoIXJvd3MubGVuZ3RoKXthbGVydCgnTm90aGluZyB0byBleHBvcnQuJyk7cmV0dXJuO30KICB2YXIgYm09YnVpbGRCYWxNYXAoKTsKICB2YXIgbGluZXM9WydEYXRlLERlc2NyaXB0aW9uLENhdGVnb3J5LFR5cGUsQW1vdW50LEJhbGFuY2UsQ2xlYXJlZCddOwogIHJvd3MuZm9yRWFjaChmdW5jdGlvbih0KXsKICAgIGxpbmVzLnB1c2goW3QuZGF0ZSwnIicrdC5kZXNjLnJlcGxhY2UoLyIvZywnIiInKSsnIicsdC5jYXQsCiAgICAgIHQudHlwZT09PSdleHBlbnNlJz8nRXhwZW5zZSc6dC50eXBlPT09J3JldHVybic/J1JldHVybic6J1BheW1lbnQnLAogICAgICAodC50eXBlPT09J2V4cGVuc2UnPycnOictJykrdC5hbW91bnQudG9GaXhlZCgyKSxibVt0LmlkXS50b0ZpeGVkKDIpLHQuY2xlYXJlZD8nWWVzJzonTm8nXS5qb2luKCcsJykpOwogIH0pOwogIHZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTthLmhyZWY9VVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbbGluZXMuam9pbignXG4nKV0se3R5cGU6J3RleHQvY3N2J30pKTsKICBhLmRvd25sb2FkPSdjYy1yZWdpc3Rlci0nK3RvZGF5U3RyKCkrJy5jc3YnO2RvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7YS5jbGljaygpO2RvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7Cn0KCi8vIOKUgOKUgCBDU1YgSW1wb3J0IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgApmdW5jdGlvbiBwYXJzZUNTVkxpbmUobGluZSl7CiAgdmFyIHI9W10sY3VyPScnLHE9ZmFsc2U7CiAgZm9yKHZhciBpPTA7aTxsaW5lLmxlbmd0aDtpKyspewogICAgdmFyIGM9bGluZVtpXTsKICAgIGlmKGM9PT0nIicpe2lmKHEmJmxpbmVbaSsxXT09PSciJyl7Y3VyKz0nIic7aSsrO31lbHNlIHE9IXE7fQogICAgZWxzZSBpZihjPT09JywnJiYhcSl7ci5wdXNoKGN1ci50cmltKCkpO2N1cj0nJzt9CiAgICBlbHNlIGN1cis9YzsKICB9CiAgci5wdXNoKGN1ci50cmltKCkpO3JldHVybiByOwp9CmZ1bmN0aW9uIG5vcm1EYXRlKHJhdyl7CiAgcmF3PXJhdy50cmltKCk7CiAgaWYoL15cZHs0fS1cZHsyfS1cZHsyfSQvLnRlc3QocmF3KSlyZXR1cm4gcmF3OwogIHZhciBtPXJhdy5tYXRjaCgvXihcZHsxLDJ9KVwvKFxkezEsMn0pXC8oXGR7NH0pJC8pO2lmKG0pcmV0dXJuIG1bM10rJy0nK3BhZCgrbVsxXSkrJy0nK3BhZCgrbVsyXSk7CiAgbT1yYXcubWF0Y2goL14oXGR7MSwyfSktKFxkezEsMn0pLShcZHs0fSkkLyk7aWYobSlyZXR1cm4gbVszXSsnLScrcGFkKCttWzFdKSsnLScrcGFkKCttWzJdKTsKICB2YXIgZD1uZXcgRGF0ZShyYXcpO2lmKCFpc05hTihkKSlyZXR1cm4gZFN0cihkKTtyZXR1cm4gbnVsbDsKfQpmdW5jdGlvbiBpbXBvcnRDU1YoZmlsZSl7CiAgdmFyIHJlYWRlcj1uZXcgRmlsZVJlYWRlcigpOwogIHJlYWRlci5vbmxvYWQ9ZnVuY3Rpb24oZSl7CiAgICB2YXIgbGluZXM9ZS50YXJnZXQucmVzdWx0LnJlcGxhY2UoL1xyXG4vZywnXG4nKS5yZXBsYWNlKC9cci9nLCdcbicpLnNwbGl0KCdcbicpLmZpbHRlcihmdW5jdGlvbihsKXtyZXR1cm4gbC50cmltKCk7fSk7CiAgICBpZihsaW5lcy5sZW5ndGg8Mil7YWxlcnQoJ0NTViBoYXMgbm8gZGF0YSByb3dzLicpO3JldHVybjt9CiAgICB2YXIgaGRycz1wYXJzZUNTVkxpbmUobGluZXNbMF0pLm1hcChmdW5jdGlvbihoKXtyZXR1cm4gaC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16XS9nLCcnKTt9KTsKICAgIGZ1bmN0aW9uIGNvbChrd3MpewogICAgICBmb3IodmFyIGk9MDtpPGt3cy5sZW5ndGg7aSsrKXt2YXIgaWR4PWhkcnMuaW5kZXhPZihrd3NbaV0pO2lmKGlkeCE9PS0xKXJldHVybiBpZHg7fQogICAgICBmb3IodmFyIGk9MDtpPGt3cy5sZW5ndGg7aSsrKXtmb3IodmFyIGo9MDtqPGhkcnMubGVuZ3RoO2orKyl7aWYoaGRyc1tqXS5pbmRleE9mKGt3c1tpXSkhPT0tMSlyZXR1cm4gajt9fXJldHVybiAtMTsKICAgIH0KICAgIHZhciBjaT17ZGF0ZTpjb2woWydkYXRlJywndHJhbnNhY3Rpb25kYXRlJ10pLGRlc2M6Y29sKFsnZGVzY3JpcHRpb24nLCdkZXNjJywnbWVtbycsJ25hbWUnLCdtZXJjaGFudCcsJ3BheWVlJ10pLAogICAgICBhbW91bnQ6Y29sKFsnYW1vdW50JywnYW10JywnZGViaXQnLCdjcmVkaXQnXSksY2F0OmNvbChbJ2NhdGVnb3J5JywnY2F0J10pLAogICAgICB0eXBlOmNvbChbJ3R5cGUnLCd0eG50eXBlJ10pLGNsZWFyZWQ6Y29sKFsnY2xlYXJlZCcsJ3Bvc3RlZCcsJ3N0YXR1cyddKX07CiAgICBpZihjaS5kYXRlPT09LTEpe2FsZXJ0KCdDYW5ub3QgZmluZCBEYXRlIGNvbHVtbi4nKTtyZXR1cm47fQogICAgaWYoY2kuZGVzYz09PS0xKXthbGVydCgnQ2Fubm90IGZpbmQgRGVzY3JpcHRpb24gY29sdW1uLicpO3JldHVybjt9CiAgICBpZihjaS5hbW91bnQ9PT0tMSl7YWxlcnQoJ0Nhbm5vdCBmaW5kIEFtb3VudCBjb2x1bW4uJyk7cmV0dXJuO30KICAgIHZhciBhZGRlZD0wLGR1cGVzPTAsc2tpcHBlZD0wLG5ld0NhdHM9W10sdG9BZGQ9W107CiAgICBmb3IodmFyIGk9MTtpPGxpbmVzLmxlbmd0aDtpKyspewogICAgICB2YXIgcm93PXBhcnNlQ1NWTGluZShsaW5lc1tpXSk7CiAgICAgIHZhciBkYXRlPW5vcm1EYXRlKChyb3dbY2kuZGF0ZV18fCcnKSk7aWYoIWRhdGUpe3NraXBwZWQrKztjb250aW51ZTt9CiAgICAgIHZhciBkZXNjPShyb3dbY2kuZGVzY118fCcnKS50cmltKCk7aWYoIWRlc2Mpe3NraXBwZWQrKztjb250aW51ZTt9CiAgICAgIHZhciBhbXQ9cGFyc2VGbG9hdCgocm93W2NpLmFtb3VudF18fCcnKS5yZXBsYWNlKC9bJCxcc10vZywnJykpO2lmKGlzTmFOKGFtdCl8fCFhbXQpe3NraXBwZWQrKztjb250aW51ZTt9CiAgICAgIHZhciByYXdUPShyb3dbY2kudHlwZV18fCcnKS50cmltKCkudG9Mb3dlckNhc2UoKTsKICAgICAgdmFyIHR5cGU9cmF3VD09PSdleHBlbnNlJ3x8cmF3VD09PSdkZWJpdCc/J2V4cGVuc2UnOnJhd1Q9PT0ncmV0dXJuJ3x8cmF3VD09PSdyZWZ1bmQnPydyZXR1cm4nOnJhd1Q9PT0ncGF5bWVudCc/J3BheW1lbnQnOmFtdDwwPydyZXR1cm4nOidleHBlbnNlJzsKICAgICAgYW10PU1hdGguYWJzKGFtdCk7CiAgICAgIHZhciBjYXQ9KHJvd1tjaS5jYXRdfHwnJykudHJpbSgpfHwnT3RoZXInOwogICAgICB2YXIgY2xyPS8oeWVzfHRydWV8Y2xlYXJlZHxwb3N0ZWQpL2kudGVzdChyb3dbY2kuY2xlYXJlZF18fCcnKTsKICAgICAgaWYoY2F0JiZjYXRlZ29yaWVzLmluZGV4T2YoY2F0KT09PS0xJiZuZXdDYXRzLmluZGV4T2YoY2F0KT09PS0xKW5ld0NhdHMucHVzaChjYXQpOwogICAgICB0b0FkZC5wdXNoKHtpZDpEYXRlLm5vdygpK2ksZGF0ZTpkYXRlLGRlc2M6ZGVzYyxjYXQ6Y2F0LHR5cGU6dHlwZSxhbW91bnQ6YW10LGNsZWFyZWQ6Y2xyfSk7YWRkZWQrKzsKICAgIH0KICAgIGlmKCFhZGRlZCl7YWxlcnQoJ05vIHZhbGlkIHJvd3MgZm91bmQuJyk7cmV0dXJuO30KICAgIG5ld0NhdHMuZm9yRWFjaChmdW5jdGlvbihjKXtjYXRlZ29yaWVzLnB1c2goYyk7fSk7aWYobmV3Q2F0cy5sZW5ndGgpe3NhdmVDYXRzKCk7cmVuZGVyQ2F0U2VsZWN0cygpO30KICAgIHZhciBleD17fTt0cmFuc2FjdGlvbnMuZm9yRWFjaChmdW5jdGlvbih0KXtleFt0LmRhdGUrJ3wnK3QuZGVzYysnfCcrdC5hbW91bnRdPXRydWU7fSk7CiAgICB0b0FkZD10b0FkZC5maWx0ZXIoZnVuY3Rpb24odCl7dmFyIGs9dC5kYXRlKyd8Jyt0LmRlc2MrJ3wnK3QuYW1vdW50O2lmKGV4W2tdKXtkdXBlcysrO3JldHVybiBmYWxzZTt9ZXhba109dHJ1ZTtyZXR1cm4gdHJ1ZTt9KTsKICAgIHRvQWRkLmZvckVhY2goZnVuY3Rpb24odCl7dHJhbnNhY3Rpb25zLnB1c2godCk7fSk7c2F2ZSgpO3JlbmRlckFsbCgpOwogICAgYWxlcnQoJ0RvbmUhICcrdG9BZGQubGVuZ3RoKycgYWRkZWQnKyhkdXBlcz8nIMK3ICcrZHVwZXMrJyBkdXBlcyBza2lwcGVkJzonJykrKHNraXBwZWQ/JyDCtyAnK3NraXBwZWQrJyBpbnZhbGlkJzonJykrKG5ld0NhdHMubGVuZ3RoPycgwrcgTmV3IGNhdHM6ICcrbmV3Q2F0cy5qb2luKCcsICcpOicnKSk7CiAgfTsKICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTsKfQoKLy8g4pSA4pSAIEJhY2t1cCAvIFJlc3RvcmUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACmZ1bmN0aW9uIGJhY2t1cCgpewogIHZhciBkYXRhPXt2ZXJzaW9uOjcsZXhwb3J0ZWQ6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLAogICAgdHJhbnNhY3Rpb25zOnRyYW5zYWN0aW9ucyxjYXRlZ29yaWVzOmNhdGVnb3JpZXMsCiAgICBjaGtUeG5zOmNoay5nZXRUeG5zKCksY2hrT3BlbkJhbDpjaGsuZ2V0T3BlbkJhbCgpLAogICAgbWlrZVR4bnM6bWlrZS5nZXRUeG5zKCksbWlrZU9wZW5CYWw6bWlrZS5nZXRPcGVuQmFsKCksCiAgICBzYXZpbmdzVHhuczpzYXYuZ2V0VHhucygpLHNhdmluZ3NPcGVuQmFsOnNhdi5nZXRPcGVuQmFsKCksCiAgICBoeXNhVHhuczpoeXNhLmdldFR4bnMoKSxoeXNhT3BlbkJhbDpoeXNhLmdldE9wZW5CYWwoKSwKICAgIGNjTm90ZXM6c0dldCgnY2Mtbm90ZXMnKXx8JycsY2hrTm90ZXM6c0dldCgnY2hrLW5vdGVzJyl8fCcnLG1pa2VOb3RlczpzR2V0KCdtaWtlLW5vdGVzJyl8fCcnLAogICAgc2F2aW5nc05vdGVzOnNHZXQoJ3NhdmluZ3Mtbm90ZXMnKXx8JycsaHlzYU5vdGVzOnNHZXQoJ2h5c2Etbm90ZXMnKXx8Jyd9OwogIHZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTthLmhyZWY9VVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkoZGF0YSxudWxsLDIpXSx7dHlwZTonYXBwbGljYXRpb24vanNvbid9KSk7CiAgYS5kb3dubG9hZD0ncmVnaXN0ZXItYmFja3VwLScrdG9kYXlTdHIoKSsnLmpzb24nO2RvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7YS5jbGljaygpO2RvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7Cn0KZnVuY3Rpb24gcGVyc2lzdEFsbCgpewogIC8vIFdyaXRlIGRpcmVjdGx5IHRvIGxvY2FsU3RvcmFnZSDigJQgYnlwYXNzZXMgdGhlIF9tZW0gZmFsbGJhY2sgc28gd2UgY2FuIGRldGVjdCBmYWlsdXJlCiAgdmFyIG9rPXRydWU7CiAgdHJ5ewogICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NjLXJlZ2lzdGVyJyxKU09OLnN0cmluZ2lmeSh0cmFuc2FjdGlvbnMpKTsKICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjYy1jYXRlZ29yaWVzJyxKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7CiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2hrLXJlZ2lzdGVyJyxKU09OLnN0cmluZ2lmeShjaGsuZ2V0VHhucygpKSk7CiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2hrLW9wZW4tYmFsJyxjaGsuZ2V0T3BlbkJhbCgpLnRvU3RyaW5nKCkpOwogICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ21pa2UtcmVnaXN0ZXInLEpTT04uc3RyaW5naWZ5KG1pa2UuZ2V0VHhucygpKSk7CiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnbWlrZS1vcGVuLWJhbCcsbWlrZS5nZXRPcGVuQmFsKCkudG9TdHJpbmcoKSk7CiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnc2F2aW5ncy1yZWdpc3RlcicsSlNPTi5zdHJpbmdpZnkoc2F2LmdldFR4bnMoKSkpOwogICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3NhdmluZ3Mtb3Blbi1iYWwnLHNhdi5nZXRPcGVuQmFsKCkudG9TdHJpbmcoKSk7CiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnaHlzYS1yZWdpc3RlcicsSlNPTi5zdHJpbmdpZnkoaHlzYS5nZXRUeG5zKCkpKTsKICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdoeXNhLW9wZW4tYmFsJyxoeXNhLmdldE9wZW5CYWwoKS50b1N0cmluZygpKTsKICB9Y2F0Y2goZSl7b2s9ZmFsc2U7fQogIHJldHVybiBvazsKfQpmdW5jdGlvbiByZXN0b3JlKGZpbGUpewogIHZhciByZWFkZXI9bmV3IEZpbGVSZWFkZXIoKTsKICByZWFkZXIub25sb2FkPWZ1bmN0aW9uKGUpewogICAgdHJ5ewogICAgICB2YXIgZGF0YT1KU09OLnBhcnNlKGUudGFyZ2V0LnJlc3VsdCk7CiAgICAgIGlmKCFkYXRhLnRyYW5zYWN0aW9uc3x8IUFycmF5LmlzQXJyYXkoZGF0YS50cmFuc2FjdGlvbnMpKXthbGVydCgnSW52YWxpZCBiYWNrdXAgZmlsZS4nKTtyZXR1cm47fQogICAgICBpZighY29uZmlybSgnUmVwbGFjZSBBTEwgZGF0YT8gQ2Fubm90IGJlIHVuZG9uZS4nKSlyZXR1cm47CiAgICAgIC8vIFVwZGF0ZSBpbi1tZW1vcnkgc3RhdGUgZmlyc3QKICAgICAgdHJhbnNhY3Rpb25zPWRhdGEudHJhbnNhY3Rpb25zOwogICAgICBpZihkYXRhLmNhdGVnb3JpZXMpY2F0ZWdvcmllcz1kYXRhLmNhdGVnb3JpZXM7CiAgICAgIGlmKGRhdGEuY2hrVHhucyYmQXJyYXkuaXNBcnJheShkYXRhLmNoa1R4bnMpKWNoay5zZXRUeG5zKGRhdGEuY2hrVHhucyk7CiAgICAgIGlmKGRhdGEuY2hrT3BlbkJhbCE9bnVsbCljaGsuc2V0T3BlbkJhbChwYXJzZUZsb2F0KGRhdGEuY2hrT3BlbkJhbCl8fDApOwogICAgICBpZihkYXRhLm1pa2VUeG5zJiZBcnJheS5pc0FycmF5KGRhdGEubWlrZVR4bnMpKW1pa2Uuc2V0VHhucyhkYXRhLm1pa2VUeG5zKTsKICAgICAgaWYoZGF0YS5taWtlT3BlbkJhbCE9bnVsbCltaWtlLnNldE9wZW5CYWwocGFyc2VGbG9hdChkYXRhLm1pa2VPcGVuQmFsKXx8MCk7CiAgICAgIGlmKGRhdGEuc2F2aW5nc1R4bnMmJkFycmF5LmlzQXJyYXkoZGF0YS5zYXZpbmdzVHhucykpc2F2LnNldFR4bnMoZGF0YS5zYXZpbmdzVHhucyk7CiAgICAgIGlmKGRhdGEuc2F2aW5nc09wZW5CYWwhPW51bGwpc2F2LnNldE9wZW5CYWwocGFyc2VGbG9hdChkYXRhLnNhdmluZ3NPcGVuQmFsKXx8MCk7CiAgICAgIGlmKGRhdGEuaHlzYVR4bnMmJkFycmF5LmlzQXJyYXkoZGF0YS5oeXNhVHhucykpaHlzYS5zZXRUeG5zKGRhdGEuaHlzYVR4bnMpOwogICAgICBpZihkYXRhLmh5c2FPcGVuQmFsIT1udWxsKWh5c2Euc2V0T3BlbkJhbChwYXJzZUZsb2F0KGRhdGEuaHlzYU9wZW5CYWwpfHwwKTsKICAgICAgaWYoZGF0YS5jY05vdGVzIT1udWxsKXtzU2V0KCdjYy1ub3RlcycsZGF0YS5jY05vdGVzKTskKCdjYy1ub3RlcycpLnZhbHVlPWRhdGEuY2NOb3Rlczt9CiAgICAgIGlmKGRhdGEuY2hrTm90ZXMhPW51bGwpe3NTZXQoJ2Noay1ub3RlcycsZGF0YS5jaGtOb3Rlcyk7JCgnY2hrLW5vdGVzJykudmFsdWU9ZGF0YS5jaGtOb3Rlczt9CiAgICAgIGlmKGRhdGEubWlrZU5vdGVzIT1udWxsKXtzU2V0KCdtaWtlLW5vdGVzJyxkYXRhLm1pa2VOb3Rlcyk7JCgnbWlrZS1ub3RlcycpLnZhbHVlPWRhdGEubWlrZU5vdGVzO30KICAgICAgaWYoZGF0YS5zYXZpbmdzTm90ZXMhPW51bGwpe3NTZXQoJ3NhdmluZ3Mtbm90ZXMnLGRhdGEuc2F2aW5nc05vdGVzKTskKCdzYXZpbmdzLW5vdGVzJykudmFsdWU9ZGF0YS5zYXZpbmdzTm90ZXM7fQogICAgICBpZihkYXRhLmh5c2FOb3RlcyE9bnVsbCl7c1NldCgnaHlzYS1ub3RlcycsZGF0YS5oeXNhTm90ZXMpOyQoJ2h5c2Etbm90ZXMnKS52YWx1ZT1kYXRhLmh5c2FOb3Rlczt9CiAgICAgIC8vIFBlcnNpc3QgZXZlcnl0aGluZwogICAgICB2YXIgb2s9cGVyc2lzdEFsbCgpOwogICAgICByZW5kZXJDYXRTZWxlY3RzKCk7cmVuZGVyQWxsKCk7CiAgICAgIGlmKGFjdGl2ZVRhYj09PSdjaGsnKWNoay5hY3RpdmF0ZVBhbmUoKTtlbHNlIGlmKGFjdGl2ZVRhYj09PSdtaWtlJyltaWtlLmFjdGl2YXRlUGFuZSgpO2Vsc2UgaWYoYWN0aXZlVGFiPT09J3NhdmluZ3MnKXNhdi5hY3RpdmF0ZVBhbmUoKTtlbHNlIGlmKGFjdGl2ZVRhYj09PSdoeXNhJyloeXNhLmFjdGl2YXRlUGFuZSgpOwogICAgICB2YXIgY249Y2hrLmdldFR4bnMoKS5sZW5ndGgsbW49bWlrZS5nZXRUeG5zKCkubGVuZ3RoLHNuPXNhdi5nZXRUeG5zKCkubGVuZ3RoLGhuPWh5c2EuZ2V0VHhucygpLmxlbmd0aDsKICAgICAgaWYob2spewogICAgICAgIGFsZXJ0KCdSZXN0b3JlZCEgJyt0cmFuc2FjdGlvbnMubGVuZ3RoKycgQ0MgKyAnK2NuKycgQ2hrICsgJyttbisnIE1pa2UgKyAnK3NuKycgU2F2aW5ncyArICcraG4rJyBIWVNBIHRyYW5zYWN0aW9ucyBsb2FkZWQuJyk7CiAgICAgIH0gZWxzZSB7CiAgICAgICAgYWxlcnQoJ1Jlc3RvcmVkIGluIHRoaXMgc2Vzc2lvbiwgYnV0IGxvY2FsU3RvcmFnZSBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50IOKAlCBkYXRhIG1heSBub3Qgc3Vydml2ZSBhIHBhZ2UgcmVmcmVzaC4gQ29uc2lkZXIga2VlcGluZyB0aGUgYmFja3VwIGZpbGUgaGFuZHkuJyk7CiAgICAgIH0KICAgIH1jYXRjaChlcnIpe2FsZXJ0KCdFcnJvcjogJytlcnIubWVzc2FnZSk7fQogIH07CiAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7Cn0KCi8vIOKUgOKUgCBBSSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKdmFyIE1PTlRIUz1bJ2phbnVhcnknLCdmZWJydWFyeScsJ21hcmNoJywnYXByaWwnLCdtYXknLCdqdW5lJywnanVseScsJ2F1Z3VzdCcsJ3NlcHRlbWJlcicsJ29jdG9iZXInLCdub3ZlbWJlcicsJ2RlY2VtYmVyJ107CmZ1bmN0aW9uIHBhcnNlUGVyaW9kKHRleHQpewogIHZhciBub3c9bmV3IERhdGUoKSx5PW5vdy5nZXRGdWxsWWVhcigpLG09bm93LmdldE1vbnRoKCksZD1ub3cuZ2V0RGF0ZSgpOwogIGlmKC90aGlzIHdlZWsvLnRlc3QodGV4dCkpe3ZhciBkdz1ub3cuZ2V0RGF5KCkscz1uZXcgRGF0ZSh5LG0sZC1kdyk7cmV0dXJue3N0YXJ0OmRTdHIocyksZW5kOmRTdHIobm93KSxsYWJlbDondGhpcyB3ZWVrJ307fQogIGlmKC9sYXN0IHdlZWsvLnRlc3QodGV4dCkpe3ZhciBkdzI9bm93LmdldERheSgpO3JldHVybntzdGFydDpkU3RyKG5ldyBEYXRlKHksbSxkLWR3Mi03KSksZW5kOmRTdHIobmV3IERhdGUoeSxtLGQtZHcyLTEpKSxsYWJlbDonbGFzdCB3ZWVrJ307fQogIGlmKC90aGlzIG1vbnRoLy50ZXN0KHRleHQpKXJldHVybntzdGFydDp5KyctJytwYWQobSsxKSsnLTAxJyxlbmQ6ZFN0cihub3cpLGxhYmVsOid0aGlzIG1vbnRoJ307CiAgaWYoL2xhc3QgbW9udGgvLnRlc3QodGV4dCkpe3ZhciBsbT1uZXcgRGF0ZSh5LG0tMSwxKSxsZT1uZXcgRGF0ZSh5LG0sMCk7cmV0dXJue3N0YXJ0OmRTdHIobG0pLGVuZDpkU3RyKGxlKSxsYWJlbDonbGFzdCBtb250aCd9O30KICBpZigvdGhpcyB5ZWFyLy50ZXN0KHRleHQpKXJldHVybntzdGFydDp5KyctMDEtMDEnLGVuZDpkU3RyKG5vdyksbGFiZWw6J3RoaXMgeWVhcid9OwogIGlmKC9sYXN0IHllYXIvLnRlc3QodGV4dCkpcmV0dXJue3N0YXJ0Oih5LTEpKyctMDEtMDEnLGVuZDooeS0xKSsnLTEyLTMxJyxsYWJlbDonbGFzdCB5ZWFyJ307CiAgZm9yKHZhciBpPTA7aTxNT05USFMubGVuZ3RoO2krKyl7aWYodGV4dC5pbmRleE9mKE1PTlRIU1tpXSkhPT0tMSl7dmFyIG15PWk+bT95LTE6eTtyZXR1cm57c3RhcnQ6bXkrJy0nK3BhZChpKzEpKyctMDEnLGVuZDpkU3RyKG5ldyBEYXRlKG15LGkrMSwwKSksbGFiZWw6TU9OVEhTW2ldfTt9fQogIHJldHVybiBudWxsOwp9CmZ1bmN0aW9uIGluUChkYXRlLHApe3JldHVybiBkYXRlPj1wLnN0YXJ0JiZkYXRlPD1wLmVuZDt9CmZ1bmN0aW9uIGZpbmRNZXJjaGFudCh0ZXh0KXsKICB2YXIgYz10ZXh0LnJlcGxhY2UoL2hvdyBtdWNofGRpZCBpIHNwZW5kfGhhdmUgaSBzcGVudHxzcGVudHx0b3RhbHxmb3J8b258YXR8dGhlfGl8d2hhdHxpc3xteXxhbGx8c2hvd3xtZXxnaXZlfGlufGR1cmluZ3x3ZWVrfG1vbnRofHllYXJ8dGhpc3xsYXN0fHRvZGF5fHllc3RlcmRheS9nLCcgJykKICAgIC5yZXBsYWNlKG5ldyBSZWdFeHAoTU9OVEhTLmpvaW4oJ3wnKSwnZycpLCcgJykucmVwbGFjZSgvW15hLXowLTlcc10vZywnICcpLnJlcGxhY2UoL1xzKy9nLCcgJykudHJpbSgpOwogIHJldHVybiBjLnNwbGl0KCcgJykuZmlsdGVyKGZ1bmN0aW9uKHcpe3JldHVybiB3Lmxlbmd0aD4yO30pLmpvaW4oJyAnKS50cmltKCl8fG51bGw7Cn0KZnVuY3Rpb24gYWlRdWVyeShxKXsKICB2YXIgdGV4dD1xLnRvTG93ZXJDYXNlKCkudHJpbSgpLHQ9dHJhbnNhY3Rpb25zOwogIGlmKCF0Lmxlbmd0aClyZXR1cm4gIk5vIHRyYW5zYWN0aW9ucyB5ZXQuIEFkZCBzb21lIHRvIGdldCBzdGFydGVkISI7CiAgdmFyIGV4cD10LmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geC50eXBlPT09J2V4cGVuc2UnO30pLHJldD10LmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geC50eXBlPT09J3JldHVybic7fSk7CiAgdmFyIHBheT10LmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geC50eXBlPT09J3BheW1lbnQnO30pOwogIHZhciB0ZT1leHAucmVkdWNlKGZ1bmN0aW9uKHMseCl7cmV0dXJuIHMreC5hbW91bnQ7fSwwKSx0cj1yZXQucmVkdWNlKGZ1bmN0aW9uKHMseCl7cmV0dXJuIHMreC5hbW91bnQ7fSwwKTsKICB2YXIgdHA9cGF5LnJlZHVjZShmdW5jdGlvbihzLHgpe3JldHVybiBzK3guYW1vdW50O30sMCksYmFsPXRlLXRyLXRwOwogIHZhciBwZXJpb2Q9cGFyc2VQZXJpb2QodGV4dCksbWVyY2hhbnQ9ZmluZE1lcmNoYW50KHRleHQpOwogIGlmKG1lcmNoYW50JiZtZXJjaGFudC5sZW5ndGg+MSl7CiAgICB2YXIgbWw9bWVyY2hhbnQudG9Mb3dlckNhc2UoKSxtYT10LmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geC5kZXNjLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihtbCkhPT0tMTt9KTsKICAgIGlmKCFtYS5sZW5ndGgpe3ZhciB3ZHM9bWwuc3BsaXQoJyAnKS5maWx0ZXIoZnVuY3Rpb24odyl7cmV0dXJuIHcubGVuZ3RoPjI7fSk7aWYod2RzLmxlbmd0aCltYT10LmZpbHRlcihmdW5jdGlvbih4KXt2YXIgZGw9eC5kZXNjLnRvTG93ZXJDYXNlKCk7cmV0dXJuIHdkcy5zb21lKGZ1bmN0aW9uKHcpe3JldHVybiBkbC5pbmRleE9mKHcpIT09LTE7fSk7fSk7fQogICAgaWYobWEubGVuZ3RoKXsKICAgICAgdmFyIG1mPXBlcmlvZD9tYS5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIGluUCh4LmRhdGUscGVyaW9kKTt9KTptYTsKICAgICAgaWYoIW1mLmxlbmd0aClyZXR1cm4gJ05vICInK21lcmNoYW50KyciIHRyYW5zYWN0aW9ucyBmb3VuZCcrKHBlcmlvZD8nICcrcGVyaW9kLmxhYmVsOicnKSsnLic7CiAgICAgIHZhciBtZXg9bWYuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiB4LnR5cGU9PT0nZXhwZW5zZSc7fSksbXJ0PW1mLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geC50eXBlPT09J3JldHVybic7fSk7CiAgICAgIHZhciBtdGU9bWV4LnJlZHVjZShmdW5jdGlvbihzLHgpe3JldHVybiBzK3guYW1vdW50O30sMCksbXRyPW1ydC5yZWR1Y2UoZnVuY3Rpb24ocyx4KXtyZXR1cm4gcyt4LmFtb3VudDt9LDApOwogICAgICB2YXIgcj0nIicrbWVyY2hhbnQrJyInKyhwZXJpb2Q/JyAoJytwZXJpb2QubGFiZWwrJyknOicnKSsnOlxuJzsKICAgICAgcis9J+KAoiAnK21mLmxlbmd0aCsnIHRyYW5zYWN0aW9uJysobWYubGVuZ3RoIT09MT8ncyc6JycpKydcbic7CiAgICAgIGlmKG1leC5sZW5ndGgpcis9J+KAoiBFeHBlbnNlczogJytmbXQobXRlKSsnXG4nO2lmKG1ydC5sZW5ndGgpcis9J+KAoiBSZXR1cm5zOiAnK2ZtdChtdHIpKydcbic7CiAgICAgIHIrPSfigKIgTmV0OiAnK2ZtdFMobXRlLW10cik7CiAgICAgIHZhciBzbD1tZi5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi5kYXRlLmxvY2FsZUNvbXBhcmUoYS5kYXRlKTt9KS5zbGljZSgwLDgpOwogICAgICByKz0nXG5cblRyYW5zYWN0aW9uczpcbicrc2wubWFwKGZ1bmN0aW9uKHgpe3JldHVybiAnICAnK2ZtdEQoeC5kYXRlKSsnIOKAlCAnKyh4LnR5cGU9PT0nZXhwZW5zZSc/JysnOictJykrZm10KHguYW1vdW50KSsoeC5jbGVhcmVkPycg4pyTJzonJyk7fSkuam9pbignXG4nKTsKICAgICAgaWYobWYubGVuZ3RoPjgpcis9J1xuICDigKYgYW5kICcrKG1mLmxlbmd0aC04KSsnIG1vcmUnOwogICAgICByZXR1cm4gcjsKICAgIH0KICB9CiAgaWYocGVyaW9kKXsKICAgIHZhciBwZT1leHAuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiBpblAoeC5kYXRlLHBlcmlvZCk7fSkscHI9cmV0LmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4gaW5QKHguZGF0ZSxwZXJpb2QpO30pLHBwPXBheS5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIGluUCh4LmRhdGUscGVyaW9kKTt9KTsKICAgIHZhciBwZXQ9cGUucmVkdWNlKGZ1bmN0aW9uKHMseCl7cmV0dXJuIHMreC5hbW91bnQ7fSwwKSxwcnQ9cHIucmVkdWNlKGZ1bmN0aW9uKHMseCl7cmV0dXJuIHMreC5hbW91bnQ7fSwwKSxwcHQ9cHAucmVkdWNlKGZ1bmN0aW9uKHMseCl7cmV0dXJuIHMreC5hbW91bnQ7fSwwKTsKICAgIGlmKCFwZS5sZW5ndGgmJiFwci5sZW5ndGgmJiFwcC5sZW5ndGgpcmV0dXJuICdObyB0cmFuc2FjdGlvbnMgZm9yICcrcGVyaW9kLmxhYmVsKycuJzsKICAgIHZhciBjdD17fTtwZS5mb3JFYWNoKGZ1bmN0aW9uKHgpe2N0W3guY2F0XT0oY3RbeC5jYXRdfHwwKSt4LmFtb3VudDt9KTsKICAgIHZhciB0Yz1PYmplY3Qua2V5cyhjdCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBjdFtiXS1jdFthXTt9KS5zbGljZSgwLDMpOwogICAgdmFyIHI9J1N1bW1hcnkgZm9yICcrcGVyaW9kLmxhYmVsKyc6XG7igKIgRXhwZW5zZXM6ICcrZm10KHBldCkrJyAoJytwZS5sZW5ndGgrJyB0cmFuc2FjdGlvbnMpXG4nOwogICAgaWYocHJ0KXIrPSfigKIgUmV0dXJuczogJytmbXQocHJ0KSsnXG4nO2lmKHBwdClyKz0n4oCiIFBheW1lbnRzOiAnK2ZtdChwcHQpKydcbic7CiAgICByKz0n4oCiIE5ldDogJytmbXRTKHBldC1wcnQtcHB0KTsKICAgIGlmKHRjLmxlbmd0aClyKz0nXG5cblRvcCBjYXRlZ29yaWVzOlxuJyt0Yy5tYXAoZnVuY3Rpb24oYyxpKXtyZXR1cm4gKGkrMSkrJy4gJytjKycg4oCUICcrZm10KGN0W2NdKTt9KS5qb2luKCdcbicpOwogICAgcmV0dXJuIHI7CiAgfQogIGlmKC9oZWxwLy50ZXN0KHRleHQpKXJldHVybiAnVHJ5Olxu4oCiICJIb3cgbXVjaCBvbiBTdGFyYnVja3MgdGhpcyBtb250aD8iXG7igKIgIlNwZW5kaW5nIHRoaXMgd2VlayJcbuKAoiAiSG93IG11Y2ggdGhpcyB5ZWFyPyJcbuKAoiAiVG9wIGNhdGVnb3JpZXMiXG7igKIgIkJhbGFuY2UiXG7igKIgIlN1Z2dlc3Rpb25zIic7CiAgaWYoL2JhbGFuY2UvLnRlc3QodGV4dCkpcmV0dXJuICdCYWxhbmNlOiAnK2ZtdFMoYmFsKSsnXG5cbuKAoiBFeHBlbnNlczogJytmbXQodGUpKydcbuKAoiBSZXR1cm5zOiAnK2ZtdCh0cikrJ1xu4oCiIFBheW1lbnRzOiAnK2ZtdCh0cCk7CiAgaWYoL3BheW1lbnR8cGFpZC8udGVzdCh0ZXh0KSl7aWYoIXBheS5sZW5ndGgpcmV0dXJuICdObyBwYXltZW50cyB5ZXQuJzt2YXIgbHA9cGF5LnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBiLmRhdGUubG9jYWxlQ29tcGFyZShhLmRhdGUpO30pWzBdO3JldHVybiAnVG90YWwgcGF5bWVudHM6ICcrZm10KHRwKSsnICgnK3BheS5sZW5ndGgrJyBwYXltZW50cylcbk1vc3QgcmVjZW50OiAnK2ZtdChscC5hbW91bnQpKycgb24gJytmbXREKGxwLmRhdGUpO30KICBpZigvcmV0dXJufHJlZnVuZC8udGVzdCh0ZXh0KSlyZXR1cm4gIXJldC5sZW5ndGg/J05vIHJldHVybnMgeWV0Lic6J1RvdGFsIHJldHVybnM6ICcrZm10KHRyKSsnICgnK3JldC5sZW5ndGgrJyByZXR1cm5zKSc7CiAgaWYoL2NsZWFyZWR8dW5jbGVhcmVkfHBlbmRpbmcvLnRlc3QodGV4dCkpe3ZhciBjbD10LmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geC5jbGVhcmVkO30pLHVjPXQuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiAheC5jbGVhcmVkO30pO3JldHVybiAnQ2xlYXJlZDogJytjbC5sZW5ndGgrJ1xuVW5jbGVhcmVkL3BlbmRpbmc6ICcrdWMubGVuZ3RoO30KICBpZigvYmlnZ2VzdHxsYXJnZXN0fG1vc3QgZXhwZW5zaXZlLy50ZXN0KHRleHQpKXtpZighZXhwLmxlbmd0aClyZXR1cm4gJ05vIGV4cGVuc2VzIHlldC4nO3ZhciBiaWc9ZXhwLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBiLmFtb3VudC1hLmFtb3VudDt9KVswXTtyZXR1cm4gJ0JpZ2dlc3QgZXhwZW5zZTogJytmbXQoYmlnLmFtb3VudCkrJ1xuIicrYmlnLmRlc2MrJyIgb24gJytmbXREKGJpZy5kYXRlKTt9CiAgaWYoL3RvcC4qY2F0ZWdvcnxjYXRlZ29yLipzcGVuZC8udGVzdCh0ZXh0KSl7dmFyIGN0Mj17fTtleHAuZm9yRWFjaChmdW5jdGlvbih4KXtjdDJbeC5jYXRdPShjdDJbeC5jYXRdfHwwKSt4LmFtb3VudDt9KTt2YXIgcms9T2JqZWN0LmtleXMoY3QyKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGN0MltiXS1jdDJbYV07fSkuc2xpY2UoMCw1KTtyZXR1cm4gcmsubGVuZ3RoPydUb3AgY2F0ZWdvcmllczpcbicrcmsubWFwKGZ1bmN0aW9uKGMsaSl7cmV0dXJuIChpKzEpKycuICcrYysnIOKAlCAnK2ZtdChjdDJbY10pO30pLmpvaW4oJ1xuJyk6J05vIGV4cGVuc2VzIHlldC4nO30KICBpZigvYXZlcmFnZXxhdmcvLnRlc3QodGV4dCkpcmV0dXJuICFleHAubGVuZ3RoPydObyBleHBlbnNlcyB5ZXQuJzonQXZlcmFnZSBleHBlbnNlOiAnK2ZtdCh0ZS9leHAubGVuZ3RoKSsnICgnK2V4cC5sZW5ndGgrJyB0b3RhbCknOwogIGlmKC9yZWNlbnR8bGF0ZXN0Ly50ZXN0KHRleHQpKXt2YXIgbj01LG14PXRleHQubWF0Y2goL2xhc3QgKFxkKykvKTtpZihteCluPStteFsxXTtyZXR1cm4gJ0xhc3QgJytuKyc6XG4nK3Quc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGIuZGF0ZS5sb2NhbGVDb21wYXJlKGEuZGF0ZSl8fGIuaWQtYS5pZDt9KS5zbGljZSgwLG4pLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gJ+KAoiAnK2ZtdEQoeC5kYXRlKSsnICcreC5kZXNjKycgJysoeC50eXBlPT09J2V4cGVuc2UnPycrJzonLScpK2ZtdCh4LmFtb3VudCk7fSkuam9pbignXG4nKTt9CiAgaWYoL3N1Z2dlc3R8dGlwfGFkdmljZXxzYXZpbmd8YnVkZ2V0Ly50ZXN0KHRleHQpKXt2YXIgdGlwcz1bXSxjdDM9e307ZXhwLmZvckVhY2goZnVuY3Rpb24oeCl7Y3QzW3guY2F0XT0oY3QzW3guY2F0XXx8MCkreC5hbW91bnQ7fSk7dmFyIHJrMz1PYmplY3Qua2V5cyhjdDMpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gY3QzW2JdLWN0M1thXTt9KTtpZihyazMubGVuZ3RoKXRpcHMucHVzaCgnVG9wIGNhdGVnb3J5OiAnK3JrM1swXSsnIGF0ICcrZm10KGN0M1tyazNbMF1dKSsnLiBDb25zaWRlciBidWRnZXRpbmcgaGVyZS4nKTtpZighdHApdGlwcy5wdXNoKCdObyBwYXltZW50cyByZWNvcmRlZCB5ZXQg4oCUIGxvZyBwYXltZW50cyB0byB0cmFjayB5b3VyIGJhbGFuY2UgYWNjdXJhdGVseS4nKTtpZihiYWw+NTAwKXRpcHMucHVzaCgnQmFsYW5jZSBpcyAnK2ZtdFMoYmFsKSsnLiBBIHBheW1lbnQgd291bGQgcmVkdWNlIHBvdGVudGlhbCBpbnRlcmVzdC4nKTtpZighdGlwcy5sZW5ndGgpdGlwcy5wdXNoKCdLZWVwIHRyYWNraW5nISBZb3VcJ3JlIGRvaW5nIGdyZWF0LicpO3JldHVybiAnU3VnZ2VzdGlvbnM6XG5cbicrdGlwcy5qb2luKCdcblxuJyk7fQogIGZvcih2YXIgaT0wO2k8Y2F0ZWdvcmllcy5sZW5ndGg7aSsrKXtpZih0ZXh0LmluZGV4T2YoY2F0ZWdvcmllc1tpXS50b0xvd2VyQ2FzZSgpKSE9PS0xKXt2YXIgY2U9ZXhwLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4geC5jYXQudG9Mb3dlckNhc2UoKT09PWNhdGVnb3JpZXNbaV0udG9Mb3dlckNhc2UoKTt9KTt2YXIgY2V0PWNlLnJlZHVjZShmdW5jdGlvbihzLHgpe3JldHVybiBzK3guYW1vdW50O30sMCk7cmV0dXJuIGNlLmxlbmd0aD8nU3BlbmRpbmcgaW4gJytjYXRlZ29yaWVzW2ldKyc6ICcrZm10KGNldCkrJyAoJytjZS5sZW5ndGgrJyB0cmFuc2FjdGlvbnMpJzonTm8gZXhwZW5zZXMgaW4gJytjYXRlZ29yaWVzW2ldKycgeWV0Lic7fX0KICByZXR1cm4gJ05vdCBzdXJlIGFib3V0IHRoYXQuIFR5cGUgImhlbHAiIGZvciBleGFtcGxlcy4nOwp9CgovLyDilIDilIAgQUkgVUkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACmZ1bmN0aW9uIGFpTXNnKHRleHQsd2hvKXt2YXIgYj0kKCdhaS1tc2dzJyksZD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtkLmNsYXNzTmFtZT0nYWktbXNnICcrd2hvO2QudGV4dENvbnRlbnQ9dGV4dDtiLmFwcGVuZENoaWxkKGQpO2Iuc2Nyb2xsVG9wPWIuc2Nyb2xsSGVpZ2h0O30KZnVuY3Rpb24gYWlTdWJtaXQoKXt2YXIgaW5wPSQoJ2FpLWluJykscT1pbnAudmFsdWUudHJpbSgpO2lmKCFxKXJldHVybjtpbnAudmFsdWU9Jyc7YWlNc2cocSwndXNlcicpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXthaU1zZyhhaVF1ZXJ5KHEpLCdib3QnKTt9LDgwKTt9CgovLyDilIDilIAgRXZlbnRzIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAokKCdidG4tYWRkJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGFkZFR4bik7CiQoJ3R4bi1hbXQnKS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyxmdW5jdGlvbihlKXtpZihlLmtleT09PSdFbnRlcicpYWRkVHhuKCk7fSk7CgovLyBGaWx0ZXJzClsnZi1zZWFyY2gnLCdmLWNhdCcsJ2YtdHlwZScsJ2YtZnJvbScsJ2YtdG8nXS5mb3JFYWNoKGZ1bmN0aW9uKGlkKXsKICAkKGlkKS5hZGRFdmVudExpc3RlbmVyKGlkPT09J2Ytc2VhcmNoJz8naW5wdXQnOidjaGFuZ2UnLGZ1bmN0aW9uKCl7cmVuZGVyVGFibGUoKTt9KTsKfSk7CiQoJ2J0bi1jbHItZmlsdGVyJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7WydmLXNlYXJjaCcsJ2YtY2F0JywnZi10eXBlJywnZi1mcm9tJywnZi10byddLmZvckVhY2goZnVuY3Rpb24oaWQpeyQoaWQpLnZhbHVlPScnO30pO3JlbmRlclRhYmxlKCk7fSk7Ci8vIENDIG11bHRpLWNhdCBwaWNrZXJzCmZ1bmN0aW9uIGFkZENDQ2hpcCgpewogIHZhciB2PSQoJ3R4bi1jYXQnKS52YWx1ZSxhPXBhcnNlRmxvYXQoJCgndHhuLWNhdC1hbXQnKS52YWx1ZSk7CiAgaWYoIXYpcmV0dXJuOwogIGlmKGNjQWRkQ2F0cy5zb21lKGZ1bmN0aW9uKHgpe3JldHVybiAodHlwZW9mIHg9PT0nc3RyaW5nJz94OnguY2F0KT09PXY7fSkpcmV0dXJuOwogIGNjQWRkQ2F0cy5wdXNoKHtjYXQ6dixhbXQ6aXNOYU4oYSl8fGE8PTA/bnVsbDphfSk7CiAgcmVuZGVyQ0NDaGlwcygnY2MtYWRkLWNoaXBzJyxjY0FkZENhdHMpOwogIHJlY29tcHV0ZVRvdGFsKCk7CiAgJCgndHhuLWNhdCcpLnZhbHVlPScnOyQoJ3R4bi1jYXQtYW10JykudmFsdWU9Jyc7Cn0KZnVuY3Rpb24gcmVjb21wdXRlVG90YWwoKXsKICB2YXIgaGFzQW10PWNjQWRkQ2F0cy5zb21lKGZ1bmN0aW9uKHgpe3JldHVybiB0eXBlb2YgeD09PSdvYmplY3QnJiZ4LmFtdCE9PW51bGw7fSk7CiAgaWYoIWhhc0FtdClyZXR1cm47CiAgdmFyIHN1bT1jY0FkZENhdHMucmVkdWNlKGZ1bmN0aW9uKHMseCl7cmV0dXJuIHMrKHR5cGVvZiB4PT09J29iamVjdCcmJnguYW10P3guYW10OjApO30sMCk7CiAgdmFyIGY9JCgndHhuLWFtdCcpO2lmKCFmLnZhbHVlfHxwYXJzZUZsb2F0KGYudmFsdWUpPT09MClmLnZhbHVlPXN1bS50b0ZpeGVkKDIpOwp9CiQoJ2J0bi1hZGQtY2F0LWNoaXAnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsYWRkQ0NDaGlwKTsKJCgndHhuLWNhdC1hbXQnKS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyxmdW5jdGlvbihlKXtpZihlLmtleT09PSdFbnRlcicpYWRkQ0NDaGlwKCk7fSk7CiQoJ2NjLWFkZC1jaGlwcycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXt2YXIgcm09ZS50YXJnZXQuY2xvc2VzdCgnLmNhdC1ybScpO2lmKHJtJiZybS5nZXRBdHRyaWJ1dGUoJ2RhdGEtYWN0aW9uJykhPT0nZGVsZXRlJyl7dmFyIGN0PXJtLmdldEF0dHJpYnV0ZSgnZGF0YS1jYXQnKTtjY0FkZENhdHM9Y2NBZGRDYXRzLmZpbHRlcihmdW5jdGlvbih4KXtyZXR1cm4gKHR5cGVvZiB4PT09J3N0cmluZyc/eDp4LmNhdCkhPT1jdDt9KTtyZW5kZXJDQ0NoaXBzKCdjYy1hZGQtY2hpcHMnLGNjQWRkQ2F0cyk7cmVjb21wdXRlVG90YWwoKTt9fSk7CmZ1bmN0aW9uIGFkZENDRWRpdENoaXAoKXsKICB2YXIgdj0kKCdlLWNhdCcpLnZhbHVlLGE9cGFyc2VGbG9hdCgkKCdlLWNhdC1hbXQnKS52YWx1ZSk7CiAgaWYoIXYpcmV0dXJuOwogIGlmKGNjRWRpdENhdHMuc29tZShmdW5jdGlvbih4KXtyZXR1cm4gKHR5cGVvZiB4PT09J3N0cmluZyc/eDp4LmNhdCk9PT12O30pKXJldHVybjsKICBjY0VkaXRDYXRzLnB1c2goe2NhdDp2LGFtdDppc05hTihhKXx8YTw9MD9udWxsOmF9KTsKICByZW5kZXJDQ0NoaXBzKCdjYy1lZGl0LWNoaXBzJyxjY0VkaXRDYXRzKTsKICAkKCdlLWNhdCcpLnZhbHVlPScnOyQoJ2UtY2F0LWFtdCcpLnZhbHVlPScnOwp9CiQoJ2J0bi1hZGQtZWRpdC1jaGlwJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGFkZENDRWRpdENoaXApOwokKCdlLWNhdC1hbXQnKS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyxmdW5jdGlvbihlKXtpZihlLmtleT09PSdFbnRlcicpYWRkQ0NFZGl0Q2hpcCgpO30pOwokKCdjYy1lZGl0LWNoaXBzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe3ZhciBybT1lLnRhcmdldC5jbG9zZXN0KCcuY2F0LXJtJyk7aWYocm0mJnJtLmdldEF0dHJpYnV0ZSgnZGF0YS1hY3Rpb24nKSE9PSdkZWxldGUnKXt2YXIgY3Q9cm0uZ2V0QXR0cmlidXRlKCdkYXRhLWNhdCcpO2NjRWRpdENhdHM9Y2NFZGl0Q2F0cy5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuICh0eXBlb2YgeD09PSdzdHJpbmcnP3g6eC5jYXQpIT09Y3Q7fSk7cmVuZGVyQ0NDaGlwcygnY2MtZWRpdC1jaGlwcycsY2NFZGl0Q2F0cyk7fX0pOwokKCdjYy1jYXQtZGVsLWxpc3QnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oZSl7dmFyIHJtPWUudGFyZ2V0LmNsb3Nlc3QoJy5jYXQtcm1bZGF0YS1hY3Rpb249ImRlbGV0ZSJdJyk7aWYocm0pZGVsZXRlQ2F0KHJtLmdldEF0dHJpYnV0ZSgnZGF0YS1jYXQnKSk7fSk7CiQoJ2J0bi1leHBvcnQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZXhwb3J0Q1NWKTsKCi8vIFRhYmxlIGFjdGlvbnMg4oCUIGRlbGVnYXRlZCB0byB0Ym9keQokKCd0eG4tYm9keScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXsKICB2YXIgZWI9ZS50YXJnZXQuY2xvc2VzdCgnLmVkaXQtYnRuJyksZGI9ZS50YXJnZXQuY2xvc2VzdCgnLmRlbC1idG4nKTsKICB2YXIgcnY9ZS50YXJnZXQuY2xvc2VzdCgnLnJjcHQtdmlldy1idG4nKTsKICBpZihlYilvcGVuRWRpdChwYXJzZUludChlYi5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSwxMCkpOwogIGlmKGRiKWRlbFR4bihwYXJzZUludChkYi5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSwxMCkpOwogIGlmKHJ2KW9wZW5SY3B0VmlldyhwYXJzZUludChydi5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSwxMCkpOwp9KTsKJCgndHhuLWJvZHknKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpewogIHZhciBjYj1lLnRhcmdldC5jbG9zZXN0KCcuY2xyLWNiJyk7aWYoY2IpdG9nZ2xlQ2xlYXJlZChwYXJzZUludChjYi5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSwxMCkpOwp9KTsKCi8vIFNvcnQg4oCUIGRlbGVnYXRlZCB0byB0aGVhZAokKCd0eG4taGVhZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXsKICB2YXIgdGg9ZS50YXJnZXQuY2xvc2VzdCgndGguc29ydGFibGUnKTtpZih0aCl0b2dnbGVTb3J0KHRoLmdldEF0dHJpYnV0ZSgnZGF0YS1zb3J0JykpOwp9KTsKCi8vIFVuY2xlYXJlZCBmaXJzdAokKCdidG4tdW5jbCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe3VuY2xGaXJzdD0hdW5jbEZpcnN0O3RoaXMuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJyx1bmNsRmlyc3QpO3JlbmRlclRhYmxlKCk7fSk7CgovLyBDbGVhciBhbGwKJCgnYnRuLWNsci1hbGwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtpZighdHJhbnNhY3Rpb25zLmxlbmd0aClyZXR1cm47aWYoIWNvbmZpcm0oJ0RlbGV0ZSBBTEwgdHJhbnNhY3Rpb25zPyBDYW5ub3QgYmUgdW5kb25lLicpKXJldHVybjtzbmFwc2hvdCgpO3RyYW5zYWN0aW9ucz1bXTtzYXZlKCk7cmVuZGVyQWxsKCk7fSk7CgovLyBFZGl0IG1vZGFsCiQoJ2J0bi1jYW5jZWwtZWRpdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxjbG9zZUVkaXQpOwokKCdidG4tc2F2ZS1lZGl0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLHNhdmVFZGl0KTsKJCgnZWRpdC1tb2RhbCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXtpZihlLnRhcmdldD09PSQoJ2VkaXQtbW9kYWwnKSljbG9zZUVkaXQoKTt9KTsKCi8vIEJhY2t1cCAvIFJlc3RvcmUgLyBJbXBvcnQKJCgnYnRuLXVuZG8nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsdW5kbyk7CiQoJ2J0bi1yZWRvJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLHJlZG8pOwokKCdidG4tYmFja3VwJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGJhY2t1cCk7CiQoJ2J0bi1yZXN0b3JlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7JCgncmVzdG9yZS1maWxlJykuY2xpY2soKTt9KTsKJCgncmVzdG9yZS1maWxlJykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJyxmdW5jdGlvbihlKXtpZihlLnRhcmdldC5maWxlc1swXSl7cmVzdG9yZShlLnRhcmdldC5maWxlc1swXSk7ZS50YXJnZXQudmFsdWU9Jyc7fX0pOwokKCdidG4taW1wb3J0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7JCgnaW1wb3J0LWZpbGUnKS5jbGljaygpO30pOwokKCdpbXBvcnQtZmlsZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsZnVuY3Rpb24oZSl7aWYoZS50YXJnZXQuZmlsZXNbMF0pe2ltcG9ydENTVihlLnRhcmdldC5maWxlc1swXSk7ZS50YXJnZXQudmFsdWU9Jyc7fX0pOwoKLy8gQ2F0ZWdvcnkgYWRkCiQoJ2J0bi1zaG93LWNhdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe3ZhciByPSQoJ2NhdC1yb3cnKSxkPSQoJ2NjLWNhdC1kZWwtbGlzdCcpO3ZhciBzaG93PXIuc3R5bGUuZGlzcGxheSE9PSdmbGV4JztyLnN0eWxlLmRpc3BsYXk9c2hvdz8nZmxleCc6J25vbmUnO2Quc3R5bGUuZGlzcGxheT1zaG93PydmbGV4Jzonbm9uZSc7aWYoc2hvdyl7cmVuZGVyQ0NDYXREZWxMaXN0KCk7JCgnbmV3LWNhdCcpLmZvY3VzKCk7fX0pOwokKCdidG4tY2FuY2VsLWNhdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpeyQoJ2NhdC1yb3cnKS5zdHlsZS5kaXNwbGF5PSdub25lJzskKCdjYy1jYXQtZGVsLWxpc3QnKS5zdHlsZS5kaXNwbGF5PSdub25lJzskKCduZXctY2F0JykudmFsdWU9Jyc7fSk7CmZ1bmN0aW9uIHN1Ym1pdENhdCgpe3ZhciBuPSQoJ25ldy1jYXQnKS52YWx1ZS50cmltKCk7aWYoIW4pcmV0dXJuO2lmKCFhZGRDYXQobikpeyQoJ25ldy1jYXQnKS5zdHlsZS5ib3JkZXJDb2xvcj0ndmFyKC0tZGFuZ2VyKSc7c2V0VGltZW91dChmdW5jdGlvbigpeyQoJ25ldy1jYXQnKS5zdHlsZS5ib3JkZXJDb2xvcj0nJzt9LDEyMDApO3JldHVybjt9JCgnbmV3LWNhdCcpLnZhbHVlPScnOyQoJ2NhdC1yb3cnKS5zdHlsZS5kaXNwbGF5PSdub25lJzt9CiQoJ2J0bi1zYXZlLWNhdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxzdWJtaXRDYXQpOwokKCduZXctY2F0JykuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZnVuY3Rpb24oZSl7aWYoZS5rZXk9PT0nRW50ZXInKXN1Ym1pdENhdCgpO2lmKGUua2V5PT09J0VzY2FwZScpeyQoJ2NhdC1yb3cnKS5zdHlsZS5kaXNwbGF5PSdub25lJzskKCduZXctY2F0JykudmFsdWU9Jyc7fX0pOwoKLy8gQUkKJCgnYnRuLWFpJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7JCgnYWktbW9kYWwnKS5jbGFzc0xpc3QuYWRkKCdvcGVuJyk7aWYoISQoJ2FpLW1zZ3MnKS5jaGlsZHJlbi5sZW5ndGgpYWlNc2coJ0hpISBBc2sgbWUgYW55dGhpbmcg4oCUIHRyeSAiSG93IG11Y2ggb24gU3RhcmJ1Y2tzIHRoaXMgbW9udGg/IiBvciAiU3BlbmRpbmcgdGhpcyB3ZWVrIi4nLCdib3QnKTtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7JCgnYWktaW4nKS5mb2N1cygpO30sNTApO30pOwokKCdidG4tYWktY2xvc2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXskKCdhaS1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTt9KTsKJCgnYWktbW9kYWwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oZSl7aWYoZS50YXJnZXQ9PT0kKCdhaS1tb2RhbCcpKSQoJ2FpLW1vZGFsJykuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpO30pOwokKCdidG4tYWktc2VuZCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxhaVN1Ym1pdCk7CiQoJ2FpLWluJykuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZnVuY3Rpb24oZSl7aWYoZS5rZXk9PT0nRW50ZXInKWFpU3VibWl0KCk7fSk7CmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5haS1jaGlwJykuZm9yRWFjaChmdW5jdGlvbihjKXtjLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpeyQoJ2FpLWluJykudmFsdWU9Yy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcScpO2FpU3VibWl0KCk7fSk7fSk7CmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGZ1bmN0aW9uKGUpe2lmKGUua2V5PT09J0VzY2FwZScpe2Nsb3NlRWRpdCgpOyQoJ2FpLW1vZGFsJykuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpO319KTsKCi8vIOKUgOKUgCBDaGVja2luZyBBY2NvdW50IEZhY3Rvcnkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACmZ1bmN0aW9uIG1ha2VDaGVja2luZyhwZngsc3RvcmVLZXksb3BlbkJhbEtleSl7CiAgdmFyIHR4bnM9SlNPTi5wYXJzZShzR2V0KHN0b3JlS2V5KXx8J1tdJyk7CiAgdmFyIG9wZW5CYWw9cGFyc2VGbG9hdChzR2V0KG9wZW5CYWxLZXkpfHwnMCcpOwogIHZhciBzb3J0RmxkPSdkYXRlJyxzQXNjPWZhbHNlLHVuY2xGaXJzdD1mYWxzZSxoaXN0PVtdLGVkaXRJZD1udWxsLHBlbmRpbmdSY3B0PW51bGw7CiAgdmFyIHNlbGVjdGVkQWRkQ2F0cz1bXSxzZWxlY3RlZEVkaXRDYXRzPVtdOwoKICBmdW5jdGlvbiBnKGlkKXtyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocGZ4KyctJytpZCk7fQoKICBmdW5jdGlvbiBzYXZlVHhucygpe3NTZXQoc3RvcmVLZXksSlNPTi5zdHJpbmdpZnkodHhucykpO30KICBmdW5jdGlvbiBzbmFwKCl7CiAgICBoaXN0LnB1c2goSlNPTi5zdHJpbmdpZnkodHhucykpOwogICAgaWYoaGlzdC5sZW5ndGg+NTApaGlzdC5zaGlmdCgpOwogICAgdmFyIGI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi11bmRvJyk7Yi5kaXNhYmxlZD1mYWxzZTtiLnN0eWxlLm9wYWNpdHk9JzEnOwogIH0KCiAgZnVuY3Rpb24gYnVpbGRCYWxNYXAoKXsKICAgIHZhciBzPXR4bnMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEuZGF0ZTxiLmRhdGU/LTE6YS5kYXRlPmIuZGF0ZT8xOmEuaWQtYi5pZDt9KTsKICAgIHZhciBtPXt9LHI9b3BlbkJhbDsKICAgIHMuZm9yRWFjaChmdW5jdGlvbih0KXtyKz0odC50eXBlPT09J2RlcG9zaXQnKT90LmFtb3VudDotdC5hbW91bnQ7bVt0LmlkXT1yO30pOwogICAgcmV0dXJuIG07CiAgfQoKICBmdW5jdGlvbiByZW5kZXJDYXQoKXsKICAgIFtwZngrJy1jYXQnLHBmeCsnLWUtY2F0J10uZm9yRWFjaChmdW5jdGlvbihpZCl7CiAgICAgIHZhciBzPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtpZighcylyZXR1cm47CiAgICAgIHMuaW5uZXJIVE1MPSc8b3B0aW9uIHZhbHVlPSIiPuKAlCBBZGQgY2F0ZWdvcnkg4oCUPC9vcHRpb24+JytjYXRlZ29yaWVzLnNsaWNlKCkuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiBhLmxvY2FsZUNvbXBhcmUoYik7fSkubWFwKGZ1bmN0aW9uKGMpe3JldHVybiAnPG9wdGlvbiB2YWx1ZT0iJytlc2MoYykrJyI+Jytlc2MoYykrJzwvb3B0aW9uPic7fSkuam9pbignJyk7CiAgICAgIHMudmFsdWU9Jyc7CiAgICB9KTsKICAgIHZhciBmYz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChwZngrJy1mLWNhdCcpLGZwPWZjP2ZjLnZhbHVlOicnOwogICAgaWYoZmMpe2ZjLmlubmVySFRNTD0nPG9wdGlvbiB2YWx1ZT0iIj5BbGw8L29wdGlvbj4nK2NhdGVnb3JpZXMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEubG9jYWxlQ29tcGFyZShiKTt9KS5tYXAoZnVuY3Rpb24oYyl7cmV0dXJuICc8b3B0aW9uIHZhbHVlPSInK2VzYyhjKSsnIj4nK2VzYyhjKSsnPC9vcHRpb24+Jzt9KS5qb2luKCcnKTtpZihmcClmYy52YWx1ZT1mcDt9CiAgfQogIGZ1bmN0aW9uIGNoaXBIdG1sKGl0ZW0pewogICAgdmFyIGNhdD10eXBlb2YgaXRlbT09PSdzdHJpbmcnP2l0ZW06aXRlbS5jYXQ7CiAgICB2YXIgYW10U3RyPXR5cGVvZiBpdGVtPT09J29iamVjdCcmJml0ZW0uYW10IT09bnVsbD8nIDxzbWFsbD4kJytwYXJzZUZsb2F0KGl0ZW0uYW10KS50b0ZpeGVkKDIpKyc8L3NtYWxsPic6Jyc7CiAgICByZXR1cm4gJzxzcGFuIGNsYXNzPSJjYXQtY2hpcCI+Jytlc2MoY2F0KSthbXRTdHIrJzxzcGFuIGNsYXNzPSJjYXQtcm0iIGRhdGEtY2F0PSInK2VzYyhjYXQpKyciPiYjeEQ3Ozwvc3Bhbj48L3NwYW4+JzsKICB9CiAgZnVuY3Rpb24gcmVuZGVyQWRkQ2hpcHMoKXt2YXIgZWw9ZygnYWRkLWNoaXBzJyk7aWYoZWwpZWwuaW5uZXJIVE1MPXNlbGVjdGVkQWRkQ2F0cy5tYXAoY2hpcEh0bWwpLmpvaW4oJycpO30KICBmdW5jdGlvbiByZW5kZXJFZGl0Q2hpcHMoKXt2YXIgZWw9ZygnZWRpdC1jaGlwcycpO2lmKGVsKWVsLmlubmVySFRNTD1zZWxlY3RlZEVkaXRDYXRzLm1hcChjaGlwSHRtbCkuam9pbignJyk7fQogIGZ1bmN0aW9uIHJlbmRlckRlbExpc3QoKXsKICAgIHZhciBlbD1nKCdjYXQtZGVsLWxpc3QnKTtpZighZWwpcmV0dXJuOwogICAgaWYoIWNhdGVnb3JpZXMubGVuZ3RoKXtlbC5pbm5lckhUTUw9JzxzcGFuIHN0eWxlPSJmb250LXNpemU6Ljc0cmVtO2NvbG9yOiM5NGEzYjg7Ij5ObyBjYXRlZ29yaWVzLjwvc3Bhbj4nO3JldHVybjt9CiAgICBlbC5pbm5lckhUTUw9JzxzcGFuIHN0eWxlPSJmb250LXNpemU6Ljc0cmVtO2NvbG9yOiM2NDc0OGI7ZGlzcGxheTpibG9jazt3aWR0aDoxMDAlO21hcmdpbi1ib3R0b206MnB4OyI+JiN4MUY1RDE7IENsaWNrIHRvIGRlbGV0ZTo8L3NwYW4+JysKICAgICAgY2F0ZWdvcmllcy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYS5sb2NhbGVDb21wYXJlKGIpO30pLm1hcChmdW5jdGlvbihjYXQpewogICAgICAgIHJldHVybiAnPHNwYW4gY2xhc3M9ImNhdC1jaGlwIGRlbC1jaGlwIj4nK2VzYyhjYXQpKyc8c3BhbiBjbGFzcz0iY2F0LXJtIiBkYXRhLWNhdD0iJytlc2MoY2F0KSsnIiBkYXRhLWFjdGlvbj0iZGVsZXRlIj4mI3hENzs8L3NwYW4+PC9zcGFuPic7CiAgICAgIH0pLmpvaW4oJycpOwogIH0KCiAgZnVuY3Rpb24gcmVuZGVyU3VtbWFyeSgpewogICAgdmFyIGRlcD0wLHd0aD0wLHBkZXA9MCxwd3RoPTAsY2RlcD0wLGN3dGg9MDsKICAgIHR4bnMuZm9yRWFjaChmdW5jdGlvbih0KXsKICAgICAgdmFyIGNsPSEhdC5jbGVhcmVkOwogICAgICBpZih0LnR5cGU9PT0nZGVwb3NpdCcpe2RlcCs9dC5hbW91bnQ7aWYoY2wpY2RlcCs9dC5hbW91bnQ7ZWxzZSBwZGVwKz10LmFtb3VudDt9CiAgICAgIGVsc2V7d3RoKz10LmFtb3VudDtpZihjbCljd3RoKz10LmFtb3VudDtlbHNlIHB3dGgrPXQuYW1vdW50O30KICAgIH0pOwogICAgdmFyIGJhbD1vcGVuQmFsK2RlcC13dGgsY2xyPW9wZW5CYWwrY2RlcC1jd3RoOwogICAgZygncy1iYWwnKS50ZXh0Q29udGVudD1mbXRTKGJhbCk7Zygncy1jbHInKS50ZXh0Q29udGVudD1mbXRTKGNscik7CiAgICBnKCdzLXBkZXAnKS50ZXh0Q29udGVudD1mbXQocGRlcCk7Zygncy1wd3RoJykudGV4dENvbnRlbnQ9Zm10KHB3dGgpOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hkci1iYWwnKS50ZXh0Q29udGVudD1mbXRTKGJhbCk7CiAgfQoKICBmdW5jdGlvbiBhcncoZil7CiAgICByZXR1cm4gc29ydEZsZD09PWY/KCc8c3BhbiBjbGFzcz0ic2FyciBvbiI+Jysoc0FzYz8n4oaRJzon4oaTJykrJzwvc3Bhbj4nKTonPHNwYW4gY2xhc3M9InNhcnIiPjwvc3Bhbj4nOwogIH0KCiAgZnVuY3Rpb24gZ2V0RmlsdGVyZWQoKXsKICAgIHZhciBzPWcoJ2Ytc2VhcmNoJykudmFsdWUudG9Mb3dlckNhc2UoKS50cmltKCksdHk9ZygnZi10eXBlJykudmFsdWU7CiAgICB2YXIgZnI9ZygnZi1mcm9tJykudmFsdWUsdG89ZygnZi10bycpLnZhbHVlOwogICAgcmV0dXJuIHR4bnMuZmlsdGVyKGZ1bmN0aW9uKHQpewogICAgICBpZihzJiZ0LmRlc2MudG9Mb3dlckNhc2UoKS5pbmRleE9mKHMpPT09LTEpcmV0dXJuIGZhbHNlOwogICAgICBpZih0eSYmdC50eXBlIT09dHkpcmV0dXJuIGZhbHNlOwogICAgICBpZihmciYmdC5kYXRlPGZyKXJldHVybiBmYWxzZTsKICAgICAgaWYodG8mJnQuZGF0ZT50bylyZXR1cm4gZmFsc2U7CiAgICAgIHJldHVybiB0cnVlOwogICAgfSk7CiAgfQoKICBmdW5jdGlvbiBkb1NvcnQobGlzdCl7CiAgICByZXR1cm4gbGlzdC5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXsKICAgICAgaWYodW5jbEZpcnN0KXt2YXIgYWM9YS5jbGVhcmVkPzE6MCxiYz1iLmNsZWFyZWQ/MTowO2lmKGFjIT09YmMpcmV0dXJuIGFjLWJjO30KICAgICAgdmFyIGF2PWFbc29ydEZsZF0sYnY9Yltzb3J0RmxkXTsKICAgICAgaWYoc29ydEZsZD09PSdhbW91bnQnKXthdj0rYXY7YnY9K2J2O30KICAgICAgaWYoYXY8YnYpcmV0dXJuIHNBc2M/LTE6MTtpZihhdj5idilyZXR1cm4gc0FzYz8xOi0xO3JldHVybiAwOwogICAgfSk7CiAgfQoKICBmdW5jdGlvbiB0b2dnbGVTb3J0KGYpe3NBc2M9KHNvcnRGbGQ9PT1mKT8hc0FzYzooZiE9PSdkYXRlJyk7c29ydEZsZD1mO3JlbmRlclRhYmxlKCk7fQoKICBmdW5jdGlvbiByZW5kZXJUYWJsZSgpewogICAgdmFyIHJvd3M9ZG9Tb3J0KGdldEZpbHRlcmVkKCkpLGJtPWJ1aWxkQmFsTWFwKCksbW9iaWxlPWlzTW9iaWxlKCk7CiAgICBnKCdyb3ctY291bnQnKS50ZXh0Q29udGVudD1yb3dzLmxlbmd0aCsnIHRyYW5zYWN0aW9uJysocm93cy5sZW5ndGghPT0xPydzJzonJyk7CiAgICB2YXIgaGVhZD1nKCdoZWFkJyk7CiAgICBpZihtb2JpbGUpewogICAgICBoZWFkLmlubmVySFRNTD0nPHRyPicrCiAgICAgICAgJzx0aCBzdHlsZT0id2lkdGg6MzJweDsiPiYjeDI3MTM7PC90aD4nKwogICAgICAgICc8dGggY2xhc3M9InNvcnRhYmxlIiBkYXRhLXNvcnQ9ImRhdGUiIHN0eWxlPSJ3aWR0aDo3NnB4OyI+RGF0ZSAnK2FydygnZGF0ZScpKyc8L3RoPicrCiAgICAgICAgJzx0aCBjbGFzcz0ic29ydGFibGUiIGRhdGEtc29ydD0iZGVzYyI+RGVzY3JpcHRpb24gJythcncoJ2Rlc2MnKSsnPC90aD4nKwogICAgICAgICc8dGggY2xhc3M9InNvcnRhYmxlIiBkYXRhLXNvcnQ9ImFtb3VudCIgc3R5bGU9InRleHQtYWxpZ246cmlnaHQ7d2lkdGg6NzZweDsiPkFtb3VudCAnK2FydygnYW1vdW50JykrJzwvdGg+JysKICAgICAgICAnPHRoIHN0eWxlPSJ0ZXh0LWFsaWduOmNlbnRlcjt3aWR0aDo2MnB4OyI+QWN0LjwvdGg+PC90cj4nOwogICAgfSBlbHNlIHsKICAgICAgaGVhZC5pbm5lckhUTUw9Jzx0cj4nKwogICAgICAgICc8dGggc3R5bGU9IndpZHRoOjMycHg7Ij4mI3gyNzEzOzwvdGg+JysKICAgICAgICAnPHRoIGNsYXNzPSJzb3J0YWJsZSIgZGF0YS1zb3J0PSJkYXRlIiBzdHlsZT0id2lkdGg6ODhweDsiPkRhdGUgJythcncoJ2RhdGUnKSsnPC90aD4nKwogICAgICAgICc8dGggY2xhc3M9InNvcnRhYmxlIiBkYXRhLXNvcnQ9ImRlc2MiPkRlc2NyaXB0aW9uICcrYXJ3KCdkZXNjJykrJzwvdGg+JysKICAgICAgICAnPHRoIGNsYXNzPSJzb3J0YWJsZSIgZGF0YS1zb3J0PSJjYXQiIHN0eWxlPSJ3aWR0aDo5NnB4OyI+Q2F0ZWdvcnkgJythcncoJ2NhdCcpKyc8L3RoPicrCiAgICAgICAgJzx0aCBzdHlsZT0id2lkdGg6ODBweDsiPlR5cGU8L3RoPicrCiAgICAgICAgJzx0aCBjbGFzcz0ic29ydGFibGUiIGRhdGEtc29ydD0iYW1vdW50IiBzdHlsZT0idGV4dC1hbGlnbjpyaWdodDt3aWR0aDo5MHB4OyI+QW1vdW50ICcrYXJ3KCdhbW91bnQnKSsnPC90aD4nKwogICAgICAgICc8dGggc3R5bGU9InRleHQtYWxpZ246cmlnaHQ7d2lkdGg6OTBweDsiPkJhbGFuY2U8L3RoPicrCiAgICAgICAgJzx0aCBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7d2lkdGg6NjZweDsiPkFjdGlvbnM8L3RoPjwvdHI+JzsKICAgIH0KICAgIHZhciBib2R5PWcoJ2JvZHknKSxlbXB0eT1nKCdlbXB0eScpOwogICAgaWYoIXJvd3MubGVuZ3RoKXtib2R5LmlubmVySFRNTD0nJztlbXB0eS5zdHlsZS5kaXNwbGF5PSdibG9jayc7cmV0dXJuO30KICAgIGVtcHR5LnN0eWxlLmRpc3BsYXk9J25vbmUnOwogICAgdmFyIGg9Jyc7CiAgICByb3dzLmZvckVhY2goZnVuY3Rpb24odCl7CiAgICAgIHZhciBiYWw9Ym1bdC5pZF0sbmVnPWJhbDwwLGNscj0hIXQuY2xlYXJlZDsKICAgICAgdmFyIGlzRGVwPXQudHlwZT09PSdkZXBvc2l0JzsKICAgICAgdmFyIGNscz0oaXNEZXA/J2RlcCc6J3d0aCcpKyctcm93JysoY2xyPycnOicgdW5jbHJkJyk7CiAgICAgIHZhciBhbXRDb2xvcj1pc0RlcD8nIzE2YTM0YSc6JyNkYzI2MjYnOwogICAgICB2YXIgYW10U3R5bGU9J2NvbG9yOicrYW10Q29sb3IrJztmb250LXdlaWdodDo3MDA7JzsKICAgICAgdmFyIHNpZ249aXNEZXA/JysnOictJzsKICAgICAgdmFyIGNiPSc8aW5wdXQgdHlwZT0iY2hlY2tib3giIGNsYXNzPSInK3BmeCsnLWNsci1jYiIgZGF0YS1pZD0iJyt0LmlkKyciJysoY2xyPycgY2hlY2tlZCc6JycpKycgdGl0bGU9Ik1hcmsgY2xlYXJlZCI+JzsKICAgICAgdmFyIGViPSc8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWVkaXQgYnRuLXNtICcrcGZ4KyctZWRpdC1idG4iIGRhdGEtaWQ9IicrdC5pZCsnIj4mI3gyNzBGOyYjeEZFMEY7PC9idXR0b24+JzsKICAgICAgdmFyIGRiPSc8YnV0dG9uIGNsYXNzPSJidG4gYnRuLWRhbmdlciBidG4tc20gJytwZngrJy1kZWwtYnRuIiBkYXRhLWlkPSInK3QuaWQrJyIgc3R5bGU9Im1hcmdpbi1sZWZ0OjJweCI+JiN4MjcxNTs8L2J1dHRvbj4nOwogICAgICB2YXIgaGFzUmNwdD0hIXNHZXQoJ3JjcHQtJyt0LmlkKTsKICAgICAgdmFyIHJiPWhhc1JjcHQ/JzxidXR0b24gY2xhc3M9ImJ0biBidG4tc20gJytwZngrJy1yY3B0LXZpZXciIGRhdGEtaWQ9IicrdC5pZCsnIiBzdHlsZT0ibWFyZ2luLWxlZnQ6MnB4O2NvbG9yOiMwNTk2Njk7Zm9udC1zaXplOi45cmVtOyIgdGl0bGU9IlZpZXcgcmVjZWlwdCI+JiN4MUY5RkU7PC9idXR0b24+JzonJzsKICAgICAgaWYobW9iaWxlKXsKICAgICAgICBoKz0nPHRyIGNsYXNzPSInK2NscysnIj48dGQgY2xhc3M9ImNsci1jZWxsIj4nK2NiKyc8L3RkPic7CiAgICAgICAgaCs9Jzx0ZCBjbGFzcz0iZGF0ZS1jZWxsIj4nK2ZtdEQodC5kYXRlKSsnPC90ZD4nOwogICAgICAgIGgrPSc8dGQgY2xhc3M9ImRlc2MtY2VsbCI+PHNwYW4gY2xhc3M9ImRlc2MtbWFpbiIgc3R5bGU9ImZvbnQtd2VpZ2h0OjUwMDsiIHRpdGxlPSInK2VzYyh0LmRlc2MpKyciPicrZXNjKHQuZGVzYykrJzwvc3Bhbj48c3BhbiBjbGFzcz0iZGVzYy1zdWIiPicrdC5jYXQuc3BsaXQoJywgJykubWFwKGZ1bmN0aW9uKGNhdCxpKXt2YXIgYW10cz10LmNhdEFtdHM/dC5jYXRBbXRzLnNwbGl0KCcsICcpOltdO3ZhciBhPWFtdHNbaV0mJmFtdHNbaV0udHJpbSgpP3BhcnNlRmxvYXQoYW10c1tpXSk6bnVsbDtyZXR1cm4gZXNjKGNhdC50cmltKCkpKyhhIT09bnVsbCYmIWlzTmFOKGEpPycgJCcrYS50b0ZpeGVkKDIpOicnKTt9KS5qb2luKCcsICcpKyc8L3NwYW4+PC90ZD4nOwogICAgICAgIGgrPSc8dGQgY2xhc3M9ImFtdC1jZWxsIj48c3BhbiBzdHlsZT0iJythbXRTdHlsZSsnIj4nK3NpZ24rZm10KHQuYW1vdW50KSsnPC9zcGFuPjwvdGQ+JzsKICAgICAgICBoKz0nPHRkIGNsYXNzPSJhY3QtY2VsbCI+JytyYitlYitkYisnPC90ZD48L3RyPic7CiAgICAgIH0gZWxzZSB7CiAgICAgICAgaCs9Jzx0ciBjbGFzcz0iJytjbHMrJyI+PHRkIGNsYXNzPSJjbHItY2VsbCI+JytjYisnPC90ZD4nOwogICAgICAgIGgrPSc8dGQgY2xhc3M9ImRhdGUtY2VsbCI+JytmbXREKHQuZGF0ZSkrJzwvdGQ+JzsKICAgICAgICBoKz0nPHRkIGNsYXNzPSJkZXNjLWNlbGwiPjxzcGFuIGNsYXNzPSJkZXNjLW1haW4iIHN0eWxlPSJmb250LXdlaWdodDo1MDA7IiB0aXRsZT0iJytlc2ModC5kZXNjKSsnIj4nK2VzYyh0LmRlc2MpKyc8L3NwYW4+PC90ZD4nOwogICAgICAgIGgrPSc8dGQgY2xhc3M9ImNhdC1jZWxsIj4nK3QuY2F0LnNwbGl0KCcsICcpLm1hcChmdW5jdGlvbihjYXQsaSl7dmFyIGFtdHM9dC5jYXRBbXRzP3QuY2F0QW10cy5zcGxpdCgnLCAnKTpbXTt2YXIgYT1hbXRzW2ldJiZhbXRzW2ldLnRyaW0oKT9wYXJzZUZsb2F0KGFtdHNbaV0pOm51bGw7cmV0dXJuICc8c3BhbiBjbGFzcz0iY2F0YmRnIj4nK2VzYyhjYXQudHJpbSgpKSsoYSE9PW51bGwmJiFpc05hTihhKT8nIDxzbWFsbD4kJythLnRvRml4ZWQoMikrJzwvc21hbGw+JzonJykrJzwvc3Bhbj4nO30pLmpvaW4oJyAnKSsnPC90ZD4nOwogICAgICAgIGgrPSc8dGQgY2xhc3M9InR5cGUtY2VsbCI+PHNwYW4gY2xhc3M9ImJhZGdlICcrKGlzRGVwPydiLXJldCc6J2ItZXhwJykrJyI+JysoaXNEZXA/J0RlcCc6J1d0aCcpKyc8L3NwYW4+PC90ZD4nOwogICAgICAgIGgrPSc8dGQgY2xhc3M9ImFtdC1jZWxsIj48c3BhbiBzdHlsZT0iJythbXRTdHlsZSsnIj4nK3NpZ24rZm10KHQuYW1vdW50KSsnPC9zcGFuPjwvdGQ+JzsKICAgICAgICBoKz0nPHRkIGNsYXNzPSJiYWwtY2VsbCI+PHNwYW4gc3R5bGU9ImZvbnQtd2VpZ2h0OjYwMDtjb2xvcjonKyhuZWc/JyNkYzI2MjYnOicjMjU2M2ViJykrJzsiPicrZm10UyhiYWwpKyc8L3NwYW4+PC90ZD4nOwogICAgICAgIGgrPSc8dGQgY2xhc3M9ImFjdC1jZWxsIj4nK3JiK2ViK2RiKyc8L3RkPjwvdHI+JzsKICAgICAgfQogICAgfSk7CiAgICBib2R5LmlubmVySFRNTD1oOwogIH0KCiAgZnVuY3Rpb24gcmVuZGVyQWxsKCl7cmVuZGVyU3VtbWFyeSgpO3JlbmRlclRhYmxlKCk7fQoKICBmdW5jdGlvbiBhZGRUeG4oKXsKICAgIHZhciBkYXRlPWcoJ2RhdGUnKS52YWx1ZSxkZXNjPWcoJ2Rlc2MnKS52YWx1ZS50cmltKCk7CiAgICB2YXIgYW10PXBhcnNlRmxvYXQoZygnYW10JykudmFsdWUpOwogICAgdmFyIHRlPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W25hbWU9IicrcGZ4KyctdHlwZSJdOmNoZWNrZWQnKTsKICAgIHZhciB0eXBlPXRlP3RlLnZhbHVlOidkZXBvc2l0JyxlcnI9ZygnZm9ybS1lcnInKTsKICAgIGlmKCFkYXRlKXtlcnIudGV4dENvbnRlbnQ9J1BsZWFzZSBlbnRlciBhIGRhdGUuJztyZXR1cm47fQogICAgaWYoIWRlc2Mpe2Vyci50ZXh0Q29udGVudD0nUGxlYXNlIGVudGVyIGEgZGVzY3JpcHRpb24uJztyZXR1cm47fQogICAgaWYoIWFtdHx8YW10PD0wKXtlcnIudGV4dENvbnRlbnQ9J1BsZWFzZSBlbnRlciBhIHZhbGlkIGFtb3VudC4nO3JldHVybjt9CiAgICBpZighc2VsZWN0ZWRBZGRDYXRzLmxlbmd0aCl7ZXJyLnRleHRDb250ZW50PSdQbGVhc2Ugc2VsZWN0IGF0IGxlYXN0IG9uZSBjYXRlZ29yeS4nO3JldHVybjt9CiAgaWYoIWNhdGVnb3J5QWxsb2NhdGlvbnNWYWxpZChzZWxlY3RlZEFkZENhdHMsYW10KSl7ZXJyLnRleHRDb250ZW50PSdDYXRlZ29yeSBhbGxvY2F0aW9ucyBtdXN0IGFsbCBoYXZlIGFtb3VudHMgYW5kIGVxdWFsIHRoZSB0cmFuc2FjdGlvbiB0b3RhbC4nO3JldHVybjt9CiAgICBlcnIudGV4dENvbnRlbnQ9Jyc7c25hcCgpOwogICAgdmFyIGNhdD1zZWxlY3RlZEFkZENhdHMubWFwKGZ1bmN0aW9uKHgpe3JldHVybiB0eXBlb2YgeD09PSdzdHJpbmcnP3g6eC5jYXQ7fSkuam9pbignLCAnKTsKICAgIHZhciBjYXRBbXRzPXNlbGVjdGVkQWRkQ2F0cy5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIHR5cGVvZiB4PT09J29iamVjdCcmJnguYW10IT09bnVsbD94LmFtdC50b0ZpeGVkKDIpOicnO30pLmpvaW4oJywgJyk7CiAgICB2YXIgbmV3SWQ9RGF0ZS5ub3coKTsKICAgIHR4bnMucHVzaCh7aWQ6bmV3SWQsZGF0ZTpkYXRlLGRlc2M6ZGVzYyxjYXQ6Y2F0LGNhdEFtdHM6Y2F0QW10cyx0eXBlOnR5cGUsYW1vdW50OmFtdCxjbGVhcmVkOmZhbHNlLHRyaXA6YWN0aXZlVHJpcElkfHx1bmRlZmluZWR9KTsKICAgIGlmKHBlbmRpbmdSY3B0KXtzU2V0KCdyY3B0LScrbmV3SWQscGVuZGluZ1JjcHQpO3BlbmRpbmdSY3B0PW51bGw7ZygncGhvdG8tdGh1bWInKS5zdHlsZS5kaXNwbGF5PSdub25lJztnKCdwaG90by10aHVtYicpLnNyYz0nJzt9CiAgICBzYXZlVHhucygpO3JlbmRlckFsbCgpOwogICAgc2VsZWN0ZWRBZGRDYXRzPVtdO3JlbmRlckFkZENoaXBzKCk7CiAgICBnKCdkZXNjJykudmFsdWU9Jyc7ZygnYW10JykudmFsdWU9Jyc7ZygnZGF0ZScpLnZhbHVlPXRvZGF5U3RyKCk7ZygnZGVzYycpLmZvY3VzKCk7CiAgICAvLyBDaW5keSdzIENoZWNraW5nIHdpdGhkcmF3YWwg4oaSIG9mZmVyIHRvIG1pcnJvciBhcyBDQyBwYXltZW50CiAgICBpZihwZng9PT0nY2hrJyYmdHlwZT09PSd3aXRoZHJhd2FsJyl7CiAgICAgIGlmKGNvbmZpcm0oJ0Fsc28gYWRkICQnK2FtdC50b0ZpeGVkKDIpKycgYXMgYSBwYXltZW50IGluIHRoZSBDcmVkaXQgQ2FyZCByZWdpc3Rlcj8nKSl7CiAgICAgICAgc25hcHNob3QoKTsKICAgICAgICB0cmFuc2FjdGlvbnMucHVzaCh7aWQ6bmV3SWQrMSxkYXRlOmRhdGUsZGVzYzpkZXNjLGNhdDonUGF5bWVudCcsdHlwZToncGF5bWVudCcsYW1vdW50OmFtdCxjbGVhcmVkOmZhbHNlLHdobzond2lmZScsdHJpcDphY3RpdmVUcmlwSWR8fHVuZGVmaW5lZH0pOwogICAgICAgIHNhdmUoKTsKICAgICAgICBpZihhY3RpdmVUYWI9PT0nY2MnKXJlbmRlckFsbCgpOwogICAgICB9CiAgICB9CiAgfQoKICBmdW5jdGlvbiBkZWxUeG4oaWQpewogICAgaWYoIWNvbmZpcm0oJ0RlbGV0ZSB0aGlzIHRyYW5zYWN0aW9uPycpKXJldHVybjsKICAgIHNuYXAoKTt0eG5zPXR4bnMuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiB0LmlkIT09aWQ7fSk7ZGVsUmNwdEtleShpZCk7c2F2ZVR4bnMoKTtyZW5kZXJBbGwoKTsKICB9CgogIGZ1bmN0aW9uIHRvZ2dsZUNsZWFyZWQoaWQpewogICAgdmFyIHQ9dHhucy5maW5kKGZ1bmN0aW9uKHgpe3JldHVybiB4LmlkPT09aWQ7fSk7CiAgICBpZih0KXtzbmFwKCk7dC5jbGVhcmVkPSF0LmNsZWFyZWQ7c2F2ZVR4bnMoKTtyZW5kZXJBbGwoKTt9CiAgfQoKICBmdW5jdGlvbiBvcGVuRWRpdChpZCl7CiAgICB2YXIgdD10eG5zLmZpbmQoZnVuY3Rpb24oeCl7cmV0dXJuIHguaWQ9PT1pZDt9KTtpZighdClyZXR1cm47CiAgICBlZGl0SWQ9aWQ7CiAgICBnKCdlLWRhdGUnKS52YWx1ZT10LmRhdGU7ZygnZS1kZXNjJykudmFsdWU9dC5kZXNjOwogICAgZygnZS1hbXQnKS52YWx1ZT10LmFtb3VudDtnKCdlLWNsZWFyZWQnKS5jaGVja2VkPSEhdC5jbGVhcmVkOwogICAgdmFyIHI9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbbmFtZT0iJytwZngrJy1lLXR5cGUiXVt2YWx1ZT0iJyt0LnR5cGUrJyJdJyk7aWYocilyLmNoZWNrZWQ9dHJ1ZTsKICAgIHZhciBzQ2F0cz10LmNhdD90LmNhdC5zcGxpdCgnLCAnKS5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuIHgudHJpbSgpO30pOltdLHNBbXRzPXQuY2F0QW10cz90LmNhdEFtdHMuc3BsaXQoJywgJyk6W107CiAgICBzZWxlY3RlZEVkaXRDYXRzPXNDYXRzLm1hcChmdW5jdGlvbihjYXQsaSl7dmFyIGE9c0FtdHNbaV0mJnNBbXRzW2ldLnRyaW0oKT9wYXJzZUZsb2F0KHNBbXRzW2ldKTpudWxsO3JldHVybiB7Y2F0OmNhdCxhbXQ6aXNOYU4oYSk/bnVsbDphfTt9KTsKICAgIHJlbmRlckNhdCgpO3JlbmRlckVkaXRDaGlwcygpOwogICAgZygnZWRpdC1lcnInKS50ZXh0Q29udGVudD0nJzsKICAgIGcoJ2UtdHJpcCcpLmlubmVySFRNTD1idWlsZFRyaXBPcHRzKHQudHJpcHx8bnVsbCk7CiAgICBnKCdlZGl0LW1vZGFsJykuY2xhc3NMaXN0LmFkZCgnb3BlbicpOwogIH0KCiAgZnVuY3Rpb24gY2xvc2VFZGl0KCl7ZygnZWRpdC1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTtlZGl0SWQ9bnVsbDt9CgogIGZ1bmN0aW9uIHNhdmVFZGl0KCl7CiAgICB2YXIgZGF0ZT1nKCdlLWRhdGUnKS52YWx1ZSxkZXNjPWcoJ2UtZGVzYycpLnZhbHVlLnRyaW0oKTsKICAgIHZhciBhbXQ9cGFyc2VGbG9hdChnKCdlLWFtdCcpLnZhbHVlKTsKICAgIHZhciB0ZT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFtuYW1lPSInK3BmeCsnLWUtdHlwZSJdOmNoZWNrZWQnKTsKICAgIHZhciB0eXBlPXRlP3RlLnZhbHVlOidkZXBvc2l0JyxlcnI9ZygnZWRpdC1lcnInKTsKICAgIGlmKCFkYXRlKXtlcnIudGV4dENvbnRlbnQ9J0RhdGUgcmVxdWlyZWQuJztyZXR1cm47fQogICAgaWYoIWRlc2Mpe2Vyci50ZXh0Q29udGVudD0nRGVzY3JpcHRpb24gcmVxdWlyZWQuJztyZXR1cm47fQogICAgaWYoIWFtdHx8YW10PD0wKXtlcnIudGV4dENvbnRlbnQ9J1ZhbGlkIGFtb3VudCByZXF1aXJlZC4nO3JldHVybjt9CiAgICBpZighc2VsZWN0ZWRFZGl0Q2F0cy5sZW5ndGgpe2Vyci50ZXh0Q29udGVudD0nUGxlYXNlIHNlbGVjdCBhdCBsZWFzdCBvbmUgY2F0ZWdvcnkuJztyZXR1cm47fQogIGlmKCFjYXRlZ29yeUFsbG9jYXRpb25zVmFsaWQoc2VsZWN0ZWRFZGl0Q2F0cyxhbXQpKXtlcnIudGV4dENvbnRlbnQ9J0NhdGVnb3J5IGFsbG9jYXRpb25zIG11c3QgYWxsIGhhdmUgYW1vdW50cyBhbmQgZXF1YWwgdGhlIHRyYW5zYWN0aW9uIHRvdGFsLic7cmV0dXJuO30KICAgIHZhciBjYXQ9c2VsZWN0ZWRFZGl0Q2F0cy5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIHR5cGVvZiB4PT09J3N0cmluZyc/eDp4LmNhdDt9KS5qb2luKCcsICcpOwogICAgdmFyIGNhdEFtdHM9c2VsZWN0ZWRFZGl0Q2F0cy5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIHR5cGVvZiB4PT09J29iamVjdCcmJnguYW10IT09bnVsbD94LmFtdC50b0ZpeGVkKDIpOicnO30pLmpvaW4oJywgJyk7CiAgICB2YXIgaT10eG5zLmZpbmRJbmRleChmdW5jdGlvbih0KXtyZXR1cm4gdC5pZD09PWVkaXRJZDt9KTtpZihpPT09LTEpcmV0dXJuOwogICAgc25hcCgpOwogICAgdmFyIHR2PWcoJ2UtdHJpcCcpLnZhbHVlO3ZhciB0aWQ9dHY/cGFyc2VJbnQodHYsMTApOnVuZGVmaW5lZDsKICAgIHR4bnNbaV09e2lkOnR4bnNbaV0uaWQsZGF0ZTpkYXRlLGRlc2M6ZGVzYyxjYXQ6Y2F0LGNhdEFtdHM6Y2F0QW10cyx0eXBlOnR5cGUsYW1vdW50OmFtdCxjbGVhcmVkOmcoJ2UtY2xlYXJlZCcpLmNoZWNrZWQsdHJpcDp0aWR9OwogICAgc2F2ZVR4bnMoKTtyZW5kZXJBbGwoKTtjbG9zZUVkaXQoKTsKICB9CgogIGZ1bmN0aW9uIGV4cG9ydENTVigpewogICAgdmFyIHJvd3M9ZG9Tb3J0KGdldEZpbHRlcmVkKCkpO2lmKCFyb3dzLmxlbmd0aCl7YWxlcnQoJ05vdGhpbmcgdG8gZXhwb3J0LicpO3JldHVybjt9CiAgICB2YXIgYm09YnVpbGRCYWxNYXAoKTsKICAgIHZhciBsaW5lcz1bJ0RhdGUsRGVzY3JpcHRpb24sQ2F0ZWdvcnksVHlwZSxBbW91bnQsQmFsYW5jZSxDbGVhcmVkJ107CiAgICByb3dzLmZvckVhY2goZnVuY3Rpb24odCl7CiAgICAgIGxpbmVzLnB1c2goW3QuZGF0ZSwnIicrdC5kZXNjLnJlcGxhY2UoLyIvZywnIiInKSsnIicsdC5jYXQsCiAgICAgICAgdC50eXBlPT09J2RlcG9zaXQnPydEZXBvc2l0JzonV2l0aGRyYXdhbCcsCiAgICAgICAgKHQudHlwZT09PSdkZXBvc2l0Jz8nJzonLScpK3QuYW1vdW50LnRvRml4ZWQoMiksYm1bdC5pZF0udG9GaXhlZCgyKSx0LmNsZWFyZWQ/J1llcyc6J05vJ10uam9pbignLCcpKTsKICAgIH0pOwogICAgdmFyIGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpOwogICAgYS5ocmVmPVVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW2xpbmVzLmpvaW4oJ1xuJyldLHt0eXBlOid0ZXh0L2Nzdid9KSk7CiAgICBhLmRvd25sb2FkPXBmeCsnLXJlZ2lzdGVyLScrdG9kYXlTdHIoKSsnLmNzdic7CiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO2EuY2xpY2soKTtkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGEpOwogIH0KCiAgZnVuY3Rpb24gc3VibWl0Q2F0KCl7CiAgICB2YXIgbj1nKCduZXctY2F0JykudmFsdWUudHJpbSgpO2lmKCFuKXJldHVybjsKICAgIGlmKCFhZGRDYXQobikpe2coJ25ldy1jYXQnKS5zdHlsZS5ib3JkZXJDb2xvcj0nI2RjMjYyNic7c2V0VGltZW91dChmdW5jdGlvbigpe2coJ25ldy1jYXQnKS5zdHlsZS5ib3JkZXJDb2xvcj0nJzt9LDEyMDApO3JldHVybjt9CiAgICByZW5kZXJDYXQoKTsKICAgIGcoJ25ldy1jYXQnKS52YWx1ZT0nJztnKCdjYXQtcm93Jykuc3R5bGUuZGlzcGxheT0nbm9uZSc7CiAgfQoKICBmdW5jdGlvbiB3aXJlRXZlbnRzKCl7CiAgICBnKCdidG4tYWRkJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGFkZFR4bik7CiAgICBnKCdhbXQnKS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyxmdW5jdGlvbihlKXtpZihlLmtleT09PSdFbnRlcicpYWRkVHhuKCk7fSk7CiAgICBnKCdidG4tc2V0LW9wZW4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXsKICAgICAgdmFyIHY9cGFyc2VGbG9hdChnKCdvcGVuJykudmFsdWUpOwogICAgICBpZihpc05hTih2KXx8djwwKXthbGVydCgnUGxlYXNlIGVudGVyIGEgdmFsaWQgb3BlbmluZyBiYWxhbmNlLicpO3JldHVybjt9CiAgICAgIG9wZW5CYWw9djtzU2V0KG9wZW5CYWxLZXksdi50b1N0cmluZygpKTsKICAgICAgZygnb3Blbi1ub3RlJykudGV4dENvbnRlbnQ9J09wZW5pbmcgYmFsYW5jZTogJytmbXQodik7CiAgICAgIHJlbmRlckFsbCgpOwogICAgfSk7CiAgICBbcGZ4KyctZi1zZWFyY2gnLHBmeCsnLWYtdHlwZScscGZ4KyctZi1mcm9tJyxwZngrJy1mLXRvJ10uZm9yRWFjaChmdW5jdGlvbihpZCl7CiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKS5hZGRFdmVudExpc3RlbmVyKGlkLmluZGV4T2YoJ3NlYXJjaCcpIT09LTE/J2lucHV0JzonY2hhbmdlJyxmdW5jdGlvbigpe3JlbmRlclRhYmxlKCk7fSk7CiAgICB9KTsKICAgIGcoJ2J0bi1jbHItZmlsdGVyJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7CiAgICAgIFsnZi1zZWFyY2gnLCdmLXR5cGUnLCdmLWZyb20nLCdmLXRvJ10uZm9yRWFjaChmdW5jdGlvbihpZCl7ZyhpZCkudmFsdWU9Jyc7fSk7cmVuZGVyVGFibGUoKTsKICAgIH0pOwogICAgZygnYnRuLWV4cG9ydCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxleHBvcnRDU1YpOwogICAgZygnYnRuLWNsci1hbGwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXsKICAgICAgaWYoIXR4bnMubGVuZ3RoKXJldHVybjtpZighY29uZmlybSgnRGVsZXRlIEFMTCB0cmFuc2FjdGlvbnM/JykpcmV0dXJuOwogICAgICBzbmFwKCk7dHhucz1bXTtzYXZlVHhucygpO3JlbmRlckFsbCgpOwogICAgfSk7CiAgICBnKCdoZWFkJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpewogICAgICB2YXIgdGg9ZS50YXJnZXQuY2xvc2VzdCgndGguc29ydGFibGUnKTtpZih0aCl0b2dnbGVTb3J0KHRoLmdldEF0dHJpYnV0ZSgnZGF0YS1zb3J0JykpOwogICAgfSk7CiAgICBnKCdib2R5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpewogICAgICB2YXIgZWI9ZS50YXJnZXQuY2xvc2VzdCgnLicrcGZ4KyctZWRpdC1idG4nKSxkYj1lLnRhcmdldC5jbG9zZXN0KCcuJytwZngrJy1kZWwtYnRuJyk7CiAgICAgIHZhciBydj1lLnRhcmdldC5jbG9zZXN0KCcuJytwZngrJy1yY3B0LXZpZXcnKTsKICAgICAgaWYoZWIpb3BlbkVkaXQocGFyc2VJbnQoZWIuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJyksMTApKTsKICAgICAgaWYoZGIpZGVsVHhuKHBhcnNlSW50KGRiLmdldEF0dHJpYnV0ZSgnZGF0YS1pZCcpLDEwKSk7CiAgICAgIGlmKHJ2KW9wZW5SY3B0VmlldyhwYXJzZUludChydi5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSwxMCkpOwogICAgfSk7CiAgICBnKCdib2R5JykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJyxmdW5jdGlvbihlKXsKICAgICAgdmFyIGNiPWUudGFyZ2V0LmNsb3Nlc3QoJy4nK3BmeCsnLWNsci1jYicpOwogICAgICBpZihjYil0b2dnbGVDbGVhcmVkKHBhcnNlSW50KGNiLmdldEF0dHJpYnV0ZSgnZGF0YS1pZCcpLDEwKSk7CiAgICB9KTsKICAgIGcoJ2J0bi1jYW5jZWwtZWRpdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxjbG9zZUVkaXQpOwogICAgZygnYnRuLXNhdmUtZWRpdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxzYXZlRWRpdCk7CiAgICBnKCdlZGl0LW1vZGFsJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe2lmKGUudGFyZ2V0PT09ZygnZWRpdC1tb2RhbCcpKWNsb3NlRWRpdCgpO30pOwogICAgZygnYnRuLXNob3ctY2F0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7CiAgICAgIHZhciByPWcoJ2NhdC1yb3cnKSxkPWcoJ2NhdC1kZWwtbGlzdCcpOwogICAgICB2YXIgc2hvdz1yLnN0eWxlLmRpc3BsYXkhPT0nZmxleCc7CiAgICAgIHIuc3R5bGUuZGlzcGxheT1zaG93PydmbGV4Jzonbm9uZSc7CiAgICAgIGQuc3R5bGUuZGlzcGxheT1zaG93PydmbGV4Jzonbm9uZSc7CiAgICAgIGlmKHNob3cpe3JlbmRlckRlbExpc3QoKTtnKCduZXctY2F0JykuZm9jdXMoKTt9CiAgICB9KTsKICAgIGcoJ2J0bi1jYW5jZWwtY2F0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7ZygnY2F0LXJvdycpLnN0eWxlLmRpc3BsYXk9J25vbmUnO2coJ2NhdC1kZWwtbGlzdCcpLnN0eWxlLmRpc3BsYXk9J25vbmUnO2coJ25ldy1jYXQnKS52YWx1ZT0nJzt9KTsKICAgIGcoJ2J0bi1zYXZlLWNhdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxzdWJtaXRDYXQpOwogICAgZygnbmV3LWNhdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGZ1bmN0aW9uKGUpewogICAgICBpZihlLmtleT09PSdFbnRlcicpc3VibWl0Q2F0KCk7CiAgICAgIGlmKGUua2V5PT09J0VzY2FwZScpe2coJ2NhdC1yb3cnKS5zdHlsZS5kaXNwbGF5PSdub25lJztnKCdjYXQtZGVsLWxpc3QnKS5zdHlsZS5kaXNwbGF5PSdub25lJztnKCduZXctY2F0JykudmFsdWU9Jyc7fQogICAgfSk7CiAgICBmdW5jdGlvbiBhZGRDaGlwKCl7dmFyIHY9ZygnY2F0JykudmFsdWUsYT1wYXJzZUZsb2F0KGcoJ2NhdC1hbXQnKS52YWx1ZSk7aWYoIXYpcmV0dXJuO2lmKHNlbGVjdGVkQWRkQ2F0cy5zb21lKGZ1bmN0aW9uKHgpe3JldHVybiAodHlwZW9mIHg9PT0nc3RyaW5nJz94OnguY2F0KT09PXY7fSkpcmV0dXJuO3NlbGVjdGVkQWRkQ2F0cy5wdXNoKHtjYXQ6dixhbXQ6aXNOYU4oYSl8fGE8PTA/bnVsbDphfSk7cmVuZGVyQWRkQ2hpcHMoKTt2YXIgYWY9ZygnYW10Jyk7dmFyIHN1bT1zZWxlY3RlZEFkZENhdHMucmVkdWNlKGZ1bmN0aW9uKHMseCl7cmV0dXJuIHMrKHR5cGVvZiB4PT09J29iamVjdCcmJnguYW10P3guYW10OjApO30sMCk7aWYoYWYmJnN1bT4wJiYoIWFmLnZhbHVlfHxwYXJzZUZsb2F0KGFmLnZhbHVlKT09PTApKWFmLnZhbHVlPXN1bS50b0ZpeGVkKDIpO2coJ2NhdCcpLnZhbHVlPScnO2coJ2NhdC1hbXQnKS52YWx1ZT0nJzt9CiAgICBmdW5jdGlvbiBhZGRFZGl0Q2hpcCgpe3ZhciB2PWcoJ2UtY2F0JykudmFsdWUsYT1wYXJzZUZsb2F0KGcoJ2UtY2F0LWFtdCcpLnZhbHVlKTtpZighdilyZXR1cm47aWYoc2VsZWN0ZWRFZGl0Q2F0cy5zb21lKGZ1bmN0aW9uKHgpe3JldHVybiAodHlwZW9mIHg9PT0nc3RyaW5nJz94OnguY2F0KT09PXY7fSkpcmV0dXJuO3NlbGVjdGVkRWRpdENhdHMucHVzaCh7Y2F0OnYsYW10OmlzTmFOKGEpfHxhPD0wP251bGw6YX0pO3JlbmRlckVkaXRDaGlwcygpO2coJ2UtY2F0JykudmFsdWU9Jyc7ZygnZS1jYXQtYW10JykudmFsdWU9Jyc7fQogICAgZygnYnRuLWFkZC1jYXQtY2hpcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxhZGRDaGlwKTsKICAgIGcoJ2NhdC1hbXQnKS5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJyxmdW5jdGlvbihlKXtpZihlLmtleT09PSdFbnRlcicpYWRkQ2hpcCgpO30pOwogICAgZygnYnRuLWFkZC1lZGl0LWNoaXAnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsYWRkRWRpdENoaXApOwogICAgZygnZS1jYXQtYW10JykuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsZnVuY3Rpb24oZSl7aWYoZS5rZXk9PT0nRW50ZXInKWFkZEVkaXRDaGlwKCk7fSk7CiAgICBnKCdhZGQtY2hpcHMnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oZSl7dmFyIHJtPWUudGFyZ2V0LmNsb3Nlc3QoJy5jYXQtcm0nKTtpZihybSYmcm0uZ2V0QXR0cmlidXRlKCdkYXRhLWFjdGlvbicpIT09J2RlbGV0ZScpe3ZhciBjdD1ybS5nZXRBdHRyaWJ1dGUoJ2RhdGEtY2F0Jyk7c2VsZWN0ZWRBZGRDYXRzPXNlbGVjdGVkQWRkQ2F0cy5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuICh0eXBlb2YgeD09PSdzdHJpbmcnP3g6eC5jYXQpIT09Y3Q7fSk7cmVuZGVyQWRkQ2hpcHMoKTt9fSk7CiAgICBnKCdlZGl0LWNoaXBzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe3ZhciBybT1lLnRhcmdldC5jbG9zZXN0KCcuY2F0LXJtJyk7aWYocm0mJnJtLmdldEF0dHJpYnV0ZSgnZGF0YS1hY3Rpb24nKSE9PSdkZWxldGUnKXt2YXIgY3Q9cm0uZ2V0QXR0cmlidXRlKCdkYXRhLWNhdCcpO3NlbGVjdGVkRWRpdENhdHM9c2VsZWN0ZWRFZGl0Q2F0cy5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuICh0eXBlb2YgeD09PSdzdHJpbmcnP3g6eC5jYXQpIT09Y3Q7fSk7cmVuZGVyRWRpdENoaXBzKCk7fX0pOwogICAgZygnY2F0LWRlbC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKGUpe3ZhciBybT1lLnRhcmdldC5jbG9zZXN0KCcuY2F0LXJtW2RhdGEtYWN0aW9uPSJkZWxldGUiXScpO2lmKHJtKWRlbGV0ZUNhdChybS5nZXRBdHRyaWJ1dGUoJ2RhdGEtY2F0JykpO30pOwogICAgZygnY2FtLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe2coJ2NhbS1pbnAnKS5jbGljaygpO30pOwogICAgZygnbGliLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe2coJ2xpYi1pbnAnKS5jbGljaygpO30pOwogICAgZygnY2FtLWlucCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsZnVuY3Rpb24oZSl7CiAgICAgIGlmKGUudGFyZ2V0LmZpbGVzWzBdKXtjb21wcmVzc0ltYWdlKGUudGFyZ2V0LmZpbGVzWzBdLGZ1bmN0aW9uKGQpe3BlbmRpbmdSY3B0PWQ7ZygncGhvdG8tdGh1bWInKS5zcmM9ZDtnKCdwaG90by10aHVtYicpLnN0eWxlLmRpc3BsYXk9J2lubGluZS1ibG9jayc7fSk7fQogICAgICBlLnRhcmdldC52YWx1ZT0nJzsKICAgIH0pOwogICAgZygnbGliLWlucCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsZnVuY3Rpb24oZSl7CiAgICAgIGlmKGUudGFyZ2V0LmZpbGVzWzBdKXtjb21wcmVzc0ltYWdlKGUudGFyZ2V0LmZpbGVzWzBdLGZ1bmN0aW9uKGQpe3BlbmRpbmdSY3B0PWQ7ZygncGhvdG8tdGh1bWInKS5zcmM9ZDtnKCdwaG90by10aHVtYicpLnN0eWxlLmRpc3BsYXk9J2lubGluZS1ibG9jayc7fSk7fQogICAgICBlLnRhcmdldC52YWx1ZT0nJzsKICAgIH0pOwogICAgZygncGhvdG8tdGh1bWInKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtwZW5kaW5nUmNwdD1udWxsO3RoaXMuc3R5bGUuZGlzcGxheT0nbm9uZSc7dGhpcy5zcmM9Jyc7fSk7CiAgfQoKICByZXR1cm4gewogICAgZ2V0VHhuczpmdW5jdGlvbigpe3JldHVybiB0eG5zO30sCiAgICBzZXRUeG5zOmZ1bmN0aW9uKGFycil7dHhucz1hcnI7fSwKICAgIGdldE9wZW5CYWw6ZnVuY3Rpb24oKXtyZXR1cm4gb3BlbkJhbDt9LAogICAgc2V0T3BlbkJhbDpmdW5jdGlvbih2KXtvcGVuQmFsPXY7fSwKICAgIHJlbmRlckFsbDpyZW5kZXJBbGwsCiAgICByZW5kZXJDYXQ6cmVuZGVyQ2F0LAogICAgY2xlYXJDYXQ6ZnVuY3Rpb24obmFtZSl7c2VsZWN0ZWRBZGRDYXRzPXNlbGVjdGVkQWRkQ2F0cy5maWx0ZXIoZnVuY3Rpb24oeCl7cmV0dXJuICh0eXBlb2YgeD09PSdzdHJpbmcnP3g6eC5jYXQpIT09bmFtZTt9KTtzZWxlY3RlZEVkaXRDYXRzPXNlbGVjdGVkRWRpdENhdHMuZmlsdGVyKGZ1bmN0aW9uKHgpe3JldHVybiAodHlwZW9mIHg9PT0nc3RyaW5nJz94OnguY2F0KSE9PW5hbWU7fSk7cmVuZGVyQWRkQ2hpcHMoKTtyZW5kZXJFZGl0Q2hpcHMoKTtyZW5kZXJEZWxMaXN0KCk7fSwKICAgIGNsb3NlRWRpdDpjbG9zZUVkaXQsCiAgICB3aXJlRXZlbnRzOndpcmVFdmVudHMsCiAgICBhY3RpdmF0ZVBhbmU6ZnVuY3Rpb24oKXsKICAgICAgZygnb3BlbicpLnZhbHVlPW9wZW5CYWw+MD9vcGVuQmFsLnRvRml4ZWQoMik6Jyc7CiAgICAgIGcoJ29wZW4tbm90ZScpLnRleHRDb250ZW50PW9wZW5CYWw+MD8nT3BlbmluZyBiYWxhbmNlOiAnK2ZtdChvcGVuQmFsKTonTm8gb3BlbmluZyBiYWxhbmNlIHNldCc7CiAgICAgIHJlbmRlckNhdCgpO3JlbmRlckFsbCgpOwogICAgfQogIH07Cn0KCnZhciBjaGs9bWFrZUNoZWNraW5nKCdjaGsnLCdjaGstcmVnaXN0ZXInLCdjaGstb3Blbi1iYWwnKTsKdmFyIG1pa2U9bWFrZUNoZWNraW5nKCdtaWtlJywnbWlrZS1yZWdpc3RlcicsJ21pa2Utb3Blbi1iYWwnKTsKdmFyIHNhdj1tYWtlQ2hlY2tpbmcoJ3NhdmluZ3MnLCdzYXZpbmdzLXJlZ2lzdGVyJywnc2F2aW5ncy1vcGVuLWJhbCcpOwp2YXIgaHlzYT1tYWtlQ2hlY2tpbmcoJ2h5c2EnLCdoeXNhLXJlZ2lzdGVyJywnaHlzYS1vcGVuLWJhbCcpOwpjaGsud2lyZUV2ZW50cygpOwptaWtlLndpcmVFdmVudHMoKTsKc2F2LndpcmVFdmVudHMoKTsKaHlzYS53aXJlRXZlbnRzKCk7CgovLyDilIDilIAgVGFiIFN3aXRjaGluZyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKdmFyIGFjdGl2ZVRhYj0nY2MnOwpmdW5jdGlvbiBzd2l0Y2hUYWIodGFiKXsKICBhY3RpdmVUYWI9dGFiOwogIFsnY2MtcGFuZScsJ2Noay1wYW5lJywnbWlrZS1wYW5lJywnc2F2aW5ncy1wYW5lJywnaHlzYS1wYW5lJ10uZm9yRWFjaChmdW5jdGlvbihpZCl7JChpZCkuc3R5bGUuZGlzcGxheT1pZD09PXRhYisnLXBhbmUnPycnOidub25lJzt9KTsKICBbJ3RhYi1jYycsJ3RhYi1jaGsnLCd0YWItbWlrZScsJ3RhYi1zYXZpbmdzJywndGFiLWh5c2EnXS5mb3JFYWNoKGZ1bmN0aW9uKGlkKXskKGlkKS5jbGFzc0xpc3QudG9nZ2xlKCdhY3RpdmUnLGlkPT09J3RhYi0nK3RhYik7fSk7CiAgaWYodGFiPT09J2NjJyl7JCgncGFnZS10aXRsZScpLnRleHRDb250ZW50PSdcdTFGNEIzIENpbmR5XCdzIENyZWRpdCBDYXJkIFJlZ2lzdGVyJzskKCdwYWdlLXN1YicpLnRleHRDb250ZW50PSdNeSBDcmVkaXQgQ2FyZCc7cmVuZGVyQWxsKCk7fQogIGVsc2UgaWYodGFiPT09J2NoaycpeyQoJ3BhZ2UtdGl0bGUnKS50ZXh0Q29udGVudD0nXHVEODNDXHVERkU2IENpbmR5XCdzIENoZWNraW5nIEFjY291bnQnOyQoJ3BhZ2Utc3ViJykudGV4dENvbnRlbnQ9J015IENoZWNraW5nIEFjY291bnQnO2Noay5hY3RpdmF0ZVBhbmUoKTt9CiAgZWxzZSBpZih0YWI9PT0nbWlrZScpeyQoJ3BhZ2UtdGl0bGUnKS50ZXh0Q29udGVudD0nXHVEODNDXHVERkU2IE1pa2VcJ3MgQ2hlY2tpbmcgQWNjb3VudCc7JCgncGFnZS1zdWInKS50ZXh0Q29udGVudD0nTXkgQ2hlY2tpbmcgQWNjb3VudCc7bWlrZS5hY3RpdmF0ZVBhbmUoKTt9CiAgZWxzZSBpZih0YWI9PT0nc2F2aW5ncycpeyQoJ3BhZ2UtdGl0bGUnKS50ZXh0Q29udGVudD0nXHVEODNEXHVEQ0IwIFNhdmluZ3MgQWNjb3VudCc7JCgncGFnZS1zdWInKS50ZXh0Q29udGVudD0nU2F2aW5ncyc7c2F2LmFjdGl2YXRlUGFuZSgpO30KICBlbHNleyQoJ3BhZ2UtdGl0bGUnKS50ZXh0Q29udGVudD0nXHVEODNEXHVEQ0M4IEhZU0EgQWNjb3VudCc7JCgncGFnZS1zdWInKS50ZXh0Q29udGVudD0nSGlnaCBZaWVsZCBTYXZpbmdzJztoeXNhLmFjdGl2YXRlUGFuZSgpO30KfQoKJCgndGFiLWNjJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7c3dpdGNoVGFiKCdjYycpO30pOwokKCd0YWItY2hrJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7c3dpdGNoVGFiKCdjaGsnKTt9KTsKJCgndGFiLW1pa2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtzd2l0Y2hUYWIoJ21pa2UnKTt9KTsKJCgndGFiLXNhdmluZ3MnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtzd2l0Y2hUYWIoJ3NhdmluZ3MnKTt9KTsKJCgndGFiLWh5c2EnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtzd2l0Y2hUYWIoJ2h5c2EnKTt9KTsKCi8vIFJlc2l6ZQp3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJyxmdW5jdGlvbigpewogIGlmKGFjdGl2ZVRhYj09PSdjYycpcmVuZGVyVGFibGUoKTsKICBlbHNlIGlmKGFjdGl2ZVRhYj09PSdjaGsnKWNoay5yZW5kZXJBbGwoKTsKICBlbHNlIGlmKGFjdGl2ZVRhYj09PSdtaWtlJyltaWtlLnJlbmRlckFsbCgpOwogIGVsc2UgaWYoYWN0aXZlVGFiPT09J3NhdmluZ3MnKXNhdi5yZW5kZXJBbGwoKTsKICBlbHNlIGh5c2EucmVuZGVyQWxsKCk7Cn0pOwoKLy8g4pSA4pSAIFJlY2VpcHQgSW1hZ2UgU3RvcmFnZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKdmFyIHJjcHRUYXJnZXRJZD1udWxsOwp2YXIgY2NQZW5kaW5nUmNwdD1udWxsOwoKZnVuY3Rpb24gY29tcHJlc3NJbWFnZShmaWxlLGNiKXsKICB2YXIgcmVhZGVyPW5ldyBGaWxlUmVhZGVyKCk7CiAgcmVhZGVyLm9ubG9hZD1mdW5jdGlvbihldil7CiAgICB2YXIgaW1nPW5ldyBJbWFnZSgpOwogICAgaW1nLm9ubG9hZD1mdW5jdGlvbigpewogICAgICB2YXIgbWF4Vz05MDAsdz1pbWcud2lkdGgsaD1pbWcuaGVpZ2h0OwogICAgICBpZih3Pm1heFcpe2g9TWF0aC5yb3VuZChoKm1heFcvdyk7dz1tYXhXO30KICAgICAgdmFyIGM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7Yy53aWR0aD13O2MuaGVpZ2h0PWg7CiAgICAgIGMuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2UoaW1nLDAsMCx3LGgpOwogICAgICBjYihjLnRvRGF0YVVSTCgnaW1hZ2UvanBlZycsMC42NSkpOwogICAgfTsKICAgIGltZy5zcmM9ZXYudGFyZ2V0LnJlc3VsdDsKICB9OwogIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpOwp9CgpmdW5jdGlvbiBkZWxSY3B0S2V5KGlkKXsKICB0cnl7bG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ3JjcHQtJytpZCk7fWNhdGNoKGUpe30KICB0cnl7ZGVsZXRlIF9tZW1bJ3JjcHQtJytpZF07fWNhdGNoKGUpe30KfQoKZnVuY3Rpb24gb3BlblJjcHRBdHRhY2goaWQpewogIHJjcHRUYXJnZXRJZD1pZDsKICAkKCdyY3B0LWF0dGFjaC1tb2RhbCcpLmNsYXNzTGlzdC5hZGQoJ29wZW4nKTsKfQoKZnVuY3Rpb24gb3BlblJjcHRWaWV3KGlkKXsKICB2YXIgZGF0YT1zR2V0KCdyY3B0LScraWQpO2lmKCFkYXRhKXJldHVybjsKICByY3B0VGFyZ2V0SWQ9aWQ7CiAgJCgncmNwdC12aWV3LWltZycpLnNyYz1kYXRhOwogICQoJ3JjcHQtdmlldy1tb2RhbCcpLmNsYXNzTGlzdC5hZGQoJ29wZW4nKTsKfQoKZnVuY3Rpb24gcmVtb3ZlUmNwdCgpewogIGlmKCFjb25maXJtKCdSZW1vdmUgdGhpcyByZWNlaXB0IHBob3RvPycpKXJldHVybjsKICBkZWxSY3B0S2V5KHJjcHRUYXJnZXRJZCk7CiAgJCgncmNwdC12aWV3LW1vZGFsJykuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpOwogIGlmKGFjdGl2ZVRhYj09PSdjYycpcmVuZGVyVGFibGUoKTsKICBlbHNlIGlmKGFjdGl2ZVRhYj09PSdjaGsnKWNoay5yZW5kZXJBbGwoKTsKICBlbHNlIG1pa2UucmVuZGVyQWxsKCk7Cn0KCmZ1bmN0aW9uIGF0dGFjaFJjcHRGaWxlKGZpbGUpewogIGlmKCFyY3B0VGFyZ2V0SWQpcmV0dXJuOwogIGNvbXByZXNzSW1hZ2UoZmlsZSxmdW5jdGlvbihkYXRhKXsKICAgIHNTZXQoJ3JjcHQtJytyY3B0VGFyZ2V0SWQsZGF0YSk7CiAgICAkKCdyY3B0LWF0dGFjaC1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTsKICAgIGlmKGFjdGl2ZVRhYj09PSdjYycpcmVuZGVyVGFibGUoKTsKICAgIGVsc2UgaWYoYWN0aXZlVGFiPT09J2NoaycpY2hrLnJlbmRlckFsbCgpOwogICAgZWxzZSBtaWtlLnJlbmRlckFsbCgpOwogIH0pOwp9CgovLyDilIDilIAgUmVjZWlwdCBTY2FubmVyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAp2YXIgc2NhblRhcmdldD0nY2MnOwoKZnVuY3Rpb24gbG9hZFRlc3NlcmFjdChjYil7CiAgaWYod2luZG93LlRlc3NlcmFjdCl7Y2IoKTtyZXR1cm47fQogIHZhciBzPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpOwogIHMuc3JjPSdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL3Rlc3NlcmFjdC5qc0A1L2Rpc3QvdGVzc2VyYWN0Lm1pbi5qcyc7CiAgcy5vbmxvYWQ9Y2I7CiAgcy5vbmVycm9yPWZ1bmN0aW9uKCl7YWxlcnQoJ0NvdWxkIG5vdCBsb2FkIE9DUiBsaWJyYXJ5LiBDaGVjayB5b3VyIGludGVybmV0IGNvbm5lY3Rpb24gYW5kIHRyeSBhZ2Fpbi4nKTt9OwogIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQocyk7Cn0KCmZ1bmN0aW9uIHNjYW5TaG93U3RhdGUoc3QpewogICQoJ3NjYW4tcy11cGxvYWQnKS5zdHlsZS5kaXNwbGF5PXN0PT09J3VwbG9hZCc/Jyc6J25vbmUnOwogICQoJ3NjYW4tcy1wcm9jJykuc3R5bGUuZGlzcGxheT1zdD09PSdwcm9jJz8nJzonbm9uZSc7CiAgJCgnc2Nhbi1zLXJlcycpLnN0eWxlLmRpc3BsYXk9c3Q9PT0ncmVzJz8nJzonbm9uZSc7CiAgJCgnc2Nhbi1yZXRyeS1idG4nKS5zdHlsZS5kaXNwbGF5PXN0PT09J3Jlcyc/Jyc6J25vbmUnOwogICQoJ3NjYW4tdXNlLWJ0bicpLnN0eWxlLmRpc3BsYXk9c3Q9PT0ncmVzJz8nJzonbm9uZSc7Cn0KCmZ1bmN0aW9uIG9wZW5TY2FubmVyKHRhcmdldCl7CiAgc2NhblRhcmdldD10YXJnZXQ7CiAgdmFyIHNjPSQoJ3NjYW4tci1jYXQnKTsKICBzYy5pbm5lckhUTUw9Y2F0ZWdvcmllcy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYS5sb2NhbGVDb21wYXJlKGIpO30pLm1hcChmdW5jdGlvbihjKXtyZXR1cm4gJzxvcHRpb24gdmFsdWU9IicrZXNjKGMpKyciPicrZXNjKGMpKyc8L29wdGlvbj4nO30pLmpvaW4oJycpOwogIHNjYW5TaG93U3RhdGUoJ3VwbG9hZCcpOwogICQoJ3NjYW4tZHJvcCcpLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWctb3ZlcicpOwogICQoJ3NjYW4tbW9kYWwnKS5jbGFzc0xpc3QuYWRkKCdvcGVuJyk7Cn0KCmZ1bmN0aW9uIHByb2Nlc3NSZWNlaXB0RmlsZShmaWxlKXsKICBpZighZmlsZXx8IWZpbGUudHlwZS5zdGFydHNXaXRoKCdpbWFnZS8nKSl7YWxlcnQoJ1BsZWFzZSBzZWxlY3QgYW4gaW1hZ2UgZmlsZS4nKTtyZXR1cm47fQogIHZhciB1cmw9VVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTsKICAkKCdzY2FuLXByZXYtaW1nJykuc3JjPXVybDsKICAkKCdzY2FuLXJlcy1pbWcnKS5zcmM9dXJsOwogIHNjYW5TaG93U3RhdGUoJ3Byb2MnKTsKICAkKCdzY2FuLWZpbGwnKS5zdHlsZS53aWR0aD0nMCUnOwogICQoJ3NjYW4tc3RhdHVzJykudGV4dENvbnRlbnQ9J0xvYWRpbmcgT0NSIGVuZ2luZeKApic7CgogIGxvYWRUZXNzZXJhY3QoZnVuY3Rpb24oKXsKICAgICQoJ3NjYW4tc3RhdHVzJykudGV4dENvbnRlbnQ9J0luaXRpYWxpc2luZ+KApic7CiAgICBUZXNzZXJhY3QucmVjb2duaXplKGZpbGUsJ2VuZycse2xvZ2dlcjpmdW5jdGlvbihtKXsKICAgICAgaWYobS5zdGF0dXM9PT0nbG9hZGluZyB0ZXNzZXJhY3QgY29yZScpeyQoJ3NjYW4tZmlsbCcpLnN0eWxlLndpZHRoPScxMCUnO30KICAgICAgZWxzZSBpZihtLnN0YXR1cz09PSdpbml0aWFsaXppbmcgdGVzc2VyYWN0Jyl7JCgnc2Nhbi1maWxsJykuc3R5bGUud2lkdGg9JzI1JSc7fQogICAgICBlbHNlIGlmKG0uc3RhdHVzPT09J2xvYWRpbmcgbGFuZ3VhZ2UgdHJhaW5lZGRhdGEnKXskKCdzY2FuLXN0YXR1cycpLnRleHRDb250ZW50PSdMb2FkaW5nIGxhbmd1YWdlIGRhdGHigKYnOyQoJ3NjYW4tZmlsbCcpLnN0eWxlLndpZHRoPSc0MCUnO30KICAgICAgZWxzZSBpZihtLnN0YXR1cz09PSdpbml0aWFsaXppbmcgYXBpJyl7JCgnc2Nhbi1maWxsJykuc3R5bGUud2lkdGg9JzYwJSc7fQogICAgICBlbHNlIGlmKG0uc3RhdHVzPT09J3JlY29nbml6aW5nIHRleHQnKXsKICAgICAgICB2YXIgcD1NYXRoLnJvdW5kKG0ucHJvZ3Jlc3MqMTAwKTsKICAgICAgICAkKCdzY2FuLWZpbGwnKS5zdHlsZS53aWR0aD1NYXRoLm1heCg2MCw2MCtwKjAuNCkrJyUnOwogICAgICAgICQoJ3NjYW4tc3RhdHVzJykudGV4dENvbnRlbnQ9J1JlYWRpbmcgdGV4dOKApiAnK3ArJyUnOwogICAgICB9CiAgICB9fSkudGhlbihmdW5jdGlvbihyZXN1bHQpewogICAgICAkKCdzY2FuLWZpbGwnKS5zdHlsZS53aWR0aD0nMTAwJSc7CiAgICAgIHZhciB0ZXh0PXJlc3VsdC5kYXRhLnRleHQ7CiAgICAgICQoJ3NjYW4tcmF3LXByZScpLnRleHRDb250ZW50PXRleHQ7CiAgICAgIHZhciBwYXJzZWQ9cGFyc2VSZWNlaXB0VGV4dCh0ZXh0KTsKICAgICAgJCgnc2Nhbi1yLWRhdGUnKS52YWx1ZT1wYXJzZWQuZGF0ZXx8dG9kYXlTdHIoKTsKICAgICAgJCgnc2Nhbi1yLWRlc2MnKS52YWx1ZT1wYXJzZWQubWVyY2hhbnR8fCcnOwogICAgICAkKCdzY2FuLXItYW10JykudmFsdWU9cGFyc2VkLmFtb3VudD9wYXJzZWQuYW1vdW50LnRvRml4ZWQoMik6Jyc7CiAgICAgIGlmKHBhcnNlZC5jYXRlZ29yeSkkKCdzY2FuLXItY2F0JykudmFsdWU9cGFyc2VkLmNhdGVnb3J5OwogICAgICAkKCdzY2FuLXJlcy1lcnInKS50ZXh0Q29udGVudD0ocGFyc2VkLm1lcmNoYW50fHxwYXJzZWQuYW1vdW50KT8nJzonT0NSIGNvbXBsZXRlIGJ1dCBkZXRhaWxzIGFyZSB1bmNsZWFyIOKAlCBwbGVhc2UgZmlsbCBpbiBtYW51YWxseS4nOwogICAgICBzY2FuU2hvd1N0YXRlKCdyZXMnKTsKICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7CiAgICAgICQoJ3NjYW4tc3RhdHVzJykudGV4dENvbnRlbnQ9J0Vycm9yOiAnK2Vyci5tZXNzYWdlOwogICAgfSk7CiAgfSk7Cn0KCmZ1bmN0aW9uIHBhcnNlUmVjZWlwdFRleHQocmF3KXsKICB2YXIgbGluZXM9cmF3LnNwbGl0KCdcbicpLm1hcChmdW5jdGlvbihsKXtyZXR1cm4gbC50cmltKCk7fSkuZmlsdGVyKEJvb2xlYW4pOwoKICB2YXIgbWVyY2hhbnQ9Jyc7CiAgZm9yKHZhciBpPTA7aTxNYXRoLm1pbihsaW5lcy5sZW5ndGgsNik7aSsrKXsKICAgIHZhciBsPWxpbmVzW2ldOwogICAgaWYobC5sZW5ndGg+PTMmJiEvXlxkLy50ZXN0KGwpJiYhL14odGVsfHBob25lfGZheHx3d3d8aHR0cHxcZHszfVtcc1wtXC5dP1xkezN9KS9pLnRlc3QobCkpewogICAgICBtZXJjaGFudD1sLnJlcGxhY2UoL1sqI3xcXF0vZywnJykudHJpbSgpOwogICAgICBpZihtZXJjaGFudD09PW1lcmNoYW50LnRvVXBwZXJDYXNlKCkmJm1lcmNoYW50Lmxlbmd0aD4yKXsKICAgICAgICBtZXJjaGFudD1tZXJjaGFudC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xiXHcvZyxmdW5jdGlvbihjKXtyZXR1cm4gYy50b1VwcGVyQ2FzZSgpO30pOwogICAgICB9CiAgICAgIGJyZWFrOwogICAgfQogIH0KCiAgdmFyIGRhdGU9bnVsbDsKICB2YXIgcGF0dGVybnM9WwogICAge3JlOi8oXGR7MSwyfSlbXC9cLV0oXGR7MSwyfSlbXC9cLV0oXGR7NH0pLyxmbjpmdW5jdGlvbihtKXtyZXR1cm4gbVszXSsnLScrcGFkKCttWzFdKSsnLScrcGFkKCttWzJdKTt9fSwKICAgIHtyZTovKFxkezEsMn0pW1wvXC1dKFxkezEsMn0pW1wvXC1dKFxkezJ9KSg/IVxkKS8sZm46ZnVuY3Rpb24obSl7dmFyIHk9K21bM107eT15PDUwPzIwMDAreToxOTAwK3k7cmV0dXJuIHkrJy0nK3BhZCgrbVsxXSkrJy0nK3BhZCgrbVsyXSk7fX0sCiAgICB7cmU6LyhcZHs0fSlbXC9cLV0oXGR7MSwyfSlbXC9cLV0oXGR7MSwyfSkvLGZuOmZ1bmN0aW9uKG0pe3JldHVybiBtWzFdKyctJytwYWQoK21bMl0pKyctJytwYWQoK21bM10pO319LAogICAge3JlOi8oamFufGZlYnxtYXJ8YXByfG1heXxqdW58anVsfGF1Z3xzZXB8b2N0fG5vdnxkZWMpW2Etel0qXC4/XHMrKFxkezEsMn0pWyxcc10rKFxkezR9KS9pLGZuOmZ1bmN0aW9uKG0pewogICAgICB2YXIgbW49e2phbjonMDEnLGZlYjonMDInLG1hcjonMDMnLGFwcjonMDQnLG1heTonMDUnLGp1bjonMDYnLGp1bDonMDcnLGF1ZzonMDgnLHNlcDonMDknLG9jdDonMTAnLG5vdjonMTEnLGRlYzonMTInfTsKICAgICAgcmV0dXJuIG1bM10rJy0nKyhtblttWzFdLnNsaWNlKDAsMykudG9Mb3dlckNhc2UoKV18fCcwMScpKyctJytwYWQoK21bMl0pOwogICAgfX0KICBdOwogIGZvcih2YXIgaT0wO2k8bGluZXMubGVuZ3RoJiYhZGF0ZTtpKyspewogICAgZm9yKHZhciBqPTA7ajxwYXR0ZXJucy5sZW5ndGgmJiFkYXRlO2orKyl7CiAgICAgIHZhciBtMj1saW5lc1tpXS5tYXRjaChwYXR0ZXJuc1tqXS5yZSk7CiAgICAgIGlmKG0yKXsKICAgICAgICB0cnl7CiAgICAgICAgICB2YXIgZD1wYXR0ZXJuc1tqXS5mbihtMik7CiAgICAgICAgICB2YXIgZHQ9bmV3IERhdGUoZCsnVDEyOjAwOjAwJyk7CiAgICAgICAgICBpZighaXNOYU4oZHQuZ2V0VGltZSgpKSYmZHQuZ2V0RnVsbFllYXIoKT49MjAwMCYmZHQuZ2V0RnVsbFllYXIoKTw9MjAzNSlkYXRlPWQ7CiAgICAgICAgfWNhdGNoKGUyKXt9CiAgICAgIH0KICAgIH0KICB9CgogIHZhciBhbW91bnQ9bnVsbDsKICB2YXIgdG90YWxSZT0vKD86dG90YWx8YW1vdW50XHMqZHVlfGJhbGFuY2VccypkdWV8Z3JhbmRccyp0b3RhbHxzYWxlXHMqdG90YWx8Y2hhcmdlZHx5b3VccypwYWlkKVteXGQkXSpcJD9ccyooXGR7MSw1fVwuP1xkezAsMn0pL2k7CiAgZm9yKHZhciBpPWxpbmVzLmxlbmd0aC0xO2k+PTAmJmFtb3VudD09PW51bGw7aS0tKXsKICAgIHZhciBtMz1saW5lc1tpXS5tYXRjaCh0b3RhbFJlKTsKICAgIGlmKG0zKXt2YXIgdj1wYXJzZUZsb2F0KG0zWzFdKTtpZih2PjAmJnY8NTAwMDApYW1vdW50PXY7fQogIH0KICBpZihhbW91bnQ9PT1udWxsKXsKICAgIHZhciBhbGxBbXRzPVtdLHJlMj0vXCRccyooXGR7MSw1fVwuXGR7Mn0pL2csbXRoOwogICAgd2hpbGUoKG10aD1yZTIuZXhlYyhyYXcpKSE9PW51bGwpe3ZhciB2Mj1wYXJzZUZsb2F0KG10aFsxXSk7aWYodjI+MCYmdjI8NTAwMDApYWxsQW10cy5wdXNoKHYyKTt9CiAgICBpZihhbGxBbXRzLmxlbmd0aCl7YWxsQW10cy5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGItYTt9KTthbW91bnQ9YWxsQW10c1swXTt9CiAgfQoKICB2YXIgbj0obWVyY2hhbnQrJyAnK3JhdykudG9Mb3dlckNhc2UoKTsKICB2YXIgY2F0PSdPdGhlcic7CiAgaWYoL3N0YXJidWNrc3xkdW5raW58Y29mZmVlfGNhZmV8cmVzdGF1cmFudHxtY2RvbmFsZHxidXJnZXJ8cGl6emF8dGFjb3xjaGlwb3RsZXxzdWJ3YXl8Y2hpY2suZmlsfHdlbmR5fGtmY3xwb3BleWVzfGRpbmVyfGJpc3Ryb3xncmlsbHxzdXNoaXxjaGluZXNlfHRoYWl8aXRhbGlhbnxkZWxpfGJha2VyeS9pLnRlc3QobikpY2F0PSdEaW5pbmcnOwogIGVsc2UgaWYoL3dhbG1hcnR8dGFyZ2V0fGNvc3Rjb3xzYW0ucyBjbHVifGtyb2dlcnxwdWJsaXh8c2FmZXdheXx3aG9sZSBmb29kc3xhbGRpfHRyYWRlciBqb2V8Zm9vZCBsaW9ufHdpbm4uZGl4aWV8aC5lLmJ8bWVpamVyfGdpYW50L2kudGVzdChuKSljYXQ9J0dyb2Nlcmllcyc7CiAgZWxzZSBpZigvc2hlbGx8Y2hldnJvbnxleHhvbnxicHxtb2JpbHxzcGVlZHdheXxtYXJhdGhvbnxzdW5vY298Y2lyY2xlIGt8cGlsb3R8Zmx5aW5nIGp8cXVpa3RyaXB8d2F3YXxyYWNldHJhY3xzaGVldHp8XGJnYXNcYnxmdWVsL2kudGVzdChuKSljYXQ9J0dhcyc7CiAgZWxzZSBpZigvYW1hem9ufGViYXl8YmVzdCBidXl8aG9tZSBkZXBvdHxsb3dlc3xpa2VhfHRqIG1heHh8bWFyc2hhbGxzfHJvc3N8a29obHN8bm9yZHN0cm9tfG1hY3l8Z2FwfG9sZCBuYXZ5L2kudGVzdChuKSljYXQ9J1Nob3BwaW5nJzsKICBlbHNlIGlmKC91YmVyfGx5ZnR8ZGVsdGF8dW5pdGVkfGFtZXJpY2FuIGFpcmxpbmVzfHNvdXRod2VzdHxqZXRibHVlfG1hcnJpb3R0fGhpbHRvbnxoeWF0dHxhaXJibmJ8aG90ZWx8bW90ZWx8aW5ufHJlbnRhbCBjYXIvaS50ZXN0KG4pKWNhdD0nVHJhdmVsJzsKICBlbHNlIGlmKC9uZXRmbGl4fGh1bHV8c3BvdGlmeXxhcHBsZXxnb29nbGUgcGxheXxkaXNuZXl8YW1hem9uIHByaW1lfHlvdXR1YmV8bWljcm9zb2Z0fGFkb2JlfHN1YnNjcmlwdGlvbi9pLnRlc3QobikpY2F0PSdTdWJzY3JpcHRpb25zJzsKICBlbHNlIGlmKC9jdnN8d2FsZ3JlZW5zfHJpdGUgYWlkfHBoYXJtYWN5fGhvc3BpdGFsfGNsaW5pY3xcYmRyXGJ8ZGVudGFsfHZpc2lvbnxtZWRpY2FsfGhlYWx0aC9pLnRlc3QobikpY2F0PSdIZWFsdGhjYXJlJzsKICBlbHNlIGlmKC9lbGVjdHJpY3x1dGlsaXR5fHdhdGVyIGJpbGx8YXQudHx2ZXJpem9ufGNvbWNhc3R8eGZpbml0eXx0Lm1vYmlsZXxzcGVjdHJ1bXxjb3gvaS50ZXN0KG4pKWNhdD0nVXRpbGl0aWVzJzsKICBlbHNlIGlmKC9hbWN8cmVnYWx8Y2luZW1hcmt8dGhlYXRlcnxjaW5lbWF8Ym93bGluZ3xkYXZlLmJ1c3RlcnxlbnRlcnRhaW5tZW50L2kudGVzdChuKSljYXQ9J0VudGVydGFpbm1lbnQnOwogIGVsc2V7Zm9yKHZhciBpPTA7aTxjYXRlZ29yaWVzLmxlbmd0aDtpKyspe2lmKG4uaW5kZXhPZihjYXRlZ29yaWVzW2ldLnRvTG93ZXJDYXNlKCkpIT09LTEpe2NhdD1jYXRlZ29yaWVzW2ldO2JyZWFrO319fQoKICByZXR1cm57bWVyY2hhbnQ6bWVyY2hhbnQsZGF0ZTpkYXRlLGFtb3VudDphbW91bnQsY2F0ZWdvcnk6Y2F0fTsKfQoKZnVuY3Rpb24gYXBwbHlTY2FuUmVzdWx0KCl7CiAgdmFyIGRhdGU9JCgnc2Nhbi1yLWRhdGUnKS52YWx1ZSxkZXNjPSQoJ3NjYW4tci1kZXNjJykudmFsdWUudHJpbSgpOwogIHZhciBhbXQ9JCgnc2Nhbi1yLWFtdCcpLnZhbHVlLGNhdD0kKCdzY2FuLXItY2F0JykudmFsdWU7CiAgaWYoc2NhblRhcmdldD09PSdjYycpewogICAgaWYoZGF0ZSkkKCd0eG4tZGF0ZScpLnZhbHVlPWRhdGU7CiAgICBpZihkZXNjKSQoJ3R4bi1kZXNjJykudmFsdWU9ZGVzYzsKICAgIGlmKGFtdCkkKCd0eG4tYW10JykudmFsdWU9YW10OwogICAgaWYoY2F0KSQoJ3R4bi1jYXQnKS52YWx1ZT1jYXQ7CiAgICAkKCd0eG4tZGVzYycpLmZvY3VzKCk7CiAgfSBlbHNlIGlmKHNjYW5UYXJnZXQ9PT0nY2hrJyl7CiAgICBpZihkYXRlKSQoJ2Noay1kYXRlJykudmFsdWU9ZGF0ZTsKICAgIGlmKGRlc2MpJCgnY2hrLWRlc2MnKS52YWx1ZT1kZXNjOwogICAgaWYoYW10KSQoJ2Noay1hbXQnKS52YWx1ZT1hbXQ7CiAgICBpZihjYXQpJCgnY2hrLWNhdCcpLnZhbHVlPWNhdDsKICAgICQoJ2Noay1kZXNjJykuZm9jdXMoKTsKICB9IGVsc2UgewogICAgaWYoZGF0ZSkkKCdtaWtlLWRhdGUnKS52YWx1ZT1kYXRlOwogICAgaWYoZGVzYykkKCdtaWtlLWRlc2MnKS52YWx1ZT1kZXNjOwogICAgaWYoYW10KSQoJ21pa2UtYW10JykudmFsdWU9YW10OwogICAgaWYoY2F0KSQoJ21pa2UtY2F0JykudmFsdWU9Y2F0OwogICAgJCgnbWlrZS1kZXNjJykuZm9jdXMoKTsKICB9CiAgJCgnc2Nhbi1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTsKfQoKJCgnc2Nhbi1jYW1lcmEtYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7JCgnc2Nhbi1maWxlLWNhbWVyYScpLmNsaWNrKCk7fSk7CiQoJ3NjYW4tbGlicmFyeS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXskKCdzY2FuLWZpbGUtbGlicmFyeScpLmNsaWNrKCk7fSk7CiQoJ3NjYW4tZmlsZS1jYW1lcmEnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe2lmKGUudGFyZ2V0LmZpbGVzWzBdKXtwcm9jZXNzUmVjZWlwdEZpbGUoZS50YXJnZXQuZmlsZXNbMF0pO31lLnRhcmdldC52YWx1ZT0nJzt9KTsKJCgnc2Nhbi1maWxlLWxpYnJhcnknKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe2lmKGUudGFyZ2V0LmZpbGVzWzBdKXtwcm9jZXNzUmVjZWlwdEZpbGUoZS50YXJnZXQuZmlsZXNbMF0pO31lLnRhcmdldC52YWx1ZT0nJzt9KTsKJCgnc2Nhbi1jYW5jZWwtYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7JCgnc2Nhbi1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTt9KTsKJCgnc2Nhbi1yZXRyeS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtzY2FuU2hvd1N0YXRlKCd1cGxvYWQnKTt9KTsKJCgnc2Nhbi11c2UtYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGFwcGx5U2NhblJlc3VsdCk7CiQoJ3NjYW4tbW9kYWwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oZSl7aWYoZS50YXJnZXQ9PT0kKCdzY2FuLW1vZGFsJykpJCgnc2Nhbi1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTt9KTsKJCgnc2Nhbi1yYXctdG9nZ2xlLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpewogIHZhciBwcmU9JCgnc2Nhbi1yYXctcHJlJyk7CiAgdmFyIHNob3c9cHJlLnN0eWxlLmRpc3BsYXk9PT0nbm9uZSc7CiAgcHJlLnN0eWxlLmRpc3BsYXk9c2hvdz8nJzonbm9uZSc7CiAgdGhpcy50ZXh0Q29udGVudD1zaG93PydIaWRlIHJhdyBPQ1IgdGV4dCc6J1Nob3cgcmF3IE9DUiB0ZXh0JzsKfSk7CiQoJ3NjYW4tZHJvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJyxmdW5jdGlvbihlKXtlLnByZXZlbnREZWZhdWx0KCk7dGhpcy5jbGFzc0xpc3QuYWRkKCdkcmFnLW92ZXInKTt9KTsKJCgnc2Nhbi1kcm9wJykuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2xlYXZlJyxmdW5jdGlvbigpe3RoaXMuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZy1vdmVyJyk7fSk7CiQoJ3NjYW4tZHJvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLGZ1bmN0aW9uKGUpewogIGUucHJldmVudERlZmF1bHQoKTt0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWctb3ZlcicpOwogIHZhciBmPWUuZGF0YVRyYW5zZmVyLmZpbGVzWzBdO2lmKGYpcHJvY2Vzc1JlY2VpcHRGaWxlKGYpOwp9KTsKCi8vIFJlY2VpcHQgbW9kYWwgZXZlbnRzCmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LWNhbWVyYS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmNwdC1jYW1lcmEtaW5wJykuY2xpY2soKTt9KTsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JjcHQtbGlicmFyeS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmNwdC1saWJyYXJ5LWlucCcpLmNsaWNrKCk7fSk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LWNhbWVyYS1pbnAnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe2lmKGUudGFyZ2V0LmZpbGVzWzBdKXthdHRhY2hSY3B0RmlsZShlLnRhcmdldC5maWxlc1swXSk7fWUudGFyZ2V0LnZhbHVlPScnO30pOwpkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmNwdC1saWJyYXJ5LWlucCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsZnVuY3Rpb24oZSl7aWYoZS50YXJnZXQuZmlsZXNbMF0pe2F0dGFjaFJjcHRGaWxlKGUudGFyZ2V0LmZpbGVzWzBdKTt9ZS50YXJnZXQudmFsdWU9Jyc7fSk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LWNhbmNlbC1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmNwdC1hdHRhY2gtbW9kYWwnKS5jbGFzc0xpc3QucmVtb3ZlKCdvcGVuJyk7fSk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LWF0dGFjaC1tb2RhbCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbihlKXtpZihlLnRhcmdldD09PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LWF0dGFjaC1tb2RhbCcpKWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LWF0dGFjaC1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTt9KTsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JjcHQtcmVtb3ZlLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxyZW1vdmVSY3B0KTsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JjcHQtdmlldy1jbG9zZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LXZpZXctbW9kYWwnKS5jbGFzc0xpc3QucmVtb3ZlKCdvcGVuJyk7fSk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyY3B0LXZpZXctbW9kYWwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oZSl7aWYoZS50YXJnZXQ9PT1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmNwdC12aWV3LW1vZGFsJykpZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JjcHQtdmlldy1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTt9KTsKCi8vIENDIGlubGluZSBwaG90byBldmVudHMKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NjLWNhbS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2MtY2FtLWlucCcpLmNsaWNrKCk7fSk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYy1saWItYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NjLWxpYi1pbnAnKS5jbGljaygpO30pOwpkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2MtY2FtLWlucCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsZnVuY3Rpb24oZSl7CiAgaWYoZS50YXJnZXQuZmlsZXNbMF0pe2NvbXByZXNzSW1hZ2UoZS50YXJnZXQuZmlsZXNbMF0sZnVuY3Rpb24oZCl7Y2NQZW5kaW5nUmNwdD1kO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYy1waG90by10aHVtYicpLnNyYz1kO2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYy1waG90by10aHVtYicpLnN0eWxlLmRpc3BsYXk9J2lubGluZS1ibG9jayc7fSk7fQogIGUudGFyZ2V0LnZhbHVlPScnOwp9KTsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NjLWxpYi1pbnAnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpewogIGlmKGUudGFyZ2V0LmZpbGVzWzBdKXtjb21wcmVzc0ltYWdlKGUudGFyZ2V0LmZpbGVzWzBdLGZ1bmN0aW9uKGQpe2NjUGVuZGluZ1JjcHQ9ZDtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2MtcGhvdG8tdGh1bWInKS5zcmM9ZDtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2MtcGhvdG8tdGh1bWInKS5zdHlsZS5kaXNwbGF5PSdpbmxpbmUtYmxvY2snO30pO30KICBlLnRhcmdldC52YWx1ZT0nJzsKfSk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYy1waG90by10aHVtYicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe2NjUGVuZGluZ1JjcHQ9bnVsbDt0aGlzLnN0eWxlLmRpc3BsYXk9J25vbmUnO3RoaXMuc3JjPScnO30pOwovLyBOb3RlcwooZnVuY3Rpb24oKXsKICB2YXIgY2NOPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYy1ub3RlcycpLGNoa049ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Noay1ub3RlcycpLG1pa2VOPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaWtlLW5vdGVzJyksc2F2Tj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2aW5ncy1ub3RlcycpLGh5c2FOPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdoeXNhLW5vdGVzJyk7CiAgY2NOLnZhbHVlPXNHZXQoJ2NjLW5vdGVzJyl8fCcnOwogIGNoa04udmFsdWU9c0dldCgnY2hrLW5vdGVzJyl8fCcnOwogIG1pa2VOLnZhbHVlPXNHZXQoJ21pa2Utbm90ZXMnKXx8Jyc7CiAgc2F2Ti52YWx1ZT1zR2V0KCdzYXZpbmdzLW5vdGVzJyl8fCcnOwogIGh5c2FOLnZhbHVlPXNHZXQoJ2h5c2Etbm90ZXMnKXx8Jyc7CiAgY2NOLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JyxmdW5jdGlvbigpe3NTZXQoJ2NjLW5vdGVzJyxjY04udmFsdWUpO30pOwogIGNoa04uYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLGZ1bmN0aW9uKCl7c1NldCgnY2hrLW5vdGVzJyxjaGtOLnZhbHVlKTt9KTsKICBtaWtlTi5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsZnVuY3Rpb24oKXtzU2V0KCdtaWtlLW5vdGVzJyxtaWtlTi52YWx1ZSk7fSk7CiAgc2F2Ti5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsZnVuY3Rpb24oKXtzU2V0KCdzYXZpbmdzLW5vdGVzJyxzYXZOLnZhbHVlKTt9KTsKICBoeXNhTi5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsZnVuY3Rpb24oKXtzU2V0KCdoeXNhLW5vdGVzJyxoeXNhTi52YWx1ZSk7fSk7Cn0pKCk7CgovLyBCb290CnJlbmRlckNhdFNlbGVjdHMoKTsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3R4bi1kYXRlJykudmFsdWU9dG9kYXlTdHIoKTsKcmVuZGVyQWxsKCk7CgoKLy8gVHJpcCBNb2RlCmZ1bmN0aW9uIGJ1aWxkVHJpcE9wdHMoc2VsZWN0ZWRJZCl7CiAgdmFyIGg9JzxvcHRpb24gdmFsdWU9IiI+KE5vIFRyaXApPC9vcHRpb24+JzsKICB0cmlwcy5mb3JFYWNoKGZ1bmN0aW9uKHQpewogICAgaCs9JzxvcHRpb24gdmFsdWU9IicrdC5pZCsnIicrKHQuaWQ9PT1zZWxlY3RlZElkPycgc2VsZWN0ZWQnOicnKSsnPicrZXNjKHQubmFtZSkrKHQuZW5kRGF0ZT8nJzonIOKciO+4jycpKyc8L29wdGlvbj4nOwogIH0pOwogIHJldHVybiBoOwp9CmZ1bmN0aW9uIHNhdmVUcmlwcygpe3NTZXQoJ2NjLXRyaXBzJyxKU09OLnN0cmluZ2lmeSh0cmlwcykpO30KZnVuY3Rpb24gZ2V0QWN0aXZlVHJpcE9iaigpe3JldHVybiB0cmlwcy5maW5kKGZ1bmN0aW9uKHQpe3JldHVybiB0LmlkPT09YWN0aXZlVHJpcElkO30pfHxudWxsO30KZnVuY3Rpb24gZ2V0QWxsVHJpcFR4bnModHJpcElkKXsKICB2YXIgYWxsPVtdOwogIHRyYW5zYWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKHQpe2lmKHQudHJpcD09PXRyaXBJZClhbGwucHVzaCh7dDp0LGFjY3Q6J0NDJ30pO30pOwogIGNoay5nZXRUeG5zKCkuZm9yRWFjaChmdW5jdGlvbih0KXtpZih0LnRyaXA9PT10cmlwSWQpYWxsLnB1c2goe3Q6dCxhY2N0OiJDaW5keSdzIENoayJ9KTt9KTsKICBtaWtlLmdldFR4bnMoKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe2lmKHQudHJpcD09PXRyaXBJZClhbGwucHVzaCh7dDp0LGFjY3Q6Ik1pa2UncyBDaGsifSk7fSk7CiAgcmV0dXJuIGFsbDsKfQpmdW5jdGlvbiB0cmlwU3BlbnQodHhucyl7CiAgdmFyIHM9MDsKICB0eG5zLmZvckVhY2goZnVuY3Rpb24oaXRlbSl7CiAgICB2YXIgdD1pdGVtLnQ7CiAgICBpZih0LnR5cGU9PT0nZXhwZW5zZSd8fHQudHlwZT09PSd3aXRoZHJhd2FsJylzKz10LmFtb3VudDsKICAgIGVsc2UgaWYodC50eXBlPT09J3JldHVybicpcy09dC5hbW91bnQ7CiAgfSk7CiAgcmV0dXJuIHM7Cn0KZnVuY3Rpb24gdXBkYXRlVHJpcEluZGljYXRvcigpewogIHZhciB0cmlwPWdldEFjdGl2ZVRyaXBPYmooKTsKICB2YXIgaW5kPSQoJ3RyaXAtaW5kaWNhdG9yJyk7CiAgaWYodHJpcCl7aW5kLnRleHRDb250ZW50PSfinIjvuI8gJyt0cmlwLm5hbWU7aW5kLnN0eWxlLmRpc3BsYXk9Jyc7fQogIGVsc2V7aW5kLnN0eWxlLmRpc3BsYXk9J25vbmUnO30KfQpmdW5jdGlvbiBzdGFydFRyaXAobmFtZSxidWRnZXQsc3RhcnREYXRlKXsKICB2YXIgaWQ9RGF0ZS5ub3coKTsKICB0cmlwcy5wdXNoKHtpZDppZCxuYW1lOm5hbWUsYnVkZ2V0OmJ1ZGdldHx8MCxzdGFydERhdGU6c3RhcnREYXRlLGVuZERhdGU6bnVsbH0pOwogIHNhdmVUcmlwcygpO2FjdGl2ZVRyaXBJZD1pZDtzU2V0KCdhY3RpdmUtdHJpcCcsaWQudG9TdHJpbmcoKSk7dXBkYXRlVHJpcEluZGljYXRvcigpOwp9CmZ1bmN0aW9uIGVuZFRyaXAoKXsKICB2YXIgdHJpcD1nZXRBY3RpdmVUcmlwT2JqKCk7aWYodHJpcCl0cmlwLmVuZERhdGU9dG9kYXlTdHIoKTsKICBzYXZlVHJpcHMoKTthY3RpdmVUcmlwSWQ9bnVsbDtzU2V0KCdhY3RpdmUtdHJpcCcsJycpO3VwZGF0ZVRyaXBJbmRpY2F0b3IoKTsKfQpmdW5jdGlvbiBzaG93VHJpcFN0YXRlKHN0KXsKICBbJ25vbmUnLCdhY3RpdmUnLCdoaXN0b3J5JywnZGV0YWlsJ10uZm9yRWFjaChmdW5jdGlvbihzKXsKICAgICQoJ3RyaXAtcy0nK3MpLnN0eWxlLmRpc3BsYXk9cz09PXN0PycnOidub25lJzsKICB9KTsKfQpmdW5jdGlvbiByZW5kZXJCdWRnZXRCYXIodHJpcCxzcGVudCl7CiAgaWYodHJpcC5idWRnZXQ+MCl7CiAgICB2YXIgcGN0PU1hdGgubWluKDEwMCxzcGVudC90cmlwLmJ1ZGdldCoxMDApOwogICAgdmFyIGJjPXBjdD49OTA/JyNkYzI2MjYnOnBjdD49NzA/JyNkOTc3MDYnOicjMjU2M2ViJzsKICAgIHZhciByZW09dHJpcC5idWRnZXQtc3BlbnQ7CiAgICByZXR1cm4gJzxkaXYgc3R5bGU9Im1hcmdpbjoxMHB4IDAgNnB4OyI+JwogICAgICArJzxkaXYgc3R5bGU9ImRpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjtmb250LXNpemU6LjhyZW07bWFyZ2luLWJvdHRvbTo0cHg7Ij4nCiAgICAgICsnPHNwYW4+QnVkZ2V0OiAnK2ZtdCh0cmlwLmJ1ZGdldCkrJzwvc3Bhbj4nCiAgICAgICsnPHNwYW4gc3R5bGU9ImNvbG9yOicrKHBjdD49OTA/JyNkYzI2MjYnOicjMWUyOTNiJykrJzsiPlNwZW50OiAnK2ZtdChzcGVudCkrJzwvc3Bhbj48L2Rpdj4nCiAgICAgICsnPGRpdiBzdHlsZT0iYmFja2dyb3VuZDojZTJlOGYwO2JvcmRlci1yYWRpdXM6NHB4O2hlaWdodDo4cHg7Ij4nCiAgICAgICsnPGRpdiBzdHlsZT0iYmFja2dyb3VuZDonK2JjKyc7d2lkdGg6JytwY3QrJyU7aGVpZ2h0OjhweDtib3JkZXItcmFkaXVzOjRweDsiPjwvZGl2PjwvZGl2PicKICAgICAgKyc8ZGl2IHN0eWxlPSJmb250LXNpemU6Ljc4cmVtO2NvbG9yOicrKHJlbTwwPycjZGMyNjI2JzonIzE2YTM0YScpKyc7Ij4nCiAgICAgICsocmVtPj0wP2ZtdChyZW0pKycgcmVtYWluaW5nJzpmbXQoLXJlbSkrJyBvdmVyIGJ1ZGdldCcpKyc8L2Rpdj48L2Rpdj4nOwogIH0KICByZXR1cm4gJzxkaXYgc3R5bGU9Im1hcmdpbjoxMHB4IDA7Zm9udC1zaXplOi45NXJlbTtmb250LXdlaWdodDo2MDA7Ij5Ub3RhbCBTcGVudDogJytmbXQoc3BlbnQpKyc8L2Rpdj4nOwp9CmZ1bmN0aW9uIHJlbmRlckNhdEJhcnModHhucyxzcGVudCl7CiAgdmFyIGNhdHM9e307CiAgdHhucy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pewogICAgdmFyIHQ9aXRlbS50OwogICAgaWYodC50eXBlPT09J2V4cGVuc2UnfHx0LnR5cGU9PT0nd2l0aGRyYXdhbCcpY2F0c1t0LmNhdF09KGNhdHNbdC5jYXRdfHwwKSt0LmFtb3VudDsKICB9KTsKICB2YXIgYXJyPU9iamVjdC5rZXlzKGNhdHMpLm1hcChmdW5jdGlvbihrKXtyZXR1cm57Y2F0OmssYW10OmNhdHNba119O30pLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi5hbXQtYS5hbXQ7fSk7CiAgaWYoIWFyci5sZW5ndGgpcmV0dXJuICc8cCBzdHlsZT0iY29sb3I6Izk0YTNiODtmb250LXNpemU6Ljg1cmVtO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MTJweCAwOyI+Tm8gdHJhbnNhY3Rpb25zIG9uIHRoaXMgdHJpcCB5ZXQuPC9wPic7CiAgdmFyIGg9JzxkaXYgc3R5bGU9ImZvbnQtc2l6ZTouNzJyZW07Zm9udC13ZWlnaHQ6NjAwO2NvbG9yOiM2NDc0OGI7bWFyZ2luOjhweCAwIDVweDtsZXR0ZXItc3BhY2luZzouMDVlbTsiPkJZIENBVEVHT1JZPC9kaXY+JzsKICBhcnIuZm9yRWFjaChmdW5jdGlvbihjKXsKICAgIHZhciBwY3Q9c3BlbnQ+MD9NYXRoLnJvdW5kKGMuYW10L3NwZW50KjEwMCk6MDsKICAgIGgrPSc8ZGl2IHN0eWxlPSJtYXJnaW4tYm90dG9tOjVweDsiPicKICAgICAgKyc8ZGl2IHN0eWxlPSJkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Zm9udC1zaXplOi44cmVtOyI+PHNwYW4+Jytlc2MoYy5jYXQpKyc8L3NwYW4+PHNwYW4+JytmbXQoYy5hbXQpKyc8L3NwYW4+PC9kaXY+JwogICAgICArJzxkaXYgc3R5bGU9ImJhY2tncm91bmQ6I2UyZThmMDtib3JkZXItcmFkaXVzOjJweDtoZWlnaHQ6NHB4OyI+PGRpdiBzdHlsZT0iYmFja2dyb3VuZDojMjU2M2ViO3dpZHRoOicrcGN0KyclO2hlaWdodDo0cHg7Ym9yZGVyLXJhZGl1czoycHg7Ij48L2Rpdj48L2Rpdj4nCiAgICAgICsnPC9kaXY+JzsKICB9KTsKICByZXR1cm4gaDsKfQpmdW5jdGlvbiBvcGVuVHJpcE1vZGFsKCl7CiAgdmFyIHRyaXA9Z2V0QWN0aXZlVHJpcE9iaigpOwogIGlmKHRyaXApewogICAgdmFyIHR4bnM9Z2V0QWxsVHJpcFR4bnModHJpcC5pZCksc3BlbnQ9dHJpcFNwZW50KHR4bnMpOwogICAgJCgndHJpcC1hY3RpdmUtaGVhZGVyJykuaW5uZXJIVE1MPSc8aDMgc3R5bGU9Im1hcmdpbi1ib3R0b206MnB4OyI+Jytlc2ModHJpcC5uYW1lKSsnPC9oMz4nCiAgICAgICsnPHAgc3R5bGU9ImNvbG9yOiM2NDc0OGI7Zm9udC1zaXplOi44cmVtO21hcmdpbi1ib3R0b206OHB4OyI+U3RhcnRlZCAnK2ZtdEQodHJpcC5zdGFydERhdGUpKycgJmJ1bGw7ICcrdHhucy5sZW5ndGgrJyB0cmFuc2FjdGlvbicrKHR4bnMubGVuZ3RoIT09MT8ncyc6JycpKyc8L3A+JzsKICAgICQoJ3RyaXAtYnVkZ2V0LWJhcicpLmlubmVySFRNTD1yZW5kZXJCdWRnZXRCYXIodHJpcCxzcGVudCk7CiAgICAkKCd0cmlwLWNhdC1saXN0JykuaW5uZXJIVE1MPXJlbmRlckNhdEJhcnModHhucyxzcGVudCk7CiAgICBzaG93VHJpcFN0YXRlKCdhY3RpdmUnKTsKICB9IGVsc2UgewogICAgJCgndHJpcC1uYW1lLWlucCcpLnZhbHVlPScnOyQoJ3RyaXAtYnVkZ2V0LWlucCcpLnZhbHVlPScnOwogICAgJCgndHJpcC1zdGFydC1pbnAnKS52YWx1ZT10b2RheVN0cigpOyQoJ3RyaXAtbm9uZS1lcnInKS50ZXh0Q29udGVudD0nJzsKICAgIHNob3dUcmlwU3RhdGUoJ25vbmUnKTsKICB9CiAgJCgndHJpcC1tb2RhbCcpLmNsYXNzTGlzdC5hZGQoJ29wZW4nKTsKfQpmdW5jdGlvbiByZW5kZXJUcmlwSGlzdG9yeSgpewogIHZhciBlbmRlZD10cmlwcy5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIHQuZW5kRGF0ZTt9KS5zbGljZSgpLnJldmVyc2UoKTsKICBpZighZW5kZWQubGVuZ3RoKXsKICAgICQoJ3RyaXAtaGlzdG9yeS1saXN0JykuaW5uZXJIVE1MPSc8cCBzdHlsZT0iY29sb3I6Izk0YTNiODt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjIwcHggMDsiPk5vIHBhc3QgdHJpcHMgeWV0LjwvcD4nO3JldHVybjsKICB9CiAgdmFyIGg9Jyc7CiAgZW5kZWQuZm9yRWFjaChmdW5jdGlvbih0cmlwKXsKICAgIHZhciB0eG5zPWdldEFsbFRyaXBUeG5zKHRyaXAuaWQpLHNwZW50PXRyaXBTcGVudCh0eG5zKTsKICAgIGgrPSc8ZGl2IGNsYXNzPSJ0cmlwLWhpc3Qtcm93IiBkYXRhLWlkPSInK3RyaXAuaWQrJyIgc3R5bGU9InBhZGRpbmc6MTBweDtib3JkZXI6MXB4IHNvbGlkICNlMGU0ZWE7Ym9yZGVyLXJhZGl1czo2cHg7bWFyZ2luLWJvdHRvbTo4cHg7Y3Vyc29yOnBvaW50ZXI7Ij4nCiAgICAgICsnPGRpdiBzdHlsZT0iZm9udC13ZWlnaHQ6NjAwOyI+Jytlc2ModHJpcC5uYW1lKSsnPC9kaXY+JwogICAgICArJzxkaXYgc3R5bGU9ImZvbnQtc2l6ZTouNzhyZW07Y29sb3I6IzY0NzQ4YjsiPicrZm10RCh0cmlwLnN0YXJ0RGF0ZSkrJyDigJMgJytmbXREKHRyaXAuZW5kRGF0ZSkKICAgICAgKycgJmJ1bGw7ICcrdHhucy5sZW5ndGgrJyB0eG4nKyh0eG5zLmxlbmd0aCE9PTE/J3MnOicnKQogICAgICArJyAmYnVsbDsgJytmbXQoc3BlbnQpKyh0cmlwLmJ1ZGdldD8nIC8gJytmbXQodHJpcC5idWRnZXQpKycgYnVkZ2V0JzonJykrJzwvZGl2PjwvZGl2Pic7CiAgfSk7CiAgJCgndHJpcC1oaXN0b3J5LWxpc3QnKS5pbm5lckhUTUw9aDsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJpcC1oaXN0LXJvdycpLmZvckVhY2goZnVuY3Rpb24ocm93KXsKICAgIHJvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtzaG93VHJpcERldGFpbChwYXJzZUludCh0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YS1pZCcpLDEwKSk7fSk7CiAgfSk7Cn0KZnVuY3Rpb24gc2hvd1RyaXBEZXRhaWwoaWQpewogIHZhciB0cmlwPXRyaXBzLmZpbmQoZnVuY3Rpb24odCl7cmV0dXJuIHQuaWQ9PT1pZDt9KTtpZighdHJpcClyZXR1cm47CiAgJCgndHJpcC1kZWxldGUtYnRuJykuc2V0QXR0cmlidXRlKCdkYXRhLWlkJyxpZCk7CiAgdmFyIHR4bnM9Z2V0QWxsVHJpcFR4bnMoaWQpLHNwZW50PXRyaXBTcGVudCh0eG5zKTsKICB2YXIgaD0nPGgzIHN0eWxlPSJtYXJnaW4tYm90dG9tOjJweDsiPicrZXNjKHRyaXAubmFtZSkrJzwvaDM+JwogICAgKyc8cCBzdHlsZT0iY29sb3I6IzY0NzQ4Yjtmb250LXNpemU6LjhyZW07bWFyZ2luLWJvdHRvbTo4cHg7Ij4nK2ZtdEQodHJpcC5zdGFydERhdGUpKycg4oCTICcrZm10RCh0cmlwLmVuZERhdGUpKyc8L3A+JzsKICBoKz1yZW5kZXJCdWRnZXRCYXIodHJpcCxzcGVudCk7CiAgaCs9cmVuZGVyQ2F0QmFycyh0eG5zLHNwZW50KTsKICBpZih0eG5zLmxlbmd0aCl7CiAgICBoKz0nPGRpdiBzdHlsZT0iZm9udC1zaXplOi43MnJlbTtmb250LXdlaWdodDo2MDA7Y29sb3I6IzY0NzQ4YjttYXJnaW46MTBweCAwIDRweDtsZXR0ZXItc3BhY2luZzouMDVlbTsiPlRSQU5TQUNUSU9OUzwvZGl2PicKICAgICAgKyc8ZGl2IHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICNlMGU0ZWE7Ym9yZGVyLXJhZGl1czo2cHg7b3ZlcmZsb3c6aGlkZGVuOyI+JzsKICAgIHR4bnMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEudC5kYXRlPGIudC5kYXRlPy0xOjE7fSkuZm9yRWFjaChmdW5jdGlvbihpdGVtKXsKICAgICAgdmFyIHQ9aXRlbS50LGlzRXhwPSh0LnR5cGU9PT0nZXhwZW5zZSd8fHQudHlwZT09PSd3aXRoZHJhd2FsJyk7CiAgICAgIGgrPSc8ZGl2IHN0eWxlPSJwYWRkaW5nOjZweCA4cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgI2YxZjVmOTtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyOyI+JwogICAgICAgICsnPGRpdj48ZGl2IHN0eWxlPSJmb250LXNpemU6LjgycmVtO2ZvbnQtd2VpZ2h0OjUwMDsiPicrZXNjKHQuZGVzYykrJzwvZGl2PicKICAgICAgICArJzxkaXYgc3R5bGU9ImZvbnQtc2l6ZTouN3JlbTtjb2xvcjojNjQ3NDhiOyI+JytmbXREKHQuZGF0ZSkrJyAmYnVsbDsgJytlc2MoaXRlbS5hY2N0KSsnPC9kaXY+PC9kaXY+JwogICAgICAgICsnPHNwYW4gc3R5bGU9ImZvbnQtd2VpZ2h0OjcwMDtjb2xvcjonKyhpc0V4cD8nI2RjMjYyNic6JyMxNmEzNGEnKSsnOyI+JysoaXNFeHA/JysnOifiiJInKStmbXQodC5hbW91bnQpKyc8L3NwYW4+PC9kaXY+JzsKICAgIH0pOwogICAgaCs9JzwvZGl2Pic7CiAgfQogICQoJ3RyaXAtZGV0YWlsLWNvbnRlbnQnKS5pbm5lckhUTUw9aDsKICBzaG93VHJpcFN0YXRlKCdkZXRhaWwnKTsKfQoKLy8gVHJpcCBldmVudHMKJCgnYnRuLXRyaXAnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsb3BlblRyaXBNb2RhbCk7CiQoJ3RyaXAtbW9kYWwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oZSl7aWYoZS50YXJnZXQ9PT0kKCd0cmlwLW1vZGFsJykpJCgndHJpcC1tb2RhbCcpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTt9KTsKJCgndHJpcC1jbG9zZS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXskKCd0cmlwLW1vZGFsJykuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpO30pOwokKCd0cmlwLWNsb3NlLWJ0bjInKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXskKCd0cmlwLW1vZGFsJykuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpO30pOwokKCd0cmlwLXN0YXJ0LWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpewogIHZhciBuYW1lPSQoJ3RyaXAtbmFtZS1pbnAnKS52YWx1ZS50cmltKCksYnVkZ2V0PXBhcnNlRmxvYXQoJCgndHJpcC1idWRnZXQtaW5wJykudmFsdWUpfHwwLHNkPSQoJ3RyaXAtc3RhcnQtaW5wJykudmFsdWU7CiAgaWYoIW5hbWUpeyQoJ3RyaXAtbm9uZS1lcnInKS50ZXh0Q29udGVudD0nUGxlYXNlIGVudGVyIGEgdHJpcCBuYW1lLic7cmV0dXJuO30KICBzdGFydFRyaXAobmFtZSxidWRnZXQsc2QpO29wZW5UcmlwTW9kYWwoKTsKfSk7CiQoJ3RyaXAtaGlzdG9yeS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXtyZW5kZXJUcmlwSGlzdG9yeSgpO3Nob3dUcmlwU3RhdGUoJ2hpc3RvcnknKTt9KTsKJCgndHJpcC1lbmQtYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7aWYoIWNvbmZpcm0oJ0VuZCB0aGlzIHRyaXA/JykpcmV0dXJuO2VuZFRyaXAoKTskKCd0cmlwLW1vZGFsJykuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpO30pOwokKCd0cmlwLWJhY2stYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGZ1bmN0aW9uKCl7c2hvd1RyaXBTdGF0ZSgnbm9uZScpO30pOwokKCd0cmlwLWRldGFpbC1iYWNrLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJyxmdW5jdGlvbigpe3JlbmRlclRyaXBIaXN0b3J5KCk7c2hvd1RyaXBTdGF0ZSgnaGlzdG9yeScpO30pOwokKCd0cmlwLWRlbGV0ZS1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZnVuY3Rpb24oKXsKICB2YXIgaWQ9cGFyc2VJbnQodGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGEtaWQnKSwxMCk7CiAgaWYoIWNvbmZpcm0oJ0RlbGV0ZSB0aGlzIHRyaXAgcmVjb3JkPyAoVHJhbnNhY3Rpb25zIGFyZSBrZXB0LiknKSlyZXR1cm47CiAgdHJpcHM9dHJpcHMuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiB0LmlkIT09aWQ7fSk7c2F2ZVRyaXBzKCk7cmVuZGVyVHJpcEhpc3RvcnkoKTsKfSk7CnVwZGF0ZVRyaXBJbmRpY2F0b3IoKTsKCn0pKCk7Cjwvc2NyaXB0Pgo8L2JvZHk+CjwvaHRtbD4K";
function b64ToUtf8(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
TRACKER_HTML = b64ToUtf8(TRACKER_HTML_B64);
const els = id => document.getElementById(id);
const fmtMoney = n => n < 0 ? '-$' + Math.round(Math.abs(n)).toLocaleString() : '$' + Math.round(n).toLocaleString();
const fmtMoneyK = n => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return sign + '$' + (abs/1000000).toFixed(2) + 'M';
  if (abs >= 1000) return sign + '$' + Math.round(abs/1000) + 'k';
  return sign + '$' + Math.round(abs);
};
const CHART_COLORS = ['#1f7a6c','#e08c2b','#5a4fcf','#c0392b','#3f9c7c','#8892a0','#c07a1f','#2b6ea3','#a15fc9','#5c8a3f'];

// ---------- Local save-status badge ----------
// Small purely-local "Saving... / Saved locally" indicator for the Settings page's badge. This
// replaces an older network cloud-sync status system (removed -- the planner runs entirely from
// local browser storage; see retirement-planner-accounts-and-legacy-cloud.js).
function markPlannerLocalDirty() {
  const badge = els('cloudSyncBadge');
  if (badge) badge.dataset.state = 'unsaved';
  const badgeText = els('cloudSyncBadgeText');
  if (badgeText) badgeText.textContent = 'Saving…';
}
function markPlannerLocalSaved() {
  const badge = els('cloudSyncBadge');
  if (badge) badge.dataset.state = 'saved';
  const badgeText = els('cloudSyncBadgeText');
  if (badgeText) badgeText.textContent = 'Saved locally';
}

// ---------- 2026 Federal tax brackets, Married Filing Jointly (Tax Foundation, Rev. Proc. 2025-32) ----------
