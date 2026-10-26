// ══════════════════════════════════════════════════════
// FOOD LOG SYSTEM
// ══════════════════════════════════════════════════════
if(!window._foodLog)window._foodLog=[];

const MEALS=['breakfast','lunch','dinner','snack','liquids','sports','supplements'];
const MEAL_LABELS={breakfast:'🌅 Breakfast',lunch:'🥗 Lunch',dinner:'🍽️ Dinner',snack:'🍎 Snacks',liquids:'💧 Liquids',sports:'💪 Sports Nutrition',supplements:'💊 Supplements'};
const MEAL_HINTS={breakfast:'Food name',lunch:'Food name',dinner:'Food name',snack:'Snack name',liquids:'Drink name',sports:'Sports fuel',supplements:'Supplement (e.g. Creatine 5 g)'};
const SERVING_UNITS=['serving','cup','tablespoon','teaspoon','fluid ounce','ounce','gram','milligram','milliliter','liter','piece','item','slice','scoop','packet','bar','bottle','can','container','handful','capsule','tablet','softgel','gummy','IU','microgram'];
// ── Macro-Target Meal Suggestions (20% protein / 60% carbs / 20% fat) ──
const MACRO_MEALS=[
  {id:'mm1',mealType:'breakfast',label:'Oats with Egg Whites & Almond Butter',kcal:402,protein:20,carbs:60,fat:9,items:[
    {name:'Rolled oats (dry)',amount:'89g (~1 cup)',cal:351,prot:15,carbs:59,fat:6.1},
    {name:'Liquid egg whites',amount:'37g (~2½ tbsp)',cal:18,prot:4,carbs:0.3,fat:0.1},
    {name:'Almond butter',amount:'5g (~1 tsp)',cal:33,prot:1.1,carbs:1,fat:2.8}
  ]},
  {id:'mm2',mealType:'breakfast',label:'Peanut Butter Banana Toast',kcal:422,protein:21,carbs:63,fat:9.4,items:[
    {name:'Whole wheat bread',amount:'144g (~2½ slices)',cal:355,prot:18.7,carbs:59,fat:4.9},
    {name:'Peanut butter',amount:'9g (~2 tsp)',cal:57,prot:2.3,carbs:1.8,fat:4.5},
    {name:'Banana',amount:'10g (a couple thin slices)',cal:10,prot:0.1,carbs:2.3,fat:0}
  ]},
  {id:'mm3',mealType:'lunch',label:'Chicken, Rice & Olive Oil Bowl',kcal:550,protein:27,carbs:82,fat:12.3,items:[
    {name:'Brown rice (cooked)',amount:'351g (~1¾ cups)',cal:395,prot:9.1,carbs:82.5,fat:3.2},
    {name:'Chicken breast (cooked)',amount:'59g (~2 oz)',cal:92,prot:18.3,carbs:0,fat:2.1},
    {name:'Olive oil',amount:'7g (~1½ tsp)',cal:63,prot:0,carbs:0,fat:7}
  ]},
  {id:'mm4',mealType:'lunch',label:'Turkey, Sweet Potato & Avocado Plate',kcal:550,protein:27,carbs:83,fat:12.2,items:[
    {name:'Sweet potato (baked)',amount:'368g (~1½ medium)',cal:339,prot:7.4,carbs:76.2,fat:0.6},
    {name:'Turkey breast (cooked)',amount:'62g (~2 oz)',cal:80,prot:18.6,carbs:0,fat:0.6},
    {name:'Avocado',amount:'75g (~half a medium)',cal:131,prot:1.5,carbs:6.4,fat:11}
  ]},
  {id:'mm5',mealType:'dinner',label:'Salmon, Quinoa & Broccoli',kcal:600,protein:30,carbs:90,fat:13.3,items:[
    {name:'Quinoa (cooked)',amount:'335g (~1⅔ cups)',cal:402,prot:14.7,carbs:71.4,fat:6.4},
    {name:'Salmon (cooked)',amount:'44g (~1½ oz)',cal:89,prot:9,carbs:0,fat:5.9},
    {name:'Broccoli (cooked)',amount:'260g (~2 cups)',cal:109,prot:6.2,carbs:18.7,fat:1}
  ]},
  {id:'mm6',mealType:'dinner',label:'Lentil & Rice Bowl',kcal:550,protein:28,carbs:83,fat:12.2,items:[
    {name:'Brown rice (cooked)',amount:'121g (~0.6 cup)',cal:136,prot:3.1,carbs:28.4,fat:1.1},
    {name:'Lentils (cooked)',amount:'271g (~1⅓ cups)',cal:324,prot:24.4,carbs:54.2,fat:1.1},
    {name:'Olive oil',amount:'10g (~2 tsp)',cal:90,prot:0,carbs:0,fat:10}
  ]},
  {id:'mm7',mealType:'snack',label:'Apple, Cottage Cheese & Almonds',kcal:223,protein:11,carbs:33,fat:5.1,items:[
    {name:'Apple',amount:'212g (~1 large)',cal:123,prot:0.6,carbs:29.3,fat:0.4},
    {name:'Nonfat cottage cheese',amount:'69g (~1/3 cup)',cal:44,prot:8.6,carbs:1.9,fat:0.2},
    {name:'Almonds',amount:'9g (~7 almonds)',cal:56,prot:1.9,carbs:1.9,fat:4.5}
  ]},
  {id:'mm8',mealType:'snack',label:'Blueberries, Cottage Cheese & Walnuts',kcal:218,protein:11,carbs:33,fat:4.7,items:[
    {name:'Blueberries',amount:'209g (~1⅓ cups)',cal:133,prot:1.5,carbs:30.3,fat:0.6},
    {name:'Nonfat cottage cheese',amount:'69g (~1/3 cup)',cal:44,prot:8.6,carbs:1.9,fat:0.2},
    {name:'Walnuts',amount:'6g (~1½ walnuts, chopped)',cal:42,prot:0.9,carbs:0.8,fat:3.9}
  ]}
];
function macroMealPct(m){return {p:Math.round(m.protein*4/m.kcal*100),c:Math.round(m.carbs*4/m.kcal*100),f:Math.round(m.fat*9/m.kcal*100)};}
function openMacroMealsModal(){
  var modal=document.getElementById('macroMealsModal');if(!modal)return;
  modal.style.display='flex';
  window._macroMealsFilter='all';
  renderMacroMealsList();
  renderPersonalMacroMeals();
}
function filterMacroMeals(type){
  window._macroMealsFilter=type;
  document.querySelectorAll('.mm-filter-btn').forEach(function(btn){
    var active=btn.dataset.mmFilter===type;
    btn.style.background=active?'#0f766e':'#e9ecef';
    btn.style.color=active?'#fff':'#555';
  });
  renderMacroMealsList();
}
function renderMacroMealsList(){
  var wrap=document.getElementById('macroMealsList');if(!wrap)return;
  var filter=window._macroMealsFilter||'all';
  var list=MACRO_MEALS.filter(function(m){return filter==='all'||m.mealType===filter;});
  wrap.innerHTML=list.map(function(m){
    var pct=macroMealPct(m);
    var itemsHtml=m.items.map(function(it){return '<li style="margin-bottom:2px;">'+it.name+' — '+it.amount+'</li>';}).join('');
    return '<div style="border:1px solid #e2e8f0;border-radius:9px;padding:10px 11px;margin-bottom:8px;background:#f8fafc;">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">'
      +'<strong style="font-size:.84rem;color:#0f172a;">'+(MEAL_LABELS[m.mealType]||'')+' · '+m.label+'</strong>'
      +'<span style="font-size:.68rem;color:#64748b;white-space:nowrap;">'+m.kcal+' kcal</span>'
      +'</div>'
      +'<ul style="margin:0 0 6px 18px;padding:0;font-size:.76rem;color:#334155;">'+itemsHtml+'</ul>'
      +'<div style="font-size:.68rem;color:#0f766e;font-weight:700;margin-bottom:7px;">P '+m.protein+'g ('+pct.p+'%) · C '+m.carbs+'g ('+pct.c+'%) · F '+m.fat+'g ('+pct.f+'%)</div>'
      +'<button type="button" onclick="logMacroMeal(\''+m.id+'\')" style="width:100%;background:#16a085;color:#fff;border:none;padding:6px;border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;">+ Log to today\'s '+(MEAL_LABELS[m.mealType]||m.mealType)+'</button>'
      +'</div>';
  }).join('')||'<div style="font-size:.78rem;color:#78716c;padding:10px 0;">No meals in this category.</div>';
}
function logMacroMeal(id){
  var m=MACRO_MEALS.find(function(x){return x.id===id;});if(!m)return;
  if(!window._foodLog)window._foodLog=[];
  m.items.forEach(function(it,i){
    window._foodLog.push({id:'f'+Date.now()+'_'+i,meal:m.mealType,name:it.name,cal:it.cal,prot:it.prot,fat:it.fat,carbs:it.carbs,servings:1,source:'macro-meal',servingLabel:it.amount});
  });
  _setMealOpen(m.mealType,true);renderFoodItems();save();
  document.getElementById('macroMealsModal').style.display='none';
  if(typeof v26Toast==='function')v26Toast((MEAL_LABELS[m.mealType]||'')+' logged: '+m.label);
}
function applyTodayMacroRatio(prot,carbs,fat){
  localStorage.setItem(macroRatioStorageKey(dk(today)),JSON.stringify({enabled:true,prot:prot,carbs:carbs,fat:fat}));
  if(typeof updateMacroTotals==='function')updateMacroTotals();
  if(typeof v26Toast==='function')v26Toast('Daily Macro Ratio set to '+prot+'/'+carbs+'/'+fat+' for today');
}
// ── Personal-list macro-meal matches (built from Favorites + Healthy 7+) ──
function personalFoodPool(){
  var favs=getFavorites()||[],healthy=getHealthyFoods()||[];
  var byName={};
  healthy.forEach(function(f){if(f&&f.name)byName[String(f.name).trim().toLowerCase()]=f;});
  favs.forEach(function(f){if(f&&f.name)byName[String(f.name).trim().toLowerCase()]=f;});
  return Object.keys(byName).map(function(k){return byName[k];}).filter(function(f){
    return Number.isFinite(f.cal)&&f.cal>0&&Number.isFinite(f.prot)&&Number.isFinite(f.carbs)&&Number.isFinite(f.fat);
  });
}
function macroMealDeviation(prot,carbs,fat,kcal){
  if(!(kcal>0))return Infinity;
  var p=prot*4/kcal*100,c=carbs*4/kcal*100,f=fat*9/kcal*100;
  return Math.abs(p-20)+Math.abs(c-60)+Math.abs(f-20);
}
function buildPersonalMacroMeals(){
  var pool=personalFoodPool(),results=[];
  pool.forEach(function(a){
    if(a.cal<150||a.cal>900)return;
    results.push({items:[a],kcal:a.cal,prot:a.prot,carbs:a.carbs,fat:a.fat,dev:macroMealDeviation(a.prot,a.carbs,a.fat,a.cal)});
  });
  for(var i=0;i<pool.length;i++){
    for(var j=i+1;j<pool.length;j++){
      var a=pool[i],b=pool[j],kcal=a.cal+b.cal,prot=a.prot+b.prot,carbs=a.carbs+b.carbs,fat=a.fat+b.fat;
      if(kcal<150||kcal>900)continue;
      results.push({items:[a,b],kcal:kcal,prot:prot,carbs:carbs,fat:fat,dev:macroMealDeviation(prot,carbs,fat,kcal)});
    }
  }
  results.sort(function(x,y){return x.dev-y.dev;});
  var seen={},top=[];
  for(var k=0;k<results.length&&top.length<6;k++){
    var r=results[k],key=r.items.map(function(it){return String(it.name).toLowerCase();}).sort().join('|');
    if(seen[key])continue;
    seen[key]=true;top.push(r);
  }
  return top;
}
function renderPersonalMacroMeals(){
  var wrap=document.getElementById('macroMealsPersonalList');if(!wrap)return;
  var matches=buildPersonalMacroMeals();
  window._personalMacroMeals=matches;
  if(!matches.length){
    wrap.innerHTML='<div style="font-size:.76rem;color:#78716c;padding:2px 0 14px;">No close matches yet — log a few foods or star some into your Food Database (⭐) and this section will build 20/60/20 combinations from your own foods automatically.</div>';
    return;
  }
  var mealOptions=MEALS.map(function(m){return '<option value="'+m+'">'+(MEAL_LABELS[m]||m).replace(/^[^\w]+/,'')+'</option>';}).join('');
  wrap.innerHTML=matches.map(function(m,idx){
    var kcal=Math.round(m.kcal);
    var p=Math.round(m.prot*4/m.kcal*100),c=Math.round(m.carbs*4/m.kcal*100),f=Math.round(m.fat*9/m.kcal*100);
    var itemsHtml=m.items.map(function(it){return '<li style="margin-bottom:2px;">'+it.name+' — '+(it.servingLabel||'1 serving')+'</li>';}).join('');
    return '<div style="border:1px solid #bbf7d0;border-radius:9px;padding:10px 11px;margin-bottom:8px;background:#f0fdf4;">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">'
      +'<strong style="font-size:.84rem;color:#0f172a;">⭐ '+m.items.map(function(it){return it.name;}).join(' + ')+'</strong>'
      +'<span style="font-size:.68rem;color:#64748b;white-space:nowrap;">'+kcal+' kcal</span>'
      +'</div>'
      +'<ul style="margin:0 0 6px 18px;padding:0;font-size:.76rem;color:#334155;">'+itemsHtml+'</ul>'
      +'<div style="font-size:.68rem;color:#15803d;font-weight:700;margin-bottom:7px;">P '+Math.round(m.prot)+'g ('+p+'%) · C '+Math.round(m.carbs)+'g ('+c+'%) · F '+(Math.round(m.fat*10)/10)+'g ('+f+'%)</div>'
      +'<div style="display:flex;gap:5px;">'
      +'<select id="mm-personal-meal-'+idx+'" style="flex:1;border:1px solid #ddd;border-radius:6px;padding:5px 4px;font-size:.72rem;">'+mealOptions+'</select>'
      +'<button type="button" onclick="logPersonalMacroMeal('+idx+')" style="flex:1.4;background:#15803d;color:#fff;border:none;padding:6px;border-radius:6px;font-size:.72rem;font-weight:700;cursor:pointer;">+ Log</button>'
      +'</div>'
      +'</div>';
  }).join('');
}
function logPersonalMacroMeal(idx){
  var m=(window._personalMacroMeals||[])[idx];if(!m)return;
  var sel=document.getElementById('mm-personal-meal-'+idx);
  var meal=(sel&&sel.value)||'snack';
  if(MEALS.indexOf(meal)<0)meal='snack';
  if(!window._foodLog)window._foodLog=[];
  m.items.forEach(function(it,i){
    window._foodLog.push({id:'f'+Date.now()+'_p'+i,meal:meal,name:it.name,cal:it.cal,prot:it.prot,fat:it.fat,carbs:it.carbs,servings:1,source:'macro-meal-personal',servingLabel:it.servingLabel||'1 serving'});
  });
  _setMealOpen(meal,true);renderFoodItems();save();
  document.getElementById('macroMealsModal').style.display='none';
  if(typeof v26Toast==='function')v26Toast((MEAL_LABELS[meal]||'')+' logged: '+m.items.map(function(it){return it.name;}).join(' + '));
}



function servingUnitFromLabel(label){
  var text=String(label||'').toLowerCase();
  var aliases={'tbsp':'tablespoon','tablespoons':'tablespoon','tsp':'teaspoon','teaspoons':'teaspoon','fl oz':'fluid ounce','fluid ounces':'fluid ounce','oz':'ounce','ounces':'ounce','g':'gram','grams':'gram','mg':'milligram','milligrams':'milligram','ml':'milliliter','milliliters':'milliliter','l':'liter','liters':'liter','cups':'cup','pieces':'piece','items':'item','slices':'slice','scoops':'scoop','packets':'packet','bars':'bar','bottles':'bottle','cans':'can','containers':'container','handfuls':'handful','servings':'serving'};
  var keys=Object.keys(aliases).sort(function(a,b){return b.length-a.length;});
  for(var i=0;i<keys.length;i++){if(new RegExp('(^|[^a-z])'+keys[i].replace(' ','\\s+')+'([^a-z]|$)','i').test(text))return aliases[keys[i]];}
  for(var j=0;j<SERVING_UNITS.length;j++){if(text.indexOf(SERVING_UNITS[j])!==-1)return SERVING_UNITS[j];}
  return '';
}

function applyFoodServingUnit(id,unit){
  var item=(window._foodLog||[]).find(function(x){return x.id===id;});if(!item||!unit)return;
  var current=String(item.servingLabel||'').replace(/^per\s+/i,'').trim(),match=current.match(/^\s*(\d+(?:\.\d+)?|\d+\/\d+)/),amount=match?match[1]:'1';
  item.servingLabel=amount+' '+unit;renderFoodItems();save();
}

// Micronutrient fields tracked per food item, in addition to cal/prot/fat/carbs
const MICRO_FIELDS=['fiber','sugar','sodium','vitC','vitD','calcium','iron','potassium','caffeine','magnesium','vitB12','zinc'];
const MICRO_META={
  fiber:{label:'Fiber',unit:'g',icon:'🌾',elId:'totFiber'},
  sugar:{label:'Sugar',unit:'g',icon:'🍬',elId:'totSugar'},
  sodium:{label:'Sodium',unit:'mg',icon:'🧂',elId:'totSodium'},
  vitC:{label:'Vit C',unit:'mg',icon:'🍊',elId:'totVitC'},
  vitD:{label:'Vit D',unit:'mcg',icon:'☀️',elId:'totVitD'},
  calcium:{label:'Calcium',unit:'mg',icon:'🦴',elId:'totCalcium'},
  iron:{label:'Iron',unit:'mg',icon:'🩸',elId:'totIron'},
  potassium:{label:'Potassium',unit:'mg',icon:'🍌',elId:'totPotassium'},
  caffeine:{label:'Caffeine',unit:'mg',icon:'☕',elId:'totCaffeine'},
  magnesium:{label:'Magnesium',unit:'mg',icon:'💪',elId:'totMagnesium'},
  vitB12:{label:'Vit B12',unit:'mcg',icon:'⚡',elId:'totVitB12'},
  zinc:{label:'Zinc',unit:'mg',icon:'🦪',elId:'totZinc'}
};
// Maps our MICRO_FIELDS names to Open Food Facts' nutrient taxonomy IDs
// (world.openfoodfacts.org/data/taxonomies/nutrients.json), used by the
// barcode lookup below. Verified against OFF's own declared per-nutrient
// units -- every one of these already matches MICRO_META's unit, so no
// conversion is needed except sodium, which OFF reports in grams.
const OFF_NUTRIENT_KEY={fiber:'fiber',sugar:'sugars',sodium:'sodium',vitC:'vitamin-c',vitD:'vitamin-d',calcium:'calcium',iron:'iron',potassium:'potassium',caffeine:'caffeine',magnesium:'magnesium',vitB12:'vitamin-b12',zinc:'zinc'};

// ── AI nutrient enrichment for already-saved favorites/meals ──
// Lets the user backfill missing nutrient fields -- macros (calories,
// protein, fat, carbs) AND micronutrients -- on foods that were saved
// before those fields existed or were left blank, without re-scanning or
// re-adding them. Only ever fills fields that are currently null/undefined
// -- never touches a field that already has a real value, including an
// intentional 0. The AI is explicitly told to use its real nutritional
// knowledge and only report 0 when a value is genuinely negligible or
// absent for that specific food, never to mean "I don't know" -- so a
// micronutrient only gets filled in with a real estimate, not a guess
// fabricated just to fill the field.
var MACRO_META={cal:{label:'Calories',unit:''},prot:{label:'Protein',unit:'g'},fat:{label:'Fat',unit:'g'},carbs:{label:'Carbs',unit:'g'}};
var MACRO_FIELDS=['cal','prot','fat','carbs'];
function nutrientMeta(f){return MACRO_META[f]||MICRO_META[f];}
function missingNutrientFields(item){
  return MACRO_FIELDS.concat(MICRO_FIELDS).filter(function(f){return item[f]==null;});
}
// Best-effort chain-name match used as a fallback for foods that never got
// an explicit restaurant flag (legacy favorites/meals from before this
// feature, or anything added without going through a path that sets it).
// Each entry is pre-normalized: lowercase, letters/digits only.
var RESTAURANT_CHAINS=['mcdonalds','burgerking','wendys','chickfila','tacobell','chipotle','subway','panera','starbucks','dunkin','kfc','popeyes','pizzahut','dominos','papajohns','littlecaesars','fiveguys','innout','shakeshack','sonic','arbys','jimmyjohns','jerseymikes','pandaexpress','qdoba','moes','wingstop','buffalowildwings','applebees','chilis','olivegarden','redlobster','outback','texasroadhouse','crackerbarrel','ihop','dennys','wafflehouse','culvers','whataburger','raisingcanes','zaxbys','bojangles','carlsjr','hardees','dairyqueen','baskinrobbins','coldstone','smoothieking','jambajuice','noodlescompany','chuys','elpolloloco','steaknshake','whitecastle','checkers','rallys','captainds','longjohnsilvers','tacojohns','cornerbakery','firehousesubs','potbelly','jasondeli'];
function looksLikeRestaurantFood(name){
  if(!name)return false;
  var n=String(name).toLowerCase().replace(/[^a-z0-9]/g,'');
  return RESTAURANT_CHAINS.some(function(c){return n.indexOf(c)!==-1;});
}
// Effective restaurant status for a food: an explicit true/false flag (set
// manually via the 🍽️ toggle, or automatically when the item was added)
// always wins; only legacy items with no flag at all fall back to a
// best-effort name match.
function isRestaurantFood(item){
  if(!item)return false;
  if(typeof item.restaurant==='boolean')return item.restaurant;
  return looksLikeRestaurantFood(item.name);
}
// Fields Enrich is actually allowed to fill in. Same as missingNutrientFields
// except restaurant foods always report none -- AI estimates are especially
// unreliable without a menu or verified nutrition source to check against,
// so Enrich (single-item and bulk) simply has nothing to do for them.
function enrichableFields(item){
  return isRestaurantFood(item)?[]:missingNutrientFields(item);
}
function aiEstimateNutrients(name,servingLabel,fields,cal,prot,fat,carbs){
  if(!fields||!fields.length)return Promise.resolve({});
  var key=journalAIKey();
  if(!key)return Promise.reject(new Error('Add your Anthropic API key in Settings first.'));
  var schema=fields.map(function(f){var meta=nutrientMeta(f);return '"'+f+'": '+meta.label+(meta.unit?' in '+meta.unit:'')+' per serving as a plain number';}).join('\n- ');
  var refs=[cal?Math.round(cal)+' calories':'',prot?prot+'g protein':'',fat?fat+'g fat':'',carbs?carbs+'g carbs':''].filter(Boolean).join(', ');
  var prompt='Estimate nutrition values for this specific food: '+name+(servingLabel?' ('+servingLabel+')':'')+'.\n'
    +(refs?'For reference, this serving has about '+refs+'.\n':'')
    +'Respond with ONLY a single JSON object -- no markdown, no code fences, no explanation, nothing else before or after. The JSON must have these exact keys:\n'
    +'- '+schema+'\n'
    +'Use your best nutritional knowledge for realistic values specific to this food. All numeric values must be numbers, not strings. Use 0 only when a value is genuinely negligible or absent for this food, never to mean unknown.';
  return fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1000,messages:[{role:'user',content:prompt}]})
  }).then(function(r){return r.json();}).then(function(data){
    var text=(data.content&&data.content[0]&&data.content[0].text)||'';
    var m=text.match(/\{[\s\S]*\}/);
    if(!m)throw new Error('Could not parse AI response.');
    var parsed=JSON.parse(m[0]);
    var result={};
    fields.forEach(function(f){result[f]=(parsed[f]!==undefined&&parsed[f]!==null)?parsed[f]:0;});
    return result;
  });
}
// Records which fields on a favorite/meal-item were filled in by the AI
// Enrich feature (as opposed to coming from a real scan, AI Food Search, or
// manual entry) so the UI can mark them as estimates rather than presenting
// them as if they were sourced data. Merges with anything already marked.
function markEstimated(obj,fields){
  var set=obj.aiEstimatedFields||[];
  fields.forEach(function(k){if(set.indexOf(k)===-1)set.push(k);});
  obj.aiEstimatedFields=set;
}
function enrichFavoriteNutrients(idx,btn){
  var favs=getFavorites();var f=favs[idx];if(!f)return;
  if(isRestaurantFood(f)){alert('"'+f.name+'" is marked as a restaurant food, so Enrich skips it. Tap the \ud83c\udf7d\ufe0f button first if you want to enrich it anyway.');return;}
  var missing=missingNutrientFields(f);
  if(!missing.length){alert('"'+f.name+'" already has every tracked nutrient filled in.');return;}
  var orig=btn?btn.innerHTML:'';if(btn){btn.disabled=true;btn.innerHTML='\u23F3';}
  aiEstimateNutrients(f.name,f.servingLabel,missing,f.cal,f.prot,f.fat,f.carbs).then(function(values){
    missing.forEach(function(k){f[k]=values[k];});
    markEstimated(f,missing);
    saveFavorites(favs);
    renderFavsList();
  }).catch(function(err){
    alert('Could not enrich "'+f.name+'": '+err.message);
    if(btn){btn.disabled=false;btn.innerHTML=orig;}
  });
}
function enrichMealNutrients(mealIdx,btn){
  var meals=getSavedMeals();var m=meals[mealIdx];if(!m)return;
  var entries=m.items.map(function(it){return {it:it,missing:enrichableFields(it)};}).filter(function(x){return x.missing.length;});
  if(!entries.length){alert('"'+m.name+'" already has every tracked nutrient filled in for all items.');return;}
  if(btn)btn.disabled=true;
  var chain=Promise.resolve(),failed=0;
  entries.forEach(function(entry,n){
    chain=chain.then(function(){
      if(btn)btn.innerHTML='\u23F3 '+(n+1)+'/'+entries.length;
      return aiEstimateNutrients(entry.it.name,entry.it.servingLabel,entry.missing,entry.it.cal,entry.it.prot,entry.it.fat,entry.it.carbs).then(function(values){
        entry.missing.forEach(function(k){entry.it[k]=values[k];});
        markEstimated(entry.it,entry.missing);
      }).catch(function(){failed++;});
    });
  });
  chain.then(function(){
    saveSavedMeals(meals);
    renderMealsList();
    if(failed)alert('Enriched '+(entries.length-failed)+' of '+entries.length+' items in "'+m.name+'". '+failed+' failed -- check your AI key/usage and try again.');
  });
}

