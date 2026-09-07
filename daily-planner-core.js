
let today=new Date();const _realToday=new Date(today);// snapshot of actual launch date — never changes with navigation
const charts={};let waterOz=0,scoreVal=0,copiedDayData=null;
function dk(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day;}
function fmtD(d){return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});}
function wkStart(off=0){const t=new Date();t.setDate(t.getDate()+off*7);const dow=(t.getDay()+6)%7;const ws=new Date(t);ws.setDate(t.getDate()-dow);ws.setHours(0,0,0,0);return ws;}
function wkStartOf(d){const dow=(d.getDay()+6)%7;const ws=new Date(d);ws.setDate(d.getDate()-dow);ws.setHours(0,0,0,0);return ws;}
function parseMins(s){if(!s)return 0;s=s.trim();let m=s.match(/(\d+)\s*hr?s?\s*(\d*)\s*min?s?/i);if(m)return+m[1]*60+(+m[2]||0);m=s.match(/(\d+)\s*min?s?/i);if(m)return+m[1];m=s.match(/^(\d+):(\d{2}):(\d{2})$/);if(m)return+m[1]*60+ +m[2]+ +m[3]/60;m=s.match(/^(\d+):(\d{2})$/);if(m)return+m[1]+ +m[2]/60;const n=parseFloat(s);return isNaN(n)?0:Math.round(n);}
function parseSleepMins(s){
  if(!s)return 0;
  s=String(s).trim();
  var m=s.match(/^(\d+)\s*h(?:rs?)?(?:\s*(\d+)\s*m(?:ins?)?)?$/i);
  if(m)return(+m[1])*60+(+(m[2]||0));
  m=s.match(/^(\d+):(\d{2})$/);
  if(m)return(+m[1])*60+(+m[2]);
  var n=parseFloat(s);
  return isNaN(n)?0:Math.round(n*60);
}
function fmtMins(m){if(!m)return'-';m=Math.round(m);return m<60?m+'m':Math.floor(m/60)+'h '+(m%60)+'m';}
function parseTimedMins(s){
  if(!s)return 0;
  var str=String(s).trim();
  var p=str.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if(p)return(+p[1]*60)+(+p[2])+(+p[3]/60);
  p=str.match(/^(\d+):(\d{1,2})$/);
  if(p)return(+p[1])+(+p[2]/60);
  return parseMins(str);
}
function fmtMinsSeconds(mins){
  if(!mins)return'-';
  var sec=Math.round(Number(mins)*60);
  var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
  var parts=[];
  if(h)parts.push(h+'h');
  if(m)parts.push(m+'m');
  if(s)parts.push(s+'s');
  return parts.join(' ')||'0s';
}
function parseSkillTimeMins(value){
  if(value==null||String(value).trim()==='')return 0;
  var text=String(value).trim(),match=text.match(/^(\d+(?:\.\d+)?)$/);
  if(match)return parseFloat(match[1]);
  match=text.match(/^(\d+):(\d{1,2})$/);
  if(match)return(+match[1])+(+match[2]/60);
  return parseMins(text);
}
function fmtDuration(s){
  if(!s)return '';
  if(typeof s==='number'){var totalSeconds=Math.round(s*60),numericHours=Math.floor(totalSeconds/3600),numericMinutes=Math.floor((totalSeconds%3600)/60),numericSeconds=totalSeconds%60;return((numericHours?numericHours+'h ':'')+(numericMinutes?numericMinutes+'m ':'')+(numericSeconds?numericSeconds+'s':'')).trim();}
  var str=String(s).trim();
  var parts=str.split(':').map(Number);
  var total=0;
  if(parts.length===3)total=(parts[0]*3600)+(parts[1]*60)+parts[2];
  if(parts.length===2)total=(parts[0]*60)+parts[1];
  if(total>0){var h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=Math.round(total%60);return((h?h+'h ':'')+(m?m+'m ':'')+(sec?sec+'s':'')).trim();}
  return str;
}
function parsePace(s){if(!s)return 0;s=s.trim().replace('--','');if(!s)return 0;const m=s.match(/(\d+):(\d{1,2})/);if(m)return parseInt(m[1])*60+parseInt(m[2]);const n=parseFloat(s);return(isNaN(n)||n<=0)?0:Math.round(n*60);}
function fmtPace(v){if(!v)return'-';const m=Math.floor(v/60),s=Math.round(v%60);return m+':'+(s<10?'0':'')+s;}

// Tri-state checkbox logic (empty = no mark, orange = partial, green = done, red = missed, black = N/A)
const TRI_STATES=['','green','black','purple','red'];
function applyTriState(el,state){
  el.classList.remove('green','red','black','orange','blue','purple');
  el.dataset.state=state||'';
  if(state){el.classList.add(state);el.textContent='✓';}
  else{el.textContent='';}
}
function triClick(el){
  var _cur0=el.dataset.state||'';if(_cur0==='orange'||_cur0==='blue'){el.dataset.state='purple';_cur0='purple';}
  const cur=_cur0;
  const idx=TRI_STATES.indexOf(cur);
  const next=TRI_STATES[(idx+1)%TRI_STATES.length];
  const key=el.dataset.key;
  if(key){
    // Some checkboxes (e.g. spMeditation) appear in more than one place —
    // keep every instance sharing the same key in sync.
    document.querySelectorAll('.tri-check[data-key="'+key+'"]').forEach(function(e2){applyTriState(e2,next);});
  } else {
    applyTriState(el,next);
  }
  save();
  updateCompactSectionCounts();
  renderDailyCheckOverview();
  if(['gaFinancialVideos','gaAudiobook','gaUdemy','gaGunRange','gaLanguage','gaGuitar','exStretch','exMassage','wBP','wMeds','wWght','wSleep','wHeadache','spDailyBread','spBibleAudio','spAIPrayer'].indexOf(key)!==-1)renderJournalSchedule();
  const wt=document.getElementById('tab-weekly');
  if(wt&&wt.classList.contains('active'))try{renderWeekly();}catch(e){}
}
function triClickPriority(el,rowId){
  triClick(el);
  const row=document.getElementById(rowId);
  if(row)row.classList.toggle('done',el.dataset.state==='green');
  updateTodayGlance();
}

// ── Today at a Glance ────────────────────────────────────────────────────────
function updateTodayGlance(){
  const el=document.getElementById('todayGlance');if(!el)return;
  const doneCount=['pt0','pt1','pt2'].filter(function(id){
    const row=document.getElementById(id);
    const chk=row&&row.querySelector('.tri-check');
    return chk&&chk.dataset.state==='green';
  }).length;
  el.innerHTML='<span>&#x2705; '+doneCount+'/3 Priorities</span><span>&#x2B50; Day Score '+scoreVal+'/5</span>';
  updateCompactSectionCounts();
  renderDailyCheckOverview();
}

function toggleCompactSection(bodyId,arrowId,toggle){
  var body=document.getElementById(bodyId),arrow=document.getElementById(arrowId);
  if(!body)return;
  var opening=body.style.display==='none'||!body.style.display;
  body.style.display=opening?'block':'none';
  if(arrow)arrow.innerHTML=opening?'&#x25BC;':'&#x25B6;';
  if(toggle)toggle.setAttribute('aria-expanded',opening?'true':'false');
}
function compactDoneCount(keys){
  return keys.filter(function(key){
    var el=document.querySelector('.tri-check[data-key="'+key+'"]');
    return el&&el.dataset.state==='green';
  }).length;
}
function updateCompactSectionCounts(){
  var task=document.getElementById('dailyTasksCount');
  var goals=document.getElementById('dailyGoalsCount');
  var physical=document.getElementById('physicalExerciseCount');
  if(task)task.textContent=compactDoneCount(['pt0c','pt1c','pt2c'])+'/3';
  if(goals)goals.textContent=compactDoneCount(['dg0c','dg1c','dg2c'])+'/3';
  if(physical)physical.textContent=compactDoneCount(['exStrength','exStretch','exMassage','exWalk','exDogWalk'])+'/5';
}
function toggleAITools(){
  toggleCompactSection('aiToolsBody','aiToolsArrow',document.getElementById('aiToolsToggle'));
}
function toggleTabNotes(){
  toggleCompactSection('tabNotesBody','tabNotesArrow',document.getElementById('tabNotesToggle'));
}

var dailyCheckFilter='all';
var DAILY_CHECK_TAB_NAMES={
  daily:'Daily',activities:'Activities',bible:'Bible',meditate:'Meditation',
  wellness:'Wellness',nutrition:'Nutrition',library:'Library',
  'skill-log':'Learning & Growth',habits:'Habits'
};
function dailyCheckLabel(el){
  if(el.id==='reviewCheck')return'Review Tasks, Goals & Calendar';
  if(el.id==='prepJournalCheck')return'Go Through Journal to Prepare for Tomorrow';
  var row=el.closest('.priority-item,.task-row,.goal-row');
  if(row){
    var input=row.querySelector('input[type="text"],textarea');
    var label=row.querySelector('label');
    if(label){
      var clone=label.cloneNode(true);
      clone.querySelectorAll('span').forEach(function(s){s.remove();});
      var text=clone.textContent.replace(/\s+/g,' ').replace(/:$/,'').trim();
      if(text)return text;
    }
    if(input&&input.value.trim())return input.value.trim();
    if(input&&input.placeholder)return input.placeholder.replace(/\.\.\.$/,'').trim();
  }
  if(el.title){
    var title=el.title.replace(/^Mark\s+/i,'').replace(/\s+complete$/i,'').trim();
    if(title)return title;
  }
  return (el.dataset.key||el.id||'Check-in').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ');
}
function dailyCheckGroup(el,tab){
  if(el.closest('.journal-growth-pool'))return'Growth';
  var section=el.closest('.section');
  if(section){
    var title=section.querySelector('.section-title');
    if(title){
      var clone=title.cloneNode(true);
      clone.querySelectorAll('.compact-toggle-count').forEach(function(n){n.remove();});
      var text=clone.textContent.replace(/[▶▼]/g,'').replace(/\s+/g,' ').trim();
      if(text)return text;
    }
  }
  return DAILY_CHECK_TAB_NAMES[tab]||tab;
}
function collectDailyChecks(){
  var seen={},items=[];
  document.querySelectorAll('.tri-check[data-key]').forEach(function(el){
    var key=el.dataset.key;if(!key||seen[key]||key==='exBike')return;seen[key]=true;
    if(/^(?:pt|dg)[0-2]c$/.test(key)){
      var textKey=key.slice(0,-1)+'t',textInput=document.querySelector('[data-key="'+textKey+'"],#'+textKey),row=el.closest('.priority-item,.goal-row');
      if(!textInput&&row)textInput=row.querySelector('input[type="text"],textarea');
      if(!textInput||!String(textInput.value||'').trim())return;
    }
    var panel=el.closest('.tab-panel');
    var tab=panel&&panel.id?panel.id.replace(/^tab-/,''):'daily';
    if(tab==='habits')return;
    var state=el.dataset.state||'';
    if(state==='orange'||state==='blue')state='purple';
    if(['green','red','black','purple'].indexOf(state)<0)state='';
    items.push({key:key,id:'',tab:tab,group:dailyCheckGroup(el,tab),status:state||'blank',label:dailyCheckLabel(el)});
  });
  ['reviewCheck','prepJournalCheck'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    items.push({key:'',id:id,tab:'daily',group:'Planning & Review',status:el.checked?'green':'blank',label:dailyCheckLabel(el)});
  });
  var selectedKey=dk(today);
  var skillEntries=getSkillEntries();
  var hasLanguage=skillEntries.some(function(entry){return entry.date===selectedKey&&entry.category==='Language';});
  items.push({key:'',id:'journalScheduleBody',tab:'daily',group:'Growth',status:hasLanguage?'green':'blank',label:'Language'});
  return items;
}
function renderDailyCheckOverview(){
  var summary=document.getElementById('dailyCheckOverviewSummary');
  var list=document.getElementById('dailyCheckOverviewList');
  if(!summary||!list)return;
  var items=collectDailyChecks();
  function count(status){return items.filter(function(i){return i.status===status;}).length;}
  summary.textContent=count('green')+' complete • '+count('blank')+' blank • '+count('red')+' not complete • '+count('purple')+' partial • '+count('black')+' N/A';
  var filtered=dailyCheckFilter==='all'?items:items.filter(function(i){return i.status===dailyCheckFilter;});
  if(!filtered.length){
    list.innerHTML='<div style="font-size:.78rem;color:#98a2b3;text-align:center;padding:10px;">No items in this view.</div>';
    return;
  }
  var groups={};
  filtered.forEach(function(item){if(!groups[item.group])groups[item.group]=[];groups[item.group].push(item);});
  list.innerHTML=Object.keys(groups).map(function(group){
    var rows=groups[group].map(function(item){
      return '<button class="check-overview-item '+item.status+'" data-key="'+escHtml(item.key)+'" data-id="'+escHtml(item.id)+'" data-tab="'+escHtml(item.tab)+'" onclick="jumpToDailyCheck(this)" title="Open '+escHtml(group)+'">'
        +'<span class="check-overview-box">'+(item.status==='blank'?'':'&#x2713;')+'</span><span>'+escHtml(item.label)+'</span></button>';
    }).join('');
    return '<div class="check-overview-group"><div class="check-overview-group-title">'+escHtml(group)+'</div><div class="check-overview-items">'+rows+'</div></div>';
  }).join('');
}
function toggleDailyCheckOverview(){
  var body=document.getElementById('dailyCheckOverviewBody');
  var arrow=document.getElementById('dailyCheckOverviewArrow');
  var toggle=document.getElementById('dailyCheckOverviewToggle');
  if(!body)return;
  var opening=body.style.display==='none'||!body.style.display;
  body.style.display=opening?'block':'none';
  if(arrow)arrow.innerHTML=opening?'&#x25BC;':'&#x25B6;';
  if(toggle)toggle.setAttribute('aria-expanded',opening?'true':'false');
  if(opening)renderDailyCheckOverview();
}
function setDailyCheckFilter(filter,btn){
  dailyCheckFilter=filter;
  document.querySelectorAll('#dailyCheckOverviewFilters button').forEach(function(b){b.classList.toggle('active',b===btn);});
  renderDailyCheckOverview();
}
function jumpToDailyCheck(btn){
  var tab=btn.dataset.tab||'daily';
  var target=btn.dataset.id?document.getElementById(btn.dataset.id):document.querySelector('.tri-check[data-key="'+btn.dataset.key+'"]');
  if(!target)return;
  if(target.id==='reviewCheck'||target.id==='prepJournalCheck'){
    target.checked=!target.checked;
    save();
    renderDailyCheckOverview();
    return;
  }
  switchTab(tab,null);
  var panel=target.closest('.tab-panel'),parent=target.parentElement;
  while(parent&&parent!==panel){
    if(parent.style&&parent.style.display==='none')parent.style.display='block';
    parent=parent.parentElement;
  }
  setTimeout(function(){
    target.scrollIntoView({behavior:'smooth',block:'center'});
    target.focus({preventScroll:true});
  },80);
}

function updateWaterDisplay(){const cups=(waterOz/8).toFixed(1);const el=document.getElementById('waterDisplay');if(el)el.textContent=waterOz+' oz ('+cups+' cups)';}
function changeWater(delta){waterOz=Math.max(0,waterOz+delta);updateWaterDisplay();save();renderJournalSchedule();}
function syncMassageMinutes(source){
  var daily=document.getElementById('dailyMassageMinutes'),activities=document.getElementById('exMassageMinutes');
  if(source==='daily'&&daily&&activities)activities.value=daily.value;
  else if(activities&&daily)daily.value=activities.value;
  save();renderJournalSchedule();
}
function parseBP(s){if(!s)return{sys:0,dia:0};const m=s.match(/(\d+)\s*\/\s*(\d+)/);return m?{sys:+m[1],dia:+m[2]}:{sys:0,dia:0};}
function buildStars(){const ss=document.getElementById('scoreStars');if(!ss)return;ss.innerHTML='';for(let i=1;i<=5;i++){const s=document.createElement('span');s.className='star'+(i<=scoreVal?' active':'');s.textContent='★';s.onclick=()=>{scoreVal=(scoreVal===i)?i-1:i;buildStars();save();};ss.appendChild(s);}updateTodayGlance();}

// All text/number fields
const TXS=['spDailyBreadText','spMeditationText','gaAudiobookText','gaAudiobookTime','gaSkillText','gaSkillTime','wBPVal','wPulseVal','wMedsVal','wWghtVal','wSleepVal','wHeadacheNote','exStrengthVal','exBikeVal','exStretchVal','exMassageVal','exWalkVal','exDogWalkVal','nuCalVal','nuProtVal','nuFatVal','nuCarbsVal','jAccomplish','jImprov','jGratitude','jNotes','habitIdentity','habitReflection','mnotes-breakfast','mnotes-lunch','mnotes-dinner','mnotes-snack','mnotes-liquids','mnotes-sports'];
const NMS=['exSteps','wSleepScore','exMassageMinutes','gaFinancialVideosTime'];
const PTIDS=['pt0','pt1','pt2','dg0','dg1','dg2'];

function save(){
  const d={};
  // Tri-state checkboxes
  const triRank={'':0,black:1,purple:2,red:3,green:4};
  document.querySelectorAll('.tri-check').forEach(el=>{if(el.dataset.key){var next=el.dataset.state||'',current=d[el.dataset.key]||'';if((triRank[next]||0)>=(triRank[current]||0))d[el.dataset.key]=next;}});
  // Plain review checkbox
  const rc=document.getElementById('reviewCheck');if(rc)d.reviewCheck=rc.checked;
  const pjc=document.getElementById('prepJournalCheck');if(pjc)d.prepJournalCheck=pjc.checked;
  // Text fields
  TXS.forEach(id=>{const e=document.getElementById(id);if(e)d[id]=e.value;});
  NMS.forEach(id=>{const e=document.getElementById(id);if(e)d[id]=e.value;});
  // Priority/goal text
  PTIDS.forEach(id=>{const row=document.getElementById(id);if(row){const tx=row.querySelector('input[type=text]');if(tx)d[id+'t']=tx.value;}});
  d.waterOz=waterOz;d.score=scoreVal;
  d.foodLog=window._foodLog||[];
  try{
    localStorage.setItem('planner_'+dk(today),JSON.stringify(d));
  }catch(saveErr){
    var isQuota=saveErr&&(saveErr.name==='QuotaExceededError'||saveErr.code===22||saveErr.code===1014||/quota/i.test(saveErr.message||''));
    if(!window._saveQuotaWarned){
      window._saveQuotaWarned=true;
      alert((isQuota?'Your device storage is full, so this change could NOT be saved — it will disappear if you refresh or leave this page.\n\nFree up space (for example, delete old entries in the AI Prayer Archive or Bible Reading Archive, or remove old receipt photos in the Budget Tracker), then make this change again.':'This change could NOT be saved to device storage.\n\n'+(saveErr&&saveErr.message?saveErr.message:''))+'\n\nThis warning will not repeat again this session, but the problem will keep happening until storage is freed up.');
    }
    return;
  }
  renderStreaks();
  updateIssuesCount();
  renderJournalHome();
  // Daily checkmarks are now fully restored; refresh linked schedule counts once more.
  setTimeout(renderJournalSchedule,0);
}


// ── Today's Workout from Training Plan ───────────────────────────────────────
function initTodayWorkoutCard(){
  const raw=localStorage.getItem('current_training_plan');
  const card=document.getElementById('todayWorkoutCard');
  if(!raw||!card){if(card)card.style.display='none';return;}
  const plan=JSON.parse(raw);

  // ── Compute day number ──────────────────────────────────────────────────
  let dayNum=0,weekNum=0,dayOfWk=0,isFinal=false,beforeStart=false;
  if(plan.startDate){
    const startD=new Date(plan.startDate+'T00:00:00');
    const viewD=new Date(dk(today)+'T00:00:00');
    dayNum=Math.floor((viewD-startD)/86400000)+1;
    if(dayNum<1){ beforeStart=true; }
    else {
      weekNum=Math.ceil(dayNum/7);
      dayOfWk=((dayNum-1)%7)+1;
      const totalDays=(plan.weeks||0)*7;
      isFinal=totalDays>0&&dayNum===totalDays;
    }
  }

  // ── Hide card before plan start date OR on plan Day 1 if it's a rest/recovery day ─
  if(beforeStart){ card.style.display='none'; return; }
  // If dayNum===1 and the plan's first entry is a pure rest day, hide the card
  if(dayNum===1&&plan.text){
    const firstLines=(plan.text.split('\n').slice(0,8).join(' ')).toLowerCase();
    if(/rest\s*day|no\s*scheduled\s*workout|recovery/.test(firstLines)){
      card.style.display='none'; return;
    }
  }
  card.style.display='block';

  // ── Day label + race countdown ─────────────────────────────────────────
  const dateLabel=today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  let dayBadge='';
  if(weekNum>0){
    dayBadge=isFinal?' (Week '+weekNum+', Day '+dayOfWk+' — Final Day 🎉)':' (Week '+weekNum+', Day '+dayOfWk+')';
  }
  const el=document.getElementById('twDayLabel');if(el)el.textContent=dateLabel+dayBadge;
  // Race countdown
  const raceEl=document.getElementById('twRaceCountdown');
  if(raceEl){
    // Priority: 1) user-confirmed raceDate  2) auto-detect from plan text  3) stored raceDate  4) startDate+weeks
    let raceD=null;
    if(plan.raceDate&&plan.raceDateConfirmed){raceD=new Date(plan.raceDate+'T00:00:00');}
    if(!raceD&&plan.text){
      const ad=detectRaceDateFromPlan(plan.text);
      if(ad){
        raceD=new Date(ad+'T00:00:00');
        // Silently save auto-detected date so it persists
        if(!plan.raceDateConfirmed&&plan.raceDate!==ad){
          plan.raceDate=ad;localStorage.setItem('current_training_plan',JSON.stringify(plan));
        }
      }
    }
    if(!raceD&&plan.raceDate){raceD=new Date(plan.raceDate+'T00:00:00');}
    if(!raceD&&plan.startDate&&plan.weeks){raceD=new Date(plan.startDate+'T00:00:00');raceD.setDate(raceD.getDate()+(plan.weeks*7));}
    if(raceD){
      // Always count from the real current date, not the browsed date
      const realD=new Date(dk(_realToday)+'T00:00:00');
      const daysToRace=Math.ceil((raceD-realD)/86400000);
      if(daysToRace>0){
        const raceDateStr=raceD.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        raceEl.textContent='🏁 '+daysToRace+' day'+(daysToRace!==1?'s':'')+' to race day ('+raceDateStr+')';
        raceEl.style.display='block';
      } else if(daysToRace===0){
        raceEl.textContent='🏁 Race day!';raceEl.style.display='block';
      } else {
        raceEl.style.display='none';
      }
    } else {raceEl.style.display='none';}
  }

  // ── Start-date setter row ───────────────────────────────────────────────
  const sdr=document.getElementById('twStartDateRow');
  const sdi=document.getElementById('twStartDateInput');
  if(sdr){
    if(!plan.startDate){
      sdr.style.display='block';
      if(sdi)sdi.value=dk(new Date());
    } else {
      sdr.style.display='none';
      // One-time auto-clear of stale caches when startDate is present
      const clearedKey='tw_caches_cleared_v2_'+plan.startDate;
      if(!localStorage.getItem(clearedKey)){
        const toRemove=[];
        for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('workout_cache_'))toRemove.push(k);}
        toRemove.forEach(k=>localStorage.removeItem(k));
        localStorage.setItem(clearedKey,'1');
      }
    }
  }

  // ── Collapsed state ─────────────────────────────────────────────────────
  if(localStorage.getItem('tw_collapsed')==='1'){
    const twB=document.getElementById('twBody');
    const twCBtn=document.getElementById('twCollapseBtn');
    if(twB)twB.style.display='none';
    if(twCBtn)twCBtn.innerHTML='&#x25B8;';
  }

  // ── Cache check ─────────────────────────────────────────────────────────
  const cacheKey='workout_cache_'+dk(today);
  let cached=localStorage.getItem(cacheKey);
  const twBodyEl=document.getElementById('twBody');
  const twBtn=document.getElementById('twLoadBtn');
  const plannedForDate=extractWorkoutFromActivePlan(plan,today);
  if(plannedForDate){
    cached=plannedForDate.replace(/^#+\s*/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/^---+$/gm,'').trim();
    localStorage.setItem(cacheKey,cached);
  }
  if(cached){
    // Stale cache detection: if cached text mentions a different month+day, purge it
    const viewMonDay=new Date(dk(today)+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'}).toLowerCase();
    const hasDate=/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i.test(cached);
    if(hasDate&&!cached.toLowerCase().includes(viewMonDay)){
      localStorage.removeItem(cacheKey);
      cached=null;
    }
  }
  if(cached){
    if(twBodyEl)twBodyEl.textContent=cached;
    if(twBtn)twBtn.style.display='none';
    updateDaysOut(plan);
    return;
  }

  // ── No cache: auto-fetch if AI key exists, else show button ─────────────
  const aiKey=journalAIKey();
  if(aiKey&&plan.startDate&&dayNum>=1){
    if(twBodyEl)twBodyEl.textContent='⏳ Loading workout…';
    if(twBtn)twBtn.style.display='none';
    loadTodayWorkout();
  } else {
    if(twBodyEl)twBodyEl.textContent='Tap “Load Workout” to see this day’s scheduled session.';
    if(twBtn){twBtn.style.display='inline-block';twBtn.disabled=false;twBtn.textContent='Load Workout';}
  }
  updateDaysOut(plan);
}
function detectRaceDateFromPlan(text){
  // Scan plan text for all "Month Day, Year" dates; find the latest.
  // If the latest entry mentions "race", use that date. Otherwise use latest+1 day (race day after last plan entry).
  const mo={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
  const re=/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(202\d)\b/gi;
  let latest=null,latestIsRace=false,m;
  while((m=re.exec(text))!==null){
    const d=new Date(parseInt(m[3]),mo[m[1].toLowerCase()]-1,parseInt(m[2]));
    const ctx=text.slice(Math.max(0,m.index-60),m.index+m[0].length+60).toLowerCase();
    const isRace=/\brace\b/.test(ctx);
    if(!latest||d>latest){latest=d;latestIsRace=isRace;}
    else if(isRace&&d.getTime()===latest.getTime()){latestIsRace=true;}
  }
  if(!latest)return null;
  if(!latestIsRace)latest.setDate(latest.getDate()+1); // race day is the day after last plan entry
  return latest.toISOString().slice(0,10);
}
function editWorkoutStartDate(){
  const sdr=document.getElementById('twStartDateRow');
  const sdi=document.getElementById('twStartDateInput');
  const rdi=document.getElementById('twRaceDateInput');
  if(!sdr)return;
  const raw=localStorage.getItem('current_training_plan');
  if(raw){
    const plan=JSON.parse(raw);
    if(sdi)sdi.value=plan.startDate||dk(new Date());
    if(rdi)rdi.value=plan.raceDate||'';
  }
  sdr.style.display=sdr.style.display==='none'?'block':'none';
}
function setWorkoutRaceDate(){
  const dateVal=(document.getElementById('twRaceDateInput')||{}).value||'';
  if(!dateVal){alert('Pick a race date first.');return;}
  const raw=localStorage.getItem('current_training_plan');
  if(!raw)return;
  const plan=JSON.parse(raw);
  plan.raceDate=dateVal;
  plan.raceDateConfirmed=true; // user explicitly set — takes priority over auto-detection
  // Update weeks if startDate known
  if(plan.startDate){
    const ms=new Date(dateVal+'T00:00:00')-new Date(plan.startDate+'T00:00:00');
    const w=Math.round(ms/(7*24*60*60*1000));
    if(w>0&&w<=52)plan.weeks=w;
  }
  localStorage.setItem('current_training_plan',JSON.stringify(plan));
  const sdr=document.getElementById('twStartDateRow');if(sdr)sdr.style.display='none';
  renderTrainingCard();
  renderJournalHome();
}
function setWorkoutStartDate(){
  const dateVal=(document.getElementById('twStartDateInput')||{}).value||'';
  if(!dateVal){alert('Pick a date first.');return;}
  const raw=localStorage.getItem('current_training_plan');
  if(!raw)return;
  const plan=JSON.parse(raw);
  plan.startDate=dateVal;
  if(plan.scheduleMode==='weekly')plan.schedule=buildUploadedTrainingSchedule(plan.text,dateVal,plan.weeks).schedule;
  localStorage.setItem('current_training_plan',JSON.stringify(plan));
  // Clear all old workout caches so they re-fetch with correct day numbers
  const keysToRemove=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('workout_cache_'))keysToRemove.push(k);}
  keysToRemove.forEach(k=>localStorage.removeItem(k));
  const sdr=document.getElementById('twStartDateRow');if(sdr)sdr.style.display='none';
  const body=document.getElementById('twBody');
  if(body)body.textContent='Start date saved ('+dateVal+'). Tap Load Workout to get the correct workout for each day.';
  const btn=document.getElementById('twLoadBtn');if(btn)btn.style.display='inline-block';
  renderJournalHome();
}
function refreshTodayWorkout(){
  // Clear cache for viewed day and auto-reload
  localStorage.removeItem('workout_cache_'+dk(today));
  const body=document.getElementById('twBody');
  if(body)body.textContent='⏳ Refreshing…';
  const btn=document.getElementById('twLoadBtn');
  if(btn)btn.style.display='none';
  renderJournalHome();
  loadTodayWorkout();
}
function toggleWorkoutCard(){
  const body=document.getElementById('twBody');
  const btn=document.getElementById('twCollapseBtn');
  if(!body)return;
  const isCollapsed=body.style.display==='none';
  body.style.display=isCollapsed?'block':'none';
  if(btn)btn.innerHTML=isCollapsed?'&#x25BE;':'&#x25B8;';
  localStorage.setItem('tw_collapsed',isCollapsed?'0':'1');
}
function updateDaysOut(plan){
  const created=plan.createdAt||'';
  const el=document.getElementById('twDaysOut');
  if(el&&created)el.textContent='Plan created: '+created;
}
// Extract workout by position (day number from plan start) — immune to date format mismatches
function extractWorkoutByPosition(planText, dayNum){
  if(!planText||dayNum<1)return null;
  const lines=planText.split('\n');
  const weekdayPat=/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const monthPat=/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i;
  // A day-header line: short, contains a weekday AND a month+day (avoids week-range headers)
  const hdrs=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i];
    if(weekdayPat.test(l)&&monthPat.test(l)&&l.trim().length<130)hdrs.push(i);
  }
  if(dayNum>hdrs.length)return null;
  const si=hdrs[dayNum-1];
  const ei=dayNum<hdrs.length?hdrs[dayNum]:Math.min(si+25,lines.length);
  return lines.slice(si,ei).join('\n').trim()||null;
}
function extractWorkoutSection(planText, targetDate){
  // Build date patterns to search for in the plan text
  const viewD=new Date(dk(targetDate)+'T00:00:00');
  const fmts=[
    viewD.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}),
    viewD.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    viewD.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}),
    viewD.toLocaleDateString('en-US',{month:'long',day:'numeric'}),
    dk(targetDate),
  ].map(f=>f.toLowerCase());

  const lines=planText.split('\n');
  let startIdx=-1;
  for(let i=0;i<lines.length;i++){
    const lower=lines[i].toLowerCase();
    if(fmts.some(f=>lower.includes(f))){startIdx=i;break;}
  }
  if(startIdx===-1)return null;

  // Collect lines until next date header
  const datePat=/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i;
  const result=[lines[startIdx]];
  for(let i=startIdx+1;i<Math.min(startIdx+20,lines.length);i++){
    const line=lines[i];
    // Stop when we hit a line containing a different date
    if(datePat.test(line)&&!fmts.some(f=>line.toLowerCase().includes(f)))break;
    result.push(line);
  }
  return result.join('\n').trim()||null;
}

// Shared lookup for Activities and My Schedule: exact date, then week/day, then position.
function extractWorkoutFromActivePlan(plan,targetDate,allowPosition){
  if(!plan||!plan.text||!targetDate)return null;
  var targetKey=dk(targetDate);
  if(plan.schedule&&Object.keys(plan.schedule).length){
    return Object.prototype.hasOwnProperty.call(plan.schedule,targetKey)?plan.schedule[targetKey]:'Rest Day / No workout scheduled.';
  }
  var exact=extractWorkoutSection(plan.text,targetDate);
  if(exact)return exact;
  var dayNum=0;
  if(plan.startDate)dayNum=Math.floor((new Date(dk(targetDate)+'T00:00:00')-new Date(plan.startDate+'T00:00:00'))/86400000)+1;
  if(dayNum<1)return null;
  var weekNum=Math.ceil(dayNum/7),weekday=targetDate.toLocaleDateString('en-US',{weekday:'long'}).toLowerCase(),weekdayShort=targetDate.toLocaleDateString('en-US',{weekday:'short'}).toLowerCase();
  var lines=String(plan.text).split(/\r?\n/),weekStart=-1,weekEnd=lines.length;
  var weekRe=new RegExp('\\bweek\\s*'+weekNum+'\\b','i');
  for(var i=0;i<lines.length;i++){if(weekRe.test(lines[i])){weekStart=i;break;}}
  if(weekStart>=0){
    for(var j=weekStart+1;j<lines.length;j++){if(/\bweek\s*\d+\b/i.test(lines[j])){weekEnd=j;break;}}
    var weekdays=/\b(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)\b/i,dayStart=-1;
    for(var k=weekStart+1;k<weekEnd;k++){var lowerLine=lines[k].toLowerCase();if(lowerLine.indexOf(weekday)>=0||new RegExp('\\b'+weekdayShort+'\\b','i').test(lowerLine)){dayStart=k;break;}}
    if(dayStart>=0){
      var dayEnd=weekEnd;
      for(var n=dayStart+1;n<weekEnd;n++){if(weekdays.test(lines[n])){dayEnd=n;break;}}
      var weekly=lines.slice(dayStart,dayEnd).join('\n').trim();
      if(weekly)return weekly;
    }
  }
  return allowPosition===false?null:extractWorkoutByPosition(plan.text,dayNum);
}

function loadTodayWorkout(){
  const raw=localStorage.getItem('current_training_plan');
  if(!raw){alert('No active training plan found. Generate a plan in the Activities tab first.');return;}
  const plan=JSON.parse(raw);
  const key=journalAIKey();
  if(!key){alert('Add your Anthropic API key in ⚙️ Settings first.');return;}
  const btn=document.getElementById('twLoadBtn');
  const body=document.getElementById('twBody');
  if(btn){btn.disabled=true;btn.textContent='⏳ Loading...';}

  // ── Step 0: Positional extraction — find Nth day entry by plan day number ─
  let _dayNumPos=0;
  if(plan.startDate){
    const _sd=new Date(plan.startDate+'T00:00:00');
    const _vd=new Date(dk(today)+'T00:00:00');
    _dayNumPos=Math.floor((_vd-_sd)/86400000)+1;
  }
  if(_dayNumPos>=1){
    const posResult=extractWorkoutFromActivePlan(plan,today);
    if(posResult){
      const cleaned=posResult
        .replace(/^#+\s*/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1')
        .replace(/\*([^*]+)\*/g,'$1').replace(/^---+$/gm,'').trim();
      if(btn){btn.disabled=false;btn.style.display='none';}
      if(body){body.textContent=cleaned;body.style.display='block';}
      localStorage.setItem('workout_cache_'+dk(today),cleaned);
      return;
    }
  }

  // ── Step 1: Try direct text extraction (no AI, exact date match) ─────────
  const extracted=extractWorkoutSection(plan.text,today);
  if(extracted){
    // Clean up markdown formatting for display
    const cleaned=extracted
      .replace(/^#+\s*/gm,'')          // remove ## headers
      .replace(/\*\*([^*]+)\*\*/g,'$1') // remove bold markers
      .replace(/\*([^*]+)\*/g,'$1')     // remove italic markers
      .replace(/^---+$/gm,'')           // remove horizontal rules
      .trim();
    // Check if this looks like a rest day
    const isRest=/rest\s*day|no\s*(scheduled\s*)?workout|recovery\s*day|off\s*day/i.test(cleaned);
    if(btn){btn.disabled=false;btn.style.display='none';}
    if(body){body.textContent=cleaned;body.style.display='block';}
    localStorage.setItem('workout_cache_'+dk(today),cleaned);
    return;
  }
  // ── Step 1b: Check if today is a rest/off day by week position ──────────
  // Scan plan text for today's weekday + "rest" without needing an exact date
  const todayName=today.toLocaleDateString('en-US',{weekday:'long'}).toLowerCase();
  const planLines=(plan.text||'').split('\n');
  for(let i=0;i<planLines.length;i++){
    const lower=planLines[i].toLowerCase();
    if(lower.includes(todayName)&&(/rest|off day|no run|recovery/.test(lower))){
      const msg='Rest Day / No workout scheduled for '+today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})+'.';
      if(btn){btn.disabled=false;btn.style.display='none';}
      if(body){body.textContent=msg;body.style.display='block';}
      localStorage.setItem('workout_cache_'+dk(today),msg);
      return;
    }
  }

  // ── Step 2: Fallback to AI if date not found in plan text ────────────────
  const viewDate=new Date(dk(today)+'T00:00:00');
  const fullDate=viewDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  let dayCtx='';
  if(plan.startDate){
    const startD=new Date(plan.startDate+'T00:00:00');
    const dayNum=Math.floor((viewDate-startD)/86400000)+1;
    if(dayNum>=1){
      const weekNum=Math.ceil(dayNum/7);
      const dayOfWk=((dayNum-1)%7)+1;
      dayCtx=' (Week '+weekNum+', Day '+dayOfWk+' — Day '+dayNum+' overall)';
    }
  }
  const prompt='Training plan:\n\n'+plan.text+'\n\nReturn ONLY the workout for: '+fullDate+dayCtx+'. Be concise — type, distance, pace, notes. If rest day say so.';
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1000,messages:[{role:'user',content:prompt}]})
  }).then(r=>r.json()).then(data=>{
    if(btn){btn.disabled=false;btn.style.display='none';}
    if(data.error){if(body)body.textContent='Error: '+data.error.message;return;}
    const text=(data.content[0].text||'').trim();
    if(body){body.textContent=text;body.style.display='block';}
    localStorage.setItem('workout_cache_'+dk(today),text);
  }).catch(err=>{
    if(btn){btn.disabled=false;btn.textContent='Load Workout';}
    if(body)body.textContent='Error: '+err.message;
  });
}
function load(){
  const raw=localStorage.getItem('planner_'+dk(today));
  const d=raw?JSON.parse(raw):{};
  // Update date display FIRST so navigation always feels responsive
  const _cdEl=document.getElementById('currentDate');
  if(_cdEl)_cdEl.textContent=fmtD(today);
  updateMobileWeekIndicator();
  updateMobileYearProgress();
  try{initTodayWorkoutCard();}catch(e){console.error('initTodayWorkoutCard:',e);}
  try{
    // Tri-state checkboxes
    document.querySelectorAll('.tri-check').forEach(el=>{if(el.dataset.key)applyTriState(el,d[el.dataset.key]||'');});
    updateCompactSectionCounts();
    // Restore priority done state
    PTIDS.forEach(id=>{
      const row=document.getElementById(id);
      if(row){
        const el=row.querySelector('.tri-check');
        if(el)row.classList.toggle('done',el.dataset.state==='green');
        const tx=row.querySelector('input[type=text]');
        if(tx)tx.value=d[id+'t']||'';
      }
    });
    // Plain review checkbox
    const rc=document.getElementById('reviewCheck');if(rc)rc.checked=!!d.reviewCheck;
    const pjc=document.getElementById('prepJournalCheck');if(pjc)pjc.checked=!!d.prepJournalCheck;
    // Text fields
    TXS.forEach(id=>{const e=document.getElementById(id);if(e)e.value=d[id]||'';});
    NMS.forEach(id=>{const e=document.getElementById(id);if(e)e.value=d[id]||'';});
    const dailyMassage=document.getElementById('dailyMassageMinutes');if(dailyMassage)dailyMassage.value=d.exMassageMinutes||'';
    const jcEl=document.getElementById('jCombined');if(jcEl)jcEl.value=buildJournalCombined();
    waterOz=d.waterOz||(d.waterCount?d.waterCount*8:0);updateWaterDisplay();
    scoreVal=d.score||0;buildStars();
  }catch(e){console.error('load fields:',e);}
  attachListeners();
  attachAllFieldUndos();
  window._foodLog=Array.isArray(d.foodLog)?d.foodLog:[];
  // Migrate old food_YYYY-MM-DD storage format if new format is empty
  if(!window._foodLog.length){
    var oldFoodRaw=localStorage.getItem('food_'+dk(today));
    if(oldFoodRaw){
      try{
        var oldItems=JSON.parse(oldFoodRaw);
        if(Array.isArray(oldItems)&&oldItems.length){
          window._foodLog=oldItems.map(function(it,i){
            if(!it.id)it.id='f'+Date.now()+'_'+i;
            return it;
          });
          save(); // persist in new location
          localStorage.removeItem('food_'+dk(today)); // clean up old key
        }
      }catch(e){}
    }
  }
  renderFoodItems();
  try{renderStreaks();}catch(e){console.error('renderStreaks:',e);}
  // Restore nutrition card state
  (function(){
    var mpBody=document.getElementById('mpBody');
    var nutrBody=document.getElementById('nutrBody');
    if(mpBody){
      var mpOpen=localStorage.getItem('mp_open');
      if(mpOpen==='0'){mpBody.style.display='none';var chev=mpBody.previousElementSibling&&mpBody.previousElementSibling.querySelector('.mp-chev');if(chev)chev.textContent='▸';}
    }
    if(nutrBody){
      var nuOpen=localStorage.getItem('nu_open');
      if(nuOpen==='0'){nutrBody.style.display='none';var chev2=nutrBody.previousElementSibling&&nutrBody.previousElementSibling.querySelector('.nu-chev');if(chev2)chev2.textContent='▸';}
    }
  })();
  renderJournalHome();
  // Daily checkmarks are now fully restored; refresh linked schedule counts once more.
  setTimeout(renderJournalSchedule,0);
  refreshJournalNavStatus();
  try{initHandwritingPad();}catch(e){console.error('handwriting pad:',e);}
  var calendar=document.getElementById('journalCalendar');
  if(calendar&&calendar.open){journalCalendarMonth=new Date(today.getFullYear(),today.getMonth(),1);renderJournalCalendar();}
  renderMyCalendarEventsForSelectedDay();
}

function attachListeners(){
  const rc=document.getElementById('reviewCheck');if(rc)rc.onchange=save;
  const pjc=document.getElementById('prepJournalCheck');if(pjc)pjc.onchange=save;
  TXS.forEach(id=>{const e=document.getElementById(id);if(e)e.oninput=function(){save();if(id==='gaAudiobookTime')renderJournalSchedule();};});
  NMS.forEach(id=>{const e=document.getElementById(id);if(e)e.oninput=function(){if(id==='exMassageMinutes'){syncMassageMinutes('activities');return;}save();if(id==='exSteps')renderDailyCheckOverview();if(id==='gaFinancialVideosTime')renderJournalSchedule();};});
  PTIDS.forEach(id=>{const row=document.getElementById(id);if(row){const tx=row.querySelector('input[type=text]');if(tx)tx.oninput=save;}});
  const jc=document.getElementById('jCombined');if(jc)jc.oninput=function(){syncJournalCombinedToFields();save();};
  // spDailyBreadText also doubles as the Scripture Focus verse field — keep
  // meditScriptureDisplay + the medit_scripture cache in sync as the user types.
  const sdb=document.getElementById('spDailyBreadText');
  if(sdb)sdb.oninput=function(){
    localStorage.setItem('medit_scripture',this.value);
    const disp=document.getElementById('meditScriptureDisplay');
    if(disp)disp.textContent=this.value||'“Be still, and know that I am God.” — Psalm 46:10';
    save();
  };
}

// ── Merged Journal block (Accomplishments/Improvements/Gratitude/Ideas) ──
const JOURNAL_HEADERS=[
  {key:'jAccomplish',label:'🏆 Accomplishments:'},
  {key:'jImprov',label:'💡 Improvements:'},
  {key:'jGratitude',label:'🙏 Gratitude:'},
  {key:'jNotes',label:'📝 Ideas:'}
];
function buildJournalCombined(){
  return JOURNAL_HEADERS.map(function(h){
    const el=document.getElementById(h.key);
    return h.label+'\n'+((el&&el.value)||'');
  }).join('\n\n');
}
function syncJournalCombinedToFields(){
  const jc=document.getElementById('jCombined');if(!jc)return;
  const lines=(jc.value||'').split('\n');
  const sections={};JOURNAL_HEADERS.forEach(function(h){sections[h.key]='';});
  let current=null,buf=[];
  function flush(){if(current)sections[current]=buf.join('\n').replace(/^\n+|\n+$/g,'');buf=[];}
  lines.forEach(function(line){
    const hit=JOURNAL_HEADERS.find(function(h){return line.trim()===h.label.trim();});
    if(hit){flush();current=hit.key;}
    else if(current){buf.push(line);}
  });
  flush();
  JOURNAL_HEADERS.forEach(function(h){const el=document.getElementById(h.key);if(el)el.value=sections[h.key];});
}

var handwritingStrokes=[],handwritingCurrent=null,handwritingTool='pen',handwritingColor='#1f2937',handwritingWidth=4,handwritingReady=false;
function handwritingStorageKey(){return'handwriting_'+dk(today);}
function handwritingSetTool(tool){
  handwritingTool=tool==='eraser'?'eraser':'pen';
  var pen=document.getElementById('handwritingPenBtn'),eraser=document.getElementById('handwritingEraserBtn');
  if(pen)pen.classList.toggle('active',handwritingTool==='pen');
  if(eraser)eraser.classList.toggle('active',handwritingTool==='eraser');
}
function handwritingSetColor(color){handwritingColor=color||'#1f2937';handwritingSetTool('pen');}
function handwritingSetWidth(width){handwritingWidth=Math.max(1,parseFloat(width)||4);}
function handwritingPoint(canvas,event){
  var r=canvas.getBoundingClientRect();
  return{x:(event.clientX-r.left)/r.width,y:(event.clientY-r.top)/r.height,p:event.pressure&&event.pressure>0?event.pressure:.55};
}
function drawHandwritingStroke(ctx,stroke){
  if(!stroke||!stroke.points||stroke.points.length<1)return;
  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';
  ctx.strokeStyle=stroke.color||'#1f2937';
  ctx.lineWidth=stroke.tool==='eraser'?Math.max(22,(stroke.width||4)*5):(stroke.width||4);
  var first=stroke.points[0];ctx.beginPath();ctx.moveTo(first.x*ctx.canvas.width,first.y*ctx.canvas.height);
  for(var i=1;i<stroke.points.length;i++){var point=stroke.points[i];ctx.lineTo(point.x*ctx.canvas.width,point.y*ctx.canvas.height);}
  if(stroke.points.length===1)ctx.lineTo(first.x*ctx.canvas.width+.1,first.y*ctx.canvas.height+.1);
  ctx.stroke();ctx.restore();
}
function redrawHandwriting(){
  var canvas=document.getElementById('handwritingCanvas');if(!canvas)return;
  var ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  handwritingStrokes.forEach(function(stroke){drawHandwritingStroke(ctx,stroke);});
}
function initHandwritingPad(){
  var canvas=document.getElementById('handwritingCanvas');if(!canvas)return;
  if(!handwritingReady){
    handwritingReady=true;
    canvas.addEventListener('pointerdown',function(event){
      event.preventDefault();canvas.setPointerCapture(event.pointerId);
      handwritingCurrent={tool:handwritingTool,color:handwritingColor,width:handwritingWidth,points:[handwritingPoint(canvas,event)]};
      handwritingStrokes.push(handwritingCurrent);redrawHandwriting();
    });
    canvas.addEventListener('pointermove',function(event){
      if(!handwritingCurrent)return;event.preventDefault();
      handwritingCurrent.points.push(handwritingPoint(canvas,event));redrawHandwriting();
    });
    function finish(event){
      if(!handwritingCurrent)return;
      if(event)event.preventDefault();handwritingCurrent=null;saveHandwritingNotes(false);
    }
    canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  }
  loadHandwritingNotes();
}
function loadHandwritingNotes(){
  var raw=localStorage.getItem(handwritingStorageKey());
  try{handwritingStrokes=raw?JSON.parse(raw):[];if(!Array.isArray(handwritingStrokes))handwritingStrokes=[];}catch(e){handwritingStrokes=[];}
  redrawHandwriting();
  var label=document.getElementById('handwritingSavedLabel');
  if(label)label.textContent=handwritingStrokes.length?'Notes saved for this date':'Stylus ready';
}
function saveHandwritingNotes(showConfirmation){
  localStorage.setItem(handwritingStorageKey(),JSON.stringify(handwritingStrokes));
  var label=document.getElementById('handwritingSavedLabel');
  if(label){label.textContent=showConfirmation?'Saved now':'Saved';setTimeout(function(){if(label)label.textContent='Notes saved for this date';},1300);}
}
function clearHandwritingNotes(){
  if(handwritingStrokes.length&&!confirm('Clear the handwritten notes for '+fmtD(today)+'?'))return;
  handwritingStrokes=[];localStorage.removeItem(handwritingStorageKey());redrawHandwriting();
  var label=document.getElementById('handwritingSavedLabel');if(label)label.textContent='Stylus ready';
}

// Self-contained events for the Daily screen calendar — stored locally (and synced through
// the same cloud backup as everything else), so there's no external OAuth to reconnect.
function journalCalendarEventsAll(){
  try{var raw=localStorage.getItem('journal_calendar_events');var arr=raw?JSON.parse(raw):[];return Array.isArray(arr)?arr:[];}catch(e){return[];}
}
function journalTrainingCalendarLabel(section){
  var text=String(section||''),labels=[[/\blong\s+run\b/i,'Long Run'],[/\b(intervals?|repeats?|speed\s*work)\b/i,'Interval Run'],[/\btempo\s+run\b|\bthreshold\b/i,'Tempo Run'],[/\brecovery\s+run\b/i,'Recovery Run'],[/\beasy\s+run\b/i,'Easy Run'],[/\bprogression\s+run\b/i,'Progression Run'],[/\brace\b/i,'Race'],[/\brun\b/i,'Scheduled Run']];
  for(var i=0;i<labels.length;i++)if(labels[i][0].test(text))return labels[i][1];
  return /\b\d+(?:\.\d+)?\s*(?:mi|miles?|km)\b/i.test(text)?'Scheduled Run':'';
}
function journalTrainingCalendarEvents(){
  var plan=null;try{plan=JSON.parse(localStorage.getItem('current_training_plan')||'null');}catch(ignore){}if(!plan||!plan.text||!plan.startDate)return[];
  var schedule=plan.schedule&&Object.keys(plan.schedule).length?plan.schedule:buildUploadedTrainingSchedule(plan.text,plan.startDate,plan.weeks||1).schedule;
  return Object.keys(schedule||{}).map(function(date){var section=String(schedule[date]||''),label=journalTrainingCalendarLabel(section),hasRunWords=/\b(run|race|intervals?|repeats?|speed\s*work|tempo|threshold|recovery|progression)\b/i.test(section);if(!label||/\b(rest\s*day|no\s+(?:workout|run))\b/i.test(section)||(/\bwalk(?:ing)?\b/i.test(section)&&!hasRunWords)||(/\b(strength|cross[- ]training)\b/i.test(section)&&!hasRunWords))return null;var detail=section.split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean).slice(0,3).join(' · ');return{id:'training-plan-'+date,date:date,time:'',title:label,note:detail+' · Add the start time in My Schedule',noReminder:true,trainingPlan:true};}).filter(Boolean);
}
function journalGrowthHabitCalendarInfo(habit){
  var source=String(habit.autoSource||'').toLowerCase(),name=String(habit.name||'').toLowerCase();
  if(source==='retirement-videos'||/financial\s+videos?/.test(name))return{kind:'financial',label:'Financial Videos'};
  if(source==='library'||/audiobook|read\s+or\s+listen/.test(name))return{kind:'reading',label:'Audiobook'};
  if(source==='udemy'||/udemy/.test(name))return{kind:'udemy',label:'Udemy'};
  if(/gun\s*range/.test(name))return{kind:'gun',label:'Gun Range'};
  if(source==='language'||/language/.test(name))return{kind:'language',label:'Language Practice'};
  if(/guitar/.test(name))return{kind:'guitar',label:'Guitar'};
  return null;
}
function journalGrowthHabitDueDays(habit,info){
  if(habit.schedule==='daily')return[0,1,2,3,4,5,6];
  if(habit.schedule==='weekdays')return[1,2,3,4,5];
  if(habit.schedule==='custom'&&Array.isArray(habit.days)&&habit.days.length)return habit.days.map(Number);
  if(info.kind==='financial')return[1,3,5];
  var target=Math.max(1,Math.min(7,Number(habit.weeklyTarget||1))),patterns={1:[3],2:[2,5],3:[1,3,5],4:[1,2,4,6],5:[1,2,3,4,5],6:[1,2,3,4,5,6],7:[0,1,2,3,4,5,6]};return patterns[target];
}
function journalGrowthHabitKindsForDate(dateKey){
  var state=null;try{state=h2State();}catch(ignore){}if(!state||!Array.isArray(state.habits))return[];
  var date=new Date(dateKey+'T00:00:00'),day=date.getDay(),kinds=[];
  state.habits.forEach(function(habit){
    if(!habit||habit.archived)return;var info=journalGrowthHabitCalendarInfo(habit);if(!info)return;
    if(journalGrowthHabitDueDays(habit,info).indexOf(day)!==-1&&kinds.indexOf(info.kind)===-1)kinds.push(info.kind);
  });
  return kinds;
}
function journalGrowthHabitCalendarEvents(){
  var state=null;try{state=h2State();}catch(ignore){}if(!state||!Array.isArray(state.habits))return[];
  var habits=state.habits.filter(function(h){return h&&!h.archived&&journalGrowthHabitCalendarInfo(h);}),now=new Date(),start=new Date(now.getFullYear()-1,0,1),end=new Date(now.getFullYear()+1,11,31),events=[];
  for(var date=new Date(start);date<=end;date.setDate(date.getDate()+1)){
    habits.forEach(function(habit){var info=journalGrowthHabitCalendarInfo(habit),dueDays=journalGrowthHabitDueDays(habit,info);if(dueDays.indexOf(date.getDay())===-1)return;var dateKey=journalCalendarRealDateKey(date);events.push({id:'growth-habit-'+habit.id+'-'+dateKey,date:dateKey,time:'',title:info.label,note:'Scheduled from the Habits section · Add the start time in My Schedule',noReminder:true,habitGrowth:true,growthKind:info.kind});});
  }
  return events;
}
function journalMoneyCalendarEvents(){
  var money=null;try{money=JSON.parse(localStorage.getItem('meridian_money_data_v5')||'null');}catch(ignore){}
  if(!money)return[];
  var now=new Date(),startYear=now.getFullYear()-1,endYear=now.getFullYear()+1,events=[];
  function amountText(value){var amount=Number(value);return Number.isFinite(amount)?amount.toLocaleString('en-US',{style:'currency',currency:'USD'}):'';}
  function addEvent(sourceType,item,year,month,day){
    var lastDay=new Date(year,month,0).getDate(),safeDay=Math.max(1,Math.min(lastDay,Number(day)||1));
    var dateKey=year+'-'+String(month).padStart(2,'0')+'-'+String(safeDay).padStart(2,'0'),amount=amountText(item.amount),monthKey=year+'-'+String(month).padStart(2,'0');
    var paid=!!(money.paidBills&&money.paidBills[monthKey]&&money.paidBills[monthKey][item.id]);
    events.push({id:'money-'+sourceType+'-'+item.id+'-'+dateKey,date:dateKey,time:'',title:(item.merchant||'Money event')+(amount?' — '+amount:''),note:(paid?'Paid · ':'Due · ')+(item.category||sourceType),noReminder:true,moneyEvent:true});
  }
  function subscriptionDue(item,year,month){
    var cadence=item.cadence||'Monthly';if(cadence==='Monthly')return true;
    var history=Array.isArray(item.priceHistory)?item.priceHistory:[],last=history.length?history[history.length-1].date:'';
    if(!last)return true;
    var parts=String(last).split('-').map(Number),interval=cadence==='Quarterly'?3:cadence==='Semi-Annual'?6:12,diff=(year-parts[0])*12+(month-parts[1]);
    return ((diff%interval)+interval)%interval===0;
  }
  for(var year=startYear;year<=endYear;year++)for(var month=1;month<=12;month++){
    (money.recurringBills||[]).forEach(function(item){if(item&&item.id)addEvent('bill',item,year,month,item.dayOfMonth);});
    (money.subscriptions||[]).forEach(function(item){if(item&&item.id&&item.active!==false&&subscriptionDue(item,year,month))addEvent('subscription',item,year,month,item.dayOfMonth);});
  }
  (money.transactions||[]).forEach(function(item){
    if(!item||item.category!=='Income'||!/^\d{4}-\d{2}-\d{2}$/.test(String(item.date||'')))return;
    var year=Number(item.date.slice(0,4));if(year<startYear||year>endYear)return;
    events.push({id:'money-income-'+item.id,date:item.date,time:'',title:(item.merchant||'Income')+' — '+amountText(Math.abs(Number(item.amount)||0)),note:'Income · Michael & Cynthia\'s Money',noReminder:true,moneyEvent:true});
  });
  return events;
}
function journalCalendarCombinedEvents(){return journalCalendarEventsAll().concat(journalTrainingCalendarEvents(),journalGrowthHabitCalendarEvents(),journalMoneyCalendarEvents());}
function journalCalendarEventsSave(list){
  try{localStorage.setItem('journal_calendar_events',JSON.stringify(list));}catch(e){alert('This event could not be saved — device storage may be full.');}
}
function journalFormatEventTime(t){
  var m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return t||'';
  var h=parseInt(m[1],10),min=m[2],ap=h>=12?'PM':'AM',h12=h%12;if(h12===0)h12=12;
  return h12+':'+min+' '+ap;
}
function decorateMyCalendarEvents(){
  var events=journalCalendarCombinedEvents();
  var dates=new Set(events.map(function(ev){return ev.date;}));
  document.querySelectorAll('#journalCalendarGrid .journal-calendar-day').forEach(function(button){
    var existingDot=button.querySelector('.my-calendar-dot'),hasEvent=dates.has(button.getAttribute('data-date'));
    if(hasEvent&&!existingDot)button.insertAdjacentHTML('beforeend','<span class="my-calendar-dot" title="Event scheduled"></span>');
    else if(!hasEvent&&existingDot)existingDot.remove();
  });
  renderMyCalendarEventsForSelectedDay();
}
var journalCalendarMovingId=null,journalCalendarEditingId=null;
function renderMyCalendarEventsForSelectedDay(){
  var wrap=document.getElementById('myCalendarEvents');if(!wrap)return;
  var selected=dk(today);
  var label=document.getElementById('myCalendarEventDateLabel');if(label)label.textContent=today.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  var events=journalCalendarCombinedEvents().filter(function(ev){return ev.date===selected;}).sort(function(a,b){return(a.time||'99:99').localeCompare(b.time||'99:99');});
  if(!events.length){
    wrap.innerHTML='<div class="my-calendar-empty">No events for '+today.toLocaleDateString('en-US',{month:'short',day:'numeric'})+'.</div>';
    return;
  }
  wrap.innerHTML=events.map(function(ev){
    var moveRow=journalCalendarMovingId===ev.id?('<div class="my-calendar-move-row"><input type="date" id="moveDateInput_'+ev.id+'" value="'+escHtml(ev.date)+'" class="my-calendar-input"><button type="button" onclick="event.stopPropagation();confirmMoveCalendarEvent(\''+ev.id+'\')">Move</button><button type="button" onclick="event.stopPropagation();cancelMoveCalendarEvent()" style="background:#f0f0f0;color:#555;border-color:#ccc;">Cancel</button></div>'):'';
    var reminder=Number(ev.reminderMinutes||0),reminderText=reminder===0?'Reminder at event time':reminder===60?'Reminder 1 hour before':reminder===1440?'Reminder 1 day before':'Reminder '+reminder+' minutes before';
    var linkedBadge=ev.trainingPlan?'<span style="display:inline-block;margin-top:3px;margin-right:7px;color:#166534;font-size:.66rem;font-weight:800;">&#x1F3C3; Training Plan</span>':ev.habitGrowth?'<span style="display:inline-block;margin-top:3px;margin-right:7px;color:#7e22ce;font-size:.66rem;font-weight:800;">&#x1F4C8; Growth Habit</span>':ev.moneyEvent?'<a href="budget-tracker.html" onclick="event.stopPropagation();" style="display:inline-block;margin-top:3px;margin-right:7px;color:#047857;font-size:.66rem;font-weight:800;text-decoration:none;">&#x1F4B5; Open in Money</a>':'';
    var actions=(ev.trainingPlan||ev.habitGrowth||ev.moneyEvent)?'':'<button type="button" class="move-btn" onclick="event.stopPropagation();startEditCalendarEvent(\''+ev.id+'\')" title="Edit event">&#x270F;&#xFE0F;</button><button type="button" class="move-btn" onclick="event.stopPropagation();startMoveCalendarEvent(\''+ev.id+'\')" title="Move to another day">&#x1F4C5;</button><button type="button" onclick="event.stopPropagation();deleteCalendarEvent(\''+ev.id+'\')" title="Delete">&#x2715;</button>';
    var reminderMarkup=(ev.noReminder||!ev.time)?'':'<span class="my-calendar-reminder-label">&#x1F514; '+reminderText+'</span>';
    return'<div class="my-calendar-event"><span class="my-calendar-event-time">'+escHtml(ev.time?journalFormatEventTime(ev.time):'All day')+'</span><span style="flex:1;">'+escHtml(ev.title||'Untitled event')+(ev.note?'<div style="color:#667085;margin-top:2px;">'+escHtml(ev.note)+'</div>':'')+linkedBadge+reminderMarkup+moveRow+'</span>'+actions+'</div>';
  }).join('');
}
function startMoveCalendarEvent(id){journalCalendarMovingId=id;renderMyCalendarEventsForSelectedDay();}
function cancelMoveCalendarEvent(){journalCalendarMovingId=null;renderMyCalendarEventsForSelectedDay();}
function confirmMoveCalendarEvent(id){
  var input=document.getElementById('moveDateInput_'+id);
  if(!input||!input.value){alert('Choose a date to move this to.');return;}
  var events=journalCalendarEventsAll(),ev=events.find(function(e){return e.id===id;});
  if(!ev)return;
  ev.date=input.value;
  journalCalendarEventsSave(events);
  journalCalendarMovingId=null;
  decorateMyCalendarEvents();
}
function resetCalendarEventForm(){
  var titleEl=document.getElementById('myCalendarEventTitle'),timeEl=document.getElementById('myCalendarEventTime'),noteEl=document.getElementById('myCalendarEventNote'),reminderEl=document.getElementById('myCalendarEventReminder'),saveButton=document.getElementById('myCalendarEventSaveButton');
  journalCalendarEditingId=null;if(titleEl)titleEl.value='';if(timeEl)timeEl.value='';if(noteEl)noteEl.value='';if(reminderEl){reminderEl.value='-1';reminderEl.disabled=true;}if(saveButton)saveButton.textContent='Save';
}
function startEditCalendarEvent(id){
  var ev=journalCalendarEventsAll().find(function(item){return item.id===id;});if(!ev)return;
  journalCalendarEditingId=id;journalCalendarMovingId=null;
  var form=document.getElementById('myCalendarEventForm'),titleEl=document.getElementById('myCalendarEventTitle'),timeEl=document.getElementById('myCalendarEventTime'),noteEl=document.getElementById('myCalendarEventNote'),reminderEl=document.getElementById('myCalendarEventReminder'),saveButton=document.getElementById('myCalendarEventSaveButton');
  if(form)form.style.display='flex';if(titleEl)titleEl.value=ev.title||'';if(timeEl)timeEl.value=ev.time||'';if(noteEl)noteEl.value=ev.note||'';
  syncCalendarReminderAvailability();if(reminderEl&&ev.time)reminderEl.value=ev.noReminder?'-1':String(Number(ev.reminderMinutes||0));if(saveButton)saveButton.textContent='Update';
  setTimeout(function(){if(titleEl){titleEl.focus();titleEl.select();}},50);
}
function toggleAddCalendarEvent(show){
  var form=document.getElementById('myCalendarEventForm');if(!form)return;
  var next=show===undefined?form.style.display==='none':show;
  if(!next)resetCalendarEventForm();
  form.style.display=next?'flex':'none';
  if(next)setTimeout(function(){var t=document.getElementById('myCalendarEventTitle');if(t)t.focus();syncCalendarReminderAvailability();},50);
}
function syncCalendarReminderAvailability(){
  var timeEl=document.getElementById('myCalendarEventTime'),reminderEl=document.getElementById('myCalendarEventReminder');if(!reminderEl)return;
  var hasTime=!!(timeEl&&timeEl.value);reminderEl.disabled=!hasTime;
  if(!hasTime){reminderEl.value='-1';reminderEl.title='Add an event time to enable a popup reminder';}
  else{if(reminderEl.value==='-1')reminderEl.value='60';reminderEl.title='Choose one popup reminder before this timed event';}
}
function saveCalendarEvent(){
  var titleEl=document.getElementById('myCalendarEventTitle'),timeEl=document.getElementById('myCalendarEventTime'),noteEl=document.getElementById('myCalendarEventNote'),reminderEl=document.getElementById('myCalendarEventReminder');
  var title=(titleEl&&titleEl.value||'').trim();
  if(!title){alert('Please enter an event title.');return;}
  var events=journalCalendarEventsAll();
  var eventTime=timeEl?timeEl.value:'',reminderMinutes=eventTime?Number(reminderEl&&reminderEl.value||60):-1;
  var patch={time:eventTime,title:title,note:(noteEl&&noteEl.value||'').trim(),reminderMinutes:reminderMinutes,noReminder:!eventTime||reminderMinutes<0};
  if(journalCalendarEditingId){events=events.map(function(ev){return ev.id===journalCalendarEditingId?Object.assign({},ev,patch):ev;});}
  else events.push(Object.assign({id:'ev-'+Date.now(),date:dk(today)},patch));
  journalCalendarEventsSave(events);
  toggleAddCalendarEvent(false);
  decorateMyCalendarEvents();
  checkCalendarReminders();
}
function deleteCalendarEvent(id){
  if(!confirm('Delete this event?'))return;
  var events=journalCalendarEventsAll().filter(function(ev){return ev.id!==id;});
  journalCalendarEventsSave(events);
  decorateMyCalendarEvents();
}
var journalCalendarReminderQueue=[];
function journalCalendarRealDateKey(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
function journalCalendarReminderSeenKey(ev){return'journal_calendar_reminder_seen_'+ev.id+'_'+ev.date+'_'+(ev.time||'all-day')+'_'+Number(ev.reminderMinutes||0);}
function showCalendarReminder(ev){
  var overlay=document.getElementById('calendarReminderOverlay');if(!overlay)return;
  var title=document.getElementById('calendarReminderTitle'),time=document.getElementById('calendarReminderTime'),note=document.getElementById('calendarReminderNote');
  if(title)title.textContent=ev.title||'Calendar event';
  if(time){var eventDate=ev.date?new Date(ev.date+'T12:00:00'):null,timePrefix=eventDate&&!isNaN(eventDate)?eventDate.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · ':'';time.textContent=timePrefix+(ev.time?journalFormatEventTime(ev.time):'All-day event');}
  if(note){note.textContent=ev.note||'Your calendar event is coming up.';note.style.display='block';}
  overlay.style.display='flex';
}
function dismissCalendarReminder(){
  var overlay=document.getElementById('calendarReminderOverlay');if(overlay)overlay.style.display='none';
  if(journalCalendarReminderQueue.length)showCalendarReminder(journalCalendarReminderQueue.shift());
}
function testCalendarReminderPopup(){showCalendarReminder({title:'Calendar reminders are working',time:'',note:'This is how your event reminder will appear on your phone.'});}
function checkCalendarReminders(){
  var overlay=document.getElementById('calendarReminderOverlay');if(!overlay||overlay.style.display==='flex')return;
  var now=new Date(),due=[];
  journalCalendarCombinedEvents().filter(function(ev){return!ev.noReminder&&ev.time&&ev.date;}).forEach(function(ev){
    var dateParts=String(ev.date).split('-'),parts=String(ev.time).split(':'),eventAt=new Date(Number(dateParts[0]),Number(dateParts[1])-1,Number(dateParts[2]),Number(parts[0]||0),Number(parts[1]||0),0,0),reminderAt=new Date(eventAt.getTime()-Number(ev.reminderMinutes||0)*60000),seenKey=journalCalendarReminderSeenKey(ev);
    if(now>=reminderAt&&now<=new Date(eventAt.getTime()+10*60000)&&localStorage.getItem(seenKey)!=='1'){localStorage.setItem(seenKey,'1');due.push({event:ev,time:reminderAt.getTime()});}
  });
  due.sort(function(a,b){return a.time-b.time;});
  if(due.length){journalCalendarReminderQueue=due.slice(1).map(function(item){return item.event;});showCalendarReminder(due[0].event);}
}

// Import from another calendar via an exported .ics file (Google Calendar, Outlook, Apple
// Calendar, etc. all support "Export" to this format). This is a one-time snapshot import,
// not a live sync — no account connection needed, so nothing to reconnect later.
function journalUnfoldICS(text){
  return String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').reduce(function(lines,line){
    if(/^[ \t]/.test(line)&&lines.length)lines[lines.length-1]+=line.slice(1);
    else lines.push(line);
    return lines;
  },[]);
}
function journalUnescapeICSText(s){
  return String(s||'').replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');
}
function journalParseICSDate(value){
  var m=String(value||'').trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if(!m)return null;
  var y=+m[1],mo=+m[2],da=+m[3];
  if(!m[4])return{date:y+'-'+String(mo).padStart(2,'0')+'-'+String(da).padStart(2,'0'),time:''};
  var hh=+m[4],mi=+m[5];
  if(m[7]==='Z'){
    var d=new Date(Date.UTC(y,mo-1,da,hh,mi,0));
    return{date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),time:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
  }
  return{date:y+'-'+String(mo).padStart(2,'0')+'-'+String(da).padStart(2,'0'),time:String(hh).padStart(2,'0')+':'+String(mi).padStart(2,'0')};
}
function journalParseICS(text){
  var lines=journalUnfoldICS(text),events=[],cur=null;
  lines.forEach(function(line){
    if(/^BEGIN:VEVENT/i.test(line)){cur={};return;}
    if(/^END:VEVENT/i.test(line)){if(cur)events.push(cur);cur=null;return;}
    if(!cur)return;
    var idx=line.indexOf(':');if(idx===-1)return;
    var key=line.slice(0,idx),val=line.slice(idx+1),name=key.split(';')[0].toUpperCase();
    if(name==='SUMMARY')cur.summary=journalUnescapeICSText(val);
    else if(name==='DESCRIPTION')cur.description=journalUnescapeICSText(val);
    else if(name==='LOCATION')cur.location=journalUnescapeICSText(val);
    else if(name==='UID')cur.uid=val.trim();
    else if(name==='DTSTART')cur.dtstart=journalParseICSDate(val);
  });
  return events;
}
function importCalendarICS(ev){
  var file=ev.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var parsed=journalParseICS(e.target.result).filter(function(v){return v.dtstart&&v.dtstart.date;});
      if(!parsed.length){alert('No events could be read from this file. Make sure it is a .ics calendar export.');ev.target.value='';return;}
      var existing=journalCalendarEventsAll();
      var existingKeys=new Set(existing.map(function(x){return(x.importUid||'')+'|'+x.date+'|'+x.title;}));
      var added=0;
      parsed.forEach(function(v){
        var title=v.summary||'Untitled event';
        var key=(v.uid||'')+'|'+v.dtstart.date+'|'+title;
        if(existingKeys.has(key))return;
        existingKeys.add(key);
        existing.push({id:'ev-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),date:v.dtstart.date,time:v.dtstart.time||'',title:title,note:v.location||v.description||'',importUid:v.uid||''});
        added++;
      });
      journalCalendarEventsSave(existing);
      decorateMyCalendarEvents();
      var skipped=parsed.length-added;
      alert('Imported '+added+' event'+(added===1?'':'s')+(skipped?' ('+skipped+' duplicate'+(skipped===1?'':'s')+' skipped)':'')+'.');
    }catch(err){alert('This calendar file could not be read: '+err.message);}
    ev.target.value='';
  };
  reader.readAsText(file);
}

var journalCalendarMonth=null;
function openJournalCalendar(){
  journalCalendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
  renderJournalCalendar();
}
function shiftJournalCalendar(amount){
  if(!journalCalendarMonth)journalCalendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
  journalCalendarMonth.setMonth(journalCalendarMonth.getMonth()+amount);
  renderJournalCalendar();
}
function journalCalendarStatus(dateKey,activityDates){
  var raw=localStorage.getItem('planner_'+dateKey);
  var hasOther=!!localStorage.getItem('bible_'+dateKey)||!!localStorage.getItem('handwriting_'+dateKey)||activityDates.has(dateKey);
  if(!raw)return hasOther?'saved':'';
  var data={};try{data=JSON.parse(raw)||{};}catch(e){}
  var states=Object.keys(data).map(function(key){return data[key];}).filter(function(value){return['green','red','purple','black'].indexOf(value)>=0;});
  var hasMeaningful=Object.keys(data).some(function(key){var value=data[key];return value!==''&&value!==false&&value!==0&&value!=null;});
  if(states.length&&states.every(function(value){return value==='green'||value==='black';})&&states.some(function(value){return value==='green';}))return'complete';
  if(states.some(function(value){return value==='green'||value==='purple';}))return'partial';
  return hasMeaningful||hasOther?'saved':'';
}
function renderJournalCalendar(){
  var grid=document.getElementById('journalCalendarGrid'),title=document.getElementById('journalCalendarTitle');
  if(!grid||!title)return;
  if(!journalCalendarMonth)journalCalendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
  var year=journalCalendarMonth.getFullYear(),month=journalCalendarMonth.getMonth();
  title.textContent=journalCalendarMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  var summary=document.getElementById('journalCalendarSummary');if(summary)summary.textContent=title.textContent;
  var weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var html=weekdays.map(function(day){return'<div class="journal-calendar-weekday">'+day+'</div>';}).join('');
  var first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
  var activities=new Set(getActivities().map(function(activity){return activity.date;}));
  for(var blank=0;blank<offset;blank++)html+='<div aria-hidden="true"></div>';
  for(var day=1;day<=days;day++){
    var date=new Date(year,month,day),dateKey=dk(date),status=journalCalendarStatus(dateKey,activities);
    var classes='journal-calendar-day'+(dateKey===dk(today)?' selected':'')+(dateKey===dk(_realToday)?' real-today':'');
    html+='<button type="button" class="'+classes+'" data-date="'+dateKey+'" onclick="selectJournalCalendarDate(&quot;'+dateKey+'&quot;)" aria-label="'+date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})+'">'+day+(status?'<span class="calendar-dot '+status+'"></span>':'')+'</button>';
  }
  grid.innerHTML=html;
  decorateMyCalendarEvents();
}
function selectJournalCalendarDate(dateKey){
  var calendar=document.getElementById('journalCalendar'),calendarTop=calendar?calendar.getBoundingClientRect().top:null;
  today=new Date(dateKey+'T00:00:00');
  journalCalendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
  load();
  renderJournalCalendar();
  requestAnimationFrame(function(){var updated=document.getElementById('journalCalendar');if(updated&&calendarTop!==null)window.scrollBy(0,updated.getBoundingClientRect().top-calendarTop);});
}

function updateMobileWeekIndicator(){
  var display=document.getElementById('mobileWeekIndicator');if(!display)return;
  var date=new Date(today);date.setHours(0,0,0,0);
  var thursday=new Date(date);
  thursday.setDate(date.getDate()+3-((date.getDay()+6)%7));
  var firstThursday=new Date(thursday.getFullYear(),0,4);
  var week=1+Math.round(((thursday-firstThursday)/86400000-3+((firstThursday.getDay()+6)%7))/7);
  display.textContent='Week '+week;
  var monday=new Date(date);monday.setDate(date.getDate()-((date.getDay()+6)%7));
  var sunday=new Date(monday);sunday.setDate(monday.getDate()+6);
  display.title='Week '+week+': '+monday.toLocaleDateString('en-US',{month:'short',day:'numeric'})+'–'+sunday.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function updateMobileYearProgress(){
  var display=document.getElementById('mobileYearProgress');if(!display)return;
  var date=new Date(today);date.setHours(0,0,0,0);
  var start=new Date(date.getFullYear(),0,1);
  var day=Math.floor((date-start)/86400000)+1;
  var total=new Date(date.getFullYear(),1,29).getMonth()===1?366:365;
  var percent=Math.round(day/total*100);
  display.textContent='Day '+day+'/'+total;
  display.title=percent+'% of '+date.getFullYear()+' complete';
}
function changeDay(n){today.setDate(today.getDate()+n);load();}

// Streak: counts consecutive qualifying days going backward.
// If today is not yet done (or has no entry), starts counting from yesterday
// so the streak is preserved until midnight.
// Shared per-render cache so multiple streak() calls (Bible/Prayer/Exercise/
// Water/Videos) don't each re-read + re-parse the same planner_* days from
// localStorage. Pass the same cache object across all calls in one render pass.
function _getPlannerDayCached(dateKey,cache){
  if(cache&&Object.prototype.hasOwnProperty.call(cache,dateKey))return cache[dateKey];
  let v=null;
  try{const r=localStorage.getItem('planner_'+dateKey);v=r?JSON.parse(r):null;}catch(e){v=null;}
  if(cache)cache[dateKey]=v;
  return v;
}
function streak(fn,cache){
  cache=cache||{};
  let n=0,d=new Date();
  try{
    const _todayDK=dk(d);
    const todayData=_getPlannerDayCached(_todayDK,cache);
    if(todayData){
      if(!fn(todayData,_todayDK)){
        // Not done today yet — fall back to yesterday (don't break mid-day)
        d.setDate(d.getDate()-1);
        const ydk=dk(d);
        const ydData=_getPlannerDayCached(ydk,cache);
        if(!ydData||!fn(ydData,ydk))return 0;
      }
    } else {
      // No entry today — fall back to yesterday
      const yd=new Date(d);yd.setDate(yd.getDate()-1);
      const ydk=dk(yd);
      const ydData=_getPlannerDayCached(ydk,cache);
      if(!ydData||!fn(ydData,ydk))return 0;
      d=yd;
    }
    for(let i=0;i<365;i++){
      const ddk=dk(d);
      const data=_getPlannerDayCached(ddk,cache);
      if(!data)break;
      let ok=false;try{ok=fn(data,ddk);}catch(e){break;}
      if(!ok)break;
      n++;
      d.setDate(d.getDate()-1);
    }
  }catch(e){n=0;}
  return n;
}
function hasActivityOnDate(dateKey){
  return getActivities().some(function(a){return a.date===dateKey;});
}
function isRunningActivity(activity){var type=String(activity&&activity.type||'').toLowerCase().trim();return type==='run'||type==='running'||type.indexOf('run')!==-1;}
function hasRunOnDate(dateKey){return getActivities().some(function(activity){return activity.date===dateKey&&isRunningActivity(activity);});}
function uniqueRunActivities(startDate,endDate){
  function normalizedDate(value){var text=String(value||'').trim(),match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(match)return match[3]+'-'+match[1].padStart(2,'0')+'-'+match[2].padStart(2,'0');return text.slice(0,10);}
  var start=typeof startDate==='string'?startDate:dk(startDate),end=typeof endDate==='string'?endDate:dk(endDate),seen={};return getActivities().filter(function(activity){if(!activity)return false;var activityDate=normalizedDate(activity.date),runText=[activity.type,activity.title,activity.name,activity.workout].filter(Boolean).join(' ');if(activityDate<start||activityDate>end||!/run/i.test(runText))return false;var signature=[activityDate,Number(activity.distance||activity.miles||0).toFixed(3),String(activity.duration||activity.time||'').trim()].join('|');if(seen[signature])return false;seen[signature]=true;activity._weeklyDate=activityDate;return true;});
}
function hasExerciseOnDate(dateKey,planner){return hasRunOnDate(dateKey)||!!(planner&&planner.exRun==='green');}
// One-time migration: when "Chronological Bible"/"Daily Prayer" were retired in favor of
// "Bible & Worship"/"AI Prayer", the code was repointed to the new field names, but already-
// saved daily records still had their checked days under the OLD field names (spChronBible/
// spPrayer). That silently zeroed out existing streaks. This copies old green days forward
// into the new fields (without overwriting any day already marked green under the new name).
function migrateLegacySpiritStreaks(){
  if(localStorage.getItem('legacy_spirit_migrated'))return;
  try{
    let migrated=0;
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||!k.startsWith('planner_'))continue;
      const raw=localStorage.getItem(k);
      if(!raw)continue;
      let dd;try{dd=JSON.parse(raw);}catch(e){continue;}
      let changed=false;
      if(dd.spChronBible==='green'&&dd.spBibleAudio!=='green'){dd.spBibleAudio='green';changed=true;}
      if(dd.spPrayer==='green'&&dd.spAIPrayer!=='green'){dd.spAIPrayer='green';changed=true;}
      if(changed){localStorage.setItem(k,JSON.stringify(dd));migrated++;}
    }
    localStorage.setItem('legacy_spirit_migrated','1');
    if(migrated)console.log('Restored legacy Bible/Prayer streak data for '+migrated+' day(s).');
  }catch(e){console.error('migrateLegacySpiritStreaks error:',e);}
}
function getSermonNotes(dateKey){
  try{
    const raw=localStorage.getItem('bible_'+dateKey);
    if(!raw)return '';
    const e=JSON.parse(raw);
    return e.sermonNotes||e.sermonTitle||'';
  }catch(e){return '';}
}
// Builds date->bool lookups once so per-day streak checks don't re-parse
// the full activities log on every iteration (was causing slow rendering).
function _buildActivityDateIndex(){
  const acts=getActivities();
  const any={},run={};
  acts.forEach(function(a){
    if(!a.date)return;
    any[a.date]=true;
    if((a.type||'').toLowerCase().indexOf('run')!==-1)run[a.date]=true;
  });
  return {any:any,run:run};
}
function journalAudiobookMinutesForDate(dateKey,plannerDay){
  var dedicated=parseTimedMins((plannerDay||{}).gaAudiobookTime);
  var audibleMinutes=getSkillEntries().filter(function(entry){
    if(!entry||(entry.date||entry.scheduledDate)!==dateKey)return false;
    var description=[entry.category,entry.resource,entry.name].filter(Boolean).join(' ');
    return /reading|audiobook|audible/i.test(description);
  }).reduce(function(total,entry){return total+parseSkillTimeMins(entry.time);},0);
  // The dedicated daily value and a Schedule/Log entry can describe the same
  // listening session. Prefer the daily total when present to avoid double counting.
  return dedicated>0?dedicated:audibleMinutes;
}
function renderStreaks(){
  const actIdx=_buildActivityDateIndex();
  const _streakCache={};
  const DEFS=[
    {id:'stBible',  label:'📖',  tip:'Bible',    fn:d=>d.spBibleAudio==='green'},
    {id:'stPrayer', label:'🙏',  tip:'Prayer',   fn:d=>d.spAIPrayer==='green'},
    {id:'stExercise',label:'🏃', tip:'Running',  fn:(d,dk)=>d.exRun==='green'||!!actIdx.run[dk]},
    {id:'stWater',  label:'💧',  tip:'Water',    fn:d=>(parseFloat(d.waterOz)||parseFloat(d.waterCount)*8||0)>=64}
  ];
  DEFS.forEach(({id,label,tip,fn})=>{
    const n=streak(fn,_streakCache);
    const el=document.getElementById(id);
    if(!el)return;
    const cls=n>=30?'streak-great':n>=7?'streak-hot':'streak-cold';
    el.className='streak-item '+cls;
    el.title=tip+': '+n+'-day streak';
    el.innerHTML='<span class="streak-num">'+n+'</span><span class="streak-lbl">'+label+'</span>';
  });
}

function getDM(d,dateKey){
  var actMiles=0,actTime=0,actWatts=0,actWattsN=0,actPace=0,actPaceN=0;
  if(dateKey){
    uniqueRunActivities(dateKey,dateKey).forEach(function(a){
      actMiles+=parseFloat(a.distance)||parseFloat(a.miles)||0;
      actTime+=parseTimedMins(a.duration||a.time);
      if(parseFloat(a.power)){actWatts+=parseFloat(a.power);actWattsN++;}
      if(a.pace&&parsePace(a.pace)){actPace+=parsePace(a.pace);actPaceN++;}
    });
  }
  const bp=parseBP(d.wBPVal);return{miles:actMiles,pace:actPaceN?actPace/actPaceN:0,watts:actWattsN?actWatts/actWattsN:0,time:actTime,steps:parseFloat(d.exSteps)||0,stretch:parseTimedMins(d.exStretchVal)||0,massage:parseFloat(d.exMassageMinutes)||parseTimedMins(d.exMassageVal)||0,score:parseFloat(d.score)||0,weight:parseFloat(d.wWghtVal)||0,sleep:parseSleepMins(d.wSleepVal),sleepScore:parseFloat(d.wSleepScore)||0,calories:parseFloat(d.nuCalVal)||0,water:parseFloat(d.waterOz)||(parseFloat(d.waterCount)*8||0),audiobook:journalAudiobookMinutesForDate(dateKey,d),financialVideos:parseTimedMins(d.gaFinancialVideosTime),financialVideosDone:d.gaFinancialVideos==='green'?1:0,skill:parseMins(d.gaSkillTime),skillName:d.gaSkillText||'',skillDone:d.gaSkill==='green'?1:0,bpSys:bp.sys,bpDia:bp.dia,pulse:parseFloat(d.wPulseVal)||0,dogWalk:parseFloat(d.exDogWalkVal)||(d.exDogWalk==='green'?1:0),walk:parseFloat(d.exWalkVal)||(d.exWalk==='green'?1:0),headache:d.wHeadache==='green'?1:0};}
function agg(arr){const t={miles:0,pace:0,watts:0,time:0,steps:0,stretch:0,massage:0,score:0,weight:0,sleep:0,sleepScore:0,calories:0,water:0,audiobook:0,skill:0,skillDone:0,bpSys:0,bpDia:0,pulse:0,dogWalk:0,walk:0,headache:0};const c={pace:0,watts:0,score:0,weight:0,sleep:0,sleepScore:0,bp:0,pulse:0};arr.forEach(m=>{t.miles+=m.miles;t.time+=m.time;t.steps+=m.steps;t.stretch+=(m.stretch||0);t.massage+=(m.massage||0);t.calories+=m.calories;t.water+=m.water;t.audiobook+=m.audiobook;t.skill+=m.skill||0;t.skillDone+=(m.skillDone||0);t.dogWalk+=(m.dogWalk||0);t.walk+=(m.walk||0);t.headache+=(m.headache||0);if(m.pace){t.pace+=m.pace;c.pace++;}if(m.watts){t.watts+=m.watts;c.watts++;}if(m.score){t.score+=m.score;c.score++;}if(m.weight){t.weight+=m.weight;c.weight++;}if(m.sleep){t.sleep+=m.sleep;c.sleep++;}if(m.sleepScore){t.sleepScore+=m.sleepScore;c.sleepScore++;}if(m.bpSys){t.bpSys+=m.bpSys;t.bpDia+=m.bpDia;c.bp++;}if(m.pulse){t.pulse+=m.pulse;c.pulse++;}});return{miles:t.miles,pace:c.pace?t.pace/c.pace:0,watts:c.watts?t.watts/c.watts:0,time:t.time,steps:t.steps,stretch:t.stretch,massage:t.massage,calories:t.calories,water:t.water,score:c.score?t.score/c.score:0,weight:c.weight?t.weight/c.weight:0,sleep:c.sleep?t.sleep/c.sleep:0,sleepScore:c.sleepScore?t.sleepScore/c.sleepScore:0,audiobook:t.audiobook,skill:t.skill,skillDone:t.skillDone,bpSys:c.bp?t.bpSys/c.bp:0,bpDia:c.bp?t.bpDia/c.bp:0,pulse:c.pulse?t.pulse/c.pulse:0,dogWalk:t.dogWalk,walk:t.walk,headache:t.headache};}
function gRow(l,m,t){const b=t?'background:#f8f9fa;font-weight:700':'';const skillCell=m.skillDone?(t?m.skillDone+'d':'✅'):'-';return`<tr style="${b}"><td>${l}</td><td>${fmtMins(m.audiobook)}</td><td>${skillCell}</td></tr>`;}
function fRow(l,m,t){const b=t?'background:#f8f9fa;font-weight:700':'';return`<tr style="${b}"><td>${l}</td><td>${m.miles?m.miles.toFixed(1):'-'}</td><td>${m.pace?fmtPace(m.pace):'-'}</td><td>${m.watts?Math.round(m.watts):'-'}</td><td>${fmtMins(m.time)}</td><td>${m.steps?Math.round(m.steps):'-'}</td><td>${m.dogWalk?(Math.round(m.dogWalk*10)/10)%1===0?Math.round(m.dogWalk):+(m.dogWalk.toFixed(1)):'-'}</td><td>${m.walk?(Math.round(m.walk*10)/10)%1===0?Math.round(m.walk):+(m.walk.toFixed(1)):'-'}</td></tr>`;}
function wRow(l,m,t){const b=t?'background:#f8f9fa;font-weight:700':'';const bp=m.bpSys?Math.round(m.bpSys)+'/'+Math.round(m.bpDia):'-';const hd=m.headache?`<span style='color:#2563eb;font-weight:700;'>${t?m.headache+'d':'✓'}</span>`:'-';return`<tr style="${b}"><td>${l}</td><td>${m.weight?m.weight.toFixed(1):'-'}</td><td>${m.sleep?fmtMins(m.sleep):'-'}</td><td>${m.sleepScore?m.sleepScore.toFixed(0):'-'}</td><td>${bp}</td><td>${m.pulse?Math.round(m.pulse):'-'}</td><td>${hd}</td></tr>`;}
const gH='<table class="summary-table"><thead><tr><th>Period</th><th>Audiobook</th><th>Learning &amp; Growth</th></tr></thead><tbody>';
const fH='<table class="summary-table"><thead><tr><th>Period</th><th>Miles</th><th>Pace</th><th>Watts</th><th>Time</th><th>Steps</th><th>Stretch</th><th>Massage</th><th>Dog Walk</th><th>Walk</th></tr></thead><tbody>';
gRow=function(l,m,t){const b=t?'background:#f8f9fa;font-weight:700':'';const skillCell=m.skillDone?(t?m.skillDone+'d':'&#x2705;'):'-';return`<tr style="${b}"><td>${l}</td><td>${fmtMinsSeconds(m.audiobook)}</td><td>${skillCell}</td></tr>`;};
fRow=function(l,m,t){const b=t?'background:#f8f9fa;font-weight:700':'';return`<tr style="${b}"><td>${l}</td><td>${m.miles?m.miles.toFixed(1):'-'}</td><td>${m.pace?fmtPace(m.pace):'-'}</td><td>${m.watts?Math.round(m.watts):'-'}</td><td>${fmtMinsSeconds(m.time)}</td><td>${m.steps?Math.round(m.steps):'-'}</td><td>${fmtMinsSeconds(m.stretch)}</td><td>${fmtMinsSeconds(m.massage)}</td><td>${m.dogWalk?(Math.round(m.dogWalk*10)/10)%1===0?Math.round(m.dogWalk):+(m.dogWalk.toFixed(1)):'-'}</td><td>${m.walk?(Math.round(m.walk*10)/10)%1===0?Math.round(m.walk):+(m.walk.toFixed(1)):'-'}</td></tr>`;};
const wH='<table class="summary-table"><thead><tr><th>Period</th><th>Weight</th><th>Sleep</th><th>Sleep Score</th><th>Avg BP</th><th>Pulse</th><th>Headache</th></tr></thead><tbody>';
const dsH='<table class="summary-table day-score-table"><thead><tr><th>Period</th><th>Day Score</th></tr></thead><tbody>';
function dsRow(l,m,t){const b=t?'background:#f8f9fa;font-weight:700':'';return`<tr style="${b}"><td>${l}</td><td>${m.score?m.score.toFixed(1)+' / 5':'-'}</td></tr>`;}
function mkT(h,r,t){return h+r.join('')+t+'</tbody></table>';}
let weekOff2=0;
// ── Nutrition + Spirituality summary helpers ──────────────────────────────
const nuH='<table class="summary-table"><thead><tr><th>Period</th><th>Calories</th><th>Protein (g)</th><th>Fat (g)</th><th>Carbs (g)</th><th>Water (oz)</th></tr></thead><tbody>';
const nuMicroH='<table class="summary-table"><thead><tr><th>Period</th><th>Fiber (g)</th><th>Sugar (g)</th><th>Sodium (mg)</th><th>Vit A (mcg)</th><th>Vit C (mg)</th><th>Vit D (mcg)</th><th>Calcium (mg)</th><th>Iron (mg)</th><th>Potassium (mg)</th></tr></thead><tbody>';
const spirH='<table class="summary-table"><thead><tr><th>Period</th><th>Sermon</th><th>Meditation</th><th>AI Prayer</th><th>Bible Audio</th><th>Daily Bread</th></tr></thead><tbody>';

function getNuDay(dateKey){
  var cal=0,prot=0,fat=0,carbs=0;
  var micro={fiber:0,sugar:0,sodium:0,vitA:0,vitC:0,vitD:0,calcium:0,iron:0,potassium:0};
  // New format: foodLog inside planner record
  var pr=localStorage.getItem('planner_'+dateKey);
  if(pr){
    var pd=JSON.parse(pr);
    if(Array.isArray(pd.foodLog)&&pd.foodLog.length){
      pd.foodLog.forEach(function(f){
        var s=parseFloat(f.servings)||1;
        cal+=(parseFloat(f.cal)||0)*s;
        prot+=(parseFloat(f.prot)||0)*s;
        fat+=(parseFloat(f.fat)||0)*s;
        carbs+=(parseFloat(f.carbs)||0)*s;
        MICRO_FIELDS.forEach(function(mf){micro[mf]+=(parseFloat(f[mf])||0)*s;});
      });
    }
  }
  // Old format: food_YYYY-MM-DD key
  if(!cal){
    var oldRaw=localStorage.getItem('food_'+dateKey);
    if(oldRaw){
      try{
        var oldItems=JSON.parse(oldRaw);
        if(Array.isArray(oldItems)){
          oldItems.forEach(function(f){
            var s=parseFloat(f.servings)||1;
            cal+=(parseFloat(f.cal)||0)*s;
            prot+=(parseFloat(f.prot)||0)*s;
            fat+=(parseFloat(f.fat)||0)*s;
            carbs+=(parseFloat(f.carbs)||0)*s;
          });
        }
      }catch(e){}
    }
  }
  // Legacy hidden-field fallback
  if(!cal&&pr){
    var pd2=JSON.parse(pr);
    cal=parseFloat(pd2.nuCalVal)||0;
    prot=parseFloat(pd2.nuProtVal)||0;
    fat=parseFloat(pd2.nuFatVal)||0;
    carbs=parseFloat(pd2.nuCarbsVal)||0;
  }
    // Water from planner data
  var water=0;
  if(pr){try{var pd3=JSON.parse(pr);water=parseFloat(pd3.waterOz)||(parseFloat(pd3.waterCount)*8)||0;}catch(e){}}
  return{cal:cal,prot:prot,fat:fat,carbs:carbs,water:water,fiber:micro.fiber,sugar:micro.sugar,sodium:micro.sodium,vitA:micro.vitA,vitC:micro.vitC,vitD:micro.vitD,calcium:micro.calcium,iron:micro.iron,potassium:micro.potassium};
}

function getSpiritDay(dateKey){
  var pr=localStorage.getItem('planner_'+dateKey);
  var pd=pr?JSON.parse(pr):{};
  return{
    hasSermon:pd.spSermon==='green',
    hasMeditation:pd.spMeditation==='green',
    hasAIPrayer:pd.spAIPrayer==='green',
    hasBibleAudio:pd.spBibleAudio==='green',
    hasDailyBread:pd.spDailyBread==='green'
  };
}

function aggNu(arr){
  return arr.reduce(function(a,n){
    var r={cal:a.cal+n.cal,prot:a.prot+n.prot,fat:a.fat+n.fat,carbs:a.carbs+n.carbs,water:a.water+(n.water||0)};
    MICRO_FIELDS.forEach(function(f){r[f]=(a[f]||0)+(n[f]||0);});
    return r;
  },{cal:0,prot:0,fat:0,carbs:0,water:0});
}

function aggSpir(arr){
  return arr.reduce(function(a,s){
    return{
      sermon: a.sermon+(s.hasSermon?1:(s.sermon||0)),
      meditation: a.meditation+(s.hasMeditation?1:(s.meditation||0)),
      aiPrayer: a.aiPrayer+(s.hasAIPrayer?1:(s.aiPrayer||0)),
      bibleAudio: a.bibleAudio+(s.hasBibleAudio?1:(s.bibleAudio||0)),
      dailyBread: a.dailyBread+(s.hasDailyBread?1:(s.dailyBread||0))
    };
  },{sermon:0,meditation:0,aiPrayer:0,bibleAudio:0,dailyBread:0});
}

function nuRow(l,n,isTot){
  var b=isTot?'background:#f8f9fa;font-weight:700':'';
  return '<tr style="'+b+'"><td>'+l+'</td>'
    +'<td>'+(n.cal?Math.round(n.cal):'-')+'</td>'
    +'<td>'+(n.prot?Math.round(n.prot):'-')+'</td>'
    +'<td>'+(n.fat?Math.round(n.fat):'-')+'</td>'
    +'<td>'+(n.carbs?Math.round(n.carbs):'-')+'</td>'
    +'<td>'+(n.water?Math.round(n.water)+' oz':'-')+'</td></tr>';
}

function nuMicroRow(l,n,isTot){
  var b=isTot?'background:#f8f9fa;font-weight:700':'';
  var v=function(x){return x?Math.round(x):'-';};
  return '<tr style="'+b+'"><td>'+l+'</td>'
    +'<td>'+v(n.fiber)+'</td>'
    +'<td>'+v(n.sugar)+'</td>'
    +'<td>'+v(n.sodium)+'</td>'
    +'<td>'+v(n.vitA)+'</td>'
    +'<td>'+v(n.vitC)+'</td>'
    +'<td>'+v(n.vitD)+'</td>'
    +'<td>'+v(n.calcium)+'</td>'
    +'<td>'+v(n.iron)+'</td>'
    +'<td>'+v(n.potassium)+'</td></tr>';
}

function spirRow(l,s,isTot){
  var b=isTot?'background:#f0f4e8;font-weight:700':'';
  // Single-day (boolean fields)
  if(typeof s.hasSermon!=='undefined'){
    return '<tr style="'+b+'"><td>'+l+'</td>'
      +'<td>'+(s.hasSermon?'📖':'-')+'</td>'
      +'<td>'+(s.hasMeditation?'🧘':'-')+'</td>'
      +'<td>'+(s.hasAIPrayer?'✨':'-')+'</td>'
      +'<td>'+(s.hasBibleAudio?'🎧':'-')+'</td>'
      +'<td>'+(s.hasDailyBread?'📰':'-')+'</td></tr>';
  }
  // Aggregated (count fields)
  var n=function(v){return v?v:'-';};
  return '<tr style="'+b+'"><td>'+l+'</td>'
    +'<td>'+n(s.sermon)+'</td>'
    +'<td>'+n(s.meditation)+'</td>'
    +'<td>'+n(s.aiPrayer)+'</td>'
    +'<td>'+n(s.bibleAudio)+'</td>'
    +'<td>'+n(s.dailyBread)+'</td></tr>';
}

function renderNutritionSpirit(dateKeys,labels,nuContainerId,spirContainerId,nuMicroContainerId){
  var nuRows=[],spirRows=[],nuMicroRows=[],allNu=[],allSpir=[];
  dateKeys.forEach(function(keys,i){
    var arr=Array.isArray(keys)?keys:[keys];
    var nus=arr.map(function(k){return getNuDay(k);});
    var spirs=arr.map(function(k){return getSpiritDay(k);});
    var nu=aggNu(nus);
    var sp=aggSpir(spirs);
    allNu.push.apply(allNu,nus);
    allSpir.push.apply(allSpir,spirs);
    nuRows.push(nuRow(labels[i],nu));
    nuMicroRows.push(nuMicroRow(labels[i],nu));
    if(arr.length===1){
      spirRows.push(spirRow(labels[i],spirs[0]));
    } else {
      spirRows.push(spirRow(labels[i],sp));
    }
  });
  var totNu=aggNu(allNu);
  var totSpir=aggSpir(allSpir);
  var nuEl=document.getElementById(nuContainerId);
  var spEl=document.getElementById(spirContainerId);
  var nuMicroEl=nuMicroContainerId?document.getElementById(nuMicroContainerId):null;
  if(nuEl)nuEl.innerHTML=mkT(nuH,nuRows,nuRow('TOTAL',totNu,true));
  if(spEl)spEl.innerHTML=mkT(spirH,spirRows,spirRow('TOTAL',totSpir,true));
  if(nuMicroEl)nuMicroEl.innerHTML=mkT(nuMicroH,nuMicroRows,nuMicroRow('TOTAL',totNu,true));
}

function renderWeeklyDigest(days,tot,wDayKeys,lbls){
  var el=document.getElementById('wDigest');if(!el)return;
  var spirs=wDayKeys.map(function(k){return getSpiritDay(k);});
  var sp=aggSpir(spirs);
  var daysLogged=days.filter(function(d){return d.score||d.miles||d.calories||d.audiobook||d.sleep;}).length;
  var activeDays=days.filter(function(d){return d.miles>0;}).length;
  var goals={};try{goals=JSON.parse(localStorage.getItem('weekly_goals')||'{}');}catch(ignore){}
  var goalRows=[{name:'Miles',target:Number(goals.Miles)||0,actual:tot.miles||0},{name:'Bible',target:Number(goals.Bible)||0,actual:sp.bibleAudio||0},{name:'Prayer',target:Number(goals.Prayer)||0,actual:sp.aiPrayer||0},{name:'Running',target:Number(goals.Exercise)||0,actual:activeDays}].filter(function(goal){return goal.target>0;});
  var reached=goalRows.filter(function(goal){return goal.actual>=goal.target;}).length;
  var goalText=goalRows.length?(reached+' of '+goalRows.length+' weekly targets reached'):'Set weekly targets to measure progress';
  var coverage=[
    {name:'Daily consistency',value:daysLogged/7,detail:daysLogged+' days logged'},
    {name:'Fitness',value:activeDays/7,detail:activeDays+' active days'},
    {name:'Spirituality',value:((sp.bibleAudio||0)+(sp.aiPrayer||0))/14,detail:(sp.bibleAudio||0)+' Bible and '+(sp.aiPrayer||0)+' prayer days'},
    {name:'Wellness',value:days.filter(function(d){return d.sleep||d.weight||d.bpSys;}).length/7,detail:'wellness recorded'},
    {name:'Nutrition',value:days.filter(function(d){return d.calories||d.water;}).length/7,detail:'nutrition recorded'}
  ];
  coverage.sort(function(a,b){return b.value-a.value;});
  var strongest=coverage[0].value?coverage[0].name+' — '+coverage[0].detail:'No clear pattern yet';
  var attentionGoals=goalRows.filter(function(goal){return goal.actual<goal.target;}).sort(function(a,b){return(a.actual/a.target)-(b.actual/b.target);});
  var weakest=coverage.slice().sort(function(a,b){return a.value-b.value;})[0];
  var attention=attentionGoals.length?attentionGoals[0].name+' needs '+Math.max(0,Math.round((attentionGoals[0].target-attentionGoals[0].actual)*10)/10)+' more':(weakest.value<1?weakest.name+' has the least coverage':'All tracked areas are current');
  var priorStart=new Date(wDayKeys[0]+'T12:00:00');priorStart.setDate(priorStart.getDate()-7);var priorDays=[];
  for(var p=0;p<7;p++){var pd=new Date(priorStart);pd.setDate(priorStart.getDate()+p);var pk=dk(pd),raw=localStorage.getItem('planner_'+pk);priorDays.push(getDM(raw?JSON.parse(raw):{},pk));}
  var prior=agg(priorDays),priorLogged=priorDays.filter(function(d){return d.score||d.miles||d.calories||d.audiobook||d.sleep;}).length;
  var changes=[];
  if(tot.miles||prior.miles){var mileDiff=tot.miles-prior.miles;changes.push((mileDiff>=0?'+':'')+mileDiff.toFixed(1)+' miles');}
  if(tot.score||prior.score){var scoreDiff=tot.score-prior.score;changes.push((scoreDiff>=0?'+':'')+scoreDiff.toFixed(1)+' average score');}
  if(!changes.length&&daysLogged!==priorLogged)changes.push((daysLogged-priorLogged>=0?'+':'')+(daysLogged-priorLogged)+' logged days');
  var changeText=changes.length?changes.join(' and ')+' versus last week':'Not enough prior-week data for comparison';
  var cards=[['&#x1F3AF; Goals on Track',goalText],['&#x2B50; Strongest Area',strongest],['&#x1F50E; Needs Attention',attention],['&#x2194;&#xFE0F; Change from Last Week',changeText]];
  el.innerHTML='<div class="wdig-title">&#x1F4CA; Weekly Snapshot</div><div class="wdig-chips">'+cards.map(function(card){return '<div class="wdig-chip"><strong>'+card[0]+'</strong>'+escHtml(card[1])+'</div>';}).join('')+'</div>';
}
function renderWeekly(){const ws=wkStart(weekOff2),days=[],lbls=[];for(let i=0;i<7;i++){const d=new Date(ws);d.setDate(ws.getDate()+i);const r=localStorage.getItem('planner_'+dk(d));var _dk=dk(d);days.push(getDM(r?JSON.parse(r):{},_dk));lbls.push(d.toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'}));}const we=new Date(ws);we.setDate(ws.getDate()+6);document.getElementById('weekLabel').textContent=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+we.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});const tot=agg(days);document.getElementById('wDayScore').innerHTML=mkT(dsH,days.map((m,i)=>dsRow(lbls[i],m)),dsRow('AVG',tot,true));document.getElementById('wGrowth').innerHTML=mkT(gH,days.map((m,i)=>gRow(lbls[i],m)),gRow('TOTAL',tot,true));document.getElementById('wFitness').innerHTML=mkT(fH,days.map((m,i)=>fRow(lbls[i],m)),fRow('TOTAL/AVG',tot,true));document.getElementById('wWellness').innerHTML=mkT(wH,days.map((m,i)=>wRow(lbls[i],m)),wRow('TOTAL/AVG',tot,true));
  renderWeeklyGrowthTable(ws,we,days,lbls);
  renderGrowthActivityReport('wGrowth',lbls.map(function(label,i){var d=new Date(ws);d.setDate(ws.getDate()+i);return{label:label,start:dk(d),end:dk(d)};}));
  const wDayKeys=[];for(let i=0;i<7;i++){const d=new Date(ws);d.setDate(ws.getDate()+i);wDayKeys.push(dk(d));}renderNutritionSpirit(wDayKeys,lbls,'wNutrition','wSpirituality','wNutritionMicro');}
function changeWeekOff(n){weekOff2+=n;renderWeekly();renderGoals();}
let monthOff2=0;
function renderMonthly(){const now=new Date(),ref=new Date(now.getFullYear(),now.getMonth()+monthOff2,1);const yr=ref.getFullYear(),mo=ref.getMonth(),dim=new Date(yr,mo+1,0).getDate();const wmap={};for(let d=1;d<=dim;d++){const dt=new Date(yr,mo,d);const ws=wkStartOf(dt);const k=dk(ws),dateKey=dk(dt);if(!wmap[k])wmap[k]={ws,ms:[]};const r=localStorage.getItem('planner_'+dateKey);wmap[k].ms.push(getDM(r?JSON.parse(r):{},dateKey));}document.getElementById('monthLabel').textContent=ref.toLocaleDateString('en-US',{month:'long',year:'numeric'});const wks=Object.values(wmap).sort((a,b)=>a.ws-b.ws),allM=[],gR=[],fR=[],wR=[],dsR=[];wks.forEach(({ws,ms})=>{const we=new Date(ws);we.setDate(ws.getDate()+6);const lb=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+'-'+we.toLocaleDateString('en-US',{day:'numeric'});const a=agg(ms);allM.push(...ms);gR.push(gRow('Wk '+lb,a));fR.push(fRow('Wk '+lb,a));wR.push(wRow('Wk '+lb,a));dsR.push(dsRow('Wk '+lb,a));});const tot=agg(allM);document.getElementById('mDayScore').innerHTML=mkT(dsH,dsR,dsRow('AVG',tot,true));document.getElementById('mGrowth').innerHTML=mkT(gH,gR,gRow('TOTAL',tot,true));document.getElementById('mFitness').innerHTML=mkT(fH,fR,fRow('TOTAL/AVG',tot,true));document.getElementById('mWellness').innerHTML=mkT(wH,wR,wRow('TOTAL/AVG',tot,true));
  const mWkKeys=[],mWkLbls=[],mGrowthPeriods=[],monthStartKey=dk(new Date(yr,mo,1)),monthEndKey=dk(new Date(yr,mo,dim));wks.forEach(({ws,ms})=>{const we=new Date(ws);we.setDate(ws.getDate()+6);const lb=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+'-'+we.toLocaleDateString('en-US',{day:'numeric'});const keys=[];for(let i=0;i<7;i++){const d=new Date(ws);d.setDate(ws.getDate()+i);keys.push(dk(d));}mWkKeys.push(keys);mWkLbls.push('Wk '+lb);mGrowthPeriods.push({label:'Wk '+lb,start:dk(ws)<monthStartKey?monthStartKey:dk(ws),end:dk(we)>monthEndKey?monthEndKey:dk(we)});});renderGrowthActivityReport('mGrowth',mGrowthPeriods);renderNutritionSpirit(mWkKeys,mWkLbls,'mNutrition','mSpirituality','mNutritionMicro');
  // Render heatmap
  const hmGrid=document.getElementById('hmGrid');
  const hmMonth=document.getElementById('hmMonth');
  if(hmGrid){
    if(hmMonth)hmMonth.textContent=ref.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    // header row already in HTML; rebuild cells only
    const existingDows=hmGrid.querySelectorAll('.heatmap-dow');
    while(hmGrid.children.length>7)hmGrid.removeChild(hmGrid.lastChild);
    // pad to start on correct weekday (Mon=0)
    const firstDow=(new Date(yr,mo,1).getDay()+6)%7;
    for(let p=0;p<firstDow;p++){const e=document.createElement('div');e.className='heatmap-cell hm-empty';hmGrid.appendChild(e);}
    const todayStr=dk(new Date());
    for(let d=1;d<=dim;d++){
      const dt=new Date(yr,mo,d);const dStr=dk(dt);
      const cell=document.createElement('div');cell.className='heatmap-cell';
      if(dStr>todayStr){cell.classList.add('hm-future');}
      else{
        const r=localStorage.getItem('planner_'+dStr);
        let score=0;
        if(r){const dd=JSON.parse(r);
          if(dd.spBibleAudio==='green')score++;
          if(dd.spAIPrayer==='green')score++;
          if(dd.exRun==='green'||dd.exStrength==='green'||dd.exBike==='green'||dd.exWalk==='green'||hasActivityOnDate(dStr))score++;
          if((parseFloat(dd.waterOz)||parseFloat(dd.waterCount)*8||0)>=64)score++;
        }
        cell.classList.add('hm'+score);
        cell.title=dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})+': '+score+'/4 habits';
      }
      hmGrid.appendChild(cell);
    }
  }
}
function changeMonthOff(n){monthOff2+=n;renderMonthly();}
let yearOff2=0;
function renderYearly(){const yr=new Date().getFullYear()+yearOff2;document.getElementById('yearLabel').textContent=yr;const mns=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],allM=[],gR=[],fR=[],wR=[],dsR=[];mns.forEach((mn,mi)=>{const dim=new Date(yr,mi+1,0).getDate(),ms=[];for(let d=1;d<=dim;d++){const dt=new Date(yr,mi,d),dateKey=dk(dt);const r=localStorage.getItem('planner_'+dateKey);ms.push(getDM(r?JSON.parse(r):{},dateKey));}allM.push(...ms);const a=agg(ms);gR.push(gRow(mn,a));fR.push(fRow(mn,a));wR.push(wRow(mn,a));dsR.push(dsRow(mn,a));});const tot=agg(allM);document.getElementById('yDayScore').innerHTML=mkT(dsH,dsR,dsRow('AVG',tot,true));document.getElementById('yGrowth').innerHTML=mkT(gH,gR,gRow('TOTAL',tot,true));document.getElementById('yFitness').innerHTML=mkT(fH,fR,fRow('TOTAL/AVG',tot,true));document.getElementById('yWellness').innerHTML=mkT(wH,wR,wRow('TOTAL/AVG',tot,true));
  const yr2=new Date().getFullYear()+yearOff2;
  const yMoKeys=[],yMoLbls=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const yGrowthPeriods=[];for(let mi=0;mi<12;mi++){const dim=new Date(yr2,mi+1,0).getDate();const keys=[];for(let d=1;d<=dim;d++)keys.push(dk(new Date(yr2,mi,d)));yMoKeys.push(keys);yGrowthPeriods.push({label:yMoLbls[mi],start:dk(new Date(yr2,mi,1)),end:dk(new Date(yr2,mi,dim))});}
  renderGrowthActivityReport('yGrowth',yGrowthPeriods);renderNutritionSpirit(yMoKeys,yMoLbls,'yNutrition','ySpirituality','yNutritionMicro');}
function changeYearOff(n){yearOff2+=n;renderYearly();}
let dashOff2=0;
function renderDashboard(){
  const ws=wkStart(dashOff2),we=new Date(ws);we.setDate(ws.getDate()+6);
  document.getElementById('dashLabel').textContent=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+we.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const lbls=[],ms=[];
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(ws.getDate()+i);const dateKey=dk(d);
    lbls.push(d.toLocaleDateString('en-US',{weekday:'short'}));
    const r=localStorage.getItem('planner_'+dateKey);
    ms.push(r?getDM(JSON.parse(r),dateKey):getDM({},dateKey));
  }
  const cfgs=[{k:'score',l:'Day Score',c:'#f0b429'},{k:'sleep',l:'Sleep',c:'#9b59b6'},{k:'miles',l:'Miles',c:'#1abc9c'},{k:'weight',l:'Weight',c:'#e74c3c'}];
  const grid=document.getElementById('dashGrid');grid.innerHTML='';
  if(typeof Chart==='undefined'){
    grid.innerHTML='<div class="dash-card" style="grid-column:1/-1;"><h3>Dashboard unavailable</h3><div style="font-size:.88rem;color:#667085;line-height:1.5;">The chart library did not load. Check your internet connection, then refresh this page.</div></div>';
    return;
  }
  const logged=ms.filter(function(m){return Object.values(m).some(Boolean);}).length,totalMiles=ms.reduce(function(a,m){return a+(m.miles||0);},0);
  const scored=ms.filter(function(m){return m.score>0;}),slept=ms.filter(function(m){return m.sleep>0;});
  const overview=document.createElement('div');overview.className='dash-card';overview.style.gridColumn='1 / -1';
  overview.innerHTML='<h3>Weekly Overview</h3><div style="display:flex;gap:20px;flex-wrap:wrap;font-size:.88rem;color:#475467;"><span><strong>'+logged+'/7</strong> days logged</span><span><strong>'+totalMiles.toFixed(1)+'</strong> miles</span><span><strong>'+(scored.length?(scored.reduce(function(a,m){return a+m.score;},0)/scored.length).toFixed(1):'—')+'</strong> avg score</span><span><strong>'+(slept.length?fmtMins(slept.reduce(function(a,m){return a+m.sleep;},0)/slept.length):'—')+'</strong> avg sleep</span></div>';
  grid.appendChild(overview);
  cfgs.forEach(({k,l,c})=>{
    const id='ch_'+k,values=ms.map(m=>m[k]||0);const card=document.createElement('div');card.className='dash-card';
    card.innerHTML='<h3>'+l+'</h3><canvas id="'+id+'"></canvas><div style="font-size:.72rem;color:#98a2b3;text-align:center;margin-top:4px;">'+(values.some(Boolean)?'Updated from this week':'No data logged this week')+'</div>';
    grid.appendChild(card);if(charts[id]){charts[id].destroy();delete charts[id];}
    const ctx=document.getElementById(id).getContext('2d');
    charts[id]=new Chart(ctx,{type:'line',data:{labels:lbls,datasets:[{data:values,borderColor:c,backgroundColor:c+'22',tension:0.3,fill:true,pointRadius:4,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:!values.some(v=>v<0)}},animation:false}});
  });
  renderHabitStreakChart(ws);
}
function getCurrentWeekChartData(){
  const ws=wkStart(0),labels=[],metrics=[],todayKey=dk(new Date());
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(ws.getDate()+i);const dateKey=dk(d),raw=localStorage.getItem('planner_'+dateKey);
    labels.push(d.toLocaleDateString('en-US',{weekday:'short'}));
    // Foods copied or planned for a future date are meal plans, not calories
    // already consumed. Keep future days blank until that date arrives.
    metrics.push(dateKey>todayKey?{}:getDM(raw?JSON.parse(raw):{},dateKey));
  }
  return{labels:labels,metrics:metrics};
}
function renderSectionCharts(containerId,cfgs){
  const grid=document.getElementById(containerId);if(!grid)return;
  grid.innerHTML='';
  if(typeof Chart==='undefined'){grid.innerHTML='<div class="dash-card"><h3>Charts unavailable</h3><div style="font-size:.82rem;color:#667085;">Check your internet connection and refresh.</div></div>';return;}
  const data=getCurrentWeekChartData();
  cfgs.forEach(function(cfg){
    const id='section_'+containerId+'_'+cfg.k,values=data.metrics.map(function(m){return m[cfg.k]||0;});
    const plotted=values.map(function(v){return v>0?v:null;});
    const logged=values.filter(function(v){return v>0;});
    const formatValue=cfg.format||function(v){return Math.round(v)+(cfg.unit?' '+cfg.unit:'');};
    const avg=logged.length?logged.reduce(function(sum,v){return sum+v;},0)/logged.length:0;
    const min=logged.length?Math.min.apply(null,logged):0,max=logged.length?Math.max.apply(null,logged):0;
    const summary=logged.length
      ?'<strong>'+formatValue(avg)+'</strong> weekly average &nbsp;&bull;&nbsp; <strong>'+formatValue(min)+' to '+formatValue(max)+'</strong> range'
      :'No data logged this week';
    const card=document.createElement('div');card.className='dash-card';
    card.innerHTML='<h3 style="margin-bottom:3px;">'+cfg.l+' &mdash; This Week</h3>'
      +(cfg.help?'<div style="font-size:.75rem;color:#667085;margin-bottom:8px;line-height:1.35;">'+cfg.help+'</div>':'')
      +'<div style="height:220px;"><canvas id="'+id+'"></canvas></div>'
      +'<div style="font-size:.75rem;color:#667085;text-align:center;margin-top:8px;line-height:1.4;">'+summary+'</div>';
    grid.appendChild(card);if(charts[id]){charts[id].destroy();delete charts[id];}
    charts[id]=new Chart(document.getElementById(id).getContext('2d'),{
      type:'line',
      data:{labels:data.labels,datasets:[{data:plotted,borderColor:cfg.c,backgroundColor:cfg.c+'18',fill:true,tension:.25,pointRadius:5,pointHoverRadius:7,spanGaps:true,borderWidth:2}]},
      options:{
        responsive:true,maintainAspectRatio:false,animation:false,
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return (cfg.tooltipLabel||cfg.l)+': '+formatValue(ctx.parsed.y);}}}},
        scales:{
          x:{grid:{display:false},ticks:{color:'#667085',font:{size:11}}},
          y:{reverse:!!cfg.reverse,grace:'12%',title:{display:true,text:cfg.axisLabel||cfg.l,color:'#475467',font:{size:11,weight:'600'}},ticks:{color:'#667085',font:{size:10},callback:function(v){return formatValue(v);}},grid:{color:'rgba(148,163,184,.18)'}}
        }
      }
    });
  });
}
function relocateDashboardCharts(){
  const wellness=document.getElementById('wellnessChartsHome'),activities=document.getElementById('activityChartsHome');
  const bpCanvas=document.getElementById('bpChart'),bp=bpCanvas?bpCanvas.closest('.bp-chart-wrap'):null,weight=document.getElementById('weightChartWrap'),miles=document.getElementById('milesChartWrap');
  if(wellness&&bp)wellness.appendChild(bp);
  if(wellness&&weight)wellness.appendChild(weight);
  if(activities&&miles)activities.appendChild(miles);
}
function arrangeActivityTrainingCards(){
  const panel=document.querySelector('#tab-activities > .panel');
  const workout=document.getElementById('todayWorkoutCard');
  const active=document.getElementById('tpPersistSection');
  const archive=document.getElementById('tpArchiveSection');
  if(!panel)return;
  if(active&&archive)panel.insertBefore(active,archive);
  if(workout)panel.insertBefore(workout,panel.firstElementChild);
}
function renderActivitySectionCharts(){
  renderMilesChart();
}
function renderNutritionSectionCharts(){renderSectionCharts('nutritionChartsGrid',[{k:'calories',l:'Calories',c:'#f39c12'},{k:'water',l:'Water',c:'#3498db'}]);}
function renderLibrarySectionCharts(){renderSectionCharts('libraryChartsGrid',[{k:'audiobook',l:'Audiobook Time',c:'#27ae60'}]);}
function renderSkillSectionCharts(){
  var grid=document.getElementById('skillChartsGrid');if(!grid)return;
  grid.innerHTML='';
  if(typeof Chart==='undefined'){grid.innerHTML='<div class="dash-card"><h3>Chart unavailable</h3><div style="font-size:.82rem;color:#667085;">Check your internet connection and refresh.</div></div>';return;}
  var ws=wkStart(0),dateKeys=[],labels=[],sessions=[0,0,0,0,0,0,0],minutes=[0,0,0,0,0,0,0];
  for(var i=0;i<7;i++){var day=new Date(ws);day.setDate(ws.getDate()+i);dateKeys.push(dk(day));labels.push(day.toLocaleDateString('en-US',{weekday:'short'}));}
  var entries=getSkillEntries().slice(),hidden=[];try{hidden=JSON.parse(localStorage.getItem('hidden_skill_daily_ids')||'[]');}catch(ignore){}
  dateKeys.forEach(function(dateKey,idx){
    var dayEntries=entries.filter(function(e){return e.date===dateKey;});
    dayEntries.forEach(function(e){sessions[idx]++;minutes[idx]+=parseMins(e.time);});
    try{
      var raw=localStorage.getItem('planner_'+dateKey),d=raw?JSON.parse(raw):{};
      if((d.gaSkill==='green'||d.gaSkillText)&&d.gaSkillText&&!hidden.includes('daily_'+dateKey)){
        var duplicate=dayEntries.some(function(e){return e.name===d.gaSkillText;});
        if(!duplicate){sessions[idx]++;minutes[idx]+=parseMins(d.gaSkillTime);}
      }
    }catch(ignore){}
  });
  var totalSessions=sessions.reduce(function(a,b){return a+b;},0),totalMinutes=minutes.reduce(function(a,b){return a+b;},0),id='section_skillChartsGrid_sessions';
  var card=document.createElement('div');card.className='dash-card';
  card.innerHTML='<h3 style="margin-bottom:3px;">Learning &amp; Growth Sessions &mdash; This Week</h3><div style="font-size:.75rem;color:#667085;margin-bottom:8px;">Sessions logged from My Schedule</div><div style="height:220px;"><canvas id="'+id+'"></canvas></div><div style="font-size:.75rem;color:#667085;text-align:center;margin-top:8px;"><strong>'+totalSessions+'</strong> session'+(totalSessions===1?'':'s')+(totalMinutes?' &nbsp;&bull;&nbsp; <strong>'+fmtMins(totalMinutes)+'</strong> total':'')+'</div>';
  grid.appendChild(card);if(charts[id]){charts[id].destroy();delete charts[id];}
  charts[id]=new Chart(document.getElementById(id).getContext('2d'),{type:'bar',data:{labels:labels,datasets:[{data:sessions,backgroundColor:'#e91e8c',borderColor:'#be185d',borderWidth:1,borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var n=ctx.parsed.y||0,m=minutes[ctx.dataIndex]||0;return n+' session'+(n===1?'':'s')+(m?' - '+fmtMins(m):'');}}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{stepSize:1,precision:0},title:{display:true,text:'Completed sessions'}}}}});
}
function renderWellnessSectionCharts(){renderBPChart();renderWeightChart();}

// Weekly habit trend: days-hit (0-7) for Bible / Prayer / Exercise / Water over the dashboard week.
function renderHabitStreakChart(ws){
  var habitDefs=[
    {k:'bible',   l:'Bible',    c:'#f0b429', fn:function(d,dateKey){return d.spBibleAudio==='green';}},
    {k:'prayer',  l:'Prayer',   c:'#8e44ad', fn:function(d,dateKey){return d.spAIPrayer==='green';}},
    {k:'exercise',l:'Exercise', c:'#e67e22', fn:function(d,dateKey){return d.exRun==='green'||d.exStrength==='green'||d.exBike==='green'||d.exWalk==='green'||hasActivityOnDate(dateKey);}},
    {k:'water',   l:'Water',    c:'#3498db', fn:function(d){return (parseFloat(d.waterOz)||parseFloat(d.waterCount)*8||0)>=64;}}
  ];
  var counts=habitDefs.map(function(){return 0;});
  for(var i=0;i<7;i++){
    var d=new Date(ws);d.setDate(ws.getDate()+i);
    var dateKey=dk(d);
    var r=localStorage.getItem('planner_'+dateKey);
    if(!r)continue;
    var dd=JSON.parse(r);
    habitDefs.forEach(function(h,idx){if(h.fn(dd,dateKey))counts[idx]++;});
  }
  var grid=document.getElementById('dashGrid');
  if(!grid)return;
  var id='ch_habitStreaks';
  var card=document.createElement('div');
  card.className='dash-card';
  card.innerHTML='<h3>Habit Streaks (days this week)</h3><canvas id="'+id+'"></canvas>';
  grid.appendChild(card);
  if(charts[id]){charts[id].destroy();delete charts[id];}
  var ctx=document.getElementById(id).getContext('2d');
  charts[id]=new Chart(ctx,{type:'bar',data:{labels:habitDefs.map(function(h){return h.l;}),datasets:[{data:counts,backgroundColor:habitDefs.map(function(h){return h.c;}),borderRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:7,ticks:{stepSize:1}}},animation:false}});
}

// ── BP Trend Chart ────────────────────────────────────────────────────────────
function renderBPChart(){
  const canvas=document.getElementById('bpChart');if(!canvas)return;
  const days=60;const entries=[];
  const today2=new Date();
  for(let i=days-1;i>=0;i--){
    const d=new Date(today2);d.setDate(today2.getDate()-i);
    const r=localStorage.getItem('planner_'+dk(d));
    if(r){
      const dd=JSON.parse(r);const bp=parseBP(dd.wBPVal);const pulse=parseFloat(dd.wPulseVal)||0;
      if(bp.sys||pulse)entries.push({date:dk(d),sys:bp.sys,dia:bp.dia,pulse,label:d.toLocaleDateString('en-US',{month:'numeric',day:'numeric'})});
    }
  }
  const w=canvas.parentElement;if(w)w.style.display='block';
  if(entries.length<2){
    const c=document.getElementById('bpChart');if(c){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);}
    const avg=document.getElementById('bpChartAvg');if(avg)avg.textContent='No BP readings logged yet. Log readings on the Daily tab under Health → BP/Pulse.';
    return;
  }
  const doDraw=()=>{
    const W=Math.max(canvas.parentElement?canvas.parentElement.clientWidth-28:280,200);
    const H=130;canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
    const pad={l:28,r:10,t:16,b:22};
    const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
    const allVals=entries.flatMap(e=>[e.sys,e.dia,e.pulse].filter(v=>v>0));
    if(!allVals.length)return;
    const minV=Math.max(0,Math.min(...allVals)-10),maxV=Math.max(...allVals)+10;
    const xStep=cW/Math.max(1,entries.length-1);
    const yScale=v=>(1-(v-minV)/(maxV-minV))*cH+pad.t;
    for(let g=0;g<=4;g++){const y=pad.t+g*(cH/4);ctx.strokeStyle='#f0f0f0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      const val=Math.round(maxV-(g/4)*(maxV-minV));ctx.fillStyle='#bbb';ctx.font='8px sans-serif';ctx.textAlign='right';ctx.fillText(val,pad.l-3,y+3);}
    [['sys','#e74c3c'],['dia','#3498db'],['pulse','#e67e22']].forEach(([key,color])=>{
      const pts=entries.filter(e=>e[key]>0);if(pts.length<1)return;
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
      pts.forEach((e,pi)=>{const i=entries.indexOf(e);const x=pad.l+i*xStep,y=yScale(e[key]);pi===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
      ctx.stroke();
      ctx.fillStyle=color;
      pts.forEach(e=>{const i=entries.indexOf(e);const x=pad.l+i*xStep,y=yScale(e[key]);ctx.beginPath();ctx.arc(x,y,2.5,0,2*Math.PI);ctx.fill();});
    });
    ctx.fillStyle='#bbb';ctx.font='8px sans-serif';ctx.textAlign='center';
    const step=Math.max(1,Math.floor(entries.length/6));
    entries.forEach((e,i)=>{if(i%step===0||i===entries.length-1)ctx.fillText(e.label,pad.l+i*xStep,H-4);});
  };
  setTimeout(doDraw,80);
  const sysArr=entries.map(e=>e.sys).filter(v=>v>0);
  const diaArr=entries.map(e=>e.dia).filter(v=>v>0);
  const pulArr=entries.map(e=>e.pulse).filter(v=>v>0);
  const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
  const el=document.getElementById('bpChartAvg');
  if(el)el.textContent='60-day avg — BP: '+avg(sysArr)+'/'+avg(diaArr)+' mmHg  •  Pulse: '+avg(pulArr)+' bpm  ('+entries.length+' readings)';
}


function openBPReport(){
  var modal=document.getElementById('bpReportModal'),date=document.getElementById('bpReportDate');
  if(!modal)return;if(date)date.value=dk(today);modal.style.display='flex';bpPeriodChange();
}
function closeBPReport(){var modal=document.getElementById('bpReportModal');if(modal)modal.style.display='none';}
function bpPeriodChange(){
  var period=(document.getElementById('bpReportPeriod')||{}).value||'weekly';
  var single=document.getElementById('bpSingleDateRow'),range=document.getElementById('bpRangeRow');
  if(single)single.style.display=period==='daily'?'block':'none';
  if(range)range.style.display=period==='range'?'block':'none';
  if(period==='range'){
    var end=document.getElementById('bpRangeEnd'),start=document.getElementById('bpRangeStart');
    if(end&&!end.value)end.value=dk(today);
    if(start&&!start.value){var d=new Date(today);d.setDate(d.getDate()-29);start.value=dk(d);}
  }
  renderBPReport();
}
function bpReportBounds(){
  var period=(document.getElementById('bpReportPeriod')||{}).value||'weekly',anchor=new Date(today);
  if(period==='daily'){var dv=(document.getElementById('bpReportDate')||{}).value;if(dv)anchor=new Date(dv+'T12:00:00');return{start:new Date(anchor),end:new Date(anchor)};}
  if(period==='range'){var sv=(document.getElementById('bpRangeStart')||{}).value,ev=(document.getElementById('bpRangeEnd')||{}).value;return{start:sv?new Date(sv+'T12:00:00'):new Date(anchor),end:ev?new Date(ev+'T12:00:00'):new Date(anchor)};}
  var start=new Date(anchor),end=new Date(anchor);
  if(period==='weekly'){start=wkStartOf(anchor);end=new Date(start);end.setDate(end.getDate()+6);}
  else if(period==='monthly'){start=new Date(anchor.getFullYear(),anchor.getMonth(),1);end=new Date(anchor.getFullYear(),anchor.getMonth()+1,0);}
  else if(period==='yearly'){start=new Date(anchor.getFullYear(),0,1);end=new Date(anchor.getFullYear(),11,31);}
  return{start:start,end:end};
}
function renderBPReport(){
  var out=document.getElementById('bpReportTable');if(!out)return;
  var bounds=bpReportBounds();if(bounds.start>bounds.end){out.innerHTML='<div style="color:#b42318;font-size:.82rem;">The start date must be before the end date.</div>';return;}
  var rows=[];
  for(var d=new Date(bounds.start);d<=bounds.end;d.setDate(d.getDate()+1)){
    var raw=localStorage.getItem('planner_'+dk(d));if(!raw)continue;
    var data;try{data=JSON.parse(raw);}catch(e){continue;}
    var bp=parseBP(data.wBPVal),pulse=parseFloat(data.wPulseVal)||0;if(bp.sys||pulse)rows.push({date:new Date(d),sys:bp.sys,dia:bp.dia,pulse:pulse});
  }
  var print=document.getElementById('bpPrintBtn');
  if(!rows.length){out.innerHTML='<div style="background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:12px;font-size:.82rem;color:#667085;">No blood-pressure or pulse readings were logged for this period.</div>';if(print)print.style.display='none';return;}
  var bpRows=rows.filter(function(r){return r.sys&&r.dia;}),pulseRows=rows.filter(function(r){return r.pulse;});
  var avg=function(arr,key){return arr.length?Math.round(arr.reduce(function(s,r){return s+r[key];},0)/arr.length):0;};
  out.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><div class="review-stat"><strong>'+avg(bpRows,'sys')+'/'+avg(bpRows,'dia')+'</strong>Average BP</div><div class="review-stat"><strong>'+(avg(pulseRows,'pulse')||'—')+'</strong>Average Pulse</div><div class="review-stat"><strong>'+rows.length+'</strong>Readings</div></div><div style="overflow-x:auto;"><table class="summary-table" style="display:table;margin-bottom:0;"><thead><tr><th>Date</th><th>Systolic</th><th>Diastolic</th><th>Pulse</th></tr></thead><tbody>'+rows.map(function(r){return'<tr><td>'+r.date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+'</td><td>'+(r.sys||'—')+'</td><td>'+(r.dia||'—')+'</td><td>'+(r.pulse||'—')+'</td></tr>';}).join('')+'</tbody></table></div>';
  if(print)print.style.display='block';
}
function printBPReport(){
  var content=(document.getElementById('bpReportTable')||{}).innerHTML;if(!content)return;
  var w=window.open('','_blank','width=800,height=700');if(!w){alert('Please allow pop-ups to print the report.');return;}
  w.document.write('<!doctype html><html><head><title>Blood Pressure Report</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#222}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}.review-stat{display:inline-block;margin:0 8px 12px 0;padding:8px 12px;background:#f3f4f6;border-radius:7px}.review-stat strong{display:block;font-size:18px}@media print{body{padding:0}}</style></head><body><h1>Blood Pressure and Pulse Report</h1>'+content+'</body></html>');
  w.document.close();w.focus();setTimeout(function(){w.print();},250);
}

function renderWeightChart(){
  const wrap=document.getElementById('weightChartWrap');
  const canvas=document.getElementById('weightChart');
  if(!canvas||!wrap)return;
  const entries=[];
  const today2=new Date();
  for(let i=59;i>=0;i--){
    const d=new Date(today2);d.setDate(today2.getDate()-i);
    const r=localStorage.getItem('planner_'+dk(d));
    if(r){
      const dd=JSON.parse(r);const w=parseFloat(dd.wWghtVal)||0;
      if(w>0)entries.push({date:dk(d),val:w,label:d.toLocaleDateString('en-US',{month:'numeric',day:'numeric'})});
    }
  }
  wrap.style.display='block';
  if(entries.length<2){
    const c=document.getElementById('weightChart');if(c){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);}
    const avg=document.getElementById('weightChartAvg');if(avg)avg.textContent='No weight logged yet. Log weight on the Daily tab under Health → Weight.';
    return;
  }
  const doDraw=()=>{
    const W=Math.max(canvas.parentElement?canvas.parentElement.clientWidth-28:280,200);
    const H=120;canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
    const pad={l:36,r:10,t:14,b:22};
    const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
    const vals=entries.map(e=>e.val);
    const minV=Math.max(0,Math.min(...vals)-5),maxV=Math.max(...vals)+5;
    const xScale=i=>pad.l+i*(cW/Math.max(1,entries.length-1));
    const yScale=v=>pad.t+(1-(v-minV)/(maxV-minV))*cH;
    for(let g=0;g<=4;g++){
      const y=pad.t+g*(cH/4);ctx.strokeStyle='#f0f0f0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      const val=(maxV-g/4*(maxV-minV)).toFixed(1);ctx.fillStyle='#bbb';ctx.font='8px sans-serif';ctx.textAlign='right';ctx.fillText(val,pad.l-3,y+3);
    }
    // Fill area under line
    ctx.beginPath();
    entries.forEach((e,i)=>{i===0?ctx.moveTo(xScale(i),yScale(e.val)):ctx.lineTo(xScale(i),yScale(e.val));});
    ctx.lineTo(xScale(entries.length-1),pad.t+cH);ctx.lineTo(xScale(0),pad.t+cH);ctx.closePath();
    ctx.fillStyle='rgba(142,68,173,0.1)';ctx.fill();
    // Line
    ctx.strokeStyle='#8e44ad';ctx.lineWidth=2;ctx.beginPath();
    entries.forEach((e,i)=>{i===0?ctx.moveTo(xScale(i),yScale(e.val)):ctx.lineTo(xScale(i),yScale(e.val));});
    ctx.stroke();
    // Dots
    ctx.fillStyle='#8e44ad';
    entries.forEach((e,i)=>{ctx.beginPath();ctx.arc(xScale(i),yScale(e.val),2.5,0,2*Math.PI);ctx.fill();});
    // X labels
    ctx.fillStyle='#bbb';ctx.font='8px sans-serif';ctx.textAlign='center';
    const step=Math.max(1,Math.floor(entries.length/6));
    entries.forEach((e,i)=>{if(i%step===0||i===entries.length-1)ctx.fillText(e.label,xScale(i),H-4);});
  };
  setTimeout(doDraw,80);
  const avg=(entries.reduce((a,e)=>a+e.val,0)/entries.length).toFixed(1);
  const min=Math.min(...entries.map(e=>e.val)).toFixed(1);
  const max=Math.max(...entries.map(e=>e.val)).toFixed(1);
  const el=document.getElementById('weightChartAvg');
  if(el)el.textContent='60-day avg: '+avg+' lbs  •  Range: '+min+' – '+max+' lbs  ('+entries.length+' readings)';
}

function renderMilesChart(){
  const wrap=document.getElementById('milesChartWrap');
  const canvas=document.getElementById('milesChart');
  if(!canvas||!wrap)return;
  const entries=[];
  const today2=new Date();
  for(let i=59;i>=0;i--){
    const d=new Date(today2);d.setDate(today2.getDate()-i);
    const r=localStorage.getItem('planner_'+dk(d));
    if(r){
      const dd=JSON.parse(r);const dm=getDM(dd,dk(d));const m=dm.miles||parseFloat(dd.exMiles)||0;
      entries.push({date:dk(d),val:m,label:d.toLocaleDateString('en-US',{month:'numeric',day:'numeric'})});
    }
  }
  const withMiles=entries.filter(e=>e.val>0);
  wrap.style.display='block';
  if(withMiles.length<2){
    const c=document.getElementById('milesChart');if(c){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);}
    const avg=document.getElementById('milesChartAvg');if(avg)avg.textContent='No mileage logged yet. Log miles on the Daily tab under Exercise → Miles.';
    return;
  }
  const doDraw=()=>{
    const W=Math.max(canvas.parentElement?canvas.parentElement.clientWidth-28:280,200);
    const H=120;canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
    const pad={l:28,r:10,t:14,b:22};
    const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
    const maxV=Math.max(...entries.map(e=>e.val))+0.5;
    const minV=0;
    const xScale=i=>pad.l+i*(cW/Math.max(1,entries.length-1));
    const yScale=v=>pad.t+(1-(v-minV)/(maxV-minV))*cH;
    for(let g=0;g<=4;g++){
      const y=pad.t+g*(cH/4);ctx.strokeStyle='#f0f0f0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      const val=(maxV-g/4*(maxV-minV)).toFixed(1);ctx.fillStyle='#bbb';ctx.font='8px sans-serif';ctx.textAlign='right';ctx.fillText(val,pad.l-3,y+3);
    }
    // Bars
    const barW=Math.max(2,cW/entries.length*0.6);
    entries.forEach((e,i)=>{
      if(e.val<=0)return;
      const x=xScale(i);const y=yScale(e.val);const bh=pad.t+cH-y;
      ctx.fillStyle='rgba(39,174,96,0.75)';
      ctx.fillRect(x-barW/2,y,barW,bh);
    });
    // X labels
    ctx.fillStyle='#bbb';ctx.font='8px sans-serif';ctx.textAlign='center';
    const step=Math.max(1,Math.floor(entries.length/6));
    entries.forEach((e,i)=>{if(i%step===0||i===entries.length-1)ctx.fillText(e.label,xScale(i),H-4);});
  };
  setTimeout(doDraw,80);
  const totalMiles=withMiles.reduce((a,e)=>a+e.val,0);
  const el=document.getElementById('milesChartAvg');
  if(el)el.textContent='60-day total: '+totalMiles.toFixed(1)+' mi  •  Avg run day: '+(totalMiles/withMiles.length).toFixed(1)+' mi  ('+withMiles.length+' run days)';
}

// ── Shared AI helper ─────────────────────────────────────────────────────────
function nextDayRunContext(){
  var nextDate=new Date(today);nextDate.setDate(nextDate.getDate()+1);
  var nextKey=dk(nextDate);
  var lines=[];
  var scheduled=getActivities().filter(function(a){
    return a.date===nextKey&&String(a.type||'Run').toLowerCase().indexOf('run')!==-1;
  });
  scheduled.forEach(function(a){
    lines.push('Scheduled activity: '+[
      a.title||'Run',
      a.distance?Number(a.distance).toFixed(2)+' miles':'',
      a.duration||'',
      a.pace?a.pace+'/mi':'',
      a.power?a.power+' W':'',
      a.notes||'',
      a.injuryReport?'Injury report: '+a.injuryReport:''
    ].filter(Boolean).join(' | '));
  });
  var cached=localStorage.getItem('workout_cache_'+nextKey);
  if(cached)lines.push('Tomorrow workout details: '+cached);
  var raw=localStorage.getItem('current_training_plan');
  if(raw){
    try{
      var plan=JSON.parse(raw),text=String(plan.text||'');
      var dayNum=0;
      if(plan.startDate){
        dayNum=Math.floor((new Date(nextKey+'T00:00:00')-new Date(plan.startDate+'T00:00:00'))/86400000)+1;
      }
      var planLines=text.split(/\r?\n/),hit=-1;
      var dateWords=nextDate.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}).toLowerCase();
      for(var i=0;i<planLines.length;i++){
        var lower=planLines[i].toLowerCase();
        if(lower.indexOf(dateWords)>=0||lower.indexOf(nextKey)>=0||(dayNum>0&&new RegExp('\\bday\\s*'+dayNum+'\\b','i').test(planLines[i]))){hit=i;break;}
      }
      var excerpt=hit>=0?planLines.slice(Math.max(0,hit-2),Math.min(planLines.length,hit+7)).join('\n'):text.slice(0,7000);
      if(excerpt.trim())lines.push('Active training plan context'+(dayNum>0?' (tomorrow is plan day '+dayNum+')':'')+':\n'+excerpt);
    }catch(e){}
  }
  return{date:nextDate,key:nextKey,text:lines.join('\n\n')};
}
function selectedDayRunContext(){
  var runDate=new Date(today),runKey=dk(runDate),lines=[];
  var runs=getActivities().filter(function(a){
    return a.date===runKey&&String(a.type||'Run').toLowerCase().indexOf('run')!==-1;
  });
  runs.forEach(function(a){
    lines.push('Run activity: '+[
      a.title||'Run',
      a.distance?Number(a.distance).toFixed(2)+' miles':'',
      a.duration||'',
      a.pace?a.pace+'/mi':'',
      a.power?a.power+' W':'',
      a.calories?a.calories+' calories':'',
      a.elevation?a.elevation+' ft elevation gain':'',
      a.notes||'',
      a.injuryReport?'Injury report: '+a.injuryReport:''
    ].filter(Boolean).join(' | '));
  });
  var cached=localStorage.getItem('workout_cache_'+runKey);
  if(cached)lines.push('Scheduled workout details: '+cached);
  var raw=localStorage.getItem('current_training_plan');
  if(raw){
    try{
      var plan=JSON.parse(raw),text=String(plan.text||''),dayNum=0;
      if(plan.startDate){
        dayNum=Math.floor((new Date(runKey+'T00:00:00')-new Date(plan.startDate+'T00:00:00'))/86400000)+1;
      }
      var planLines=text.split(/\r?\n/),hit=-1;
      var dateWords=runDate.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}).toLowerCase();
      for(var i=0;i<planLines.length;i++){
        var lower=planLines[i].toLowerCase();
        if(lower.indexOf(dateWords)>=0||lower.indexOf(runKey)>=0||(dayNum>0&&new RegExp('\\bday\\s*'+dayNum+'\\b','i').test(planLines[i]))){hit=i;break;}
      }
      if(hit>=0){
        var excerpt=planLines.slice(Math.max(0,hit-2),Math.min(planLines.length,hit+7)).join('\n');
        if(excerpt.trim())lines.push('Active training plan context'+(dayNum>0?' (plan day '+dayNum+')':'')+':\n'+excerpt);
      }
    }catch(e){}
  }
  return{date:runDate,key:runKey,text:lines.join('\n\n')};
}
function aiRecoveryMealPlan(btn){
  if(!journalAIKey()){
    alert('Add your Anthropic API key in Settings first.');
    return;
  }
  var context=selectedDayRunContext();
  if(!context.text.trim()){
    alert('No logged run or scheduled training information was found for the selected day.');
    return;
  }
  var result=document.getElementById('aiMealPlanResult');
  if(result){result.style.display='block';result.textContent='Creating recovery-focused meals for the selected run day...';}
  aiBtnState(btn,true);
  var dateLabel=context.date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  var prompt='Create a practical same-day meal plan that supports RECOVERY from the athlete’s run on '+dateLabel+'. Use only the run information supplied below and do not invent workout facts. Emphasize ordinary foods, post-run carbohydrate and protein intake, hydration, and balanced meals appropriate to the run’s duration and difficulty. Avoid medical claims, supplements, extreme quantities, and precise calorie or macro targets unless supplied. Return ONLY valid JSON with these string fields: breakfast, lunch, dinner, snacks, sportsNutrition, rationale. Keep each meal field concise. Make sportsNutrition focus on immediate post-run recovery, fluids, and electrolytes when appropriate.\n\nRUN INFORMATION\n'+context.text;
  aiCall(prompt,1800,function(text){
    aiBtnState(btn,false);
    try{
      var clean=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
      var first=clean.indexOf('{'),last=clean.lastIndexOf('}');
      if(first>=0&&last>first)clean=clean.slice(first,last+1);
      var plan=JSON.parse(clean);
      var fields={mpBreakfast:plan.breakfast,mpLunch:plan.lunch,mpDinner:plan.dinner,mpSnack:plan.snacks,mpSports:plan.sportsNutrition};
      Object.keys(fields).forEach(function(id){
        var el=document.getElementById(id);
        if(el&&fields[id]!=null){el.value=String(fields[id]);el.dispatchEvent(new Event('input',{bubbles:true}));}
      });
      save();
      if(result){
        result.textContent='Recovery meal plan prepared for '+dateLabel+'.'+(plan.rationale?'\n\nWhy this supports recovery:\n'+plan.rationale:'');
        result.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    }catch(e){
      if(result)result.textContent='The AI response could not be placed into the meal fields automatically. Response:\n\n'+text;
    }
  },function(message){
    aiBtnState(btn,false);
    if(result)result.textContent='Recovery meal plan could not be created: '+message;
  });
}
function aiMealPlanForNextRun(btn){
  if(!journalAIKey()){
    alert('Add your Anthropic API key in Settings first.');
    return;
  }
  var context=nextDayRunContext();
  if(!context.text.trim()){
    alert('No run or active training-plan information was found for tomorrow.');
    return;
  }
  var result=document.getElementById('aiMealPlanResult');
  if(result){result.style.display='block';result.textContent='Creating a meal plan for tomorrow’s run...';}
  aiBtnState(btn,true);
  var dateLabel=context.date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  var prompt='Create a practical meal plan for TODAY that supports the athlete’s scheduled run TOMORROW ('+dateLabel+'). Use the workout information below. Do not invent workout facts. Emphasize ordinary foods, sensible carbohydrate availability, hydration, and recovery. Avoid medical claims, supplements, extreme quantities, and precise calorie targets unless supplied. Return ONLY valid JSON with these string fields: breakfast, lunch, dinner, snacks, sportsNutrition, rationale. Keep each meal field concise and make sportsNutrition cover tonight, pre-run, during-run only if appropriate, and post-run guidance.\n\nWORKOUT INFORMATION\n'+context.text;
  aiCall(prompt,1800,function(text){
    aiBtnState(btn,false);
    try{
      var clean=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
      var first=clean.indexOf('{'),last=clean.lastIndexOf('}');
      if(first>=0&&last>first)clean=clean.slice(first,last+1);
      var plan=JSON.parse(clean);
      var fields={mpBreakfast:plan.breakfast,mpLunch:plan.lunch,mpDinner:plan.dinner,mpSnack:plan.snacks,mpSports:plan.sportsNutrition};
      Object.keys(fields).forEach(function(id){
        var el=document.getElementById(id);
        if(el&&fields[id]!=null){el.value=String(fields[id]);el.dispatchEvent(new Event('input',{bubbles:true}));}
      });
      save();
      if(result){
        result.textContent='Plan prepared for '+dateLabel+'.'+(plan.rationale?'\n\nWhy this fits tomorrow’s run:\n'+plan.rationale:'');
        result.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    }catch(e){
      if(result)result.textContent='The AI response could not be placed into the meal fields automatically. Response:\n\n'+text;
    }
  },function(message){
    aiBtnState(btn,false);
    if(result)result.textContent='Meal plan could not be created: '+message;
  });
}

function callAI(prompt,resultDivId,maxTok){
  const el=document.getElementById(resultDivId);
  if(el){el.style.display='block';el.textContent='⏳ Thinking...';}
  aiCall(prompt,maxTok||600,
    text=>{aiShow(resultDivId,text);},
    err=>{if(el){el.textContent='Error: '+err;}}
  );
}
function aiCall(prompt,maxTok,onResult,onErr){
  if(!journalAIAvailable()){alert('Add your Anthropic API key in Settings first.');return false;}
  const context=journalAIContext();
  const enrichedPrompt=(context?context+'\n\n':'')+prompt;
  journalProtectedFunction({model:'claude-haiku-4-5-20251001',max_tokens:maxTok,messages:[{role:'user',content:enrichedPrompt}]}).then(data=>{
    if(data.error){onErr&&onErr(data.error.message);return;}
    onResult((data.content[0].text||'').trim());
  }).catch(e=>{onErr&&onErr(e.message);});
  return true;
}
var _aiLastShown={};
function aiShow(boxId,text,archLabel){
  const el=document.getElementById(boxId);
  if(!el)return;
  el.style.display='block';
  el.innerHTML='<div style="white-space:pre-wrap;line-height:1.6;">'+escHtml(text)+'</div>';
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function archiveAIResp(boxId){
  const d=_aiLastShown[boxId];if(!d)return;
  const arch=JSON.parse(localStorage.getItem('ai_archive')||'[]');
  arch.unshift({label:d.lbl,text:d.text,ts:new Date().toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})});
  while(arch.length>150)arch.pop();
  localStorage.setItem('ai_archive',JSON.stringify(arch));
  const el=document.getElementById(boxId);
  if(el){const btn=el.querySelector('button[onclick]');if(btn){btn.textContent='✓ Archived';btn.disabled=true;btn.style.background='#27ae60';}}
}
function openAIArchive(){
  const arch=JSON.parse(localStorage.getItem('ai_archive')||'[]');
  const m=document.getElementById('aiArchiveModal');
  const list=document.getElementById('aiArchiveList');
  if(!m||!list)return;
  if(!arch.length){list.innerHTML='<div style="color:#aaa;text-align:center;padding:20px;font-size:0.9rem;">No archived responses yet.</div>';}
  else{list.innerHTML=arch.map(function(a,i){return '<div class="tp-archive-item">'
    +'<div class="tp-archive-meta" style="display:flex;align-items:flex-start;gap:6px;">'
    +'<span style="flex:1;font-size:0.75rem;color:#888;">'+escHtml(a.ts)+' — <strong style="color:#555;">'+escHtml(a.label)+'</strong></span>'
    +'<button onclick="toggleAIArchiveItem(this)" data-idx="'+i+'" style="background:none;border:1px solid #d0aaff;border-radius:6px;color:#8e44ad;cursor:pointer;font-size:0.72rem;padding:2px 8px;white-space:nowrap;">Expand</button>'
    +'<button onclick="deleteAIArchive('+i+')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1rem;line-height:1;padding:0 2px;">&#x2715;</button>'
    +'</div>'
    +'<div class="tp-archive-preview" id="aip_'+i+'">'+escHtml(a.text)+'</div>'
    +'</div>';}).join('');}
  m.style.display='flex';
}
function deleteAIArchive(idx){
  const arch=JSON.parse(localStorage.getItem('ai_archive')||'[]');
  arch.splice(idx,1);localStorage.setItem('ai_archive',JSON.stringify(arch));openAIArchive();
}
function toggleAIArchiveItem(btn){
  var idx=btn.dataset.idx;
  var preview=document.getElementById('aip_'+idx);
  if(!preview)return;
  var expanded=preview.classList.toggle('expanded');
  btn.textContent=expanded?'Collapse':'Expand';
}
function closeAIArchive(){document.getElementById('aiArchiveModal').style.display='none';}

// ── Weekly Run Notes (Activities tab) ─────────────────────────────────────
var wrnOff=0;
function wrnMonday(off){var d=new Date(today);var day=d.getDay();var diff=day===0?-6:1-day;d.setDate(d.getDate()+diff+(off*7));d.setHours(0,0,0,0);return d;}
function wrnKey(off){return 'act_week_note_'+dk(wrnMonday(off));}
function wrnLabel(off){var m=wrnMonday(off);var e=new Date(m);e.setDate(m.getDate()+6);return m.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function loadWrnNote(){
  var ta=document.getElementById('wrnNote');var lbl=document.getElementById('wrnWeekLabel');
  if(ta)ta.value=localStorage.getItem(wrnKey(wrnOff))||'';
  if(lbl)lbl.textContent=wrnLabel(wrnOff);
}
function saveWrnNote(){
  var ta=document.getElementById('wrnNote');if(!ta)return;
  var val=ta.value.trim();
  if(val)localStorage.setItem(wrnKey(wrnOff),val);
  else localStorage.removeItem(wrnKey(wrnOff));
  var s=document.getElementById('wrnSaved');if(s){s.style.display='inline';setTimeout(function(){s.style.display='none';},1800);}
}
function clearWrnNote(){var ta=document.getElementById('wrnNote');if(ta)ta.value='';saveWrnNote();}
function changeWrnWeek(delta){wrnOff+=delta;loadWrnNote();}
function toggleActivitiesLog(){
  var section=document.getElementById('activitiesLogSection');
  var arrow=document.getElementById('activitiesLogArrow');
  var toggle=section?section.previousElementSibling:null;
  if(!section)return;
  var opening=section.style.display==='none';
  section.style.display=opening?'block':'none';
  if(arrow)arrow.innerHTML=opening?'&#x25BC;':'&#x25B6;';
  if(toggle)toggle.setAttribute('aria-expanded',opening?'true':'false');
  if(opening)renderActivities();
}
function resetActivityAdvancedPanels(){
  var metrics=document.getElementById('runMetricsPanel');
  var metricsChev=document.getElementById('metricsChev');
  var notes=document.getElementById('wrnSection');
  var notesArrow=document.getElementById('wrnArrow');
  var filters=document.querySelector('#activitiesLogSection .act-filter-shell');
  if(metrics)metrics.style.display='none';
  if(metricsChev)metricsChev.innerHTML='&#x25BC;';
  if(notes)notes.style.display='none';
  if(notesArrow)notesArrow.innerHTML='&#x25B6;';
  if(filters)filters.removeAttribute('open');
}
function toggleWeekRunNotes(){
  var sec=document.getElementById('wrnSection');var arr=document.getElementById('wrnArrow');
  if(!sec)return;var open=sec.style.display!=='none';
  sec.style.display=open?'none':'block';if(arr)arr.textContent=open?'▶':'▼';
  if(!open)loadWrnNote();
}
function aiWeeklyRunWrapUp(btn){
  if(!journalAIKey()){
    alert('Add your Anthropic API key in Settings first.');
    return;
  }
  var start=wrnMonday(wrnOff),end=new Date(start);
  end.setDate(start.getDate()+6);
  function isoDay(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  var startIso=isoDay(start),endIso=isoDay(end);
  var runs=uniqueRunActivities(startIso,endIso);
  if(!runs.length){
    alert('No running activities were found for '+wrnLabel(wrnOff)+'.');
    return;
  }
  var totalMiles=0,totalMinutes=0,totalElevation=0,totalCalories=0,powerSum=0,powerCount=0,longest=null;
  runs.forEach(function(a){
    var miles=Number(a.distance)||0;
    totalMiles+=miles;
    totalMinutes+=parseMins(String(a.duration||''));
    totalElevation+=Number(a.elevGain)||0;
    totalCalories+=Number(a.calories)||0;
    if(Number(a.power)>0){powerSum+=Number(a.power);powerCount++;}
    if(!longest||miles>(Number(longest.distance)||0))longest=a;
  });
  var avgPace=totalMiles>0&&totalMinutes>0?fmtPace(totalMinutes*60/totalMiles)+'/mi':'not available';
  var existing=(document.getElementById('wrnNote')||{}).value||'';
  var activityLines=runs.slice().sort(function(a,b){return String(a.date||'').localeCompare(String(b.date||''));}).map(function(a){
    return [
      a.date||'No date',
      a.title||a.type||'Run',
      (Number(a.distance)||0).toFixed(2)+' mi',
      a.duration||'duration unavailable',
      a.pace?String(a.pace)+'/mi':'pace unavailable',
      Number(a.power)>0?Math.round(Number(a.power))+' W':'power unavailable',
      Number(a.heartRate)>0?Math.round(Number(a.heartRate))+' bpm':'heart rate unavailable',
      Number(a.elevGain)>0?Math.round(Number(a.elevGain))+' ft gain':'elevation unavailable',
      a.notes?'notes: '+a.notes:'',
      a.injuryReport?'injury report: '+a.injuryReport:''
    ].filter(Boolean).join(' | ');
  }).join('\n');
  var prompt='Write a concise weekly running wrap-up for '+wrnLabel(wrnOff)+'. Use only the supplied facts and do not invent performance, recovery, injury, or health claims. Keep it encouraging, practical, and about 150-220 words. Use short headings: Week at a Glance, Strongest Session, Patterns & Recovery, and Focus for Next Week. If a conclusion is uncertain, say so. This is training reflection, not medical advice.\n\n'
    +'SUMMARY\nRuns: '+runs.length+'\nDistance: '+totalMiles.toFixed(2)+' miles\nTime: '+fmtMins(totalMinutes)+'\nAverage pace: '+avgPace+'\nElevation gain: '+Math.round(totalElevation)+' ft\nCalories: '+Math.round(totalCalories)+'\nAverage recorded power: '+(powerCount?Math.round(powerSum/powerCount)+' W':'not available')+'\nLongest run: '+(longest?((longest.title||'Run')+', '+(Number(longest.distance)||0).toFixed(2)+' miles'):'not available')+'\n\n'
    +'ACTIVITIES\n'+activityLines+'\n\nATHLETE NOTES\n'+(existing.trim()||'No notes entered.');
  aiBtnState(btn,true);
  aiCall(prompt,2200,function(text){
    var ta=document.getElementById('wrnNote');
    if(ta){ta.value=text;ta.dispatchEvent(new Event('input',{bubbles:true}));}
    saveWrnNote();
    aiBtnState(btn,false);
  },function(message){
    aiBtnState(btn,false);
    alert('AI wrap-up could not be created: '+message);
  });
}
// Get current week's run note for AI
function getCurrentWeekRunNote(){return localStorage.getItem(wrnKey(0))||'';}
function aiBtnState(btn,loading,originalText){
  if(!btn)return;
  if(loading){btn.dataset.orig=btn.textContent;btn.disabled=true;btn.textContent='⏳ Thinking...';}
  else{btn.disabled=false;btn.textContent=btn.dataset.orig||originalText||'✨ AI';}
}

// ── Motivate Me ───────────────────────────────────────────────────────────────
function aiMotivate(){
  const btn=document.querySelector('[onclick="aiMotivate()"]');
  aiBtnState(btn,true);
  const d=JSON.parse(localStorage.getItem('planner_'+dk(today))||'{}');
  const dateStr=today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const done=[];
  if(d.spBibleAudio==='green')done.push('Bible reading');
  if(d.spAIPrayer==='green')done.push('prayer');
  if(d.exRun==='green'||d.exStrength==='green'||d.exBike==='green'||d.exWalk==='green'||hasActivityOnDate(dk(today)))done.push('exercise');
  if(d.gaAudiobook==='green')done.push('audiobook');
  const miles=parseFloat(d.exMiles)||0;
  const notes=d.jNotes||d.jAccomplish||'';
  const wkRunNote=getCurrentWeekRunNote();
  const prompt='You are an encouraging life coach. Today is '+dateStr+'.\n'
    +(done.length?'The person has completed today: '+done.join(', ')+'.\n':'')
    +(miles>0?'They ran '+miles+' miles today.\n':'')
    +(notes?'Their journal note: "'+notes+'"\n':'')
    +(wkRunNote?'Weekly Run Analysis: '+wkRunNote+'\n':'')
    +'Write a short (3-5 sentence) personalized motivational message for the rest of their day. Be warm, specific to what they have done, and encouraging about what is ahead. Do not use generic platitudes.';
  aiCall(prompt,2000,
    text=>{aiBtnState(btn,false);aiShow('aiDailyBox',text);},
    err=>{aiBtnState(btn,false);aiShow('aiDailyBox','Error: '+err);}
  );
}

// ── Suggest Goals ─────────────────────────────────────────────────────────────
function aiGoals(){
  const btn=document.querySelector('[onclick="aiGoals()"]');
  aiBtnState(btn,true);
  // Gather last 3 weeks of data
  const lines=[];
  for(let w=1;w<=3;w++){
    const ws=wkStart(-w);let wMiles=0,wBible=0,wEx=0,wAudio=0;
    for(let i=0;i<7;i++){
      const d=new Date(ws);d.setDate(ws.getDate()+i);
      const r=localStorage.getItem('planner_'+dk(d));if(!r)continue;
      const dd=JSON.parse(r);
      wMiles+=parseFloat(dd.exMiles)||0;
      if(dd.spBibleAudio==='green')wBible++;
      if(dd.exRun==='green'||dd.exStrength==='green'||dd.exBike==='green'||dd.exWalk==='green'||hasActivityOnDate(dk(d)))wEx++;
      if(dd.gaAudiobook==='green')wAudio++;
    }
    lines.push('Week -'+w+': '+wMiles.toFixed(1)+' miles, Bible '+wBible+'/7, Exercise '+wEx+'/7, Audiobook '+wAudio+'/7');
  }
  const prompt='You are a goal-setting coach. Here is someone\'s last 3 weeks of habit data:\n'+lines.join('\n')+'\n\nBased on these patterns, suggest 3-5 specific, achievable goals for this coming week across fitness, spirituality, and personal growth. Be concrete (e.g. specific miles, days, minutes). Keep it concise and actionable.';
  aiCall(prompt,2000,
    text=>{aiBtnState(btn,false);aiShow('aiDailyBox',text);},
    err=>{aiBtnState(btn,false);aiShow('aiDailyBox','Error: '+err);}
  );
}

// ── Journal Insights ──────────────────────────────────────────────────────────
function aiJournalInsights(){
  const btn=document.querySelector('[onclick="aiJournalInsights()"]');
  aiBtnState(btn,true);
  const entries=[];
  for(let i=6;i>=0;i--){
    const d=new Date(today);d.setDate(today.getDate()-i);
    const r=localStorage.getItem('planner_'+dk(d));if(!r)continue;
    const dd=JSON.parse(r);
    const bits=[];
    if(dd.jAccomplish)bits.push('accomplished: '+dd.jAccomplish);
    if(dd.jImprov)bits.push('improve: '+dd.jImprov);
    if(dd.jGratitude)bits.push('gratitude: '+dd.jGratitude);
    if(dd.jNotes)bits.push('notes: '+dd.jNotes);
    if(dd.jRunLog)bits.push('run log: '+dd.jRunLog);
    if(bits.length)entries.push(d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' — '+bits.join('; '));
  }
  if(!entries.length){aiShow('aiJournalBox','No journal entries found in the last 7 days.');aiBtnState(btn,false);return;}
  const prompt='You are a thoughtful journaling coach. Here are someone\'s journal entries from the last 7 days:\n\n'+entries.join('\n')+'\n\nProvide 3-4 meaningful insights about their patterns, progress, and mindset. Note any recurring themes, wins, or areas where they might grow. Be specific to what they wrote, warm, and constructive.';
  aiCall(prompt,3000,
    text=>{aiBtnState(btn,false);aiShow('aiJournalBox',text);},
    err=>{aiBtnState(btn,false);aiShow('aiJournalBox','Error: '+err);}
  );
}

// ── AI Weekly Analysis ────────────────────────────────────────────────────────
function aiWeeklyAnalysis(){
  const btn=document.querySelector('[onclick="aiWeeklyAnalysis()"]');
  aiBtnState(btn,true);
  const ws=wkStart(weekOff2);const days=[];const dayKeys=[];
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(ws.getDate()+i);
    const dkStr=dk(d);dayKeys.push(dkStr);
    const r=localStorage.getItem('planner_'+dkStr);
    days.push(r?JSON.parse(r):null);
  }
  const wLabel=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+new Date(ws.getTime()+6*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  let miles=0,bibleD=0,prayD=0,exD=0,audioMin=0,steps=0,logged=0;
  days.forEach((d,_di)=>{
    if(!d)return;logged++;
    miles+=parseFloat(d.exMiles)||0;
    if(d.spBibleAudio==='green')bibleD++;
    if(d.spAIPrayer==='green')prayD++;
    if(d.exRun==='green'||d.exStrength==='green'||d.exBike==='green'||d.exWalk==='green'||hasActivityOnDate(dayKeys[_di]))exD++;
    audioMin+=parseMins(d.gaAudiobookTime);
    steps+=parseFloat(d.exSteps)||0;
  });
  const fmtM=m=>m>=60?Math.floor(m/60)+'h '+(m%60?m%60+'m':''):m+'m';
  const summary='Week of '+wLabel+' ('+logged+' days logged)\n'
    +'Miles: '+miles.toFixed(1)+'\nExercise days: '+exD+'/7\nBible: '+bibleD+'/7\nPrayer: '+prayD+'/7\n'
    +'Audiobook: '+fmtM(audioMin)+'\nSteps: '+Math.round(steps).toLocaleString();
  const prompt='You are a life coach reviewing someone\'s weekly planner data.\n\nWeekly summary:\n'+summary+'\n\nProvide a concise weekly analysis covering: (1) what went well, (2) what could improve, (3) one specific focus for next week. Keep it under 200 words, warm and direct.';
  const box=document.getElementById('aiWeeklyBox');if(box){box.style.display='block';box.textContent='⏳ Analyzing your week...';}
  aiCall(prompt,2000,
    text=>{aiBtnState(btn,false);aiShow('aiWeeklyBox',text);},
    err=>{aiBtnState(btn,false);aiShow('aiWeeklyBox','Error: '+err);}
  );
}

// ── AI Review Analysis ────────────────────────────────────────────────────────
function aiReviewAnalysis(){
  const btn=document.querySelector('[onclick="aiReviewAnalysis()"]');
  const target=document.getElementById('revAnalysis');
  aiBtnState(btn,true);
  const ws=wkStart(revOff2);
  const wins=document.getElementById('revWins')?.value||'';
  const improve=document.getElementById('revImprove')?.value||'';
  const focus=document.getElementById('revFocus')?.value||'';
  const lessons=document.getElementById('revLessons')?.value||'';
  if(!wins&&!improve&&!focus&&!lessons){
    if(target)target.value='Please fill in your review first, then tap AI Review Analysis.';
    aiBtnState(btn,false);return;
  }
  const wLabel=ws.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const content=[wins&&'Wins: '+wins,improve&&'Improve: '+improve,focus&&'Next focus: '+focus,lessons&&'Lessons: '+lessons].filter(Boolean).join('\n');
  const prompt='You are a thoughtful life coach reading someone\'s weekly review for the week of '+wLabel+'.\n\n'+content+'\n\nProvide 3-4 sentences of coaching feedback: affirm a specific win, gently challenge one area to improve, and give one actionable suggestion for their stated focus. Be warm, specific, and concise.';
  if(target)target.value='Reading your review...';
  aiCall(prompt,2000,
    text=>{aiBtnState(btn,false);if(target){target.value=text;target.dispatchEvent(new Event('input'));}saveReview();},
    err=>{aiBtnState(btn,false);if(target)target.value='Error: '+err;}
  );
}
function changeDashOff(n){dashOff2+=n;renderDashboard();renderBPChart();}
let revOff2=0;
function renderReview(){const ws=wkStart(revOff2),we=new Date(ws);we.setDate(ws.getDate()+6);document.getElementById('revLabel').textContent=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+we.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});const r=localStorage.getItem('review_'+dk(ws)),rv=r?JSON.parse(r):{};['revAnalysis','revWins','revImprove','revFocus','revLessons'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=rv[id]||'';});let logged=0,bible=0,prayer=0,steps=0;for(let i=0;i<7;i++){const d=new Date(ws);d.setDate(ws.getDate()+i);const dateKey=dk(d),r2=localStorage.getItem('planner_'+dateKey);if(!r2)continue;logged++;const dd=JSON.parse(r2);if(dd.spBibleAudio==='green')bible++;if(dd.spAIPrayer==='green')prayer++;steps+=parseFloat(dd.exSteps)||0;}const runs=uniqueRunActivities(ws,we).length;document.getElementById('revStats').innerHTML=[{l:'Days Logged',v:logged+'/7'},{l:'Bible Days',v:bible+'/7'},{l:'Prayer Days',v:prayer+'/7'},{l:'Runs',v:runs},{l:'Total Steps',v:Math.round(steps).toLocaleString()}].map(({l,v})=>'<div class="review-stat"><strong>'+v+'</strong>'+l+'</div>').join('');renderReviewInjuryRollup();}
function saveReview(){const ws=wkStart(revOff2),d={};['revAnalysis','revWins','revImprove','revFocus','revLessons'].forEach(id=>{const e=document.getElementById(id);if(e)d[id]=e.value;});localStorage.setItem('review_'+dk(ws),JSON.stringify(d));const btn=document.querySelector('[onclick="saveReview()"]');if(btn){btn.textContent='Saved!';btn.style.background='#27ae60';setTimeout(()=>{btn.textContent='Save Review';btn.style.background='#667eea';},2000);}}
function changeRevOff(n){revOff2+=n;renderReview();}
function getReviewWeekInjuryReports(){
  const ws=wkStart(revOff2),we=new Date(ws);we.setDate(ws.getDate()+6);
  const start=dk(ws),end=dk(we),seen={};
  function normalizedDate(value){const text=String(value||'').trim(),match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(match)return match[3]+'-'+match[1].padStart(2,'0')+'-'+match[2].padStart(2,'0');return text.slice(0,10);}
  return getActivities().filter(function(a){
    if(!a||!String(a.injuryReport||'').trim())return false;
    const date=normalizedDate(a.date);if(date<start||date>end)return false;
    const signature=[a.id||'',date,a.type||'',a.title||'',a.injuryReport].join('|');if(seen[signature])return false;seen[signature]=true;
    a._reviewInjuryDate=date;return true;
  }).sort(function(a,b){return String(a._reviewInjuryDate).localeCompare(String(b._reviewInjuryDate));});
}
function reviewInjuryText(){
  const reports=getReviewWeekInjuryReports();
  if(!reports.length)return'No workout injury reports were recorded this week.';
  return reports.map(function(a){
    const d=new Date(a._reviewInjuryDate+'T12:00:00'),label=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    return label+' — '+(a.title||a.type||'Workout')+': '+String(a.injuryReport||'').trim();
  }).join('\n');
}
function renderReviewInjuryRollup(){
  const box=document.getElementById('revInjuryRollup'),count=document.getElementById('revInjuryCount');if(!box)return;
  const reports=getReviewWeekInjuryReports();if(count)count.textContent=reports.length+' report'+(reports.length===1?'':'s');
  if(!reports.length){box.innerHTML='<div style="font-size:0.8rem;color:#7f1d1d;padding:8px 0;">No injury reports recorded this week.</div>';return;}
  box.innerHTML=reports.map(function(a){
    const d=new Date(a._reviewInjuryDate+'T12:00:00'),label=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    return '<div style="background:#fff;border:1px solid #fecaca;border-radius:8px;padding:10px;margin-top:7px;"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><strong style="color:#991b1b;">'+escHtml(a.title||a.type||'Workout')+'</strong><span style="font-size:0.72rem;font-weight:700;color:#7f1d1d;">'+escHtml(label)+'</span></div><div style="font-size:0.8rem;color:#7f1d1d;margin-top:5px;white-space:pre-wrap;">'+escHtml(a.injuryReport)+'</div></div>';
  }).join('');
}
function getReviewWeekJournalText(){
  const ws=wkStart(revOff2),entries=[];
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(ws.getDate()+i);
    const raw=localStorage.getItem('planner_'+dk(d));if(!raw)continue;
    const dd=JSON.parse(raw),parts=[];
    ['jAccomplish','jNotes','jImprov','jGratitude','jIssues','jRunLog','spMeditationText'].forEach(function(k){if(dd[k])parts.push(dd[k]);});
    if(parts.length)entries.push(d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})+': '+parts.join(' | '));
  }
  return entries.join('\n');
}
function aiFillEntireReview(btn){
  if(!journalAIKey()){alert('Add your Anthropic API key in Settings first.');return;}
  const ws=wkStart(revOff2),we=new Date(ws);we.setDate(ws.getDate()+6);
  const weekLabel=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+we.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const journal=getReviewWeekJournalText();
  const injuries=reviewInjuryText();
  const stats=(document.getElementById('revStats')||{}).innerText||'';
  const current=['revWins','revImprove','revFocus','revLessons'].map(function(id){var el=document.getElementById(id);return el&&el.value.trim()?id+': '+el.value.trim():'';}).filter(Boolean).join('\n');
  const prompt='You are completing a personal weekly review for '+weekLabel+'. Use only the supplied weekly statistics, journal entries, and existing review notes. Return ONLY one valid JSON object with exactly these four string keys:\n'
    +'{"wins":"","improve":"","focus":"","lessons":""}\n\n'
    +'Writing requirements:\n- wins: 2-4 specific achievements or positive patterns\n- improve: 2-4 constructive, realistic improvements\n- focus: 1-3 specific priorities for next week\n- lessons: 2-4 concise takeaways from the week\n'
    +'Use short bullet-style lines inside each string. Do not invent events or accomplishments. If information is limited, acknowledge that briefly and make cautious suggestions.\n\n'
    +'WEEKLY STATISTICS:\n'+(stats||'No statistics available')+'\n\nINJURY REPORT WEEKLY ROLL-UP:\n'+injuries+'\n\nDAILY JOURNAL:\n'+(journal||'No written daily notes available')+'\n\nEXISTING REVIEW NOTES:\n'+(current||'None');
  const original=btn.innerHTML;btn.disabled=true;btn.innerHTML='&#x23F3; Filling Review...';
  aiCall(prompt,2400,function(text){
    try{
      var cleaned=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
      var start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');if(start>=0&&end>=start)cleaned=cleaned.slice(start,end+1);
      var result=JSON.parse(cleaned),map={wins:'revWins',improve:'revImprove',focus:'revFocus',lessons:'revLessons'};
      Object.keys(map).forEach(function(key){var el=document.getElementById(map[key]);if(el&&result[key]!=null){el.value=String(result[key]).trim();el.dispatchEvent(new Event('input'));}});
      saveReview();v26Toast('Weekly Review filled and saved');
    }catch(e){alert('The AI response could not be placed into the Review fields. Please try again.');}
    btn.disabled=false;btn.innerHTML=original;
  },function(err){btn.disabled=false;btn.innerHTML=original;alert('AI error: '+err);});
}
function aiReviewField(type,btn){
  const key=journalAIKey();
  if(!key){alert('Add your AI key first.');return;}
  const journal=getReviewWeekJournalText();
  const injuries=reviewInjuryText();
  const wins=(document.getElementById('revWins').value||'').trim();
  const improve=(document.getElementById('revImprove').value||'').trim();
  const lessons=(document.getElementById('revLessons').value||'').trim();
  if(!journal&&!wins&&!improve&&!lessons){alert('Add some Daily journal entries or review notes first.');return;}
  const isImprove=type==='improve',target=document.getElementById(isImprove?'revImprove':'revFocus');
  const prompt=(isImprove
    ?'Review the week below and identify the 2-4 most useful areas to improve. Be specific, constructive, and concise. Format as short bullet points suitable for a weekly review field.'
    :'Review the week below and recommend the 1-3 highest-value priorities for next week. Make each focus specific and actionable. Format as short bullet points suitable for a weekly review field.')
    +'\n\nWins:\n'+wins+'\n\nCurrent improvement notes:\n'+improve+'\n\nLessons:\n'+lessons+'\n\nInjury report weekly roll-up:\n'+injuries+'\n\nDaily journal:\n'+journal;
  aiBtnState(btn,true);
  aiCall(prompt,1800,function(text){aiBtnState(btn,false);target.value=text;target.dispatchEvent(new Event('input'));saveReview();v26Toast(isImprove?'What to Improve added':'Next-week focus added');},function(err){aiBtnState(btn,false);alert('AI error: '+err);});
}
function aiWeeklyTakeaways(){
  const target=document.getElementById('revLessons');
  if(!target)return;
  target.value='Reading your journal for the week...';
  const ws=wkStart(revOff2);
  const we=new Date(ws);we.setDate(ws.getDate()+6);
  const weekLabel=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+we.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const entries=[];
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(ws.getDate()+i);
    const raw=localStorage.getItem('planner_'+dk(d));
    if(!raw)continue;
    const dd=JSON.parse(raw);
    const dayLabel=d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
    const parts=[];
    if(dd.jAccomplish)parts.push('Accomplishments: '+dd.jAccomplish);
    if(dd.jNotes)parts.push('Notes: '+dd.jNotes);
    if(dd.jImprov)parts.push('Areas to improve: '+dd.jImprov);
    if(dd.jGratitude)parts.push('Gratitude: '+dd.jGratitude);
    if(dd.jIssues)parts.push('Issues/struggles: '+dd.jIssues);
    if(dd.jRunLog)parts.push('Run log: '+dd.jRunLog);
    if(dd.spMeditationText)parts.push('Meditation/reflection: '+dd.spMeditationText);
    const sermonNotes=getSermonNotes(dk(d));
    if(sermonNotes)parts.push('Sermon notes: '+sermonNotes);
    if(parts.length)entries.push('--- '+dayLabel+' ---\n'+parts.join('\n'));
  }
  if(!entries.length){
    target.value='No journal entries found for this week. Add notes on the Daily tab first.';
    return;
  }
  const prompt='You are a thoughtful life coach reviewing a personal journal. Here are the journal entries for the week of '+weekLabel+':\n\n'
    +entries.join('\n\n')
    +'\n\nBased on everything written, provide:\n\n'
    +'1. TOP 3-5 KEY TAKEAWAYS — The most important lessons, patterns, or insights that emerge from the week\n'
    +'2. RECURRING THEMES — Any topics or emotions that appear multiple days\n'
    +'3. ONE GROWTH OPPORTUNITY — The single most impactful thing to focus on next week\n'
    +'4. AN ENCOURAGING WORD — A brief, genuine word of encouragement based on what was shared\n\n'
    +'Be specific and personal — reference actual things written in the journal. Be warm and insightful, not generic. Under 350 words.';
  const key=journalAIKey();
  if(!key){target.value='Add your AI key first in Settings.';return;}
  aiCall(prompt,4000,function(text){
    target.value=text;target.dispatchEvent(new Event('input'));saveReview();
  },function(err){target.value='Error: '+err;});
}
// ── Daily Bread AI ────────────────────────────────────────
function aiDailyBread(){
  const key=journalAIKey();
  if(!key){alert('Add your Anthropic API key in ⚙️ Settings first.');return;}
  const btn=document.querySelector('[onclick="aiDailyBread()"]');
  if(btn){btn.textContent='…';btn.disabled=true;}
  const now=new Date();
  const today_str=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const themes=['faith and trust','perseverance and endurance','wisdom and discernment','courage and strength','gratitude and praise','hope and renewal','humility and service','peace and rest','love and compassion','purpose and calling','forgiveness and grace','identity in Christ','stewardship and generosity','prayer and communion','joy in trials','righteousness and integrity','community and fellowship','spiritual growth','God\'s faithfulness','endurance in hardship','the armor of God','waiting on the Lord','bearing fruit','abiding in Christ','the power of the tongue'];
  const theme=themes[Math.floor(Math.random()*themes.length)];
  const seed=Math.floor(Math.random()*9000)+1000;
  const books=['Genesis','Exodus','Psalms','Proverbs','Isaiah','Jeremiah','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','Hebrews','James','1 Peter','1 John','Revelation'];
  const book=books[Math.floor(Math.random()*books.length)];
  const prompt='Today is '+today_str+'. Random seed: '+seed+'. Theme for today: "'+theme+'".\n\nSuggest one specific Bible verse from '+book+' or any other book that fits this theme. IMPORTANT: Do NOT suggest John 3:16, Jeremiah 29:11, Philippians 4:13, Romans 8:28, or any other extremely common/overused verse. Pick something meaningful but less frequently cited. Reply with ONLY the reference in this exact format: Book Chapter:Verse (or Chapter:StartVerse-EndVerse for a short range). Example: Proverbs 3:5-6. Nothing else — just the reference.';
  fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:60,messages:[{role:'user',content:prompt}]})})
  .then(r=>r.json()).then(data=>{
    if(btn){btn.textContent='✨ Suggest';btn.disabled=false;}
    if(data.error){alert('AI error: '+data.error.message);return;}
    const verse=(data.content[0].text||'').trim();
    const el=document.getElementById('spDailyBreadText');
    if(el){
      el.value=verse;
      localStorage.setItem('medit_scripture',verse);
      const disp=document.getElementById('meditScriptureDisplay');
      if(disp)disp.textContent=verse||'“Be still, and know that I am God.” — Psalm 46:10';
      save();
    }
  }).catch(e=>{if(btn){btn.textContent='✨ Suggest';btn.disabled=false;}alert('Error: '+e.message);});
}


// ══════════════════════════════════════════════════════
// FOOD LOG SYSTEM
// ══════════════════════════════════════════════════════
if(!window._foodLog)window._foodLog=[];

const MEALS=['breakfast','lunch','dinner','snack','liquids','sports'];
const MEAL_LABELS={breakfast:'🌅 Breakfast',lunch:'🥗 Lunch',dinner:'🍽️ Dinner',snack:'🍎 Snacks',liquids:'💧 Liquids',sports:'💪 Sports Nutrition'};
const MEAL_HINTS={breakfast:'Food name',lunch:'Food name',dinner:'Food name',snack:'Snack name',liquids:'Drink name',sports:'Sports fuel / supplement'};
const SERVING_UNITS=['serving','cup','tablespoon','teaspoon','fluid ounce','ounce','gram','milligram','milliliter','liter','piece','item','slice','scoop','packet','bar','bottle','can','container','handful'];

function servingUnitFromLabel(label){
  var text=String(label||'').toLowerCase();
  var aliases={'tbsp':'tablespoon','tablespoons':'tablespoon','tsp':'teaspoon','teaspoons':'teaspoon','fl oz':'fluid ounce','fluid ounces':'fluid ounce','oz':'ounce','ounces':'ounce','g':'gram','grams':'gram','mg':'milligram','milligrams':'milligram','ml':'milliliter','milliliters':'milliliter','l':'liter','liters':'liter','cups':'cup','pieces':'piece','items':'item','slices':'slice','scoops':'scoop','packets':'packet','bars':'bar','bottles':'bottle','cans':'can','containers':'container','handfuls':'handful','servings':'serving'};
  var keys=Object.keys(aliases).sort(function(a,b){return b.length-a.length;});
  for(var i=0;i<keys.length;i++){if(new RegExp('(^|[^a-z])'+keys[i].replace(' ','\\s+')+'([^a-z]|$)','i').test(text))return aliases[keys[i]];}
  for(var j=0;j<SERVING_UNITS.length;j++){if(text.indexOf(SERVING_UNITS[j])!==-1)return SERVING_UNITS[j];}
  return '';
}

function applyFoodServingUnit(id,unit){
  var item=(window._foodLog||[]).find(function(x){return x.id===id;});if(!item||!unit)return;
  var current=String(item.servingLabel||'').replace(/^per\s+/i,'').trim(),match=current.match(/^\s*(\d+(?:\.\d+)?|\d+\/\d+)/),amount=match?match[1]:'1';
  item.servingLabel=amount+' '+unit;renderFoodItems();save();
}

// Micronutrient fields tracked per food item, in addition to cal/prot/fat/carbs
const MICRO_FIELDS=['fiber','sugar','sodium','vitA','vitC','vitD','calcium','iron','potassium'];
const MICRO_META={
  fiber:{label:'Fiber',unit:'g',icon:'🌾',elId:'totFiber'},
  sugar:{label:'Sugar',unit:'g',icon:'🍬',elId:'totSugar'},
  sodium:{label:'Sodium',unit:'mg',icon:'🧂',elId:'totSodium'},
  vitA:{label:'Vit A',unit:'mcg',icon:'🥕',elId:'totVitA'},
  vitC:{label:'Vit C',unit:'mg',icon:'🍊',elId:'totVitC'},
  vitD:{label:'Vit D',unit:'mcg',icon:'☀️',elId:'totVitD'},
  calcium:{label:'Calcium',unit:'mg',icon:'🦴',elId:'totCalcium'},
  iron:{label:'Iron',unit:'mg',icon:'🩸',elId:'totIron'},
  potassium:{label:'Potassium',unit:'mg',icon:'🍌',elId:'totPotassium'}
};


function _mkMacroCell(labelTxt, field, val, highlight, itemId){
  var lbl=document.createElement('label');
  lbl.style.cssText='font-size:0.68rem;color:'+(highlight?'#e67e22':'#888')+(highlight?';font-weight:700':'')+';display:flex;flex-direction:column;align-items:center;gap:1px;';
  lbl.textContent=labelTxt;
  var inp=document.createElement('input');
  inp.type='number';
  inp.min='0'; inp.placeholder='0';
  if(field==='servings'){inp.min='0.25';inp.step='0.25';inp.value=val||1;}
  else{inp.value=(val!==null&&val!==undefined&&val!=='')?val:'';}
  inp.style.cssText='width:100%;border:'+(highlight?'2px solid #e67e22':'1px solid #e9ecef')+';border-radius:5px;padding:3px 2px;font-size:0.8rem;text-align:center;box-sizing:border-box;';
  inp.onchange=(function(id,f){return function(){updateFoodField(id,f,this.value);};})(itemId,field);
  lbl.appendChild(inp);
  return lbl;
}
function foodNameHasAny(name,terms){
  var normalized=' '+String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
  return terms.some(function(term){return normalized.indexOf(' '+term+' ')!==-1||normalized.indexOf(' '+term+'s ')!==-1;});
}
function foodSourceChoice(name,supportTerms,limitTerms){
  var normalized=' '+String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
  function first(terms){return terms.reduce(function(best,term){var at=normalized.indexOf(' '+term+' ');if(at<0)at=normalized.indexOf(' '+term+'s ');return at>=0&&at<best?at:best;},Number.POSITIVE_INFINITY);}
  var supportAt=first(supportTerms),limitAt=first(limitTerms);if(!isFinite(supportAt)&&!isFinite(limitAt))return'';return supportAt<=limitAt?'support':'limit';
}
function foodSourceCorrections(){try{return JSON.parse(localStorage.getItem('food_source_corrections')||'{}')||{};}catch(e){return{};}}
function foodSourceCorrectionKey(name){return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function rememberFoodSourceCorrection(item){
  var key=foodSourceCorrectionKey(item&&item.name);if(!key)return;
  var saved=foodSourceCorrections();saved[key]={proteinSource:item.proteinSource||'unknown',carbSource:item.carbSource||'unknown',fatSource:item.fatSource||'unknown'};
  localStorage.setItem('food_source_corrections',JSON.stringify(saved));
}
function inferFoodMacroSources(item){
  if(!item)return false;
  var name=String(item.name||''),classificationText=[name,item.ingredientsText,item.categoriesText].filter(Boolean).join(' '),changed=false;
  var remembered=foodSourceCorrections()[foodSourceCorrectionKey(name)];
  if(remembered){['proteinSource','carbSource','fatSource'].forEach(function(field){if(item[field]!==remembered[field]){item[field]=remembered[field]||'unknown';changed=true;}});item.sourceConfidence='High';item.sourceMethod='Remembered correction';return changed;}
  var proteinSupport=['chicken breast','chicken','turkey','fish','salmon','tuna','shrimp','lean beef','sirloin','egg white','egg','greek yogurt','yogurt','cottage cheese','milk protein','casein','milk','tofu','tempeh','bean','lentil','chickpea','pea protein','soy protein','protein isolate','protein concentrate','protein powder','whey','seitan'];
  var proteinLimit=['bacon','sausage','hot dog','pepperoni','salami','bologna','fried chicken','processed meat','mechanically separated','cured meat','pork rind','rib','cheese'];
  var carbSupport=['oatmeal','oat','brown rice','wild rice','quinoa','whole grain','whole wheat','whole rye','barley','farro','bran','bean','lentil','chickpea','sweet potato','potato','corn','sweet corn','fruit','dried fruit','raisin','apple','banana','berry','berries','orange','vegetable','broccoli','spinach'];
  var carbLimit=['candy','soda','soft drink','juice','sports drink','energy gel','gel','chew','sugar','cane sugar','corn syrup','high fructose corn syrup','honey','syrup','enriched wheat flour','refined flour','white flour','cookie','cake','pastry','donut','doughnut','white bread','white rice','sweetened cereal'];
  var fatSupport=['olive oil','canola oil','sunflower oil','safflower oil','soybean oil','sesame oil','avocado','almond','walnut','peanut','nut butter','seed','chia','flax','salmon','tuna'];
  var fatLimit=['butter','lard','shortening','coconut oil','palm oil','palm kernel oil','hydrogenated oil','partially hydrogenated oil','cream','cheese','bacon','sausage','pepperoni','fried'];
  if((parseFloat(item.prot)||0)>0&&!item.proteinSource){var proteinChoice=foodSourceChoice(classificationText,proteinSupport,proteinLimit);if(proteinChoice){item.proteinSource=proteinChoice;changed=true;}}
  if((parseFloat(item.carbs)||0)>0&&!item.carbSource){var carbChoice=foodSourceChoice(classificationText,carbSupport,carbLimit);if(carbChoice){item.carbSource=carbChoice;changed=true;}}
  if((parseFloat(item.fat)||0)>0&&!item.fatSource){var fatChoice=foodSourceChoice(classificationText,fatSupport,fatLimit);if(fatChoice){item.fatSource=fatChoice;changed=true;}}
  if(changed){item.sourceClassificationAuto=true;item.sourceConfidence=(item.source==='barcode'||item.source==='label')&&item.ingredientsText?'High':'Medium';item.sourceMethod=item.source==='barcode'?'Barcode + ingredients':item.source==='label'&&item.ingredientsText?'Label + ingredients':'Food-name match';}
  else if(!item.sourceConfidence){item.sourceConfidence='Low';item.sourceMethod='Needs review';}
  return changed;
}

function runnerFoodQuality(item){
  item=item||{};
  var calories=Math.max(0,parseFloat(item.cal)||0),protein=Math.max(0,parseFloat(item.prot)||0),carbs=Math.max(0,parseFloat(item.carbs)||0),fat=Math.max(0,parseFloat(item.fat)||0);
  var fiber=Math.max(0,parseFloat(item.fiber)||0),sugar=Math.max(0,parseFloat(item.sugar)||0),sodium=Math.max(0,parseFloat(item.sodium)||0);
  var sports=item.meal==='sports',score=5,reasons=[];
  var dateKey=dk(today),activityText='';
  try{activityText=(getActivities()||[]).filter(function(a){return a&&a.date===dateKey;}).map(function(a){return [a.title,a.type,a.workout].filter(Boolean).join(' ');}).join(' ');}catch(ignoreActivity){}
  try{activityText+=' '+(typeof journalTodayTrainingSummary==='function'?journalTodayTrainingSummary():'');}catch(ignoreSummary){}
  var hardWorkout=typeof nutritionHardWorkoutForDate==='function'?nutritionHardWorkoutForDate(today):'';
  var runDay=!!hardWorkout||/\b(run|race|interval|tempo|threshold|speed|track|recovery)\b/i.test(activityText);
  function sourceScore(amount,source,supportPoints,limitPoints,supportReason,limitReason){
    if(amount<=0)return;
    if(source==='support'){score+=supportPoints;reasons.push(supportReason);}
    else if(source==='limit'){score+=limitPoints;reasons.push(limitReason);}
  }
  sourceScore(protein,item.proteinSource,1,-1,'runner-supportive protein','processed or higher-fat protein');
  sourceScore(carbs,item.carbSource,1,sports?0.5:-1,'complex carbohydrate source',sports?'quick training fuel':'mostly refined carbohydrate');
  sourceScore(fat,item.fatSource,0.75,-1,'unsaturated fat source','mostly saturated or trans fat');
  if(fiber>=5){score+=1;reasons.push('high fiber');}else if(fiber>=3){score+=0.6;reasons.push('useful fiber');}
  if(calories>0&&protein/calories>=0.1){score+=1;reasons.push('high protein density');}else if(calories>0&&protein/calories>=0.05){score+=0.4;}
  if(!sports&&sugar>=20&&fiber<3){score-=1;reasons.push('high sugar with little fiber');}else if(!sports&&sugar>=10&&fiber<2){score-=0.5;}
  if(!sports&&sodium>=700){score-=0.5;reasons.push('high sodium');}
  var text=[item.name,item.ingredientsText,item.categoriesText].filter(Boolean).join(' ').toLowerCase();
  if(/\b(vegetable|fruit|dried fruit|raisin|raisins|berries|banana|apple|orange|oat|oatmeal|whole grain|whole wheat|bean|lentil|quinoa|brown rice|sweet potato|potato|potatoes|corn|salmon|tuna)\b/.test(text)){score+=0.75;reasons.push('whole-food ingredients');}
  // Oats provide a nutrient-dense carbohydrate base for endurance training. Give
  // plain or lightly sweetened oatmeal credit without extending the bonus to
  // dessert-style products with a large added-sugar load.
  if(/\b(oatmeal|rolled oats?|steel[ -]?cut oats?|old fashioned oats?)\b/.test(text)&&sugar<=10){score+=0.75;reasons.push('sustained endurance carbohydrate');}
  // Raisins are concentrated whole fruit and useful portable carbohydrate for
  // runners. Their naturally occurring sugar should not be scored like candy;
  // sweetened or candy-coated products remain subject to the normal penalties.
  if(/\b(raisin|raisins|unsweetened dried fruit)\b/.test(text)&&!/\b(candy|chocolate|yogurt covered|added sugar|corn syrup)\b/.test(text)){score+=1;reasons.push('portable runner carbohydrate');}
  // Plain potatoes are useful endurance fuel: carbohydrate-rich, naturally low
  // in fat, and commonly a strong potassium source. Recognize product names such
  // as "Idaho Potatoes" even when the cooking method is not included, but do not
  // extend the bonus to fried, loaded, cheesy, or snack-food preparations.
  if(/\b(potato|potatoes|russet|yukon gold)\b/.test(text)&&fat<=5&&!/\b(fries|french fry|chips?|hash browns?|tater tots?|loaded|cheesy|scalloped|au gratin|fried)\b/.test(text)){score+=1.5;reasons.push('low-fat endurance carbohydrate');}
  // Corn is a starchy whole-food carbohydrate that can support training and
  // glycogen replacement. Keep processed snack foods and rich preparations out
  // of this bonus; their entered fat, sugar, and sodium still affect the score.
  if(/\b(corn|sweet corn|corn kernels?)\b/.test(text)&&fat<=5&&!/\b(corn chips?|tortilla chips?|corn dog|creamed corn|caramel corn|popcorn|corn syrup|fried)\b/.test(text)){score+=1.25;reasons.push('starchy whole-food carbohydrate');}
  if((parseFloat(item.potassium)||0)>=600){score+=0.5;reasons.push('potassium-rich');}
  if(/\b(candy|soda|donut|doughnut|pastry|fried|hydrogenated|corn syrup)\b/.test(text)&&!sports){score-=0.75;reasons.push('highly processed ingredients');}
  // Morning-run context: quick carbohydrate in Sports Nutrition is purposeful fuel,
  // while carbohydrate plus protein at breakfast supports post-run recovery.
  if(runDay&&sports&&carbs>=15){score+=0.75;reasons.push((hardWorkout||'run')+' fuel');}
  if(runDay&&item.meal==='breakfast'&&carbs>=25){score+=0.4;reasons.push('post-run carbohydrate');}
  if(runDay&&item.meal==='breakfast'&&protein>=15){score+=0.4;reasons.push('post-run protein');}
  score=Math.max(1,Math.min(10,Math.round(score*10)/10));
  var completenessFields=['cal','prot','fat','carbs','fiber','sugar','sodium'],complete=0,totalChecks=completenessFields.length;
  completenessFields.forEach(function(field){if(item[field]!==undefined&&item[field]!==null&&item[field]!=='')complete++;});
  [{amount:protein,field:'proteinSource'},{amount:carbs,field:'carbSource'},{amount:fat,field:'fatSource'}].forEach(function(check){if(check.amount>0){totalChecks++;if(item[check.field]&&item[check.field]!=='unknown')complete++;}});
  var confidencePct=totalChecks?Math.round(complete/totalChecks*100):0,confidence=confidencePct>=80?'High':confidencePct>=55?'Medium':'Low';
  var label=score>=9?'Excellent':score>=7?'Good':score>=5?'Fair':score>=3?'Low':'Poor';
  return {score:score,label:label,reason:reasons.slice(0,3).join(' · ')||'Add label details for a more precise rating',confidence:confidence,confidencePct:confidencePct,workoutContext:runDay?(hardWorkout?hardWorkout+' workout':'run day'):'rest / recovery day'};
}

function renderFoodItems(){
  var log=window._foodLog||[];
  var autoClassChanged=false;
  log.forEach(function(item){if(inferFoodMacroSources(item))autoClassChanged=true;});
  importHealthyFoodsFromSavedNutrition();
  captureHealthyFoods(log);
  updateHealthyFoodsCount(getHealthyFoods().length);
  if(!window._foodBarcodeImagesChecked){window._foodBarcodeImagesChecked=true;backfillSavedFoodBarcodeImages();}
  var favNames=(getFavorites()||[]).map(function(f){return (f.name||'').toLowerCase();});
  MEALS.forEach(function(meal){
    var listEl=document.getElementById('foodList-'+meal);
    if(!listEl)return;
    var items=log.filter(function(x){return x.meal===meal;});
    listEl.innerHTML='';
    if(!items.length){
      listEl.innerHTML='<div style="font-size:0.8rem;color:#bbb;padding:6px 0 2px;">No items yet — tap + Add</div>';
    } else {
      items.forEach(function(it){
        if(!it.id)it.id='f'+Date.now()+'_'+Math.random().toString(36).slice(2,5);
        var svgs=parseFloat(it.servings)||1;
        var servingSize=String(it.servingLabel||'').replace(/^per\s+/i,'').trim()||'1 serving';
        var totalCal=Math.round((parseFloat(it.cal)||0)*svgs);
        var totalProt=Math.round((parseFloat(it.prot)||0)*svgs);
        var isFavItem=favNames.indexOf((it.name||'').toLowerCase())!==-1;

        var div=document.createElement('div');
        div.style.cssText='padding:6px 4px;border-bottom:1px solid #f5ede0;';

        var photoRow=document.createElement('div');
        photoRow.style.cssText='display:flex;align-items:center;gap:7px;margin:0 0 6px;';
        var thumb=document.createElement('div');
        thumb.style.cssText='width:48px;height:48px;border:1px solid #dbe4ea;border-radius:8px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;font-size:1.15rem;';
        var photoSrc=it.imageData||it.imageUrl||'';
        if(photoSrc){var img=document.createElement('img');img.src=photoSrc;img.alt=(it.name||'Food')+' thumbnail';img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover;';img.onerror=function(){this.style.display='none';this.parentNode.textContent='🍽️';};thumb.appendChild(img);}else thumb.textContent='🍽️';
        function makeFoodPhotoButton(labelText,useCamera){var label=document.createElement('label');label.style.cssText='background:'+(useCamera?'#ecfdf5':'#eff6ff')+';color:'+(useCamera?'#166534':'#1d4ed8')+';border:1px solid '+(useCamera?'#86efac':'#93c5fd')+';border-radius:6px;padding:5px 7px;font-size:.68rem;font-weight:800;cursor:pointer;';label.textContent=labelText;var input=document.createElement('input');input.type='file';input.accept='image/*';if(useCamera)input.capture='environment';input.style.display='none';input.onchange=(function(id){return function(){if(this.files&&this.files[0])setFoodThumbnail(id,this.files[0]);this.value='';};})(it.id);label.appendChild(input);return label;}
        photoRow.appendChild(thumb);photoRow.appendChild(makeFoodPhotoButton('📷 Take',true));photoRow.appendChild(makeFoodPhotoButton('🖼 Choose Existing',false));div.appendChild(photoRow);

        // Row 1: name input + fav star + delete
        var row1=document.createElement('div');
        row1.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:4px;';

        var nameInp=document.createElement('input');
        nameInp.type='text'; nameInp.value=it.name||'';
        nameInp.placeholder=MEAL_HINTS[meal]||'Food';
        nameInp.style.cssText='flex:1;min-width:0;border:1px solid #e9ecef;border-radius:5px;padding:4px 6px;font-size:0.85rem;';
        nameInp.onchange=(function(id){return function(){updateFoodField(id,'name',this.value);};})(it.id);

        var favBtn=document.createElement('button');
        favBtn.title='Favorite'; favBtn.textContent='⭐';
        favBtn.style.cssText='background:'+(isFavItem?'#f39c12':'#ddd')+';color:#fff;border:none;border-radius:5px;width:26px;height:26px;cursor:pointer;font-size:0.78rem;flex-shrink:0;';
        favBtn.onclick=(function(id){return function(){saveFoodAsFavorite(id);};})(it.id);

        var delBtn=document.createElement('button');
        delBtn.title='Delete'; delBtn.textContent='✕';
        delBtn.style.cssText='background:#e74c3c;color:#fff;border:none;border-radius:5px;width:26px;height:26px;cursor:pointer;font-size:0.85rem;flex-shrink:0;';
        delBtn.onclick=(function(id){return function(){removeFoodItem(id);};})(it.id);

        row1.appendChild(nameInp); row1.appendChild(favBtn); row1.appendChild(delBtn);
        div.appendChild(row1);

        var servingEdit=document.createElement('label');
        servingEdit.style.cssText='display:grid;grid-template-columns:auto minmax(0,1fr) minmax(104px,0.7fr);align-items:center;gap:6px;font-size:0.72rem;font-weight:700;color:#475569;margin:0 0 5px;';
        servingEdit.textContent='Serving size';
        var servingInput=document.createElement('input');
        servingInput.type='text';servingInput.value=servingSize;servingInput.placeholder='Example: 1 cup, 30 g, 8 oz';
        servingInput.style.cssText='flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:5px;padding:4px 6px;font-size:0.76rem;';
        servingInput.onchange=(function(id){return function(){updateFoodField(id,'servingLabel',this.value.trim()||'1 serving');};})(it.id);
        servingEdit.appendChild(servingInput);
        var servingUnit=document.createElement('select');
        servingUnit.style.cssText='min-width:0;border:1px solid #cbd5e1;border-radius:5px;padding:4px 5px;font-size:0.74rem;background:#fff;';
        var detectedUnit=servingUnitFromLabel(servingSize),unitPlaceholder=document.createElement('option');unitPlaceholder.value='';unitPlaceholder.textContent='Choose unit';servingUnit.appendChild(unitPlaceholder);
        SERVING_UNITS.forEach(function(unit){var option=document.createElement('option');option.value=unit;option.textContent=unit;if(unit===detectedUnit)option.selected=true;servingUnit.appendChild(option);});
        servingUnit.onchange=(function(id){return function(){if(this.value)applyFoodServingUnit(id,this.value);};})(it.id);
        servingEdit.appendChild(servingUnit);div.appendChild(servingEdit);

        var servingCalories=document.createElement('div');
        servingCalories.style.cssText='font-size:0.75rem;font-weight:700;color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:4px 7px;margin:0 0 5px;';
        servingCalories.textContent='Actual serving: '+svgs+' × '+servingSize+' · '+Math.round(parseFloat(it.cal)||0)+' calories each';
        div.appendChild(servingCalories);

        var quality=runnerFoodQuality(it);
        var qualityBox=document.createElement('div');
        qualityBox.style.cssText='background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:6px 8px;margin:0 0 6px;';
        var qualityHeading=document.createElement('div');
        qualityHeading.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.72rem;font-weight:800;color:#334155;margin-bottom:5px;';
        qualityHeading.innerHTML='<span>Runner food quality</span><span>'+quality.score+'/10 · '+quality.label+'</span>';
        var qualityTrack=document.createElement('div');
        qualityTrack.style.cssText='height:10px;position:relative;border-radius:999px;background:linear-gradient(90deg,#dc2626 0%,#f97316 25%,#facc15 50%,#84cc16 75%,#16a34a 100%);box-shadow:inset 0 0 0 1px rgba(15,23,42,.12);';
        var qualityMarker=document.createElement('span');
        qualityMarker.style.cssText='position:absolute;top:50%;left:'+(((quality.score-1)/9)*100)+'%;width:15px;height:15px;border-radius:50%;background:#fff;border:3px solid #0f172a;box-sizing:border-box;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(15,23,42,.35);';
        qualityTrack.appendChild(qualityMarker);
        var qualityReason=document.createElement('div');
        qualityReason.style.cssText='font-size:0.62rem;color:#64748b;line-height:1.3;margin-top:4px;';
        qualityReason.textContent='Data confidence: '+quality.confidence+' ('+quality.confidencePct+'%) · '+quality.reason;
        qualityBox.appendChild(qualityHeading);qualityBox.appendChild(qualityTrack);qualityBox.appendChild(qualityReason);div.appendChild(qualityBox);

        // Row 2: macro grid using standalone _mkMacroCell
        var grid=document.createElement('div');
        grid.style.cssText='display:grid;grid-template-columns:1fr repeat(4,1fr);gap:4px;margin-bottom:4px;';
        grid.appendChild(_mkMacroCell('Svgs','servings',svgs,true,it.id));
        grid.appendChild(_mkMacroCell('Cal/serving','cal',it.cal,false,it.id));
        grid.appendChild(_mkMacroCell('Prot','prot',it.prot,false,it.id));
        grid.appendChild(_mkMacroCell('Fat','fat',it.fat,false,it.id));
        grid.appendChild(_mkMacroCell('Carbs','carbs',it.carbs,false,it.id));
        div.appendChild(grid);

        // Total line (whenever servings isn't exactly 1 — covers partial servings like 0.25 too)
        if(svgs!==1){
          var totalFat=Math.round((parseFloat(it.fat)||0)*svgs*10)/10;
          var totalCarbs=Math.round((parseFloat(it.carbs)||0)*svgs*10)/10;
          var tot=document.createElement('div');
          tot.style.cssText='font-size:0.72rem;color:#e67e22;text-align:right;margin-bottom:3px;';
          tot.textContent='Total (×'+svgs+'): '+totalCal+' cal · '+totalProt+'g prot · '+totalFat+'g fat · '+totalCarbs+'g carbs';
          div.appendChild(tot);
        }

        // Micronutrients (fiber, sugar, sodium, vitamins, minerals) — collapsed by default
        var hasMicroData=MICRO_FIELDS.some(function(f){return it[f]!==undefined&&it[f]!==null&&it[f]!=='';});
        var isMicroOpen=!!(window._microExpanded&&window._microExpanded[it.id]);
        var microToggle=document.createElement('button');
        microToggle.type='button';
        microToggle.textContent=(isMicroOpen?'▾':'▸')+' Micronutrients'+(hasMicroData&&!isMicroOpen?' •':'');
        microToggle.style.cssText='background:none;border:none;color:#0f766e;font-size:0.72rem;font-weight:600;cursor:pointer;padding:2px 0;margin-bottom:3px;text-align:left;';
        microToggle.onclick=(function(id){return function(){window._microExpanded=window._microExpanded||{};window._microExpanded[id]=!window._microExpanded[id];renderFoodItems();};})(it.id);
        div.appendChild(microToggle);
        if(isMicroOpen){
          var microGrid=document.createElement('div');
          microGrid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:5px;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:6px;padding:6px;';
          MICRO_FIELDS.forEach(function(f){
            var meta=MICRO_META[f];
            microGrid.appendChild(_mkMacroCell(meta.icon+' '+meta.label+' ('+meta.unit+')',f,it[f],false,it.id));
          });
          div.appendChild(microGrid);
          if(svgs!==1){
            var microTot=document.createElement('div');
            microTot.style.cssText='font-size:0.7rem;color:#0f766e;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:6px;padding:5px 7px;margin:-2px 0 5px;line-height:1.5;';
            microTot.textContent='Total (×'+svgs+'): '+MICRO_FIELDS.map(function(f){
              var meta=MICRO_META[f],raw=parseFloat(it[f])||0;
              return meta.label+' '+(Math.round(raw*svgs*10)/10)+meta.unit;
            }).join(' · ');
            div.appendChild(microTot);
          }
        }

        // Row 3: Copy + Move-to dropdown
        var row3=document.createElement('div');
        row3.style.cssText='display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:2px;';

        var copyBtn=document.createElement('button');
        copyBtn.textContent='📋 Copy';
        copyBtn.style.cssText='background:#16a085;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.76rem;cursor:pointer;';
        copyBtn.onclick=(function(id){return function(){copyFoodItem(id);};})(it.id);

        var moveSelect=document.createElement('select');
        moveSelect.style.cssText='font-size:0.76rem;border:1px solid #ddd;border-radius:4px;padding:3px 5px;background:#fff;color:#333;';
        var defOpt=document.createElement('option');
        defOpt.value=''; defOpt.textContent='→ Move to…';
        moveSelect.appendChild(defOpt);
        MEALS.filter(function(m){return m!==meal;}).forEach(function(m){
          var opt=document.createElement('option');
          opt.value=m; opt.textContent=MEAL_LABELS[m];
          moveSelect.appendChild(opt);
        });
        moveSelect.onchange=(function(id){return function(){if(this.value){moveFoodToMeal(id,this.value);}this.value='';};})(it.id);

        row3.appendChild(copyBtn); row3.appendChild(moveSelect);
        div.appendChild(row3);
        listEl.appendChild(div);
      });
    }

    // Meal subtitle
    var stEl=document.getElementById('st-'+meal);
    if(stEl){
      var mCal=items.reduce(function(a,x){return a+(parseFloat(x.cal)||0)*(parseFloat(x.servings)||1);},0);
      stEl.textContent=items.length?(items.length+' item'+(items.length>1?'s':''))+(mCal?' · '+Math.round(mCal)+' cal':''):'';
    }
    // Restore open/closed state from saved preference; default is collapsed
    var _mStates=JSON.parse(localStorage.getItem('meal_open_states')||'{}');
    var mb=document.getElementById('mb-'+meal);
    var chev=document.getElementById('chev-'+meal);
    if(mb){
      var isOpen=_mStates[meal]===true;
      mb.style.display=isOpen?'block':'none';
      if(chev)chev.textContent=isOpen?'▾':'▸';
    }
  });
  updateMacroTotals();
  if(autoClassChanged)setTimeout(function(){save();},0);
}
function _setMealOpen(meal,isOpen){
  var mb=document.getElementById('mb-'+meal);
  var chev=document.getElementById('chev-'+meal);
  if(mb)mb.style.display=isOpen?'block':'none';
  if(chev)chev.textContent=isOpen?'▾':'▸';
  var _ms=JSON.parse(localStorage.getItem('meal_open_states')||'{}');
  _ms[meal]=isOpen;
  localStorage.setItem('meal_open_states',JSON.stringify(_ms));
}
function toggleMealSection(meal){
  var mb=document.getElementById('mb-'+meal);
  if(!mb)return;
  _setMealOpen(meal,mb.style.display==='none');
}

function aiSearchFood(){
  var q=(document.getElementById('aiFoodQuery')||{}).value;
  if(!q||!q.trim())return;
  q=q.trim();
  var key=journalAIKey();
  if(!key){alert('Please enter your AI key in Settings first.');return;}
  var resultsDiv=document.getElementById('aiFoodResults');
  if(resultsDiv){resultsDiv.style.display='block';resultsDiv.innerHTML='<div style="color:#666;font-size:0.82rem;padding:4px;">&#x23F3; Searching...</div>';}
  var prompt='Return nutrition facts for: '+q+'\n'
    +'Format each food/serving as a single line: NAME | CALORIES cal | PROTEINg protein | FATg fat | CARBSg carbs | FIBERg fiber | SUGARg sugar | SODIUMmg sodium | VITAmcg vitA | VITCmg vitC | VITDmcg vitD | CALCIUMmg calcium | IRONmg iron | POTASSIUMmg potassium\n'
    +'Use your best nutritional knowledge for realistic values, including fiber, sugar, sodium, vitamins and minerals. Use 0 for a value only if it is genuinely negligible.\n'
    +'Include 1-3 common serving sizes if relevant. Be concise. No extra text.';
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:600,messages:[{role:'user',content:prompt}]})
  }).then(function(r){return r.json();}).then(function(data){
    var text=(data.content&&data.content[0]&&data.content[0].text)||'';
    if(!text){if(resultsDiv)resultsDiv.innerHTML='<div style="color:#e74c3c;font-size:0.82rem;">No results.</div>';return;}
    var lines=text.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.includes('|');});
    if(!lines.length){if(resultsDiv)resultsDiv.innerHTML='<div style="color:#e74c3c;font-size:0.82rem;">Could not parse results.</div>';return;}
    // Store parsed items in window cache to avoid onclick quoting issues
    window._aiFoodCache=[];
    var html='<div style="display:flex;flex-direction:column;gap:5px;">';
    lines.forEach(function(line,idx){
      var parts=line.split('|').map(function(p){return p.trim();});
      var name=parts[0]||'';
      var cal=0,prot=0,fat=0,carbs=0,fiber=0,sugar=0,sodium=0,vitA=0,vitC=0,vitD=0,calcium=0,iron=0,potassium=0;
      parts.forEach(function(p){
        var m;
        if((m=p.match(/(\d+(?:\.\d+)?)\s*cal/i)))cal=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)g?\s*protein/i)))prot=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)g?\s*fat/i)))fat=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)g?\s*carb/i)))carbs=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)g?\s*fiber/i)))fiber=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)g?\s*sugar/i)))sugar=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)\s*mg?\s*sodium/i)))sodium=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)\s*mcg?\s*vit\s*a/i)))vitA=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)\s*mg?\s*vit\s*c/i)))vitC=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)\s*mcg?\s*vit\s*d/i)))vitD=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)\s*mg?\s*calcium/i)))calcium=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)\s*mg?\s*iron/i)))iron=parseFloat(m[1]);
        else if((m=p.match(/(\d+(?:\.\d+)?)\s*mg?\s*potassium/i)))potassium=parseFloat(m[1]);
      });
      window._aiFoodCache.push({name:name,cal:cal,prot:prot,fat:fat,carbs:carbs,fiber:fiber,sugar:sugar,sodium:sodium,vitA:vitA,vitC:vitC,vitD:vitD,calcium:calcium,iron:iron,potassium:potassium});
      var summary=[cal?cal+' cal':'',prot?prot+'g pro':'',fat?fat+'g fat':'',carbs?carbs+'g carb':'',fiber?fiber+'g fiber':'',sodium?sodium+'mg Na':''].filter(Boolean).join(' · ');
      html+='<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #ddd;border-radius:7px;padding:6px 10px;gap:8px;">'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-weight:600;font-size:0.83rem;color:#222;">'+escHtml(name)+'</div>'
        +(summary?'<div style="font-size:0.77rem;color:#666;">'+escHtml(summary)+'</div>':'')
        +'</div>'
        +'<button onclick="aiAddFoodByIndex('+idx+')" '
        +'style="background:#4338ca;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.78rem;cursor:pointer;white-space:nowrap;flex-shrink:0;">+ Add</button>'
        +'</div>';
    });
    html+='</div>';
    if(resultsDiv){resultsDiv.style.display='block';resultsDiv.innerHTML=html;}
  }).catch(function(err){
    if(resultsDiv)resultsDiv.innerHTML='<div style="color:#e74c3c;font-size:0.82rem;">Error: '+err.message+'</div>';
  });
}

function aiAddFoodByIndex(idx){
  var cache=window._aiFoodCache;
  if(!cache||!cache[idx])return;
  var item_data=cache[idx];
  var meal=(document.getElementById('aiFoodTargetMeal')||{}).value||'snack';
  var item={
    id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    meal:meal,name:item_data.name,servingLabel:item_data.servingLabel||'1 serving',servings:1,
    cal:item_data.cal||null,prot:item_data.prot||null,fat:item_data.fat||null,carbs:item_data.carbs||null
  };
  MICRO_FIELDS.forEach(function(f){item[f]=item_data[f]||null;});
  if(!window._foodLog)window._foodLog=[];
  window._foodLog.push(item);
  _setMealOpen(meal,true);
  renderFoodItems();save();
  var flash=document.createElement('div');
  flash.style.cssText='color:#16a34a;font-size:0.82rem;font-weight:700;padding:4px 0;';
  flash.textContent='\u2713 Added '+item_data.name+' to '+meal;
  var resultsDiv=document.getElementById('aiFoodResults');
  if(resultsDiv){resultsDiv.insertBefore(flash,resultsDiv.firstChild);setTimeout(function(){if(flash.parentNode)flash.parentNode.removeChild(flash);},2500);}
}

function addFoodItem(meal){
  var mb=document.getElementById('mb-'+meal);
  var chev=document.getElementById('chev-'+meal);
  _setMealOpen(meal,true);
  var entryId='food-entry-'+meal;
  var existing=document.getElementById(entryId);
  if(existing){
    var isHidden=existing.style.display==='none';
    existing.style.display=isHidden?'flex':'none';
    if(isHidden){var ni=document.getElementById('fe-name-'+meal);if(ni)ni.focus();}
    return;
  }
  var entry=document.createElement('div');
  entry.id=entryId;
  entry.style.cssText='display:flex;gap:4px;align-items:center;flex-wrap:wrap;padding:6px 4px;border-top:1px solid #f0f0f0;margin-top:4px;';
  entry.dataset.meal=meal;
  function mkInput(id,ph,w,type){
    var inp=document.createElement('input');
    inp.id=id+meal;inp.placeholder=ph;
    if(type)inp.type=type;
    inp.style.cssText='width:'+w+';border:1px solid #d1d5db;border-radius:4px;padding:5px 7px;font-size:0.82rem;box-sizing:border-box;';
    return inp;
  }
  var nameInp=mkInput('fe-name-','Food name','min(120px,40%)',null);
  nameInp.style.flex='2';
  var servingInp=mkInput('fe-serving-','Amount','72px',null);
  var servingUnitInp=document.createElement('select');servingUnitInp.id='fe-serving-unit-'+meal;servingUnitInp.style.cssText='width:92px;border:1px solid #d1d5db;border-radius:4px;padding:5px 4px;font-size:0.78rem;box-sizing:border-box;background:#fff;';
  servingUnitInp.innerHTML='<option value="">Unit</option>'+SERVING_UNITS.map(function(unit){return '<option value="'+unit+'">'+unit+'</option>';}).join('');
  var calInp=mkInput('fe-cal-','Cal','50px','number');
  var protInp=mkInput('fe-prot-','Pro','44px','number');
  var fatInp=mkInput('fe-fat-','Fat','44px','number');
  var carbInp=mkInput('fe-carbs-','Crb','44px','number');
  var addBtn=document.createElement('button');
  addBtn.textContent='Add';
  addBtn.style.cssText='background:#667eea;color:white;border:none;border-radius:4px;padding:5px 10px;font-size:0.82rem;cursor:pointer;';
  addBtn.onclick=function(){submitFoodEntry(meal);};
  var cancelBtn=document.createElement('button');
  cancelBtn.textContent='✕';
  cancelBtn.style.cssText='background:#e5e7eb;color:#374151;border:none;border-radius:4px;padding:5px 8px;font-size:0.82rem;cursor:pointer;';
  cancelBtn.onclick=function(){cancelFoodEntry(meal);};
  [nameInp,servingInp,servingUnitInp,calInp,protInp,fatInp,carbInp,addBtn,cancelBtn].forEach(function(el){entry.appendChild(el);});
  entry.addEventListener('keydown',function(e){
    if(e.key==='Enter')submitFoodEntry(meal);
    else if(e.key==='Escape')cancelFoodEntry(meal);
  });
  if(mb)mb.insertBefore(entry,mb.firstChild);
  nameInp.focus();
}

function submitFoodEntry(meal){
  var nameEl=document.getElementById('fe-name-'+meal);
  if(!nameEl)return;
  var name=nameEl.value.trim();
  if(!name)return;
  var calEl=document.getElementById('fe-cal-'+meal);
  var protEl=document.getElementById('fe-prot-'+meal);
  var fatEl=document.getElementById('fe-fat-'+meal);
  var carbEl=document.getElementById('fe-carbs-'+meal);
  var servingEl=document.getElementById('fe-serving-'+meal);
  var servingUnitEl=document.getElementById('fe-serving-unit-'+meal);
  var servingText=servingEl&&servingEl.value.trim()?servingEl.value.trim():'1';if(servingUnitEl&&servingUnitEl.value)servingText+=' '+servingUnitEl.value;else if(servingText==='1')servingText='1 serving';
  var item={
    id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    meal:meal,name:name,servingLabel:servingText,servings:1,
    cal:calEl&&calEl.value!==''?Math.round(parseFloat(calEl.value)||0):null,
    prot:protEl&&protEl.value!==''?Math.round(parseFloat(protEl.value)||0):null,
    fat:fatEl&&fatEl.value!==''?Math.round(parseFloat(fatEl.value)||0):null,
    carbs:carbEl&&carbEl.value!==''?Math.round(parseFloat(carbEl.value)||0):null
  };
  if(!window._foodLog)window._foodLog=[];
  window._foodLog.push(item);
  cancelFoodEntry(meal);
  renderFoodItems();save();
}

function cancelFoodEntry(meal){
  var entry=document.getElementById('food-entry-'+meal);
  if(entry)entry.style.display='none';
  ['fe-name-','fe-serving-','fe-cal-','fe-prot-','fe-fat-','fe-carbs-'].forEach(function(p){
    var el=document.getElementById(p+meal);if(el)el.value='';
  });
  var servingUnitEl=document.getElementById('fe-serving-unit-'+meal);if(servingUnitEl)servingUnitEl.value='';
}

function removeFoodItem(id){
  window._foodLog=(window._foodLog||[]).filter(function(x){return x.id!==id;});
  renderFoodItems();save();
}

function updateFoodField(id,field,val){
  var log=window._foodLog||[];
  var it=log.find(function(x){return x.id===id;});
  if(!it)return;
  it[field]=val;
  if(field==='proteinSource'||field==='carbSource'||field==='fatSource'){
    it.sourceConfidence='High';it.sourceMethod='Remembered correction';it.sourceClassificationAuto=false;rememberFoodSourceCorrection(it);
  }
  // Re-render only for numeric fields so totals update; name edits stay in-place
  if(field!=='name')renderFoodItems();
  save();
}

function compressFoodPhoto(file,done){
  var reader=new FileReader();reader.onload=function(e){var image=new Image();image.onload=function(){var size=180,scale=Math.min(1,size/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);done(canvas.toDataURL('image/jpeg',.72));};image.src=e.target.result;};reader.readAsDataURL(file);
}
function setFoodThumbnail(id,file){
  if(!file||!/^image\//.test(file.type||''))return;
  compressFoodPhoto(file,function(data){var item=(window._foodLog||[]).find(function(food){return food.id===id;});if(!item)return;item.imageData=data;item.imageUrl='';renderFoodItems();save();});
}
function attachPendingFoodPhoto(event){
  var file=event.target.files&&event.target.files[0];if(!file||!window._pendingScanFood)return;
  compressFoodPhoto(file,function(data){window._pendingScanFood.imageData=data;window._pendingScanFood.imageUrl='';renderPendingFoodPhoto(window._pendingScanFood);});event.target.value='';
}
function renderPendingFoodPhoto(food){
  var preview=document.getElementById('scanFoodPhotoPreview');if(!preview)return;preview.innerHTML='';var src=food&&(food.imageData||food.imageUrl);if(!src){preview.textContent='🍽️';return;}var img=document.createElement('img');img.src=src;img.alt='Food thumbnail';img.style.cssText='width:100%;height:100%;object-fit:cover;';img.onerror=function(){preview.textContent='🍽️';};preview.appendChild(img);
}
function foodThumbnailHtml(food,library,idx){
  var src=food&&(food.imageData||food.imageUrl),inside=src?'<img src="'+escHtml(src)+'" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">':'<span style="font-size:1rem;">🖼️</span>';
  var size=library?'54px':'34px';
  return '<span style="width:'+size+';height:'+size+';border-radius:'+(library?'9px':'6px')+';background:#f8fafc;border:1px solid #dbe4ea;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;">'+inside+'</span>';
}
// The Take/Choose photo buttons for a library row (Healthy 7+, Favorites). Rendered as a
// full-width block BELOW the name/score row -- not squeezed into a narrow column beside it --
// so a long, wrapping food name can never crowd or visually overlap these buttons.
function foodThumbnailButtonsHtml(library,idx){
  var change="setLibraryFoodThumbnail('"+library+"',"+idx+",this.files&&this.files[0]);this.value=''";
  return '<div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">'
    +'<label style="min-height:31px;box-sizing:border-box;background:#ecfdf5;color:#166534;border:1px solid #4ade80;border-radius:6px;padding:7px 3px;font-size:.65rem;font-weight:900;text-align:center;cursor:pointer;white-space:nowrap;display:flex;align-items:center;justify-content:center;">📷 Take<input type="file" accept="image/*" capture="environment" style="display:none" onchange="'+change+'"></label>'
    +'<label style="min-height:31px;box-sizing:border-box;background:#eff6ff;color:#1d4ed8;border:1px solid #60a5fa;border-radius:6px;padding:7px 3px;font-size:.65rem;font-weight:900;text-align:center;cursor:pointer;white-space:nowrap;display:flex;align-items:center;justify-content:center;">🖼 Choose<input type="file" accept="image/*" style="display:none" onchange="'+change+'"></label>'
    +'</div>';
}
function setLibraryFoodThumbnail(library,idx,file){
  if(!file||!/^image\//.test(file.type||''))return;
  compressFoodPhoto(file,function(data){
    var foods=library==='healthy'?getHealthyFoods():getFavorites(),food=foods[idx];if(!food)return;food.imageData=data;food.imageUrl='';
    if(library==='healthy')saveHealthyFoods(foods);else saveFavorites(foods);
    var other=library==='healthy'?getFavorites():getHealthyFoods(),name=String(food.name||'').toLowerCase(),changed=false;other.forEach(function(item){if(String(item.name||'').toLowerCase()===name){item.imageData=data;item.imageUrl='';changed=true;}});if(changed){if(library==='healthy')saveFavorites(other);else saveHealthyFoods(other);}
    (window._foodLog||[]).forEach(function(item){if(String(item.name||'').toLowerCase()===name){item.imageData=data;item.imageUrl='';}});save();renderFoodItems();if(library==='healthy')renderHealthyFoodsList();else renderFavsList();
  });
}
function backfillSavedFoodBarcodeImages(skipRender){
  var favorites=getFavorites(),healthy=getHealthyFoods(),targets=[],seen={};
  favorites.concat(healthy).concat(window._foodLog||[]).forEach(function(food){var code=String(food&&food.barcode||'').replace(/\D/g,'');if(code&&!food.imageUrl&&!food.imageData&&!seen[code]){seen[code]=true;targets.push(code);}});
  if(!targets.length)return Promise.resolve(0);
  return Promise.all(targets.map(function(code){return fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=image_front_small_url,image_front_url,image_url').then(function(response){return response.ok?response.json():null;}).then(function(data){var product=data&&data.product||{},url=product.image_front_small_url||product.image_front_url||product.image_url||'';return {code:code,url:url};}).catch(function(){return {code:code,url:''};});})).then(function(results){
    var found={};results.forEach(function(result){if(result.url)found[result.code]=result.url;});var favChanged=false,healthyChanged=false,logChanged=false;
    favorites.forEach(function(food){var url=found[String(food.barcode||'').replace(/\D/g,'')];if(url&&!food.imageUrl&&!food.imageData){food.imageUrl=url;favChanged=true;}});
    healthy.forEach(function(food){var url=found[String(food.barcode||'').replace(/\D/g,'')];if(url&&!food.imageUrl&&!food.imageData){food.imageUrl=url;healthyChanged=true;}});
    (window._foodLog||[]).forEach(function(food){var url=found[String(food.barcode||'').replace(/\D/g,'')];if(url&&!food.imageUrl&&!food.imageData){food.imageUrl=url;logChanged=true;}});
    var byName={};favorites.concat(healthy).concat(window._foodLog||[]).forEach(function(food){var src=food.imageData||food.imageUrl,name=String(food.name||'').toLowerCase();if(src&&name)byName[name]={imageData:food.imageData||'',imageUrl:food.imageUrl||''};});
    favorites.forEach(function(food){var src=byName[String(food.name||'').toLowerCase()];if(src&&!food.imageData&&!food.imageUrl){food.imageData=src.imageData;food.imageUrl=src.imageUrl;favChanged=true;}});
    healthy.forEach(function(food){var src=byName[String(food.name||'').toLowerCase()];if(src&&!food.imageData&&!food.imageUrl){food.imageData=src.imageData;food.imageUrl=src.imageUrl;healthyChanged=true;}});
    if(favChanged)saveFavorites(favorites);if(healthyChanged)saveHealthyFoods(healthy);if(logChanged)save();if(!skipRender&&(favChanged||healthyChanged||logChanged)){renderFoodItems();renderFavsList();renderHealthyFoodsList();}return Object.keys(found).length;
  });
}
function rescanHealthyFoodsAndImages(button,statusId){
  statusId=statusId||'healthyRescanStatus';
  if(button){button.disabled=true;button.textContent='⏳ Scanning saved foods and pictures…';button.style.opacity='.72';}
  var status=document.getElementById(statusId);if(status){status.style.display='block';status.style.color='#475569';status.textContent='Checking every saved Nutrition day, Favorite, and available barcode picture…';}
  window._healthyFoodsImported=false;importHealthyFoodsFromSavedNutrition(true);
  backfillSavedFoodBarcodeImages(true).then(function(imagesFound){
    renderHealthyFoodsList();renderFavsList();var done=document.getElementById(statusId),count=getHealthyFoods().length;if(done){done.style.display='block';done.style.color='#166534';done.textContent='✓ Rescan complete: '+count+' healthy food'+(count===1?'':'s')+' found · '+imagesFound+' barcode picture'+(imagesFound===1?'':'s')+' added.';}
  }).catch(function(){renderHealthyFoodsList();renderFavsList();var failed=document.getElementById(statusId);if(failed){failed.style.display='block';failed.style.color='#991b1b';failed.textContent='The food scan finished, but barcode pictures could not be checked. Try again when connected to the internet.';}});
}

function copyFoodItem(id){
  var log=window._foodLog||[];
  var idx=log.findIndex(function(x){return x.id===id;});
  if(idx===-1)return;
  var copy=JSON.parse(JSON.stringify(log[idx]));
  copy.id='f'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  log.splice(idx+1,0,copy);
  window._foodLog=log;
  renderFoodItems();save();
}

function moveFoodToMeal(id,targetMeal){
  if(!targetMeal)return;
  var log=window._foodLog||[];
  var it=log.find(function(x){return x.id===id;});
  if(!it)return;
  it.meal=targetMeal;
  renderFoodItems();save();
  // Open target section
  _setMealOpen(targetMeal,true);
}

function isFav(item){
  var favs=getFavorites();
  return favs.some(function(f){return f.name&&item.name&&f.name.toLowerCase()===item.name.toLowerCase();});
}

function macroRatioStorageKey(dateKey){return'macro_ratio_settings_'+(dateKey||dk(today));}
function macroRatioSettings(dateKey){
  dateKey=dateKey||dk(today);var defaults={enabled:false,prot:25,carbs:45,fat:30},raw=localStorage.getItem(macroRatioStorageKey(dateKey));
  // Migrate the former all-days setting once, preserving it only for the day
  // being viewed when this version first opens. Every other date stays independent.
  if(!raw&&localStorage.getItem('macro_ratio_settings_migrated_v2')!=='1'){
    var legacy=localStorage.getItem('macro_ratio_settings');if(legacy){raw=legacy;localStorage.setItem(macroRatioStorageKey(dateKey),legacy);}
    localStorage.setItem('macro_ratio_settings_migrated_v2','1');localStorage.removeItem('macro_ratio_settings');
  }
  try{return Object.assign({},defaults,raw?JSON.parse(raw):{});}catch(ignore){return defaults;}
}
function toggleMacroRatioEditor(){
  var panel=document.getElementById('macroRatioEditor');if(!panel)return;var opening=panel.style.display==='none';panel.style.display=opening?'block':'none';if(!opening)return;
  var current=runnerMacroTarget();document.getElementById('macroCustomProt').value=current.prot;document.getElementById('macroCustomCarbs').value=current.carbs;document.getElementById('macroCustomFat').value=current.fat;var note=document.getElementById('macroRatioEditorTotal');if(note)note.textContent='Current total: '+(current.prot+current.carbs+current.fat)+'%. Total must equal 100%.';
}
function saveCustomMacroRatio(){
  var prot=Number(document.getElementById('macroCustomProt').value),carbs=Number(document.getElementById('macroCustomCarbs').value),fat=Number(document.getElementById('macroCustomFat').value),total=prot+carbs+fat,note=document.getElementById('macroRatioEditorTotal');
  if(!Number.isFinite(total)||prot<5||carbs<5||fat<5||prot>80||carbs>80||fat>80||Math.round(total)!==100){if(note){note.textContent='Protein, carbs, and fat must each be 5–80% and total exactly 100%. Current total: '+(Number.isFinite(total)?total:0)+'%.';note.style.color='#b91c1c';}return;}
  localStorage.setItem(macroRatioStorageKey(dk(today)),JSON.stringify({enabled:true,prot:prot,carbs:carbs,fat:fat}));if(note){note.textContent='Saved for '+dk(today)+': '+prot+'% protein, '+carbs+'% carbs, '+fat+'% fat.';note.style.color='#166534';}updateMacroTotals();if(typeof v26Toast==='function')v26Toast('Macro Ratio updated for this day only');
}
function useAutomaticMacroRatio(){localStorage.setItem(macroRatioStorageKey(dk(today)),JSON.stringify({enabled:false}));var panel=document.getElementById('macroRatioEditor');if(panel)panel.style.display='none';updateMacroTotals();if(typeof v26Toast==='function')v26Toast('Automatic runner macro ratio restored for this day');}

function nutritionHardWorkoutForDate(date){
  var dateKey=dk(date),parts=[];
  try{(getActivities()||[]).filter(function(a){return a&&a.date===dateKey;}).forEach(function(a){parts.push([a.title,a.type,a.workout].filter(Boolean).join(' '));});}catch(ignore){}
  try{var plan=JSON.parse(localStorage.getItem('current_training_plan')||'null');if(plan&&plan.text&&plan.startDate){var planned=extractWorkoutFromActivePlan(plan,date);if(planned)parts.push(planned);}}catch(ignorePlan){}
  var text=parts.join(' ').toLowerCase();
  if(/\blong\s+run\b|\bhalf\s+marathon\b|\bmarathon\b/.test(text))return'long';
  if(/\bintervals?\b|\brepeats?\b|\bspeed\s*work\b|\btrack\s+(?:workout|session)\b|\bhill\s+repeats?\b/.test(text))return'interval';
  if(/\btempo\b|\bthreshold\b/.test(text))return'tempo';
  return'';
}
function nutritionPerformancePreset(dateKey){
  var date=new Date((dateKey||dk(today))+'T12:00:00'),tomorrow=new Date(date);tomorrow.setDate(date.getDate()+1);
  var workout=nutritionHardWorkoutForDate(date),phase='day';if(!workout){workout=nutritionHardWorkoutForDate(tomorrow);phase='prior';}if(!workout)return null;
  // Periodized targets for a 185 lb distance runner. Each row totals 100%.
  // Long-run eve reaches about 6 g/kg carbohydrate without requiring full race carb-loading.
  var table={
    long:{prior:{calories:3200,prot:19,carbs:63,fat:18},day:{calories:3300,prot:20,carbs:60,fat:20}},
    tempo:{prior:{calories:2800,prot:20,carbs:60,fat:20},day:{calories:2900,prot:22,carbs:55,fat:23}},
    interval:{prior:{calories:2800,prot:20,carbs:60,fat:20},day:{calories:2950,prot:21,carbs:56,fat:23}}
  },target=table[workout][phase],weight=calorieAdvisorLatestWeight(dateKey||dk(today))||185,scaledCalories=Math.round((target.calories*(weight/185))/25)*25,names={long:'Long Run',tempo:'Tempo Run',interval:'Interval Run'};
  return{workout:workout,phase:phase,calories:scaledCalories,prot:target.prot,carbs:target.carbs,fat:target.fat,label:phase==='day'?'Today: '+names[workout]+' — Training & Recovery Target':'Tomorrow: '+names[workout]+' — Pre-Fueling Target'};
}

function runnerMacroTarget(){
  var dateKey=dk(today),activities=typeof getActivities==='function'?getActivities().filter(function(a){return a.date===dateKey;}):[],workouts=activities.filter(function(a){return !/rest\s*day/i.test(String(a.type||a.title||''));});
  var planSummary=typeof journalTodayTrainingSummary==='function'?journalTodayTrainingSummary():'',activityText=workouts.map(function(a){return [a.title,a.type].filter(Boolean).join(' ');}).join(' '),text=(activityText||planSummary||'').toLowerCase();
  var longest=workouts.reduce(function(max,a){return Math.max(max,parseFloat(a.distance)||0);},0),target={prot:20,carbs:50,fat:30,label:'Rest / recovery day'};
  if(/race|long run|marathon|half marathon/.test(text)||longest>=8)target={prot:18,carbs:65,fat:17,label:'Long-run / race-day target'};
  else if(/tempo|interval|speed|threshold|track|hill repeat/.test(text))target={prot:20,carbs:60,fat:20,label:'Speed / quality-workout target'};
  else if(/run|cycle|bike|strength|weight|cross.train/.test(text)||activities.length)target={prot:20,carbs:55,fat:25,label:'Training-day target'};
  var performance=nutritionPerformancePreset(dateKey);if(performance)target={prot:performance.prot,carbs:performance.carbs,fat:performance.fat,label:performance.label};
  var custom=macroRatioSettings();if(custom.enabled&&Number(custom.prot)+Number(custom.carbs)+Number(custom.fat)===100)target={prot:Number(custom.prot),carbs:Number(custom.carbs),fat:Number(custom.fat),label:'Custom macro target'};
  target.calories=dailyCalorieTargetData().target;return target;
}
function renderRunnerMacroGuidance(log,totals,ratios){
  var target=runnerMacroTarget(),label=document.getElementById('macroTrainingLabel');if(label)label.textContent=target.label+' · '+target.calories.toLocaleString()+' kcal goal';
  var performance=nutritionPerformancePreset(dk(today)),fuelNote=document.getElementById('performanceFuelNote');
  if(fuelNote){fuelNote.style.display=performance?'block':'none';fuelNote.textContent=performance?(performance.phase==='day'?'Morning workout: aim for 30–40g protein with the post-run meal, then spread the remaining protein across the day.':'Pre-fueling day: emphasize carbohydrates at lunch, dinner, and the evening snack.') : '';}
  var fields={prot:{grams:totals.prot,kcal:4,name:'protein'},carbs:{grams:totals.carbs,kcal:4,name:'carbohydrates'},fat:{grams:totals.fat,kcal:9,name:'fat'}};
  Object.keys(fields).forEach(function(kind){
    var cap=kind==='prot'?'Prot':kind.charAt(0).toUpperCase()+kind.slice(1),actual=ratios[kind]||0,goal=target[kind],gramsGoal=target.calories*(goal/100)/fields[kind].kcal,remaining=Math.max(0,Math.round(gramsGoal-fields[kind].grams)),difference=actual-goal,status=difference<-2.5?'Low':difference>2.5?'High':'On target';
    var a=document.getElementById('targetActual'+cap),t=document.getElementById('target'+cap),r=document.getElementById('remain'+cap),s=document.getElementById('status'+cap);if(a)a.textContent=actual.toFixed(1)+'%';if(t)t.textContent=goal+'%';if(r)r.textContent=remaining+'g';if(s){s.textContent=status;s.className='macro-status '+(status==='On target'?'on':status.toLowerCase());}
    fields[kind].remaining=remaining;fields[kind].difference=difference;
  });
  var meals=['breakfast','lunch','dinner','snack','liquids','sports'],names={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snack:'Snacks',liquids:'Liquids',sports:'Sports'},dist=document.getElementById('macroMealDistribution');
  if(dist)dist.innerHTML=meals.map(function(meal){var rows=log.filter(function(x){return (x.meal||'snack')===meal;}),p=0,c=0,f=0;rows.forEach(function(x){var n=parseFloat(x.servings)||1;p+=(parseFloat(x.prot)||0)*n;c+=(parseFloat(x.carbs)||0)*n;f+=(parseFloat(x.fat)||0)*n;});return '<div class="meal-macro-chip"><strong>'+names[meal]+'</strong>'+Math.round(p)+'g P · '+Math.round(c)+'g C · '+Math.round(f)+'g F</div>';}).join('');
}

function updateMacroTotals(){
  var log=window._foodLog||[];
  var hasData=log.length>0;
  var totals=log.reduce(function(a,x){
    var s=parseFloat(x.servings)||1;
    var r={cal:a.cal+(parseFloat(x.cal)||0)*s,prot:a.prot+(parseFloat(x.prot)||0)*s,fat:a.fat+(parseFloat(x.fat)||0)*s,carbs:a.carbs+(parseFloat(x.carbs)||0)*s};
    MICRO_FIELDS.forEach(function(f){r[f]=(a[f]||0)+(parseFloat(x[f])||0)*s;});
    return r;
  },{cal:0,prot:0,fat:0,carbs:0});
  var bar=document.getElementById('macroTotalsBar');
  if(bar)bar.style.display=hasData?'block':'none';
  var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=Math.round(v);};
  set('totCal',totals.cal);set('totProt',totals.prot);set('totFat',totals.fat);set('totCarbs',totals.carbs);
  var calorieTarget=dailyCalorieTargetData().target,calorieOver=Math.max(0,Math.round(totals.cal-calorieTarget)),calorieIndicator=document.getElementById('calorieOverIndicator'),calorieTotal=document.getElementById('totCal');
  if(calorieIndicator){calorieIndicator.style.display=calorieOver?'block':'none';calorieIndicator.innerHTML=calorieOver?'&#x26A0;&#xFE0F; Over daily calorie target by '+calorieOver.toLocaleString()+' kcal':'';}
  if(calorieTotal)calorieTotal.style.color=calorieOver?'#b91c1c':'';
  if(bar){bar.style.borderColor=calorieOver?'#ef4444':'#e9ecef';bar.style.background=calorieOver?'#fff7f7':'#f8f9fa';}
  // Daily food quality is calorie-weighted across every logged food in all meal sections.
  // This lets the overall bar reflect what made up most of the day's intake while still
  // including zero-calorie entries with a small fallback weight.
  var qualityWrap=document.getElementById('dailyFoodQuality'),qualityLabel=document.getElementById('dailyFoodQualityLabel'),qualityMarker=document.getElementById('dailyFoodQualityMarker'),qualityTrack=document.getElementById('dailyFoodQualityTrack'),qualityNote=document.getElementById('dailyFoodQualityNote');
  if(qualityWrap){
    if(!log.length){qualityWrap.style.display='none';}
    else {
      var qualityTotal=0,qualityWeight=0,confidenceTotal=0,qualityContext='rest / recovery day';
      log.forEach(function(item){var quality=runnerFoodQuality(item),servings=Math.max(0.01,parseFloat(item.servings)||1),calories=Math.max(0,(parseFloat(item.cal)||0)*servings),weight=calories||servings;qualityTotal+=quality.score*weight;confidenceTotal+=quality.confidencePct*weight;qualityWeight+=weight;if(quality.workoutContext!=='rest / recovery day')qualityContext=quality.workoutContext;});
      var dailyScore=qualityWeight?qualityTotal/qualityWeight:5,dailyLabel=dailyScore>=9?'Excellent':dailyScore>=7?'Good':dailyScore>=5?'Fair':dailyScore>=3?'Low':'Poor',markerLeft=Math.max(0,Math.min(100,(dailyScore-1)/9*100));
      var dailyConfidence=qualityWeight?Math.round(confidenceTotal/qualityWeight):0,dailyConfidenceLabel=dailyConfidence>=80?'High':dailyConfidence>=55?'Medium':'Low';
      qualityWrap.style.display='block';if(qualityLabel)qualityLabel.textContent=dailyScore.toFixed(1)+'/10 · '+dailyLabel;if(qualityMarker)qualityMarker.style.left=markerLeft+'%';if(qualityTrack)qualityTrack.setAttribute('aria-valuenow',dailyScore.toFixed(1));if(qualityNote)qualityNote.textContent='Across '+log.length+' food item'+(log.length===1?'':'s')+' · '+qualityContext+' · data confidence: '+dailyConfidenceLabel+' ('+dailyConfidence+'%)';
    }
  }
  // Macro ratios use caloric contribution: protein/carbohydrates = 4 kcal/g, fat = 9 kcal/g.
  // Since totals aggregate the full food log, all six meal sections are included.
  var macroCalories={prot:totals.prot*4,carbs:totals.carbs*4,fat:totals.fat*9};
  var macroCalTotal=macroCalories.prot+macroCalories.carbs+macroCalories.fat;
  var macroRatios=macroCalTotal?{prot:macroCalories.prot/macroCalTotal*100,carbs:macroCalories.carbs/macroCalTotal*100,fat:macroCalories.fat/macroCalTotal*100}:{prot:0,carbs:0,fat:0};
  var setRatio=function(kind,labelId,barId){var label=document.getElementById(labelId),segment=document.getElementById(barId),value=macroRatios[kind]||0;if(label)label.textContent=value.toFixed(1)+'%';if(segment)segment.style.width=value+'%';};
  setRatio('prot','ratioProt','ratioProtBar');setRatio('carbs','ratioCarbs','ratioCarbsBar');setRatio('fat','ratioFat','ratioFatBar');
  renderRunnerMacroGuidance(log,totals,macroRatios);
  function macroSourceRatios(macroField,sourceField){
    var grams={support:0,limit:0,unknown:0};
    log.forEach(function(item){var amount=(parseFloat(item[macroField])||0)*(parseFloat(item.servings)||1);if(!amount)return;var source=item[sourceField];grams[source==='support'?'support':source==='limit'?'limit':'unknown']+=amount;});
    var total=grams.support+grams.limit+grams.unknown;
    return total?{support:grams.support/total*100,limit:grams.limit/total*100,unknown:grams.unknown/total*100}:{support:0,limit:0,unknown:0};
  }
  function showMacroSources(prefix,values){['Support','Limit','Unknown'].forEach(function(label){var key=label.toLowerCase(),el=document.getElementById('source'+prefix+label);if(el)el.textContent=(values[key]||0).toFixed(1)+'%';});}
  showMacroSources('Prot',macroSourceRatios('prot','proteinSource'));
  showMacroSources('Carb',macroSourceRatios('carbs','carbSource'));
  showMacroSources('Fat',macroSourceRatios('fat','fatSource'));
  MICRO_FIELDS.forEach(function(f){set(MICRO_META[f].elId,totals[f]||0);});
  // Combined adequacy score for the three priority micronutrients. Each nutrient
  // contributes equally and is capped at 100% so one high value cannot hide a shortfall.
  var microQuality=document.getElementById('topMicroQuality'),microQualityLabel=document.getElementById('topMicroQualityLabel'),microQualityMarker=document.getElementById('topMicroQualityMarker'),microQualityTrack=document.getElementById('topMicroQualityTrack'),microQualityNote=document.getElementById('topMicroQualityNote'),microBreakdown=document.getElementById('topMicroBreakdown');
  if(microQuality){
    if(!hasData){microQuality.style.display='none';}
    else {
      var priorityMicros=[
        {name:'Iron',value:totals.iron||0,target:8,unit:'mg'},
        {name:'Calcium',value:totals.calcium||0,target:1000,unit:'mg'},
        {name:'Vitamin D',value:totals.vitD||0,target:15,unit:'mcg'}
      ];
      var completion=priorityMicros.map(function(n){return Math.max(0,Math.min(1,n.value/n.target));});
      var averageCompletion=completion.reduce(function(sum,n){return sum+n;},0)/completion.length;
      var microScore=1+(averageCompletion*9),microLabel=microScore>=9?'Excellent':microScore>=7?'Good':microScore>=5?'Fair':microScore>=3?'Low':'Poor';
      var weakestIndex=completion.indexOf(Math.min.apply(null,completion)),weakest=priorityMicros[weakestIndex];
      microQuality.style.display='block';
      if(microQualityLabel)microQualityLabel.textContent=microScore.toFixed(1)+'/10 · '+microLabel;
      if(microQualityMarker)microQualityMarker.style.left=Math.max(0,Math.min(100,(microScore-1)/9*100))+'%';
      if(microQualityTrack)microQualityTrack.setAttribute('aria-valuenow',microScore.toFixed(1));
      if(microQualityNote)microQualityNote.textContent='Targets: iron 8mg · calcium 1,000mg · vitamin D 15mcg · lowest today: '+weakest.name+' '+Math.round(weakest.value)+weakest.unit;
      if(microBreakdown)microBreakdown.innerHTML=priorityMicros.map(function(n){
        var pct=n.target?Math.max(0,n.value/n.target*100):0,capped=Math.min(100,pct),status=pct>=100?'Met':pct>=75?'Close':'Low';
        var statusColor=status==='Met'?'#166534':status==='Close'?'#92400e':'#991b1b';
        var barColor=status==='Met'?'#16a34a':status==='Close'?'#f59e0b':'#dc2626';
        var shownValue=n.unit==='mg'&&n.value>=100?Math.round(n.value).toLocaleString():Math.round(n.value*10)/10;
        return '<div><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.69rem;color:#475569;margin-bottom:3px;"><strong>'+n.name+'</strong><span>'+shownValue+n.unit+' / '+n.target.toLocaleString()+n.unit+' · '+Math.round(pct)+'% · <strong style="color:'+statusColor+'">'+status+'</strong></span></div><div role="progressbar" aria-label="'+n.name+' daily target completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(pct)+'" style="height:8px;border-radius:999px;background:#e5e7eb;overflow:hidden;"><span style="display:block;width:'+capped+'%;height:100%;background:'+barColor+';border-radius:999px;"></span></div></div>';
      }).join('');
    }
  }
  // Update hidden fields for backward compat save
  var setHid=function(id,v){var e=document.getElementById(id);if(e)e.value=hasData?Math.round(v):'';};
  setHid('nuCalVal',totals.cal);setHid('nuProtVal',totals.prot);setHid('nuFatVal',totals.fat);setHid('nuCarbsVal',totals.carbs);
  // Water
  var wEl=document.getElementById('totWater');
  if(wEl)wEl.textContent=waterOz?waterOz+' oz':'—';
  if(document.getElementById('calorieAdvisorResult'))calculateDailyCalorieTarget();
}

function calorieAdvisorSettings(){
  try{return Object.assign({base:'',goal:'maintain',refuel:100},JSON.parse(localStorage.getItem('calorie_intake_settings')||'{}'));}
  catch(e){return{base:'',goal:'maintain',refuel:100};}
}
function saveCalorieAdvisorSettings(){
  var base=document.getElementById('calorieBaseTarget'),goal=document.getElementById('calorieGoal'),refuel=document.getElementById('calorieRefuelPct');
  localStorage.setItem('calorie_intake_settings',JSON.stringify({base:base?base.value:'',goal:goal?goal.value:'maintain',refuel:parseInt(refuel&&refuel.value||'100',10)}));
}
function calorieAdvisorLatestWeight(dateKey){
  for(var offset=0;offset<45;offset++){
    var d=new Date(dateKey+'T12:00:00');d.setDate(d.getDate()-offset);
    try{var row=JSON.parse(localStorage.getItem('planner_'+dk(d))||'{}'),weight=parseFloat(row.wWghtVal);if(weight>70&&weight<600)return weight;}catch(e){}
  }
  return 0;
}
function calorieAdvisorDurationHours(value){
  var s=String(value||'').trim();if(!s)return 0;
  if(s.indexOf(':')>=0){var p=s.split(':').map(Number);if(p.length===3)return(p[0]||0)+(p[1]||0)/60+(p[2]||0)/3600;if(p.length===2)return(p[0]||0)/60+(p[1]||0)/3600;}
  return(parseFloat(s)||0)/60;
}
function calorieAdvisorActivityCalories(activity,weightLb){
  var logged=parseFloat(activity.calories)||0;if(logged>0)return{calories:logged,estimated:false};
  var type=String(activity.type||activity.title||'').toLowerCase(),distance=parseFloat(activity.distance)||0,hours=calorieAdvisorDurationHours(activity.duration),kg=(weightLb||185)/2.20462,estimate=0;
  if(type.indexOf('run')>=0&&distance)estimate=(weightLb||185)*distance*.72;
  else if((type.indexOf('walk')>=0||type.indexOf('hike')>=0)&&distance)estimate=(weightLb||185)*distance*.50;
  else if(type.indexOf('cycl')>=0||type.indexOf('bike')>=0)estimate=hours?8*kg*hours:distance*30;
  else if(type.indexOf('strength')>=0||type.indexOf('weight')>=0)estimate=hours?6*kg*hours:0;
  else if(hours)estimate=5.5*kg*hours;
  return{calories:Math.max(0,estimate),estimated:true};
}
function calorieAdvisorActivityDescription(activity,calorieResult){
  var name=String(activity.title||activity.type||'Activity').trim(),parts=[];
  if(parseFloat(activity.distance))parts.push(parseFloat(activity.distance).toFixed(2)+' mi');
  if(activity.duration)parts.push(String(activity.duration));
  parts.push(Math.round(calorieResult.calories||0).toLocaleString()+' kcal '+(calorieResult.estimated?'estimated':'recorded'));
  return name+' ('+parts.join(' · ')+')';
}
function dailyCalorieTargetData(){
  var dateKey=dk(today),settings=calorieAdvisorSettings(),weight=calorieAdvisorLatestWeight(dateKey),manualBase=parseFloat(settings.base)||0,base=manualBase||(weight?Math.round(weight*12.5/50)*50:2200);
  var activities=getActivities().filter(function(a){return a.date===dateKey;}),active=0,estimatedCount=0,activityDetails=[];
  activities.forEach(function(a){var c=calorieAdvisorActivityCalories(a,weight);active+=c.calories;if(c.estimated&&c.calories)estimatedCount++;activityDetails.push(calorieAdvisorActivityDescription(a,c));});
  active=Math.round(active);var refuel=Math.max(0,Math.min(100,parseInt(settings.refuel||100,10)))/100,performance=nutritionPerformancePreset(dateKey),goalAdjust=performance?0:(settings.goal==='loss'?-300:(settings.goal==='gain'?250:0));
  var activityBased=Math.max(1200,Math.round((base+active*refuel+goalAdjust)/25)*25),target=performance?Math.max(performance.calories,activityBased):activityBased,range=Math.max(100,Math.round(target*.05/25)*25);
  return{dateKey:dateKey,settings:settings,weight:weight,manualBase:manualBase,base:base,activities:activities,active:active,estimatedCount:estimatedCount,activityDetails:activityDetails,refuel:refuel,goalAdjust:goalAdjust,target:target,range:range,performancePreset:performance,activityBased:activityBased};
}
function refreshNutritionTargets(showMessage){
  updateMacroTotals();
  if(showMessage&&typeof v26Toast==='function')v26Toast('Calorie and macro targets recalculated together');
}
function calculateDailyCalorieTarget(showMessage){
  var result=document.getElementById('calorieAdvisorResult');if(!result)return;
  var calc=dailyCalorieTargetData(),dateKey=calc.dateKey,settings=calc.settings,baseInput=document.getElementById('calorieBaseTarget'),goalInput=document.getElementById('calorieGoal'),refuelInput=document.getElementById('calorieRefuelPct');
  if(baseInput&&document.activeElement!==baseInput)baseInput.value=settings.base||'';
  if(goalInput)goalInput.value=settings.goal||'maintain';if(refuelInput)refuelInput.value=String(settings.refuel||100);
  var dateLabel=document.getElementById('calorieAdvisorDate');if(dateLabel)dateLabel.textContent=today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  var weight=calorieAdvisorLatestWeight(dateKey),manualBase=parseFloat(settings.base)||0,base=manualBase||(weight?Math.round(weight*12.5/50)*50:2200);
  var activities=getActivities().filter(function(a){return a.date===dateKey;}),active=0,estimatedCount=0;
  var activityDetails=[];
  activities.forEach(function(a){var c=calorieAdvisorActivityCalories(a,weight);active+=c.calories;if(c.estimated&&c.calories)estimatedCount++;activityDetails.push(calorieAdvisorActivityDescription(a,c));});
  active=Math.round(active);var refuel=Math.max(0,Math.min(100,parseInt(settings.refuel||100,10)))/100,goalAdjust=settings.goal==='loss'?-300:(settings.goal==='gain'?250:0);
  var target=calc.target,range=calc.range;weight=calc.weight;manualBase=calc.manualBase;base=calc.base;activities=calc.activities;active=calc.active;estimatedCount=calc.estimatedCount;activityDetails=calc.activityDetails;refuel=calc.refuel;goalAdjust=calc.goalAdjust;
  var logged=Math.round((window._foodLog||[]).reduce(function(sum,x){return sum+(parseFloat(x.cal)||0)*(parseFloat(x.servings)||1);},0)),remaining=Math.max(0,target-logged),over=Math.max(0,logged-target);
  var workoutText=activities.length?activities.length+' workout'+(activities.length===1?'':'s')+' • '+active.toLocaleString()+' active kcal':'No workout logged • 0 active kcal';
  result.innerHTML='<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;"><strong style="font-size:1.45rem;color:#166534;">'+target.toLocaleString()+' kcal</strong><span style="color:#4d7c0f;font-weight:700;">suggested intake</span></div>'
    +(calc.performancePreset?'<div style="margin:6px 0;padding:7px 9px;border-radius:9px;background:#eff6ff;color:#1e3a8a;"><strong>'+escHtml(calc.performancePreset.label)+'</strong><br><span style="font-size:.72rem;">Hard-workout fueling is active. The gradual-loss deduction is paused for this day.</span></div>':'')
    +'<div style="margin-top:4px;"><strong>Practical range:</strong> '+Math.max(1200,target-range).toLocaleString()+'–'+(target+range).toLocaleString()+' kcal</div>'
    +'<div><strong>Calculation:</strong> '+(calc.performancePreset?'Higher of '+calc.performancePreset.calories.toLocaleString()+' performance target or ':'')+base.toLocaleString()+' rest-day target + '+Math.round(active*refuel).toLocaleString()+' workout replacement'+(goalAdjust?' '+(goalAdjust>0?'+ ':'− ')+Math.abs(goalAdjust)+' goal adjustment':'')+'</div>'
    +'<div><strong>Activities:</strong> '+workoutText+(estimatedCount?' ('+estimatedCount+' estimated)':'')+'</div>'
    +(activityDetails.length?'<div style="margin-top:3px;font-size:.72rem;color:#3f6212;"><strong>Used from Activities:</strong> '+activityDetails.map(escHtml).join('; ')+'</div>':'<div style="margin-top:3px;font-size:.72rem;color:#78716c;">No saved Activities were found for this date.</div>')
    +'<div><strong>Logged so far:</strong> '+logged.toLocaleString()+' kcal • '+(over?'<strong style="color:#b91c1c;">Over target: '+over.toLocaleString()+' kcal</strong>':'<strong>Remaining:</strong> '+remaining.toLocaleString()+' kcal')+'</div>'
    +(weight&&!manualBase?'<div style="font-size:.7rem;color:#78716c;margin-top:4px;">Automatic rest-day target uses your most recent weight of '+weight.toFixed(1)+' lb. Enter your own rest-day target above if you know it.</div>':'');
  if(showMessage&&typeof v26Toast==='function')v26Toast('Daily calorie target recalculated');
}

// ── Favorites ────────────────────────────────────────
function getFavorites(){var r=localStorage.getItem('favorites_data');return r?JSON.parse(r):[];}
function updateFavoriteFoodsCount(count){var el=document.getElementById('favoriteFoodsCount');if(el)el.textContent=Number.isFinite(count)?count:getFavorites().length;}
function saveFavorites(favs){localStorage.setItem('favorites_data',JSON.stringify(favs));updateFavoriteFoodsCount(favs.length);}

function saveFoodAsFavorite(itemId){
  var item=(window._foodLog||[]).find(function(x){return x.id===itemId;});
  if(!item){alert('Item not found.');return;}
  var favs=getFavorites();
  var exists=favs.some(function(f){return f.name.toLowerCase()===item.name.toLowerCase();});
  if(exists){if(!confirm('"'+item.name+'" is already in favorites. Add again?'))return;}
  var fav={name:item.name,cal:item.cal,prot:item.prot,fat:item.fat,carbs:item.carbs,servingLabel:item.servingLabel||'1 serving',servings:parseFloat(item.servings)||1,proteinSource:item.proteinSource||'',carbSource:item.carbSource||'',fatSource:item.fatSource||'',barcode:item.barcode||'',imageUrl:item.imageUrl||'',imageData:item.imageData||''};
  MICRO_FIELDS.forEach(function(f){fav[f]=item[f]!=null?item[f]:null;});
  favs.push(fav);saveFavorites(favs);
  alert('⭐ "'+item.name+'" saved to favorites!');
  renderFavsList();
}

function addFavorite(){
  var name=prompt('Favorite food name:','');if(!name||!name.trim())return;
  var cal=prompt('Calories:','');var prot=prompt('Protein g:','');
  var fat=prompt('Fat g:','');var carbs=prompt('Carbs g:','');
  var favs=getFavorites();
  favs.push({name:name.trim(),cal:cal.trim()?parseFloat(cal)||null:null,prot:prot.trim()?parseFloat(prot)||null:null,fat:fat.trim()?parseFloat(fat)||null:null,carbs:carbs.trim()?parseFloat(carbs)||null:null});
  saveFavorites(favs);renderFavsList();
}

function toggleFavMealPanel(){
  // Panel is always visible; just ensure favs tab is active and rendered
  showFavTab('favs');renderFavsList();
}

function showFavTab(tab){
  window._activeFoodLibraryTab=tab;
  var fl=document.getElementById('favsList');var hl=document.getElementById('healthyFoodsList');var ml=document.getElementById('mealsList');
  var fb=document.getElementById('favTabBtn');var hb=document.getElementById('healthyTabBtn');var mb2=document.getElementById('mealTabBtn');
  if(fl)fl.style.display=tab==='favs'?'block':'none';
  if(hl)hl.style.display=tab==='healthy'?'block':'none';
  if(ml)ml.style.display=tab==='meals'?'block':'none';
  if(fb){fb.style.background=tab==='favs'?'#f39c12':'#e9ecef';fb.style.color=tab==='favs'?'#fff':'#555';}
  if(hb){hb.style.background=tab==='healthy'?'#16a34a':'#e9ecef';hb.style.color=tab==='healthy'?'#fff':'#555';}
  if(mb2){mb2.style.background=tab==='meals'?'#f39c12':'#e9ecef';mb2.style.color=tab==='meals'?'#fff':'#555';}
  if(tab==='meals')renderMealsList();else if(tab==='healthy')renderHealthyFoodsList();else renderFavsList();
}
function renderFoodLibrarySearch(){if(window._activeFoodLibraryTab==='healthy')renderHealthyFoodsList();else if(window._activeFoodLibraryTab==='meals')renderMealsList();else renderFavsList();}

function getHealthyFoods(){try{return JSON.parse(localStorage.getItem('healthy_foods_7plus')||'[]');}catch(ignore){return [];}}
function updateHealthyFoodsCount(count){var el=document.getElementById('healthyFoodsCount');if(el)el.textContent=Number.isFinite(count)?count:getHealthyFoods().length;}
function saveHealthyFoods(items){localStorage.setItem('healthy_foods_7plus',JSON.stringify(items));updateHealthyFoodsCount(items.length);}
function importHealthyFoodsFromSavedNutrition(force){
  if(window._healthyFoodsImported&&!force)return;
  window._healthyFoodsImported=true;
  var saved=[],plannerKeys=[];
  try{saved=saved.concat(getFavorites()||[]);}catch(ignore){}
  for(var i=0;i<localStorage.length;i++){
    var key=localStorage.key(i)||'';if(key.indexOf('planner_')===0)plannerKeys.push(key);
  }
  plannerKeys.sort().forEach(function(key){try{var day=JSON.parse(localStorage.getItem(key)||'{}');if(Array.isArray(day.foodLog))saved=saved.concat(day.foodLog);}catch(ignore2){}});
  saved=saved.concat(window._foodLog||[]);
  var latestByName={};
  saved.forEach(function(item){var key=String(item&&item.name||'').trim().toLowerCase();if(key)latestByName[key]=item;});
  var rebuilt=[];
  Object.keys(latestByName).forEach(function(key){
    var item=latestByName[key];inferFoodMacroSources(item);var quality=runnerFoodQuality(item);if(quality.score<7)return;
    var copy={name:String(item.name).trim(),cal:item.cal,prot:item.prot,fat:item.fat,carbs:item.carbs,fiber:item.fiber,sugar:item.sugar,sodium:item.sodium,servingLabel:item.servingLabel||'1 serving',servings:parseFloat(item.servings)||1,proteinSource:item.proteinSource||'',carbSource:item.carbSource||'',fatSource:item.fatSource||'',barcode:item.barcode||'',imageUrl:item.imageUrl||'',imageData:item.imageData||'',score:quality.score,label:quality.label,confidence:quality.confidence,confidencePct:quality.confidencePct,updatedAt:new Date().toISOString()};
    MICRO_FIELDS.forEach(function(field){copy[field]=item[field]!=null?item[field]:null;});rebuilt.push(copy);
  });
  saveHealthyFoods(rebuilt.sort(function(a,b){return (b.score||0)-(a.score||0)||a.name.localeCompare(b.name);}));
}
function captureHealthyFoods(log){
  var healthy=getHealthyFoods(),changed=false;
  (log||[]).forEach(function(item){
    if(!item||!String(item.name||'').trim())return;
    var quality=runnerFoodQuality(item),key=String(item.name).trim().toLowerCase(),idx=healthy.findIndex(function(food){return String(food.name||'').trim().toLowerCase()===key;});
    if(quality.score<7){if(idx>=0){healthy.splice(idx,1);changed=true;}return;}
    var copy={name:String(item.name).trim(),cal:item.cal,prot:item.prot,fat:item.fat,carbs:item.carbs,fiber:item.fiber,sugar:item.sugar,sodium:item.sodium,servingLabel:item.servingLabel||'1 serving',servings:parseFloat(item.servings)||1,proteinSource:item.proteinSource||'',carbSource:item.carbSource||'',fatSource:item.fatSource||'',barcode:item.barcode||'',imageUrl:item.imageUrl||'',imageData:item.imageData||'',score:quality.score,label:quality.label,confidence:quality.confidence,confidencePct:quality.confidencePct,updatedAt:new Date().toISOString()};
    MICRO_FIELDS.forEach(function(field){copy[field]=item[field]!=null?item[field]:null;});
    if(idx<0)healthy.push(copy);else healthy[idx]=copy;changed=true;
  });
  if(changed)saveHealthyFoods(healthy.sort(function(a,b){return (b.score||0)-(a.score||0)||a.name.localeCompare(b.name);}));
}
function renderHealthyFoodsList(){
  var el=document.getElementById('healthyFoodsList');if(!el)return;
  importHealthyFoodsFromSavedNutrition();
  var all=getHealthyFoods();updateHealthyFoodsCount(all.length);var q=(document.getElementById('favSearch')||{value:''}).value.toLowerCase().trim(),foods=q?all.filter(function(food){return String(food.name||'').toLowerCase().includes(q);}):all;
  var rescan='<div style="font-size:.68rem;color:#64748b;margin:0 0 6px;">Use 📷 Take for the camera or 🖼 Choose for a picture already on your phone.</div><button onclick="rescanHealthyFoodsAndImages(this)" style="width:100%;margin:0 0 5px;background:#ecfdf5;color:#166534;border:1px solid #86efac;border-radius:6px;padding:7px;font-size:.74rem;font-weight:800;cursor:pointer;">↻ Rescan foods & barcode pictures</button><div id="healthyRescanStatus" role="status" aria-live="polite" style="display:none;font-size:.7rem;font-weight:700;line-height:1.35;margin:0 2px 7px;"></div>';
  if(!foods.length){el.innerHTML=rescan+'<div style="font-size:.8rem;color:#64748b;text-align:center;padding:12px;line-height:1.4;">No saved foods currently score 7.0 or higher.</div>';return;}
  el.innerHTML=rescan+foods.map(function(food){var idx=all.indexOf(food);return '<div style="padding:7px 0;border-bottom:1px solid #dcfce7;font-size:.82rem;">'
    +'<div style="display:flex;align-items:center;gap:6px;">'
      +foodThumbnailHtml(food,'healthy',idx)+'<div style="flex:1;min-width:0;"><div style="font-weight:800;color:#166534;">'+escHtml(food.name)+'</div><div style="color:#64748b;font-size:.72rem;">'+Number(food.score||7).toFixed(1)+'/10 · '+escHtml(food.label||'Good')+' · '+escHtml(food.confidence||'')+' confidence</div></div>'
      +'<button onclick="loadHealthyFood('+idx+')" style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:5px 9px;font-size:.76rem;cursor:pointer;">+ Add</button>'
      +'<button onclick="deleteHealthyFood('+idx+')" title="Remove from this list" style="background:none;border:1px solid #fecaca;border-radius:4px;color:#dc2626;padding:3px 6px;cursor:pointer;">✕</button>'
    +'</div>'
    +foodThumbnailButtonsHtml('healthy',idx)
    +'</div>';}).join('');
}
function loadHealthyFood(idx){
  var food=getHealthyFoods()[idx];if(!food)return;var target=(document.getElementById('favTargetMeal')||{value:'breakfast'}).value;
  var item=Object.assign({},food,{id:'f'+Date.now(),meal:target});delete item.score;delete item.label;delete item.confidence;delete item.confidencePct;delete item.updatedAt;
  if(!window._foodLog)window._foodLog=[];window._foodLog.push(item);_setMealOpen(target,true);renderFoodItems();save();
}
function deleteHealthyFood(idx){var foods=getHealthyFoods();foods.splice(idx,1);saveHealthyFoods(foods);renderHealthyFoodsList();}

function renderFavsList(){
  var el=document.getElementById('favsList');if(!el)return;
  var favs=getFavorites();
  updateFavoriteFoodsCount(favs.length);
  var q=(document.getElementById('favSearch')||{value:''}).value.toLowerCase().trim();
  var filtered=q?favs.filter(function(f){return f.name.toLowerCase().includes(q);}):favs;
  var photoHelp='<div style="font-size:.68rem;color:#64748b;margin:0 0 6px;">Use 📷 Take for the camera or 🖼 Choose for a picture already on your phone.</div><button onclick="rescanHealthyFoodsAndImages(this,\'favoriteRescanStatus\')" style="width:100%;margin:0 0 5px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;border-radius:6px;padding:7px;font-size:.74rem;font-weight:800;cursor:pointer;">↻ Rescan foods & barcode pictures</button><div id="favoriteRescanStatus" role="status" aria-live="polite" style="display:none;font-size:.7rem;font-weight:700;line-height:1.35;margin:0 2px 7px;"></div>';
  if(!filtered.length){el.innerHTML=photoHelp+'<div style="font-size:0.8rem;color:#bbb;text-align:center;padding:12px;">No favorites yet. Add items from your food log with ⭐</div>';return;}
  var target=(document.getElementById('favTargetMeal')||{value:'breakfast'}).value;
  el.innerHTML=photoHelp+filtered.map(function(f,i){
    var origIdx=favs.indexOf(f);
    return '<div style="padding:5px 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;">'
      +'<div style="display:flex;align-items:center;gap:6px;">'
        +foodThumbnailHtml(f,'favorite',origIdx)+'<div style="flex:1;min-width:0;">'
          +'<div style="font-weight:600;">'+escHtml(f.name)+'</div>'
          +'<div style="color:#888;font-size:0.75rem;">'+(f.cal?'🔥'+f.cal+' ':'')+''+(f.prot?'🥩'+f.prot+'g ':'')+''+(f.carbs?'🍞'+f.carbs+'g':'')+'</div>'
        +'</div>'
        +'<button onclick="loadFavoriteItem('+origIdx+')" style="background:#e67e22;color:#fff;border:none;border-radius:5px;padding:4px 9px;font-size:0.78rem;cursor:pointer;">+ Add</button>'
        +'<button onclick="deleteFavorite('+origIdx+')" style="background:none;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;font-size:0.72rem;padding:2px 5px;color:#e74c3c;">✕</button>'
      +'</div>'
      +foodThumbnailButtonsHtml('favorite',origIdx)
      +'</div>';
  }).join('');
}

function loadFavoriteItem(idx){
  var favs=getFavorites();var f=favs[idx];if(!f)return;
  var target=(document.getElementById('favTargetMeal')||{value:'breakfast'}).value;
  if(!window._foodLog)window._foodLog=[];
  var favItem={id:'f'+Date.now(),meal:target,name:f.name,cal:f.cal,prot:f.prot,fat:f.fat,carbs:f.carbs,servingLabel:f.servingLabel||'1 serving',servings:parseFloat(f.servings)||1,proteinSource:f.proteinSource||'',carbSource:f.carbSource||'',fatSource:f.fatSource||'',imageUrl:f.imageUrl||'',imageData:f.imageData||''};
  MICRO_FIELDS.forEach(function(fld){favItem[fld]=f[fld]!=null?f[fld]:null;});
  window._foodLog.push(favItem);
  _setMealOpen(target,true);
  renderFoodItems();save();
}

function deleteFavorite(idx){
  var favs=getFavorites();favs.splice(idx,1);saveFavorites(favs);renderFavsList();
}

// ── Saved Meals ──────────────────────────────────────
function getSavedMeals(){var r=localStorage.getItem('saved_meals');return r?JSON.parse(r):[];}
function saveSavedMeals(m){localStorage.setItem('saved_meals',JSON.stringify(m));}

function saveMeal(){
  var log=window._foodLog||[];
  if(!log.length){alert('Add some food items first.');return;}
  document.getElementById('saveMealName').value='';
  document.getElementById('saveMealModal').style.display='flex';
  setTimeout(function(){document.getElementById('saveMealName').focus();},80);
}
function confirmSaveMeal(){
  var name=(document.getElementById('saveMealName').value||'').trim();
  if(!name){document.getElementById('saveMealName').focus();return;}
  var category=document.getElementById('saveMealTarget').value;
  var log=window._saveMealItems||window._foodLog||[];
  window._saveMealItems=null;
  var meals=getSavedMeals();
  meals.push({name:name,category:category,items:log.map(function(x){
    var it={name:x.name,cal:x.cal,prot:x.prot,fat:x.fat,carbs:x.carbs,servingLabel:x.servingLabel||'1 serving',servings:parseFloat(x.servings)||1,proteinSource:x.proteinSource||'',carbSource:x.carbSource||'',fatSource:x.fatSource||'',imageUrl:x.imageUrl||'',imageData:x.imageData||''};
    MICRO_FIELDS.forEach(function(f){it[f]=x[f]!=null?x[f]:null;});
    return it;
  })});
  saveSavedMeals(meals);
  document.getElementById('saveMealModal').style.display='none';
}
function saveMealFromSection(mealType){
  var log=(window._foodLog||[]).filter(function(x){return x.meal===mealType;});
  if(!log.length){alert('No items in this section to save.');return;}
  document.getElementById('saveMealName').value='';
  document.getElementById('saveMealTarget').value=mealType;
  // Store section items for confirmSaveMeal to use
  window._saveMealItems=log;
  document.getElementById('saveMealModal').style.display='flex';
  setTimeout(function(){document.getElementById('saveMealName').focus();},80);
}

function renderMealsList(){
  var el=document.getElementById('mealsList');if(!el)return;
  var meals=getSavedMeals();
  if(!meals.length){el.innerHTML='<div style="font-size:0.8rem;color:#bbb;text-align:center;padding:12px;">No saved meals yet. Log a full day of food then tap "Save Meal".</div>';return;}
  el.innerHTML=meals.map(function(m,i){
    var cal=m.items.reduce(function(a,x){return a+(parseFloat(x.cal)||0);},0);
    var macros={prot:0,carbs:0,fat:0},micros={};
    MICRO_FIELDS.forEach(function(field){micros[field]=0;});
    m.items.forEach(function(item){
      macros.prot+=parseFloat(item.prot)||0;
      macros.carbs+=parseFloat(item.carbs)||0;
      macros.fat+=parseFloat(item.fat)||0;
      MICRO_FIELDS.forEach(function(field){micros[field]+=parseFloat(item[field])||0;});
    });
    var macroHtml='<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:5px 0;">'
      +[['Calories',Math.round(cal),'cal'],['Protein',Math.round(macros.prot*10)/10,'g'],['Carbs',Math.round(macros.carbs*10)/10,'g'],['Fat',Math.round(macros.fat*10)/10,'g']].map(function(n){return '<div style="background:#fff7e8;border-radius:5px;padding:4px 2px;text-align:center;"><strong style="display:block;font-size:0.76rem;color:#7a4b00;">'+n[1]+' '+n[2]+'</strong><span style="font-size:0.64rem;color:#777;">'+n[0]+'</span></div>';}).join('')
      +'</div>';
    var microHtml='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;margin:0 0 6px;">'
      +MICRO_FIELDS.map(function(field){var meta=MICRO_META[field],value=Math.round(micros[field]*10)/10;return '<div style="background:#f7faf7;border-radius:4px;padding:3px 4px;font-size:0.65rem;color:#526052;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><span>'+meta.label+'</span> <strong>'+(value||'—')+(value?' '+meta.unit:'')+'</strong></div>';}).join('')
      +'</div>';
    return '<div style="padding:6px 0;border-bottom:1px solid #f5f5f5;">'
      +'<div style="display:flex;align-items:center;gap:6px;">'
        +'<div style="flex:1;font-weight:600;font-size:0.85rem;">'+escHtml(m.name)+'</div>'
        +'<button onclick="deleteMeal('+i+')" style="background:none;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;font-size:0.72rem;padding:2px 5px;color:#e74c3c;">✕</button>'
      +'</div>'
      +'<div style="font-size:0.75rem;color:#888;margin-bottom:4px;">'+m.items.length+' items'+(cal?' · ~'+Math.round(cal)+' cal':'')+'</div>'
      +macroHtml+microHtml
      +'<div style="display:flex;gap:4px;align-items:center;">'
        +'<select id="mealTarget_'+i+'" style="flex:1;border:1px solid #e9c87b;border-radius:5px;padding:3px 5px;font-size:0.75rem;">'
          +'<option value="breakfast"'+(m.category==='breakfast'?' selected':'')+'>🌅 Breakfast</option>'
          +'<option value="lunch"'+(m.category==='lunch'?' selected':'')+'>🥗 Lunch</option>'
          +'<option value="dinner"'+(m.category==='dinner'?' selected':'')+'>🍽️ Dinner</option>'
          +'<option value="snack"'+(m.category==='snack'?' selected':'')+'>🍎 Snacks</option>'
          +'<option value="liquids"'+(m.category==='liquids'?' selected':'')+'>💧 Liquids</option>'
          +'<option value="sports"'+(m.category==='sports'?' selected':'')+'>💪 Sports Nutrition</option>'
        +'</select>'
        +'<button onclick="loadMeal('+i+')" style="background:#2980b9;color:#fff;border:none;border-radius:5px;padding:4px 9px;font-size:0.78rem;cursor:pointer;">Load</button>'
      +'</div>'
    +'</div>';
  }).join('');
}

function loadMeal(idx){
  var meals=getSavedMeals();var m=meals[idx];if(!m)return;
  var perSel=document.getElementById('mealTarget_'+idx);
  var target=perSel?perSel.value:(m.category||(document.getElementById('favTargetMeal')||{value:'breakfast'}).value);
  if(!window._foodLog)window._foodLog=[];
  m.items.forEach(function(it){
    var loadedItem={id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,5),meal:target,name:it.name,cal:it.cal,prot:it.prot,fat:it.fat,carbs:it.carbs,servingLabel:it.servingLabel||'1 serving',servings:parseFloat(it.servings)||1,proteinSource:it.proteinSource||'',carbSource:it.carbSource||'',fatSource:it.fatSource||'',imageUrl:it.imageUrl||'',imageData:it.imageData||''};
    MICRO_FIELDS.forEach(function(f){loadedItem[f]=it[f]!=null?it[f]:null;});
    window._foodLog.push(loadedItem);
  });
  _setMealOpen(target,true);
  renderFoodItems();save();
  // favMealPanel stays open
}

function deleteMeal(idx){
  var meals=getSavedMeals();meals.splice(idx,1);saveSavedMeals(meals);renderMealsList();
}

// ── Copy Day Modal ───────────────────────────────────
function openCopyDayModal(){
  var modal=document.getElementById('copyDayModal');if(!modal)return;
  modal.style.display='flex';
  var title=document.getElementById('copyDayModalTitle');if(title)title.innerHTML='&#x1F4C5; Copy Food Between Days';
  var from=document.getElementById('copyDayFrom');
  var to=document.getElementById('copyDayTo');
  if(from)from.value=dk(today);
  if(to)to.value=dk(today);
  updateCopyDayFoodList();
}
function openCopyMealToDate(mealType){
  var modal=document.getElementById('copyDayModal');if(!modal)return;
  var label=(MEAL_LABELS[mealType]||mealType).replace(/^[^\w]+/,'');
  var title=document.getElementById('copyDayModalTitle');
  if(title)title.textContent='Copy '+label+' to Date';
  var from=document.getElementById('copyDayFrom');
  var to=document.getElementById('copyDayTo');
  var meal=document.getElementById('copyDayMeal');
  var nextDay=new Date(today);nextDay.setDate(nextDay.getDate()+1);
  if(from)from.value=dk(today);
  if(to)to.value=dk(nextDay);
  if(meal)meal.value=mealType;
  modal.style.display='flex';
  updateCopyDayFoodList();
}

function updateCopyDayFoodList(){
  var from=(document.getElementById('copyDayFrom')||{value:''}).value;
  var mealSel=document.getElementById('copyDayMeal');
  var meal=mealSel?mealSel.value:'all';
  var row=document.getElementById('copyDayFoodRow');
  var sel=document.getElementById('copyDayFood');
  if(!from||!sel){if(row)row.style.display='none';return;}
  var r=localStorage.getItem('planner_'+from);
  var items=[];
  if(r){
    try{
      var dd=JSON.parse(r);
      var log=Array.isArray(dd.foodLog)?dd.foodLog:[];
      items=meal==='all'?log:log.filter(function(x){return x.meal===meal;});
    }catch(e){}
  }
  if(!items.length){if(row)row.style.display='none';return;}
  if(row)row.style.display='block';
  sel.innerHTML='<option value="all">All food items ('+items.length+')</option>'
    +items.map(function(x,i){return '<option value="'+i+'">'+escHtml(x.name||'Item '+(i+1))+'</option>';}).join('');
}

function confirmCopyDay(){
  var from=(document.getElementById('copyDayFrom')||{value:''}).value;
  var to=(document.getElementById('copyDayTo')||{value:''}).value;
  var mealSel=document.getElementById('copyDayMeal');
  var meal=mealSel?mealSel.value:'all';
  var foodSel=document.getElementById('copyDayFood');
  var foodIdx=foodSel?foodSel.value:'all';
  var replace=document.getElementById('copyDayReplace');
  var doReplace=replace&&replace.checked;
  if(!from||!to){alert('Please select both From and To dates.');return;}
  var r=localStorage.getItem('planner_'+from);
  if(!r){alert('No data found for '+from+'.');return;}
  var src=JSON.parse(r);
  var srcLog=Array.isArray(src.foodLog)?src.foodLog:[];
  var filtered=meal==='all'?srcLog:srcLog.filter(function(x){return x.meal===meal;});
  if(foodIdx!=='all'){var idx=parseInt(foodIdx)||0;filtered=[filtered[idx]].filter(Boolean);}
  if(!filtered.length){alert('No food items to copy.');return;}
  // Load destination
  var destKey='planner_'+to;
  var destRaw=localStorage.getItem(destKey);
  var dest=destRaw?JSON.parse(destRaw):{};
  var destLog=Array.isArray(dest.foodLog)?dest.foodLog:[];
  if(doReplace){
    // Remove existing items for the meal(s) being copied
    var mealsToReplace=meal==='all'?MEALS:[meal];
    destLog=destLog.filter(function(x){return mealsToReplace.indexOf(x.meal)<0;});
  }
  filtered.forEach(function(x){
    destLog.push(Object.assign({},x,{id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,5)}));
  });
  dest.foodLog=destLog;
  localStorage.setItem(destKey,JSON.stringify(dest));
  // A complete-day copy includes an independent snapshot of that day's Macro
  // Ratio. Editing the destination later can never alter the source date.
  if(meal==='all'&&foodIdx==='all'){
    var sourceRatio=localStorage.getItem(macroRatioStorageKey(from));
    if(sourceRatio)localStorage.setItem(macroRatioStorageKey(to),sourceRatio);
    else localStorage.removeItem(macroRatioStorageKey(to));
  }
  document.getElementById('copyDayModal').style.display='none';
  // If destination is today, reload
  if(to===dk(today)){window._foodLog=destLog;renderFoodItems();save();}
  alert('Copied '+filtered.length+' item'+(filtered.length>1?'s':'')+' to '+to+'.');
}

// ── Food Label Scanner ───────────────────────────────
var _barcodeStream=null,_barcodeScanActive=false,_barcodeDetector=null;
function barcodeStatus(message,isError){var el=document.getElementById('barcodeStatus');if(el){el.textContent=message;el.style.color=isError?'#991b1b':'#475569';el.style.background=isError?'#fff7f7':'#f0fdfa';el.style.borderColor=isError?'#fecaca':'#ccfbf1';}}
function stopBarcodeCamera(){_barcodeScanActive=false;if(_barcodeStream){_barcodeStream.getTracks().forEach(function(track){track.stop();});_barcodeStream=null;}var video=document.getElementById('barcodeVideo');if(video){video.pause();video.srcObject=null;video.style.display='none';}}
function closeBarcodeScanner(){stopBarcodeCamera();var modal=document.getElementById('barcodeScannerModal');if(modal)modal.style.display='none';}
function openBarcodeScanner(){
  var modal=document.getElementById('barcodeScannerModal'),input=document.getElementById('barcodeManualInput');if(!modal)return;
  modal.style.display='flex';if(input)input.value='';barcodeStatus('Starting the rear camera…',false);
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){barcodeStatus('Automatic camera scanning is not supported by this browser. Enter the barcode number below.',false);if(input)input.focus();return;}
  try{_barcodeDetector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});}catch(e){barcodeStatus('Camera barcode detection is unavailable. Enter the barcode number below.',false);if(input)input.focus();return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false}).then(function(stream){
    _barcodeStream=stream;_barcodeScanActive=true;var video=document.getElementById('barcodeVideo');if(!video)return;video.srcObject=stream;video.style.display='block';return video.play().then(function(){barcodeStatus('Point the camera at the barcode and hold steady.',false);scanBarcodeFrame();});
  }).catch(function(){barcodeStatus('The camera could not be opened. Allow camera access or enter the barcode number below.',true);if(input)input.focus();});
}
function scanBarcodeFrame(){
  if(!_barcodeScanActive||!_barcodeDetector)return;var video=document.getElementById('barcodeVideo');
  _barcodeDetector.detect(video).then(function(results){if(!_barcodeScanActive)return;if(results&&results[0]&&results[0].rawValue){var code=String(results[0].rawValue).replace(/\D/g,'');stopBarcodeCamera();var input=document.getElementById('barcodeManualInput');if(input)input.value=code;lookupFoodBarcode(code);return;}setTimeout(scanBarcodeFrame,220);}).catch(function(){if(_barcodeScanActive)setTimeout(scanBarcodeFrame,350);});
}
function barcodeNutrient(nutrients,key){var serving=nutrients[key+'_serving'],per100=nutrients[key+'_100g'];var value=serving!==undefined&&serving!==null?serving:per100;return value!==undefined&&value!==null&&value!==''?Math.round((parseFloat(value)||0)*10)/10:null;}
function showPendingFood(food,title){
  window._pendingScanFood=food;var nameEl=document.getElementById('scanResultName'),macroEl=document.getElementById('scanResultMacros'),modal=document.getElementById('scanConfirmModal'),heading=document.getElementById('scanConfirmTitle');
  renderPendingFoodPhoto(food);
  if(heading)heading.textContent=title||'Food Scanned';if(nameEl)nameEl.textContent=food.name||'Scanned Food';
  if(macroEl){var microSummary=MICRO_FIELDS.filter(function(f){return food[f];}).map(function(f){return MICRO_META[f].icon+' '+food[f]+MICRO_META[f].unit+' '+MICRO_META[f].label;}).join(' | ');macroEl.innerHTML='<strong style="color:#b45309;">'+(food.cal||0)+' calories '+escHtml(food.servingLabel||'per serving')+'</strong><br>'+(food.prot||0)+'g protein &nbsp;|&nbsp; '+(food.fat||0)+'g fat &nbsp;|&nbsp; '+(food.carbs||0)+'g carbs'+(microSummary?'<div style="margin-top:6px;font-size:0.76rem;color:#0f766e;">'+microSummary+'</div>':'')+(food.barcode?'<div style="margin-top:5px;font-size:.68rem;color:#64748b;">Barcode '+escHtml(food.barcode)+' · '+escHtml(food.sourceConfidence||'Low')+' source confidence</div>':'');}
  if(modal)modal.style.display='flex';
}
function lookupFoodBarcode(scannedCode){
  var input=document.getElementById('barcodeManualInput'),code=String(scannedCode||(input&&input.value)||'').replace(/\D/g,'');
  if(code.length<8||code.length>14){barcodeStatus('Enter a valid 8–14 digit UPC or EAN barcode.',true);return;}
  stopBarcodeCamera();barcodeStatus('Looking up product '+code+'…',false);
  var fields='code,product_name,brands,serving_size,nutriments,ingredients_text,categories,image_front_small_url,image_front_url,image_url';
  fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields='+encodeURIComponent(fields)).then(function(response){if(!response.ok)throw new Error('Product lookup failed');return response.json();}).then(function(data){
    if(!data||data.status!==1||!data.product)throw new Error('This barcode was not found');var product=data.product,n=product.nutriments||{},hasServing=['energy-kcal','proteins','fat','carbohydrates'].some(function(key){return n[key+'_serving']!==undefined;});
    var food={name:[product.product_name,product.brands].filter(Boolean).join(' — ')||'Barcode '+code,barcode:code,servingLabel:hasServing&&product.serving_size?'per '+product.serving_size:'per 100 g',cal:barcodeNutrient(n,'energy-kcal'),prot:barcodeNutrient(n,'proteins'),fat:barcodeNutrient(n,'fat'),carbs:barcodeNutrient(n,'carbohydrates'),fiber:barcodeNutrient(n,'fiber'),sugar:barcodeNutrient(n,'sugars'),sodium:(function(){var value=barcodeNutrient(n,'sodium');return value===null?null:Math.round(value*1000);})(),ingredientsText:product.ingredients_text||'',categoriesText:product.categories||'',imageUrl:product.image_front_small_url||product.image_front_url||product.image_url||'',source:'barcode'};
    inferFoodMacroSources(food);if(!food.sourceConfidence){food.sourceConfidence='Low';food.sourceMethod='Needs review';}
    closeBarcodeScanner();showPendingFood(food,'Barcode Product Found');
  }).catch(function(error){barcodeStatus(error.message+'. You can scan the nutrition label instead or enter the food manually.',true);});
}

function scanFoodLabel(ev){
  var file=ev.target.files[0];if(!file)return;
  var key=journalAIKey();if(!key){alert('Add your Anthropic API key in Settings first.');ev.target.value='';return;}
  var reader=new FileReader();
  reader.onload=function(e){
    var b64=e.target.result.split(',')[1];
    var mtype=file.type||'image/jpeg';
    var status=document.createElement('div');
    status.style.cssText='position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:10px 16px;border-radius:8px;z-index:9999;font-size:0.85rem;';
    status.textContent='🔍 Scanning label…';document.body.appendChild(status);
    fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:400,
        messages:[{role:'user',content:[
          {type:'image',source:{type:'base64',media_type:mtype,data:b64}},
          {type:'text',text:'Read this food package image carefully. Extract the per-serving Nutrition Facts, any visible product name, and the complete visible ingredient list. Use the ingredients to classify the dominant source of ALL THREE macros for a runner: protein (lean/plant versus higher-fat/processed), carbohydrates (complex/fiber-rich versus simple/refined), and fat (unsaturated versus saturated/trans). Respond with ONLY a single JSON object — no markdown, no code fences, no explanation, nothing else before or after. The JSON must have these exact keys:\n- "name": the product or food name visible anywhere on the label/package (use "Scanned Food" if not visible)\n- "ingredientsText": the complete ingredient list exactly as visible (use an empty string if it is not visible; do not guess)\n- "proteinSource": use "support" for lean/plant, "limit" for higher-fat/processed, or "unknown" when not supported by visible evidence\n- "carbSource": use "support" for complex/fiber-rich, "limit" for simple/refined, or "unknown" when not supported by visible evidence\n- "fatSource": use "support" for unsaturated, "limit" for saturated/trans, or "unknown" when not supported by visible evidence\n- "cal": Calories per serving as a plain number\n- "prot": Protein grams per serving as a plain number\n- "fat": Total Fat grams per serving as a plain number\n- "carbs": Total Carbohydrate grams per serving as a plain number\n- "fiber": Dietary Fiber grams per serving as a plain number\n- "sugar": Total Sugars grams per serving as a plain number\n- "sodium": Sodium milligrams per serving as a plain number\n- "vitA": Vitamin A in mcg per serving as a plain number\n- "vitC": Vitamin C in mg per serving as a plain number\n- "vitD": Vitamin D in mcg per serving as a plain number\n- "calcium": Calcium in mg per serving as a plain number\n- "iron": Iron in mg per serving as a plain number\n- "potassium": Potassium in mg per serving as a plain number\nAll numeric values must be numbers, not strings. Use 0 if a numeric value cannot be read from the label. Never invent missing ingredients or classifications. Output the JSON object only.'}
          ,{type:'text',text:'Also include a string key named "servingLabel" containing the exact serving size printed on the label, including its unit (for example, "1 cup (240 mL)" or "30 g"). Use "1 serving" only when the serving size cannot be read.'}
        ]}]
      })
    }).then(function(r){return r.json();}).then(function(data){
      document.body.removeChild(status);
      if(data.error)throw new Error(data.error.message);
      var txt=(data.content[0].text||'').trim();
      var parsed;
      try{parsed=JSON.parse(txt);}catch(e){
        var m=txt.match(/\{[\s\S]*\}/);
        if(m)try{parsed=JSON.parse(m[0]);}catch(e2){throw new Error('Could not parse AI response: '+txt.slice(0,100));}
        else throw new Error('No JSON found in response: '+txt.slice(0,100));
      }
      var validSource=function(value){value=String(value||'').toLowerCase();return value==='support'||value==='limit'?value:'';};
      window._pendingScanFood={name:parsed.name||'Scanned Food',ingredientsText:String(parsed.ingredientsText||'').trim(),servingLabel:String(parsed.servingLabel||'1 serving').trim(),proteinSource:validSource(parsed.proteinSource),carbSource:validSource(parsed.carbSource),fatSource:validSource(parsed.fatSource),cal:parsed.cal||null,prot:parsed.prot||null,fat:parsed.fat||null,carbs:parsed.carbs||null};
      MICRO_FIELDS.forEach(function(f){window._pendingScanFood[f]=(parsed[f]!==undefined&&parsed[f]!==null&&parsed[f]!==0)?parsed[f]:null;});
      window._pendingScanFood.source='label';var relevantSources=[window._pendingScanFood.prot?'proteinSource':'',window._pendingScanFood.carbs?'carbSource':'',window._pendingScanFood.fat?'fatSource':''].filter(Boolean),classifiedSources=relevantSources.filter(function(field){return !!window._pendingScanFood[field];}).length;window._pendingScanFood.sourceConfidence=window._pendingScanFood.ingredientsText&&relevantSources.length&&classifiedSources===relevantSources.length?'High':window._pendingScanFood.ingredientsText&&classifiedSources?'Medium':'Low';window._pendingScanFood.sourceMethod=window._pendingScanFood.ingredientsText?'Label + ingredients':'Needs review';inferFoodMacroSources(window._pendingScanFood);var scanHeading=document.getElementById('scanConfirmTitle');if(scanHeading)scanHeading.textContent='Food Label Scanned';
      var nameEl=document.getElementById('scanResultName'),macroEl=document.getElementById('scanResultMacros'),modal=document.getElementById('scanConfirmModal');
      if(nameEl)nameEl.textContent=window._pendingScanFood.name;
      if(macroEl){
        var microSummary=MICRO_FIELDS.filter(function(f){return window._pendingScanFood[f];}).map(function(f){return MICRO_META[f].icon+' '+window._pendingScanFood[f]+MICRO_META[f].unit+' '+MICRO_META[f].label;}).join(' &nbsp;|&nbsp; ');
        macroEl.innerHTML='<strong style="color:#b45309;">'+(window._pendingScanFood.cal||0)+' calories per serving</strong><br>'
          +(window._pendingScanFood.prot||0)+'g protein per serving &nbsp;|&nbsp; '
          +(window._pendingScanFood.fat||0)+'g fat per serving &nbsp;|&nbsp; '
          +(window._pendingScanFood.carbs||0)+'g carbs per serving'
          +(microSummary?'<div style="margin-top:6px;font-size:0.76rem;color:#0f766e;">'+microSummary+'</div>':'')
          +(window._pendingScanFood.ingredientsText?'<div style="margin-top:7px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:.72rem;color:#475569;"><strong>Ingredients read:</strong> '+escHtml(window._pendingScanFood.ingredientsText)+'</div>':'<div style="margin-top:7px;font-size:.7rem;color:#92400e;">Ingredients were not visible; source classification may need review.</div>')
          +'<div style="margin-top:5px;font-size:.68rem;color:#64748b;">'+escHtml(window._pendingScanFood.sourceConfidence||'Low')+' source confidence</div>';
      }
      renderPendingFoodPhoto(window._pendingScanFood);if(modal)modal.style.display='flex';
    }).catch(function(err){
      try{document.body.removeChild(status);}catch(e){}
      alert('Scan failed: '+err.message);
    });
  };
  reader.readAsDataURL(file);
  ev.target.value='';
}

// ── Nutrition-to-Run AI ──────────────────────────────
function confirmScanAdd(){
  var food=window._pendingScanFood;if(!food){alert('No scanned food is waiting to be added.');return;}
  var meal=(document.getElementById('scanMealTarget')||{}).value||'snack';
  if(MEALS.indexOf(meal)<0)meal='snack';
  if(!window._foodLog)window._foodLog=[];
  var scanItem={id:'f'+Date.now(),meal:meal,name:food.name,cal:food.cal,prot:food.prot,fat:food.fat,carbs:food.carbs,servings:1,source:food.source||'scan',barcode:food.barcode||'',servingLabel:food.servingLabel||'',ingredientsText:food.ingredientsText||'',categoriesText:food.categoriesText||'',proteinSource:food.proteinSource||'',carbSource:food.carbSource||'',fatSource:food.fatSource||'',sourceConfidence:food.sourceConfidence||'Low',sourceMethod:food.sourceMethod||'Needs review',imageUrl:food.imageUrl||'',imageData:food.imageData||''};
  MICRO_FIELDS.forEach(function(f){scanItem[f]=food[f]!=null?food[f]:null;});
  window._foodLog.push(scanItem);
  _setMealOpen(meal,true);renderFoodItems();save();
  var modal=document.getElementById('scanConfirmModal');if(modal)modal.style.display='none';
  window._pendingScanFood=null;
  if(typeof v26Toast==='function')v26Toast('Scanned food added');
}
function openFuelAIModal(){
  var key=journalAIKey();
  if(!key){alert('Set your AI key in Settings first.');return;}
  // Default: nutrition = yesterday, run = today
  var t=new Date();
  var yd=new Date(t);yd.setDate(yd.getDate()-1);
  var fmt=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  document.getElementById('fuelNutrDate').value=fmt(yd);
  document.getElementById('fuelRunDate').value=fmt(t);
  document.getElementById('fuelAIModal').style.display='flex';
}
function closeFuelAIModal(){document.getElementById('fuelAIModal').style.display='none';}
function aiNutritionCorrelation(){
  var key=journalAIKey();
  if(!key){alert('Set your AI key in Settings first.');return;}
  var nutrDate=document.getElementById('fuelNutrDate').value;
  var runDate=document.getElementById('fuelRunDate').value;
  if(!nutrDate||!runDate){alert('Please select both dates.');return;}
  closeFuelAIModal();
  var box=document.getElementById('nutritionAIBox');
  if(!box)return;
  box.style.display='block';
  box.textContent='🧠 Analyzing fuel vs. performance…';
  // Nutrition day data
  var nRaw=localStorage.getItem('planner_'+nutrDate);
  var nData=nRaw?JSON.parse(nRaw):{};
  var nLog=Array.isArray(nData.foodLog)?nData.foodLog:[];
  var nCal=nLog.reduce(function(a,x){return a+(parseFloat(x.cal)||0);},0)||parseFloat(nData.nuCalVal)||0;
  var nProt=nLog.reduce(function(a,x){return a+(parseFloat(x.prot)||0);},0)||parseFloat(nData.nuProtVal)||0;
  var nCarbs=nLog.reduce(function(a,x){return a+(parseFloat(x.carbs)||0);},0)||parseFloat(nData.nuCarbsVal)||0;
  var nFat=nLog.reduce(function(a,x){return a+(parseFloat(x.fat)||0);},0)||parseFloat(nData.nuFatVal)||0;
  var nWater=nData.waterOz||(nData.waterCount?nData.waterCount*8:0);
  // Meal breakdown
  var mealTypes=['breakfast','lunch','dinner','snack','liquids','sports'];
  var mealLines=[];
  mealTypes.forEach(function(mt){
    var items=nLog.filter(function(x){return x.meal===mt;});
    if(items.length){
      var names=items.map(function(x){return x.name+(x.cal?' ('+Math.round(parseFloat(x.cal))+'cal)':'');}).join(', ');
      mealLines.push(mt.charAt(0).toUpperCase()+mt.slice(1)+': '+names);
    }
  });
  // Run day data
  var rRaw=localStorage.getItem('planner_'+runDate);
  var rData=rRaw?JSON.parse(rRaw):{};
  // Also check Activities log for that date
  var acts=getActivities();
  var runAct=acts.filter(function(a){return a.date===runDate&&(a.type==='Run'||a.type==='run');});
  var miles=parseFloat(rData.exMiles)||(runAct.length?parseFloat(runAct[0].distance):0)||0;
  var pace=rData.exPace||(runAct.length?runAct[0].pace:'');
  var runNotes=rData.exRunVal||(runAct.length?runAct[0].notes:'');
  // Sports nutrition + water from run day
  var rWater=rData.waterOz||(rData.waterCount?rData.waterCount*8:0);
  var rLog=Array.isArray(rData.foodLog)?rData.foodLog:[];
  var runSports=rLog.filter(function(x){return x.meal==='sports';});
  // Build focused prompt
  var nutrDateFmt=new Date(nutrDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  var runDateFmt=new Date(runDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  var extraCtx=(document.getElementById('fuelExtraContext')&&document.getElementById('fuelExtraContext').value||'').trim();
  var prompt='You are a sports nutritionist. Analyze how the nutrition on '+nutrDateFmt+' likely affected the run on '+runDateFmt+'. Be specific and practical. Max 350 words.\n\n';
  if(extraCtx)prompt+='ADDITIONAL CONTEXT: '+extraCtx+'\n\n';
  prompt+='NUTRITION ('+nutrDateFmt+'): '+(nCal?Math.round(nCal)+' kcal':'No calories logged');
  prompt+=' | Protein '+(nProt?Math.round(nProt)+'g':'N/A');
  prompt+=' | Carbs '+(nCarbs?Math.round(nCarbs)+'g':'N/A');
  prompt+=' | Fat '+(nFat?Math.round(nFat)+'g':'N/A');
  prompt+=' | Water '+(nWater?nWater+' oz':'N/A')+'\n';
  if(mealLines.length)prompt+='Meals:\n'+mealLines.join('\n')+'\n';
  prompt+='\nRUN ('+runDateFmt+'): '+(miles?miles+' miles':'No distance logged');
  if(pace)prompt+=' @ '+pace+'/mi';
  if(rWater)prompt+=' | Water: '+rWater+' oz';
  if(runNotes)prompt+=' — '+runNotes;
  if(runSports.length){var sportNames=runSports.map(function(x){return x.name+(x.cal?' ('+Math.round(parseFloat(x.cal))+'cal)':'');}).join(', ');prompt+='\nSports/Race Nutrition (during run): '+sportNames;}
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:3000,messages:[{role:'user',content:prompt}]})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error)throw new Error(data.error.message);
    var analysis=(data.content[0].text||'').trim();
    window._fuelAnalysisContext=prompt+analysis;
    var _fuelKey='fuel_'+nutrDateFmt+'_'+runDateFmt;_aiLastShown[_fuelKey]={text:analysis,lbl:'Fuel AI '+nutrDateFmt+' → '+runDateFmt};box.innerHTML='<strong style="color:#8e44ad">🧠 Fuel Analysis: '+nutrDateFmt+' → '+runDateFmt+'</strong><br><br>'+analysis.replace(/\n/g,'<br>')+'<div style="text-align:right;margin-top:8px;padding-top:6px;border-top:1px solid #e8c4f0;"><button data-bid="'+_fuelKey+'" onclick="var d=_aiLastShown[this.dataset.bid];if(d){var arch=JSON.parse(localStorage.getItem(\'ai_archive\')||\'[\');arch.unshift({label:d.lbl,text:d.text,ts:new Date().toLocaleString()});while(arch.length>150)arch.pop();localStorage.setItem(\'ai_archive\',JSON.stringify(arch));this.textContent=\'✓ Archived\';this.disabled=true;this.style.background=\'#27ae60\';}" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:none;background:#8e44ad;color:#fff;cursor:pointer;">📁 Archive</button></div>'+'<div style="margin-top:12px;border-top:1px solid #e9d5ff;padding-top:10px;"><div style="font-size:0.78rem;font-weight:700;color:#8e44ad;margin-bottom:5px;">&#x1F4AC; Ask a follow-up:</div><div style="display:flex;gap:6px;align-items:center;"><input type="text" id="fuelFollowUpInput" placeholder="e.g. How to improve carb timing?" style="flex:1;border:1px solid #d0d0ff;border-radius:6px;padding:6px 10px;font-size:0.83rem;outline:none;font-family:inherit;"><button onclick="fuelFollowUp()" style="background:#8e44ad;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:0.82rem;cursor:pointer;white-space:nowrap;">Ask →</button></div><div id="fuelFollowUpResult" style="margin-top:8px;font-size:0.84rem;color:#444;display:none;"></div></div>';
  }).catch(function(err){box.textContent='Error: '+err.message;});
}

function fuelFollowUp(){
  var key=journalAIKey();if(!key)return;
  var q=(document.getElementById('fuelFollowUpInput').value||'').trim();
  if(!q){alert('Enter a follow-up question.');return;}
  var res=document.getElementById('fuelFollowUpResult');if(!res)return;
  res.style.display='block';res.innerHTML='<em style="color:#aaa;">Thinking…</em>';
  var ctx=window._fuelAnalysisContext||'';
  var fup=ctx+'\nFollow-up question: '+q+'\nAnswer specifically and concisely (max 130 words).';
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2000,messages:[{role:'user',content:fup}]})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.error)throw new Error(d.error.message);
    var ans=(d.content[0].text||'').trim();
    window._fuelAnalysisContext+='\nFollow-up: '+q+'\nAnswer: '+ans;
    res.innerHTML='<strong style="color:#8e44ad;">💬 '+escHtml(q)+'</strong><br><br>'+ans.replace(/\n/g,'<br>');
    var inp=document.getElementById('fuelFollowUpInput');if(inp)inp.value='';
  }).catch(function(e){res.innerHTML='<span style="color:#e74c3c;">Error: '+e.message+'</span>';});
}




// ══════════════════════════════════════════════════════
// PER-FIELD UNDO (each text field keeps its own history)
// ══════════════════════════════════════════════════════
var _fieldHistory={};
var _undoInProgress=false;

function _fhGet(id){
  if(!_fieldHistory[id])_fieldHistory[id]={stack:[],idx:-1,timer:null};
  return _fieldHistory[id];
}

function _fieldUndoCapture(id){
  if(_undoInProgress)return;
  var el=document.getElementById(id);if(!el)return;
  var val=el.value;
  var fh=_fhGet(id);
  // Typing new content: trim any redo future
  if(fh.idx<fh.stack.length-1)fh.stack=fh.stack.slice(0,fh.idx+1);
  // Don't push duplicate
  if(fh.stack.length&&fh.stack[fh.stack.length-1]===val)return;
  fh.stack.push(val);
  if(fh.stack.length>80)fh.stack.shift();
  fh.idx=fh.stack.length-1;
  _updateFieldUndo(id);
}

function _scheduleCapture(id){
  if(_undoInProgress)return;
  _fieldUndoCapture(id);
}

function _updateFieldUndo(id){
  var fh=_fhGet(id);
  var uBtn=document.getElementById('undo_'+id);
  var rBtn=document.getElementById('redo_'+id);
  if(uBtn)uBtn.disabled=fh.idx<=0;
  if(rBtn)rBtn.disabled=fh.idx>=fh.stack.length-1;
}

function fieldUndo(id){
  var fh=_fhGet(id);
  if(fh.idx<=0)return;
  _undoInProgress=true;
  fh.idx--;
  var el=document.getElementById(id);
  if(el){el.value=fh.stack[fh.idx];if(id==='jCombined')syncJournalCombinedToFields();save();}
  _updateFieldUndo(id);
  setTimeout(function(){_undoInProgress=false;},100);
}

function fieldRedo(id){
  var fh=_fhGet(id);
  if(fh.idx>=fh.stack.length-1)return;
  _undoInProgress=true;
  fh.idx++;
  var el=document.getElementById(id);
  if(el){el.value=fh.stack[fh.idx];if(id==='jCombined')syncJournalCombinedToFields();save();}
  _updateFieldUndo(id);
  setTimeout(function(){_undoInProgress=false;},100);
}

function _attachFieldUndo(id){
  var el=document.getElementById(id);if(!el)return;
  var fh=_fhGet(id);
  fh.stack=[el.value];
  fh.idx=0;
  // Avoid duplicate listeners on repeated load() calls (day navigation)
  if(!el._undoListenerAttached){
    el.addEventListener('input',function(){_scheduleCapture(id);});
    el._undoListenerAttached=true;
  }
  _updateFieldUndo(id);
}

function attachAllFieldUndos(){
  var ids=['jCombined',
           'spDailyBreadText','spMeditationText',
           'gaAudiobookText','gaSkillText',
           'wBPVal','wPulseVal','wWghtVal','wSleepVal','wMedsVal',
           'exStrengthVal','exBikeVal','exWalkVal'];
  ids.forEach(_attachFieldUndo);
}

// ── Issues to Fix ────────────────────────────────────────
function copyIssuesToClipboard(){
  const el=document.getElementById('jIssues');
  const text=(el&&el.value||'').trim();
  if(!el)return;
  if(!text){alert('No issues logged yet.');return;}
  // Gather all issues across all days
  const allIssues=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k.startsWith('planner_'))continue;
    let d;try{d=JSON.parse(localStorage.getItem(k));}catch{continue;}
    if(d.jIssues&&d.jIssues.trim()){
      const date=k.replace('planner_','');
      allIssues.push('--- '+date+' ---\n'+d.jIssues.trim());
    }
  }
  allIssues.sort().reverse();
  const full=allIssues.join('\n\n')||text;
  navigator.clipboard.writeText(full).then(function(){
    const c=document.getElementById('issuesCopyConfirm');
    if(c){c.style.display='inline';setTimeout(function(){c.style.display='none';},2000);}
  }).catch(function(){
    // Fallback for file:// — show in a prompt
    prompt('Copy all issues (Ctrl+A, Ctrl+C):',full);
  });
}
function updateIssuesCount(){
  let total=0;
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k.startsWith('planner_'))continue;
    let d;try{d=JSON.parse(localStorage.getItem(k));}catch{continue;}
    if(d.jIssues&&d.jIssues.trim()){
      total+=d.jIssues.trim().split('\n').filter(function(l){return l.trim();}).length;
    }
  }
  const el=document.getElementById('issuesCount');
  if(el)el.textContent=total?total+' issue'+(total===1?'':'s')+' logged across all days':'';
}

// ── Voice Input ──────────────────────────────────────────
let _voiceRec=null;
function startVoice(targetId,btn){
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){
    alert('Voice input is not supported in this browser. Try Chrome or Edge.');return;
  }
  // If already recording on this button, stop it
  if(_voiceRec&&btn.classList.contains('recording')){
    _voiceRec.stop();return;
  }
  // Stop any other active recognition
  if(_voiceRec){try{_voiceRec.stop();}catch(e){}}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  _voiceRec=new SR();
  _voiceRec.continuous=false;
  _voiceRec.interimResults=false;
  _voiceRec.lang='en-US';
  // Visual feedback
  document.querySelectorAll('.mic-btn.recording').forEach(function(b){b.classList.remove('recording');b.textContent='🎤 Mic';});
  btn.classList.add('recording');btn.textContent='⏹ Stop';
  _voiceRec.onresult=function(e){
    const transcript=Array.from(e.results).map(function(r){return r[0].transcript;}).join(' ').trim();
    const el=document.getElementById(targetId);
    if(el){
      // For <input> append to end; for <textarea> append with space
      const cur=el.value;
      el.value=(cur?cur+' ':'')+transcript;
      el.dispatchEvent(new Event('input'));
      // Trigger save for planner fields
      if(typeof save==='function')save();
    }
  };
  _voiceRec.onerror=function(e){
    btn.classList.remove('recording');btn.textContent='🎤 Mic';
    if(e.error!=='aborted')alert('Voice error: '+e.error+'. Make sure your microphone is allowed.');
    _voiceRec=null;
  };
  _voiceRec.onend=function(){
    btn.classList.remove('recording');btn.textContent='🎤 Mic';
    _voiceRec=null;
  };
  _voiceRec.start();
}

// ── Ask AI about Journal ──────────────────────────────────

// ==================== BIBLE NOTES ====================
