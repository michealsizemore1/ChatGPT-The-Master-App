function copyItemsToNextDay(ids,confirmId){
  save();
  var tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
  var tKey='planner_'+dk(tomorrow);
  var tData={};try{tData=JSON.parse(localStorage.getItem(tKey)||'{}');}catch(e){}
  var copied=0;
  ids.forEach(function(id){
    var el=document.getElementById(id+'t');
    var txt=el?el.value.trim():'';
    var chk=document.querySelector('[data-key="'+id+'c"]');
    var state=chk?chk.dataset.state||'':'';
    if(!txt||state==='green')return; // skip empty or already completed
    if(!tData[id+'t']||!tData[id+'t'].trim()){tData[id+'t']=txt;}
    else{tData[id+'t']=tData[id+'t']+'\n'+txt;}
    tData[id+'c']='';
    copied++;
  });
  if(!copied){alert('Nothing to copy — all items are either empty or already completed.');return;}
  localStorage.setItem(tKey,JSON.stringify(tData));
  var conf=document.getElementById(confirmId);
  if(conf){conf.style.display='inline';setTimeout(function(){conf.style.display='none';},2500);}
}
function askCopyDate(defaultDate){
  var value=prompt('Copy to which date?\n\nEnter as YYYY-MM-DD:',dk(defaultDate));
  if(value===null)return null;
  value=value.trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||isNaN(new Date(value+'T12:00:00').getTime())){alert('Please enter a valid date as YYYY-MM-DD.');return null;}
  return value;
}
function copyItemsToDay(ids,confirmId){
  save();
  var tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
  var dateKey=askCopyDate(tomorrow);if(!dateKey)return;
  var tKey='planner_'+dateKey,tData={};try{tData=JSON.parse(localStorage.getItem(tKey)||'{}');}catch(e){}
  var copied=0;
  ids.forEach(function(id){
    var el=document.getElementById(id+'t'),txt=el?el.value.trim():'';
    var chk=document.querySelector('[data-key="'+id+'c"]'),state=chk?chk.dataset.state||'':'';
    if(!txt||state==='green')return;
    if(!tData[id+'t']||!tData[id+'t'].trim())tData[id+'t']=txt;
    else tData[id+'t']+='\n'+txt;
    tData[id+'c']='';copied++;
  });
  if(!copied){alert('Nothing to copy — all tasks are empty or completed.');return;}
  localStorage.setItem(tKey,JSON.stringify(tData));
  var conf=document.getElementById(confirmId);if(conf){conf.textContent='Copied to '+dateKey+'!';conf.style.display='inline';setTimeout(function(){conf.style.display='none';},3000);}
}
function togglePdfMenu(){document.getElementById('pdfMenu').classList.toggle('open');}
document.addEventListener('click',e=>{var menu=document.getElementById('pdfMenu');if(menu&&!e.target.closest('.pdf-wrap'))menu.classList.remove('open');});
document.addEventListener('click',e=>{if(!e.target.closest('.header-tools-menu'))closeHeaderTools();});
function printView(tab){document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));if(tab==='weekly')renderWeekly();if(tab==='monthly')renderMonthly();document.getElementById('tab-'+tab).classList.add('active');setTimeout(window.print,200);}
function exportBackup(){
  const d={};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&(!window.journalCloudCanSyncKey||journalCloudCanSyncKey(k)))d[k]=localStorage.getItem(k);
  }
  Promise.all([getAllBookDocuments(),getAllBookCovers(),journalLargeStoreGet('bible_reading_archive').catch(function(){return[];}),journalLargeStoreGet('activities_data').catch(function(){return getActivities();})]).then(function(results){
    if(results[0]&&results[0].length)d['__idb_book_documents']=JSON.stringify(results[0]);
    if(results[1]&&results[1].length)d['__idb_book_covers']=JSON.stringify(results[1]);
    if(results[2]&&results[2].length)d['__idb_bible_reading_archive']=JSON.stringify(results[2]);
    if(results[3]&&results[3].length)d['__idb_activities_data']=JSON.stringify(results[3]);
    var json=JSON.stringify(d,null,2);
    var filename='planner_backup_'+new Date().toISOString().slice(0,10)+'.json';
    // Use File System Access API (Save As dialog) if available
    if(window.showSaveFilePicker){
      window.showSaveFilePicker({suggestedName:filename,types:[{description:'JSON Backup',accept:{'application/json':['.json']}}]})
      .then(function(fh){return fh.createWritable();})
      .then(function(w){return w.write(json).then(function(){return w.close();});})
      .then(function(){localStorage.setItem('last_backup_ts',new Date().toISOString());})
      .catch(function(err){if(err.name!=='AbortError'){fallbackDownload(json,filename);}});
    } else {
      fallbackDownload(json,filename);
    }
  }).catch(function(){
    var json=JSON.stringify(d,null,2);
    fallbackDownload(json,'planner_backup_'+new Date().toISOString().slice(0,10)+'.json');
  });
}
function fallbackDownload(content,filename){
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  a.download=filename;a.click();
  localStorage.setItem('last_backup_ts',new Date().toISOString());
}

// ── Backup Reminder ──────────────────────────────────────────────────────────
function dismissBackupReminder(){
  var snoozeUntil=new Date();snoozeUntil.setDate(snoozeUntil.getDate()+3);
  localStorage.setItem('backup_reminder_snooze',snoozeUntil.toISOString());
  var bar=document.getElementById('backupReminderBar');if(bar)bar.style.display='none';
}
function checkBackupReminder(){
  var bar=document.getElementById('backupReminderBar');if(!bar)return;
  var snooze=localStorage.getItem('backup_reminder_snooze');
  if(snooze&&new Date(snooze)>new Date())return;
  var lastTs=localStorage.getItem('last_backup_ts');
  var msg;
  if(!lastTs){
    msg="You haven't backed up your journal yet.";
  } else {
    var days=Math.floor((Date.now()-new Date(lastTs).getTime())/86400000);
    var reminderDays=parseInt(journalPrefs().backupDays||7,10);
    if(days<reminderDays)return;
    msg='Your last backup was '+days+' days ago.';
  }
  var txt=document.getElementById('backupReminderText');if(txt)txt.textContent=msg;
  bar.style.display='flex';
}
function importBackup(ev){
  const file=ev.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      const plannerCount=Object.keys(d).filter(function(k){return k.indexOf('planner_')===0;}).length;
      const activityCount=(()=>{try{return JSON.parse(d['__idb_activities_data']||d.activities_data||'[]').length;}catch(e2){return 0;}})();
      if(!confirm('Restore preview:\n\n'+plannerCount+' daily entries\n'+activityCount+' activities\n'+Object.keys(d).length+' saved data groups\n\nOverwrite matching current data with this backup?'))return;
      Object.entries(d).forEach(([k,v])=>{if(k==='bible_reading_archive'||k==='activities_data')return;if(!k.startsWith('__idb_')&&(!window.journalCloudCanSyncKey||journalCloudCanSyncKey(k)))localStorage.setItem(k,v);});
      var docPromises=[];var covPromises=[];
      try{if(d['__idb_book_documents']){var docs=JSON.parse(d['__idb_book_documents']);docPromises=docs.map(function(doc){return putBookDocument(doc);});}}catch(e2){}
      try{if(d['__idb_book_covers']){var covs=JSON.parse(d['__idb_book_covers']);covPromises=covs.map(function(c){return setBookCover(c.bookId,c.dataUrl);});}}catch(e3){}
      try{
        var restoredBibleArchive=JSON.parse(d['__idb_bible_reading_archive']||d.bible_reading_archive||'[]');
        if(Array.isArray(restoredBibleArchive)&&restoredBibleArchive.length){_bibleReadingArchiveLargeCache=restoredBibleArchive;docPromises.push(journalLargeStoreSet('bible_reading_archive',restoredBibleArchive));}
      }catch(e4){}
      try{
        var restoredActivities=JSON.parse(d['__idb_activities_data']||d.activities_data||'[]');
        if(Array.isArray(restoredActivities)){_activitiesLargeCache=restoredActivities;docPromises.push(journalLargeStoreSet('activities_data',restoredActivities));localStorage.removeItem('activities_data');}
      }catch(e5){}
      if(docPromises.length||covPromises.length){
        Promise.all(docPromises.concat(covPromises)).then(function(){
          load();alert('Data restored! ('+docPromises.length+' document(s) and '+covPromises.length+' cover(s) included)');
        }).catch(function(){load();alert('Data restored (some library items may not have fully restored).');});
      }else{load();alert('Data restored successfully!');}
    }catch(err){alert('Invalid backup file.');}
  };
  reader.readAsText(file);ev.target.value='';
}


// ── Activities ────────────────────────────────────────────
let editingActivityId=null;
function getActivities(){
  if(Array.isArray(_activitiesLargeCache))return _activitiesLargeCache;
  try{const r=localStorage.getItem('activities_data');return r?JSON.parse(r):[];}catch(e){return[];}
}
function saveActivities(a){
  _activitiesLargeCache=Array.isArray(a)?a:[];
  try{refreshNutritionTargets();}catch(ignore0){}
  journalLargeStoreSet('activities_data',_activitiesLargeCache).then(function(){
    try{localStorage.removeItem('activities_data');}catch(ignore){}
    if(journalCloudUser&&journalCloudReady){
      try{localStorage.setItem('journal_cloud_dirty','1');journalCloudSchedule();}
      catch(ignore2){setTimeout(function(){journalCloudUpload(false);},0);}
    }
  }).catch(function(err){
    console.error('Large activity storage error:',err);
    alert('The activity could not be stored on this device. Please use Backup and try again.');
  });
}


