/* Currentscy Picks V2.4: NCAA detail layout and one primary simulation.
   Presentation only. Never turn historical hit rates into probabilities. */
(()=>{'use strict';
let busy=false,pending=false;
const $=id=>document.getElementById(id);
function active(){try{return sport==='ncaa'&&chosen&&$('detail')&&!$('detail').classList.contains('hidden')}catch{return false}}
function panel(root,re){return [...root.querySelectorAll('.panel')].find(p=>re.test(p.querySelector('h2,h3')?.textContent||''))}
function arrange(){
 if(busy||!active())return;
 busy=true;
 try{
  const detail=$('detail'),results=$('results'),date=$('matchDate'),five=$('v68NcaaFive'),injury=$('v22-ncaa-availability');
  if(!results||!date)return;
  const header=date.closest('.panel')||date.parentElement;
  if(!header||!detail.contains(header))return;
  let holder=$('v24-ncaa-header-tiles');
  if(!holder){holder=document.createElement('div');holder.id='v24-ncaa-header-tiles';header.append(holder)}
  const historical=panel(results,/NCAA Football.*100,000 historical trials/i);
  const advanced=panel(results,/NCAA.*CFBD-adjusted 100,000 trials|CFBD efficiency adjustment unavailable|CFBD offense vs defense/i);
  const adjusted=advanced&&/CFBD-adjusted 100,000 trials/i.test(advanced.querySelector('h2')?.textContent||'')&&!!advanced.querySelector('.grid');
  const source=adjusted?advanced:historical;
  if(source){
   const grid=source.querySelector('.grid');
   if(grid&&grid.parentElement!==holder)holder.replaceChildren(grid);
  }
  if(historical)historical.style.display='none';
  if(five&&five.parentElement===detail&&five.previousElementSibling!==header)header.after(five);
  if(injury&&injury.parentElement===detail&&five&&injury.previousElementSibling!==five)five.after(injury);
  // One concise status message distinguishes the historical fallback from
  // adjusted figures, without repeating a second four-tile simulation.
  let label=$('v24-ncaa-model-note');
  if(!label){label=document.createElement('p');label.id='v24-ncaa-model-note';label.className='desc';holder.after(label)}
  const msg=adjusted?'CFBD-adjusted historical trials · exploratory, not calibrated probabilities. Ties are sampling artifacts; overtime is not simulated.':'Historical score-resampling only · CFBD adjustment not yet verified. Ties are sampling artifacts; overtime is not simulated.';
  if(label.textContent!==msg)label.textContent=msg;
  // Preserve the full advanced methodology, but hide its duplicate tiles.
  let advancedDetails=$('v24-ncaa-advanced');
  if(!advancedDetails){advancedDetails=document.createElement('details');advancedDetails.id='v24-ncaa-advanced';const summary=document.createElement('summary');summary.textContent='Advanced CFBD matchup analysis · Tap to expand';advancedDetails.append(summary);results.insertBefore(advancedDetails,results.firstChild)}
  if(advanced&&advanced.parentElement!==advancedDetails)advancedDetails.append(advanced);
  if(advanced){
   advanced.style.display='';
   advanced.classList.add('v24-advanced-body');
  }
  // Convert each player to a short summary with expandable supporting data.
  if(five)for(const leg of five.querySelectorAll('.v23-leg')){
   if(leg.dataset.v24Compact==='1')continue;
   const h=leg.querySelector('h3'),hit=leg.querySelector('.v23-hit');
   if(!h||!hit)continue;
   const extra=document.createElement('details');extra.className='v24-player-extra';
   const summary=document.createElement('summary');summary.textContent='Player statistics and reasoning · Tap to expand';
   extra.append(summary);
   const stats=leg.querySelector('.v23-statgrid'),why=leg.querySelector('details');
   if(stats)extra.append(stats);
   if(why)extra.append(why);
   leg.append(extra);leg.dataset.v24Compact='1';
  }
  const history=results.querySelector('.v23-history');
  if(history){
   let wrapper=$('v24-ncaa-history');
   if(!wrapper){wrapper=document.createElement('details');wrapper.id='v24-ncaa-history';const summary=document.createElement('summary');summary.textContent='Recent verified NCAA games · Tap to expand';wrapper.append(summary);results.append(wrapper)}
   if(history.parentElement!==wrapper)wrapper.append(history);
  }
  // If the V2.3 wrapper exists from a cached page, unwrap its content.
  for(const oldId of ['v23-ncaa-advanced','v23-ncaa-history']){
   const old=$(oldId);if(!old)continue;
   while(old.children.length>1)old.parentNode.insertBefore(old.lastElementChild,old);
   old.remove();
  }
  if(injury&&/NCAA match injury report/i.test(injury.textContent)){
   for(const p of detail.querySelectorAll('.panel')){
    if(p===injury||p.contains(injury))continue;
    if(/Match injury report/i.test(p.querySelector('h2,h3')?.textContent||''))p.style.display='none';
   }
  }
 }finally{busy=false}
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;arrange()})}
function init(){
 const detail=$('detail'),results=$('results');
 if(detail)new MutationObserver(schedule).observe(detail,{childList:true,subtree:true});
 if(results&&!detail?.contains(results))new MutationObserver(schedule).observe(results,{childList:true,subtree:true});
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();