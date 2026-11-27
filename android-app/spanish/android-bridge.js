// 🔊 Voice inside the app (Luma Spanish). Android's WebView has no Web Speech API, so this stands in for
// speechSynthesis / SpeechSynthesisUtterance and SpeechRecognition using the phone's own text-to-speech and speech
// recognition (MainActivity). The lessons keep calling the same browser functions.
(function () {
  if (!window.AndroidApp || !window.AndroidApp.speak) return;
  var n = 0, utts = {}, recs = {}, voiceList = [];
  function readVoices() {
    try { voiceList = JSON.parse(window.AndroidApp.voices() || "[]").map(function (v) {
      return { name: v.name, lang: v.lang, voiceURI: v.name, localService: !!v.local, default: false }; }); } catch (e) { voiceList = []; }
    return voiceList;
  }
  function Utterance(text) {
    this.text = text == null ? "" : String(text); this.lang = ""; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null;
    this.onstart = null; this.onend = null; this.onerror = null; this.onpause = null; this.onresume = null; this.onboundary = null; this.onmark = null;
  }
  Utterance.prototype.addEventListener = function (t, f) { this["on" + t] = f; };
  function busy() { return Object.keys(utts).length > 0; }
  var synth = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    speak: function (u) {
      var id = "u" + (++n); utts[id] = u; synth.pending = true;
      var lang = u.lang || (u.voice && u.voice.lang) || "es-ES";
      window.AndroidApp.speak(id, String(u.text || ""), lang, Number(u.rate) || 1, Number(u.pitch) || 1);
    },
    cancel: function () {
      var was = utts; utts = {}; synth.speaking = false; synth.pending = false;
      try { window.AndroidApp.stopSpeaking(); } catch (e) {}
      Object.keys(was).forEach(function (id) { var u = was[id]; try { u.onerror && u.onerror({ utterance: u, error: "canceled" }); } catch (e) {} });
    },
    pause: function () {}, resume: function () {},
    getVoices: function () { return voiceList.length ? voiceList : readVoices(); },
    addEventListener: function (t, f) { if (t === "voiceschanged") synth.onvoiceschanged = f; }, removeEventListener: function () {}
  };
  window.__lumaVoices = function () { readVoices(); try { synth.onvoiceschanged && synth.onvoiceschanged({}); } catch (e) {} };
  window.__lumaTts = function (id, ev) {
    var u = utts[id]; if (!u) return;
    if (ev === "start") { synth.speaking = true; synth.pending = false; try { u.onstart && u.onstart({ utterance: u }); } catch (e) {} return; }
    delete utts[id]; synth.speaking = busy(); synth.pending = false;
    if (ev === "end") { try { u.onend && u.onend({ utterance: u }); } catch (e) {} return; }
    var err = ev === "interrupted" ? "interrupted" : ev === "nolang" ? "language-unavailable" : "synthesis-failed";
    try { u.onerror && u.onerror({ utterance: u, error: err }); } catch (e) {}
  };
  try { Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true }); } catch (e) { window.speechSynthesis = synth; }
  window.SpeechSynthesisUtterance = Utterance;

  function Recognition() {
    this.lang = "es-ES"; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1;
    this.onstart = null; this.onresult = null; this.onerror = null; this.onend = null; this.onspeechend = null; this.onnomatch = null; this._id = null;
  }
  Recognition.prototype.start = function () { var id = "r" + (++n); this._id = id; recs[id] = this; window.AndroidApp.listen(id, this.lang || "es-ES"); };
  Recognition.prototype.stop = function () { window.AndroidApp.stopListening(); };
  Recognition.prototype.abort = function () { window.AndroidApp.stopListening(); };
  Recognition.prototype.addEventListener = function (t, f) { this["on" + t] = f; };
  window.__lumaStt = function (id, ev, data) {
    var r = recs[id]; if (!r) return;
    try {
      if (ev === "start") r.onstart && r.onstart({});
      else if (ev === "result") {
        var alts = JSON.parse(data || "[]").slice(0, Math.max(1, r.maxAlternatives || 1)).map(function (t, i) { return { transcript: t, confidence: i === 0 ? 0.9 : 0.5 }; });
        alts.isFinal = true; alts.item = function (i) { return alts[i]; };
        var results = [alts]; results.item = function (i) { return results[i]; };
        r.onresult && r.onresult({ results: results, resultIndex: 0 });
      }
      else if (ev === "error") r.onerror && r.onerror({ error: data || "aborted" });
      else if (ev === "end") { delete recs[id]; r.onend && r.onend({}); }
    } catch (e) {}
  };
  window.SpeechRecognition = Recognition; window.webkitSpeechRecognition = Recognition;
})();

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
