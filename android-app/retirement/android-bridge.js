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
      window.AndroidApp.saveFile(name, blob.type || "", s.slice(s.indexOf(",") + 1));
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
  // The Document Vault shows PDFs with window.open(blob); hand those to the phone's viewer.
  var realOpen = window.open;
  window.open = function (url) {
    var blob = blobs[url];
    if (!blob) return realOpen.apply(window, arguments);
    var reader = new FileReader();
    reader.onload = function () {
      var s = String(reader.result);
      var ext = blob.type.indexOf("pdf") >= 0 ? ".pdf" : (blob.type.indexOf("text") >= 0 ? ".txt" : "");
      window.AndroidApp.openFile("document-" + Date.now() + ext, blob.type || "", s.slice(s.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
    return null;
  };
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
