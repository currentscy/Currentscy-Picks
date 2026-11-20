/* Currentscy Picks V2.2 NCAA player research.
   CFBD /games/players is the primary NCAA box-score source.
   Displays observed records, never fabricates injuries or availability. */
(()=>{'use strict';
if(typeof v66BuildFiveLegs!=='function')return;
const original=v66BuildFiveLegs;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const key=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/cyclones|knights|bearcats|wildcats|tigers|cougars|cowboys|bears|eagles|sun devils/g,'').replace(/sundevils/g,'');
const eq=(a,b)=>key(a)===key(b)||(['ucf','centralflorida'].includes(key(a))&&['ucf','centralflorida'].includes(key(b)));
const stat=(category,type)=>{const s=(String(category)+' '+String(type)).toLowerCase();if(/passing/.test(s))return 'passing';if(/rushing/.test(s))return 'rushing';if(/receiving/.test(s))return 'receiving';return null};
const numeric=x=>{if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null};
function parse(rows,teams,cutoff){
 const out=new Map(),seen=new Set();
 for(const game of rows){
  if(!game||!game.teams||!Array.isArray(game.teams))continue;
  const date=Date.parse(game.startDate||game.start_date||game.date||'');
  if(Number.isFinite(date)&&date>=cutoff)continue;
  const gid=String(game.id??game.gameId??'');
  if(!gid)continue;
  for(const team of game.teams){
   const name=team.school||team.team||team.name;
   const owner=teams.find(t=>eq(t,name));
   if(!owner)continue;
   for(const cat of team.categories||[]){
    const kind=stat(cat.name,cat.type);if(!kind)continue;
    for(const type of cat.types||[]){
     const field=String(type.name||type.type||type.abbreviation||'').toLowerCase();
     const yards=/^(yds|yards)$/.test(field);
     const rec=/^(rec|receptions)$/.test(field);
     if(!yards&&!rec)continue;
     for(const athlete of type.athletes||[]){
      const player=athlete.name||athlete.athlete?.displayName;
      const value=numeric(athlete.stat??athlete.value);
      if(!player||value===null||value<0)continue;
      const metric=rec?'receptions':kind+'Yards';
      const id=String(athlete.id||athlete.athlete?.id||player);
      const unique=[gid,owner,id,metric].join('|');
      if(seen.has(unique))continue;seen.add(unique);
      const pkey=[owner,id,metric].join('|');
      if(!out.has(pkey))out.set(pkey,{name:player,team:owner,metric,logs:[]});
      out.get(pkey).logs.push({gameId:gid,value});
     }
    }
   }
  }
 }
 return [...out.values()].filter(p=>p.logs.length>=3).map(p=>{
  const values=p.logs.map(x=>x.value);
  const threshold=p.metric==='passingYards'?125:p.metric==='rushingYards'?15:p.metric==='receivingYards'?10:2;
  return {...p,threshold,games:values.length,hits:values.filter(v=>v>=threshold).length,avg:values.reduce((a,b)=>a+b,0)/values.length};
 }).sort((a,b)=>b.hits/b.games-a.hits/a.games||b.games-a.games);
}
v66BuildFiveLegs=async function(comp,game,league,anchor){
 if(league!=='college-football')return original(comp,game,league,anchor);
 if(!anchor)return;
 const selected=game,cutoff=Date.parse(game?.date),teams=comp.map(c=>c.team?.displayName).filter(Boolean);
 anchor.innerHTML='<div class="panel"><h2>🏈 NCAA player research · CFBD</h2><p>Checking completed player box scores…</p></div>';
 if(!Number.isFinite(cutoff)||!window.CurrentscyCFBDV103){
  anchor.innerHTML='<div class="panel"><h2>NCAA player research</h2><p>CFBD connection or game date unavailable.</p></div>';return;
 }
 try{
  const year=new Date(cutoff).getUTCFullYear(),weeks=[15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];
  const season=await window.CurrentscyCFBDV103.request('games',{year});
  const matches=season.items.filter(g=>g.completed===true&&Date.parse(g.startDate)<cutoff&&(teams.some(t=>eq(t,g.homeTeam))||teams.some(t=>eq(t,g.awayTeam)))).sort((a,b)=>Date.parse(b.startDate)-Date.parse(a.startDate)).slice(0,10);
  const targets=[...new Set(matches.map(g=>Number(g.week)).filter(n=>Number.isInteger(n)&&n>=1&&n<=16))].slice(0,6);
  if(!targets.length)throw Error('No completed CFBD weeks found for these teams');
  const responses=await Promise.allSettled(targets.map(week=>window.CurrentscyCFBDV103.request('players',{year,week})));
  if(chosen!==selected||sport!=='ncaa')return;
  const rows=responses.flatMap(x=>x.status==='fulfilled'?x.value.items:[]);
  const candidates=parse(rows,teams,cutoff).slice(0,10);
  const failure=responses.filter(x=>x.status==='rejected').map(x=>String(x.reason?.message||x.reason).slice(0,120));
  if(!candidates.length){
   anchor.innerHTML='<div class="panel"><h2>🏈 NCAA player research · CFBD</h2><p>No players met the minimum three recorded games with recognized box-score statistics.</p><p class="desc">Retrieved '+rows.length+' game box scores across '+targets.length+' weeks. '+esc(failure[0]||'Player feed may use a different schema; no estimates were invented.')+'</p></div>';
   return;
  }
  anchor.innerHTML='<div class="panel"><h2>🏈 NCAA player research · CFBD</h2><p class="desc">Observed historical statistics only. Availability and opponent-adjusted probabilities are not verified; five-leg recommendations withheld.</p><div class="grid">'+candidates.map(p=>'<div class="tile"><strong>'+esc(p.name)+'</strong><small>'+esc(p.team)+'</small><p>'+esc(p.threshold+'+ '+p.metric.replace(/([A-Z])/g,' $1'))+'</p><b>'+p.hits+'/'+p.games+' games</b><small>Historical average: '+p.avg.toFixed(1)+'</small></div>').join('')+'</div><p class="desc">CFBD player records from '+targets.length+' completed weeks. '+(failure.length?'Some weeks failed to load.':'')+'</p></div>';
 }catch(e){
  if(chosen===selected&&sport==='ncaa')anchor.innerHTML='<div class="panel"><h2>🏈 NCAA player research · CFBD</h2><p>'+esc(e.message)+'</p><p class="desc">No unverified player predictions displayed.</p></div>';
 }
};
})();