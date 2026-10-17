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
var compareMode=false;
var compareSelected=new Set();
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
function handleActivityScreenshotFile(event){
  var file=(event.target.files||[])[0];
  event.target.value='';
  if(!file)return;
  var key=journalAIKey();
  if(!key){alert('Please enter your AI key in Settings first.');return;}
  var okTypes=['image/png','image/jpeg','image/webp','image/gif'];
  if(!file.type||okTypes.indexOf(file.type)===-1){
    alert('Please choose a PNG, JPEG, WEBP, or GIF screenshot.');return;
  }
  var statusEl=document.getElementById('actScreenshotStatus');
  if(statusEl){statusEl.style.color='#666';statusEl.textContent='\u23F3 Reading image...';}
  var reader=new FileReader();
  reader.onload=function(){
    var dataUrl=String(reader.result||'');
    var comma=dataUrl.indexOf(',');
    var base64=comma!==-1?dataUrl.slice(comma+1):'';
    if(!base64){
      if(statusEl){statusEl.style.color='#e74c3c';statusEl.textContent='Could not read that image.';}
      return;
    }
    analyzeActivityScreenshot(base64, file.type, statusEl);
  };
  reader.onerror=function(){
    if(statusEl){statusEl.style.color='#e74c3c';statusEl.textContent='Could not read that image.';}
  };
  reader.readAsDataURL(file);
}

function analyzeActivityScreenshot(base64, mediaType, statusEl){
  var key=journalAIKey();
  if(statusEl){statusEl.style.color='#666';statusEl.textContent='\u23F3 Analyzing screenshot...';}
  var prompt='This is a screenshot related to a workout/run from an app like Strava, Garmin, Apple Watch, or Nike Run Club.\n'
    +'It may be an overall summary card, OR a per-mile/per-km SPLITS table (columns like Mi/Km, Pace, Elev, HR).\n'
    +'Respond with plain text only, no markdown, in exactly this structure:\n'
    +'Line 1: one pipe-delimited summary line in this exact format:\n'
    +'TYPE|TITLE|DATE|DISTANCE|DURATION|PACE|HR|CADENCE|CALORIES|ELEVGAIN\n'
    +'Then, ONLY if the screenshot is a splits table, one additional line per row using this format:\n'
    +'SPLIT|<mile number as printed, e.g. 1 or 0.1>|<pace MM:SS>|<elevation change, signed feet or 0>|<HR bpm or blank>\n'
    +'Summary line field rules \u2014 use ONLY a value that is PRINTED directly on the screenshot. Never calculate, total, average, or otherwise derive a summary value yourself (a separate process computes totals from the SPLIT rows when needed) and never guess a date. If a field is not printed as its own value on the screenshot, return "" for it exactly:\n'
    +'TYPE: one of Run, Ride, Walk, Swim, Strength, Other (best guess from icons/labels; default Run if unclear)\n'
    +'TITLE: short activity name/title if printed, else ""\n'
    +'DATE: YYYY-MM-DD only if an actual date is printed on the screenshot itself, else ""\n'
    +'DISTANCE: number only, in MILES (convert from km by multiplying by 0.621371, round to 2 decimals), only if printed as its own overall total, else ""\n'
    +'DURATION: total moving/elapsed time as MM:SS or H:MM:SS, only if printed as its own overall total, else ""\n'
    +'PACE: overall average pace as MM:SS per mile (convert from per-km pace by dividing by 0.621371), only if printed as its own overall total, else ""\n'
    +'HR: average heart rate in bpm, number only, only if printed as its own overall total, else ""\n'
    +'CADENCE: average cadence in steps per minute, number only, else ""\n'
    +'CALORIES: number only, else ""\n'
    +'ELEVGAIN: elevation gain in FEET (convert from meters by multiplying by 3.28084, round to whole number), only if printed as its own overall total, else ""\n'
    +'SPLIT row rules: include one SPLIT line per row of the table, in the order shown, using the exact mile/km label as printed (e.g. "1", "0.1"). Omit the SPLIT lines entirely if this is not a splits table.';
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2000,messages:[{role:'user',content:[
      {type:'image',source:{type:'base64',media_type:mediaType,data:base64}},
      {type:'text',text:prompt}
    ]}]})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error){
      if(statusEl){statusEl.style.color='#e74c3c';statusEl.textContent='AI error: '+(data.error.message||'request failed');}
      return;
    }
    var text=(data.content&&data.content[0]&&data.content[0].text)||'';
    var lines=text.split('\n').map(function(l){return l.trim();}).filter(function(l){return l;});
    var summaryLine=lines.filter(function(l){return l.indexOf('|')!==-1&&l.slice(0,6)!=='SPLIT|';})[0];
    if(!summaryLine){
      if(statusEl){statusEl.style.color='#e74c3c';statusEl.textContent='Could not read stats from that screenshot.';}
      return;
    }
    var parts=summaryLine.split('|').map(function(p){return p.trim();});
    while(parts.length<10)parts.push('');
    var splitLines=lines.filter(function(l){return l.slice(0,6)==='SPLIT|';});
    var splits=splitLines.map(function(l){
      var sp=l.split('|').map(function(p){return p.trim();});
      return {mile:sp[1]||'',pace:sp[2]||'',elev:sp[3]||'',hr:sp[4]||''};
    });
    fillActivityFormFromScan(parts, statusEl, splits);
  }).catch(function(err){
    if(statusEl){statusEl.style.color='#e74c3c';statusEl.textContent='Could not analyze screenshot: '+err.message;}
  });
}

function fillActivityFormFromScan(parts, statusEl, splits){
  var f=document.getElementById('addActivityForm');
  if(f&&f.style.display==='none'){toggleAddActivity();}
  var notesEl=document.getElementById('actNotes');
  var addedText='';
  if(splits&&splits.length){
    var MI_W=5, PACE_W=7, ELEV_W=6, HR_W=5;
    var pad=function(s,w,left){s=String(s==null?'':s);return left?(s+Array(Math.max(0,w-s.length+1)).join(' ')):(Array(Math.max(0,w-s.length+1)).join(' ')+s);};
    var headerRow=pad('Mi',MI_W,true)+pad('Pace',PACE_W,true)+pad('Elev',ELEV_W,false)+pad('HR',HR_W,false);
    var noteLines=splits.map(function(s){
      var elevNum=parseFloat(s.elev);
      var elevDisplay=isNaN(elevNum)?(s.elev||''):((elevNum>0?'+':'')+elevNum);
      return pad(s.mile,MI_W,true)+pad(s.pace,PACE_W,true)+pad(elevDisplay,ELEV_W,false)+pad(s.hr,HR_W,false);
    });
    addedText='Mile splits:\n'+headerRow+'\n'+noteLines.join('\n');
  } else {
    var type=parts[0], title=parts[1], date=parts[2], distance=parts[3], duration=parts[4], pace=parts[5], hr=parts[6], cadence=parts[7], calories=parts[8], elevGain=parts[9];
    var bits=[];
    if(type)bits.push(type);
    if(title)bits.push(title);
    if(date)bits.push(date);
    if(distance)bits.push(distance+' mi');
    if(duration)bits.push(duration);
    if(pace)bits.push(pace+'/mi');
    if(hr)bits.push('HR '+hr);
    if(cadence)bits.push('cadence '+cadence);
    if(calories)bits.push(calories+' cal');
    if(elevGain)bits.push('+'+elevGain+' ft');
    if(bits.length)addedText='Scanned screenshot: '+bits.join(', ');
  }
  if(addedText&&notesEl){
    var existing=notesEl.value.trim();
    notesEl.value=existing?existing+'\n\n'+addedText:addedText;
  }
  if(statusEl){
    if(addedText){
      statusEl.style.color='#166534';
      statusEl.textContent=(splits&&splits.length)?('\u2713 '+splits.length+' mile splits added to notes \u2014 nothing else was changed.'):'\u2713 Screenshot info added to notes \u2014 nothing else was changed.';
      if(typeof v26Toast==='function')v26Toast('Screenshot info added to notes');
    } else {
      statusEl.style.color='#e74c3c';
      statusEl.textContent='Could not read any usable info from that screenshot.';
    }
  }
}

function formatActivityNotesHtml(notes){
  notes=String(notes||'');
  var marker='Mile splits:';
  var idx=notes.indexOf(marker);
  if(idx===-1)return escHtml(notes);
  var before=notes.slice(0,idx).replace(/\n+$/,'');
  var splitsBlock=notes.slice(idx);
  var beforeHtml=before?escHtml(before)+'<br><br>':'';
  return beforeHtml+'<pre style="font-family:ui-monospace,SFMono-Regular,Consolas,\'Liberation Mono\',Menlo,monospace;font-size:0.76rem;white-space:pre;overflow-x:auto;margin:0;">'+escHtml(splitsBlock)+'</pre>';
}

function clearActForm(){
  ['actDate','actType','actTitle','actDistance','actDuration','actPace','actPower','actHR','actCadence','actCalories','actElevGain','actTemp','actHumidity','actAQI','actExecScore','actRouteUrl','actNotes','actInjuryReport'].forEach(id=>{
    const e=document.getElementById(id);if(e)e.value='';
  });
  document.getElementById('actSource').value='manual';
  document.getElementById('actType').value='Run';
  handleActTypeChange();
}

