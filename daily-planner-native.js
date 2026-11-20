/* Bridge for BeyondStride's native Life tab (Nov 2026).
 * BeyondStride shows some Command Center sections as its own screens. They read and change the SAME data through
 * window.ccNative, so everything the Command Center does on a change (save, auto-checks, counts, My Schedule,
 * cloud sync) still happens exactly as if you'd tapped it here. In Chrome this file does nothing visible.
 * Nothing is removed. */
(function(){
  var IDS=['pt0','pt1','pt2','dg0','dg1','dg2'];
  var STATES=['','green','black','purple','red'];
  function realKey(){return dk(new Date());}
  function onRealDay(){try{return dk(today)===realKey();}catch(e){return false;}}
  function stored(){try{return JSON.parse(localStorage.getItem('planner_'+realKey())||'{}')||{};}catch(e){return {};}}
  function refresh(){
    ['updateCompactSectionCounts','renderDailyCheckOverview','renderJournalSchedule','updateTodayGlance'].forEach(function(f){try{if(typeof window[f]==='function')window[f]();}catch(e){}});
  }
  // Change today's saved day directly (when the page is showing a different date).
  function writeStored(fn){
    var d=stored();fn(d);
    try{localStorage.setItem('planner_'+realKey(),JSON.stringify(d));}catch(e){return false;}
    try{if(typeof journalCloudSchedule==='function')journalCloudSchedule();}catch(e){}
    return true;
  }
  // The native Today screen always shows the real today; bring the page there if it's on another date.
  function goRealDay(){if(!onRealDay()){try{today=new Date();load();if(typeof syncPeriodsToDay==='function')syncPeriodsToDay();}catch(e){}}}
  function checks(){
    goRealDay();
    var list=typeof collectDailyChecks==='function'?collectDailyChecks():[];
    return list.filter(function(i){return !/^(?:pt|dg)[0-2]c$/.test(i.key||'');}).map(function(i){
      return {key:i.key||'',id:i.id||'',group:i.group,label:String(i.label||'').replace(/\s*-\s*Actual\s*$/i,''),state:i.status==='blank'?'':i.status};});
  }
  function schedule(){
    goRealDay();
    try{renderJournalSchedule();}catch(e){}
    var map=window._journalScheduleItemsById||{},items=Object.keys(map).map(function(id){return map[id];});
    var now=new Date(),cur=now.getHours()*60+now.getMinutes(),next=-1;
    for(var i=0;i<items.length;i++){if(!items[i].fixed&&!items[i].done&&Number(items[i].mins)>=cur){next=i;break;}}
    if(next<0)next=items.findIndex(function(it){return !it.fixed&&!it.done;});
    return items.map(function(it,i){
      var st=it.scheduleStatus||(it.done?'green':'');if(st==='blank')st='';
      return {id:it.id,time:it.time||'',label:String(it.label||''),detail:String(it.detail||'').replace(/<[^>]*>/g,''),done:!!it.done,
        partial:!!it.partial,fixed:!!it.fixed,state:st,next:i===next};});
  }
  var REV=[['dayRevWins','Wins Today'],['dayRevImprove','What to Improve'],['dayRevFocus','Focus for Tomorrow'],['dayRevLessons','Lessons Learned']];
  function review(){
    goRealDay();var btn=document.getElementById('aiFillDayReviewBtn');
    var saved={};try{saved=JSON.parse(localStorage.getItem('dayreview_'+realKey())||'{}')||{};}catch(e){}
    var fields=REV.map(function(r){var el=document.getElementById(r[0]),v=el?el.value:'';return {id:r[0],label:r[1],value:v,unsaved:(saved[r[0]]||'')!==v};});
    return {fields:fields,busy:!!(btn&&btn.disabled),hasKey:typeof journalAIKey==='function'&&!!journalAIKey()};
  }
  window.ccNative={
    version:4,
    /** Daily AI Review: change a field (saved like typing in the Command Center). */
    setReview:function(id,value){
      if(!REV.some(function(r){return r[0]===id;}))return false;goRealDay();
      var el=document.getElementById(id);if(!el)return false;el.value=String(value||'');
      try{if(typeof autoGrowReviewField==='function')autoGrowReviewField(el);}catch(e){}
      try{saveDayReview(true);}catch(e){}return true;
    },
    saveReview:function(){goRealDay();try{saveDayReview(true);}catch(e){return false;}try{if(window.BSNative&&BSNative.changed)BSNative.changed();}catch(e){}return true;},
    /** ✨ AI Fill Day Review — the Command Center's own button (its AI key, its full prompt). */
    reviewFill:function(){goRealDay();var b=document.getElementById('aiFillDayReviewBtn');if(!b||b.disabled)return false;
      if(!(typeof journalAIKey==='function'&&journalAIKey()))return 'nokey';aiFillEntireDayReview(b);return true;},
    /** Everything the native Today screen shows: {date, focus:[…], checks:[{key|id, group, label, state}]} */
    all:function(){goRealDay();var f=JSON.parse(window.ccNative.focus());f.checks=checks();f.schedule=schedule();f.review=review();return JSON.stringify(f);},
    /** My Schedule: tap cycles done → not done → not marked, exactly like the Command Center's own button. */
    scheduleTap:function(id){goRealDay();try{renderJournalSchedule();journalScheduleCycleStatus(null,id);}catch(e){return false;}refresh();try{if(window.BSNative&&BSNative.changed)BSNative.changed();}catch(e){}return true;},
    /** Set a daily check (tri-check key like 'wBP') to '', green, black, purple or red. */
    setCheck:function(key,state){
      if(!key||STATES.indexOf(state)<0)return false;goRealDay();
      var els=document.querySelectorAll('.tri-check[data-key="'+key+'"]');if(!els.length)return false;
      els.forEach(function(e){applyTriState(e,state);});
      try{save();}catch(e){}refresh();
      try{var wt=document.getElementById('tab-weekly');if(wt&&wt.classList.contains('active')&&typeof renderWeekly==='function')renderWeekly();}catch(e){}
      return true;
    },
    /** Plain checkboxes (Planning & Review). */
    setBox:function(id,on){
      if(id!=='reviewCheck'&&id!=='prepJournalCheck')return false;goRealDay();
      var el=document.getElementById(id);if(!el)return false;
      if(el.checked!==!!on){el.checked=!!on;try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}try{save();}catch(e){}refresh();}
      return true;
    },
    /** Today's Focus for the real today: {date, items:[{id, kind, text, state}]} */
    focus:function(){
      var live=onRealDay(),d=live?null:stored(),out=[];
      IDS.forEach(function(id){
        var text='',state='';
        if(live){
          var row=document.getElementById(id),tx=row&&row.querySelector('input[type=text]'),ck=row&&row.querySelector('.tri-check');
          text=tx?tx.value:'';state=ck?(ck.dataset.state||''):'';
        }else{text=d[id+'t']||'';state=d[id+'c']||'';}
        out.push({id:id,kind:id.charAt(0)==='p'?'task':'goal',text:text,state:state});
      });
      return JSON.stringify({date:realKey(),items:out});
    },
    setText:function(id,value){
      if(IDS.indexOf(id)<0)return false;value=String(value||'');
      if(onRealDay()){
        var row=document.getElementById(id),tx=row&&row.querySelector('input[type=text]');if(!tx)return false;
        if(tx.value===value)return true;
        tx.value=value;try{save();}catch(e){}refresh();return true;
      }
      return writeStored(function(d){d[id+'t']=value;});
    },
    setState:function(id,state){
      if(IDS.indexOf(id)<0||STATES.indexOf(state)<0)return false;
      if(onRealDay()){
        document.querySelectorAll('.tri-check[data-key="'+id+'c"]').forEach(function(e){applyTriState(e,state);});
        var row=document.getElementById(id);if(row)row.classList.toggle('done',state==='green');
        try{save();}catch(e){}refresh();return true;
      }
      return writeStored(function(d){d[id+'c']=state;});
    }
  };
  // Tell BeyondStride when the Command Center saves, so its screens update (auto-checks, carry-over, edits here).
  function hook(){
    if(typeof window.save!=='function'||window.save.__native)return;
    var orig=window.save;
    var wrapped=function(){var r=orig.apply(this,arguments);try{if(window.BSNative&&BSNative.changed)BSNative.changed();}catch(e){}return r;};
    wrapped.__native=true;window.save=wrapped;
  }
  function hookRev(){
    if(typeof window.saveDayReview!=='function'||window.saveDayReview.__native)return;
    var o=window.saveDayReview,w=function(){var r=o.apply(this,arguments);try{if(window.BSNative&&BSNative.changed)BSNative.changed();}catch(e){}return r;};
    w.__native=true;window.saveDayReview=w;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){hook();hookRev();});else{hook();hookRev();}
  setTimeout(hookRev,1500);
  setTimeout(hook,1500);
})();
