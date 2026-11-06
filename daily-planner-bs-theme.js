// ══════════════════════════════════════════════════════
// BEYONDSTRIDE LOOK — only when the page is opened from the BeyondStride app
// (its Nutrition tab adds app=bs to the link). The Command Center's own look is untouched:
// in a normal browser tab none of this runs.
// Instead of a hand-written dark stylesheet (the Nutrition tab uses hundreds of inline colors),
// each element's colors are read and mapped: light backgrounds → BeyondStride's dark tiles,
// dark text → light text, light borders → subtle dark borders. Bright buttons keep their color.
// ══════════════════════════════════════════════════════
(function(){
  var on=false;
  try{
    if(/[#&]app=bs\b/.test(location.hash))sessionStorage.setItem('bsApp','1');
    on=sessionStorage.getItem('bsApp')==='1';
  }catch(e){on=/[#&]app=bs\b/.test(location.hash);}
  if(!on)return;

  var BG='#48544F',CARD='#1C2421',CARD2='#26302C',LINE='#3A4742',TEXT='#E8EEEB',MUTED='#C9D1CE',ACCENT='#D4E635';
  document.documentElement.classList.add('bs-app');

  var css=''
    +'html.bs-app,html.bs-app body{background:'+BG+'!important;background-image:none!important;}'
    +'html.bs-app body{padding-top:10px!important;}'
    +'html.bs-app .container{background:transparent!important;box-shadow:none!important;border:none!important;}'
    // Hide the Command Center's own header, tabs, banners and floating buttons: just the Nutrition page.
    +'html.bs-app .header,html.bs-app .tabs,html.bs-app .streak-bar,html.bs-app .backup-wrap,html.bs-app #homeButton,'
    +'html.bs-app #journalFloatingTitle,html.bs-app .journal-float-top,html.bs-app .tab-notes,html.bs-app [id*="backupReminder"],'
    +'html.bs-app [id*="BackupBanner"],html.bs-app [class*="backup-banner"],html.bs-app .journal-sticky-shell,html.bs-app #tabNotesBar{display:none!important;}'
    +'html.bs-app .section-title{color:'+ACCENT+'!important;letter-spacing:.08em;}'
    +'html.bs-app input,html.bs-app select,html.bs-app textarea{background:'+CARD2+'!important;color:'+TEXT+'!important;border-color:'+LINE+'!important;}'
    +'html.bs-app input::placeholder,html.bs-app textarea::placeholder{color:#8E9A95!important;}'
    +'html.bs-app option{background:'+CARD+';color:'+TEXT+';}'
    +'html.bs-app a{color:'+ACCENT+';}'
    +'html.bs-app ::-webkit-scrollbar{display:none;}';
  var st=document.createElement('style');st.id='bsThemeCss';st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  function rgb(s){var m=String(s||'').match(/rgba?\(([^)]+)\)/);if(!m)return null;var p=m[1].split(',').map(function(x){return parseFloat(x);});return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function lum(c){return (0.2126*c.r+0.7152*c.g+0.0722*c.b)/255;}
  function sat(c){var mx=Math.max(c.r,c.g,c.b),mn=Math.min(c.r,c.g,c.b);return mx?(mx-mn)/mx:0;}
  function set(el,prop,val){el.style.setProperty(prop,val,'important');}

  // Nesting depth decides tile shade, so boxes inside tiles stay distinguishable.
  function depthBg(el){var d=0,p=el.parentElement;while(p&&d<6){if(p.dataset&&p.dataset.bsTile)d++;p=p.parentElement;}return d%2?CARD2:CARD;}

  function themeEl(el){
    if(el.nodeType!==1||el.dataset.bsDone)return;
    var tag=el.tagName;if(tag==='SCRIPT'||tag==='STYLE'||tag==='IMG'||tag==='SVG'||tag==='CANVAS'||tag==='VIDEO')return;
    el.dataset.bsDone='1';
    var cs=getComputedStyle(el);
    // Backgrounds: light colors and light gradients become dark tiles.
    var bg=rgb(cs.backgroundColor),img=cs.backgroundImage||'none';
    var lightGrad=img.indexOf('gradient')>=0&&(function(){var cols=img.match(/rgba?\([^)]+\)/g)||[];return cols.length&&cols.every(function(c){var x=rgb(c);return x&&(x.a<0.2||lum(x)>0.75);});})();
    if(lightGrad){set(el,'background-image','none');set(el,'background-color',depthBg(el));el.dataset.bsTile='1';}
    else if(bg&&bg.a>0.25&&lum(bg)>0.78&&sat(bg)<0.35){set(el,'background-color',depthBg(el));el.dataset.bsTile='1';}
    else if(bg&&bg.a>0.25&&lum(bg)>0.6&&sat(bg)>=0.35){  // pale badge colors → keep the hue, darker
      set(el,'background-color','rgba('+Math.round(bg.r*.45)+','+Math.round(bg.g*.45)+','+Math.round(bg.b*.45)+',1)');
    }
    // Text: dark text becomes light; dark-but-colored text (greens, browns, reds) becomes a lighter tint.
    var c=rgb(cs.color);
    if(c){var L=lum(c);
      if(L<0.45){
        if(sat(c)<0.3)set(el,'color',L<0.3?TEXT:MUTED);
        else{var k=0.55;set(el,'color','rgb('+Math.round(c.r+(255-c.r)*k)+','+Math.round(c.g+(255-c.g)*k)+','+Math.round(c.b+(255-c.b)*k)+')');}
      }
    }
    // Borders: light borders become subtle dark lines.
    var bc=rgb(cs.borderTopColor);
    if(bc&&parseFloat(cs.borderTopWidth)>0&&lum(bc)>0.7)set(el,'border-color',LINE);
    // Soft drop shadows look muddy on dark tiles.
    if(cs.boxShadow&&cs.boxShadow!=='none'&&el.dataset.bsTile)set(el,'box-shadow','none');
  }

  function themeTree(root){
    if(!root||root.nodeType!==1)return;
    themeEl(root);
    var all=root.getElementsByTagName('*');
    for(var i=0;i<all.length;i++)themeEl(all[i]);
  }

  var pending=[],timer=null;
  function flush(){timer=null;var list=pending;pending=[];list.forEach(themeTree);}
  function queue(n){pending.push(n);if(!timer)timer=setTimeout(flush,30);}

  function start(){
    themeTree(document.body);
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        if(m.type==='childList')m.addedNodes.forEach(function(n){if(n.nodeType===1)queue(n);});
        else if(m.type==='attributes'&&m.target.nodeType===1&&m.target.dataset){
          // Inline style changed by the page (e.g. a status color): look at it again.
          if(!m.target.dataset.bsWriting){delete m.target.dataset.bsDone;queue(m.target);}
        }
      });
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  }
  // Our own style writes would retrigger the observer; mark them.
  var origSet=CSSStyleDeclaration.prototype.setProperty;
  set=function(el,prop,val){el.dataset.bsWriting='1';origSet.call(el.style,prop,val,'important');setTimeout(function(){delete el.dataset.bsWriting;},0);};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,50);});
  else setTimeout(start,50);
  window.addEventListener('load',function(){setTimeout(function(){themeTree(document.body);},400);});
})();
