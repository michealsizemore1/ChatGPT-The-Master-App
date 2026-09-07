const VAULT_STORAGE_KEY = 'retirementPlannerVault_v1'; // old localStorage key — read once at boot to migrate, then left empty/unused
const VAULT_DB_NAME = 'retirementPlannerVaultDB_v1';
const VAULT_DB_STORE = 'documents';
const VAULT_MAX_FILE_BYTES = 25 * 1024 * 1024;    // ~25 MB per original file — generous for any real statement or policy PDF
const VAULT_MAX_TEXT_BYTES = 1024 * 1024;         // ~1 MB of extracted text kept per document for search/Ask AI — the original file is always saved in full regardless of this cap
const VAULT_MAX_TOTAL_BYTES = 150 * 1024 * 1024;  // ~150 MB total across all original files — well inside IndexedDB's real-world quota
let vaultDocuments = [];
let vaultChatHistory = [];
let vaultDBPromise = null;

function vaultEsc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Storage used is now measured by the original file size (what's actually sitting in IndexedDB), not
// the length of the extracted text — the two can differ a lot, and it's the file bytes that matter for
// the quota check below.
function vaultTotalBytes() {
  return vaultDocuments.reduce((s, d) => s + (d.sizeOriginal || 0), 0);
}

function openVaultDB() {
  if (vaultDBPromise) return vaultDBPromise;
  vaultDBPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('This browser does not support IndexedDB — Document Vault storage is unavailable.')); return; }
    const req = indexedDB.open(VAULT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VAULT_DB_STORE)) db.createObjectStore(VAULT_DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open Document Vault storage.'));
  });
  return vaultDBPromise;
}

async function vaultDBPut(doc) {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_DB_STORE, 'readwrite');
    tx.objectStore(VAULT_DB_STORE).put(doc);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('The browser reported a storage error while saving this document.'));
  });
}

async function vaultDBDelete(id) {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_DB_STORE, 'readwrite');
    tx.objectStore(VAULT_DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not remove this document from storage.'));
  });
}

async function vaultDBGetAll() {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_DB_STORE, 'readonly');
    const req = tx.objectStore(VAULT_DB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error || new Error('Could not read Document Vault storage.'));
  });
}

// One-time migration: documents uploaded before this feature existed were saved as extracted text only,
// in a single localStorage key. Moves any of those into IndexedDB (fileBlob stays null on these records
// — the original file was never kept for them, so Open/Download will ask you to re-upload) and clears
// the old key so this only ever runs once.
async function migrateVaultFromLocalStorage() {
  let old = null;
  try { const raw = localStorage.getItem(VAULT_STORAGE_KEY); if (raw) old = JSON.parse(raw); } catch (e) { /* ignore corrupt old data */ }
  if (!old || !old.length) return;
  for (const d of old) {
    try { await vaultDBPut({ ...d, fileBlob: null, sizeOriginal: d.sizeOriginal || (d.extractedText ? d.extractedText.length : 0) }); }
    catch (e) { /* best-effort — skip any record that fails to migrate rather than blocking the rest */ }
  }
  try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch (e) { /* ignore */ }
}

async function initVaultStorage() {
  try {
    await migrateVaultFromLocalStorage();
    vaultDocuments = await vaultDBGetAll();
  } catch (e) {
    console.error('Document Vault failed to load:', e);
    vaultDocuments = [];
  }
  renderVaultDocuments();
  renderVaultSearch();
  renderVaultAiGate();
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/(1024*1024)).toFixed(2) + ' MB';
}

// Pulls the plain text out of one uploaded File, using whichever library matches its type. Returns a
// Promise<string>. PDF/DOCX extraction depends on pdf.js/mammoth.js (loaded via CDN with `defer`) having
// actually finished loading by the time you upload — if a library didn't load (offline, CDN blocked),
// this throws a clear, specific error instead of silently producing empty/garbled text. A failure here
// only costs search/Ask AI text — the original file still gets saved and can still be opened.
async function extractTextFromFile(file) {
  const name = file.name || '';
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'txt') return await file.text();
  if (ext === 'pdf') {
    if (!window.pdfjsLib) throw new Error('PDF reader library did not load (check your internet connection) — the file is still saved so you can open it, just without searchable text yet.');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n\n';
      if (text.length > VAULT_MAX_TEXT_BYTES * 2) break; // stop scanning a very long PDF early; still trimmed to the cap below
    }
    return text.trim();
  }
  if (ext === 'docx') {
    if (!window.mammoth) throw new Error('Word document reader library did not load (check your internet connection) — the file is still saved so you can open it, just without searchable text yet.');
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return (result.value || '').trim();
  }
  throw new Error(`Unsupported file type "${ext}" — only .pdf, .docx, and .txt are supported.`);
}

async function handleVaultUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const status = els('vaultUploadStatus');
  for (const file of files) {
    if (file.size > VAULT_MAX_FILE_BYTES) {
      if (status) status.textContent = `"${file.name}" is ${fmtBytes(file.size)} — the per-file limit is ${fmtBytes(VAULT_MAX_FILE_BYTES)}.`;
      continue;
    }
    if (vaultTotalBytes() + file.size > VAULT_MAX_TOTAL_BYTES) {
      if (status) status.textContent = `"${file.name}" would push the vault over its ~${fmtBytes(VAULT_MAX_TOTAL_BYTES)} limit — remove another document first.`;
      continue;
    }
    if (status) status.textContent = `Reading ${file.name}…`;
    let text = '', truncated = false;
    try {
      text = await extractTextFromFile(file);
      if (text.length > VAULT_MAX_TEXT_BYTES) { text = text.slice(0, VAULT_MAX_TEXT_BYTES); truncated = true; }
    } catch (e) {
      // Text extraction failing doesn't stop the upload — the original file is still worth saving, it
      // just won't be searchable or usable with Ask AI (unless re-uploaded once the issue is fixed, or
      // ever, for a scanned/image-only PDF with no real text layer).
      if (status) status.textContent = `"${file.name}": ${e.message}`;
    }
    const doc = {
      id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: file.name,
      type: (file.name.split('.').pop() || '').toUpperCase(),
      sizeOriginal: file.size,
      uploadedDate: new Date().toISOString(),
      extractedText: text,
      truncated,
      fileBlob: file
    };
    try {
      await vaultDBPut(doc);
      vaultDocuments.push(doc);
      if (status) status.textContent = `Added "${file.name}"${truncated ? ' (searchable text truncated — the full original file is saved)' : ''}.`;
    } catch (e) {
      if (status) status.textContent = `Couldn't save "${file.name}": ${e.message}`;
    }
  }
  renderVaultDocuments();
  renderVaultSearch();
  renderVaultAiGate();
  event.target.value = '';
}

async function removeVaultDocument(id) {
  vaultDocuments = vaultDocuments.filter(d => d.id !== id);
  renderVaultDocuments();
  renderVaultSearch();
  renderVaultAiGate();
  try { await vaultDBDelete(id); }
  catch (e) { console.error('Failed to remove document from storage:', e); }
}

// Opens (PDF/TXT, which browsers render directly) or downloads (DOCX, which they can't) the original
// file — the whole reason a Blob is kept, not just its extracted text.
async function openVaultDocument(id) {
  const doc = vaultDocuments.find(d => d.id === id);
  if (!doc || !doc.fileBlob) return;
  try {
    const url = URL.createObjectURL(doc.fileBlob);
    const ext = (doc.type || '').toLowerCase();
    if (ext === 'pdf' || ext === 'txt') {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = doc.name || ('document.' + ext);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    alert('Could not open this document: ' + e.message);
  }
}

function renderVaultDocuments() {
  const rows = els('vaultDocRows');
  const emptyNote = els('vaultEmptyNote');
  const usage = els('vaultStorageUsage');
  const bar = els('vaultStorageBar');
  if (usage) usage.textContent = `${fmtBytes(vaultTotalBytes())} of ~${fmtBytes(VAULT_MAX_TOTAL_BYTES)}`;
  if (bar) bar.style.width = Math.min(100, (vaultTotalBytes() / VAULT_MAX_TOTAL_BYTES) * 100) + '%';
  if (!rows) return;
  if (emptyNote) emptyNote.style.display = vaultDocuments.length ? 'none' : 'block';
  rows.innerHTML = vaultDocuments.map(d => `
    <div class="row-item vault-row">
      <span title="${vaultEsc(d.name)}">${vaultEsc(d.name)}${d.truncated ? ' <span style="color:var(--muted);font-size:14px;">(search text truncated)</span>' : ''}</span>
      <span>${vaultEsc(d.type)}</span>
      <span>${new Date(d.uploadedDate).toLocaleDateString()}</span>
      <span>${fmtBytes(d.sizeOriginal || 0)}</span>
      ${d.fileBlob
        ? `<button class="open-btn" onclick="openVaultDocument('${d.id}')" title="Open / download the original file">Open</button>`
        : `<button class="open-btn" disabled title="Original file not saved for this document — re-upload it to enable Open">Open</button>`}
      <button class="remove-btn" onclick="removeVaultDocument('${d.id}')" title="Remove">×</button>
    </div>
  `).join('');
}

function renderVaultSearch() {
  const input = els('vaultSearchInput');
  const results = els('vaultSearchResults');
  if (!input || !results) return;
  const q = (input.value || '').trim();
  if (!q) { results.innerHTML = ''; return; }
  const qLower = q.toLowerCase();
  const hits = [];
  vaultDocuments.forEach(d => {
    const text = d.extractedText || '';
    const textLower = text.toLowerCase();
    let idx = 0, count = 0;
    const snippets = [];
    while (count < 3) {
      const found = textLower.indexOf(qLower, idx);
      if (found === -1) break;
      const start = Math.max(0, found - 60);
      const end = Math.min(text.length, found + q.length + 60);
      const before = vaultEsc(text.slice(start, found));
      const match = vaultEsc(text.slice(found, found + q.length));
      const after = vaultEsc(text.slice(found + q.length, end));
      snippets.push(`${start > 0 ? '…' : ''}${before}<mark>${match}</mark>${after}${end < text.length ? '…' : ''}`);
      idx = found + q.length;
      count++;
    }
    if (snippets.length) hits.push({ name: d.name, snippets });
  });
  if (!hits.length) { results.innerHTML = `<p style="color:var(--muted);font-size:15.5px;">No matches for "${vaultEsc(q)}".</p>`; return; }
  results.innerHTML = hits.map(h => `
    <div class="vault-search-hit">
      <div class="vault-search-hit-name">${vaultEsc(h.name)}</div>
      ${h.snippets.map(s => `<div class="vault-search-hit-snippet">${s}</div>`).join('')}
    </div>
  `).join('');
}

function renderVaultAiGate() {
  const gate = els('vaultAiGate');
  const box = els('vaultChatBox');
  if (!gate || !box) return;
  const key = (els('anthropicApiKey') && els('anthropicApiKey').value || '').trim();
  if (key) {
    gate.innerHTML = vaultDocuments.length ? '' : '<p style="font-size:16px;color:var(--muted);line-height:1.55;margin:0;">Upload at least one document above before asking a question.</p>';
    box.style.display = vaultDocuments.length ? 'block' : 'none';
  } else {
    gate.innerHTML = '<p style="font-size:16px;color:var(--muted);line-height:1.55;margin:0;">Add your own Anthropic API key on the <b>Settings</b> page to turn this on. Nothing is sent anywhere until you do.</p>';
    box.style.display = 'none';
  }
}

function buildVaultContextForAI() {
  // Budget the combined document text so a big vault doesn't blow past a reasonable request size —
  // includes as many full documents as fit, in upload order, truncating only the last one if needed.
  const MAX_CONTEXT_CHARS = 60000;
  let used = 0;
  const parts = [];
  for (const d of vaultDocuments) {
    const text = d.extractedText || '';
    const remaining = MAX_CONTEXT_CHARS - used;
    if (remaining <= 0) break;
    const chunk = text.length > remaining ? text.slice(0, remaining) + '\n[...truncated...]' : text;
    parts.push(`=== Document: ${d.name} ===\n${chunk}`);
    used += chunk.length;
  }
  return parts.join('\n\n');
}

async function sendVaultChatMessage() {
  const input = els('vaultChatInput');
  const question = (input.value || '').trim();
  if (!question) return;
  const key = (els('anthropicApiKey').value || '').trim();
  if (!key) { renderVaultAiGate(); return; }

  const log = els('vaultChatLog');
  const sendBtn = els('vaultChatSend');
  vaultChatHistory.push({ role: 'user', content: question });
  log.innerHTML += `<div class="chat-msg user">${vaultEsc(question)}</div>`;
  input.value = '';
  sendBtn.disabled = true;
  log.innerHTML += `<div class="chat-msg ai" id="vaultChatPending">Thinking…</div>`;
  log.scrollTop = log.scrollHeight;

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
        max_tokens: 700,
        system: `You are a helpful document assistant embedded in a personal retirement planner web app. Answer the user's question using ONLY the document text below as context — if the answer isn't in these documents, say so plainly rather than guessing. Be concise, and quote the relevant part of the document when useful.\n\nUPLOADED DOCUMENTS:\n${buildVaultContextForAI()}`,
        messages: vaultChatHistory
      })
    });
    const data = await resp.json();
    const pending = els('vaultChatPending');
    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) || `Request failed (${resp.status})`;
      if (pending) pending.outerHTML = `<div class="chat-msg ai">Error: ${vaultEsc(msg)}</div>`;
    } else {
      const text = (data.content && data.content[0] && data.content[0].text) || '(no response)';
      vaultChatHistory.push({ role: 'assistant', content: text });
      if (pending) pending.outerHTML = `<div class="chat-msg ai">${vaultEsc(text).replace(/\n/g,'<br>')}</div>`;
    }
  } catch (e) {
    const pending = els('vaultChatPending');
    if (pending) pending.outerHTML = `<div class="chat-msg ai">Couldn't reach the API from this browser (${vaultEsc(e.message)}). This may be blocked by CORS depending on your browser/extensions.</div>`;
  } finally {
    sendBtn.disabled = false;
    log.scrollTop = log.scrollHeight;
  }
}

