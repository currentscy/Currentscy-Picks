
'use strict';
const sports={nfl:['🏈','NFL','football/nfl'],nba:['🏀','NBA','basketball/nba'],ncaa:['🏈','NCAA Football','football/college-football'],nhl:['🏒','NHL','hockey/nhl'],mlb:['⚾','MLB','baseball/mlb'],soccer:['⚽','Soccer','soccer/eng.1'],tennis:['🎾','Tennis','tennis/atp'],ufc:['🥊','UFC','mma/ufc']};
const tennisTours={'ATP':'atp','WTA':'wta'};let tennisTour='atp';
const soccerLeagues={'Premier League':'eng.1','La Liga':'esp.1','Serie A':'ita.1','Bundesliga':'ger.1','Ligue 1':'fra.1','Champions League':'uefa.champions','Europa League':'uefa.europa','MLS':'usa.1','Liga MX':'mex.1','Eredivisie':'ned.1','Primeira Liga':'por.1','EFL Championship':'eng.2'};
const $=id=>document.getElementById(id),root='https://site.api.espn.com/apis/site/v2/sports/';let sport='home',league='eng.1',events=[],chosen=null,cache=new Map();
function escapeHtml(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dateText(d){return new Date(d).toLocaleString('en-US',{timeZone:'America/Los_Angeles',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});}
function dateKey(d){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(d));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+p.month+p.day;}
function path(){return sport==='soccer'?'soccer/'+league:sports[sport][2]}
async function get(url){let res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('Data source returned HTTP '+res.status);return res.json()}
function base(){return root+path()+'/'}
function init(){ $('sports').innerHTML=Object.entries(sports).map(([k,v])=>`<button class="sport" data-sport="${k}"><em>${v[0]}</em>${v[1]}</button>`).join('');$('soccerLeague').innerHTML=Object.entries(soccerLeagues).map(([k,v])=>`<option value="${v}">${k}</option>`).join('');document.querySelectorAll('.sport').forEach(b=>b.onclick=()=>{sport=b.dataset.sport;document.body.dataset.sport=sport;document.body.dataset.league=league;showList();loadSchedule()});$('tennisTour').onchange=e=>{tennisTour=e.target.value;loadSchedule()};$('soccerLeague').onchange=e=>{league=e.target.value;document.body.dataset.league=league;loadSchedule()};$('refresh').onclick=loadSchedule;$('back').onclick=showList;$('simulate').onclick=analyze;$('homeLink').onclick=goHome;goHome()}
function goHome(){sport='home';document.body.dataset.sport='home';$('listing').classList.add('hidden');$('detail').classList.add('hidden');$('v59WeeklyPanel').classList.add('hidden');$('v66WeeklyPlayerPanel').classList.add('hidden');$('homeIntro').classList.remove('hidden');$('homeLink').classList.add('hidden');document.querySelectorAll('.sport').forEach(b=>b.classList.remove('active'));window.scrollTo(0,0)}
function showList(){$('homeIntro').classList.add('hidden');$('homeLink').classList.remove('hidden');$('v59WeeklyPanel').classList.toggle('hidden',!['nfl','ncaa'].includes(sport));$('v66WeeklyPlayerPanel').classList.add('hidden');$('v59WeeklyPanel').querySelector('h2').textContent=sport==='nfl'?'🏈 NFL · Top 5 weekly game winners':'🏈 NCAA · Top 5 weekly game winners';$('detail').classList.add('hidden');$('listing').classList.remove('hidden');document.querySelectorAll('.sport').forEach(b=>b.classList.toggle('active',b.dataset.sport===sport));$('heading').textContent=sports[sport][1]+' matchups';$('soccerChooser').classList.toggle('hidden',sport!=='soccer');$('tennisChooser').classList.toggle('hidden',sport!=='tennis')}
async function loadSchedule(){if(sport==='tennis')return loadTennisSchedule();if(sport==='mlb')return loadMLBSchedule();if(sport==='ufc')return loadUFCSchedule();showList();$('status').textContent='Loading real schedule…';$('games').innerHTML='';let key=path();try{let now=new Date(),all=[];let days=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];let keys=[...new Set(days.map(i=>{let d=new Date(now);d.setDate(d.getDate()+i);return dateKey(d)}))];let responses=await Promise.allSettled(keys.map(k=>get(base()+'scoreboard?dates='+k+'&limit=500'+(sport==='ncaa'?'&groups=80':''))));for(let r of responses)if(r.status==='fulfilled')all.push(...(r.value.events||[]));if(sport==='ncaa'&&!all.length){const fallback=await Promise.allSettled(keys.map(k=>get(base()+'scoreboard?dates='+k+'&limit=500')));for(const r of fallback)if(r.status==='fulfilled')all.push(...(r.value.events||[]));responses=responses.concat(fallback);}let seen=new Set();events=all.filter(e=>{if(seen.has(e.id)||!v73WithinWindow(e.date)||e.status?.type?.completed===true)return false;seen.add(e.id);return true}).sort((a,b)=>new Date(a.date)-new Date(b.date));if(!events.length){$('status').textContent='No fixtures returned for this date window. Try refreshing or another competition.';return}$('status').textContent=events.length+' games found · live source · '+responses.filter(r=>r.status==='fulfilled').length+'/'+responses.length+' date requests succeeded';$('games').innerHTML=events.map((e,i)=>{let dateLabel=new Date(e.date).toLocaleDateString('en-US',{timeZone:'America/Los_Angeles',weekday:'long',month:'short',day:'numeric'});let prev=i?dateKey(events[i-1].date):'';let heading=prev!==dateKey(e.date)?'<h3 class="v73DateHeading">'+escapeHtml(dateLabel)+'</h3>':'';let c=e.competitions?.[0]?.competitors||[],a=c.find(x=>x.homeAway==='away'),h=c.find(x=>x.homeAway==='home');return heading+`<button class="game" data-i="${i}"><span><strong>${escapeHtml(a?.team?.displayName||e.shortName||'Away')} vs ${escapeHtml(h?.team?.displayName||'Home')}</strong><small>${escapeHtml(dateText(e.date))} · ${escapeHtml(e.status?.type?.description||'Scheduled')}</small></span><span style="color:var(--a)">›</span></button>`}).join('');document.querySelectorAll('.game').forEach(b=>b.onclick=()=>openGame(events[+b.dataset.i]));if(['nfl','ncaa'].includes(sport)){v66UpdateWeeklyGames();v68WeeklyWinners();}}catch(e){$('status').innerHTML='<span class="err">Schedule connection failed: '+escapeHtml(e.message)+'</span><p>ESPN may block browser access or this league endpoint may not be available.</p>'}}
function openGame(e){if(sport==='mlb')return openMLBGame(e);if(sport==='ufc')return openUFCEvent(e);if(sport==='tennis')return openTennisGame(e);chosen=e;$('v59WeeklyPanel').classList.add('hidden');$('v66WeeklyPlayerPanel').classList.add('hidden');if(document.getElementById('v64NflFive'))document.getElementById('v64NflFive').innerHTML='';$('listing').classList.add('hidden');$('detail').classList.remove('hidden');let c=e.competitions?.[0]?.competitors||[],a=c.find(x=>x.homeAway==='away'),h=c.find(x=>x.homeAway==='home');$('matchTitle').textContent=(a?.team?.displayName||'Away')+' vs '+(h?.team?.displayName||'Home');$('matchDate').textContent=dateText(e.date)+' · '+sports[sport][1];$('results').innerHTML='';$('v63BoxScore').innerHTML='';if(sport==='ncaa'||sport==='nfl'){const node=document.getElementById('v68NcaaFive');if(node){node.innerHTML='<div class="panel"><h2>Game-specific five-leg player research</h2><p class="desc">Loading available game logs…</p></div>';v66BuildFiveLegs(c,e,sport==='ncaa'?'college-football':'nfl',node);}}else{const node=document.getElementById('v68NcaaFive');if(node)node.innerHTML='';}if(sport==='nba')v63LoadBoxScores();$('simulate').classList.add('hidden');$('simulate').textContent=['nfl','ncaa'].includes(sport)?'Run 100,000 football team trials':sport==='nba'?'Run 100,000 NBA team trials':sport==='nhl'?'Run 100,000 NHL trials':'Run 100,000 match simulations';$('dataStatus').textContent=sport==='nfl'?'': ['nfl','ncaa','nba'].includes(sport)?'Load recent completed team scores and run 100,000 exploratory matchup trials. Player availability is not verified.':sport==='nhl'?'NHL: load completed team results and simulate regulation scoring. No unverified player statistics.':sport==='soccer'?'SOCCER: load actual completed match scores for both clubs in this competition and run 100,000 goal-model trials. Lineups, player matchups and injuries are not yet incorporated.':'Live schedule connected where supported. '+sports[sport][1]+' simulation is not implemented yet; no invented projections will be shown.';window.scrollTo(0,0);const selected=e;setTimeout(()=>{if(chosen===selected)analyze().catch(err=>{$('results').innerHTML='<div class="panel err">Analysis unavailable: '+escapeHtml(err.message)+'</div>'})},0)}
function teamIds(){let c=chosen?.competitions?.[0]?.competitors||[];return [c.find(x=>x.homeAway==='away'),c.find(x=>x.homeAway==='home')]}
function parseSummary(summary,teamId,teamName){let result=[];for(let group of summary.boxscore?.players||[]){if(String(group.team?.id)!==String(teamId))continue;for(let section of group.statistics||[]){let labels=section.labels||[],keys=section.keys||[];for(let entry of section.athletes||[]){let athlete=entry.athlete||{},stats=entry.stats||[],record={id:String(athlete.id||athlete.displayName),name:athlete.displayName||'Unknown',position:athlete.position?.abbreviation||'',team:teamName,category:section.name||'',values:{}};labels.forEach((label,i)=>record.values[label]=stats[i]);keys.forEach((label,i)=>record.values[label]=stats[i]);result.push(record)}}}return result}
function num(v){let n=Number(v);return Number.isFinite(n)?n:0}
function value(r,aliases){for(let a of aliases)if(r.values[a]!==undefined)return r.values[a];return null}
function makeStats(rows){let map=new Map();for(let r of rows){let id=r.id,player=map.get(id)||{id,name:r.name,team:r.team,pos:r.position,pass:0,rush:0,rec:0,receptions:0,targets:0,td:0,attempts:0};let cat=r.category.toLowerCase();if(cat.includes('pass')){player.pass=num(value(r,['YDS','passingYards','passingYds']));player.attempts=num(String(value(r,['C/ATT','completionsPassingAttempts'])||'').split('/')[1])}if(cat.includes('rush')){player.rush=num(value(r,['YDS','rushingYards','rushingYds']));player.td+=num(value(r,['TD','rushingTouchdowns']))}if(cat.includes('receiv')){player.rec=num(value(r,['YDS','receivingYards','receivingYds']));player.receptions=num(value(r,['REC','receptions']));player.targets=num(value(r,['TGTS','targets']));player.td+=num(value(r,['TD','receivingTouchdowns']))}map.set(id,player)}return [...map.values()]}
async function teamHistory(t){let id=t.team.id,name=t.team.displayName;let url=root+'football/'+(sport==='ncaa'?'college-football':'nfl')+'/teams/'+encodeURIComponent(id)+'/schedule?season='+new Date(chosen.date).getFullYear();let schedule=await get(url);let cutoff=new Date(chosen.date).getTime();let prior=(schedule.events||[]).filter(e=>new Date(e.date).getTime()<cutoff&&(e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,12);if(prior.length<2)throw Error('Only '+prior.length+' completed recent games available for '+name);let fetched=await Promise.allSettled(prior.map(async e=>{let data=await get(root+'football/'+(sport==='ncaa'?'college-football':'nfl')+'/summary?event='+e.id);return {event:e,players:makeStats(parseSummary(data,id,name)),box:data.boxscore}}));let good=fetched.filter(x=>x.status==='fulfilled').map(x=>x.value);if(good.length<2)throw Error('Not enough completed box scores returned for '+name);return {id,name,games:good}}
function pool(history){let m=new Map();history.games.forEach((g,i)=>g.players.forEach(p=>{if(!['QB','RB','FB','WR','TE'].includes((p.pos||'').toUpperCase())){if(p.pass>0)p.pos='QB';else if(p.rush>0)p.pos='RB';else if(p.rec>0||p.receptions>0)p.pos='WR/TE';else return;}if(!(p.pass>0||p.rush>0||p.rec>0||p.receptions>0||p.attempts>0||p.targets>0))return;let a=m.get(p.id)||{...p,logs:[],weight:0};a.logs.push({...p,game:g.event.id,recency:i});a.weight++;m.set(p.id,a)}));return [...m.values()].filter(p=>p.logs.some(l=>l.pass>0||l.rush>0||l.rec>0||l.receptions>0)).sort((a,b)=>b.logs.reduce((s,g)=>s+g.pass+g.rush+g.rec,0)-a.logs.reduce((s,g)=>s+g.pass+g.rush+g.rec,0))}
function quantile(arr,q){let a=[...arr].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(q*(a.length-1)))]}
function sample(logs){let total=0,weights=[];for(let l of logs){let w=Math.pow(.82,l.recency);total+=w;weights.push(total)}let r=Math.random()*total;return logs[weights.findIndex(w=>r<=w)]||logs[0]}
function makeCandidates(players){let out=[];for(let p of players){for(let [key,label,step] of [['pass','passing yards',25],['rush','rushing yards',10],['rec','receiving yards',10],['receptions','receptions',1]]){let values=p.logs.map(x=>x[key]);let median=quantile(values,.5);if(median<(key==='pass'?80:key==='receptions'?2:15))continue;let line=Math.max(0,Math.floor(median/step)*step-step/2);out.push({id:p.id+'-'+key,key,name:p.name,team:p.team,label,line,hit:0,vals:[],player:p})}}return out}

async function nhlHistory(competitor){
 const team=competitor?.team||{},abbr=String(team.abbreviation||'').toUpperCase(),id=String(team.id||'');
 if(!abbr&&!id)throw Error('NHL team identifier missing');
 const cutoff=new Date(chosen.date).getTime(),d=new Date(chosen.date),yr=d.getUTCFullYear(),season=yr-(d.getUTCMonth()<8?1:0);
 const urls=[
  'https://api-web.nhle.com/v1/club-schedule-season/'+encodeURIComponent(abbr)+'/'+season+(season+1),
  root+'hockey/nhl/teams/'+encodeURIComponent(id)+'/schedule?season='+yr+'&limit=200',
  root+'hockey/nhl/teams/'+encodeURIComponent(id)+'/schedule?season='+(yr-1)+'&limit=200'
 ];
 const fetched=await Promise.allSettled(urls.map(get)),games=[],seen=new Set(),diagnostics=[];
 const score=c=>{const v=c?.score;const raw=typeof v==='object'?(v?.value??v?.displayValue):v;return raw===null||raw===undefined||raw===''?NaN:Number(raw)};
 const add=(key,date,own,against,source)=>{
  const t=new Date(date).getTime(),x=Number(own),y=Number(against);
  if(!Number.isFinite(t)||t>=cutoff||!Number.isFinite(x)||!Number.isFinite(y)||seen.has(key))return false;
  seen.add(key);games.push({own:x,against:y,date:t,source,gameId:String(key).startsWith('nhl-')?String(key).slice(4):null,espnId:String(key).startsWith('espn-')?String(key).slice(5):null});return true;
 };
 fetched.forEach((r,i)=>{
  if(r.status!=='fulfilled'){diagnostics.push('Source '+(i+1)+' fetch failed: '+String(r.reason?.message||r.reason));return}
  const arr=r.value.games||r.value.events||[];let matched=0,completed=0,scored=0;
  for(const g of arr){
   if(i===0){
    const home=String(g.homeTeam?.abbrev||'').toUpperCase()===abbr,away=String(g.awayTeam?.abbrev||'').toUpperCase()===abbr;
    if(!home&&!away)continue;matched++;
    const final=['OFF','FINAL'].includes(String(g.gameState||'').toUpperCase());
    if(!final)continue;completed++;
    if(add('nhl-'+g.id,g.startTimeUTC||g.gameDate,home?g.homeTeam?.score:g.awayTeam?.score,home?g.awayTeam?.score:g.homeTeam?.score,'NHL'))scored++;
   }else{
    const cs=g.competitions?.[0]?.competitors||[];
    const mine=cs.find(c=>String(c.team?.id)===id||String(c.team?.abbreviation||'').toUpperCase()===abbr);
    const opp=cs.find(c=>c!==mine);
    if(!mine||!opp)continue;matched++;
    const status=g.competitions?.[0]?.status?.type||g.status?.type||{};
    // Some ESPN team schedule records mark completion only at the competition level.
    const final=status.completed===true||String(status.name||'').toUpperCase()==='STATUS_FINAL'||String(status.state||'').toLowerCase()==='post';
    if(!final)continue;completed++;
    if(add('espn-'+g.id,g.date,score(mine),score(opp),'ESPN'))scored++;
   }
  }
  diagnostics.push('Source '+(i+1)+': '+arr.length+' entries, '+matched+' team matches, '+completed+' final, '+scored+' usable');
 });
 games.sort((a,b)=>b.date-a.date);
 return {name:team.displayName||abbr,abbr,id,games:games.slice(0,15),diagnostics};
}


async function nhlPlayerReports(teamData){
 const records=new Map(),diagnostics=[];
 let boxscores=0;
 function put(id,name,pos,values,goalie){
  if(!id)return;
  const item=records.get(String(id))||{name:name||'Player '+id,pos:pos||'',logs:[]};
  item.logs.push({...values,goalie});
  records.set(String(id),item);
 }
 const ids=teamData.games.slice(0,15);
 const requests=ids.map(g=>{
  if(g.gameId)return {source:'NHL',id:g.gameId,url:'https://api-web.nhle.com/v1/gamecenter/'+encodeURIComponent(g.gameId)+'/boxscore'};
  if(g.espnId)return {source:'ESPN',id:g.espnId,url:root+'hockey/nhl/summary?event='+encodeURIComponent(g.espnId)};
  return null;
 }).filter(Boolean);
 const fetched=await Promise.allSettled(requests.map(r=>get(r.url)));
 for(let i=0;i<fetched.length;i++){
  const r=fetched[i],req=requests[i];
  if(r.status!=='fulfilled'){diagnostics.push(req.source+' '+req.id+': '+String(r.reason?.message||r.reason));continue}
  const d=r.value;let count=0;
  if(req.source==='NHL'){
   const home=String(d.homeTeam?.abbrev||'').toUpperCase()===teamData.abbr;
   const away=String(d.awayTeam?.abbrev||'').toUpperCase()===teamData.abbr;
   const stats=d.playerByGameStats?.[home?'homeTeam':'awayTeam'];
   if(home||away){
    for(const p of [...(stats?.forwards||[]),...(stats?.defense||[]),...(stats?.goalies||[])]){
     const goalie=(stats?.goalies||[]).includes(p);
     const num=x=>x===undefined||x===null||x===''?NaN:Number(x);
     const name=typeof p.name==='object'?p.name.default:p.name;
     put(p.playerId,name,p.position,{
      goals:num(p.goals),assists:num(p.assists),points:num(p.points),
      shots:num(p.sog??p.shots),saves:num(p.saves)
     },goalie);count++;
    }
   }
  }else{
   // ESPN boxscore.players[].statistics[] includes per-player categories with labels
   // and athletes[].stats in the same order.
   const blocks=d.boxscore?.players||[];
   for(const block of blocks){
    const tid=String(block.team?.id||'');
    const tabbr=String(block.team?.abbreviation||'').toUpperCase();
    if(tid!==String(teamData.id)&&tabbr!==teamData.abbr)continue;
    for(const category of block.statistics||[]){
     const labels=(category.labels||category.names||[]).map(x=>String(x).toLowerCase().replace(/[^a-z0-9]/g,''));
     const goalie=/goal/i.test(category.name||category.type||category.displayName||'');
     for(const entry of category.athletes||[]){
      const ath=entry.athlete||{};
      const raw=entry.stats||[];
      const lookup=(aliases)=>{
       let index=labels.findIndex(x=>aliases.includes(x));
       if(index<0)return NaN;
       const v=raw[index];return v==null||v===''?NaN:Number(String(v).replace(/,/g,''));
      };
      put(ath.id,ath.displayName||ath.fullName,ath.position?.abbreviation,{
       goals:lookup(['g','goals']),assists:lookup(['a','assists']),
       points:lookup(['pts','points']),shots:lookup(['sog','shotsongoal','shots']),
       saves:lookup(['sv','saves'])
      },goalie||/^(g|goalie)$/i.test(ath.position?.abbreviation||''));count++;
     }
    }
   }
  }
  if(count)boxscores++;
  else diagnostics.push(req.source+' '+req.id+': response contained no matched player rows');
 }
 return {players:[...records.values()],boxscores,attempted:requests.length,diagnostics:diagnostics.slice(0,4)};
}