// ── Automatic calorie estimate ──────────────────────────────────────────────
// Estimates calories burned from distance/duration/power (and elevation, for
// running/walking grade) using standard ACSM metabolic equations and a
// power-based cycling formula, so Calories can be left blank and filled in
// without typing it by hand. Needs a one-time body weight (stored locally,
// never sent anywhere) to convert METs into kcal; falls back to 160 lbs if
// that hasn't been set. This is an estimate, not a medical-grade measurement.
function parseDurationSecLoose(s){
  s=(s||'').trim();if(!s)return 0;
  var m=s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);if(m)return(+m[1])*3600+(+m[2])*60+(+m[3]);
  m=s.match(/^(\d+):(\d{1,2})$/);if(m)return(+m[1])*60+(+m[2]);
  m=s.match(/^(\d+(?:\.\d+)?)\s*(?:min|minutes?|m)$/i);if(m)return Math.round(parseFloat(m[1])*60);
  var n=parseFloat(s);return(isNaN(n)||n<=0)?0:Math.round(n*60);
}
function getActWeightKg(){
  var lbs=parseFloat(localStorage.getItem('act_weight_lbs'))||160;
  return lbs*0.453592;
}
function estimateCalories(a){
  var durSec=parseDurationSecLoose(a.duration);
  var hours=durSec/3600;
  if(!hours)return 0;
  var type=a.type||'Run';
  if(type==='Rest Day')return 0;
  var weightKg=getActWeightKg();
  var distMi=parseFloat(a.distance)||0;
  var speedMph=distMi>0?distMi/hours:0;
  var met=5;
  if(type==='Run'||type==='Walk'){
    var speedMmin=speedMph*26.8224;
    var distM=distMi*1609.34,elevM=(parseFloat(a.elevGain)||0)*0.3048;
    var grade=distM>0?elevM/distM:0;
    if(speedMmin>0){
      var vo2=type==='Run'?(0.2*speedMmin+0.9*speedMmin*grade+3.5):(0.1*speedMmin+1.8*speedMmin*grade+3.5);
      met=vo2/3.5;
    }else{
      met=type==='Run'?8:3.5;
    }
  }else if(type==='Ride'){
    var power=parseFloat(a.power)||0;
    if(power>0){
      // ~3.6 kcal of metabolic cost per watt-hour of mechanical output (~24% gross cycling efficiency)
      return Math.round(power*hours*3.6);
    }
    met=speedMph>0?(speedMph<10?4:speedMph<14?6:speedMph<16?8:speedMph<20?10:12):8;
  }else if(type==='Swim'){
    met=7;
  }else if(type==='Strength'){
    met=5;
  }
  return Math.max(0,Math.round(met*weightKg*hours));
}
function updateActCaloriesPlaceholder(){
  var calEl=document.getElementById('actCalories');if(!calEl)return;
  var typeNow=document.getElementById('actType').value;
  if(typeNow==='Rest Day'){calEl.placeholder='0';return;}
  var est=estimateCalories({
    type:typeNow,
    distance:parseFloat(document.getElementById('actDistance').value)||0,
    duration:(document.getElementById('actDuration').value||'').trim(),
    power:parseFloat(document.getElementById('actPower').value)||0,
    elevGain:parseFloat(document.getElementById('actElevGain').value)||0
  });
  calEl.placeholder=est>0?('~'+est+' (auto)'):'0';
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
  updateActCaloriesPlaceholder();
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
    calories:(function(){
      var raw=(document.getElementById('actCalories').value||'').trim();
      if(raw!=='')return parseFloat(raw)||0;
      var typeNow=document.getElementById('actType').value;
      return estimateCalories({
        type:typeNow,
        distance:parseFloat(document.getElementById('actDistance').value)||0,
        duration:(document.getElementById('actDuration').value||'').trim(),
        power:parseFloat(document.getElementById('actPower').value)||0,
        elevGain:parseFloat(document.getElementById('actElevGain').value)||0
      });
    })(),
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
function actSourceLabel(s){
  var map={manual:'Manual',garmin:'Garmin',stryd:'Stryd',strava:'Strava',gear2:'Gear Tracker II',screenshot:'Screenshot'};
  s=(s||'manual').toLowerCase();
  return map[s]||(s.charAt(0).toUpperCase()+s.slice(1));
}
function cycleActSource(id){
  var acts=getActivities();
  var act=acts.find(function(a){return a.id===id;});
  if(!act)return;
  var sources=['manual','garmin','stryd','strava','gear2'];
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
  updateActCaloriesPlaceholder();
  f.style.display='block';
  setTimeout(function(){f.scrollIntoView({behavior:'smooth',block:'start'});},50);
}
function deleteActivity(id){
  if(!confirm('Delete this activity?'))return;
  saveActivities(getActivities().filter(a=>a.id!==id));
  compareSelected.delete(id);
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
      const isStrava=headers.some(h=>/^Activity ID$/i.test(h.trim()))||headers.some(h=>/Moving Time/i.test(h));
      const isGarmin=!isStrava&&headers.some(h=>/Activity Type/i.test(h));
      const isStryd=!isStrava&&(headers.some(h=>/Avg Power.*W/i.test(h))||headers.some(h=>/distance.*m/i.test(h)));
      const source=hint||(isStrava?'strava':isGarmin?'garmin':isStryd?'stryd':'manual');
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
  }else if(source==='strava'){
    // Strava's bulk-export "activities.csv" reports distance/elevation in
    // meters and times in seconds, and repeats several column names in a
    // later per-type block — g()'s first-match-wins search picks up the
    // earlier, top-level summary columns rather than those duplicates.
    const rawDate=g('Activity Date')||'';
    const isoMatch=rawDate.match(/^\d{4}-\d{2}-\d{2}/);
    if(isoMatch)date=isoMatch[0];
    else{const dt=new Date(rawDate);date=rawDate&&!isNaN(dt.getTime())?(dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')):parseActivityDate(rawDate);}
    title=g('Activity Name')||'Strava Activity';
    const rawType=(g('Activity Type')||'Run').toLowerCase();
    const stravaTypeMap={'run':'Run','trail run':'Run','virtual run':'Run','treadmill':'Run','ride':'Ride','virtual ride':'Ride','mountain bike ride':'Ride','gravel ride':'Ride','e-bike ride':'Ride','ebike ride':'Ride','handcycle':'Ride','velomobile':'Ride','walk':'Walk','hike':'Walk','swim':'Swim','weight training':'Strength','workout':'Strength','yoga':'Strength','crossfit':'Strength'};
    type=stravaTypeMap[rawType]||'Other';
    const distM=parseFloat(g('Distance'))||0;
    distance=distM>0?Math.round((distM/1609.34)*100)/100:0;
    const movingSecs=parseFloat(g('Moving Time'))||parseFloat(g('Elapsed Time'))||0;
    duration=movingSecs>0?(function(){const h=Math.floor(movingSecs/3600),m=Math.floor((movingSecs%3600)/60),s=Math.round(movingSecs%60);return(h?h+':':'')+(h?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');})():'';
    if(distance>0&&movingSecs>0){const paceSecs=movingSecs/distance;const pm=Math.floor(paceSecs/60),ps=Math.round(paceSecs%60);pace=pm+':'+(ps<10?'0':'')+ps;}
    power=parseFloat(g('Average Watts'))||0;
    heartRate=parseFloat(g('Average Heart Rate'))||0;
    cadence=parseFloat(g('Average Cadence'))||0;
    calories=parseFloat((g('Calories')||'').replace(/,/g,''))||0;
    const elevM=parseFloat(g('Elevation Gain'))||0;
    elevGain=elevM>0?Math.round(elevM*3.28084):0;
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
function printActivities(){
  const acts=getActivities();
  if(!acts.length){alert('No activities to print.');return;}
  const cp=getCP();
  const filterType=(document.getElementById('actFilterType')||{}).value||'';
  const rawSrc=(document.getElementById('actFilterSource')||{}).value;
  const filterSource=(rawSrc===undefined||rawSrc===''||rawSrc==='all')?'all':rawSrc.toLowerCase();
  const search=((document.getElementById('actSearch')||{}).value||'').toLowerCase();
  const dateFrom=(document.getElementById('actDateFrom')||{}).value||'';
  const dateTo=(document.getElementById('actDateTo')||{}).value||'';

  var filtered=acts.filter(function(a){
    if(filterType){var at=(a.type||'').toLowerCase();var ft=filterType.toLowerCase();var runTypes=['run','running','trail run','trail running','treadmill','treadmill running','track running','road running','virtual run'];var isRunFilter=ft==='run';var actIsRun=runTypes.some(function(r){return at===r||at.includes('run');});if(isRunFilter?!actIsRun:at!==ft)return false;}
    if(filterSource!=='all'){var actSrc=(a.source||'manual').toLowerCase();if(actSrc!==filterSource)return false;}
    if(search&&!((a.title||'').toLowerCase().includes(search)||(a.date||'').includes(search)||(a.type||'').toLowerCase().includes(search)))return false;
    if(dateFrom&&a.date&&a.date<dateFrom)return false;
    if(dateTo&&a.date&&a.date>dateTo)return false;
    return true;
  });
  if(!filtered.length){alert('No activities match your current filters.');return;}

  // Chronological order reads best for an AI building a training plan from history
  var chronological=filtered.slice().sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});

  var totalMiles=0;
  chronological.forEach(function(a){totalMiles+=parseFloat(a.distance)||0;});
  var firstDate=chronological[0].date||'',lastDate=chronological[chronological.length-1].date||'';
  var weekSpan=1;
  if(firstDate&&lastDate){
    var d1=new Date(firstDate+'T00:00:00'),d2=new Date(lastDate+'T00:00:00');
    weekSpan=Math.max(1,Math.round((d2-d1)/(7*86400000))+1);
  }

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function fmtDate(ds){
    if(!ds)return'';
    var d=new Date(ds+'T00:00:00');
    return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  }
  function perfParts(a){
    var perf=[];
    if(a.distance)perf.push(a.distance+' mi');
    if(a.duration)perf.push(fmtDuration(a.duration));
    if(a.pace)perf.push(a.pace+'/mi pace');
    if(a.power){var pz=powerZone(a.power,cp);perf.push(a.power+'W'+(pz?' ('+pz.z+')':''));}
    if(a.heartRate){var hz=hrZone(a.heartRate);perf.push(a.heartRate+' bpm'+(hz?' ('+hz.z+')':''));}
    if(a.cadence)perf.push(a.cadence+' spm');
    if(a.calories)perf.push(a.calories+' cal');
    if(a.elevGain)perf.push(a.elevGain+' ft gain'+(a.distance?' ('+Math.round(a.elevGain/a.distance)+' ft/mi)':''));
    return perf;
  }
  function condParts(a){
    var cond=[];
    if(a.temp)cond.push(a.temp+'°F');
    if(a.humidity)cond.push(a.humidity+'% humidity');
    if(a.aqi)cond.push('AQI '+a.aqi);
    if(a.temp&&a.pace){
      var hh=heatHumidityImpact(a.temp,a.humidity,parsePace(a.pace));
      if(hh&&hh.pctSlower>=0.5)cond.push('est. heat/humidity impact +'+hh.pctSlower.toFixed(1)+'% ('+Math.round(hh.secSlower)+'s/mi)');
    }
    return cond;
  }

  var summaryLine1='Range: '+(firstDate?fmtDate(firstDate):'—')+' to '+(lastDate?fmtDate(lastDate):'—')+' ('+weekSpan+' week'+(weekSpan!==1?'s':'')+')';
  var summaryLine2='Activities: '+chronological.length+' | Total distance: '+totalMiles.toFixed(1)+' mi | Avg/week: '+(totalMiles/weekSpan).toFixed(1)+' mi';

  var textLines=['TRAINING LOG EXPORT','Generated: '+new Date().toLocaleString(),summaryLine1,summaryLine2,''];
  chronological.forEach(function(a){
    textLines.push(fmtDate(a.date)+' — '+(a.title||'Activity')+' ('+(a.type||'')+')');
    var perf=perfParts(a);
    if(perf.length)textLines.push('  '+perf.join(' | '));
    var cond=condParts(a);
    if(cond.length)textLines.push('  Conditions: '+cond.join(' | '));
    if(a.notes)textLines.push('  Notes: '+String(a.notes).replace(/\n+/g,' '));
    textLines.push('');
  });
  var plainText=textLines.join('\n');

  var rowsHtml=chronological.map(function(a){
    var perf=perfParts(a),cond=condParts(a);
    return '<div class="pa-entry">'
      +'<div class="pa-head">'+esc(fmtDate(a.date))+' &mdash; '+esc(a.title||'Activity')+' <span class="pa-type">('+esc(a.type||'')+')</span></div>'
      +(perf.length?'<div class="pa-line">'+esc(perf.join('  |  '))+'</div>':'')
      +(cond.length?'<div class="pa-line pa-cond">'+esc(cond.join('  |  '))+'</div>':'')
      +(a.notes?'<div class="pa-notes">'+esc(a.notes)+'</div>':'')
      +'</div>';
  }).join('');

  var w=window.open('','_blank');
  if(!w){alert('Please allow pop-ups to open the print view.');return;}
  w.document.open();
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Training Log Export</title><style>'
    +'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;max-width:780px;margin:24px auto;padding:0 16px;color:#222;line-height:1.5;}'
    +'h1{font-size:1.3rem;margin-bottom:2px;}'
    +'.pa-meta{color:#555;font-size:0.9rem;margin-bottom:18px;}'
    +'.pa-toolbar{margin-bottom:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}'
    +'.pa-toolbar button{font-size:0.85rem;padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-weight:600;}'
    +'.pa-print-btn{background:#e67e22;color:#fff;}'
    +'.pa-copy-btn{background:#27ae60;color:#fff;}'
    +'.pa-entry{border-bottom:1px solid #eee;padding:10px 0;break-inside:avoid;page-break-inside:avoid;}'
    +'.pa-head{font-weight:700;font-size:0.95rem;}'
    +'.pa-type{font-weight:400;color:#888;}'
    +'.pa-line{font-size:0.85rem;color:#333;margin-top:3px;}'
    +'.pa-cond{color:#777;}'
    +'.pa-notes{font-size:0.83rem;color:#555;margin-top:4px;white-space:pre-wrap;}'
    +'#pa-copied{color:#27ae60;font-size:0.85rem;font-weight:600;}'
    +'@media print{.pa-toolbar{display:none;}}'
    +'</style></head><body>'
    +'<div class="pa-toolbar">'
    +'<button class="pa-print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>'
    +'<button class="pa-copy-btn" id="pa-copy-btn">📋 Copy as Text (for AI)</button>'
    +'<span id="pa-copied" style="display:none;">Copied!</span>'
    +'</div>'
    +'<h1>Training Log Export</h1>'
    +'<div class="pa-meta">'+esc(summaryLine1)+'<br>'+esc(summaryLine2)+'</div>'
    +rowsHtml
    +'<textarea id="pa-plaintext" style="position:absolute;left:-9999px;top:-9999px;">'+esc(plainText)+'</textarea>'
    +'<script>'
    +'document.getElementById("pa-copy-btn").addEventListener("click",function(){'
    +'var ta=document.getElementById("pa-plaintext");'
    +'function fallback(){ta.style.position="fixed";ta.style.left="0";ta.style.top="0";ta.focus();ta.select();try{document.execCommand("copy");}catch(e){}ta.style.position="absolute";ta.style.left="-9999px";ta.style.top="-9999px";}'
    +'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).catch(fallback);}else{fallback();}'
    +'var msg=document.getElementById("pa-copied");msg.style.display="inline";setTimeout(function(){msg.style.display="none";},1800);'
    +'});'
    +'<\/script>'
    +'</body></html>');
  w.document.close();
}

// ── Activities: enhancements ────────────────────────────────────────────────
let actChartMode='miles';
function setChartMode(m){actChartMode=m;document.getElementById('chartMiBtn').classList.toggle('active',m==='miles');document.getElementById('chartPwBtn').classList.toggle('active',m==='power');drawActChart(getActivities());}
function saveCPAndRender(){const v=document.getElementById('cpInput').value;localStorage.setItem('cp_value',v||'');renderActivities();}
function getCP(){return parseFloat(localStorage.getItem('cp_value'))||0;}
function powerZone(p,cp){if(!cp||!p)return null;const r=p/cp;if(r<0.55)return{z:'Z1',cls:'z1'};if(r<0.75)return{z:'Z2',cls:'z2'};if(r<0.90)return{z:'Z3',cls:'z3'};if(r<1.05)return{z:'Z4',cls:'z4'};return{z:'Z5',cls:'z5'};}
function saveMaxHRAndRender(){const v=document.getElementById('hrMaxInput').value;localStorage.setItem('max_hr_value',v||'');renderActivities();}
function getMaxHR(){const stored=parseFloat(localStorage.getItem('max_hr_value'));return stored>0?stored:174;}

// ── Mileage goals (weekly / monthly / yearly) ───────────────────────────────
// The weekly miles goal is shared between the Activities "This Week" card
// (act_goal_week_mi) and the Weekly tab's "Weekly Goals" panel
// (weekly_goals.Miles), which used to be two independent numbers that could
// silently drift apart. syncWeeklyMilesGoal() keeps both storage keys and
// both on-screen inputs in lockstep whenever either one is edited.
function syncWeeklyMilesGoal(val){
  var num=parseFloat(val)||0;
  var g=JSON.parse(localStorage.getItem('weekly_goals')||'{}');
  if(num>0)g.Miles=num;else delete g.Miles;
  localStorage.setItem('weekly_goals',JSON.stringify(g));
  var actEl=document.getElementById('actGoal_week');if(actEl)actEl.value=num>0?String(num):'';
  var gEl=document.getElementById('gMiles');if(gEl)gEl.value=num>0?String(num):'';
  if(typeof renderGoals==='function')renderGoals();
}
// One-time-per-load reconciliation for anyone who already had two different
// values saved before these were linked: the Activities card's value wins
// (matching what's shown there), so both places agree immediately.
function reconcileWeeklyMilesGoal(){
  var actVal=localStorage.getItem('act_goal_week_mi');
  var g=JSON.parse(localStorage.getItem('weekly_goals')||'{}');
  if(actVal){
    if((parseFloat(g.Miles)||0)!==(parseFloat(actVal)||0))syncWeeklyMilesGoal(actVal);
  }else if(g.Miles){
    localStorage.setItem('act_goal_week_mi',String(g.Miles));
  }
}
window.addEventListener('load',function(){reconcileWeeklyMilesGoal();});
function getActGoal(period){
  if(period==='week'){
    var ownVal=localStorage.getItem('act_goal_week_mi');
    if(ownVal)return parseFloat(ownVal)||0;
    var g=JSON.parse(localStorage.getItem('weekly_goals')||'{}');
    return parseFloat(g.Miles)||0;
  }
  return parseFloat(localStorage.getItem('act_goal_'+period+'_mi'))||0;
}
function saveActGoalAndRender(period){
  var el=document.getElementById('actGoal_'+period);
  if(!el)return;
  localStorage.setItem('act_goal_'+period+'_mi',el.value||'');
  if(period==='week')syncWeeklyMilesGoal(el.value);
  renderMileageSummary();
}
function renderGoalBar(period,actualMi){
  var barWrap=document.getElementById('actGoalBarWrap_'+period);
  var bar=document.getElementById('actGoalBar_'+period);
  var lbl=document.getElementById('actGoalLbl_'+period);
  if(!barWrap||!bar||!lbl)return;
  var goal=getActGoal(period);
  if(!goal){barWrap.style.display='none';return;}
  barWrap.style.display='block';
  var pct=Math.min(100,Math.round((actualMi/goal)*100));
  bar.style.width=pct+'%';
  bar.style.background=pct>=100?'#27ae60':'#e67e22';
  lbl.textContent=actualMi.toFixed(1)+' / '+goal+' mi ('+pct+'%)';
}
// Garmin's standard 5-zone heart-rate model, as a percentage of max heart rate:
// Z1 50-60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 90-100%+. Below 50% is untracked (resting/warm-up).
// Karvonen (heart-rate-reserve) training zones from the user's updated calculator results:
// Z1 113-125 (50-60%, recovery), Z2 125-138 (60-70%, aerobic base), Z3 138-151 (70-80%,
// aerobic threshold), Z4 151-163 (80-90%, anaerobic), Z5 163-176+ (90-100%, max). Stored as
// fixed bpm boundaries rather than a percent-of-max-HR calculation, since Karvonen needs
// resting HR too -- these boundaries were generated directly from that formula already, so
// recomputing here would need a separate resting-HR input this app doesn't currently collect.
function hrZone(hr){if(!hr)return null;if(hr<113)return null;if(hr<125)return{z:'Z1',cls:'z1'};if(hr<138)return{z:'Z2',cls:'z2'};if(hr<151)return{z:'Z3',cls:'z3'};if(hr<163)return{z:'Z4',cls:'z4'};return{z:'Z5',cls:'z5'};}

// ── Cardiovascular Drift: Heart Rate Elevation in the Heat (Activities tab) ──
// Uses the same zone boundaries as hrZone() above, so this chart always reflects
// whatever heart-rate training zones are set there.
var CVD_ZONES=[
  {z:'Z1',cls:'z1',color:'#5dade2',lo:113,hi:124},
  {z:'Z2',cls:'z2',color:'#58d68d',lo:125,hi:137},
  {z:'Z3',cls:'z3',color:'#f4d03f',lo:138,hi:150},
  {z:'Z4',cls:'z4',color:'#e67e22',lo:151,hi:162},
  {z:'Z5',cls:'z5',color:'#e74c3c',lo:163,hi:220}
];
var CVD_BUCKETS=[
  {label:'<60\u00b0F',lo:-Infinity,hi:59},
  {label:'60-69\u00b0F',lo:60,hi:69},
  {label:'70-79\u00b0F',lo:70,hi:79},
  {label:'80-89\u00b0F',lo:80,hi:89},
  {label:'90\u00b0F+',lo:90,hi:Infinity}
];
function toggleCardioDrift(){
  var sec=document.getElementById('cvdSection');var arr=document.getElementById('cvdArrow');
  if(!sec)return;
  var opening=sec.style.display==='none';
  sec.style.display=opening?'block':'none';
  if(arr)arr.innerHTML=opening?'&#x25BC;':'&#x25B6;';
  var toggle=sec.previousElementSibling;
  if(toggle)toggle.setAttribute('aria-expanded',opening?'true':'false');
  if(opening)renderCardioDriftChart();
}
function renderCardioDriftChart(){
  var canvas=document.getElementById('cvdChart');
  var legendEl=document.getElementById('cvdZoneLegend');
  var insightEl=document.getElementById('cvdInsight');
  if(!canvas)return;
  if(legendEl){
    legendEl.innerHTML=CVD_ZONES.map(function(zi){
      return '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:'+zi.color+';display:inline-block;"></span>'+zi.z+' \u2022 '+zi.lo+(zi.hi<220?('\u2013'+zi.hi):'+')+' bpm</span>';
    }).join('');
  }
  if(typeof Chart==='undefined'){
    canvas.parentNode.innerHTML='<div style="color:#aaa;text-align:center;padding:16px 0;">Chart library did not load. Check your connection and refresh.</div>';
    return;
  }
  var acts=getActivities().filter(function(a){
    var t=parseFloat(a.temp);
    return a.type!=='Rest Day'&&(parseFloat(a.heartRate)||0)>0&&a.temp!==''&&a.temp!=null&&!isNaN(t);
  });
  if(acts.length<3){
    if(charts.cvdChart){charts.cvdChart.destroy();delete charts.cvdChart;}
    if(insightEl)insightEl.textContent='Log at least 3 activities with temperature and heart rate to see your heat drift here.';
    return;
  }
  var buckets=CVD_BUCKETS.map(function(b){return{label:b.label,lo:b.lo,hi:b.hi,sum:0,count:0};});
  acts.forEach(function(a){
    var t=parseFloat(a.temp),hr=parseFloat(a.heartRate);
    var b=buckets.filter(function(bk){return t>=bk.lo&&t<=bk.hi;})[0];
    if(b){b.sum+=hr;b.count++;}
  });
  var used=buckets.filter(function(b){return b.count>0;});
  var labels=used.map(function(b){return b.label;});
  var avgHRs=used.map(function(b){return Math.round(b.sum/b.count);});
  var counts=used.map(function(b){return b.count;});
  var barColors=avgHRs.map(function(hr){
    var zi=hrZone(hr);
    if(!zi)return'#b0b8c1';
    var match=CVD_ZONES.filter(function(z){return z.z===zi.z;})[0];
    return match?match.color:'#b0b8c1';
  });
  var allHRs=acts.map(function(a){return parseFloat(a.heartRate);}).concat(avgHRs);
  var yMin=Math.max(60,Math.floor((Math.min.apply(null,allHRs)-10)/5)*5);
  var yMax=Math.ceil((Math.max.apply(null,allHRs)+10)/5)*5;
  if(charts.cvdChart){charts.cvdChart.destroy();delete charts.cvdChart;}
  var cvdZoneBandPlugin={
    id:'cvdZoneBands',
    beforeDatasetsDraw:function(chart){
      var yScale=chart.scales.y,area=chart.chartArea,ctx=chart.ctx;
      if(!yScale||!area)return;
      ctx.save();
      CVD_ZONES.forEach(function(zi){
        if(zi.hi<yMin||zi.lo>yMax)return;
        var top=yScale.getPixelForValue(Math.min(zi.hi,yMax));
        var bottom=yScale.getPixelForValue(Math.max(zi.lo,yMin));
        if(bottom<=top)return;
        ctx.fillStyle=zi.color+'22';
        ctx.fillRect(area.left,top,area.right-area.left,bottom-top);
      });
      ctx.restore();
    }
  };
  charts.cvdChart=new Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:labels,datasets:[{label:'Avg Heart Rate',data:avgHRs,backgroundColor:barColors,borderRadius:5,borderWidth:0,barPercentage:0.6}]},
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:function(ctx){
          var i=ctx.dataIndex,z=hrZone(avgHRs[i]);
          return 'Avg HR: '+avgHRs[i]+' bpm'+(z?' ('+z.z+')':'')+' \u2022 '+counts[i]+' activit'+(counts[i]===1?'y':'ies');
        }}}
      },
      scales:{
        x:{grid:{display:false},title:{display:true,text:'Temperature',color:'#7d4800',font:{size:11,weight:'600'}}},
        y:{min:yMin,max:yMax,title:{display:true,text:'Avg Heart Rate (bpm)',color:'#7d4800',font:{size:11,weight:'600'}},ticks:{stepSize:10},grid:{color:'rgba(148,163,184,.18)'}}
      }
    },
    plugins:[cvdZoneBandPlugin]
  });
  var hotActs=acts.filter(function(a){return parseFloat(a.temp)>=80&&a.date;}).sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
  if(insightEl){
    if(hotActs.length>=4){
      var half=Math.floor(hotActs.length/2);
      var avg=function(list){return list.reduce(function(s,a){return s+parseFloat(a.heartRate);},0)/list.length;};
      var earlyAvg=avg(hotActs.slice(0,half)),recentAvg=avg(hotActs.slice(half));
      var delta=Math.round(recentAvg-earlyAvg);
      insightEl.innerHTML='In 80\u00b0F+ conditions, your average heart rate is now <strong>'
        +(delta===0?'about the same as':(Math.abs(delta)+' bpm '+(delta>0?'higher':'lower')+' than'))
        +'</strong> your earliest logged hot-weather activities ('+Math.round(earlyAvg)+' \u2192 '+Math.round(recentAvg)+' bpm across '+hotActs.length+' runs).'
        +(delta>2?' That upward drift can be a sign of heat strain \u2014 consider more fluids, slower paces in the heat, or extra recovery.':delta<-2?' That\u2019s a good sign of heat acclimation.':'');
    } else {
      insightEl.textContent='Log a few more 80\u00b0F+ activities with heart rate to see your heat-drift trend over time.';
    }
  }
}

