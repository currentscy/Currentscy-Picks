/* Currentscy Picks V3.7 — strict pregame historical prediction audit.
 * No synthetic data, no retroactively invented forecasts, no live pick changes.
 */
(()=>{'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const https=x=>typeof x==='string'&&/^https:\/\//.test(x);
function validate(rows){
 if(!Array.isArray(rows))throw Error('Predictions must be a JSON array');
 const good=[],rejected=[],seen=new Set();
 rows.forEach((r,i)=>{
  const reasons=[],kickoff=Date.parse(r?.kickoff||''),created=Date.parse(r?.predictionTimestamp||''),actualAt=Date.parse(r?.outcomeTimestamp||'');
  if(!['nfl','ncaa'].includes(r?.league))reasons.push('league must be nfl or ncaa');
  if(!r?.gameId||!r?.playerId||!r?.market)reasons.push('game, player and market identifiers required');
  if(!Number.isFinite(kickoff)||!Number.isFinite(created)||created>=kickoff)reasons.push('prediction must be timestamped before kickoff');
  if(!Number.isFinite(actualAt)||actualAt<=kickoff)reasons.push('outcome timestamp must be after kickoff');
  if(!https(r?.sourceUrl)||!https(r?.predictionSourceUrl))reasons.push('HTTPS outcome and archived pregame prediction sources required');
  for(const key of ['actual','baselinePrediction','coachingPrediction'])if(!finite(r?.[key])||r[key]<0)reasons.push(key+' must be nonnegative');
  for(const key of ['baselineProbability','coachingProbability'])if(!finite(r?.[key])||r[key]<0||r[key]>1)reasons.push(key+' must be between 0 and 1');
  if(![0,1].includes(r?.hit))reasons.push('binary hit outcome required');
  const key=[r?.gameId,r?.playerId,r?.market].join('|');
  if(seen.has(key))reasons.push('duplicate market');
  if(!reasons.length){seen.add(key);good.push({...r,kickoffMs:kickoff})}else rejected.push({row:i+1,reasons});
 });
 return {good:good.sort((a,b)=>a.kickoffMs-b.kickoffMs),rejected};
}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null}
function stats(rows){
 const error=key=>rows.map(r=>r[key]-r.actual);
 const mae=key=>mean(error(key).map(Math.abs));
 const rmse=key=>rows.length?Math.sqrt(mean(error(key).map(e=>e*e))):null;
 const brier=key=>mean(rows.map(r=>(r[key]-r.hit)**2));
 return {games:new Set(rows.map(r=>r.gameId)).size,observations:rows.length,baseline:{mae:mae('baselinePrediction'),rmse:rmse('baselinePrediction'),brier:brier('baselineProbability')},coaching:{mae:mae('coachingPrediction'),rmse:rmse('coachingPrediction'),brier:brier('coachingProbability')}};
}
function evaluate(rows,{minimumGames=30,minimumObservations=100}={}){
 const {good,rejected}=validate(rows),groups=new Map();
 for(const row of good){const key=row.league+'|'+row.gameId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
 const ordered=[...groups.entries()].sort((a,b)=>Math.min(...a[1].map(r=>r.kickoffMs))-Math.min(...b[1].map(r=>r.kickoffMs)));
 const split=Math.floor(ordered.length*.7),train=ordered.slice(0,split).flatMap(x=>x[1]),holdout=ordered.slice(split).flatMap(x=>x[1]);
 const total=stats(good),held=stats(holdout),training=stats(train);
 const sufficient=held.games>=minimumGames&&held.observations>=minimumObservations;
 const improved=sufficient&&held.coaching.mae<held.baseline.mae&&held.coaching.rmse<held.baseline.rmse&&held.coaching.brier<held.baseline.brier;
 return {status:good.length?'audited':'no-valid-predictions',records:good.length,rejected,training,holdout:held,holdoutGameCount:held.games,minimumGames,minimumObservations,measuredImprovement:sufficient?improved:null,readyForLivePicks:false,limitations:['Chronological game split only; independent verification that model was frozen before kickoff remains required','Cross-league differences require separate NFL/NCAA calibration','No automatic promotion or retroactive predictions permitted']};
}
function init(){
 if(document.getElementById('cp-backtest-v37'))return;
 const section=document.createElement('section');section.id='cp-backtest-v37';section.style.cssText='margin:16px auto;padding:14px;max-width:800px;border:1px solid #575044;border-radius:12px;background:#101217;color:#f2f2f2';
 const title=document.createElement('strong');title.textContent='Historical prediction accuracy · Step 4';section.append(title);
 const description=document.createElement('p');description.style.cssText='font-size:13px;color:#bbb';description.textContent='Requires archived predictions recorded before kickoff, actual outcomes, timestamps and HTTPS sources. No verified historical dataset has been connected yet.';section.append(description);
 const input=document.createElement('textarea');input.rows=3;input.placeholder='Paste JSON array of archived prediction records (not API keys)';input.setAttribute('aria-label','Archived prediction records JSON');input.style.cssText='width:100%;background:#1b1d22;color:#eee;border:1px solid #666;border-radius:6px;padding:8px';
 const button=document.createElement('button');button.type='button';button.textContent='Audit historical predictions';button.style.cssText='margin-top:8px;padding:9px 13px;background:#bd9954;color:#111;border:0;border-radius:7px;font-weight:700';
 const out=document.createElement('div');out.setAttribute('role','status');out.style.cssText='white-space:pre-wrap;font-size:13px;margin-top:10px';out.textContent='No verified archived predictions loaded. Accuracy improvement: not measured.';
 button.addEventListener('click',()=>{try{const r=evaluate(JSON.parse(input.value));out.textContent='Valid pregame records: '+r.records+' | Rejected: '+r.rejected.length+'\nHeld-out games: '+r.holdout.games+' | Held-out observations: '+r.holdout.observations+'\n'+(r.measuredImprovement===null?'Insufficient held-out evidence to compare models.':'Coaching model improved MAE, RMSE and Brier: '+(r.measuredImprovement?'YES':'NO'))+'\nBaseline held-out MAE: '+String(r.holdout.baseline.mae)+' | Coaching MAE: '+String(r.holdout.coaching.mae)+'\nLive predictions remain unchanged.'}catch(e){out.textContent='Audit failed: '+String(e?.message||e)}});
 section.append(input,button,out);(document.querySelector('main')||document.body).append(section);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyHistoricalAuditV37=Object.freeze({validate,stats,evaluate,version:'V3.7',livePicksActivated:false});
})();