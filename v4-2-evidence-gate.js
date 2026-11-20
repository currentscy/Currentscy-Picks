/* Currentscy Picks: defensive/coaching evidence must not imply verified coverage.
   Pure validation helper; not connected to live probability changes. */
(function(root){
'use strict';
function verify(e){
 const errors=[];
 if(!e||typeof e!=='object')return {ready:false,errors:['Missing evidence']};
 if(!e.gameId||!e.playerId||!e.opponentId)errors.push('Missing game/player/opponent IDs');
 if(!e.kickoff||!e.observedAt||!Number.isFinite(Date.parse(e.kickoff))||!Number.isFinite(Date.parse(e.observedAt))||Date.parse(e.observedAt)>=Date.parse(e.kickoff))errors.push('Evidence must be timestamped before kickoff');
 if(!/^https:\/\//.test(e.sourceUrl||''))errors.push('Documented HTTPS source required');
 if(e.type==='individual-coverage'){
  if(!e.defenderId||!e.chartedPlays||!Number.isInteger(e.chartedPlays)||e.chartedPlays<1||e.assignmentVerified!==true)errors.push('Verified defender assignment and charted plays required');
  if(e.licensedUsageAuthorized!==true)errors.push('Licensed coverage use not authorized');
 }else if(e.type==='coaching-tendency'){
  if(!Number.isInteger(e.verifiedPlays)||e.verifiedPlays<120||e.teamAttributionVerified!==true)errors.push('Sufficient team-attributed plays required');
  if(e.causalClaim===true)errors.push('Observational tendencies cannot prove causality');
 }else errors.push('Unsupported evidence type');
 return {ready:errors.length===0,errors,causalEffectEstablished:false,liveModelActivated:false};
}
const api=Object.freeze({verify});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CurrentscyEvidenceGate=api;
})(typeof window!=='undefined'?window:null);