// ── Heat Acclimation: Garmin Enduro/Fenix-style heat-load estimate (Activities tab) ──
// Approximates the Heat Acclimation status found on higher-end Garmin watches using
// logged temperature + duration instead of a core-temperature sensor. Each qualifying
// activity adds a heat stimulus scaled by how hot it was and how long it lasted, and
// that accumulated load decays a few percent every day without further heat exposure
// -- roughly matching published heat-acclimation decay research (about three-quarters
// of the adaptation is lost after a week fully away from heat).
var HA_DECAY_PER_DAY=0.96;   // ~4% of accumulated heat load lost per day without a heat session
var HA_TEMP_FLOOR=70;        // \u00b0F at/below this, an activity contributes no heat stimulus
var HA_TEMP_CEIL=95;         // \u00b0F at/above this, an activity contributes full heat stimulus
var HA_SATURATION=6;         // heat-load units at which the percentage is roughly 95% saturated
function haHeatFactor(tempF){
  if(tempF<=HA_TEMP_FLOOR)return 0;
  if(tempF>=HA_TEMP_CEIL)return 1;
  return (tempF-HA_TEMP_FLOOR)/(HA_TEMP_CEIL-HA_TEMP_FLOOR);
}
function haStatusInfo(pct){
  if(pct<20)return{label:'Not Acclimated',color:'#dc2626'};
  if(pct<45)return{label:'Minimally Acclimated',color:'#f97316'};
  if(pct<70)return{label:'Acclimatizing',color:'#ca8a04'};
  if(pct<90)return{label:'Mostly Acclimated',color:'#65a30d'};
  return{label:'Well Acclimated',color:'#16a34a'};
}
function haLoadToPercent(load){
  return Math.max(0,Math.min(100,Math.round(100*(1-Math.exp(-load/HA_SATURATION)))));
}
// Builds a day-by-day heat-load series ending on throughDateStr (YYYY-MM-DD), going
// back daysBack days, by applying HA_DECAY_PER_DAY each day and adding that day's
// qualifying activity stimulus (temperature-scaled, duration-weighted, capped per
// session so one very long hot session can't saturate the whole estimate at once).
function haComputeLoadSeries(acts,throughDateStr,daysBack){
  var byDate={};
  acts.forEach(function(a){
    var t=parseFloat(a.temp);
    if(a.type==='Rest Day'||!a.date||isNaN(t))return;
    var hrs=parseMins(a.duration)/60;
    if(!(hrs>0))return;
    var stim=haHeatFactor(t)*Math.min(hrs,3);
    if(stim<=0)return;
    byDate[a.date]=(byDate[a.date]||0)+stim;
  });
  var through=new Date(throughDateStr+'T00:00:00');
  var series=[],load=0;
  for(var i=daysBack-1;i>=0;i--){
    var d=new Date(through);d.setDate(through.getDate()-i);
    var key=dk(d);
    load=load*HA_DECAY_PER_DAY+(byDate[key]||0);
    series.push({date:key,load:load});
  }
  return series;
}
// Finds the earliest date among logged (non-Rest-Day) activities, so the
// shared heat-load series below can start from real history instead of an
// arbitrary fixed window -- keeping the chart's current-day percentage and
// the per-activity percentages shown on each run in sync with each other.
function haEarliestRelevantDate(acts){
  var todayKey=dk(new Date());
  var earliest=null;
  acts.forEach(function(a){
    if(a.type==='Rest Day'||!a.date||a.date>todayKey)return;
    if(!earliest||a.date<earliest)earliest=a.date;
  });
  return earliest;
}
// Builds ONE continuous heat-load series from the earliest relevant activity
// date through today (capped at 730 days for performance) plus a
// date-string -> percent lookup map, so every consumer (the aggregate chart
// and each individual activity card) reads the same underlying estimate.
function haBuildPercentMap(acts){
  var todayKey=dk(new Date());
  var earliest=haEarliestRelevantDate(acts);
  var startKey=earliest||todayKey;
  var daysBack=Math.min(730,Math.max(1,Math.round((new Date(todayKey+'T00:00:00')-new Date(startKey+'T00:00:00'))/86400000)+1));
  var series=haComputeLoadSeries(acts,todayKey,daysBack);
  var byDate={};
  series.forEach(function(s){byDate[s.date]=haLoadToPercent(s.load);});
  return {series:series,byDate:byDate,currentPct:series.length?haLoadToPercent(series[series.length-1].load):0};
}
function toggleHeatAcclimation(){
  var sec=document.getElementById('haSection');var arr=document.getElementById('haArrow');
  if(!sec)return;
  var opening=sec.style.display==='none';
  sec.style.display=opening?'block':'none';
  if(arr)arr.innerHTML=opening?'&#x25BC;':'&#x25B6;';
  var toggle=sec.previousElementSibling;
  if(toggle)toggle.setAttribute('aria-expanded',opening?'true':'false');
  if(opening)renderHeatAcclimationChart();
}
function renderHeatAcclimationChart(){
  var canvas=document.getElementById('haChart');
  var percentEl=document.getElementById('haPercent');
  var statusEl=document.getElementById('haStatusLabel');
  var markerEl=document.getElementById('haMarker');
  var trackEl=document.getElementById('haTrack');
  var summaryEl=document.getElementById('haSummary');
  if(!canvas)return;
  if(typeof Chart==='undefined'){
    canvas.parentNode.innerHTML='<div style="color:#aaa;text-align:center;padding:16px 0;">Chart library did not load. Check your connection and refresh.</div>';
    return;
  }
  var acts=getActivities();
  var hasAnyHeatSource=acts.some(function(a){var t=parseFloat(a.temp);return a.type!=='Rest Day'&&!isNaN(t)&&a.date&&parseMins(a.duration)>0;});
  if(!hasAnyHeatSource){
    if(percentEl)percentEl.textContent='\u2014';
    if(statusEl){statusEl.textContent='No data yet';statusEl.style.color='#7d4800';}
    if(markerEl)markerEl.style.left='0%';
    if(trackEl)trackEl.setAttribute('aria-valuenow','0');
    if(summaryEl)summaryEl.textContent='Log a few activities with temperature and duration to see your heat acclimation estimate.';
    if(charts.haChart){charts.haChart.destroy();delete charts.haChart;}
    return;
  }
  var todayKey=dk(new Date());
  var haMap=haBuildPercentMap(acts);
  var series=haMap.series.slice(Math.max(0,haMap.series.length-30));
  var pct=haMap.currentPct;
  var status=haStatusInfo(pct);
  if(percentEl){percentEl.textContent=pct+'%';percentEl.style.color=status.color;}
  if(statusEl){statusEl.textContent=status.label;statusEl.style.color=status.color;}
  if(markerEl)markerEl.style.left=pct+'%';
  if(trackEl)trackEl.setAttribute('aria-valuenow',String(pct));
  var heatActs=acts.filter(function(a){var t=parseFloat(a.temp);return a.type!=='Rest Day'&&!isNaN(t)&&t>HA_TEMP_FLOOR&&a.date&&parseMins(a.duration)>0;}).sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  var lastHeatDate=heatActs.length?heatActs[0].date:null;
  var daysSince=lastHeatDate?Math.round((new Date(todayKey+'T00:00:00')-new Date(lastHeatDate+'T00:00:00'))/86400000):null;
  var cutoff14=new Date(todayKey+'T00:00:00');cutoff14.setDate(cutoff14.getDate()-14);
  var sessions14=heatActs.filter(function(a){return new Date(a.date+'T00:00:00')>=cutoff14;}).length;
  if(summaryEl){
    var bits=[];
    bits.push(sessions14+' session'+(sessions14===1?'':'s')+' over '+HA_TEMP_FLOOR+'\u00b0F in the last 14 days');
    bits.push(daysSince==null?'no heat sessions logged yet':('last one '+(daysSince===0?'today':daysSince===1?'1 day ago':daysSince+' days ago')));
    summaryEl.innerHTML=bits.join(' \u2022 ');
  }
  if(charts.haChart){charts.haChart.destroy();delete charts.haChart;}
  var labels=series.map(function(s){var d=new Date(s.date+'T00:00:00');return (d.getMonth()+1)+'/'+d.getDate();});
  var pcts=series.map(function(s){return haLoadToPercent(s.load);});
  charts.haChart=new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:labels,datasets:[{label:'Heat Acclimation %',data:pcts,borderColor:'#e67e22',backgroundColor:'#e67e2222',tension:0.3,fill:true,pointRadius:0,borderWidth:2}]},
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return 'Heat Acclimation: '+ctx.parsed.y+'%';}}}},
      scales:{
        x:{grid:{display:false},ticks:{maxTicksLimit:6,color:'#888',font:{size:10}}},
        y:{min:0,max:100,ticks:{stepSize:25,color:'#888',font:{size:10}},grid:{color:'rgba(148,163,184,.18)'}}
      }
    }
  });
}