// ---------- Settings: backup / restore / reset ----------
function downloadBackup() {
  const state = saveState(true);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `retirement-planner-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch (e) { /* storage unavailable, ignore */ }
  renderBackupReminder();
}

function restoreFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const state = JSON.parse(e.target.result);
      applyState(state);
      // Notes, the Checkpoint Tracker, and Accounts & Cards data are the fields applyState() deliberately
      // doesn't touch on a normal boot (see the comment there) — an explicit restore is the one
      // legitimate case where the backup's copy SHOULD overwrite whatever is currently in this browser,
      // so they're synced here instead.
      if (typeof state.sharedNotesText === 'string') updateSharedNotes(state.sharedNotesText);
      if (state.checkpointBaseline !== undefined) { checkpointBaseline = state.checkpointBaseline; persistCheckpointBaseline(); }
      if (Array.isArray(state.checkpointHistory)) { checkpointHistory = state.checkpointHistory; persistCheckpointHistory(); }
      // Writes straight to the Accounts & Cards register's own localStorage keys — if that page's tracker
      // hasn't loaded yet this session, it'll pick up the restored data the first time it's visited, same
      // as any fresh page load. If it was already open before this restore, a page refresh is needed for
      // it to pick up the change (its shadow-DOM tracker can only be attached once per page load).
      renderExpenseRows(); renderBrokeragePieRows(); renderPieContributionRows(); renderDebtRows();
      renderFutureExpenseRows(); renderWindfallRows(); renderInsuranceRows();
      saveState();
      render();
      alert('Retirement planner backup restored. Document Vault files were left unchanged.');
    } catch (err) {
      alert('Could not read that file — is it a backup exported from this tool?');
    }
  };
  reader.readAsText(file);
}

// ---------- Print Full Plan ----------
// Charts are normally only ever created for whichever page happens to be active on screen — printing
// needs every page's canvas populated at once, so this briefly visits every page (building any chart
// that hasn't been created yet, exactly like a normal page visit already does) before handing off to
// the browser's own print dialog. The @media print stylesheet does the actual "show every page instead
// of just the active one" work; this function's job is just to make sure there's real content in the
// DOM for it to show. Whichever page was open before Print Full Plan was clicked is restored once the
// print dialog closes (or is cancelled), via the afterprint event.
let apiKeyBeforePrint = null;
function removeApiKeyFromPrint() {
  const keyInput = els('anthropicApiKey');
  if (!keyInput) return;
  if (apiKeyBeforePrint === null) apiKeyBeforePrint = keyInput.value;
  keyInput.value = '';
}
function restoreApiKeyAfterPrint() {
  const keyInput = els('anthropicApiKey');
  if (keyInput && apiKeyBeforePrint !== null) keyInput.value = apiKeyBeforePrint;
  apiKeyBeforePrint = null;
  saveState();
}
function printFullPlan() {
  render();
  const activePageEl = document.querySelector('.page.active');
  const originalPageId = activePageEl ? activePageEl.dataset.page : 'dashboard';
  const restoreOriginalPage = () => {
    showPage(originalPageId);
    window.removeEventListener('afterprint', restoreOriginalPage);
  };
  window.addEventListener('afterprint', restoreOriginalPage);
  // Building hidden sections for print must not overwrite the user's saved active section.
  document.querySelectorAll('#sidenav [data-page]').forEach(n => showPage(n.dataset.page, false));
  window.print();
}

// A chart built while some OTHER page was the visible one is still sized for that page's own on-screen
// layout, not for print's "every page visible at once, stacked" layout — beforeprint fires once the
// browser has actually applied the @media print rules, so this is the right moment to tell every
// existing chart to recompute its size against whatever it's really sitting inside now. Registered
// globally (not just from the Print Full Plan button) so it also covers a plain Ctrl/Cmd+P.
window.addEventListener('beforeprint', () => {
  removeApiKeyFromPrint();
  Object.values(charts).forEach(c => { try { c.resize(); } catch (e) { /* a stale/destroyed chart instance can safely be skipped */ } });
});
window.addEventListener('afterprint', restoreApiKeyAfterPrint);

function resetAllData() {
  if (!confirm('This resets the retirement plan, notes, checkpoints, and Coach conversation on this device. Document Vault files remain separate. Continue?')) return;
  if (plannerCloudUser) cloudStorageSet(CLOUD_RESET_PENDING_KEY, '1');
  try {
    [STORAGE_KEY, ACTIVE_PAGE_KEY, EXPLORER_ANALYSIS_KEY, DOLLAR_VIEW_KEY, SPENDING_BASIS_KEY,
      JOB_LOSS_DATE_KEY, LAST_BACKUP_KEY, BACKUP_REMINDER_DISMISSED_KEY, SHARED_NOTES_KEY,
      CHECKPOINT_BASELINE_KEY, CHECKPOINT_HISTORY_KEY, COACH_CHAT_HISTORY_KEY]
      .forEach(key => localStorage.removeItem(key));
  } catch (e) {}
  location.reload();
}

// ---------- Debt Payoff Plan (avalanche order, using existing amortization schedules) ----------
function payoffStatsFromSchedule(sched, currentAge, originalBalance) {
  // Derived from payoffMonthIndex rather than scanning balanceAtYearEnd for the first zero: a
  // future-dated debt (startAge in the future) also reads as $0 balance in every year before it
  // originates, which would otherwise look identical to "already paid off."
  const payoffYearIdx = (sched.payoffMonthIndex == null) ? -1
    : (sched.payoffMonthIndex === 0 ? 0 : Math.floor((sched.payoffMonthIndex - 1) / 12));
  const payoffAge = payoffYearIdx >= 0 ? currentAge + payoffYearIdx : null;
  const totalPaid = sched.paymentDuringYear.slice(0, payoffYearIdx >= 0 ? payoffYearIdx + 1 : sched.paymentDuringYear.length)
    .reduce((s, p) => s + p, 0);
  const totalInterest = sched.neverPaysOff ? null : Math.max(0, totalPaid - originalBalance);
  return { payoffAge, totalInterest, neverPaysOff: sched.neverPaysOff, payoffYearIdx, payoffMonthIndex: sched.payoffMonthIndex };
}
// Exact calendar month/year a debt actually pays off in, from its real amortization schedule — not an
// approximation from age or birth month, which have nothing to do with when a fixed monthly payment
// happens to clear a balance.
function monthIndexToMonthYear(monthIndex) {
  if (monthIndex === null || monthIndex === undefined) return '';
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + monthIndex, 1);
  return target.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function renderDebtPayoffPlan(inputs, ctx) {
  const rowsEl = els('debtPayoffRows');
  const freeAgeEl = els('debtFreeAge');
  const extraSummaryRow = els('debtExtraSummaryRow');
  const extraSummaryEl = els('debtExtraSummary');
  if (!rowsEl || !freeAgeEl) return;

  if (!debts.length) {
    rowsEl.innerHTML = '<tr><td colspan="8">No debts — nothing to pay off.</td></tr>';
    freeAgeEl.textContent = 'Already debt-free';
    if (extraSummaryRow) extraSummaryRow.style.display = 'none';
    return;
  }

  const extraPayment = Math.max(0, +els('debtExtraPayment').value || 0);

  const items = debts.map((d, i) => {
    const sched = ctx.debtSchedules[i];
    const stats = payoffStatsFromSchedule(sched, inputs.currentAge, +d.balance || 0);
    return { debt: d, debtIndex: i, name: d.name || d.category, apr: +d.apr || 0, balance: +d.balance || 0, payment: +d.payment || 0, ...stats };
  }).sort((a, b) => b.apr - a.apr);

  // Extra payment applies only to the top-priority (highest-APR) debt.
  let topWithExtra = null;
  if (extraPayment > 0 && items.length) {
    const top = items[0];
    const boostedDebt = { ...top.debt, payment: top.payment + extraPayment };
    const boostedStartMonthOffset = (top.debt.startAge != null && top.debt.startAge !== '') ? Math.max(0, Math.round((top.debt.startAge - inputs.currentAge) * 12)) : 0;
    const boostedSched = buildDebtSchedule(boostedDebt, ctx.maxYears, boostedStartMonthOffset);
    topWithExtra = payoffStatsFromSchedule(boostedSched, inputs.currentAge, top.balance);
  }

  const payoffLabel = (age, monthIndex) => `Age ${age} (${monthIndexToMonthYear(monthIndex)})`;

  rowsEl.innerHTML = items.map((it, i) => {
    const isTop = i === 0;
    const extraCell = !isTop ? '—'
      : extraPayment <= 0 ? 'Add an extra payment above'
      : topWithExtra.neverPaysOff ? 'Still never pays off'
      : payoffLabel(topWithExtra.payoffAge, topWithExtra.payoffMonthIndex);
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${it.name}</td>
      <td>${fmtMoney(it.balance)}</td>
      <td>${it.apr.toFixed(1)}%</td>
      <td>${fmtMoney(it.payment)}/mo</td>
      <td>${it.neverPaysOff ? 'Never at this payment' : payoffLabel(it.payoffAge, it.payoffMonthIndex)}</td>
      <td>${it.neverPaysOff ? '—' : fmtMoney(it.totalInterest)}</td>
      <td>${extraCell}</td>
    </tr>`;
  }).join('');

  const anyNeverPaysOff = items.some(it => it.neverPaysOff);
  if (anyNeverPaysOff) {
    freeAgeEl.textContent = 'Some debts never pay off at current payments';
  } else {
    const maxPayoffItem = items.reduce((a, b) => (a.payoffAge >= b.payoffAge ? a : b));
    freeAgeEl.textContent = payoffLabel(maxPayoffItem.payoffAge, maxPayoffItem.payoffMonthIndex);
  }

  if (extraSummaryRow) {
    if (extraPayment > 0 && topWithExtra && !topWithExtra.neverPaysOff && !items[0].neverPaysOff) {
      const monthsSaved = (items[0].payoffYearIdx - topWithExtra.payoffYearIdx) * 12;
      const interestSaved = Math.max(0, items[0].totalInterest - topWithExtra.totalInterest);
      extraSummaryRow.style.display = 'flex';
      extraSummaryEl.textContent = `${items[0].name} paid off by ${payoffLabel(topWithExtra.payoffAge, topWithExtra.payoffMonthIndex)} instead of ${payoffLabel(items[0].payoffAge, items[0].payoffMonthIndex)} — roughly ${Math.max(0,monthsSaved)} fewer months and ${fmtMoney(interestSaved)} less interest.`;
    } else {
      extraSummaryRow.style.display = 'none';
    }
  }
}