// Bulk versions: enrich every favorite, or every item across every saved
// meal, in one tap instead of one button press per food. Same AI key, same
// only-fill-what's-missing rule, just run one food at a time in sequence
// (rather than in parallel) so a slow or rate-limited response doesn't pile
// up a burst of simultaneous requests.
function enrichAllFavorites(btn){
  var favs=getFavorites();
  var entries=favs.map(function(f){return {f:f,missing:enrichableFields(f)};}).filter(function(x){return x.missing.length;});
  if(!entries.length){alert('Nothing to enrich -- everything in your Food Database is either complete or marked as a restaurant food.');return;}
  if(!confirm('Enrich '+entries.length+' food'+(entries.length===1?'':'s')+' using AI? This runs one at a time and may take a little while.'))return;
  if(btn)btn.disabled=true;
  var orig=btn?btn.innerHTML:'';
  var chain=Promise.resolve(),failed=0;
  entries.forEach(function(entry,n){
    chain=chain.then(function(){
      if(btn)btn.innerHTML='\u23F3 Enriching '+(n+1)+'/'+entries.length+'\u2026';
      return aiEstimateNutrients(entry.f.name,entry.f.servingLabel,entry.missing,entry.f.cal,entry.f.prot,entry.f.fat,entry.f.carbs).then(function(values){
        entry.missing.forEach(function(k){entry.f[k]=values[k];});
        markEstimated(entry.f,entry.missing);
      }).catch(function(){failed++;});
    });
  });
  chain.then(function(){
    saveFavorites(favs);
    renderFavsList();
    alert('Enriched '+(entries.length-failed)+' of '+entries.length+' foods.'+(failed?(' '+failed+' failed -- check your AI key/usage and try again.'):''));
  }).catch(function(){
    if(btn){btn.disabled=false;btn.innerHTML=orig;}
  });
}
function enrichAllMeals(btn){
  var meals=getSavedMeals();
  var entries=[];
  meals.forEach(function(m){
    m.items.forEach(function(it){
      var missing=enrichableFields(it);
      if(missing.length)entries.push({it:it,missing:missing});
    });
  });
  if(!entries.length){alert('Nothing to enrich -- every item across your saved meals is either complete or marked as a restaurant food.');return;}
  if(!confirm('Enrich '+entries.length+' food item'+(entries.length===1?'':'s')+' across your saved meals using AI? This runs one at a time and may take a little while.'))return;
  if(btn)btn.disabled=true;
  var orig=btn?btn.innerHTML:'';
  var chain=Promise.resolve(),failed=0;
  entries.forEach(function(entry,n){
    chain=chain.then(function(){
      if(btn)btn.innerHTML='\u23F3 Enriching '+(n+1)+'/'+entries.length+'\u2026';
      return aiEstimateNutrients(entry.it.name,entry.it.servingLabel,entry.missing,entry.it.cal,entry.it.prot,entry.it.fat,entry.it.carbs).then(function(values){
        entry.missing.forEach(function(k){entry.it[k]=values[k];});
        markEstimated(entry.it,entry.missing);
      }).catch(function(){failed++;});
    });
  });
  chain.then(function(){
    saveSavedMeals(meals);
    renderMealsList();
    alert('Enriched '+(entries.length-failed)+' of '+entries.length+' items across your saved meals.'+(failed?(' '+failed+' failed -- check your AI key/usage and try again.'):''));
  }).catch(function(){
    if(btn){btn.disabled=false;btn.innerHTML=orig;}
  });
}

// Undo versions: clear whatever the Enrich feature filled in (tracked via
// aiEstimatedFields), reverting those specific fields back to null so the
// food reads as "missing" that data again, exactly as it did before being
// enriched. Never touches a field that wasn't AI-estimated.
function undoFavoriteEstimate(idx,btn){
  var favs=getFavorites();var f=favs[idx];if(!f)return;
  var fields=f.aiEstimatedFields||[];
  if(!fields.length){alert('Nothing to undo for "'+f.name+'".');return;}
  if(!confirm('Remove the '+fields.length+' AI-estimated value'+(fields.length===1?'':'s')+' from "'+f.name+'"? This cannot be undone.'))return;
  fields.forEach(function(k){f[k]=null;});
  f.aiEstimatedFields=[];
  saveFavorites(favs);
  renderFavsList();
}
function undoAllFavoritesEstimates(btn){
  var favs=getFavorites();
  var affected=favs.filter(function(f){return (f.aiEstimatedFields||[]).length>0;});
  if(!affected.length){alert('No AI-estimated values to undo across your Food Database.');return;}
  var total=affected.reduce(function(a,f){return a+f.aiEstimatedFields.length;},0);
  if(!confirm('Remove '+total+' AI-estimated value'+(total===1?'':'s')+' across '+affected.length+' food'+(affected.length===1?'':'s')+'? This cannot be undone.'))return;
  affected.forEach(function(f){
    f.aiEstimatedFields.forEach(function(k){f[k]=null;});
    f.aiEstimatedFields=[];
  });
  saveFavorites(favs);
  renderFavsList();
}
function undoMealEstimate(mealIdx,btn){
  var meals=getSavedMeals();var m=meals[mealIdx];if(!m)return;
  var count=m.items.reduce(function(a,it){return a+((it.aiEstimatedFields&&it.aiEstimatedFields.length)||0);},0);
  if(!count){alert('Nothing to undo for "'+m.name+'".');return;}
  if(!confirm('Remove '+count+' AI-estimated value'+(count===1?'':'s')+' from "'+m.name+'"? This cannot be undone.'))return;
  m.items.forEach(function(it){
    (it.aiEstimatedFields||[]).forEach(function(k){it[k]=null;});
    it.aiEstimatedFields=[];
  });
  saveSavedMeals(meals);
  renderMealsList();
}
function undoAllMealsEstimates(btn){
  var meals=getSavedMeals();
  var total=0,affectedMeals=0;
  meals.forEach(function(m){
    var mealTotal=m.items.reduce(function(a,it){return a+((it.aiEstimatedFields&&it.aiEstimatedFields.length)||0);},0);
    if(mealTotal>0){affectedMeals++;total+=mealTotal;}
  });
  if(!total){alert('No AI-estimated values to undo across your saved meals.');return;}
  if(!confirm('Remove '+total+' AI-estimated value'+(total===1?'':'s')+' across '+affectedMeals+' meal'+(affectedMeals===1?'':'s')+'? This cannot be undone.'))return;
  meals.forEach(function(m){
    m.items.forEach(function(it){
      (it.aiEstimatedFields||[]).forEach(function(k){it[k]=null;});
      it.aiEstimatedFields=[];
    });
  });
  saveSavedMeals(meals);
  renderMealsList();
}

