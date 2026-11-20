(()=>{'use strict';
function run(){
 const d=document.getElementById('detail'),date=document.getElementById('matchDate')?.textContent||'';
 const eligible=d&&!d.classList.contains('hidden')&&/NBA|NFL|NCAA Football/i.test(date);
 const res=document.getElementById('results');
 if(eligible&&res){
  let changed=false;
  for(const el of res.querySelectorAll('*')){
   if(el.children.length===0&&/^(tie|draw|tie chance|draw chance|tie probability)$/i.test((el.textContent||'').trim())){
    el.textContent='Chance of Overtime';el.title='Regulation-tie estimate, not a final tie.';changed=true;
   }
  }
  if(changed&&!document.getElementById('v87-ot-note')){
   const n=document.createElement('p');n.id='v87-ot-note';n.style.cssText='font-size:12px;color:#aebaca';
   n.textContent='Overtime chance is a regulation-tie estimate, not a separate overtime simulation.';res.appendChild(n);
  }
 }
 const footer=document.querySelector('footer');
 if(footer){
  const w=document.createTreeWalker(footer,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){if(/Currentscy Picks\s+V[0-9]+(?:\.[0-9]+)*/.test(n.textContent))n.textContent=n.textContent.replace(/Currentscy Picks\s+V[0-9]+(?:\.[0-9]+)*/g,'Currentscy Picks V2.6')}
 }
 if(eligible){
  let p=document.getElementById('v87-source-note');
  if(!p){p=document.createElement('p');p.id='v87-source-note';p.style.cssText='font-size:12px;color:#aebaca;line-height:1.5';d.appendChild(p)}
  p.textContent='Source verification: ESPN/public feeds may be single-source. NBA tracking and Synergy are not cross-checked until licensed feeds supply validated data. Missing information is not treated as confirmed.';
 }
}
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;run()})}
function init(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();