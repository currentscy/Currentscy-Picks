/* Currentscy Picks V4.0: evidence-gated coaching adjustments.
   Research-only until validated chronological held-out tests exist.
   Functions are pure and do not alter the live five-leg engine. */
(function(root){'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function weightedRate(samples,prior=.55,priorPlays=80){
 if(!finite(prior)||prior<0||prior>1||!finite(priorPlays)||priorPlays<0)throw Error('Invalid prior');
 let pass=0,run=0;
 for(const x of samples||[]){
  if(!Number.isInteger(x.pass)||!Number.isInteger(x.run)||x.pass<0||x.run<0)throw Error('Invalid play counts');
  pass+=x.pass;run+=x.run;
 }
 return {rate:(pass+prior*priorPlays)/(pass+run+priorPlays),plays:pass+run,pass,run};
}
function estimate(input){
 const {offense,defense,player,context,provenance}=input||{};
 const errors=[];
 if(!Array.isArray(offense?.games)||offense.games.length<4)errors.push('Four or more completed games required');
 if(!offense?.attributionVerified)errors.push('Team attribution not verified');
 if(!Array.isArray(defense?.games)||defense.games.length<4)errors.push('Four or more opponent defensive games required');
 if(!defense?.attributionVerified)errors.push('Defensive sample attribution not verified');
 if(!finite(player?.targetShare)||player.targetShare<0||player.targetShare>1||!Number.isInteger(player?.targetsSample)||player.targetsSample<20)errors.push('Verified player target-share sample required');
 if(!finite(context?.projectedPlays)||context.projectedPlays<30||context.projectedPlays>110)errors.push('Plausible sourced projected offensive plays required');
 if(!finite(context?.gameScriptPassDelta)||Math.abs(context.gameScriptPassDelta)>.15)errors.push('Score/game-script pass adjustment missing or outside supported range');
 if(!finite(context?.injuryShareMultiplier)||context.injuryShareMultiplier<.7||context.injuryShareMultiplier>1.3)errors.push('Verified injury/usage adjustment required');
 if(!provenance?.asOf||!Number.isFinite(Date.parse(provenance.asOf))||!provenance?.kickoff||!Number.isFinite(Date.parse(provenance.kickoff))||Date.parse(provenance.asOf)>=Date.parse(provenance.kickoff))errors.push('Pregame provenance and timestamp required');
 if(!Array.isArray(provenance?.sources)||provenance.sources.length<2||!provenance.sources.every(s=>/^https:\/\//.test(s)))errors.push('At least two documented HTTPS evidence sources required');
 if(errors.length)return {ready:false,errors,adjustmentApplied:false};
 const attack=weightedRate(offense.games),opp=weightedRate(defense.games);
 if(attack.plays<120||opp.plays<120)return {ready:false,errors:['Insufficient classified plays'],adjustmentApplied:false};
 // Opponent defense pass-rate allowed is a game-state-sensitive signal, not proof of defensive strategy.
 const projectedPassRate=clamp(.65*attack.rate+.35*opp.rate+context.gameScriptPassDelta,.25,.85);
 const expectedAttempts=context.projectedPlays*projectedPassRate;
 const expectedTargets=expectedAttempts*clamp(player.targetShare*context.injuryShareMultiplier,0,1);
 return {ready:true,adjustmentApplied:false,projectedPassRate,expectedAttempts,expectedTargets,
  samples:{offense:attack.plays,defense:opp.plays,targets:player.targetsSample},
  caveats:['Observational, not a causal coach effect','Opponent pass rate depends on prior game scripts','Not calibrated against held-out player outcomes','Not integrated with live predictions']};
}
const api=Object.freeze({weightedRate,estimate,version:'V4.0',simulationIntegrated:false});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CurrentscyCoachingMathV40=api;
})(typeof window!=='undefined'?window:null);