function toggleAddActivity(){
  const f=document.getElementById('addActivityForm');if(!f)return;
  if(f.style.display!=='none'){cancelAddActivity();return;}
  editingActivityId=null;
  document.getElementById('actFormTitle').textContent='➕ Add Activity';
  document.getElementById('actSaveBtn').textContent='Save Activity';
  clearActForm();
  document.getElementById('actDate').value=dk(new Date());
  handleActTypeChange();
  f.style.display='block';
  setTimeout(()=>document.getElementById('actTitle').focus(),50);
}
function cancelAddActivity(){document.getElementById('addActivityForm').style.display='none';editingActivityId=null;}
function clearActForm(){
  ['actDate','actType','actTitle','actDistance','actDuration','actPace','actPower','actHR','actCadence','actCalories','actElevGain','actTemp','actHumidity','actAQI','actExecScore','actRouteUrl','actNotes','actInjuryReport'].forEach(id=>{
    const e=document.getElementById(id);if(e)e.value='';
  });
  document.getElementById('actSource').value='manual';
  document.getElementById('actType').value='Run';
  handleActTypeChange();
}
var ACT_REST_DAY_FIELDS=['actTitle','actDistance','actDuration','actPace','actPower','actHR','actCadence','actCalories','actElevGain','actTemp','actHumidity','actAQI','actExecScore','actRouteUrl','actNotes','actInjuryReport'];
function handleActTypeChange(){
  var typeEl=document.getElementById('actType');if(!typeEl)return;
  var isRestDay=typeEl.value==='Rest Day';
  ACT_REST_DAY_FIELDS.forEach(function(id){
    var e=document.getElementById(id);if(!e)return;
    e.disabled=isRestDay;
    if(isRestDay)e.value='';
  });
  var sourceEl=document.getElementById('actSource');
  if(sourceEl){sourceEl.disabled=isRestDay;if(isRestDay)sourceEl.value='manual';}
}
function getActFormValues(){
  return{
    date:document.getElementById('actDate').value,
    type:document.getElementById('actType').value,
    title:(document.getElementById('actTitle').value||'').trim(),
    distance:parseFloat(document.getElementById('actDistance').value)||0,
    duration:(document.getElementById('actDuration').value||'').trim(),
    pace:(document.getElementById('actPace').value||'').trim(),
    power:parseFloat(document.getElementById('actPower').value)||0,
    heartRate:parseFloat(document.getElementById('actHR').value)||0,
    cadence:parseFloat(document.getElementById('actCadence').value)||0,
    calories:parseFloat(document.getElementById('actCalories').value)||0,
    elevGain:parseFloat(document.getElementById('actElevGain').value)||0,
    notes:(document.getElementById('actNotes').value||'').trim(),
    injuryReport:(document.getElementById('actInjuryReport').value||'').trim(),
    temp:(document.getElementById('actTemp').value||'').trim(),
    humidity:Math.max(0,Math.min(100,parseFloat(document.getElementById('actHumidity').value)||0)),
    aqi:Math.max(0,Math.min(500,parseInt(document.getElementById('actAQI').value,10)||0)),
    execScore:parseFloat(document.getElementById('actExecScore').value)||0,
    routeUrl:skillSafeLink((document.getElementById('actRouteUrl').value||'').trim()),
    source:document.getElementById('actSource').value
  };
}
function saveActivity(){
  try{
    document.activeElement&&document.activeElement.blur&&document.activeElement.blur();
    const v=getActFormValues();
    if(!v.date){alert('Please enter a date.');return;}
    var rawRoute=(document.getElementById('actRouteUrl').value||'').trim();if(rawRoute&&!v.routeUrl){alert('Please enter a valid Run Map / Route Link beginning with http:// or https://.');return;}
    const acts=getActivities();
    if(editingActivityId){
      const idx=acts.findIndex(a=>a.id===editingActivityId);
      if(idx!==-1)acts[idx]={...acts[idx],...v};
    }else{
      acts.push({id:Date.now(),...v});
    }
    saveActivities(acts);
  }catch(err){
    alert('Could not save this activity: '+err.message+'\n\nPlease try again, and let me know if this keeps happening.');
    console.error('saveActivity error:',err);
    return;
  }
  try{cancelAddActivity();}catch(err){console.error('cancelAddActivity error:',err);}
  try{renderActivities();}catch(err){console.error('renderActivities error:',err);if(typeof v26Toast==='function')v26Toast('Activity saved, but the list view had a display error.');}
}
function cycleActSource(id){
  var acts=getActivities();
  var act=acts.find(function(a){return a.id===id;});
  if(!act)return;
  var sources=['manual','garmin','stryd'];
  var cur=(act.source||'manual').toLowerCase();
  var next=sources[(sources.indexOf(cur)+1)%sources.length];
  act.source=next;
  saveActivities(acts);
  renderActivities();
}
function setActSource(id,src){
  var acts=getActivities();
  var act=acts.find(function(a){return a.id===id;});
  if(!act)return;
  act.source=src;
  saveActivities(acts);
  renderActivities();
}
function editActivity(id){
  const act=getActivities().find(a=>a.id===id);if(!act)return;
  editingActivityId=id;
  const f=document.getElementById('addActivityForm');
  document.getElementById('actFormTitle').textContent='✏️ Edit Activity';
  document.getElementById('actSaveBtn').textContent='Save Changes';
  document.getElementById('actDate').value=act.date||'';
  document.getElementById('actType').value=act.type||'Run';
  document.getElementById('actTitle').value=act.title||'';
  document.getElementById('actDistance').value=act.distance||'';
  document.getElementById('actDuration').value=act.duration||'';
  document.getElementById('actPace').value=act.pace||'';
  document.getElementById('actPower').value=act.power||'';
  document.getElementById('actHR').value=act.heartRate||'';
  document.getElementById('actCadence').value=act.cadence||'';
  document.getElementById('actCalories').value=act.calories||'';
  document.getElementById('actElevGain').value=act.elevGain||'';
  document.getElementById('actTemp').value=act.temp||'';
  document.getElementById('actHumidity').value=act.humidity||'';
  document.getElementById('actAQI').value=act.aqi||'';
  document.getElementById('actExecScore').value=act.execScore||'';
  document.getElementById('actRouteUrl').value=act.routeUrl||'';
  document.getElementById('actNotes').value=act.notes||'';
  document.getElementById('actInjuryReport').value=act.injuryReport||'';
  document.getElementById('actSource').value=act.source||'manual';
  handleActTypeChange();
  f.style.display='block';
  setTimeout(function(){f.scrollIntoView({behavior:'smooth',block:'start'});},50);
}
function deleteActivity(id){
  if(!confirm('Delete this activity?'))return;
  saveActivities(getActivities().filter(a=>a.id!==id));
  renderActivities();
}

