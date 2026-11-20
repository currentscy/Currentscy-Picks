/* V2.3: keep NCAA game cards isolated from prior NFL/NBA renders.
   Presentation-only safeguard; never invent or alter simulation values. */
(()=>{'use strict';
let pending=false;
function clean(){
 const detail=document.getElementById('detail');
 if(!detail||detail.classList.contains('hidden')||document.body.dataset.sport!=='ncaa')return;
 const title=document.getElementById('matchTitle')?.textContent||'';
 const match=title.split(/\s+vs\s+/i).map(x=>x.trim());
 if(match.length!==2||!match.every(Boolean))return;
 const results=document.getElementById('results');
 if(!results)return;
 for(const tile of [...results.querySelectorAll('.tile')]){
  const label=tile.querySelector('small')?.textContent?.trim()||'';
  const isTeamProjection=/\b(sampled win share|projected lead|trial win share)\b/i.test(label);
  if(!isTeamProjection)continue;
  const belongs=match.some(team=>label.toLowerCase().startsWith(team.toLowerCase()));
  if(!belongs)tile.remove();
 }
 for(const panel of [...results.querySelectorAll('.panel')]){
  const text=panel.textContent||'';
  const foreign=/\b(NFL matchup|NBA matchup|NBA simulation)\b/i.test(text);
  const hasTiles=panel.querySelector('.tile');
  if(foreign||(!hasTiles&&/\b(sampled win share|projected lead)\b/i.test(text)))panel.remove();
 }
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;clean()})}
function start(){schedule();new MutationObserver(schedule).observe(document.getElementById('detail')||document.body,{subtree:true,childList:true,characterData:true});new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-sport']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();