function nhlPropsPanel(a,h,ar,hr){
 const teams=[{team:a,report:ar},{team:h,report:hr}],sections=[];
 for(const {team,report} of teams){
  const skaters=report.players.filter(p=>!p.logs[0]?.goalie&&p.logs.length>=3);
  const goalies=report.players.filter(p=>p.logs[0]?.goalie&&p.logs.length>=2);
  const avg=(v,k)=>{const nums=v.map(x=>x[k]).filter(Number.isFinite);return nums.length?nums.reduce((n,x)=>n+x,0)/nums.length:0};
  const row=(p,metric,threshold,description)=>{
   const logs=p.logs.filter(x=>Number.isFinite(x[metric]));if(!logs.length)return '';
   const hits=logs.filter(x=>x[metric]>=threshold).length;
   return '<div class="leg"><strong>'+escapeHtml(p.name)+'</strong> · '+escapeHtml(description)+
   '<br><small>'+hits+'/'+logs.length+' recorded games ('+(100*hits/logs.length).toFixed(0)+'% historical frequency) · avg '+avg(logs,metric).toFixed(1)+'</small></div>';
  };
  const goals=skaters.filter(p=>p.logs.some(x=>Number.isFinite(x.goals))).slice().sort((x,y)=>avg(y.logs,'goals')-avg(x.logs,'goals')).slice(0,5);
  const assists=skaters.filter(p=>p.logs.some(x=>Number.isFinite(x.assists))).slice().sort((x,y)=>avg(y.logs,'assists')-avg(x.logs,'assists')).slice(0,5);
  const points=skaters.filter(p=>p.logs.some(x=>Number.isFinite(x.points))).slice().sort((x,y)=>avg(y.logs,'points')-avg(x.logs,'points')).slice(0,5);
  const shots=skaters.filter(p=>p.logs.some(x=>Number.isFinite(x.shots))).sort((x,y)=>avg(y.logs.filter(x=>Number.isFinite(x.shots)),'shots')-avg(x.logs.filter(x=>Number.isFinite(x.shots)),'shots')).slice(0,5);
  const saves=goalies.filter(p=>p.logs.some(x=>Number.isFinite(x.saves)));
  sections.push('<div class="panel"><h2>'+escapeHtml(team.name)+' · player research</h2><p class="desc">'+report.boxscores+' usable NHL/ESPN box scores out of '+report.attempted+' attempted. Historical frequencies are not betting prices or calibrated predictions. Players are not confirmed starters.</p>'+
    '<h3>Anytime goalscorer · 1+ goals</h3>'+(goals.map(p=>row(p,'goals',1,'1+ goals')).join('')||'<p class="desc">Not enough skater box scores.</p>')+
    '<h3>Assists · 1+</h3>'+(assists.map(p=>row(p,'assists',1,'1+ assists')).join('')||'<p class="desc">Unavailable</p>')+
    '<h3>Points · 1+</h3>'+(points.map(p=>row(p,'points',1,'1+ points')).join('')||'<p class="desc">Unavailable</p>')+
    '<h3>Shots on goal · 2+</h3>'+(shots.map(p=>row(p,'shots',2,'2+ shots on goal')).join('')||'<p class="desc">Unavailable</p>')+
    '<h3>Goalie saves · 20+</h3>'+(saves.map(p=>row(p,'saves',20,'20+ saves')).join('')||'<p class="desc">Unavailable</p>')+
    '<p class="desc">'+(report.boxscores===0?'Diagnostic: '+escapeHtml(report.diagnostics.join('; ')||'No match identifiers in historical records')+'. ':'')+'First goalscorer is not estimated: box scores alone do not establish who scored first. Starting goalies, injuries, opponents, and expected ice time are not verified.</p></div>');
 }
 return '<div class="panel"><h2>NHL player props & tactical evaluation</h2><p class="desc">The categories match your reference: goalscorer, assists, points and goalie saves, plus shots on goal. These are observed historical results, not Kalshi market percentages. Opponent-specific tactical evaluation requires validated lineups, goalie starts and matchup data.</p></div>'+sections.join('');
}
function nhlPoisson(lambda){
 let limit=Math.exp(-Math.min(12,lambda)),p=1,k=0;
 do{k++;p*=Math.random()}while(p>limit&&k<25);
 return k-1;
}
async function analyzeNHL(){
 if(!chosen||sport!=='nhl')return;
 const btn=$('simulate');btn.disabled=true;btn.textContent='Loading completed NHL results…';
 $('results').innerHTML='<div class="panel">Checking historical NHL scores for both teams…</div>';
 try{
  const [away,home]=teamIds();
  const [a,h]=await Promise.all([nhlHistory(away),nhlHistory(home)]);
  if(a.games.length<5||h.games.length<5)throw Error('Found '+a.games.length+' / '+h.games.length+' usable completed games (away/home); need at least five each. Data sources: '+a.diagnostics.join('; ')+' | '+h.diagnostics.join('; '));
  const [ar,hr]=await Promise.all([nhlPlayerReports(a),nhlPlayerReports(h)]);
  const mean=(v,k)=>v.reduce((n,x)=>n+x[k],0)/v.length;
  const la=Math.max(.2,Math.min(7,(mean(a.games,'own')+mean(h.games,'against'))/2));
  const lh=Math.max(.2,Math.min(7,(mean(h.games,'own')+mean(a.games,'against'))/2));
  const N=100000;let aw=0,hw=0,tie=0,over45=0,over55=0,btts=0;
  const scores=new Map();let total=0;
  for(let i=0;i<N;i++){
   let x=nhlPoisson(la),y=nhlPoisson(lh);total+=x+y;
   if(x>y)aw++;else if(y>x)hw++;else tie++;
   if(x+y>4.5)over45++;if(x+y>5.5)over55++;if(x>0&&y>0)btts++;
   let k=x+'–'+y;scores.set(k,(scores.get(k)||0)+1);
  }
  const pct=n=>(100*n/N).toFixed(1)+'%';
  const top=[...scores].sort((x,y)=>y[1]-x[1]).slice(0,5);
  $('dataStatus').textContent='NHL historical scores · '+a.games.length+' / '+h.games.length+' historical completed games · regulation-only experimental model.';
  const best=aw>=hw?a:h;
  const bestRate=Math.max(aw,hw);
  const bestScore=top[0][0];
  const candidates=[{team:a,report:ar},{team:h,report:hr}].flatMap(({team,report})=>
    report.players.filter(p=>!p.logs[0]?.goalie&&p.logs.length>=5).flatMap(p=>{
      const metrics=[['goals',1,'to score a goal'],['assists',1,'to record an assist'],['points',1,'to record a point'],['shots',2,'to record 2+ shots on goal']];
      return metrics.map(([key,line,label])=>{
        const logs=p.logs.filter(x=>Number.isFinite(x[key]));
        if(logs.length<5)return null;
        const rate=logs.filter(x=>x[key]>=line).length/logs.length;
        return {name:p.name,team:team.name,label,rate,games:logs.length};
      }).filter(Boolean);
    })
  ).sort((x,y)=>y.rate-x.rate);
  const picks=[];for(const c of candidates){if(picks.every(x=>x.name!==c.name))picks.push(c);if(picks.length===3)break}
  $('dataStatus').textContent='NHL matchup projection · '+a.games.length+' / '+h.games.length+' completed games; player research '+ar.boxscores+' / '+hr.boxscores+' usable box scores.';
  $('results').innerHTML='<div class="panel"><h2>Most likely game outcomes</h2><div class="grid">'+
    '<div class="tile"><small>Regulation edge</small><b style="font-size:20px">'+escapeHtml(best.name)+'</b><small>'+pct(bestRate)+' simulated regulation wins</small></div>'+
    '<div class="tile"><small>Most frequent score</small><b>'+escapeHtml(bestScore)+'</b><small>'+escapeHtml(a.name)+' – '+escapeHtml(h.name)+' · '+pct(top[0][1])+' of trials</small></div>'+
    '<div class="tile"><small>Expected total goals</small><b>'+(total/N).toFixed(1)+'</b><small>Over 4.5: '+pct(over45)+' · Over 5.5: '+pct(over55)+'</small></div>'+
    '<div class="tile"><small>Regulation tie</small><b>'+pct(tie)+'</b></div></div>'+
    '<h3>Three player outcomes to watch</h3>'+
    (picks.length?picks.map(c=>'<div class="leg"><strong>'+escapeHtml(c.name)+'</strong> · '+escapeHtml(c.label)+'<br><small>'+escapeHtml(c.team)+' · '+Math.round(c.rate*100)+'% in '+c.games+' recorded games</small></div>').join(''):'<p class="desc">Player box scores unavailable; no player outcomes estimated.</p>')+
    '<h3>Matchup outlook</h3><p class="desc">'+escapeHtml(best.name)+' has the higher regulation-win frequency in this simplified scoring model. The leading exact score is '+escapeHtml(bestScore)+', but no individual scoreline is highly likely. The player outcomes above are recent historical frequencies, not matchup-adjusted simulations.</p>'+
    '<p class="desc">Based on 100,000 experimental Poisson trials using completed final scores, which can include overtime or shootout results. Starting goalies, injuries, lines and tactical matchups are not verified. No calibrated probability or guaranteed result is implied.</p></div>';
 }catch(e){$('results').innerHTML='<div class="panel err">NHL analysis unavailable: '+escapeHtml(e.message)+'. No invented data will be shown.</div>'}
 finally{btn.disabled=false;btn.textContent='Re-run 100,000 NHL trials'}
}