// ---------- Guardrails visual (Assumptions & Guardrails page) — Income Lab-style dashboard: current
// balance/spending tiles, upper/current/lower guardrail "gauges", and a band-width settings slider.
// Everything here is read-only math derived from the same guardBand/guardAdj-driven logic already in
// projectRun()'s post-retirement branch (need0/currentRate/initialWithdrawalRate) — this just solves that
// same inequality for the BALANCE that would trigger it, instead of the other way around, so it can be
// shown before the fact rather than only observed after a guardrail cut/raise already happened in a row.
function renderGuardrailsVisual(inputs, rows, retirementAge, result) {
  const enabledContent = els('grEnabledContent'), disabledContent = els('grDisabledContent');
  if (!enabledContent || !disabledContent) return;
  if (!inputs.guardrailsEnabled) {
    enabledContent.style.display = 'none';
    disabledContent.style.display = '';
    disabledContent.textContent = 'Turn on "Enable dynamic spending guardrails" above to see how your plan\'s guardrails would respond to market swings — the balance at which your spending budget would increase or decrease, and by how much.';
    return;
  }
  // The reference year is the first year guardrails actually have something to measure against — the
  // start of retirement, same moment projectRun() itself first locks in initialWithdrawalRate.
  const refRow = rows.find(r => r.age === retirementAge) || rows.find(r => r.age > retirementAge);
  const rate = result.initialWithdrawalRate;
  if (!refRow || !rate || rate <= 0) {
    enabledContent.style.display = 'none';
    disabledContent.style.display = '';
    disabledContent.textContent = 'Guardrails have nothing to preview yet — your guaranteed income alone covers spending at retirement, so there\'s no portfolio withdrawal rate for a guardrail band to apply to.';
    return;
  }
  enabledContent.style.display = '';
  disabledContent.style.display = 'none';

  const balance = result.investableAtRetirement;
  const annualSpending = refRow.spending;
  const monthlySpending = annualSpending / 12;
  const band = inputs.guardBand, adj = inputs.guardAdj;

  // Solving currentRate = need0/balance against the same two inequalities projectRun() checks every year:
  // currentRate < rate*(1-band) triggers a raise, currentRate > rate*(1+band) triggers a cut. IMPORTANT:
  // rate (initialWithdrawalRate) is need0/balance — need0 being the PORTFOLIO's share of spending only
  // (totalSpending minus guaranteed income already covered by pension/SS/VA/etc.), not total spending
  // itself. At this reference row rate*balance reconstructs that same need0 exactly (by definition, since
  // this is the very row initialWithdrawalRate was captured from), so balance/(1-band) and balance/(1+band)
  // are what solving the inequality for balance actually reduces to — need0 cancels out of both sides. Using
  // annualSpending (total spending, including guaranteed income) here instead would inflate both thresholds
  // by the same wrong factor and shift the whole band off to one side instead of straddling the balance.
  const upperBalance = band < 1 ? balance / (1 - band) : Infinity;
  const lowerBalance = balance / (1 + band);
  const upperMonthlyPaycheck = annualSpending * (1 + adj) / 12;
  const lowerMonthlyPaycheck = Math.max(refRow.essentialFloor, annualSpending * (1 - adj)) / 12;
  const fmtMoneyOrDash = n => Number.isFinite(n) ? fmtMoney(n) : '—';

  els('grBalanceTile').textContent = fmtMoney(balance);
  els('grPaycheckTile').textContent = fmtMoney(monthlySpending) + '/mo';
  els('grAsOfAge').textContent = `(age ${refRow.age})`;

  els('grUpperBalance').textContent = fmtMoneyOrDash(upperBalance);
  els('grUpperPaycheck').textContent = fmtMoney(upperMonthlyPaycheck) + '/mo';
  els('grCurrentBalance').textContent = fmtMoney(balance);
  els('grCurrentPaycheck').textContent = fmtMoney(monthlySpending) + '/mo';
  els('grLowerBalance').textContent = fmtMoney(lowerBalance);
  els('grLowerPaycheck').textContent = fmtMoney(lowerMonthlyPaycheck) + '/mo';

  els('grSettingsLow').textContent = fmtMoney(lowerMonthlyPaycheck);
  els('grSettingsHigh').textContent = fmtMoney(upperMonthlyPaycheck);
  els('grSettingsCurrent').textContent = fmtMoney(monthlySpending) + '/mo';
  els('grBandReadout').textContent = `(±${Math.round(band * 100)}% of initial withdrawal rate)`;
  const slider = els('guardBandSlider');
  if (slider && document.activeElement !== slider) slider.value = Math.round(band * 100);
}

// ---------- Income Gap & Withdrawals table (retirement years only — spending/guaranteed income aren't tracked pre-retirement) ----------
function renderGapTable(rows, inputs, retirementAge) {
  const body = els('gapRows');
  if (!body) return;
  const retirementRows = rows.filter(r => r.age >= retirementAge);
  // One column per account that's actually drawn from anywhere in the projection (Traditional TSP,
  // Roth TSP, HYSA, each brokerage pie) — reuses the same account keys/labels as the Money Flows
  // withdrawal-order list, so the columns always match whatever accounts/pies currently exist.
  const accountKeys = getWithdrawalAccountKeys();
  const usedKeys = accountKeys.filter(k => retirementRows.some(r => (r.withdrawalByAccount && r.withdrawalByAccount[k]) > 0.5));
  const headRow = els('gapTableHeadRow');
  if (headRow) {
    headRow.innerHTML = '<th>Age</th><th>Guaranteed Income (after tax)</th><th>Total Spending</th><th>Surplus / (Gap)</th><th>Portfolio Withdrawal (gross)</th>'
      + usedKeys.map(k => `<th>${withdrawalAccountInfo(k).label}</th>`).join('');
  }
  if (!retirementRows.length) { body.innerHTML = `<tr><td colspan="${5 + usedKeys.length}">No retirement years in the current projection.</td></tr>`; return; }
  body.innerHTML = retirementRows.map(r => {
    const guaranteed = r.guaranteedIncomeAfterTax != null ? r.guaranteedIncomeAfterTax : (r.guaranteedIncome || 0);
    const spending = r.spending || 0;
    const surplus = guaranteed - spending;
    const surplusStyle = surplus < 0 ? ' style="color:var(--danger);"' : '';
    const surplusLabel = surplus < 0 ? `(${fmtMoney(dv(-surplus, r.age, inputs))})` : fmtMoney(dv(surplus, r.age, inputs));
    const perAccountCells = usedKeys.map(k => `<td>${fmtMoney(dv((r.withdrawalByAccount && r.withdrawalByAccount[k]) || 0, r.age, inputs))}</td>`).join('');
    return `
    <tr>
      <td>${r.age}</td>
      <td>${fmtMoney(dv(guaranteed, r.age, inputs))}</td>
      <td>${fmtMoney(dv(spending, r.age, inputs))}</td>
      <td${surplusStyle}>${surplusLabel}</td>
      <td>${fmtMoney(dv(r.grossWithdrawal || 0, r.age, inputs))}</td>
      ${perAccountCells}
    </tr>`;
  }).join('');
}

// ---------- Tax Bracket & IRMAA Cliffs (Taxes page) ----------
// The Estimated Taxes chart above already surfaces the federal/LTCG bracket in its tooltip footer
// (hover-only, one year at a time) — this instead plots the whole plan's federal marginal bracket as a
// stepped line, plus the IRMAA Medicare surcharge as bars, on one shared age axis, so a bracket jump or
// an IRMAA tier crossing is visible at a glance instead of needing to hover through 40+ years to find it.
// Reuses `rows`/`inputs` already computed by the caller (render()) — no extra projectRun/Monte Carlo
// call, since fedMarginalRate and irmaaSurchargeMonthly are already on every row.
function renderTaxCliffChart(inputs, rows) {
  const canvas = els('chart_tax_cliff');
  if (!canvas || !rows || !rows.length) return;
  const ages = rows.map(r => r.age);
  const bracketPct = rows.map(r => r.fedMarginalRate != null ? r.fedMarginalRate * 100 : null);
  const irmaaMonthly = rows.map(r => r.irmaaSurchargeMonthly || 0);
  const config = {
    type: 'bar',
    data: {
      labels: ages.map(a => 'Age ' + a),
      datasets: [
        { type: 'line', label: 'Federal marginal tax bracket', data: bracketPct, borderColor: '#1f7a6c', backgroundColor: '#1f7a6c', stepped: true, pointRadius: 0, borderWidth: 2, yAxisID: 'y', fill: false, tension: 0 },
        { type: 'bar', label: 'IRMAA surcharge ($/mo, per Medicare enrollee)', data: irmaaMonthly, backgroundColor: '#c0392b', yAxisID: 'y1', borderRadius: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', axis: 'x', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: isMobile()?11:13 } } },
        tooltip: {
          callbacks: {
            label: item => item.dataset.yAxisID === 'y'
              ? 'Marginal bracket: ' + (item.parsed.y != null ? Math.round(item.parsed.y) + '%' : '—')
              : 'IRMAA surcharge: ' + fmtMoney(item.parsed.y) + '/mo'
          }
        }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 12, font: { size: isMobile()?11:13 } } },
        y: { type: 'linear', position: 'left', min: 0, max: 40, ticks: { callback: v => v + '%' } },
        y1: { type: 'linear', position: 'right', min: 0, ticks: { callback: v => fmtMoney(v) }, grid: { drawOnChartArea: false } }
      }
    }
  };
  ensureChartHorizontalScroll(canvas, ages.length * 13);
  if (charts.tax_cliff) { charts.tax_cliff.data = config.data; charts.tax_cliff.options = config.options; charts.tax_cliff.update(); }
  else charts.tax_cliff = new Chart(canvas.getContext('2d'), config);

  // Quick-scan list of every year the bracket or IRMAA tier actually changes, instead of having to hunt
  // through the chart/tooltip year by year to find them.
  const listEl = els('taxCliffCrossings');
  if (listEl) {
    const crossings = [];
    for (let i = 1; i < rows.length; i++) {
      const prevB = bracketPct[i-1], curB = bracketPct[i];
      if (prevB != null && curB != null && curB !== prevB) {
        crossings.push(`Age ${ages[i]}: federal bracket ${curB > prevB ? 'rises' : 'falls'} from ${Math.round(prevB)}% to ${Math.round(curB)}%`);
      }
      const prevI = irmaaMonthly[i-1], curI = irmaaMonthly[i];
      if (curI !== prevI) {
        crossings.push(`Age ${ages[i]}: IRMAA surcharge ${curI > prevI ? 'rises' : 'falls'} from ${fmtMoney(prevI)}/mo to ${fmtMoney(curI)}/mo`);
      }
    }
    listEl.innerHTML = crossings.length
      ? '<ul style="margin:0;padding-left:20px;font-size:15.5px;color:var(--navy);line-height:1.7;">' + crossings.map(c => '<li>' + c + '</li>').join('') + '</ul>'
      : '<p style="font-size:15.5px;color:var(--muted);margin:0;">No bracket or IRMAA tier changes detected across the plan.</p>';
  }
}

