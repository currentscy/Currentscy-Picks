/* V88 Step 1: ESPN NBA public data adapter. No key required.
   Provides typed, validated, timestamped snapshots; does not invent injury or defender data.
*/
(function(){
'use strict';
const BASE='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const cache=new Map(), TTL=120000;
const clean=s=>String(s??'').trim();
const get=async(path,{fresh=false}={})=>{
 const now=Date.now(),old=cache.get(path);
 if(!fresh&&old&&now-old.at<TTL)return old.value;
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
 try{
  const response=await fetch(BASE+path,{signal:ctrl.signal,cache:'no-store'});
  if(!response.ok)throw Error('ESPN HTTP '+response.status);
  const data=await response.json();cache.set(path,{at:Date.now(),value:data});return data;
 }finally{clearTimeout(timer)}
};
const stamp=()=>new Date().toISOString();
const wrap=(kind,items,sourceUrl,extra={})=>({provider:'ESPN',kind,fetchedAt:stamp(),sourceUrl,items,...extra});
const parseEvent=e=>{const c=e?.competitions?.[0],teams=c?.competitors||[];
 return {id:clean(e?.id),date:e?.date||null,status:e?.status?.type?.name||null,
  teams:teams.map(t=>({id:clean(t?.team?.id),name:t?.team?.displayName||null,homeAway:t?.homeAway||null,score:t?.score??null})),
  competitionId:clean(c?.id)}};
const api={
 async schedule(date){
  if(!/^\d{8}$/.test(date))throw Error('Expected YYYYMMDD');
  const path='/scoreboard?dates='+date+'&limit=100',data=await get(path);
  if(!Array.isArray(data?.events))throw Error('ESPN schedule schema unavailable');
  return wrap('schedule',data.events.map(parseEvent).filter(e=>e.id&&e.teams.length===2),BASE+path,{date});
 },
 async teams(){
  const path='/teams?limit=40',data=await get(path);
  const entries=data?.sports?.[0]?.leagues?.[0]?.teams;
  if(!Array.isArray(entries))throw Error('ESPN teams schema unavailable');
  return wrap('teams',entries.map(x=>({id:clean(x?.team?.id),name:x?.team?.displayName||null,abbreviation:x?.team?.abbreviation||null})).filter(x=>x.id),BASE+path);
 },
 async roster(teamId){
  if(!/^\d+$/.test(String(teamId)))throw Error('Invalid team ID');
  const path='/teams/'+teamId+'/roster',data=await get(path);
  if(!Array.isArray(data?.athletes))throw Error('ESPN roster schema unavailable');
  const players=data.athletes.flatMap(x=>Array.isArray(x?.items)?x.items:[x]).filter(x=>x?.id);
  return wrap('roster',players.map(p=>({id:clean(p.id),name:p.displayName||null,position:p?.position?.abbreviation||null,status:p?.status?.type||null})),BASE+path,{teamId:String(teamId)});
 },
 async summary(eventId){
  if(!/^\d+$/.test(String(eventId)))throw Error('Invalid event ID');
  const path='/summary?event='+eventId,data=await get(path);
  if(!data?.header&&!data?.boxscore)throw Error('ESPN summary schema unavailable');
  return {provider:'ESPN',kind:'summary',fetchedAt:stamp(),sourceUrl:BASE+path,eventId:String(eventId),data};
 },
 async health(){
  const result={provider:'ESPN',checkedAt:stamp(),checks:[]};
  for(const [label,fn] of [['teams',()=>api.teams()],['schedule',()=>api.schedule(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-',''))]]){
   try{const data=await fn();result.checks.push({name:label,ok:true,items:data.items.length,fetchedAt:data.fetchedAt})}
   catch(e){result.checks.push({name:label,ok:false,error:clean(e.message)})}
  }
  result.ok=result.checks.every(c=>c.ok);return result;
 }
};
window.CurrentscyNBAData=Object.freeze({version:'88.1',espn:Object.freeze(api)});
})();