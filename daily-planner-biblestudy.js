/* 📖 Daily Bible Study (Nov 2026)
 * One guided session that walks through the four daily Bible areas:
 *   1 🙏 Opening prayer (ticks AI Prayer) → 2 📖 Read the whole passage, with 🎧 Listen (ticks Bible Audio)
 *   → 3 🔍 Study, SOAP (context, key word, cross-references, questions you answer)
 *   → 4 🎶 Worship response (ticks Worship) → 5 🙏 Closing prayer from your application (ticks Daily Bread when finished).
 * Plus: book-by-book reading plan, a saved study journal (searchable), a weekly memory verse, and the week's studies
 * fed to the Weekly AI Review. Scripture text is the World English Bible (public domain) from bible-api.com.
 * The four original cards stay; this sits above them. */
(function(){
  var BOOKS=[['Genesis',50],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],['1 Kings',22],['2 Kings',25],['1 Chronicles',29],['2 Chronicles',36],['Ezra',10],['Nehemiah',13],['Esther',10],['Job',42],['Psalms',150],['Proverbs',31],['Ecclesiastes',12],['Song of Solomon',8],['Isaiah',66],['Jeremiah',52],['Lamentations',5],['Ezekiel',48],['Daniel',12],['Hosea',14],['Joel',3],['Amos',9],['Obadiah',1],['Jonah',4],['Micah',7],['Nahum',3],['Habakkuk',3],['Zephaniah',3],['Haggai',2],['Zechariah',14],['Malachi',4],
    ['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],['Romans',16],['1 Corinthians',16],['2 Corinthians',13],['Galatians',6],['Ephesians',6],['Philippians',4],['Colossians',4],['1 Thessalonians',5],['2 Thessalonians',3],['1 Timothy',6],['2 Timothy',4],['Titus',3],['Philemon',1],['Hebrews',13],['James',5],['1 Peter',5],['2 Peter',3],['1 John',5],['2 John',1],['3 John',1],['Jude',1],['Revelation',22]];
  function chapters(book){var b=BOOKS.find(function(x){return x[0].toLowerCase()===String(book||'').toLowerCase();});return b?b[1]:0;}
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function todayKey(){try{return dk(new Date());}catch(e){var d=new Date();return d.toISOString().slice(0,10);}}
  function ls(k,v){try{if(v===undefined){var r=localStorage.getItem(k);return r?JSON.parse(r):null;}if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){return null;}}
  function weekKey(d){d=new Date(d||new Date());var day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return dk(d);}
  function plan(){return ls('bstudy_plan');}
  function sessionKey(date){return 'bstudy_'+(date||todayKey());}
  function toast(m){try{if(typeof v26Toast==='function')v26Toast(m);}catch(e){}}

  // ── Scripture text (WEB, public domain) ──
  var chapterCache={};
  function parseRef(ref){
    var m=String(ref||'').trim().match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?/);
    if(!m)return null;var book=m[1].replace(/\s+/g,' ').trim();
    var hit=BOOKS.find(function(b){return b[0].toLowerCase()===book.toLowerCase()||b[0].toLowerCase().replace(/s$/,'')===book.toLowerCase().replace(/s$/,'')||(book.length>=3&&b[0].toLowerCase().indexOf(book.toLowerCase())===0);});
    return {book:hit?hit[0]:book,chapter:+m[2],verse:m[3]?+m[3]:0,to:m[4]?+m[4]:0};
  }
  function fetchChapter(book,ch){
    var k=book+' '+ch;if(chapterCache[k])return Promise.resolve(chapterCache[k]);
    return fetch('https://bible-api.com/'+encodeURIComponent(k).replace(/%20/g,'+')+'?translation=web').then(function(r){if(!r.ok)throw new Error('Scripture lookup failed ('+r.status+')');return r.json();})
      .then(function(j){var v=(j.verses||[]).map(function(x){return {v:x.verse,t:String(x.text||'').replace(/\s+/g,' ').trim()};});chapterCache[k]=v;return v;});
  }

  // ── AI ──
  function ai(prompt,maxTok){
    var body={model:'claude-sonnet-4-5',max_tokens:maxTok||2500,messages:[{role:'user',content:prompt}]};
    return journalProtectedFunction(body).then(function(d){
      if(d&&d.error){body.model='claude-haiku-4-5-20251001';return journalProtectedFunction(body);}return d;
    }).then(function(d){if(!d||d.error)throw new Error((d&&d.error&&d.error.message)||'AI unavailable');return String((d.content&&d.content[0]&&d.content[0].text)||'').trim();});
  }
  function json(t){var m=String(t).match(/\{[\s\S]*\}/);return JSON.parse(m?m[0]:t);}

  // ── Checks ──
  function tick(key){
    try{var box=document.querySelector('.tri-check[data-key="'+key+'"]');if(!box)return;
      if(box.dataset.state!=='green'){applyTriState(box,'green');try{save();}catch(e){}try{renderDailyCheckOverview();}catch(e){}}}catch(e){}
  }

  // ── Session state ──
  var S=null; // {date, ref, book, chapter, from, to, keyVerse, verses:[], study:{}, answers:{s,o:[],a:[],p}, step, done:{}}
  function persist(){if(!S)return;var c=Object.assign({},S);delete c.verses;ls(sessionKey(S.date),c);}

  function todaysPassage(){
    var p=plan();
    if(p&&p.book&&p.chapter)return {book:p.book,chapter:p.chapter,from:0,to:0,source:'plan'};
    var verse='';try{verse=(document.getElementById('spDailyBreadText')||{}).value||localStorage.getItem('medit_scripture')||'';}catch(e){}
    var r=parseRef(verse.replace(/^[“"].*?[”"]\s*[—-]\s*/,''))||parseRef((verse.match(/[—-]\s*(.+)$/)||[])[1]||'');
    if(r)return {book:r.book,chapter:r.chapter,from:0,to:0,keyVerse:r.verse,source:'verse'};
    return {book:'Psalms',chapter:46,from:0,to:0,keyVerse:10,source:'default'};
  }

  function open(date){
    if(!journalAIKey()){alert('Add your Anthropic API key in Settings first.');return;}
    date=date||todayKey();
    var saved=ls(sessionKey(date));
    if(saved){S=saved;S.verses=null;}
    else{var t=todaysPassage();S={date:date,book:t.book,chapter:t.chapter,from:0,to:0,keyVerse:t.keyVerse||0,source:t.source,study:null,answers:{s:'',o:[],a:[],p:''},step:0,done:{}};}
    build();render();
  }

  // ── UI shell ──
  function build(){
    var ov=document.getElementById('bstudyOverlay');if(ov)ov.remove();
    ov=document.createElement('div');ov.id='bstudyOverlay';
    ov.innerHTML='<div class="bs-sheet"><div class="bs-top"><button class="bs-x" onclick="bibleStudy.close()">✕</button><div class="bs-title">📖 Bible Study</div><div class="bs-ref" id="bsRef"></div></div>'
      +'<div class="bs-steps" id="bsSteps"></div><div class="bs-body" id="bsBody"></div><div class="bs-nav"><button id="bsBack" class="bs-btn2" onclick="bibleStudy.step(-1)">‹ Back</button><button id="bsNext" class="bs-btn" onclick="bibleStudy.step(1)">Next ›</button></div></div>';
    document.body.appendChild(ov);document.body.style.overflow='hidden';
  }
  var STEPS=['🙏 Open','📖 Read','🔍 Study','🎶 Worship','🙏 Close'];
  function refText(){return S.book+' '+S.chapter+(S.from?':'+S.from+(S.to&&S.to!==S.from?'–'+S.to:''):'');}
  function render(){
    if(!S)return;var body=document.getElementById('bsBody');if(!body)return;
    document.getElementById('bsRef').textContent=refText()+(S.source==='plan'?' · reading plan':'');
    document.getElementById('bsSteps').innerHTML=STEPS.map(function(s,i){return '<span class="'+(i===S.step?'on':(S.done[i]?'ok':''))+'" onclick="bibleStudy.go('+i+')">'+(S.done[i]&&i!==S.step?'✓ ':'')+s+'</span>';}).join('');
    document.getElementById('bsBack').style.visibility=S.step>0?'visible':'hidden';
    document.getElementById('bsNext').textContent=S.step===4?(S.finished?'Done':'✓ Finish study'):'Next ›';
    if(!S.study){body.innerHTML='<div class="bs-load">⏳ Preparing today\'s study of '+esc(S.book+' '+S.chapter)+'…</div>';prepare();return;}
    var st=S.study,h='';
    if(S.step===0){
      h='<div class="bs-card bs-pray"><div class="bs-h">Opening prayer</div><div class="bs-text">'+esc(st.open_prayer||'')+'</div></div>'
        +'<div class="bs-note">Pray it slowly, or in your own words. Today\'s theme: <b>'+esc(st.theme||'')+'</b></div>';
    }else if(S.step===1){
      h='<div class="bs-row"><button class="bs-btn2" id="bsListen" onclick="bibleStudy.listen()">🎧 Listen</button><span class="bs-note" style="margin:0">World English Bible · '+esc(refText())+'</span></div>';
      if(!S.verses){h+='<div class="bs-load">⏳ Loading the passage…</div>';loadVerses();}
      else h+='<div class="bs-card bs-scripture">'+S.verses.filter(function(v){return (!S.from||v.v>=S.from)&&(!S.to||v.v<=S.to);}).map(function(v){return '<span class="'+(v.v===S.keyVerse?'kv':'')+'"><sup>'+v.v+'</sup> '+esc(v.t)+' </span>';}).join('')+'</div>'
        +(S.from?'<button class="bs-link" onclick="bibleStudy.whole()">Read the whole chapter</button>':'');
    }else if(S.step===2){
      var a=S.answers;
      h='<div class="bs-card"><div class="bs-h">Context</div><div class="bs-text">'+esc(st.context||'')+'</div></div>'
        +(st.word?'<div class="bs-card"><div class="bs-h">Key word</div><div class="bs-text"><b>'+esc(st.word.term||'')+'</b>'+(st.word.original?' — <i>'+esc(st.word.original)+'</i>':'')+'<br>'+esc(st.word.meaning||'')+'</div></div>':'')
        +((st.crossrefs||[]).length?'<div class="bs-card"><div class="bs-h">Cross-references</div>'+st.crossrefs.map(function(c,i){return '<div class="bs-xref" onclick="bibleStudy.xref('+i+')">📖 '+esc(c)+'</div><div class="bs-xtext" id="bsX'+i+'"></div>';}).join('')+'</div>':'')
        +'<div class="bs-h2">S — Scripture</div><div class="bs-q">Which verse stood out to you? Write it out.</div><textarea data-k="s" rows="2">'+esc(a.s)+'</textarea>'
        +'<div class="bs-h2">O — Observation</div>'+(st.observe||[]).map(function(q,i){return '<div class="bs-q">'+esc(q)+'</div><textarea data-k="o'+i+'" rows="2">'+esc(a.o[i]||'')+'</textarea>';}).join('')
        +'<div class="bs-h2">A — Application</div>'+(st.apply||[]).map(function(q,i){return '<div class="bs-q">'+esc(q)+'</div><textarea data-k="a'+i+'" rows="2">'+esc(a.a[i]||'')+'</textarea>';}).join('')
        +'<div class="bs-h2">P — Prayer</div><div class="bs-q">Your response to God in your own words.</div><textarea data-k="p" rows="3">'+esc(a.p)+'</textarea>';
    }else if(S.step===3){
      var song=st.song||{};var q=encodeURIComponent((song.title||'')+' '+(song.artist||'')+' worship');
      h='<div class="bs-card bs-pray"><div class="bs-h">Worship response</div><div class="bs-text"><b>'+esc(song.title||'')+'</b>'+(song.artist?' — '+esc(song.artist):'')+'<br><span class="bs-note">'+esc(song.why||'')+'</span></div>'
        +'<div class="bs-row"><a class="bs-btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query='+q+'">▶ YouTube</a><a class="bs-btn2" target="_blank" rel="noopener" href="https://open.spotify.com/search/'+q+'">Spotify</a></div></div>'
        +'<div class="bs-note">Listen, sing, or sit quietly with the passage for a few minutes.</div>';
    }else{
      h=S.closing?'<div class="bs-card bs-pray"><div class="bs-h">Closing prayer</div><div class="bs-text">'+esc(S.closing)+'</div></div>'
        :'<div class="bs-load">⏳ Writing a closing prayer from what you wrote…</div>';
      if(st.memory)h+='<div class="bs-card"><div class="bs-h">This week\'s memory verse</div><div class="bs-text">'+esc(memoryLine())+'</div></div>';
      if(!S.closing)closing();
    }
    body.innerHTML=h;body.scrollTop=0;
    body.querySelectorAll('textarea').forEach(function(t){t.addEventListener('input',function(){var k=t.dataset.k;if(k==='s'||k==='p')S.answers[k]=t.value;else{var arr=S.answers[k[0]];arr[+k.slice(1)]=t.value;}persist();});});
  }
  function memoryLine(){var m=ls('bstudy_mem_'+weekKey());return m?('“'+m.text+'” — '+m.ref):'';}

  function prepare(){
    if(S._preparing)return;S._preparing=true;
    fetchChapter(S.book,S.chapter).then(function(verses){
      S.verses=verses;
      var text=verses.map(function(v){return v.v+' '+v.t;}).join(' ');
      var hist=[];try{for(var i=1;i<=6;i++){var d=new Date();d.setDate(d.getDate()-i);var o=ls(sessionKey(dk(d)));if(o&&o.study)hist.push(o.book+' '+o.chapter+(o.study.theme?' ('+o.study.theme+')':''));}}catch(e){}
      var long=verses.length>32&&S.source!=='plan';
      var prompt='You are leading a personal daily Bible study for a Christian man (a runner and family man). Passage: '+S.book+' '+S.chapter+(S.keyVerse?', focus verse '+S.book+' '+S.chapter+':'+S.keyVerse:'')+'.\n'
        +'World English Bible text of the chapter:\n'+text.slice(0,14000)+'\n\n'
        +(hist.length?'Recent studies (for continuity, don\'t repeat questions): '+hist.join('; ')+'\n':'')
        +'Return ONLY JSON, no other text:\n{"from":0,"to":0,"key_verse":0,"theme":"3-6 words","open_prayer":"4-6 sentence prayer asking for understanding of this passage",'
        +'"context":"3-4 sentences: who wrote it, to whom, when, what is happening, and how it fits the book",'
        +'"word":{"term":"an important English word in the passage","original":"Hebrew/Greek word with transliteration","meaning":"1-2 sentences"},'
        +'"crossrefs":["Book C:V — 6-10 word note",3 items],"observe":["3-4 questions about what the text actually says"],'
        +'"apply":["2 questions about living it out this week"],"song":{"title":"a real, well-known worship song that fits the theme","artist":"","why":"one sentence"},'
        +'"memory_verse":"Book C:V — one short verse from this passage worth memorizing"}\n'
        +(long?'"from"/"to": the section of 8-25 verses to read'+(S.keyVerse?' around verse '+S.keyVerse:'')+'. ':'"from"/"to": 0 (read the whole chapter). ')
        +'"key_verse": the verse number to highlight. Write warmly and plainly. Do not quote any copyrighted translation; refer to verses by reference.';
      return ai(prompt,2800).then(function(t){
        var j=json(t);S.study=j;
        if(long&&j.from>0&&j.to>=j.from){S.from=j.from;S.to=j.to;}
        if(!S.keyVerse&&j.key_verse)S.keyVerse=+j.key_verse;
        setMemory(j.memory_verse);
        S._preparing=false;persist();render();
      });
    }).catch(function(e){S._preparing=false;var b=document.getElementById('bsBody');if(b)b.innerHTML='<div class="bs-load">Couldn\'t prepare the study: '+esc(e.message)+'<br><br><button class="bs-btn" onclick="bibleStudy.retry()">Try again</button></div>';});
  }
  function loadVerses(){fetchChapter(S.book,S.chapter).then(function(v){S.verses=v;render();}).catch(function(e){var b=document.getElementById('bsBody');if(b)b.innerHTML='<div class="bs-load">Couldn\'t load the passage ('+esc(e.message)+').</div>';});}
  function setMemory(mv){
    var wk=weekKey(),k='bstudy_mem_'+wk;if(ls(k)||!mv)return;
    var r=parseRef(String(mv).split('—')[0]);if(!r||!r.verse)return;
    fetchChapter(r.book,r.chapter).then(function(vs){var v=vs.find(function(x){return x.v===r.verse;});if(v){ls(k,{ref:r.book+' '+r.chapter+':'+r.verse,text:v.t,week:wk});renderCard();}}).catch(function(){});
  }
  function closing(){
    if(S._closing)return;S._closing=true;var a=S.answers;
    var prompt='Write a short, personal closing prayer (5-7 sentences) for someone who just studied '+refText()+' (theme: '+(S.study.theme||'')+').\n'
      +'What stood out to them: '+(a.s||'(not written)')+'\nTheir application: '+(a.a.filter(Boolean).join(' / ')||'(not written)')+'\nTheir own prayer: '+(a.p||'(not written)')+'\n'
      +'Pray in first person ("Lord, …"), echo their application specifically, and end with a short commitment for today. Plain text only.';
    ai(prompt,700).then(function(t){S.closing=t;S._closing=false;persist();if(S.step===4)render();}).catch(function(){S.closing='Lord, thank You for speaking through '+refText()+' today. Help me live out what I learned. Amen.';S._closing=false;if(S.step===4)render();});
  }

  // ── Actions ──
  function stepTo(i){
    if(!S)return;
    // Leaving a step marks it done and ticks its checkmark.
    if(i>S.step){S.done[S.step]=true;if(S.step===0)tick('spAIPrayer');if(S.step===3)tick('spWorship');}
    if(i>4){finish();return;}
    S.step=Math.max(0,Math.min(4,i));persist();render();
  }
  function finish(){
    if(!S.finished){
      S.finished=true;S.done[4]=true;S.finishedAt=Date.now();
      tick('spDailyBread');tick('spAIPrayer');tick('spWorship');
      try{var inp=document.getElementById('spDailyBreadText');var kv=S.book+' '+S.chapter+(S.keyVerse?':'+S.keyVerse:'');if(inp&&!inp.value.trim()){inp.value=kv;inp.dispatchEvent(new Event('input',{bubbles:true}));}}catch(e){}
      // Reading plan: on to the next chapter tomorrow.
      var p=plan();if(p&&S.source==='plan'&&p.book===S.book&&p.chapter===S.chapter){var n=chapters(p.book);if(p.chapter<n)p.chapter++;else{p.done=true;}p.last=S.date;ls('bstudy_plan',p);}
      persist();toast('📖 Bible study saved');
    }
    close();
  }
  var speaking=false;
  function listen(){
    var b=document.getElementById('bsListen');
    if(!('speechSynthesis' in window)){alert('Read-aloud isn\'t available in this browser.');return;}
    if(speaking){speechSynthesis.cancel();speaking=false;if(b)b.textContent='🎧 Listen';return;}
    var vs=(S.verses||[]).filter(function(v){return (!S.from||v.v>=S.from)&&(!S.to||v.v<=S.to);});
    var text=refText()+'. '+vs.map(function(v){return v.t;}).join(' ');
    var parts=text.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g)||[text];speechSynthesis.cancel();speaking=true;if(b)b.textContent='⏹ Stop';
    parts.forEach(function(p,i){var u=new SpeechSynthesisUtterance(p);u.rate=0.95;if(i===parts.length-1)u.onend=function(){speaking=false;if(b)b.textContent='🎧 Listen';tick('spBibleAudio');S.done[1]=true;persist();};speechSynthesis.speak(u);});
    // Listening most of the way counts too.
    setTimeout(function(){if(speaking)tick('spBibleAudio');},Math.max(30000,text.length*45));
  }
  function xref(i){
    var el=document.getElementById('bsX'+i);if(!el)return;if(el.innerHTML){el.innerHTML='';return;}
    var r=parseRef(String(S.study.crossrefs[i]).split('—')[0]);if(!r){el.textContent='(couldn\'t read that reference)';return;}
    el.textContent='⏳';fetchChapter(r.book,r.chapter).then(function(vs){var a=r.verse||1,b=r.to||a;el.innerHTML=vs.filter(function(v){return v.v>=a&&v.v<=b;}).map(function(v){return '<sup>'+v.v+'</sup> '+esc(v.t);}).join(' ')||'(not found)';}).catch(function(){el.textContent='(couldn\'t load)';});
  }
  function close(){try{speechSynthesis.cancel();}catch(e){}speaking=false;var ov=document.getElementById('bstudyOverlay');if(ov)ov.remove();document.body.style.overflow='';renderCard();}

  // ── Reading plan ──
  function choosePlan(){
    var p=plan();
    var cur=p&&p.book?('Current plan: '+p.book+' '+(p.done?'(finished)':'chapter '+p.chapter+' of '+chapters(p.book))+'\n\n'):'';
    var b=prompt(cur+'Which book would you like to study chapter by chapter?\n(e.g. John, Exodus, Psalms, Romans)\n\nLeave empty and press OK to stop the plan and go back to the Daily Bread verse.',p&&p.book?p.book:'John');
    if(b===null)return;b=b.trim();
    if(!b){ls('bstudy_plan',null);renderCard();toast('Reading plan stopped — studies follow your Daily Bread verse');return;}
    var hit=BOOKS.find(function(x){return x[0].toLowerCase()===b.toLowerCase()||x[0].toLowerCase().indexOf(b.toLowerCase())===0;});
    if(!hit){alert('I couldn\'t find that book. Try a name like "John" or "1 Peter".');return;}
    var ch=1;if(p&&p.book===hit[0]&&!p.done){var c=prompt('Start at which chapter of '+hit[0]+'? (1–'+hit[1]+')',String(p.chapter));if(c===null)return;ch=Math.max(1,Math.min(hit[1],parseInt(c,10)||1));}
    ls('bstudy_plan',{book:hit[0],chapter:ch,started:todayKey()});renderCard();toast('📖 Reading plan: '+hit[0]+' '+ch);
  }

  // ── Journal ──
  function journal(){
    var keys=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^bstudy_\d{4}-\d{2}-\d{2}$/.test(k))keys.push(k);}}catch(e){}
    keys.sort().reverse();
    var items=keys.map(function(k){return ls(k);}).filter(function(o){return o&&o.study;});
    var ov=document.createElement('div');ov.id='bstudyOverlay';
    ov.innerHTML='<div class="bs-sheet"><div class="bs-top"><button class="bs-x" onclick="bibleStudy.close()">✕</button><div class="bs-title">🗂️ Study Journal</div><div class="bs-ref">'+items.length+' studies</div></div>'
      +'<div style="padding:10px 16px 0"><input id="bsSearch" placeholder="🔍 Search your studies…" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #c4b5fd;border-radius:10px;font-size:.9rem"></div><div class="bs-body" id="bsJ"></div></div>';
    document.body.appendChild(ov);document.body.style.overflow='hidden';
    function draw(q){q=String(q||'').toLowerCase();
      document.getElementById('bsJ').innerHTML=items.filter(function(o){return !q||JSON.stringify(o).toLowerCase().indexOf(q)>=0;}).map(function(o){var a=o.answers||{};
        return '<details class="bs-card"><summary><b>'+esc(new Date(o.date+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}))+'</b> · '+esc(o.book+' '+o.chapter+(o.from?':'+o.from+'–'+o.to:''))+' <span class="bs-note">'+esc((o.study||{}).theme||'')+'</span></summary>'
          +(a.s?'<div class="bs-h2">S</div><div class="bs-text">'+esc(a.s)+'</div>':'')
          +((a.o||[]).filter(Boolean).length?'<div class="bs-h2">O</div><div class="bs-text">'+(a.o||[]).filter(Boolean).map(esc).join('<br>')+'</div>':'')
          +((a.a||[]).filter(Boolean).length?'<div class="bs-h2">A</div><div class="bs-text">'+(a.a||[]).filter(Boolean).map(esc).join('<br>')+'</div>':'')
          +(a.p?'<div class="bs-h2">P</div><div class="bs-text">'+esc(a.p)+'</div>':'')
          +'<div class="bs-row"><button class="bs-btn2" onclick="bibleStudy.close();bibleStudy.open(\''+o.date+'\')">Open study</button></div></details>';}).join('')||'<div class="bs-load">No studies yet.</div>';}
    draw('');document.getElementById('bsSearch').addEventListener('input',function(e){draw(e.target.value);});
  }

  // ── Weekly AI Review input ──
  window.bibleStudyWeekText=function(from,to){
    var out=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);var m=k&&k.match(/^bstudy_(\d{4}-\d{2}-\d{2})$/);if(m&&m[1]>=from&&m[1]<=to){var o=ls(k);if(o&&o.study){var a=o.answers||{};out.push(m[1]+': '+o.book+' '+o.chapter+' ('+(o.study.theme||'')+')'+(a.a&&a.a.filter(Boolean).length?' — application: '+a.a.filter(Boolean).join(' / '):''));}}}}catch(e){}
    var mem=ls('bstudy_mem_'+from);
    return out.length?'\n\nBIBLE STUDY THIS WEEK\n'+out.sort().join('\n')+(mem?'\nMemory verse: '+mem.ref:''):'';
  };

  // ── The card on the Bible tab ──
  function renderCard(){
    var host=document.getElementById('bibleStudyCard');
    if(!host){var tab=document.querySelector('#tab-bible > div');if(!tab)return;host=document.createElement('div');host.id='bibleStudyCard';tab.insertBefore(host,tab.firstChild);}
    var s=ls(sessionKey()),p=plan(),mem=memoryLine(),t=todaysPassage();
    var status=s&&s.finished?'✓ Done today · '+esc(s.book+' '+s.chapter):s&&s.study?'In progress · '+esc(s.book+' '+s.chapter):'Today: '+esc(t.book+' '+t.chapter)+(t.source==='plan'?'':' (from your Daily Bread verse)');
    host.innerHTML='<div class="bs-hero"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:180px"><div class="bs-hero-t">📖 Daily Bible Study</div><div class="bs-hero-s">'+status+'</div></div>'
      +'<button class="bs-btn" onclick="bibleStudy.open()">'+(s&&s.finished?'Review study':s&&s.study?'Continue ›':'Start study ›')+'</button></div>'
      +'<div class="bs-hero-s" style="margin-top:6px">Prayer → Read & listen → Study (SOAP) → Worship → Prayer. Ticks your four checks below as you go.</div>'
      +(mem?'<div class="bs-mem">🧠 Memory verse this week: '+esc(mem)+'</div>':'')
      +'<div class="bs-row" style="margin-top:8px"><button class="bs-btn2" onclick="bibleStudy.plan()">📚 '+(p&&p.book?esc(p.book)+(p.done?' — finished':' · ch. '+p.chapter+' of '+chapters(p.book)):'Reading plan')+'</button><button class="bs-btn2" onclick="bibleStudy.journal()">🗂️ Study journal</button></div></div>';
  }

  var css='#bibleStudyCard .bs-hero{background:linear-gradient(135deg,#4c1d95,#7c3aed);color:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(76,29,149,.25)}'
    +'.bs-hero-t{font-weight:800;font-size:1.05rem}.bs-hero-s{font-size:.8rem;opacity:.9}.bs-mem{margin-top:8px;background:rgba(255,255,255,.14);border-radius:9px;padding:7px 10px;font-size:.82rem;line-height:1.45}'
    +'#bstudyOverlay{position:fixed;inset:0;background:rgba(15,10,30,.55);z-index:2147483600;display:flex;justify-content:center;align-items:stretch}'
    +'#bstudyOverlay .bs-sheet{background:#faf8ff;width:100%;max-width:720px;display:flex;flex-direction:column;height:100%}'
    +'.bs-top{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#4c1d95;color:#fff}.bs-title{font-weight:800}.bs-ref{margin-left:auto;font-size:.8rem;opacity:.9;text-align:right}'
    +'.bs-x{background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:999px;width:32px;height:32px;font-size:1rem;cursor:pointer}'
    +'.bs-steps{display:flex;gap:4px;overflow-x:auto;padding:8px 12px;background:#ede9fe}.bs-steps span{white-space:nowrap;font-size:.75rem;padding:5px 9px;border-radius:999px;color:#6d28d9;cursor:pointer}'
    +'.bs-steps span.on{background:#7c3aed;color:#fff;font-weight:700}.bs-steps span.ok{color:#16a34a;font-weight:600}'
    +'.bs-body{flex:1;overflow-y:auto;padding:14px 16px}.bs-nav{display:flex;justify-content:space-between;padding:10px 16px;border-top:1px solid #e9e5f5;background:#fff}'
    +'.bs-btn,.bs-btn2{border:none;border-radius:999px;padding:9px 16px;font-weight:700;font-size:.86rem;cursor:pointer;text-decoration:none;display:inline-block}'
    +'.bs-btn{background:#7c3aed;color:#fff}#bibleStudyCard .bs-btn{background:#fff;color:#4c1d95}.bs-btn2{background:#ede9fe;color:#6d28d9}#bibleStudyCard .bs-btn2{background:rgba(255,255,255,.16);color:#fff}'
    +'.bs-card{background:#fff;border:1px solid #e9e5f5;border-radius:12px;padding:12px 14px;margin-bottom:12px}.bs-card summary{cursor:pointer}'
    +'.bs-pray{background:#f5f3ff;border-color:#ddd6fe}.bs-h{font-size:.72rem;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}'
    +'.bs-h2{font-weight:800;color:#4c1d95;margin:14px 0 4px}.bs-text{font-size:.92rem;line-height:1.6;color:#2e1065;white-space:pre-wrap}.bs-note{font-size:.78rem;color:#6b7280;margin:8px 0}'
    +'.bs-q{font-size:.86rem;color:#374151;margin:6px 0 4px}.bs-body textarea{width:100%;box-sizing:border-box;border:1px solid #ddd6fe;border-radius:9px;padding:8px 10px;font-size:.9rem;font-family:inherit;background:#fff}'
    +'.bs-scripture{font-family:Georgia,serif;font-size:1.02rem;line-height:1.75;color:#1f1147}.bs-scripture sup{color:#a78bfa;font-size:.65em;margin-right:2px}.bs-scripture .kv{background:#fef3c7;border-radius:4px}'
    +'.bs-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.bs-load{padding:30px 10px;text-align:center;color:#6d28d9}.bs-link{background:none;border:none;color:#7c3aed;font-weight:700;cursor:pointer;padding:4px 0}'
    +'.bs-xref{color:#6d28d9;font-weight:600;cursor:pointer;padding:5px 0}.bs-xtext{font-family:Georgia,serif;font-size:.9rem;color:#374151;line-height:1.6}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  window.bibleStudy={open:open,close:close,step:function(d){stepTo(S.step+d);},go:function(i){stepTo(i);},listen:listen,xref:xref,plan:choosePlan,journal:journal,
    retry:function(){S._preparing=false;render();},whole:function(){S.from=0;S.to=0;persist();render();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(renderCard,800);});else setTimeout(renderCard,800);
})();