// ---------- Roth Conversion planner: before/after comparison (Taxes page) ----------
// Two extra deterministic (non-randomized) projectRun() calls, not Monte Carlo — cheap enough to run
// on every render() alongside the age-comparison table just below it, which already does five. Only
// actually runs when the toggle is on; otherwise the card just hides itself.
function renderRothConversionComparison(inputs, ctx) {
  const wrap = els('rothConversionComparisonWrap');
  const statsEl = els('rothConversionStats');
  if (!wrap || !statsEl) return;
  if (!inputs.rothConversionEnabled) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  const withConv = projectRun(inputs, ctx, false);
  const withoutConv = projectRun({ ...inputs, rothConversionEnabled: false }, ctx, false);

  const lifetimeTaxWith = withConv.rows.reduce((s,r) => s + dv((r.federalTaxAnnual||0) + (r.stateTaxAnnual||0), r.age, inputs), 0);
  const lifetimeTaxWithout = withoutConv.rows.reduce((s,r) => s + dv((r.federalTaxAnnual||0) + (r.stateTaxAnnual||0), r.age, inputs), 0);

  const lastWith = withConv.rows.length ? withConv.rows[withConv.rows.length-1] : null;
  const lastWithout = withoutConv.rows.length ? withoutConv.rows[withoutConv.rows.length-1] : null;

  const netWorthWith = lastWith ? dv(lastWith.netWorth, lastWith.age, inputs) : 0;
  const netWorthWithout = lastWithout ? dv(lastWithout.netWorth, lastWithout.age, inputs) : 0;
  const tradWith = lastWith ? dv(lastWith.balTrad, lastWith.age, inputs) : 0;
  const tradWithout = lastWithout ? dv(lastWithout.balTrad, lastWithout.age, inputs) : 0;
  const rothWith = lastWith ? dv(lastWith.balRoth, lastWith.age, inputs) : 0;
  const rothWithout = lastWithout ? dv(lastWithout.balRoth, lastWithout.age, inputs) : 0;

  // 'ok'/'warn' are the same two .stat modifier classes the header tiles above use (green/red value
  // text) — 'ok' when the conversion strategy comes out ahead on that particular figure, 'warn' when
  // it comes out behind, blank when the difference is negligible either way.
  const cls = (withVal, withoutVal, higherIsBetter) => {
    if (Math.abs(withVal - withoutVal) < 1) return '';
    const better = higherIsBetter ? withVal > withoutVal : withVal < withoutVal;
    return better ? 'ok' : 'warn';
  };

  statsEl.innerHTML = `
    <div class="stat"><div class="label">Total converted to Roth (lifetime)</div><div class="value">${fmtMoney(withConv.totalRothConverted)}</div></div>
    <div class="stat"><div class="label">Tax paid on conversions (lifetime)</div><div class="value">${fmtMoney(withConv.totalRothConversionTax)}</div></div>
    <div class="stat ${cls(lifetimeTaxWith, lifetimeTaxWithout, false)}"><div class="label">Lifetime taxes: with vs. without</div><div class="value">${fmtMoneyK(lifetimeTaxWith)} vs ${fmtMoneyK(lifetimeTaxWithout)}</div></div>
    <div class="stat"><div class="label">Ending Traditional TSP: with vs. without</div><div class="value">${fmtMoneyK(tradWith)} vs ${fmtMoneyK(tradWithout)}</div></div>
    <div class="stat"><div class="label">Ending Roth TSP: with vs. without</div><div class="value">${fmtMoneyK(rothWith)} vs ${fmtMoneyK(rothWithout)}</div></div>
    <div class="stat ${cls(netWorthWith, netWorthWithout, true)}"><div class="label">Ending net worth: with vs. without</div><div class="value">${fmtMoneyK(netWorthWith)} vs ${fmtMoneyK(netWorthWithout)}</div></div>
  `;
}

