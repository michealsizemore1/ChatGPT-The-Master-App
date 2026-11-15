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
