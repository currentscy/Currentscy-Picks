/* Currentscy Picks: cross-league WR/TE coverage matchup engine.
   Explicitly requires sourced coverage assignments; never infers a shadow CB from roster order. */
(()=>{'use strict';
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
const esc=x=>clean(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const evidence=new Map();
function register(matchId,entries){
 if(!/^\d{5,15}$/.test(String(matchId))||!Array.isArray(entries))throw Error('Match ID and coverage evidence required');
 const valid=entries.filter(e=>e&&e.receiver&&e.team&&e.opponent&&e.sourceUrl&&/^https?:\/\//.test(e.sourceUrl)&&e.asOf);
 evidence.set(String(matchId),valid.map(e=>({...e})));return valid.length;
}
function evaluate(row){
 const defenders=Array.isArray(row.defenders)?row.defenders.filter(d=>d?.name&&d?.role):[];
 const assignment=row.assignment==='charted'?'charted':row.assignment==='projected'?'projected':'unknown';
 const coverage=row.coverage&&num(row.coverage.manPct)!==null&&num(row.coverage.zonePct)!==null?row.coverage:null;
 const receiver=row.receiverStats&&num(row.receiverStats.targetsPerGame)!==null?row.receiverStats:null;
 const gaps=[];
 if(!defenders.length)gaps.push('No sourced individual coverage defender');
 if(assignment==='unknown')gaps.push('No confirmed alignment or shadow assignment');
 if(!coverage)gaps.push('No verified current-season man/zone breakdown');
 if(!receiver)gaps.push('No verified receiver target usage');
 if(row.availability!=='verified')gaps.push('Game-day participation not verified');
 const notes=[];
 if(coverage)notes.push('Opponent defense: '+coverage.manPct.toFixed(0)+'% man / '+coverage.zonePct.toFixed(0)+'% zone in sourced sample');
 if(receiver)notes.push('Receiver usage: '+receiver.targetsPerGame.toFixed(1)+' targets per game in sourced sample');
 for(const d of defenders){
  let note=d.name+' ('+d.role+')';
  if(num(d.targetsAllowed)!==null&&num(d.catchesAllowed)!==null&&d.targetsAllowed>0){
   const pct=100*d.catchesAllowed/d.targetsAllowed;
   note+=' · '+d.catchesAllowed+'/'+d.targetsAllowed+' completions allowed ('+pct.toFixed(0)+'%)';
  }
  if(num(d.yardsAllowed)!==null&&num(d.targetsAllowed)!==null&&d.targetsAllowed>0)note+=' · '+(d.yardsAllowed/d.targetsAllowed).toFixed(1)+' yards/target allowed';
  notes.push(note);
 }
 if(assignment==='projected')notes.push('Projected coverage candidate, not a confirmed one-on-one shadow assignment');
 if(assignment==='charted')notes.push('Historical charted matchup, not a guarantee for the upcoming game');
 const complete=gaps.length===0;
 return {defenders,assignment,notes,gaps,complete,probability:null};
}
function game(){
 if(!['nfl','ncaa'].includes(typeof sport==='string'?sport:''))return null;
 const d=document.getElementById('detail');
 if(!d||d.classList.contains('hidden'))return null;
 const g=typeof chosen!=='undefined'?chosen:null;
 const teams=g?.competitions?.[0]?.competitors?.map(c=>c.team?.displayName).filter(Boolean)||[];
 if(teams.length!==2)return null;
 return {d,g,teams,league:sport};
}
function render(){
 const state=game();if(!state)return;
 const {d,g,teams,league}=state;
 const id=String(g.id||'');
 let slot=d.querySelector('#v25-coverage-matchups');
 if(!slot){slot=document.createElement('section');slot.id='v25-coverage-matchups';slot.className='panel';const target=d.querySelector('#v68NcaaFive')||d.querySelector('[id*=FiveLeg]');if(target?.parentNode)target.parentNode.insertBefore(slot,target);else d.append(slot)}
 const entries=evidence.get(id)||[];
 const html=entries.map(e=>{
  const x=evaluate(e);
  return '<details style="margin:12px 0;padding:12px;border:1px solid #394251;border-radius:12px"><summary><strong>'+esc(e.receiver)+'</strong> vs '+esc(e.opponent)+' · '+(x.complete?'Evidence assembled':'Incomplete evidence')+'</summary>'+
   '<p class="desc">'+esc(e.team)+' · '+(x.assignment==='charted'?'historically charted':x.assignment==='projected'?'projected':'unassigned')+' coverage</p>'+
   x.notes.map(t=>'<p>'+esc(t)+'</p>').join('')+
   (x.gaps.length?'<p class="desc">Missing: '+esc(x.gaps.join('; '))+'</p>':'')+
   '<p class="desc">Source: <a href="'+esc(e.sourceUrl)+'" target="_blank" rel="noopener noreferrer">coverage evidence</a> · as of '+esc(e.asOf)+'. No probability is claimed without a calibrated model.</p></details>';
 }).join('');
 const label=league==='nfl'?'NFL':'NCAA';
 const next='<h2>🏈 '+label+' · Receiver vs defender research</h2><p class="desc">Individual coverage, route alignment, safety help, scheme, receiver usage and injury evidence must be sourced separately. A depth-chart name alone does not establish who will guard a receiver.</p>'+
 (html||'<p class="desc">No verified receiver-to-defender assignments or current-season coverage charting are connected for this matchup. Individual cornerback names and coverage probabilities are withheld rather than guessed.</p>')+
 '<p class="desc">Research status: '+entries.length+' sourced receiver matchups · '+(entries.length?'Review each evidence gap above.':'Coverage charting provider needed.')+' Historical receiving results alone are not defender-specific predictions.</p>';
 if(slot.dataset.game!==id||slot.dataset.league!==league||slot.dataset.count!==String(entries.length)){
  slot.innerHTML=next;slot.dataset.game=id;slot.dataset.league=league;slot.dataset.count=String(entries.length);
 }
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
function init(){const d=document.getElementById('detail');if(d)new MutationObserver(schedule).observe(d,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});const date=document.getElementById('matchDate');if(date)new MutationObserver(schedule).observe(date,{childList:true,subtree:true,characterData:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyCoverageEngine=Object.freeze({register,evaluate,refresh:schedule,version:'V2.4',required:['receiver','team','opponent','sourceUrl','asOf','defenders','assignment','coverage','receiverStats','availability']});
})();