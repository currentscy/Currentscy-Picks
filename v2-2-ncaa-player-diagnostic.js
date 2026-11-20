/* Currentscy Picks V2.2.1 NCAA player feed diagnostics.
   Reports actual CFBD response structure and player coverage; no fake picks. */
(()=>{'use strict';
const worker=window.CurrentscyCFBDV103;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const normalize=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/cyclones|knights|sundevils|bearcats|wildcats|cougars|cowboys|bears|eagles|tigers|jayhawks/g,'');
function match(a,b){const x=normalize(a),y=normalize(b);return x===y||(['ucf','centralflorida'].includes(x)&&['ucf','centralflorida'].includes(y))}
function athletesFor(team){
 const results=[];
 for(const cat of team.categories||[]){
  for(const type of cat.types||[]){
   for(const a of type.athletes||[]){
    const name=a.name||a.athlete?.displayName||a.athlete?.name;
    const value=Number(a.stat??a.value);
    if(name&&Number.isFinite(value)&&value>=0)results.push({name,value,category:cat.name||'',stat:type.name||type.type||type.abbreviation||'',id:String(a.id||a.athlete?.id||name)});
   }
  }
 }
 return results;
}
async function diagnose(year,week,teams){
 const data=await window.CurrentscyCFBDV103.request('players',{year,week});
 const games=data.items||[], matched=games.flatMap(g=>(g.teams||[]).filter(t=>teams.some(name=>match(name,t.school||t.team||t.name))).map(t=>({gameId:g.id,team:t.school||t.team||t.name,athletes:athletesFor(t),categories:(t.categories||[]).map(c=>({name:c.name,types:(c.types||[]).map(x=>x.name||x.type)}))})));
 return {year,week,gameCount:games.length,matchedTeams:matched.length,athletes:matched.reduce((n,t)=>n+t.athletes.length,0),sampleCategories:matched[0]?.categories||[],matched};
}
window.CurrentscyNCAAPlayerDiagnostic=Object.freeze({diagnose});
if(typeof v66BuildFiveLegs!=='function')return;
const previous=v66BuildFiveLegs;
v66BuildFiveLegs=async function(comp,game,league,anchor){
 if(league!=='college-football')return previous(comp,game,league,anchor);
 if(!anchor)return;
 const names=comp.map(c=>c.team?.displayName).filter(Boolean),cutoff=Date.parse(game?.date);
 const selected=game;
 anchor.innerHTML='<div class="panel"><h2>🏈 NCAA player data · CFBD verification</h2><p>Checking player box-score coverage…</p></div>';
 if(!window.CurrentscyCFBDV103||!Number.isFinite(cutoff)){anchor.innerHTML='<div class="panel"><h2>NCAA player data</h2><p>CFBD client or game date unavailable.</p></div>';return}
 try{
  const year=new Date(cutoff).getUTCFullYear();
  const schedule=await window.CurrentscyCFBDV103.request('games',{year});
  const games=schedule.items.filter(g=>g.completed===true&&Date.parse(g.startDate)<cutoff&&names.some(t=>match(t,g.homeTeam)||match(t,g.awayTeam))).sort((a,b)=>Date.parse(b.startDate)-Date.parse(a.startDate));
  const weeks=[...new Set(games.map(g=>g.week).filter(n=>Number.isInteger(n)))].slice(0,5);
  if(!weeks.length)throw Error('No completed weeks found for the selected teams');
  const responses=await Promise.allSettled(weeks.map(w=>diagnose(year,w,names)));
  if(chosen!==selected||sport!=='ncaa')return;
  const good=responses.filter(x=>x.status==='fulfilled').map(x=>x.value);
  const failed=responses.filter(x=>x.status==='rejected').map(x=>String(x.reason?.message||x.reason));
  const all=good.flatMap(x=>x.matched);
  const playerRows=all.flatMap(t=>t.athletes.map(a=>({...a,team:t.team,gameId:t.gameId})));
  const counts=new Map();
  for(const p of playerRows){const k=[p.team,p.id,p.category,p.stat].join('|');if(!counts.has(k))counts.set(k,{...p,values:[],ids:new Set()});const c=counts.get(k);if(!c.ids.has(p.gameId)){c.ids.add(p.gameId);c.values.push(p.value)}}
  const candidates=[...counts.values()].filter(p=>p.values.length>=3).sort((a,b)=>b.values.length-a.values.length).slice(0,12);
  const header='<div class="panel"><h2>🏈 NCAA player data · CFBD</h2><p class="desc">Verified feed inspection: '+good.length+'/'+weeks.length+' weeks loaded; '+all.length+' matching team box scores; '+playerRows.length+' individual stat entries. No availability confirmation or opponent-adjusted probabilities.</p>';
  if(candidates.length){
   anchor.innerHTML=header+'<div class="grid">'+candidates.map(p=>'<div class="tile"><strong>'+escape(p.name)+'</strong><small>'+escape(p.team)+'</small><p>'+escape(p.category)+' · '+escape(p.stat)+'</p><b>'+p.values.length+' games</b><small>Average '+(p.values.reduce((a,b)=>a+b,0)/p.values.length).toFixed(1)+'</small></div>').join('')+'</div><p class="desc">Five-leg recommendations withheld until stat categories and player availability are verified.</p></div>';
  }else{
   const categories=good.flatMap(x=>x.sampleCategories).slice(0,4).map(x=>escape(x.name)+': '+escape(x.types.join(', '))).join(' | ');
   anchor.innerHTML=header+'<p>No player reached three usable recorded games. '+(categories?'Provider categories: '+categories+'. ':'')+'</p><p class="desc">'+escape(failed[0]||'Feed may have incomplete player coverage. No predictions invented.')+'</p></div>';
  }
 }catch(e){if(chosen===selected&&sport==='ncaa')anchor.innerHTML='<div class="panel"><h2>🏈 NCAA player data · CFBD</h2><p>Connection or parsing issue: '+escape(e.message)+'</p></div>'}
};
})();