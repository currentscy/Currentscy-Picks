/* Currentscy Picks V2.3 — NCAA player research, NFL-style compact presentation.
   Only actual CFBD player box scores; historical hit rate != win probability. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const key=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/cyclones|knights/g,'');
const match=(a,b)=>key(a)===key(b)||(['ucf','centralflorida'].includes(key(a))&&['ucf','centralflorida'].includes(key(b)));
const type=(c,s)=>{
 c=String(c).toLowerCase();s=String(s).toLowerCase();
 if(c.includes('passing')&&['yds','yards'].includes(s))return 'passingyards';
 if(c.includes('rushing')&&['yds','yards'].includes(s))return 'rushingyards';
 if(c.includes('receiving')&&['yds','yards'].includes(s))return 'receivingyards';
 if(c.includes('receiving')&&['rec','receptions'].includes(s))return 'receptions';
 return null;
};
const levels={passingyards:[125,150,175,200,225,250],rushingyards:[15,25,40,50,60,75],receivingyards:[10,20,30,40,50,60,75],receptions:[1,2,3,4,5]};
const label={passingyards:'passing yards',rushingyards:'rushing yards',receivingyards:'receiving yards',receptions:'receptions'};
const val=x=>Number.isFinite(Number(x))?Number(x):null;
function parse(weeks,teams){
 const players=new Map();
 for(const w of weeks)for(const box of w.matched||[]){
  if(!teams.some(t=>match(t,box.team)))continue;
  for(const p of box.athletes||[]){
   const kind=type(p.category,p.stat);if(!kind)continue;
   const v=val(p.value);if(v===null||v<0)continue;
   const k=[key(box.team),p.id||p.name,kind].join('|');
   if(!players.has(k))players.set(k,{name:p.name,team:box.team,kind,logs:new Map()});
   players.get(k).logs.set(String(box.gameId),v);
  }
 }
 return [...players.values()].map(p=>({...p,values:[...p.logs.values()]})).filter(p=>p.values.length>=5);
}
function select(players){
 const possibilities=[];
 for(const p of players){
  for(const threshold of levels[p.kind]){
   const hits=p.values.filter(v=>v>=threshold).length,rate=hits/p.values.length;
   if(rate<.7)continue;
   possibilities.push({...p,threshold,hits,rate});
  }
 }
 possibilities.sort((a,b)=>b.rate-a.rate||b.values.length-a.values.length||b.threshold-a.threshold);
 const chosen=[],used=new Set();
 for(const p of possibilities){
  const id=key(p.team)+'|'+p.name.toLowerCase();
  if(used.has(id))continue;
  used.add(id);chosen.push(p);
  if(chosen.length===5)break;
 }
 return chosen;
}
let generation=0;
async function load(comp,game,league,anchor){
 if(league!=='college-football')return null;
 const run=++generation;
 const teams=comp.map(c=>c.team?.displayName).filter(Boolean),cutoff=Date.parse(game?.date);
 anchor.innerHTML='<div class="panel"><h2>🏈 5 Leg Player Research · NCAA</h2><p class="desc">Checking CFBD player game logs…</p></div>';
 if(!Number.isFinite(cutoff)||!window.CurrentscyCFBDV103||!window.CurrentscyNCAAPlayerDiagnostic)throw Error('CFBD player feed unavailable');
 const year=new Date(cutoff).getUTCFullYear();
 const schedule=await window.CurrentscyCFBDV103.request('games',{year});
 const games=schedule.items.filter(g=>g.completed===true&&Date.parse(g.startDate)<cutoff&&teams.some(t=>match(t,g.homeTeam)||match(t,g.awayTeam))).sort((a,b)=>Date.parse(b.startDate)-Date.parse(a.startDate));
 const weeks=[...new Set(games.map(g=>g.week).filter(Number.isInteger))].slice(0,9);
 if(!weeks.length)throw Error('No completed CFBD game weeks found for these teams');
 const outcomes=await Promise.allSettled(weeks.map(w=>window.CurrentscyNCAAPlayerDiagnostic.diagnose(year,w,teams)));
 if(run!==generation||chosen!==game||sport!=='ncaa')return true;
 const successes=outcomes.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const rows=parse(successes,teams),selected=select(rows);
 const errors=outcomes.filter(r=>r.status==='rejected').map(r=>String(r.reason?.message||r.reason));
 const complete=successes.length===weeks.length;
 const cards=selected.map((p,i)=>{
  const mean=p.values.reduce((a,b)=>a+b,0)/p.values.length;
  return '<div class="v23-leg"><h3>'+(i+1)+'. '+esc(p.name)+' — '+p.threshold+'+ '+esc(label[p.kind])+'</h3>'+
  '<p class="desc">'+esc(p.team)+' · '+p.values.length+' verified game logs</p>'+
  '<span class="v23-hit">'+p.hits+'/'+p.values.length+' hits · '+Math.round(p.rate*100)+'% historical</span>'+
  '<div class="v23-statgrid"><div><small>Stat</small><strong>'+esc(label[p.kind])+'</strong></div><div><small>Per-game average</small><strong>'+mean.toFixed(1)+'</strong></div></div>'+
  '<details><summary>Why '+esc(p.name)+' could hit · Tap to expand</summary><p>Reached '+p.threshold+'+ '+esc(label[p.kind])+' in '+p.hits+' of '+p.values.length+' available completed CFBD box scores. Opponent defensive matchups, expected usage, and active status are not verified; this is a historical observation, not an estimated probability.</p></details></div>';
 }).join('');
 anchor.innerHTML='<div class="panel v23-five"><h2>🏈 5 Leg Player Research · NCAA</h2>'+
 '<p class="desc">'+successes.length+'/'+weeks.length+' weeks loaded · '+rows.length+' players with at least five usable game logs</p>'+
 (cards||'<p>Insufficient verified player logs for five selections.</p>')+
 '<p class="desc">'+(selected.length<5?'Only '+selected.length+' distinct players meet the sample and hit-rate filters. ':'')+
 'Research candidates only. Availability and matchup-adjusted probabilities remain unverified.'+
 (!complete?' Some weeks failed: '+esc(errors[0]||'unknown error')+'.':'')+'</p></div>';
 return true;
}
const old=typeof v66BuildFiveLegs==='function'?v66BuildFiveLegs:null;
if(old)v66BuildFiveLegs=async function(comp,game,league,anchor){
 if(league!=='college-football')return old(comp,game,league,anchor);
 try{return await load(comp,game,league,anchor)}
 catch(e){if(anchor&&chosen===game&&sport==='ncaa')anchor.innerHTML='<div class="panel"><h2>NCAA five-leg player research</h2><p>'+esc(e.message)+'</p><p class="desc">No unsupported recommendations shown.</p></div>'}
};
window.CurrentscyNCAAV23=Object.freeze({parse,select,version:'V2.3'});
})();