/* V85 Step 1: NBA defensive tracking research adapter. No guessed assignments or grades.
   A same-origin endpoint /nba-defensive?team=... may supply verified, licensed data:
   {source,updated_at,team,defensive_rating,opponent_paint_points,opponent_three_pct,
    players:[{name,defensive_rating,matchup_note}],sample_games}
   No endpoint means no fabricated metrics. */
(()=>{'use strict';
const clean=s=>(s||'').replace(/\s+/g,' ').trim();
const cache=new Map();
const endpoint='/nba-defensive';
async function load(team){
 if(cache.has(team))return cache.get(team);
 const task=(async()=>{try{
  const r=await fetch(endpoint+'?team='+encodeURIComponent(team),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(4500)});
  if(!r.ok)return null;const j=await r.json();
  if(!j||!j.source||!j.updated_at||clean(j.team).toLowerCase()!==team.toLowerCase())return null;
  return j;
 }catch{return null}})();cache.set(team,task);return task;
}
const num=(v)=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(1):null;
let current='';
async function render(){
 const d=document.getElementById('detail'),title=clean(document.getElementById('matchTitle')?.textContent);
 if(!d||d.classList.contains('hidden')||!/\bNBA\b/.test(document.getElementById('matchDate')?.textContent||''))return;
 const teams=title.split(/\s+vs\.?\s+/i).map(clean);
 if(teams.length!==2)return;
 const signature=teams.join('|');
 let host=document.getElementById('v85-defensive');
 if(host?.dataset.match!==signature){host?.remove();host=null}
 if(host)return;
 host=document.createElement('section');host.id='v85-defensive';host.className='panel';host.dataset.match=signature;
 const heading=document.createElement('h2');heading.textContent='NBA Defensive Matchup Research';host.appendChild(heading);
 const caption=document.createElement('p');caption.className='v85-caption';caption.textContent='Step 1 · NBA.com defensive tracking integration · verified data only';host.appendChild(caption);
 const status=document.createElement('p');status.className='v85-caption';status.textContent='Checking verified defensive data…';host.appendChild(status);
 const match=document.getElementById('matchTitle');match?.closest('.panel')?.insertAdjacentElement('afterend',host);
 if(!host.isConnected)d.prepend(host);
 const result=await Promise.all(teams.map(load));
 if(!host.isConnected||host.dataset.match!==signature)return;
 status.remove();
 const all=result.every(Boolean);
 for(let i=0;i<teams.length;i++){
  const team=teams[i],data=result[i];
  const block=document.createElement('div');block.className='v85-team';
  const h=document.createElement('h3');h.textContent=team;block.appendChild(h);
  const p=document.createElement('p');p.className='v85-caption';
  if(!data)p.textContent='Defensive tracking unavailable: no verified data connection. No defender advantage is assumed.';
  else{
   const metrics=[['Defensive rating',num(data.defensive_rating)],['Opp. paint points',num(data.opponent_paint_points)],['Opp. 3PT%',num(data.opponent_three_pct)]].filter(x=>x[1]!==null);
   p.textContent=metrics.length?metrics.map(x=>x.join(': ')).join(' · '):'Source connected; no validated defensive metrics supplied.';
   const provenance=document.createElement('small');provenance.textContent='Source: '+clean(data.source)+' · Updated: '+clean(data.updated_at);block.appendChild(provenance);
  }
  block.appendChild(p);host.appendChild(block);
 }
 const note=document.createElement('p');note.className='v85-caption';note.textContent=all?'Team defensive metrics are context, not proof of individual assignments.':'Live NBA.com tracking is not yet connected. Existing projections and parlay selections remain unchanged.';host.appendChild(note);
 const link=document.createElement('a');link.href='https://www.nba.com/stats/teams/defense';link.target='_blank';link.rel='noopener noreferrer';link.textContent='View official NBA defensive statistics';host.appendChild(link);
}
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render().catch(()=>{})})}
function init(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();