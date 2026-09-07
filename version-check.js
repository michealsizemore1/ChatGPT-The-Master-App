// Shared version-check-and-reload logic for the-w.html, top-25.html,
// nfl-gameday.html, and track-field.html. Each of those pages keeps its own
// `const APP_VERSION='...'` declared inline (this has to stay in the page's
// own HTML source, since the check below re-fetches that same page and
// regex-matches APP_VERSION out of the raw response text — an external JS
// file's contents wouldn't show up in that fetch). Each page just calls:
//
//   checkForNewerAppVersion(APP_VERSION, 'somePrefix');
//
// with its own short, unique storage-key prefix (thew, top25, nflgd, tf).
//
// Behavior (unchanged from the original per-file copies): fetch this same
// page fresh (cache-busted), look for a newer APP_VERSION in the response,
// and reload once per session per version if one is found — preserving the
// URL hash so a deep link doesn't get lost on the redirect.
function checkForNewerAppVersion(currentVersion, storagePrefix) {
  (async function () {
    try {
      var res = await fetch(location.pathname + '?_cv=' + Date.now(), { cache: 'no-store' });
      var live = (await res.text()).match(/APP_VERSION='([^']+)'/);
      if (live && live[1] !== currentVersion && !sessionStorage.getItem(storagePrefix + '-v-' + live[1])) {
        sessionStorage.setItem(storagePrefix + '-v-' + live[1], '1');
        location.replace(location.pathname + '?v=' + live[1] + location.hash);
      }
    } catch (e) {}
  })();
}
