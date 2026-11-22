// Runs only inside the Android app: routes "download" links (backups, CSV exports)
// to the phone's Downloads folder, since an app has no browser download manager.
(function () {
  if (!window.AndroidApp) return;
  var blobs = {};
  var realCreate = URL.createObjectURL.bind(URL);
  var realRevoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    var url = realCreate(obj);
    try { if (obj instanceof Blob) blobs[url] = obj; } catch (e) {}
    return url;
  };
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { delete blobs[url]; realRevoke(url); }, 60000);
  };
  function save(blob, name) {
    var reader = new FileReader();
    reader.onload = function () {
      var s = String(reader.result);
      var data = s.slice(s.indexOf(",") + 1);
      // Set by the "Save to Google Drive" button: send this one file to the share sheet.
      if (window.__mcShareNextDownload && window.AndroidApp.shareFile) {
        window.__mcShareNextDownload = false;
        window.AndroidApp.shareFile(name, blob.type || "", data);
      } else {
        window.AndroidApp.saveFile(name, blob.type || "", data);
      }
    };
    reader.readAsDataURL(blob);
  }
  function handle(a) {
    var name = a.getAttribute("download");
    if (name === null) return false;
    var href = a.href || "";
    name = name || "download";
    if (blobs[href]) { save(blobs[href], name); return true; }
    if (href.indexOf("data:") === 0 || href.indexOf("blob:") === 0) {
      fetch(href).then(function (r) { return r.blob(); }).then(function (b) { save(b, name); });
      return true;
    }
    return false;
  }
  var realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (handle(this)) return;
    return realClick.apply(this, arguments);
  };
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (a && handle(a)) e.preventDefault();
  }, true);
})();

// Inside the app the receipt reader is bundled (see bundle-offline.sh), so point it at the
// local copies instead of the internet. Only applies when those files were bundled.
(function () {
  if (!window.AndroidApp) return;
  function patch() {
    var T = window.Tesseract;
    if (!T || T.__mcLocal || !document.querySelector('script[src="vendor/tesseract/tesseract.min.js"]')) return;
    var base = location.href.replace(/[^\/]*$/, "") + "vendor/tesseract/";
    var local = { workerPath: base + "worker.min.js", corePath: base + "core", langPath: base + "lang", workerBlobURL: false };
    var recognize = T.recognize, createWorker = T.createWorker;
    T.recognize = function (image, langs, options) {
      return recognize.call(T, image, langs, Object.assign({}, local, options || {}));
    };
    if (createWorker) {
      T.createWorker = function (langs, oem, options, config) {
        return createWorker.call(T, langs, oem, Object.assign({}, local, options || {}), config);
      };
    }
    T.__mcLocal = true;
  }
  document.addEventListener("DOMContentLoaded", patch);
  window.addEventListener("load", patch);
})();