// CSV Import
function importActivities(ev,hint){
  const file=ev.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const text=e.target.result;
      const rows=parseCSV(text);
      if(rows.length<2){alert('No data rows found in CSV.');ev.target.value='';return;}
      const headers=rows[0].map(h=>h.trim());
      const isGarmin=headers.some(h=>/Activity Type/i.test(h));
      const isStryd=headers.some(h=>/Avg Power.*W/i.test(h))||headers.some(h=>/distance.*m/i.test(h));
      const source=hint||(isGarmin?'garmin':isStryd?'stryd':'manual');
      const parsed=rows.slice(1).map(row=>{
        const r={};headers.forEach((h,i)=>r[h]=row[i]||'');
        return mapActivity(r,source,headers);
      }).filter(a=>a&&a.date);
      if(!parsed.length){alert('Could not parse any activities from this file.');ev.target.value='';return;}
      const existing=getActivities();
      const existKeys=new Set(existing.map(a=>a.date+'_'+a.title+'_'+(a.distance||0)));
      const newOnes=parsed.filter(a=>!existKeys.has(a.date+'_'+a.title+'_'+(a.distance||0)));
      if(existing.length&&newOnes.length<parsed.length){
        const skip=parsed.length-newOnes.length;
        if(!confirm(skip+' duplicate(s) detected and skipped. Import '+newOnes.length+' new activities?')){ev.target.value='';return;}
      }
      saveActivities([...existing,...newOnes]);
      try{renderActivities();}catch(e){console.warn('Render after import:',e);}
      alert('Imported '+newOnes.length+' activities ('+source+').');
    }catch(err){alert('Import error: '+err.message);}
    ev.target.value='';
  };
  reader.readAsText(file);
}
function parseCSV(text){
  const rows=[];const lines=text.split(/\r?\n/);
  for(const line of lines){
    if(!line.trim())continue;
    const cols=[];let cur='',inQ=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}
      else if(c===','&&!inQ){cols.push(cur.trim());cur='';}
      else cur+=c;
    }
    cols.push(cur.trim());rows.push(cols);
  }
  return rows;
}
function parseActivityDate(s){
  if(!s)return'';
  s=s.trim().split(' ')[0]; // strip time portion if present e.g. "6/12/2026 13:00"
  // Already ISO: YYYY-MM-DD
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  // M/D/YYYY or MM/DD/YYYY
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m)return m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
  return s.slice(0,10);
}
function mapActivity(r,source,headers){
  function g(...keys){for(const k of keys){for(const h of headers){if(h.toLowerCase().includes(k.toLowerCase())&&r[h]&&r[h].trim())return r[h].trim();}}}
  let date='',title='',type='Run',distance=0,duration='',pace='',power=0,heartRate=0,cadence=0,calories=0,elevGain=0,routeUrl='';
  if(source==='garmin'){
    const rawDate=g('Date')||'';
    date=rawDate?parseActivityDate(rawDate):'';
    title=g('Title')||g('Activity Name')||'Activity';
    const rawType=g('Activity Type')||'Run';
    // Normalize Garmin type names to app types
    const garminTypeMap={'running':'Run','trail running':'Run','treadmill running':'Run','track running':'Run','road running':'Run','virtual run':'Run','indoor running':'Run','cycling':'Bike','road cycling':'Bike','mountain biking':'Bike','indoor cycling':'Bike','swimming':'Swim','open water swimming':'Swim','walking':'Walk','hiking':'Hike','strength training':'Strength','yoga':'Yoga','cardio':'Cardio'};
    type=garminTypeMap[rawType.toLowerCase()]||rawType;
    const distRaw=parseFloat(g('Distance'))||0;
    // Garmin exports in user's preferred unit; assume miles if <30, else km→mi
    distance=distRaw>0?(distRaw<30?distRaw:distRaw*0.621371):0;
    distance=Math.round(distance*100)/100;
    duration=g('Time')||g('Duration')||'';
    pace=g('Avg Pace')||'';
    power=parseFloat(g('Avg Power'))||0;
    heartRate=parseFloat(g('Avg HR'))||0;
    cadence=parseFloat(g('Avg Run Cadence'))||parseFloat(g('Cadence'))||0;
    calories=parseFloat((g('Calories')||'').replace(/,/g,''))||0;
    const ascRaw=parseFloat((g('Total Ascent')||g('Elev Gain')||'').replace(/,/g,''))||0;
    elevGain=ascRaw>500?Math.round(ascRaw*3.28084):Math.round(ascRaw); // if meters convert to ft
  }else if(source==='stryd'){
    date=parseActivityDate(g('Date','Start Date','Workout Date','Activity Date','Start Time','Timestamp')||'');
    title=g('Activity Name','Activity','Workout Name','Name','Title')||'Stryd Run';
    type=g('Activity Type','Workout Type','Type')||'Run';
    const distRaw=parseFloat(g('Distance'))||0;
    distance=distRaw>200?Math.round(distRaw/1609.34*100)/100:Math.round(distRaw*100)/100;
    const durRaw=g('Duration','Moving Duration','Elapsed Time','Time')||'';
    const durSecs=parseFloat(durRaw)||0;
    duration=(durSecs>0&&!durRaw.includes(':'))?(function(){var h=Math.floor(durSecs/3600);var m=Math.floor((durSecs%3600)/60);var s=Math.round(durSecs%60);return(h?h+':':'')+(h?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');})():durRaw||'';
    const paceStr=(g('Avg Pace','Pace')||'').trim();
    if(paceStr.includes(':')){pace=paceStr;}
    else{const paceRaw=parseFloat(paceStr)||0;if(paceRaw>0){const pm=Math.floor(paceRaw);const ps=Math.round((paceRaw-pm)*60);pace=pm+':'+(ps<10?'0':'')+ps;}}
    power=parseFloat(g('Avg Power','Power'))||0;
    heartRate=parseFloat(g('Avg HR','Heart Rate'))||0;
    cadence=parseFloat(g('Avg Cadence','Cadence'))||0;
    calories=parseFloat((g('Calories')||'').replace(/,/g,''))||0;
    const elevRaw=parseFloat((g('Elev Gain','Elevation Gain')||'').replace(/,/g,''))||0;
    elevGain=elevRaw>0?(elevRaw<500?Math.round(elevRaw*3.28084):Math.round(elevRaw)):0;
  }else{
    date=parseActivityDate(g('Date')||'');
    title=g('Title','Name','Activity')||'Activity';
    type=g('Type','Activity Type')||'Run';
    distance=parseFloat(g('Distance'))||0;
    duration=g('Duration','Time')||'';
    pace=g('Pace','Avg Pace')||'';
    power=parseFloat(g('Power','Avg Power'))||0;
    heartRate=parseFloat(g('HR','Heart Rate','Avg HR'))||0;
    cadence=parseFloat(g('Cadence'))||0;
    calories=parseFloat((g('Calories')||'').replace(/,/g,''))||0;
    elevGain=parseFloat((g('Elev Gain','Elevation Gain')||'').replace(/,/g,''))||0;
  }
  routeUrl=skillSafeLink(g('Route URL','Map URL','routeUrl')||'');
  if(!date)return null;
  return{id:Date.now()+Math.random(),source,date,title,type,distance,duration,pace,power,heartRate,cadence,calories,elevGain,routeUrl,notes:''};
}

// Export
function exportActivities(){
  const acts=getActivities();if(!acts.length){alert('No activities to export.');return;}
  const headers=['date','type','title','distance','duration','pace','power','heartRate','cadence','calories','elevGain','routeUrl','source','notes'];
  const csvRows=[headers.join(','),...acts.map(a=>headers.map(h=>{const v=a[h]||'';return typeof v==='string'&&v.includes(',')? '"'+v+'"':v;}).join(','))];
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csvRows.join('\n')],{type:'text/csv'}));
  a.download='activities_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

// ── Activities: enhancements ────────────────────────────────────────────────
let actChartMode='miles';
function setChartMode(m){actChartMode=m;document.getElementById('chartMiBtn').classList.toggle('active',m==='miles');document.getElementById('chartPwBtn').classList.toggle('active',m==='power');drawActChart(getActivities());}
function saveCPAndRender(){const v=document.getElementById('cpInput').value;localStorage.setItem('cp_value',v||'');renderActivities();}
function getCP(){return parseFloat(localStorage.getItem('cp_value'))||0;}
function powerZone(p,cp){if(!cp||!p)return null;const r=p/cp;if(r<0.55)return{z:'Z1',cls:'z1'};if(r<0.75)return{z:'Z2',cls:'z2'};if(r<0.90)return{z:'Z3',cls:'z3'};if(r<1.05)return{z:'Z4',cls:'z4'};return{z:'Z5',cls:'z5'};}

function goToActivityDate(dateStr){
  const target=new Date(dateStr+'T00:00:00');
  today.setFullYear(target.getFullYear(),target.getMonth(),target.getDate());
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const dailyBtn=document.querySelector('[onclick*="switchTab(\'daily\'"]');
  if(dailyBtn)dailyBtn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-daily').classList.add('active');
  document.getElementById('streakBar').style.display='flex';
  document.getElementById('aiToolbar').style.display='block';
  load();
  window.scrollTo(0,0);
}

function toggleNoteEdit(id){
  const wrap=document.getElementById('noteWrap_'+id);
  if(!wrap)return;
  const isOpen=wrap.style.display!=='none';
  wrap.style.display=isOpen?'none':'block';
  if(!isOpen){setTimeout(()=>{const ta=document.getElementById('noteTA_'+id);if(ta)ta.focus();},50);}
}
function saveNoteInline(id){
  const ta=document.getElementById('noteTA_'+id);if(!ta)return;
  const acts=getActivities();
  const idx=acts.findIndex(a=>a.id===id);
  if(idx!==-1){acts[idx].notes=ta.value;saveActivities(acts);}
  renderActivities();
}

function calcStatsBar(filtered){
  let totalMi=0,totalSec=0,totalCal=0,totalPace=0,paceCount=0,totalPower=0,powerCount=0;
  filtered.forEach(a=>{
    totalMi+=a.distance||0;totalCal+=a.calories||0;
    if(a.duration){const p=a.duration.split(':').map(Number);if(p.length===3)totalSec+=p[0]*3600+p[1]*60+p[2];else if(p.length===2)totalSec+=p[0]*60+p[1];}
    const pp=parsePace(a.pace);if(pp>0){totalPace+=pp;paceCount++;}
    if(a.power>0){totalPower+=a.power;powerCount++;}
  });
  const h=Math.floor(totalSec/3600),m=Math.floor((totalSec%3600)/60),s=Math.round(totalSec%60);
  const timeStr=h>0?h+'h '+m+'m':(m>0?(s>0?m+'m '+s+'s':m+'m'):'—');
  const avgPaceSec=paceCount?Math.round(totalPace/paceCount):0;
  const avgPaceStr=avgPaceSec?Math.floor(avgPaceSec/60)+':'+(avgPaceSec%60<10?'0':'')+avgPaceSec%60+'/mi':'—';
  const avgPwr=powerCount?Math.round(totalPower/powerCount):0;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('sbMiles',totalMi?totalMi.toFixed(1):'—');set('sbTime',timeStr);
  set('sbAvgPace',avgPaceStr);const pwrThreshold=Math.ceil(filtered.length*0.25);set('sbAvgPower',(avgPwr&&powerCount>=pwrThreshold)?avgPwr+'W':'—');
  set('sbCal',totalCal?totalCal.toLocaleString():'—');set('sbCount',filtered.length);
  const bar=document.getElementById('actStatsBar');if(bar)bar.style.display=filtered.length?'flex':'none';
}

function calcPRs(acts){
  let longestRun=null,fastestPace=null,highestPower=null,mostElev=null,mostCal=null;
  acts.forEach(a=>{
    if((a.distance||0)>0&&(!longestRun||a.distance>longestRun.distance))longestRun=a;
    const pp=parsePace(a.pace);if(pp>0&&(!fastestPace||pp<parsePace(fastestPace.pace)))fastestPace=a;
    if((a.power||0)>0&&(!highestPower||a.power>highestPower.power))highestPower=a;
    if((a.elevGain||0)>0&&(!mostElev||a.elevGain>mostElev.elevGain))mostElev=a;
    if((a.calories||0)>0&&(!mostCal||a.calories>mostCal.calories))mostCal=a;
  });
  const fmt=a=>{if(!a||!a.date)return'';const d=new Date(a.date+'T00:00:00');return isNaN(d.getTime())?a.date:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});};
  const prs=[];
  if(longestRun)prs.push({val:longestRun.distance.toFixed(2)+' mi',lbl:'Longest Run',date:fmt(longestRun)});
  if(fastestPace)prs.push({val:fastestPace.pace+'/mi',lbl:'Fastest Pace',date:fmt(fastestPace)});
  if(highestPower)prs.push({val:highestPower.power+'W',lbl:'Peak Avg Power',date:fmt(highestPower)});
  if(mostElev)prs.push({val:mostElev.elevGain.toLocaleString()+' ft',lbl:'Most Elev Gain',date:fmt(mostElev)});
  if(mostCal)prs.push({val:mostCal.calories.toLocaleString()+' cal',lbl:'Most Calories',date:fmt(mostCal)});
  const grid=document.getElementById('actPRGrid');const sec=document.getElementById('actPRSection');
  if(!grid||!sec)return;
  if(!prs.length){sec.style.display='none';return;}
  sec.style.display='block';
  grid.innerHTML=prs.map(p=>`<div class="act-pr-card"><div class="pr-val">${p.val}</div><div class="pr-lbl">${p.lbl}</div><div class="pr-date">${p.date}</div></div>`).join('');
}
function togglePRs(){
  const grid=document.getElementById('actPRGrid');const arr=document.getElementById('prArrow');
  if(!grid)return;const open=grid.style.display!=='none';
  grid.style.display=open?'none':'grid';if(arr)arr.textContent=open?'▶':'▼';
}

function calcStreakAndLoad(acts){
  var now=new Date();
  var todayStr=localDateStr(now);
  var todayEp=epDay(todayStr);
  var todayDow=(now.getDay()+6)%7;
  var thisMon=todayEp-todayDow;
  var N=12;
  var wkMiles=new Array(N).fill(0);
  var wkCount=new Array(N).fill(0);
  acts.forEach(function(a){
    if(!a.date||typeof a.date!=='string')return;
    var ep=epDay(a.date);
    var aDate=new Date(a.date+'T12:00:00');
    var aDow=(aDate.getDay()+6)%7;
    var aMon=ep-aDow;
    var weeksAgo=Math.round((thisMon-aMon)/7);
    var slot=N-1-weeksAgo;
    if(slot<0||slot>=N)return;
    wkMiles[slot]+=parseFloat(a.distance)||0;
    wkCount[slot]++;
  });
  var streak=0;
  for(var i=N-1;i>=0;i--){if(wkCount[i]>0)streak++;else break;}
  var chip=document.getElementById('actStreakChip');
  if(chip){if(streak>0){chip.textContent='🔥 '+streak+'-week streak';chip.style.display='inline-block';}else chip.style.display='none';}
  var maxV=Math.max.apply(null,wkMiles.concat([1]));
  var loadBar=document.getElementById('actLoadBar');
  if(loadBar){
    loadBar.innerHTML=wkMiles.map(function(mi,i){
      var h=Math.max(2,Math.round((mi/maxV)*34));
      var isThisWk=(i===N-1);
      var wkEp=thisMon-(N-1-i)*7;
      var d=new Date(wkEp*86400000);
      var lbl=(d.getUTCMonth()+1)+'/'+(d.getUTCDate());
      return'<div class="act-load-week" title="'+lbl+': '+mi.toFixed(1)+' mi"><div class="act-load-bar-inner" style="height:'+h+'px;background:'+(isThisWk?'#e67e22':'#f0c080')+';"></div><div class="act-load-lbl">'+(i%3===0?String(d.getUTCMonth()+1):'')+'</div></div>';
    }).join('');
  }
  drawActChart(acts);
}

function localDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
// Treat YYYY-MM-DD as UTC midnight → integer day number (no timezone ambiguity)
function epDay(dateStr){var p=dateStr.split('-');return Math.floor(Date.UTC(+p[0],+p[1]-1,+p[2])/86400000);}
function drawActChart(acts){
  var barsEl=document.getElementById('actChartBars');
  var lblsEl=document.getElementById('actChartLabels');
  if(!barsEl||!lblsEl)return;
  if(!acts||!acts.length){
    barsEl.innerHTML='<div style="color:#bbb;font-size:0.82rem;padding:20px;text-align:center;width:100%;">No activities yet</div>';
    lblsEl.innerHTML='';return;
  }
  // Today's local date string → epoch day (UTC-midnight basis)
  var now=new Date();
  var todayStr=localDateStr(now);
  var todayEp=epDay(todayStr);
  // Day-of-week offset to Monday (0=Mon…6=Sun), using local time
  var todayDow=(now.getDay()+6)%7;
  var thisMon=todayEp-todayDow; // epoch day of this Monday
  var N=26;
  var milesArr=new Array(N).fill(0);
  var pwrSum=new Array(N).fill(0);
  var pwrCnt=new Array(N).fill(0);
  acts.forEach(function(a){
    if(!a.date||typeof a.date!=='string')return;
    var ep=epDay(a.date);
    // Compute this activity's Monday epoch
    var aDate=new Date(a.date+'T12:00:00');
    var aDow=(aDate.getDay()+6)%7;
    var aMon=ep-aDow;
    var weeksAgo=Math.round((thisMon-aMon)/7);
    var slot=N-1-weeksAgo;
    if(slot<0||slot>=N)return;
    milesArr[slot]+=parseFloat(a.distance)||0;
    var pw=parseFloat(a.power)||0;
    if(pw>0){pwrSum[slot]+=pw;pwrCnt[slot]++;}
  });
  var mode=actChartMode;
  var vals=mode==='miles'?milesArr:pwrSum.map(function(s,i){return pwrCnt[i]>0?Math.round(s/pwrCnt[i]):0;});
  var maxV=Math.max.apply(null,vals.concat([1]));
  var BAR_MAX=100;
  var unit=mode==='miles'?'mi':'W';
  barsEl.innerHTML=vals.map(function(v,i){
    var bh=v>0?Math.max(4,Math.round((v/maxV)*BAR_MAX)):0;
    var isThisWk=(i===N-1);
    var bg=isThisWk?'#e67e22':(v>0?'#f0a050':'#e8e8e8');
    var valLbl=v>0?'<div style="font-size:7px;color:#555;text-align:center;line-height:1.1;font-weight:700;">'+(mode==='miles'?v.toFixed(1):v)+'</div>':'';
    return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;height:100%;">'
      +valLbl
      +'<div style="width:80%;background:'+bg+';height:'+bh+'px;border-radius:2px 2px 0 0;flex-shrink:0;"></div>'
      +'</div>';
  }).join('');
  lblsEl.innerHTML=vals.map(function(_,i){
    var show=(i%4===0||i===N-1);
    var lbl='';
    if(show){
      var wkMon=thisMon-(N-1-i)*7;
      var d=new Date(wkMon*86400000);
      lbl=(d.getUTCMonth()+1)+'/'+(d.getUTCDate());
    }
    return'<div style="flex:1;font-size:7px;color:#bbb;text-align:center;white-space:nowrap;overflow:hidden;min-width:0;">'+lbl+'</div>';
  }).join('');
}

// Render

function renderMileageSummary(){
  const acts=getActivities();
  const now=new Date();
  // Week boundaries (Mon–Sun)
  const dow=now.getDay();// 0=Sun
  const daysSinceMon=(dow===0?6:dow-1);
  const thisMonStart=new Date(now);thisMonStart.setDate(now.getDate()-daysSinceMon);thisMonStart.setHours(0,0,0,0);
  const lastMonStart=new Date(thisMonStart);lastMonStart.setDate(thisMonStart.getDate()-7);
  const lastSunEnd=new Date(thisMonStart);lastSunEnd.setMilliseconds(-1);
  // MTD / YTD
  const mtdStart=new Date(now.getFullYear(),now.getMonth(),1);
  const ytdStart=new Date(now.getFullYear(),0,1);
  let thisWeek=0,lastWeek=0,mtd=0,ytd=0;
  const periodStats={
    ThisWeek:{pace:0,paceN:0,watts:0,wattsN:0,time:0},
    LastWeek:{pace:0,paceN:0,watts:0,wattsN:0,time:0},
    MTD:{pace:0,paceN:0,watts:0,wattsN:0,time:0},
    YTD:{pace:0,paceN:0,watts:0,wattsN:0,time:0}
  };
  function addActivityStats(bucket,a){
    const pace=a.pace?parsePace(a.pace):0;
    const watts=parseFloat(a.power)||0;
    if(pace){bucket.pace+=pace;bucket.paceN++;}
    if(watts){bucket.watts+=watts;bucket.wattsN++;}
    bucket.time+=parseMins(a.duration);
  }
  acts.forEach(a=>{
    const m=parseFloat(a.distance)||0;
    if(!a.date)return;
    const d=new Date(a.date+'T00:00:00');
    if(d>=thisMonStart){thisWeek+=m;addActivityStats(periodStats.ThisWeek,a);}
    if(d>=lastMonStart&&d<thisMonStart){lastWeek+=m;addActivityStats(periodStats.LastWeek,a);}
    if(d>=mtdStart){mtd+=m;addActivityStats(periodStats.MTD,a);}
    if(d>=ytdStart){ytd+=m;addActivityStats(periodStats.YTD,a);}
  });
  // Also pull from daily journal exMiles (in case not logged as activity)
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k.startsWith('planner_'))continue;
    const dateStr=k.replace('planner_','');
    const d=new Date(dateStr+'T00:00:00');
    // Check if this date already covered by an activity
    const alreadyCovered=acts.some(a=>a.date===dateStr&&(parseFloat(a.distance)||0)>0);
    if(alreadyCovered)continue;
    let dd;try{dd=JSON.parse(localStorage.getItem(k));}catch{continue;}
    const m=parseFloat(dd.exMiles)||0;
    if(!m)continue;
    if(d>=thisMonStart)thisWeek+=m;
    if(d>=lastMonStart&&d<thisMonStart)lastWeek+=m;
    if(d>=mtdStart)mtd+=m;
    if(d>=ytdStart)ytd+=m;
  }
  const fmt=v=>v>0?v.toFixed(1):'0.0';
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=fmt(v);};
  set('mileThisWeek',thisWeek);set('mileLastWeek',lastWeek);set('mileMTD',mtd);set('mileYTD',ytd);
  Object.keys(periodStats).forEach(function(suffix){
    const stat=periodStats[suffix];
    const paceEl=document.getElementById('pace'+suffix);
    const wattsEl=document.getElementById('watts'+suffix);
    const timeEl=document.getElementById('time'+suffix);
    if(paceEl)paceEl.textContent=stat.paceN?fmtPace(stat.pace/stat.paceN)+'/mi':'—';
    if(wattsEl)wattsEl.textContent=stat.wattsN?Math.round(stat.watts/stat.wattsN)+' W':'—';
    if(timeEl)timeEl.textContent=stat.time?fmtMins(stat.time):'—';
  });
}


var actCollapsed=new Set();
function toggleActCard(id){
  if(actCollapsed.has(id))actCollapsed.delete(id);else actCollapsed.add(id);
  var body=document.getElementById('actBody_'+id);
  var chev=document.getElementById('actChev_'+id);
  if(body)body.style.display=actCollapsed.has(id)?'none':'block';
  if(chev)chev.innerHTML=actCollapsed.has(id)?'&#x25B6;':'&#x25BC;';
}
function collapseAllActs(){getActivities().forEach(function(a){actCollapsed.add(a.id);});renderActivities();}
function expandAllActs(){actCollapsed=new Set();renderActivities();}
function toggleActSources(){
  var p=document.getElementById('actSourcesPanel');
  var c=document.getElementById('actSourcesChev');
  if(!p)return;
  var open=p.style.display!=='none';
  p.style.display=open?'none':'block';
  if(c)c.innerHTML=open?'&#x25B6;':'&#x25BC;';
}

