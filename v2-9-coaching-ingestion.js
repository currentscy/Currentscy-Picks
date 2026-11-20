/* Currentscy Picks V2.9 — four-stream coaching data ingestion.
   ESPN play-by-play is a research source; coverage and alignment require licensed charting.
   No speculative coaching tendencies or probabilities enter the live picks engine. */
(()=>{'use strict';
const BASE='https://site.api.espn.com/apis/site/v2/sports/football/';
const cache=new Map(),verified=new Map();
const numeric=x=>typeof x==='number'&&Number.isFinite(x);
const safeId=x=>/^\d{5,15}$/.test(String(x));
const isUrl=x=>typeof x==='string'&&/^https:\/\//.test(x);
const leaguePath={nfl:'nfl',ncaa:'college-football'};
async function fetchGame(league,eventId){
 if(!leaguePath[league]||!safeId(eventId))throw Error('Invalid league or ESPN event');
 const key=league+':'+eventId,hit=cache.get(key);
 if(hit&&Date.now()-hit.time<300000)return hit.data;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const url=BASE+leaguePath[league]+'/summary?event='+encodeURIComponent(eventId);
  const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('ESPN summary HTTP '+response.status);
  const raw=await response.json();
  const parsed=window.CurrentscyCoachingDataV25?.parseESPN(raw);
  if(!parsed||!parsed.plays?.length)throw Error('No period-attributed play-by-play');
  const result={league,eventId:String(eventId),source:'ESPN',url,asOf:new Date().toISOString(),plays:parsed.plays,limitations:['ESPN descriptions are not defensive coverage charts','No coach-specific causation established']};
  cache.set(key,{time:Date.now(),data:result});return result;
 }finally{clearTimeout(timeout)}
}
function observed(plays,teamId){
 const rows=(plays||[]).filter(p=>String(p.teamId)===String(teamId)&&[1,2].includes(p.half));
 const halves=[1,2].map(half=>{
  const list=rows.filter(p=>p.half===half);
  const pass=list.filter(p=>/pass|sack/i.test(String(p.type||''))).length;
  const run=list.filter(p=>/rush|run/i.test(String(p.type||''))).length;
  return {half,pass,run,known:pass+run,passRate:pass+run?pass/(pass+run):null};
 });
 return {teamId:String(teamId),halves,halfShift:halves.every(h=>h.known>=8)?halves[1].passRate-halves[0].passRate:null,conclusion:'Observed offensive mix only; score-adjusted coaching inference unavailable'};
}
function validateCharting(item){
 const errors=[];
 if(!item||!['nfl','ncaa'].includes(item.league)||!safeId(item.eventId))errors.push('League and event ID required');
 if(!isUrl(item?.sourceUrl)||!item?.asOf||!Number.isFinite(Date.parse(item.asOf)))errors.push('Timestamp and HTTPS provenance required');
 if(!['coverage','alignment','coaching'].includes(item?.type))errors.push('Charting type unsupported');
 if(item?.type==='coverage'){
  if(!item.defenseTeamId||!numeric(item.manPct)||!numeric(item.zonePct)||Math.abs(item.manPct+item.zonePct-100)>2||!numeric(item.sampleSnaps)||item.sampleSnaps<20)errors.push('Coverage percentages and charted snap denominator required');
  if(item.blitzPct!==undefined&&(!numeric(item.blitzPct)||item.blitzPct<0||item.blitzPct>100))errors.push('Invalid blitz rate');
 }
 if(item?.type==='alignment'){
  if(!item.receiverId||!item.defenderId||!numeric(item.chartedSnaps)||item.chartedSnaps<20)errors.push('Receiver, defender and charted snaps required');
  const locations=['left','slot','right','inline'];
  for(const key of ['receiverShares','defenderShares']){
   const obj=item[key],sum=locations.reduce((s,k)=>s+(numeric(obj?.[k])?obj[k]:0),0);
   if(!obj||locations.some(k=>!numeric(obj[k])||obj[k]<0||obj[k]>1)||Math.abs(sum-1)>.02)errors.push(key+' must have four normalized alignment shares');
  }
 }
 if(item?.type==='coaching'){
  if(!item.teamId||!item.coachName||!item.coachRole||!item.season||!item.sampleGames||item.sampleGames<4)errors.push('Coach identity, role, season and minimum four games required');
  if(!['charted','descriptive'].includes(item.evidenceLevel))errors.push('Coaching evidence level required');
 }
 return [...new Set(errors)];
}
function registerCharting(item){
 const errors=validateCharting(item);
 if(errors.length)return {accepted:false,errors};
 const key=item.league+':'+item.eventId;
 const rows=verified.get(key)||[];rows.push({...item});verified.set(key,rows);
 return {accepted:true,key,count:rows.length,scope:'Research evidence only; no model weights updated'};
}
function report(league,eventId){
 const key=league+':'+eventId,rows=verified.get(key)||[];
 const types=['coverage','alignment','coaching'];
 return {league,eventId:String(eventId),streams:{playByPlay:cache.has(key)?'fetched':'not fetched',coverage:rows.some(r=>r.type==='coverage')?'sourced':'missing charting',alignment:rows.some(r=>r.type==='alignment')?'sourced':'missing charting',coaching:rows.some(r=>r.type==='coaching')?'sourced':'not verified'},evidence:rows.map(r=>({type:r.type,sourceUrl:r.sourceUrl,asOf:r.asOf})),predictionIntegrated:false};
}
async function collect(league,eventId,teamId){
 const game=await fetchGame(league,eventId);
 return {game,team:teamId?observed(game.plays,teamId):null,coverage:report(league,eventId),note:'The Worker was not modified. This research adapter uses the existing browser data route.'};
}
window.CurrentscyCoachingIngestionV29=Object.freeze({fetchGame,observed,validateCharting,registerCharting,report,collect,version:'V2.9',predictionIntegrated:false});
})();