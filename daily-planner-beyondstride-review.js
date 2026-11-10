// ══════════════════════════════════════════════════════
// BEYONDSTRIDE → DAILY / WEEKLY REVIEW (read-only)
// BeyondStride posts a short summary of each day (runs, training plan, sleep / HRV / readiness, nutrition)
// to <db>/nutrition/<key>/beyondstride/daily/<yyyy-mm-dd>. This page only READS it: AI Fill Day Review and
// AI Fill Review include it, and the Daily AI Review shows a "From BeyondStride" box. Nothing is sent back.
// The database link comes from BeyondStride (Settings → Stand-alone & cloud copy → Link the Command Center review),
// which opens this page with #bsr=<base64url "db|key">; a link saved earlier is reused.
// ══════════════════════════════════════════════════════
(function(){
  var CFG_KEY='beyondstride_sync';
  function cfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||'null');}catch(e){return null;}}
  (function readLink(){
    var m=(location.hash||'').match(/[#&]bsr?=([A-Za-z0-9_-]+)/);if(!m)return;
    try{var b64=m[1].replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
      var parts=atob(b64).split('|');
      if(parts.length===2&&/^https:\/\//.test(parts[0])&&parts[1].length>=16)localStorage.setItem(CFG_KEY,JSON.stringify({db:parts[0].replace(/\/$/,''),key:parts[1]}));
    }catch(e){}
  })();

  function nice(k){try{return new Date(k+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}catch(e){return k;}}

  // Day-by-day text for [from..to] (yyyy-mm-dd), or '' when not linked / nothing there.
  window.bsReviewFetch=function(from,to,cb){
    var c=cfg();if(!c||!c.db||!c.key){cb('');return;}
    var url=c.db+'/nutrition/'+encodeURIComponent(c.key)+'/beyondstride/daily.json?orderBy=%22%24key%22&startAt=%22'+from+'%22&endAt=%22'+to+'%22';
    var done=false,t=setTimeout(function(){if(!done){done=true;cb('');}},12000);
    fetch(url).then(function(r){return r.ok?r.json():null;}).then(function(o){
      if(done)return;done=true;clearTimeout(t);
      if(!o){cb('');return;}
      var keys=Object.keys(o).sort();
      if(keys.length===1)lastDay={key:keys[0],data:o[keys[0]]};
      cb(keys.map(function(k){return (keys.length>1?nice(k)+':\n':'')+String((o[k]||{}).text||'').trim();}).join('\n\n'));
    }).catch(function(){if(!done){done=true;clearTimeout(t);cb('');}});
  };

  var lastDay=null;

  // Wellness: Sleep, Weight and Resting HR fill in from BeyondStride. A value you typed yourself is never replaced;
  // one BeyondStride filled earlier is kept up to date.
  var FIELDS={sleep:'wSleepVal',weight:'wWghtVal',restHr:'wRestHRVal'};
  function fillWellness(k,data){
    var w=data&&data.wellness;if(!w||typeof dk!=='function'||dk(today)!==k)return;
    var store='bsAutoWellness_'+k,prev={};try{prev=JSON.parse(localStorage.getItem(store)||'{}');}catch(e){}
    var changed=false;
    Object.keys(FIELDS).forEach(function(f){
      if(w[f]==null||w[f]==='')return;
      var el=document.getElementById(FIELDS[f]);if(!el)return;
      var v=String(w[f]),cur=el.value.trim();
      if(cur!==''&&cur!==String(prev[f]||''))return;   // typed by hand: leave it
      if(cur!==v){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));changed=true;}
      prev[f]=v;
    });
    try{localStorage.setItem(store,JSON.stringify(prev));}catch(e){}
    if(changed&&typeof v26Toast==='function')v26Toast('Sleep / weight / resting HR filled from BeyondStride');
  }

  // "From BeyondStride" box in the Daily AI Review (collapsed; tap to open).
  var shownFor='',open=false;
  function box(){
    var sec=document.getElementById('dayReviewSection');if(!sec||!cfg())return null;
    var b=document.getElementById('bsDayBox');
    if(!b){b=document.createElement('div');b.id='bsDayBox';
      b.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#eef2ff;border:1px solid #c7d2fe;font-size:0.85rem;color:#312e81;';
      var grid=sec.querySelector('.review-grid');sec.insertBefore(b,grid||null);
      b.addEventListener('click',function(){open=!open;render(b._text||'');});}
    return b;
  }
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var GROUPS=[
    ['&#x1F3C3; Run',/^(workout|planned vs done)/i],
    ['&#x1F4C5; Plan',/^(planned|tomorrow|plan week|race day)/i],
    ['&#x1F634; Recovery',/^(sleep|morning check|readiness|hrv|resting)/i],
    ['&#x1F37D;&#xFE0F; Nutrition',/^(calories|food quality|micronutrients|low|over limit|fluids|protein|carbs)/i],
    ['&#x2696;&#xFE0F; Body',/^(weight)/i]];
  function chip(t,c){return '<span style="display:inline-block;margin:3px 4px 0 0;padding:3px 9px;border-radius:999px;background:'+(c||'#fff')+';border:1px solid #c7d2fe;font-size:.88rem;white-space:nowrap;">'+esc(t)+'</span>';}
  function row(label,val){return '<div style="padding:7px 0;border-top:1px solid #dbe2ff;text-align:left;"><div style="font-weight:600;color:#4338ca;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em;margin-bottom:2px;">'+esc(label)+'</div><div style="text-align:left;">'+val+'</div></div>';}
  function workout(v){
    var notes='',i=v.indexOf(' — notes: ');if(i>=0){notes=v.slice(i+10);v=v.slice(0,i);}
    var parts=v.split(' · '),title=parts.slice(0,2).join(' · ');
    var h='<div style="font-weight:700;font-size:1rem;">'+esc(title)+'</div><div>'+parts.slice(2).map(function(x){return chip(x);}).join('')+'</div>';
    if(notes)h+='<div style="margin-top:8px;padding:8px 10px;border-left:3px solid #818cf8;background:#fff;border-radius:6px;font-style:italic;line-height:1.45;">'+esc(notes)+'</div>';
    return h;}
  function value(label,v){
    if(/^workout/i.test(label))return workout(v);
    if(/^planned vs done/i.test(label)){var up=v.indexOf('▲')>=0;return '<span style="font-weight:600;color:'+(up?'#b45309':'#047857')+';">'+esc(v)+'</span>';}
    if(/^low/i.test(label))return v.split(', ').map(function(x){return chip(x,'#fff4e5');}).join('');
    if(/^over limit/i.test(label))return v.split(', ').map(function(x){return chip(x,'#ffe4e6');}).join('');
    if(v.indexOf(' · ')>=0&&v.length<120&&v.indexOf('(')<0)return v.split(' · ').map(function(x,j){return j===0?'<span style="font-weight:600;">'+esc(x)+'</span><br>':chip(x);}).join('');
    return '<span style="line-height:1.45;">'+esc(v)+'</span>';}
  function pretty(text){
    var buckets=GROUPS.map(function(){return [];}),other=[];
    text.split('\n').forEach(function(l){l=l.trim();if(!l)return;
      var m=l.match(/^([^:]{1,24}):\s*(.*)$/),label=m?m[1]:l,val=m?m[2]:'';
      if(!m){var w=l.match(/^(plan week)\s*(.*)$/i);if(w){label='Plan week';val=w[2];}}
      var gi=-1;for(var g=0;g<GROUPS.length;g++){if(GROUPS[g][1].test(label)){gi=g;break;}}
      (gi>=0?buckets[gi]:other).push([label,val]);});
    var out='';
    GROUPS.forEach(function(g,gi){if(!buckets[gi].length)return;
      out+='<div style="margin-top:12px;padding:8px 12px 4px;background:#f8f9ff;border:1px solid #dbe2ff;border-radius:10px;"><div style="font-weight:700;font-size:.95rem;margin-bottom:4px;">'+g[0]+'</div>'+
        buckets[gi].map(function(r){return row(r[0],value(r[0],r[1]));}).join('')+'</div>';});
    if(other.length)out+='<div style="margin-top:12px;padding:8px 12px 4px;background:#f8f9ff;border:1px solid #dbe2ff;border-radius:10px;"><div style="font-weight:700;font-size:.95rem;margin-bottom:4px;">More</div>'+other.map(function(r){return row(r[0],value(r[0],r[1]));}).join('')+'</div>';
    return out;}
  // The box is no longer shown (AI Fill still reads the same information).
  var SHOW_BOX=false;
  function render(text){
    if(!SHOW_BOX)return;
    var b=box();if(!b)return;b._text=text;
    var head='&#x1F3C3; <strong>From BeyondStride</strong> '+(text?'<span style="opacity:.7">('+(open?'tap to hide':'tap to see what AI Fill uses')+')</span>':'<span style="opacity:.7">— nothing shared for this day yet</span>');
    b.innerHTML=head+(open&&text?'<div style="font-size:.95rem;color:#1e1b4b;text-align:left;">'+pretty(text)+'</div>':'');
  }
  // Training plan days for My Schedule (BeyondStride holds the plan now).
  var planAt=0;
  function fetchPlan(){
    var c=cfg();if(!c||!c.db||!c.key||Date.now()-planAt<10*60000)return;planAt=Date.now();
    fetch(c.db+'/nutrition/'+encodeURIComponent(c.key)+'/beyondstride/plan.json').then(function(r){return r.ok?r.json():null;}).then(function(o){
      if(!o||!o.days)return;var before=localStorage.getItem('bs_plan_days'),now=JSON.stringify({days:o.days,at:o.at||0});
      if(before===now)return;try{localStorage.setItem('bs_plan_days',now);}catch(e){}
      try{if(typeof renderJournalSchedule==='function')renderJournalSchedule();}catch(e2){}
    }).catch(function(){});
  }
  function refresh(force){
    if(typeof dk!=='function'||typeof today==='undefined')return;
    var k=dk(today);if(!force&&k===shownFor)return;shownFor=k;
    if(!cfg())return;
    fetchPlan();
    window.bsReviewFetch(k,k,function(text){render(text);if(lastDay&&lastDay.key===k)fillWellness(k,lastDay.data);});
  }
  setInterval(function(){refresh(false);},3000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh(true);});
  setTimeout(function(){refresh(true);},1500);
})();