// Quick-add product database for the Sports Nutrition section: full current
// GU Energy and SiS (Science in Sport) product lines (gels, chews, bars,
// drink mixes/electrolyte tabs, recovery drinks). Values are per labeled
// serving, compiled from brand sites and cross-checked retailer/nutrition-
// database listings; treat as close approximations rather than exact lab
// values where brands don't publish a full panel (e.g. some potassium figures).
const GUSIS_PRODUCTS=[
  {brand:'GU',line:'GU Energy Gel',flavor:'Sour Peach',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Gel',flavor:'Chocolate Outrage',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:20},
  {brand:'GU',line:'GU Energy Gel',flavor:'Tri-Berry',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:20},
  {brand:'GU',line:'GU Energy Gel',flavor:'Vanilla Bean',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:125,potassium:14,caffeine:0},
  {brand:'GU',line:'GU Energy Gel',flavor:'Strawberry Banana',serving:'1 packet (32g)',cal:100,carbs:23,prot:0,fat:0,sodium:55,potassium:30,caffeine:0},
  {brand:'GU',line:'GU Energy Gel',flavor:'Cola Me Happy',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:40},
  {brand:'GU',line:'GU Energy Gel',flavor:'Salted Caramel',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:125,potassium:20,caffeine:20},
  {brand:'GU',line:'GU Energy Gel',flavor:'Pumpkin Spice',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Gel',flavor:'Birthday Cake',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Gel',flavor:'Campfire S\'mores',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Gel',flavor:'Jet Blackberry',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:40},
  {brand:'GU',line:'GU Energy Gel',flavor:'Lemon Sublime',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Gel',flavor:'Salted Watermelon',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:125,potassium:35,caffeine:20},
  {brand:'GU',line:'GU Energy Gel',flavor:'Mandarin Orange',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:20},
  {brand:'GU',line:'GU Energy Gel',flavor:'Espresso Love',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:40},
  {brand:'GU',line:'GU Energy Gel',flavor:'Caramel Macchiato',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:40},
  {brand:'GU',line:'GU Energy Gel',flavor:'Raspberry Lemonade',serving:'1 packet (32g)',cal:100,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Cold Brew Coffee',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:125,potassium:20,caffeine:70},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Blueberry Pomegranate',serving:'1 packet (32g)',cal:100,carbs:25,prot:0,fat:0,sodium:125,potassium:55,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Chocolate Coconut',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:125,potassium:20,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Vanilla Orange',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:125,potassium:20,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Pineapple',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:125,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Cherry Lime',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:125,potassium:20,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Strawberry Kiwi',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:125,potassium:18,caffeine:0},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Lemonade',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:190,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Sea Salt Chocolate',serving:'1 packet (32g)',cal:100,carbs:19,prot:0,fat:2,sodium:180,potassium:20,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy Gel',flavor:'Salted Lime',serving:'1 packet (32g)',cal:100,carbs:21,prot:0,fat:0,sodium:190,potassium:20,caffeine:35},
  {brand:'GU',line:'GU Energy Chews',flavor:'Fruit Punch',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:40,potassium:10,caffeine:0},
  {brand:'GU',line:'GU Energy Chews',flavor:'Rainbow Fruit Mix',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:40,potassium:10,caffeine:0},
  {brand:'GU',line:'GU Energy Chews',flavor:'Orange',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:40,potassium:10,caffeine:0},
  {brand:'GU',line:'GU Energy Chews',flavor:'Strawberry',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:40,potassium:10,caffeine:20},
  {brand:'GU',line:'GU Energy Chews',flavor:'Blueberry Pomegranate',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:40,potassium:10,caffeine:0},
  {brand:'GU',line:'GU Energy Chews',flavor:'Watermelon',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:40,potassium:10,caffeine:0},
  {brand:'GU',line:'GU Energy Chews',flavor:'Salted Lime',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:125,potassium:10,caffeine:0},
  {brand:'GU',line:'GU Energy Chews',flavor:'Lemonade',serving:'1 serving (30g, 8 chews)',cal:90,carbs:22,prot:0,fat:0,sodium:40,potassium:10,caffeine:0},
  {brand:'GU',line:'GU Hydration Drink Tabs',flavor:'Strawberry Lemonade',serving:'1 tab in 16oz water',cal:10,carbs:3,prot:0,fat:0,sodium:320,potassium:55,caffeine:0},
  {brand:'GU',line:'GU Hydration Drink Tabs',flavor:'Strawberry Hibiscus',serving:'1 tab in 16oz water',cal:10,carbs:3,prot:0,fat:0,sodium:320,potassium:55,caffeine:20},
  {brand:'GU',line:'GU Hydration Drink Tabs',flavor:'Tropical Citrus',serving:'1 tab in 16oz water',cal:10,carbs:3,prot:0,fat:0,sodium:320,potassium:55,caffeine:0},
  {brand:'GU',line:'GU Hydration Drink Tabs',flavor:'Orange',serving:'1 tab in 16oz water',cal:10,carbs:3,prot:0,fat:0,sodium:320,potassium:55,caffeine:0},
  {brand:'GU',line:'GU Hydration Drink Tabs',flavor:'Tri-Berry',serving:'1 tab in 16oz water',cal:10,carbs:3,prot:0,fat:0,sodium:320,potassium:55,caffeine:0},
  {brand:'GU',line:'GU Hydration Drink Tabs',flavor:'Lemon Lime',serving:'1 tab in 16oz water',cal:10,carbs:3,prot:0,fat:0,sodium:320,potassium:55,caffeine:0},
  {brand:'GU',line:'GU Roctane Energy & Hydration Drink Mix',flavor:'Lemon Berry',serving:'2 scoops (65g) in 21oz water',cal:250,carbs:60,prot:0,fat:0,sodium:320,potassium:80,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy & Hydration Drink Mix',flavor:'Summit Tea',serving:'2 scoops (65g) in 21oz water',cal:250,carbs:60,prot:0,fat:0,sodium:320,potassium:80,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy & Hydration Drink Mix',flavor:'Tropical Fruit',serving:'2 scoops (65g) in 21oz water',cal:250,carbs:60,prot:0,fat:0,sodium:320,potassium:80,caffeine:35},
  {brand:'GU',line:'GU Roctane Energy & Hydration Drink Mix',flavor:'Grape',serving:'2 scoops (65g) in 21oz water',cal:250,carbs:60,prot:0,fat:0,sodium:320,potassium:80,caffeine:0},
  {brand:'GU',line:'GU Roctane Energy & Hydration Drink Mix',flavor:'Strawberry Hibiscus',serving:'2 scoops (65g) in 21oz water',cal:250,carbs:60,prot:0,fat:0,sodium:320,potassium:80,caffeine:0},
  {brand:'GU',line:'GU Roctane Electrolyte Capsules',flavor:'Unflavored',serving:'1 capsule',cal:0,carbs:0,prot:0,fat:0,sodium:140,potassium:0,caffeine:0},
  {brand:'GU',line:'GU Energy Waffle',flavor:'Maple Cinnamon',serving:'1 waffle (~30g)',cal:150,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Waffle',flavor:'Campfire S\'mores',serving:'1 waffle (~30g)',cal:150,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Waffle',flavor:'Coconut',serving:'1 waffle (~30g)',cal:150,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Waffle',flavor:'Coffee Caramel',serving:'1 waffle (~30g)',cal:150,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:20},
  {brand:'GU',line:'GU Energy Waffle',flavor:'Salted Caramel',serving:'1 waffle (~30g)',cal:150,carbs:22,prot:0,fat:0,sodium:150,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Waffle',flavor:'Wild Berries',serving:'1 waffle (~30g)',cal:150,carbs:22,prot:0,fat:0,sodium:100,potassium:20,caffeine:0},
  {brand:'GU',line:'GU Energy Waffle',flavor:'Salted Chocolate',serving:'1 waffle (~30g)',cal:150,carbs:22,prot:0,fat:0,sodium:150,potassium:20,caffeine:0},
  {brand:'SiS',line:'SiS GO Isotonic Energy Gel',flavor:'Apple',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:4,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Isotonic Energy Gel',flavor:'Blackcurrant',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:4,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Isotonic Energy Gel',flavor:'Lemon & Lime',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:4,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Isotonic Energy Gel',flavor:'Orange',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:4,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Isotonic Energy Gel',flavor:'Pineapple',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:4,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Isotonic Energy Gel',flavor:'Pink Grapefruit',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:4,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Isotonic Energy Gel',flavor:'Tropical',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:4,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy + Electrolyte Gel',flavor:'Lemon & Mint',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:118,potassium:10,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy + Electrolyte Gel',flavor:'Raspberry',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:118,potassium:10,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy + Electrolyte Gel',flavor:'Salted Caramel',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:118,potassium:10,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy + Caffeine Gel',flavor:'Berry (75mg)',serving:'1 gel (60ml/69g)',cal:90,carbs:22,prot:0,fat:0,sodium:10,potassium:0,caffeine:75},
  {brand:'SiS',line:'SiS GO Energy + Caffeine Gel',flavor:'Cola (75mg)',serving:'1 gel (60ml/69g)',cal:85,carbs:21,prot:0,fat:0,sodium:10,potassium:0,caffeine:75},
  {brand:'SiS',line:'SiS GO Energy + Caffeine Gel',flavor:'Double Espresso (150mg Turbo)',serving:'1 gel (60ml/69g)',cal:87,carbs:22,prot:0,fat:0,sodium:10,potassium:0,caffeine:150},
  {brand:'SiS',line:'SiS Beta Fuel Gel',flavor:'Orange',serving:'1 gel (60ml/86g)',cal:158,carbs:40,prot:0,fat:0,sodium:12,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS Beta Fuel Gel',flavor:'Strawberry & Lime',serving:'1 gel (60ml/86g)',cal:158,carbs:40,prot:0,fat:0,sodium:12,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS Beta Fuel Gel',flavor:'Neutral',serving:'1 gel (60ml/86g)',cal:158,carbs:40,prot:0,fat:0,sodium:12,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS Beta Fuel Gel + Electrolyte',flavor:'Raspberry & Lemon',serving:'1 gel (60ml/86g)',cal:158,carbs:40,prot:0,fat:0,sodium:200,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS Beta Fuel Gel + Caffeine',flavor:'Apple (200mg)',serving:'1 gel (60ml/86g)',cal:158,carbs:40,prot:0,fat:0,sodium:12,potassium:0,caffeine:200},
  {brand:'SiS',line:'SiS Beta Fuel Gel + Caffeine',flavor:'Lemon & Lime (200mg)',serving:'1 gel (60ml/86g)',cal:158,carbs:40,prot:0,fat:0,sodium:12,potassium:0,caffeine:200},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Apple & Blackcurrant',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Banana Fudge',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:121,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Blueberry',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Chocolate Fudge',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Lemon',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Orange',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Red Berry',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Bar',flavor:'Strawberry',serving:'1 bar (40g)',cal:139,carbs:26,prot:4.5,fat:2,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS Beta Fuel Bar',flavor:'Orange',serving:'1 bar (60g)',cal:186,carbs:45,prot:0,fat:0,sodium:44,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS Beta Fuel Bar',flavor:'Lemon',serving:'1 bar (60g)',cal:186,carbs:45,prot:0,fat:0,sodium:44,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Hydro Tablets',flavor:'Berry',serving:'1 tab in 500ml water',cal:9,carbs:1,prot:0,fat:0,sodium:330,potassium:62,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Hydro Tablets',flavor:'Lemon',serving:'1 tab in 500ml water',cal:9,carbs:1,prot:0,fat:0,sodium:330,potassium:62,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Hydro Tablets',flavor:'Mixed',serving:'1 tab in 500ml water',cal:9,carbs:1,prot:0,fat:0,sodium:330,potassium:62,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Hydro Tablets',flavor:'Pineapple & Mango',serving:'1 tab in 500ml water',cal:9,carbs:1,prot:0,fat:0,sodium:330,potassium:62,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Hydro Tablets',flavor:'Pink Grapefruit',serving:'1 tab in 500ml water',cal:9,carbs:1,prot:0,fat:0,sodium:330,potassium:62,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Hydro Tablets',flavor:'Strawberry & Lime',serving:'1 tab in 500ml water',cal:8,carbs:1,prot:0,fat:0,sodium:332,potassium:62,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Hydro Tablets',flavor:'Cola + Caffeine (75mg)',serving:'1 tab in 500ml water',cal:7,carbs:1,prot:0,fat:0,sodium:346,potassium:0,caffeine:75},
  {brand:'SiS',line:'SiS GO Electrolyte Drink Powder',flavor:'Orange',serving:'2 scoops (40g)',cal:146,carbs:36,prot:0,fat:0,sodium:200,potassium:60,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Drink Powder',flavor:'Lemon',serving:'2 scoops (40g)',cal:146,carbs:36,prot:0,fat:0,sodium:200,potassium:60,caffeine:0},
  {brand:'SiS',line:'SiS GO Electrolyte Drink Powder',flavor:'Blackcurrant',serving:'2 scoops (40g)',cal:146,carbs:36,prot:0,fat:0,sodium:200,potassium:60,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Drink Powder',flavor:'Orange',serving:'3 scoops (50g)',cal:189,carbs:47,prot:0,fat:0,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Drink Powder',flavor:'Lemon',serving:'3 scoops (50g)',cal:189,carbs:47,prot:0,fat:0,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS GO Energy Drink Powder',flavor:'Blackcurrant',serving:'3 scoops (50g)',cal:189,carbs:47,prot:0,fat:0,sodium:0,potassium:0,caffeine:0},
  {brand:'SiS',line:'SiS REGO Rapid Recovery',flavor:'Chocolate',serving:'1 scoop (50g)',cal:180,carbs:22,prot:20,fat:1.1,sodium:400,potassium:2,caffeine:0},
  {brand:'SiS',line:'SiS REGO Rapid Recovery',flavor:'Vanilla',serving:'1 scoop (50g)',cal:180,carbs:22,prot:20,fat:1.1,sodium:400,potassium:2,caffeine:0},
  {brand:'SiS',line:'SiS REGO Rapid Recovery',flavor:'Strawberry',serving:'1 scoop (50g)',cal:180,carbs:22,prot:20,fat:1.1,sodium:400,potassium:2,caffeine:0},
  {brand:'SiS',line:'SiS REGO Rapid Recovery',flavor:'Banana',serving:'1 scoop (50g)',cal:180,carbs:22,prot:20,fat:1.1,sodium:400,potassium:2,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Chocolate',serving:'1 shake (11 fl oz)',cal:160,carbs:4,prot:30,fat:3,sodium:230,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Vanilla',serving:'1 shake (11 fl oz)',cal:160,carbs:4,prot:30,fat:3,sodium:230,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Caramel',serving:'1 shake (11 fl oz)',cal:160,carbs:2,prot:30,fat:3,sodium:350,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Cookies and Cream',serving:'1 shake (11 fl oz)',cal:160,carbs:4,prot:30,fat:3,sodium:220,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Chocolate Peanut Butter',serving:'1 shake (11 fl oz)',cal:160,carbs:5,prot:30,fat:3,sodium:380,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Café Latte',serving:'1 shake (11 fl oz)',cal:160,carbs:4,prot:30,fat:3,sodium:260,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Cookie Dough',serving:'1 shake (11 fl oz)',cal:160,carbs:3,prot:30,fat:3,sodium:330,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Cinnamon Roll',serving:'1 shake (11 fl oz)',cal:160,carbs:3,prot:30,fat:3,sodium:230,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Cake Batter',serving:'1 shake (11 fl oz)',cal:160,carbs:4,prot:30,fat:3,sodium:370,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Peaches & Cream',serving:'1 shake (11 fl oz)',cal:160,carbs:3,prot:30,fat:3,sodium:230,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Strawberries & Cream',serving:'1 shake (11 fl oz)',cal:160,carbs:3,prot:30,fat:3,sodium:230,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Bananas & Cream',serving:'1 shake (11 fl oz)',cal:160,carbs:4,prot:30,fat:3,sodium:230,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Lemon Bar',serving:'1 shake (11 fl oz)',cal:160,carbs:3,prot:30,fat:3,sodium:250,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Orange Cream Swirl (Limited Edition)',serving:'1 shake (11 fl oz)',cal:160,carbs:3,prot:30,fat:3,sodium:250,potassium:0,caffeine:0},
  {brand:'Premier Protein',line:'Premier Protein Shake',flavor:'Pumpkin Spice (Limited Time)',serving:'1 shake (11 fl oz)',cal:160,carbs:2,prot:30,fat:3,sodium:230,potassium:0,caffeine:0}
];

function gusisLinesFor(brand){
  var seen={},out=[];
  GUSIS_PRODUCTS.forEach(function(p){
    if(brand&&p.brand!==brand)return;
    if(!seen[p.line]){seen[p.line]=true;out.push(p.line);}
  });
  return out;
}
function populateGusisCategoryFilter(){
  var catSel=document.getElementById('gusisCategoryFilter');
  if(!catSel)return;
  var brand=(document.getElementById('gusisBrandFilter')||{}).value||'';
  var cur=catSel.value;
  var lines=gusisLinesFor(brand);
  catSel.innerHTML='<option value="">All Types</option>'+lines.map(function(l){return '<option value="'+l+'">'+l+'</option>';}).join('');
  if(lines.indexOf(cur)!==-1)catSel.value=cur;
}
function renderGusisPicker(){
  populateGusisCategoryFilter();
  var brand=(document.getElementById('gusisBrandFilter')||{}).value||'';
  var cat=(document.getElementById('gusisCategoryFilter')||{}).value||'';
  var sel=document.getElementById('gusisProductSelect');
  if(!sel)return;
  var opts=[],validIdx={};
  GUSIS_PRODUCTS.forEach(function(p,idx){
    if(brand&&p.brand!==brand)return;
    if(cat&&p.line!==cat)return;
    var caf=p.caffeine?' · '+p.caffeine+'mg caf':'';
    validIdx[idx]=true;
    opts.push('<option value="'+idx+'">'+escHtml(p.flavor)+' ('+p.cal+' cal, '+p.carbs+'g carb'+caf+')</option>');
  });
  var curVal=sel.value;
  sel.innerHTML=opts.length?opts.join(''):'<option value="">No products match</option>';
  if(validIdx[curVal])sel.value=curVal;
  gusisUpdatePreview();
}
function gusisUpdatePreview(){
  var sel=document.getElementById('gusisProductSelect'),prev=document.getElementById('gusisPreview');
  if(!sel||!prev)return;
  var p=GUSIS_PRODUCTS[parseInt(sel.value,10)];
  if(!p){prev.textContent='';return;}
  var bits=[p.serving,p.cal+' cal',p.carbs+'g carb'];
  if(p.sodium)bits.push(p.sodium+'mg sodium');
  if(p.potassium)bits.push(p.potassium+'mg potassium');
  if(p.caffeine)bits.push(p.caffeine+'mg caffeine');
  if(p.prot)bits.push(p.prot+'g protein');
  prev.textContent=bits.join(' · ');
}
function gusisQuickAdd(){
  var sel=document.getElementById('gusisProductSelect');
  if(!sel||sel.value==='')return;
  var p=GUSIS_PRODUCTS[parseInt(sel.value,10)];
  if(!p)return;
  var item={
    id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    meal:'sports',name:p.line+' – '+p.flavor,servingLabel:p.serving,servings:1,
    cal:p.cal||null,prot:p.prot||null,fat:p.fat||null,carbs:p.carbs||null
  };
  MICRO_FIELDS.forEach(function(f){item[f]=(p[f]!==undefined&&p[f]!==null&&p[f]!==0)?p[f]:null;});
  if(!window._foodLog)window._foodLog=[];
  window._foodLog.push(item);
  _setMealOpen('sports',true);
  renderFoodItems();save();
  if(typeof v26Toast==='function')v26Toast('Added '+item.name+' to Sports Nutrition');
  var flash=document.getElementById('gusisAddFlash');
  if(flash){flash.textContent='✓ Added '+p.flavor+' to Sports Nutrition';flash.style.display='block';setTimeout(function(){flash.style.display='none';},2500);}
}

// ── Supplements Quick Add ─────────────────────────────────────────────────
// Label nutrition facts, entered from the official Nature Made Supplement
// Facts panels (naturemade.com / retailer product pages), not AI-estimated.
const SUPPLEMENT_PRODUCTS=[
  {brand:'Nature Made',name:'Multi For Him 50+ (USP Verified)',serving:'1 tablet',cal:0,carbs:0,prot:0,fat:0,vitA:750,vitC:180,vitD:25,vitE:27,vitK:80,vitB1:1.5,vitB2:1.7,vitB3:20,vitB6:6,vitB12:25,folate:665,biotin:30,vitB5:10,calcium:160,iodine:150,magnesium:100,zinc:15,selenium:105,copper:2,manganese:4,chromium:120,molybdenum:75},
  {brand:'Nature Made',name:'Magnesium Oxide 250mg',serving:'1 tablet',cal:0,carbs:0,prot:0,fat:0,magnesium:250},
  {brand:'Nature Made',name:'Iron 65mg (Ferrous Sulfate)',serving:'1 tablet',cal:0,carbs:0,prot:0,fat:0,iron:65}
];
function renderSupplementPicker(){
  var sel=document.getElementById('suppProductSelect');
  if(!sel)return;
  var curVal=sel.value;
  sel.innerHTML=SUPPLEMENT_PRODUCTS.map(function(p,idx){return '<option value="'+idx+'">'+escHtml(p.brand+' '+p.name)+'</option>';}).join('');
  if(curVal!==''&&SUPPLEMENT_PRODUCTS[parseInt(curVal,10)])sel.value=curVal;
  supplementUpdatePreview();
}
function supplementUpdatePreview(){
  var sel=document.getElementById('suppProductSelect'),prev=document.getElementById('suppPreview');
  if(!sel||!prev)return;
  var p=SUPPLEMENT_PRODUCTS[parseInt(sel.value,10)];
  if(!p){prev.textContent='';return;}
  var bits=[p.serving,p.cal+' cal'];
  MICRO_FIELDS.forEach(function(f){
    if(p[f]){var meta=nutrientMeta(f);bits.push((meta?meta.label:f)+' '+p[f]+(meta?meta.unit:''));}
  });
  prev.textContent=bits.join(' · ');
}
function supplementQuickAdd(){
  var sel=document.getElementById('suppProductSelect');
  if(!sel||sel.value==='')return;
  var p=SUPPLEMENT_PRODUCTS[parseInt(sel.value,10)];
  if(!p)return;
  var item={
    id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    meal:'supplements',name:p.brand+' '+p.name,servingLabel:p.serving,servings:1,
    cal:p.cal||null,prot:p.prot||null,fat:p.fat||null,carbs:p.carbs||null
  };
  MICRO_FIELDS.forEach(function(f){item[f]=(p[f]!==undefined&&p[f]!==null&&p[f]!==0)?p[f]:null;});
  if(!window._foodLog)window._foodLog=[];
  window._foodLog.push(item);
  _setMealOpen('supplements',true);
  renderFoodItems();save();
  if(typeof v26Toast==='function')v26Toast('Added '+item.name+' to Supplements');
  var flash=document.getElementById('suppAddFlash');
  if(flash){flash.textContent='✓ Added '+p.name+' to Supplements';flash.style.display='block';setTimeout(function(){flash.style.display='none';},2500);}
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',renderSupplementPicker);}else{renderSupplementPicker();}

function _mkMacroCell(labelTxt, field, val, highlight, itemId){
  var lbl=document.createElement('label');
  lbl.style.cssText='font-size:0.68rem;color:'+(highlight?'#e67e22':'#888')+(highlight?';font-weight:700':'')+';display:flex;flex-direction:column;align-items:center;gap:1px;';
  lbl.textContent=labelTxt;
  var inp=document.createElement('input');
  inp.type='number';
  inp.min='0'; inp.placeholder='0';
  if(field==='servings'){inp.min='0.25';inp.step='0.25';inp.value=val||1;}
  else{inp.value=(val!==null&&val!==undefined&&val!=='')?val:'';}
  inp.style.cssText='width:100%;border:'+(highlight?'2px solid #e67e22':'1px solid #e9ecef')+';border-radius:5px;padding:3px 2px;font-size:0.8rem;text-align:center;box-sizing:border-box;';
  inp.onchange=(function(id,f){return function(){updateFoodField(id,f,this.value);};})(itemId,field);
  lbl.appendChild(inp);
  return lbl;
}
function foodNameHasAny(name,terms){
  var normalized=' '+String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
  return terms.some(function(term){return normalized.indexOf(' '+term+' ')!==-1||normalized.indexOf(' '+term+'s ')!==-1;});
}
function foodSourceChoice(name,supportTerms,limitTerms){
  var normalized=' '+String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
  function first(terms){return terms.reduce(function(best,term){var at=normalized.indexOf(' '+term+' ');if(at<0)at=normalized.indexOf(' '+term+'s ');return at>=0&&at<best?at:best;},Number.POSITIVE_INFINITY);}
  var supportAt=first(supportTerms),limitAt=first(limitTerms);if(!isFinite(supportAt)&&!isFinite(limitAt))return'';return supportAt<=limitAt?'support':'limit';
}
function foodSourceCorrections(){try{return JSON.parse(localStorage.getItem('food_source_corrections')||'{}')||{};}catch(e){return{};}}
function foodSourceCorrectionKey(name){return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function rememberFoodSourceCorrection(item){
  var key=foodSourceCorrectionKey(item&&item.name);if(!key)return;
  var saved=foodSourceCorrections();saved[key]={proteinSource:item.proteinSource||'unknown',carbSource:item.carbSource||'unknown',fatSource:item.fatSource||'unknown'};
  localStorage.setItem('food_source_corrections',JSON.stringify(saved));
}
function inferFoodMacroSources(item){
  if(!item)return false;
  var name=String(item.name||''),classificationText=[name,item.ingredientsText,item.categoriesText].filter(Boolean).join(' '),changed=false;
  var remembered=foodSourceCorrections()[foodSourceCorrectionKey(name)];
  if(remembered){['proteinSource','carbSource','fatSource'].forEach(function(field){if(item[field]!==remembered[field]){item[field]=remembered[field]||'unknown';changed=true;}});item.sourceConfidence='High';item.sourceMethod='Remembered correction';return changed;}
  var proteinSupport=['chicken breast','chicken','turkey','fish','salmon','tuna','tilapia','cod','halibut','mahi mahi','shrimp','lean beef','sirloin','bison','pork tenderloin','egg white','egg','greek yogurt','yogurt','cottage cheese','milk protein','casein','milk','tofu','tempeh','edamame','bean','lentil','chickpea','pea protein','soy protein','protein isolate','protein concentrate','protein powder','protein shake','whey protein','whey','seitan'];
  var proteinLimit=['bacon','sausage','hot dog','pepperoni','salami','bologna','fried chicken','processed meat','mechanically separated','cured meat','pork rind','rib','cheese'];
  var carbSupport=['oatmeal','oat','brown rice','wild rice','quinoa','whole grain','whole wheat','whole rye','barley','farro','bran','bean','lentil','chickpea','sweet potato','potato','corn','sweet corn','fruit','dried fruit','raisin','apple','banana','berry','berries','strawberry','strawberries','blueberry','blueberries','raspberry','raspberries','blackberry','blackberries','grape','pear','peach','peaches','mango','mangoes','pineapple','watermelon','cantaloupe','kiwi','plum','cherry','cherries','grapefruit','apricot','pomegranate','orange','vegetable','broccoli','spinach','carrot','kale','cauliflower','zucchini','cucumber','bell pepper','asparagus','pea','cabbage','brussels sprout','tomato','tomatoes','squash','green bean'];
  var carbLimit=['candy','soda','soft drink','juice','sports drink','energy gel','gel','chew','sugar','cane sugar','corn syrup','high fructose corn syrup','honey','syrup','enriched wheat flour','refined flour','white flour','cookie','cake','pastry','donut','doughnut','white bread','white rice','sweetened cereal'];
  var fatSupport=['olive oil','canola oil','sunflower oil','safflower oil','soybean oil','avocado oil','sesame oil','avocado','almond','walnut','peanut','cashew','pistachio','pecan','hazelnut','macadamia','nut butter','seed','chia','flax','salmon','tuna','mackerel','sardine','trout','olive'];
  var fatLimit=['butter','lard','shortening','coconut oil','palm oil','palm kernel oil','hydrogenated oil','partially hydrogenated oil','cream','cheese','bacon','sausage','pepperoni','fried'];
  if((parseFloat(item.prot)||0)>0&&!item.proteinSource){var proteinChoice=foodSourceChoice(classificationText,proteinSupport,proteinLimit);if(proteinChoice){item.proteinSource=proteinChoice;changed=true;}}
  if((parseFloat(item.carbs)||0)>0&&!item.carbSource){var carbChoice=foodSourceChoice(classificationText,carbSupport,carbLimit);if(carbChoice){item.carbSource=carbChoice;changed=true;}}
  if((parseFloat(item.fat)||0)>0&&!item.fatSource){var fatChoice=foodSourceChoice(classificationText,fatSupport,fatLimit);if(fatChoice){item.fatSource=fatChoice;changed=true;}}
  if(changed){item.sourceClassificationAuto=true;item.sourceConfidence=(item.source==='barcode'||item.source==='label')&&item.ingredientsText?'High':'Medium';item.sourceMethod=item.source==='barcode'?'Barcode + ingredients':item.source==='label'&&item.ingredientsText?'Label + ingredients':'Food-name match';}
  else if(!item.sourceConfidence){item.sourceConfidence='Low';item.sourceMethod='Needs review';}
  return changed;
}

function runnerFoodQuality(item){
  item=item||{};
  var calories=Math.max(0,parseFloat(item.cal)||0),protein=Math.max(0,parseFloat(item.prot)||0),carbs=Math.max(0,parseFloat(item.carbs)||0),fat=Math.max(0,parseFloat(item.fat)||0);
  var fiber=Math.max(0,parseFloat(item.fiber)||0),sugar=Math.max(0,parseFloat(item.sugar)||0),sodium=Math.max(0,parseFloat(item.sodium)||0);
  var sportsNameMatch=/\b(energy gel|gu energy|gels?|chews?|electrolyte|sports drink|gatorade|powerade|nuun|tailwind|skratch|maurten|clif shot|hammer gel|recovery drink|bcaa)\b/i.test(String(item.name||''));
  var sports=item.meal==='sports'||sportsNameMatch,score=5,reasons=[];
  var dateKey=dk(today),activityText='';
  try{activityText=(getActivities()||[]).filter(function(a){return a&&a.date===dateKey;}).map(function(a){return [a.title,a.type,a.workout].filter(Boolean).join(' ');}).join(' ');}catch(ignoreActivity){}
  try{activityText+=' '+(typeof journalTodayTrainingSummary==='function'?journalTodayTrainingSummary():'');}catch(ignoreSummary){}
  var hardWorkout=typeof nutritionHardWorkoutForDate==='function'?nutritionHardWorkoutForDate(today):'';
  var runDay=!!hardWorkout||/\b(run|race|interval|tempo|threshold|speed|track|recovery)\b/i.test(activityText);
  function sourceScore(amount,source,supportPoints,limitPoints,supportReason,limitReason){
    if(amount<=0)return;
    if(source==='support'){score+=supportPoints;reasons.push(supportReason);}
    else if(source==='limit'){score+=limitPoints;reasons.push(limitReason);}
  }
  sourceScore(protein,item.proteinSource,1,-1,'runner-supportive protein','processed or higher-fat protein');
  sourceScore(carbs,item.carbSource,1,sports?0.5:-1,'complex carbohydrate source',sports?'quick training fuel':'mostly refined carbohydrate');
  sourceScore(fat,item.fatSource,0.75,-1,'unsaturated fat source','mostly saturated or trans fat');
  if(fiber>=5){score+=1;reasons.push('high fiber');}else if(fiber>=3){score+=0.6;reasons.push('useful fiber');}
  if(calories>0&&protein/calories>=0.1){score+=1;reasons.push('high protein density');}else if(calories>0&&protein/calories>=0.05){score+=0.4;}
  if(!sports&&sugar>=20&&fiber<3){score-=1;reasons.push('high sugar with little fiber');}else if(!sports&&sugar>=10&&fiber<2){score-=0.5;}
  if(!sports&&sodium>=700){score-=0.5;reasons.push('high sodium');}
  var text=[item.name,item.ingredientsText,item.categoriesText].filter(Boolean).join(' ').toLowerCase();
  if(/\b(vegetable|fruit|dried fruit|raisin|raisins|berries|strawberry|strawberries|blueberry|blueberries|raspberry|raspberries|blackberry|blackberries|grape|grapes|pear|pears|peach|peaches|mango|pineapple|watermelon|banana|apple|orange|oat|oatmeal|whole grain|whole wheat|bean|lentil|quinoa|brown rice|sweet potato|potato|potatoes|corn|carrot|carrots|kale|cauliflower|zucchini|cucumber|pepper|peppers|asparagus|pea|peas|cabbage|tomato|tomatoes|squash|salmon|tuna|tilapia|cod)\b/.test(text)){score+=0.75;reasons.push('whole-food ingredients');}
  // Oats provide a nutrient-dense carbohydrate base for endurance training. Give
  // plain or lightly sweetened oatmeal credit without extending the bonus to
  // dessert-style products with a large added-sugar load.
  if(/\b(oatmeal|rolled oats?|steel[ -]?cut oats?|old fashioned oats?)\b/.test(text)&&sugar<=10){score+=0.75;reasons.push('sustained endurance carbohydrate');}
  // Raisins are concentrated whole fruit and useful portable carbohydrate for
  // runners. Their naturally occurring sugar should not be scored like candy;
  // sweetened or candy-coated products remain subject to the normal penalties.
  if(/\b(raisin|raisins|unsweetened dried fruit)\b/.test(text)&&!/\b(candy|chocolate|yogurt covered|added sugar|corn syrup)\b/.test(text)){score+=1;reasons.push('portable runner carbohydrate');}
  // Plain potatoes are useful endurance fuel: carbohydrate-rich, naturally low
  // in fat, and commonly a strong potassium source. Recognize product names such
  // as "Idaho Potatoes" even when the cooking method is not included, but do not
  // extend the bonus to fried, loaded, cheesy, or snack-food preparations.
  if(/\b(potato|potatoes|russet|yukon gold)\b/.test(text)&&fat<=5&&!/\b(fries|french fry|chips?|hash browns?|tater tots?|loaded|cheesy|scalloped|au gratin|fried)\b/.test(text)){score+=1.5;reasons.push('low-fat endurance carbohydrate');}
  // Corn is a starchy whole-food carbohydrate that can support training and
  // glycogen replacement. Keep processed snack foods and rich preparations out
  // of this bonus; their entered fat, sugar, and sodium still affect the score.
  if(/\b(corn|sweet corn|corn kernels?)\b/.test(text)&&fat<=5&&!/\b(corn chips?|tortilla chips?|corn dog|creamed corn|caramel corn|popcorn|corn syrup|fried)\b/.test(text)){score+=1.25;reasons.push('starchy whole-food carbohydrate');}
  if((parseFloat(item.potassium)||0)>=600){score+=0.5;reasons.push('potassium-rich');}
  if(/\b(candy|soda|donut|doughnut|pastry|fried|hydrogenated|corn syrup)\b/.test(text)&&!sports){score-=0.75;reasons.push('highly processed ingredients');}
  // Morning-run context: quick carbohydrate in Sports Nutrition is purposeful fuel,
  // while carbohydrate plus protein at breakfast supports post-run recovery.
  if(runDay&&sports&&carbs>=15){score+=0.75;reasons.push((hardWorkout||'run')+' fuel');}
  if(runDay&&item.meal==='breakfast'&&carbs>=25){score+=0.4;reasons.push('post-run carbohydrate');}
  if(runDay&&item.meal==='breakfast'&&protein>=15){score+=0.4;reasons.push('post-run protein');}
  score=Math.max(1,Math.min(10,Math.round(score*10)/10));
  var completenessFields=['cal','prot','fat','carbs','fiber','sugar','sodium'],complete=0,totalChecks=completenessFields.length;
  completenessFields.forEach(function(field){if(item[field]!==undefined&&item[field]!==null&&item[field]!=='')complete++;});
  [{amount:protein,field:'proteinSource'},{amount:carbs,field:'carbSource'},{amount:fat,field:'fatSource'}].forEach(function(check){if(check.amount>0){totalChecks++;if(item[check.field]&&item[check.field]!=='unknown')complete++;}});
  var confidencePct=totalChecks?Math.round(complete/totalChecks*100):0,confidence=confidencePct>=80?'High':confidencePct>=55?'Medium':'Low';
  var label=score>=9?'Excellent':score>=7?'Good':score>=5?'Fair':score>=3?'Low':'Poor';
  return {score:score,label:label,reason:reasons.slice(0,3).join(' · ')||'Add label details for a more precise rating',confidence:confidence,confidencePct:confidencePct,workoutContext:runDay?(hardWorkout?hardWorkout+' workout':'run day'):'rest / recovery day'};
}

function parseFluidOzFromServingLabel(label){
  var s=String(label||'').toLowerCase();
  var m=s.match(/^\s*(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|fluid\s*ounces?|oz|ounces?|milliliters?|millilitres?|ml|liters?|litres?|cups?)\b/);
  if(m){
    var qty=parseFloat(m[1]),unit=m[2];
    if(/oz|ounce/.test(unit))return qty;
    if(/cup/.test(unit))return qty*8;
    if(/ml|milli/.test(unit))return qty/29.5735;
    if(/liter|litre/.test(unit))return qty*33.814;
  }
  var mc=s.match(/^\s*(\d+(?:\.\d+)?)[^()]*\((\d+(?:\.\d+)?)\s*(fl\.?\s*oz|fluid\s*ounces?|ml|milliliters?|millilitres?|liters?|litres?)\)/);
  if(mc){
    var count=parseFloat(mc[1]),vol=parseFloat(mc[2]),vunit=mc[3],ozEach=0;
    if(/fl|fluid/.test(vunit))ozEach=vol;
    else if(/ml|milli/.test(vunit))ozEach=vol/29.5735;
    else if(/liter|litre/.test(vunit))ozEach=vol*33.814;
    if(ozEach>0)return count*ozEach;
  }
  var mw=s.match(/(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|oz|ounces?|milliliters?|millilitres?|ml|liters?|litres?)\s*(?:of\s*)?water\b/);
  if(mw){
    var qty2=parseFloat(mw[1]),unit2=mw[2];
    if(/ml|milli/.test(unit2))return qty2/29.5735;
    if(/liter|litre/.test(unit2))return qty2*33.814;
    return qty2;
  }
  return 0;
}
function isCaffeinatedBeverageName(name){
  var n=String(name||'').toLowerCase();
  return /\b(coffee|espresso|latte|cappuccino|mocha|americano|cold\s*brew|black\s*tea|green\s*tea|energy\s*drinks?|red\s*bull|monster(?:\s*energy)?|celsius|bang\s*energy|rockstar|reign|ghost\s*energy|c4\s*energy|alani\s*nu)\b/.test(n);
}
function lookupGusisServingOz(name){
  if(typeof GUSIS_PRODUCTS==='undefined'||!GUSIS_PRODUCTS.length)return 0;
  var n=String(name||'').toLowerCase();
  for(var i=0;i<GUSIS_PRODUCTS.length;i++){
    if(n.indexOf(GUSIS_PRODUCTS[i].line.toLowerCase())!==-1){
      return parseFluidOzFromServingLabel(GUSIS_PRODUCTS[i].serving);
    }
  }
  return 0;
}
function liquidOzForMeal(meal){
  var log=window._foodLog||[];
  var total=0;
  log.forEach(function(x){
    if(x.meal!==meal)return;
    if(isCaffeinatedBeverageName(x.name))return;
    var s=parseFloat(x.servings)||1;
    var oz=parseFluidOzFromServingLabel(x.servingLabel);
    if(!oz){
      var fromCatalog=lookupGusisServingOz(x.name);
      if(fromCatalog)oz=fromCatalog;
    }
    total+=oz*s;
  });
  return Math.round(total);
}
function syncAutoLiquidCounters(){
  var changed=false;
  var sportsAuto=liquidOzForMeal('sports');
  var liquidsAuto=liquidOzForMeal('liquids');
  if(sportsAuto!==autoSportsDrinksOz){
    sportsDrinksOz=Math.max(0,sportsDrinksOz+(sportsAuto-autoSportsDrinksOz));
    autoSportsDrinksOz=sportsAuto;
    if(typeof updateSportsDrinksDisplay==='function')updateSportsDrinksDisplay();
    changed=true;
  }
  if(liquidsAuto!==autoOtherLiquidsOz){
    otherLiquidsOz=Math.max(0,otherLiquidsOz+(liquidsAuto-autoOtherLiquidsOz));
    autoOtherLiquidsOz=liquidsAuto;
    if(typeof updateOtherLiquidsDisplay==='function')updateOtherLiquidsDisplay();
    changed=true;
  }
  if(changed&&typeof save==='function')setTimeout(function(){save();},0);
}
function renderFoodItems(){
  var log=window._foodLog||[];
  var autoClassChanged=false;
  log.forEach(function(item){if(inferFoodMacroSources(item))autoClassChanged=true;});
  importHealthyFoodsFromSavedNutrition();
  captureHealthyFoods(log);
  updateHealthyFoodsCount(getHealthyFoods().length);
  if(!window._foodBarcodeImagesChecked){window._foodBarcodeImagesChecked=true;backfillSavedFoodBarcodeImages();}
  var favNames=(getFavorites()||[]).map(function(f){return (f.name||'').toLowerCase();});
  MEALS.forEach(function(meal){
    var listEl=document.getElementById('foodList-'+meal);
    if(!listEl)return;
    var items=log.filter(function(x){return x.meal===meal;});
    listEl.innerHTML='';
    if(!items.length){
      listEl.innerHTML='<div style="font-size:0.8rem;color:#bbb;padding:6px 0 2px;">No items yet — tap + Add</div>';
    } else {
      items.forEach(function(it){
        if(!it.id)it.id='f'+Date.now()+'_'+Math.random().toString(36).slice(2,5);
        var svgs=parseFloat(it.servings)||1;
        var servingSize=String(it.servingLabel||'').replace(/^per\s+/i,'').trim()||'1 serving';
        var totalCal=Math.round((parseFloat(it.cal)||0)*svgs);
        var totalProt=Math.round((parseFloat(it.prot)||0)*svgs);
        var isFavItem=favNames.indexOf((it.name||'').toLowerCase())!==-1;

        var div=document.createElement('div');
        div.style.cssText='padding:6px 4px;border-bottom:1px solid #f5ede0;';

        var photoRow=document.createElement('div');
        photoRow.style.cssText='display:flex;align-items:center;gap:7px;margin:0 0 6px;';
        var thumb=document.createElement('div');
        thumb.style.cssText='width:48px;height:48px;border:1px solid #dbe4ea;border-radius:8px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;font-size:1.15rem;';
        var photoSrc=it.imageData||it.imageUrl||'';
        if(photoSrc){var img=document.createElement('img');img.src=photoSrc;img.alt=(it.name||'Food')+' thumbnail';img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover;';img.onerror=function(){this.style.display='none';this.parentNode.textContent='🍽️';};thumb.appendChild(img);}else thumb.textContent='🍽️';
        function makeFoodPhotoButton(labelText,useCamera){var label=document.createElement('label');label.style.cssText='background:'+(useCamera?'#ecfdf5':'#eff6ff')+';color:'+(useCamera?'#166534':'#1d4ed8')+';border:1px solid '+(useCamera?'#86efac':'#93c5fd')+';border-radius:6px;padding:5px 7px;font-size:.68rem;font-weight:800;cursor:pointer;';label.textContent=labelText;var input=document.createElement('input');input.type='file';input.accept='image/*';if(useCamera)input.capture='environment';input.style.display='none';input.onchange=(function(id){return function(){if(this.files&&this.files[0])setFoodThumbnail(id,this.files[0]);this.value='';};})(it.id);label.appendChild(input);return label;}
        photoRow.appendChild(thumb);photoRow.appendChild(makeFoodPhotoButton('📷 Take',true));photoRow.appendChild(makeFoodPhotoButton('🖼 Choose Existing',false));div.appendChild(photoRow);

        // Row 1: name input + fav star + delete
        var row1=document.createElement('div');
        row1.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:4px;';

        var nameInp=document.createElement('input');
        nameInp.type='text'; nameInp.value=it.name||'';
        nameInp.placeholder=MEAL_HINTS[meal]||'Food';
        nameInp.style.cssText='flex:1;min-width:0;border:1px solid #e9ecef;border-radius:5px;padding:4px 6px;font-size:0.85rem;';
        nameInp.onchange=(function(id){return function(){updateFoodField(id,'name',this.value);};})(it.id);

        var favBtn=document.createElement('button');
        favBtn.title='Save to Food Database'; favBtn.textContent='⭐';
        favBtn.style.cssText='background:'+(isFavItem?'#f39c12':'#ddd')+';color:#fff;border:none;border-radius:5px;width:26px;height:26px;cursor:pointer;font-size:0.78rem;flex-shrink:0;';
        favBtn.onclick=(function(id){return function(){saveFoodAsFavorite(id);};})(it.id);

        var delBtn=document.createElement('button');
        delBtn.title='Delete'; delBtn.textContent='✕';
        delBtn.style.cssText='background:#e74c3c;color:#fff;border:none;border-radius:5px;width:26px;height:26px;cursor:pointer;font-size:0.85rem;flex-shrink:0;';
        delBtn.onclick=(function(id){return function(){removeFoodItem(id);};})(it.id);

        row1.appendChild(nameInp); row1.appendChild(favBtn); row1.appendChild(delBtn);
        div.appendChild(row1);

        var servingEdit=document.createElement('label');
        servingEdit.style.cssText='display:grid;grid-template-columns:auto minmax(0,1fr) minmax(104px,0.7fr);align-items:center;gap:6px;font-size:0.72rem;font-weight:700;color:#475569;margin:0 0 5px;';
        servingEdit.textContent='Serving size';
        var servingInput=document.createElement('input');
        servingInput.type='text';servingInput.value=servingSize;servingInput.placeholder='Example: 1 cup, 30 g, 8 oz';
        servingInput.style.cssText='flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:5px;padding:4px 6px;font-size:0.76rem;';
        servingInput.onchange=(function(id){return function(){updateFoodField(id,'servingLabel',this.value.trim()||'1 serving');};})(it.id);
        servingEdit.appendChild(servingInput);
        var servingUnit=document.createElement('select');
        servingUnit.style.cssText='min-width:0;border:1px solid #cbd5e1;border-radius:5px;padding:4px 5px;font-size:0.74rem;background:#fff;';
        var detectedUnit=servingUnitFromLabel(servingSize),unitPlaceholder=document.createElement('option');unitPlaceholder.value='';unitPlaceholder.textContent='Choose unit';servingUnit.appendChild(unitPlaceholder);
        SERVING_UNITS.forEach(function(unit){var option=document.createElement('option');option.value=unit;option.textContent=unit;if(unit===detectedUnit)option.selected=true;servingUnit.appendChild(option);});
        servingUnit.onchange=(function(id){return function(){if(this.value)applyFoodServingUnit(id,this.value);};})(it.id);
        servingEdit.appendChild(servingUnit);div.appendChild(servingEdit);

        var servingCalories=document.createElement('div');
        servingCalories.style.cssText='font-size:0.75rem;font-weight:700;color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:4px 7px;margin:0 0 5px;';
        servingCalories.textContent='Actual serving: '+svgs+' × '+servingSize+' · '+Math.round(parseFloat(it.cal)||0)+' calories each';
        div.appendChild(servingCalories);

        var quality=runnerFoodQuality(it);
        var qualityBox=document.createElement('div');
        qualityBox.style.cssText='background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:6px 8px;margin:0 0 6px;';
        var qualityHeading=document.createElement('div');
        qualityHeading.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.72rem;font-weight:800;color:#334155;margin-bottom:5px;';
        qualityHeading.innerHTML='<span>Runner food quality</span><span>'+quality.score+'/10 · '+quality.label+'</span>';
        var qualityTrack=document.createElement('div');
        qualityTrack.style.cssText='height:10px;position:relative;border-radius:999px;background:linear-gradient(90deg,#dc2626 0%,#f97316 25%,#facc15 50%,#84cc16 75%,#16a34a 100%);box-shadow:inset 0 0 0 1px rgba(15,23,42,.12);';
        var qualityMarker=document.createElement('span');
        qualityMarker.style.cssText='position:absolute;top:50%;left:'+(((quality.score-1)/9)*100)+'%;width:15px;height:15px;border-radius:50%;background:#fff;border:3px solid #0f172a;box-sizing:border-box;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(15,23,42,.35);';
        qualityTrack.appendChild(qualityMarker);
        var qualityReason=document.createElement('div');
        qualityReason.style.cssText='font-size:0.62rem;color:#64748b;line-height:1.3;margin-top:4px;';
        qualityReason.textContent='Data confidence: '+quality.confidence+' ('+quality.confidencePct+'%) · '+quality.reason;
        qualityBox.appendChild(qualityHeading);qualityBox.appendChild(qualityTrack);qualityBox.appendChild(qualityReason);div.appendChild(qualityBox);

        // Row 2: macro grid using standalone _mkMacroCell
        var grid=document.createElement('div');
        grid.style.cssText='display:grid;grid-template-columns:1fr repeat(4,1fr);gap:4px;margin-bottom:4px;';
        grid.appendChild(_mkMacroCell('Svgs','servings',svgs,true,it.id));
        grid.appendChild(_mkMacroCell('Cal/serving','cal',it.cal,false,it.id));
        grid.appendChild(_mkMacroCell('Prot','prot',it.prot,false,it.id));
        grid.appendChild(_mkMacroCell('Fat','fat',it.fat,false,it.id));
        grid.appendChild(_mkMacroCell('Carbs','carbs',it.carbs,false,it.id));
        div.appendChild(grid);

        // Total line (whenever servings isn't exactly 1 — covers partial servings like 0.25 too)
        if(svgs!==1){
          var totalFat=Math.round((parseFloat(it.fat)||0)*svgs*10)/10;
          var totalCarbs=Math.round((parseFloat(it.carbs)||0)*svgs*10)/10;
          var tot=document.createElement('div');
          tot.style.cssText='font-size:0.72rem;color:#e67e22;text-align:right;margin-bottom:3px;';
          tot.textContent='Total (×'+svgs+'): '+totalCal+' cal · '+totalProt+'g prot · '+totalFat+'g fat · '+totalCarbs+'g carbs';
          div.appendChild(tot);
        }

        // Micronutrients (fiber, sugar, sodium, vitamins, minerals) — collapsed by default
        var hasMicroData=MICRO_FIELDS.some(function(f){return it[f]!==undefined&&it[f]!==null&&it[f]!=='';});
        var isMicroOpen=!!(window._microExpanded&&window._microExpanded[it.id]);
        var microToggle=document.createElement('button');
        microToggle.type='button';
        microToggle.textContent=(isMicroOpen?'▾':'▸')+' Micronutrients'+(hasMicroData&&!isMicroOpen?' •':'');
        microToggle.style.cssText='background:none;border:none;color:#0f766e;font-size:0.72rem;font-weight:600;cursor:pointer;padding:2px 0;margin-bottom:3px;text-align:left;';
        microToggle.onclick=(function(id){return function(){window._microExpanded=window._microExpanded||{};window._microExpanded[id]=!window._microExpanded[id];renderFoodItems();};})(it.id);
        div.appendChild(microToggle);
        if(isMicroOpen){
          var microGrid=document.createElement('div');
          microGrid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:5px;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:6px;padding:6px;';
          MICRO_FIELDS.forEach(function(f){
            var meta=MICRO_META[f];
            microGrid.appendChild(_mkMacroCell(meta.icon+' '+meta.label+' ('+meta.unit+')',f,it[f],false,it.id));
          });
          div.appendChild(microGrid);
          if(svgs!==1){
            var microTot=document.createElement('div');
            microTot.style.cssText='font-size:0.7rem;color:#0f766e;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:6px;padding:5px 7px;margin:-2px 0 5px;line-height:1.5;';
            microTot.textContent='Total (×'+svgs+'): '+MICRO_FIELDS.map(function(f){
              var meta=MICRO_META[f],raw=parseFloat(it[f])||0;
              return meta.label+' '+(Math.round(raw*svgs*10)/10)+meta.unit;
            }).join(' · ');
            div.appendChild(microTot);
          }
        }

        // Row 3: Copy + Move-to dropdown
        var row3=document.createElement('div');
        row3.style.cssText='display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:2px;';

        var copyBtn=document.createElement('button');
        copyBtn.textContent='📋 Copy';
        copyBtn.style.cssText='background:#16a085;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.76rem;cursor:pointer;';
        copyBtn.onclick=(function(id){return function(){copyFoodItem(id);};})(it.id);

        var moveSelect=document.createElement('select');
        moveSelect.style.cssText='font-size:0.76rem;border:1px solid #ddd;border-radius:4px;padding:3px 5px;background:#fff;color:#333;';
        var defOpt=document.createElement('option');
        defOpt.value=''; defOpt.textContent='→ Move to…';
        moveSelect.appendChild(defOpt);
        MEALS.filter(function(m){return m!==meal;}).forEach(function(m){
          var opt=document.createElement('option');
          opt.value=m; opt.textContent=MEAL_LABELS[m];
          moveSelect.appendChild(opt);
        });
        moveSelect.onchange=(function(id){return function(){if(this.value){moveFoodToMeal(id,this.value);}this.value='';};})(it.id);

        row3.appendChild(copyBtn); row3.appendChild(moveSelect);
        div.appendChild(row3);
        listEl.appendChild(div);
      });
    }

    // Meal subtitle
    var stEl=document.getElementById('st-'+meal);
    if(stEl){
      var mCal=items.reduce(function(a,x){return a+(parseFloat(x.cal)||0)*(parseFloat(x.servings)||1);},0);
      stEl.textContent=items.length?(items.length+' item'+(items.length>1?'s':''))+(mCal?' · '+Math.round(mCal)+' cal':''):'';
    }
    // Restore open/closed state from saved preference; default is collapsed
    var _mStates=JSON.parse(localStorage.getItem('meal_open_states')||'{}');
    var mb=document.getElementById('mb-'+meal);
    var chev=document.getElementById('chev-'+meal);
    if(mb){
      var isOpen=_mStates[meal]===true;
      mb.style.display=isOpen?'block':'none';
      if(chev)chev.textContent=isOpen?'▾':'▸';
    }
  });
  updateMacroTotals();
  syncAutoLiquidCounters();
  if(autoClassChanged)setTimeout(function(){save();},0);
}
function _setMealOpen(meal,isOpen){
  var mb=document.getElementById('mb-'+meal);
  var chev=document.getElementById('chev-'+meal);
  if(mb)mb.style.display=isOpen?'block':'none';
  if(chev)chev.textContent=isOpen?'▾':'▸';
  var _ms=JSON.parse(localStorage.getItem('meal_open_states')||'{}');
  _ms[meal]=isOpen;
  localStorage.setItem('meal_open_states',JSON.stringify(_ms));
}
function toggleMealSection(meal){
  var mb=document.getElementById('mb-'+meal);
  if(!mb)return;
  _setMealOpen(meal,mb.style.display==='none');
}

function aiSearchFood(){
  var q=(document.getElementById('aiFoodQuery')||{}).value;
  if(!q||!q.trim())return;
  q=q.trim();
  var key=journalAIKey();
  if(!key){alert('Please enter your AI key in Settings first.');return;}
  var resultsDiv=document.getElementById('aiFoodResults');
  if(resultsDiv){resultsDiv.style.display='block';resultsDiv.innerHTML='<div style="color:#666;font-size:0.82rem;padding:4px;">&#x23F3; Searching...</div>';}
  // Built from MICRO_FIELDS/MICRO_META so every tracked micronutrient is
  // requested automatically -- adding a nutrient to MICRO_META is enough
  // to have this search path pick it up too, no separate list to maintain.
  var microSchema=MICRO_FIELDS.map(function(f){return '"'+f+'": '+MICRO_META[f].label+' in '+MICRO_META[f].unit+' per serving as a plain number';}).join('\n- ');
  var prompt='Return nutrition facts for: '+q+'\n'
    +'Respond with ONLY a single JSON object -- no markdown, no code fences, no explanation, nothing else before or after. The JSON must be {"foods":[...]}  with 1 to 3 entries (one per common serving size, if relevant). Each entry must have these exact keys:\n'
    +'- "name": the food name, including the serving size if relevant (for example "Banana, medium")\n'
    +'- "servingLabel": the serving size as a short string (for example "1 medium (118g)")\n'
    +'- "cal": Calories per serving as a plain number\n'
    +'- "prot": Protein grams per serving as a plain number\n'
    +'- "fat": Total Fat grams per serving as a plain number\n'
    +'- "carbs": Total Carbohydrate grams per serving as a plain number\n'
    +'- '+microSchema+'\n'
    +'Use your best nutritional knowledge for realistic values, including every listed micronutrient -- do not skip any of them. All numeric values must be numbers, not strings. Use 0 only when a value is genuinely negligible or absent, never to mean unknown.';
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2000,messages:[{role:'user',content:prompt}]})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error)throw new Error(data.error.message);
    var text=(data.content&&data.content[0]&&data.content[0].text||'').trim();
    if(!text){if(resultsDiv)resultsDiv.innerHTML='<div style="color:#e74c3c;font-size:0.82rem;">No results.</div>';return;}
    var parsed;
    try{parsed=JSON.parse(text);}catch(e){
      var m=text.match(/\{[\s\S]*\}/);
      if(m){try{parsed=JSON.parse(m[0]);}catch(e2){}}
    }
    var foods=(parsed&&parsed.foods)||[];
    if(!foods.length){if(resultsDiv)resultsDiv.innerHTML='<div style="color:#e74c3c;font-size:0.82rem;">Could not parse results.</div>';return;}
    // Store parsed items in window cache to avoid onclick quoting issues
    window._aiFoodCache=[];
    var html='<div style="display:flex;flex-direction:column;gap:5px;">';
    foods.forEach(function(f,idx){
      var item={name:String(f.name||q),servingLabel:String(f.servingLabel||'1 serving'),cal:f.cal||0,prot:f.prot||0,fat:f.fat||0,carbs:f.carbs||0};
      MICRO_FIELDS.forEach(function(mf){item[mf]=(f[mf]!==undefined&&f[mf]!==null&&f[mf]!==0)?f[mf]:0;});
      window._aiFoodCache.push(item);
      var summary=[item.cal?item.cal+' cal':'',item.prot?item.prot+'g pro':'',item.fat?item.fat+'g fat':'',item.carbs?item.carbs+'g carb':'',item.fiber?item.fiber+'g fiber':'',item.sodium?item.sodium+'mg Na':''].filter(Boolean).join(' · ');
      html+='<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #ddd;border-radius:7px;padding:6px 10px;gap:8px;">'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-weight:600;font-size:0.83rem;color:#222;">'+escHtml(item.name)+'</div>'
        +(summary?'<div style="font-size:0.77rem;color:#666;">'+escHtml(summary)+'</div>':'')
        +'</div>'
        +'<button onclick="aiAddFoodByIndex('+idx+')" '
        +'style="background:#4338ca;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.78rem;cursor:pointer;white-space:nowrap;flex-shrink:0;">+ Add</button>'
        +'</div>';
    });
    html+='</div>';
    if(resultsDiv){resultsDiv.style.display='block';resultsDiv.innerHTML=html;}
  }).catch(function(err){
    if(resultsDiv)resultsDiv.innerHTML='<div style="color:#e74c3c;font-size:0.82rem;">Error: '+err.message+'</div>';
  });
}

function aiAddFoodByIndex(idx){
  var cache=window._aiFoodCache;
  if(!cache||!cache[idx])return;
  var item_data=cache[idx];
  var meal=(document.getElementById('aiFoodTargetMeal')||{}).value||'snack';
  var item={
    id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    meal:meal,name:item_data.name,servingLabel:item_data.servingLabel||'1 serving',servings:1,
    cal:item_data.cal||null,prot:item_data.prot||null,fat:item_data.fat||null,carbs:item_data.carbs||null,
    restaurant:looksLikeRestaurantFood(item_data.name)
  };
  MICRO_FIELDS.forEach(function(f){item[f]=item_data[f]||null;});
  if(!window._foodLog)window._foodLog=[];
  window._foodLog.push(item);
  _setMealOpen(meal,true);
  renderFoodItems();save();
  var flash=document.createElement('div');
  flash.style.cssText='color:#16a34a;font-size:0.82rem;font-weight:700;padding:4px 0;';
  flash.textContent='\u2713 Added '+item_data.name+' to '+meal;
  var resultsDiv=document.getElementById('aiFoodResults');
  if(resultsDiv){resultsDiv.insertBefore(flash,resultsDiv.firstChild);setTimeout(function(){if(flash.parentNode)flash.parentNode.removeChild(flash);},2500);}
}

function addFoodItem(meal){
  var mb=document.getElementById('mb-'+meal);
  var chev=document.getElementById('chev-'+meal);
  _setMealOpen(meal,true);
  var entryId='food-entry-'+meal;
  var existing=document.getElementById(entryId);
  if(existing){
    var isHidden=existing.style.display==='none';
    existing.style.display=isHidden?'flex':'none';
    if(isHidden){var ni=document.getElementById('fe-name-'+meal);if(ni)ni.focus();}
    return;
  }
  var entry=document.createElement('div');
  entry.id=entryId;
  entry.style.cssText='display:flex;gap:4px;align-items:center;flex-wrap:wrap;padding:6px 4px;border-top:1px solid #f0f0f0;margin-top:4px;';
  entry.dataset.meal=meal;
  function mkInput(id,ph,w,type){
    var inp=document.createElement('input');
    inp.id=id+meal;inp.placeholder=ph;
    if(type)inp.type=type;
    inp.style.cssText='width:'+w+';border:1px solid #d1d5db;border-radius:4px;padding:5px 7px;font-size:0.82rem;box-sizing:border-box;';
    return inp;
  }
  var nameInp=mkInput('fe-name-',meal==='supplements'?'Supplement name':'Food name','min(120px,40%)',null);
  nameInp.style.flex='2';
  var servingInp=mkInput('fe-serving-','Amount','72px',null);
  var servingUnitInp=document.createElement('select');servingUnitInp.id='fe-serving-unit-'+meal;servingUnitInp.style.cssText='width:92px;border:1px solid #d1d5db;border-radius:4px;padding:5px 4px;font-size:0.78rem;box-sizing:border-box;background:#fff;';
  servingUnitInp.innerHTML='<option value="">Unit</option>'+SERVING_UNITS.map(function(unit){return '<option value="'+unit+'">'+unit+'</option>';}).join('');
  var calInp=mkInput('fe-cal-','Cal','50px','number');
  var protInp=mkInput('fe-prot-','Pro','44px','number');
  var fatInp=mkInput('fe-fat-','Fat','44px','number');
  var carbInp=mkInput('fe-carbs-','Crb','44px','number');
  var addBtn=document.createElement('button');
  addBtn.textContent='Add';
  addBtn.style.cssText='background:#667eea;color:white;border:none;border-radius:4px;padding:5px 10px;font-size:0.82rem;cursor:pointer;';
  addBtn.onclick=function(){submitFoodEntry(meal);};
  var cancelBtn=document.createElement('button');
  cancelBtn.textContent='✕';
  cancelBtn.style.cssText='background:#e5e7eb;color:#374151;border:none;border-radius:4px;padding:5px 8px;font-size:0.82rem;cursor:pointer;';
  cancelBtn.onclick=function(){cancelFoodEntry(meal);};
  [nameInp,servingInp,servingUnitInp,calInp,protInp,fatInp,carbInp,addBtn,cancelBtn].forEach(function(el){entry.appendChild(el);});
  entry.addEventListener('keydown',function(e){
    if(e.key==='Enter')submitFoodEntry(meal);
    else if(e.key==='Escape')cancelFoodEntry(meal);
  });
  if(mb)mb.insertBefore(entry,mb.firstChild);
  nameInp.focus();
}

function submitFoodEntry(meal){
  var nameEl=document.getElementById('fe-name-'+meal);
  if(!nameEl)return;
  var name=nameEl.value.trim();
  if(!name)return;
  var calEl=document.getElementById('fe-cal-'+meal);
  var protEl=document.getElementById('fe-prot-'+meal);
  var fatEl=document.getElementById('fe-fat-'+meal);
  var carbEl=document.getElementById('fe-carbs-'+meal);
  var servingEl=document.getElementById('fe-serving-'+meal);
  var servingUnitEl=document.getElementById('fe-serving-unit-'+meal);
  var servingText=servingEl&&servingEl.value.trim()?servingEl.value.trim():'1';if(servingUnitEl&&servingUnitEl.value)servingText+=' '+servingUnitEl.value;else if(servingText==='1')servingText='1 serving';
  var item={
    id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    meal:meal,name:name,servingLabel:servingText,servings:1,
    cal:calEl&&calEl.value!==''?Math.round(parseFloat(calEl.value)||0):null,
    prot:protEl&&protEl.value!==''?Math.round(parseFloat(protEl.value)||0):null,
    fat:fatEl&&fatEl.value!==''?Math.round(parseFloat(fatEl.value)||0):null,
    carbs:carbEl&&carbEl.value!==''?Math.round(parseFloat(carbEl.value)||0):null
  };
  if(!window._foodLog)window._foodLog=[];
  window._foodLog.push(item);
  cancelFoodEntry(meal);
  renderFoodItems();save();
}

function cancelFoodEntry(meal){
  var entry=document.getElementById('food-entry-'+meal);
  if(entry)entry.style.display='none';
  ['fe-name-','fe-serving-','fe-cal-','fe-prot-','fe-fat-','fe-carbs-'].forEach(function(p){
    var el=document.getElementById(p+meal);if(el)el.value='';
  });
  var servingUnitEl=document.getElementById('fe-serving-unit-'+meal);if(servingUnitEl)servingUnitEl.value='';
}

function removeFoodItem(id){
  window._foodLog=(window._foodLog||[]).filter(function(x){return x.id!==id;});
  renderFoodItems();save();
}

function updateFoodField(id,field,val){
  var log=window._foodLog||[];
  var it=log.find(function(x){return x.id===id;});
  if(!it)return;
  it[field]=val;
  if(field==='proteinSource'||field==='carbSource'||field==='fatSource'){
    it.sourceConfidence='High';it.sourceMethod='Remembered correction';it.sourceClassificationAuto=false;rememberFoodSourceCorrection(it);
  }
  // Re-render only for numeric fields so totals update; name edits stay in-place
  if(field!=='name')renderFoodItems();
  save();
}

function compressFoodPhoto(file,done){
  var reader=new FileReader();reader.onload=function(e){var image=new Image();image.onload=function(){var size=180,scale=Math.min(1,size/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);done(canvas.toDataURL('image/jpeg',.72));};image.src=e.target.result;};reader.readAsDataURL(file);
}
function setFoodThumbnail(id,file){
  if(!file||!/^image\//.test(file.type||''))return;
  compressFoodPhoto(file,function(data){var item=(window._foodLog||[]).find(function(food){return food.id===id;});if(!item)return;item.imageData=data;item.imageUrl='';renderFoodItems();save();});
}
function attachPendingFoodPhoto(event){
  var file=event.target.files&&event.target.files[0];if(!file||!window._pendingScanFood)return;
  compressFoodPhoto(file,function(data){window._pendingScanFood.imageData=data;window._pendingScanFood.imageUrl='';renderPendingFoodPhoto(window._pendingScanFood);});event.target.value='';
}
function renderPendingFoodPhoto(food){
  var preview=document.getElementById('scanFoodPhotoPreview');if(!preview)return;preview.innerHTML='';var src=food&&(food.imageData||food.imageUrl);if(!src){preview.textContent='🍽️';return;}var img=document.createElement('img');img.src=src;img.alt='Food thumbnail';img.style.cssText='width:100%;height:100%;object-fit:cover;';img.onerror=function(){preview.textContent='🍽️';};preview.appendChild(img);
}
function foodThumbnailHtml(food,library,idx){
  var src=food&&(food.imageData||food.imageUrl),inside=src?'<img src="'+escHtml(src)+'" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">':'<span style="font-size:1rem;">🖼️</span>';
  var size=library?'54px':'34px';
  return '<span style="width:'+size+';height:'+size+';border-radius:'+(library?'9px':'6px')+';background:#f8fafc;border:1px solid #dbe4ea;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;">'+inside+'</span>';
}
// The Take/Choose photo buttons for a library row (Healthy 7+, Favorites). Rendered as a
// full-width block BELOW the name/score row -- not squeezed into a narrow column beside it --
// so a long, wrapping food name can never crowd or visually overlap these buttons.
function foodThumbnailButtonsHtml(library,idx){
  var change="setLibraryFoodThumbnail('"+library+"',"+idx+",this.files&&this.files[0]);this.value=''";
  return '<div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">'
    +'<label style="min-height:31px;box-sizing:border-box;background:#ecfdf5;color:#166534;border:1px solid #4ade80;border-radius:6px;padding:7px 3px;font-size:.65rem;font-weight:900;text-align:center;cursor:pointer;white-space:nowrap;display:flex;align-items:center;justify-content:center;">📷 Take<input type="file" accept="image/*" capture="environment" style="display:none" onchange="'+change+'"></label>'
    +'<label style="min-height:31px;box-sizing:border-box;background:#eff6ff;color:#1d4ed8;border:1px solid #60a5fa;border-radius:6px;padding:7px 3px;font-size:.65rem;font-weight:900;text-align:center;cursor:pointer;white-space:nowrap;display:flex;align-items:center;justify-content:center;">🖼 Choose<input type="file" accept="image/*" style="display:none" onchange="'+change+'"></label>'
    +'</div>';
}
function setLibraryFoodThumbnail(library,idx,file){
  if(!file||!/^image\//.test(file.type||''))return;
  compressFoodPhoto(file,function(data){
    var foods=library==='healthy'?getHealthyFoods():getFavorites(),food=foods[idx];if(!food)return;food.imageData=data;food.imageUrl='';
    if(library==='healthy')saveHealthyFoods(foods);else saveFavorites(foods);
    var other=library==='healthy'?getFavorites():getHealthyFoods(),name=String(food.name||'').toLowerCase(),changed=false;other.forEach(function(item){if(String(item.name||'').toLowerCase()===name){item.imageData=data;item.imageUrl='';changed=true;}});if(changed){if(library==='healthy')saveFavorites(other);else saveHealthyFoods(other);}
    (window._foodLog||[]).forEach(function(item){if(String(item.name||'').toLowerCase()===name){item.imageData=data;item.imageUrl='';}});save();renderFoodItems();if(library==='healthy')renderHealthyFoodsList();else renderFavsList();
  });
}
function backfillSavedFoodBarcodeImages(skipRender){
  var favorites=getFavorites(),healthy=getHealthyFoods(),targets=[],seen={};
  favorites.concat(healthy).concat(window._foodLog||[]).forEach(function(food){var code=String(food&&food.barcode||'').replace(/\D/g,'');if(code&&!food.imageUrl&&!food.imageData&&!seen[code]){seen[code]=true;targets.push(code);}});
  if(!targets.length)return Promise.resolve(0);
  return Promise.all(targets.map(function(code){return fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=image_front_small_url,image_front_url,image_url').then(function(response){return response.ok?response.json():null;}).then(function(data){var product=data&&data.product||{},url=product.image_front_small_url||product.image_front_url||product.image_url||'';return {code:code,url:url};}).catch(function(){return {code:code,url:''};});})).then(function(results){
    var found={};results.forEach(function(result){if(result.url)found[result.code]=result.url;});var favChanged=false,healthyChanged=false,logChanged=false;
    favorites.forEach(function(food){var url=found[String(food.barcode||'').replace(/\D/g,'')];if(url&&!food.imageUrl&&!food.imageData){food.imageUrl=url;favChanged=true;}});
    healthy.forEach(function(food){var url=found[String(food.barcode||'').replace(/\D/g,'')];if(url&&!food.imageUrl&&!food.imageData){food.imageUrl=url;healthyChanged=true;}});
    (window._foodLog||[]).forEach(function(food){var url=found[String(food.barcode||'').replace(/\D/g,'')];if(url&&!food.imageUrl&&!food.imageData){food.imageUrl=url;logChanged=true;}});
    var byName={};favorites.concat(healthy).concat(window._foodLog||[]).forEach(function(food){var src=food.imageData||food.imageUrl,name=String(food.name||'').toLowerCase();if(src&&name)byName[name]={imageData:food.imageData||'',imageUrl:food.imageUrl||''};});
    favorites.forEach(function(food){var src=byName[String(food.name||'').toLowerCase()];if(src&&!food.imageData&&!food.imageUrl){food.imageData=src.imageData;food.imageUrl=src.imageUrl;favChanged=true;}});
    healthy.forEach(function(food){var src=byName[String(food.name||'').toLowerCase()];if(src&&!food.imageData&&!food.imageUrl){food.imageData=src.imageData;food.imageUrl=src.imageUrl;healthyChanged=true;}});
    if(favChanged)saveFavorites(favorites);if(healthyChanged)saveHealthyFoods(healthy);if(logChanged)save();if(!skipRender&&(favChanged||healthyChanged||logChanged)){renderFoodItems();renderFavsList();renderHealthyFoodsList();}return Object.keys(found).length;
  });
}
function rescanHealthyFoodsAndImages(button,statusId){
  statusId=statusId||'healthyRescanStatus';
  if(button){button.disabled=true;button.textContent='⏳ Scanning saved foods and pictures…';button.style.opacity='.72';}
  var status=document.getElementById(statusId);if(status){status.style.display='block';status.style.color='#475569';status.textContent='Checking every saved Nutrition day, Food Database entry, and available barcode picture…';}
  window._healthyFoodsImported=false;importHealthyFoodsFromSavedNutrition(true);
  backfillSavedFoodBarcodeImages(true).then(function(imagesFound){
    renderHealthyFoodsList();renderFavsList();var done=document.getElementById(statusId),count=getHealthyFoods().length;if(done){done.style.display='block';done.style.color='#166534';done.textContent='✓ Rescan complete: '+count+' healthy food'+(count===1?'':'s')+' found · '+imagesFound+' barcode picture'+(imagesFound===1?'':'s')+' added.';}
  }).catch(function(){renderHealthyFoodsList();renderFavsList();var failed=document.getElementById(statusId);if(failed){failed.style.display='block';failed.style.color='#991b1b';failed.textContent='The food scan finished, but barcode pictures could not be checked. Try again when connected to the internet.';}});
}

function removeDuplicateFoodItems(button,statusId){
  statusId=statusId||'dedupeFoodStatus';
  var status=document.getElementById(statusId);
  if(button)button.disabled=true;
  var log=window._foodLog||[];
  var seen={},keepLog=[],removedToday=0;
  log.forEach(function(item){
    var key=[String(item&&item.name||'').trim().toLowerCase(),item.meal||'',parseFloat(item.cal)||0,parseFloat(item.prot)||0,parseFloat(item.carbs)||0,parseFloat(item.fat)||0,parseFloat(item.servings)||1].join('|');
    if(seen[key]){removedToday++;}
    else{seen[key]=true;keepLog.push(item);}
  });
  window._foodLog=keepLog;
  var favs=getFavorites(),seenFav={},keepFavs=[],removedFavs=0;
  favs.forEach(function(f){
    var key=String(f&&f.name||'').trim().toLowerCase();
    if(!key){keepFavs.push(f);return;}
    if(seenFav[key]){removedFavs++;}
    else{seenFav[key]=true;keepFavs.push(f);}
  });
  if(removedFavs)saveFavorites(keepFavs);
  renderFoodItems();save();
  if(typeof renderFoodLibrarySearch==='function')renderFoodLibrarySearch();
  if(button)button.disabled=false;
  status=document.getElementById(statusId);
  var total=removedToday+removedFavs;
  if(status){
    status.style.display='block';
    status.style.color=total?'#166534':'#475569';
    var parts=[];
    if(removedToday)parts.push(removedToday+' from the food log');
    if(removedFavs)parts.push(removedFavs+' from your Food Database');
    status.textContent=total?('✓ Removed '+total+' duplicate'+(total===1?'':'s')+' - '+parts.join(', ')+'.'):'No duplicate foods found on this device - everything already looks unique.';
  }
}

function copyFoodItem(id){
  var log=window._foodLog||[];
  var idx=log.findIndex(function(x){return x.id===id;});
  if(idx===-1)return;
  var copy=JSON.parse(JSON.stringify(log[idx]));
  copy.id='f'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  log.splice(idx+1,0,copy);
  window._foodLog=log;
  renderFoodItems();save();
}

function moveFoodToMeal(id,targetMeal){
  if(!targetMeal)return;
  var log=window._foodLog||[];
  var it=log.find(function(x){return x.id===id;});
  if(!it)return;
  it.meal=targetMeal;
  renderFoodItems();save();
  // Open target section
  _setMealOpen(targetMeal,true);
}

function isFav(item){
  var favs=getFavorites();
  return favs.some(function(f){return f.name&&item.name&&f.name.toLowerCase()===item.name.toLowerCase();});
}

function macroRatioStorageKey(dateKey){return'macro_ratio_settings_'+(dateKey||dk(today));}
function macroRatioSettings(dateKey){
  dateKey=dateKey||dk(today);var defaults={enabled:true,prot:15,carbs:60,fat:25},raw=localStorage.getItem(macroRatioStorageKey(dateKey));
  // Migrate the former all-days setting once, preserving it only for the day
  // being viewed when this version first opens. Every other date stays independent.
  if(!raw&&localStorage.getItem('macro_ratio_settings_migrated_v2')!=='1'){
    var legacy=localStorage.getItem('macro_ratio_settings');if(legacy){raw=legacy;localStorage.setItem(macroRatioStorageKey(dateKey),legacy);}
    localStorage.setItem('macro_ratio_settings_migrated_v2','1');localStorage.removeItem('macro_ratio_settings');
  }
  try{return Object.assign({},defaults,raw?JSON.parse(raw):{});}catch(ignore){return defaults;}
}
function toggleMacroRatioEditor(){
  var panel=document.getElementById('macroRatioEditor');if(!panel)return;var opening=panel.style.display==='none';panel.style.display=opening?'block':'none';if(!opening)return;
  var current=runnerMacroTarget();document.getElementById('macroCustomProt').value=current.prot;document.getElementById('macroCustomCarbs').value=current.carbs;document.getElementById('macroCustomFat').value=current.fat;var note=document.getElementById('macroRatioEditorTotal');if(note)note.textContent='Current total: '+(current.prot+current.carbs+current.fat)+'%. Total must equal 100%.';
}
function saveCustomMacroRatio(){
  var prot=Number(document.getElementById('macroCustomProt').value),carbs=Number(document.getElementById('macroCustomCarbs').value),fat=Number(document.getElementById('macroCustomFat').value),total=prot+carbs+fat,note=document.getElementById('macroRatioEditorTotal');
  if(!Number.isFinite(total)||prot<5||carbs<5||fat<5||prot>80||carbs>80||fat>80||Math.round(total)!==100){if(note){note.textContent='Protein, carbs, and fat must each be 5–80% and total exactly 100%. Current total: '+(Number.isFinite(total)?total:0)+'%.';note.style.color='#b91c1c';}return;}
  localStorage.setItem(macroRatioStorageKey(dk(today)),JSON.stringify({enabled:true,prot:prot,carbs:carbs,fat:fat}));if(note){note.textContent='Saved for '+dk(today)+': '+prot+'% protein, '+carbs+'% carbs, '+fat+'% fat.';note.style.color='#166534';}updateMacroTotals();if(typeof v26Toast==='function')v26Toast('Macro Ratio updated for this day only');
}
function useAutomaticMacroRatio(){localStorage.setItem(macroRatioStorageKey(dk(today)),JSON.stringify({enabled:false}));var panel=document.getElementById('macroRatioEditor');if(panel)panel.style.display='none';updateMacroTotals();if(typeof v26Toast==='function')v26Toast('Automatic runner macro ratio restored for this day');}

function nutritionHardWorkoutForDate(date){
  var dateKey=dk(date),parts=[];
  try{(getActivities()||[]).filter(function(a){return a&&a.date===dateKey;}).forEach(function(a){parts.push([a.title,a.type,a.workout].filter(Boolean).join(' '));});}catch(ignore){}
  try{var plan=JSON.parse(localStorage.getItem('current_training_plan')||'null');if(plan&&plan.text&&plan.startDate){var planned=extractWorkoutFromActivePlan(plan,date);if(planned)parts.push(planned);}}catch(ignorePlan){}
  var text=parts.join(' ').toLowerCase();
  if(/\blong\s+run\b|\bhalf\s+marathon\b|\bmarathon\b/.test(text))return'long';
  if(/\bintervals?\b|\brepeats?\b|\bspeed\s*work\b|\btrack\s+(?:workout|session)\b|\bhill\s+repeats?\b/.test(text))return'interval';
  if(/\btempo\b|\bthreshold\b/.test(text))return'tempo';
  if(/\bquality\b/.test(text))return'quality';
  return'';
}
function nutritionPerformancePreset(dateKey){
  var date=new Date((dateKey||dk(today))+'T12:00:00'),tomorrow=new Date(date);tomorrow.setDate(date.getDate()+1);
  var workout=nutritionHardWorkoutForDate(date),phase='day';if(!workout){workout=nutritionHardWorkoutForDate(tomorrow);phase='prior';}if(!workout)return null;
  // Periodized targets for a 185 lb distance runner. Each row totals 100%.
  // Long-run eve reaches about 6 g/kg carbohydrate without requiring full race carb-loading.
  var table={
    long:{prior:{calories:3200,prot:19,carbs:63,fat:18},day:{calories:3300,prot:20,carbs:60,fat:20}},
    tempo:{prior:{calories:2800,prot:20,carbs:60,fat:20},day:{calories:2900,prot:22,carbs:55,fat:23}},
    interval:{prior:{calories:2800,prot:20,carbs:60,fat:20},day:{calories:2950,prot:21,carbs:56,fat:23}},
    quality:{prior:{calories:2800,prot:20,carbs:60,fat:20},day:{calories:2900,prot:22,carbs:55,fat:23}}
  },target=table[workout][phase],weight=calorieAdvisorLatestWeight(dateKey||dk(today))||185,scaledCalories=Math.round((target.calories*(weight/185))/25)*25,names={long:'Long Run',tempo:'Tempo Run',interval:'Interval Run',quality:'Quality Run'};
  return{workout:workout,phase:phase,calories:scaledCalories,prot:target.prot,carbs:target.carbs,fat:target.fat,label:phase==='day'?'Today: '+names[workout]+' — Training & Recovery Target':'Tomorrow: '+names[workout]+' — Pre-Fueling Target'};
}

function runnerMacroTarget(){
  var dateKey=dk(today),activities=typeof getActivities==='function'?getActivities().filter(function(a){return a.date===dateKey;}):[],workouts=activities.filter(function(a){return !/rest\s*day/i.test(String(a.type||a.title||''));});
  var planSummary=typeof journalTodayTrainingSummary==='function'?journalTodayTrainingSummary():'',activityText=workouts.map(function(a){return [a.title,a.type].filter(Boolean).join(' ');}).join(' '),text=(activityText||planSummary||'').toLowerCase();
  var longest=workouts.reduce(function(max,a){return Math.max(max,parseFloat(a.distance)||0);},0),target={prot:20,carbs:50,fat:30,label:'Rest / recovery day'};
  if(/race|long run|marathon|half marathon/.test(text)||longest>=8)target={prot:18,carbs:65,fat:17,label:'Long-run / race-day target'};
  else if(/tempo|interval|speed|threshold|track|hill repeat|quality/.test(text))target={prot:20,carbs:60,fat:20,label:'Speed / quality-workout target'};
  else if(/run|cycle|bike|strength|weight|cross.train/.test(text)||activities.length)target={prot:20,carbs:55,fat:25,label:'Training-day target'};
  var performance=nutritionPerformancePreset(dateKey);if(performance)target={prot:performance.prot,carbs:performance.carbs,fat:performance.fat,label:performance.label};
  var custom=macroRatioSettings();if(custom.enabled&&Number(custom.prot)+Number(custom.carbs)+Number(custom.fat)===100)target={prot:Number(custom.prot),carbs:Number(custom.carbs),fat:Number(custom.fat),label:'Custom macro target'};
  target.calories=dailyCalorieTargetData().target;return target;
}
function renderRunnerMacroGuidance(log,totals,ratios){
  var target=runnerMacroTarget(),label=document.getElementById('macroTrainingLabel');if(label)label.textContent=target.label+' · '+target.calories.toLocaleString()+' kcal goal';
  var performance=nutritionPerformancePreset(dk(today)),fuelNote=document.getElementById('performanceFuelNote');
  if(fuelNote){fuelNote.style.display=performance?'block':'none';fuelNote.textContent=performance?(performance.phase==='day'?'Morning workout: aim for 30–40g protein with the post-run meal, then spread the remaining protein across the day.':'Pre-fueling day: emphasize carbohydrates at lunch, dinner, and the evening snack.') : '';}
  var fields={prot:{grams:totals.prot,kcal:4,name:'protein'},carbs:{grams:totals.carbs,kcal:4,name:'carbohydrates'},fat:{grams:totals.fat,kcal:9,name:'fat'}};
  Object.keys(fields).forEach(function(kind){
    var cap=kind==='prot'?'Prot':kind.charAt(0).toUpperCase()+kind.slice(1),actual=ratios[kind]||0,goal=target[kind],gramsGoal=target.calories*(goal/100)/fields[kind].kcal,remaining=Math.max(0,Math.round(gramsGoal-fields[kind].grams)),difference=actual-goal,status=difference<-3?'Low':difference>3?'High':'On target';
    var a=document.getElementById('targetActual'+cap),t=document.getElementById('target'+cap),r=document.getElementById('remain'+cap),s=document.getElementById('status'+cap);if(a)a.textContent=actual.toFixed(1)+'%';if(t)t.textContent=goal+'%';if(r)r.textContent=remaining+'g';if(s){s.textContent=status;s.className='macro-status '+(status==='On target'?'on':status.toLowerCase());}
    fields[kind].remaining=remaining;fields[kind].difference=difference;
  });
  var meals=['breakfast','lunch','dinner','snack','liquids','sports','supplements'],names={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snack:'Snacks',liquids:'Liquids',sports:'Sports',supplements:'Supplements'},dist=document.getElementById('macroMealDistribution');
  if(dist)dist.innerHTML=meals.map(function(meal){var rows=log.filter(function(x){return (x.meal||'snack')===meal;}),p=0,c=0,f=0;rows.forEach(function(x){var n=parseFloat(x.servings)||1;p+=(parseFloat(x.prot)||0)*n;c+=(parseFloat(x.carbs)||0)*n;f+=(parseFloat(x.fat)||0)*n;});return '<div class="meal-macro-chip"><strong>'+names[meal]+'</strong>'+Math.round(p)+'g P · '+Math.round(c)+'g C · '+Math.round(f)+'g F</div>';}).join('');
}

function closeMicroSourceModal(){var m=document.getElementById('microSourceModal');if(m)m.style.display='none';}
function showMicroSourceBreakdown(field,name,unit){
  var log=window._foodLog||[];
  var mealNames={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snack:'Snack',liquids:'Liquids',sports:'Sports',supplements:'Supplements'};
  var rows=log.map(function(x){var s=parseFloat(x.servings)||1,amount=(parseFloat(x[field])||0)*s;return {name:x.name||'Untitled food',meal:mealNames[x.meal]||x.meal||'',amount:amount};}).filter(function(r){return r.amount>0.0001;}).sort(function(a,b){return b.amount-a.amount;});
  var total=rows.reduce(function(sum,r){return sum+r.amount;},0);
  var fmt=function(v){return unit==='mg'&&v>=100?Math.round(v).toLocaleString():Math.round(v*10)/10;};
  var titleEl=document.getElementById('microSourceModalTitle'),summaryEl=document.getElementById('microSourceModalSummary'),bodyEl=document.getElementById('microSourceModalBody'),modal=document.getElementById('microSourceModal');
  if(titleEl)titleEl.textContent=name+' sources today';
  if(summaryEl)summaryEl.textContent=rows.length?('From '+rows.length+' logged food'+(rows.length===1?'':'s')+' · '+fmt(total)+unit+' total'):'None of the foods logged today have '+name.toLowerCase()+' recorded.';
  if(bodyEl){
    if(!rows.length){
      bodyEl.innerHTML='<div style="text-align:center;color:#98a2b3;padding:22px 6px;font-size:.82rem;line-height:1.5;">None of the foods logged today have '+escHtml(name.toLowerCase())+' data recorded yet. Items logged before this nutrient was tracked, or added without full nutrition info, show 0 until re-logged or edited.</div>';
    } else {
      bodyEl.innerHTML=rows.map(function(r){
        var pct=total?Math.round(r.amount/total*100):0;
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;"><div style="min-width:0;"><div style="font-size:.85rem;color:#1e293b;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escHtml(r.name)+'</div>'+(r.meal?'<div style="font-size:.7rem;color:#94a3b8;">'+escHtml(r.meal)+'</div>':'')+'</div><div style="text-align:right;white-space:nowrap;"><div style="font-size:.85rem;font-weight:700;color:#1e293b;">'+fmt(r.amount)+unit+'</div><div style="font-size:.7rem;color:#94a3b8;">'+pct+'%</div></div></div>';
      }).join('');
    }
  }
  if(modal)modal.style.display='flex';
}

function updateMacroTotals(){
  var log=window._foodLog||[];
  var hasData=log.length>0;
  var totals=log.reduce(function(a,x){
    var s=parseFloat(x.servings)||1;
    var r={cal:a.cal+(parseFloat(x.cal)||0)*s,prot:a.prot+(parseFloat(x.prot)||0)*s,fat:a.fat+(parseFloat(x.fat)||0)*s,carbs:a.carbs+(parseFloat(x.carbs)||0)*s};
    MICRO_FIELDS.forEach(function(f){r[f]=(a[f]||0)+(parseFloat(x[f])||0)*s;});
    return r;
  },{cal:0,prot:0,fat:0,carbs:0});
  var bar=document.getElementById('macroTotalsBar');
  if(bar)bar.style.display=hasData?'block':'none';
  var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=Math.round(v);};
  set('totCal',totals.cal);set('totProt',totals.prot);set('totFat',totals.fat);set('totCarbs',totals.carbs);
  var calorieTarget=dailyCalorieTargetData().target,calorieOver=Math.max(0,Math.round(totals.cal-calorieTarget)),calorieIndicator=document.getElementById('calorieOverIndicator'),calorieTotal=document.getElementById('totCal');
  if(calorieIndicator){calorieIndicator.style.display=calorieOver?'block':'none';calorieIndicator.innerHTML=calorieOver?'&#x26A0;&#xFE0F; Over daily calorie target by '+calorieOver.toLocaleString()+' kcal':'';}
  if(calorieTotal)calorieTotal.style.color=calorieOver?'#b91c1c':'';
  if(bar){bar.style.borderColor=calorieOver?'#ef4444':'#e9ecef';bar.style.background=calorieOver?'#fff7f7':'#f8f9fa';}
  // Daily food quality is calorie-weighted across every logged food in all meal sections.
  // This lets the overall bar reflect what made up most of the day's intake while still
  // including zero-calorie entries with a small fallback weight.
  var qualityWrap=document.getElementById('dailyFoodQuality'),qualityLabel=document.getElementById('dailyFoodQualityLabel'),qualityMarker=document.getElementById('dailyFoodQualityMarker'),qualityTrack=document.getElementById('dailyFoodQualityTrack'),qualityNote=document.getElementById('dailyFoodQualityNote');
  if(qualityWrap){
    if(!log.length){qualityWrap.style.display='none';}
    else {
      var qualityTotal=0,qualityWeight=0,confidenceTotal=0,qualityContext='rest / recovery day';
      log.forEach(function(item){var quality=runnerFoodQuality(item),servings=Math.max(0.01,parseFloat(item.servings)||1),calories=Math.max(0,(parseFloat(item.cal)||0)*servings),weight=calories||servings;qualityTotal+=quality.score*weight;confidenceTotal+=quality.confidencePct*weight;qualityWeight+=weight;if(quality.workoutContext!=='rest / recovery day')qualityContext=quality.workoutContext;});
      var dailyScore=qualityWeight?qualityTotal/qualityWeight:5,dailyLabel=dailyScore>=9?'Excellent':dailyScore>=7?'Good':dailyScore>=5?'Fair':dailyScore>=3?'Low':'Poor',markerLeft=Math.max(0,Math.min(100,(dailyScore-1)/9*100));
      var dailyConfidence=qualityWeight?Math.round(confidenceTotal/qualityWeight):0,dailyConfidenceLabel=dailyConfidence>=80?'High':dailyConfidence>=55?'Medium':'Low';
      qualityWrap.style.display='block';if(qualityLabel)qualityLabel.textContent=dailyScore.toFixed(1)+'/10 · '+dailyLabel;if(qualityMarker)qualityMarker.style.left=markerLeft+'%';if(qualityTrack)qualityTrack.setAttribute('aria-valuenow',dailyScore.toFixed(1));if(qualityNote)qualityNote.textContent='Across '+log.length+' food item'+(log.length===1?'':'s')+' · '+qualityContext+' · data confidence: '+dailyConfidenceLabel+' ('+dailyConfidence+'%)';
    }
  }
  // Macro ratios use caloric contribution: protein/carbohydrates = 4 kcal/g, fat = 9 kcal/g.
  // Since totals aggregate the full food log, all six meal sections are included.
  var macroCalories={prot:totals.prot*4,carbs:totals.carbs*4,fat:totals.fat*9};
  var macroCalTotal=macroCalories.prot+macroCalories.carbs+macroCalories.fat;
  var macroRatios=macroCalTotal?{prot:macroCalories.prot/macroCalTotal*100,carbs:macroCalories.carbs/macroCalTotal*100,fat:macroCalories.fat/macroCalTotal*100}:{prot:0,carbs:0,fat:0};
  var setRatio=function(kind,labelId,barId){var label=document.getElementById(labelId),segment=document.getElementById(barId),value=macroRatios[kind]||0;if(label)label.textContent=value.toFixed(1)+'%';if(segment)segment.style.width=value+'%';};
  setRatio('prot','ratioProt','ratioProtBar');setRatio('carbs','ratioCarbs','ratioCarbsBar');setRatio('fat','ratioFat','ratioFatBar');
  renderRunnerMacroGuidance(log,totals,macroRatios);
  function macroSourceRatios(macroField,sourceField){
    var grams={support:0,limit:0,unknown:0};
    log.forEach(function(item){var amount=(parseFloat(item[macroField])||0)*(parseFloat(item.servings)||1);if(!amount)return;var source=item[sourceField];grams[source==='support'?'support':source==='limit'?'limit':'unknown']+=amount;});
    var total=grams.support+grams.limit+grams.unknown;
    return total?{support:grams.support/total*100,limit:grams.limit/total*100,unknown:grams.unknown/total*100}:{support:0,limit:0,unknown:0};
  }
  function showMacroSources(prefix,values){['Support','Limit','Unknown'].forEach(function(label){var key=label.toLowerCase(),el=document.getElementById('source'+prefix+label);if(el)el.textContent=(values[key]||0).toFixed(1)+'%';});}
  showMacroSources('Prot',macroSourceRatios('prot','proteinSource'));
  showMacroSources('Carb',macroSourceRatios('carbs','carbSource'));
  showMacroSources('Fat',macroSourceRatios('fat','fatSource'));
  MICRO_FIELDS.forEach(function(f){set(MICRO_META[f].elId,totals[f]||0);});
  // Combined adequacy score for the three priority micronutrients. Each nutrient
  // contributes equally and is capped at 100% so one high value cannot hide a shortfall.
  var microQuality=document.getElementById('topMicroQuality'),microQualityLabel=document.getElementById('topMicroQualityLabel'),microQualityMarker=document.getElementById('topMicroQualityMarker'),microQualityTrack=document.getElementById('topMicroQualityTrack'),microQualityNote=document.getElementById('topMicroQualityNote'),microBreakdown=document.getElementById('topMicroBreakdown');
  if(microQuality){
    if(!hasData){microQuality.style.display='none';}
    else {
      // Targets for a 53-year-old male distance runner (US Dietary Reference Intakes, men 51-70).
      // Iron uses the endurance-athlete adjustment (RDA 8mg x ~1.7). Sodium is a floor for
      // sweat losses with a ceiling: above 4,000mg shows as High.
      var priorityMicros=[
        {name:'Iron',field:'iron',value:totals.iron||0,target:14,unit:'mg'},
        {name:'Calcium',field:'calcium',value:totals.calcium||0,target:1000,unit:'mg'},
        {name:'Vitamin D',field:'vitD',value:totals.vitD||0,target:15,unit:'mcg'},
        {name:'Magnesium',field:'magnesium',value:totals.magnesium||0,target:420,unit:'mg'},
        {name:'Vitamin B12',field:'vitB12',value:totals.vitB12||0,target:2.4,unit:'mcg'},
        {name:'Sodium',field:'sodium',value:totals.sodium||0,target:2300,max:4000,unit:'mg'},
        {name:'Potassium',field:'potassium',value:totals.potassium||0,target:3400,unit:'mg'},
        {name:'Zinc',field:'zinc',value:totals.zinc||0,target:11,unit:'mg'},
        {name:'Vitamin C',field:'vitC',value:totals.vitC||0,target:90,unit:'mg'},
        {name:'Fiber',field:'fiber',value:totals.fiber||0,target:28,unit:'g'},
        {name:'Sugar',field:'sugar',value:totals.sugar||0,target:36,max:36,unit:'g'},
        {name:'Caffeine',field:'caffeine',value:totals.caffeine||0,target:400,max:400,unit:'mg'}
      ];
      var completion=priorityMicros.map(function(n){if(n.max&&n.value>n.max)return Math.max(0,1-(n.value-n.max)/n.max);return Math.max(0,Math.min(1,n.value/n.target));});
      var averageCompletion=completion.reduce(function(sum,n){return sum+n;},0)/completion.length;
      var microScore=1+(averageCompletion*9),microLabel=microScore>=9?'Excellent':microScore>=7?'Good':microScore>=5?'Fair':microScore>=3?'Low':'Poor';
      var weakestIndex=completion.indexOf(Math.min.apply(null,completion)),weakest=priorityMicros[weakestIndex];
      microQuality.style.display='block';
      if(microQualityLabel)microQualityLabel.textContent=microScore.toFixed(1)+'/10 · '+microLabel;
      if(microQualityMarker)microQualityMarker.style.left=Math.max(0,Math.min(100,(microScore-1)/9*100))+'%';
      if(microQualityTrack)microQualityTrack.setAttribute('aria-valuenow',microScore.toFixed(1));
      if(microQualityNote)microQualityNote.textContent='Targets for a 53-year-old male distance runner: iron 14mg · calcium 1,000mg · vitamin D 15mcg · magnesium 420mg · vitamin B12 2.4mcg · sodium 2,300–4,000mg · potassium 3,400mg · zinc 11mg · vitamin C 90mg · fiber 28g · sugar ≤36g · caffeine ≤400mg · lowest today: '+weakest.name+' '+Math.round(weakest.value)+weakest.unit;
      if(microBreakdown)microBreakdown.innerHTML=priorityMicros.map(function(n){
        var pct=n.target?Math.max(0,n.value/n.target*100):0,status=(n.max&&n.value>n.max)?'High':pct>=100?'Met':pct>=75?'Close':'Low';
        var statusColor=status==='Met'?'#166534':(status==='Close'||status==='High')?'#92400e':'#991b1b';
        var shownValue=n.unit==='mg'&&n.value>=100?Math.round(n.value).toLocaleString():Math.round(n.value*10)/10;
        return '<div role="button" tabindex="0" aria-label="'+n.name+' - tap to see contributing foods" onclick="showMicroSourceBreakdown(\''+n.field+'\',\''+n.name+'\',\''+n.unit+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();showMicroSourceBreakdown(\''+n.field+'\',\''+n.name+'\',\''+n.unit+'\');}" style="cursor:pointer;background:#fff;border:1px solid '+statusColor+'33;border-radius:9px;padding:8px;min-width:0;"><div style="font-size:.72rem;font-weight:800;color:#334155;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+n.name+'</div><div style="font-size:.86rem;font-weight:900;color:#1e293b;font-variant-numeric:tabular-nums;">'+shownValue+n.unit+' <span style="font-size:.6rem;font-weight:700;color:#64748b;">/ '+n.target.toLocaleString()+(n.max?'–'+n.max.toLocaleString():'')+n.unit+'</span></div><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:5px;"><span style="display:inline-block;border-radius:999px;padding:3px 8px;font-size:.74rem;font-weight:800;background:'+statusColor+'1a;color:'+statusColor+';white-space:nowrap;">'+Math.round(pct)+'% · '+status+'</span><span style="color:#cbd5e1;font-size:.68rem;">›</span></div></div>';
      }).join('');
    }
  }
  // Update hidden fields for backward compat save
  var setHid=function(id,v){var e=document.getElementById(id);if(e)e.value=hasData?Math.round(v):'';};
  setHid('nuCalVal',totals.cal);setHid('nuProtVal',totals.prot);setHid('nuFatVal',totals.fat);setHid('nuCarbsVal',totals.carbs);
  // Water
  var wEl=document.getElementById('totWater');
  if(wEl)wEl.textContent=waterOz?waterOz+' oz':'—';
  if(document.getElementById('calorieAdvisorResult'))calculateDailyCalorieTarget();
  if(typeof renderPreRunMealIdeas==='function')renderPreRunMealIdeas();
}

function calorieAdvisorSettings(){
  try{return Object.assign({base:'',goal:'maintain',refuel:100},JSON.parse(localStorage.getItem('calorie_intake_settings')||'{}'));}
  catch(e){return{base:'',goal:'maintain',refuel:100};}
}
function saveCalorieAdvisorSettings(){
  var base=document.getElementById('calorieBaseTarget'),goal=document.getElementById('calorieGoal'),refuel=document.getElementById('calorieRefuelPct');
  localStorage.setItem('calorie_intake_settings',JSON.stringify({base:base?base.value:'',goal:goal?goal.value:'maintain',refuel:parseInt(refuel&&refuel.value||'100',10)}));
}
function calorieAdvisorLatestWeight(dateKey){
  for(var offset=0;offset<45;offset++){
    var d=new Date(dateKey+'T12:00:00');d.setDate(d.getDate()-offset);
    try{var row=JSON.parse(localStorage.getItem('planner_'+dk(d))||'{}'),weight=parseFloat(row.wWghtVal);if(weight>70&&weight<600)return weight;}catch(e){}
  }
  return 0;
}
function calorieAdvisorDurationHours(value){
  var s=String(value||'').trim();if(!s)return 0;
  if(s.indexOf(':')>=0){var p=s.split(':').map(Number);if(p.length===3)return(p[0]||0)+(p[1]||0)/60+(p[2]||0)/3600;if(p.length===2)return(p[0]||0)/60+(p[1]||0)/3600;}
  return(parseFloat(s)||0)/60;
}
function calorieAdvisorActivityCalories(activity,weightLb){
  var logged=parseFloat(activity.calories)||0;if(logged>0)return{calories:logged,estimated:false};
  var type=String(activity.type||activity.title||'').toLowerCase(),distance=parseFloat(activity.distance)||0,hours=calorieAdvisorDurationHours(activity.duration),kg=(weightLb||185)/2.20462,estimate=0;
  if(type.indexOf('run')>=0&&distance)estimate=(weightLb||185)*distance*.72;
  else if((type.indexOf('walk')>=0||type.indexOf('hike')>=0)&&distance)estimate=(weightLb||185)*distance*.50;
  else if(type.indexOf('cycl')>=0||type.indexOf('bike')>=0)estimate=hours?8*kg*hours:distance*30;
  else if(type.indexOf('strength')>=0||type.indexOf('weight')>=0)estimate=hours?6*kg*hours:0;
  else if(hours)estimate=5.5*kg*hours;
  return{calories:Math.max(0,estimate),estimated:true};
}
function calorieAdvisorActivityDescription(activity,calorieResult){
  var name=String(activity.title||activity.type||'Activity').trim(),parts=[];
  if(parseFloat(activity.distance))parts.push(parseFloat(activity.distance).toFixed(2)+' mi');
  if(activity.duration)parts.push(String(activity.duration));
  parts.push(Math.round(calorieResult.calories||0).toLocaleString()+' kcal '+(calorieResult.estimated?'estimated':'recorded'));
  return name+' ('+parts.join(' · ')+')';
}
function dailyCalorieTargetData(){
  var dateKey=dk(today),settings=calorieAdvisorSettings(),weight=calorieAdvisorLatestWeight(dateKey),manualBase=parseFloat(settings.base)||0,base=manualBase||(weight?Math.round(weight*12.5/50)*50:2200);
  var activities=getActivities().filter(function(a){return a.date===dateKey;}),active=0,estimatedCount=0,activityDetails=[];
  activities.forEach(function(a){var c=calorieAdvisorActivityCalories(a,weight);active+=c.calories;if(c.estimated&&c.calories)estimatedCount++;activityDetails.push(calorieAdvisorActivityDescription(a,c));});
  active=Math.round(active);var refuel=Math.max(0,Math.min(100,parseInt(settings.refuel||100,10)))/100,performance=nutritionPerformancePreset(dateKey),goalAdjust=performance?0:(settings.goal==='loss'?-300:(settings.goal==='gain'?250:0));
  var activityBased=Math.max(1200,Math.round((base+active*refuel+goalAdjust)/25)*25),target=performance?Math.max(performance.calories,activityBased):activityBased,range=Math.max(100,Math.round(target*.05/25)*25);
  return{dateKey:dateKey,settings:settings,weight:weight,manualBase:manualBase,base:base,activities:activities,active:active,estimatedCount:estimatedCount,activityDetails:activityDetails,refuel:refuel,goalAdjust:goalAdjust,target:target,range:range,performancePreset:performance,activityBased:activityBased};
}
function refreshNutritionTargets(showMessage){
  updateMacroTotals();
  if(showMessage&&typeof v26Toast==='function')v26Toast('Calorie and macro targets recalculated together');
}
function calculateDailyCalorieTarget(showMessage){
  var result=document.getElementById('calorieAdvisorResult');if(!result)return;
  var calc=dailyCalorieTargetData(),dateKey=calc.dateKey,settings=calc.settings,baseInput=document.getElementById('calorieBaseTarget'),goalInput=document.getElementById('calorieGoal'),refuelInput=document.getElementById('calorieRefuelPct');
  if(baseInput&&document.activeElement!==baseInput)baseInput.value=settings.base||'';
  if(goalInput)goalInput.value=settings.goal||'maintain';if(refuelInput)refuelInput.value=String(settings.refuel||100);
  var dateLabel=document.getElementById('calorieAdvisorDate');if(dateLabel)dateLabel.textContent=today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  var weight=calorieAdvisorLatestWeight(dateKey),manualBase=parseFloat(settings.base)||0,base=manualBase||(weight?Math.round(weight*12.5/50)*50:2200);
  var activities=getActivities().filter(function(a){return a.date===dateKey;}),active=0,estimatedCount=0;
  var activityDetails=[];
  activities.forEach(function(a){var c=calorieAdvisorActivityCalories(a,weight);active+=c.calories;if(c.estimated&&c.calories)estimatedCount++;activityDetails.push(calorieAdvisorActivityDescription(a,c));});
  active=Math.round(active);var refuel=Math.max(0,Math.min(100,parseInt(settings.refuel||100,10)))/100,goalAdjust=settings.goal==='loss'?-300:(settings.goal==='gain'?250:0);
  var target=calc.target,range=calc.range;weight=calc.weight;manualBase=calc.manualBase;base=calc.base;activities=calc.activities;active=calc.active;estimatedCount=calc.estimatedCount;activityDetails=calc.activityDetails;refuel=calc.refuel;goalAdjust=calc.goalAdjust;
  var logged=Math.round((window._foodLog||[]).reduce(function(sum,x){return sum+(parseFloat(x.cal)||0)*(parseFloat(x.servings)||1);},0)),remaining=Math.max(0,target-logged),over=Math.max(0,logged-target);
  var workoutText=activities.length?activities.length+' workout'+(activities.length===1?'':'s')+' • '+active.toLocaleString()+' active kcal':'No workout logged • 0 active kcal';
  result.innerHTML='<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;"><strong style="font-size:1.45rem;color:#166534;">'+target.toLocaleString()+' kcal</strong><span style="color:#4d7c0f;font-weight:700;">suggested intake</span></div>'
    +(calc.performancePreset?'<div style="margin:6px 0;padding:7px 9px;border-radius:9px;background:#eff6ff;color:#1e3a8a;"><strong>'+escHtml(calc.performancePreset.label)+'</strong><br><span style="font-size:.72rem;">Hard-workout fueling is active. The gradual-loss deduction is paused for this day.</span></div>':'')
    +'<div style="margin-top:4px;"><strong>Practical range:</strong> '+Math.max(1200,target-range).toLocaleString()+'–'+(target+range).toLocaleString()+' kcal</div>'
    +'<div><strong>Calculation:</strong> '+(calc.performancePreset?'Higher of '+calc.performancePreset.calories.toLocaleString()+' performance target or ':'')+base.toLocaleString()+' rest-day target + '+Math.round(active*refuel).toLocaleString()+' workout replacement'+(goalAdjust?' '+(goalAdjust>0?'+ ':'− ')+Math.abs(goalAdjust)+' goal adjustment':'')+'</div>'
    +'<div><strong>Activities:</strong> '+workoutText+(estimatedCount?' ('+estimatedCount+' estimated)':'')+'</div>'
    +(activityDetails.length?'<div style="margin-top:3px;font-size:.72rem;color:#3f6212;"><strong>Used from Activities:</strong> '+activityDetails.map(escHtml).join('; ')+'</div>':'<div style="margin-top:3px;font-size:.72rem;color:#78716c;">No saved Activities were found for this date.</div>')
    +'<div><strong>Logged so far:</strong> '+logged.toLocaleString()+' kcal • '+(over?'<strong style="color:#b91c1c;">Over target: '+over.toLocaleString()+' kcal</strong>':'<strong>Remaining:</strong> '+remaining.toLocaleString()+' kcal')+'</div>'
    +(weight&&!manualBase?'<div style="font-size:.7rem;color:#78716c;margin-top:4px;">Automatic rest-day target uses your most recent weight of '+weight.toFixed(1)+' lb. Enter your own rest-day target above if you know it.</div>':'');
  if(showMessage&&typeof v26Toast==='function')v26Toast('Daily calorie target recalculated');
}

// ── Favorites ────────────────────────────────────────
function getFavorites(){try{var r=localStorage.getItem('favorites_data');return r?JSON.parse(r):[];}catch(ignore){return [];}}
function updateFavoriteFoodsCount(count){var el=document.getElementById('favoriteFoodsCount');if(el)el.textContent=Number.isFinite(count)?count:getFavorites().length;}
function saveFavorites(favs){localStorage.setItem('favorites_data',JSON.stringify(favs));updateFavoriteFoodsCount(favs.length);}

function saveFoodAsFavorite(itemId){
  var item=(window._foodLog||[]).find(function(x){return x.id===itemId;});
  if(!item){alert('Item not found.');return;}
  var favs=getFavorites();
  var exists=favs.some(function(f){return f.name.toLowerCase()===item.name.toLowerCase();});
  if(exists){if(!confirm('"'+item.name+'" is already in your Food Database. Add again?'))return;}
  var fav={name:item.name,cal:item.cal,prot:item.prot,fat:item.fat,carbs:item.carbs,servingLabel:item.servingLabel||'1 serving',servings:parseFloat(item.servings)||1,proteinSource:item.proteinSource||'',carbSource:item.carbSource||'',fatSource:item.fatSource||'',barcode:item.barcode||'',imageUrl:item.imageUrl||'',imageData:item.imageData||''};
  MICRO_FIELDS.forEach(function(f){fav[f]=item[f]!=null?item[f]:null;});
  fav.restaurant=isRestaurantFood(item);
  favs.push(fav);saveFavorites(favs);
  alert('⭐ "'+item.name+'" saved to your Food Database!');
  renderFavsList();
}

function addFavorite(){
  var name=prompt('Food name:','');if(!name||!name.trim())return;
  var cal=prompt('Calories:','');var prot=prompt('Protein g:','');
  var fat=prompt('Fat g:','');var carbs=prompt('Carbs g:','');
  var favs=getFavorites();
  favs.push({name:name.trim(),cal:cal.trim()?parseFloat(cal)||null:null,prot:prot.trim()?parseFloat(prot)||null:null,fat:fat.trim()?parseFloat(fat)||null:null,carbs:carbs.trim()?parseFloat(carbs)||null:null,restaurant:looksLikeRestaurantFood(name.trim())});
  saveFavorites(favs);renderFavsList();
}

function toggleFavMealPanel(){
  // Panel is always visible; just ensure favs tab is active and rendered
  showFavTab('favs');renderFavsList();
}

function showFavTab(tab){
  window._activeFoodLibraryTab=tab;
  var fl=document.getElementById('favsList');var hl=document.getElementById('healthyFoodsList');var ml=document.getElementById('mealsList');
  var fb=document.getElementById('favTabBtn');var hb=document.getElementById('healthyTabBtn');var mb2=document.getElementById('mealTabBtn');
  if(fl)fl.style.display=tab==='favs'?'block':'none';
  if(hl)hl.style.display=tab==='healthy'?'block':'none';
  if(ml)ml.style.display=tab==='meals'?'block':'none';
  if(fb){fb.style.background=tab==='favs'?'#f39c12':'#e9ecef';fb.style.color=tab==='favs'?'#fff':'#555';}
  if(hb){hb.style.background=tab==='healthy'?'#16a34a':'#e9ecef';hb.style.color=tab==='healthy'?'#fff':'#555';}
  if(mb2){mb2.style.background=tab==='meals'?'#f39c12':'#e9ecef';mb2.style.color=tab==='meals'?'#fff':'#555';}
  if(tab==='meals')renderMealsList();else if(tab==='healthy')renderHealthyFoodsList();else renderFavsList();
}
function renderFoodLibrarySearch(){if(window._activeFoodLibraryTab==='healthy')renderHealthyFoodsList();else if(window._activeFoodLibraryTab==='meals')renderMealsList();else renderFavsList();}

function getHealthyFoods(){try{return JSON.parse(localStorage.getItem('healthy_foods_7plus')||'[]');}catch(ignore){return [];}}
function updateHealthyFoodsCount(count){var el=document.getElementById('healthyFoodsCount');if(el)el.textContent=Number.isFinite(count)?count:getHealthyFoods().length;}
function saveHealthyFoods(items){localStorage.setItem('healthy_foods_7plus',JSON.stringify(items));updateHealthyFoodsCount(items.length);}
function importHealthyFoodsFromSavedNutrition(force){
  if(window._healthyFoodsImported&&!force)return;
  window._healthyFoodsImported=true;
  var saved=[],plannerKeys=[];
  try{saved=saved.concat(getFavorites()||[]);}catch(ignore){}
  for(var i=0;i<localStorage.length;i++){
    var key=localStorage.key(i)||'';if(key.indexOf('planner_')===0)plannerKeys.push(key);
  }
  plannerKeys.sort().forEach(function(key){try{var day=JSON.parse(localStorage.getItem(key)||'{}');if(Array.isArray(day.foodLog))saved=saved.concat(day.foodLog);}catch(ignore2){}});
  saved=saved.concat(window._foodLog||[]);
  var latestByName={};
  saved.forEach(function(item){var key=String(item&&item.name||'').trim().toLowerCase();if(key)latestByName[key]=item;});
  // Tally which meal slot each food name was logged under across every saved
  // entry (not just the latest), so the dominant slot can be used to sort
  // foods into breakfast/lunch/dinner suggestions.
  var mealCountsByName={};
  saved.forEach(function(item){var key=String(item&&item.name||'').trim().toLowerCase(),mealKey=item&&item.meal;if(!key||!mealKey)return;var counts=mealCountsByName[key]||(mealCountsByName[key]={});counts[mealKey]=(counts[mealKey]||0)+1;});
  var rebuilt=[];
  Object.keys(latestByName).forEach(function(key){
    var item=latestByName[key];inferFoodMacroSources(item);var quality=runnerFoodQuality(item);if(quality.score<7||quality.confidence==='Low')return;
    var copy={name:String(item.name).trim(),cal:item.cal,prot:item.prot,fat:item.fat,carbs:item.carbs,fiber:item.fiber,sugar:item.sugar,sodium:item.sodium,servingLabel:item.servingLabel||'1 serving',servings:parseFloat(item.servings)||1,proteinSource:item.proteinSource||'',carbSource:item.carbSource||'',fatSource:item.fatSource||'',barcode:item.barcode||'',imageUrl:item.imageUrl||'',imageData:item.imageData||'',score:quality.score,label:quality.label,confidence:quality.confidence,confidencePct:quality.confidencePct,mealCounts:mealCountsByName[key]||{},updatedAt:new Date().toISOString()};
    MICRO_FIELDS.forEach(function(field){copy[field]=item[field]!=null?item[field]:null;});rebuilt.push(copy);
  });
  saveHealthyFoods(rebuilt.sort(function(a,b){return (b.score||0)-(a.score||0)||a.name.localeCompare(b.name);}));
}
function captureHealthyFoods(log){
  var healthy=getHealthyFoods(),changed=false;
  (log||[]).forEach(function(item){
    if(!item||!String(item.name||'').trim())return;
    var quality=runnerFoodQuality(item),key=String(item.name).trim().toLowerCase(),idx=healthy.findIndex(function(food){return String(food.name||'').trim().toLowerCase()===key;});
    if(quality.score<7||quality.confidence==='Low'){if(idx>=0){healthy.splice(idx,1);changed=true;}return;}
    var mealCounts=Object.assign({},(idx>=0&&healthy[idx].mealCounts)||{});
    var mealKey=item.meal||'';if(mealKey)mealCounts[mealKey]=(mealCounts[mealKey]||0)+1;
    var copy={name:String(item.name).trim(),cal:item.cal,prot:item.prot,fat:item.fat,carbs:item.carbs,fiber:item.fiber,sugar:item.sugar,sodium:item.sodium,servingLabel:item.servingLabel||'1 serving',servings:parseFloat(item.servings)||1,proteinSource:item.proteinSource||'',carbSource:item.carbSource||'',fatSource:item.fatSource||'',barcode:item.barcode||'',imageUrl:item.imageUrl||'',imageData:item.imageData||'',score:quality.score,label:quality.label,confidence:quality.confidence,confidencePct:quality.confidencePct,mealCounts:mealCounts,updatedAt:new Date().toISOString()};
    MICRO_FIELDS.forEach(function(field){copy[field]=item[field]!=null?item[field]:null;});
    if(idx<0)healthy.push(copy);else healthy[idx]=copy;changed=true;
  });
  if(changed)saveHealthyFoods(healthy.sort(function(a,b){return (b.score||0)-(a.score||0)||a.name.localeCompare(b.name);}));
}
// ── Pre-Run Meal Ideas (built from Healthy 7+ foods, shown the day before a
// quality workout or long run) ──
function healthyFoodMealSlot(food){
  var counts=food&&food.mealCounts,best='',bestCount=0;
  if(counts){['breakfast','lunch','dinner'].forEach(function(m){var c=counts[m]||0;if(c>bestCount){bestCount=c;best=m;}});}
  return best;
}
function mealIdeasRng(seedStr){
  var h=0;
  for(var i=0;i<seedStr.length;i++){h=(h*31+seedStr.charCodeAt(i))>>>0;}
  return function(){h=(h*1664525+1013904223)>>>0;return h/4294967296;};
}
function seededShuffle(arr,rng){
  var a=arr.slice();
  for(var i=a.length-1;i>0;i--){var j=Math.floor(rng()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}
  return a;
}
function pickMealIdeaFoods(mealSlot,rng,exclude){
  var all=getHealthyFoods().filter(function(f){return exclude.indexOf(String(f.name||'').toLowerCase())===-1;});
  var matched=all.filter(function(f){return healthyFoodMealSlot(f)===mealSlot;});
  var anyMeal=all.filter(function(f){return healthyFoodMealSlot(f)==='';});
  var other=all.filter(function(f){var slot=healthyFoodMealSlot(f);return slot&&slot!==mealSlot;});
  var combined=seededShuffle(matched,rng).concat(seededShuffle(anyMeal,rng)).concat(seededShuffle(other,rng));
  return combined.slice(0,2);
}
function mealIdeasNonceKey(dateKey){return 'meal_ideas_nonce_'+dateKey;}
function getMealIdeasNonce(dateKey){return parseInt(localStorage.getItem(mealIdeasNonceKey(dateKey))||'0',10)||0;}
function shuffleMealIdeas(){
  var dateKey=dk(today);
  localStorage.setItem(mealIdeasNonceKey(dateKey),String(getMealIdeasNonce(dateKey)+1));
  renderPreRunMealIdeas();
  if(typeof v26Toast==='function')v26Toast('New meal ideas shuffled in');
}
function renderPreRunMealIdeas(){
  var card=document.getElementById('preRunMealIdeas');if(!card)return;
  var performance=typeof nutritionPerformancePreset==='function'?nutritionPerformancePreset(dk(today)):null;
  if(!performance||performance.phase!=='prior'){card.style.display='none';return;}
  card.style.display='block';
  var names={long:'Long Run',tempo:'Tempo Run',interval:'Interval Run',quality:'Quality Run'},title=document.getElementById('preRunMealIdeasTitle');
  if(title)title.textContent='🍽️ Tomorrow: '+names[performance.workout]+' — Meal Ideas';
  var dateKey=dk(today),nonce=getMealIdeasNonce(dateKey),exclude=[];
  var slots=[{key:'breakfast',label:'🌅 Breakfast'},{key:'lunch',label:'🥗 Lunch'},{key:'dinner',label:'🍽️ Dinner'}];
  var body=document.getElementById('preRunMealIdeasBody');
  if(body)body.innerHTML=slots.map(function(slot){
    var rng=mealIdeasRng(dateKey+'|'+slot.key+'|'+nonce),picks=pickMealIdeaFoods(slot.key,rng,exclude);
    picks.forEach(function(f){exclude.push(String(f.name||'').toLowerCase());});
    var itemsHtml=picks.length?picks.map(function(f){return '<div>'+escHtml(f.name)+' <span style="color:#64748b;">· '+Math.round(f.cal||0)+' cal</span></div>';}).join(''):'<div style="color:#94a3b8;">Log a few more healthy foods to get ideas here.</div>';
    return '<div style="background:#fff;border:1px solid #c7d2fe;border-radius:9px;padding:8px 10px;"><strong style="display:block;font-size:.76rem;color:#1e3a8a;margin-bottom:4px;">'+slot.label+'</strong><div style="font-size:.76rem;color:#334155;line-height:1.5;">'+itemsHtml+'</div></div>';
  }).join('');
}
function applyFoodSort(list){
  var sortBy=(document.getElementById('favSortBy')||{value:''}).value;
  if(!sortBy||!list.length)return list;
  var arr=list.slice();
  function num(v){var n=parseFloat(v);return isFinite(n)?n:null;}
  function cmp(field,dir){return function(a,b){var av=num(a[field]),bv=num(b[field]);
    if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;
    return dir==='asc'?av-bv:bv-av;};}
  if(sortBy==='prot_desc')arr.sort(cmp('prot','desc'));
  else if(sortBy==='carbs_desc')arr.sort(cmp('carbs','desc'));
  else if(sortBy==='fat_asc')arr.sort(cmp('fat','asc'));
  else if(sortBy==='iron_desc')arr.sort(cmp('iron','desc'));
  else if(sortBy==='calcium_desc')arr.sort(cmp('calcium','desc'));
  else if(sortBy==='vitD_desc')arr.sort(cmp('vitD','desc'));
  else if(sortBy==='magnesium_desc')arr.sort(cmp('magnesium','desc'));
  else if(sortBy==='vitB12_desc')arr.sort(cmp('vitB12','desc'));
  return arr;
}
function renderHealthyFoodsList(){
  var el=document.getElementById('healthyFoodsList');if(!el)return;
  importHealthyFoodsFromSavedNutrition();
  var all=getHealthyFoods();updateHealthyFoodsCount(all.length);var q=(document.getElementById('favSearch')||{value:''}).value.toLowerCase().trim(),foods=q?all.filter(function(food){return String(food.name||'').toLowerCase().includes(q);}):all;foods=applyFoodSort(foods);
  var rescan='<div style="font-size:.68rem;color:#64748b;margin:0 0 6px;">Use 📷 Take for the camera or 🖼 Choose for a picture already on your phone.</div><button onclick="rescanHealthyFoodsAndImages(this)" style="width:100%;margin:0 0 5px;background:#ecfdf5;color:#166534;border:1px solid #86efac;border-radius:6px;padding:7px;font-size:.74rem;font-weight:800;cursor:pointer;">↻ Rescan foods & barcode pictures</button><div id="healthyRescanStatus" role="status" aria-live="polite" style="display:none;font-size:.7rem;font-weight:700;line-height:1.35;margin:0 2px 7px;"></div>';
  if(!foods.length){el.innerHTML=rescan+'<div style="font-size:.8rem;color:#64748b;text-align:center;padding:12px;line-height:1.4;">No saved foods currently score 7.0+ with enough data confidence (low-confidence foods are left out).</div>';return;}
  el.innerHTML=rescan+foods.map(function(food){var idx=all.indexOf(food);return '<div style="padding:7px 0;border-bottom:1px solid #dcfce7;font-size:.82rem;">'
    +'<div style="display:flex;align-items:center;gap:6px;">'
      +foodThumbnailHtml(food,'healthy',idx)+'<div style="flex:1;min-width:0;"><div style="font-weight:800;color:#166534;">'+escHtml(food.name)+'</div><div style="color:#64748b;font-size:.72rem;">'+Number(food.score||7).toFixed(1)+'/10 · '+escHtml(food.label||'Good')+' · '+escHtml(food.confidence||'')+' confidence</div><div style="color:#64748b;font-size:.7rem;">'+(food.cal?'🔥'+food.cal+' ':'')+(food.prot?'🥩'+food.prot+'g ':'')+(food.carbs?'🍞'+food.carbs+'g ':'')+(food.fat?'🥑'+food.fat+'g':'')+'</div></div>'
      +'<button onclick="loadHealthyFood('+idx+')" style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:5px 9px;font-size:.76rem;cursor:pointer;">+ Add</button>'
      +'<button onclick="deleteHealthyFood('+idx+')" title="Remove from this list" style="background:none;border:1px solid #fecaca;border-radius:4px;color:#dc2626;padding:3px 6px;cursor:pointer;">✕</button>'
    +'</div>'
    +foodThumbnailButtonsHtml('healthy',idx)
    +'</div>';}).join('');
}
function loadHealthyFood(idx){
  var food=getHealthyFoods()[idx];if(!food)return;var target=(document.getElementById('favTargetMeal')||{value:'breakfast'}).value;
  var item=Object.assign({},food,{id:'f'+Date.now(),meal:target});delete item.score;delete item.label;delete item.confidence;delete item.confidencePct;delete item.updatedAt;
  if(!window._foodLog)window._foodLog=[];window._foodLog.push(item);_setMealOpen(target,true);renderFoodItems();save();
}
function deleteHealthyFood(idx){var foods=getHealthyFoods();foods.splice(idx,1);saveHealthyFoods(foods);renderHealthyFoodsList();}

function renderFavsList(){
  var el=document.getElementById('favsList');if(!el)return;
  var favs=getFavorites();
  updateFavoriteFoodsCount(favs.length);
  var q=(document.getElementById('favSearch')||{value:''}).value.toLowerCase().trim();
  var filtered=q?favs.filter(function(f){return f.name.toLowerCase().includes(q);}):favs;filtered=applyFoodSort(filtered);
  var favNeedCount=favs.filter(function(f){return enrichableFields(f).length>0;}).length;
  var favEstCount=favs.filter(function(f){return (f.aiEstimatedFields||[]).length>0;}).length;
  var photoHelp='<div style="font-size:.68rem;color:#64748b;margin:0 0 6px;">Use 📷 Take for the camera or 🖼 Choose for a picture already on your phone.</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:0 0 6px;"><button type="button" '+(favNeedCount?('onclick="enrichAllFavorites(this)"'):'disabled')+' style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:54px;border-radius:8px;font-weight:800;text-align:center;line-height:1.15;background:'+(favNeedCount?'#eef2ff':'#f1f5f9')+';color:'+(favNeedCount?'#4338ca':'#94a3b8')+';border:1px solid '+(favNeedCount?'#c7d2fe':'#e2e8f0')+';cursor:'+(favNeedCount?'pointer':'default')+';"><span style="font-size:1.05rem;">🧪</span><span style="font-size:.66rem;">Enrich All</span><span style="font-size:.58rem;font-weight:700;opacity:.85;">'+(favNeedCount?'('+favNeedCount+' need it)':'(all complete)')+'</span></button><button type="button" '+(favEstCount?('onclick="undoAllFavoritesEstimates(this)"'):'disabled')+' style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:54px;border-radius:8px;font-weight:800;text-align:center;line-height:1.15;background:'+(favEstCount?'#fff1f2':'#f1f5f9')+';color:'+(favEstCount?'#be123c':'#94a3b8')+';border:1px solid '+(favEstCount?'#fecdd3':'#e2e8f0')+';cursor:'+(favEstCount?'pointer':'default')+';"><span style="font-size:1.05rem;">↩️</span><span style="font-size:.66rem;">Undo All</span><span style="font-size:.58rem;font-weight:700;opacity:.85;">'+(favEstCount?'('+favEstCount+' food'+(favEstCount===1?'':'s')+')':'(none yet)')+'</span></button><button type="button" onclick="rescanHealthyFoodsAndImages(this,\'favoriteRescanStatus\')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:54px;border-radius:8px;font-weight:800;text-align:center;line-height:1.15;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;cursor:pointer;"><span style="font-size:1.05rem;">↻</span><span style="font-size:.66rem;">Rescan Foods</span></button><button type="button" onclick="removeDuplicateFoodItems(this)" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:54px;border-radius:8px;font-weight:800;text-align:center;line-height:1.15;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;cursor:pointer;"><span style="font-size:1.05rem;">🧹</span><span style="font-size:.66rem;">Remove Dupes</span></button></div><div id="favoriteRescanStatus" role="status" aria-live="polite" style="display:none;font-size:.7rem;font-weight:700;line-height:1.35;margin:0 2px 7px;"></div><div id="dedupeFoodStatus" role="status" aria-live="polite" style="display:none;font-size:.7rem;font-weight:700;line-height:1.35;margin:0 2px 7px;"></div>';
  if(!filtered.length){el.innerHTML=photoHelp+'<div style="font-size:0.8rem;color:#bbb;text-align:center;padding:12px;">Nothing in your Food Database yet. Add items from your food log with ⭐</div>';return;}
  var target=(document.getElementById('favTargetMeal')||{value:'breakfast'}).value;
  el.innerHTML=photoHelp+filtered.map(function(f,i){
    var origIdx=favs.indexOf(f);
    var isRestaurant=isRestaurantFood(f);
    var missingCount=isRestaurant?0:missingNutrientFields(f).length;
    return '<div style="padding:5px 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;">'
      +'<div style="display:flex;align-items:center;gap:6px;">'
        +foodThumbnailHtml(f,'favorite',origIdx)+'<div style="flex:1;min-width:0;">'
          +'<div style="font-weight:600;">'+escHtml(f.name)+'</div>'
          +'<div style="color:#888;font-size:0.75rem;">'+(f.cal?'🔥'+f.cal+' ':'')+''+(f.prot?'🥩'+f.prot+'g ':'')+''+(f.carbs?'🍞'+f.carbs+'g ':'')+''+(f.fat?'🥑'+f.fat+'g':'')+'</div>'
          +((f.aiEstimatedFields&&f.aiEstimatedFields.length)?('<div style="color:#4338ca;font-size:0.66rem;font-weight:700;margin-top:1px;" title="These values were estimated by AI, not pulled from a verified source">✨ '+f.aiEstimatedFields.length+' AI-estimated value'+(f.aiEstimatedFields.length===1?'':'s')+'</div>'):'')
        +'</div>'
        +'<button onclick="loadFavoriteItem('+origIdx+')" style="background:#e67e22;color:#fff;border:none;border-radius:5px;padding:4px 9px;font-size:0.78rem;cursor:pointer;">+ Add</button>'
        +'<button onclick="toggleFavoriteRestaurant('+origIdx+')" title="'+(isRestaurant?'Marked as a restaurant food -- Enrich skips it. Tap to unmark.':'Tap to mark as a restaurant food so Enrich skips it')+'" style="background:'+(isRestaurant?'#fff7ed':'#f8fafc')+';color:'+(isRestaurant?'#9a3412':'#94a3b8')+';border:1px solid '+(isRestaurant?'#fdba74':'#e2e8f0')+';border-radius:5px;padding:4px 7px;font-size:0.72rem;cursor:pointer;white-space:nowrap;">🍽️</button>'
        +'<button '+(missingCount?('onclick="enrichFavoriteNutrients('+origIdx+',this)"'):'disabled')+' title="'+(isRestaurant?'Restaurant food -- Enrich skips it':(missingCount?('Fill in '+missingCount+' missing nutrient value'+(missingCount===1?'':'s')+' using AI'):'All tracked nutrients are filled in'))+'" style="background:'+(missingCount?'#eef2ff':'#f1f5f9')+';color:'+(missingCount?'#4338ca':'#94a3b8')+';border:1px solid '+(missingCount?'#c7d2fe':'#e2e8f0')+';border-radius:5px;padding:4px 7px;font-size:0.72rem;cursor:'+(missingCount?'pointer':'default')+';white-space:nowrap;">🧪'+(missingCount?' '+missingCount:'')+'</button>'
        +((f.aiEstimatedFields&&f.aiEstimatedFields.length)?('<button onclick="undoFavoriteEstimate('+origIdx+',this)" title="Undo the '+f.aiEstimatedFields.length+' AI-estimated value'+(f.aiEstimatedFields.length===1?'':'s')+'" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:5px;padding:4px 7px;font-size:0.72rem;cursor:pointer;white-space:nowrap;">↩️</button>'):'')
        +'<button onclick="deleteFavorite('+origIdx+')" style="background:none;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;font-size:0.72rem;padding:2px 5px;color:#e74c3c;">✕</button>'
      +'</div>'
      +foodThumbnailButtonsHtml('favorite',origIdx)
      +'</div>';
  }).join('');
}

function loadFavoriteItem(idx){
  var favs=getFavorites();var f=favs[idx];if(!f)return;
  var target=(document.getElementById('favTargetMeal')||{value:'breakfast'}).value;
  if(!window._foodLog)window._foodLog=[];
  var favItem={id:'f'+Date.now(),meal:target,name:f.name,cal:f.cal,prot:f.prot,fat:f.fat,carbs:f.carbs,servingLabel:f.servingLabel||'1 serving',servings:parseFloat(f.servings)||1,proteinSource:f.proteinSource||'',carbSource:f.carbSource||'',fatSource:f.fatSource||'',imageUrl:f.imageUrl||'',imageData:f.imageData||''};
  MICRO_FIELDS.forEach(function(fld){favItem[fld]=f[fld]!=null?f[fld]:null;});
  if(f.aiEstimatedFields&&f.aiEstimatedFields.length)favItem.aiEstimatedFields=f.aiEstimatedFields.slice();
  favItem.restaurant=isRestaurantFood(f);
  window._foodLog.push(favItem);
  _setMealOpen(target,true);
  renderFoodItems();save();
}

function toggleFavoriteRestaurant(idx){
  var favs=getFavorites();var f=favs[idx];if(!f)return;
  f.restaurant=!isRestaurantFood(f);
  saveFavorites(favs);
  renderFavsList();
}
function deleteFavorite(idx){
  var favs=getFavorites();favs.splice(idx,1);saveFavorites(favs);renderFavsList();
}

// ── Saved Meals ──────────────────────────────────────
function getSavedMeals(){var r=localStorage.getItem('saved_meals');return r?JSON.parse(r):[];}
function saveSavedMeals(m){localStorage.setItem('saved_meals',JSON.stringify(m));}

function saveMeal(){
  var log=window._foodLog||[];
  if(!log.length){alert('Add some food items first.');return;}
  document.getElementById('saveMealName').value='';
  document.getElementById('saveMealModal').style.display='flex';
  setTimeout(function(){document.getElementById('saveMealName').focus();},80);
}
function confirmSaveMeal(){
  var name=(document.getElementById('saveMealName').value||'').trim();
  if(!name){document.getElementById('saveMealName').focus();return;}
  var category=document.getElementById('saveMealTarget').value;
  var log=window._saveMealItems||window._foodLog||[];
  window._saveMealItems=null;
  var meals=getSavedMeals();
  meals.push({name:name,category:category,items:log.map(function(x){
    var it={name:x.name,cal:x.cal,prot:x.prot,fat:x.fat,carbs:x.carbs,servingLabel:x.servingLabel||'1 serving',servings:parseFloat(x.servings)||1,proteinSource:x.proteinSource||'',carbSource:x.carbSource||'',fatSource:x.fatSource||'',imageUrl:x.imageUrl||'',imageData:x.imageData||''};
    MICRO_FIELDS.forEach(function(f){it[f]=x[f]!=null?x[f]:null;});
    it.restaurant=isRestaurantFood(x);
    return it;
  })});
  saveSavedMeals(meals);
  document.getElementById('saveMealModal').style.display='none';
}
function saveMealFromSection(mealType){
  var log=(window._foodLog||[]).filter(function(x){return x.meal===mealType;});
  if(!log.length){alert('No items in this section to save.');return;}
  document.getElementById('saveMealName').value='';
  document.getElementById('saveMealTarget').value=mealType;
  // Store section items for confirmSaveMeal to use
  window._saveMealItems=log;
  document.getElementById('saveMealModal').style.display='flex';
  setTimeout(function(){document.getElementById('saveMealName').focus();},80);
}

function renderMealsList(){
  var el=document.getElementById('mealsList');if(!el)return;
  var meals=getSavedMeals();
  if(!meals.length){el.innerHTML='<div style="font-size:0.8rem;color:#bbb;text-align:center;padding:12px;">No saved meals yet. Log a full day of food then tap "Save Meal".</div>';return;}
  var mealsNeedCount=0;meals.forEach(function(m){m.items.forEach(function(it){if(enrichableFields(it).length>0)mealsNeedCount++;});});
  var mealsEstCount=0;meals.forEach(function(m){m.items.forEach(function(it){if((it.aiEstimatedFields||[]).length>0)mealsEstCount++;});});
  var bulkMealsBtn='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:0 0 8px;"><button type="button" '+(mealsNeedCount?('onclick="enrichAllMeals(this)"'):'disabled')+' style="background:'+(mealsNeedCount?'#eef2ff':'#f1f5f9')+';color:'+(mealsNeedCount?'#4338ca':'#94a3b8')+';border:1px solid '+(mealsNeedCount?'#c7d2fe':'#e2e8f0')+';border-radius:6px;padding:7px 4px;font-size:.7rem;font-weight:800;cursor:'+(mealsNeedCount?'pointer':'default')+';text-align:center;">🧪 Enrich All'+(mealsNeedCount?' ('+mealsNeedCount+')':' (done)')+'</button><button type="button" '+(mealsEstCount?('onclick="undoAllMealsEstimates(this)"'):'disabled')+' style="background:'+(mealsEstCount?'#fff1f2':'#f1f5f9')+';color:'+(mealsEstCount?'#be123c':'#94a3b8')+';border:1px solid '+(mealsEstCount?'#fecdd3':'#e2e8f0')+';border-radius:6px;padding:7px 4px;font-size:.7rem;font-weight:800;cursor:'+(mealsEstCount?'pointer':'default')+';text-align:center;">↩️ Undo All'+(mealsEstCount?' ('+mealsEstCount+')':' (none)')+'</button></div>';
  el.innerHTML=bulkMealsBtn+meals.map(function(m,i){
    var cal=m.items.reduce(function(a,x){return a+(parseFloat(x.cal)||0);},0);
    var totalMissing=m.items.reduce(function(a,it){return a+enrichableFields(it).length;},0);
    var mealEstCount=m.items.reduce(function(a,it){return a+((it.aiEstimatedFields&&it.aiEstimatedFields.length)||0);},0);
    var estimatedFieldSet={};m.items.forEach(function(it){(it.aiEstimatedFields||[]).forEach(function(f){estimatedFieldSet[f]=true;});});
    var macros={prot:0,carbs:0,fat:0},micros={};
    MICRO_FIELDS.forEach(function(field){micros[field]=0;});
    m.items.forEach(function(item){
      macros.prot+=parseFloat(item.prot)||0;
      macros.carbs+=parseFloat(item.carbs)||0;
      macros.fat+=parseFloat(item.fat)||0;
      MICRO_FIELDS.forEach(function(field){micros[field]+=parseFloat(item[field])||0;});
    });
    var macroHtml='<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:5px 0;">'
      +[['Calories',Math.round(cal),'cal'],['Protein',Math.round(macros.prot*10)/10,'g'],['Carbs',Math.round(macros.carbs*10)/10,'g'],['Fat',Math.round(macros.fat*10)/10,'g']].map(function(n){return '<div style="background:#fff7e8;border-radius:5px;padding:4px 2px;text-align:center;"><strong style="display:block;font-size:0.76rem;color:#7a4b00;">'+n[1]+' '+n[2]+'</strong><span style="font-size:0.64rem;color:#777;">'+n[0]+'</span></div>';}).join('')
      +'</div>';
    var microHtml='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;margin:0 0 6px;">'
      +MICRO_FIELDS.map(function(field){var meta=MICRO_META[field],value=Math.round(micros[field]*10)/10,est=estimatedFieldSet[field]&&value;return '<div style="background:#f7faf7;border-radius:4px;padding:3px 4px;font-size:0.65rem;color:#526052;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><span>'+meta.label+'</span> <strong>'+(value||'—')+(value?' '+meta.unit:'')+'</strong>'+(est?' <span style="color:#4338ca;" title="Includes an AI-estimated value, not pulled from a verified source">✨</span>':'')+'</div>';}).join('')
      +'</div>';
    return '<div style="padding:6px 0;border-bottom:1px solid #f5f5f5;">'
      +'<div style="display:flex;align-items:center;gap:6px;">'
        +'<div style="flex:1;font-weight:600;font-size:0.85rem;">'+escHtml(m.name)+'</div>'
        +'<button onclick="deleteMeal('+i+')" style="background:none;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;font-size:0.72rem;padding:2px 5px;color:#e74c3c;">✕</button>'
      +'</div>'
      +'<div style="font-size:0.75rem;color:#888;margin-bottom:4px;">'+m.items.length+' items'+(cal?' · ~'+Math.round(cal)+' cal':'')+(mealEstCount?' · <span style="color:#4338ca;font-weight:700;" title="These values were estimated by AI, not pulled from a verified source">✨ '+mealEstCount+' AI-estimated value'+(mealEstCount===1?'':'s')+'</span>':'')+'</div>'
      +macroHtml+microHtml
      +'<div style="display:flex;gap:4px;align-items:center;">'
        +'<select id="mealTarget_'+i+'" style="flex:1;border:1px solid #e9c87b;border-radius:5px;padding:3px 5px;font-size:0.75rem;">'
          +'<option value="breakfast"'+(m.category==='breakfast'?' selected':'')+'>🌅 Breakfast</option>'
          +'<option value="lunch"'+(m.category==='lunch'?' selected':'')+'>🥗 Lunch</option>'
          +'<option value="dinner"'+(m.category==='dinner'?' selected':'')+'>🍽️ Dinner</option>'
          +'<option value="snack"'+(m.category==='snack'?' selected':'')+'>🍎 Snacks</option>'
          +'<option value="liquids"'+(m.category==='liquids'?' selected':'')+'>💧 Liquids</option>'
          +'<option value="sports"'+(m.category==='sports'?' selected':'')+'>💪 Sports Nutrition</option>'
          +'<option value="supplements"'+(m.category==='supplements'?' selected':'')+'>💊 Supplements</option>'
        +'</select>'
        +'<button onclick="loadMeal('+i+')" style="background:#2980b9;color:#fff;border:none;border-radius:5px;padding:4px 9px;font-size:0.78rem;cursor:pointer;">Load</button>'
        +'<button '+(totalMissing?('onclick="enrichMealNutrients('+i+',this)"'):'disabled')+' title="'+(totalMissing?('Fill in '+totalMissing+' missing nutrient value'+(totalMissing===1?'':'s')+' across this meal using AI'):'All tracked nutrients are filled in for every item')+'" style="background:'+(totalMissing?'#eef2ff':'#f1f5f9')+';color:'+(totalMissing?'#4338ca':'#94a3b8')+';border:1px solid '+(totalMissing?'#c7d2fe':'#e2e8f0')+';border-radius:5px;padding:4px 8px;font-size:0.72rem;cursor:'+(totalMissing?'pointer':'default')+';white-space:nowrap;">🧪'+(totalMissing?' '+totalMissing:'')+'</button>'
        +(mealEstCount?('<button onclick="undoMealEstimate('+i+',this)" title="Undo the '+mealEstCount+' AI-estimated value'+(mealEstCount===1?'':'s')+' in this meal" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:5px;padding:4px 8px;font-size:0.72rem;cursor:pointer;white-space:nowrap;">↩️</button>'):'')
      +'</div>'
    +'</div>';
  }).join('');
}

function loadMeal(idx){
  var meals=getSavedMeals();var m=meals[idx];if(!m)return;
  var perSel=document.getElementById('mealTarget_'+idx);
  var target=perSel?perSel.value:(m.category||(document.getElementById('favTargetMeal')||{value:'breakfast'}).value);
  if(!window._foodLog)window._foodLog=[];
  m.items.forEach(function(it){
    var loadedItem={id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,5),meal:target,name:it.name,cal:it.cal,prot:it.prot,fat:it.fat,carbs:it.carbs,servingLabel:it.servingLabel||'1 serving',servings:parseFloat(it.servings)||1,proteinSource:it.proteinSource||'',carbSource:it.carbSource||'',fatSource:it.fatSource||'',imageUrl:it.imageUrl||'',imageData:it.imageData||''};
    MICRO_FIELDS.forEach(function(f){loadedItem[f]=it[f]!=null?it[f]:null;});
    if(it.aiEstimatedFields&&it.aiEstimatedFields.length)loadedItem.aiEstimatedFields=it.aiEstimatedFields.slice();
    loadedItem.restaurant=isRestaurantFood(it);
    window._foodLog.push(loadedItem);
  });
  _setMealOpen(target,true);
  renderFoodItems();save();
  // favMealPanel stays open
}

function deleteMeal(idx){
  var meals=getSavedMeals();meals.splice(idx,1);saveSavedMeals(meals);renderMealsList();
}

// ── Copy Day Modal ───────────────────────────────────
function openCopyDayModal(){
  var modal=document.getElementById('copyDayModal');if(!modal)return;
  modal.style.display='flex';
  var title=document.getElementById('copyDayModalTitle');if(title)title.innerHTML='&#x1F4C5; Copy Food Between Days';
  var from=document.getElementById('copyDayFrom');
  var to=document.getElementById('copyDayTo');
  if(from)from.value=dk(today);
  if(to)to.value=dk(today);
  updateCopyDayFoodList();
}
function openCopyMealToDate(mealType){
  var modal=document.getElementById('copyDayModal');if(!modal)return;
  var label=(MEAL_LABELS[mealType]||mealType).replace(/^[^\w]+/,'');
  var title=document.getElementById('copyDayModalTitle');
  if(title)title.textContent='Copy '+label+' to Date';
  var from=document.getElementById('copyDayFrom');
  var to=document.getElementById('copyDayTo');
  var meal=document.getElementById('copyDayMeal');
  var nextDay=new Date(today);nextDay.setDate(nextDay.getDate()+1);
  if(from)from.value=dk(today);
  if(to)to.value=dk(nextDay);
  if(meal)meal.value=mealType;
  modal.style.display='flex';
  updateCopyDayFoodList();
}

function updateCopyDayFoodList(){
  var from=(document.getElementById('copyDayFrom')||{value:''}).value;
  var mealSel=document.getElementById('copyDayMeal');
  var meal=mealSel?mealSel.value:'all';
  var row=document.getElementById('copyDayFoodRow');
  var sel=document.getElementById('copyDayFood');
  if(!from||!sel){if(row)row.style.display='none';return;}
  var r=localStorage.getItem('planner_'+from);
  var items=[];
  if(r){
    try{
      var dd=JSON.parse(r);
      var log=Array.isArray(dd.foodLog)?dd.foodLog:[];
      items=meal==='all'?log:log.filter(function(x){return x.meal===meal;});
    }catch(e){}
  }
  if(!items.length){if(row)row.style.display='none';return;}
  if(row)row.style.display='block';
  sel.innerHTML='<option value="all">All food items ('+items.length+')</option>'
    +items.map(function(x,i){return '<option value="'+i+'">'+escHtml(x.name||'Item '+(i+1))+'</option>';}).join('');
}

function confirmCopyDay(){
  var from=(document.getElementById('copyDayFrom')||{value:''}).value;
  var to=(document.getElementById('copyDayTo')||{value:''}).value;
  var mealSel=document.getElementById('copyDayMeal');
  var meal=mealSel?mealSel.value:'all';
  var foodSel=document.getElementById('copyDayFood');
  var foodIdx=foodSel?foodSel.value:'all';
  var replace=document.getElementById('copyDayReplace');
  var doReplace=replace&&replace.checked;
  if(!from||!to){alert('Please select both From and To dates.');return;}
  var r=localStorage.getItem('planner_'+from);
  if(!r){alert('No data found for '+from+'.');return;}
  var src=JSON.parse(r);
  var srcLog=Array.isArray(src.foodLog)?src.foodLog:[];
  var filtered=meal==='all'?srcLog:srcLog.filter(function(x){return x.meal===meal;});
  if(foodIdx!=='all'){var idx=parseInt(foodIdx)||0;filtered=[filtered[idx]].filter(Boolean);}
  if(!filtered.length){alert('No food items to copy.');return;}
  // Load destination
  var destKey='planner_'+to;
  var destRaw=localStorage.getItem(destKey);
  var dest=destRaw?JSON.parse(destRaw):{};
  var destLog=Array.isArray(dest.foodLog)?dest.foodLog:[];
  if(doReplace){
    // Remove existing items for the meal(s) being copied
    var mealsToReplace=meal==='all'?MEALS:[meal];
    destLog=destLog.filter(function(x){return mealsToReplace.indexOf(x.meal)<0;});
  }
  filtered.forEach(function(x){
    destLog.push(Object.assign({},x,{id:'f'+Date.now()+'_'+Math.random().toString(36).slice(2,5)}));
  });
  dest.foodLog=destLog;
  localStorage.setItem(destKey,JSON.stringify(dest));
  // A complete-day copy includes an independent snapshot of that day's Macro
  // Ratio. Editing the destination later can never alter the source date.
  if(meal==='all'&&foodIdx==='all'){
    var sourceRatio=localStorage.getItem(macroRatioStorageKey(from));
    if(sourceRatio)localStorage.setItem(macroRatioStorageKey(to),sourceRatio);
    else localStorage.removeItem(macroRatioStorageKey(to));
  }
  document.getElementById('copyDayModal').style.display='none';
  // If destination is today, reload
  if(to===dk(today)){window._foodLog=destLog;renderFoodItems();save();}
  alert('Copied '+filtered.length+' item'+(filtered.length>1?'s':'')+' to '+to+'.');
}

// ── Food Label Scanner ───────────────────────────────
var _barcodeStream=null,_barcodeScanActive=false,_barcodeDetector=null;
function barcodeStatus(message,isError){var el=document.getElementById('barcodeStatus');if(el){el.textContent=message;el.style.color=isError?'#991b1b':'#475569';el.style.background=isError?'#fff7f7':'#f0fdfa';el.style.borderColor=isError?'#fecaca':'#ccfbf1';}}
function stopBarcodeCamera(){_barcodeScanActive=false;if(_barcodeStream){_barcodeStream.getTracks().forEach(function(track){track.stop();});_barcodeStream=null;}var video=document.getElementById('barcodeVideo');if(video){video.pause();video.srcObject=null;video.style.display='none';}}
function closeBarcodeScanner(){stopBarcodeCamera();var modal=document.getElementById('barcodeScannerModal');if(modal)modal.style.display='none';}
function openBarcodeScanner(){
  var modal=document.getElementById('barcodeScannerModal'),input=document.getElementById('barcodeManualInput');if(!modal)return;
  modal.style.display='flex';if(input)input.value='';barcodeStatus('Starting the rear camera…',false);
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){barcodeStatus('Automatic camera scanning is not supported by this browser. Enter the barcode number below.',false);if(input)input.focus();return;}
  try{_barcodeDetector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});}catch(e){barcodeStatus('Camera barcode detection is unavailable. Enter the barcode number below.',false);if(input)input.focus();return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false}).then(function(stream){
    _barcodeStream=stream;_barcodeScanActive=true;var video=document.getElementById('barcodeVideo');if(!video)return;video.srcObject=stream;video.style.display='block';return video.play().then(function(){barcodeStatus('Point the camera at the barcode and hold steady.',false);scanBarcodeFrame();});
  }).catch(function(){barcodeStatus('The camera could not be opened. Allow camera access or enter the barcode number below.',true);if(input)input.focus();});
}
function scanBarcodeFrame(){
  if(!_barcodeScanActive||!_barcodeDetector)return;var video=document.getElementById('barcodeVideo');
  _barcodeDetector.detect(video).then(function(results){if(!_barcodeScanActive)return;if(results&&results[0]&&results[0].rawValue){var code=String(results[0].rawValue).replace(/\D/g,'');stopBarcodeCamera();var input=document.getElementById('barcodeManualInput');if(input)input.value=code;lookupFoodBarcode(code);return;}setTimeout(scanBarcodeFrame,220);}).catch(function(){if(_barcodeScanActive)setTimeout(scanBarcodeFrame,350);});
}
function barcodeNutrient(nutrients,key){var serving=nutrients[key+'_serving'],per100=nutrients[key+'_100g'];var value=serving!==undefined&&serving!==null?serving:per100;return value!==undefined&&value!==null&&value!==''?Math.round((parseFloat(value)||0)*10)/10:null;}
function showPendingFood(food,title){
  window._pendingScanFood=food;var nameEl=document.getElementById('scanResultName'),macroEl=document.getElementById('scanResultMacros'),modal=document.getElementById('scanConfirmModal'),heading=document.getElementById('scanConfirmTitle');
  renderPendingFoodPhoto(food);
  if(heading)heading.textContent=title||'Food Scanned';if(nameEl)nameEl.textContent=food.name||'Scanned Food';
  if(macroEl){var microSummary=MICRO_FIELDS.filter(function(f){return food[f];}).map(function(f){return MICRO_META[f].icon+' '+food[f]+MICRO_META[f].unit+' '+MICRO_META[f].label;}).join(' | ');macroEl.innerHTML='<strong style="color:#b45309;">'+(food.cal||0)+' calories '+escHtml(food.servingLabel||'per serving')+'</strong><br>'+(food.prot||0)+'g protein &nbsp;|&nbsp; '+(food.fat||0)+'g fat &nbsp;|&nbsp; '+(food.carbs||0)+'g carbs'+(microSummary?'<div style="margin-top:6px;font-size:0.76rem;color:#0f766e;">'+microSummary+'</div>':'')+(food.barcode?'<div style="margin-top:5px;font-size:.68rem;color:#64748b;">Barcode '+escHtml(food.barcode)+' · '+escHtml(food.sourceConfidence||'Low')+' source confidence</div>':'');}
  if(modal)modal.style.display='flex';
}
function lookupFoodBarcode(scannedCode){
  var input=document.getElementById('barcodeManualInput'),code=String(scannedCode||(input&&input.value)||'').replace(/\D/g,'');
  if(code.length<8||code.length>14){barcodeStatus('Enter a valid 8–14 digit UPC or EAN barcode.',true);return;}
  stopBarcodeCamera();barcodeStatus('Looking up product '+code+'…',false);
  var fields='code,product_name,brands,serving_size,nutriments,ingredients_text,categories,image_front_small_url,image_front_url,image_url';
  fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields='+encodeURIComponent(fields)).then(function(response){if(!response.ok)throw new Error('Product lookup failed');return response.json();}).then(function(data){
    if(!data||data.status!==1||!data.product)throw new Error('This barcode was not found');var product=data.product,n=product.nutriments||{},hasServing=['energy-kcal','proteins','fat','carbohydrates'].some(function(key){return n[key+'_serving']!==undefined;});
    var food={name:[product.product_name,product.brands].filter(Boolean).join(' — ')||'Barcode '+code,barcode:code,servingLabel:hasServing&&product.serving_size?'per '+product.serving_size:'per 100 g',cal:barcodeNutrient(n,'energy-kcal'),prot:barcodeNutrient(n,'proteins'),fat:barcodeNutrient(n,'fat'),carbs:barcodeNutrient(n,'carbohydrates'),ingredientsText:product.ingredients_text||'',categoriesText:product.categories||'',imageUrl:product.image_front_small_url||product.image_front_url||product.image_url||'',source:'barcode'};
    MICRO_FIELDS.forEach(function(f){var offKey=OFF_NUTRIENT_KEY[f];if(!offKey)return;var value=barcodeNutrient(n,offKey);if(f==='folate'&&value===null)value=barcodeNutrient(n,'vitamin-b9');if(f==='sodium'&&value!==null)value=Math.round(value*1000);food[f]=value;});
    inferFoodMacroSources(food);if(!food.sourceConfidence){food.sourceConfidence='Low';food.sourceMethod='Needs review';}
    closeBarcodeScanner();showPendingFood(food,'Barcode Product Found');
  }).catch(function(error){barcodeStatus(error.message+'. You can scan the nutrition label instead or enter the food manually.',true);});
}

function scanFoodLabel(ev){
  var file=ev.target.files[0];if(!file)return;
  var key=journalAIKey();if(!key){alert('Add your Anthropic API key in Settings first.');ev.target.value='';return;}
  var reader=new FileReader();
  reader.onload=function(e){
    var b64=e.target.result.split(',')[1];
    var mtype=file.type||'image/jpeg';
    var status=document.createElement('div');
    status.style.cssText='position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:10px 16px;border-radius:8px;z-index:9999;font-size:0.85rem;';
    status.textContent='🔍 Scanning label…';document.body.appendChild(status);
    fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:400,
        messages:[{role:'user',content:[
          {type:'image',source:{type:'base64',media_type:mtype,data:b64}},
          {type:'text',text:'Read this nutrition information image carefully — it may be a photo of a food package label, or a screenshot from a nutrition app, recipe site, or restaurant menu. Extract the per-serving Nutrition Facts, any visible product or food name, and the complete visible ingredient list (leave ingredientsText empty if the image does not show one, such as most app/menu screenshots). Use the ingredients to classify the dominant source of ALL THREE macros for a runner: protein (lean/plant versus higher-fat/processed), carbohydrates (complex/fiber-rich versus simple/refined), and fat (unsaturated versus saturated/trans). Respond with ONLY a single JSON object — no markdown, no code fences, no explanation, nothing else before or after. The JSON must have these exact keys:\n- "name": the product or food name visible anywhere on the label/package (use "Scanned Food" if not visible)\n- "ingredientsText": the complete ingredient list exactly as visible (use an empty string if it is not visible; do not guess)\n- "proteinSource": use "support" for lean/plant, "limit" for higher-fat/processed, or "unknown" when not supported by visible evidence\n- "carbSource": use "support" for complex/fiber-rich, "limit" for simple/refined, or "unknown" when not supported by visible evidence\n- "fatSource": use "support" for unsaturated, "limit" for saturated/trans, or "unknown" when not supported by visible evidence\n- "cal": Calories per serving as a plain number\n- "prot": Protein grams per serving as a plain number\n- "fat": Total Fat grams per serving as a plain number\n- "carbs": Total Carbohydrate grams per serving as a plain number\n- "fiber": Dietary Fiber grams per serving as a plain number\n- "sugar": Total Sugars grams per serving as a plain number\n- "sodium": Sodium milligrams per serving as a plain number\n- "vitC": Vitamin C in mg per serving as a plain number\n- "vitD": Vitamin D in mcg per serving as a plain number\n- "calcium": Calcium in mg per serving as a plain number\n- "iron": Iron in mg per serving as a plain number\n- "potassium": Potassium in mg per serving as a plain number\n- "magnesium": Magnesium in mg per serving as a plain number\n- "vitB12": Vitamin B12 in mcg per serving as a plain number\n- "caffeine": Caffeine milligrams per serving as a plain number (use 0 for items with no caffeine, which is most foods)\n- "zinc": Zinc in mg per serving as a plain number\nAll numeric values must be numbers, not strings. Use 0 if a numeric value cannot be read from the label. Never invent missing ingredients or classifications. Output the JSON object only.'}
          ,{type:'text',text:'Also include a string key named "servingLabel" containing the exact serving size printed on the label, including its unit (for example, "1 cup (240 mL)" or "30 g"). Use "1 serving" only when the serving size cannot be read.'}
        ]}]
      })
    }).then(function(r){return r.json();}).then(function(data){
      document.body.removeChild(status);
      if(data.error)throw new Error(data.error.message);
      var txt=(data.content[0].text||'').trim();
      var parsed;
      try{parsed=JSON.parse(txt);}catch(e){
        var m=txt.match(/\{[\s\S]*\}/);
        if(m)try{parsed=JSON.parse(m[0]);}catch(e2){throw new Error('Could not parse AI response: '+txt.slice(0,100));}
        else throw new Error('No JSON found in response: '+txt.slice(0,100));
      }
      var validSource=function(value){value=String(value||'').toLowerCase();return value==='support'||value==='limit'?value:'';};
      window._pendingScanFood={name:parsed.name||'Scanned Food',ingredientsText:String(parsed.ingredientsText||'').trim(),servingLabel:String(parsed.servingLabel||'1 serving').trim(),proteinSource:validSource(parsed.proteinSource),carbSource:validSource(parsed.carbSource),fatSource:validSource(parsed.fatSource),cal:parsed.cal||null,prot:parsed.prot||null,fat:parsed.fat||null,carbs:parsed.carbs||null};
      MICRO_FIELDS.forEach(function(f){window._pendingScanFood[f]=(parsed[f]!==undefined&&parsed[f]!==null&&parsed[f]!==0)?parsed[f]:null;});
      window._pendingScanFood.source='label';var relevantSources=[window._pendingScanFood.prot?'proteinSource':'',window._pendingScanFood.carbs?'carbSource':'',window._pendingScanFood.fat?'fatSource':''].filter(Boolean),classifiedSources=relevantSources.filter(function(field){return !!window._pendingScanFood[field];}).length;window._pendingScanFood.sourceConfidence=window._pendingScanFood.ingredientsText&&relevantSources.length&&classifiedSources===relevantSources.length?'High':window._pendingScanFood.ingredientsText&&classifiedSources?'Medium':'Low';window._pendingScanFood.sourceMethod=window._pendingScanFood.ingredientsText?'Label + ingredients':'Needs review';inferFoodMacroSources(window._pendingScanFood);var scanHeading=document.getElementById('scanConfirmTitle');if(scanHeading)scanHeading.textContent='Nutrition Info Scanned';
      var nameEl=document.getElementById('scanResultName'),macroEl=document.getElementById('scanResultMacros'),modal=document.getElementById('scanConfirmModal');
      if(nameEl)nameEl.textContent=window._pendingScanFood.name;
      if(macroEl){
        var microSummary=MICRO_FIELDS.filter(function(f){return window._pendingScanFood[f];}).map(function(f){return MICRO_META[f].icon+' '+window._pendingScanFood[f]+MICRO_META[f].unit+' '+MICRO_META[f].label;}).join(' &nbsp;|&nbsp; ');
        macroEl.innerHTML='<strong style="color:#b45309;">'+(window._pendingScanFood.cal||0)+' calories per serving</strong><br>'
          +(window._pendingScanFood.prot||0)+'g protein per serving &nbsp;|&nbsp; '
          +(window._pendingScanFood.fat||0)+'g fat per serving &nbsp;|&nbsp; '
          +(window._pendingScanFood.carbs||0)+'g carbs per serving'
          +(microSummary?'<div style="margin-top:6px;font-size:0.76rem;color:#0f766e;">'+microSummary+'</div>':'')
          +(window._pendingScanFood.ingredientsText?'<div style="margin-top:7px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:.72rem;color:#475569;"><strong>Ingredients read:</strong> '+escHtml(window._pendingScanFood.ingredientsText)+'</div>':'<div style="margin-top:7px;font-size:.7rem;color:#92400e;">Ingredients were not visible; source classification may need review.</div>')
          +'<div style="margin-top:5px;font-size:.68rem;color:#64748b;">'+escHtml(window._pendingScanFood.sourceConfidence||'Low')+' source confidence</div>';
      }
      renderPendingFoodPhoto(window._pendingScanFood);if(modal)modal.style.display='flex';
    }).catch(function(err){
      try{document.body.removeChild(status);}catch(e){}
      alert('Scan failed: '+err.message);
    });
  };
  reader.readAsDataURL(file);
  ev.target.value='';
}

