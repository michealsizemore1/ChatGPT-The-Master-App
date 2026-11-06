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
  function r1(v){return Math.round(v*10)/10;}

  // Totals for one day's food log (same math as the Nutrition tab: amount × servings).
  function summarize(log){
    var t={cal:0,prot:0,carbs:0,fat:0,fiber:0,sugar:0,sodium:0,caffeine:0},meals={},items=[];
    (log||[]).forEach(function(x){
      var s=num(x.servings)||1;
      t.cal+=num(x.cal)*s;t.prot+=num(x.prot)*s;t.carbs+=num(x.carbs)*s;t.fat+=num(x.fat)*s;
      t.fiber+=num(x.fiber)*s;t.sugar+=num(x.sugar)*s;t.sodium+=num(x.sodium)*s;t.caffeine+=num(x.caffeine)*s;
      var m=x.meal||'other';meals[m]=(meals[m]||0)+num(x.cal)*s;
      if(items.length<60)items.push({meal:m,name:String(x.name||'').slice(0,60),cal:Math.round(num(x.cal)*s),prot:r1(num(x.prot)*s),carbs:r1(num(x.carbs)*s),fat:r1(num(x.fat)*s)});
    });
    Object.keys(t).forEach(function(k){t[k]=k==='cal'||k==='sodium'||k==='caffeine'?Math.round(t[k]):r1(t[k]);});
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
    if(d){var w=num(d.waterOz)||(num(d.waterCount)*8);w+=num(d.sportsDrinksOz)+num(d.otherLiquidsOz);if(w)rec.waterOz=Math.round(w);
      var wt=num(d.wWghtVal);if(wt>70&&wt<600)rec.weight=r1(wt);}
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
  }

  window.beyondStrideShareNow=function(){shareRecent(30);};
  readLink();
  window.addEventListener('hashchange',readLink);
  window.addEventListener('load',function(){
    hook();
    // Catch up the last week each time the page opens (days are only sent if they changed).
    setTimeout(function(){shareRecent(7);},1500);
  });
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&cfg()&&typeof today!=='undefined')shareDay(dk(today));});
})();
