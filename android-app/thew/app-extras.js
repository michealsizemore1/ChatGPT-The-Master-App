// Runs only inside The W Android app (bundle.py adds it to the APK's index.html).
// Adds a small ⚙ app menu in the top bar with: app updates and app lock.
(function () {
  if (!window.AndroidApp) return;

  // ---------- App menu ----------
  var css = '' +
    '#topbarMount .nav{position:relative}' +
    '#appMenuBtn{position:absolute;top:12px;right:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#fff;font:700 16px system-ui,sans-serif;' +
    'width:36px;height:36px;border-radius:10px;cursor:pointer;z-index:5}' +
    '#appSheetWrap{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:flex-end;justify-content:center}' +
    '#appSheetWrap.open{display:flex}' +
    '#appSheet{width:100%;max-width:520px;max-height:85vh;overflow:auto;background:#111827;border:1px solid #334155;border-bottom:none;' +
    'border-radius:16px 16px 0 0;padding:16px 18px calc(20px + env(safe-area-inset-bottom));color:#e5e7eb;font:14px system-ui,sans-serif}' +
    '#appSheet h3{font:700 12px system-ui,sans-serif;letter-spacing:.12em;color:#c9f04a;margin:16px 0 6px;text-transform:uppercase}' +
    '#appSheet h3:first-of-type{margin-top:4px}' +
    '#appSheet .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}' +
    '#appSheet .muted{color:#94a3b8;font-size:13px;line-height:1.45}' +
    '#appSheet button.b{background:#1f2937;border:1px solid #334155;color:#e5e7eb;padding:10px 14px;border-radius:10px;font:600 13px system-ui,sans-serif;cursor:pointer}' +
    '#appSheet button.b.accent{background:#c9f04a;border-color:#c9f04a;color:#08271f}' +
    '#appSheet button.b:disabled{opacity:.45}' +
    '#appSheet .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
    '#appSheet .close{float:right;background:none;border:none;color:#94a3b8;font-size:22px;line-height:1;cursor:pointer}' +
    '#appSheet input[type=checkbox]{width:20px;height:20px;accent-color:#c9f04a}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = el('<button id="appMenuBtn" type="button" aria-label="App settings" title="App settings">&#9881;</button>');
    // The page redraws its top bar on every change, so put the button back each time.
    function place() { var bar = document.querySelector('#topbarMount .nav'); if (bar && btn.parentNode !== bar) bar.appendChild(btn); }
    place();
    var mount = document.getElementById('topbarMount');
    if (mount) new MutationObserver(place).observe(mount, { childList: true });

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
          if (state.openGame) { state.openGame = ''; render(); return true; }
          if (state.open) { state.open = ''; render(); return true; }
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
