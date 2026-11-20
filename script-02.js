
// V66: weekly player research lives on NFL and NCAA landing pages only.
function v66UpdateWeeklyGames(){
 const select=document.getElementById('v66GameSelect');if(!select)return;
 const now=Date.now();const available=events.map((e,i)=>({e,i})).filter(({e})=>Date.parse(e.date)>now-4*3600000);
 const games=available.length?available:events.map((e,i)=>({e,i}));
 select.innerHTML=games.map(({e,i})=>{const c=e.competitions?.[0]?.competitors||[];const away=c.find(x=>x.homeAway==='away')?.team?.displayName||'Away';const home=c.find(x=>x.homeAway==='home')?.team?.displayName||'Home';return '<option value="'+i+'">'+escapeHtml(away+' vs '+home)+' · '+escapeHtml(dateText(e.date))+'</option>'}).join('');
 document.getElementById('v66WeeklyOutput').textContent='Choose a matchup and tap Research 5 legs. These are historical research candidates, not verified injury-adjusted picks.';
}
function v66Selected(){return events[Number(document.getElementById('v66GameSelect').value)];}
document.getElementById('v66OpenGame').addEventListener('click',()=>{const game=v66Selected();if(game)openGame(game)});
document.getElementById('v66WeeklyAnalyze').addEventListener('click',async()=>{
 const game=v66Selected(),btn=document.getElementById('v66WeeklyAnalyze'),anchor=document.getElementById('v66WeeklyOutput');
 if(!game){anchor.textContent='No game selected or available.';return;}
 const league=sport==='nfl'?'nfl':'college-football';
 const comp=game.competitions?.[0]?.competitors||[];
 if(comp.length!==2){anchor.textContent='Team identities unavailable for this game.';return;}
 btn.disabled=true;btn.textContent='Checking ESPN logs…';
 try{await v66BuildFiveLegs(comp,game,league,anchor)}finally{btn.disabled=false;btn.textContent='Research 5 legs'}
});
// V73: NBA winner model and strict 14-day event window. Other sport engines unchanged.
function v73WithinWindow(date){const t=Date.parse(date);if(!Number.isFinite(t))return false;const now=new Date();const today=dateKey(now);const end=new Date(now.getTime()+14*86400000);return dateKey(date)>=today&&dateKey(date)<=dateKey(end)}
async function v73AnalyzeNBA(){
 const box=$('results');if(!chosen||sport!=='nba')return;
 const event=chosen,cs=event.competitions?.[0]?.competitors||[],away=cs.find(x=>x.homeAway==='away'),home=cs.find(x=>x.homeAway==='home');
 if(!away||!home){box.innerHTML='<div class="panel">Matchup teams unavailable.</div>';return}
 box.innerHTML='<div class="panel"><h2>🏀 NBA matchup outlook</h2><p class="desc">Loading completed games for both teams…</p></div>';
 try{
  const league='basketball/nba',cutoff=Math.min(Date.now(),Date.parse(event.date));
  const histories=await Promise.all([away,home].map(c=>v64RecentGames(c,league,cutoff,10)));
  if(chosen!==event||sport!=='nba')return;
  const scoreOf=c=>{let v=c?.score?.value??c?.score?.displayValue??c?.score;return v==null||v===''?NaN:Number(v)};
  const teams=[away,home].map((c,i)=>{
   const rows=histories[i].games.map(g=>{let participants=g.competitions?.[0]?.competitors||[],self=participants.find(x=>String(x.team?.id)===String(c.team.id)),opp=participants.find(x=>x!==self);return {scored:scoreOf(self),allowed:scoreOf(opp),date:g.date}}).filter(x=>Number.isFinite(x.scored)&&Number.isFinite(x.allowed));
   return {name:c.team?.displayName||'Team',scores:rows};
  });
  const [a,h]=teams;if(a.scores.length<3||h.scores.length<3)throw Error('Only '+a.scores.length+' and '+h.scores.length+' usable completed scores. Need three for each team.');
  const N=100000;let aw=0,hw=0,ties=0,sa=0,sh=0;
  for(let i=0;i<N;i++){const ar=a.scores[Math.floor(Math.random()*a.scores.length)],hr=h.scores[Math.floor(Math.random()*h.scores.length)];const x=Math.max(0,Math.round((ar.scored+hr.allowed)/2)),y=Math.max(0,Math.round((hr.scored+ar.allowed)/2));sa+=x;sh+=y;if(x>y)aw++;else if(y>x)hw++;else ties++}
  const pct=x=>(x/N*100).toFixed(1)+'%';
  box.innerHTML='<div class="panel"><h2>🏀 NBA · Matchup outlook</h2><div class="grid"><div class="tile"><small>'+escapeHtml(a.name)+' projected lead</small><b>'+pct(aw)+'</b></div><div class="tile"><small>'+escapeHtml(h.name)+' projected lead</small><b>'+pct(hw)+'</b></div><div class="tile"><small>Average modeled score</small><b>'+(sa/N).toFixed(0)+' – '+(sh/N).toFixed(0)+'</b></div><div class="tile"><small>Sampled ties</small><b>'+pct(ties)+'</b></div></div><details><summary>How this matchup was evaluated</summary><p class="desc">100,000 resampled offensive and opponent defensive scores using '+a.scores.length+' and '+h.scores.length+' verified completed games. This is an exploratory baseline, not a calibrated win probability. Player injuries, current lineups, pace and tactical assignments are not included in the win simulation.</p></details></div>';
  $('dataStatus').textContent='NBA matchup research loaded.';
 }catch(e){if(chosen===event&&sport==='nba')box.innerHTML='<div class="panel"><h2>🏀 NBA matchup outlook</h2><p class="desc">Unable to calculate a verified matchup estimate: '+escapeHtml(e.message)+'</p></div>'}
}
// V72 isolated NBA player-prop research and per-match injury panel.
const v72Cache = new Map(); let v72Token=0;
function v72Card(title,body){return '<div class="panel"><h2>'+title+'</h2>'+body+'</div>'}
function v72Container(){let node=document.getElementById('v72MatchExtras');if(!node){node=document.createElement('section');node.id='v72MatchExtras';let target=document.getElementById('detail');let results=document.getElementById('results');if(target&&results)target.insertBefore(node,results);else target?.prepend(node)}return node}
function v72Normalize(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
async function v72Injuries(event,sp,token){
 const box=document.getElementById('v72Injuries');if(!box)return [];
 const comp=event.competitions?.[0]?.competitors||[];
 const paths={nfl:'football/nfl',ncaa:'football/college-football',nba:'basketball/nba',nhl:'hockey/nhl',mlb:'baseball/mlb',soccer:'soccer/'+league};
 const path=paths[sp];if(!path)return [];
 const teams=comp.map(c=>c.team).filter(Boolean);
 const parseEntry=x=>{const a=x.athlete||x.player||{};const raw=x.status||x.type?.description||x.type?.name||x.details?.type||x.injury?.status||'';const status=typeof raw==='object'?(raw.description||raw.name||raw.type||'') :String(raw);return {name:a.displayName||a.fullName||x.displayName||x.name||'',status:status||'Unspecified',detail:String(x.details?.detail||x.description||x.injury?.description||'')}};
 let global=null,globalOk=false;
 try{global=await get(root+path+'/injuries?limit=500');globalOk=Array.isArray(global.injuries)||Array.isArray(global.teams)||Array.isArray(global.items)}catch(e){}
 const report=await Promise.all(teams.map(async team=>{
  let entries=[],verified=false,reason='Source did not provide a usable injury list';
  if(globalOk){
   const group=(global.teams||global.items||[]).find(x=>String(x.team?.id||x.id)===String(team.id)||String(x.team?.abbreviation||'').toLowerCase()===String(team.abbreviation||'').toLowerCase());
   if(group){const raw=group.injuries||group.athletes||group.items;if(Array.isArray(raw)){entries=raw.map(parseEntry).filter(x=>x.name);verified=true}}
   if(!verified&&Array.isArray(global.injuries)){
    const rows=global.injuries.filter(x=>String(x.team?.id||x.athlete?.team?.id||'')===String(team.id));
    if(rows.length){entries=rows.map(parseEntry).filter(x=>x.name);verified=true}
   }
  }
  if(!verified){try{const d=await get(root+path+'/teams/'+encodeURIComponent(team.id)+'/injuries?limit=100');
   const raw=d.injuries||d.items||d.athletes;
   // An empty array from an undocumented team endpoint is not proof of a clean bill of health.
   if(Array.isArray(raw)&&raw.length){entries=raw.map(parseEntry).filter(x=>x.name);verified=true}
  }catch(e){reason=e.message}}
  return {team:team.displayName||team.name||'Team',entries,verified,reason};
 }));
 if(token!==v72Token)return report;
 box.innerHTML=v72Card('🏥 Match injury report',report.map(t=>'<h3>'+escapeHtml(t.team)+'</h3>'+(t.verified?t.entries.map(p=>'<div class="leg"><strong>'+escapeHtml(p.name)+'</strong> · '+escapeHtml(p.status)+(p.detail?' <small>'+escapeHtml(p.detail)+'</small>':'')+'</div>').join(''):'<p class="desc">Injury information unavailable or not verified for this matchup.</p>')).join('')+'<small>Source: ESPN injury feeds when available. An empty or unsupported response is not confirmation that a team has no injuries.</small>');
 return report;
}
function v72ExtractNBA(summary,teamId){let rows=[];for(const b of summary.boxscore?.players||[]){if(String(b.team?.id)!==String(teamId))continue;for(const s of b.statistics||[]){let labels=s.labels||[];for(const p of s.athletes||[]){let a=p.athlete||{},raw=p.stats||[];let getNum=(names)=>{let ix=labels.findIndex(l=>names.includes(v72Normalize(l)));if(ix<0)return NaN;let v=String(raw[ix]||'');if(v.includes('-'))v=v.split('-')[0];return Number(v)};let min=getNum(['min','minutes']);let pts=getNum(['pts','points']),reb=getNum(['reb','rebounds']),ast=getNum(['ast','assists']);let threes=getNum(['3pt','3pm','3p','threepointfieldgoalsmade']);if(!Number.isFinite(threes)){let idx=labels.findIndex(l=>v72Normalize(l).startsWith('3pt'));if(idx>=0)threes=Number(String(raw[idx]||'').split('-')[0]);}
 if(Number.isFinite(pts)&&Number.isFinite(min)&&min>0)rows.push({id:String(a.id||a.displayName),name:a.displayName||a.fullName||'Player',min,pts,reb:Number.isFinite(reb)?reb:0,ast:Number.isFinite(ast)?ast:0,threes:Number.isFinite(threes)?threes:0});
 }}}return rows}
async function v72NBAHistory(team,event){let cutoff=new Date(event.date).getTime();let season=new Date(event.date).getFullYear();let sched=await get(root+'basketball/nba/teams/'+encodeURIComponent(team.id)+'/schedule?season='+season+'&limit=250');let games=(sched.events||[]).filter(e=>new Date(e.date).getTime()<cutoff&&(e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,12);let data=await Promise.allSettled(games.map(g=>get(root+'basketball/nba/summary?event='+encodeURIComponent(g.id))));let logs=new Map();let good=0,opponentPoints=[];data.forEach((r,i)=>{if(r.status!=='fulfilled')return;let rows=v72ExtractNBA(r.value,team.id);if(!rows.length)return;good++;const cs=r.value.header?.competitions?.[0]?.competitors||r.value.boxscore?.teams||[];const opponent=cs.find(x=>String(x.team?.id)!==String(team.id));const conceded=Number(opponent?.score?.value??opponent?.score);if(Number.isFinite(conceded))opponentPoints.push(conceded);rows.forEach(p=>{let a=logs.get(p.id)||{id:p.id,name:p.name,team:team.displayName,logs:[]};a.logs.push({...p,date:games[i].date});logs.set(p.id,a)})});return {team:team.displayName,games:good,players:[...logs.values()],opponentPoints}}
function v72Thresholds(p){let out=[];let keys=[['pts','points',[5,10,15,20,25,30]],['reb','rebounds',[2,4,6,8,10]],['ast','assists',[2,4,6,8,10]],['threes','three-pointers',[1,2,3,4,5]],['pra','points + rebounds + assists',[10,15,20,25,30,35,40]]];let logs=p.logs.filter(x=>x.min>=8);if(logs.length<4)return out;let meanMin=logs.slice(0,5).reduce((a,b)=>a+b.min,0)/Math.min(5,logs.length);for(const [key,label,levels] of keys){for(const line of levels){let hits=logs.filter(x=>(key==='pra'?x.pts+x.reb+x.ast:x[key])>=line).length;let rate=hits/logs.length;let recent=logs.slice(0,5).filter(x=>(key==='pra'?x.pts+x.reb+x.ast:x[key])>=line).length/Math.min(5,logs.length);if(rate<.67||recent<.6)continue;out.push({player:p.name,id:p.id,team:p.team,line,label,rate,recent,n:logs.length,minutes:meanMin,score:.65*rate+.35*recent,logs})}}return out}
async function v72NBA(event,token,injuriesPromise){let box=document.getElementById('v72NBALegs');if(!box)return;let cs=event.competitions?.[0]?.competitors||[],teams=cs.map(c=>c.team).filter(Boolean);if(teams.length!==2){box.innerHTML=v72Card('🏀 NBA · Five player legs','<p class="desc">Teams unavailable.</p>');return}try{
 let all=await Promise.allSettled(teams.map(t=>v72NBAHistory(t,event)));if(token!==v72Token)return;let histories=all.filter(x=>x.status==='fulfilled').map(x=>x.value),players=histories.flatMap(x=>x.players),candidates=players.flatMap(v72Thresholds);let injury=await injuriesPromise;let blocked=new Set(),questionable=new Set();for(let t of injury||[])for(let x of t.entries){let status=x.status.toLowerCase();let name=v72Normalize(x.name);if(/out|injured reserve|inactive|suspend|doubtful/.test(status))blocked.add(name);if(/questionable|game.time decision|day.to.day/.test(status))questionable.add(name)}candidates=candidates.filter(c=>!blocked.has(v72Normalize(c.player))).sort((a,b)=>b.score-a.score||b.minutes-a.minutes);let chosen=[],used=new Set();for(let c of candidates){if(used.has(c.id))continue;chosen.push(c);used.add(c.id);if(chosen.length===5)break}
 let msg=histories.map(h=>h.team+': '+h.games+' verified box scores').join(' · ');let html='<p class="desc">'+escapeHtml(msg)+'</p>';
 if(chosen.length<5)html+='<p class="desc">Only '+chosen.length+' supported selections available. Five will not be invented.</p>';

 const oppByTeam=new Map(histories.map(h=>[h.team,h]));
 const fmt=x=>Number.isFinite(x)?x.toFixed(1):'—';
 html+=chosen.map((c,i)=>{
  const opp=histories.find(h=>h.team!==c.team);
  const recent=c.logs.slice(0,5),games=c.logs.length;
  const sum=k=>c.logs.reduce((n,l)=>n+(Number(l[k])||0),0);
  const statPairs=[['Games',games],['PTS/G',fmt(sum('pts')/games)],['REB/G',fmt(sum('reb')/games)],['AST/G',fmt(sum('ast')/games)],['3PM/G',fmt(sum('threes')/games)],['MIN/G',fmt(sum('min')/games)]];
  const chips=statPairs.map(([k,v])=>'<span class="v79-chip">'+escapeHtml(k)+'<b>'+escapeHtml(String(v))+'</b></span>').join('');
  const sample=opp?.opponentPoints||[];
  const allowed=sample.length?sample.reduce((a,b)=>a+b,0)/sample.length:NaN;
  const last=recent.map(l=>c.label==='points'?l.pts:c.label==='rebounds'?l.reb:c.label==='assists'?l.ast:c.label==='three-pointers'?l.threes:l.pts+l.reb+l.ast);
  const recentAvg=last.length?last.reduce((a,b)=>a+b,0)/last.length:NaN;
  const why='Against '+escapeHtml(opp?.team||'this opponent')+', the player has cleared '+c.line+'+ '+escapeHtml(c.label)+' in '+Math.round(c.rate*c.n)+' of '+c.n+' verified appearances. '+(Number.isFinite(recentAvg)?'Their last '+recent.length+' recorded games average '+fmt(recentAvg)+' '+escapeHtml(c.label)+'. ':'')+(Number.isFinite(allowed)?'The opponent scored '+fmt(allowed)+' points per game across '+sample.length+' sampled games (a team scoring indicator, not a verified defensive matchup). ':'')+'A favorable individual defender matchup is not established from these feeds; this is a form-based candidate, not a verified matchup edge.';
  return '<div class="leg v79-leg"><strong>'+(i+1)+'. '+escapeHtml(c.player)+' — '+c.line+'+ '+escapeHtml(c.label)+'</strong><div class="v79-meta">'+escapeHtml(c.team)+' · '+fmt(c.minutes)+' projected minutes proxy <span class="v79-hit">'+Math.round(c.rate*c.n)+'/'+c.n+' hits</span>'+(questionable.has(v72Normalize(c.player))?' · QUESTIONABLE':'')+'</div><div class="v79-stats">'+chips+'</div><details><summary>Matchup research</summary><p class="desc">'+why+'</p></details></div>';
 }).join('');

 if(!injury||injury.some(x=>!x.verified))html+='<p class="desc">Injury information is incomplete. Player availability must be checked before using these candidates.</p>';
 box.innerHTML=v72Card('🏀 NBA · Five game-specific player legs',html||'<p class="desc">Insufficient verified player data.</p>');
 }catch(err){if(token===v72Token)box.innerHTML=v72Card('🏀 NBA · Five player legs','<p class="desc">Could not verify enough recent player game logs: '+escapeHtml(err.message)+'</p>')}
}
const v72OriginalOpenGame=openGame;
openGame=function(e){if(!v73WithinWindow(e?.date)){return;}v72OriginalOpenGame(e);if(['tennis','ufc'].includes(sport))return;const token=++v72Token;let box=v72Container();box.innerHTML='<div id="v72Injuries"></div>'+(sport==='nba'?'<div id="v72NBALegs"></div>':'');document.getElementById('v72Injuries').innerHTML=v72Card('🏥 Match injury report','<p class="desc">Checking team reports…</p>');if(sport==='nba')document.getElementById('v72NBALegs').innerHTML=v72Card('🏀 NBA · Five player legs','<p class="desc">Loading recent verified player box scores…</p>');let injuries=v72Injuries(e,sport,token);if(sport==='nba')v72NBA(e,token,injuries)};

