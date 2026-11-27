// Runs only inside the Cindy's Cookbook Android app (bundle.py adds it to the APK's index.html).
// Adds a small ⚙ app menu in the cookbook's top bar with: app updates, app lock, and backup / restore.
(function () {
  if (!window.AndroidApp) return;

  // ---------- App menu ----------
  var css = '' +
    '#appMenuBtn{background:#fffdf8;border:1px solid #e3d5bd;color:#a8342a;font:700 13px system-ui,sans-serif;' +
    'min-width:44px;height:38px;padding:0 10px;border-radius:10px;cursor:pointer;flex-shrink:0;margin-left:8px}' +
    '#appSheetWrap{position:fixed;inset:0;background:rgba(58,43,30,.45);z-index:9999;display:none;align-items:flex-end;justify-content:center}' +
    '#appSheetWrap.open{display:flex}' +
    '#appSheet{width:100%;max-width:520px;max-height:85vh;overflow:auto;background:#fbf5ea;border:1px solid #e3d5bd;border-bottom:none;' +
    'border-radius:16px 16px 0 0;padding:16px 18px calc(20px + env(safe-area-inset-bottom));color:#3a2b1e;font:14px system-ui,sans-serif}' +
    '#appSheet h3{font:700 12px system-ui,sans-serif;letter-spacing:.12em;color:#a8342a;margin:16px 0 6px;text-transform:uppercase}' +
    '#appSheet h3:first-of-type{margin-top:4px}' +
    '#appSheet .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}' +
    '#appSheet .muted{color:#6b5847;font-size:13px;line-height:1.45}' +
    '#appSheet button.b{background:#fffdf8;border:1px solid #e3d5bd;color:#3a2b1e;padding:10px 14px;border-radius:10px;font:600 13px system-ui,sans-serif;cursor:pointer}' +
    '#appSheet button.b.accent{background:#a8342a;border-color:#a8342a;color:#fff}' +
    '#appSheet button.b:disabled{opacity:.45}' +
    '#appSheet .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
    '#appSheet .close{float:right;background:none;border:none;color:#6b5847;font-size:22px;line-height:1;cursor:pointer}' +
    '#appSheet input[type=checkbox]{width:20px;height:20px;accent-color:#a8342a}' +
    '#appSheet #masterBackupStatus{color:#5c7d52!important}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // "App" (the cookbook already has its own ⚙ Settings for the AI key).
    var btn = el('<button id="appMenuBtn" type="button" aria-label="App settings: updates, lock, backup" title="App: updates, lock, backup">App</button>');
    var bar = document.querySelector('header.topbar');
    if (bar) bar.appendChild(btn); else document.body.appendChild(btn);

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
      '<div class="muted">Your own recipes, photos and favorites live only on this phone. Back up saves them to ' +
      'Downloads/Cindy\'s Cookbook. To bring over recipes you added on the website, use Export there, then Restore here.</div>' +
      '<div class="btns"><button class="b" id="appBackup" type="button">Back up now</button>' +
      '<button class="b" id="appRestore" type="button">Restore a backup</button></div>' +
      '</div></div>');
    document.body.appendChild(wrap);

    function open() { wrap.classList.add('open'); renderLock(); renderUpdate(); }
    function close() { wrap.classList.remove('open'); }
    btn.addEventListener('click', open);
    wrap.querySelector('.close').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    // Android Back button: close the menu first, then leave the app.
    // Then an open recipe / editor / importer / settings, then the sidebar.
    window.handleAndroidBack = function () {
      if (wrap.classList.contains('open')) { close(); return true; }
      var pairs = [['editorOverlay', 'closeEditor'], ['importOverlay', 'closeImporter'], ['settingsOverlay', 'closeSettings'], ['overlay', 'closeDetail']];
      for (var i = 0; i < pairs.length; i++) { var o = document.getElementById(pairs[i][0]);
        if (o && o.classList.contains('open') && typeof window[pairs[i][1]] === 'function') { window[pairs[i][1]](); return true; } }
      var sb = document.getElementById('sidebar');
      if (sb && sb.classList.contains('open') && typeof closeSidebar === 'function') { closeSidebar(); return true; }
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

    // Backup / restore: the cookbook's own Export / Import (Settings).
    document.getElementById('appBackup').addEventListener('click', function () { if (typeof exportData === 'function') exportData(); });
    document.getElementById('appRestore').addEventListener('click', function () {
      close(); var f = document.getElementById('importFile'); if (f) f.click();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
