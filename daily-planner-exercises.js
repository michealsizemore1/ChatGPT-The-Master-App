// Strength exercise helper for the Training Plan card.
// Exercise lines in today's workout ("- Goblet squat: 3x12-15") become tappable. Tapping opens a
// pop-up with how-to steps, what to watch for, an easier option, and a button that opens form
// videos for that exact exercise in YouTube.
(function(){
  var LIB=[
    {re:/goblet\s*squat/i,name:'Goblet squat',gear:'One dumbbell or kettlebell',
     steps:['Hold one dumbbell upright against your chest, hands cupping the top end.','Feet a little wider than hips, toes turned slightly out.','Sit hips down and back like into a chair until thighs are about level with the floor.','Chest up, knees tracking over your toes. Push through your whole foot to stand.'],
     watch:'Knees caving in, or heels lifting off the floor.',easier:'Squat to a chair or bench and stand back up.'},
    {re:/romanian\s*deadlift|\bRDL\b/i,name:'Dumbbell Romanian deadlift',gear:'Two dumbbells',
     steps:['Stand tall, a dumbbell in each hand in front of your thighs, knees softly bent.','Push your hips straight back and slide the weights down the front of your legs.','Keep your back flat. Stop when you feel a strong hamstring stretch (about mid-shin).','Squeeze your glutes and drive your hips forward to stand.'],
     watch:'Rounding your back. It’s a hip hinge, not a squat.',easier:'Practice with no weight, hands sliding down your thighs.'},
    {re:/bulgarian\s*split\s*squat|rear[-\s]*foot\s*elevated/i,name:'Bulgarian split squat',gear:'Bench or couch (dumbbells optional)',
     steps:['Stand about two feet in front of a bench, facing away.','Rest the top of one foot on the bench behind you.','Lower your back knee straight down until your front thigh is about level.','Drive up through your front heel. Finish all reps, then switch legs.'],
     watch:'Front knee shooting far past your toes. Step your front foot farther out.',easier:'Body weight only, or a regular split squat with the back foot on the floor.'},
    {re:/calf\s*raise/i,name:'Standing calf raise',gear:'A step and a wall or rail',
     steps:['Stand on a step with your heels hanging off, holding a rail for balance.','Rise as high as you can onto your toes and pause for a second.','Lower slowly (about 3 seconds) until your heels dip below the step.'],
     watch:'Bouncing or rushing. Slow lowering is what protects calves and Achilles.',easier:'Do them on flat ground.'},
    {re:/(lateral|side)\s*band\s*walk|band\s*(lateral|side)\s*walk|monster\s*walk/i,name:'Lateral band walk',gear:'Mini resistance band',
     steps:['Band just above your knees (around the ankles is harder).','Quarter squat, feet hip-width apart, toes forward.','Step sideways, keeping tension on the band the whole time.','Do all steps one way, then come back the other way.'],
     watch:'Feet snapping together, or rocking side to side.',easier:'Lighter band, or band above the knees.'},
    {re:/shoulder\s*tap/i,name:'Plank with shoulder taps',gear:'None',
     steps:['High plank on straight arms, body straight from head to heels, feet a bit wide.','Slowly lift one hand and tap the opposite shoulder.','Switch sides, keeping your hips as still as possible.'],
     watch:'Hips rocking side to side.',easier:'Do it with your knees on the floor.'},
    {re:/dead\s*bug/i,name:'Dead bug',gear:'None',
     steps:['Lie on your back, arms pointing at the ceiling, knees bent 90° above your hips.','Press your lower back into the floor.','Slowly reach one arm overhead while straightening the opposite leg toward the floor.','Breathe out as you extend, return, then switch sides.'],
     watch:'Lower back arching off the floor. Make the movement smaller.',easier:'Move only the legs, arms stay up.'},
    {re:/glute\s*bridge|hip\s*bridge/i,name:'Glute bridge',gear:'None',
     steps:['Lie on your back, knees bent, feet flat near your hips.','Squeeze your glutes and lift your hips until knees, hips and shoulders line up.','Pause, then lower slowly.'],
     watch:'Arching your lower back instead of using your glutes.',easier:'Smaller range of motion.'},
    {re:/side\s*plank/i,name:'Side plank',gear:'None',
     steps:['Lie on your side, elbow under your shoulder, legs stacked.','Lift your hips so your body is a straight line.','Hold, then switch sides.'],
     watch:'Hips sagging toward the floor.',easier:'Bottom knee on the floor.'},
    {re:/\bplank\b/i,name:'Plank',gear:'None',
     steps:['Forearms on the floor, elbows under shoulders.','Body straight from head to heels, glutes and abs tight.','Hold while breathing steadily.'],
     watch:'Hips sagging or piking up.',easier:'Knees on the floor.'},
    {re:/step[-\s]*ups?/i,name:'Step-up',gear:'Sturdy step or bench',
     steps:['Place one whole foot on the step.','Drive through that heel to stand up on the step.','Lower slowly with control. Finish reps, then switch.'],
     watch:'Pushing off the back foot.',easier:'Lower step.'},
    {re:/single[-\s]*leg\s*deadlift|single[-\s]*leg\s*rdl/i,name:'Single-leg deadlift',gear:'Optional dumbbell',
     steps:['Stand on one leg, slight knee bend.','Hinge forward, letting the other leg extend straight behind you.','Keep hips level, return to standing.'],
     watch:'Hips opening up toward the ceiling.',easier:'Lightly touch the back toe down for balance.'},
    {re:/\blunges?\b/i,name:'Lunge',gear:'Optional dumbbells',
     steps:['Step forward and lower until both knees are about 90°.','Front knee over your ankle, torso tall.','Push back to standing and alternate legs.'],
     watch:'Front knee collapsing inward.',easier:'Shorter range, hold a wall.'},
    {re:/clamshell/i,name:'Clamshell',gear:'Optional mini band',
     steps:['Lie on your side, hips and knees bent, feet together.','Keeping feet touching, lift the top knee.','Lower slowly.'],
     watch:'Rolling your hips backward.',easier:'No band.'},
    {re:/bird[-\s]*dog/i,name:'Bird dog',gear:'None',
     steps:['On hands and knees, back flat.','Reach one arm forward and the opposite leg back.','Pause, return, switch sides.'],
     watch:'Twisting your hips or arching your back.',easier:'Move just the arm or just the leg.'},
    {re:/(squat)(?![a-z])/i,name:'Squat',gear:'None',
     steps:['Feet shoulder-width apart.','Sit hips down and back, chest up.','Stand by pushing through your whole foot.'],
     watch:'Knees caving in or heels lifting.',easier:'Squat to a chair.'}
  ];

  function find(line){for(var i=0;i<LIB.length;i++){if(LIB[i].re.test(line))return LIB[i];}return null;}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function open(line){
    var ex=find(line);
    var label=line.replace(/^[-•*\s]+/,'');
    var name=ex?ex.name:label.split(':')[0].trim();
    var dose=label.indexOf(':')!==-1?label.slice(label.indexOf(':')+1).trim():'';
    var q=encodeURIComponent(name+' proper form');
    var old=document.getElementById('exPop');if(old)old.remove();
    var d=document.createElement('div');
    d.id='exPop';
    d.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99999;display:flex;align-items:flex-end;justify-content:center;';
    d.innerHTML='<div style="background:#fff;width:100%;max-width:520px;max-height:85vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 18px 26px;box-shadow:0 -8px 30px rgba(0,0,0,.25);font-family:inherit;color:#1e293b;">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">'
      +'<div><div style="font-size:1.15rem;font-weight:800;">'+esc(name)+'</div>'
      +(dose?'<div style="color:#7c3aed;font-weight:700;font-size:.9rem;margin-top:2px;">'+esc(dose)+'</div>':'')+'</div>'
      +'<button id="exPopX" style="border:none;background:#f1f5f9;border-radius:50%;width:34px;height:34px;font-size:1.1rem;cursor:pointer;">✕</button></div>'
      +'<a href="https://www.youtube.com/results?search_query='+q+'" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;margin:14px 0 6px;background:#dc2626;color:#fff;text-decoration:none;font-weight:800;padding:12px;border-radius:12px;">▶ Watch form videos</a>'
      +'<div style="font-size:.74rem;color:#64748b;text-align:center;margin-bottom:10px;">Opens YouTube with demos of this exercise</div>'
      +(ex?(
        '<div style="font-size:.8rem;color:#64748b;margin-bottom:8px;"><strong>Equipment:</strong> '+esc(ex.gear)+'</div>'
        +'<ol style="margin:0 0 10px 18px;padding:0;line-height:1.5;font-size:.92rem;">'+ex.steps.map(function(s){return'<li style="margin-bottom:4px;">'+esc(s)+'</li>';}).join('')+'</ol>'
        +'<div style="background:#fef2f2;border-radius:10px;padding:8px 10px;font-size:.85rem;margin-bottom:8px;"><strong>Watch for:</strong> '+esc(ex.watch)+'</div>'
        +'<div style="background:#f0fdf4;border-radius:10px;padding:8px 10px;font-size:.85rem;"><strong>Easier version:</strong> '+esc(ex.easier)+'</div>'
      ):'<div style="font-size:.88rem;color:#475569;">Tap the button above to see how it’s done.</div>')
      +'<div style="font-size:.74rem;color:#94a3b8;margin-top:12px;">Rest 60–90 s between sets. Pick a weight where the last 2–3 reps are hard but form holds. Stop if you feel sharp or joint pain.</div>'
      +'</div>';
    d.addEventListener('click',function(e){if(e.target===d||e.target.id==='exPopX')d.remove();});
    document.body.appendChild(d);
  }
  window.openExerciseHelp=open;

  // Make exercise lines in the Training Plan card tappable (text stays exactly the same).
  var busy=false;
  function decorate(){
    var body=document.getElementById('twBody');
    if(!body||busy||body.isContentEditable||body.querySelector('.ex-tap'))return;
    var text=body.textContent||'';
    var lines=text.split('\n');
    var any=false;
    var html=lines.map(function(l){
      var isItem=/^\s*[-•*]\s*\S/.test(l)&&/\d\s*[x×]\s*\d|\d+\s*(sec|s\b|min|reps?|steps|per)/i.test(l);
      if(isItem&&(find(l)||/:/.test(l))){any=true;return'<span class="ex-tap" data-line="'+esc(l.trim())+'" style="cursor:pointer;text-decoration:underline dotted #7c3aed;text-underline-offset:3px;">'+esc(l)+' <span style="color:#7c3aed;font-size:.8em;">▶</span></span>';}
      return esc(l);
    }).join('\n');
    if(!any)return;
    busy=true;
    body.innerHTML=html;
    busy=false;
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('.ex-tap');
    if(t){e.preventDefault();open(t.getAttribute('data-line'));}
  });
  function watch(){
    var body=document.getElementById('twBody');
    if(!body){setTimeout(watch,800);return;}
    new MutationObserver(function(){if(!busy)setTimeout(decorate,0);}).observe(body,{childList:true,characterData:true,subtree:true});
    decorate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
