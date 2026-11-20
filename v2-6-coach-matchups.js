/* V2.6 Step 3: coaching and receiver-defender research, evidence gated. */
(()=>{'use strict';
const records=new Map();
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function calculate(row,offense,defense){
 const coverage=window.CurrentscyCoverageEngine;
 if(!coverage?.evaluate)return {ready:false,reasons:['Coverage engine unavailable'],scenarios:[]};
 const match=coverage.evaluate(row);
 const reasons=[...match.gaps];
 if(!offense||offense.confidence!=='descriptive-only'||offense.gamesUsed<4)reasons.push('Insufficient team offensive play-calling evidence');
 if(!defense||defense.verifiedCoverage!==true)reasons.push('Defensive coverage and adjustment evidence missing');
 if(row?.availability!=='verified')reasons.push('Receiver participation not verified');
 const scenarios=(match.projection?.matchups||[]).map(m=>({defender:m.name,alignmentOverlap:m.exposure,interpretation:'Alignment overlap, not actual coverage probability'}));
 return {ready:reasons.length===0,offensive:{games:offense?.gamesUsed||0,tendency:offense?.offensiveTendency||'Unknown',halftimePassShift:offense?.meanSecondHalfShift??null},defensive:{base:defense?.defensiveBaseScheme||'Unknown',weekly:defense?.opponentSpecificAdjustment||'Unknown',halftime:defense?.halftimeAdjustment||'Unknown'},scenarios,reasons:[...new Set(reasons)],receptionProbability:null,yardsProjection:null};
}
function register(gameId,rows){
 if(!/^\d{5,15}$/.test(String(gameId))||!Array.isArray(rows))throw Error('Invalid game evidence');
 const valid=rows.filter(r=>r?.receiver&&r?.opponent&&r?.sourceUrl&&/^https?:\/\//.test(r.sourceUrl)&&r.asOf);
 records.set(String(gameId),valid);refresh();return valid.length;
}
function render(){
 const d=document.getElementById('detail'),g=typeof chosen==='undefined'?null:chosen,league=typeof sport==='string'?sport:'';
 if(!d||d.classList.contains('hidden')||!['nfl','ncaa'].includes(league)||!g?.id)return;
 let box=d.querySelector('#v26-coach-matchups');
 if(!box){box=document.createElement('section');box.id='v26-coach-matchups';box.className='panel';const near=d.querySelector('#v25-coverage-matchups');if(near)near.insertAdjacentElement('afterend',box);else d.append(box)}
 const rows=records.get(String(g.id))||[];
 const items=rows.map(r=>{
  const x=calculate(r,r.offensiveProfile,r.defensiveProfile);
  return '<details style="margin:10px 0;padding:10px;border:1px solid #394251;border-radius:10px"><summary><strong>'+escapeHTML(r.receiver)+'</strong> vs '+escapeHTML(r.opponent)+'</summary>'+
  '<p class="desc">Offensive play calling: '+escapeHTML(x.offensive.tendency)+' ('+x.offensive.games+' games)</p>'+
  '<p class="desc">Defensive base: '+escapeHTML(x.defensive.base)+' · weekly: '+escapeHTML(x.defensive.weekly)+' · halftime: '+escapeHTML(x.defensive.halftime)+'</p>'+
  x.scenarios.map(s=>'<p class="desc">'+escapeHTML(s.defender)+' · '+(100*s.alignmentOverlap).toFixed(0)+'% alignment overlap, not verified assignment</p>').join('')+
  '<p class="desc">'+escapeHTML(x.reasons.length?'Missing: '+x.reasons.join('; '):'Inputs documented; predictive calibration still pending')+'</p>'+
  '<p class="desc"><a href="'+escapeHTML(r.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Source</a> · '+escapeHTML(r.asOf)+'</p></details>';
 }).join('');
 const html='<h2>Coaching × receiver matchup</h2><p class="desc">Observed offensive play-calling and projected defender alignment are combined only when sourced. Second-half pass rate is not proof of a defensive coaching adjustment.</p>'+
 (items||'<p class="desc">No source-verified coaching and defender alignment research for this game yet. Individual matchup probabilities are not available.</p>')+
 '<p class="desc">Research-only Step 3 · '+rows.length+' documented scenarios · existing five-leg predictions unchanged.</p>';
 if(box.dataset.game!==String(g.id)||box.dataset.rows!==String(rows.length)){box.innerHTML=html;box.dataset.game=String(g.id);box.dataset.rows=String(rows.length)}
}
let queued=false;
function refresh(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
function init(){const d=document.getElementById('detail');if(d)new MutationObserver(refresh).observe(d,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});const title=document.getElementById('matchTitle');if(title)new MutationObserver(refresh).observe(title,{childList:true,subtree:true,characterData:true});refresh()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyCoachMatchupV26=Object.freeze({calculate,register,refresh,version:'V2.6 Step 3',simulationIntegrated:false});
})();