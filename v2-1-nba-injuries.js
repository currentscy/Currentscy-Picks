/* NBA named injury list — ESPN public injury and roster feeds; no invented statuses. */
(()=>{'use strict';
const BASE='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const TEAMS={'Atlanta Hawks':'1','Boston Celtics':'2','Brooklyn Nets':'17','Charlotte Hornets':'30','Chicago Bulls':'4','Cleveland Cavaliers':'5','Dallas Mavericks':'6','Denver Nuggets':'7','Detroit Pistons':'8','Golden State Warriors':'9','Houston Rockets':'10','Indiana Pacers':'11','LA Clippers':'12','Los Angeles Clippers':'12','Los Angeles Lakers':'13','Memphis Grizzlies':'29','Miami Heat':'14','Milwaukee Bucks':'15','Minnesota Timberwolves':'16','New Orleans Pelicans':'3','New York Knicks':'18','Oklahoma City Thunder':'25','Orlando Magic':'19','Philadelphia 76ers':'20','Phoenix Suns':'21','Portland Trail Blazers':'22','Sacramento Kings':'23','San Antonio Spurs':'24','Toronto Raptors':'28','Utah Jazz':'26','Washington Wizards':'27'};
const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const nameOf=x=>String(x?.athlete?.displayName||x?.athlete?.fullName||x?.player?.displayName||x?.displayName||x?.fullName||'').trim();
const statusOf=x=>String(x?.status?.name||x?.status?.type?.name||x?.status?.type||x?.status||x?.injuryStatus||x?.designation||'').trim();
const relevant=/\b(out|injured reserve|inactive|suspended|questionable|doubtful|day.to.day|game.time|probable|injured|gtd|\bir\b)\b/i;
const names=new Map();
let fetchedAt=0,inflight=null;
async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
function walk(x,fn,depth=0){if(depth>7||!x||typeof x!=='object')return;if(Array.isArray(x)){for(const v of x)walk(v,fn,depth+1);return}fn(x);for(const [k,v] of Object.entries(x))if(!['statistics','events','headshot','logos','links'].includes(k))walk(v,fn,depth+1)}
function add(map,x,source){const name=nameOf(x),status=statusOf(x);if(!name||!relevant.test(status))return;const k=norm(name),old=map.get(k);if(!old||source==='ESPN injuries')map.set(k,{name,status,source})}
function parseFeed(feed,team){let matched=false;const groups=feed?.injuries||feed?.teams||feed?.items||[];if(!Array.isArray(groups))return false;for(const group of groups){const id=String(group?.team?.id||group?.id||''),n=norm(group?.team?.displayName||group?.team?.name||'');if(id!==team.id&&n!==norm(team.name))continue;matched=true;walk(group,x=>{if(x.athlete||x.player)add(team.players,x,'ESPN injuries')})}return matched}
function parseRoster(roster,team){let seen=false;const groups=roster?.athletes||roster?.roster||[];if(!Array.isArray(groups))return false;for(const group of groups){const groupName=String(group?.displayName||group?.name||group?.type||'');const members=Array.isArray(group?.items)?group.items:Array.isArray(group?.athletes)?group.athletes:Array.isArray(group)?group:[group];for(const x of members){if(!nameOf(x))continue;seen=true;const status=statusOf(x),label=(groupName+' '+status).trim();if(!relevant.test(label))continue;add(team.players,{...x,status:relevant.test(status)?status:groupName},'ESPN roster')}}return seen}
async function load(teams){
 const key=teams.map(t=>t.id).sort().join(',');
 if(names.has(key)&&Date.now()-fetchedAt<300000)return names.get(key);
 if(inflight)return inflight;
 inflight=(async()=>{
  const records=new Map(teams.map(t=>[t.id,{...t,players:new Map(),sources:[]}]));
  const jobs=teams.map(async t=>{try{const roster=await json(BASE+'teams/'+t.id+'/roster');const rec=records.get(t.id);if(parseRoster(roster,rec))rec.sources.push('ESPN roster')}catch(_){}});
  jobs.push((async()=>{try{const feed=await json(BASE+'injuries');for(const t of teams){const rec=records.get(t.id);if(parseFeed(feed,rec))rec.sources.push('ESPN injuries')}}catch(_){}})());
  await Promise.all(jobs);names.set(key,records);fetchedAt=Date.now();return records;
 })();
 try{return await inflight}finally{inflight=null}
}
function findCard(){
 if(document.body.dataset.sport!=='nba')return null;
 const detail=document.getElementById('detail');if(!detail||detail.classList.contains('hidden'))return null;
 for(const h of detail.querySelectorAll('h1,h2,h3,h4,h5,strong,div')){
  const own=[...h.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
  if(!/match injury report/i.test(own))continue;
  let n=h;
  for(let i=0;i<6&&n.parentElement;i++){
   n=n.parentElement;
   if(n===detail)break;
   const txt=n.textContent||'';
   if(Object.keys(TEAMS).filter(name=>txt.includes(name)).length>=2&&txt.length>140&&txt.length<2500)return n;
   if(n.classList.contains('panel')||n.classList.contains('card'))return n;
  }
 }
 return null;
}
function matchTeams(card){const text=card.textContent||'';const list=Object.entries(TEAMS).filter(([name])=>text.includes(name)).map(([name,id])=>({name,id}));return [...new Map(list.map(t=>[t.id,t])).values()].slice(0,2)}
function render(card,teams,records,key){
 if(!card.isConnected)return;
 const title=document.createElement('h2');title.textContent='🏥 Match injury report';title.style.margin='0 0 12px';
 const box=document.createElement('div');box.style.cssText='display:grid;gap:9px';
 for(const team of teams){
  const rec=records.get(team.id),items=rec?[...rec.players.values()].sort((a,b)=>a.name.localeCompare(b.name)):[];
  const details=document.createElement('details');details.style.cssText='background:#151c28;border:1px solid #465065;border-radius:9px';
  const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;padding:12px;font-weight:700';
  summary.textContent=team.name+' · '+(items.length?items.length+' injury names':'Injury names unavailable');
  const body=document.createElement('div');body.style.cssText='padding:0 12px 12px;font-size:14px;line-height:1.5';
  if(items.length){const ul=document.createElement('ul');ul.style.cssText='margin:0;padding-left:20px';for(const p of items){const li=document.createElement('li');li.textContent=p.name+' — '+p.status;ul.append(li)}body.append(ul)}
  else{const p=document.createElement('p');p.textContent='No named injuries verified from the available feeds. This does not confirm the team is healthy.';body.append(p)}
  details.append(summary,body);box.append(details);
 }
 const note=document.createElement('small');note.textContent='Source: ESPN public NBA injury/roster data when available. Injury status may change; confirm final game-day availability.';note.style.cssText='display:block;margin-top:10px;color:#aebaca';
 card.dataset.nbaInjuryNames=key;card.replaceChildren(title,box,note);
}
let queued=false,activeKey='';
async function refresh(){
 const card=findCard();if(!card)return;
 const teams=matchTeams(card);if(teams.length!==2)return;
 const key=teams.map(t=>t.id).sort().join(',');
 if(card.dataset.nbaInjuryNames===key)return;
 if(key===activeKey&&card.dataset.nbaInjuryLoading==='yes')return;
 activeKey=key;card.dataset.nbaInjuryLoading='yes';
 try{const records=await load(teams);if(findCard()===card)render(card,teams,records,key)}
 catch(_){card.dataset.nbaInjuryLoading='';}
}
function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;refresh()},350)}
function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();