function renderActivities(){
  renderMileageSummary();
  const cpEl=document.getElementById('cpInput');
  if(cpEl&&!cpEl.value){const stored=localStorage.getItem('cp_value');if(stored)cpEl.value=stored;}
  const cp=getCP();
  const acts=getActivities();
  const cnt=document.getElementById('actCount');
  if(cnt)cnt.textContent=acts.length?acts.length+' activit'+(acts.length!==1?'ies':'y'):'';
  const el=document.getElementById('activityList');if(!el)return;

  const filterType=(document.getElementById('actFilterType')||{}).value||'';
  const rawSrc=(document.getElementById('actFilterSource')||{}).value;
  const filterSource=(rawSrc===undefined||rawSrc===''||rawSrc==='all')?'all':rawSrc.toLowerCase();
  const sortBy=(document.getElementById('actSort')||{}).value||'newest';
  const search=((document.getElementById('actSearch')||{}).value||'').toLowerCase();
  const dateFrom=(document.getElementById('actDateFrom')||{}).value||'';
  const dateTo=(document.getElementById('actDateTo')||{}).value||'';
  const groupByDay=document.getElementById('actGroupDay')&&document.getElementById('actGroupDay').checked;

  var filtered=acts.filter(function(a){
    if(filterType){var at=(a.type||'').toLowerCase();var ft=filterType.toLowerCase();var runTypes=['run','running','trail run','trail running','treadmill','treadmill running','track running','road running','virtual run'];var isRunFilter=ft==='run';var actIsRun=runTypes.some(function(r){return at===r||at.includes('run');});if(isRunFilter?!actIsRun:at!==ft)return false;}
    if(filterSource!=='all'){var actSrc=(a.source||'manual').toLowerCase();if(actSrc!==filterSource)return false;}
    if(search&&!((a.title||'').toLowerCase().includes(search)||(a.date||'').includes(search)||(a.type||'').toLowerCase().includes(search)))return false;
    if(dateFrom&&a.date&&a.date<dateFrom)return false;
    if(dateTo&&a.date&&a.date>dateTo)return false;
    return true;
  });

  filtered.sort(function(a,b){
    if(sortBy==='oldest')return(a.date||'').localeCompare(b.date||'');
    if(sortBy==='distance')return(b.distance||0)-(a.distance||0);
    if(sortBy==='power')return(b.power||0)-(a.power||0);
    if(sortBy==='pace'){var pa=parsePace(a.pace),pb=parsePace(b.pace);return(pa||999)-(pb||999);}
    return(b.date||'').localeCompare(a.date||'');
  });

  calcStatsBar(filtered);calcStreakAndLoad(acts);

  // Source breakdown
  var gCnt=0,sCnt=0,mCnt=0;
  acts.forEach(function(a){var src=(a.source||'manual').toLowerCase();if(src==='garmin')gCnt++;else if(src==='stryd')sCnt++;else mCnt++;});
  var cntEl=document.getElementById('actCount');
  if(cntEl&&acts.length){
    cntEl.innerHTML=acts.length+' activit'+(acts.length!==1?'ies':'y')
      +(gCnt?' <span style="background:#00b2e3;color:#fff;border-radius:4px;padding:1px 5px;font-size:0.68rem;font-weight:700;">G:'+gCnt+'</span>':'')
      +(sCnt?' <span style="background:#ff6b35;color:#fff;border-radius:4px;padding:1px 5px;font-size:0.68rem;font-weight:700;">S:'+sCnt+'</span>':'')
      +(mCnt?' <span style="background:#888;color:#fff;border-radius:4px;padding:1px 5px;font-size:0.68rem;font-weight:700;">M:'+mCnt+'</span>':'');
  }

  // Show/hide collapse buttons
  var showLabel=document.getElementById('actShowingLabel');
  var expBtn=document.getElementById('actExpandAllBtn');
  var colBtn=document.getElementById('actCollapseAllBtn');

  if(!acts.length){
    el.innerHTML='<div style="text-align:center;color:#aaa;padding:40px 20px;font-size:0.95rem;">No activities yet — import a CSV or tap <strong>+ Add</strong>.</div>';
    if(showLabel)showLabel.textContent='';
    if(expBtn)expBtn.style.display='none';
    if(colBtn)colBtn.style.display='none';
    return;
  }
  if(!filtered.length){
    el.innerHTML='<div style="text-align:center;color:#aaa;padding:40px 20px;font-size:0.95rem;">No activities match your filters.</div>';
    if(showLabel)showLabel.textContent='';
    if(expBtn)expBtn.style.display='none';
    if(colBtn)colBtn.style.display='none';
    return;
  }

  if(showLabel)showLabel.textContent='Showing '+filtered.length+' of '+acts.length;
  if(expBtn)expBtn.style.display='inline-block';
  if(colBtn)colBtn.style.display='inline-block';

  var typeColor={Run:'#e67e22',Ride:'#8e44ad',Walk:'#27ae60',Swim:'#2980b9',Strength:'#e74c3c',Other:'#95a5a6'};

  function buildCard(a,tc,showDate,inGroup){
    var stats=[];
    if(a.distance)stats.push('<span class="act-stat">&#x1F4CF; <strong>'+a.distance+'</strong> mi</span>');
    if(a.duration)stats.push('<span class="act-stat">&#x23F1; <strong>'+fmtDuration(a.duration)+'</strong></span>');
    if(a.pace)stats.push('<span class="act-stat">&#x1F3C3; <strong>'+a.pace+'</strong>/mi</span>');
    if(a.power){var zone=powerZone(a.power,cp);var zb=zone?'<span class="zone-badge '+zone.cls+'">'+zone.z+'</span>':'';stats.push('<span class="act-stat">&#x26A1; <strong>'+a.power+'</strong>W'+zb+'</span>');}
    if(a.heartRate)stats.push('<span class="act-stat">&#x2764; <strong>'+a.heartRate+'</strong> bpm</span>');
    if(a.cadence)stats.push('<span class="act-stat">&#x1F9B5; <strong>'+a.cadence+'</strong> spm</span>');
    if(a.calories)stats.push('<span class="act-stat">&#x1F525; <strong>'+a.calories+'</strong> cal</span>');
    if(a.elevGain)stats.push('<span class="act-stat">&#x26F0; <strong>'+a.elevGain+'</strong> ft</span>');
    if(a.temp)stats.push('<span class="act-stat">&#x1F321;&#xFE0F; <strong>'+a.temp+'</strong>°F</span>');
    if(a.humidity)stats.push('<span class="act-stat">&#x1F4A7; Humidity <strong>'+a.humidity+'</strong>%</span>');
    if(a.aqi)stats.push('<span class="act-stat">&#x1F32C;&#xFE0F; AQI <strong>'+a.aqi+'</strong></span>');
    if(a.execScore)stats.push('<span class="act-stat">&#x1F3AF; <strong>'+a.execScore+'</strong>/100</span>');
    var collapsed=actCollapsed.has(a.id);
    var chevron=collapsed?'&#x25B6;':'&#x25BC;';
    var bodyDisplay=collapsed?'none':'block';
    var marginLeft=inGroup?'margin-left:12px;':'';
    var dateHtml=showDate?'<div class="act-date">&#x1F4C5; '+showDate+'</div>':'';
    var journalBtn=!inGroup?'<button class="act-journal-btn" onclick="goToActivityDate(\''+a.date+'\')" title="Jump to Journal">&#x1F4D3;</button>':'';
    return '<div class="act-card '+(a.type||'other').toLowerCase()+'" style="border-left-color:'+tc+';'+marginLeft+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;cursor:pointer;" onclick="toggleActCard('+a.id+')">'
      +'<div style="flex:1;min-width:0;">'
      +'<span class="act-badge '+(a.source||'manual')+'" onclick="event.stopPropagation();cycleActSource('+a.id+')" title="Click to change source" style="cursor:pointer;">'+(a.source||'manual')+'</span>'
      +' <span style="font-size:0.75rem;font-weight:700;color:'+tc+';text-transform:uppercase;">'+escHtml(a.type||'')+'</span>'
      +'<div class="act-title">'+escHtml(a.title||'Activity')+'</div>'
      +dateHtml
      +'</div>'
      +'<div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">'
      +'<button onclick="event.stopPropagation();editActivity('+a.id+')" style="font-size:0.72rem;padding:3px 9px;border-radius:6px;border:1px solid #e0d4fb;background:#f3e8ff;color:#7c3aed;cursor:pointer;font-weight:600;white-space:nowrap;">✏️ Edit</button>'
      +'<span id="actChev_'+a.id+'" style="color:#aaa;font-size:0.75rem;">'+chevron+'</span>'
      +'</div>'
      +'</div>'
      +'<div id="actBody_'+a.id+'" style="display:'+bodyDisplay+';">'
      +'<div class="act-stats">'+stats.join('')+'</div>'
      +(a.routeUrl?'<a href="'+escHtml(a.routeUrl)+'" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#075985;border-radius:7px;padding:6px 10px;font-size:.76rem;font-weight:800;text-decoration:none;">&#x1F5FA;&#xFE0F; Open Run Map</a>':'')
      +(a.notes?'<div style="font-size:0.82rem;color:#666;margin-top:8px;white-space:pre-wrap;"><strong style="display:block;color:#475569;margin-bottom:2px;">Notes</strong>'+escHtml(a.notes)+'</div>':'')
      +(a.injuryReport?'<div style="font-size:0.82rem;color:#7f1d1d;margin-top:8px;padding:8px 10px;background:#fff7f7;border:1px solid #fecaca;border-radius:7px;white-space:pre-wrap;"><strong style="display:block;color:#b91c1c;margin-bottom:2px;">Injury Report</strong>'+escHtml(a.injuryReport)+'</div>':'')
      +'<div id="noteWrap_'+a.id+'" style="display:none;margin-top:6px;">'
      +'<textarea class="act-note-edit" id="noteTA_'+a.id+'" placeholder="Add a note...">'+escHtml(a.notes||'')+'</textarea>'
      +'<div style="display:flex;gap:6px;margin-top:4px;">'
      +'<button onclick="saveNoteInline('+a.id+')" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:none;background:#e67e22;color:white;cursor:pointer;">Save</button>'
      +'<button onclick="toggleNoteEdit('+a.id+')" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:none;background:#f0f0f0;color:#555;cursor:pointer;">Cancel</button>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:5px;margin-top:8px;flex-wrap:wrap;">'
      +'<span style="font-size:0.72rem;color:#888;font-weight:600;">Source:</span>'
      +['manual','garmin','stryd'].map(function(s){var cur=(a.source||'manual')===s;return'<button onclick="event.stopPropagation();setActSource('+a.id+',\''+s+'\')" style="font-size:0.72rem;padding:3px 9px;border-radius:10px;border:1px solid '+(cur?'#667eea':'#ddd')+';background:'+(cur?'#667eea':'#fff')+';color:'+(cur?'#fff':'#888')+';cursor:pointer;font-weight:'+(cur?'700':'400')+';">'+s.charAt(0).toUpperCase()+s.slice(1)+'</button>';}).join('')
      +'</div>'
      +'<div style="display:flex;gap:4px;margin-top:6px;">'
      +journalBtn
      +'<button class="act-note-btn" onclick="toggleNoteEdit('+a.id+')" title="Quick note">&#x1F4DD;</button>'
      +'<button class="book-edit" onclick="editActivity('+a.id+')" title="Edit">&#x270F;</button>'
      +'<button class="book-del" onclick="deleteActivity('+a.id+')" title="Delete">&#x2715;</button>'
      +'</div>'
      +'</div>'
      +'</div>';
  }

  if(groupByDay){
    var groups={};
    filtered.forEach(function(a){var d=a.date||'Unknown';if(!groups[d])groups[d]=[];groups[d].push(a);});
    var sortedDates=Object.keys(groups).sort(function(a,b){return sortBy==='oldest'?a.localeCompare(b):b.localeCompare(a);});
    el.innerHTML=sortedDates.map(function(date){
      var dayActs=groups[date];
      var _dd=date&&date!=='Unknown'?new Date(date+'T00:00:00'):null;
      var dt=_dd&&!isNaN(_dd.getTime())?_dd.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}):(date||'Unknown Date');
      var dayMiles=dayActs.reduce(function(s,a){return s+(a.distance||0);},0);
      var cards=dayActs.map(function(a){
        var tc=typeColor[a.type]||'#95a5a6';
        return buildCard(a,tc,'',true);
      }).join('');
      return '<div style="margin-bottom:14px;">'
        +'<div style="font-weight:700;color:#e67e22;font-size:0.9rem;padding:6px 10px;background:#fff5e6;border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">'
        +'<span>&#x1F4C5; '+dt+'</span>'
        +(dayMiles>0?'<span style="font-size:0.8rem;font-weight:600;color:#b8860b;">'+dayMiles.toFixed(2)+' mi</span>':'')
        +'</div>'+cards+'</div>';
    }).join('');
    return;
  }

  el.innerHTML=filtered.map(function(a){
    var tc=typeColor[a.type]||'#95a5a6';
    var _d=a.date?new Date(a.date+'T00:00:00'):null;
    var dt=_d&&!isNaN(_d.getTime())?_d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}):(a.date||'');
    return buildCard(a,tc,dt,false);
  }).join('');
}




