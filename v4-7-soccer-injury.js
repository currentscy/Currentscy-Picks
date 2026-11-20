/* V4.7: verified-event injury timeline, separate from pregame probabilities.
   Does not infer that every substitution is injury-related. */
(function(root){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=v=>String(v??'');
function extract(summary,eventId){
 const header=summary?.header||{};
 if(id(header.id)!==id(eventId))return {ok:false,reason:'Event ID mismatch',events:[]};
 const status=header.competitions?.[0]?.status?.type||{};
 const rows=Array.isArray(summary?.keyEvents)?summary.keyEvents:Array.isArray(summary?.details)?summary.details:[];
 const events=[];
 for(const row of rows){
  const text=[row.text,row.shortText,row.type?.text,row.type?.displayName].filter(Boolean).join(' · ');
  const isSub=/substitution|subbed|substitute/i.test(text)||row.type?.id==='4';
  const isInjury=/injur|medical|concussion/i.test(text);
  if(!isSub&&!isInjury)continue;
  const athlete=(row.athletes||[]).map(a=>({id:id(a.athlete?.id||a.id),name:a.athlete?.displayName||a.displayName||''})).filter(a=>a.id);
  events.push({eventId:id(eventId),minute:row.clock?.displayValue||row.displayClock||'Time unknown',
   type:isInjury?'injury-reported':'substitution',text,athletes:athlete,
   verifiedEvent:true,injuryConfirmed:isInjury&&/injur/i.test(text)});
 }
 return {ok:true,final:status.completed===true,events,source:'ESPN match summary',
  coverage:rows.length?'event feed returned':'event feed absent; no inference of no injuries'};
}
function impact(input){
 const {baselineHomeGoals,baselineAwayGoals,homeRemaining,awayRemaining,verifiedImpact}=input||{};
 if(![baselineHomeGoals,baselineAwayGoals].every(x=>Number.isFinite(x)&&x>=0))return {ready:false,reason:'Baseline goals unavailable'};
 if(!verifiedImpact||verifiedImpact.verified!==true)return {ready:false,reason:'No validated player-specific impact estimate; original probabilities unchanged'};
 const {homeMultiplier,awayMultiplier}=verifiedImpact;
 if(![homeMultiplier,awayMultiplier,homeRemaining,awayRemaining].every(x=>Number.isFinite(x))||
    homeMultiplier<0||awayMultiplier<0||homeMultiplier>2||awayMultiplier>2||
    homeRemaining<0||homeRemaining>1||awayRemaining<0||awayRemaining>1)
  return {ready:false,reason:'Invalid impact or remaining-time input'};
 return {ready:true,homeRemainingExpectedGoals:baselineHomeGoals*homeRemaining*homeMultiplier,
  awayRemainingExpectedGoals:baselineAwayGoals*awayRemaining*awayMultiplier,
  experimental:true,notCausalProof:true};
}
const api=Object.freeze({extract,impact});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CurrentscySoccerInjuryV47=api;
})(typeof window!=='undefined'?window:null);
