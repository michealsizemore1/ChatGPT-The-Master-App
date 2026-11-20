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
  window.ccNative={
    version:1,
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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
  setTimeout(hook,1500);
})();
