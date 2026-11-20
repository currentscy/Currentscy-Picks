/* Currentscy Picks V2.8 Step 5 — walk-forward model validation.
   No invented backtest results, no automatic promotion of unvalidated predictions. */
(()=>{'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function validateRows(rows){
 if(!Array.isArray(rows))throw Error('Backtest observations must be an array');
 const seen=new Set(),valid=[],rejected=[];
 for(const [i,r] of rows.entries()){
  const key=String(r?.gameId||'')+'|'+String(r?.playerId||'')+'|'+String(r?.market||'');
  const date=Date.parse(r?.kickoff||'');
  const ok=Number.isFinite(date)&&r?.gameId&&r?.playerId&&r?.market&&
   finite(r.actual)&&finite(r.baselinePrediction)&&finite(r.coachingPrediction)&&
   r.actual>=0&&r.baselinePrediction>=0&&r.coachingPrediction>=0&&
   r.sourceUrl&&/^https?:\/\//.test(r.sourceUrl)&&
   r.predictionTimestamp&&Number.isFinite(Date.parse(r.predictionTimestamp))&&Date.parse(r.predictionTimestamp)<date&&
   !seen.has(key);
  if(!ok){rejected.push(i);continue}
  seen.add(key);valid.push({...r,key,date});
 }
 return {valid:valid.sort((a,b)=>a.date-b.date),rejected};
}
function metric(rows,key){
 const errors=rows.map(r=>r[key]-r.actual);
 return {mae:avg(errors.map(Math.abs)),rmse:errors.length?Math.sqrt(avg(errors.map(e=>e*e))):null,bias:avg(errors),count:rows.length};
}
function probabilityMetrics(rows,key){
 const eligible=rows.filter(r=>finite(r[key])&&r[key]>=0&&r[key]<=1&&[0,1].includes(r.hit));
 if(!eligible.length)return {count:0,brier:null,logLoss:null,calibration:[]};
 const brier=avg(eligible.map(r=>(r[key]-r.hit)**2));
 const logLoss=avg(eligible.map(r=>-(r.hit*Math.log(clamp(r[key],1e-6,1-1e-6))+(1-r.hit)*Math.log(clamp(1-r[key],1e-6,1-1e-6)))));
 const calibration=Array.from({length:5},(_,i)=>{const xs=eligible.filter(r=>Math.min(4,Math.floor(r[key]*5))===i);return {range:[i/5,(i+1)/5],count:xs.length,predicted:avg(xs.map(r=>r[key])),observed:avg(xs.map(r=>r.hit))}});
 return {count:eligible.length,brier,logLoss,calibration};
}
function evaluate(rows,{minimum=50}={}){
 const checked=validateRows(rows),valid=checked.valid;
 const base=metric(valid,'baselinePrediction'),coach=metric(valid,'coachingPrediction');
 const byLeague=Object.fromEntries(['nfl','ncaa'].map(league=>{const sub=valid.filter(r=>r.league===league);return [league,{count:sub.length,baseline:metric(sub,'baselinePrediction'),coaching:metric(sub,'coachingPrediction')}] }));
 const threshold=Math.max(30,Math.floor(minimum));
 const enough=valid.length>=threshold&&['nfl','ncaa'].every(l=>byLeague[l].count>=15);
 const improvement=enough&&base.mae>0?(base.mae-coach.mae)/base.mae:null;
 const baseProb=probabilityMetrics(valid,'baselineProbability'),coachProb=probabilityMetrics(valid,'coachingProbability');
 const calibrated=enough&&baseProb.count>=threshold&&coachProb.count>=threshold;
 const better=improvement!==null&&improvement>0&&coach.rmse<base.rmse&&(!calibrated||coachProb.brier<baseProb.brier);
 return {status:enough?'evaluated':'insufficient-data',promote:false,betterOnSample:enough?better:null,records:valid.length,rejected:checked.rejected.length,minimum:threshold,leagues:byLeague,baseline:base,coaching:coach,maeImprovement:improvement,probabilities:{baseline:baseProb,coaching:coachProb},warnings:['Backtest is descriptive, not proof of future accuracy','Held-out chronological folds and coach-tenure verification required before promotion','No live five-leg model modified'],readyForPromotion:false};
}
function walkForward(rows,{trainGames=30,testGames=10}={}){
 const checked=validateRows(rows),valid=checked.valid,folds=[];
 if(!Number.isInteger(trainGames)||trainGames<10||!Number.isInteger(testGames)||testGames<5)throw Error('Invalid fold sizes');
 const games=[...new Set(valid.map(r=>r.gameId))];
 for(let i=trainGames;i+testGames<=games.length;i+=testGames){
  const trainIds=new Set(games.slice(0,i)),testIds=new Set(games.slice(i,i+testGames));
  const train=valid.filter(r=>trainIds.has(r.gameId)),test=valid.filter(r=>testIds.has(r.gameId));
  folds.push({trainGames:trainIds.size,testGames:testIds.size,trainObservations:train.length,testObservations:test.length,trainEnd:train.at(-1)?.kickoff||null,testStart:test[0]?.kickoff||null,results:evaluate(test,{minimum:30})});
 }
 return {folds,observations:valid.length,heldOutGames:folds.reduce((n,f)=>n+f.testGames,0),note:'Inputs must be frozen before kickoff; folds assess existing predictions and do not retrain the model.'};
}
function report(rows){
 const result=evaluate(rows),out=walkForward(rows);
 return {result,walkForward:out,approved:false,reason:'Manual audit of data provenance, leakage, sample size and calibration required'};
}
window.CurrentscyBacktestV28=Object.freeze({validateRows,evaluate,walkForward,report,version:'V2.8 Step 5',autoPromotion:false});
})();