// ── Nutrition-to-Run AI ──────────────────────────────
function confirmScanAdd(){
  var food=window._pendingScanFood;if(!food){alert('No scanned food is waiting to be added.');return;}
  var meal=(document.getElementById('scanMealTarget')||{}).value||'snack';
  if(MEALS.indexOf(meal)<0)meal='snack';
  if(!window._foodLog)window._foodLog=[];
  var scanItem={id:'f'+Date.now(),meal:meal,name:food.name,cal:food.cal,prot:food.prot,fat:food.fat,carbs:food.carbs,servings:1,source:food.source||'scan',barcode:food.barcode||'',servingLabel:food.servingLabel||'',ingredientsText:food.ingredientsText||'',categoriesText:food.categoriesText||'',proteinSource:food.proteinSource||'',carbSource:food.carbSource||'',fatSource:food.fatSource||'',sourceConfidence:food.sourceConfidence||'Low',sourceMethod:food.sourceMethod||'Needs review',imageUrl:food.imageUrl||'',imageData:food.imageData||''};
  MICRO_FIELDS.forEach(function(f){scanItem[f]=food[f]!=null?food[f]:null;});
  window._foodLog.push(scanItem);
  _setMealOpen(meal,true);renderFoodItems();save();
  var modal=document.getElementById('scanConfirmModal');if(modal)modal.style.display='none';
  window._pendingScanFood=null;
  if(typeof v26Toast==='function')v26Toast('Scanned food added');
}
function openFuelAIModal(){
  var key=journalAIKey();
  if(!key){alert('Set your AI key in Settings first.');return;}
  // Default: nutrition = yesterday, run = today
  var t=new Date();
  var yd=new Date(t);yd.setDate(yd.getDate()-1);
  var fmt=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  document.getElementById('fuelNutrDate').value=fmt(yd);
  document.getElementById('fuelRunDate').value=fmt(t);
  document.getElementById('fuelAIModal').style.display='flex';
}
function closeFuelAIModal(){document.getElementById('fuelAIModal').style.display='none';}
function aiNutritionCorrelation(){
  var key=journalAIKey();
  if(!key){alert('Set your AI key in Settings first.');return;}
  var nutrDate=document.getElementById('fuelNutrDate').value;
  var runDate=document.getElementById('fuelRunDate').value;
  if(!nutrDate||!runDate){alert('Please select both dates.');return;}
  closeFuelAIModal();
  var box=document.getElementById('nutritionAIBox');
  if(!box)return;
  box.style.display='block';
  box.textContent='🧠 Analyzing fuel vs. performance…';
  // Nutrition day data
  var nRaw=localStorage.getItem('planner_'+nutrDate);
  var nData=nRaw?JSON.parse(nRaw):{};
  var nLog=Array.isArray(nData.foodLog)?nData.foodLog:[];
  var nCal=nLog.reduce(function(a,x){return a+(parseFloat(x.cal)||0);},0)||parseFloat(nData.nuCalVal)||0;
  var nProt=nLog.reduce(function(a,x){return a+(parseFloat(x.prot)||0);},0)||parseFloat(nData.nuProtVal)||0;
  var nCarbs=nLog.reduce(function(a,x){return a+(parseFloat(x.carbs)||0);},0)||parseFloat(nData.nuCarbsVal)||0;
  var nFat=nLog.reduce(function(a,x){return a+(parseFloat(x.fat)||0);},0)||parseFloat(nData.nuFatVal)||0;
  var nWater=(nData.waterOz||(nData.waterCount?nData.waterCount*8:0))+(parseFloat(nData.sportsDrinksOz)||0)+(parseFloat(nData.otherLiquidsOz)||0);
  // Meal breakdown
  var mealTypes=['breakfast','lunch','dinner','snack','liquids','sports','supplements'];
  var mealLines=[];
  mealTypes.forEach(function(mt){
    var items=nLog.filter(function(x){return x.meal===mt;});
    if(items.length){
      var names=items.map(function(x){return x.name+(x.cal?' ('+Math.round(parseFloat(x.cal))+'cal)':'');}).join(', ');
      mealLines.push(mt.charAt(0).toUpperCase()+mt.slice(1)+': '+names);
    }
  });
  // Run day data
  var rRaw=localStorage.getItem('planner_'+runDate);
  var rData=rRaw?JSON.parse(rRaw):{};
  // Also check Activities log for that date
  var acts=getActivities();
  var runAct=acts.filter(function(a){return a.date===runDate&&(a.type==='Run'||a.type==='run');});
  var miles=parseFloat(rData.exMiles)||(runAct.length?parseFloat(runAct[0].distance):0)||0;
  var pace=rData.exPace||(runAct.length?runAct[0].pace:'');
  var runNotes=rData.exRunVal||(runAct.length?runAct[0].notes:'');
  // Sports nutrition + water from run day
  var rWater=(rData.waterOz||(rData.waterCount?rData.waterCount*8:0))+(parseFloat(rData.sportsDrinksOz)||0)+(parseFloat(rData.otherLiquidsOz)||0);
  var rLog=Array.isArray(rData.foodLog)?rData.foodLog:[];
  var runSports=rLog.filter(function(x){return x.meal==='sports';});
  // Build focused prompt
  var nutrDateFmt=new Date(nutrDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  var runDateFmt=new Date(runDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  var extraCtx=(document.getElementById('fuelExtraContext')&&document.getElementById('fuelExtraContext').value||'').trim();
  var prompt='You are a sports nutritionist. Analyze how the nutrition on '+nutrDateFmt+' likely affected the run on '+runDateFmt+'. Be specific and practical. Max 350 words.\n\n';
  if(extraCtx)prompt+='ADDITIONAL CONTEXT: '+extraCtx+'\n\n';
  prompt+='NUTRITION ('+nutrDateFmt+'): '+(nCal?Math.round(nCal)+' kcal':'No calories logged');
  prompt+=' | Protein '+(nProt?Math.round(nProt)+'g':'N/A');
  prompt+=' | Carbs '+(nCarbs?Math.round(nCarbs)+'g':'N/A');
  prompt+=' | Fat '+(nFat?Math.round(nFat)+'g':'N/A');
  prompt+=' | Water '+(nWater?nWater+' oz':'N/A')+'\n';
  if(mealLines.length)prompt+='Meals:\n'+mealLines.join('\n')+'\n';
  prompt+='\nRUN ('+runDateFmt+'): '+(miles?miles+' miles':'No distance logged');
  if(pace)prompt+=' @ '+pace+'/mi';
  if(rWater)prompt+=' | Water: '+rWater+' oz';
  if(runNotes)prompt+=' — '+runNotes;
  if(runSports.length){var sportNames=runSports.map(function(x){return x.name+(x.cal?' ('+Math.round(parseFloat(x.cal))+'cal)':'');}).join(', ');prompt+='\nSports/Race Nutrition (during run): '+sportNames;}
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:3000,messages:[{role:'user',content:prompt}]})
  }).then(function(r){return r.json();}).then(function(data){
    if(data.error)throw new Error(data.error.message);
    var analysis=(data.content[0].text||'').trim();
    window._fuelAnalysisContext=prompt+analysis;
    var _fuelKey='fuel_'+nutrDateFmt+'_'+runDateFmt;_aiLastShown[_fuelKey]={text:analysis,lbl:'Fuel AI '+nutrDateFmt+' → '+runDateFmt};box.innerHTML='<strong style="color:#8e44ad">🧠 Fuel Analysis: '+nutrDateFmt+' → '+runDateFmt+'</strong><br><br>'+analysis.replace(/\n/g,'<br>')+'<div style="text-align:right;margin-top:8px;padding-top:6px;border-top:1px solid #e8c4f0;"><button data-bid="'+_fuelKey+'" onclick="var d=_aiLastShown[this.dataset.bid];if(d){var arch=JSON.parse(localStorage.getItem(\'ai_archive\')||\'[]\');arch.unshift({label:d.lbl,text:d.text,ts:new Date().toLocaleString()});while(arch.length>150)arch.pop();localStorage.setItem(\'ai_archive\',JSON.stringify(arch));this.textContent=\'✓ Archived\';this.disabled=true;this.style.background=\'#27ae60\';}" style="font-size:0.75rem;padding:3px 10px;border-radius:6px;border:none;background:#8e44ad;color:#fff;cursor:pointer;">📁 Archive</button></div>'+'<div style="margin-top:12px;border-top:1px solid #e9d5ff;padding-top:10px;"><div style="font-size:0.78rem;font-weight:700;color:#8e44ad;margin-bottom:5px;">&#x1F4AC; Ask a follow-up:</div><div style="display:flex;gap:6px;align-items:center;"><input type="text" id="fuelFollowUpInput" placeholder="e.g. How to improve carb timing?" style="flex:1;border:1px solid #d0d0ff;border-radius:6px;padding:6px 10px;font-size:0.83rem;outline:none;font-family:inherit;"><button onclick="fuelFollowUp()" style="background:#8e44ad;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:0.82rem;cursor:pointer;white-space:nowrap;">Ask →</button></div><div id="fuelFollowUpResult" style="margin-top:8px;font-size:0.84rem;color:#444;display:none;"></div></div>';
  }).catch(function(err){box.textContent='Error: '+err.message;});
}

function fuelFollowUp(){
  var key=journalAIKey();if(!key)return;
  var q=(document.getElementById('fuelFollowUpInput').value||'').trim();
  if(!q){alert('Enter a follow-up question.');return;}
  var res=document.getElementById('fuelFollowUpResult');if(!res)return;
  res.style.display='block';res.innerHTML='<em style="color:#aaa;">Thinking…</em>';
  var ctx=window._fuelAnalysisContext||'';
  var fup=ctx+'\nFollow-up question: '+q+'\nAnswer specifically and concisely (max 130 words).';
  fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2000,messages:[{role:'user',content:fup}]})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.error)throw new Error(d.error.message);
    var ans=(d.content[0].text||'').trim();
    window._fuelAnalysisContext+='\nFollow-up: '+q+'\nAnswer: '+ans;
    res.innerHTML='<strong style="color:#8e44ad;">💬 '+escHtml(q)+'</strong><br><br>'+ans.replace(/\n/g,'<br>');
    var inp=document.getElementById('fuelFollowUpInput');if(inp)inp.value='';
  }).catch(function(e){res.innerHTML='<span style="color:#e74c3c;">Error: '+e.message+'</span>';});
}
