function getShoes(){try{return JSON.parse(localStorage.getItem('shoe_tracker')||'[]');}catch(e){return[];}}
function saveShoes(arr){localStorage.setItem('shoe_tracker',JSON.stringify(arr));}

function toggleShoeTracker(){
  var panel=document.getElementById('shoeTrackerPanel');
  var arrow=document.getElementById('shoeTrackerArrow');
  if(!panel)return;
  var open=panel.style.display==='none';
  panel.style.display=open?'block':'none';
  if(arrow)arrow.innerHTML=open?'&#x25BC;':'&#x25B6;';
  if(open)renderShoeList();
}

function openAddShoeModal(){
  document.getElementById('shoeModalTitle').textContent='👟 Add Shoe';
  document.getElementById('shoeEditId').value='';
  document.getElementById('shoeNameInput').value='';
  document.getElementById('shoeBrandInput').value='';
  document.getElementById('shoeColorInput').value='';
  document.getElementById('shoeStartDateInput').value=dk(new Date());
  document.getElementById('shoeMaxMilesInput').value='500';
  document.getElementById('shoeOffsetMilesInput').value='0';
  document.getElementById('shoeNotesInput').value='';
  var modal=document.getElementById('shoeModal');
  modal.style.display='flex';
}

function closeShoeModal(){
  document.getElementById('shoeModal').style.display='none';
}

function saveShoe(){
  var name=(document.getElementById('shoeNameInput').value||'').trim();
  if(!name){alert('Please enter a shoe name.');return;}
  var shoes=getShoes();
  var editId=document.getElementById('shoeEditId').value;
  var shoe={
    id:editId||String(Date.now()),
    name:name,
    brand:(document.getElementById('shoeBrandInput').value||'').trim(),
    color:(document.getElementById('shoeColorInput').value||'').trim(),
    startDate:document.getElementById('shoeStartDateInput').value||dk(new Date()),
    maxMiles:parseFloat(document.getElementById('shoeMaxMilesInput').value)||500,
    offsetMiles:parseFloat(document.getElementById('shoeOffsetMilesInput').value)||0,
    notes:(document.getElementById('shoeNotesInput').value||'').trim(),
    retired:false
  };
  if(editId){
    var idx=shoes.findIndex(function(s){return s.id===editId;});
    if(idx>=0){shoe.retired=shoes[idx].retired;shoes[idx]=shoe;}
    else shoes.push(shoe);
  } else {
    shoes.push(shoe);
  }
  saveShoes(shoes);
  closeShoeModal();
  renderShoeList();
}

function editShoe(id){
  var shoes=getShoes();
  var shoe=shoes.find(function(s){return s.id===id;});
  if(!shoe)return;
  document.getElementById('shoeModalTitle').textContent='✏️ Edit Shoe';
  document.getElementById('shoeEditId').value=shoe.id;
  document.getElementById('shoeNameInput').value=shoe.name||'';
  document.getElementById('shoeBrandInput').value=shoe.brand||'';
  document.getElementById('shoeColorInput').value=shoe.color||'';
  document.getElementById('shoeStartDateInput').value=shoe.startDate||'';
  document.getElementById('shoeMaxMilesInput').value=shoe.maxMiles||500;
  document.getElementById('shoeOffsetMilesInput').value=shoe.offsetMiles||0;
  document.getElementById('shoeNotesInput').value=shoe.notes||'';
  document.getElementById('shoeModal').style.display='flex';
}

function toggleRetireShoe(id){
  var shoes=getShoes();
  var shoe=shoes.find(function(s){return s.id===id;});
  if(!shoe)return;
  shoe.retired=!shoe.retired;
  saveShoes(shoes);
  renderShoeList();
}

function deleteShoe(id){
  if(!confirm('Delete this shoe?'))return;
  var shoes=getShoes().filter(function(s){return s.id!==id;});
  saveShoes(shoes);
  renderShoeList();
}

function shoeCalcMiles(shoe){
  // Sum miles from activities on or after the shoe's startDate
  var acts=getActivities();
  var start=shoe.startDate?new Date(shoe.startDate+'T00:00:00'):null;
  var total=0;
  acts.forEach(function(a){
    if(!a.date)return;
    var d=new Date(a.date+'T00:00:00');
    if(start&&d<start)return;
    var miles=parseFloat(a.distance)||0;
    if((a.distUnit||'').toLowerCase()==='km')miles=miles*0.621371;
    total+=miles;
  });
  return Math.round((total+(parseFloat(shoe.offsetMiles)||0))*100)/100;
}

