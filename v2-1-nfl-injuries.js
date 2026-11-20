/* Currentscy Picks V2.1 - named injury evidence and conservative availability gating. */
(()=>{'use strict';
const BASE='https://site.api.espn.com/apis/site/v2/sports/football/nfl/';
const cache=new Map();
const statusOf=x=>String(x?.status?.name||x?.status?.type?.name||x?.status?.type||x?.status||x?.injuryStatus||x?.fantasy?.status||x?.designation||'').trim();
const nameOf=x=>String(x?.athlete?.displayName||x?.athlete?.fullName||x?.player?.displayName||x?.displayName||x?.fullName||'').trim();
const idOf=x=>String(x?.athlete?.id||x?.player?.id||x?.id||'');
const keyOf=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const bad=/\b(out|injured reserve|reserve\/injured|\bir\b|inactive|suspended|physically unable|\bpup\b|non.football injury)\b/i;
const uncertain=/\b(questionable|doubtful|game.time|limited)\b/i;
function walk(x,fn,depth=0){
 if(depth>7||!x||typeof x!=='object')return;
 if(Array.isArray(x)){for(const v of x)walk(v,fn,depth+1);return}
 fn(x);
 for(const [k,v] of Object.entries(x))if(!['statistics','events','headshot','logos','links'].includes(k))walk(v,fn,depth+1);
}
function readInjuries(payload,teamId,teamName,into){
 const groups=payload?.injuries||payload?.teams||payload?.items||[];
 if(!Array.isArray(groups))return false;
 let matched=false;
 for(const group of groups){
  const tid=String(group?.team?.id||group?.id||'');
  const tn=String(group?.team?.displayName||group?.team?.name||'');
  if(tid!==teamId&&keyOf(tn)!==keyOf(teamName))continue;
  matched=true;
  walk(group,(x)=>{
   if(!x.athlete&&!x.player)return;
   const name=nameOf(x),status=statusOf(x);
   if(!name||!status||/^active$|^healthy$/i.test(status))return;
   into.set(keyOf(name),{id:idOf(x),name,status,source:'ESPN injury report'});
  });
 }
 return matched;
}
function readRoster(roster,into){
 const groups=roster?.athletes||roster?.roster||[];
 if(!Array.isArray(groups))return false;
 let seen=false;
 for(const group of groups){
  const groupName=String(group?.displayName||group?.name||group?.type||'');
  const members=Array.isArray(group?.items)?group.items:Array.isArray(group?.athletes)?group.athletes:Array.isArray(group)?group:[group];
  for(const x of members){
   const name=nameOf(x);if(!name)continue;seen=true;
   const raw=statusOf(x),designation=String(x?.status?.type?.name||x?.status?.name||x?.status?.type||'');
   const label=[groupName,designation,raw].filter(Boolean).join(' ');
   const isReserve=bad.test(label),isQuestionable=uncertain.test(label);
   if(!isReserve&&!isQuestionable)continue;
   const status=isReserve?(bad.test(groupName)?groupName:designation||raw):raw||designation;
   const key=keyOf(name);
   const prior=into.get(key);
   if(!prior||isReserve&&!bad.test(prior.status))into.set(key,{id:idOf(x),name,status,source:'ESPN roster designation'});
  }
 }
 return seen;
}
async function fetchJson(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return response.json()}
async function load(teams){
 const ids=teams.map(t=>String(t.id)).sort().join(',');
 if(cache.has(ids))return cache.get(ids);
 const promise=(async()=>{
  const records=new Map(teams.map(t=>[String(t.id),{team:t,players:new Map(),sources:[],complete:false}]));
  const jobs=teams.map(async t=>{
   const rec=records.get(String(t.id));
   try{const roster=await fetchJson(BASE+'teams/'+encodeURIComponent(t.id)+'/roster');if(readRoster(roster,rec.players))rec.sources.push('ESPN roster')}catch(_){}
  });
  jobs.push((async()=>{
   try{
    const feed=await fetchJson(BASE+'injuries');
    for(const t of teams){
     const rec=records.get(String(t.id));
     if(readInjuries(feed,String(t.id),t.name,rec.players))rec.sources.push('ESPN injuries');
    }
   }catch(_){}
  })());
  await Promise.all(jobs);
  for(const rec of records.values())rec.complete=rec.sources.length>0;
  return records;
 })();
 cache.set(ids,promise);return promise;
}
function availability(rec,player){
 if(!rec||!rec.complete)return {status:'unverified',factor:0,reason:'injury source unavailable'};
 const p=[...rec.players.values()].find(x=>x.id&&String(x.id)===String(player.id))||rec.players.get(keyOf(player.name));
 if(!p)return {status:'not-listed',factor:1,reason:'not listed in retrieved reports; not confirmed active'};
 if(bad.test(p.status))return {status:'out',factor:0,reason:p.status};
 if(uncertain.test(p.status))return {status:'uncertain',factor:.65,reason:p.status};
 return {status:'reported',factor:.85,reason:p.status};
}
const TEAM_IDS={'Arizona Cardinals':'22','Atlanta Falcons':'1','Baltimore Ravens':'33','Buffalo Bills':'2','Carolina Panthers':'29','Chicago Bears':'3','Cincinnati Bengals':'4','Cleveland Browns':'5','Dallas Cowboys':'6','Denver Broncos':'7','Detroit Lions':'8','Green Bay Packers':'9','Houston Texans':'34','Indianapolis Colts':'11','Jacksonville Jaguars':'30','Kansas City Chiefs':'12','Las Vegas Raiders':'13','Los Angeles Chargers':'24','Los Angeles Rams':'14','Miami Dolphins':'15','Minnesota Vikings':'16','New England Patriots':'17','New Orleans Saints':'18','New York Giants':'19','New York Jets':'20','Philadelphia Eagles':'21','Pittsburgh Steelers':'23','San Francisco 49ers':'25','Seattle Seahawks':'26','Tampa Bay Buccaneers':'27','Tennessee Titans':'10','Washington Commanders':'28'};
function panels(){
 const found=[];
 for(const h of document.querySelectorAll('h1,h2,h3,h4,h5,div,strong')){
  const own=[...h.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
  if(!/^match injury report$/i.test(own.replace(/^🏥\s*/,'')))continue;
  let card=h.closest('.panel,.card,.v87-card,.injury-card');
  if(!card){let n=h;for(let i=0;i<5&&n.parentElement;i++){n=n.parentElement;if((n.textContent||'').length>90&&Object.keys(TEAM_IDS).some(t=>(n.textContent||'').includes(t))){card=n;break}}}
  if(card&&!found.includes(card))found.push(card);
 }
 return found;
}
function panelTeams(card){
 const raw=card.dataset.v21Teams||card.textContent||'';
 return Object.entries(TEAM_IDS).filter(([name])=>raw.includes(name)).map(([name,id])=>({name,id}));
}
function display(records){
 for(const card of panels()){
  const teams=panelTeams(card);
  if(!teams.length)continue;
  card.dataset.v21Teams=teams.map(t=>t.name).join(' | ');
  if(card.dataset.v21Injuries==='yes')continue;
  const title=document.createElement('h3');title.textContent='🏥 Match injury report';title.style.cssText='margin:0 0 12px';
  const box=document.createElement('div');box.style.cssText='display:grid;gap:8px';
  for(const t of teams.slice(0,2)){
   const r=records.get(String(t.id));
   const players=r?[...r.players.values()].filter(x=>bad.test(x.status)||uncertain.test(x.status)):[];
   const detail=document.createElement('details');detail.style.cssText='border:1px solid #465065;border-radius:8px;background:#161c28';
   const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;padding:11px;font-weight:650;font-size:14px';
   summary.textContent=t.name+' · '+(players.length?players.length+' injury names':'Injury names unavailable');
   const body=document.createElement('div');body.style.cssText='padding:0 12px 12px;font-size:13px;line-height:1.5';
   if(players.length){
    const ul=document.createElement('ul');ul.style.cssText='margin:0;padding-left:18px';
    for(const p of players.sort((a,b)=>a.name.localeCompare(b.name))){const li=document.createElement('li');li.textContent=p.name+' — '+p.status;ul.append(li)}
    body.append(ul);
   }else{const p=document.createElement('p');p.textContent='No named injuries could be verified from the available data. This does not mean there are no injuries.';body.append(p)}
   detail.append(summary,body);box.append(detail);
  }
  card.dataset.v21Injuries='yes';card.replaceChildren(title,box);
 }
}
let latest=null,queued=false,activeKey='';
async function refresh(){
 const cards=panels();
 if(!cards.length)return;
 const teams=[...new Map(cards.flatMap(panelTeams).map(t=>[t.id,t])).values()];
 const key=teams.map(t=>t.id).sort().join(',');
 if(!key)return;
 if(key!==activeKey){activeKey=key;latest=null;try{latest=await load(teams)}catch(_){latest=new Map()}}
 if(latest)display(latest);
}
function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;refresh()},300)}
window.CurrentscyInjuries={load,availability,display};
function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();