function renderFinancialWellness(inputs, ctx, result, confidenceScore) {
  const metricsEl = els('financialWellnessMetrics');
  const summaryLineEl = els('wellnessSummaryLine');
  const summaryDetailEl = els('wellnessSummaryDetail');
  if (!metricsEl || !summaryLineEl || !summaryDetailEl) return;

  const rows = result.rows || [];
  const currentRow = rows[0] || {};
  const retirementRow = rows.find(r => r.age === inputs.retirementAge) || rows.find(r => r.age >= inputs.retirementAge) || rows[rows.length - 1] || {};
  const grossIncomeNow = Math.max(0, currentRow.income || 0) + Math.max(0, currentRow.guaranteedIncome || 0);
  const employeeSavings = Math.max(0, currentRow.tradContribOut || 0)
    + Math.max(0, currentRow.rothContribOut || 0)
    + Math.max(0, inputs.brokerageContribution || 0)
    + Math.max(0, currentRow.excessIncomeSaved || 0);
  const employerMatch = Math.max(0, currentRow.matchContribOut || 0);
  const savingsRate = grossIncomeNow > 0 ? employeeSavings / grossIncomeNow : null;
  const currentTaxes = (currentRow.federalTaxAnnual || 0) + (currentRow.stateTaxAnnual || 0) + (currentRow.ficaTaxAnnual || 0);
  const currentLivingCost = Math.max(0, currentRow.recurringLivingCostThisYear || 0);
  const nextYearCashFlow = grossIncomeNow - currentTaxes - currentLivingCost - employeeSavings;

  const withdrawalRates = [];
  rows.forEach((row, index) => {
    if (row.age < inputs.retirementAge) return;
    const prior = index > 0 ? rows[index - 1] : null;
    const startingSavings = prior
      ? Math.max(0, prior.investable || 0) + Math.max(0, prior.cash || 0)
      : Math.max(0, result.investableAtRetirement || 0) + Math.max(0, result.cashAtRetirement || 0);
    const grossWithdrawal = Math.max(0, row.grossWithdrawal || 0);
    if (startingSavings > 0) withdrawalRates.push(grossWithdrawal / startingSavings);
    else if (grossWithdrawal > 0) withdrawalRates.push(1);
  });
  const averageWithdrawalRate = withdrawalRates.length
    ? withdrawalRates.reduce((sum, rate) => sum + rate, 0) / withdrawalRates.length
    : null;

  const retirementGuaranteed = Math.max(0, retirementRow.guaranteedIncomeAfterTax != null
    ? retirementRow.guaranteedIncomeAfterTax
    : (retirementRow.guaranteedIncome || 0));
  const retirementSpending = Math.max(0, retirementRow.spending || 0);
  const guaranteedCoverage = retirementSpending > 0 ? retirementGuaranteed / retirementSpending : null;

  // Emergency reserves intentionally exclude Checking, which this planner treats as operating cash.
  const emergencyReserves = Math.max(0, inputs.savingsBalance || 0) + Math.max(0, inputs.hysaBalance || 0);
  const monthlyLivingCost = currentLivingCost / 12;
  const reserveMonths = monthlyLivingCost > 0 ? emergencyReserves / monthlyLivingCost : null;

  const currentDebtPaymentAnnual = debts.reduce((sum, debt) => {
    const activeNow = debt.startAge == null || debt.startAge === '' || +debt.startAge <= inputs.currentAge;
    return sum + (activeNow ? Math.max(0, +debt.payment || 0) * 12 : 0);
  }, 0);
  const debtPaymentRatio = grossIncomeNow > 0 ? currentDebtPaymentAnnual / grossIncomeNow : null;
  const housingRatio = grossIncomeNow > 0 ? Math.max(0, currentRow.housingCost || 0) / grossIncomeNow : null;

  const taxDeferred = Math.max(0, inputs.tradTSPBalance || 0);
  const taxFree = Math.max(0, inputs.rothTSPBalance || 0);
  const taxable = Math.max(0, inputs.brokerageBalance || 0) + Math.max(0, inputs.savingsBalance || 0) + Math.max(0, inputs.hysaBalance || 0);
  const taxTotal = taxDeferred + taxFree + taxable;
  const taxShares = taxTotal > 0 ? [taxDeferred / taxTotal, taxFree / taxTotal, taxable / taxTotal] : [0, 0, 0];
  const meaningfulTaxBuckets = taxShares.filter(share => share >= 0.10).length;
  const dominantTaxShare = Math.max(...taxShares);

  let survivorCoverage = null;
  let survivorRow = null;
  if (inputs.survivorshipDeathAge > 0) {
    const survivorResult = projectRun({ ...inputs, survivorshipEnabled:true }, ctx, false);
    survivorRow = survivorResult.rows.find(r => r.age >= inputs.survivorshipDeathAge + 1)
      || survivorResult.rows.find(r => r.age >= inputs.survivorshipDeathAge)
      || survivorResult.rows[survivorResult.rows.length - 1];
    const survivorGuaranteed = survivorRow
      ? Math.max(0, survivorRow.guaranteedIncomeAfterTax != null ? survivorRow.guaranteedIncomeAfterTax : (survivorRow.guaranteedIncome || 0))
      : 0;
    const survivorSpending = survivorRow ? Math.max(0, survivorRow.spending || 0) : 0;
    survivorCoverage = survivorSpending > 0 ? survivorGuaranteed / survivorSpending : null;
  }

  // This is deliberately deterministic and clearly labeled as such. It identifies the first retirement
  // age whose base projection reaches household longevity without a shortfall; it is not a replacement
  // for Monte Carlo and does not modify the user's selected retirement age.
  let earliestDeterministicRetirementAge = null;
  const retirementSearchEnd = Math.max(Math.ceil(inputs.retirementAge) + 10, 70);
  for (let age = Math.ceil(inputs.currentAge); age <= retirementSearchEnd; age++) {
    const candidateInputs = { ...inputs, retirementAge:age };
    const candidateResult = projectRun(candidateInputs, buildContext(candidateInputs), false);
    if (candidateResult.success) {
      earliestDeterministicRetirementAge = age;
      break;
    }
  }

  const conversionWindowYears = Math.max(0, Math.min(inputs.ssAge, inputs.rmdAge) - inputs.retirementAge);
  const tradShare = taxTotal > 0 ? taxDeferred / taxTotal : 0;
  const pc = value => value == null || !Number.isFinite(value) ? '—' : (value * 100).toFixed(1) + '%';
  const moneySigned = value => (value < 0 ? '−' : '') + fmtMoney(Math.abs(value));
  const metric = (title, value, status, detail, page, action, statusLabel) => ({
    title, value, status, detail, page, action,
    statusLabel: statusLabel || (status === 'strong' ? 'Strong' : status === 'watch' ? 'Watch' : status === 'attention' ? 'Attention' : 'Review')
  });

  const metrics = [];
  const savingsStatus = savingsRate == null ? 'info' : savingsRate >= 0.15 ? 'strong' : savingsRate >= 0.10 ? 'watch' : 'attention';
  metrics.push(metric(
    'Current savings rate',
    pc(savingsRate),
    savingsStatus,
    savingsRate == null
      ? 'No current gross income is available for this calculation.'
      : `${fmtMoney(employeeSavings)}/yr of planned household saving, plus ${fmtMoney(employerMatch)}/yr of employer match. Rate excludes the match from the denominator calculation.`,
    'moneyflows', 'Review saving flows'
  ));

  const cashFlowStatus = nextYearCashFlow >= monthlyLivingCost ? 'strong' : nextYearCashFlow >= 0 ? 'watch' : 'attention';
  metrics.push(metric(
    'Cash flow over the next 12 months',
    moneySigned(nextYearCashFlow),
    cashFlowStatus,
    `Projected gross income minus income/payroll taxes, current living costs, and planned employee savings. ${nextYearCashFlow >= 0 ? 'A positive amount is unallocated breathing room.' : 'A negative amount indicates the current plan requires cash or account support.'}`,
    'incomeexpenses', 'Review income and expenses'
  ));

  const withdrawalStatus = averageWithdrawalRate == null ? 'info' : averageWithdrawalRate <= 0.04 ? 'strong' : averageWithdrawalRate <= 0.055 ? 'watch' : 'attention';
  metrics.push(metric(
    'Average modeled retirement withdrawal rate',
    pc(averageWithdrawalRate),
    withdrawalStatus,
    'Average annual gross portfolio withdrawals divided by the prior year’s investable and cash balance from retirement through household longevity. Zero-withdrawal retirement years are included.',
    'gap', 'Review withdrawals'
  ));

  const coverageStatus = guaranteedCoverage == null ? 'info' : guaranteedCoverage >= 1 ? 'strong' : guaranteedCoverage >= 0.75 ? 'watch' : 'attention';
  metrics.push(metric(
    'Guaranteed-income coverage at retirement',
    pc(guaranteedCoverage),
    coverageStatus,
    `${fmtMoney(retirementGuaranteed)}/yr of guaranteed income after tax compared with ${fmtMoney(retirementSpending)}/yr of modeled spending at age ${retirementRow.age != null ? retirementRow.age : inputs.retirementAge}.`,
    'income', 'Review retirement income'
  ));

  const reserveStatus = reserveMonths == null ? 'info' : reserveMonths >= 6 ? 'strong' : reserveMonths >= 3 ? 'watch' : 'attention';
  metrics.push(metric(
    'Emergency reserve',
    reserveMonths == null ? '—' : reserveMonths.toFixed(1) + ' months',
    reserveStatus,
    `${fmtMoney(emergencyReserves)} in Savings and HYSA divided by current modeled living costs. Checking is excluded as day-to-day operating cash.`,
    'investments', 'Review cash reserves'
  ));

  const debtStatus = debtPaymentRatio == null ? 'info' : debtPaymentRatio <= 0.15 ? 'strong' : debtPaymentRatio <= 0.30 ? 'watch' : 'attention';
  metrics.push(metric(
    'Current non-housing debt-payment ratio',
    pc(debtPaymentRatio),
    debtStatus,
    `${fmtMoney(currentDebtPaymentAnnual)}/yr of payments on tracked non-mortgage debts active today divided by current gross household income. Future-dated debts and housing costs are excluded because housing is measured separately.`,
    'debt', 'Review debts'
  ));

  const housingStatus = housingRatio == null ? 'info' : housingRatio <= 0.25 ? 'strong' : housingRatio <= 0.35 ? 'watch' : 'attention';
  metrics.push(metric(
    'Current housing-cost ratio',
    pc(housingRatio),
    housingStatus,
    `${fmtMoney(currentRow.housingCost || 0)}/yr of modeled housing cost divided by current gross household income.`,
    'housing', 'Review housing'
  ));

  const taxStatus = taxTotal <= 0 ? 'info' : meaningfulTaxBuckets >= 2 && dominantTaxShare <= 0.70 ? 'strong' : meaningfulTaxBuckets >= 2 && dominantTaxShare <= 0.85 ? 'watch' : 'attention';
  metrics.push(metric(
    'Tax diversification',
    taxTotal > 0 ? Math.round(taxShares[0] * 100) + '% tax-deferred' : '—',
    taxStatus,
    taxTotal > 0
      ? `${Math.round(taxShares[0] * 100)}% tax-deferred, ${Math.round(taxShares[1] * 100)}% Roth, and ${Math.round(taxShares[2] * 100)}% taxable/cash. This measures flexibility, not investment allocation.`
      : 'No tracked retirement or taxable savings balances are available.',
    'taxes', 'Review tax structure'
  ));

  if (inputs.survivorshipDeathAge > 0) {
    metrics.push(metric(
      'First-year survivor guaranteed-income coverage',
      pc(survivorCoverage),
      'info',
      `Separate one-year ratio: guaranteed survivor income compared with regular survivor spending in the first full modeled year after the assumed death at age ${inputs.survivorshipDeathAge}. This is not the Survivorship Monte Carlo score; that score tests the entire remaining lifetime, including investment withdrawals, market risk, and later long-term care.`,
      'survivorship', 'Open separate survivorship analysis', 'Separate'
    ));
  } else {
    metrics.push(metric(
      'First-year survivor guaranteed-income coverage',
      'Not set',
      'info',
      'This is a one-year guaranteed-income coverage ratio, not a Monte Carlo confidence score. Set an assumed age on the Survivorship page to calculate it.',
      'survivorship', 'Set survivorship assumptions', 'Separate'
    ));
  }

  const earliestStatus = earliestDeterministicRetirementAge == null
    ? 'attention'
    : earliestDeterministicRetirementAge <= inputs.retirementAge ? 'strong'
      : earliestDeterministicRetirementAge <= inputs.retirementAge + 2 ? 'watch' : 'attention';
  metrics.push(metric(
    'Earliest deterministic retirement age',
    earliestDeterministicRetirementAge == null ? 'Beyond ' + retirementSearchEnd : 'Age ' + earliestDeterministicRetirementAge,
    earliestStatus,
    `First tested age whose deterministic projection avoids a shortfall through household longevity under the active ${spendingBasis === 'jobloss' ? 'Job Loss' : spendingBasis === 'mustspend' ? 'Must Spend' : 'Like to Spend'} basis. Monte Carlo confidence may still be lower.`,
    'explorers', 'Stress-test retirement timing'
  ));

  const conversionStatus = taxDeferred > 0 && conversionWindowYears > 0 ? (tradShare >= 0.50 ? 'watch' : 'info') : 'info';
  metrics.push(metric(
    'Potential Roth-conversion window',
    conversionWindowYears > 0 ? conversionWindowYears.toFixed(0) + ' years' : 'No pre-SS window',
    conversionStatus,
    taxDeferred > 0 && conversionWindowYears > 0
      ? `There are approximately ${conversionWindowYears.toFixed(0)} years from retirement until the earlier of Social Security or RMD age, with ${fmtMoney(taxDeferred)} currently tax-deferred. This flags a period to test—not an instruction to convert.`
      : 'The simple retirement-to-Social-Security/RMD screen does not identify a clear window. Other conversion opportunities may still exist.',
    'taxes', 'Test conversions', conversionStatus === 'watch' ? 'Watch' : 'Review'
  ));

  const strong = metrics.filter(m => m.status === 'strong');
  const watch = metrics.filter(m => m.status === 'watch');
  const attention = metrics.filter(m => m.status === 'attention');
  const plural = (count, one, many) => count === 1 ? one : many;
  summaryLineEl.textContent = `${strong.length} ${plural(strong.length, 'strength', 'strengths')} • ${watch.length} to watch • ${attention.length} ${plural(attention.length, 'needs attention', 'need attention')}`;
  const priority = attention.length ? attention : watch;
  const strengthText = strong.length ? `Strong areas: ${strong.slice(0, 3).map(m => m.title).join(', ')}.` : 'No measure is currently rated Strong.';
  const priorityText = priority.length ? ` First review: ${priority.slice(0, 3).map(m => m.title).join(', ')}.` : ' No immediate diagnostic warnings were identified.';
  summaryDetailEl.textContent = `${strengthText}${priorityText} Main-plan confidence remains ${Math.round(confidenceScore)}% on Overview and is intentionally not blended into a wellness score.`;

  metricsEl.innerHTML = metrics.map(m => `
    <div class="wellness-metric ${m.status}">
      <div class="wellness-metric-head">
        <div class="wellness-metric-title">${m.title}</div>
        <span class="wellness-status ${m.status}">${m.statusLabel}</span>
      </div>
      <div class="wellness-value">${m.value}</div>
      <div class="wellness-detail">${m.detail}</div>
      <button type="button" class="wellness-link" onclick="showPage('${m.page}')">${m.action} →</button>
    </div>
  `).join('');
}

