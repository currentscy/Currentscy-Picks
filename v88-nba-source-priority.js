/* Currentscy Picks V88 — NBA source hierarchy and provenance gate.
   Data-source priority is task-specific, not a claim that feeds are currently live.
   No defender-level adjustment without verified assignments and minutes.
*/
(function(){
'use strict';
const priorities=Object.freeze({
 schedule:['ESPN','BALLDONTLIE','TheSportsDB'],
 score:['ESPN','BALLDONTLIE','TheSportsDB'],
 roster:['ESPN','BALLDONTLIE'],
 playerStats:['NBA.com via nba_api','ESPN'],
 defenderMatchup:['NBA.com via nba_api'],
 lineupPossessions:['pbpstats'],
 rotations:['pbpstats'],
});
const snapshots=Object.freeze({
 'NBA.com via nba_api':'data/v88-nba-matchups.json',
 pbpstats:'data/v88-pbpstats.json',
 BALLDONTLIE:'data/v88-balldontlie.json',
 TheSportsDB:'data/v88-thesportsdb.json'
});
const supported=(name,data)=>{
 if(!data||typeof data!=='object')return false;
 if(name==='NBA.com via nba_api')return data.status==='verified-sample'&&Array.isArray(data.games)&&data.games.length>0;
 if(name==='pbpstats')return data.status==='verified-sample'&&Array.isArray(data.games)&&data.games.length>0;
 if(name==='BALLDONTLIE')return ['metadata-available','partial'].includes(data.status);
 if(name==='TheSportsDB')return ['metadata-available','partial'].includes(data.status);
 return false;
};
const fetchSnapshot=async(name)=>{
 const path=snapshots[name];
 if(!path)return {provider:name,available:false,reason:'No static snapshot for provider'};
 try{
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  return {provider:name,available:supported(name,data),data,reason:supported(name,data)?null:'No verified records in snapshot'};
 }catch(error){return {provider:name,available:false,reason:String(error.message||error)}}
};
const isRecent=(date,maxHours)=>{
 const t=Date.parse(date||'');
 return Number.isFinite(t)&&Date.now()-t>=0&&Date.now()-t<=maxHours*3600000;
};
const resolve=async(kind,options={})=>{
 const order=priorities[kind]||[];
 if(!order.length)throw Error('Unsupported NBA data category');
 const attempts=[];
 for(const provider of order){
  if(provider==='ESPN'){
   const api=window.CurrentscyNBAData?.espn;
   if(!api){attempts.push({provider,reason:'ESPN adapter not loaded'});continue}
   try{
    let result;
    if(kind==='schedule'&&/^\d{8}$/.test(options.date||''))result=await api.schedule(options.date);
    else if(kind==='roster'&&/^\d+$/.test(String(options.teamId||'')))result=await api.roster(options.teamId);
    else{attempts.push({provider,reason:'No supported ESPN request for category'});continue}
    if(result?.items?.length)return {kind,provider,verified:true,sourceUrl:result.sourceUrl,fetchedAt:result.fetchedAt,data:result.items,attempts};
    attempts.push({provider,reason:'No matching ESPN records'});
   }catch(e){attempts.push({provider,reason:String(e.message||e)})}
   continue;
  }
  const snapshot=await fetchSnapshot(provider);
  if(!snapshot.available){attempts.push({provider,reason:snapshot.reason});continue}
  const data=snapshot.data;
  const date=data.generatedAt||data.fetchedAt;
  // Defender and lineup data may be historical research, but cannot masquerade as current live information.
  if(['schedule','score','roster'].includes(kind)&&!isRecent(date,24)){
   attempts.push({provider,reason:'Snapshot older than 24 hours or timestamp missing'});continue;
  }
  if(kind==='defenderMatchup'||kind==='lineupPossessions'||kind==='rotations'){
   // The current collectors have not validated per-player assignments or sufficient current game context.
   attempts.push({provider,reason:'Research snapshot only; no validated matchup context for requested player/game'});continue;
  }
  let items=[];
  if(kind==='schedule'||kind==='score')items=data.games||data.events||[];
  else if(kind==='roster')items=data.players||[];
  if(!items.length){attempts.push({provider,reason:'No records for requested category'});continue}
  // Independent IDs differ by provider: don't merge events or athletes by index or name.
  attempts.push({provider,reason:'Provider-specific IDs not reconciled with ESPN; cross-check only'});
 }
 return {kind,provider:null,verified:false,data:null,attempts,reason:'No verified usable source; no model adjustment'};
};
window.CurrentscyNBASourcePriority=Object.freeze({
 version:'88.6',priorities,fetchSnapshot,resolve,
 defenderProbabilityAdjustmentAllowed:false
});
})();