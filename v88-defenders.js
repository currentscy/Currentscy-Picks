/* Currentscy Picks V88 — free pregame defender candidates.
   Public ESPN rosters support roster/position matching, NOT verified assignments.
   Never adjust model probabilities from position alone. No paid APIs or keys.
*/
(()=>{'use strict';
const tidy=s=>String(s??'').replace(/\s+/g,' ').trim();
const root='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const cache=new Map();
const get=async(url)=>{if(!cache.has(url))cache.set(url,(async()=>{try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(6500)});return r.ok?await r.json():null}catch{return null}})());return cache.get(url)};
const norm=s=>tidy(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const pos=p=>tidy(p?.position?.abbreviation||p?.position?.name||p?.position||'').toUpperCase();
const group=p=>{const x=pos(p);if(/PG|SG|GUARD|^G$/.test(x))return 'G';if(/SF|PF|FORWARD|^F$/.test(x))return 'F';if(/CENTER|^C$/.test(x))return 'C';return '?'};
function candidates(players,offensePos){
 const g=group({position:offensePos});
 const rank=p=>{const pg=group(p);return pg===g?0:(g==='G'&&pg==='F'||g==='F'&&pg==='G'||g==='C'&&pg==='F')?1:2};
 return players.filter(p=>p?.displayName&&p?.status?.type!=='inactive').sort((a,b)=>rank(a)-rank(b)).slice(0,4);
}
async function teamInfo(name){
 const listing=await get(root+'teams?limit=40');const teams=listing?.sports?.[0]?.leagues?.[0]?.teams||[];
 const match=teams.find(x=>norm(x.team?.displayName)===norm(name));
 if(!match?.team?.id)return null;
 const j=await get(root+'teams/'+encodeURIComponent(match.team.id)+'/roster');
 const athletes=(j?.athletes||[]).flatMap(x=>Array.isArray(x?.items)?x.items:[x]).filter(x=>x?.displayName);
 return {athletes,team:match.team};
}
function sourcePlayerPosition(name){
 const headings=[...document.querySelectorAll('#v83-player-stats table')];
 for(const table of headings){const row=[...table.querySelectorAll('tr')].find(tr=>norm(tr.cells?.[0]?.textContent)===norm(name));if(row){const t=tidy(row.textContent);const m=t.match(/\b(PG|SG|SF|PF|C)\b/);if(m)return m[1]}}
 return '';
}
let runId=0;
async function render(){
 const d=document.getElementById('detail');
 if(!d||d.classList.contains('hidden')||!/\bNBA\b/i.test(document.getElementById('matchDate')?.textContent||''))return;
 const teams=tidy(document.getElementById('matchTitle')?.textContent).split(/\s+vs\.?\s+/i);
 if(teams.length!==2)return;
 const id=++runId;
 const details=[...d.querySelectorAll('details')].filter(el=>/matchup research/i.test(tidy(el.querySelector('summary')?.textContent)));
 if(!details.length)return;
 const rosters=await Promise.all(teams.map(teamInfo));
 if(id!==runId)return;
 for(const det of details){
  const parent=det.parentElement,header=[...parent.querySelectorAll('strong,h3,h4,b')].find(x=>/^\d+\.\s+.+[—–-]\s+\d+\+/.test(tidy(x.textContent)));
  const label=tidy(header?.textContent);
  const match=label.match(/^\d+\.\s+(.+?)\s+[—–-]\s+\d+\+/);
  if(!match)continue;
  const player=match[1],intro=tidy(parent.textContent).slice(label.length,label.length+220);
  const own=teams.find(t=>intro.startsWith(t)||intro.includes(t));if(!own)continue;
  const opponent=teams.find(t=>t!==own),idx=teams.indexOf(opponent);
  const roster=rosters[idx];let existing=det.querySelector('.v88-candidates');
  if(!roster?.athletes?.length){existing?.remove();continue}
  const ownRoster=rosters[teams.indexOf(own)]?.athletes||[];
  const offense=ownRoster.find(p=>norm(p.displayName)===norm(player));
  const offensivePos=pos(offense)||sourcePlayerPosition(player);
  const selection=candidates(roster.athletes,offensivePos);
  if(!selection.length){existing?.remove();continue}
  const signature=[player,opponent,offensivePos,...selection.map(p=>p.id||p.displayName)].join('|');
  if(existing?.dataset.signature===signature)continue;
  if(!existing){existing=document.createElement('div');existing.className='v88-candidates';det.appendChild(existing)}
  existing.dataset.signature=signature;existing.replaceChildren();
  const heading=document.createElement('strong');heading.textContent='Potential defenders — '+opponent;existing.appendChild(heading);
  const description=document.createElement('p');description.textContent=offensivePos?'Offensive position: '+offensivePos+'. Opposing roster candidates by position:':'Offensive position not verified. Opposing roster candidates (not ranked by assignment):';existing.appendChild(description);
  const list=document.createElement('ul');
  for(const p of selection){const li=document.createElement('li');li.textContent=tidy(p.displayName)+' · '+(pos(p)||'position not listed');list.appendChild(li)}
  existing.appendChild(list);
  const disclaimer=document.createElement('p');disclaimer.className='v88-disclaimer';disclaimer.textContent='ESPN roster data only. Starter status, likely primary defender, defensive rating, shared minutes and switching frequency are NOT verified. No defender adjustment is applied to projections or simulations.';existing.appendChild(disclaimer);
 }
}
let pending=false;function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render().catch(()=>{})})}
function init(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();