// National Weather Service "feels-like" Heat Index estimate (Rothfusz regression),
// a well-known public meteorological formula for how hot it feels when high
// temperature and high humidity combine -- humid air makes it harder for sweat to
// evaporate and cool the body. Below 80°F the formula isn't meaningful, so this
// just returns the dry-bulb temperature unchanged.
function nwsHeatIndex(tempF,rhPct){
  var T=tempF,R=rhPct;
  if(!(T>=80)||isNaN(R))return T;
  var HI=-42.379+2.04901523*T+10.14333127*R-0.22475541*T*R-0.00683783*T*T-0.05481717*R*R+0.00122874*T*T*R+0.00085282*T*R*R-0.00000199*T*T*R*R;
  if(R<13&&T<=112)HI-=((13-R)/4)*Math.sqrt((17-Math.abs(T-95))/17);
  if(R>85&&T<=87)HI+=((R-85)/10)*((87-T)/5);
  return HI;
}
// Rough, disclosed estimate of how much heat + humidity likely slowed a given run,
// combining the NWS feels-like Heat Index above with a simple rule of thumb (~0.4%
// pace slowdown per °F the feels-like temperature sits above a comfortable 60°F
// baseline). This is a disclosed heuristic for a quick estimate, not a precise
// physiological model -- effort, fitness, and heat acclimation all affect pace too.
var HEAT_IMPACT_BASELINE_F=60;
var HEAT_IMPACT_PCT_PER_F=0.4;
function heatHumidityImpact(tempF,humidityPct,paceSec){
  var t=parseFloat(tempF),h=parseFloat(humidityPct);
  if(isNaN(t)||!(paceSec>0))return null;
  var feelsLike=nwsHeatIndex(t,isNaN(h)?30:h);
  var over=feelsLike-HEAT_IMPACT_BASELINE_F;
  if(over<=0)return{feelsLike:feelsLike,pctSlower:0,secSlower:0};
  var pctSlower=over*HEAT_IMPACT_PCT_PER_F;
  var secSlower=paceSec*(pctSlower/100);
  return{feelsLike:feelsLike,pctSlower:pctSlower,secSlower:secSlower};
}
var HUM_BUCKETS=[
  {label:'<40%',lo:-Infinity,hi:39},
  {label:'40-54%',lo:40,hi:54},
  {label:'55-69%',lo:55,hi:69},
  {label:'70-84%',lo:70,hi:84},
  {label:'85%+',lo:85,hi:Infinity}
];
function toggleHumidityImpact(){
  var sec=document.getElementById('humSection');var arr=document.getElementById('humArrow');
  if(!sec)return;
  var opening=sec.style.display==='none';
  sec.style.display=opening?'block':'none';
  if(arr)arr.innerHTML=opening?'&#x25BC;':'&#x25B6;';
  var toggle=sec.previousElementSibling;
  if(toggle)toggle.setAttribute('aria-expanded',opening?'true':'false');
  if(opening)renderHumidityImpactChart();
}
function renderHumidityImpactChart(){
  var canvas=document.getElementById('humChart');
  var insightEl=document.getElementById('humInsight');
  if(!canvas)return;
  if(typeof Chart==='undefined'){
    canvas.parentNode.innerHTML='<div style="color:#aaa;text-align:center;padding:16px 0;">Chart library did not load. Check your connection and refresh.</div>';
    return;
  }
  var acts=getActivities().filter(function(a){
    var h=parseFloat(a.humidity);
    return a.type!=='Rest Day'&&!isNaN(h)&&parsePace(a.pace)>0;
  });
  if(acts.length<3){
    if(charts.humChart){charts.humChart.destroy();delete charts.humChart;}
    if(insightEl)insightEl.textContent='Log at least 3 runs with humidity and pace to see how humidity correlates with your pace.';
    return;
  }
  var buckets=HUM_BUCKETS.map(function(b){return{label:b.label,lo:b.lo,hi:b.hi,sum:0,count:0};});
  acts.forEach(function(a){
    var h=parseFloat(a.humidity),p=parsePace(a.pace);
    var b=buckets.filter(function(bk){return h>=bk.lo&&h<=bk.hi;})[0];
    if(b){b.sum+=p;b.count++;}
  });
  var used=buckets.filter(function(b){return b.count>0;});
  var labels=used.map(function(b){return b.label;});
  var avgPaces=used.map(function(b){return b.sum/b.count;});
  var counts=used.map(function(b){return b.count;});
  var fmtPaceSec=function(sec){var m=Math.floor(sec/60),s=Math.round(sec%60);return m+':'+(s<10?'0':'')+s;};
  var allPaces=acts.map(function(a){return parsePace(a.pace);}).concat(avgPaces);
  var yMin=Math.max(0,Math.floor((Math.min.apply(null,allPaces)-20)/10)*10);
  var yMax=Math.ceil((Math.max.apply(null,allPaces)+20)/10)*10;
  if(charts.humChart){charts.humChart.destroy();delete charts.humChart;}
  charts.humChart=new Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:labels,datasets:[{label:'Avg Pace',data:avgPaces,backgroundColor:'#2980b9',borderRadius:5,borderWidth:0,barPercentage:0.6}]},
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:function(ctx){
          var i=ctx.dataIndex;
          return 'Avg Pace: '+fmtPaceSec(avgPaces[i])+'/mi • '+counts[i]+' run'+(counts[i]===1?'':'s');
        }}}
      },
      scales:{
        x:{grid:{display:false},title:{display:true,text:'Humidity',color:'#7d4800',font:{size:11,weight:'600'}}},
        y:{min:yMin,max:yMax,title:{display:true,text:'Avg Pace (min/mi)',color:'#7d4800',font:{size:11,weight:'600'}},ticks:{stepSize:30,callback:function(v){return fmtPaceSec(v);}},grid:{color:'rgba(148,163,184,.18)'}}
      }
    }
  });
  if(insightEl){
    if(used.length>=2){
      var driest=used[0],humid=used[used.length-1];
      var driestAvg=driest.sum/driest.count,humidAvg=humid.sum/humid.count;
      var diffSec=humidAvg-driestAvg;
      if(Math.abs(diffSec)>=3){
        insightEl.innerHTML='Runs at <strong>'+humid.label+'</strong> humidity averaged <strong>'+fmtPaceSec(humidAvg)+'</strong>/mi vs. <strong>'+fmtPaceSec(driestAvg)+'</strong>/mi at <strong>'+driest.label+'</strong> humidity &mdash; about <strong>'+Math.round(Math.abs(diffSec))+'s</strong> '+(diffSec>0?'slower':'faster')+' per mile in the most humid conditions logged so far.';
      }else{
        insightEl.textContent='No clear pace difference across humidity levels yet in your logged runs.';
      }
    }else{
      insightEl.textContent='Log runs across a wider range of humidity to see a comparison here.';
    }
  }
}

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

// ── Training load ratio (ACWR) ──────────────────────────────────────────────
// Acute:chronic workload ratio: last 7 days' average daily mileage versus the
// last 28 days' average. 0.8-1.3 is generally considered a sustainable build;
// ramping past ~1.5 is linked in sports-science research to higher injury
// risk (the classic "too much too soon" pattern). This is an estimate from
// logged mileage only, not a medical assessment.
function calcACWR(acts){
  var wrap=document.getElementById('actACWRCard');
  if(!wrap)return;
  var now=new Date();
  var todayEp=epDay(localDateStr(now));
  var daily={};
  acts.forEach(function(a){
    if(!a.date||typeof a.date!=='string')return;
    var mi=parseFloat(a.distance)||0;if(!mi)return;
    daily[a.date]=(daily[a.date]||0)+mi;
  });
  function milesInLastNDays(n){
    var total=0;
    for(var i=0;i<n;i++){
      var d=new Date((todayEp-i)*86400000);
      var key=d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
      total+=daily[key]||0;
    }
    return total;
  }
  var acuteAvg=milesInLastNDays(7)/7;
  var chronicAvg=milesInLastNDays(28)/28;
  if(chronicAvg<=0){wrap.style.display='none';return;}
  var ratio=acuteAvg/chronicAvg;
  var color,label;
  if(ratio<0.8){color='#5dade2';label='Low load (easing back)';}
  else if(ratio<=1.3){color='#27ae60';label='Sweet spot';}
  else if(ratio<=1.5){color='#f39c12';label='Elevated — watch for soreness';}
  else{color='#e74c3c';label='High — classic "too much too soon" range';}
  wrap.style.display='block';
  wrap.innerHTML='<div style="font-size:0.78rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;">⚡ Training Load Ratio (ACWR)</div>'
    +'<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">'
    +'<span style="font-size:1.4rem;font-weight:800;color:'+color+';">'+ratio.toFixed(2)+'</span>'
    +'<span style="font-size:0.82rem;font-weight:700;color:'+color+';">'+label+'</span>'
    +'</div>'
    +'<div style="font-size:0.72rem;color:#999;margin-top:4px;">Last 7 days’ daily average ('+acuteAvg.toFixed(1)+' mi/day) vs. last 28 days’ ('+chronicAvg.toFixed(1)+' mi/day). An estimate from your logged mileage — not a medical assessment.</div>';
}