// V61: Restore useful NFL team simulation using completed game scores.
// This is a historical bootstrap, NOT a calibrated matchup forecast.
async function v61TeamScores(t,cutoff){
 const id=t?.team?.id,name=t?.team?.displayName||'Team';
 if(!id)throw Error('Missing NFL team identifier');
 const year=new Date(chosen.date).getFullYear();
 const schedule=await get(root+'football/nfl/teams/'+encodeURIComponent(id)+'/schedule?season='+year);
 const prior=(schedule.events||[]).filter(e=>new Date(e.date).getTime()<cutoff&&(e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,12);
 const scores=[];
 for(const e of prior){const cs=e.competitions?.[0]?.competitors||[];
  const self=cs.find(c=>String(c.team?.id)===String(id));const opp=cs.find(c=>String(c.team?.id)!==String(id));
  const parse=c=>{const raw=c?.score?.displayValue??c?.score;return raw===null||raw===undefined||raw===''?NaN:Number(raw)};
  const scored=parse(self),allowed=parse(opp);
  if(Number.isFinite(scored)&&Number.isFinite(allowed))scores.push({scored,allowed,date:e.date,opponent:opp?.team?.displayName||'Opponent'});
 }
 if(scores.length<3)throw Error(name+': only '+scores.length+' completed games with scores. Need at least three.');
 return {id,name,scores};
}
async function v62TeamHistory(comp,league,cutoff){
 const id=comp?.team?.id,name=comp?.team?.displayName||'Team';if(!id)throw Error('Missing verified team ID');
 const url=root+league+'/teams/'+encodeURIComponent(id)+'/schedule?season=' + new Date(chosen.date).getFullYear();
 let data=await get(url);let ev=data.events||[];let scores=[];
 for(const e of ev){const date=Date.parse(e.date);if(!Number.isFinite(date)||date>=cutoff||e.status?.type?.completed!==true)continue;
 const cs=e.competitions?.[0]?.competitors||[];let me=cs.find(c=>String(c.team?.id)===String(id)),opp=cs.find(c=>String(c.team?.id)!==String(id));
 const pts=c=>Number(c?.score?.value??c?.score?.displayValue??c?.score);if(!me||!opp||!Number.isFinite(pts(me))||!Number.isFinite(pts(opp)))continue;
 scores.push({scored:pts(me),allowed:pts(opp),opponent:opp.team?.displayName||'Opponent',date});
 }
 scores.sort((a,b)=>b.date-a.date);scores=scores.slice(0,10);
 if(scores.length<3)throw Error(name+' has only '+scores.length+' verified recent completed games (minimum 3)');
 return {name,scores};
}

async function v63EspnBoxScore(eventId,context){
 const id=eventId||chosen?.id;if(!id)return '<div class="panel"><h2>Player box scores</h2><p class="desc">Game ID unavailable.</p></div>';
 const league=sport==='nba'?'basketball/nba':'football/nfl';
 try{
 const data=await get(root+league+'/summary?event='+encodeURIComponent(id));
 const groups=data.boxscore?.players||[];
 if(!groups.length)return '<div class="panel"><h2>ESPN player box scores</h2><p class="desc">No completed-game player box scores are available for this matchup yet. Upcoming-game starters and individual statistics are not verified.</p></div>';
 const panels=groups.map(group=>{
 const team=group.team?.displayName||group.team?.name||'Team';
 const categories=(group.statistics||[]).slice(0,5).map(cat=>{
 const labels=cat.labels||cat.names||[];
 const rows=(cat.athletes||[]).filter(a=>a.athlete?.displayName&&a.stats?.length).slice(0,18);
 if(!rows.length)return '';
 const cols=labels.slice(0,8);
 return '<h3>'+escapeHtml(cat.name||cat.type||'Players')+'</h3><div class="v63-table-wrap"><table class="v63-table"><thead><tr><th>Player</th>'+cols.map(l=>'<th>'+escapeHtml(l)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(a=>'<tr><td>'+escapeHtml(a.athlete.displayName)+'</td>'+cols.map((_,i)=>'<td>'+escapeHtml(a.stats[i]??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 }).join('');
 return '<div class="v63-team"><h3>'+escapeHtml(team)+'</h3>'+categories+'</div>';
 }).join('');
 return '<div class="panel"><h2>ESPN · '+escapeHtml(context||'Game')+' box scores</h2><p class="desc">Game-specific recorded player statistics only. These are not forecasts and do not confirm next-game starters or availability.</p>'+panels+'</div>';
 }catch(e){return '<div class="panel"><h2>ESPN player box scores</h2><p class="desc">ESPN summary unavailable: '+escapeHtml(e.message)+'. Team trials can still run separately.</p></div>'}
}
// V64: recover recent completed NFL/NBA games via ESPN scoreboard windows.
// Team schedule responses can omit events or return HTTP 400, so don't depend on them alone.
async function v64RecentGames(team,league,cutoff,limit=4){
 const teamId=String(team?.team?.id||''),abbr=String(team?.team?.abbreviation||'').toUpperCase();
 if(!teamId)throw Error('Missing team ID');
 const found=new Map(),errors=[];
 const add=e=>{
  const when=Date.parse(e?.date),cs=e?.competitions?.[0]?.competitors||[];
  const mine=cs.find(c=>String(c.team?.id)===teamId||(abbr&&String(c.team?.abbreviation||'').toUpperCase()===abbr));
  const completed=e?.status?.type?.completed===true||e?.competitions?.[0]?.status?.type?.completed===true;
  if(mine&&completed&&Number.isFinite(when)&&when<cutoff&&e.id)found.set(String(e.id),e);
 };
 // Fast path: the existing team schedule feed, when available.
 try{const d=await get(root+league+'/teams/'+encodeURIComponent(teamId)+'/schedule?season='+new Date(cutoff).getUTCFullYear()+'&limit=150');
  (d.events||[]).forEach(add);
 }catch(e){errors.push('team schedule: '+e.message)}
 // Independent fallback: ESPN scoreboards in 10-day windows, up to 50 days before kickoff.
 if(found.size<limit){
  for(let days=0;days<50&&found.size<limit;days+=10){
   const end=new Date(cutoff-1-days*86400000),begin=new Date(end.getTime()-9*86400000);
   const fmt=d=>d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0');
   try{const d=await get(root+league+'/scoreboard?dates='+fmt(begin)+'-'+fmt(end)+'&limit=250');(d.events||[]).forEach(add)}
   catch(e){errors.push('scoreboard '+days+': '+e.message)}
  }
 }
 return {games:[...found.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,limit),errors};
}
async function v66BuildFiveLegs(comp,game,league,anchor){
 if(!anchor)return;
 anchor.innerHTML='<div class="panel"><h2>🏈 Selected game · five-leg player research</h2><p class="desc">Checking verified ESPN box scores…</p></div>';
 try{
  const cutoff=Date.parse(game?.date),histories=await Promise.all(comp.map(c=>v64RecentGames(c,'football/'+league,cutoff,12)));
  const all=[];let failures=0;
  for(let i=0;i<comp.length;i++){
   const teamId=String(comp[i]?.team?.id||''),teamName=comp[i]?.team?.displayName||'Team';
   for(const game of histories[i].games){
    try{
     const data=await get(root+'football/'+league+'/summary?event='+encodeURIComponent(game.id));
     const group=(data.boxscore?.players||[]).find(g=>String(g.team?.id)===teamId);
     if(!group){failures++;continue}
     const observed=new Map();
     for(const cat of group.statistics||[]){
      const labels=(cat.labels||[]).map(x=>String(x).toUpperCase());
      const category=String(cat.name||cat.type||'').toLowerCase();
      const type=/pass/.test(category)?'passing':/rush/.test(category)?'rushing':/receiv/.test(category)?'receiving':null;
      if(!type)continue;
      for(const athlete of cat.athletes||[]){
       const id=athlete.athlete?.id,name=athlete.athlete?.displayName;
       if(!id||!name)continue;
       const pos=String(athlete.athlete?.position?.abbreviation||'').toUpperCase();
       if(pos&&!['QB','RB','FB','WR','TE'].includes(pos))continue;
       const values=athlete.stats||[],yi=labels.findIndex(x=>x==='YDS'||x==='YARDS');
       const ri=labels.findIndex(x=>x==='REC'||x==='RECEPTIONS');
       const ai=labels.findIndex(x=>x==='ATT'||x==='CAR'||x==='RUSH ATT');
       const ci=labels.findIndex(x=>x==='C/ATT'||x==='CMP/ATT'||x==='COMP/ATT');
       const ti=labels.findIndex(x=>x==='TGTS'||x==='TGT'||x==='TARGETS');
       const passPair=ci>=0?String(values[ci]).split('/').map(Number):[];
       const yards=yi>=0?Number(values[yi]):NaN;
       const receptions=ri>=0?Number(values[ri]):NaN;
       const record={id:String(id),name,team:teamName,pos,type,gameId:String(game.id),yards,receptions,attempts:ai>=0?Number(values[ai]):NaN,completions:passPair.length===2?passPair[0]:NaN,passAttempts:passPair.length===2?passPair[1]:NaN,targets:ti>=0?Number(values[ti]):NaN};
       observed.set(record.id+':'+type,record);
      }
     }
     all.push(...observed.values());
    }catch(e){failures++}
   }
  }
  // V78: merge every observed category per athlete/game, then use actual appearances.
  const playerGames=new Map();
  for(const row of all){
   const key=row.team+':'+row.id;
   let player=playerGames.get(key);
   if(!player){player={id:row.id,name:row.name,team:row.team,pos:row.pos,games:new Map()};playerGames.set(key,player)}
   if(row.pos)player.pos=row.pos;
   let g=player.games.get(row.gameId);
   if(!g){g={gameId:row.gameId,passing:0,rushing:0,receiving:0,receptions:0,passAttempts:0,completions:0,rushAttempts:0,targets:0,hasPassAttempts:false,hasCompletions:false,hasRushAttempts:false,hasTargets:false};player.games.set(row.gameId,g)}
   if(row.type==='passing'){
    if(Number.isFinite(row.yards))g.passing=row.yards;
    if(Number.isFinite(row.completions)){g.completions=row.completions;g.hasCompletions=true}
    if(Number.isFinite(row.passAttempts)){g.passAttempts=row.passAttempts;g.hasPassAttempts=true}
   }else if(row.type==='rushing'){
    if(Number.isFinite(row.yards))g.rushing=row.yards;
    if(Number.isFinite(row.attempts)){g.rushAttempts=row.attempts;g.hasRushAttempts=true}
   }else if(row.type==='receiving'){
    if(Number.isFinite(row.yards))g.receiving=row.yards;
    if(Number.isFinite(row.receptions))g.receptions=row.receptions;
    if(Number.isFinite(row.targets)){g.targets=row.targets;g.hasTargets=true}
   }
  }
  const eligible=[];
  for(const p of playerGames.values()){
   const games=[...p.games.values()];
   if(games.length<3)continue;
   const totals={games:games.length,passing:0,rushing:0,receiving:0,receptions:0,completions:0,passAttempts:0,rushAttempts:0,targets:0,hasPassAttempts:false,hasCompletions:false,hasRushAttempts:false,hasTargets:false};
   for(const g of games)for(const k of ['passing','rushing','receiving','receptions','completions','passAttempts','rushAttempts','targets'])totals[k]+=g[k];
   for(const k of ['hasPassAttempts','hasCompletions','hasRushAttempts','hasTargets'])totals[k]=games.some(g=>g[k]);
   const tests=p.pos==='QB'?[['125+ passing yards','passing',125]]:
     p.pos==='RB'||p.pos==='FB'?[['15+ rushing yards','rushing',15],['2+ receptions','receptions',2]]:
     [['10+ receiving yards','receiving',10],['2+ receptions','receptions',2]];
   for(const [label,field,threshold] of tests){
    const vals=games.map(g=>g[field]);
    const hits=vals.filter(x=>x>=threshold).length;
    eligible.push({...p,label,field,threshold,hits,count:vals.length,logs:games.map(g=>({[field]:g[field]})),average:vals.reduce((x,y)=>x+y,0)/vals.length,totals});
   }
  }
  // V2.1: named injuries + roster reserve designations, never assume missing means healthy.
  const injuryTeams=comp.map(c=>({id:String(c.team?.id||''),name:c.team?.displayName||'Unknown'}));
  const injuryRecords=window.CurrentscyInjuries
    ?await window.CurrentscyInjuries.load(injuryTeams):null;
  if(injuryRecords)window.CurrentscyInjuries.display(injuryRecords);
  const verified=eligible.map(p=>{
    const rec=injuryRecords&&[...injuryRecords.values()].find(x=>x.team.name===p.team);
    const availability=window.CurrentscyInjuries
      ?window.CurrentscyInjuries.availability(rec,p)
      :{status:'unverified',factor:0,reason:'injury integration unavailable'};
    return {...p,availability};
  }).filter(p=>p.availability.factor>0);
  // Penalize volatile workloads and small samples; no claim of calibrated probabilities.
  for(const p of verified){
   const vals=p.logs.map(l=>l[p.field]).filter(Number.isFinite);
   const avg=p.average;
   const variance=vals.reduce((sum,v)=>sum+(v-avg)**2,0)/vals.length;
   const cv=Math.sqrt(variance)/Math.max(1,Math.abs(avg));
   p.v76score=(p.hits+2)/(p.count+5)*Math.min(1,p.count/5)*Math.max(.35,1-.3*cv)*p.availability.factor;
  }
  verified.sort((a,b)=>b.v76score-a.v76score||b.count-a.count);
  const chosenLegs=[];
  for(const leg of verified){if(chosenLegs.some(x=>x.id===leg.id))continue;chosenLegs.push(leg);if(chosenLegs.length===5)break}
  // V99: identify the actual opposing team and measure its recent defensive results.
  // This is team-level evidence, NOT individual coverage or scheme tracking.
  const matchupTeams=comp.map(c=>({id:String(c.team?.id||''),name:c.team?.displayName||'Unknown'}));
  const defensiveEvidence=new Map();
  await Promise.all(matchupTeams.map(async team=>{
   const opponentComp=comp.find(c=>String(c.team?.id||'')===team.id);
   const samples=histories[comp.indexOf(opponentComp)]?.games?.slice(0,3)||[];
   const allowed=[];
   for(const past of samples){
    try{
     const box=await get(root+'football/'+league+'/summary?event='+encodeURIComponent(past.id));
     const teams=box.boxscore?.players||[];
     const other=teams.find(x=>String(x.team?.id||'')!==team.id);
     if(!other)continue;
     const metrics={passing:0,rushing:0,receiving:0},seen=new Set();
     for(const cat of other.statistics||[]){
      const category=String(cat.name||cat.type||'').toLowerCase();
      const type=/pass/.test(category)?'passing':/rush/.test(category)?'rushing':/receiv/.test(category)?'receiving':null;
      if(!type)continue;
      const labels=(cat.labels||[]).map(x=>String(x).toUpperCase());
      const yi=labels.findIndex(x=>x==='YDS'||x==='YARDS');
      if(yi<0)continue;
      for(const athlete of cat.athletes||[]){
       const id=String(athlete.athlete?.id||'');
       const key=id+':'+type;if(!id||seen.has(key))continue;
       const y=Number(athlete.stats?.[yi]);
       if(Number.isFinite(y)){metrics[type]+=y;seen.add(key)}
      }
     }
     if(seen.size)allowed.push(metrics);
    }catch(_){}
   }
   if(allowed.length>=2)defensiveEvidence.set(team.id,{n:allowed.length,
    passing:allowed.reduce((a,x)=>a+x.passing,0)/allowed.length,
    rushing:allowed.reduce((a,x)=>a+x.rushing,0)/allowed.length,
    receiving:allowed.reduce((a,x)=>a+x.receiving,0)/allowed.length});
  }));
  const cards=chosenLegs.map((c,i)=>{
   const t=c.totals;
   const stats=c.pos==='QB'?
    [['Pass yds',t.passing],['Completions',t.hasCompletions?t.completions:'—'],['Pass att',t.hasPassAttempts?t.passAttempts:'—'],['Rush yds',t.rushing]]:
    c.pos==='RB'||c.pos==='FB'?
    [['Rush yds',t.rushing],['Carries',t.hasRushAttempts?t.rushAttempts:'—'],['Receptions',t.receptions],['Rec yds',t.receiving]]:
    [['Rec yds',t.receiving],['Receptions',t.receptions],['Targets',t.hasTargets?t.targets:'—'],['Rush yds',t.rushing]];
   const chips=stats.map(([name,val])=>'<span class="v78-chip">'+escapeHtml(name)+': <b>'+escapeHtml(String(val))+'</b></span>').join('');
   return '<div class="v65leg v78-leg"><strong>'+(i+1)+'. '+escapeHtml(c.name)+' — '+escapeHtml(c.label)+'</strong><div class="v78-sub">'+escapeHtml(c.team)+' · '+escapeHtml(c.pos||'Player')+' · '+t.games+' verified games in sample</div><div class="v78-hit">'+c.hits+'/'+c.count+' hits · '+(100*c.hits/c.count).toFixed(0)+'% historical</div><div class="v78-stats">'+chips+'</div><details style="margin:10px 0;border:1px solid #495063;border-radius:8px;background:#22252d"><summary style="cursor:pointer;padding:10px 12px;color:#f0d69d;font-size:13px;font-weight:600">Why '+escapeHtml(c.name)+' could hit · Tap to expand</summary><div style="padding:0 12px 12px;color:#dce2eb;font-size:13px;line-height:1.5">'+escapeHtml(c.name)+' cleared '+escapeHtml(c.label)+' in '+c.hits+'/'+c.count+' recorded games'+(c.pos==='QB'?' while averaging '+(t.passing/t.games).toFixed(1)+' passing yards per game.':c.pos==='RB'||c.pos==='FB'?' while averaging '+(t.rushing/t.games).toFixed(1)+' rushing yards per game.':' while averaging '+(t.receiving/t.games).toFixed(1)+' receiving yards'+(t.hasTargets?' on '+(t.targets/t.games).toFixed(1)+' targets':'')+' per game.')+' Against '+escapeHtml((matchupTeams.find(x=>x.name!==c.team)||{}).name||'the opposing team')+', '+(function(){const opp=matchupTeams.find(x=>x.name!==c.team);const d=opp&&defensiveEvidence.get(opp.id);if(!d)return 'recent defensive allowance data could not be confirmed.';const key=c.field==='passing'?'passing':c.field==='rushing'?'rushing':'receiving';return 'opponents averaged '+d[key].toFixed(0)+' '+key+' yards in '+d.n+' sampled games; this is a team-level matchup signal, not a prediction.';})()+' Individual defender assignments and coverage scheme are not established by these box scores.</div></details><small>2026 totals from available completed ESPN box scores · stability '+(100*c.v76score).toFixed(0)+'/100 (not probability) · availability: '+escapeHtml(c.availability.status==='not-listed'?'not listed; unconfirmed':c.availability.reason)+'</small></div>';
  }).join('');
  anchor.innerHTML='<div class="panel"><h2>🏈 5 Leg Player Parlay</h2>'+cards+(chosenLegs.length<5?'<p>Only '+chosenLegs.length+' candidates passed the filters; five-leg selection withheld.</p>':'<p>Five candidates found, but final active status must be confirmed before selection.</p>')+'<small>Missing box-score reports: '+failures+'</small></div>';
 }catch(e){anchor.innerHTML='<div class="panel"><h2>🏈 Selected game · five-leg research</h2><p class="desc">Insufficient verified data: '+escapeHtml(e.message)+'</p></div>'}
}

async function v64NflFiveLegs(comp){return v66BuildFiveLegs(comp,chosen,'nfl',document.getElementById('v64NflFive'));}
async function v63LoadBoxScores(){
 if(!['nfl','nba'].includes(sport)||!chosen)return;
 const anchor=$('v63BoxScore');if(!anchor)return;
 anchor.innerHTML='<div class="panel"><h2>Recent ESPN player performance</h2><p class="desc">Loading completed box scores…</p></div>';
 const comp=chosen.competitions?.[0]?.competitors||[];
 const past=chosen.status?.type?.completed===true;
 if(past){anchor.innerHTML=await v63EspnBoxScore(chosen.id,'Completed game');return}
 const league=sport==='nba'?'basketball/nba':'football/nfl',cutoff=Date.parse(chosen.date);
 const panels=await Promise.all(comp.map(async c=>{
  const name=c.team?.displayName||'Team';
  try{
   const history=await v64RecentGames(c,league,cutoff,3);
   if(!history.games.length)return '<div class="panel"><h2>'+escapeHtml(name)+'</h2><p class="desc">No verified completed games found from ESPN schedule or scoreboard. '+escapeHtml(history.errors.slice(0,2).join('; '))+'</p></div>';
   const report=await v63EspnBoxScore(history.games[0].id,'Last completed game');
   return '<h3>'+escapeHtml(name)+' · '+escapeHtml(dateText(history.games[0].date))+'</h3>'+report;
  }catch(e){return '<div class="panel"><h2>'+escapeHtml(name)+'</h2><p class="desc">Recent player statistics unavailable: '+escapeHtml(e.message)+'</p></div>'}
 }));
 anchor.innerHTML='<div class="panel"><h2>Recent ESPN player performance</h2><p class="desc">Verified recorded box scores, not a confirmed lineup for the upcoming game.</p></div>'+panels.join('');
 
}
async function v62AnalyzeTeamSport(){
 const btn=$('simulate');btn.disabled=true;btn.textContent='Loading completed games…';$('results').innerHTML='<div class="panel">Checking both teams’ recent results…</div>';
 try{
 const [away,home]=teamIds();if(!away||!home)throw Error('Missing teams');
 const league=sport==='nba'?'basketball/nba':'football/college-football';
 const [a,h]=await Promise.all([v62TeamHistory(away,league,Date.parse(chosen.date)),v62TeamHistory(home,league,Date.parse(chosen.date))]);
 btn.textContent='Running 100,000 trials…';await new Promise(r=>setTimeout(r,20));
 let aw=0,hw=0,ties=0,at=0,ht=0;const N=100000;
 for(let i=0;i<N;i++){
 const aa=a.scores[Math.floor(Math.random()*a.scores.length)],hh=h.scores[Math.floor(Math.random()*h.scores.length)];
 const x=Math.max(0,Math.round((aa.scored+hh.allowed)/2)),y=Math.max(0,Math.round((hh.scored+aa.allowed)/2));
 at+=x;ht+=y;if(x>y)aw++;else if(y>x)hw++;else ties++;
 }
 const fmt=x=>(100*x/N).toFixed(1)+'%';
 $('dataStatus').textContent='Verified completed scores: '+a.scores.length+' '+a.name+' games, '+h.scores.length+' '+h.name+' games.';
 $('results').innerHTML='<div class="panel"><h2>'+escapeHtml(sports[sport][1])+' · 100,000 historical trials</h2><div class="grid"><div class="tile"><small>'+escapeHtml(a.name)+' trial win share</small><b>'+fmt(aw)+'</b></div><div class="tile"><small>'+escapeHtml(h.name)+' trial win share</small><b>'+fmt(hw)+'</b></div><div class="tile"><small>Average sampled score</small><b>'+(at/N).toFixed(1)+' – '+(ht/N).toFixed(1)+'</b></div><div class="tile"><small>Sampled ties</small><b>'+fmt(ties)+'</b></div></div><p class="desc">Exploratory score resampling, not calibrated win probabilities. Injuries, lineups, player-vs-player matchups and tactics are not verified. No player props are generated without current roster and availability checks.</p></div>'+
 '<div class="panel"><h2>Recent completed games</h2><div class="grid">'+[a,h].map(t=>'<div class="tile"><strong>'+escapeHtml(t.name)+'</strong><ul>'+t.scores.slice(0,5).map(g=>'<li>'+escapeHtml(g.opponent)+': '+g.scored+'–'+g.allowed+'</li>').join('')+'</ul></div>').join('')+'</div></div>';
 }catch(e){$('results').innerHTML='<div class="panel"><h2>Insufficient verified data</h2><p>'+escapeHtml(e.message)+'</p><p class="desc">No fabricated model percentages will be displayed.</p></div>'}
 finally{btn.disabled=false;btn.textContent='Run 100,000 '+sports[sport][1]+' team trials'}
}
// Injury adjustments use named, matched player history and reported availability.
// Heuristic sensitivity is NOT a backtested probability or a verified replacement model.
function nflInjuryEffect(history,record){
 const result={factor:1,details:[],unmatched:[],verified:!!record?.complete};
 if(!record?.complete||!record.players?.size)return result;
 const players=pool(history),games=history.games.length;
 const sum=(p,key)=>p.logs.reduce((n,l)=>n+(Number(l[key])||0),0);
 const totals={attempts:players.reduce((n,p)=>n+sum(p,'attempts'),0),targets:players.reduce((n,p)=>n+sum(p,'targets'),0),rush:players.reduce((n,p)=>n+sum(p,'rush'),0)};
 const normalize=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 let reduction=0;
 for(const injury of record.players.values()){
  const status=String(injury.status||'');
  if(!/\b(out|injured reserve|reserve\/injured|\bir\b|inactive|suspended|physically unable|\bpup\b|non.football injury|questionable|doubtful|game.time|limited)\b/i.test(status))continue;
  const player=players.find(p=>String(p.id)===String(injury.id)||normalize(p.name)===normalize(injury.name));
  if(!player){result.unmatched.push(injury.name);continue}
  // Historical offensive participation is a proxy for importance, not replacement-adjusted EPA.
  const passShare=totals.attempts>0?sum(player,'attempts')/totals.attempts:0;
  const targetShare=totals.targets>0?sum(player,'targets')/totals.targets:0;
  const rushShare=totals.rush>0?sum(player,'rush')/totals.rush:0;
  const participation=Math.max(passShare,targetShare,rushShare);
  const weight=Math.min(.11,participation*.12);
  const severity=/\b(questionable|game.time|limited)\b/i.test(status)?.35:/\bdoubtful\b/i.test(status)?.75:1;
  const impact=weight*severity;
  if(impact<.002)continue;
  reduction+=impact;
  result.details.push({name:injury.name,status,impact,participation});
 }
 result.factor=1-Math.min(.18,reduction);
 return result;
}
async function analyzeNFLTeams(){
 const btn=$('simulate');btn.disabled=true;btn.textContent='Loading NFL scores and injury reports…';
 $('results').innerHTML='<div class="panel">Checking completed games and named player availability…</div>';
 try{
  const [away,home]=teamIds();if(!away||!home)throw Error('Missing matchup team IDs');
  const cutoff=new Date(chosen.date).getTime();
  const teams=[{id:String(away.team.id),name:away.team.displayName},{id:String(home.team.id),name:home.team.displayName}];
  const injuries=window.CurrentscyInjuries;
  const [a,h,records,ah,hh]=await Promise.all([
   v61TeamScores(away,cutoff),v61TeamScores(home,cutoff),
   injuries?.load?injuries.load(teams).catch(()=>null):Promise.resolve(null),
   teamHistory(away).catch(()=>null),teamHistory(home).catch(()=>null)
  ]);
  const ae=ah?nflInjuryEffect(ah,records?.get(String(away.team.id))):{factor:1,details:[],unmatched:[],verified:false};
  const he=hh?nflInjuryEffect(hh,records?.get(String(home.team.id))):{factor:1,details:[],unmatched:[],verified:false};
  btn.textContent='Running 100,000 injury-adjusted trials…';await new Promise(r=>setTimeout(r,30));
  const trials=100000;let aw=0,hw=0,ties=0,at=0,ht=0;
  for(let i=0;i<trials;i++){
   const ar=a.scores[Math.floor(Math.random()*a.scores.length)],hr=h.scores[Math.floor(Math.random()*h.scores.length)];
   const as=Math.max(0,Math.round((ar.scored+hr.allowed)/2*ae.factor));
   const hs=Math.max(0,Math.round((hr.scored+ar.allowed)/2*he.factor));
   at+=as;ht+=hs;
   if(as>hs)aw++;else if(hs>as)hw++;else ties++;
  }
  const fmt=v=>(100*v/trials).toFixed(1)+'%';
  const mean=v=>(v/trials).toFixed(1);
  const detail=(team,e)=>{
   const rows=e.details.map(p=>'<li>'+escapeHtml(p.name)+' — '+escapeHtml(p.status)+' · modeled offense sensitivity '+(p.impact*100).toFixed(1)+'%</li>').join('');
   const unknown=e.unmatched.length?'<p class="desc">'+e.unmatched.length+' reported players could not be linked to prior offensive box scores; no numerical effect assigned.</p>':'';
   return '<details style="margin-top:12px"><summary>'+escapeHtml(team)+' · modeled offensive availability '+(e.factor*100).toFixed(1)+'%</summary>'+
    (rows?'<ul>'+rows+'</ul>':'<p class="desc">No matched injured offensive player with measurable historical usage.</p>')+
    unknown+(!e.verified?'<p class="desc">Injury evidence incomplete: baseline retained.</p>':'')+'</details>';
  };
  $('dataStatus').textContent='';
  $('results').innerHTML='<div class="panel"><h2>🏈 NFL matchup</h2><div class="grid"><div class="tile"><small>'+escapeHtml(a.name)+' · sampled win share</small><b>'+fmt(aw)+'</b></div><div class="tile"><small>'+escapeHtml(h.name)+' · sampled win share</small><b>'+fmt(hw)+'</b></div><div class="tile"><small>Average sampled score</small><b>'+mean(at)+' – '+mean(ht)+'</b></div><div class="tile"><small>Tie frequency</small><b>'+fmt(ties)+'</b></div></div>'+
   '<h3>Injury adjustment used in these trials</h3><p class="desc">Named injured offensive players are matched to prior box scores; passing attempts, targets and rushing production estimate their usage. OUT/IR receives the full heuristic adjustment; questionable receives 35%. Total offensive reduction is capped at 18%. Defensive injuries and replacement-player performance are not quantified without verified position-specific evidence.</p>'+
   detail(a.name,ae)+detail(h.name,he)+
   '<small>100,000 historical team-score resamples with experimental availability adjustments. Win shares are not calibrated predictions. Unverified injuries are not treated as healthy or assigned invented numerical impacts.</small></div>';
 }catch(e){$('results').innerHTML='<div class="panel err">NFL analysis unavailable: '+escapeHtml(e.message)+'. No scores or probabilities have been invented.</div>'}
 finally{btn.disabled=false;btn.textContent='Re-run 100,000 NFL team trials'}
}
async function analyze(){if(sport==='ufc')return analyzeUFC();if(sport==='mlb')return analyzeMLB();if(sport==='nhl')return analyzeNHL();if(sport==='tennis')return analyzeTennis();if(sport==='soccer')return analyzeSoccer();if(sport==='nba')return v73AnalyzeNBA();if(sport==='ncaa')return v62AnalyzeTeamSport();if(!chosen||sport!=='nfl')return;if(sport==='nfl'){return analyzeNFLTeams();}let btn=$('simulate');btn.disabled=true;btn.textContent='Loading verified historical box scores…';$('results').innerHTML='<div class="panel">Fetching completed games for both teams. This can take a moment.</div>';try{let [away,home]=teamIds();if(!away||!home)throw Error('Missing team identifiers');let [ah,hh]=await Promise.all([teamHistory(away),teamHistory(home)]);let awayPlayers=pool(ah),homePlayers=pool(hh);if(!awayPlayers.length||!homePlayers.length)throw Error('One team has no usable offensive box-score data');let players=[...awayPlayers,...homePlayers];if(players.length<5)throw Error('Insufficient player game logs');let candidates=makeCandidates(players);if(candidates.length<5)throw Error('Insufficient eligible player statistics for five selections');btn.textContent='Running 100,000 trials…';await new Promise(r=>setTimeout(r,50));let n=100000,scoreA=[],scoreH=[];let picks=[],bestJoint=0;let maxCandidates=candidates.slice(0,75);let sampled=new Map();for(let i=0;i<n;i++){sampled.clear();for(let p of players)sampled.set(p.id,sample(p.logs));let scores=[0,0];for(let p of players){let l=sampled.get(p.id);scores[p.team===ah.name?0:1]+=l.td*6;/* Team score estimated separately below */}let sa=0,sh=0;for(let h of [ah,hh]){let g=h.games[Math.floor(Math.random()*h.games.length)];let teamComp=g.event.competitions?.[0]?.competitors?.find(x=>String(x.team.id)===String(h.id));let points=num(teamComp?.score?.displayValue??teamComp?.score);if(h===ah)sa=points;else sh=points}scoreA.push(sa);scoreH.push(sh);for(let c of maxCandidates){let val=sampled.get(c.player.id)?.[c.key]||0;if(val>c.line)c.hit++}}maxCandidates.sort((a,b)=>b.hit-a.hit);let shortlist=maxCandidates.filter(c=>c.hit/n>=.55).slice(0,24);let combinations=[];for(let i=0;i<shortlist.length;i++)for(let j=i+1;j<shortlist.length;j++)for(let k=j+1;k<shortlist.length;k++){/* select candidates without repeating player, then greedy fill */let seed=[shortlist[i],shortlist[j],shortlist[k]];if(new Set(seed.map(c=>c.player.id)).size!==3)continue;let rest=shortlist.filter(c=>!seed.some(x=>x.player.id===c.player.id)).slice(0,2);if(rest.length===2)combinations.push([...seed,...rest]);if(combinations.length>120)break;if(combinations.length>120)break}let choice=combinations[0]||[];if(choice.length<5){choice=[];for(let c of maxCandidates){if(choice.every(x=>x.player.id!==c.player.id))choice.push(c);if(choice.length===5)break}}if(choice.length<5)throw Error('Cannot construct five independent-player selections');let joint=0;for(let i=0;i<n;i++){let s=new Map();for(let c of choice)if(!s.has(c.player.id))s.set(c.player.id,sample(c.player.logs));if(choice.every(c=>s.get(c.player.id)[c.key]>c.line))joint++}let avg=a=>Math.round(a.reduce((s,x)=>s+x,0)/a.length);let renderTeam=(teamName)=>{let group=players.filter(p=>p.team===teamName).sort((a,b)=>{let order={QB:0,RB:1,FB:2,WR:3,TE:4,'WR/TE':5};return (order[a.pos]??9)-(order[b.pos]??9)||b.logs.reduce((s,l)=>s+l.pass+l.rush+l.rec,0)-a.logs.reduce((s,l)=>s+l.pass+l.rush+l.rec,0)});return `<h3 style="margin:20px 0 12px">${escapeHtml(teamName)} · ${group.length} offensive players</h3><div class="players">${group.map(p=>{let lines=[['pass','Pass YDS'],['rush','Rush YDS'],['rec','Rec YDS'],['receptions','REC']].filter(([k])=>p.logs.some(l=>l[k]>0));return `<div class="player"><strong>${escapeHtml(p.name)} <small>· ${escapeHtml(p.pos)}</small></strong><small>${p.logs.length} games with offensive production</small><div class="stats">${lines.map(([k,l])=>`<span>${l} <b>${quantile(p.logs.map(x=>x[k]),.5)}</b> <small>(${Math.round(quantile(p.logs.map(x=>x[k]),.1))}–${Math.round(quantile(p.logs.map(x=>x[k]),.9))})</small></span>`).join('')}</div></div>`}).join('')||'<p class="desc">No eligible offensive game logs returned.</p>'}</div>`};let cards=renderTeam(ah.name)+renderTeam(hh.name);$('dataStatus').textContent='Loaded '+ah.games.length+' '+ah.name+' games and '+hh.games.length+' '+hh.name+' games. Results use actual box scores, with unverified roster availability and opponent adjustments.';$('results').innerHTML=`<div class="panel"><h2>100,000-trial football prototype · V8.1</h2><div class="grid"><div class="tile"><small>Projected ${escapeHtml(ah.name)} points</small><b>${avg(scoreA)}</b></div><div class="tile"><small>Projected ${escapeHtml(hh.name)} points</small><b>${avg(scoreH)}</b></div></div><p class="desc">Team scores are resampled from completed team games. Only offensive QB/RB/FB/WR/TE game logs are shown. Player statistics are independently sampled from recent individual game logs. These are not full play-by-play simulations, and player and team scores are not jointly consistent.</p></div><div class="panel"><h2>Automatic five-leg research shortlist</h2><div class="hint">Experimental player thresholds derived from game logs, NOT verified Kalshi contracts. Individual rates come from resampled historical logs; combined rate uses a separate joint sample. These estimates do not yet model opponent-specific coverage or same-game correlations. Defensive players are excluded from the offensive player list, not treated as verified model inputs.</div>${choice.map((c,i)=>`<div class="leg">${i+1}. <strong>${escapeHtml(c.name)}</strong> · ${escapeHtml(c.team)}<br>Over ${c.line} ${escapeHtml(c.label)} · <b>${(100*c.hit/n).toFixed(1)}%</b> historical resample frequency</div>`).join('')}<div class="tile" style="margin-top:12px"><small>Five together (exploratory resampling)</small><b>${(100*joint/n).toFixed(2)}%</b></div></div><div class="panel"><h2>OFFENSE ONLY · both teams · V8.1</h2><p class="desc">Defensive players are never displayed here. Players without positive passing, rushing or receiving production are excluded. Position labels may be inferred from box-score categories when missing.</p>${cards}</div><div class="panel"><h3>Data provenance</h3><p class="desc">ESPN unofficial team schedules and completed-game summary box scores. All sampled statistics are from completed games before the selected matchup. No data from the future game is used. Not a validated predictive probability model.</p></div>`;}catch(e){$('results').innerHTML='<div class="panel err">Football analysis unavailable: '+escapeHtml(e.message)+'. The site will not invent missing game logs or probabilities.</div>'}finally{btn.disabled=false;btn.textContent='Re-run 100,000 trials'}}


// V37: Direct MLB Stats API integration; no API key or Worker modification required.
const MLB_API='https://statsapi.mlb.com/api/v1';
const mlbGet=(path)=>get(MLB_API+path);
let mlbSelected=null;
function mlbDate(d){return new Date(d).toISOString().slice(0,10)}
function mlbGameCard(g,i){return `<button class="game" data-mlb="${i}"><span><strong>${escapeHtml(g.teams?.away?.team?.name||'Away')} vs ${escapeHtml(g.teams?.home?.team?.name||'Home')}</strong><small>${escapeHtml(dateText(g.gameDate))} · ${escapeHtml(g.status?.detailedState||'Scheduled')}</small></span><span style="color:var(--a)">›</span></button>`}
async function loadMLBSchedule(){showList();$('status').textContent='Connecting to MLB Stats API…';$('games').innerHTML='';try{
 const now=new Date(),start=new Date(now),end=new Date(now);end.setDate(end.getDate()+14);
 const fetchSchedule=async(a,b)=>{const q=new URLSearchParams({sportId:'1',startDate:mlbDate(a),endDate:mlbDate(b),hydrate:'probablePitcher'});const d=await mlbGet('/schedule?'+q);return (d.dates||[]).flatMap(x=>x.games||[])};
 let games=await fetchSchedule(start,end),archive=false;
 if(!games.length){archive=true;games=await fetchSchedule('2026-10-01','2026-11-05');games=games.filter(g=>['Final','Game Over','Completed Early'].includes(g.status?.detailedState)).slice(-40).reverse()}
 if(!games.length){$('status').textContent='No MLB fixtures or archived games returned by the provider.';return}
 events=games;$('status').textContent=archive?'MLB offseason · showing completed 2026 games for testing · no upcoming games in the next 14 days':games.length+' upcoming MLB games · MLB Stats API';
 $('games').innerHTML=games.map(mlbGameCard).join('');document.querySelectorAll('[data-mlb]').forEach(b=>b.onclick=()=>openMLBGame(games[+b.dataset.mlb]));
 }catch(e){$('status').innerHTML='<span class="err">MLB connection failed: '+escapeHtml(e.message)+'</span><p class="desc">The public MLB API may be unavailable or blocked in this browser.</p>'}}
function openMLBGame(g){mlbSelected=g;chosen=g;$('listing').classList.add('hidden');$('detail').classList.remove('hidden');$('matchTitle').textContent=(g.teams?.away?.team?.name||'Away')+' vs '+(g.teams?.home?.team?.name||'Home');$('matchDate').textContent=dateText(g.gameDate)+' · MLB'+(g.status?.abstractGameState==='Final'?' · completed game (historical backtest)':'');$('simulate').classList.add('hidden');$('simulate').textContent='Run 100,000 MLB scoring trials';$('results').innerHTML='';$('dataStatus').textContent='MLB Stats API · historical team results and player box scores. Player availability and starting pitchers must be verified separately. No future game results are used as model inputs.';window.scrollTo(0,0);const selected=g;setTimeout(()=>{if(chosen===selected)analyzeMLB()},0)}
function mlbPoisson(l){let p=1,k=0,L=Math.exp(-Math.min(12,l));do{k++;p*=Math.random()}while(p>L&&k<40);return k-1}
async function mlbTeamHistory(teamId,cutoff){const season=new Date(cutoff).getUTCFullYear();let q=new URLSearchParams({sportId:'1',teamId:String(teamId),season:String(season),gameType:'R,P'});const d=await mlbGet('/schedule?'+q);const games=(d.dates||[]).flatMap(x=>x.games||[]).filter(g=>new Date(g.gameDate)<new Date(cutoff)&&g.status?.abstractGameState==='Final'&&Number.isFinite(g.teams?.home?.score)&&Number.isFinite(g.teams?.away?.score)).sort((a,b)=>new Date(b.gameDate)-new Date(a.gameDate)).slice(0,12);return games.map(g=>{const home=g.teams.home.team.id===teamId;return {id:g.gamePk,date:g.gameDate,own:home?g.teams.home.score:g.teams.away.score,against:home?g.teams.away.score:g.teams.home.score,home}})}
function mlbPlayerLogs(box,teamId){
 const side=['home','away'].find(k=>Number(box.teams?.[k]?.team?.id)===Number(teamId));if(!side)return [];
 return Object.values(box.teams[side].players||{}).map(p=>{
 const b=p.stats?.batting||{},q=p.stats?.pitching||{};
 const batting=Number(b.plateAppearances||0)>0,pitching=Number(q.battersFaced||0)>0;
 const n=(o,k)=>Number(o[k]||0);
 const innings=Number(q.inningsPitched||0),outs=Math.floor(innings)*3+Math.round((innings%1)*10);
 return {id:p.person?.id,name:p.person?.fullName||'Unknown',batting,pitching,
 hits:n(b,'hits'),doubles:n(b,'doubles'),triples:n(b,'triples'),homeRuns:n(b,'homeRuns'),totalBases:n(b,'totalBases'),
 runs:n(b,'runs'),rbi:n(b,'rbi'),stolenBases:n(b,'stolenBases'),walksBatter:n(b,'baseOnBalls'),
 battingStrikeouts:n(b,'strikeOuts'),plateAppearances:n(b,'plateAppearances'),atBats:n(b,'atBats'),
 strikeOuts:n(q,'strikeOuts'),outs,innings,earnedRuns:n(q,'earnedRuns'),walksAllowed:n(q,'baseOnBalls'),
 hitsAllowed:n(q,'hits'),battersFaced:n(q,'battersFaced'),pitcherWin:n(q,'wins'),batOrder:p.battingOrder||null};
 }).filter(x=>x.id&&(x.batting||x.pitching));
}
async function mlbPlayerHistory(games,teamId){const fetched=await Promise.allSettled(games.slice(0,10).map(g=>mlbGet('/game/'+g.id+'/boxscore')));const map=new Map();let usable=0;for(let i=0;i<fetched.length;i++){if(fetched[i].status!=='fulfilled')continue;usable++;for(const p of mlbPlayerLogs(fetched[i].value,teamId)){const obj=map.get(p.id)||{id:p.id,name:p.name,logs:[]};obj.logs.push({...p,recency:i});map.set(p.id,obj)}}return {players:[...map.values()],usable}}
// V38: Historical, pre-game opponent pitching and contact evidence; never use future box scores.
function mlbPitchingProfile(report){
 const logs=report.players.flatMap(p=>p.logs.filter(x=>x.pitching));
 const total=(k)=>logs.reduce((v,x)=>v+(Number(x[k])||0),0);
 const bf=total('battersFaced'),hits=total('hitsAllowed'),ks=total('strikeOuts');
 return {bf,hits,ks,hitRate:bf>=30?hits/bf:null,kRate:bf>=30?ks/bf:null,usable:bf>=30};
}
async function mlbHandedness(ids){
 const out=new Map(),unique=[...new Set(ids.filter(x=>Number.isInteger(Number(x))))];
 if(!unique.length)return out;
 // MLB people endpoint returns official batSide and pitchHand, not inferred from names.
 const results=await Promise.allSettled(Array.from({length:Math.ceil(unique.length/50)},(_,i)=>mlbGet('/people?personIds='+unique.slice(i*50,(i+1)*50).join(','))));
 for(const r of results)if(r.status==='fulfilled')for(const p of r.value.people||[])out.set(Number(p.id),{bat:p.batSide?.code||null,throws:p.pitchHand?.code||null});
 return out;
}
function mlbShortlist(reports,opponents,handedness,starters){
 const candidates=[];
 for(let side=0;side<reports.length;side++){
  const r=reports[side],opp=opponents[side],profile=mlbPitchingProfile(opp),starter=starters[side];
  const oppBat=opp.players.flatMap(p=>p.logs.filter(x=>x.batting));
  const oppPA=oppBat.reduce((n,x)=>n+x.plateAppearances,0),oppK=oppBat.reduce((n,x)=>n+x.battingStrikeouts,0);
  const oppKRate=oppPA>=40?oppK/oppPA:null;
  for(const p of r.players){
   const batting=p.logs.filter(x=>x.batting),pitching=p.logs.filter(x=>x.pitching);
   const pa=batting.reduce((n,x)=>n+x.plateAppearances,0),ks=batting.reduce((n,x)=>n+x.battingStrikeouts,0);
   const contactRate=pa>=12?ks/pa:null;
   const batSide=handedness.get(Number(p.id))?.bat||null,starterHand=starter?.hand||null;
   const handNote=batSide&&starterHand?(batSide==='S'?'Switch hitter vs '+starter.name:(batSide===starterHand?'Same-handed':'Opposite-handed')+' vs '+starter.name):null;
   const eligiblePitcher=!!starter?.id&&Number(starter.id)===Number(p.id);
   const props=[
    ['hits',1,'1+ Hit',batting],['hits',2,'2+ Hits',batting],['totalBases',2,'2+ Total Bases',batting],['totalBases',3,'3+ Total Bases',batting],
    ['homeRuns',1,'1+ Home Run',batting],['runs',1,'1+ Run',batting],['rbi',1,'1+ RBI',batting],
    ['stolenBases',1,'1+ Stolen Base',batting],['hrrbi',2,'2+ Hits + Runs + RBI',batting],['hrrbi',3,'3+ Hits + Runs + RBI',batting],
    ['strikeOuts',3,'3+ Pitcher Strikeouts',pitching],['strikeOuts',4,'4+ Pitcher Strikeouts',pitching],['strikeOuts',5,'5+ Pitcher Strikeouts',pitching],['strikeOuts',6,'6+ Pitcher Strikeouts',pitching],['strikeOuts',7,'7+ Pitcher Strikeouts',pitching],['strikeOuts',8,'8+ Pitcher Strikeouts',pitching],
    ['outs',12,'12+ Outs Recorded',pitching],['outs',15,'15+ Outs Recorded',pitching],['outs',18,'18+ Outs Recorded',pitching],['outs',21,'21+ Outs Recorded',pitching],
    ['earnedRuns',2,'2+ Earned Runs Allowed',pitching],['walksAllowed',2,'2+ Walks Allowed',pitching],
    ['hitsAllowed',5,'5+ Hits Allowed',pitching],['pitcherWin',1,'Pitcher Win',pitching]
   ];
   for(const [key,threshold,label,logs] of props){
    if(logs.length<5)continue;
    // Pitcher projections require an identified probable starter; relievers are not silently treated as starters.
    if(pitching.length&&logs===pitching&&!eligiblePitcher)continue;
    const metric=x=>key==='hrrbi'?x.hits+x.runs+x.rbi:x[key];
    const weighted=logs.reduce((a,g)=>{const w=Math.pow(.86,g.recency);a.n+=w*(metric(g)>=threshold?1:0);a.d+=w;return a},{n:0,d:0});
    const hits=logs.filter(x=>metric(x)>=threshold).length;
    const historical=(weighted.n+1)/(weighted.d+2);
    let rate=historical;const notes=[];
    if(logs===batting){
     if(contactRate!==null)notes.push('Batter strikeout rate '+(100*contactRate).toFixed(0)+'%');
     if(profile.usable){
      notes.push('Opponent staff strikeout rate '+(100*profile.kRate).toFixed(0)+'%');
      notes.push('Opponent hits per batter faced '+(100*profile.hitRate).toFixed(0)+'%');
      const contactAdj=contactRate===null?0:Math.max(-.05,Math.min(.05,(.22-contactRate)*.16));
      const oppAdj=Math.max(-.05,Math.min(.05,(profile.hitRate-.23)*.35-(profile.kRate-.23)*.12));
      // Only hit-related props receive this heuristic; do not pretend it models HR, SB, runs or RBI.
      if(['hits','totalBases'].includes(key))rate=Math.max(.01,Math.min(.99,historical+contactAdj+oppAdj));
     }
     if(handNote)notes.push(handNote+' (no validated split adjustment)');
    }else{
     notes.push('Probable starter: '+starter.name);
     if(oppKRate!==null&&key==='strikeOuts'){
      notes.push('Opponent recent batting strikeout rate '+(100*oppKRate).toFixed(0)+'%');
      rate=Math.max(.01,Math.min(.99,historical+Math.max(-.06,Math.min(.06,(oppKRate-.23)*.35))));
     }
     if(profile.usable)notes.push('Historical pitching workload from completed starts/appearances');
    }
    candidates.push({id:p.id,name:p.name,team:r.name,label,rate,hits,total:logs.length,kind:key,notes:notes.join(' · '),historical,
      group:logs===pitching?'Pitcher':'Batter',opponentAdjusted:rate!==historical});
   }
  }
 }
 return candidates.sort((a,b)=>b.rate-a.rate);
}
async function analyzeMLB(){if(!mlbSelected)return;const btn=$('simulate');btn.disabled=true;btn.textContent='Loading MLB results and box scores…';$('results').innerHTML='<div class="panel">Loading actual MLB team and player game logs…</div>';try{const g=mlbSelected,cutoff=g.gameDate,away=g.teams.away.team,home=g.teams.home.team;const [ag,hg]=await Promise.all([mlbTeamHistory(away.id,cutoff),mlbTeamHistory(home.id,cutoff)]);if(ag.length<5||hg.length<5)throw Error('Need at least five completed games before the selected matchup for each team ('+ag.length+' / '+hg.length+' found).');const [ap,hp]=await Promise.all([mlbPlayerHistory(ag,away.id),mlbPlayerHistory(hg,home.id)]);const avg=(arr,k)=>arr.reduce((s,x)=>s+x[k],0)/arr.length;const la=Math.max(.2,Math.min(12,(avg(ag,'own')+avg(hg,'against'))/2)),lh=Math.max(.2,Math.min(12,(avg(hg,'own')+avg(ag,'against'))/2));let aw=0,hw=0,tie=0,total=0,over75=0;const N=100000;for(let i=0;i<N;i++){const a=mlbPoisson(la),h=mlbPoisson(lh);total+=a+h;if(a>h)aw++;else if(h>a)hw++;else tie++;if(a+h>=8)over75++}const pct=x=>(100*x/N).toFixed(1)+'%';const starterAway=g.teams?.away?.probablePitcher||null,starterHome=g.teams?.home?.probablePitcher||null;
 const hands=await mlbHandedness([...ap.players.map(p=>p.id),...hp.players.map(p=>p.id),starterAway?.id,starterHome?.id]);
 const starters=[starterHome?{id:starterHome.id,name:starterHome.fullName,hand:hands.get(Number(starterHome.id))?.throws||null}:null,starterAway?{id:starterAway.id,name:starterAway.fullName,hand:hands.get(Number(starterAway.id))?.throws||null}:null];
 const shortlist=mlbShortlist([{...ap,name:away.name},{...hp,name:home.name}],[hp,ap],hands,starters);const picks=[];for(const c of shortlist){if(picks.every(p=>p.id!==c.id))picks.push(c);if(picks.length===5)break}const rows=picks.map((p,i)=>{
 const reason=p.opponentAdjusted?(p.group==='Pitcher'?'Recent strikeouts and opponent contact considered.':'Recent hitting and opposing pitching considered.'):
  p.group==='Pitcher'?'Recent pitcher game logs; matchup adjustment unavailable.':'Recent player production; matchup adjustment unavailable.';
 return '<div class="leg mlb-leg"><div class="row mlb-leg-head"><strong>Leg '+(i+1)+' — '+escapeHtml(p.name)+'</strong><b class="mlb-pct">'+(100*p.rate).toFixed(1)+'%</b></div>'+
 '<div class="mlb-pick">'+escapeHtml(p.label)+' <span class="muted">· '+p.hits+'/'+p.total+' games</span></div>'+
 '<div class="mlb-reason">'+escapeHtml(reason)+'</div><details class="mlb-details"><summary>Advanced breakdown</summary><div class="desc">'+
 escapeHtml(p.team)+' · '+escapeHtml(p.notes||'No validated matchup data')+'<p>Smoothed game-log baseline: '+(100*p.historical).toFixed(1)+
 '%. Estimated rate: '+(100*p.rate).toFixed(1)+'%. Historical frequencies are not calibrated forecasts.</p></div></details></div>';
}).join('');
const categories=[['Batter props','1+ / 2+ hits · total bases · home runs · runs · RBIs · stolen bases · H+R+RBI'],
 ['Pitcher props','Strikeouts · outs recorded · earned runs · walks allowed · hits allowed · pitcher win']];
const propPanel='<div class="panel"><h2>⚾ Available MLB prop research</h2><p class="desc">The five legs above compete across all supported categories, not just hits. Pitcher props require a listed probable starter and at least five historical appearances.</p>'+
 categories.map(([title,desc])=>'<h3>'+title+'</h3><p class="desc">'+desc+'</p>').join('')+
 '<details class="mlb-details"><summary>All ranked eligible outcomes ('+shortlist.length+')</summary>'+
 shortlist.slice(0,80).map(p=>'<div class="leg"><strong>'+escapeHtml(p.name)+' — '+escapeHtml(p.label)+'</strong> · '+(100*p.rate).toFixed(1)+'%<br><small>'+p.hits+'/'+p.total+' recorded games · '+escapeHtml(p.group)+'</small></div>').join('')+
 '</details><p class="desc">Only 1+ threshold-style outcomes are ranked. These are not verified over/under contract lines. Pitcher win and high-variance props are descriptive research, not validated forecasts.</p></div>';
const shortlistPanel='<div class="panel"><h2>⚾ MLB · Best 5 Legs</h2><p class="desc">Matchup-adjusted research estimates · recent form · five distinct players</p>'+(rows||'<p class="desc">Insufficient verified player logs for five selections.</p>')+'<p class="desc mlb-disclaimer">Experimental estimates, not calibrated probabilities. Historical games do not confirm lineups, starting pitchers or injuries. No guaranteed outcomes.</p></div>';$('dataStatus').textContent='MLB connected · '+ag.length+' / '+hg.length+' team games · '+ap.usable+' / '+hp.usable+' player box scores · only games before selected matchup';$('results').innerHTML=shortlistPanel+propPanel+'<div class="panel"><h2>⚾ MLB · 100,000 scoring trials</h2><div class="grid"><div class="tile"><small>'+escapeHtml(away.name)+' expected runs</small><b>'+la.toFixed(1)+'</b></div><div class="tile"><small>'+escapeHtml(home.name)+' expected runs</small><b>'+lh.toFixed(1)+'</b></div><div class="tile"><small>'+escapeHtml(away.name)+' regulation lead</small><b>'+pct(aw)+'</b></div><div class="tile"><small>'+escapeHtml(home.name)+' regulation lead</small><b>'+pct(hw)+'</b></div><div class="tile"><small>8+ total runs</small><b>'+pct(over75)+'</b></div><div class="tile"><small>Tied after nine (proxy)</small><b>'+pct(tie)+'</div>'; }catch(e){$('results').innerHTML='<div class="panel err">MLB analysis unavailable: '+escapeHtml(e.message)+'. No synthetic player statistics will be substituted.</div>'}finally{btn.disabled=false;btn.textContent='Re-run 100,000 MLB trials'}}

// API-Sports connection via the deployed Cloudflare Worker. The key stays server-side.
const footballWorker='https://currentscy-picks-api.johnnybawmie.workers.dev/';
const apiLeagueIds={'eng.1':39,'esp.1':140,'ita.1':135,'ger.1':78,'fra.1':61,'uefa.champions':2,'uefa.europa':3,'usa.1':253,'mex.1':262};
function apiErrorMessage(data,status){
 const raw=data?.errors??data?.error;
 const parts=typeof raw==='string'?[raw]:Array.isArray(raw)?raw:Object.entries(raw||{}).map(([k,v])=>k+': '+String(v));
 return (parts.filter(Boolean).join('; ')||('HTTP '+status)).slice(0,240);
}
const v52ProviderCache=new Map();
const v52ProviderBlocked=new Map();
function v52BlockedKey(endpoint,params){return endpoint+':'+(params?.league||'all')+':'+(params?.season||'current')}
async function apiFootball(endpoint,params){
 const key=endpoint+':'+JSON.stringify(params);
 const block=v52ProviderBlocked.get(v52BlockedKey(endpoint,params));
 if(block&&Date.now()<block.until)throw Error(block.reason+' (retry later)');
 if(v52ProviderCache.has(key))return v52ProviderCache.get(key);
 const pending=(async()=>{
  const u=new URL(footballWorker);u.searchParams.set('endpoint',endpoint);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  const r=await fetch(u.toString(),{cache:'no-store'});
  let d;try{d=await r.json()}catch{throw Error('Football gateway returned non-JSON (HTTP '+r.status+')')}
  if(!r.ok||d.error||(d.errors&&(Array.isArray(d.errors)?d.errors.length:Object.keys(d.errors).length))){
   const reason=apiErrorMessage(d,r.status);
   if(/rateLimit|too many requests|requests per minute|free plans do not have access|subscription|not allowed for this season/i.test(reason)){
    v52ProviderBlocked.set(v52BlockedKey(endpoint,params),{reason,until:Date.now()+(/rateLimit|too many requests|requests per minute/i.test(reason)?120000:3600000)});
   }
   throw Error('Football provider: '+reason);
  }
  return d;
 })();
 v52ProviderCache.set(key,pending);
 try{return await pending}catch(e){v52ProviderCache.delete(key);throw e}
}
function apiSeason(date){let d=new Date(date),m=d.getUTCMonth()+1,y=d.getUTCFullYear();return ['usa.1','mex.1'].includes(league)?y:(m<7?y-1:y)}
function normalizedTeamName(n){return String(n||'').toLowerCase().replace(/\b(fc|cf|afc|sc|club|football|deportivo)\b/g,'').replace(/[^a-z0-9]/g,'').trim()}
async function apiFindTeam(name){
 const payload=await apiFootball('/teams',{search:name});const rows=payload.response||[];const target=normalizedTeamName(name);
 const exact=rows.find(r=>normalizedTeamName(r.team?.name)===target);
 if(exact)return exact.team;
 const matches=rows.filter(r=>{let n=normalizedTeamName(r.team?.name);return n.includes(target)||target.includes(n)});
 if(matches.length===1)return matches[0].team;
 throw Error('Could not uniquely match '+name+' to API-Football team; no player data assumed');
}
async function apiPlayerTeamPanel(competitor){
 const name=competitor.team?.displayName||'',team=await apiFindTeam(name),season=apiSeason(chosen.date),leagueId=apiLeagueIds[league];
 if(!leagueId)throw Error('No API-Football league mapping');
 const data=await apiFootball('/players',{team:team.id,league:leagueId,season,page:1});
 const all=data.response||[];
 const players=all.map(x=>{let st=(x.statistics||[]).find(t=>Number(t.league?.id)===Number(leagueId))||x.statistics?.[0];
 return {name:x.player?.name||'Unknown',pos:st?.games?.position||'',apps:st?.games?.appearences??null,starts:st?.games?.lineups??null,minutes:st?.games?.minutes??null,goals:st?.goals?.total??null,assists:st?.goals?.assists??null};
 }).filter(x=>x.apps!==null).sort((a,b)=>(b.goals||0)+(b.assists||0)-(a.goals||0)-(a.assists||0));
 const cell=v=>v===null?'—':String(v);
 return '<h3>'+escapeHtml(team.name)+' · '+escapeHtml(String(season))+' season</h3>'+
 (players.length?'<div class="players">'+players.slice(0,12).map(x=>'<div class="player"><strong>'+escapeHtml(x.name)+'</strong><small>'+escapeHtml(x.pos)+'</small><div class="stats"><span>Goals <b>'+cell(x.goals)+'</b></span><span>Assists <b>'+cell(x.assists)+'</b></span><span>Apps <b>'+cell(x.apps)+'</b></span><span>Minutes <b>'+cell(x.minutes)+'</b></span></div></div>').join('')+'</div>':'<p class="desc">No player season statistics returned by the API.</p>')+
 (Number(data.paging?.total)>1?'<p class="v51-fine">Only the first page was requested to avoid subscription rate limits. Results may be incomplete.</p>':'');
}
async function espnSoccerRoster(competitor){
 const id=competitor?.team?.id;
 if(!id)throw Error('No ESPN team ID');
 const d=await get(root+'soccer/'+league+'/teams/'+encodeURIComponent(id)+'/roster');
 const athletes=(d.athletes||[]).flatMap(g=>Array.isArray(g.items)?g.items:[g]).filter(a=>a?.displayName);
 if(!athletes.length)throw Error('No roster returned');
 return {count:athletes.length,names:athletes.map(a=>a.displayName)};
}
const v52RosterCache=new Map();
async function v52Roster(c){
 const key=league+':'+c.team?.id;
 if(!v52RosterCache.has(key))v52RosterCache.set(key,espnSoccerRoster(c).catch(e=>{v52RosterCache.delete(key);throw e}));
 return v52RosterCache.get(key);
}
async function v52SourceHealth(away,home){
 const teams=[home,away];
 const results=await Promise.all(teams.map(async c=>{
  const name=c.team?.displayName||'Unknown team';
  const [api,roster]=await Promise.allSettled([apiPlayerTeamPanel(c),v52Roster(c)]);
  return {name,api,roster};
 }));
 const ok=results.filter(r=>r.api.status==='fulfilled').length;
 return '<div class="v52-source-head">'+ok+'/2 teams with API-Football player totals</div>'+results.map(r=>{
  const status=r.api.status==='fulfilled'?'Season player totals returned':r.api.reason?.message||'Unavailable';
  const roster=r.roster.status==='fulfilled'?r.roster.value.count+' ESPN roster identities (not player stats)':'ESPN roster unavailable';
  return '<div class="v51-source"><strong>'+escapeHtml(r.name)+'</strong><small>'+escapeHtml(status)+'</small><small>'+escapeHtml(roster)+'</small></div>';
 }).join('')+'<p class="v51-fine">A roster is not a goals/assists source. Restricted or rate-limited current-season statistics are not replaced with older-season figures.</p>';
}
function v52LazySourcePanel(away,home){
 return '<div class="v52-source-panel"><strong>Player data coverage · '+escapeHtml(league==='esp.1'?'La Liga':'Other league')+'</strong><p class="v51-fine">Current-season player statistics are checked only when requested to reduce API limits. ESPN match reports are checked for the three-leg section.</p><button class="v52-check" id="v52-check">Check player data sources</button><div id="v52-check-result" aria-live="polite"></div></div>';
}
function v52WireSources(away,home){
 const button=document.getElementById('v52-check');if(!button)return;
 button.onclick=async()=>{button.disabled=true;button.textContent='Checking…';
  const target=document.getElementById('v52-check-result');
  try{target.innerHTML=await v52SourceHealth(away,home)}catch(e){target.textContent=e.message||'Unavailable'}
  finally{button.disabled=false;button.textContent='Check again'}
 };
}
// Soccer model: team match results, not fabricated player statistics.
function soccerScore(c){let v=c?.score;let n=Number(typeof v==='object'?(v?.value??v?.displayValue):v);return Number.isFinite(n)?n:null}
async function soccerHistory(team){
 const id=team?.team?.id;if(!id)throw Error('Missing soccer team ID');
 const cutoff=new Date(chosen.date).getTime(),year=new Date(chosen.date).getFullYear();
 const url=root+'soccer/'+league+'/teams/'+encodeURIComponent(id)+'/schedule?season='+year+'&limit=150';
 const data=await get(url);
 let matches=(data.events||[]).filter(e=>new Date(e.date).getTime()<cutoff && (e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed)).sort((a,b)=>new Date(b.date)-new Date(a.date));
 const out=[];
 for(const e of matches){const cc=e.competitions?.[0]?.competitors||[];const own=cc.find(c=>String(c.team?.id)===String(id));const opp=cc.find(c=>String(c.team?.id)!==String(id));const gf=soccerScore(own),ga=soccerScore(opp);if(gf===null||ga===null)continue;out.push({eventId:e.id,gf,ga,home:own.homeAway==='home',date:e.date});if(out.length===15)break}
 if(out.length<3)throw Error('Only '+out.length+' usable completed matches found for '+team.team.displayName+' in '+league+'. Try another competition or later in the season.');
 return {name:team.team.displayName,games:out};
}
function weightedRate(games,key,home){let sum=0,weight=0;games.forEach((g,i)=>{let w=Math.pow(.91,i)*(g.home===home?1.25:1);sum+=g[key]*w;weight+=w});return sum/weight}
function poisson(lambda){let L=Math.exp(-lambda),k=0,p=1;do{k++;p*=Math.random()}while(p>L&&k<25);return k-1}

// Historical match statistics are fetched from completed ESPN match summaries.
// A metric is displayed only when the provider supplies usable observations.
const soccerMetrics=[
 {key:'sot',label:'Shots on target',aliases:['shotsontarget','shotsongoal','shotsongoaltotal','shotsongoalfor']},
 {key:'corners',label:'Corners',aliases:['cornerkicks','corners','cornerkick','woncorners','totalcorners','cornerswon','cornerkickswon','cornerkickstotal']},
 {key:'saves',label:'Goalkeeper saves',aliases:['saves','goalkeepersaves','totalsaves']},
 {key:'possession',label:'Possession',aliases:['possession','ballpossession','possessionpercentage','possessionpct','possessionpercent','ballpossessionpercentage','ballpossessionpct','possessiontime','timeofpossession']}
];
function statNorm(x){return String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function statValue(x){let n=parseFloat(String(x??'').replace(/,/g,'').replace('%',''));return Number.isFinite(n)?n:null}

function soccerSummaryStats(summary,teamId){
 const result={};
 const candidates=[...(summary.boxscore?.teams||[]),...(summary.header?.competitions?.[0]?.competitors||[]),...(summary.statistics||[])];
 for(const team of candidates){
  const tid=team.team?.id??team.teamId??team.id;
  if(String(tid)!==String(teamId))continue;
  const stats=team.statistics||team.stats||[];
  const entries=Array.isArray(stats)?stats:Object.entries(stats).map(([name,value])=>({name,value}));
  for(const st of entries){
   const name=statNorm(st.name??st.label??st.displayName??st.abbreviation??st.type);
   const raw=st.displayValue??st.value??st.stat;
   for(const m of soccerMetrics){
    const match=m.aliases.includes(name)|| (m.key==='corners'&&name.includes('corner')&&!name.includes('against')) || (m.key==='possession'&&name.includes('possession')&&!name.includes('lost'));
    if(match){const v=statValue(raw);if(v!==null && (m.key!=='possession'||v<=100))result[m.key]=v}
   }
  }
 }
 return result;
}
async function soccerDetailedHistory(team,history){
 const id=team?.team?.id;
 const prior=(history?.games||[]).map(g=>g.eventId??g.id).filter(Boolean).slice(0,10);
 // Reuse known historical match IDs; ESPN team schedules sometimes omit the same matches.
 let ids=[...new Set(prior)];
 if(!ids.length){
  const season=new Date(chosen.date).getFullYear();
  const schedule=await get(root+'soccer/'+league+'/teams/'+encodeURIComponent(id)+'/schedule?season='+season+'&limit=150');
  ids=(schedule.events||[]).filter(e=>new Date(e.date)<new Date(chosen.date)&&
    (e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed))
    .sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10).map(e=>e.id);
 }
 const settled=await Promise.allSettled(ids.map(async eventId=>{
  const summary=await get(root+'soccer/'+league+'/summary?event='+encodeURIComponent(eventId));
  return soccerSummaryStats(summary,id);
 }));
 return settled.filter(x=>x.status==='fulfilled').map(x=>x.value);
}
function soccerMetricPanel(h,a){
 const cards=[];
 for(const m of soccerMetrics){
  const vals=[h,a].map(t=>(t.detail||[]).map(x=>x[m.key]).filter(Number.isFinite));
  const mean=v=>v.reduce((s,x)=>s+x,0)/v.length;
  const valid=vals.every(v=>v.length>=3);
  const fmt=x=>m.key==='possession'?x.toFixed(1)+'%':x.toFixed(1);
  const content=valid
   ?'<b>'+fmt(mean(vals[0]))+' / '+fmt(mean(vals[1]))+'</b><small>'+escapeHtml(h.name)+' / '+escapeHtml(a.name)+'</small><div class="desc">Historical match-report averages · '+vals[0].length+' / '+vals[1].length+' matches</div>'
   :'<b style="font-size:16px;color:#e2e8f0">Data unavailable</b><div class="desc">Source returned '+vals[0].length+' / '+vals[1].length+' usable reports. Need at least 3 per team for a historical average.</div>';
  cards.push('<div class="tile"><small>'+escapeHtml(m.label)+(m.key==='possession'?' · time in possession':' · per match')+'</small>'+content+'</div>');
 }
 return '<div class="panel"><h2>Shots, corners, saves & possession · historical data</h2><p class="desc">Available numbers are observed historical averages, a baseline for future projections—not 100,000 simulated estimates. Missing source statistics are shown explicitly.</p><div class="grid">'+cards.join('')+'</div></div>';
}



function soccerPlayerStatRows(d,teamId){
 const result=[];
 const blocks=d.boxscore?.players||[];
 for(const block of blocks){
  if(String(block.team?.id)!==String(teamId))continue;
  for(const category of block.statistics||[]){
   const labels=(category.labels||category.names||[]).map(statNorm);
   for(const row of category.athletes||[]){
    const athlete=row.athlete||{};
    if(!athlete.id||!athlete.displayName)continue;
    const raw=row.stats||[];
    const metric=aliases=>{
     const i=labels.findIndex(k=>aliases.includes(k));
     if(i<0)return null;
     const v=Number(raw[i]);return Number.isFinite(v)?v:null;
    };
    const goals=metric(['g','gls','goals','goalsscored']);
    const assists=metric(['a','ast','assists']);
    const minutes=metric(['min','mins','minutes','minutesplayed']);
    if(goals===null&&assists===null)continue;
    result.push({id:String(athlete.id),name:athlete.displayName,goals,assists,minutes});
   }
  }
 }
 return result;
}
function soccerEventRows(d,teamId){
 const plays=[...(d.scoringPlays||[]),...(d.header?.competitions?.[0]?.details||[]),
  ...(d.header?.competitions?.[0]?.competitors||[]).flatMap(x=>x.details||[])];
 const rows=new Map();
 for(const play of plays){
  if(String(play.team?.id||play.teamId||'')!==String(teamId))continue;
  const parts=play.participants||[];
  const goal=parts.find(x=>/scor|goal/i.test(String(x.type||x.role||x.participantType||'')));
  const assist=parts.find(x=>/assist/i.test(String(x.type||x.role||x.participantType||'')));
  for(const [part,key] of [[goal,'goals'],[assist,'assists']]){
   const p=part?.athlete||part?.player;
   if(!p?.id||!(p.displayName||p.fullName))continue;
   const id=String(p.id),r=rows.get(id)||{id,name:p.displayName||p.fullName,goals:0,assists:0,minutes:null};
   r[key]++;rows.set(id,r);
  }
 }
 return [...rows.values()];
}
// V31 repair: use FPL season player totals for Premier League, not sparse ESPN event summaries.
async function v31Fpl(){
 const u=new URL('https://currentscy-picks-api.johnnybawmie.workers.dev/');u.searchParams.set('endpoint','/fpl');
 const r=await fetch(u);if(!r.ok)throw Error('FPL gateway HTTP '+r.status);
 const d=await r.json();if(!Array.isArray(d.teams)||!Array.isArray(d.elements))throw Error('FPL player data missing');return d;
}
function v31ClubKey(n){return String(n||'').toLowerCase().replace(/&/g,'and').replace(/\b(fc|afc|cf|football|club|the)\b/g,'').replace(/[^a-z0-9]/g,'')}
function v31MatchClub(name,teams){
 const aliases={'manchester city':'man city','manchester united':'man utd','tottenham hotspur':'spurs','wolverhampton wanderers':'wolves','newcastle united':'newcastle','nottingham forest':'nottm forest','brighton & hove albion':'brighton','west ham united':'west ham'};
 const raw=String(name||'').toLowerCase().trim(),key=v31ClubKey(aliases[raw]||raw);
 const matched=teams.filter(t=>v31ClubKey(t.name)===key||v31ClubKey(t.short_name)===key);
 return matched.length===1?matched[0]:null;
}
async function v35PlayerHistory(id,cutoff){
 // FPL element-summary contains the actual per-round player history. This route MUST be
 // enabled in the Cloudflare Worker; browser requests to FPL often fail due to CORS.
 const u=new URL(footballWorker);u.searchParams.set('endpoint','/fpl-player-history');u.searchParams.set('id',id);
 try{
  const r=await fetch(u,{cache:'no-store'});
  if(!r.ok)throw Error('History gateway HTTP '+r.status);
  const d=await r.json();
  if(d.error||d.errors)throw Error('History gateway rejected request');
  const history=Array.isArray(d.history)?d.history:Array.isArray(d.response?.history)?d.response.history:null;
  if(!history)throw Error('Worker does not expose FPL element-summary history');
  const rows=history.filter(g=>Number(g.minutes)>0&&Number.isFinite(Number(g.goals_scored))&&Number.isFinite(Number(g.assists))&&(!cutoff||!g.kickoff_time||new Date(g.kickoff_time)<new Date(cutoff)))
    .sort((x,y)=>new Date(x.kickoff_time||0)-new Date(y.kickoff_time||0));
  return {rows:rows.slice(-10),error:null};
 }catch(e){return {rows:null,error:String(e.message||e)}}
}
async function v31FplPanels(away,home,awayHistory,homeHistory){
 const data=await v31Fpl();
 const sides=[{c:home,history:homeHistory,opponent:awayHistory},{c:away,history:awayHistory,opponent:homeHistory}].map(({c,history,opponent})=>{
  const name=c.team?.displayName||'Unknown',club=v31MatchClub(name,data.teams);
  const players=club?data.elements.filter(p=>p.team===club.id).map(p=>({
   id:p.id,name:p.web_name||p.second_name||'Unknown',goals:Number(p.goals_scored)||0,assists:Number(p.assists)||0,
   minutes:Number(p.minutes)||0,starts:Number(p.starts)||0,position:Number(p.element_type)||0,
   xg:Number(p.expected_goals),xa:Number(p.expected_assists),status:p.status||'',news:p.news||'',
   chance:typeof p.chance_of_playing_next_round==='number'?p.chance_of_playing_next_round:null
  })).sort((a,b)=>(b.goals+b.assists)-(a.goals+a.assists)):[];
  return {name,club,players,history,opponent};
 });
 const candidates=[];
 for(const side of sides){
  const opponent=side.opponent,defense=opponent?.games||[];
  const conceded=defense.length?weightedRate(defense,'ga',side===sides[0]?false:true):null;
  const clean=defense.length?defense.filter(g=>g.ga===0).length/defense.length:null;
  const shots=(opponent?.detail||[]).map(g=>g.sot).filter(Number.isFinite);
  const recentGA=defense.slice(0,5).map(g=>g.ga);
  const earlierGA=defense.slice(5,10).map(g=>g.ga);
  const trend=recentGA.length>=3&&earlierGA.length>=3?recentGA.reduce((a,b)=>a+b,0)/recentGA.length-earlierGA.reduce((a,b)=>a+b,0)/earlierGA.length:null;
  for(const p of side.players){
   if(p.position===1||p.minutes<270||p.starts<2||['i','s','u'].includes(p.status)||p.chance===0)continue;
   const avgMinutes=Math.min(90,p.minutes/Math.max(1,p.starts));
   const availability=p.chance===null?(p.status==='a'?1:null):Math.max(0,Math.min(1,p.chance/100));
   for(const kind of ['goal','assist']){
    const count=kind==='goal'?p.goals:p.assists,expected=kind==='goal'?p.xg:p.xa;
    if(count===0&&!(Number.isFinite(expected)&&expected>0))continue;
    candidates.push({p,kind,count,side,conceded,clean,shots,trend,avgMinutes,availability});
   }
  }
 }
 // Retrieve recent match-by-match records before ranking, not just for the three preselected players.
 // Limit requests to meaningful candidates, and fetch once per player for both goal and assist props.
 // Rank potential players using BOTH goal and assist production, including xG/xA.
 // Fetch recent histories for the highest-potential distinct players, not only goalscorers.
 const potential=p=>((p.goals+p.assists)+Math.max(0,p.xg||0)+Math.max(0,p.xa||0))*90/Math.max(270,p.minutes);
 const shortlist=[...new Map(candidates.slice().sort((a,b)=>potential(b.p)-potential(a.p))
  .map(c=>[c.p.id,c.p])).values()].slice(0,40);
 const histories=new Map();
 await Promise.all(shortlist.map(async p=>histories.set(p.id,await v35PlayerHistory(p.id,chosen.date))));
 for(const c of candidates){
  const report=histories.get(c.p.id),recent=report?.rows?.length>=5?report.rows:null;
  const key=c.kind==='goal'?'goals_scored':'assists';
  const expectedKey=c.kind==='goal'?'expected_goals':'expected_assists';
  const minutes=recent?recent.reduce((a,g)=>a+Number(g.minutes),0)/recent.length:c.avgMinutes;
  const hits=recent?recent.filter(g=>Number(g[key])>=1).length:0;
  c.recent=recent?{hits,total:recent.length,minutes}:null;
  const seasonActual=c.count*90/Math.max(1,c.p.minutes);
  const seasonExpected=Number.isFinite(c.kind==='goal'?c.p.xg:c.p.xa)?
   Math.max(0,c.kind==='goal'?c.p.xg:c.p.xa)*90/Math.max(1,c.p.minutes):null;
  const seasonIntensity=seasonExpected===null?seasonActual:.65*seasonExpected+.35*seasonActual;
  // Use observed recent xG/xA when available; never assume a missing value is zero.
  const observed=recent?recent.map(g=>Number(g[expectedKey])).filter(Number.isFinite):[];
  const recentX=observed.length>=5?observed.reduce((a,b)=>a+b,0)*90/
   Math.max(1,recent.reduce((a,g)=>a+Number(g.minutes),0)):null;
  const recentGoals=recent?recent.reduce((a,g)=>a+Number(g[key]),0)*90/
   Math.max(1,recent.reduce((a,g)=>a+Number(g.minutes),0)):null;
  const recentIntensity=recentX===null?recentGoals:recentGoals===null?recentX:.7*recentX+.3*recentGoals;
  const intensity=recentIntensity===null?seasonIntensity:.55*seasonIntensity+.45*recentIntensity;
  const opponentBaseline=c.conceded===null?1:Math.max(.78,Math.min(1.22,c.conceded/1.35));
  // Goals conceded is a TEAM proxy, not evidence of a particular defender/flank.
  const defensiveTrend=c.trend===null?1:Math.max(.94,Math.min(1.06,1+c.trend*.055));
  const opponentFactor=opponentBaseline*defensiveTrend;
  const expectedMinutes=Math.max(0,Math.min(90,minutes));
  const availabilityFactor=c.availability===null?.85:c.availability;
  const intensityAdjusted=Math.max(0,intensity)*opponentFactor*expectedMinutes/90;
  c.probability=Math.max(0,Math.min(.95,(1-Math.exp(-intensityAdjusted))*availabilityFactor));
  c.expectedMinutes=expectedMinutes;
  c.recentX=recentX;
  c.qualified=!!c.recent&&c.conceded!==null&&c.availability!==null;
  c.historyError=report?.error||null;
 }
 candidates.sort((a,b)=>b.probability-a.probability);
 const picks=[];
 for(const c of candidates){if(!picks.some(x=>x.p.id===c.p.id)){picks.push(c);if(picks.length===3)break}}
 let threeLeg='<div class="panel"><h2>⚽ Automatic 3-Leg · Goals & Assists · V36</h2><p class="desc">Three highest estimated outcomes across goals AND assists, with distinct players. Recent chance quality, minutes and opponent scoring resistance are considered when available. Experimental estimates, not calibrated probabilities.</p>';
 for(let i=0;i<3;i++){
  const c=picks[i];if(!c){threeLeg+='<div class="leg">Leg '+(i+1)+' · Insufficient verified candidates</div>';continue}
  const recent=c.recent?c.recent.hits+'/'+c.recent.total+' appearances':'Match logs unavailable';
  const avail=c.availability===null?'availability unverified':c.availability<.8?'availability concern':'listed available (not confirmed starter)';
  const minutes=Math.round(c.expectedMinutes);
  const oppName=c.side.opponent?.name||'Opponent';
  const defense=c.conceded===null?'defensive record unavailable':
   oppName+' conceded '+c.conceded.toFixed(1)+' goals/match in the sampled results';
  const form=c.recentX===null?'recent chance-quality data unavailable':
   'recent '+(c.kind==='goal'?'xG':'xA')+' rate '+c.recentX.toFixed(2)+'/90';
  const trend=c.trend===null?'':c.trend>.2?' · conceding more recently':c.trend<-.2?' · conceding less recently':'';
  const note=defense+trend+' · '+form+' · ~'+minutes+' min · '+avail+'.';
  threeLeg+='<div class="leg"><strong>Leg '+(i+1)+' — '+escapeHtml(c.p.name)+' 1+ '+(c.kind==='goal'?'Goal':'Assist')+'</strong>'+
   '<div class="row" style="margin-top:8px"><span class="muted">'+escapeHtml(recent)+'</span><b>'+(c.qualified?(c.probability*100).toFixed(1)+'%':'Provisional '+(c.probability*100).toFixed(1)+'%')+'</b></div>'+
   '<p class="desc" style="margin:6px 0 0">'+escapeHtml(note)+'</p></div>';
 }
 const failures=[...histories.values()].filter(x=>x?.error);if(failures.length)threeLeg+='<p class="desc err">Recent match logs could not be retrieved for '+failures.length+'/'+histories.size+' checked players. Worker must support /fpl-player-history. No match logs were invented.</p>';
 threeLeg+='<p class="desc">Team goals conceded is only a defensive proxy; defender-specific weaknesses, chance-concession locations, starting lineups and injuries are NOT verified. No claims about particular flanks or defenders are inferred. FPL assists use FPL definitions, which can differ from official match assists. Provisional estimates have missing inputs.</p></div>';
 const cell=x=>x===undefined||x===null?'—':escapeHtml(x);
 let apiPlayers='<div class="panel"><h2>⚽ Current-season player statistics · FPL</h2><p class="desc">Actual reported season totals; no inferred confirmed starters.</p>';
 for(const r of sides){apiPlayers+='<h3>'+escapeHtml(r.name)+'</h3>'+(r.club?'<div class="players">'+r.players.slice(0,18).map(p=>'<div class="player"><strong>'+escapeHtml(p.name)+'</strong><div class="stats"><span>Goals <b>'+cell(p.goals)+'</b></span><span>Assists <b>'+cell(p.assists)+'</b></span><span>Minutes <b>'+cell(p.minutes)+'</b></span><span>Starts <b>'+cell(p.starts)+'</b></span><span>xG <b>'+(Number.isFinite(p.xg)?p.xg.toFixed(2):'—')+'</b></span><span>xA <b>'+(Number.isFinite(p.xa)?p.xa.toFixed(2):'—')+'</b></span></div></div>').join('')+'</div>':'<div class="hint">FPL team identity not verified; player data withheld.</div>')}
 apiPlayers+='</div>';
 return {threeLeg,apiPlayers};
}
async function soccerPlayerLegs(h,a,home,away,lambdaH,lambdaA){
 const teams=[{t:h,c:home,lambda:lambdaH,opp:a},{t:a,c:away,lambda:lambdaA,opp:h}];
 const candidates=[],coverage=[];
 for(const {t,c,lambda,opp} of teams){
  const ids=t.games.slice(0,8).map(g=>g.eventId).filter(Boolean);
  const responses=[];for(let j=0;j<ids.length;j+=3){const batch=await Promise.allSettled(ids.slice(j,j+3).map(id=>get(root+'soccer/'+league+'/summary?event='+encodeURIComponent(id))));responses.push(...batch)}
  const logs=new Map();let usable=0,statMatches=0,eventMatches=0;
  for(const response of responses){
   if(response.status!=='fulfilled')continue;
   const d=response.value,teamId=c.team?.id;
   const stats=soccerPlayerStatRows(d,teamId);
   const events=soccerEventRows(d,teamId);
   const rows=stats.length?stats:events;
   if(!rows.length)continue;
   usable++;if(stats.length)statMatches++;else eventMatches++;
   const hasCompleteBox=stats.length>0;
   for(const p of rows){
    const rec=logs.get(p.id)||{name:p.name,goals:0,assists:0,appearances:0,minutes:[],goalGames:0,assistGames:0};
    rec.goals+=Math.max(0,p.goals||0);rec.assists+=Math.max(0,p.assists||0);
    if((p.goals||0)>0)rec.goalGames++;
    if((p.assists||0)>0)rec.assistGames++;
    if(hasCompleteBox){rec.appearances++;if(Number.isFinite(p.minutes))rec.minutes.push(p.minutes)}
    logs.set(p.id,rec);
   }
  }
  coverage.push(t.name+': '+usable+'/'+ids.length+' usable summaries ('+statMatches+' player box scores; '+eventMatches+' event-only)');
  for(const p of logs.values()){
   for(const [kind,countKey] of [['goals','goalGames'],['assists','assistGames']]){
    if(p[countKey]<1)continue;
    // Only full box-score appearances are a valid denominator.
    const rate=p.appearances>=5?p[countKey]/p.appearances:null;
    candidates.push({name:p.name,team:t.name,kind,rate,appearances:p.appearances,events:p[countKey],usable,
      minutes:p.minutes.length?p.minutes.reduce((x,y)=>x+y,0)/p.minutes.length:null,
      opp:opp.name,oppGA:opp.games.length?opp.games.reduce((n,g)=>n+g.ga,0)/opp.games.length:null});
   }
  }
 }
 candidates.sort((x,y)=>(y.rate!==null)-(x.rate!==null)?(x.rate!==null? -1:1):((y.rate??-1)-(x.rate??-1)||y.events-x.events));
 const picks=[];
 for(const c of candidates){if(picks.every(p=>p.name!==c.name)){picks.push(c);if(picks.length===3)break}}
 let html='<div class="panel"><h2>⚽ Best goals & assists selections</h2><p class="v51-fine">League-specific match reports · Verified data only</p>';
 for(let i=0;i<3;i++){
  const p=picks[i];
  if(!p)continue;
  html+='<div class="leg"><strong>Leg '+(i+1)+' · '+escapeHtml(p.name)+'</strong> · 1+ '+(p.kind==='goals'?'goal':'assist')+
   '<br><small>'+escapeHtml(p.team)+' vs '+escapeHtml(p.opp)+'</small>'+
   '<br><small>Recent occurrence: '+(p.rate===null?'sample unavailable':p.events+'/'+p.appearances+' observed appearances')+'</small>'+
   '<br><small>Estimated probability: unavailable until opponent and minutes adjustments are verified</small>'+
   '<br><small>'+p.events+' recorded scoring matches · Opponent conceded '+(p.oppGA===null?'unavailable':p.oppGA.toFixed(1)+' goals/game')+' · Minutes '+(p.minutes===null?'unverified':p.minutes.toFixed(0)+' average')+'</small></div>';
 }
 if(!picks.length)html+='<div class="v51-empty"><strong>No verified player selections yet</strong><small>Completed match summaries did not provide usable player goals/assists. The app will not invent three picks.</small></div>';
 else if(picks.length<3)html+='<p class="v51-fine">Only '+picks.length+' distinct player selection(s) supported by the retrieved records.</p>';
 html+='<details class="v51-sources"><summary>Historical match coverage</summary><p class="v51-fine">'+escapeHtml(coverage.join(' · '))+'</p></details></div>';
 return html;
}

// V53 league-specific player totals, with explicit quality and identity gates.
const V53_SOURCE_LEAGUES=new Set(['esp.1','eng.1','ita.1','ger.1','fra.1','uefa.champions','uefa.europa','usa.1','mex.1']);
function v53TeamKey(s){
 const aliases={'rc celta vigo':'celta vigo','rc celta':'celta vigo',
 'celta de vigo':'celta vigo','real madrid cf':'real madrid',
 'fc barcelona':'barcelona','atletico de madrid':'atletico madrid',
 'athletic':'athletic bilbao','athletic bilbao':'athletic bilbao',
 'real betis balompie':'real betis','real sociedad san sebastian':'real sociedad',
 'internazionale':'inter','inter milan':'inter','ac milan':'milan',
 'bayern munich':'bayern munich','fc bayern munchen':'bayern munich',
 'paris saint germain':'paris saint germain','psg':'paris saint germain'};
 const key=String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9 ]/g,' ')
 .replace(/\b(fc|cf|sc|club|football|futbol|calcio|de|the)\b/g,' ')
 .replace(/\s+/g,' ').trim();
 return aliases[key]||key;
}
function v53FindTeam(players,name){
 const key=v53TeamKey(name),teams=[...new Set(players.map(p=>p.team))];
 const matches=teams.filter(t=>v53TeamKey(t)===key);
 return matches.length===1?matches[0]:null;
}
async function v53LeaguePicks(home,away,h,a){
 const leagueName=Object.keys(soccerLeagues).find(k=>soccerLeagues[k]===league)||league;
 const u=new URL(footballWorker);
 u.searchParams.set('endpoint','/soccer-players');
 u.searchParams.set('league',league);
 const resp=await get(u.toString());
 if(!resp.ok||!Array.isArray(resp.players))throw Error(resp.error||'Player dataset unavailable');
 const homeName=home.team?.displayName||h.name,awayName=away.team?.displayName||a.name;
 const homeKey=v53FindTeam(resp.players,homeName),awayKey=v53FindTeam(resp.players,awayName);
 if(!homeKey||!awayKey)throw Error('Team identity could not be matched safely: '+homeName+' / '+awayName);
 const eligible=resp.players.filter(p=>p.team===homeKey||p.team===awayKey)
  .filter(p=>Number.isFinite(p.appearances)&&p.appearances>=5&&Number.isFinite(p.minutes)&&p.minutes>=450)
  .flatMap(p=>['goal','assist'].map(kind=>{
   const observed=kind==='goal'?p.goals:p.assists;
   if(!Number.isFinite(observed)||observed<0)return null;
   const per90=90*observed/p.minutes;
   const averageMinutes=p.minutes/p.appearances;
   const opportunity=per90*Math.min(1,averageMinutes/85);
   return {...p,kind,observed,per90,opportunity,averageMinutes};
  })).filter(p=>p&&p.observed>0&&p.opportunity>0)
  .sort((x,y)=>y.opportunity-x.opportunity||y.observed-x.observed);
 const picks=[];
 for(const p of eligible){if(!picks.some(x=>x.id===p.id)){picks.push(p);if(picks.length===3)break}}
 const row=(p,i)=>'<div class="leg"><strong>Leg '+(i+1)+' — '+escapeHtml(p.name)+' · 1+ '+p.kind+'</strong>'+
  '<div class="v51-fine">'+escapeHtml(p.team)+' · '+p.observed+' season '+(p.kind==='goal'?'goals':'assists')+
  ' · '+p.appearances+' appearances · '+p.minutes+' minutes</div>'+
  '<div class="v51-fine">Observed season rate: '+p.per90.toFixed(2)+'/90 · Avg '+p.averageMinutes.toFixed(0)+' min/appearance · Estimated match probability unavailable</div></div>';
 const threeLeg='<div class="panel"><h2>⚽ 3 goals & assists candidates</h2>'+
  '<p class="v51-fine">'+escapeHtml(leagueName)+' · StrikerAPI season totals · ranked by observed involvement and minutes, not opponent-adjusted probabilities</p>'+
  (picks.length?picks.map(row).join(''):'<div class="v51-empty">Not enough complete player data to recommend three selections. No missing goals, assists or minutes were assumed to be zero.</div>')+
  '<details class="v51-sources"><summary>Data quality and limits</summary><p class="v51-fine">Season '+resp.season+
  ' · '+resp.count+' complete player records · '+escapeHtml(resp.source)+
  '. Requires 5+ appearances and 450+ minutes. No verified opponent defensive metrics, expected starting XI, injuries, recent game-by-game hit rates or calibrated probabilities. These are candidates, not guaranteed outcomes.</p></details></div>';
 const apiPlayers='<details class="panel"><summary>League player-data source</summary><p class="v51-fine">'+
  escapeHtml(resp.source)+' · '+escapeHtml(leagueName)+' · '+resp.count+' players. Matched '+escapeHtml(homeKey)+
  ' and '+escapeHtml(awayKey)+'. Data fetched '+escapeHtml(resp.fetchedAt)+
  '. No current-season player statistics were inferred from roster identity alone.</p></details>';
 return {threeLeg,apiPlayers};
}

async function analyzeSoccer(){
 if(!chosen||sport!=='soccer')return;
 const btn=$('simulate');btn.disabled=true;btn.textContent='Loading completed soccer matches…';$('results').innerHTML='<div class="panel"><h2>⚽ Automatic 3-Leg · Goals & Assists</h2><p class="desc">Loading player records (missing data stays unavailable)…</p></div>';
 try{
 const [away,home]=teamIds();if(!away||!home)throw Error('Missing teams');
 const [a,h]=await Promise.all([soccerHistory(away),soccerHistory(home)]);
 const detail=await Promise.allSettled([soccerDetailedHistory(away,a),soccerDetailedHistory(home,h)]);
 a.detail=detail[0].status==='fulfilled'?detail[0].value:[];
 h.detail=detail[1].status==='fulfilled'?detail[1].value:[];
 const avg=(g,k)=>g.reduce((s,x)=>s+x[k],0)/g.length;
 // Blend each side's attacking rate with opponent's defensive rate, plus a conservative baseline.
 const lambdaH=Math.max(.15,Math.min(4.5,.46*weightedRate(h.games,'gf',true)+.38*weightedRate(a.games,'ga',false)+.16*1.35));
 const lambdaA=Math.max(.15,Math.min(4.5,.46*weightedRate(a.games,'gf',false)+.38*weightedRate(h.games,'ga',true)+.16*1.15));
 let apiPlayers,threeLeg;
 if(league==='eng.1'){
  try{({apiPlayers,threeLeg}=await v31FplPanels(away,home,a,h));}
  catch(e){
   const msg=escapeHtml(e.message);
   threeLeg='<div class="panel"><h2>⚽ Automatic 3-Leg · Goals & Assists</h2><p class="desc">FPL player data unavailable: '+msg+'</p></div>';
   apiPlayers='<div class="panel"><h2>⚽ Current-season player statistics</h2><p class="desc">FPL source unavailable: '+msg+'</p></div>';
  }
 }else{
  if(V53_SOURCE_LEAGUES.has(league)){
   try{({threeLeg,apiPlayers}=await v53LeaguePicks(home,away,h,a));}
   catch(e){
    // A StrikerAPI failure must not disable independent ESPN match-report research.
    // Do not imply ESPN event-only summaries provide complete player appearances.
    const sourceError=String(e?.message||'League player source unavailable');
    try{
     threeLeg=await soccerPlayerLegs(h,a,home,away,lambdaH,lambdaA);
     apiPlayers='<details class="panel"><summary>Player data source</summary><p class="v51-fine">StrikerAPI unavailable or could not match both clubs ('+escapeHtml(sourceError)+'). Showing only player events or box scores observed in ESPN completed-match reports. Historical coverage is limited; missing appearances, minutes, injuries, and lineups are not assumed.</p></details>';
    }catch(fallbackError){
     threeLeg='<div class="panel"><h2>⚽ Player selections unavailable</h2><p class="v51-fine">Neither league season totals nor completed-match reports returned sufficient verified player information for this fixture. No picks invented.</p></div>';
     apiPlayers='<details class="panel"><summary>Source diagnostics</summary><p class="v51-fine">League source: '+escapeHtml(sourceError)+' · ESPN: '+escapeHtml(String(fallbackError?.message||'unavailable'))+'</p></details>';
    }
   }
  }else{
   const legs=await Promise.allSettled([soccerPlayerLegs(h,a,home,away,lambdaH,lambdaA)]);
   apiPlayers=v52LazySourcePanel(away,home);
   threeLeg=legs[0].status==='fulfilled'?legs[0].value:'<div class="panel"><h2>⚽ Goals & assists</h2><p class="v51-fine">Player-level match data could not be verified. No fabricated selections.</p></div>';
  }
 }
 btn.textContent='Running 100,000 trials…';await new Promise(r=>setTimeout(r,30));
 const n=100000,count={home:0,draw:0,away:0,over15:0,over25:0,over35:0,btts:0,homeClean:0,awayClean:0},scores=new Map();let sumH=0,sumA=0;
 for(let i=0;i<n;i++){let x=poisson(lambdaH),y=poisson(lambdaA);sumH+=x;sumA+=y;if(x>y)count.home++;else if(x===y)count.draw++;else count.away++;if(x+y>=2)count.over15++;if(x+y>=3)count.over25++;if(x+y>=4)count.over35++;if(x>0&&y>0)count.btts++;if(y===0)count.homeClean++;if(x===0)count.awayClean++;let k=x+'–'+y;scores.set(k,(scores.get(k)||0)+1)}
 const pct=k=>(100*count[k]/n).toFixed(1)+'%';const top=[...scores].sort((a,b)=>b[1]-a[1]).slice(0,5);
 const tile=(name,val)=>'<div class="tile"><small>'+escapeHtml(name)+'</small><b>'+escapeHtml(val)+'</b></div>';
 $('dataStatus').textContent='Completed match records loaded: '+h.games.length+' '+h.name+' matches; '+a.games.length+' '+a.name+' matches. Competition: '+Object.keys(soccerLeagues).find(k=>soccerLeagues[k]===league)+'.';
 $('results').innerHTML='<div class="panel"><h2>⚽ Soccer · 100,000 trials</h2><p class="desc">Independent Poisson goal trials based on completed match scores before this fixture. Home/away weighting and recent results are used; no invented player data.</p><div class="grid">'+tile(h.name+' win',pct('home'))+tile('Draw',pct('draw'))+tile(a.name+' win',pct('away'))+tile('Both teams score',pct('btts'))+tile('Over 1.5 goals',pct('over15'))+tile('Over 2.5 goals',pct('over25'))+tile('Over 3.5 goals',pct('over35'))+tile('Expected goals (home / away)',lambdaH.toFixed(2)+' / '+lambdaA.toFixed(2))+'</div></div>'+
 threeLeg+apiPlayers+
 '<div class="panel"><h2>Most frequent scorelines</h2>'+top.map(([score,c],i)=>'<div class="leg">'+(i+1)+'. <strong>'+escapeHtml(h.name)+' '+score+' '+escapeHtml(a.name)+'</strong> · <b>'+(100*c/n).toFixed(1)+'%</b></div>').join('')+'</div>'+
 '<div class="panel"><h2>Recent team form · actual scores</h2><div class="grid">'+[h,a].map(t=>'<div class="tile"><strong>'+escapeHtml(t.name)+'</strong><p class="desc">'+t.games.length+' completed matches<br>Goals scored / match: '+avg(t.games,'gf').toFixed(2)+'<br>Goals allowed / match: '+avg(t.games,'ga').toFixed(2)+'<br>Clean sheets: '+t.games.filter(g=>g.ga===0).length+'<br>Failed to score: '+t.games.filter(g=>g.gf===0).length+'</p></div>').join('')+'</div></div>'+
 soccerMetricPanel(h,a)+
 '<div class="panel"><h3>Method and limitations</h3><p class="desc">Match scores come from ESPN unofficial competition-specific team schedules. The model blends each club’s recent attack and opponent’s recent goals conceded, with home/away weighting and a modest baseline. It assumes independent Poisson goals and does not yet use expected-goals event data, confirmed lineups, injuries, tactics, opponent strength, or in-game events. Percentages are uncalibrated model frequencies, not guarantees or verified Kalshi contracts. Player projections are experimental, and unverified defender assignments and lineups are excluded.</p></div>';
 // V58: no API-Football player-data requests on automatic soccer analysis.
 }catch(e){$('results').innerHTML='<div class="panel err">Soccer analysis unavailable: '+escapeHtml(e.message)+'. No simulated probabilities were fabricated.</div>'}finally{btn.disabled=false;btn.textContent='Re-run 100,000 soccer trials'}
}


// Tennis ESPN scoreboard: events are tournaments, nested competitions are individual matches.
let tennisMatches=[];
function tennisPlayers(m){return (m.competitors||[]).filter(c=>c.athlete||c.team).slice(0,2)}
function tennisName(c){return c?.athlete?.displayName||c?.athlete?.fullName||c?.team?.displayName||c?.displayName||'TBD'}
function tennisId(c){return String(c?.athlete?.id||c?.team?.id||'')}
function tennisDone(m){return !!m.status?.type?.completed}
function tennisIsSingles(group){let name=String(group.grouping?.displayName||group.name||'').toLowerCase();return name.includes('single')&&!name.includes('double')}
function tennisFlatten(payload){
 const out=[];
 for(const tournament of payload.events||[]){
  for(const group of tournament.groupings||[]){
   if(!tennisIsSingles(group))continue;
   for(const match of group.competitions||[]){
    const p=tennisPlayers(match);if(p.length!==2)continue;
    out.push({...match,_tournament:tournament.name||'Tournament',_draw:group.grouping?.displayName||'Singles',_round:match.round?.displayName||'',_date:match.date||tournament.date});
   }
  }
 }
 return out;
}
async function loadTennisSchedule(){
 showList();$('status').textContent='Loading ATP / WTA tournament draws…';$('games').innerHTML='';
 try{
  const now=new Date(),dates=[-56,-42,-28,-14,-7,0,7].map(offset=>{let d=new Date(now);d.setDate(d.getDate()+offset);return dateKey(d)});
  const res=await Promise.allSettled(dates.map(d=>get(root+'tennis/'+tennisTour+'/scoreboard?dates='+d)));
  let all=res.filter(x=>x.status==='fulfilled').flatMap(x=>tennisFlatten(x.value));
  const seen=new Set();tennisMatches=all.filter(m=>{let id=String(m.id)+'-'+m._tournament;if(seen.has(id))return false;seen.add(id);return true});
  tennisMatches.sort((a,b)=>new Date(a._date)-new Date(b._date));
  const upcoming=tennisMatches.filter(m=>!tennisDone(m)&&new Date(m._date).getTime()>=Date.now()-86400000);
  const recent=tennisMatches.filter(tennisDone).slice(-30);
  const visible=[...upcoming,...recent].slice(0,110);
  $('status').textContent=visible.length+' singles matches · '+tennisTour.toUpperCase()+' · '+res.filter(x=>x.status==='fulfilled').length+'/'+res.length+' source requests succeeded';
  if(!visible.length)$('status').textContent='No singles matches returned in the current tournament window. Try the other tour or refresh.';
  $('games').innerHTML=visible.map((m,i)=>'<button class="game" data-t="'+i+'"><span><strong>'+escapeHtml(tennisName(tennisPlayers(m)[0]))+' vs '+escapeHtml(tennisName(tennisPlayers(m)[1]))+'</strong><small>'+escapeHtml(m._tournament)+' · '+escapeHtml(m._round)+' · '+escapeHtml(dateText(m._date))+' · '+escapeHtml(m.status?.type?.description||'Scheduled')+'</small></span><span style="color:var(--a)">›</span></button>').join('');
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>openTennisGame(visible[+b.dataset.t]));
 }catch(e){$('status').textContent='Tennis data connection unavailable: '+e.message}
}
function openTennisGame(m){
 chosen=m;$('listing').classList.add('hidden');$('detail').classList.remove('hidden');
 const p=tennisPlayers(m);
 $('matchTitle').textContent=tennisName(p[0])+' vs '+tennisName(p[1]);
 $('matchDate').textContent=m._tournament+' · '+m._round+' · '+dateText(m._date);
 $('results').innerHTML='';
 $('simulate').classList.add('hidden');$('simulate').textContent='Analyze tennis matchup';
 $('dataStatus').textContent='ATP/WTA singles schedule connected. Run an exploratory 100,000-trial model when at least five verified completed singles matches with set scores are available for each player.';
 window.scrollTo(0,0);const selected=m;setTimeout(()=>{if(chosen===selected)analyzeTennis()},0);
}

function tennisSets(match){
 const cs=tennisPlayers(match);
 if(cs.length!==2)return null;
 const extract=c=>{
  const lines=c.linescores||c.lineScores||[];
  return lines.map(x=>Number(x.value??x.displayValue??x.score)).filter(Number.isFinite);
 };
 const a=extract(cs[0]),b=extract(cs[1]);
 if(!a.length||a.length!==b.length)return null;
 const played=a.map((x,i)=>[x,b[i]]).filter(([x,y])=>x>=0&&y>=0&&(x+y)>0);
 if(!played.length)return null;
 const won=[0,0];for(const [x,y] of played){if(x>y)won[0]++;else if(y>x)won[1]++}
 const total=played.reduce((n,[x,y])=>n+x+y,0);
 return {sets:played,won,total};
}
function tennisHistoricalRecords(id){
 const now=new Date(chosen._date||chosen.date).getTime();
 const seen=new Set(),out=[];
 for(const m of tennisMatches){
  if(!tennisDone(m)||new Date(m._date).getTime()>=now||String(m.id)===String(chosen.id))continue;
  const cs=tennisPlayers(m),ix=cs.findIndex(c=>tennisId(c)===id);
  if(ix<0||cs.length!==2)continue;
  const key=String(m.id)+'-'+String(m._tournament);
  if(seen.has(key))continue;seen.add(key);
  const r=tennisSets(m);if(!r)continue;
  const winner=cs[ix].winner;
  const win=typeof winner==='boolean'?winner:r.won[ix]>r.won[1-ix];
  if(r.won[ix]===r.won[1-ix]&&typeof winner!=='boolean')continue;
  out.push({win,total:r.total,setsWon:r.won[ix],setsLost:r.won[1-ix],straight:r.won[ix]===2&&r.won[1-ix]===0});
 }
 return out;
}
function tennisPercent(n,d){return d?((100*n/d).toFixed(1)+'%'):'Unavailable'}
function analyzeTennis(){
 if(!chosen||sport!=='tennis')return;
 const pair=tennisPlayers(chosen),names=pair.map(tennisName);
 const logs=pair.map(c=>tennisHistoricalRecords(tennisId(c)));
 const enough=logs.every(l=>l.length>=5);
 const summaries=logs.map((l,i)=>{
  const avg=l.length?l.reduce((v,x)=>v+x.total,0)/l.length:null;
  return '<div class="tile"><small>'+escapeHtml(names[i])+'</small><b>'+l.length+' matches</b><small>Verified completed singles matches with set scores</small><div class="desc">Wins: '+tennisPercent(l.filter(x=>x.win).length,l.length)+'<br>Average total games: '+(avg===null?'Unavailable':avg.toFixed(1))+'</div></div>';
 });
 let prediction='';
 if(enough){
  // Resampling is explicitly an exploratory model, not a calibrated win probability.
  const n=100000,results=[0,0],totals=[],scores=new Map();
  for(let i=0;i<n;i++){
   const p=logs.map(l=>l[Math.floor(Math.random()*l.length)]);
   // Use both players' own match-win frequencies; tie-break 50/50.
   const win0=p[0].win&&!p[1].win?true:!p[0].win&&p[1].win?false:Math.random()<.5;
   results[win0?0:1]++;
   const sets=win0?p[0]:p[1];
   const loser=win0?p[1]:p[0];
   // Estimated total is an average of two historical match totals, not a generated set-by-set score.
   totals.push(Math.round((sets.total+loser.total)/2));
   const score=sets.setsWon+'–'+sets.setsLost;
   scores.set(score,(scores.get(score)||0)+1);
  }
  totals.sort((a,b)=>a-b);
  const mean=totals.reduce((x,y)=>x+y,0)/n;
  const median=totals[Math.floor(n/2)];
  const pOver=threshold=>tennisPercent(totals.filter(x=>x>threshold).length,n);
  const first=results[0]>=results[1]?0:1;
  prediction='<div class="panel"><h2>100,000-trial tennis research model</h2><div class="grid">'+
  '<div class="tile"><small>Estimated winner</small><b style="font-size:19px">'+escapeHtml(names[first])+'</b><small>'+tennisPercent(results[first],n)+' model frequency</small></div>'+
  '<div class="tile"><small>Average total games</small><b>'+mean.toFixed(1)+'</b><small>Median '+median+' · 10–90% range '+totals[Math.floor(n*.1)]+'–'+totals[Math.floor(n*.9)]+'</small></div>'+
  '<div class="tile"><small>Over 20.5 games</small><b>'+pOver(20.5)+'</b></div>'+
  '<div class="tile"><small>Over 22.5 games</small><b>'+pOver(22.5)+'</b></div>'+
  '</div><p class="desc">This is a simplified resampling of verified tournament set scores, not a point-by-point match simulation. Winner frequency and total games are exploratory, not calibrated probabilities. No serve, return, surface, opponent-strength or injury adjustments.</p></div>';
 }else{
  prediction='<div class="panel"><h2>Match projection unavailable</h2><p class="desc">Need at least five completed singles matches with usable set scores for each player from the loaded draws. The app will not invent a winner, set score, or total-games projection. For reliable forecasting, a full player-history provider is needed.</p></div>';
 }
 $('results').innerHTML=prediction+'<div class="panel"><h2>Verified player match history</h2><div class="grid">'+summaries.join('')+'</div><p class="desc">Only matches loaded in this session and played before the selected fixture are counted. Exact set scores cannot be known before a match; projections are estimates.</p></div>';
}


// V41 UFC: ESPN's public MMA event scoreboard. No invented fighter props or calibrated odds.
let ufcEvent=null;
async function loadUFCSchedule(){
 showList();$('status').textContent='Loading UFC events from ESPN…';$('games').innerHTML='';
 try{
  const now=new Date(),yr=now.getFullYear(),years=[yr,yr+1];
  const requests=await Promise.allSettled(years.map(y=>get(root+'mma/ufc/scoreboard?dates='+y+'&limit=150')));
  const all=requests.filter(x=>x.status==='fulfilled').flatMap(x=>x.value.events||[]);
  const unique=new Map(all.map(e=>[String(e.id),e]));
  const sorted=[...unique.values()].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const future=sorted.filter(e=>new Date(e.date)>=new Date(now.getTime()-86400000));
  events=(future.length?future:sorted.slice(-12)).slice(0,35);
  if(!events.length){$('status').textContent='No UFC events returned by ESPN. This source may be unavailable; no events will be fabricated.';return}
  $('status').textContent=(future.length?'Upcoming UFC events':'Recent UFC events for connection testing')+' · ESPN public event feed';
  $('games').innerHTML=events.map((e,i)=>'<button class="game" data-ufc="'+i+'"><span><strong>'+escapeHtml(e.name||e.shortName||'UFC event')+'</strong><small>'+escapeHtml(dateText(e.date))+' · '+escapeHtml(e.status?.type?.description||'Event')+'</small></span><span style="color:var(--a)">›</span></button>').join('');
  document.querySelectorAll('[data-ufc]').forEach(b=>b.onclick=()=>openUFCEvent(events[+b.dataset.ufc]));
 }catch(e){$('status').innerHTML='<span class="err">UFC connection failed: '+escapeHtml(e.message)+'</span>'}
}
let ufcFights=[];
function ufcNames(f){return (f.competitors||[]).map(x=>x.athlete?.displayName||x.athlete?.fullName||x.team?.displayName||x.displayName).filter(Boolean)}
function ufcBoutName(f,i){const n=ufcNames(f);return n.length>=2?n.slice(0,2).join(' vs '):(f.name||f.shortName||'Bout '+(i+1))}
function openUFCEvent(e){
 ufcEvent=e;chosen=e;$('listing').classList.add('hidden');$('detail').classList.remove('hidden');
 $('matchTitle').textContent=e.name||'UFC event';$('matchDate').textContent=dateText(e.date)+' · UFC';
 $('simulate').classList.add('hidden');$('simulate').textContent='Refresh fight card';
 $('dataStatus').textContent='Choose one fight below for an individual matchup view.';
 $('results').innerHTML='<div class="panel"><h2>Loading individual fights…</h2></div>';window.scrollTo(0,0);
 analyzeUFC();
}
async function analyzeUFC(){
 if(!ufcEvent)return;const b=$('simulate');b.disabled=true;b.textContent='Loading fights…';
 try{
  let data=ufcEvent;const root='https://site.api.espn.com/apis/site/v2/sports/';
  try{const detail=await get(root+'mma/ufc/summary?event='+encodeURIComponent(ufcEvent.id));if(detail?.header?.competitions?.length||detail?.competitions?.length)data={...ufcEvent,...detail}}catch(e){}
  ufcFights=data.header?.competitions||data.competitions||ufcEvent.competitions||[];
  if(!ufcFights.length){$('results').innerHTML='<div class="panel"><h2>No individual fights returned</h2><p class="desc">The event is available, but its fight card is missing from this feed.</p></div>';return}
  $('dataStatus').textContent=ufcFights.length+' individual bouts · ESPN event feed';
  $('results').innerHTML='<section class="panel v50-card" id="v50-card"><h2>🏆 Top 3 fighters to win</h2><p class="desc">Checking every matchup for opponent quality, sample size and verified statistics…</p></section><div class="panel"><h2>🥊 Choose a fight</h2>'+ufcFights.map((f,i)=>'<button class="game" data-bout="'+i+'"><span><strong>'+escapeHtml(ufcBoutName(f,i))+'</strong><small>'+escapeHtml(f.status?.type?.description||'Scheduled')+'</small></span><span>›</span></button>').join('')+'</div>';
  v50RankCard(ufcFights);
  document.querySelectorAll('[data-bout]').forEach(x=>x.onclick=()=>openUFCBout(+x.dataset.bout));
 }catch(e){$('results').innerHTML='<div class="panel err">UFC card unavailable: '+escapeHtml(e.message)+'</div>'}
 finally{b.disabled=false;b.textContent='Refresh fight card'}
}

// V50: Event-level winner research ranks *all* bouts by strength of available evidence.
// Scores are not win probabilities. Never convert these evidence scores to percentages.
let v50CardToken=0;
function v50FighterScore(a,b){
 const e=v48Evaluation(a,b),ra=v48Reliability(a),rb=v48Reliability(b);
 if(!e.lean)return null;
 const winner=e.lean,loser=winner===a?b:a,rw=winner===a?ra:rb,rl=winner===a?rb:ra;
 const evidence=Math.min(1,rw.history/5)*.25+Math.min(1,rl.history/5)*.2+
 Math.min(1,rw.opponents/4)*.2+Math.min(1,rl.opponents/4)*.15+
 Math.min(1,(rw.rounds||0)/20)*.1+Math.min(1,(rl.rounds||0)/20)*.1;
 const advantage=Math.min(2.5,Math.abs(e.points.reduce((z,p)=>z+p.score,0)));
 const hasConflict=!!(a.conflicts?.length||b.conflicts?.length);
 const verified=rw.confirmed>=2&&rl.confirmed>=2;
 const quality=rw.opponents>=3&&rl.opponents>=3;
 const score=advantage*(.3+.7*evidence)*(hasConflict?.65:1)*(verified?1:.75);
 return {winner,loser,score,verified,quality,evidence,reason:e.points[0]?.reason||'Limited comparative data',checks:e.checks};
}
async function v50RankCard(fights){
 const token=++v50CardToken,box=document.getElementById('v50-card');if(!box)return;
 const eligible=fights.map((f,i)=>({f,i,c:f.competitors||[]})).filter(x=>x.c.length>=2);
 const out=await Promise.all(eligible.map(async x=>{
  try{const [a,b]=await Promise.all(x.c.slice(0,2).map(ufcFetchFighter));return {...x,result:v50FighterScore(a,b)}}catch(err){return {...x,result:null}}
 }));
 if(token!==v50CardToken||!document.getElementById('v50-card'))return;
 const ranked=out.filter(x=>x.result).sort((a,b)=>b.result.score-a.result.score).slice(0,3);
 const safe=x=>escapeHtml(x);
 box.innerHTML='<h2>🏆 Top 3 fighters to win</h2><p class="v50-sub">Across '+eligible.length+' fights · evidence ranking, not calibrated win probabilities</p>'+
 (ranked.length?ranked.map((x,j)=>{
  const r=x.result,quality=r.verified&&r.quality&&r.evidence>=.65?'Better coverage':'Limited evidence';
  return '<button class="v50-win" data-card-bout="'+x.i+'"><span class="v50-index">'+(j+1)+'</span><span class="v50-win-text"><strong>'+safe(r.winner.name)+' · To win</strong><small>vs '+safe(r.loser.name)+' · '+quality+'</small><span>'+safe(r.reason)+'</span></span><span class="v50-arrow">›</span></button>';
 }).join(''):'<p class="desc">No matchup has enough comparable data to establish a tactical lean. Browse the individual fights below.</p>')+
 '<p class="v50-disclaimer">These are the strongest available tactical leans, not verified highest win probabilities. No precise percentages or Kalshi contracts are implied. Opponent-quality coverage and fight samples can be incomplete.</p>';
 box.querySelectorAll('[data-card-bout]').forEach(b=>b.onclick=()=>openUFCBout(+b.dataset.cardBout));
}

// V43: Data-driven individual bout research. Never substitute invented fighter stats.
const ufcStatAliases={
 slpm:['slpm','sigstrikeslandedperminute','significantstrikeslandedperminute','strikeslandedperminute'],
 sapm:['sapm','sigstrikesabsorbedperminute','significantstrikesabsorbedperminute','strikesabsorbedperminute'],
 strAcc:['strikingaccuracy','sigstrikeaccuracy','significantstrikingaccuracy','stracc'],
 strDef:['strikingdefense','sigstrikedefense','significantstrikingdefense','strdef'],
 td15:['takedownaverage','takedownsper15minutes','takedownsper15min','tdavg'],
 tdAcc:['takedownaccuracy','tdacc'],tdDef:['takedowndefense','tddef'],
 sub15:['submissionaverage','submissionsper15minutes','submissionattemptsper15minutes','subavg']
};
function ufcClean(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function ufcNum(x){if(typeof x==='number')return Number.isFinite(x)?x:null;if(typeof x!=='string')return null;const m=x.replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null}
function ufcExtractStats(payload){
 const out={},samples={};const seen=new WeakSet();
 function visit(obj,depth){if(!obj||typeof obj!=='object'||depth>9||seen.has(obj))return;seen.add(obj);
  if(Array.isArray(obj)){for(const item of obj.slice(0,300))visit(item,depth+1);return}
  const label=obj.label||obj.displayName||obj.name||obj.abbreviation||obj.shortDisplayName||obj.key||obj.type;
  const val=obj.displayValue??obj.value??obj.stat??obj.amount;
  if(label!=null&&val!=null&&typeof val!=='object'){
   const k=ufcClean(label);for(const [key,aliases] of Object.entries(ufcStatAliases))if(aliases.includes(k)&&out[key]===undefined){const n=ufcNum(val);if(n!==null){out[key]=n;samples[key]=String(label)}}
  }
  for(const [key,val2] of Object.entries(obj)){
   const k=ufcClean(key);for(const [field,aliases] of Object.entries(ufcStatAliases))if(aliases.includes(k)&&out[field]===undefined&&typeof val2!=='object'){const n=ufcNum(val2);if(n!==null){out[field]=n;samples[field]=key}}
   if(val2&&typeof val2==='object')visit(val2,depth+1)
  }
 }
 visit(payload,0);
 for(const k of ['strAcc','strDef','tdAcc','tdDef'])if(out[k]!=null&&out[k]>0&&out[k]<=1)out[k]*=100;
 return {stats:out,labels:samples};
}
function ufcAthleteData(c){const a=c?.athlete||{};return {id:a.id||c?.id,name:a.displayName||a.fullName||c?.displayName||'Fighter',record:c?.record?.displayValue||a.record?.displayValue||(c?.records||[]).find(r=>r.type==='total')?.summary||(c?.records||[])[0]?.summary||null,reach:a.reach||null,stance:a.stance||null,height:a.displayHeight||null,age:a.age||null}}
async function ufcFetchFighter(c){
 const a=ufcAthleteData(c),id=a.id;
 if(!id)return {...a,stats:{},sources:[],error:'Fighter ID not supplied'};
 const urls=[
  'https://site.web.api.espn.com/apis/common/v3/sports/mma/ufc/athletes/'+encodeURIComponent(id)+'/overview',
  'https://site.web.api.espn.com/apis/common/v3/sports/mma/ufc/athletes/'+encodeURIComponent(id)+'/stats',
  'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/athletes/'+encodeURIComponent(id)
 ];
 // V47: independent-source checks with public dataset and optional authenticated Fight Forensics.
 let verified=null,proxyError='';
 try{const u=new URL(footballWorker);u.searchParams.set('endpoint','/ufc-profile');u.searchParams.set('name',a.name);const response=await get(u.toString());if(response?.ok&&response.profile?.verified)verified=response.profile;else proxyError=response?.error||'Multi-source fighter data unavailable'}catch(e){proxyError=e.message||'Multi-source fighter data unavailable'}
 const attempts=await Promise.allSettled(urls.map(u=>get(u)));
 let stats={},sources=[],detail={};
 for(let i=0;i<attempts.length;i++){
  if(attempts[i].status!=='fulfilled')continue;
  const data=attempts[i].value,ex=ufcExtractStats(data).stats;
  for(const [k,v] of Object.entries(ex))if(stats[k]==null){stats[k]=v;sources.push(urls[i])}
  const p=data.athlete||data.player||data;detail={...detail,...(p&&typeof p==='object'&&!Array.isArray(p)?p:{})};
 }
 if(verified){for(const [k,v] of Object.entries(verified.stats||{})){const n=ufcNum(v);if(n!==null)stats[k]=(['strAcc','strDef','tdAcc','tdDef'].includes(k)&&n<=1?n*100:n)}return {...a,record:verified.record||a.record,reach:verified.reach||a.reach,stance:verified.stance||a.stance,height:verified.height||a.height,stats,sources:verified.sources||[],recentFights:verified.recentFights||[],sourceStatus:verified.sourceStatus||{},crossChecked:!!verified.crossChecked,confirmedFields:verified.confirmedFields||[],fieldSources:verified.fieldSources||{},fieldChecks:verified.fieldChecks||{},dataQuality:verified.dataQuality||'unknown',sample:verified.sample||{},opponentQuality:verified.opponentQuality||null,conflicts:verified.conflicts||[],error:''}}return {...a,record:a.record||detail.record?.displayValue||detail.displayRecord||null,reach:a.reach||detail.reach||null,stance:a.stance||detail.stance||null,height:a.height||detail.displayHeight||null,stats,sources:[...new Set(sources)],recentFights:[],error:sources.length?'':'UFCStats: '+proxyError+'; ESPN fighter metrics unavailable'};
}
function ufcFmt(k,n){return n==null?'—':(['strAcc','strDef','tdAcc','tdDef'].includes(k)?n.toFixed(1)+'%':n.toFixed(2))}
function ufcMetric(name,key,a,b){return '<div class="leg"><strong>'+escapeHtml(name)+'</strong><div class="desc">'+escapeHtml(a.name)+': '+ufcFmt(key,a.stats[key])+' · '+escapeHtml(b.name)+': '+ufcFmt(key,b.stats[key])+'</div></div>'}
function ufcAdvantage(a,b,off,def,verb,scale){
 const x=a.stats[off],y=b.stats[def];if(x==null||y==null)return null;
 return {text:a.name+' '+verb+' against '+b.name+' ('+ufcFmt(off,x)+' vs '+ufcFmt(def,y)+')',weight:Math.abs((x-(scale==='pct'?100-y:y)))/(scale==='pct'?100:Math.max(1,x,y))};
}
function v48Num(x,k){const n=x.stats?.[k];return Number.isFinite(n)?n:null}
function v48Recent(x){return (x.recentFights||[]).slice(0,5)}
function v48Reliability(x){const q=x.opponentQuality||{};return {history:v48Recent(x).length,opponents:q.knownOpponentCount||0,coverage:q.coverage||'insufficient',avg:q.avgOpponentPriorWinRate,rounds:x.sample?.ufcRoundCount||null,confirmed:(x.confirmedFields||[]).filter(k=>k.startsWith('stats.')).length}}
function v48Evaluation(a,b){
 const ra=v48Reliability(a),rb=v48Reliability(b),points=[],checks=[];
 const add=(score,reason)=>{if(reason)points.push({score,reason})};
 const x=v48Num(a,'strDef'),y=v48Num(b,'strDef');
 if(x!=null&&y!=null)add((x-y)/35,a.name+' has '+Math.round(x)+'% recorded strike defense versus '+Math.round(y)+'% for '+b.name+'.');
 const aa=v48Num(a,'sapm'),bb=v48Num(b,'sapm');
 if(aa!=null&&bb!=null)add((bb-aa)/6,b.name+' absorbs '+bb.toFixed(1)+' significant strikes/min compared with '+aa.toFixed(1)+' for '+a.name+'.');
 const ar=ufcNum(a.reach),br=ufcNum(b.reach);
 if(ar!=null&&br!=null&&ar!==br)add((ar-br)/8,(ar>br?a.name:b.name)+' has a '+Math.abs(ar-br).toFixed(0)+'-inch listed reach advantage.');
 const at=v48Num(a,'td15'),bt=v48Num(b,'td15');
 if(at!=null&&bt!=null&&at!==bt)add((at-bt)/3,(at>bt?a.name:b.name)+' has more recorded takedowns per 15 minutes ('+Math.max(at,bt).toFixed(2)+' vs '+Math.min(at,bt).toFixed(2)+').');
 const qa=a.opponentQuality?.avgOpponentPriorWinRate,qb=b.opponentQuality?.avgOpponentPriorWinRate;
 if(ra.opponents>=3&&rb.opponents>=3&&qa!=null&&qb!=null){
  add((qa-qb)*1.5,(qa>qb?a.name:b.name)+' faced opponents with stronger prior UFC records across the available recent sample.');
 }else checks.push('Opponent quality has insufficient comparable UFC history for one or both fighters.');
 if(ra.history<3||rb.history<3)checks.push('Limited recent UFC fight history.');
 if(!ra.rounds||!rb.rounds)checks.push('Career striking rates lack verified round-level sample sizes.');
 if(!ra.confirmed||!rb.confirmed)checks.push('Striking metrics have not been independently cross-checked.');
 if(a.conflicts?.length||b.conflicts?.length)checks.push('Some source fields conflict.');
 const sum=points.reduce((s,p)=>s+p.score,0);
 const lean=points.length>=2&&Math.abs(sum)>=0.32?(sum>0?a:b):null;
 return {lean,points:points.sort((x,y)=>Math.abs(y.score)-Math.abs(x.score)).slice(0,3),checks,ra,rb,grade:(ra.history>=3&&rb.history>=3&&ra.opponents>=3&&rb.opponents>=3&&ra.confirmed&&rb.confirmed&&ra.rounds&&rb.rounds)?'partially verified':'limited data'};
}
function v48StatRow(label,key,a,b){return '<tr><td>'+escapeHtml(label)+'</td><td>'+escapeHtml(ufcFmt(key,v48Num(a,key)))+'</td><td>'+escapeHtml(ufcFmt(key,v48Num(b,key)))+'</td></tr>'}

function v49ResearchPicks(a,b,e){
 const ra=v48Reliability(a),rb=v48Reliability(b);
 const readyHistory=ra.history>=3&&rb.history>=3;
 const readyQuality=ra.opponents>=3&&rb.opponents>=3;
 const readyRounds=Number.isFinite(ra.rounds)&&Number.isFinite(rb.rounds)&&ra.rounds>=10&&rb.rounds>=10;
 const readyStats=ra.confirmed>=2&&rb.confirmed>=2;
 const sufficient=readyHistory&&readyQuality&&readyRounds&&readyStats&&!(a.conflicts||[]).length&&!(b.conflicts||[]).length;
 const name=x=>escapeHtml(x.name);
 const strikeA=v48Num(a,'slpm'),strikeB=v48Num(b,'slpm');
 const defenseA=v48Num(a,'strDef'),defenseB=v48Num(b,'strDef');
 const strCandidate=(strikeA!=null&&strikeB!=null)?(strikeA>=strikeB?a:b):null;
 const strikeReason=strCandidate?'Recorded pace favors '+name(strCandidate)+' ('+ufcFmt('slpm',v48Num(strCandidate,'slpm'))+' landed/min); pace alone cannot establish a fight total.':'Both fighters need verified striking rates and per-fight totals.';
 const finishRecords=[...v48Recent(a),...v48Recent(b)].filter(g=>/KO|TKO|SUB|DECISION/i.test(String(g.method||'')));
 const knockouts=finishRecords.filter(g=>/KO|TKO/i.test(String(g.method||''))).length;
 const finishReason=finishRecords.length?'Available recent fight methods: '+knockouts+' KO/TKO outcomes in '+finishRecords.length+' recorded bouts. This is not a calibrated finish rate.':'Finish-method history is incomplete for one or both fighters.';
 const options=[
  {title:'Fight rounds',target:'Fight rounds · line not verified',reason:'Compare finish timing, survival against experienced opponents and scheduled round count. Round-by-round histories are required.',status:readyHistory&&readyQuality&&readyRounds?'Needs market check':'Insufficient sample'},
  {title:'Significant strikes',target:(strCandidate?name(strCandidate)+' · ':'')+'strike total · threshold not verified',reason:strikeReason,status:readyStats&&readyRounds&&readyQuality?'Needs market check':'Insufficient sample'},
  {title:'KO / TKO',target:'KO/TKO · market not verified',reason:finishReason,status:finishRecords.length>=8&&readyQuality?'Needs market check':'Insufficient sample'}
 ];
 return '<section class="v49-picks" aria-label="UFC three leg research">'+
 '<div class="v49-picks-title"><strong>🎯 Top 3 outcomes · This fight</strong><span class="v49-chip">'+(sufficient?'Review markets':'DATA LIMITED')+'</span></div>'+
 '<p class="v49-picks-sub">Only these two fighters. Research categories until exact Kalshi markets and per-fight data are verified.</p>'+
 options.map((p,i)=>'<div class="v49-pick"><span class="v49-num">'+(i+1)+'</span><div class="v49-pick-main"><div class="v49-pick-top"><strong>'+escapeHtml(p.title)+'</strong><span>'+escapeHtml(p.status)+'</span></div><div class="v49-pick-target">'+p.target+'</div><div class="v49-pick-why">'+p.reason+'</div></div></div>').join('')+
 '<p class="v49-notice">Specific-fight research only. Exact picks and probabilities require verified fight logs and Kalshi lines.</p>'+
 '<details class="v49-extra"><summary>How the 3 legs will be ranked</summary><p>First check whether the market exists. Then adjust for opponent strength, verified UFC rounds, recency, finish methods and stylistic interactions. Evaluate same-fight correlation: a quick KO can conflict with high strike totals or over-rounds. Never multiply individual probabilities as though the legs were independent.</p><p>Evidence: '+ra.history+' vs '+rb.history+' recorded recent fights; '+ra.opponents+' vs '+rb.opponents+' opponents with meaningful UFC experience; '+(ra.rounds??'unknown')+' vs '+(rb.rounds??'unknown')+' verified UFC rounds; '+ra.confirmed+' vs '+rb.confirmed+' independently checked statistics.</p></details></section>';
}
let ufcSelectionToken=0;
async function openUFCBout(i){
 const token=++ufcSelectionToken,f=ufcFights[i];if(!f)return;
 const c=f.competitors||[];
 $('matchTitle').textContent=ufcBoutName(f,i);$('matchDate').textContent=dateText(ufcEvent.date)+' · UFC';
 $('simulate').classList.add('hidden');$('dataStatus').textContent='Individual fight · '+(f.status?.type?.description||'Scheduled');
 const back=()=>{++ufcSelectionToken;$('matchTitle').textContent=ufcEvent.name||'UFC event';$('matchDate').textContent=dateText(ufcEvent.date)+' · UFC';$('simulate').classList.remove('hidden');analyzeUFC()};
 $('results').innerHTML='<div class="panel v48-card"><button class="btn ghost" id="ufcBackBouts">← Fight card</button><p class="desc">Loading verified fighter profiles…</p></div>';
 $('ufcBackBouts').onclick=back;window.scrollTo(0,0);
 if(c.length<2)return;
 const [a,b]=await Promise.all(c.slice(0,2).map(ufcFetchFighter));if(token!==ufcSelectionToken)return;
 const e=v48Evaluation(a,b),bothData=Object.keys(a.stats||{}).length&&Object.keys(b.stats||{}).length;
 const lean=e.lean?escapeHtml(e.lean.name):'No reliable edge';
 const shortReasons=e.points.length?e.points.map(p=>'<li>'+escapeHtml(p.reason)+'</li>').join(''):'<li>Insufficient comparable statistics to assess a tactical edge.</li>';
 const risk=e.checks.length?e.checks.slice(0,2).join(' '):'Historical results are not guarantees.';
 const fighterLine=x=>'<div class="v48-fighter"><strong>'+escapeHtml(x.name)+'</strong><small>'+escapeHtml([x.record||'Record unavailable',x.reach?'Reach '+x.reach:null].filter(Boolean).join(' · '))+'</small></div>';
 const history=x=>{const fights=v48Recent(x),quality=x.opponentQuality||{};return '<h4>'+escapeHtml(x.name)+'</h4>'+(fights.length?'<div class="v48-history">'+fights.map(g=>{const q=(quality.recent||[]).find(z=>z.date===g.date&&v46SafeMatch(z.opponent,g.opponent));return '<div><b>'+escapeHtml(g.result||'—')+'</b> vs '+escapeHtml(g.opponent||'Unknown')+' <small>'+escapeHtml(g.date||'')+(q?' · opponent prior UFC '+q.opponentPriorUfcWins+'-'+q.opponentPriorUfcLosses:' · prior opponent record unavailable')+'</small></div>'}).join('')+'</div>':'<p class="desc">No recorded UFC fight history returned.</p>')};
 const diagnostics=x=>({sources:x.sources||[],confirmedFields:x.confirmedFields||[],fieldSources:x.fieldSources||{},conflicts:x.conflicts||[],sourceStatus:x.sourceStatus||{},sample:x.sample||{},opponentQuality:x.opponentQuality||{}});
 $('results').innerHTML='<div class="panel v48-card">'+
 '<button class="btn ghost v48-back" id="ufcBackBouts">← Fight card</button>'+
 '<div class="v48-head">🥊 UFC MATCHUP <span>V50</span></div>'+
 '<div class="v48-fighters">'+fighterLine(a)+fighterLine(b)+'</div>'+
 '<div class="v48-lean"><small>TACTICAL LEAN · '+escapeHtml(e.grade.toUpperCase())+'</small><h2>'+lean+'</h2><p>No validated win percentage available</p></div>'+
 v49ResearchPicks(a,b,e)+
 '<div class="v48-section"><strong>Why this matchup?</strong><ol class="v48-reasons">'+shortReasons+'</ol></div>'+
 '<div class="v48-warning">'+escapeHtml(risk)+'</div>'+
 '<details class="v48-details"><summary>Opponent quality & sample size</summary><div class="v48-detailbody"><p>Opponent quality uses only UFC results available before each past fight. It does not measure all promotions or directly predict this matchup.</p>'+
 [a,b].map(x=>{const r=v48Reliability(x);return '<div class="v48-sample"><strong>'+escapeHtml(x.name)+'</strong><small>Recent UFC fights: '+r.history+' · Opponents with 3+ prior UFC bouts: '+r.opponents+'/5 · Coverage: '+escapeHtml(r.coverage)+'</small><small>Opponent prior win rate: '+(r.avg==null?'Insufficient sample':Math.round(r.avg*100)+'% (smoothed, descriptive only)')+'</small></div>'}).join('')+'</div></details>'+
 '<details class="v48-details"><summary>All fighter statistics</summary><div class="v48-detailbody"><table class="v48-table"><thead><tr><th>Metric</th><th>'+escapeHtml(a.name.split(' ')[0])+'</th><th>'+escapeHtml(b.name.split(' ')[0])+'</th></tr></thead><tbody>'+
 v48StatRow('Strikes landed/min','slpm',a,b)+v48StatRow('Strikes absorbed/min','sapm',a,b)+v48StatRow('Striking accuracy','strAcc',a,b)+v48StatRow('Striking defense','strDef',a,b)+v48StatRow('Takedowns/15m','td15',a,b)+v48StatRow('Takedown defense','tdDef',a,b)+v48StatRow('Submissions/15m','sub15',a,b)+'</tbody></table></div></details>'+
 '<details class="v48-details"><summary>Recent fight history</summary><div class="v48-detailbody">'+history(a)+history(b)+'</div></details>'+
 '<details class="v48-details"><summary>Sources & verification</summary><div class="v48-detailbody"><p>Finding a fighter in two services does not verify the same statistics. Independent metric agreement is required before precision predictions.</p><pre class="v48-json">'+escapeHtml(JSON.stringify({[a.name]:diagnostics(a),[b.name]:diagnostics(b)},null,2))+'</pre></div></details>'+
 '<p class="v48-footer">'+(bothData?'Historical matchup indicators, not calibrated probabilities.':'Incomplete fighter metrics.')+' Sample size and opponent quality limit confidence. Other sports are unchanged.</p></div>';
 $('ufcBackBouts').onclick=back;
}
function v46SafeMatch(a,b){return String(a||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')===String(b||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}

init();

// V59 weekly NFL winners: no market prices, no fabricated injury checks.
// Record-based prior is intentionally shrunk; this is an UNCALIBRATED heuristic,
// not a verified win probability. Never claim 100% certainty.
function v59Record(c){
 const rec=(c.records||[]).find(r=>r.type==='total')||(c.records||[])[0];
 const summary=String(rec?.summary||'');let m=summary.match(/^(\d+)-(\d+)/);
 if(m){const w=+m[1],l=+m[2];return {w,l,p:(w+2)/(w+l+4)};}
 return null;
}
async function v59Weekly(){
 const target=$('v59WeeklyResults'),btn=$('v59WeeklyBtn');btn.disabled=true;target.textContent='Checking the NFL schedule…';
 try{
 const now=new Date(),start=new Date(now),end=new Date(now);end.setUTCDate(end.getUTCDate()+8);
 const fmt=d=>d.toISOString().slice(0,10).replace(/-/g,'');
 const dates=[...Array(9)].map((_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return fmt(d)});
 const results=await Promise.allSettled(dates.map(d=>get(root+'football/nfl/scoreboard?dates='+d)));
 const seen=new Set(),upcoming=results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value.events||[]).filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true});
 if(!results.some(r=>r.status==='fulfilled'))throw Error('NFL schedule provider unavailable on all checked dates');
 let games=[];
 for(const e of upcoming){const comp=e.competitions?.[0],cs=comp?.competitors||[];
 if(cs.length!==2||e.status?.type?.completed||new Date(e.date)<now)continue;
 const home=cs.find(c=>c.homeAway==='home'),away=cs.find(c=>c.homeAway==='away');if(!home||!away)continue;
 const hr=v59Record(home),ar=v59Record(away);if(!hr||!ar)continue;
 // Smooth win rates toward 50%, then small home adjustment; logistic comparison.
 const logit=p=>Math.log(p/(1-p));const diff=logit(hr.p)-logit(ar.p)+0.16;
 const ph=1/(1+Math.exp(-diff));const favorite=ph>=.5?home:away;
 games.push({name:favorite.team?.displayName||favorite.team?.name||'Unknown',opponent:(ph>=.5?away:home).team?.displayName||'Unknown',p:Math.max(ph,1-ph),date:e.date,home:ph>=.5,records:hr.w+'-'+hr.l+' vs '+ar.w+'-'+ar.l});
 }
 games.sort((a,b)=>b.p-a.p);const top=games.slice(0,5);
 if(top.length<5)throw Error('Only '+games.length+' upcoming games have usable verified team records. Cannot safely construct five legs.');
 target.innerHTML='<p class="desc">Record-based, uncalibrated model estimates. These are <strong>not</strong> validated win probabilities. Injuries, starters and scheme matchups have not been verified; do not treat this as a finalized five-leg recommendation.</p>'+top.map((g,i)=>`<div class="leg"><strong>${i+1}. ${escapeHtml(g.name)}</strong> over ${escapeHtml(g.opponent)}<br><b>Rank score ${(g.p*100).toFixed(1)}/100</b> · uncalibrated · ${escapeHtml(dateText(g.date))} · ${g.home?'Home':'Away'}<br><small>Current-season records (home vs away): ${escapeHtml(g.records)}</small></div>`).join('')+'<p class="desc">No combined five-leg probability is displayed: these outcomes have not been jointly calibrated or validated.</p>';
 }catch(e){target.textContent='Weekly ranking unavailable: '+e.message;}finally{btn.disabled=false;}
}

// V68: homepage team-winner rankings only. NCAA game analysis remains V66.
let v68RankingToken=0;
async function v68WeeklyWinners(){
 const target=document.getElementById('v59WeeklyResults');
 const btn=document.getElementById('v59WeeklyBtn');
 const token=++v68RankingToken;
 const league=sport;
 if(!['nfl','ncaa'].includes(league))return;
 btn.disabled=true;target.textContent='Ranking upcoming games with available team records…';
 try{
  if(league==='nfl'){
   await v59Weekly();
   return;
  }
  // NCAA: do not change the working schedule or game simulator; use the loaded fixtures.
  const now=Date.now(), ranked=[];
  for(const event of events){
   if(Date.parse(event.date)<now||event.status?.type?.completed)continue;
   const comp=event.competitions?.[0]?.competitors||[];
   const home=comp.find(x=>x.homeAway==='home'),away=comp.find(x=>x.homeAway==='away');
   if(!home||!away)continue;
   const hr=v59Record(home),ar=v59Record(away);
   if(!hr||!ar)continue;
   const logit=p=>Math.log(p/(1-p));
   const ph=1/(1+Math.exp(-(logit(hr.p)-logit(ar.p)+0.16)));
   const winner=ph>=.5?home:away,loser=ph>=.5?away:home;
   ranked.push({winner:winner.team?.displayName||'Unknown',loser:loser.team?.displayName||'Unknown',score:Math.max(ph,1-ph),date:event.date,record:hr.w+'-'+hr.l+' vs '+ar.w+'-'+ar.l});
  }
  ranked.sort((a,b)=>b.score-a.score);
  if(token!==v68RankingToken||sport!==league)return;
  if(ranked.length<5){target.innerHTML='<p class="desc">Only '+ranked.length+' upcoming NCAA games have usable team records. Five winners cannot be ranked reliably from the available feed. The NCAA schedule and existing game analysis are unchanged.</p>';return;}
  target.innerHTML='<p class="desc">Five strongest record-based matchup leans this week. These are ranking scores, <strong>not calibrated win probabilities</strong>. Injuries, lineups, and opponent schemes are not verified.</p>'+ranked.slice(0,5).map((g,i)=>'<div class="leg"><strong>'+(i+1)+'. '+escapeHtml(g.winner)+'</strong> over '+escapeHtml(g.loser)+'<br><small>Rank score '+(g.score*100).toFixed(1)+'/100 · '+escapeHtml(dateText(g.date))+' · Records '+escapeHtml(g.record)+'</small></div>').join('');
 }catch(err){if(token===v68RankingToken)target.textContent='Ranking unavailable: '+err.message}
 finally{if(token===v68RankingToken)btn.disabled=false;}
}

document.getElementById('v59WeeklyBtn').addEventListener('click',v68WeeklyWinners);
