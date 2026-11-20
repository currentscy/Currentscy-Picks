/* V87 layout patch: keep parlay immediately after four simulation cards. */
(()=>{'use strict';
function refresh(){
 const detail=document.getElementById('detail');
 if(!detail||detail.classList.contains('hidden')||!/\bNBA\b/i.test(document.getElementById('matchDate')?.textContent||''))return;
 const results=document.getElementById('results');if(!results||!results.isConnected)return;
 const heading=[...detail.querySelectorAll('h1,h2,h3,h4')].find(e=>/NBA\s*5\s*Leg\s*Parlay/i.test(e.textContent||''));
 const parlay=heading?.closest('.panel');if(!parlay||!parlay.isConnected)return;
 const simPanel=results.closest('.panel');
 if(simPanel&&simPanel!==parlay&&simPanel.parentElement===parlay.parentElement){
  if(simPanel.nextElementSibling!==parlay)simPanel.insertAdjacentElement('afterend',parlay);
 }else if(results.parentElement===parlay.parentElement){
  if(results.nextElementSibling!==parlay)results.insertAdjacentElement('afterend',parlay);
 }
 // Do not show two large empty research panels for disconnected premium feeds.
 for(const id of ['v85-defensive','v86-defenders']){
  const panel=document.getElementById(id);if(!panel)continue;
  const empty=/tracking unavailable|no verified individual defender tracking/i.test(panel.textContent||'');
  panel.classList.toggle('v87-disconnected',empty);
 }
 // Replace misleading tie label in the existing four-card simulation output.
 const cardCandidates=[...detail.querySelectorAll('.panel')].filter(p=>/Average modeled score/i.test(p.textContent||''));
 for(const p of cardCandidates){
  for(const el of p.querySelectorAll('*')){
   if(el.children.length===0&&/^(Sampled ties|Ties|Tie)$/i.test((el.textContent||'').trim()))el.textContent='Chance of Overtime';
  }
 }
}
let busy=false;function schedule(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;refresh()})}
function init(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();