// Runs only inside the MSIZ Terminal Android app (bundle.py adds it to the APK's index.html).
// The terminal page has no Settings screen, so this adds a small "App" menu in the top bar
// (where the website's Home button was) with: app updates, app lock, and backup / restore.
// It also keeps market data working offline: the app reads the live market-quotes.json from the
// website, and falls back to the copy packed into the APK if the phone has no connection.
(function () {
  if (!window.AndroidApp) return;
  var LIVE = 'https://michealsizemore1.github.io/ChatGPT-The-Master-App/data/market-quotes.json';

  // ---------- Error log (shown under Diagnostics in the App menu) ----------
  var appErrors = [];
  function logError(msg){
    var t = new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit', second:'2-digit'});
    appErrors.push(t + '  ' + String(msg).slice(0, 220));
    if(appErrors.length > 8) appErrors.shift();
    var el = document.getElementById('appDiagLog');
    if(el) el.textContent = appErrors.join('\n');
  }
  window.addEventListener('error', function(e){
    logError((e.message || 'Error') + (e.filename ? ' (line ' + e.lineno + ')' : ''));
  });
  window.addEventListener('unhandledrejection', function(e){ logError('Promise: ' + (e.reason && e.reason.message || e.reason)); });
  var realConsoleError = console.error.bind(console);
  console.error = function(){
    try { logError(Array.prototype.map.call(arguments, function(a){ return a && a.stack ? a.stack.split('\n').slice(0,2).join(' ') : String(a); }).join(' ')); } catch(_) {}
    realConsoleError.apply(null, arguments);
  };

  // ---------- Market data: live from the website, packed copy when offline ----------
  var realFetch = window.fetch.bind(window);
  function readPacked() {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('GET', 'data/market-quotes.json');
      x.onload = function () {
        resolve(new Response(x.responseText, { status: 200, headers: { 'Content-Type': 'application/json' } }));
      };
      x.onerror = reject;
      x.send();
    });
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(LIVE) !== 0) return realFetch(input, init);
    return realFetch(input, init).then(function (r) {
      if (r.ok) return r;
      logError('Market data file: HTTP ' + r.status + ', using the copy in the app');
      return readPacked();
    }, function (e) {
      logError('Market data file unreachable (' + (e && e.message || e) + '), using the copy in the app');
      return readPacked();
    });
  };

  // ---------- App menu ----------
  var css = '' +
    '#appMenuBtn{background:#0a1a2a;border:1px solid #1e3050;color:#00d4c8;font:600 15px "IBM Plex Mono",monospace;' +
    'letter-spacing:.08em;padding:3px 8px;border-radius:3px;cursor:pointer;flex-shrink:0}' +
    '#appSheetWrap{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:flex-end;justify-content:center}' +
    '#appSheetWrap.open{display:flex}' +
    '#appSheet{width:100%;max-width:520px;max-height:85vh;overflow:auto;background:#070d1a;border:1px solid #1e3050;border-bottom:none;' +
    'border-radius:10px 10px 0 0;padding:14px 16px calc(18px + env(safe-area-inset-bottom));color:#d4e4f7;font:13px "IBM Plex Sans",sans-serif}' +
    '#appSheet h3{font:600 12px "IBM Plex Mono",monospace;letter-spacing:.1em;color:#00d4c8;margin:14px 0 6px;text-transform:uppercase}' +
    '#appSheet h3:first-of-type{margin-top:4px}' +
    '#appSheet .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}' +
    '#appSheet .muted{color:#7a9ab8;font-size:12px;line-height:1.4}' +
    '#appSheet button.b{background:#0f1c2e;border:1px solid #1e3050;color:#e8f4ff;padding:9px 12px;border-radius:5px;font:600 12px "IBM Plex Sans",sans-serif;cursor:pointer}' +
    '#appSheet button.b.accent{background:#00a89e;border-color:#00d4c8;color:#03060d}' +
    '#appSheet button.b:disabled{opacity:.45}' +
    '#appSheet .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
    '#appSheet .close{float:right;background:none;border:none;color:#7a9ab8;font-size:20px;line-height:1;cursor:pointer}' +
    '#appSheet input[type=checkbox]{width:20px;height:20px;accent-color:#00d4c8}' +
    '#appSheet #masterBackupStatus{color:#9fd8ff!important}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = el('<button id="appMenuBtn" type="button" aria-label="App settings" title="App settings">&#9881;</button>');
    var bar = document.getElementById('topbar');
    if (bar) bar.insertBefore(btn, bar.firstChild); else document.body.appendChild(btn);

    var wrap = el(
      '<div id="appSheetWrap"><div id="appSheet" role="dialog" aria-label="App settings">' +
      '<button class="close" type="button" aria-label="Close">&times;</button>' +
      '<h3>App updates</h3>' +
      '<div class="muted" id="appUpdateStatus">Checking&hellip;</div>' +
      '<div class="btns"><button class="b" id="appCheckUpd" type="button">Check for updates</button>' +
      '<button class="b accent" id="appInstallUpd" type="button" style="display:none">Install update</button></div>' +
      '<h3>App lock</h3>' +
      '<div class="row"><label for="appLockEnabled">Require fingerprint or screen lock</label>' +
      '<input type="checkbox" id="appLockEnabled"></div>' +
      '<div class="muted" id="appLockStatus"></div>' +
      '<h3>Backup</h3>' +
      '<div class="muted">Your balances, contributions and settings live only on this phone. A backup file saves them ' +
      'to Downloads/MSIZ Terminal. To bring over what you entered on the website, make a Full Backup there and restore it here.</div>' +
      '<div class="btns"><button class="b" id="appBackup" type="button">Back up now</button>' +
      '<button class="b" id="appRestore" type="button">Restore a backup</button></div>' +
      '<input type="file" id="appRestoreFile" accept=".json,application/json" style="display:none">' +
      '<div class="muted" id="masterBackupStatus" style="margin-top:6px"></div>' +
      '<h3>Diagnostics</h3>' +
      '<div class="muted">Quotes: <span id="appDiagQuotes">\u2014</span></div>' +
      '<pre id="appDiagLog" class="muted" style="white-space:pre-wrap;margin:6px 0 0;font:11px \'IBM Plex Mono\',monospace">No errors.</pre>' +
      '</div></div>');
    document.body.appendChild(wrap);

    function open() {
      wrap.classList.add('open'); renderLock(); renderUpdate();
      var hd = document.getElementById('holdingsDate');
      document.getElementById('appDiagQuotes').textContent = hd && hd.textContent ? hd.textContent : 'not loaded yet';
      if (appErrors.length) document.getElementById('appDiagLog').textContent = appErrors.join('\n');
    }
    function close() { wrap.classList.remove('open'); }
    btn.addEventListener('click', open);
    wrap.querySelector('.close').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    // Android Back button: close the menu first, then leave the app.
    window.handleAndroidBack = function () {
      if (wrap.classList.contains('open')) { close(); return true; }
      return false;
    };

    // Updates
    var updStatus = document.getElementById('appUpdateStatus');
    var installBtn = document.getElementById('appInstallUpd');
    function renderUpdate(st) {
      if (!st) { try { st = JSON.parse(window.AndroidApp.appUpdateStatus()); } catch (e) { return; } }
      var cur = 'You have version 1.' + (st.current || 0) + '.';
      if (st.available) {
        updStatus.textContent = cur + ' Version 1.' + st.latest + ' is ready to install.';
        installBtn.style.display = '';
      } else {
        installBtn.style.display = 'none';
        var when = st.checkedAt ? ' Last checked ' + new Date(st.checkedAt).toLocaleString() + '.' : '';
        updStatus.textContent = cur + (st.error ? ' Couldn’t check: ' + st.error : (st.checkedAt ? ' It’s up to date.' : '')) + when;
      }
    }
    window.onAppUpdateStatus = renderUpdate;
    window.onAppUpdateMessage = function (msg) { updStatus.textContent = msg; };
    document.getElementById('appCheckUpd').addEventListener('click', function () { window.AndroidApp.checkForAppUpdate(); });
    installBtn.addEventListener('click', function () { window.AndroidApp.installAppUpdate(); });

    // App lock
    var lockBox = document.getElementById('appLockEnabled');
    function renderLock() {
      var st; try { st = JSON.parse(window.AndroidApp.appLockStatus()); } catch (e) { return; }
      lockBox.checked = !!st.enabled;
      lockBox.disabled = !st.available;
      document.getElementById('appLockStatus').textContent = !st.available
        ? 'Set up a fingerprint or screen lock on your phone to use this.'
        : (st.enabled ? 'The app asks for your fingerprint or screen lock when it opens.' : '');
    }
    lockBox.addEventListener('change', function () { window.AndroidApp.setAppLock(lockBox.checked); renderLock(); });

    // Backup / restore (shared Full Backup format from master-backup-shared.js)
    document.getElementById('appBackup').addEventListener('click', function () {
      if (typeof downloadMasterBackup === 'function') downloadMasterBackup();
    });
    var file = document.getElementById('appRestoreFile');
    document.getElementById('appRestore').addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      if (file.files && file.files[0] && typeof restoreMasterBackup === 'function') restoreMasterBackup(file);
    });
    // After a restore, reload so the terminal shows the restored balances right away.
    var backupStatus = document.getElementById('masterBackupStatus');
    new MutationObserver(function () {
      if (backupStatus.textContent.indexOf('Full backup restored') === 0) {
        backupStatus.textContent = 'Backup restored. Reloading\u2026';
        setTimeout(function () { location.reload(); }, 900);
      }
    }).observe(backupStatus, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