// ── AI Training Plan ────────────────────────────────────────────────────────
function renderActivePlan(){loadCurrentPlan();}
function loadCurrentPlan(){
  var sec=document.getElementById('tpPersistSection');
  var archSec=document.getElementById('tpArchiveSection');
  var raw=localStorage.getItem('current_training_plan');
  if(!raw||!sec){if(sec)sec.style.display='none';return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){sec.style.display='none';return;}
  if(plan.scheduleMode&&(plan.scheduleVersion!==3||!plan.schedule||Object.keys(plan.schedule).length<2)){
    var rebuiltSchedule=buildUploadedTrainingSchedule(plan.text,plan.startDate||dk(new Date()),plan.weeks);
    plan.schedule=rebuiltSchedule.schedule;plan.scheduleMode=rebuiltSchedule.mode;plan.scheduleVersion=3;
    localStorage.setItem('current_training_plan',JSON.stringify(plan));
  }
  sec.style.display='block';
  // Meta line
  var meta=document.getElementById('tpPersistMeta');
  if(meta){
    var parts=[];
    if(plan.type)parts.push(plan.type);
    if(plan.weeks)parts.push(plan.weeks+'-week plan');
    if(plan.createdAt)parts.push('Created '+plan.createdAt);
    else if(plan.startDate)parts.push('Start '+plan.startDate);
    if(plan.adjustedAt)parts.push('Adjusted '+plan.adjustedAt);
    meta.textContent=parts.join(' • ');
  }
  // Body
  var body=document.getElementById('tpPersistBody');
  if(body)body.textContent=plan.text||'(No plan text)';
  // Archived plans section
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  if(archSec)archSec.style.display=archived.length?'block':'none';
  renderArchivedPlans();
  renderJournalHome();
}
function archivePlan(){
  var raw=localStorage.getItem('current_training_plan');
  if(!raw){alert('No active plan to archive.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){return;}
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  plan.archivedAt=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  archived.unshift(plan);
  localStorage.setItem('archived_plans',JSON.stringify(archived));
  localStorage.removeItem('current_training_plan');
  var sec=document.getElementById('tpPersistSection');
  if(sec)sec.style.display='none';
  var archSec=document.getElementById('tpArchiveSection');
  if(archSec)archSec.style.display='block';
  renderArchivedPlans();
  alert('Plan archived.');
}
function deletePlan(){
  if(!confirm('Delete the active training plan? This cannot be undone.'))return;
  localStorage.removeItem('current_training_plan');
  var sec=document.getElementById('tpPersistSection');
  if(sec)sec.style.display='none';
}
function toggleArchivedPlans(){
  var list=document.getElementById('tpArchiveList');
  var arrow=document.getElementById('archiveArrow');
  if(!list)return;
  var open=list.style.display!=='none';
  list.style.display=open?'none':'block';
  if(arrow)arrow.innerHTML=open?'&#x25B6;':'&#x25BC;';
}
function renderArchivedPlans(){
  var list=document.getElementById('tpArchiveList');
  if(!list)return;
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  if(!archived.length){list.innerHTML='<div style="font-size:0.82rem;color:#aaa;padding:8px 4px;">No archived plans.</div>';return;}
  list.innerHTML=archived.map(function(p,i){
    var lbl=(p.type||'Plan')+' • '+(p.weeks?p.weeks+'-wk • ':'')+('Archived '+(p.archivedAt||''));
    return'<div style="border:1px solid #e9ecef;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fafafa;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
      +'<span style="font-size:0.8rem;font-weight:600;color:#555;">'+lbl+'</span>'
      +'<div style="display:flex;gap:6px;">'
      +'<button onclick="restoreArchivedPlan('+i+')" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:1px solid #667eea;background:#667eea;color:white;cursor:pointer;">Restore</button>'
      +'<button onclick="deleteArchivedPlan('+i+')" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:1px solid #e74c3c;background:#e74c3c;color:white;cursor:pointer;">Delete</button>'
      +'</div></div>'
      +'<div style="white-space:pre-wrap;font-size:0.78rem;color:#555;max-height:120px;overflow-y:auto;margin-top:6px;border-top:1px solid #eee;padding-top:6px;">'+(p.text||'').slice(0,300)+(p.text&&p.text.length>300?'…':'')+'</div>'
      +'</div>';
  }).join('');
}
function restoreArchivedPlan(i){
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  var plan=archived[i];if(!plan)return;
  if(localStorage.getItem('current_training_plan')){if(!confirm('Replace your current active plan with this archived one?'))return;}
  archived.splice(i,1);
  localStorage.setItem('archived_plans',JSON.stringify(archived));
  delete plan.archivedAt;
  localStorage.setItem('current_training_plan',JSON.stringify(plan));
  loadCurrentPlan();
}
function deleteArchivedPlan(i){
  if(!confirm('Permanently delete this archived plan?'))return;
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  archived.splice(i,1);
  localStorage.setItem('archived_plans',JSON.stringify(archived));
  renderArchivedPlans();
  var archSec=document.getElementById('tpArchiveSection');
  if(archSec)archSec.style.display=archived.length?'block':'none';
}
function openAdjustPlan(){
  var box=document.getElementById('tpAdjustBox');
  if(box){box.style.display='block';var inp=document.getElementById('tpAdjustInput');if(inp)inp.focus();}
}
function closeAdjustPlan(){
  var box=document.getElementById('tpAdjustBox');
  if(box){box.style.display='none';var inp=document.getElementById('tpAdjustInput');if(inp)inp.value='';}
}
function submitAdjustPlan(){
  var inp=document.getElementById('tpAdjustInput');
  var btn=document.getElementById('tpAdjustBtn');
  var instruction=(inp&&inp.value.trim())||'';
  if(!instruction){alert('Please describe how you want to adjust the plan.');return;}
  var raw=localStorage.getItem('current_training_plan');
  if(!raw){alert('No active training plan found.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){alert('Could not read training plan.');return;}
  var currentPlanText=plan.text||'';
  var prompt='You are a running coach. The athlete has an active training plan and wants to adjust it.\n\nCURRENT PLAN:\n'+currentPlanText+'\n\nATHLETE\'S REQUEST:\n'+instruction+'\n\nPlease rewrite the training plan incorporating the requested adjustments. Keep the same format and structure as the original plan. Return only the updated plan text.';
  if(btn){btn.disabled=true;btn.textContent='⏳ Adjusting...';}
  aiCall(prompt,5000,function(text){
    plan.text=text;
    plan.adjustedAt=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    if(plan.scheduleMode){var rebuilt=buildUploadedTrainingSchedule(plan.text,plan.startDate,plan.weeks);plan.schedule=rebuilt.schedule;plan.scheduleMode=rebuilt.mode;plan.scheduleVersion=3;}
    localStorage.setItem('current_training_plan',JSON.stringify(plan));
    renderActivePlan();
    closeAdjustPlan();
    if(btn){btn.disabled=false;btn.textContent='✨ Adjust Plan';}
  },function(err){
    alert('AI error: '+err);
    if(btn){btn.disabled=false;btn.textContent='✨ Adjust Plan';}
  });
}
function toggleTrainingPlan(){
  const sec=document.getElementById('tpSection');const arr=document.getElementById('tpArrow');
  if(!sec)return;const open=sec.style.display!=='none';
  sec.style.display=open?'none':'block';if(arr)arr.textContent=open?'▶':'▼';
  const start=document.getElementById('tpUploadStartDate');if(start&&!start.value)start.value=dk(today||new Date());
}

// Show/hide custom distance input
document.addEventListener('change',function(e){
  if(e.target&&e.target.id==='tpDistance'){
    const ci=document.getElementById('tpCustomDist');
    if(ci)ci.style.display=e.target.value==='custom'?'inline-block':'none';
  }
});

function copyTrainingPlan(){
  const t=document.getElementById('tpOutputText');
  if(!t)return;
  navigator.clipboard.writeText(t.textContent).then(()=>alert('Plan copied to clipboard!')).catch(()=>{});
}

function tpCalcWeeks(){
  const rd=document.getElementById('tpRaceDate');
  const wk=document.getElementById('tpWeeks');
  if(!rd||!wk||!rd.value)return;
  const today2=new Date();today2.setHours(0,0,0,0);
  const race=new Date(rd.value+'T00:00:00');
  const weeks=Math.round((race-today2)/(7*86400000));
  if(weeks<=0){rd.setCustomValidity('Race date must be in the future');return;}
  rd.setCustomValidity('');
  // Pick closest option or add custom
  const opts=[4,6,8,10,12,16,20];
  const closest=opts.reduce((a,b)=>Math.abs(b-weeks)<Math.abs(a-weeks)?b:a);
  // Add exact option if not present
  let found=false;
  Array.from(wk.options).forEach(o=>{if(parseInt(o.value)===weeks){o.selected=true;found=true;}});
  if(!found){
    const opt=document.createElement('option');
    opt.value=weeks;opt.text=weeks+' weeks';opt.selected=true;
    wk.appendChild(opt);
  }
}
function refreshTrainingPreview(){
  const preview=document.getElementById('tpDataPreview');
  const body=document.getElementById('tpPreviewBody');
  if(!preview||!body)return;
  const historyMonths=parseInt((document.getElementById('tpHistoryMonths')||{}).value||'3');
  const historyDays=historyMonths*30;
  const acts=window._tpGarminActs&&window._tpGarminActs.length?window._tpGarminActs:getActivities();
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-historyDays);
  const recent=window._tpGarminActs&&window._tpGarminActs.length?acts:acts.filter(a=>a.date&&new Date(a.date+'T00:00:00')>=cutoff);
  if(!recent.length){preview.style.display='none';return;}
  const allDates=recent.map(a=>a.date).filter(Boolean).sort();
  const dateFrom=allDates[0]||'?';
  const dateTo=allDates[allDates.length-1]||'?';
  const isRun=a=>{const t=(a.type||'').toLowerCase();return !t||t==='run'||t==='running'||t.includes('run');};
  const runs=recent.filter(isRun);
  const weekBuckets={};
  recent.forEach(a=>{
    if(!a.distance)return;
    const d=new Date(a.date+'T00:00:00');const dow=(d.getDay()+6)%7;
    const mon=new Date(d);mon.setDate(d.getDate()-dow);
    const wk=mon.toISOString().slice(0,10);
    if(!weekBuckets[wk])weekBuckets[wk]={miles:0};
    weekBuckets[wk].miles+=a.distance||0;
  });
  const weekMiles=Object.values(weekBuckets).map(w=>w.miles).sort((a,b)=>b-a);
  const avgWeekly=weekMiles.length?Math.round(weekMiles.reduce((s,v)=>s+v,0)/weekMiles.length*10)/10:0;
  const peakWeekly=weekMiles.length?weekMiles[0].toFixed(1):0;
  const longRuns=recent.filter(a=>a.distance>=6).sort((a,b)=>b.distance-a.distance);
  const longest=longRuns[0]?longRuns[0].distance.toFixed(1):0;
  const src=window._tpGarminActs&&window._tpGarminActs.length?'📂 Garmin CSV upload':`📅 Last ${historyMonths} month${historyMonths!==1?'s':''} of activity log`;
  body.innerHTML=
    `<b>Source:</b> ${src}<br>`+
    `<b>Total activities:</b> ${recent.length} (${runs.length} runs)<br>`+
    `<b>Date range:</b> ${dateFrom} → ${dateTo}<br>`+
    `<b>Avg weekly mileage:</b> ${avgWeekly} mi &nbsp;|&nbsp; <b>Peak week:</b> ${peakWeekly} mi<br>`+
    `<b>Longest run in period:</b> ${longest} mi`;
  preview.style.display='block';
}
function generateTrainingPlan(){
  const key=journalAIKey();
  if(!key){alert('Add your Anthropic API key in ⚙️ Settings first.');return;}
  const distSel=(document.getElementById('tpDistance')||{}).value||'5K';
  const dist=distSel==='custom'?((document.getElementById('tpCustomDist')||{}).value||'5K').trim():distSel;
  const weeks=parseInt((document.getElementById('tpWeeks')||{}).value||'8');
  const daysPerWeek=parseInt((document.getElementById('tpDays')||{}).value||'4');
  const btn=document.getElementById('tpGenBtn');
  if(btn){btn.disabled=true;btn.textContent='⏳ Analyzing...';}

  // ── Build training summary from selected history window ──────────────────
  const historyMonths=parseInt((document.getElementById('tpHistoryMonths')||{}).value||'3');
  const historyDays=historyMonths*30;
  // Use manually uploaded Garmin CSV if provided, else fall back to activities log
  const acts=window._tpGarminActs&&window._tpGarminActs.length?window._tpGarminActs:getActivities();
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-historyDays);
  const recent=window._tpGarminActs&&window._tpGarminActs.length?acts:acts.filter(a=>a.date&&new Date(a.date+'T00:00:00')>=cutoff);

  // Weekly mileage buckets
  const weekBuckets={};
  recent.forEach(a=>{
    if(!a.distance)return;
    const d=new Date(a.date+'T00:00:00');const dow=(d.getDay()+6)%7;
    const mon=new Date(d);mon.setDate(d.getDate()-dow);
    const wk=mon.toISOString().slice(0,10);
    if(!weekBuckets[wk])weekBuckets[wk]={miles:0,runs:0,paces:[],powers:[]};
    weekBuckets[wk].miles+=a.distance||0;
    weekBuckets[wk].runs++;
    const pp=parsePace(a.pace);if(pp>0)weekBuckets[wk].paces.push(pp);
    if(a.power>0)weekBuckets[wk].powers.push(a.power);
  });
  const weekMiles=Object.values(weekBuckets).map(w=>w.miles).sort((a,b)=>b-a);
  const avgWeekly=weekMiles.length?Math.round(weekMiles.reduce((s,v)=>s+v,0)/weekMiles.length*10)/10:0;
  const peakWeekly=weekMiles[0]||0;
  const allPaces=recent.flatMap(a=>{const p=parsePace(a.pace);return p>0?[p]:[];});
  const avgPaceSec=allPaces.length?Math.round(allPaces.reduce((s,v)=>s+v,0)/allPaces.length):0;
  const fmtPace=s=>s?Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60:'unknown';
  const longRuns=recent.filter(a=>a.distance>=6).sort((a,b)=>b.distance-a.distance);
  const longestRecent=longRuns[0]?.distance||0;
  const isRun=a=>{const t=(a.type||'').toLowerCase();return !t||t==='run'||t==='running'||t.includes('run');};const totalRuns=recent.filter(isRun).length;
  const allPowers=recent.filter(a=>a.power>0).map(a=>a.power);
  const avgPower=allPowers.length?Math.round(allPowers.reduce((s,v)=>s+v,0)/allPowers.length):0;
  const cp=getCP();
  const activeWeeks=Object.keys(weekBuckets).length;
  const totalWeeks=Math.round(historyDays/7);const consistencyPct=activeWeeks>0?Math.round((activeWeeks/totalWeeks)*100):0;

  // ── Summarise for prompt ──────────────────────────────────────────────────
  // Read new pre-generation inputs
  const goalTime=((document.getElementById('tpGoalTime')||{}).value||'').trim();
  const level=((document.getElementById('tpLevel')||{}).value||'');
  const focus=((document.getElementById('tpFocus')||{}).value||'Balanced');
  const raceDate=((document.getElementById('tpRaceDate')||{}).value||'');
  const planStartDate=((document.getElementById('tpStartDate')||{}).value||'')||dk(new Date());
  const tpNotes=((document.getElementById('tpNotes')||{}).value||'').trim();
  const tpExtra=((document.getElementById('tpExtraInstructions')||{}).value||'').trim();
  const prefDays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].filter(d=>
    (document.getElementById('tpDay'+d)||{}).checked).join(', ');

  const summary=[
    `Target race distance: ${dist}`,
    `Plan start date: ${planStartDate}`,
    raceDate?`Race date: ${raceDate}`:'',
    `Plan length: ${weeks} weeks`,
    `Training days per week: ${daysPerWeek}`,
    goalTime?`Goal finish time: ${goalTime}`:'',
    level?`Self-reported experience level: ${level}`:'',
    `Training focus: ${focus}`,
    prefDays?`Preferred training days: ${prefDays}`:'',
    tpNotes?`Athlete notes / limitations: ${tpNotes}`:'',
    tpExtra?`Additional instructions from athlete: ${tpExtra}`:'',
    ``,
    window._tpGarminActs&&window._tpGarminActs.length?`Athlete's training data (extracted from uploaded Garmin CSV — ${window._tpGarminActs.length} activities):`:`Athlete's recent training (last ${historyMonths} month${historyMonths!==1?'s':''}):`  ,
    `- Total runs logged: ${totalRuns}`,
    `- Average weekly mileage: ${avgWeekly} miles`,
    `- Peak week mileage: ${peakWeekly.toFixed(1)} miles`,
    `- Longest recent run: ${longestRecent.toFixed(1)} miles`,
    `- Average pace: ${fmtPace(avgPaceSec)} min/mile`,
    avgPower?`- Average running power: ${avgPower}W`:'',
    cp?`- Critical Power (CP): ${cp}W`:'',
    `- Training consistency: ${activeWeeks} of last 13 weeks active (${consistencyPct}%)`,
  ].filter(Boolean).join('\n');

  // Compute full date range across all activities used
  const allDates=recent.map(a=>a.date).filter(Boolean).sort();
  const dateRangeStr=allDates.length>=2?`${allDates[0]} through ${allDates[allDates.length-1]}`:(allDates[0]||'unknown');
  const totalActCount=recent.length;

  const dataSourceNote=window._tpGarminActs&&window._tpGarminActs.length
    ?`IMPORTANT: The training statistics below were computed from ALL ${totalActCount} activities (${dateRangeStr}) uploaded from the athlete's Garmin Connect CSV. The sample log below shows the most recent entries. This is real, verified data. Do NOT disclaim it. Do NOT say you only have a few days or activities. Do NOT question the data source. The statistics are accurate and complete — use them directly.`
    :`The following training statistics were computed from ${totalActCount} logged activities (${dateRangeStr}).`;
  const actListLines=recentActs.slice(0,50).map(a=>{
    const parts=[a.date,(a.type||'Run')];
    if(a.distance)parts.push(a.distance+'mi');
    if(a.pace)parts.push(a.pace+'/mi');
    if(a.duration)parts.push(a.duration);
    if(a.power)parts.push(a.power+'W');
    return parts.join(' | ');
  });
  const actListSection=actListLines.length?`\n\nActivity log sample — ${totalActCount} total activities from ${dateRangeStr} (${actListLines.length} most recent shown):\n`+actListLines.join('\n'):'';
  const prompt=`You are an expert running coach. ${dataSourceNote}\n\nCRITICAL: Do NOT include any statements about how many activities you analyzed, what date range you have access to, or any data limitations. Do NOT mention "only X days" or "only X runs" in a limiting way. Start directly with the fitness assessment.\n\nCreate a detailed ${weeks}-week training plan to prepare this athlete for a ${dist} race. Tailor it to their current fitness, build safely with appropriate progression, and fit ${daysPerWeek} training days per week.\n\n${summary}${actListSection}

Format the plan clearly:
1. Start with a brief assessment of the athlete's current fitness level (2-3 sentences).
2. State the key goals and training principles for this plan.
3. Show the full ${weeks}-week schedule. For each week include:
   - Week number and phase (e.g. Base, Build, Peak, Taper)
   - Total mileage target
   - Each training day with workout type and description (e.g. "Easy 4 miles", "Tempo 6 miles w/ 3mi @ threshold", "Long run 10 miles easy")
4. End with 3-4 key coaching tips specific to this athlete's data.

Be specific with paces (use min/mile), distances, and workout structures. Make the plan realistic and achievable based on their training history.`;

  const outputDiv=document.getElementById('tpOutput');
  const outputText=document.getElementById('tpOutputText');
  const meta=document.getElementById('tpMeta');

  // ── Fetch (non-streaming) ────────────────────────────────────────────────
  const metaStr='Based on '+totalRuns+' runs from '+(window._tpGarminActs&&window._tpGarminActs.length?'uploaded Garmin CSV':historyMonths+' months of data')+' • '+dist+' • '+weeks+' weeks';

  const cancelBtn=document.getElementById('tpCancelBtn');
  const countdown=document.getElementById('tpCountdown');
  if(cancelBtn)cancelBtn.style.display='inline-block';

  window._tpController=new AbortController();
  let _tpSecs=90;
  window._tpCountdownInterval=setInterval(()=>{
    _tpSecs--;
    if(countdown)countdown.style.display='inline';
    if(countdown)countdown.textContent='⏱ '+_tpSecs+'s remaining';
    if(_tpSecs<=0){
      clearInterval(window._tpCountdownInterval);
      window._tpController.abort();
      if(btn){btn.disabled=false;btn.textContent='✨ Generate Plan';}
      if(cancelBtn)cancelBtn.style.display='none';
      if(countdown)countdown.style.display='none';
      if(outputText){outputText.textContent='⏰ Request timed out. Try uploading just the 3-month CSV, or reduce plan length.';outputText.style.whiteSpace='pre-wrap';}
      if(outputDiv)outputDiv.style.display='block';
    }
  },1000);

  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    signal:window._tpController.signal,
    headers:{
      'Content-Type':'application/json',
      'x-api-key':key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({
      model:'claude-haiku-4-5-20251001',
      max_tokens:6000,
      messages:[{role:'user',content:prompt}]
    })
  }).then(r=>r.json()).then(data=>{
    clearInterval(window._tpCountdownInterval);
    if(cancelBtn)cancelBtn.style.display='none';
    if(countdown)countdown.style.display='none';
    if(btn){btn.disabled=false;btn.textContent='✨ Generate Plan';}
    if(data.error){alert('AI error: '+data.error.message);return;}
    const text=((data.content&&data.content[0]&&data.content[0].text)||'').trim();
    if(outputText){outputText.textContent=text;outputText.style.whiteSpace='pre-wrap';}
    if(meta)meta.textContent=metaStr;
    if(outputDiv){outputDiv.style.display='block';setTimeout(()=>outputDiv.scrollIntoView({behavior:'smooth',block:'start'}),100);}
    const planObj={text,dist,weeks,daysPerWeek,goalTime,raceDate,focus,level,meta:metaStr,startDate:planStartDate,createdAt:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
    localStorage.setItem('current_training_plan',JSON.stringify(planObj));
    loadCurrentPlan();
  }).catch(err=>{
    clearInterval(window._tpCountdownInterval);
    if(cancelBtn)cancelBtn.style.display='none';
    if(countdown)countdown.style.display='none';
    if(btn){btn.disabled=false;btn.textContent='✨ Generate Plan';}
    if(err.name!=='AbortError'){if(outputText){outputText.textContent='❌ Error: '+err.message;outputText.style.whiteSpace='pre-wrap';}if(outputDiv)outputDiv.style.display='block';}
  });
}
function trainingPlanDateFromLine(line,fallbackYear){
  var clean=String(line||'').replace(/^[#*\s>-]+/,'').trim(),m,date=null;
  if(!clean||/^week\s*\d+/i.test(clean))return null;
  m=clean.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if(m)date=new Date(+m[1],+m[2]-1,+m[3]);
  if(!date){m=clean.match(/(?:^|\s)(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s|$|[:–—-])/);if(m){var y=+m[3];if(y<100)y+=2000;date=new Date(y,+m[1]-1,+m[2]);}}
  if(!date&&/\b(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)\b/i.test(clean)){
    var months={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
    m=clean.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?/i);
    if(m)date=new Date(+(m[3]||fallbackYear),months[m[1].toLowerCase()],+m[2]);
  }
  return date&&!isNaN(date.getTime())?dk(date):null;
}
function buildUploadedTrainingSchedule(text,startDate,weeks){
  var lines=String(text||'').split(/\r?\n/),headers=[],fallbackYear=new Date((startDate||dk(new Date()))+'T00:00:00').getFullYear();
  lines.forEach(function(line,index){var key=trainingPlanDateFromLine(line,fallbackYear);if(key)headers.push({index:index,key:key});});
  var schedule={};
  headers.forEach(function(header,index){var end=index+1<headers.length?headers[index+1].index:lines.length,section=lines.slice(header.index,end).join('\n').trim();if(section)schedule[header.key]=section;});
  if(Object.keys(schedule).length)return{schedule:schedule,mode:'dated'};
  var base={text:text,startDate:startDate},days=Math.max(7,(weeks||1)*7),start=new Date(startDate+'T00:00:00');
  for(var i=0;i<days;i++){
    var date=new Date(start);date.setDate(start.getDate()+i);
    var section=extractWorkoutFromActivePlan(base,date,false);
    if(section)schedule[dk(date)]=section;
  }
  return{schedule:schedule,mode:'weekly'};
}
function uploadPlanFromFile(evt){
  const file=evt.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const text=(e.target.result||'').trim();
    if(!text){alert('The selected text file is empty.');evt.target.value='';return;}
    const weekMatches=Array.from(text.matchAll(/\bweek\s+(\d{1,2})\b/gi)).map(m=>parseInt(m[1],10)).filter(n=>n>0&&n<=52);
    const weeks=weekMatches.length?Math.max.apply(null,weekMatches):0;
    const startInput=document.getElementById('tpUploadStartDate');
    const planStartDate=(startInput&&startInput.value)||dk(new Date());
    const structured=buildUploadedTrainingSchedule(text,planStartDate,weeks);
    const datedKeys=Object.keys(structured.schedule);
    const effectiveStart=structured.mode==='dated'&&datedKeys.length?datedKeys.sort()[0]:planStartDate;
    const metaStr='Uploaded text plan'+(weeks?' • '+weeks+' weeks':'');
    const planObj={text,dist:'',weeks,raceDate:'',startDate:effectiveStart,schedule:structured.schedule,scheduleMode:structured.mode,scheduleVersion:3,meta:metaStr,createdAt:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
    localStorage.setItem('current_training_plan',JSON.stringify(planObj));
    // Clear stale workout caches so new plan entries load fresh
    const _ck=[];for(let _i=0;_i<localStorage.length;_i++){const _k=localStorage.key(_i);if(_k&&_k.startsWith('workout_cache_'))_ck.push(_k);}
    _ck.forEach(_k=>localStorage.removeItem(_k));
    const outputDiv=document.getElementById('tpOutput');
    const outputText=document.getElementById('tpOutputText');
    const meta=document.getElementById('tpMeta');
    if(outputText){outputText.textContent=text;outputText.style.whiteSpace='pre-wrap';}
    if(meta)meta.textContent=metaStr;
    if(outputDiv){outputDiv.style.display='block';setTimeout(()=>outputDiv.scrollIntoView({behavior:'smooth',block:'start'}),100);}
    const status=document.getElementById('tpUploadStatus');if(status)status.textContent=datedKeys.length+' workout day'+(datedKeys.length===1?'':'s')+' mapped by '+(structured.mode==='dated'?'the dates in the file':'week and weekday')+'. Unlisted dates remain rest days.';
    loadCurrentPlan();
    alert('Training plan loaded from '+file.name+'.');
    evt.target.value='';
  };
  reader.readAsText(file);
}
function toggleAIGenPanel(){
  const panel=document.getElementById('aiGenPanel');
  const arrow=document.getElementById('aiGenArrow');
  if(!panel)return;
  const open=panel.style.display!=='none';
  panel.style.display=open?'none':'block';
  if(arrow)arrow.innerHTML=open?'&#x25B6;':'&#x25BC;';
}
function cancelTrainingPlan(){
  if(window._tpController)window._tpController.abort();
  clearInterval(window._tpCountdownInterval);
  const btn=document.getElementById('tpGenBtn');
  const cancelBtn=document.getElementById('tpCancelBtn');
  const countdown=document.getElementById('tpCountdown');
  if(btn){btn.disabled=false;btn.textContent='✨ Generate Plan';}
  if(cancelBtn)cancelBtn.style.display='none';
  if(countdown)countdown.style.display='none';
}

// ── Migrate old activity dates (M/D/YYYY → YYYY-MM-DD) ──────────────────
function migrateActivityDates(){
  const raw=localStorage.getItem('activities_data');if(!raw)return;
  try{
    const acts=JSON.parse(raw);let changed=false;
    acts.forEach(a=>{
      if(a.date&&/^\d{1,2}\/\d{1,2}\/\d{4}/.test(a.date)){
        const m=a.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if(m){a.date=m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');changed=true;}
      }
    });
    if(changed)localStorage.setItem('activities_data',JSON.stringify(acts));
  }catch(e){}
}



// ── Weekly Goal Targets ───────────────────────────────────────────────────────
function loadGoalSettings(){
  const g=JSON.parse(localStorage.getItem('weekly_goals')||'{}');
  ['Miles','Fin','Bible','Prayer','Exercise','Audible'].forEach(k=>{
    const el=document.getElementById('g'+k);if(el&&g[k])el.value=g[k];
  });
}
function saveGoals(){
  const g={};
  ['Miles','Fin','Bible','Prayer','Exercise','Audible'].forEach(k=>{
    const el=document.getElementById('g'+k);if(el&&el.value)g[k]=parseFloat(el.value)||0;
  });
  localStorage.setItem('weekly_goals',JSON.stringify(g));
  document.getElementById('goalsSettings').style.display='none';
  renderGoals();
}
function toggleGoalsSettings(){
  const s=document.getElementById('goalsSettings');
  if(!s)return;
  const open=s.style.display==='block';
  s.style.display=open?'none':'block';
  if(!open)loadGoalSettings();
}
function renderGoals(){
  const g=JSON.parse(localStorage.getItem('weekly_goals')||'{}');
  const ws=wkStart(weekOff2),we=new Date(ws);we.setDate(ws.getDate()+6);const weekRuns=uniqueRunActivities(ws,we);
  let miles=weekRuns.reduce(function(total,run){return total+(parseFloat(run.distance)||parseFloat(run.miles)||0);},0),audioMin=0,bibleD=0,prayerD=0,exD=0;
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(ws.getDate()+i);
    const dateKey=dk(d),r=localStorage.getItem('planner_'+dateKey),dd=r?JSON.parse(r):{};
    if(hasExerciseOnDate(dateKey,dd))exD++;
    audioMin+=journalAudiobookMinutesForDate(dateKey,dd);
    if(dd.spBibleAudio==='green')bibleD++;
    if(dd.spAIPrayer==='green')prayerD++;
  }
  const actuals=[
    {key:'Miles',label:'Miles',actual:parseFloat(miles.toFixed(1)),unit:'mi',fmt:v=>v.toFixed(1)},
    {key:'Bible',label:'Bible',actual:bibleD,unit:'/7',fmt:v=>v+'/7'},
    {key:'Prayer',label:'Prayer',actual:prayerD,unit:'/7',fmt:v=>v+'/7'},
    {key:'Exercise',label:'Running',actual:exD,unit:'/7',fmt:v=>v+'/7'},
    {key:'Audible',label:'Audiobook',actual:Math.round(audioMin),unit:'min',fmt:v=>fmtMins(v)},
  ];
  const wrap=document.getElementById('goalBars');if(!wrap)return;
  const hasAnyGoal=actuals.some(a=>g[a.key]>0);
  if(!hasAnyGoal){wrap.innerHTML='<div style="font-size:0.78rem;color:#aaa;text-align:center;padding:6px 0;">Tap ⚙️ Set Goals to add weekly targets.</div>';return;}
  wrap.innerHTML=actuals.filter(a=>g[a.key]>0).map(a=>{
    const target=g[a.key];const pct=Math.min(100,Math.round((a.actual/target)*100));
    const reached=pct>=100;
    return`<div class="goal-row ${reached?'goal-reached':'goal-progress'}">
      <div class="goal-label"><span style="margin-right:.35em;">${a.label}</span><span>${a.fmt(a.actual)} / ${a.key==='Bible'||a.key==='Prayer'||a.key==='Exercise'?target+'/7':a.fmt(target)} ${reached?'✅':pct+'%'}</span></div>
      <div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%;background:${reached?'#27ae60':'#667eea'};"></div></div>
    </div>`;
  }).join('');
}
// ── Auto-fill Weekly Wins ─────────────────────────────────────────────────────
function autoFillWins(){
  const ws=wkStart(revOff2);
  const we=new Date(ws);we.setDate(ws.getDate()+6);
  const runs=uniqueRunActivities(ws,we);let miles=runs.reduce(function(total,run){return total+(parseFloat(run.distance)||0);},0),runTime=runs.reduce(function(total,run){return total+parseTimedMins(run.duration);},0),bibleD=0,prayerD=0,audioMin=0,steps=0,logged=0;
  let bpReadings=[];
  for(let i=0;i<7;i++){
    const d=new Date(ws);d.setDate(ws.getDate()+i);
    const r=localStorage.getItem('planner_'+dk(d));if(!r)continue;
    logged++;const dd=JSON.parse(r);
    steps+=parseFloat(dd.exSteps)||0;
    audioMin+=journalAudiobookMinutesForDate(dk(d),dd);
    if(dd.spBibleAudio==='green')bibleD++;
    if(dd.spAIPrayer==='green')prayerD++;
    const bp=parseBP(dd.wBPVal);if(bp.sys)bpReadings.push(bp);
  }
  const fmtMins=m=>m>=60?Math.floor(m/60)+'h '+(m%60?m%60+'m':''):m+'m';
  const lines=[];
  const wLabel=ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+we.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  lines.push('Week of '+wLabel+' ('+logged+'/7 days logged)');
  lines.push('');
  lines.push('🏃 FITNESS');
  if(miles>0)lines.push('  • '+miles.toFixed(1)+' miles'+(runTime>0?' in '+fmtMins(runTime):''));
  if(steps>0)lines.push('  • '+Math.round(steps).toLocaleString()+' total steps');
  lines.push('  • Runs: '+runs.length);
  lines.push('');
  lines.push('📖 SPIRITUALITY');
  lines.push('  • Bible: '+bibleD+'/7 days');
  lines.push('  • Prayer: '+prayerD+'/7 days');
  lines.push('');
  lines.push('📈 GROWTH');
  if(audioMin>0)lines.push('  • Audiobook: '+fmtMins(audioMin));
  if(bpReadings.length>0){
    const avgSys=Math.round(bpReadings.reduce((s,b)=>s+b.sys,0)/bpReadings.length);
    const avgDia=Math.round(bpReadings.reduce((s,b)=>s+b.dia,0)/bpReadings.length);
    lines.push('');lines.push('❤️ WELLNESS');
    lines.push('  • Avg BP: '+avgSys+'/'+avgDia+' mmHg ('+bpReadings.length+' readings)');
  }
  const el=document.getElementById('revWins');
  if(el){el.value=lines.join('\n');el.dispatchEvent(new Event('input'));}
}
// ── Persistent Training Plan ─────────────────────────────────────────────────
/* Tab Section Notes */
var _currentNoteTab='daily';
function saveTabNote(){
  var ta=document.getElementById('tabNoteTA');
  if(ta)localStorage.setItem('tabNote_'+_currentNoteTab,ta.value);
  updateTabNoteStatus();
}
function loadTabNote(tab){
  var ta=document.getElementById('tabNoteTA');
  if(!ta)return;
  var v=localStorage.getItem('tabNote_'+tab);
  ta.value=v!=null?v:'';
  ta.placeholder=tab.charAt(0).toUpperCase()+tab.slice(1)+' notes...';
  updateTabNoteStatus();
}
function updateTabNoteStatus(){
  var ta=document.getElementById('tabNoteTA'),status=document.getElementById('tabNotesStatus'),bar=document.getElementById('tabNotesBar');
  var hasNote=!!(ta&&ta.value.trim());
  if(status)status.textContent=hasNote?'Notes saved':'No notes';
  if(bar)bar.classList.toggle('has-notes',hasNote);
  refreshJournalNavStatus();
}
function loadAllTabNotes(){
  loadTabNote(_currentNoteTab);
}

/* ===== Journal experience module: home, preferences, navigation, reliability ===== */
