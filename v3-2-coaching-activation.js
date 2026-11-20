/* Currentscy Picks V3.2 — gated coaching simulation activation bridge.
   Research integration only: never silently replaces existing live pick probabilities. */
(()=>{'use strict';
const registry=new Map();
const validId=x=>/^\d{5,15}$/.test(String(x));
function prepare({league,eventId,receiver,model,charting,backtestRows}={}){
 const issues=[];
 if(!['nfl','ncaa'].includes(league)||!validId(eventId)||!receiver)issues.push('Valid league, game and receiver required');
 const engine=window.CurrentscyDynamicCoachV27,backtest=window.CurrentscyBacktestV28,provider=window.CurrentscyDefensiveChartingV31;
 if(!engine||!backtest||!provider)issues.push('Simulation, backtesting and charting adapters must be loaded');
 const modelIssues=engine?.validate(model)||['Simulation engine unavailable'];
 issues.push(...modelIssues);
 if(!charting?.verified||!charting?.registered||!charting?.coverage?.length||!charting?.alignment?.length)issues.push('Verified, registered defensive coverage and player alignment required');
 if(!Array.isArray(backtestRows)||!backtestRows.length)issues.push('Historical pregame predictions and completed outcomes required');
 const test=backtest&&Array.isArray(backtestRows)?backtest.evaluate(backtestRows,{minimum:50}):null;
 if(!test||test.status!=='evaluated'||test.betterOnSample!==true)issues.push('Coaching model has not outperformed baseline on sufficient historical observations');
 if(test&&(!test.probabilities?.coaching?.count||test.probabilities.coaching.count<50||test.probabilities.coaching.brier===null||test.probabilities.baseline.brier===null||test.probabilities.coaching.brier>=test.probabilities.baseline.brier))issues.push('Probability calibration improvement not demonstrated');
 // Backtest module deliberately cannot authorize promotion without independent held-out audit.
 if(backtest?.autoPromotion!==false)issues.push('Safety policy mismatch');
 const result={readyForResearch:issues.length===0,readyForLivePicks:false,issues:[...new Set(issues)],backtest:test,receiver,league,eventId:String(eventId||''),note:'No automatic live-pick activation; independent leakage and source audit required'};
 return result;
}
function register(input){
 const gate=prepare(input);
 if(!gate.readyForResearch)return gate;
 const result=window.CurrentscyDynamicCoachV27.run(input.model,{trials:100000});
 if(!result.ready)return {...gate,readyForResearch:false,issues:result.issues};
 const key=input.league+':'+input.eventId+':'+input.receiver;
 registry.set(key,{result,gate,createdAt:new Date().toISOString()});
 return {...gate,simulation:result};
}
function status(league,eventId,receiver){
 const key=league+':'+eventId+':'+receiver;
 const item=registry.get(key);
 return item?{researchAvailable:true,livePicksActivated:false,createdAt:item.createdAt,simulation:item.result}:{researchAvailable:false,livePicksActivated:false,reason:'Verified inputs and independently audited calibration required'};
}
window.CurrentscyCoachingActivationV32=Object.freeze({prepare,register,status,version:'V3.2 Step 3',livePicksActivated:false});
})();