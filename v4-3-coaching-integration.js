/* V4.3: integrate the coaching estimator into the site's model interface.
   Shadow mode only until paired pregame backtests pass; never change public picks
   on incomplete or unverified evidence. */
(function(root){'use strict';
const frozen=new Map();
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function evaluate({league,gameId,playerId,baseline,inputs}={}){
 const key=[league,gameId,playerId].join(':');
 if(!['nfl','ncaa'].includes(league)||!gameId||!playerId||!finite(baseline?.expectedTargets)||baseline.expectedTargets<0)
  return {ready:false,reason:'Valid league/game/player and baseline expected targets required',liveAdjusted:false};
 const estimator=root.CurrentscyCoachingMathV40;
 if(!estimator?.estimate)return {ready:false,reason:'Coaching math module unavailable',liveAdjusted:false};
 const result=estimator.estimate(inputs);
 if(!result.ready)return {ready:false,reason:result.errors.join('; '),liveAdjusted:false};
 // Shadow comparison is informational: only a verified usage estimate is produced.
 // Do not turn expected targets into receptions/yards probabilities without a calibrated distribution.
 const output=Object.freeze({ready:true,league,gameId:String(gameId),playerId:String(playerId),
  baselineExpectedTargets:baseline.expectedTargets,coachingExpectedTargets:result.expectedTargets,
  difference:result.expectedTargets-baseline.expectedTargets,liveAdjusted:false,
  experimental:true,source:'CurrentscyCoachingMathV40',asOf:inputs.provenance.asOf,
  kickoff:inputs.provenance.kickoff});
 frozen.set(key,output);
 return output;
}
function status(){return {mode:'shadow',liveModelActivated:false,entries:frozen.size,
 reason:'No validated paired pregame player outcomes; coaching changes are not applied to live picks'};}
const api=Object.freeze({evaluate,status,version:'V4.3'});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CurrentscyCoachingIntegrationV43=api;
})(typeof window!=='undefined'?window:null);