function renderShoeList(){
  var shoes=getShoes();
  var listDiv=document.getElementById('shoeList');
  var empty=document.getElementById('shoeEmpty');
  if(!listDiv)return;
  if(!shoes.length){
    listDiv.innerHTML='';
    if(empty)empty.style.display='block';
    return;
  }
  if(empty)empty.style.display='none';
  // Sort: active first, then retired
  var active=shoes.filter(function(s){return !s.retired;});
  var retired=shoes.filter(function(s){return s.retired;});
  var sorted=active.concat(retired);
  listDiv.innerHTML=sorted.map(function(shoe){
    var miles=shoeCalcMiles(shoe);
    var max=parseFloat(shoe.maxMiles)||500;
    var pct=Math.min(Math.round(miles/max*100),100);
    var barColor=pct<60?'#22c55e':pct<85?'#f59e0b':'#ef4444';
    var remaining=Math.max(0,Math.round((max-miles)*10)/10);
    var status=shoe.retired?'RETIRED':pct>=100?'⚠️ REPLACE':'Active';
    var statusColor=shoe.retired?'#94a3b8':pct>=100?'#ef4444':'#22c55e';
    var cardBg=shoe.retired?'#f8f8f8':'#fff';
    var cardBorder=shoe.retired?'#e5e7eb':'#fdba74';
    return '<div style="background:'+cardBg+';border:1px solid '+cardBorder+';border-radius:12px;padding:14px 16px;opacity:'+(shoe.retired?0.7:1)+';">'
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">'
      +'<div>'
      +'<div style="font-size:0.95rem;font-weight:700;color:#1e293b;margin-bottom:2px;">&#x1F45F; '+shoe.name+'</div>'
      +(shoe.brand||shoe.color?'<div style="font-size:0.75rem;color:#64748b;">'+(shoe.brand||'')+(shoe.brand&&shoe.color?' · ':''+(shoe.color||''))+'</div>':'')
      +'<div style="margin-top:4px;display:inline-block;background:'+statusColor+';color:#fff;font-size:0.65rem;font-weight:700;padding:2px 7px;border-radius:10px;text-transform:uppercase;">'+status+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:5px;flex-shrink:0;">'
      +'<button onclick="editShoe(\''+shoe.id+'\')" style="background:#f1f5f9;color:#475569;border:none;border-radius:6px;padding:5px 9px;font-size:0.75rem;cursor:pointer;">✏️ Edit</button>'
      +'<button onclick="toggleRetireShoe(\''+shoe.id+'\')" style="background:'+(shoe.retired?'#d1fae5':'#fff7ed')+';color:'+(shoe.retired?'#15803d':'#92400e')+';border:1px solid '+(shoe.retired?'#86efac':'#fcd34d')+';border-radius:6px;padding:5px 9px;font-size:0.75rem;cursor:pointer;">'+(shoe.retired?'↩ Unretire':'📦 Retire')+'</button>'
      +'<button onclick="deleteShoe(\''+shoe.id+'\')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:5px 8px;font-size:0.75rem;cursor:pointer;">🗑</button>'
      +'</div>'
      +'</div>'
      // Progress bar
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
      +'<div style="flex:1;background:#e5e7eb;border-radius:99px;height:10px;overflow:hidden;">'
      +'<div style="width:'+pct+'%;background:'+barColor+';height:100%;border-radius:99px;transition:width 0.4s;"></div>'
      +'</div>'
      +'<span style="font-size:0.75rem;font-weight:700;color:'+barColor+';min-width:35px;text-align:right;">'+pct+'%</span>'
      +'</div>'
      // Stats row
      +'<div style="display:flex;gap:16px;flex-wrap:wrap;">'
      +'<div style="text-align:center;">'
      +'<div style="font-size:1.05rem;font-weight:700;color:#1e293b;">'+miles.toFixed(1)+'</div>'
      +'<div style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;">Current mi</div>'
      +'</div>'
      +'<div style="text-align:center;">'
      +'<div style="font-size:1.05rem;font-weight:700;color:#64748b;">'+max+'</div>'
      +'<div style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;">Max mi</div>'
      +'</div>'
      +(shoe.retired?'':'<div style="text-align:center;">'
      +'<div style="font-size:1.05rem;font-weight:700;color:'+(remaining<50?'#ef4444':'#22c55e')+';">'+remaining+'</div>'
      +'<div style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;">Remaining</div>'
      +'</div>')
      +(shoe.startDate?'<div style="text-align:center;">'
      +'<div style="font-size:0.85rem;font-weight:600;color:#475569;">'+new Date(shoe.startDate+'T00:00:00').toLocaleDateString()+'</div>'
      +'<div style="font-size:0.65rem;color:#94a3b8;text-transform:uppercase;">Date added</div>'
      +'</div>':'')
      +'</div>'
      +(shoe.notes?'<div style="margin-top:8px;font-size:0.78rem;color:#64748b;border-top:1px solid #f1f5f9;padding-top:6px;">'+shoe.notes+'</div>':'')
      +'</div>';
  }).join('');
}
/* ========= END SHOE TRACKER ========= */

