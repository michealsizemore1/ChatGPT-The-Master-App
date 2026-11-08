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
      cb(keys.map(function(k){return (keys.length>1?nice(k)+':\n':'')+String((o[k]||{}).text||'').trim();}).join('\n\n'));
    }).catch(function(){if(!done){done=true;clearTimeout(t);cb('');}});
  };

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
  function render(text){
    var b=box();if(!b)return;b._text=text;
    var head='&#x1F3C3; <strong>From BeyondStride</strong> '+(text?'<span style="opacity:.7">('+(open?'tap to hide':'tap to see what AI Fill uses')+')</span>':'<span style="opacity:.7">— nothing shared for this day yet</span>');
    b.innerHTML=head+(open&&text?'<pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0;line-height:1.4;">'+text.replace(/[&<]/g,function(c){return c==='&'?'&amp;':'&lt;';})+'</pre>':'');
  }
  function refresh(force){
    if(typeof dk!=='function'||typeof today==='undefined')return;
    var k=dk(today);if(!force&&k===shownFor)return;shownFor=k;
    if(!box())return;
    window.bsReviewFetch(k,k,render);
  }
  setInterval(function(){refresh(false);},3000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh(true);});
  setTimeout(function(){refresh(true);},1500);
})();
