/* Currentscy Picks V3.1 Step 2: defensive charting provider adapter.
   A same-origin/approved Worker endpoint must be configured and return licensed, sourced charting.
   Never invent defender assignments or substitute roster depth for coverage. */
(()=>{'use strict';
let endpoint=null;
const validId=x=>/^\d{5,15}$/.test(String(x));
const validUrl=x=>typeof x==='string'&&/^https:\/\//.test(x);
const pct=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const share=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
const positions=['left','slot','right','inline'];
function configure(url){
 if(url===null){endpoint=null;return {configured:false}}
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||!['https://currentscy-picks-api.johnnybawmie.workers.dev',location.origin].includes(parsed.origin))throw Error('Only approved Currentscy Worker or same-origin HTTPS gateway allowed');
 endpoint=parsed.origin+parsed.pathname;
 return {configured:true,endpoint};
}
function validate(payload,league,eventId){
 const errors=[];
 if(!payload||payload.league!==league||String(payload.eventId)!==String(eventId))errors.push('League/event mismatch');
 if(!validUrl(payload?.sourceUrl)||!Number.isFinite(Date.parse(payload?.asOf||'')))errors.push('Missing source and collection time');
 if(payload?.licensedForDisplay!==true)errors.push('Display permission not confirmed');
 const coverage=Array.isArray(payload?.coverage)?payload.coverage:[];
 const alignment=Array.isArray(payload?.alignment)?payload.alignment:[];
 if(!coverage.length)errors.push('No defensive coverage charting');
 if(!alignment.length)errors.push('No receiver-defender alignment charting');
 for(const [i,row] of coverage.entries()){
  if(!row.defenseTeamId||!pct(row.manPct)||!pct(row.zonePct)||Math.abs(row.manPct+row.zonePct-100)>2||!Number.isInteger(row.sampleSnaps)||row.sampleSnaps<20)errors.push('Invalid coverage row '+i);
  if(row.blitzPct!==undefined&&!pct(row.blitzPct))errors.push('Invalid blitz frequency '+i);
 }
 for(const [i,row] of alignment.entries()){
  if(!row.receiverId||!row.defenderId||!Number.isInteger(row.chartedSnaps)||row.chartedSnaps<20)errors.push('Invalid alignment identifiers '+i);
  for(const field of ['receiverShares','defenderShares']){
   const values=positions.map(p=>row[field]?.[p]);
   if(values.some(v=>!share(v))||Math.abs(values.reduce((a,b)=>a+(b||0),0)-1)>.02)errors.push('Invalid '+field+' '+i);
  }
 }
 return [...new Set(errors)];
}
async function fetchCharting(league,eventId){
 if(!['nfl','ncaa'].includes(league)||!validId(eventId))throw Error('Invalid game identifier');
 if(!endpoint)return {connected:false,reason:'Licensed charting provider gateway not configured',coverage:[],alignment:[],readyForPredictions:false};
 const url=new URL(endpoint);
 url.searchParams.set('league',league);url.searchParams.set('eventId',String(eventId));
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(url.toString(),{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error('Charting gateway HTTP '+response.status);
  const payload=await response.json();
  const errors=validate(payload,league,eventId);
  if(errors.length)return {connected:true,verified:false,errors,coverage:[],alignment:[],readyForPredictions:false};
  return {connected:true,verified:true,sourceUrl:payload.sourceUrl,asOf:payload.asOf,coverage:payload.coverage,alignment:payload.alignment,readyForPredictions:false,note:'Evidence validated for display; model calibration still required'};
 }catch(e){return {connected:false,verified:false,error:String(e?.message||e),coverage:[],alignment:[],readyForPredictions:false}}
 finally{clearTimeout(timeout)}
}
async function collect(league,eventId){
 const result=await fetchCharting(league,eventId);
 if(!result.verified)return result;
 const ingest=window.CurrentscyCoachingIngestionV29;
 if(!ingest?.registerCharting)return {...result,registered:false,error:'Research ingestion unavailable'};
 const accepted=[];
 for(const row of result.coverage){
  accepted.push(ingest.registerCharting({type:'coverage',league,eventId,sourceUrl:result.sourceUrl,asOf:result.asOf,...row}));
 }
 for(const row of result.alignment){
  accepted.push(ingest.registerCharting({type:'alignment',league,eventId,sourceUrl:result.sourceUrl,asOf:result.asOf,...row}));
 }
 return {...result,registered:accepted.every(r=>r.accepted),registration:accepted,readyForPredictions:false};
}
window.CurrentscyDefensiveChartingV31=Object.freeze({configure,validate,fetchCharting,collect,status:()=>({configured:!!endpoint,endpoint,provider:'not connected until licensed charting gateway is supplied',predictionIntegrated:false}),version:'V3.1 Step 2'});
})();