function render() {
  // Leave the visible state to the stylesheet so a collapsed Guaranteed Income card
  // can hide this row along with every other field. An inline "grid" value would
  // otherwise override the card's collapsed-state rule.
  els('spousalBenefitFields').style.display = els('spouseWorks').checked ? 'none' : '';
  if (els('spouseOwnBenefitFields')) els('spouseOwnBenefitFields').style.display = els('spouseWorks').checked ? '' : 'none';
  els('buyHomeFields').style.display = els('buyHome').checked ? 'block' : 'none';
  els('ltcFields').style.display = els('ltcEnabled').checked ? 'block' : 'none';
  renderLtcVaAidReadout();
  els('pill55').classList.toggle('active', +els('retirementAge').value === 55);
  els('pill56').classList.toggle('active', +els('retirementAge').value === 56);
  els('pill57').classList.toggle('active', +els('retirementAge').value === 57);
  els('pill58').classList.toggle('active', +els('retirementAge').value === 58);
  els('pill59').classList.toggle('active', +els('retirementAge').value === 59);
  for (let ssClaimAge = 62; ssClaimAge <= 70; ssClaimAge++) {
    const ssPill = els('ssPill' + ssClaimAge);
    if (ssPill) ssPill.classList.toggle('active', +els('ssAge').value === ssClaimAge);
  }
  // Self-healing: if a saved state (e.g. restored on a different device) left these fields genuinely
  // blank, re-populate the visible box with its real default now — readInputs() below already treats a
  // blank field as this same default for the math, but without this the input itself keeps looking empty
  // (and the next save would just persist "" again) even though the plan is actually using 10%/20%.
  if (els('guardAdj') && els('guardAdj').value === '') els('guardAdj').value = '10';
  if (els('guardBand') && els('guardBand').value === '') els('guardBand').value = '20';

  const inputs = readInputs();
  const activePageId = document.querySelector('.page.active')?.dataset.page || 'dashboard';
  const ctx = buildContext(inputs);
  const result = projectRun(inputs, ctx, false);
  renderMonteCarloAssumptions(inputs, ctx);
  renderDataQualityChecklist(inputs);
  const { rows, investableAtRetirement, cashAtRetirement, depletionAge, initialWithdrawalRate } = result;
  const retirementAge = inputs.retirementAge, lifeExpectancy = ctx.effectiveLifeExpectancy;

  if (els('sbp1Computed')) els('sbp1Computed').textContent = fmtMoney(inputs.sbp1Annual/12);
  if (els('sbp2Computed')) els('sbp2Computed').textContent = fmtMoney(inputs.sbp2Annual/12);
  if (els('survivorPartBReadout') || els('survivorMedicalCombinedReadout')) {
    const partBSpouseVal = +els('partBSpouseMonthly').value || 0;
    const fedvipVal = +els('survivorFedvipMonthly').value || 0;
    if (els('survivorPartBReadout')) els('survivorPartBReadout').textContent = fmtMoney(partBSpouseVal);
    if (els('survivorMedicalCombinedReadout')) els('survivorMedicalCombinedReadout').textContent = fmtMoney(partBSpouseVal + fedvipVal);
  }
  renderSurvivorExpenseChecklist();
  renderSurvivorshipSummary(inputs, rows);
  renderSurvivorTaxSummary(inputs);
  renderSurvivorshipCharts(inputs, rows, ctx);

  renderDebtPayoffPlan(inputs, ctx);
  renderGapTable(rows, inputs, retirementAge);
  renderGuardrailsVisual(inputs, rows, retirementAge, result);
  renderWithdrawalOrderRows();
  renderWithdrawalOrderOptimizer(inputs);
  renderCombinedExpensesCard(rows, inputs);

  const totalCurrentAssets = inputs.tradTSPBalance + inputs.rothTSPBalance + inputs.brokerageBalance
    + inputs.checkingBalance + inputs.savingsBalance + inputs.hysaBalance;
  if (els('totalAssetsTile')) els('totalAssetsTile').textContent = fmtMoney(totalCurrentAssets);
  renderCheckpointTracker(inputs, rows);
  renderInheritedAccountBreakdown(inputs, rows);
  // "Today" must include only debts that already exist. Future planned loans (for example,
  // replacement vehicles beginning at ages 62 and 77) belong in the projection starting in
  // those years, but are not liabilities on today's household balance sheet.
  const currentDebtBalance = debts.reduce((sum, debt) => {
    const startsInFuture = debt.startAge != null && debt.startAge !== '' && +debt.startAge > inputs.currentAge;
    return sum + (startsInFuture ? 0 : (+debt.balance || 0));
  }, 0);
  const currentVehicleAssets = debts.reduce((sum, debt) => {
    const activeNow = debt.startAge == null || debt.startAge === '' || +debt.startAge <= inputs.currentAge;
    return sum + (activeNow && debt.category === 'Auto Loan' ? (+debt.assetValue || 0) : 0);
  }, 0);
  // Checking is treated as day-to-day operating cash and intentionally excluded from this tile.
  // Savings and HYSA remain part of net worth.
  const netWorthToday = totalCurrentAssets - inputs.checkingBalance + currentVehicleAssets - currentDebtBalance;
  const rowAtRetirement = rows.find(r => r.age === retirementAge);
  const netWorthAtRetirement = rowAtRetirement ? rowAtRetirement.netWorth : (rows.length ? rows[rows.length-1].netWorth : netWorthToday);

  // Monte Carlo score
  const score = runMonteCarlo(inputs, ctx, 1000);
  // Apples-to-apples reference using the same plan, success definition, simulation count, and average
  // returns, but a conventional normal return distribution instead of the optional fat-tailed mixture.
  // The enhanced score remains the primary conservative score; this reference makes comparisons with
  // mainstream planners easier without weakening the underlying household test.
  const standardComparableScore = runMonteCarlo({ ...inputs, enhancedMonteCarlo:false }, ctx, 1000);
  renderFinancialWellness(inputs, ctx, result, score);

  // Mini Monte Carlo scores for all three spending bases (Job Loss / Must Spend / Like to Spend), shown
  // right in the header toggle so you can compare all three at a glance without switching the active one.
  // These reuse the same inputs/ctx already built above and share the exact same simulated market-return
  // paths across all three runs (runMonteCarlo's seed doesn't depend on spendingBasis), so the comparison
  // is apples-to-apples. All three now run the SAME 1000-simulation count as the Dashboard ring — an
  // earlier version used a cheaper 300-run approximation for whichever basis was NOT currently active
  // (to save render time), but that meant a given basis's own number would jump around every time you
  // switched away from it and back: 1000-run precision while it was active, then a slightly different
  // 300-run approximation the moment it became inactive. Same basis, same inputs, genuinely different
  // numbers depending on which tab happened to be selected — that inconsistency mattered more than the
  // extra compute, so every basis is now always evaluated at full precision regardless of which is active.
  const savedSpendingBasisForMini = spendingBasis;
  ['jobloss', 'mustspend', 'liketo'].forEach(basis => {
    spendingBasis = basis;
    const miniScore = basis === savedSpendingBasisForMini ? score : runMonteCarlo(inputs, ctx, 1000);
    const el = els('mcMini' + (basis === 'jobloss' ? 'Jobloss' : basis === 'mustspend' ? 'Mustspend' : 'Liketo'));
    if (el) {
      el.textContent = Math.round(miniScore) + '%';
      // Same red/orange/green traffic-light read as the rest of the app (tip severities, stat.warn/ok),
      // just collapsed to 3 bands instead of the Dashboard ring's 4, since a small dot has less room to
      // read a finer gradient at a glance. Orange (--orange:#e08c2b) is light enough that white text on
      // it loses too much contrast to read at this size — black text stays legible there, while red and
      // green are both dark enough for white to still read cleanly.
      const isOrange = miniScore >= 40 && miniScore < 70;
      el.style.background = miniScore < 40 ? 'var(--danger)' : isOrange ? 'var(--orange)' : 'var(--good)';
      el.style.color = isOrange ? '#000' : '#fff';
    }
    // Ending net worth at your spouse's own life expectancy age, run under THIS specific basis — same
    // calculation as the Dashboard's "Ending balance at spouse's longevity" stat card further down, just
    // repeated per basis instead of only for whichever one happens to be active. Reuses the deterministic
    // `rows` already computed at the top of render() for the active basis (no need to run it twice);
    // the two inactive bases each get one cheap deterministic projectRun() call (not a 1000-run Monte
    // Carlo like the score above — this is a single pass, so it's not worth reusing/caching further).
    const basisRows = basis === savedSpendingBasisForMini ? rows : projectRun(inputs, ctx, false).rows;
    const basisSpouseRow = basisRows.find(r => r.spouseAge === inputs.spouseLifeExpectancy) || basisRows[basisRows.length - 1];
    const basisSpouseEndingBalance = basisSpouseRow ? basisSpouseRow.netWorth : 0;
    const longevityEl = els('mcMiniLongevity' + (basis === 'jobloss' ? 'Jobloss' : basis === 'mustspend' ? 'Mustspend' : 'Liketo'));
    if (longevityEl) {
      longevityEl.textContent = fmtMoneyK(dv(basisSpouseEndingBalance, basisSpouseRow ? basisSpouseRow.age : retirementAge, inputs));
    }
  });
  spendingBasis = savedSpendingBasisForMini;

  if (els('scoreLifeExp')) els('scoreLifeExp').textContent = lifeExpectancy;
  const ring = els('scoreRing');
  ring.textContent = Math.round(score) + '%';
  if (els('standardComparableScore')) els('standardComparableScore').textContent = Math.round(standardComparableScore) + '%';
  let ringColor = '#c0392b', label = 'Needs attention';
  if (score >= 80) { ringColor = '#1f7a6c'; label = 'Strong'; }
  else if (score >= 60) { ringColor = '#3f9c7c'; label = 'Good'; }
  else if (score >= 40) { ringColor = '#c07a1f'; label = 'Uncertain'; }
  ring.style.background = ringColor;
  const primaryScoreMode = inputs.enhancedMonteCarlo ? 'Enhanced Conservative' : 'Standard Returns';
  els('scoreTitle').textContent = `Household Plan Confidence (${primaryScoreMode}; Both Spouses Assumed Alive) — ${label}`;
  if (els('scoreDesc')) els('scoreDesc').textContent = `Primary score: 1,000 simulated market scenarios through age ${lifeExpectancy}. The comparison score uses a conventional normal return distribution. Survivorship remains separate.`;

  const longevityLabel = depletionAge ? `Runs out at age ${depletionAge}` : `Lasts through age ${lifeExpectancy}`;
  const longevityClass = depletionAge ? 'warn' : 'ok';

  const firstYearGuaranteed = rowAtRetirement ? (rowAtRetirement.guaranteedIncomeAfterTax != null ? rowAtRetirement.guaranteedIncomeAfterTax : rowAtRetirement.guaranteedIncome) : 0;
  const firstYearSpending = rowAtRetirement ? rowAtRetirement.spending : (ctx.expensesTotal + inputs.rentMonthly*12);
  const gapToday = Math.max(0, firstYearSpending - firstYearGuaranteed);

  // Small reference notes on the Income and Expenses pages, pointing back at the full
  // Surplus/(Gap) and withdrawal detail that lives on the Income Gap & Withdrawals page.
  const surplusSigned = firstYearGuaranteed - firstYearSpending;
  const surplusText = fmtMoney(dv(Math.abs(surplusSigned), retirementAge, inputs)) + (surplusSigned >= 0 ? ' surplus' : ' gap');
  const withdrawalText = fmtMoney(dv(rowAtRetirement ? rowAtRetirement.grossWithdrawal : 0, retirementAge, inputs));
  ['incomePageSurplusNote','expensesPageSurplusNote'].forEach(id => { if (els(id)) els(id).textContent = surplusText; });
  ['incomePageWithdrawalNote','expensesPageWithdrawalNote'].forEach(id => { if (els(id)) els(id).textContent = withdrawalText; });

  // Survivorship tile: reuses the same what-if the Explorers page runs (never the baseline
  // plan/main score) — a smaller 300-run Monte Carlo, only computed when an assumed age is
  // actually set, so this doesn't add cost to every render for people not using the feature.
  let survivorshipValue = 'Not set';
  let survivorshipClass = '';
  let survivorshipLabel = 'Survivorship confidence score';
  if (inputs.survivorshipDeathAge > 0 && (activePageId === 'dashboard' || activePageId === 'survivorship' || (activePageId === 'explorers' && selectedExplorerAnalysis === 'whatifresults'))) {
    const survivorshipScore = runMonteCarlo({ ...inputs, survivorshipEnabled: true }, ctx, 300);
    survivorshipValue = Math.round(survivorshipScore) + '%';
    survivorshipClass = survivorshipScore >= 80 ? 'ok' : (survivorshipScore < 60 ? 'warn' : '');
    survivorshipLabel = `Survivorship confidence score (if age ${inputs.survivorshipDeathAge})`;
  }
  // Same tile, same already-computed score, mirrored onto the Survivorship page itself so it's visible
  // right there without having to go back to the Dashboard.
  if (els('survivorshipConfidenceTile')) {
    els('survivorshipConfidenceTile').className = 'stat ' + survivorshipClass;
    els('survivorshipConfidenceTile').innerHTML = `<div class="label">${survivorshipLabel}</div><div class="value">${survivorshipValue}</div>`;
  }

  // Ending balance at your spouse's own longevity (life expectancy) age — looked up by spouseAge
  // rather than your own age, since the two can differ by the age gap between you. Falls back to the
  // last projected row in the unlikely event the exact age isn't present.
  const spouseLongevityRow = rows.find(r => r.spouseAge === inputs.spouseLifeExpectancy) || rows[rows.length - 1];
  const spouseEndingBalance = spouseLongevityRow ? spouseLongevityRow.netWorth : 0;

  els('statCards').innerHTML = `
    <div class="stat"><div class="label">Investable balance at retirement (age ${retirementAge})</div><div class="value">${fmtMoneyK(dv(investableAtRetirement, retirementAge, inputs))}</div></div>
    <div class="stat ${longevityClass}"><div class="label">Portfolio longevity (deterministic)</div><div class="value">${longevityLabel}</div></div>
    <div class="stat"><div class="label">Guaranteed income at retirement (after tax)</div><div class="value">${fmtMoneyK(dv(firstYearGuaranteed, retirementAge, inputs))}/yr</div></div>
    <div class="stat"><div class="label">Portfolio must cover</div><div class="value">${fmtMoneyK(dv(gapToday, retirementAge, inputs))}/yr</div></div>
    <div class="stat"><div class="label">Cash reserves at retirement</div><div class="value">${fmtMoneyK(dv(cashAtRetirement, retirementAge, inputs))}</div></div>
    <div class="stat"><div class="label">Net worth today (excluding Checking)</div><div class="value">${fmtMoneyK(netWorthToday)}</div></div>
    <div class="stat"><div class="label">Net worth at retirement</div><div class="value">${fmtMoneyK(dv(netWorthAtRetirement, retirementAge, inputs))}</div></div>
    <div class="stat"><div class="label">Ending balance at spouse's longevity (age ${inputs.spouseLifeExpectancy})</div><div class="value">${fmtMoneyK(dv(spouseEndingBalance, spouseLongevityRow ? spouseLongevityRow.age : retirementAge, inputs))}</div></div>
    <div class="stat"><div class="label">Average retirement withdrawal rate<span class="sub-label" style="display:block; text-transform:none; font-weight:400; font-size:13.5px; margin-top:2px;">${spendingBasis === 'jobloss' ? 'Job Loss' : spendingBasis === 'mustspend' ? 'Must Spend' : 'Like to Spend'} basis</span></div><div class="value">${initialWithdrawalRate != null ? (initialWithdrawalRate*100).toFixed(1)+'%' : '—'}</div></div>
  `;

  if (els('taxStats')) {
    const taxRow = rows.find(r => r.ltcgMarginalRate !== null) || rows[rows.length-1];
    const fedPct = taxRow && taxRow.fedMarginalRate !== null ? (taxRow.fedMarginalRate*100).toFixed(0) : '—';
    const ltcgPct = taxRow && taxRow.ltcgMarginalRate !== null ? (taxRow.ltcgMarginalRate*100).toFixed(0) : '—';
    const idahoPct = (inputs.idahoRate*100).toFixed(1);
    els('taxStats').innerHTML = `
      <div class="stat"><div class="label">Federal marginal rate (Traditional TSP)</div><div class="value">${fedPct}%</div></div>
      <div class="stat"><div class="label">Federal LTCG rate (Brokerage)</div><div class="value">${ltcgPct}%</div></div>
      <div class="stat"><div class="label">Idaho rate above 0% band</div><div class="value">${idahoPct}%</div></div>
    `;
  }

  // "Estimated Taxes" lifetime totals table (Taxes page) — same three series as the stacked bar chart
  // above it, summed across every projected year and respecting the Today's $/Future $ toggle like the
  // chart does, via dv().
  if (els('estimatedTaxesLifetimeTable')) {
    const lifetimeFederal = rows.reduce((s,r) => s + dv(r.federalTaxAnnual || 0, r.age, inputs), 0);
    const lifetimeState = rows.reduce((s,r) => s + dv(r.stateTaxAnnual || 0, r.age, inputs), 0);
    const lifetimeFica = rows.reduce((s,r) => s + dv(r.ficaTaxAnnual || 0, r.age, inputs), 0);
    const lifetimeTotal = lifetimeFederal + lifetimeState + lifetimeFica;
    const swatch = color => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-right:7px;vertical-align:middle;"></span>`;
    els('estimatedTaxesLifetimeTable').innerHTML = `
      <div style="border:1px solid var(--border);border-radius:8px;padding:14px 16px;">
        <div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:10px;">Lifetime</div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:15.5px;"><span>${swatch(CHART_COLORS[0])}Federal Income Tax</span><span>${fmtMoney(lifetimeFederal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:15.5px;"><span>${swatch(CHART_COLORS[1])}State Income Tax</span><span>${fmtMoney(lifetimeState)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:15.5px;"><span>${swatch(CHART_COLORS[2])}FICA</span><span>${fmtMoney(lifetimeFica)}</span></div>
        <div class="total-row"><span>Total</span><span>${fmtMoney(lifetimeTotal)}</span></div>
      </div>
    `;
  }

  renderTaxCliffChart(inputs, rows);
  renderRothConversionComparison(inputs, ctx);

  if (activePageId === 'explorers' && selectedExplorerAnalysis === 'retirementtiming') {
    renderRetirementTimingAnalysis();
  }

  // Monte Carlo failure diagnostics + historical crisis stress test
  if (activePageId === 'dashboard') {
    renderMCDiagnosticsV2(inputs, ctx);
    renderCrisisStressTestV2(inputs, ctx);
  }

  // Dashboard chart
  const retirementIndex = rows.findIndex(r => r.age === retirementAge);
  const investablePoints = rows.map(r => ({ x: r.age, y: dv(r.investable, r.age, inputs) }));
  const cashPoints = rows.map(r => ({ x: r.age, y: dv(r.cash, r.age, inputs) }));
  const netWorthPoints = rows.map(r => ({ x: r.age, y: dv(r.netWorth, r.age, inputs) }));

  const verticalLinePlugin = {
    id: 'verticalLine',
    afterDatasetsDraw(c) {
      const xScale = c.scales.x, yScale = c.scales.y;
      const xPix = xScale.getPixelForValue(retirementAge);
      const ctx2 = c.ctx;
      ctx2.save();
      ctx2.strokeStyle = '#8892a0'; ctx2.setLineDash([4,4]); ctx2.lineWidth = 1;
      ctx2.beginPath(); ctx2.moveTo(xPix, yScale.getPixelForValue(yScale.min)); ctx2.lineTo(xPix, yScale.getPixelForValue(yScale.max)); ctx2.stroke();
      ctx2.restore();
    }
  };

  const data = {
    datasets: [
      { label: 'Investable (TSP + brokerage)', data: investablePoints, borderWidth: 2.5, pointRadius: 0, tension: 0.15, fill: true,
        backgroundColor: 'rgba(31,122,108,0.08)', segment: { borderColor: c => c.p0DataIndex < retirementIndex ? '#1f7a6c' : '#e08c2b' } },
      { label: 'Cash & bank accounts', data: cashPoints, borderWidth: 1.75, borderColor: '#8892a0', borderDash: [3,3], pointRadius: 0, tension: 0.15, fill: false },
      { label: 'Net worth', data: netWorthPoints, borderWidth: 2, borderColor: '#5a4fcf', pointRadius: 0, tension: 0.15, fill: false }
    ]
  };
  const options = {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { enabled: true, callbacks: {
      title: items => 'Age ' + items[0].parsed.x, label: item => item.dataset.label + ': ' + fmtMoney(item.parsed.y)
    } } },
    scales: {
      x: { type: 'linear', title: { display: true, text: 'Age' }, ticks: { stepSize: 5 } },
      y: { title: { display: true, text: 'Balance' }, ticks: { callback: v => fmtMoneyK(v) } }
    }
  };
  if (charts.dashboard) { charts.dashboard.data = data; charts.dashboard.options = options; charts.dashboard.update(); }
  else { charts.dashboard = new Chart(els('balanceChart').getContext('2d'), { type:'line', data, options, plugins:[verticalLinePlugin] }); }
  applyChartRange('dashboard');

  // Table
  if (els('dollarModeNote')) els('dollarModeNote').textContent = dollarView === 'real' ? " (today's dollars)" : ' (future/nominal dollars)';
  const tbody = document.querySelector('#yearTable tbody');
  const currentCalendarYear = new Date().getFullYear();
  tbody.innerHTML = rows.map(r => `
    <tr class="${r.age === retirementAge ? 'retire-row' : ''}">
      <td>${currentCalendarYear + (r.age - inputs.currentAge)}</td>
      <td>${r.age}</td><td>${r.spouseAge}</td>
      <td>${r.income ? fmtMoney(dv(r.income, r.age, inputs)) : '—'}</td>
      <td>${r.contributions ? fmtMoney(dv(r.contributions, r.age, inputs)) : '—'}</td>
      <td>${r.spousalBenefit ? fmtMoney(dv(r.spousalBenefit, r.age, inputs)) : '—'}</td>
      <td>${r.guaranteedIncome ? fmtMoney(dv(r.guaranteedIncome, r.age, inputs)) : '—'}</td>
      <td>${r.spending ? fmtMoney(dv(r.spending, r.age, inputs)) : '—'}</td>
      <td>${r.withdrawal ? fmtMoney(dv(r.withdrawal, r.age, inputs)) : '—'}</td>
      <td>${r.ltcCost ? fmtMoney(dv(r.ltcCost, r.age, inputs)) : '—'}</td>
      <td>${fmtMoney(dv(r.investable, r.age, inputs))}</td><td>${fmtMoney(dv(r.cash, r.age, inputs))}</td>
      <td>${fmtMoney(dv(r.debtBalance, r.age, inputs))}</td><td>${fmtMoney(dv(r.homeEquity, r.age, inputs))}</td><td>${fmtMoney(dv(r.netWorth, r.age, inputs))}</td>
    </tr>
  `).join('');

  // Build snapshot for per-section charts
  lastSnapshot = {
    yearsToRetirement: Math.max(0, inputs.retirementAge - inputs.currentAge),
    yearsInRetirement: Math.max(0, ctx.effectiveLifeExpectancy - inputs.retirementAge),
    tradContribFirstYear: rows[0] ? rows[0].tradContribOut : 0,
    rothContribFirstYear: rows[0] ? rows[0].rothContribOut : 0,
    matchContribFirstYear: rows[0] ? rows[0].matchContribOut : 0,
    brokerageContribution: inputs.brokerageContribution,
    tradTSPBalance: inputs.tradTSPBalance,
    rothTSPBalance: inputs.rothTSPBalance,
    brokerageBalance: inputs.brokerageBalance,
    cashTotal: inputs.checkingBalance + inputs.savingsBalance + inputs.hysaBalance,
    currentRentAnnual: inputs.rentMonthly*12,
    housingCostAtRetirement: rowAtRetirement ? rowAtRetirement.housingCost : inputs.rentMonthly*12,
    ssAtRetirement: rowAtRetirement ? rowAtRetirement.ssAmount : 0,
    spousalAtRetirement: rowAtRetirement ? rowAtRetirement.spousalBenefit : 0,
    pensionAtRetirement: rowAtRetirement ? rowAtRetirement.pensionAmount : 0,
    pension2AtRetirement: rowAtRetirement ? rowAtRetirement.pension2Amount : 0,
    vaDisabilityAtRetirement: rowAtRetirement ? rowAtRetirement.vaDisabilityAmount : 0,
    annuityAtRetirement: rowAtRetirement ? rowAtRetirement.annuityAmount : 0,
    grossWithdrawalFirstYear: rowAtRetirement ? rowAtRetirement.grossWithdrawal : 0,
    netSpendingFirstYear: rowAtRetirement ? rowAtRetirement.withdrawal : 0,
    guaranteedIncomeAtRetirement: firstYearGuaranteed,
    spendingAtRetirement: firstYearSpending,
    surplusAtRetirement: firstYearGuaranteed - firstYearSpending,
    preReturnPct: +els('preReturn').value,
    postReturnPct: +els('postReturn').value,
    inflationPct: +els('inflation').value,
    medicalInflationPct: +els('medicalInflation').value,
    ssColaPct: +els('ssCola').value,
    buyHome: inputs.buyHome,
    homeAppreciationPct: +els('homeAppreciation').value,
    rows, inputs
  };

  // Refresh chart for whichever page is currently visible (and any already-built ones)
  const activePage = document.querySelector('.page.active');
  Object.keys(charts).forEach(pid => {
    if (pid === 'dashboard' || pid === 'explorers_whatif' || pid === 'explorers_marketrisk') return;
    if (pid.endsWith('_yearly')) ensureOrUpdateYearlyChart(pid.slice(0, -'_yearly'.length), lastSnapshot);
    else if (pid.endsWith('_pies')) ensureOrUpdatePieChart(pid.slice(0, -'_pies'.length), lastSnapshot);
    else ensureOrUpdateChart(pid, lastSnapshot);
  });
  if (activePage && activePage.dataset.page !== 'dashboard' && activePage.dataset.page !== 'explorers') {
    refreshSectionCharts(activePage.dataset.page, lastSnapshot);
  }
  if (activePage && activePage.dataset.page === 'explorers') renderExplorers();
  if (activePage && activePage.dataset.page === 'coach') { renderCoachTips(); renderCoachAiGate(); }
  if (activePage && activePage.dataset.page === 'vault') { renderVaultDocuments(); renderVaultAiGate(); }
  if (activePage && activePage.dataset.page === 'savings') renderSavingsPage();

  saveState();
}

