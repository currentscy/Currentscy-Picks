/* Currentscy Picks V2.3 — align NCAA detail page with NFL hierarchy.
   DOM-only ordering; leaves the underlying CFBD and player calculations untouched. */
(()=>{'use strict';
let busy=false,queued=false;
function isNcaa(){
 try{return sport==='ncaa'&&chosen&&document.getElementById('detail')&&!document.getElementById('detail').classList.contains('hidden')}catch{return false}
}
function findPanel(root,re){return [...root.querySelectorAll('.panel')].find(p=>re.test(p.querySelector('h2,h3')?.textContent||''))}
function arrange(){
 if(busy||!isNcaa())return;
 busy=true;
 try{
  const detail=document.getElementById('detail'),results=document.getElementById('results'),five=document.getElementById('v68NcaaFive'),injury=document.getElementById('v22-ncaa-availability');
  const date=document.getElementById('matchDate');
  if(!results||!date)return;
  const heading=date.closest('.panel')||date.parentElement;
  if(!heading||!detail.contains(heading))return;
  // Keep the matchup card stable. Insert the original historical model's four
  // tiles in it, exactly as the NFL page does, without cloning stale results.
  const history=findPanel(results,/NCAA Football.*100,000 historical trials/i);
  let tiles=document.getElementById('v23-ncaa-header-tiles');
  if(!tiles){tiles=document.createElement('div');tiles.id='v23-ncaa-header-tiles';tiles.className='v23-header-tiles';heading.appendChild(tiles)}
  if(history){
   const grid=history.querySelector('.grid');
   if(grid&&grid.parentElement!==tiles)tiles.replaceChildren(grid);
   // Hide the redundant large card; keep its explanatory text in a
   // collapsible note below the compact advanced simulation.
   history.style.display='none';
  }
  // Move existing sections (not copies) to the NFL order.
  // The original player code still owns and updates #v68NcaaFive.
  if(five&&five.parentElement===detail)heading.after(five);
  if(injury&&injury.parentElement===detail&&five)five.after(injury);
  // Advanced metrics are secondary to the primary four tiles.
  const advanced=findPanel(results,/NCAA.*CFBD-adjusted 100,000 trials|CFBD efficiency adjustment unavailable|CFBD offense vs defense/i);
  if(advanced){
   advanced.classList.add('v23-advanced-panel');
   let extra=document.getElementById('v23-ncaa-advanced');
   if(!extra){extra=document.createElement('details');extra.id='v23-ncaa-advanced';extra.className='v23-advanced-details';const sum=document.createElement('summary');sum.textContent='Advanced CFBD matchup analysis · Tap to expand';extra.appendChild(sum);results.insertBefore(extra,results.firstChild)}
   if(advanced.parentElement!==extra)extra.appendChild(advanced);
  }
  const recent=results.querySelector('.v23-history');
  if(recent){
   let details=document.getElementById('v23-ncaa-history');
   if(!details){details=document.createElement('details');details.id='v23-ncaa-history';details.className='v23-advanced-details';const sum=document.createElement('summary');sum.textContent='Recent verified NCAA games · Tap to expand';details.appendChild(sum);results.appendChild(details)}
   if(recent.parentElement!==details)details.appendChild(recent);
  }
  // Hide the legacy unverified injury panel only when our compact NCAA
  // availability section has successfully rendered.
  if(injury&&/NCAA match injury report/i.test(injury.textContent)){
   for(const p of detail.querySelectorAll('.panel')){
    if(p===injury||p.contains(injury))continue;
    if(/Match injury report/i.test(p.querySelector('h2,h3')?.textContent||''))p.style.display='none';
   }
  }
 }finally{busy=false}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;arrange()})}
function init(){
 const detail=document.getElementById('detail');
 if(detail)new MutationObserver(schedule).observe(detail,{childList:true,subtree:true});
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();