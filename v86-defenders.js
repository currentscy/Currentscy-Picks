/* V86 Step 2: verified individual defender weakness research. Read-only; no model edits. */
(()=>{'use strict';
const tidy=s=>String(s||'').replace(/\s+/g,' ').trim();
const safeNum=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const append=(parent,tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;parent.appendChild(e);return e};
const cache=new Map();
async function get(team){
 if(!cache.has(team))cache.set(team,(async()=>{try{
  const r=await fetch('/nba-defensive?team='+encodeURIComponent(team),{signal:AbortSignal.timeout(4500),headers:{Accept:'application/json'}});
  if(!r.ok)return null;const j=await r.json();
  return j&&tidy(j.team).toLowerCase()===team.toLowerCase()&&j.source&&j.updated_at?j:null;
 }catch{return null}})());return cache.get(team);
}
function grade(p){
 const shots=safeNum(p.defended_fga),makes=safeNum(p.defended_fgm);
 const dfg=shots!==null&&makes!==null&&shots>=0&&makes>=0&&makes<=shots&&shots>0?100*makes/shots:null;
 const threeA=safeNum(p.defended_three_fga),threeM=safeNum(p.defended_three_fgm);
 const three=threeA!==null&&threeM!==null&&threeA>0&&threeM>=0&&threeM<=threeA?100*threeM/threeA:null;
 return {shots,dfg,threeA,three};
}
async function update(){
 const d=document.getElementById('detail'),date=document.getElementById('matchDate'),title=tidy(document.getElementById('matchTitle')?.textContent);
 const old=document.getElementById('v86-defenders');
 if(!d||d.classList.contains('hidden')||!/\bNBA\b/i.test(date?.textContent||'')){old?.remove();return}
 const teams=title.split(/\s+vs\.?\s+/i).map(tidy);if(teams.length!==2){old?.remove();return}
 const key=teams.join('|');if(old?.dataset.match===key)return;old?.remove();
 const host=document.createElement('section');host.id='v86-defenders';host.className='panel';host.dataset.match=key;
 append(host,'h2','Defender Matchup Research');
 append(host,'p','Individual shot defense · verified samples only · no assumed primary defender','v86-muted');
 const anchor=document.getElementById('v85-defensive');if(anchor?.isConnected)anchor.insertAdjacentElement('afterend',host);else d.appendChild(host);
 const data=await Promise.all(teams.map(get));if(!host.isConnected||host.dataset.match!==key)return;
 for(let i=0;i<teams.length;i++){
  const section=document.createElement('div');section.className='v86-team';host.appendChild(section);
  append(section,'h3',teams[i]);
  const feed=data[i];
  if(!feed||!Array.isArray(feed.players)||!feed.players.length){
   append(section,'p','No verified individual defender tracking available. Cannot identify a favorable defender matchup.','v86-muted');continue;
  }
  append(section,'p','Source: '+tidy(feed.source)+' · Updated: '+tidy(feed.updated_at),'v86-muted');
  const candidates=feed.players.filter(p=>p&&tidy(p.name)&&grade(p).shots!==null).slice(0,30);
  if(!candidates.length){append(section,'p','The source has no validated defended-shot samples.','v86-muted');continue}
  const table=document.createElement('table');table.className='v86-table';
  const head=table.createTHead().insertRow();['Defender','DFG%','Shots defended','3PT DFG%','3PT shots'].forEach(x=>append(head.insertCell(),'span',x));
  const body=table.createTBody();
  candidates.sort((a,b)=>(grade(b).shots||0)-(grade(a).shots||0));
  for(const p of candidates){
   const m=grade(p),row=body.insertRow();
   [tidy(p.name),m.dfg===null?'—':m.dfg.toFixed(1)+'%',m.shots??'—',m.three===null?'—':m.three.toFixed(1)+'%',m.threeA??'—'].forEach(x=>{row.insertCell().textContent=x});
  }
  const wrap=document.createElement('div');wrap.className='v86-scroll';wrap.appendChild(table);section.appendChild(wrap);
  append(section,'p','DFG% is opponent field-goal percentage when this defender contests the shot. Larger values alone do not prove a weak defender; shot difficulty and sample size matter.','v86-muted');
 }
 append(host,'p','A defender assignment is not confirmed without matchup-possession evidence and an expected lineup. These observations do not change parlay probabilities.','v86-muted');
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update().catch(()=>{})})}
function init(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();