const hadSavedState = loadState();
applySharedInvestmentsToPlanner();
// Restore an age-button selection before the first calculation even if the previous cloud attempt
// ended during refresh. The pending marker is removed only after legacy online service confirms the saved plan.
applyPendingRetirementAgeSelection();
// loadState() never touches sharedNotesText (see applyState()) — notes live only in their own
// dedicated key, always updated on every keystroke, so this is the one and only source of truth for
// what shows up in every page's textarea at boot.
sharedNotesText = loadSharedNotes();
renderSharedNotesTextareas();
loadCheckpointData();
// Async (IndexedDB) — fires and forgets rather than being awaited, so a slow or failing Vault load can
// never hold up the rest of boot; it renders the Vault page's own DOM once it resolves, same as any
// other in-page async fetch, and reports its own errors to the console instead of throwing here.
initVaultStorage();
renderBackupReminder();
try {
  const savedDollarView = localStorage.getItem(DOLLAR_VIEW_KEY);
  if (savedDollarView === 'real' || savedDollarView === 'nominal') {
    dollarView = savedDollarView;
    document.querySelectorAll('#dollarToggle .dollar-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === savedDollarView));
  }
} catch (e) { /* storage unavailable, ignore */ }

try {
  const savedSpendingBasis = localStorage.getItem(SPENDING_BASIS_KEY);
  if (savedSpendingBasis === 'liketo' || savedSpendingBasis === 'mustspend' || savedSpendingBasis === 'jobloss') {
    spendingBasis = savedSpendingBasis;
    document.querySelectorAll('#spendingBasisToggle .dollar-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === savedSpendingBasis));
  }
} catch (e) { /* storage unavailable, ignore */ }

try {
  const savedJobLossDate = localStorage.getItem(JOB_LOSS_DATE_KEY);
  if (savedJobLossDate) {
    jobLossDate = savedJobLossDate;
    const jlEl = els('jobLossDate');
    if (jlEl) jlEl.value = savedJobLossDate;
  }
} catch (e) { /* storage unavailable, ignore */ }

// Restore the visible section before building rows, charts, and Monte Carlo results. Previously this
// happened after render(); if any optional chart/library failed during startup, execution stopped first
// and the still-active Dashboard was left on screen even though the correct section had been saved.
const initialPageAtBoot = readInitialPage();
const initialExplorerAnalysisAtBoot = readInitialExplorerAnalysis();
// Collapse the static cards immediately, before any calculations or optional chart libraries run.
// This guarantees a clean refresh even if an unrelated startup task later fails.
collapsePlannerCards();
if (initialPageAtBoot) {
  activatePageShell(initialPageAtBoot);
  // Set the Explorer subsection before render() builds and saves the first snapshot. Otherwise the
  // default "whatif" selection can be written back during startup before the saved route is restored.
  if (initialPageAtBoot === 'explorers') activateExplorerAnalysis(initialExplorerAnalysisAtBoot, false, false);
}

restoreAnthropicApiKeyLocal();

// Start session restoration before any account rows, calculations, Monte Carlo runs, or charts are
// built. A data-specific rendering exception must never prevent authentication from starting and
// leave the badge permanently at its original "Checking" label.
// Let the locally saved plan finish its first render before starting authentication and network work.
// On slower phones this prevents the initial legacy online service request from competing with the planner's
// calculation-heavy startup; a manual Sync succeeding immediately afterward was the telltale symptom.
initPlannerCloudSync();

renderExpenseRows();
renderBrokeragePieRows();
renderPieContributionRows();
renderDebtRows();
renderFutureExpenseRows();
renderWindfallRows();
renderInsuranceRows();

window.addEventListener('storage', function(event) {
  if (event.key !== SHARED_INVESTMENT_KEY) return;
  let shared = null;
  try { shared = JSON.parse(event.newValue || 'null'); } catch (e) {}
  if (applySharedInvestmentsToPlanner(shared)) render();
});

// Plain top-level fields (currentAge, preReturn, ltcStartAge, stdDeduction, etc.) were never wired to
// an individual oninput/onchange handler the way checkboxes, row-item fields, and date pickers are —
// editing one directly updated the DOM but never called render()/saveState(), so the edit silently
// vanished on the next reload (reverting to whatever was last actually saved, e.g. a stale default).
// It only looked like it "worked" when some other action nearby (a checkbox, a row edit, a pill
// click) happened to trigger render() shortly after and incidentally picked up the live DOM value.
// One delegated listener on .shell, covering every plain input/select inside the main planner
// (not the Shadow DOM tracker, whose native change/input events don't cross the shadow boundary
// anyway), fixes every field at once instead of just the one that got reported.
const shellEl = document.querySelector('.shell');
if (shellEl) {
  let pendingFieldSave = null;
  shellEl.addEventListener('input', function(e) {
    // Persist ordinary fields while they are being edited. Browsers do not always dispatch a final
    // "change" event when Refresh is clicked while an input still has focus, which previously made
    // the latest value disappear. This lightweight save does not rerun Monte Carlo on every keystroke.
    if (!e.target || !e.target.matches || !e.target.matches('input, select') || e.target.classList.contains('shared-notes-textarea')) return;
    if (!plannerCloudReady) plannerCloudLocalEditDuringInit = true;
    if (e.target.id === 'retirementAge') rememberRetirementAgeSelection(e.target.value);
    // Record the pending cloud change immediately. If Refresh is pressed before the short local-save
    // timer fires, persistBeforeLeaving() will still save the value and the next load will know that
    // this device—not the older cloud row—contains the newer plan.
    markPlannerCloudDirty();
    clearTimeout(pendingFieldSave);
    pendingFieldSave = setTimeout(() => saveState(), 150);
  });
  shellEl.addEventListener('change', function(e) {
    // Shared Notes textareas (class="shared-notes-textarea", one per page) are deliberately excluded
    // here — they persist directly via updateSharedNotes()'s own oninput handler instead of the full
    // render() pipeline, so typing/blurring in a notes box never triggers a 1000-simulation Monte
    // Carlo re-run just to save a few words of text.
    if (e.target && e.target.matches && e.target.matches('input, select')) {
      if (!plannerCloudReady) plannerCloudLocalEditDuringInit = true;
      render();
    }
  });
}

// A final synchronous snapshot covers Refresh, closing the tab, navigating away, and mobile browsers
// suspending the page before the short input debounce above has fired. The active section is stored
// independently so reopening never defaults to Dashboard unless Dashboard was actually last viewed.
function persistBeforeLeaving() {
  const activePage = document.querySelector('.page.active');
  try {
    if (activePage && activePage.dataset.page) {
      localStorage.setItem(ACTIVE_PAGE_KEY, activePage.dataset.page);
      if (activePage.dataset.page === 'explorers' && isKnownExplorerAnalysis(selectedExplorerAnalysis)) {
        localStorage.setItem(EXPLORER_ANALYSIS_KEY, selectedExplorerAnalysis);
      }
      const pageHash = activePage.dataset.page === 'explorers' && isKnownExplorerAnalysis(selectedExplorerAnalysis)
        ? '#explorers/' + encodeURIComponent(selectedExplorerAnalysis)
        : '#' + encodeURIComponent(activePage.dataset.page);
      if (location.hash !== pageHash) history.replaceState(null, '', pageHash);
    }
  } catch (e) { /* storage unavailable, ignore */ }
  // Save the final DOM values locally without creating a brand-new cloud-dirty marker merely because
  // the page is unloading. Real edits already mark themselves dirty in their input/change handlers.
  saveState(false, true);
}
window.addEventListener('pagehide', persistBeforeLeaving);
window.addEventListener('beforeunload', persistBeforeLeaving);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistBeforeLeaving(); });

