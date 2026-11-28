// ════════════════════════════════════════════════════════════════════
// 📎 Receipts & documents (Nov 27 2026): photos, PDFs and other files attached to records in the wrapped apps
// (Health Records, Dates & Docs, Vehicle Upkeep, Range Log). Files stay on the phone, in the app's own storage
// (IndexedDB), and go into the app's backups. Pictures are shrunk to a sensible size; PDFs and other files are kept
// as they are (up to 20 MB each). Tapping a picture shows it full screen; tapping a PDF or other file opens it in
// the phone's viewer (a copy is saved to Downloads/<app> to do that).
//
// One shared copy: each of those apps' bundle.py copies it into the APK and loads it before the page's own script.
// ════════════════════════════════════════════════════════════════════
window.Attach = (function () {
  'use strict';
  var DBN = 'app_attachments', ST = 'f', MAX = 20 * 1024 * 1024, idb = null, onDelete = null;
  var ACCEPT = 'image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic';

  function open(cb) {
    if (idb) return cb(idb);
    var r = indexedDB.open(DBN, 1);
    r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
    r.onsuccess = function () { idb = r.result; cb(idb); };
    r.onerror = function () { cb(null); };
  }
  function put(id, rec, cb) { open(function (d) { if (!d) return cb(false); var t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(rec, id); t.oncomplete = function () { cb(true); }; t.onerror = function () { cb(false); }; }); }
  function get(id, cb) { open(function (d) { if (!d) return cb(null); var q = d.transaction(ST).objectStore(ST).get(id); q.onsuccess = function () { cb(q.result || null); }; q.onerror = function () { cb(null); }; }); }
  function del(id) { open(function (d) { if (d) d.transaction(ST, 'readwrite').objectStore(ST).delete(id); }); }
  function all(cb) { open(function (d) { var out = {}; if (!d) return cb(out); var c = d.transaction(ST).objectStore(ST).openCursor(); c.onsuccess = function () { var cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else cb(out); }; c.onerror = function () { cb(out); }; }); }
  function restore(map, cb) { var ids = Object.keys(map || {}), n = 0; if (!ids.length) return cb && cb(); ids.forEach(function (id) { put(id, map[id], function () { if (++n === ids.length && cb) cb(); }); }); }
  function uid() { return 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isImg(type, name) { return /^image\//.test(type || '') && !/heic/i.test(type + name); }

  function readFile(f, cb) {
    if (f.size > MAX) { alert('"' + f.name + '" is over 20 MB — too big to attach.'); return cb(null); }
    var rd = new FileReader();
    rd.onload = function () {
      if (!isImg(f.type, f.name)) return cb({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, data: rd.result, added: Date.now() });
      var im = new Image();
      im.onload = function () {
        var M = 1800, s = Math.min(1, M / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        var data = c.toDataURL('image/jpeg', 0.82);
        cb({ name: f.name.replace(/\.\w+$/, '') + '.jpg', type: 'image/jpeg', size: Math.round(data.length * 0.75), data: data, added: Date.now() });
      };
      im.onerror = function () { cb({ name: f.name, type: f.type, size: f.size, data: rd.result, added: Date.now() }); };
      im.src = rd.result;
    };
    rd.onerror = function () { cb(null); };
    rd.readAsDataURL(f);
  }

  // Let the user pick one or more pictures / documents; cb(listOfNewIds).
  var input = null, pending = null;
  function pick(cb) {
    if (!input) {
      input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = ACCEPT; input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function () {
        var files = [].slice.call(input.files || []), done = pending; input.value = ''; pending = null;
        if (!files.length || !done) return;
        var ids = [], left = files.length;
        files.forEach(function (f) {
          readFile(f, function (rec) {
            if (!rec) { if (--left === 0) done(ids); return; }
            var id = uid();
            put(id, rec, function (ok) { if (ok) ids.push(id); else alert('Could not save "' + f.name + '" — phone storage may be full.'); if (--left === 0) done(ids); });
          });
        });
      });
    }
    pending = cb; input.click();
  }

  // Thumbnails / chips for a list of ids. owner is passed back to the delete handler.
  function html(ids, owner) {
    ids = ids || []; if (!ids.length) return '';
    return '<div class="att-list">' + ids.map(function (id) {
      return '<button type="button" class="att" data-att="' + esc(id) + '" data-owner="' + esc(owner || '') + '"><span class="att-ic">📄</span><span class="att-n">…</span></button>';
    }).join('') + '</div>';
  }
  function hydrate(root) {
    (root || document).querySelectorAll('.att[data-att]:not([data-ok])').forEach(function (b) {
      b.setAttribute('data-ok', '1');
      get(b.dataset.att, function (r) {
        if (!r) { b.remove(); return; }
        b.title = r.name;
        if (isImg(r.type, r.name)) { b.classList.add('img'); b.innerHTML = '<img alt="" src="' + r.data + '">'; }
        else b.innerHTML = '<span class="att-ic">' + (/pdf/i.test(r.type + r.name) ? '📕' : '📄') + '</span><span class="att-n">' + esc(r.name) + '</span>';
      });
    });
  }

  // Viewer for pictures; other files open in the phone's viewer.
  var view = null, cur = null;
  function ensureView() {
    if (view) return;
    view = document.createElement('div'); view.id = 'attView';
    view.innerHTML = '<img alt=""><div class="att-bar"><button type="button" class="btn" data-a="close">Close</button><button type="button" class="btn" data-a="save">Save to phone</button><button type="button" class="btn bad" data-a="del">Delete</button></div>';
    document.body.appendChild(view);
    view.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') close();
      if (a.dataset.a === 'save' && cur) saveCopy(cur.rec, false);
      if (a.dataset.a === 'del' && cur) { if (!confirm('Delete this file?')) return; var c = cur; close(); remove(c.id, c.owner); }
    });
  }
  function close() { if (view) view.classList.remove('open'); cur = null; }
  function isOpen() { return !!(view && view.classList.contains('open')); }
  function saveCopy(rec, openIt) {
    var b64 = String(rec.data).slice(String(rec.data).indexOf(',') + 1);
    try {
      if (window.AndroidApp && (openIt ? AndroidApp.openFile : AndroidApp.saveFile)) {
        var ok = openIt ? AndroidApp.openFile(rec.name, rec.type, b64) : AndroidApp.saveFile(rec.name, rec.type, b64);
        if (!ok) alert('Could not ' + (openIt ? 'open' : 'save') + ' the file.');
        return;
      }
    } catch (e) { }
    var a = document.createElement('a'); a.href = rec.data; a.download = rec.name; if (openIt) a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove();
  }
  function remove(id, owner) { del(id); if (onDelete) onDelete(id, owner); }
  function show(id, owner) {
    get(id, function (r) {
      if (!r) return;
      if (!isImg(r.type, r.name)) {
        if (confirm('Open "' + r.name + '"?\n\nOK opens it in your phone\'s viewer. Cancel lets you delete it instead.')) saveCopy(r, true);
        else if (confirm('Delete "' + r.name + '"?')) remove(id, owner);
        return;
      }
      ensureView(); cur = { id: id, owner: owner, rec: r }; view.querySelector('img').src = r.data; view.classList.add('open');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.att[data-att]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); show(b.dataset.att, b.dataset.owner);
  }, true);

  var css = document.createElement('style');
  css.textContent = '.att-list{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '.att{background:var(--card2,#1d2b2f);border:1px solid var(--line,#2a3b40);color:var(--text,#eee);border-radius:10px;padding:6px 10px;display:flex;align-items:center;gap:6px;max-width:100%;font:inherit;font-size:12.5px;cursor:pointer}' +
    '.att.img{padding:0;width:72px;height:72px;overflow:hidden}.att.img img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.att-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}' +
    '#attView{position:fixed;inset:0;background:#000;z-index:80;display:none;align-items:center;justify-content:center;flex-direction:column}#attView.open{display:flex}' +
    '#attView img{max-width:100%;max-height:82vh}#attView .att-bar{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;justify-content:center}';
  document.head.appendChild(css);

  return { pick: pick, html: html, hydrate: hydrate, show: show, all: all, restore: restore, del: del, close: close, isOpen: isOpen,
    onDelete: function (fn) { onDelete = fn; } };
})();