// ── Race time predictor ─────────────────────────────────────────────────────
// Projects 5K/10K/Half/Marathon times from the fastest logged pace using the
// Riegel formula (T2 = T1 * (D2/D1)^1.06). An estimate, not a guarantee.
// Ultra distances (50K/50mi/100K/100mi) reuse the same Riegel extrapolation
// for a flat-course baseline ("Riegel" number), then layer on two separate,
// better-sourced corrections for an "Adjusted" number instead of a single
// flat elevation penalty:
//   1. A distance-tiered fatigue/fueling allowance. Riegel was validated
//      only to roughly marathon distance and has no way to model fatigue,
//      fueling, or sleep deprivation over many hours, so real ultra finish
//      times run slower than a naive extrapolation by a margin that grows
//      with distance. There's no single validated constant for this, but
//      aggregate ultrarunning data gives a reasonable range to anchor on:
//      RunRepeat's analysis of ~15M race results found average pace in
//      races over 50mi running ~14% slower than under-50mi races, and a
//      100K study (Lambert et al. 2004) found real-world fade of ~15% for
//      front-pack finishers up to ~25-40% for mid/back-of-pack finishers
//      over the full distance. The per-distance percentages below are an
//      engineering estimate informed by that range, not a precise formula.
//   2. A terrain cost from running economy research instead of a flat
//      "10 min per 1,000 ft" rule-of-thumb. Minetti et al. (2002, J Appl
//      Physiol) fit a 5th-order polynomial for the energy cost of running
//      at a given gradient, Cr(i) in J/kg/m for grade fraction i, validated
//      for |i| <= 0.45. Cr(i)/Cr(0) gives a grade-adjusted-pace (GAP) cost
//      multiplier that scales non-linearly with steepness -- a 15% grade
//      costs far more than 3x a 5% grade, which a flat per-1,000ft number
//      can't express. Without a real elevation profile, the user's 5,000 ft
//      of climbing is assumed to be spread evenly over the first half of
//      the distance and mirrored on the way down (a reasonable default for
//      an out-and-back or loop course); the resulting average grade is fed
//      through Cr() for the climbing half and its mirror for the descending
//      half, and averaged into one cost multiplier applied to the whole
//      fatigue-adjusted time. This is still a model, not a course-specific
//      prediction -- Minetti's data is from controlled, even-surface
//      conditions, so technical trail footing can cost more than grade
//      alone predicts. Both the Riegel and Adjusted ultra numbers are
//      rough ballparks, flagged as such in the footnote below.
function calcRacePredictor(acts){
  var wrap=document.getElementById('actRacePredictCard');
  if(!wrap)return;
  // Only consider runs from the last 60 days, so the projection reflects
  // current fitness rather than a fast pace from months ago.
  var todayEp=epDay(localDateStr(new Date()));
  var recentActs=acts.filter(function(a){return a.date&&(todayEp-epDay(a.date))<=59&&(todayEp-epDay(a.date))>=0;});
  var best=null,bestPaceSec=0;
  recentActs.forEach(function(a){
    var p=parsePace(a.pace);
    var mi=parseFloat(a.distance)||0;
    if(p>0&&mi>=1&&(!best||p<bestPaceSec)){best=a;bestPaceSec=p;}
  });
  if(!best){wrap.style.display='none';return;}
  var baseDistance=parseFloat(best.distance)||0;
  var baseTimeSec=bestPaceSec*baseDistance;
  if(!baseDistance||!baseTimeSec){wrap.style.display='none';return;}
  var targets=[{label:'5K',mi:3.10686},{label:'10K',mi:6.21371},{label:'Half',mi:13.1094},{label:'Marathon',mi:26.2188}];
  // fadePct: engineering-estimate fatigue/fueling allowance on top of Riegel,
  // growing with distance (see comment block above for sourcing).
  var ultraTargets=[
    {label:'50K',mi:31.0686,fadePct:0.08},
    {label:'50 Mile',mi:50,fadePct:0.15},
    {label:'100K',mi:62.1371,fadePct:0.22},
    {label:'100 Mile',mi:100,fadePct:0.30}
  ];
  var ULTRA_ELEV_FT=5000;
  var ELEV_M=ULTRA_ELEV_FT*0.3048;
  var MI_TO_M=1609.344;
  // Minetti et al. 2002 polynomial: energy cost of running (J/kg/m) at
  // grade fraction i (uphill positive), valid for |i|<=0.45.
  function minettiCr(i){
    return 155.4*Math.pow(i,5)-30.4*Math.pow(i,4)-43.3*Math.pow(i,3)+46.3*Math.pow(i,2)+19.5*i+3.6;
  }
  var CR_FLAT=minettiCr(0);
  function fmtClock(sec){
    sec=Math.round(sec);
    var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return(h>0?h+':':'')+(h>0?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');
  }
  var cards=targets.map(function(t){
    var predictedSec=baseTimeSec*Math.pow(t.mi/baseDistance,1.06);
    return '<div class="act-pr-card"><div class="pr-val">'+fmtClock(predictedSec)+'</div><div class="pr-lbl">'+t.label+'</div></div>';
  }).join('');
  var ultraCards=ultraTargets.map(function(t){
    var predictedSec=baseTimeSec*Math.pow(t.mi/baseDistance,1.06);
    var fadeAdjustedSec=predictedSec*(1+t.fadePct);
    var distM=t.mi*MI_TO_M;
    var avgGrade=Math.min(ELEV_M/(distM/2),0.45);
    var costUp=minettiCr(avgGrade)/CR_FLAT;
    var costDown=minettiCr(-avgGrade)/CR_FLAT;
    var elevFactor=(costUp+costDown)/2;
    var adjustedSec=fadeAdjustedSec*elevFactor;
    return '<div class="act-pr-card"><div class="pr-val">'+fmtClock(predictedSec)+'</div><div class="pr-lbl">'+t.label+'</div><div class="pr-adj">Adjusted: '+fmtClock(adjustedSec)+'</div></div>';
  }).join('');
  wrap.style.display='block';
  wrap.innerHTML='<div style="font-size:0.78rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px;">\u{1F3C1} Estimated Race Times</div>'
    +'<div class="act-pr-grid">'+cards+'</div>'
    +'<div style="font-size:0.7rem;color:#aaa;margin:2px 0 12px;">Projected with the Riegel formula from your fastest logged pace in the last 60 days ('+escHtml(best.pace)+'/mi over '+baseDistance.toFixed(1)+' mi'+(best.date?' on '+escHtml(best.date):'')+'). An estimate, not a guarantee — actual race-day performance depends on training, terrain, and conditions.</div>'
    +'<div style="font-size:0.78rem;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px;">\u{1F3D4}️ Ultra Distances</div>'
    +'<div class="act-pr-grid">'+ultraCards+'</div>'
    +'<div style="font-size:0.7rem;color:#aaa;margin-top:6px;">The top number is the same flat Riegel projection stretched out to ultra distance — Riegel is only validated up to about marathon length, so by itself it tends to run optimistic at 50K and beyond. "Adjusted" layers on two corrections: a distance-based fatigue/fueling allowance (+8% at 50K, +15% at 50mi, +22% at 100K, +30% at 100mi — rough estimates from aggregate ultrarunning race data, not a validated constant), and a terrain cost from the Minetti running-economy equation, applied to this distance’s average grade assuming your 5,000 ft of climbing is spread over half the distance and mirrored on the way down. Both numbers are ballparks, not predictions.</div>';
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
  ['week','month','year'].forEach(function(period){
    var el=document.getElementById('actGoal_'+period);
    if(el&&!el.value){
      var stored=localStorage.getItem('act_goal_'+period+'_mi');
      if(!stored&&period==='week'){var wg=JSON.parse(localStorage.getItem('weekly_goals')||'{}');if(wg.Miles)stored=String(wg.Miles);}
      if(stored)el.value=stored;
    }
  });
  renderGoalBar('week',thisWeek);
  renderGoalBar('month',mtd);
  renderGoalBar('year',ytd);
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

function toggleCompareMode(){
  compareMode=!compareMode;
  if(!compareMode){
    compareSelected.clear();
    var panel=document.getElementById('activityComparePanel');
    if(panel)panel.style.display='none';
  }
  renderActivities();
}
function toggleCompareSelect(id){
  if(compareSelected.has(id)){
    compareSelected.delete(id);
  }else{
    if(compareSelected.size>=4){alert('You can compare up to 4 activities at a time.');return;}
    compareSelected.add(id);
  }
  updateCompareBar();
}
function clearCompareSelection(){
  compareSelected.clear();
  var panel=document.getElementById('activityComparePanel');
  if(panel)panel.style.display='none';
  renderActivities();
}
function updateCompareBar(){
  var bar=document.getElementById('actCompareBar');
  if(!bar)return;
  var n=compareSelected.size;
  if(!compareMode||n===0){bar.style.display='none';return;}
  bar.style.display='flex';
  var cnt=document.getElementById('actCompareCount');
  if(cnt)cnt.textContent=n+(n===1?' selected (pick at least 2)':' selected');
}
function showActivityCompare(){
  var panel=document.getElementById('activityComparePanel');
  if(!panel)return;
  if(compareSelected.size<2){alert('Select at least 2 activities to compare.');return;}
  var chosen=getActivities().filter(function(a){return compareSelected.has(a.id);});
  chosen.sort(function(a,b){return(a.date||'').localeCompare(b.date||'');});
  var typeColor={Run:'#e67e22',Ride:'#8e44ad',Walk:'#27ae60',Swim:'#2980b9',Strength:'#e74c3c',Other:'#95a5a6'};
  var rows=[
    {label:'Date',get:function(a){var d=a.date?new Date(a.date+'T00:00:00'):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):(a.date||'\u2014');}},
    {label:'Type',get:function(a){return a.type||'\u2014';}},
    {label:'Distance (mi)',get:function(a){return parseFloat(a.distance)||0;},fmt:function(v){return v?v.toFixed(2):'\u2014';},best:'max'},
    {label:'Duration',get:function(a){return parseMins(a.duration);},fmt:function(v,a){return a.duration?fmtDuration(a.duration):'\u2014';}},
    {label:'Avg Pace (/mi)',get:function(a){return a.pace?parsePace(a.pace):0;},fmt:function(v,a){return a.pace||'\u2014';},best:'min'},
    {label:'Avg Power (W)',get:function(a){return parseFloat(a.power)||0;},fmt:function(v){return v?v+' W':'\u2014';},best:'max'},
    {label:'Avg HR (bpm)',get:function(a){return parseFloat(a.heartRate)||0;},fmt:function(v){if(!v)return'\u2014';var z=hrZone(v);return v+' bpm'+(z?' ('+z.z+')':'');}},
    {label:'Cadence (spm)',get:function(a){return parseFloat(a.cadence)||0;},fmt:function(v){return v?v+' spm':'\u2014';},best:'max'},
    {label:'Calories',get:function(a){return parseFloat(a.calories)||0;},fmt:function(v){return v?v:'\u2014';},best:'max'},
    {label:'Elev Gain (ft)',get:function(a){return parseFloat(a.elevGain)||0;},fmt:function(v){return v?v+' ft':'\u2014';},best:'max'},
    {label:'Execution Score',get:function(a){return parseFloat(a.execScore)||0;},fmt:function(v){return v?v+'/100':'\u2014';},best:'max'},
    {label:'Source',get:function(a){return a.source||'manual';}}
  ];
  var head='<tr><th style="text-align:left;padding:6px 8px;font-size:0.78rem;color:#888;border-bottom:2px solid #e5e7eb;">Metric</th>'
    +chosen.map(function(a){var tc=typeColor[a.type]||'#95a5a6';return'<th style="text-align:center;padding:6px 8px;font-size:0.78rem;border-bottom:2px solid #e5e7eb;color:'+tc+';">'+escHtml(a.title||a.type||'Activity')+'</th>';}).join('')
    +'</tr>';
  var body=rows.map(function(r){
    var vals=chosen.map(function(a){return r.get(a);});
    var bestVal=null;
    if(r.best){
      var nz=vals.filter(function(v){return typeof v==='number'&&v>0;});
      if(nz.length>1)bestVal=r.best==='max'?Math.max.apply(null,nz):Math.min.apply(null,nz);
    }
    var cells=chosen.map(function(a,i){
      var v=vals[i];
      var disp=r.fmt?r.fmt(v,a):(v||'\u2014');
      var isBest=bestVal!==null&&v===bestVal&&v>0;
      return'<td style="text-align:center;padding:6px 8px;font-size:0.84rem;border-bottom:1px solid #f1f1f1;'+(isBest?'background:#eafaf1;color:#1a7f4e;font-weight:700;':'')+'">'+disp+(isBest?' &#x1F3C6;':'')+'</td>';
    }).join('');
    return'<tr><td style="padding:6px 8px;font-size:0.8rem;color:#555;font-weight:600;border-bottom:1px solid #f1f1f1;white-space:nowrap;">'+r.label+'</td>'+cells+'</tr>';
  }).join('');
  panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
    +'<div style="font-size:0.9rem;font-weight:700;color:#7c3aed;">&#x1F4CA; Comparing '+chosen.length+' Activities</div>'
    +'<button onclick="document.getElementById(\'activityComparePanel\').style.display=\'none\';" style="background:#f0f0f0;color:#555;border:none;border-radius:6px;padding:4px 10px;font-size:0.78rem;cursor:pointer;">&#x2715; Close</button>'
    +'</div>'
    +'<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">'+head+body+'</table></div>'
    +'<div style="font-size:0.7rem;color:#aaa;margin-top:8px;">&#x1F3C6; = best value among the selected activities for that metric.</div>';
  panel.style.display='block';
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderActivities(){
  renderMileageSummary();
  const cpEl=document.getElementById('cpInput');
  if(cpEl&&!cpEl.value){const stored=localStorage.getItem('cp_value');if(stored)cpEl.value=stored;}
  const cp=getCP();
  const hrMaxEl=document.getElementById('hrMaxInput');
  if(hrMaxEl&&!hrMaxEl.value){const stored=localStorage.getItem('max_hr_value');if(stored)hrMaxEl.value=stored;}
  const maxHR=getMaxHR();
  const acts=getActivities();
  const cnt=document.getElementById('actCount');
  if(cnt)cnt.textContent=acts.length?acts.length+' activit'+(acts.length!==1?'ies':'y'):'';
  const el=document.getElementById('activityList');if(!el)return;

  var compBtn=document.getElementById('actCompareBtn');
  if(compBtn){
    compBtn.style.background=compareMode?'#4c1d95':'#7c3aed';
    compBtn.textContent=compareMode?'\u2716 Exit Compare':'\u2696\uFE0F Compare';
  }
  updateCompareBar();

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

  calcStatsBar(filtered);calcStreakAndLoad(acts);calcPRs(acts);calcACWR(acts);calcRacePredictor(acts);

  // Source breakdown
  var gCnt=0,sCnt=0,mCnt=0,stCnt=0,g2Cnt=0;
  acts.forEach(function(a){var src=(a.source||'manual').toLowerCase();if(src==='garmin')gCnt++;else if(src==='stryd')sCnt++;else if(src==='strava')stCnt++;else if(src==='gear2')g2Cnt++;else mCnt++;});
  var cntEl=document.getElementById('actCount');
  if(cntEl&&acts.length){
    cntEl.innerHTML=acts.length+' activit'+(acts.length!==1?'ies':'y')
      +(gCnt?' <span style="background:#00b2e3;color:#fff;border-radius:4px;padding:1px 5px;font-size:0.68rem;font-weight:700;">G:'+gCnt+'</span>':'')
      +(stCnt?' <span style="background:#fc4c02;color:#fff;border-radius:4px;padding:1px 5px;font-size:0.68rem;font-weight:700;">St:'+stCnt+'</span>':'')
      +(sCnt?' <span style="background:#ff6b35;color:#fff;border-radius:4px;padding:1px 5px;font-size:0.68rem;font-weight:700;">S:'+sCnt+'</span>':'')
      +(g2Cnt?' <span style="background:#16a085;color:#fff;border-radius:4px;padding:1px 5px;font-size:0.68rem;font-weight:700;">G2:'+g2Cnt+'</span>':'')
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
  var haPctMap=haBuildPercentMap(acts);
  var sleepCache={};
  // Looks up the Wellness-tab Sleep entry logged for a given calendar date
  // (localStorage key 'planner_<date>'), so each activity card can show
  // what was logged that day without re-parsing the same day twice when
  // several activities share a date (e.g. with "Group by day" on).
  function getSleepInfo(dateKey){
    if(sleepCache.hasOwnProperty(dateKey))return sleepCache[dateKey];
    var info=null;
    try{
      var raw=localStorage.getItem('planner_'+dateKey);
      if(raw){
        var sd=JSON.parse(raw);
        var mins=parseSleepMins(sd.wSleepVal);
        var score=parseFloat(sd.wSleepScore)||0;
        if(mins||score)info={mins:mins,score:score};
      }
    }catch(e){}
    sleepCache[dateKey]=info;
    return info;
  }
  var prevWaterCache={};
  // Looks up the Nutrition-tab Water Intake logged for the calendar day
  // BEFORE a given activity date, since hydration going into a run is what
  // the day-before total reflects, not same-day water logged after the run.
  function getPrevDayWaterOz(dateKey){
    if(prevWaterCache.hasOwnProperty(dateKey))return prevWaterCache[dateKey];
    var oz=null;
    try{
      var prev=new Date(dateKey+'T00:00:00');
      prev.setDate(prev.getDate()-1);
      var raw=localStorage.getItem('planner_'+dk(prev));
      if(raw){
        var pd=JSON.parse(raw);
        var o=parseFloat(pd.waterOz)||(parseFloat(pd.waterCount)*8||0);
        if(o>0)oz=o;
      }
    }catch(e){}
    prevWaterCache[dateKey]=oz;
    return oz;
  }
  var prevNutritionCache={};
  // Looks up total calories logged for the calendar day BEFORE a given
  // activity date -- same day-before reasoning as the hydration chip above
  // (what you ate going into a run, not what you logged afterward). Sums
  // the itemized Nutrition-tab food log for that day, falling back to the
  // manually-entered daily total when there's no itemized log, matching
  // the calorie calculation the app's own Fuel Analysis AI feature already
  // uses (aiNutritionCorrelation, in daily-planner-food-log.js).
  function getPrevDayNutrition(dateKey){
    if(prevNutritionCache.hasOwnProperty(dateKey))return prevNutritionCache[dateKey];
    var result=null;
    try{
      var prev=new Date(dateKey+'T00:00:00');
      prev.setDate(prev.getDate()-1);
      var raw=localStorage.getItem('planner_'+dk(prev));
      if(raw){
        var pd=JSON.parse(raw);
        var log=Array.isArray(pd.foodLog)?pd.foodLog:[];
        var cal=log.reduce(function(sum,x){return sum+(parseFloat(x.cal)||0);},0)||parseFloat(pd.nuCalVal)||0;
        if(cal>0){
          var prot=log.reduce(function(sum,x){return sum+(parseFloat(x.prot)||0);},0)||parseFloat(pd.nuProtVal)||0;
          var carbs=log.reduce(function(sum,x){return sum+(parseFloat(x.carbs)||0);},0)||parseFloat(pd.nuCarbsVal)||0;
          var fat=log.reduce(function(sum,x){return sum+(parseFloat(x.fat)||0);},0)||parseFloat(pd.nuFatVal)||0;
          result={cal:cal};
          if(prot+carbs+fat>0){
            result.protPct=Math.round(prot*4/cal*100);
            result.carbsPct=Math.round(carbs*4/cal*100);
            result.fatPct=Math.round(fat*9/cal*100);
          }
        }
      }
    }catch(e){}
    prevNutritionCache[dateKey]=result;
    return result;
  }

  function buildCard(a,tc,showDate,inGroup){
    // Stats are split into two visually distinct rows -- core performance
    // numbers (pace, power, HR, etc.) on top, and day-level conditions /
    // recovery context (weather, heat acclimation, sleep) below a divider --
    // so the card reads as organized groups instead of one long wrapped line.
    var perfStats=[];
    var condStats=[];
    if(a.distance)perfStats.push('<span class="act-stat">&#x1F4CF; <strong>'+a.distance+'</strong> mi</span>');
    if(a.duration)perfStats.push('<span class="act-stat">&#x23F1; <strong>'+fmtDuration(a.duration)+'</strong></span>');
    if(a.pace)perfStats.push('<span class="act-stat">&#x1F3C3; <strong>'+a.pace+'</strong>/mi</span>');
    if(a.power){var zone=powerZone(a.power,cp);var zb=zone?'<span class="zone-badge '+zone.cls+'">'+zone.z+'</span>':'';perfStats.push('<span class="act-stat">&#x26A1; <strong>'+a.power+'</strong>W'+zb+'</span>');}
    if(a.heartRate){var hzone=hrZone(a.heartRate,maxHR);var hzb=hzone?'<span class="zone-badge '+hzone.cls+'">'+hzone.z+'</span>':'';perfStats.push('<span class="act-stat">&#x2764; <strong>'+a.heartRate+'</strong> bpm'+hzb+'</span>');}
    if(a.cadence)perfStats.push('<span class="act-stat">&#x1F9B5; <strong>'+a.cadence+'</strong> spm</span>');
    if(a.calories)perfStats.push('<span class="act-stat">&#x1F525; <strong>'+a.calories+'</strong> cal</span>');
    if(a.elevGain)perfStats.push('<span class="act-stat">&#x26F0; <strong>'+a.elevGain+'</strong> ft</span>');
    if(a.elevGain&&a.distance){
      var ftPerMi=a.elevGain/a.distance;
      perfStats.push('<span class="act-stat" title="Elevation gain per mile">&#x26F0; <strong>'+Math.round(ftPerMi)+'</strong> ft/mi</span>');
      var gapBaseSec=parsePace(a.pace);
      if(gapBaseSec>0){
        // Rough estimate (~12 sec/mile per 1% average grade) of a flat-
        // equivalent pace -- not Strava's proprietary Grade Adjusted Pace
        // model, and based on whole-activity average grade rather than a
        // real elevation profile, since that's all this app has to work with.
        var avgGradePct=(a.elevGain/(a.distance*5280))*100;
        var gapSec=gapBaseSec+avgGradePct*12;
        var gm=Math.floor(gapSec/60),gs=Math.round(gapSec%60);
        perfStats.push('<span class="act-stat" title="Estimated flat-equivalent pace based on this run’s average grade">&#x2248;GAP <strong>'+gm+':'+(gs<10?'0':'')+gs+'</strong>/mi</span>');
      }
    }
    if(a.temp)condStats.push('<span class="act-stat">&#x1F321;&#xFE0F; <strong>'+a.temp+'</strong>°F</span>');
    if(a.humidity)condStats.push('<span class="act-stat">&#x1F4A7; Humidity <strong>'+a.humidity+'</strong>%</span>');
    if(a.aqi)condStats.push('<span class="act-stat">&#x1F32C;&#xFE0F; AQI <strong>'+a.aqi+'</strong></span>');
    if(a.temp&&a.pace){
      var hhImpact=heatHumidityImpact(a.temp,a.humidity,parsePace(a.pace));
      if(hhImpact&&hhImpact.pctSlower>=0.5){
        condStats.push('<span class="act-stat" title="Estimated pace impact from heat/humidity, feels like '+Math.round(hhImpact.feelsLike)+'°F">&#x1F975; +<strong>'+hhImpact.pctSlower.toFixed(1)+'%</strong> ('+Math.round(hhImpact.secSlower)+'s/mi)</span>');
      }
    }
    if(a.date&&haPctMap.byDate[a.date]!==undefined){
      var haPct=haPctMap.byDate[a.date];var haInfo=haStatusInfo(haPct);
      condStats.push('<span class="act-stat" title="Estimated heat acclimation on this date: '+haInfo.label+'">&#x1F321;&#xFE0F;&#x1F4A7; Heat Accl. <strong style="color:'+haInfo.color+';">'+haPct+'%</strong></span>');
    }
    if(a.date){
      var sleepInfo=getSleepInfo(a.date);
      if(sleepInfo){
        var sParts=[];
        if(sleepInfo.mins)sParts.push('<strong>'+fmtMins(sleepInfo.mins)+'</strong>');
        if(sleepInfo.score){
          var sColor=sleepInfo.score>=85?'#16a34a':sleepInfo.score>=70?'#65a30d':sleepInfo.score>=50?'#f97316':'#dc2626';
          sParts.push('<strong style="color:'+sColor+';">'+Math.round(sleepInfo.score)+'</strong> score');
        }
        condStats.push('<span class="act-stat" title="Sleep logged for this date">&#x1F634; '+sParts.join(' &middot; ')+'</span>');
      }
    }
    if(a.date){
      var prevWaterOz=getPrevDayWaterOz(a.date);
      if(prevWaterOz!=null){
        condStats.push('<span class="act-stat" title="Water intake logged the day before this activity">&#x1F4A7; <strong>'+Math.round(prevWaterOz)+'</strong> oz prev-day</span>');
      }
    }
    if(a.date){
      var prevNutr=getPrevDayNutrition(a.date);
      if(prevNutr!=null){
        var macroPart=prevNutr.protPct!=null?' &middot; P '+prevNutr.protPct+'% &middot; C '+prevNutr.carbsPct+'% &middot; F '+prevNutr.fatPct+'%':'';
        condStats.push('<span class="act-stat" title="Calories and macro split logged the day before this activity">&#x1F37D;&#xFE0F; <strong>'+Math.round(prevNutr.cal)+'</strong> cal'+macroPart+' prev-day</span>');
      }
    }
    if(a.execScore)condStats.push('<span class="act-stat">&#x1F3AF; <strong>'+a.execScore+'</strong>/100</span>');
    var collapsed=actCollapsed.has(a.id);
    var chevron=collapsed?'&#x25B6;':'&#x25BC;';
    var bodyDisplay=collapsed?'none':'block';
    var marginLeft=inGroup?'margin-left:12px;':'';
    var dateHtml=showDate?'<div class="act-date">&#x1F4C5; '+showDate+'</div>':'';
    var journalBtn=!inGroup?'<button class="act-journal-btn" onclick="goToActivityDate(\''+a.date+'\')" title="Jump to Journal">&#x1F4D3;</button>':'';
    var compareBox=compareMode?('<input type="checkbox" onclick="event.stopPropagation();toggleCompareSelect('+a.id+')" '+(compareSelected.has(a.id)?'checked':'')+' style="width:17px;height:17px;cursor:pointer;flex-shrink:0;accent-color:#7c3aed;" title="Select to compare">'):'';
    return '<div class="act-card '+(a.type||'other').toLowerCase()+'" style="border-left-color:'+tc+';'+marginLeft+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;cursor:pointer;" onclick="toggleActCard('+a.id+')">'
      +compareBox
      +'<div style="flex:1;min-width:0;">'
      +'<span class="act-badge '+(a.source||'manual')+'" onclick="event.stopPropagation();cycleActSource('+a.id+')" title="Click to change source" style="cursor:pointer;">'+actSourceLabel(a.source)+'</span>'
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
      +'<div class="act-stats">'+(perfStats.length?'<div class="act-stats-row">'+perfStats.join('')+'</div>':'')+(condStats.length?'<div class="act-stats-row act-stats-conditions">'+condStats.join('')+'</div>':'')+'</div>'
      +(a.routeUrl?'<a href="'+escHtml(a.routeUrl)+'" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#075985;border-radius:7px;padding:6px 10px;font-size:.76rem;font-weight:800;text-decoration:none;">&#x1F5FA;&#xFE0F; Open Run Map</a>':'')
      +(a.notes?'<div style="font-size:0.82rem;color:#666;margin-top:8px;white-space:pre-wrap;"><strong style="display:block;color:#475569;margin-bottom:2px;">Notes</strong>'+formatActivityNotesHtml(a.notes)+'</div>':'')
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
      +['manual','garmin','stryd','strava','gear2'].map(function(s){var cur=(a.source||'manual')===s;return'<button onclick="event.stopPropagation();setActSource('+a.id+',\''+s+'\')" style="font-size:0.72rem;padding:3px 9px;border-radius:10px;border:1px solid '+(cur?'#667eea':'#ddd')+';background:'+(cur?'#667eea':'#fff')+';color:'+(cur?'#fff':'#888')+';cursor:pointer;font-weight:'+(cur?'700':'400')+';">'+actSourceLabel(s)+'</button>';}).join('')
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
  loadUpcomingPlan();
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
  if(body)body.textContent=reflowPlanText(plan.text)||'(No plan text)';
  var pdfBtn=document.getElementById('tpPersistPdfBtn');
  if(pdfBtn)pdfBtn.style.display=plan.pdfDataUrl?'inline-block':'none';
  // Archived plans section
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  if(archSec)archSec.style.display=archived.length?'block':'none';
  renderArchivedPlans();
  renderJournalHome();
}
function archivePlan(which){
  which=which||'current';
  var storageKey=which==='upcoming'?'upcoming_training_plan':'current_training_plan';
  var raw=localStorage.getItem(storageKey);
  if(!raw){alert('No '+(which==='upcoming'?'upcoming':'active')+' plan to archive.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){return;}
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  plan.archivedAt=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  plan.archivedFrom=which==='upcoming'?'upcoming':'current';
  delete plan.pdfDataUrl;
  archived.unshift(plan);
  localStorage.setItem('archived_plans',JSON.stringify(archived));
  localStorage.removeItem(storageKey);
  if(which==='upcoming'){
    var upSec=document.getElementById('tpUpcomingSection');
    if(upSec)upSec.style.display='none';
  }else{
    var sec=document.getElementById('tpPersistSection');
    if(sec)sec.style.display='none';
  }
  var archSec=document.getElementById('tpArchiveSection');
  if(archSec)archSec.style.display='block';
  renderArchivedPlans();
  alert(which==='upcoming'?'Upcoming plan archived.':'Plan archived.');
}
function deletePlan(){
  if(!confirm('Delete the active training plan? This cannot be undone.'))return;
  localStorage.removeItem('current_training_plan');
  var sec=document.getElementById('tpPersistSection');
  if(sec)sec.style.display='none';
}
function fmtPlanDate(ds){
  if(!ds)return'\u2014';
  var d=new Date(ds+'T00:00:00');
  if(isNaN(d.getTime()))return ds;
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
// Cleans up plan text for display only (never rewrites the stored plan.text).
// PDF text extraction -- and some pasted/typed text -- can lose real line
// breaks, leaving behind runs of 2+ spaces where a line or paragraph break
// used to be. This turns those back into visible line breaks. A recovered
// break only gets a full blank-line paragraph gap when it looks like the
// end of a flowing sentence/paragraph; short labels, headings, and
// weekly-schedule/table cells stay on compact, single-spaced lines instead
// of being stretched out across the screen.
function reflowPlanText(text){
  if(!text)return text;
  var t=String(text);
  t=t.replace(/[ \t]{2,}/g,'\x00');
  t=t.replace(/[ \t]+([,.;:])/g,'$1');
  t=t.replace(/\x00[ \t]+/g,'\x00');
  t=t.replace(/\n[ \t]+/g,'\n');
  var segments=t.split('\x00');
  var result=segments[0];
  for(var i=1;i<segments.length;i++){
    var prevLines=result.split('\n');
    var prev=prevLines[prevLines.length-1];
    var nextLines=segments[i].split('\n');
    var next=nextLines[0];
    var endsSentence=/[.!?:]$/.test(prev.trim());
    var bothLong=prev.trim().length>25&&next.trim().length>25;
    result+=(endsSentence||bothLong)?'\n\n':'\n';
    result+=segments[i];
  }
  return result.replace(/\n{3,}/g,'\n\n').trim();
}
// Saves a plan record to localStorage. If storage is full (most likely
// because the plan includes a saved copy of its original PDF), retries
// without that copy so the plan itself is never lost. Returns true,
// 'stripped', or false so callers know whether the PDF copy survived.
function savePlanRecord(key,obj){
  try{
    localStorage.setItem(key,JSON.stringify(obj));
    return true;
  }catch(e){
    if(obj&&obj.pdfDataUrl){
      var stripped={};
      for(var k in obj)if(k!=='pdfDataUrl')stripped[k]=obj[k];
      try{
        localStorage.setItem(key,JSON.stringify(stripped));
        return'stripped';
      }catch(e2){
        return false;
      }
    }
    return false;
  }
}
// Opens a saved original PDF (stored as a base64 data: URL) in a new tab, via
// a Blob/object URL so it opens reliably even on mobile browsers.
function openStoredPdf(dataUrl){
  if(!dataUrl){alert('No original PDF is saved for this plan (it was uploaded before this feature existed, or the file was too large to keep a copy of). Re-upload the PDF to enable this.');return;}
  try{
    var commaIdx=dataUrl.indexOf(',');
    var metaPart=dataUrl.slice(0,commaIdx);
    var mimeMatch=metaPart.match(/data:(.*?);base64/);
    var mime=mimeMatch?mimeMatch[1]:'application/pdf';
    var binary=atob(dataUrl.slice(commaIdx+1));
    var bytes=new Uint8Array(binary.length);
    for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    var blob=new Blob([bytes],{type:mime});
    var url=URL.createObjectURL(blob);
    window.open(url,'_blank');
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
  }catch(e){
    alert('Could not open the original PDF.');
  }
}
function viewActivePlanPdf(){
  var raw=localStorage.getItem('current_training_plan');
  var plan=null;if(raw){try{plan=JSON.parse(raw);}catch(e){}}
  openStoredPdf(plan&&plan.pdfDataUrl);
}
function viewUpcomingPlanPdf(){
  var raw=localStorage.getItem('upcoming_training_plan');
  var plan=null;if(raw){try{plan=JSON.parse(raw);}catch(e){}}
  openStoredPdf(plan&&plan.pdfDataUrl);
}
// Sends a plan's current text to the same Anthropic API the AI plan
// generator already uses (same stored key), asking it to reorganize the
// text into the same clean, readable layout the app's own generated plans
// use -- without inventing, dropping, or summarizing away any of the
// original content. Works on any plan text regardless of where it came
// from (uploaded PDF, pasted text, or AI-generated), so it also fixes up
// a plan that was uploaded before "View Original PDF" existed.
function reformatPlanWithAI(which){
  var key=journalAIKey();
  if(!key){alert('Add your Anthropic API key in \u2699\uFE0F Settings first to use AI formatting cleanup.');return;}
  var storageKey=which==='upcoming'?'upcoming_training_plan':'current_training_plan';
  var raw=localStorage.getItem(storageKey);
  if(!raw){alert('No plan to reformat.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){alert('Could not read this plan.');return;}
  if(!plan.text){alert('This plan has no text to reformat.');return;}
  var btn=document.getElementById(which==='upcoming'?'tpUpcomingReformatBtn':'tpPersistReformatBtn');
  if(btn){btn.disabled=true;btn.textContent='\u23F3 Reformatting\u2026';}
  var prompt='You are formatting a training plan for easy reading in a mobile app. Reformat the plan text below into a clean, consistently structured document, following this style:\n\n'
    +'- A short title line in capitals (e.g. the distance and plan type)\n'
    +'- A one-line subtitle describing the plan\'s structure/phases, using \u00B7 as a separator\n'
    +'- A full-width separator line of = characters\n'
    +'- Key stats as their own short labeled lines in capitals (e.g. TARGET PACE, FINISH GOAL, PEAK LONG RUN) directly followed by their values, if the plan includes stats like these\n'
    +'- The plan start date on its own line\n'
    +'- A week-by-week schedule, each week starting with a clear "Week N \u2014 Phase" header, followed by each training day on its own line (e.g. "Mon: Easy 4 miles")\n\n'
    +'Keep ALL of the original plan\'s real information -- do not invent, remove, or summarize away any detail, workout, note, or number. Only reorganize and reformat for readability. Reply with ONLY the reformatted plan text, no preamble or commentary.\n\n'
    +'Plan text to reformat:\n\n'+plan.text;
  var controller=new AbortController();
  var timeoutId=setTimeout(function(){controller.abort();},60000);
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    signal:controller.signal,
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:6000,messages:[{role:'user',content:prompt}]})
  }).then(function(r){return r.json();}).then(function(data){
    clearTimeout(timeoutId);
    if(btn){btn.disabled=false;btn.textContent='\uD83E\uDE84 Clean Up Formatting';}
    if(data.error){alert('AI error: '+data.error.message);return;}
    var newText=((data.content&&data.content[0]&&data.content[0].text)||'').trim();
    if(!newText){alert('The AI did not return any text. Please try again.');return;}
    plan.text=newText;
    var rebuilt=buildUploadedTrainingSchedule(newText,plan.startDate||dk(new Date()),plan.weeks);
    plan.schedule=rebuilt.schedule;plan.scheduleMode=rebuilt.mode;plan.scheduleVersion=3;
    var saveResult=savePlanRecord(storageKey,plan);
    if(which==='upcoming'){
      loadUpcomingPlan();
    }else{
      var _ck=[];for(var _i=0;_i<localStorage.length;_i++){var _k=localStorage.key(_i);if(_k&&_k.startsWith('workout_cache_'))_ck.push(_k);}
      _ck.forEach(function(_k){localStorage.removeItem(_k);});
      loadCurrentPlan();
    }
    var pdfNote=(plan.pdfDataUrl&&saveResult==='stripped')?' (The saved original PDF copy had to be dropped to fit storage.)':'';
    alert('Plan reformatted.'+pdfNote);
  }).catch(function(err){
    clearTimeout(timeoutId);
    if(btn){btn.disabled=false;btn.textContent='\uD83E\uDE84 Clean Up Formatting';}
    if(err&&err.name==='AbortError'){alert('Reformatting timed out. Please try again.');}
    else{alert('Could not reformat the plan: '+(err&&err.message?err.message:err));}
  });
}
// A second, "upcoming" plan saved alongside the active one -- e.g. an ultra plan
// queued up to start once the current marathon plan's race day has passed.
// Kept in its own localStorage slot so it never overwrites current_training_plan
// until the person explicitly promotes it with makeUpcomingPlanActive().
function loadUpcomingPlan(){
  var sec=document.getElementById('tpUpcomingSection');
  if(!sec)return;
  var raw=localStorage.getItem('upcoming_training_plan');
  if(!raw){sec.style.display='none';return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){sec.style.display='none';return;}
  sec.style.display='block';
  var meta=document.getElementById('tpUpcomingMeta');
  if(meta){
    var parts=[];
    if(plan.type)parts.push(plan.type);
    if(plan.weeks)parts.push(plan.weeks+'-week plan');
    parts.push('Starts '+fmtPlanDate(plan.startDate));
    if(plan.createdAt)parts.push('Saved '+plan.createdAt);
    meta.textContent=parts.join(' \u2022 ');
  }
  var body=document.getElementById('tpUpcomingBody');
  if(body)body.textContent=reflowPlanText(plan.text)||'(No plan text)';
  var upcomingPdfBtn=document.getElementById('tpUpcomingPdfBtn');
  if(upcomingPdfBtn)upcomingPdfBtn.style.display=plan.pdfDataUrl?'inline-block':'none';
}
// Inserts (or refreshes) a standard reference "TRAINING ZONES" section
// (McMillan-style pace zones, with heart-rate ranges and what each zone is
// used for) into a plan's text, matching the app's own house style. Placed
// right before the week-by-week schedule starts (i.e. right before the
// "Week 1" header, after any separator line that leads into it) so it reads
// as plan reference material rather than a scheduled day, and so it can
// never get swallowed into a week's day-by-day parsing. If no "Week 1"
// header is found at all, it's appended at the end instead. If the plan
// already has a Training Zones section, that section is replaced in place
// with the current version (so re-tapping the button refreshes it rather
// than refusing), leaving the rest of the plan untouched.
function addTrainingZonesToPlan(which){
  var storageKey=which==='upcoming'?'upcoming_training_plan':'current_training_plan';
  var raw=localStorage.getItem(storageKey);
  if(!raw){alert('No '+(which==='upcoming'?'upcoming':'active')+' plan found.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){alert('Could not read the plan.');return;}
  if(!plan.text){alert('This plan has no text to add to.');return;}
  var zonesBlock=[
    'TRAINING ZONES',
    'Paces are approximate McMillan-style zones for a ~4:00 marathon runner. On easy and long days, heart rate wins over pace; on trails and hills, effort wins over both.',
    '',
    'RECOVERY (Endurance)',
    'Pace: 10:45\u201311:30/mi  \u00b7  HR: under 125',
    'Day after a hard effort',
    '',
    'EASY / LONG (Endurance)',
    'Pace: 9:45\u201310:45/mi  \u00b7  HR: 125\u2013137',
    'Most miles, long runs',
    '',
    '50K RACE EFFORT (Endurance)',
    'Pace: 10:15\u201311:00/mi (trail varies)  \u00b7  HR: 130\u2013140',
    'Long-run segments, race day',
    '',
    'STEADY STATE (Stamina)',
    'Pace: 9:00\u20139:20/mi  \u00b7  HR: 140\u2013148',
    'Fast finishes, steady runs',
    '',
    'TEMPO (Stamina)',
    'Pace: 8:35\u20138:50/mi  \u00b7  HR: 148\u2013155',
    'Tempo runs',
    '',
    'CRUISE / TEMPO INTERVALS (Stamina)',
    'Pace: 8:15\u20138:35/mi  \u00b7  HR: 152\u2013158',
    'Interval-style threshold work',
    '',
    'SPEED (Speed)',
    'Pace: 7:45\u20138:05/mi  \u00b7  HR: 158+',
    'Short VO2 repeats, Phase 1-2 only',
    '',
    'STRIDES / HILL SPRINTS (Sprint)',
    'Pace: Fast, relaxed  \u00b7  HR: not used',
    '15-20s pickups',
    '',
    'Set the 137 bpm Zone 2 ceiling as a custom HR alert on your Galaxy Watch Ultra. Use the Polar H10 for long runs so the readings are trustworthy.'
  ].join('\n');
  var lines=plan.text.split(/\r?\n/);
  var zonesStart=-1;
  for(var z=0;z<lines.length;z++){if(/^\s*training zones\s*$/i.test(lines[z])){zonesStart=z;break;}}
  var before,after;
  if(zonesStart>=0){
    var zonesEnd=lines.length;
    for(var e=zonesStart+1;e<lines.length;e++){if(/^\s*=+\s*$/.test(lines[e])||/^\s*week\s+1\b/i.test(lines[e])){zonesEnd=e;break;}}
    var beforeLines=lines.slice(0,zonesStart);
    while(beforeLines.length&&beforeLines[beforeLines.length-1].trim()==='')beforeLines.pop();
    var afterLines=lines.slice(zonesEnd);
    while(afterLines.length&&afterLines[0].trim()==='')afterLines.shift();
    before=beforeLines.join('\n');
    after=afterLines.join('\n');
  }else{
    var weekIdx=-1;
    for(var i=0;i<lines.length;i++){if(/^\s*week\s+1\b/i.test(lines[i])){weekIdx=i;break;}}
    var insertAt;
    if(weekIdx>=0){
      var sepIdx=-1;
      for(var j=weekIdx-1;j>=0&&j>=weekIdx-4;j--){if(/^\s*=+\s*$/.test(lines[j])){sepIdx=j;break;}}
      insertAt=sepIdx>=0?sepIdx:weekIdx;
    }else{
      insertAt=lines.length;
    }
    before=lines.slice(0,insertAt).join('\n').replace(/\s+$/,'');
    after=lines.slice(insertAt).join('\n');
  }
  plan.text=(before?before+'\n\n':'')+zonesBlock+(after?'\n\n'+after:'');
  var rebuilt=buildUploadedTrainingSchedule(plan.text,plan.startDate,plan.weeks);
  plan.schedule=rebuilt.schedule;plan.scheduleMode=rebuilt.mode;plan.scheduleVersion=3;
  var saveResult=savePlanRecord(storageKey,plan);
  if(which==='upcoming'){
    loadUpcomingPlan();
  }else{
    var _ck=[];for(var _i=0;_i<localStorage.length;_i++){var _k=localStorage.key(_i);if(_k&&_k.startsWith('workout_cache_'))_ck.push(_k);}
    _ck.forEach(function(_k){localStorage.removeItem(_k);});
    loadCurrentPlan();
  }
  var pdfNote=(plan.pdfDataUrl&&saveResult==='stripped')?' (The saved original PDF copy had to be dropped to fit storage.)':'';
  alert((zonesStart>=0?'Training zones updated.':'Training zones added to the '+(which==='upcoming'?'upcoming':'active')+' plan.')+pdfNote);
}
// Inserts the real calendar date next to each "Sun:"/"Mon:"/... day label in
// a plan's week-by-week schedule (e.g. "Sun: 4 E" becomes "Sun, Nov 1: 4 E"),
// computed from the plan's own "Start date:"/"Plan start:" line in its text
// (never "Race day:"/"Target date:"/"Finish date:", which are end dates, and
// never the stored plan.startDate field, which can be stale) together with
// each "Week N" header. Re-tapping recomputes cleanly -- any date this
// function previously inserted is stripped first, so dates never stack or
// drift if the plan's start date or weeks are later adjusted. Also upgrades
// the plan's schedule from position-based "weekly" matching to precise
// date-based "dated" matching, since every day line now carries a real date.
function addDatesToSchedule(which){
  var storageKey=which==='upcoming'?'upcoming_training_plan':'current_training_plan';
  var raw=localStorage.getItem(storageKey);
  if(!raw){alert('No '+(which==='upcoming'?'upcoming':'active')+' plan found.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){alert('Could not read the plan.');return;}
  if(!plan.text){alert('This plan has no text to update.');return;}
  var lines=plan.text.split(/\r?\n/);
  var fallbackYear=new Date((plan.startDate||dk(new Date()))+'T00:00:00').getFullYear();
  var startDate=null;
  for(var i=0;i<lines.length;i++){
    if(!/^\s*(start\s*date|plan\s*start)\s*:?\s*/i.test(lines[i]))continue;
    var rest=lines[i].replace(/^\s*(start\s*date|plan\s*start)\s*:?\s*/i,'');
    var sameLineKey=rest?trainingPlanDateFromLine(rest,fallbackYear):null;
    if(sameLineKey){startDate=new Date(sameLineKey+'T00:00:00');}
    else{
      for(var n=i+1;n<lines.length;n++){
        if(lines[n].trim()==='')continue;
        var nextKey=trainingPlanDateFromLine(lines[n],fallbackYear);
        if(nextKey)startDate=new Date(nextKey+'T00:00:00');
        break;
      }
    }
    break;
  }
  if((!startDate||isNaN(startDate.getTime()))&&plan.startDate)startDate=new Date(plan.startDate+'T00:00:00');
  if(!startDate||isNaN(startDate.getTime())){alert('Could not find a start date in this plan to calculate dates from.');return;}
  var weekdayIdx={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
  var startWeekdayIdx=startDate.getDay();
  var currentWeekNum=null,changed=0;
  for(var li=0;li<lines.length;li++){
    var weekMatch=lines[li].match(/^\s*week\s+(\d+)\b/i);
    if(weekMatch){currentWeekNum=parseInt(weekMatch[1],10);continue;}
    if(currentWeekNum===null)continue;
    var stripped=lines[li].replace(/^(\s*(?:sun|mon|tue|wed|thu|fri|sat)(?:day)?),\s*[A-Za-z]{3,9}\s+\d{1,2}(\s*:)/i,'$1$2');
    var dayMatch=stripped.match(/^(\s*)(sun|mon|tue|wed|thu|fri|sat)(day)?(\s*:)/i);
    if(!dayMatch)continue;
    var dayIdx=weekdayIdx[dayMatch[2].toLowerCase()];
    var offset=(dayIdx-startWeekdayIdx+7)%7;
    var weekStart=new Date(startDate);weekStart.setDate(startDate.getDate()+(currentWeekNum-1)*7);
    var actualDate=new Date(weekStart);actualDate.setDate(weekStart.getDate()+offset);
    var dateStr=actualDate.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    var newPrefix=dayMatch[1]+dayMatch[2]+(dayMatch[3]||'')+', '+dateStr+dayMatch[4];
    lines[li]=newPrefix+stripped.slice(dayMatch[0].length);
    changed++;
  }
  if(!changed){alert('No "Week N" day-by-day schedule lines were found to add dates to.');return;}
  plan.text=lines.join('\n');
  var rebuilt=buildUploadedTrainingSchedule(plan.text,plan.startDate,plan.weeks);
  plan.schedule=rebuilt.schedule;plan.scheduleMode=rebuilt.mode;plan.scheduleVersion=3;
  var saveResult=savePlanRecord(storageKey,plan);
  if(which==='upcoming'){
    loadUpcomingPlan();
  }else{
    var _ck=[];for(var _i=0;_i<localStorage.length;_i++){var _k=localStorage.key(_i);if(_k&&_k.startsWith('workout_cache_'))_ck.push(_k);}
    _ck.forEach(function(_k){localStorage.removeItem(_k);});
    loadCurrentPlan();
  }
  var pdfNote=(plan.pdfDataUrl&&saveResult==='stripped')?' (The saved original PDF copy had to be dropped to fit storage.)':'';
  alert('Added dates to '+changed+' day'+(changed===1?'':'s')+' in the schedule.'+pdfNote);
}
function makeUpcomingPlanActive(){
  var raw=localStorage.getItem('upcoming_training_plan');
  if(!raw){alert('No upcoming plan saved.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){alert('Could not read the upcoming plan.');return;}
  var curRaw=localStorage.getItem('current_training_plan');
  if(curRaw){
    if(!confirm('This will archive your current active plan and make this upcoming plan active now. Continue?'))return;
    var curPlan=null;try{curPlan=JSON.parse(curRaw);}catch(e){}
    if(curPlan){
      var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
      curPlan.archivedAt=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      curPlan.archivedFrom='current';
      delete curPlan.pdfDataUrl;
      archived.unshift(curPlan);
      localStorage.setItem('archived_plans',JSON.stringify(archived));
    }
  }
  delete plan.archivedAt;
  savePlanRecord('current_training_plan',plan);
  localStorage.removeItem('upcoming_training_plan');
  // Clear stale workout caches so the newly active plan's entries load fresh
  var _ck=[];for(var _i=0;_i<localStorage.length;_i++){var _k=localStorage.key(_i);if(_k&&_k.startsWith('workout_cache_'))_ck.push(_k);}
  _ck.forEach(function(_k){localStorage.removeItem(_k);});
  loadCurrentPlan();
  loadUpcomingPlan();
  alert('Your upcoming plan is now active.');
}
function deleteUpcomingPlan(){
  if(!confirm('Delete the upcoming plan? This cannot be undone.'))return;
  localStorage.removeItem('upcoming_training_plan');
  loadUpcomingPlan();
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
    var sourceLbl=p.archivedFrom==='upcoming'?'Upcoming':'Active';
    var lbl=sourceLbl+' '+(p.type||'Plan')+' • '+(p.weeks?p.weeks+'-wk • ':'')+('Archived '+(p.archivedAt||''));
    return'<div style="border:1px solid #e9ecef;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fafafa;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
      +'<span style="font-size:0.8rem;font-weight:600;color:#555;">'+lbl+'</span>'
      +'<div style="display:flex;gap:6px;">'
      +'<button onclick="restoreArchivedPlan('+i+')" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:1px solid #667eea;background:#667eea;color:white;cursor:pointer;">Restore</button>'
      +'<button onclick="deleteArchivedPlan('+i+')" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:1px solid #e74c3c;background:#e74c3c;color:white;cursor:pointer;">Delete</button>'
      +'</div></div>'
      +'<div style="white-space:pre-wrap;font-size:0.78rem;color:#555;max-height:120px;overflow-y:auto;margin-top:6px;border-top:1px solid #eee;padding-top:6px;">'+reflowPlanText(p.text||'').slice(0,300)+(p.text&&p.text.length>300?'…':'')+'</div>'
      +'</div>';
  }).join('');
}
function restoreArchivedPlan(i){
  var archived=[];try{archived=JSON.parse(localStorage.getItem('archived_plans')||'[]');}catch(e){}
  var plan=archived[i];if(!plan)return;
  var targetWhich=plan.archivedFrom==='upcoming'?'upcoming':'current';
  var storageKey=targetWhich==='upcoming'?'upcoming_training_plan':'current_training_plan';
  if(localStorage.getItem(storageKey)){if(!confirm('Replace your '+(targetWhich==='upcoming'?'upcoming':'current active')+' plan with this archived one?'))return;}
  archived.splice(i,1);
  localStorage.setItem('archived_plans',JSON.stringify(archived));
  delete plan.archivedAt;
  delete plan.archivedFrom;
  savePlanRecord(storageKey,plan);
  if(targetWhich==='upcoming'){loadUpcomingPlan();}else{loadCurrentPlan();}
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
function openAdjustPlan(which){
  which=which||'current';
  var box=document.getElementById(which==='upcoming'?'tpUpcomingAdjustBox':'tpAdjustBox');
  if(box){box.style.display='block';var inp=document.getElementById(which==='upcoming'?'tpUpcomingAdjustInput':'tpAdjustInput');if(inp)inp.focus();}
}
function closeAdjustPlan(which){
  which=which||'current';
  var box=document.getElementById(which==='upcoming'?'tpUpcomingAdjustBox':'tpAdjustBox');
  if(box){box.style.display='none';var inp=document.getElementById(which==='upcoming'?'tpUpcomingAdjustInput':'tpAdjustInput');if(inp)inp.value='';}
}
function submitAdjustPlan(which){
  which=which||'current';
  var storageKey=which==='upcoming'?'upcoming_training_plan':'current_training_plan';
  var inp=document.getElementById(which==='upcoming'?'tpUpcomingAdjustInput':'tpAdjustInput');
  var btn=document.getElementById(which==='upcoming'?'tpUpcomingAdjustBtn':'tpAdjustBtn');
  var instruction=(inp&&inp.value.trim())||'';
  if(!instruction){alert('Please describe how you want to adjust the plan.');return;}
  var raw=localStorage.getItem(storageKey);
  if(!raw){alert('No '+(which==='upcoming'?'upcoming':'active')+' training plan found.');return;}
  var plan;try{plan=JSON.parse(raw);}catch(e){alert('Could not read training plan.');return;}
  var currentPlanText=plan.text||'';
  var prompt='You are a running coach. The athlete has '+(which==='upcoming'?'an upcoming':'an active')+' training plan and wants to adjust it.\n\nCURRENT PLAN:\n'+currentPlanText+'\n\nATHLETE\'S REQUEST:\n'+instruction+'\n\nPlease rewrite the training plan incorporating the requested adjustments. Keep the same format and structure as the original plan. Return only the updated plan text.';
  if(btn){btn.disabled=true;btn.textContent='⏳ Adjusting...';}
  aiCall(prompt,5000,function(text){
    plan.text=text;
    plan.adjustedAt=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    if(plan.scheduleMode){var rebuilt=buildUploadedTrainingSchedule(plan.text,plan.startDate,plan.weeks);plan.schedule=rebuilt.schedule;plan.scheduleMode=rebuilt.mode;plan.scheduleVersion=3;}
    localStorage.setItem(storageKey,JSON.stringify(plan));
    if(which==='upcoming'){loadUpcomingPlan();}else{renderActivePlan();}
    closeAdjustPlan(which);
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
  const allHRs=recent.filter(a=>a.heartRate>0).map(a=>a.heartRate);
  const avgHR=allHRs.length?Math.round(allHRs.reduce((s,v)=>s+v,0)/allHRs.length):0;
  const maxHR=getMaxHR();
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
    avgHR?`- Average heart rate: ${avgHR} bpm`:'',
    maxHR?`- Max heart rate (Garmin HR zones): ${maxHR} bpm`:'',
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
  // A one-off metadata line like "Start date: Sunday, November 1, 2026" or a
  // "RACE DAY:" label with the date on the next line both contain a real date,
  // so trainingPlanDateFromLine() matches them -- but they aren't a per-day
  // schedule entry. Without this guard, a plan with no other dated day headers
  // collapses into a single giant "day" that swallows the entire rest of the
  // plan text under that one date, and every other real day falls back to
  // "Rest Day". Skip any date match that's a metadata label (same line) or
  // immediately follows one (date alone on the next line).
  var metaLabelRe=/^\s*(start\s*date|plan\s*start|race\s*day|target\s*date|finish\s*date)\s*:?\s*$/i;
  lines.forEach(function(line,index){
    var key=trainingPlanDateFromLine(line,fallbackYear);
    if(!key)return;
    if(/^\s*(start\s*date|plan\s*start|race\s*day|target\s*date|finish\s*date)\s*:/i.test(line))return;
    var prevNonEmpty=null;
    for(var p=index-1;p>=0;p--){if(lines[p].trim()!==''){prevNonEmpty=lines[p];break;}}
    if(prevNonEmpty&&metaLabelRe.test(prevNonEmpty))return;
    headers.push({index:index,key:key});
  });
  var schedule={};
  headers.forEach(function(header,index){
    var end=index+1<headers.length?headers[index+1].index:lines.length;
    var sectionLines=lines.slice(header.index,end);
    for(var si=1;si<sectionLines.length;si++){if(/^\s*week\s+\d+\b/i.test(sectionLines[si])){sectionLines=sectionLines.slice(0,si);break;}}
    var section=sectionLines.join('\n').trim();
    if(section)schedule[header.key]=section;
  });
  if(Object.keys(schedule).length)return{schedule:schedule,mode:'dated'};
  var base={text:text,startDate:startDate},days=Math.max(7,(weeks||1)*7),start=new Date(startDate+'T00:00:00');
  for(var i=0;i<days;i++){
    var date=new Date(start);date.setDate(start.getDate()+i);
    var section=extractWorkoutFromActivePlan(base,date,false);
    if(section)schedule[dk(date)]=section;
  }
  return{schedule:schedule,mode:'weekly'};
}
// Extracts the text layer from a PDF using pdf.js (loaded in daily-planner.html).
// Only works for PDFs that have real selectable text -- a scanned/photographed
// page with no text layer will come back empty, which is surfaced to the user
// as an error asking them to use a .txt file instead.
// Reads a File as a base64 data: URL. Used to keep a copy of an uploaded
// PDF's original bytes so it can be opened later and viewed exactly as it
// looked in the PDF, regardless of how well the text extraction below reads.
function readFileAsDataUrl(file){
  return new Promise(function(resolve,reject){
    var reader=new FileReader();
    reader.onload=function(e){resolve(e.target.result);};
    reader.onerror=function(){reject(new Error('Could not read the file'));};
    reader.readAsDataURL(file);
  });
}
async function extractPdfText(file){
  if(typeof pdfjsLib==='undefined')throw new Error('PDF support did not load (check your connection)');
  if(!pdfjsLib.GlobalWorkerOptions.workerSrc){
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js';
  }
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let text='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    let pageText='';
    let lastY=null;
    content.items.forEach(function(it){
      var y=(it.transform&&typeof it.transform[5]==='number')?it.transform[5]:null;
      if(lastY!==null&&y!==null&&Math.abs(y-lastY)>1){
        pageText+=(Math.abs(y-lastY)>18?'\n\n':'\n');
      }else if(pageText&&!/[\n ]$/.test(pageText)){
        pageText+=' ';
      }
      pageText+=it.str;
      if(y!==null)lastY=y;
    });
    text+=(text?'\n\n':'')+pageText;
  }
  return text.trim().replace(/\n{3,}/g,'\n\n');
}
function uploadPlanFromFile(evt){
  const file=evt.target.files[0];if(!file)return;
  const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
  const status=document.getElementById('tpUploadStatus');
  function processPlanText(text,pdfDataUrl){
    text=(text||'').trim();
    if(!text){alert(isPdf?'No readable text was found in that PDF. If it\'s a scanned image, please save it as a .txt file instead.':'The selected text file is empty.');evt.target.value='';return;}
    const weekMatches=Array.from(text.matchAll(/\bweek\s+(\d{1,2})\b/gi)).map(m=>parseInt(m[1],10)).filter(n=>n>0&&n<=52);
    const weeks=weekMatches.length?Math.max.apply(null,weekMatches):0;
    const startInput=document.getElementById('tpUploadStartDate');
    const planStartDate=(startInput&&startInput.value)||dk(new Date());
    const structured=buildUploadedTrainingSchedule(text,planStartDate,weeks);
    const datedKeys=Object.keys(structured.schedule);
    const effectiveStart=structured.mode==='dated'&&datedKeys.length?datedKeys.sort()[0]:planStartDate;
    const metaStr=(isPdf?'Uploaded PDF plan':'Uploaded text plan')+(weeks?' • '+weeks+' weeks':'');
    const planObj={text,dist:'',weeks,raceDate:'',startDate:effectiveStart,schedule:structured.schedule,scheduleMode:structured.mode,scheduleVersion:3,meta:metaStr,createdAt:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
    if(pdfDataUrl)planObj.pdfDataUrl=pdfDataUrl;
    const upcomingCb=document.getElementById('tpSaveAsUpcoming');
    const saveAsUpcoming=!!(upcomingCb&&upcomingCb.checked);
    if(saveAsUpcoming){
      const saveResult=savePlanRecord('upcoming_training_plan',planObj);
      loadUpcomingPlan();
      const pdfNote=(pdfDataUrl&&saveResult==='stripped')?' The original PDF was too large to also keep a viewable copy of.':'';
      if(status)status.textContent='Saved as an upcoming plan starting '+fmtPlanDate(effectiveStart)+'. Your current active plan keeps running until you tap "Make Active Now".';
      if(upcomingCb)upcomingCb.checked=false;
      alert('Saved as an upcoming plan starting '+fmtPlanDate(effectiveStart)+'. It will not replace your active plan until you activate it.'+pdfNote);
      evt.target.value='';
      return;
    }
    const saveResult=savePlanRecord('current_training_plan',planObj);
    // Clear stale workout caches so new plan entries load fresh
    const _ck=[];for(let _i=0;_i<localStorage.length;_i++){const _k=localStorage.key(_i);if(_k&&_k.startsWith('workout_cache_'))_ck.push(_k);}
    _ck.forEach(_k=>localStorage.removeItem(_k));
    const outputDiv=document.getElementById('tpOutput');
    const outputText=document.getElementById('tpOutputText');
    const meta=document.getElementById('tpMeta');
    if(outputText){outputText.textContent=reflowPlanText(text);outputText.style.whiteSpace='pre-wrap';}
    if(meta)meta.textContent=metaStr;
    if(outputDiv){outputDiv.style.display='block';setTimeout(()=>outputDiv.scrollIntoView({behavior:'smooth',block:'start'}),100);}
    const pdfNote=(pdfDataUrl&&saveResult==='stripped')?' The original PDF was too large to also keep a viewable copy of.':'';
    if(status)status.textContent=datedKeys.length+' workout day'+(datedKeys.length===1?'':'s')+' mapped by '+(structured.mode==='dated'?'the dates in the file':'week and weekday')+'. Unlisted dates remain rest days.'+pdfNote;
    loadCurrentPlan();
    alert('Training plan loaded from '+file.name+'.');
    evt.target.value='';
  }
  const MAX_PDF_STORE_BYTES=4*1024*1024;
  if(isPdf){
    if(status)status.textContent='Reading PDF\u2026';
    const pdfDataUrlPromise=(file.size<=MAX_PDF_STORE_BYTES)?readFileAsDataUrl(file).catch(function(){return null;}):Promise.resolve(null);
    Promise.all([extractPdfText(file),pdfDataUrlPromise]).then(function(results){
      processPlanText(results[0],results[1]);
    }).catch(function(err){
      alert('Could not read that PDF: '+(err&&err.message?err.message:err)+'. Try saving it as a .txt file instead.');
      if(status)status.textContent='';
      evt.target.value='';
    });
    return;
  }
  const reader=new FileReader();
  reader.onload=e=>{processPlanText(e.target.result);};
  reader.onerror=()=>{alert('The selected file could not be read.');evt.target.value='';};
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
  if(!g.Miles){const am=localStorage.getItem('act_goal_week_mi');if(am)g.Miles=parseFloat(am)||0;}
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
  // Miles is shared with the Activities tab's "This Week" goal field -- keep
  // that card's storage and input in sync with what was just saved here.
  localStorage.setItem('act_goal_week_mi',g.Miles?String(g.Miles):'');
  const actEl=document.getElementById('actGoal_week');if(actEl)actEl.value=g.Miles?String(g.Miles):'';
  document.getElementById('goalsSettings').style.display='none';
  renderGoals();
  if(typeof renderMileageSummary==='function')renderMileageSummary();
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