// Refresh currentAge/spouseAge from the actual birthdates on every load, so they never go stale
// waiting on a manual edit (this must run after restoreState has populated birthDate/spouseBirthDate
// from any saved backup, and before the first render()).
syncAgeFromBirthDate('birthDate', 'currentAge', 'birthMonth', 'birthDateHint');
syncAgeFromBirthDate('spouseBirthDate', 'spouseAge', 'spouseBirthMonth', 'spouseBirthDateHint');

// Must run after currentAge/spouseAge are fresh (above) so the birth-date-anchored math has the
// right basis ages to fall back on, and before the render() below so the corrected ages are what
// the very first Monte Carlo run actually uses.
recomputeAgesFromDates();

render();
// render() creates several diagnostic/chart cards dynamically. Apply the same refresh rule to those
// newly created cards so every collapsible card in every section starts closed.
collapsePlannerCards();

// Finish any page-specific setup after the main render. The section itself was already activated above,
// so it remains correct even if an unrelated startup calculation fails before this point.
if (initialPageAtBoot) showPage(initialPageAtBoot, false);
if (initialPageAtBoot === 'explorers') activateExplorerAnalysis(initialExplorerAnalysisAtBoot, true, false);

// Browser Back/Forward can change only the section marker; keep the visible page in step with it.
window.addEventListener('hashchange', () => {
  let parts = [];
  try { parts = decodeURIComponent(location.hash.slice(1)).split('/'); } catch (e) { return; }
  const pageId = parts[0];
  if (!isKnownPage(pageId)) return;
  showPage(pageId, false);
  try { localStorage.setItem(ACTIVE_PAGE_KEY, pageId); } catch (e) { /* storage unavailable, ignore */ }
  if (pageId === 'explorers') activateExplorerAnalysis(parts[1] || readInitialExplorerAnalysis(), true, true);
});

