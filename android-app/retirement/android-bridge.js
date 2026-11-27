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
  // Printing (Print Full Plan): Android apps can't use window.print, so open Android's print screen.
  // The app fires 'afterprint' when that screen closes, which restores the page as in a browser.
  window.print = function () {
    window.dispatchEvent(new Event("beforeprint"));
    window.AndroidApp.printPage();
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

// 🏖️ Retirement summary for BeyondStride's Today screen (app only). After the planner recalculates, it hands the app a
// few headline numbers: retirement date, plan confidence, total current assets, net worth, how long the money lasts and
// the plan's monthly household budget. The app shares only these, and only with apps the owner allows (BeyondStride).
(function () {
  if (!window.AndroidApp || !window.AndroidApp.setSummary) return;
  var last = "", timer = 0;
  function send() {
    try {
      if (typeof lastCoachContext === "undefined" || !lastCoachContext) return;
      var c = lastCoachContext, inp = c.inputs || {}, ctx = c.ctx || {}, res = c.result || {}, score = Number(c.score);
      var n = function (v) { return Number(v) || 0; };
      var total = n(inp.tradTSPBalance) + n(inp.rothTSPBalance) + n(inp.brokerageBalance) + n(inp.checkingBalance) + n(inp.savingsBalance) + n(inp.hysaBalance);
      var ds = (typeof debts !== "undefined" && debts) ? debts : [];
      var debt = 0, vehicles = 0;
      ds.forEach(function (d) {
        var future = d.startAge != null && d.startAge !== "" && +d.startAge > n(inp.currentAge);
        if (!future) { debt += n(d.balance); if (d.category === "Auto Loan") vehicles += n(d.assetValue); }
      });
      var label = score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Uncertain" : "Needs attention";
      var out = {
        retireDate: String(inp.retirementDateRaw || ""), retireAge: n(inp.retirementAge), currentAge: n(inp.currentAge),
        confidence: isFinite(score) ? Math.round(score) : null, label: label,
        totalAssets: Math.round(total), tsp: Math.round(n(inp.tradTSPBalance) + n(inp.rothTSPBalance)),
        brokerage: Math.round(n(inp.brokerageBalance)), cash: Math.round(n(inp.checkingBalance) + n(inp.savingsBalance) + n(inp.hysaBalance)),
        netWorth: Math.round(total - n(inp.checkingBalance) + vehicles - debt),
        depletionAge: res.depletionAge || null, lifeExpectancy: n(ctx.effectiveLifeExpectancy) || null,
        // The plan's household budget in today's dollars (expenses + rent), per month — compared with M&C Money's actual spending.
        plannedMonthly: Math.round((n(ctx.expensesTotal) + n(inp.rentMonthly) * 12) / 12),
        basis: (typeof spendingBasis !== "undefined" ? String(spendingBasis) : "")
      };
      var json = JSON.stringify(out);
      if (json === last) return;
      last = json;
      window.AndroidApp.setSummary(json);
    } catch (e) {}
  }
  function hook() {
    if (typeof window.render !== "function" || window.render.__bsHook) return false;
    var real = window.render;
    window.render = function () { var r = real.apply(this, arguments); clearTimeout(timer); timer = setTimeout(send, 1500); return r; };
    window.render.__bsHook = true;
    return true;
  }
  window.addEventListener("load", function () { hook(); setTimeout(send, 4000); });
  setInterval(function () { hook(); send(); }, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (document.hidden) send(); });
})();
