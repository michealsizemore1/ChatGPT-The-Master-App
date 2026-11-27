// Runs only inside the Saturday Top 25 Android app (bundle.py adds it to the APK's index.html).
// Adds a small ⚙ app menu in the top bar with: app updates and app lock. The weekly stories file is read
// live from the website (its workflow keeps it fresh), with the copy packed into the APK as a fallback.
(function () {
  if (!window.AndroidApp) return;
  var LIVE = 'https://michealsizemore1.github.io/ChatGPT-The-Master-App/data/top25-stories.json';
  var realFetch = window.fetch.bind(window);
  function readPacked() {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(); x.open('GET', 'data/top25-stories.json');
      x.onload = function () { resolve(new Response(x.responseText, { status: 200, headers: { 'Content-Type': 'application/json' } })); };
      x.onerror = reject; x.send();
    });
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('data/top25-stories.json') !== 0) return realFetch(input, init);
    return realFetch(LIVE + '?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r : readPacked(); }, readPacked);
  };

  // ---------- App menu ----------
  var css = '' +
    '#appMenuBtn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:inherit;font:700 16px system-ui,sans-serif;' +
    'width:36px;height:36px;border-radius:10px;cursor:pointer;flex-shrink:0;margin-left:8px}' +
    '#appSheetWrap{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:flex-end;justify-content:center}' +
    '#appSheetWrap.open{display:flex}' +
    '#appSheet{width:100%;max-width:520px;max-height:85vh;overflow:auto;background:#111827;border:1px solid #334155;border-bottom:none;' +
    'border-radius:16px 16px 0 0;padding:16px 18px calc(20px + env(safe-area-inset-bottom));color:#e5e7eb;font:14px system-ui,sans-serif}' +
    '#appSheet h3{font:700 12px system-ui,sans-serif;letter-spacing:.12em;color:#f59e0b;margin:16px 0 6px;text-transform:uppercase}' +
    '#appSheet h3:first-of-type{margin-top:4px}' +
    '#appSheet .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}' +
    '#appSheet .muted{color:#94a3b8;font-size:13px;line-height:1.45}' +
    '#appSheet button.b{background:#1f2937;border:1px solid #334155;color:#e5e7eb;padding:10px 14px;border-radius:10px;font:600 13px system-ui,sans-serif;cursor:pointer}' +
    '#appSheet button.b.accent{background:#f59e0b;border-color:#f59e0b;color:#111827}' +
    '#appSheet button.b:disabled{opacity:.45}' +
    '#appSheet .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
    '#appSheet .close{float:right;background:none;border:none;color:#94a3b8;font-size:22px;line-height:1;cursor:pointer}' +
    '#appSheet input[type=checkbox]{width:20px;height:20px;accent-color:#f59e0b}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = el('<button id="appMenuBtn" type="button" aria-label="App settings" title="App settings">&#9881;</button>');
    // The page redraws its top bar on every change, so put the button back each time.
    function place() { var bar = document.querySelector('header.topbar'); if (bar && btn.parentNode !== bar) bar.appendChild(btn); }
    place();
    var appEl = document.getElementById('app');
    if (appEl) new MutationObserver(place).observe(appEl, { childList: true });

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
      '</div></div>');
    document.body.appendChild(wrap);

    function open() { wrap.classList.add('open'); renderLock(); renderUpdate(); }
    function close() { wrap.classList.remove('open'); }
    btn.addEventListener('click', open);
    wrap.querySelector('.close').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    // Android Back button: close the menu first, then leave the app.
    // Then an open game, then back to Overview.
    window.handleAndroidBack = function () {
      if (wrap.classList.contains('open')) { close(); return true; }
      try {
        if (typeof state !== 'undefined') {
          if (state.selectedGameId) { state.selectedGameId = null; state.gameDetails = null; render(); return true; }
          if (state.section && state.section !== 'Overview' && typeof navigate === 'function') { navigate('Overview'); return true; }
        }
      } catch (e) {}
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

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
