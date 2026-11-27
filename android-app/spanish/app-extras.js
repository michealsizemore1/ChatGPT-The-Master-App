// Runs only inside the Luma Spanish Android app (bundle.py adds it to the APK's index.html).
// Adds a small ⚙ app menu in Luma's top bar with: app updates, app lock, and backup / restore.
(function () {
  if (!window.AndroidApp) return;
  // First time the app opens: start on the Plan with your plan's start date (Aug 3 2026), like your website link.
  try { if (!localStorage.getItem('luma-index')) history.replaceState(null, '', '#section=plan&start=2026-08-03'); } catch (e) {}

  // ---------- App menu ----------
  var css = '' +
    '#appMenuBtn{background:#fff;border:1px solid #ded9cf;color:#245c4c;font:700 18px "DM Sans",sans-serif;' +
    'width:40px;height:40px;border-radius:12px;cursor:pointer;flex-shrink:0;margin-left:8px}' +
    '#appSheetWrap{position:fixed;inset:0;background:rgba(37,37,33,.45);z-index:9999;display:none;align-items:flex-end;justify-content:center}' +
    '#appSheetWrap.open{display:flex}' +
    '#appSheet{width:100%;max-width:520px;max-height:85vh;overflow:auto;background:#f8f5ee;border:1px solid #ded9cf;border-bottom:none;' +
    'border-radius:18px 18px 0 0;padding:16px 18px calc(20px + env(safe-area-inset-bottom));color:#252521;font:14px "DM Sans",sans-serif}' +
    '#appSheet h3{font:700 12px "DM Sans",sans-serif;letter-spacing:.12em;color:#ed6b54;margin:16px 0 6px;text-transform:uppercase}' +
    '#appSheet h3:first-of-type{margin-top:4px}' +
    '#appSheet .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}' +
    '#appSheet .muted{color:#6b665c;font-size:13px;line-height:1.45}' +
    '#appSheet button.b{background:#fff;border:1px solid #ded9cf;color:#252521;padding:10px 14px;border-radius:10px;font:600 13px "DM Sans",sans-serif;cursor:pointer}' +
    '#appSheet button.b.accent{background:#245c4c;border-color:#245c4c;color:#fff}' +
    '#appSheet button.b:disabled{opacity:.45}' +
    '#appSheet .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
    '#appSheet .close{float:right;background:none;border:none;color:#6b665c;font-size:22px;line-height:1;cursor:pointer}' +
    '#appSheet input[type=checkbox]{width:20px;height:20px;accent-color:#245c4c}' +
    '#appSheet #masterBackupStatus{color:#245c4c!important}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = el('<button id="appMenuBtn" type="button" aria-label="App settings" title="App settings">&#9881;</button>');
    var bar = document.querySelector('header');
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
      '<div class="muted">Your plan, progress, words and notes live only on this phone. A backup file saves them ' +
      'to Downloads/Luma Spanish. To bring over your progress from the website, make a Full Backup there and restore it here.</div>' +
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
    // Then Luma's own menu, the practice panel, and any section other than Home.
    window.handleAndroidBack = function () {
      if (wrap.classList.contains('open')) { close(); return true; }
      var dr = document.getElementById('drawerback');
      if (dr && dr.classList.contains('open')) { dr.classList.remove('open'); return true; }
      var lab = document.getElementById('labback');
      if (lab && lab.classList.contains('open')) { if (typeof closeLab === 'function') closeLab(); else lab.classList.remove('open'); return true; }
      try { if (typeof state !== 'undefined' && state.activeSection && state.activeSection !== 'home' && typeof showSection === 'function') { showSection('home'); return true; } } catch (e) {}
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
    // After a restore, reload so Luma shows the restored progress right away.
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
