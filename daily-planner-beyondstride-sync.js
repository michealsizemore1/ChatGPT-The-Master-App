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
    // Picture: a product image link, or (database only) a small saved photo.
    if(x.imageUrl&&/^https?:/.test(x.imageUrl))o.image=String(x.imageUrl);
    else if(!withId&&x.imageData&&String(x.imageData).length<30000)o.image=String(x.imageData);
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
    if(f==='actSave'||f==='actDel'){applyActivity(e);return;}
    if(f==='actSettings'){applyActSettings(e);return;}
    if(f==='shoeSave'||f==='shoeDel'){applyShoe(e);return;}
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
    // A food or saved meal deleted in BeyondStride (✕): remove the first one with that name.
    if(f==='libDelete'){
      var dx=e.x||{},nm=String(dx.name||'');if(!nm)return;
      try{
        var get={fav:getFavorites,healthy:getHealthyFoods,meals:getSavedMeals}[dx.list],put={fav:saveFavorites,healthy:saveHealthyFoods,meals:saveSavedMeals}[dx.list];
        if(!get||!put)return;
        var arr=get()||[],i=arr.findIndex(function(x){return x&&x.name===nm;});
        if(i>=0){arr.splice(i,1);put(arr);}
        try{if(typeof renderFoodLibrarySearch==='function')renderFoodLibrarySearch();}catch(err){}
      }catch(err){}
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
      if(x.image&&/^https?:/.test(x.image))item.imageUrl=x.image;
      try{if(typeof looksLikeRestaurantFood==='function')item.restaurant=looksLikeRestaurantFood(item.name);}catch(err){}
      log.push(item);
    }else if(i<0)return;
    else if(e.f==='foodEdit'){if(x.servings!=null)log[i].servings=num(x.servings)||log[i].servings;if(x.meal)log[i].meal=x.meal;if(x.servingLabel)log[i].servingLabel=String(x.servingLabel);
      // Numbers typed in BeyondStride (per serving): every field is sent, blank ones as missing.
      if(x.full){['cal','prot','fat','carbs'].concat(FOOD_MICROS).forEach(function(k){log[i][k]=x[k]!=null&&x[k]!==''?num(x[k]):null;});if(x.name)log[i].name=String(x.name);}}
    else log.splice(i,1);
    if(viewed){try{renderFoodItems();}catch(err){}try{save();}catch(err){}}
    else{
      // Another day (or this page was left open since yesterday): keep its drink counters in step with its food,
      // the same way syncAutoLiquidCounters() does for the day on screen.
      try{
        var autoOz=function(meal){var t=0;log.forEach(function(it){if(it.meal!==meal)return;if(typeof isCaffeinatedBeverage==='function'&&isCaffeinatedBeverage(it))return;
          var oz=typeof parseFluidOzFromServingLabel==='function'?parseFluidOzFromServingLabel(it.servingLabel):0;
          if(!oz&&typeof lookupGusisServingOz==='function')oz=lookupGusisServingOz(it.name);t+=oz*(num(it.servings)||1);});return Math.round(t);};
        var sa=autoOz('sports'),la=autoOz('liquids');
        d.sportsDrinksOz=Math.max(0,num(d.sportsDrinksOz)+(sa-num(d.autoSportsDrinksOz)));d.autoSportsDrinksOz=sa;
        d.otherLiquidsOz=Math.max(0,num(d.otherLiquidsOz)+(la-num(d.autoOtherLiquidsOz)));d.autoOtherLiquidsOz=la;
      }catch(err){}
      localStorage.setItem(key,JSON.stringify(d));
    }
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

  // ── Activities for BeyondStride: every activity plus each card's extra lines (zones, heat, sleep, prev-day
  //    water / food / fuel impact), worked out here with the exact same code paths the Activities tab uses. ──
  var actSent='',actTimer=null,actWaits=0;
  function actExtras(acts){
    var out={},cp=typeof getCP==='function'?getCP():0;
    var ha={byDate:{}};try{ha=haBuildPercentMap(acts);}catch(e){}
    var byDate={};
    function dayCtx(date){
      if(byDate[date])return byDate[date];var c={};
      try{var raw=localStorage.getItem('planner_'+date);if(raw){var sd=JSON.parse(raw);var mins=parseSleepMins(sd.wSleepVal),sc=parseFloat(sd.wSleepScore)||0;
        if(mins)c.sleepMins=Math.round(mins);if(sc)c.sleepScore=Math.round(sc);}}catch(e){}
      try{var prev=new Date(date+'T00:00:00');prev.setDate(prev.getDate()-1);var pk=dk(prev);
        var pr=localStorage.getItem('planner_'+pk);if(pr){var pd=JSON.parse(pr);var o=parseFloat(pd.waterOz)||(parseFloat(pd.waterCount)*8||0);if(o>0)c.prevWaterOz=Math.round(o);}
        var nu=getNuDay(pk);if(nu&&nu.cal>0){c.prevCal=Math.round(nu.cal);if(nu.prot+nu.carbs+nu.fat>0){c.prevP=Math.round(nu.prot*4/nu.cal*100);c.prevC=Math.round(nu.carbs*4/nu.cal*100);c.prevF=Math.round(nu.fat*9/nu.cal*100);}}
        // Fuel impact: same scoring as the Activities card (food quality stretched, minus misses vs the hard-workout target).
        if(pr){var log=(JSON.parse(pr).foodLog)||[];if(log.length&&typeof runnerFoodQuality==='function'){
          var saved=today,qt=0,qw=0;try{today=prev;log.forEach(function(it){try{inferFoodMacroSources(it);}catch(e){}var q=runnerFoodQuality(it);var sv=Math.max(0.01,parseFloat(it.servings)||1);var w=Math.max(0,(parseFloat(it.cal)||0)*sv)||sv;qt+=q.score*w;qw+=w;});}finally{today=saved;}
          if(qw>0){var st=5+(qt/qw-5)*2.5,pen=0,notes=[];var preset=typeof nutritionPerformancePreset==='function'?nutritionPerformancePreset(pk):null;
            if(preset&&preset.phase==='prior'&&c.prevCal){var off=Math.abs(c.prevCal-preset.calories)/preset.calories;if(off>0.2){pen+=Math.min(3,(off-0.2)*10);notes.push(c.prevCal+' cal vs '+preset.calories+' target');}
              if(c.prevC!=null){var co=Math.abs(c.prevC-preset.carbs);if(co>10){pen+=Math.min(2,(co-10)/10);notes.push(c.prevC+'% carbs vs '+preset.carbs+'% target');}}}
            var imp=Math.max(0,Math.min(10,Math.round((st-pen)*10)/10));c.fuel=imp;c.fuelLabel=imp>=9?'Excellent':imp>=7?'Good':imp>=5?'Fair':imp>=3?'Low':'Poor';
            c.fuelNote=((preset&&preset.phase==='prior')?preset.label.replace('Tomorrow: ',''):'')+(notes.length?(preset?' · ':'')+notes.join(', '):'');}}}
      }catch(e){}
      byDate[date]=c;return c;
    }
    acts.forEach(function(a){
      var x={};
      try{var z=powerZone(a.power,cp);if(z)x.pz=z.z;}catch(e){}
      try{var h=hrZone(a.heartRate);if(h)x.hz=h.z;}catch(e){}
      try{if(a.temp&&a.pace){var hh=heatHumidityImpact(a.temp,a.humidity,parsePace(a.pace));if(hh&&hh.pctSlower>=0.5){x.hhPct=Math.round(hh.pctSlower*10)/10;x.hhSec=Math.round(hh.secSlower);x.feels=Math.round(hh.feelsLike);}}}catch(e){}
      if(a.date&&ha.byDate&&ha.byDate[a.date]!==undefined){x.ha=ha.byDate[a.date];try{var hi=haStatusInfo(x.ha);x.haLabel=hi.label;x.haColor=hi.color;}catch(e){}}
      if(a.date){var dc=dayCtx(a.date);for(var k in dc)x[k]=dc[k];}
      // Firebase keys can't contain . $ # [ ] / (some imported activities have ids like 1699999999999.123).
      out[String(a.id).replace(/[.$#\[\]\/]/g,'_')||'_']=x;
    });
    return out;
  }
  // Small status note BeyondStride can show if Activities don't arrive.
  function actStatus(o){var c=cfg();if(!c)return;o.at=Date.now();try{fetch(c.db+'/nutrition/'+encodeURIComponent(c.key)+'/activitiesStatus.json',{method:'PUT',body:JSON.stringify(o)}).catch(function(){});}catch(e){}}
  function shareActivities(){
    try{shareActivitiesInner();}catch(err){actStatus({ok:false,stage:'error',err:String(err&&err.stack||err).slice(0,400)});}
  }
  function shareActivitiesInner(){
    var c=cfg();if(!c){return;}if(typeof getActivities!=='function'){actStatus({ok:false,stage:'no getActivities'});return;}
    if(typeof _activitiesLargeCache!=='undefined'&&!Array.isArray(_activitiesLargeCache)){actWaits=(actWaits||0)+1;if(actWaits===8)actStatus({ok:false,stage:'waiting for activities to load'});clearTimeout(actTimer);actTimer=setTimeout(shareActivities,1500);return;}
    var acts=getActivities()||[];
    // Firebase refuses keys with . $ # [ ] / and the whole upload fails, so nested data is cleaned first.
    function clean(v,depth){
      if(v==null||typeof v==='function')return undefined;
      if(typeof v==='number')return isFinite(v)?v:undefined;
      if(typeof v==='string')return v.length>20000?undefined:v;
      if(typeof v!=='object')return v;
      if(depth>4)return undefined;
      if(Array.isArray(v))return v.slice(0,400).map(function(x){var c=clean(x,depth+1);return c===undefined?null:c;});
      var o={};for(var k in v){if(!Object.prototype.hasOwnProperty.call(v,k))continue;var c=clean(v[k],depth+1);if(c===undefined)continue;o[String(k).replace(/[.$#\[\]\/]/g,'_')||'_']=c;}return o;
    }
    var list=acts.map(function(a){var o={};for(var k in a){var v=a[k];if(v===''||v==null||v===0)continue;var c=clean(v,1);if(c===undefined)continue;o[String(k).replace(/[.$#\[\]\/]/g,'_')]=c;}return o;});
    // Phase 2: zone settings, mileage goals, journal-only miles (days with no activity) and shoes.
    var goals={};try{['week','month','year'].forEach(function(p){goals[p]=getActGoal(p)||0;});}catch(e){}
    var zonesNote='';try{var tz=localStorage.getItem('training_zones_updated_at');if(tz){var td=new Date(tz);if(!isNaN(td.getTime()))zonesNote='Updated '+td.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}}catch(e){}
    var exMiles={};try{var y0=new Date().getFullYear()+'-01-01',prev=new Date();prev.setDate(prev.getDate()-14);var w0=dk(prev);
      for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||k.indexOf('planner_')!==0)continue;var ds=k.slice(8);if(!(ds>=y0||ds>=w0))continue;
        try{var dd=JSON.parse(localStorage.getItem(k));var m=parseFloat(dd&&dd.exMiles)||0;if(m)exMiles[ds]=m;}catch(e){}}}catch(e){}
    var shoes=[];try{shoes=clean(getShoes(),1)||[];}catch(e){}
    var payload={list:list,extras:actExtras(acts),settings:{cp:typeof getCP==='function'?getCP():0,maxHr:typeof getMaxHR==='function'?getMaxHR():0,restHr:typeof getRestingHR==='function'?getRestingHR():0,zonesNote:zonesNote},
      goals:goals,exMiles:exMiles,shoes:shoes,updated:Date.now()};
    var cmp=JSON.stringify([payload.list,payload.extras,payload.settings,payload.goals,payload.exMiles,payload.shoes]);
    if(cmp===actSent)return;
    var body=JSON.stringify(payload);
    actStatus({ok:null,stage:'sending',count:list.length,bytes:body.length});
    fetch(c.db+'/nutrition/'+encodeURIComponent(c.key)+'/activities.json',{method:'PUT',body:body})
      .then(function(r){if(r.ok){actSent=cmp;actStatus({ok:true,stage:'sent',count:list.length,bytes:body.length});}
        else r.text().then(function(t){actStatus({ok:false,stage:'refused',status:r.status,err:String(t).slice(0,300),count:list.length,bytes:body.length});});})
      .catch(function(e){actStatus({ok:false,stage:'network',err:String(e),count:list.length,bytes:body.length});});
  }
  function scheduleActivities(){clearTimeout(actTimer);actTimer=setTimeout(shareActivities,3000);}
  window.beyondStrideShareActivities=shareActivities;
  function hookActivities(){
    ['saveActivities','saveShoes','saveCPAndRender','saveMaxHRAndRender','saveRestHRAndRender','saveActGoalAndRender'].forEach(function(n){
      var fn=window[n];if(typeof fn!=='function'||fn._bs)return;
      window[n]=function(){var r=fn.apply(this,arguments);try{scheduleActivities();}catch(e){}return r;};window[n]._bs=true;
    });
  }
  // Zone settings / goals and shoes changed in BeyondStride.
  function applyActSettings(e){
    var x=e.x||{};
    if(x.cp>0)localStorage.setItem('cp_value',String(x.cp));
    if(x.maxHr>0)localStorage.setItem('max_hr_value',String(x.maxHr));
    if(x.restHr>0)localStorage.setItem('resting_hr_value',String(x.restHr));
    if(x.cp>0||x.maxHr>0||x.restHr>0)localStorage.setItem('training_zones_updated_at',new Date().toISOString());
    ['week','month','year'].forEach(function(p){if(x['goal_'+p]!=null){localStorage.setItem('act_goal_'+p+'_mi',x['goal_'+p]>0?String(x['goal_'+p]):'');
      if(p==='week'&&typeof syncWeeklyMilesGoal==='function')syncWeeklyMilesGoal(String(x['goal_'+p]||''));}});
    ['cpInput','hrMaxInput','restHrInput','actGoal_week','actGoal_month','actGoal_year'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
    try{renderActivities();}catch(err){}
    scheduleActivities();
  }
  function applyShoe(e){
    var x=e.x||{};if(typeof getShoes!=='function'||typeof saveShoes!=='function')return;
    var shoes=getShoes(),i=shoes.findIndex(function(s){return String(s.id)===String(x.id);});
    if(e.f==='shoeDel'){if(i>=0)shoes.splice(i,1);}
    else if(x.shoe){if(i>=0)shoes[i]=Object.assign(shoes[i],x.shoe);else shoes.push(x.shoe);}
    saveShoes(shoes);try{renderShoeList();}catch(err){}
  }
  // An activity added, changed or deleted in BeyondStride.
  function applyActivity(e){
    var x=e.x||{};if(typeof getActivities!=='function'||typeof saveActivities!=='function')return;
    var acts=getActivities().slice(),i=acts.findIndex(function(a){return String(a.id)===String(x.id);});
    if(e.f==='actDel'){if(i<0)return;acts.splice(i,1);}
    else{var a=x.act||{};if(!a.id)return;
      if(i<0)acts.push(a);else{var keep=acts[i];for(var k in a)keep[k]=a[k];(x.clear||[]).forEach(function(k){delete keep[k];});}}
    saveActivities(acts);
    try{renderActivities();}catch(err){}
  }

  window.beyondStrideShareNow=function(){shareRecent(30);};
  readLink();
  window.addEventListener('hashchange',readLink);
  window.addEventListener('load',function(){
    hook();hookLibrary();hookActivities();setTimeout(shareLibrary,2500);setTimeout(shareActivities,3500);
    // Catch up the last week each time the page opens (days are only sent if they changed).
    setTimeout(function(){shareRecent(7);},1500);
    // Pick up finished runs, now and every minute while the page is open.
    setTimeout(pullRuns,1200);setTimeout(pullInbox,1600);
    setInterval(function(){if(document.visibilityState==='visible')pullRuns();},60000);
    setInterval(function(){if(document.visibilityState==='visible')pullInbox();},20000);
  });
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'&&cfg()&&typeof today!=='undefined')shareDay(dk(today));
    if(document.visibilityState==='visible'){pullRuns();pullInbox();scheduleActivities();}
  });
})();
