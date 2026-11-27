// Runs only inside the MCS Treasures Android app (bundle.py adds it to the APK's index.html).
// Adds a small ⚙ app menu in the tracker's top bar with: app updates, app lock, and backup / restore.
// The Business Report (a new tab that prints itself on the website) goes to Android's print screen instead.
(function () {
  if (!window.AndroidApp) return;
  var realOpen = window.open;
  window.open = function (url) {
    if (url && url !== 'about:blank') return realOpen.apply(window, arguments);
    var buf = '', title = '';
    var doc = { open: function () { buf = ''; }, write: function (h) { buf += h; }, writeln: function (h) { buf += h + '\n'; }, close: function () {} };
    return { document: doc, focus: function () {}, close: function () {},
      print: function () { var m = buf.match(/<title>([^<]*)<\/title>/i); title = m ? m[1] : 'Business Report'; window.AndroidApp.printHtml(buf, title); } };
  };

  // ---------- App menu ----------
  var css = '' +
    '#appMenuBtn{background:#22263a;border:1px solid #2e3350;color:#e6a817;font:700 17px system-ui,sans-serif;' +
    'width:38px;height:38px;border-radius:10px;cursor:pointer;flex-shrink:0;margin-left:auto}' +
    '#appSheetWrap{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:flex-end;justify-content:center}' +
    '#appSheetWrap.open{display:flex}' +
    '#appSheet{width:100%;max-width:520px;max-height:85vh;overflow:auto;background:#1a1d27;border:1px solid #2e3350;border-bottom:none;' +
    'border-radius:16px 16px 0 0;padding:16px 18px calc(20px + env(safe-area-inset-bottom));color:#e8eaf0;font:14px system-ui,sans-serif}' +
    '#appSheet h3{font:700 12px system-ui,sans-serif;letter-spacing:.12em;color:#e6a817;margin:16px 0 6px;text-transform:uppercase}' +
    '#appSheet h3:first-of-type{margin-top:4px}' +
    '#appSheet .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}' +
    '#appSheet .muted{color:#8b92b5;font-size:13px;line-height:1.45}' +
    '#appSheet button.b{background:#22263a;border:1px solid #2e3350;color:#e8eaf0;padding:10px 14px;border-radius:10px;font:600 13px system-ui,sans-serif;cursor:pointer}' +
    '#appSheet button.b.accent{background:#e6a817;border-color:#e6a817;color:#0f1117}' +
    '#appSheet button.b:disabled{opacity:.45}' +
    '#appSheet .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
    '#appSheet .close{float:right;background:none;border:none;color:#8b92b5;font-size:22px;line-height:1;cursor:pointer}' +
    '#appSheet input[type=checkbox]{width:20px;height:20px;accent-color:#e6a817}' +
    '#appSheet #masterBackupStatus{color:#10b981!important}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = el('<button id="appMenuBtn" type="button" aria-label="App settings" title="App settings">&#9881;</button>');
    var bar = document.querySelector('.topbar');
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
      '<div class="muted">Your inventory, sales, expenses, photos and settings live only on this phone. A backup file saves them ' +
      'to Downloads/MCS Treasures. To bring over what you entered on the website, make a Full Backup there and restore it here. ' +
      '(The tracker\'s own Backup / Restore in Settings works too.)</div>' +
      '<div class="btns"><button class="b" id="appBackup" type="button">Back up now</button>' +
      '<button class="b" id="appRestore" type="button">Restore a backup</button></div>' +
      '<input type="file" id="appRestoreFile" accept=".json,application/json" style="display:none">' +
      '<div class="muted" id="masterBackupStatus" style="margin-top:6px"></div>' +
      '</div></div>');
    document.body.appendChild(wrap);

    function open() { wrap.classList.add('open'); renderLock(); renderUpdate(); }
    function close() { wrap.classList.remove('open'); }
    btn.addEventListener('click', open);
    wrap.querySelector('.close').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    // Android Back button: close the menu first, then leave the app.
    // Then the sections menu and any open form.
    window.handleAndroidBack = function () {
      if (wrap.classList.contains('open')) { close(); return true; }
      var sb = document.getElementById('businessSidebar');
      if (sb && sb.classList.contains('mobile-open') && typeof closeBusinessMenu === 'function') { closeBusinessMenu(); return true; }
      var m = document.querySelector('.modal-backdrop.open');
      if (m && m.id && typeof closeModal === 'function') { closeModal(m.id); return true; }
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
    // After a restore, reload so the tracker shows the restored data right away.
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
