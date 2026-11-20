/* Currentscy Picks V89 — public-safe NFL evidence gate.
   No PFF requests, grades, scraping, licensed data, or implied access.
   Future licensed feeds must be explicitly authorized for public/commercial distribution.
*/
(function(){
'use strict';
const hierarchy=Object.freeze({
 schedule:['ESPN public scoreboard','Authorized NFL data'],
 boxscore:['ESPN public summary','Authorized NFL data'],
 injuries:['Official NFL/team injury report','ESPN public injury report'],
 playerMatchup:['Authorized play-by-play and tracking feed'],
 passProtection:['Authorized blocking/pressure metrics'],
 coverage:['Authorized coverage/assignment metrics']
});
const parseTime=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?t:null};
const evaluate=(input)=>{
 const category=String(input?.category||'');
 if(!Object.prototype.hasOwnProperty.call(hierarchy,category))return {usable:false,reason:'Unsupported category'};
 const records=Array.isArray(input?.records)?input.records:[];
 const rejected=[];
 for(const provider of hierarchy[category]){
  const item=records.find(x=>x?.provider===provider);
  if(!item){rejected.push({provider,reason:'No data'});continue}
  if(item.publicUseAuthorized!==true){rejected.push({provider,reason:'Public/commercial redistribution not authorized'});continue}
  const t=parseTime(item.observedAt);
  if(t===null||t>Date.now()+300000){rejected.push({provider,reason:'Missing/invalid observation time'});continue}
  const maxAge=category==='injuries'?12:category==='schedule'?12:category==='boxscore'?72:168;
  if(Date.now()-t>maxAge*3600000){rejected.push({provider,reason:'Data too old'});continue}
  if(!item.sourceUrl||!item.eventId||!item.value){rejected.push({provider,reason:'Missing provenance, game ID, or measurement'});continue}
  return {usable:true,category,provider,observedAt:item.observedAt,value:item.value,sourceUrl:item.sourceUrl,eventId:item.eventId,rejected};
 }
 return {usable:false,category,reason:'No authorized, recent, verifiable measurement',rejected};
};
const assessMatchup=(input)=>{
 const coverage=evaluate({category:'coverage',records:input?.coverage});
 const protection=evaluate({category:'passProtection',records:input?.protection});
 const individual=evaluate({category:'playerMatchup',records:input?.matchup});
 const complete=coverage.usable&&protection.usable&&individual.usable&&coverage.eventId===protection.eventId&&coverage.eventId===individual.eventId;
 return {status:complete?'verified-inputs':'insufficient-evidence',gameId:complete?coverage.eventId:null,
  inputs:{coverage,protection,individual},adjustmentAllowed:complete,
  probabilityAdjustment:null,reason:complete?'Inputs verified; model calibration still required':'Do not adjust probabilities without licensed, matched, validated measurements'};
};
window.CurrentscyNFLSourcePriority=Object.freeze({version:'89.0',hierarchy,evaluate,assessMatchup,pffStatus:'not-connected',publicPffUseAuthorized:false});
})();