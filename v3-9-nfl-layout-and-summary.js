/* Currentscy Picks V3.9 — restore compact NFL detail and grounded summary.
   Step 2: hide diagnostic panels in game detail only.
   Step 3: append a cautious matchup summary using only verified research fields.
   No fabricated coach impact and no changes to live picks. */
(()=>{'use strict';
const researchIds=['v25-coaching-data','v25-coaching-profiles','v26-coach-matchups','v27-dynamic-coaching','v28-coaching-backtest','v29-coaching-ingestion','v30-espn-diagnostics','v31-defensive-charting','v32-coaching-activation'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function findGame(){try{return typeof chosen!=='undefined'?chosen:null}catch{return null}}
function findSport(){try{return typeof sport!=='undefined'?sport:null}catch{return null}}
function summary(g){
 const home=String(g?.home?.displayName||g?.home?.name||g?.home||g?.homeTeam?.displayName||g?.homeTeam?.name||'').trim();
 const away=String(g?.away?.displayName||g?.away?.name||g?.away||g?.awayTeam?.displayName||g?.awayTeam?.name||'').trim();
 const matchup=home&&away?home+' and '+away:'these teams';
 const lines=['For '+matchup+', the main coaching questions are how each offense handles early-down pressure, whether protection changes after halftime, and whether the leading team shifts toward clock control.'];
 lines.push('A verified player projection should account for expected opportunities, injuries, likely game script, and defensive assignments where available. Historical hit rates alone do not establish those adjustments.');
 lines.push('Current status: team-specific halftime responses, coverage assignments and calibrated coaching effects have not been independently verified for this matchup. Existing five-leg selections remain unchanged.');
 return lines.join(' ');
}
function update(){
 const detail=document.getElementById('detail'),g=findGame();
 if(!detail||detail.classList.contains('hidden')||findSport()!=='nfl'||!g?.id)return;
 for(const id of researchIds){const el=detail.querySelector('#'+id);if(el)el.hidden=true}
 // Existing player selections and injury panels are never hidden or moved.
 let box=detail.querySelector('#cp-nfl-match-summary');
 if(!box){box=document.createElement('section');box.id='cp-nfl-match-summary';box.className='panel';box.style.cssText='margin-top:16px;padding:18px;border:1px solid #6b542e;border-radius:16px';detail.append(box)}
 if(box.dataset.game!==String(g.id)){box.dataset.game=String(g.id);box.innerHTML='<h2 style="margin:0 0 12px">Game-specific coaching outlook</h2><p style="line-height:1.6">'+esc(summary(g))+'</p><small style="opacity:.7">Scenario-based research, not a validated prediction or model adjustment.</small>'}
}
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update()})}
function init(){const d=document.getElementById('detail');if(!d)return;new MutationObserver(schedule).observe(d,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});const title=document.getElementById('matchTitle');if(title)new MutationObserver(schedule).observe(title,{childList:true,characterData:true,subtree:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyNFLCompactV39=Object.freeze({refresh:schedule,version:'V3.9',coachingIntegrated:false});
})();