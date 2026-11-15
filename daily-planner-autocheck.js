/* ✅ Auto checkmarks (Nov 2026): when a Daily item is filled in, its box turns green on its own.
 * Meds stay manual. A box you've already marked (any color) is never changed, and once a box has been auto-ticked
 * for a day it isn't re-ticked if you clear it yourself. */
(function(){
  // check key → input id (+ when it counts as done)
  var ITEMS=[
    ['wBP','wBPVal',function(v){return /\d{2,3}\s*\/\s*\d{2,3}/.test(v);}],
    ['wWght','wWghtVal',function(v){return parseFloat(v)>0;}],
    ['wSleep','wSleepVal',function(v){return /\d/.test(v);}],
    ['exDogWalk','exDogWalkVal',function(v){return v.trim()!=='';}],
    ['exBike','exBikeVal',function(v){return v.trim()!=='';}],
    ['exStepsCheck','exSteps',function(v){return Number(v)>=10000;}]
  ];
  function dayKey(){try{return typeof dk==='function'&&typeof today!=='undefined'?dk(today):'';}catch(e){return '';}}
  function check(){
    var d=dayKey();if(!d)return;var changed=false;
    ITEMS.forEach(function(it){
      var box=document.querySelector('.tri-check[data-key="'+it[0]+'"]'),inp=document.getElementById(it[1]);
      if(!box||!inp)return;
      var flag='autoTick_'+d+'_'+it[0];
      // Marked red automatically for a missed dog walk, then filled in later: turn it green.
      try{if(box.dataset.state==='red'&&localStorage.getItem('autoRed_'+d+'_'+it[0])&&it[2](String(inp.value||''))){
        if(typeof applyTriState==='function')applyTriState(box,'green');localStorage.removeItem('autoRed_'+d+'_'+it[0]);localStorage.setItem(flag,'1');changed=true;return;}}catch(e){}
      if(box.dataset.state)return;                       // already marked by you (or before)
      try{if(localStorage.getItem(flag))return;}catch(e){}
      if(!it[2](String(inp.value||'')))return;
      if(typeof applyTriState==='function')applyTriState(box,'green');else{box.dataset.state='green';box.classList.add('green');box.textContent='✓';}
      var row=box.closest('.task-row,.goal-row');if(row)row.classList.add('done');
      try{localStorage.setItem(flag,'1');}catch(e){}
      changed=true;
    });
    if(changed)refresh();
  }
  function refresh(){
    try{if(typeof save==='function')save();}catch(e){}
    try{if(typeof renderDailyCheckOverview==='function')renderDailyCheckOverview();}catch(e){}
    try{if(typeof updateCompactSectionCounts==='function')updateCompactSectionCounts();}catch(e){}
  }
  /* 🐕 When the Daily AI Review is written (AI Fill, the 11:50 PM automatic one, or the phone's copy):
   * no Dog Walk entered and the box still blank → red checkmark. Entering a walk later turns it green. */
  window.autoTickReviewWritten=function(){
    try{
      var d=dayKey();if(!d)return;
      var box=document.querySelector('.tri-check[data-key="exDogWalk"]'),inp=document.getElementById('exDogWalkVal');
      if(!box||!inp||box.dataset.state||String(inp.value||'').trim())return;
      if(typeof applyTriState==='function')applyTriState(box,'red');else{box.dataset.state='red';box.classList.add('red');box.textContent='✓';}
      try{localStorage.setItem('autoRed_'+d+'_exDogWalk','1');}catch(e){}
      refresh();
    }catch(e){}
  };
  var t=null;function soon(){clearTimeout(t);t=setTimeout(check,400);}
  document.addEventListener('input',function(e){if(e.target&&ITEMS.some(function(it){return it[1]===e.target.id;}))soon();},true);
  document.addEventListener('change',function(e){if(e.target&&ITEMS.some(function(it){return it[1]===e.target.id;}))soon();},true);
  // Values filled by the phone, by loading a day, or by changing the date.
  setInterval(check,5000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(check,1500);});else setTimeout(check,1500);
  window.autoTickCheck=check;
})();
/* 🎯 Today's Focus opens each time the page loads (tap the header to fold it for now). */
(function(){
  var userClosed=false;
  document.addEventListener('click',function(e){if(e.isTrusted&&e.target&&e.target.closest&&e.target.closest('[aria-controls="todayFocusBody"]'))userClosed=true;},true);
  function openFocus(){
    if(userClosed)return;
    var b=document.getElementById('todayFocusBody'),a=document.getElementById('todayFocusArrow'),t=document.querySelector('[aria-controls="todayFocusBody"]');
    if(!b)return;
    if(b.style.display!=='block'){b.style.display='block';if(a)a.innerHTML='&#x25BC;';if(t)t.setAttribute('aria-expanded','true');}
  }
  function run(){openFocus();[800,2500,6000].forEach(function(ms){setTimeout(openFocus,ms);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('pageshow',function(){userClosed=false;run();});
})();

/* ✨ AI Tools from the ☰ Tools menu (any tab). */
window.openAiTool=function(which){
  try{
    var bar=document.getElementById('aiToolbar'),body=document.getElementById('aiToolsBody'),tg=document.getElementById('aiToolsToggle');
    // Search and Saved open as pop-ups; Ask AI opens its panel under the header.
    if(which==='search'&&typeof openJournalSearch==='function'){openJournalSearch();return;}
    if(which==='saved'&&typeof openAIArchive==='function'){openAIArchive();return;}
    if(!bar||!body)return;
    window.__aiToolsOpen=true;bar.style.display='block';body.style.display='block';if(tg)tg.style.display='none';
    if(which==='ask'&&typeof openAskJournal==='function')openAskJournal();
    else if(which==='search'&&typeof openJournalSearch==='function')openJournalSearch();
    else if(which==='saved'&&typeof openAIArchive==='function')openAIArchive();
    setTimeout(function(){try{bar.scrollIntoView({behavior:'smooth',block:'start'});var i=document.getElementById(which==='ask'?'askJournalInput':'journalSearchInput');if(i&&i.offsetParent)i.focus();}catch(e){}},80);
  }catch(e){}
};
window.closeAiTools=function(){window.__aiToolsOpen=false;var bar=document.getElementById('aiToolbar');if(bar)bar.style.display='none';};

/* 🧹 One-time cleanup (Nov 15 2026): two leftover keys from the old food tracker that nothing reads anymore
 * (favorites_data, healthy_foods_7plus — nutrition lives in BeyondStride now). A copy is kept in the browser's
 * large storage first ("cleanup_2026-11-15"), then they're removed to free journal space. */
(function(){
  var FLAG='cleanup_food_leftovers_2026-11-15',KEYS=['favorites_data','healthy_foods_7plus'];
  function run(){
    try{
      if(localStorage.getItem(FLAG))return;
      var copy={},any=false;KEYS.forEach(function(k){var v=localStorage.getItem(k);if(v!=null){copy[k]=v;any=true;}});
      if(!any){localStorage.setItem(FLAG,'1');return;}
      if(typeof journalLargeStoreSet!=='function')return;
      Promise.resolve(journalLargeStoreSet('cleanup_2026-11-15',copy)).then(function(){
        KEYS.forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
        try{localStorage.setItem(FLAG,'1');}catch(e){}
      }).catch(function(){});
    }catch(e){}
  }
  setTimeout(run,4000);
})();

/* 🏃 A task or goal like "Complete scheduled runs" ticks green once today's run is logged (BeyondStride / Activities).
 * Blank or partly-done (purple) boxes only; red / black ones you set are left alone. */
(function(){
  var RUN_ITEM=/\b(complete|finish|do|get in|hit)\b.*\brun|\bscheduled runs?\b|\brun(s)? (today|as planned|done)\b|^\s*run\b/i;
  function check(){
    try{
      if(typeof dk!=='function'||typeof today==='undefined'||typeof hasRunOnDate!=='function')return;
      var d=dk(today);if(!hasRunOnDate(d))return;var changed=false;
      ['pt0','pt1','pt2','dg0','dg1','dg2'].forEach(function(id){
        var inp=document.getElementById(id+'t'),box=document.querySelector('.tri-check[data-key="'+id+'c"]');
        if(!inp||!box||!RUN_ITEM.test(String(inp.value||'')))return;
        var st=box.dataset.state||'';if(st&&st!=='purple')return;
        try{if(localStorage.getItem('autoRun_'+d+'_'+id))return;}catch(e){}   // once a day: if you change it back, it stays
        if(typeof applyTriState==='function')applyTriState(box,'green');
        var row=box.closest('.priority-item');if(row)row.classList.add('done');
        try{localStorage.setItem('autoRun_'+d+'_'+id,'greenx');}catch(e){}
        changed=true;
      });
      if(changed){try{save();}catch(e){}try{renderDailyCheckOverview();}catch(e){}try{updateCompactSectionCounts();}catch(e){}}
    }catch(e){}
  }
  setInterval(check,8000);setTimeout(check,2500);
})();
