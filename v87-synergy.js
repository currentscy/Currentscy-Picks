/* V87 Step 3 — Synergy play-type research adapter.
   Expected trusted same-origin server endpoint:
   GET /api/nba/synergy-research?player=...&opponent=...
   Response: {source:"Synergy Sports",season:"2026-27",updated_at:"ISO",
   player:"...",opponent:"...",sample_possessions:50,
   play_types:[{type:"SpotUp",possessions:20,ppp:1.13,defensive_ppp_allowed:1.19}],
   defender:{name:"...",verified_assignment:false},notes:"..."}
   API credentials must stay server-side. This module never fetches Sportradar directly.
*/
(()=>{'use strict';
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
const known=new Set(['Iso','PostUp','PandRBallHandler','PandRRollMan','Cut','Transition','SpotUp','Offensive Rebound','OffScreen','HandOff']);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const cache=new Map();
async function load(player,opponent){
 const key=player+'|'+opponent;
 if(!cache.has(key))cache.set(key,(async()=>{try{
  const u='/api/nba/synergy-research?player='+encodeURIComponent(player)+'&opponent='+encodeURIComponent(opponent);
  const r=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(4500)});
  if(!r.ok)return null;
  const j=await r.json();
  if(j?.source!=='Synergy Sports'||clean(j.player).toLowerCase()!==player.toLowerCase()||clean(j.opponent).toLowerCase()!==opponent.toLowerCase()||!j.updated_at||!j.season)return null;
  return j;
 }catch{return null}})());return cache.get(key);
}
function explain(j){
 const valid=(Array.isArray(j.play_types)?j.play_types:[]).filter(p=>known.has(p?.type)&&Number.isInteger(p.possessions)&&p.possessions>=20&&finite(p.ppp)&&p.ppp>=0&&p.ppp<=4&&finite(p.defensive_ppp_allowed)&&p.defensive_ppp_allowed>=0&&p.defensive_ppp_allowed<=4);
 valid.sort((a,b)=>b.possessions-a.possessions);
 const p=valid[0];
 let result='';
 if(p){
  const diff=p.ppp-p.defensive_ppp_allowed;
  result=p.type+' possessions: '+p.ppp.toFixed(2)+' offensive points per possession over '+p.possessions+' tracked possessions; opponent allows '+p.defensive_ppp_allowed.toFixed(2)+' PPP in the comparable play type. ';
  result+=diff<-.08?'The observed play-type comparison is unfavorable. ':diff>.08?'The offensive efficiency is stronger than the opponent allowance; this is not by itself a confirmed individual advantage. ':'These rates are similar, so no clear play-type edge is established. ';
 }else result='Insufficient comparable play-type possession samples to establish a tactical advantage. ';
 const def=j.defender;
 if(def?.verified_assignment===true&&clean(def.name))result+='Verified defensive assignment: '+clean(def.name)+'. ';
 else result+='Expected primary defender is not verified. ';
 result+='Source: Synergy Sports · '+clean(j.season)+' · Updated '+clean(j.updated_at)+'.';
 return result;
}
function findOpponent(details,teams){
 const leg=details.closest('.leg,.v79-leg,.v65leg');
 const txt=clean(leg?.textContent||'').toLowerCase();
 const own=teams.find(t=>txt.includes(t.toLowerCase()));
 return own?teams.find(t=>t!==own):null;
}
let token=0;
async function refresh(){
 const d=document.getElementById('detail'),title=clean(document.getElementById('matchTitle')?.textContent);
 if(!d||d.classList.contains('hidden')||!/\bNBA\b/i.test(document.getElementById('matchDate')?.textContent||''))return;
 const teams=title.split(/\s+vs\.?\s+/i).map(clean);if(teams.length!==2)return;
 const current=++token;
 for(const details of d.querySelectorAll('details')){
  const summary=details.querySelector('summary');
  if(!summary||!/matchup research/i.test(clean(summary.textContent)))continue;
  const leg=details.closest('.leg,.v79-leg,.v65leg');
  const strong=leg?.querySelector('strong');const player=clean(strong?.textContent).replace(/^\d+\.\s*/,'').split(/\s+[—–-]\s+/)[0];
  const opponent=findOpponent(details,teams);
  if(!player||!opponent)continue;
  const key=player+'|'+opponent;
  if(details.dataset.v87Key===key)continue;
  details.dataset.v87Key=key;
  const data=await load(player,opponent);
  if(!details.isConnected||details.dataset.v87Key!==key||current!==token)return;
  if(!data)continue; // Existing V84 text remains untouched without licensed evidence.
  let output=details.querySelector('.v87-research');
  if(!output){output=document.createElement('p');output.className='v87-research';details.appendChild(output)}
  output.textContent=explain(data);
  details.classList.add('v87-has-data');
 }
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh().catch(()=>{})})}
function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();