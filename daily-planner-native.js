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
  // Wellness tab: each check with the numbers that go with it.
  var WELL=[
    ['wBP','BP',[['wBPVal','BP','120/80'],['wPulseVal','Pulse','bpm'],['wRestHRVal','Morning HR','bpm']]],
    ['wMeds','Meds',[['wMedsVal','Meds','HCTZ, Rosuvastatin…']]],
    ['wWght','Weight',[['wWghtVal','Weight','lbs']]],
    ['wSleep','Sleep',[['wSleepVal','Sleep','hrs (7.5 or 6:30)'],['wSleepScore','Sleep score','0-100']]],
    ['exDogWalk','Dog Walk',[['exDogWalkVal','Dog walk','duration / notes']]],
    ['exStepsCheck','10,000 steps',[['exSteps','Steps','steps']]]];
  var WELL_IDS={};WELL.forEach(function(w){w[2].forEach(function(f){WELL_IDS[f[0]]=1;});});
  function wellness(){
    goRealDay();
    return WELL.map(function(w){
      var ck=document.querySelector('.tri-check[data-key="'+w[0]+'"]');
      return {key:w[0],label:w[1],state:ck?(ck.dataset.state||''):'',fields:w[2].map(function(f){var el=document.getElementById(f[0]);
        return {id:f[0],label:f[1],hint:f[2],value:el?el.value:'',number:!!(el&&el.type==='number')};})};
    }).filter(function(w){return document.querySelector('.tri-check[data-key="'+w.key+'"]');});
  }
  function openTab(name){
    var b=document.getElementById('hm-'+name)||document.querySelector('button.tab-btn[onclick*="\''+name+'\'"]');
    if(b)b.click();else{try{switchTab(name,{currentTarget:null,target:null,preventDefault:function(){}});}catch(e){}}
    window.scrollTo(0,0);
  }
  function bible(){try{return window.bibleStudy&&bibleStudy.info?bibleStudy.info():null;}catch(e){return null;}}
  function meditation(){
    goRealDay();var ck=document.querySelector('.tri-check[data-key="spMeditation"]'),line='',streak='';
    try{line=journalMeditationTodayLine();}catch(e){}
    var mins=0,n=0;try{var ss=JSON.parse(localStorage.getItem('medit_sessions')||'[]'),wk=typeof wkStartOf==='function'?dk(wkStartOf(new Date())):'';
      ss.forEach(function(x){if(x&&x.date&&(!wk||x.date>=wk)){mins+=Number(x.dur)||0;n++;}});}catch(e){}
    return {state:ck?(ck.dataset.state||''):'',line:line,weekMins:mins,weekSessions:n,scripture:localStorage.getItem('medit_scripture')||''};
  }
  var WREV=[['revWins','Wins This Week'],['revImprove','What to Improve'],['revFocus','Focus for Next Week'],['revLessons','Lessons Learned']];
  function weekly(){
    try{renderReview();}catch(e){}
    var btn=document.getElementById('aiFillReviewBtn'),lab=document.getElementById('revLabel'),stats=document.getElementById('revStats');
    var saved={};try{var ws=wkStart(revOff2);saved=JSON.parse(localStorage.getItem('review_'+dk(ws))||'{}')||{};}catch(e){}
    return {label:lab?lab.textContent:'',off:typeof revOff2==='number'?revOff2:0,stats:stats?String(stats.innerText||'').replace(/\s+/g,' ').replace(/(\d)([A-Za-z])/g,'$1 $2').replace(/([a-z])\s?(\d)/g,'$1 · $2').trim().slice(0,400):'',
      busy:!!(btn&&btn.disabled),hasKey:typeof journalAIKey==='function'&&!!journalAIKey(),
      fields:WREV.map(function(r){var el=document.getElementById(r[0]),v=el?el.value:'';return {id:r[0],label:r[1],value:v,unsaved:(saved[r[0]]||'')!==v};})};
  }
  function journalText(){goRealDay();var el=document.getElementById('jNotes');return el?el.value:'';}
  // 📆 Monthly / Yearly: the same tables and heat map as those tabs, for any month/year offset (0 = this one).
  function tableData(id){
    var el=document.getElementById(id),t=el&&el.querySelector('table');if(!t)return null;
    var head=[].map.call(t.querySelectorAll('thead th'),function(th){return th.textContent.trim();});
    var rows=[].map.call(t.querySelectorAll('tbody tr, tfoot tr'),function(tr){return [].map.call(tr.children,function(td){return td.textContent.trim();});});
    return {head:head,rows:rows};
  }
  function period(kind,off){
    off=Number(off)||0;var out={kind:kind,off:off,sections:[]};
    if(kind==='monthly'){
      var keep=monthOff2;monthOff2=off;
      try{renderMonthly();}catch(e){}
      out.label=(document.getElementById('monthLabel')||{}).textContent||'';
      [['mFitness','🏃 Fitness'],['mWellness','💚 Wellness'],['mSpirituality','📖 Spirituality & Reading']].forEach(function(x){var d=tableData(x[0]);if(d)out.sections.push({title:x[1],head:d.head,rows:d.rows});});
      out.heat=[].map.call(document.querySelectorAll('#hmGrid > .heatmap-cell'),function(c){var cn=c.className||'',m=cn.match(/\bhm(\d)\b/);return /hm-empty/.test(cn)?'e':/hm-future/.test(cn)?'f':(m?m[1]:'0');}).join('');
      monthOff2=keep;try{if(activeTabName()==='monthly')renderMonthly();}catch(e){}
    }else{
      var keepY=yearOff2;yearOff2=off;
      try{renderYearly();}catch(e){}
      out.label=(document.getElementById('yearLabel')||{}).textContent||'';
      [['yFitness','🏃 Fitness'],['yWellness','💚 Wellness'],['ySpirituality','📖 Spirituality & Reading']].forEach(function(x){var d=tableData(x[0]);if(d)out.sections.push({title:x[1],head:d.head,rows:d.rows});});
      yearOff2=keepY;try{if(activeTabName()==='yearly')renderYearly();}catch(e){}
    }
    return out;
  }
  // 📅 Calendar: month grid status + events (yours, training plan, habits, bills) like the Daily page calendar.
  function calMonth(y,m){
    var acts=new Set();try{(getActivities()||[]).forEach(function(a){if(a&&a.date)acts.add(a.date);});}catch(e){}
    var ev=new Set();try{journalCalendarCombinedEvents().forEach(function(e){ev.add(e.date);});}catch(e){}
    var first=new Date(y,m,1),dim=new Date(y,m+1,0).getDate(),days=[];
    for(var d=1;d<=dim;d++){var k=dk(new Date(y,m,d)),st='';try{st=journalCalendarStatus(k,acts);}catch(e){}days.push({d:d,date:k,status:st,event:ev.has(k)});}
    return {title:first.toLocaleDateString('en-US',{month:'long',year:'numeric'}),lead:(first.getDay()+6)%7,days:days,today:dk(new Date())};
  }
  function calEvents(date){
    var list=[];try{list=journalCalendarCombinedEvents().filter(function(e){return e.date===date;});}catch(e){}
    list.sort(function(a,b){return(a.time||'99:99').localeCompare(b.time||'99:99');});
    return list.map(function(e){var r=Number(e.reminderMinutes||0);return {id:e.id,date:e.date,time:e.time||'',timeLabel:e.time?journalFormatEventTime(e.time):'All day',title:e.title||'Untitled event',note:e.note||'',
      kind:e.trainingPlan?'training':e.habitGrowth?'habit':e.moneyEvent?'money':'mine',reminder:(e.noReminder||!e.time)?-1:r};});
  }
  function calSave(list){journalCalendarEventsSave(list);try{decorateMyCalendarEvents();}catch(e){}try{checkCalendarReminders();}catch(e){}}
  // 📊 Weekly tab: goal bars, the week's digest and its tables, for any week offset (0 = this week).
  function weekTab(off){
    off=Number(off)||0;var keep=weekOff2;weekOff2=off;
    try{renderWeekly();}catch(e){}try{renderGoals();}catch(e){}
    var out={off:off,label:(document.getElementById('weekLabel')||{}).textContent||'',goals:[],sections:[]};
    document.querySelectorAll('#goalBars .goal-row').forEach(function(r){
      var sp=r.querySelectorAll('.goal-label span'),fill=r.querySelector('.goal-bar-fill');
      out.goals.push({label:sp[0]?sp[0].textContent.trim():'',value:sp[1]?sp[1].textContent.trim().replace(/\s*\d+%$/,''):'',pct:fill?parseInt(fill.style.width,10)||0:0,reached:r.classList.contains('goal-reached')});
    });
    var dg=document.getElementById('wDigest');out.digest=dg?String(dg.innerText||'').replace(/\n{2,}/g,'\n').trim().slice(0,1200):'';
    [['wFitness','🏃 Fitness'],['wWellness','💚 Wellness'],['wSpirituality','📖 Spirituality & Reading'],['wNutrition','🍎 Nutrition'],['wNutritionMicro','🧪 Micronutrients']].forEach(function(x){var d=tableData(x[0]);if(d&&d.rows.length)out.sections.push({title:x[1],head:d.head,rows:d.rows});});
    try{out.targets=JSON.parse(localStorage.getItem('weekly_goals')||'{}');}catch(e){out.targets={};}
    weekOff2=keep;try{if(activeTabName()==='weekly'){renderWeekly();renderGoals();}}catch(e){}
    return out;
  }
  window.ccNative={
    version:10,
    weekTab:function(off){return JSON.stringify(weekTab(off));},
    /** Weekly targets: {Miles, Bible, Prayer, Exercise, Audible} (0 / empty = no goal). */
    setGoals:function(json){var g={};try{g=JSON.parse(localStorage.getItem('weekly_goals')||'{}')||{};}catch(e){}
      var n=JSON.parse(json||'{}');['Miles','Bible','Prayer','Exercise','Audible'].forEach(function(k){if(k in n){var v=parseFloat(n[k]);if(v>0)g[k]=v;else delete g[k];}});
      ['Miles','Bible','Prayer','Exercise','Audible'].forEach(function(k){var el=document.getElementById('g'+k);if(el)el.value=g[k]||'';});
      try{saveGoals();}catch(e){localStorage.setItem('weekly_goals',JSON.stringify(g));}return true;},
    calendar:function(y,m){return JSON.stringify(calMonth(Number(y),Number(m)));},
    events:function(date){return JSON.stringify(calEvents(String(date)));},
    /** Add or update one of your events (id empty = new). reminder: minutes before, -1 = none. */
    saveEvent:function(id,date,title,time,note,reminder){
      title=String(title||'').trim();if(!title)return false;time=String(time||'');reminder=time?Number(reminder):-1;
      var patch={date:String(date),time:time,title:title,note:String(note||'').trim(),reminderMinutes:reminder,noReminder:!time||reminder<0};
      var list=journalCalendarEventsAll();
      if(id)list=list.map(function(e){return e.id===id?Object.assign({},e,patch):e;});else list.push(Object.assign({id:'ev-'+Date.now()},patch));
      calSave(list);return true;
    },
    deleteEvent:function(id){calSave(journalCalendarEventsAll().filter(function(e){return e.id!==id;}));return true;},
    period:function(kind,off){return JSON.stringify(period(kind==='yearly'?'yearly':'monthly',off));},
    /** ✍️ Daily Journal (today). */
    setJournal:function(value){goRealDay();var el=document.getElementById('jNotes');if(!el)return false;value=String(value||'');if(el.value===value)return true;
      el.value=value;try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}try{save();}catch(e){}return true;},
    /** 📖 Bible Study / 🧘 Meditation: open the Command Center's own guided session or meditation screen. */
    bibleOpen:function(){goRealDay();if(!(typeof journalAIKey==='function'&&journalAIKey()))return 'nokey';openTab('bible');try{bibleStudy.open();}catch(e){return false;}return true;},
    meditOpen:function(){goRealDay();openTab('meditate');return true;},
    /** 📅 Weekly review (this week = 0, last week = -1 …). */
    weekly:function(){return JSON.stringify(weekly());},
    weeklyShift:function(n){try{changeRevOff(n);}catch(e){}return JSON.stringify(weekly());},
    setWeekly:function(id,value){if(!WREV.some(function(r){return r[0]===id;}))return false;var el=document.getElementById(id);if(!el)return false;
      el.value=String(value||'');try{if(typeof autoGrowReviewField==='function')autoGrowReviewField(el);}catch(e){}try{saveReview();}catch(e){}return true;},
    saveWeekly:function(){try{saveReview();}catch(e){return false;}return true;},
    weeklyFill:function(){var b=document.getElementById('aiFillReviewBtn');if(!b||b.disabled)return false;if(!(typeof journalAIKey==='function'&&journalAIKey()))return 'nokey';aiFillEntireReview(b);return true;},
    /** Change a Wellness value (BP, weight, sleep, steps…) — the Command Center's auto-checks react as if typed there. */
    setField:function(id,value){
      if(!WELL_IDS[id])return false;goRealDay();
      var el=document.getElementById(id);if(!el)return false;value=String(value==null?'':value);if(el.value===value)return true;
      el.value=value;
      try{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
      try{save();}catch(e){}refresh();return true;
    },
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
    all:function(){goRealDay();var f=JSON.parse(window.ccNative.focus());f.checks=checks();f.schedule=schedule();f.review=review();f.wellness=wellness();f.bible=bible();f.meditation=meditation();f.weekly=weekly();f.journal=journalText();return JSON.stringify(f);},
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
