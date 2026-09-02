(function(){
  'use strict';
  var STORAGE='meridian_money_data_v5';
  var CATEGORIES=['Books','Dining & Coffee','Entertainment','Groceries','Health & Fitness','Housing','Insurance','Other','Personal Care','Personal Support','Pets','Service','Shopping','Subscriptions','Transportation','Travel','Utilities'];
  var rules=[
    ['Groceries',/\b(milk|bread|egg|cheese|fruit|apple|banana|berry|vegetable|lettuce|meat|beef|chicken|pork|rice|pasta|cereal|yogurt|coffee|tea|juice|water|snack|cookie|chips|grocery|produce|frozen|sauce|flour|sugar)\b/i],
    ['Dining & Coffee',/\b(burger|sandwich|pizza|latte|mocha|espresso|meal|combo|restaurant|cafe|tip)\b/i],
    ['Transportation',/\b(gas|fuel|oil change|parking|tire|auto|car wash|uber|lyft)\b/i],
    ['Personal Care',/\b(shampoo|conditioner|soap|deodorant|tooth|lotion|cosmetic|makeup|hair|razor)\b/i],
    ['Health & Fitness',/\b(medicine|pharmacy|vitamin|supplement|protein|prescription|medical|fitness|gym)\b/i],
    ['Pets',/\b(pet|dog|cat|litter|kibble|veterinary|vet)\b/i],
    ['Books',/\b(book|magazine|paperback|hardcover|kindle)\b/i],
    ['Entertainment',/\b(movie|game|ticket|music|toy)\b/i],
    ['Utilities',/\b(electric|power|water service|internet|phone service|utility)\b/i],
    ['Housing',/\b(rent|mortgage|home repair|hardware|lumber|paint)\b/i],
    ['Shopping',/\b(clothing|shirt|pants|shoe|jacket|dress|household|decor|electronics)\b/i]
  ];
  function categoryFor(name){for(var i=0;i<rules.length;i++)if(rules[i][1].test(name))return rules[i][0];return'Shopping';}
  function money(v){var n=Number(String(v||'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.abs(n):0;}
  function parseReceipt(text){
    var rows=[],lines=String(text||'').split(/\r?\n/).map(function(x){return x.replace(/\s+/g,' ').trim();}).filter(Boolean);
    lines.forEach(function(line){
      var m=line.match(/^(.*?)[\s.]+\$?(-?\d{1,4}[.,]\d{2})\s*[A-Z]?$|^(.*?)\s+\$?(\d{1,4})\s+(\d{2})$/i);
      if(!m)return;var name=(m[1]||m[3]||'').replace(/^[*#-]+|\s+[A-Z]$/g,'').trim(),price=money(m[2]||(m[4]+'.'+m[5]));
      if(!name||!price||/\b(sub\s*total|total|balance|cash|change|credit|debit|visa|mastercard|amount due|tender)\b/i.test(name))return;
      rows.push({name:name,price:price,category:/\b(tax)\b/i.test(name)?'Other':categoryFor(name)});
    });
    return rows;
  }
  function readData(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch(e){return{};}}
  function uid(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);}
  function today(){var d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,10);}
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});}
  function merchantFrom(text){return String(text||'').split(/\r?\n/).map(function(x){return x.trim();}).find(function(x){return x.length>2&&!/receipt|welcome|thank|\d{3}/i.test(x);})||'Receipt purchase';}
  function fileData(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=reject;r.readAsDataURL(file);});}
  function modalShell(){
    var old=document.getElementById('receiptScanReview');if(old)old.remove();var wrap=document.createElement('div');wrap.id='receiptScanReview';
    wrap.innerHTML='<div class="rs-backdrop"></div><section class="rs-panel" role="dialog" aria-modal="true" aria-label="Review receipt items"><div class="rs-head"><div><b>Receipt Item Review</b><span id="rsStatus">Reading receipt…</span></div><button id="rsClose" type="button">×</button></div><div id="rsBody" class="rs-body"><div class="rs-loading">Finding item names and prices…</div></div></section>';
    document.body.appendChild(wrap);wrap.querySelector('#rsClose').onclick=function(){wrap.remove();};return wrap;
  }
  function styles(){if(document.getElementById('receiptScannerStyles'))return;var s=document.createElement('style');s.id='receiptScannerStyles';s.textContent='#receiptScanReview{position:fixed;inset:0;z-index:2147483640;font-family:Inter,system-ui,sans-serif}.rs-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.62)}.rs-panel{position:absolute;left:50%;top:4vh;transform:translateX(-50%);width:min(94vw,680px);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.3)}.rs-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:start;padding:18px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.rs-head b{display:block;font-size:19px;color:#1e293b}.rs-head span{display:block;margin-top:3px;font-size:12px;color:#64748b}.rs-head button{border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;font-size:24px}.rs-body{padding:16px 20px 22px}.rs-loading{padding:34px;text-align:center;color:#64748b}.rs-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.rs-fields label,.rs-item label{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700}.rs-fields input,.rs-fields select,.rs-item input,.rs-item select{width:100%;margin-top:4px;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:14px;background:#fff}.rs-item{display:grid;grid-template-columns:minmax(0,1fr) 155px 92px 30px;gap:8px;align-items:end;padding:10px 0;border-top:1px solid #e2e8f0}.rs-remove{height:38px;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:8px}.rs-add,.rs-import{border:0;border-radius:9px;padding:11px 14px;font-weight:800}.rs-add{background:#eef2ff;color:#4338ca}.rs-import{float:right;background:#4f46e5;color:#fff}.rs-summary{margin-top:14px;padding-top:14px;border-top:2px solid #e2e8f0;font-weight:800}.rs-note{clear:both;padding-top:12px;font-size:11px;color:#64748b}@media(max-width:560px){.rs-panel{top:2vh;max-height:96vh}.rs-fields{grid-template-columns:1fr}.rs-item{grid-template-columns:1fr 1fr}.rs-remove{width:100%}}';document.head.appendChild(s);}
  function showReview(wrap,rows,text,dataUrl){
    var data=readData(),accounts=(data.accounts||[]).filter(function(a){return a.type!=='investment'&&a.type!=='loan';}),merchant=merchantFrom(text),body=wrap.querySelector('#rsBody');wrap.querySelector('#rsStatus').textContent=rows.length+' item'+(rows.length===1?'':'s')+' detected — verify before importing';
    body.innerHTML='<div class="rs-fields"><label>Merchant<input id="rsMerchant" value="'+escapeHtml(merchant)+'"></label><label>Account<select id="rsAccount">'+accounts.map(function(a){return'<option value="'+escapeHtml(a.id)+'">'+escapeHtml(a.name)+'</option>';}).join('')+'</select></label><label>Date<input id="rsDate" type="date" value="'+today()+'"></label><label>Paid by<select id="rsPerson"><option>Joint</option><option>Michael</option><option>Cynthia</option></select></label></div><div id="rsItems"></div><button class="rs-add" id="rsAdd" type="button">+ Add item</button><button class="rs-import" id="rsImport" type="button">Import receipt items</button><div class="rs-summary">Receipt item total: <span id="rsTotal">$0.00</span></div><div class="rs-note">Review every suggestion. Receipt printing and image quality can affect item recognition.</div>';
    function options(selected){return CATEGORIES.map(function(c){return'<option'+(c===selected?' selected':'')+'>'+c+'</option>';}).join('');}
    function render(){var list=body.querySelector('#rsItems');list.innerHTML=rows.map(function(r,i){return'<div class="rs-item" data-i="'+i+'"><label>Item<input class="rs-name" value="'+escapeHtml(r.name)+'"></label><label>Category<select class="rs-category">'+options(r.category)+'</select></label><label>Price<input class="rs-price" type="number" min="0" step="0.01" value="'+r.price.toFixed(2)+'"></label><button class="rs-remove" type="button" aria-label="Remove item">×</button></div>';}).join('');sync();}
    function sync(){body.querySelectorAll('.rs-item').forEach(function(el){var i=+el.dataset.i;el.querySelector('.rs-name').oninput=function(e){rows[i].name=e.target.value;};el.querySelector('.rs-category').onchange=function(e){rows[i].category=e.target.value;};el.querySelector('.rs-price').oninput=function(e){rows[i].price=money(e.target.value);total();};el.querySelector('.rs-remove').onclick=function(){rows.splice(i,1);render();};});total();}
    function total(){body.querySelector('#rsTotal').textContent='$'+rows.reduce(function(sum,r){return sum+money(r.price);},0).toFixed(2);}
    body.querySelector('#rsAdd').onclick=function(){rows.push({name:'',category:'Shopping',price:0});render();};
    body.querySelector('#rsImport').onclick=function(){var clean=rows.filter(function(r){return r.name.trim()&&money(r.price)>0;});if(!clean.length){alert('Add at least one item with a price.');return;}var current=readData(),date=body.querySelector('#rsDate').value||today(),accountId=body.querySelector('#rsAccount').value||(current.accounts&&current.accounts[0]&&current.accounts[0].id)||'',person=body.querySelector('#rsPerson').value,store=body.querySelector('#rsMerchant').value.trim()||'Receipt purchase';current.transactions=current.transactions||[];clean.forEach(function(r){current.transactions.unshift({id:uid(),date:date,merchant:store+' — '+r.name.trim(),amount:-money(r.price),category:r.category,accountId:accountId,person:person,tags:['Receipt Scan'],tripId:'',notes:'Imported from itemized receipt',receipt:dataUrl,cleared:false,excludeFromBudget:false,needsReview:false});});localStorage.setItem(STORAGE,JSON.stringify(current));wrap.querySelector('#rsStatus').textContent=clean.length+' receipt items imported';setTimeout(function(){location.reload();},650);};render();
  }
  async function scan(file){if(!file||!/^image\//.test(file.type||''))return;styles();var wrap=modalShell(),url=await fileData(file);if(!window.Tesseract){wrap.querySelector('#rsStatus').textContent='Receipt reader did not load';wrap.querySelector('#rsBody').innerHTML='<div class="rs-loading">Keep the photo attached and try again while connected to the internet.</div>';return;}try{var result=await Tesseract.recognize(file,'eng',{logger:function(m){if(m.status==='recognizing text')wrap.querySelector('#rsStatus').textContent='Reading receipt… '+Math.round((m.progress||0)*100)+'%';}}),text=result.data&&result.data.text||'',rows=parseReceipt(text);showReview(wrap,rows,text,url);}catch(e){wrap.querySelector('#rsStatus').textContent='Could not read this receipt';wrap.querySelector('#rsBody').innerHTML='<div class="rs-loading">Try a brighter, flatter photo with the entire receipt visible.</div>';}}
  document.addEventListener('change',function(event){var input=event.target;if(!input||input.type!=='file'||!String(input.accept||'').includes('image'))return;var file=input.files&&input.files[0];if(file)setTimeout(function(){scan(file);},100);},true);
})();

