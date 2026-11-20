/* V95 NFL multi-source verification. Standalone, fail-closed.
   No provider credentials or licensed raw data in the browser. */
(()=>{'use strict';
const providers=Object.freeze({
 nflverse:{role:'historical play-by-play, player usage, backtests',mode:'public dataset; commercial rights require review',live:false},
 sportsdataio:{role:'injuries, active depth charts, player status',mode:'licensed server-side API',live:false},
 sportradar:{role:'live stats, injuries, official game data',mode:'licensed server-side API',live:false},
 espn:{role:'secondary public scoreboard and game summaries',mode:'unofficial endpoint; rights require review',live:false}
});
const supported=new Set(Object.keys(providers));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const normalized=(r)=>{
 if(!r||!supported.has(r.provider)||!r.eventId||!r.playerId||!r.metric||!finite(r.value)||!r.observedAt||!r.sourceUrl)return null;
 const t=Date.parse(r.observedAt);
 if(!Number.isFinite(t)||t>Date.now()+300000)return null;
 if(r.publicDisplayAuthorized!==true||r.commercialUseAuthorized!==true)return null;
 if(r.provider==='sportsdataio'||r.provider==='sportradar'){
  if(r.serverVerified!==true)return null;
 }
 return {...r,ageHours:(Date.now()-t)/3600000};
};
function verify(input,{maxAgeHours=36,tolerance=0}={}){
 const records=(Array.isArray(input)?input:[]).map(normalized).filter(Boolean).filter(r=>r.ageHours<=maxAgeHours);
 if(!records.length)return {status:'unavailable',reason:'No current, authorized measurements',records:[]};
 const groups=new Map();
 for(const r of records){
  const key=[r.eventId,r.playerId,r.metric].join('|');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(r);
 }
 const output=[];
 for(const [key,rs] of groups){
  const byProvider=[...new Map(rs.map(r=>[r.provider,r])).values()];
  if(byProvider.length<2){output.push({key,status:'single-source',providers:byProvider.map(r=>r.provider)});continue}
  const vals=byProvider.map(r=>r.value);
  const consistent=Math.max(...vals)-Math.min(...vals)<=tolerance;
  output.push({key,status:consistent?'cross-checked':'conflict',providers:byProvider.map(r=>r.provider),
   value:consistent?vals.reduce((a,b)=>a+b,0)/vals.length:null});
 }
 return {status:output.some(x=>x.status==='cross-checked')?'partially-verified':'unverified',results:output};
}
function fiveLegReadiness(legs){
 if(!Array.isArray(legs)||legs.length!==5)return {ready:false,reason:'Exactly five legs required'};
 const seen=new Set();
 for(const leg of legs){
  if(!leg?.playerId||!leg?.eventId||!leg?.market||!finite(leg.line))return {ready:false,reason:'Missing player, game, market or line'};
  const key=leg.playerId+'|'+leg.eventId+'|'+leg.market;
  if(seen.has(key))return {ready:false,reason:'Duplicate player market'};
  seen.add(key);
  if(leg.injuryVerified!==true||leg.activeVerified!==true)return {ready:false,reason:'Unverified player availability'};
  if(leg.historyBacktested!==true||leg.probabilityCalibrated!==true)return {ready:false,reason:'Historical backtesting or calibration incomplete'};
 }
 return {ready:true,reason:'Inputs validated; cross-leg correlation must still be modeled'};
}
window.CurrentscyNFLV95=Object.freeze({version:'95',providers,verify,fiveLegReadiness,
 predictionStatus:'Not calibrated: no new 5-leg probabilities published by this module'});
})();