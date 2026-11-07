// ══════════════════════════════════════════════════════
// BEYONDSTRIDE NUTRITION SHARE
// Shares each day's nutrition totals with the BeyondStride app (phone + watch) through the same
// Firebase database LiveTrack uses. Nothing here changes how the Nutrition tab works.
// BeyondStride's Nutrition tab opens this page with #tab=nutrition&bs=<base64url "db|key">, which
// turns sharing on. Data goes to <db>/nutrition/<key>/days/<yyyy-mm-dd>.
// ══════════════════════════════════════════════════════
(function(){
  var CFG_KEY='beyondstride_sync';
  function cfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||'null');}catch(e){return null;}}

  // Pick up db + key from the link BeyondStride opens.
  function readLink(){
    var m=(location.hash||'').match(/[#&]bs=([A-Za-z0-9_-]+)/);
    if(!m)return;
    try{
      var b64=m[1].replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
      var parts=atob(b64).split('|');
      if(parts.length===2&&/^https:\/\//.test(parts[0])&&parts[1].length>=16){
        var old=cfg(),fresh=!old||old.db!==parts[0]||old.key!==parts[1];
        localStorage.setItem(CFG_KEY,JSON.stringify({db:parts[0].replace(/\/$/,''),key:parts[1]}));
        if(fresh)setTimeout(function(){shareRecent(30);},800);
      }
    }catch(e){}
  }

  function num(v){return parseFloat(v)||0;}
  var FOOD_MICROS=['fiber','sugar','sodium','vitC','vitD','calcium','iron','potassium','caffeine','magnesium','vitB12','zinc'];
  // A food as BeyondStride needs it (per-serving values; no photos).
  function cleanFood(x,withId){
    var o={name:String(x.name||'').slice(0,80),servingLabel:String(x.servingLabel||'1 serving').slice(0,40),servings:num(x.servings)||1};
    if(withId){o.id=String(x.id||'');o.meal=x.meal||'snack';}
    ['cal','prot','fat','carbs'].concat(FOOD_MICROS).forEach(function(f){if(x[f]!=null&&x[f]!==''&&!isNaN(parseFloat(x[f])))o[f]=r1(num(x[f]));});
    if(x.barcode)o.barcode=String(x.barcode);
    return o;
  }
  function r1(v){return Math.round(v*10)/10;}

  // Totals for one day's food log (same math as the Nutrition tab: amount × servings).
  function summarize(log){
    var t={cal:0,prot:0,carbs:0,fat:0,fiber:0,sugar:0,sodium:0,caffeine:0},meals={},items=[];
    (log||[]).forEach(function(x){
      var s=num(x.servings)||1;
      t.cal+=num(x.cal)*s;t.prot+=num(x.prot)*s;t.carbs+=num(x.carbs)*s;t.fat+=num(x.fat)*s;
      t.fiber+=num(x.fiber)*s;t.sugar+=num(x.sugar)*s;t.sodium+=num(x.sodium)*s;t.caffeine+=num(x.caffeine)*s;
      var m=x.meal||'other';meals[m]=(meals[m]||0)+num(x.cal)*s;
      if(items.length<80)items.push({meal:m,name:String(x.name||'').slice(0,60),cal:Math.round(num(x.cal)*s),prot:r1(num(x.prot)*s),carbs:r1(num(x.carbs)*s),fat:r1(num(x.fat)*s),x:cleanFood(x,true)});
    });
    Object.keys(t).forEach(function(k){t[k]=k==='cal'||k==='sodium'||k==='caffeine'?Math.round(t[k]):r1(t[k]);});
    // Micronutrients: same list, targets and 1–10 score as the Nutrition tab's "Top micronutrient quality".
    var M={};['iron','calcium','vitD','magnesium','vitB12','potassium','zinc','vitC'].forEach(function(f){M[f]=0;});
    var sportsSugar=0,naturalSugar=0;
    (log||[]).forEach(function(x){var s=num(x.servings)||1;Object.keys(M).forEach(function(f){M[f]+=num(x[f])*s;});
      if(x.meal==='sports')sportsSugar+=num(x.sugar)*s;
      try{if(typeof isNaturalSugarFood==='function'&&isNaturalSugarFood(x))naturalSugar+=num(x.sugar)*s;}catch(e){}});
    var sugarCeiling=Math.round(36+sportsSugar+naturalSugar);
    var micros=[
      ['Iron','iron',M.iron,14,0,'mg'],['Calcium','calcium',M.calcium,1000,0,'mg'],['Vitamin D','vitD',M.vitD,15,0,'mcg'],
      ['Magnesium','magnesium',M.magnesium,483,0,'mg'],['Vitamin B12','vitB12',M.vitB12,2.4,0,'mcg'],['Sodium','sodium',t.sodium,2300,4000,'mg'],
      ['Potassium','potassium',M.potassium,3400,0,'mg'],['Zinc','zinc',M.zinc,15,0,'mg'],['Vitamin C','vitC',M.vitC,90,0,'mg'],
      ['Fiber','fiber',t.fiber,28,0,'g'],['Sugar','sugar',t.sugar,sugarCeiling,sugarCeiling,'g'],['Caffeine','caffeine',t.caffeine,400,400,'mg']
    ].map(function(m){return{n:m[0],f:m[1],v:r1(m[2]),t:m[3],mx:m[4],u:m[5]};});
    if((log||[]).length){
      var comp=micros.map(function(m){if(m.mx&&m.v>m.mx)return Math.max(0,1-(m.v-m.mx)/m.mx);return Math.max(0,Math.min(1,m.v/m.t));});
      t.microScore=r1(1+comp.reduce(function(a,b){return a+b;},0)/comp.length*9);
    }
    t.micros=micros;
    Object.keys(meals).forEach(function(k){meals[k]=Math.round(meals[k]);});
    t.meals=meals;t.items=items;t.count=(log||[]).length;
    return t;
  }

  function dayRecord(dateKey){
    var d=null;try{d=JSON.parse(localStorage.getItem('planner_'+dateKey)||'null');}catch(e){}
    var isToday=typeof today!=='undefined'&&typeof dk==='function'&&dk(today)===dateKey;
    var log=isToday&&Array.isArray(window._foodLog)?window._foodLog:(d&&Array.isArray(d.foodLog)?d.foodLog:[]);
    if(!log.length&&!isToday)return null;
    var rec=summarize(log);
    // Fluids (water / sports drinks / other drinks, caffeine excluded) and wake-up / post-run weight,
    // for BeyondStride's Hydration card. Today reads the live counters and fields; older days the saved copy.
    var wa=0,sp=0,ot=0,wt=0,pw=0;
    if(isToday&&typeof waterOz!=='undefined'){
      wa=num(waterOz);sp=num(typeof sportsDrinksOz!=='undefined'?sportsDrinksOz:0);ot=num(typeof otherLiquidsOz!=='undefined'?otherLiquidsOz:0);
      var we=document.getElementById('wWghtVal'),pe=document.getElementById('wPostRunWghtVal');
      wt=num(we&&we.value);pw=num(pe&&pe.value);
    }else if(d){wa=num(d.waterOz)||(num(d.waterCount)*8);sp=num(d.sportsDrinksOz);ot=num(d.otherLiquidsOz);wt=num(d.wWghtVal);pw=num(d.wPostRunWghtVal);}
    if(wa+sp+ot){rec.waterOz=Math.round(wa+sp+ot);rec.water=Math.round(wa);rec.sportsOz=Math.round(sp);rec.otherOz=Math.round(ot);}
    if(wt>70&&wt<600)rec.weight=r1(wt);
    if(pw>70&&pw<600)rec.postWeight=r1(pw);
    if(isToday&&typeof dailyCalorieTargetData==='function'){
      try{var c=dailyCalorieTargetData();rec.target=Math.round(c.target);rec.range=Math.round(c.range);rec.active=Math.round(c.active||0);}catch(e){}
    }
    rec.updated=Date.now();
    return rec;
  }

  var sent={};
  function put(dateKey,rec){
    var c=cfg();if(!c||!rec)return Promise.resolve();
    var body=JSON.stringify(rec);
    // Keep the target that was saved on that day if this copy doesn't have one (older days).
    var url=c.db+'/nutrition/'+encodeURIComponent(c.key)+'/days/'+dateKey+'.json';
    var send=rec.target!=null?fetch(url,{method:'PUT',body:body}):
      fetch(url+'?x-http-method-override=PATCH',{method:'POST',body:body});
    return send.then(function(r){return r.ok;}).catch(function(){return false;});
  }

  function shareDay(dateKey){
    var rec=dayRecord(dateKey);if(!rec)return;
    var cmp=JSON.stringify(Object.assign({},rec,{updated:0}));
    if(sent[dateKey]===cmp)return;   // nothing changed since it was last shared
    put(dateKey,rec).then(function(ok){if(ok)sent[dateKey]=cmp;});
  }

  function shareRecent(days){
    if(!cfg()||typeof dk!=='function')return;
    for(var i=0;i<days;i++){var d=new Date();d.setDate(d.getDate()-i);shareDay(dk(d));}
  }

  // Share whenever the Nutrition totals are recalculated (any add / edit / delete), a few seconds later.
  var timer=null;
  function schedule(){
    if(!cfg())return;
    clearTimeout(timer);
    timer=setTimeout(function(){
      if(typeof today!=='undefined'&&typeof dk==='function')shareDay(dk(today));
    },2500);
  }
  function hook(){
    if(typeof window.updateMacroTotals!=='function'||window.updateMacroTotals._bs)return;
    var orig=window.updateMacroTotals;
    window.updateMacroTotals=function(){var r=orig.apply(this,arguments);try{schedule();}catch(e){}return r;};
    window.updateMacroTotals._bs=true;
    // Fluid taps and weight fields: share those too.
    if(typeof window.updateHydrationEstimate==='function'&&!window.updateHydrationEstimate._bs){
      var oh=window.updateHydrationEstimate;
      window.updateHydrationEstimate=function(){var r=oh.apply(this,arguments);try{schedule();}catch(e){}return r;};
      window.updateHydrationEstimate._bs=true;
    }
  }

  // ── Runs from BeyondStride, waiting in the cloud: add them to Activities, then clear them ──
  // (BeyondStride uploads each finished run to <db>/nutrition/<key>/runs/<start>.)
  var pulling=false;
  function pullRuns(){
    var c=cfg();if(!c||pulling||typeof importWatchRuns!=='function')return;
    pulling=true;
    var base=c.db+'/nutrition/'+encodeURIComponent(c.key)+'/runs';
    fetch(base+'.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(o){
      if(!o||typeof o!=='object'){pulling=false;return;}
      var keys=Object.keys(o).filter(function(k){return o[k]&&o[k].id&&o[k].date;});
      if(!keys.length){pulling=false;return;}
      importWatchRuns(keys.map(function(k){return o[k];}),{done:function(){
        // Saved: remove them from the cloud (BeyondStride sees they're gone and marks them sent).
        Promise.all(keys.map(function(k){return fetch(base+'/'+encodeURIComponent(k)+'.json',{method:'DELETE'}).catch(function(){});}))
          .then(function(){pulling=false;},function(){pulling=false;});
      }});
    }).catch(function(){pulling=false;});
  }
  window.beyondStridePullRuns=pullRuns;

  // ── Fluids and weights entered in BeyondStride (phone or watch) ──
  // BeyondStride posts each change to <db>/nutrition/<key>/inbox: {date, f: water|sports|other|weight|postWeight,
  // d: oz to add (fluids) or v: lb (weights), at}. They're applied here exactly like taps on this page, the day is
  // shared back, then the entries are removed (BeyondStride sees they're gone and switches to these totals).
  var inboxBusy=false;
  function applyEntry(e){
    var date=String(e.date||''),f=e.f,viewed=typeof today!=='undefined'&&dk(today)===date;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    if(f==='foodAdd'||f==='foodEdit'||f==='foodDel'){applyFood(e,date,viewed);return;}
    // A meal saved in BeyondStride (💾): add it to Saved Meals.
    if(f==='mealSave'){
      var mx=e.x||{};if(!mx.name||!Array.isArray(mx.items))return;
      try{
        var saved=getSavedMeals();
        if(saved.some(function(m){return m.name===mx.name&&JSON.stringify((m.items||[]).map(function(i){return i.name;}))===JSON.stringify(mx.items.map(function(i){return i.name;}));}))return;
        saved.push({name:String(mx.name),category:mx.category||'snack',items:mx.items.map(function(x){
          var it={name:String(x.name||'Food'),servingLabel:x.servingLabel||'1 serving',servings:num(x.servings)||1};
          ['cal','prot','fat','carbs'].concat(FOOD_MICROS).forEach(function(k){it[k]=x[k]!=null?x[k]:null;});return it;})});
        saveSavedMeals(saved);
        try{if(typeof renderMealsList==='function')renderMealsList();}catch(err){}
      }catch(err){}
      return;
    }
    // Food Database tools tapped in BeyondStride (Enrich All, Undo All, Rescan Foods, Remove Dupes).
    // You already confirmed in BeyondStride, so this page's own "Are you sure?" is answered yes.
    if(f==='libAction'){
      var act=(e.x||{}).action,fn={enrich:'enrichAllFavorites',undo:'undoAllFavoritesEstimates',rescan:'rescanHealthyFoodsAndImages',dedupe:'removeDuplicateFoodItems'}[act];
      if(!fn||typeof window[fn]!=='function')return;
      var oc=window.confirm,oa=window.alert;window.confirm=function(){return true;};window.alert=function(m){try{console.log('BeyondStride '+act+': '+m);}catch(err){}};
      try{var btn=document.createElement('button');if(act==='rescan')window[fn](btn,'favoriteRescanStatus');else window[fn](btn);}catch(err){}
      window.confirm=oc;setTimeout(function(){window.alert=oa;},0);
      scheduleLibrary();
      return;
    }
    // Calorie-target settings changed in BeyondStride.
    if(f==='calSettings'){
      var cx=e.x||{};
      localStorage.setItem('calorie_intake_settings',JSON.stringify({base:cx.base!=null?String(cx.base):'',goal:cx.goal||'maintain',refuel:parseInt(cx.refuel||100,10)}));
      try{if(typeof calculateDailyCalorieTarget==='function')calculateDailyCalorieTarget(false);}catch(err){}
      try{if(typeof updateMacroTotals==='function')updateMacroTotals();}catch(err){}
      scheduleLibrary();
      return;
    }
    var fluid={water:'waterOz',sports:'sportsDrinksOz',other:'otherLiquidsOz'}[f];
    var wfield={weight:'wWghtVal',postWeight:'wPostRunWghtVal'}[f];
    if(viewed){
      if(fluid){var dd=Math.round(num(e.d));if(!dd)return;
        if(f==='water')changeWater(dd);else if(f==='sports')changeSportsDrinks(dd);else changeOtherLiquids(dd);}
      else if(wfield){var el=document.getElementById(wfield);if(!el)return;el.value=num(e.v)>0?String(e.v):'';
        try{updateHydrationEstimate();}catch(x){}try{save();}catch(x){}}
      return;
    }
    // Another day: change its saved copy.
    var key='planner_'+date,d={};try{d=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(x){d={};}
    if(fluid)d[fluid]=Math.max(0,num(d[fluid])+Math.round(num(e.d)));
    else if(wfield)d[wfield]=num(e.v)>0?String(e.v):'';
    else return;
    localStorage.setItem(key,JSON.stringify(d));
  }
  // Foods added, changed or removed in BeyondStride: same as doing it on this page.
  function applyFood(e,date,viewed){
    var x=e.x||{},log,d=null,key='planner_'+date;
    if(viewed){log=window._foodLog=window._foodLog||[];}
    else{try{d=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(err){d={};}log=d.foodLog=Array.isArray(d.foodLog)?d.foodLog:[];}
    var id=String(x.id||'');if(!id)return;
    var i=log.findIndex(function(it){return it.id===id;});
    if(e.f==='foodAdd'){
      if(i>=0)return;   // already here
      var item={id:id,meal:x.meal||'snack',name:String(x.name||'Food'),servingLabel:x.servingLabel||'1 serving',servings:num(x.servings)||1};
      ['cal','prot','fat','carbs'].concat(FOOD_MICROS).forEach(function(k){item[k]=x[k]!=null?x[k]:null;});
      if(x.barcode)item.barcode=x.barcode;
      try{if(typeof looksLikeRestaurantFood==='function')item.restaurant=looksLikeRestaurantFood(item.name);}catch(err){}
      log.push(item);
    }else if(i<0)return;
    else if(e.f==='foodEdit'){if(x.servings!=null)log[i].servings=num(x.servings)||log[i].servings;if(x.meal)log[i].meal=x.meal;}
    else log.splice(i,1);
    if(viewed){try{renderFoodItems();}catch(err){}try{save();}catch(err){}}
    else localStorage.setItem(key,JSON.stringify(d));
  }
  // Fluids/weights arrive in /inbox, foods in /foodinbox; both are applied in the order they were made.
  function pullInbox(){
    var c=cfg();if(!c||inboxBusy||typeof dk!=='function')return;
    inboxBusy=true;
    var root=c.db+'/nutrition/'+encodeURIComponent(c.key)+'/';
    function get(box){return fetch(root+box+'.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(o){
      return o&&typeof o==='object'?Object.keys(o).filter(function(k){return o[k]&&o[k].date&&o[k].f;}).map(function(k){return{box:box,k:k,e:o[k]};}):[];}).catch(function(){return [];});}
    Promise.all([get('inbox'),get('foodinbox')]).then(function(res){
      var list=res[0].concat(res[1]);
      if(!list.length){inboxBusy=false;return;}
      list.sort(function(a,b){return num(a.e.at)-num(b.e.at);});
      var dates={};
      list.forEach(function(x){try{applyEntry(x.e);dates[x.e.date]=1;}catch(err){}});
      // Share the changed days right away, then clear the entries.
      Promise.all(Object.keys(dates).map(function(dt){var rec=dayRecord(dt);return rec?put(dt,rec):Promise.resolve();}))
        .then(function(){return Promise.all(list.map(function(x){return fetch(root+x.box+'/'+encodeURIComponent(x.k)+'.json',{method:'DELETE'}).catch(function(){});}));})
        .then(function(){inboxBusy=false;},function(){inboxBusy=false;});
    }).catch(function(){inboxBusy=false;});
  }
  window.beyondStridePullInbox=pullInbox;

  // ── Your food database for BeyondStride's Add food screen: favorites, healthy foods, saved meals ──
  var libSent='',libTimer=null;
  function shareLibrary(){
    var c=cfg();if(!c)return;
    var lib={favorites:[],healthy:[],meals:[],updated:Date.now()};
    try{lib.favorites=(getFavorites()||[]).slice(0,500).map(function(x){return cleanFood(x,false);});}catch(e){}
    try{lib.healthy=(getHealthyFoods()||[]).slice(0,500).map(function(x){return cleanFood(x,false);});}catch(e){}
    try{lib.meals=(getSavedMeals()||[]).slice(0,100).map(function(m){return{name:String(m.name||'Meal'),category:m.category||'',items:(m.items||[]).slice(0,30).map(function(x){return cleanFood(x,false);})};});}catch(e){}
    try{if(typeof calorieAdvisorSettings==='function')lib.calSettings=calorieAdvisorSettings();}catch(e){}
    // Counts for the Enrich All / Undo All tiles.
    try{var fv=getFavorites()||[];lib.stats={needEnrich:fv.filter(function(f){return typeof enrichableFields==='function'&&enrichableFields(f).length>0;}).length,
      estimated:fv.filter(function(f){return (f.aiEstimatedFields||[]).length>0;}).length};}catch(e){}
    var cmp=JSON.stringify([lib.favorites,lib.healthy,lib.meals,lib.calSettings,lib.stats]);
    if(cmp===libSent)return;
    fetch(c.db+'/nutrition/'+encodeURIComponent(c.key)+'/library.json',{method:'PUT',body:JSON.stringify(lib)})
      .then(function(r){if(r.ok)libSent=cmp;}).catch(function(){});
  }
  function scheduleLibrary(){clearTimeout(libTimer);libTimer=setTimeout(shareLibrary,3000);}
  function hookLibrary(){
    ['saveFavorites','saveHealthyFoods','saveSavedMeals','saveCalorieAdvisorSettings'].forEach(function(n){
      var fn=window[n];if(typeof fn!=='function'||fn._bs)return;
      window[n]=function(){var r=fn.apply(this,arguments);try{scheduleLibrary();}catch(e){}return r;};window[n]._bs=true;
    });
  }

  window.beyondStrideShareNow=function(){shareRecent(30);};
  readLink();
  window.addEventListener('hashchange',readLink);
  window.addEventListener('load',function(){
    hook();hookLibrary();setTimeout(shareLibrary,2500);
    // Catch up the last week each time the page opens (days are only sent if they changed).
    setTimeout(function(){shareRecent(7);},1500);
    // Pick up finished runs, now and every minute while the page is open.
    setTimeout(pullRuns,1200);setTimeout(pullInbox,1600);
    setInterval(function(){if(document.visibilityState==='visible')pullRuns();},60000);
    setInterval(function(){if(document.visibilityState==='visible')pullInbox();},20000);
  });
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'&&cfg()&&typeof today!=='undefined')shareDay(dk(today));
    if(document.visibilityState==='visible'){pullRuns();pullInbox();}
  });
})();
