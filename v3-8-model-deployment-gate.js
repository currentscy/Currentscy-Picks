/* Currentscy Picks V3.8 Step 5 — evidence-gated deployment decision.
   No live pick override. Requires independent archived pregame predictions and
   real held-out accuracy improvement in the SAME league.
*/
(()=>{'use strict';
function assess(league,rows,{provenanceReviewed=false,modelFrozenBeforeKickoff=false,coachTenureVerified=false,defensiveInputsVerified=false}={}){
 const reasons=[];
 if(!['nfl','ncaa'].includes(league))reasons.push('NFL or NCAA required');
 const audit=window.CurrentscyHistoricalAuditV37;
 if(!audit){return {eligible:false,activated:false,reasons:['Historical audit module unavailable']}}
 const filtered=Array.isArray(rows)?rows.filter(r=>r?.league===league):[];
 const result=audit.evaluate(filtered,{minimumGames:30,minimumObservations:100});
 if(result.rejected.length)reasons.push('Invalid or duplicate historical predictions rejected: '+result.rejected.length);
 if(result.holdout.games<30||result.holdout.observations<100)reasons.push('Need at least 30 held-out games and 100 predictions for this league');
 if(result.measuredImprovement!==true)reasons.push('No demonstrated held-out improvement in MAE, RMSE and Brier score');
 if(!provenanceReviewed)reasons.push('Independent pregame prediction provenance review missing');
 if(!modelFrozenBeforeKickoff)reasons.push('Frozen pregame model version not independently verified');
 if(!coachTenureVerified)reasons.push('Coach tenure and play caller changes not audited');
 if(!defensiveInputsVerified)reasons.push('Defensive inputs not verified as available before kickoff');
 return {league,eligible:reasons.length===0,activated:false,reasons,holdout:result.holdout,measuredImprovement:result.measuredImprovement,note:'Eligibility assessment only; production changes require a separate reviewed integration and deployment'};
}
function init(){
 if(document.getElementById('cp-step5-gate'))return;
 const section=document.createElement('section');section.id='cp-step5-gate';section.style.cssText='margin:16px auto;padding:14px;max-width:800px;border:1px solid #575044;border-radius:12px;background:#101217;color:#f2f2f2';
 const title=document.createElement('strong');title.textContent='Step 5 · Coaching model activation gate';section.append(title);
 const p=document.createElement('p');p.style.cssText='font-size:13px;color:#bbb';p.textContent='Live five-leg predictions stay unchanged until each league passes independently verified historical accuracy tests and data-provenance review.';section.append(p);
 const status=document.createElement('div');status.style.cssText='font-size:13px;color:#e2c181;white-space:pre-wrap';status.textContent='NFL: NOT ACTIVATED — verified held-out results missing\nNCAA: NOT ACTIVATED — verified held-out results missing';section.append(status);
 (document.querySelector('main')||document.body).append(section);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyModelDeploymentV38=Object.freeze({assess,status:()=>({nfl:'not activated',ncaa:'not activated',livePicksUnchanged:true}),version:'V3.8'});
})();