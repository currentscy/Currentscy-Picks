/* Currentscy Picks V2.5 Step 2: evidence-based coaching behavior profiles.
   Offensive play-calling only until verified defensive scheme charting exists.
   Descriptive, not causal; never used as a betting probability. */
(()=>{'use strict';
const base=()=>window.CurrentscyCoachingDataV25;
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const sd=xs=>xs.length>1?Math.sqrt(xs.reduce((a,b)=>a+(b-mean(xs))**2,0)/(xs.length-1)):null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function kind(p){
 const t=String(p.type||'').toLowerCase(),d=String(p.description||'').toLowerCase();
 if(/sack|pass|interception/.test(t))return 'pass';
 if(/rush|run/.test(t))return 'run';
 if(/pass|sacked|intercepted/.test(d))return 'pass';
 if(/rushed|rushes|ran for|run for/.test(d))return 'run';
 return null;
}
function summarize(plays,teamId){
 const filtered=plays.filter(p=>String(p.teamId)===String(teamId)&&[1,2].includes(p.half));
 const byHalf=[1,2].map(h=>{
  const rows=filtered.filter(p=>p.half===h),pass=rows.filter(p=>kind(p)==='pass').length,run=rows.filter(p=>kind(p)==='run').length;
  return {half:h,pass,run,sample:pass+run,passRate:pass+run?pass/(pass+run):null};
 });
 const n=byHalf.reduce((a,x)=>a+x.sample,0);
 return {teamId:String(teamId),sample:n,passRate:n?byHalf.reduce((a,x)=>a+x.pass,0)/n:null,halves:byHalf,halfShift:byHalf.every(x=>x.sample>=8)?byHalf[1].passRate-byHalf[0].passRate:null};
}
function profile(games,teamId,options={}){
 if(!Array.isArray(games))throw Error('Completed game play arrays required');
 const minGames=Number.isInteger(options.minGames)?Math.max(3,options.minGames):4;
 const rows=games.map(g=>({gameId:String(g.eventId||''),date:g.date||null,...summarize(g.plays||[],teamId)})).filter(r=>r.sample>=20&&r.passRate!==null);
 const rates=rows.map(r=>r.passRate),shifts=rows.map(r=>r.halfShift).filter(x=>x!==null);
 const enough=rows.length>=minGames;
 const avg=mean(rates),vol=sd(rates),shift=mean(shifts);
 const flags=[];
 if(!enough)flags.push('Insufficient completed games with team-attributed play-by-play');
 if(shifts.length<minGames)flags.push('Insufficient games with both halves sampled');
 flags.push('Score, down/distance, opponent strength and pace are not controlled');
 flags.push('Coach identity and coordinator tenure not verified');
 flags.push('Defensive coverage and blitz tendencies unavailable from this source');
 let tendency='Insufficient evidence';
 if(enough&&vol!==null)tendency=vol<=.07?'Stable offensive pass/run mix':vol>=.15?'Variable offensive pass/run mix':'Moderately variable offensive pass/run mix';
 const halftime=enough&&shifts.length>=minGames?Math.abs(shift)<.05?'Little average half-to-half pass-rate change':shift>=.05?'Higher second-half passing share':'Lower second-half passing share':'Insufficient evidence';
 return {teamId:String(teamId),gamesUsed:rows.length,gamesRequired:minGames,playsUsed:rows.reduce((a,r)=>a+r.sample,0),averagePassRate:avg,betweenGameStdDev:vol,meanSecondHalfShift:shift,halfShiftGames:shifts.length,offensiveTendency:tendency,halftimeDescription:halftime,defensiveBaseScheme:'Unknown',opponentSpecificAdjustment:'Unknown',coachSpecificAttribution:false,verifiedCoverage:false,confidence:enough?'descriptive-only':'insufficient',limitations:flags,gameSummaries:rows};
}
async function collect(league,gameIds,teamId,options={}){
 if(!['nfl','ncaa'].includes(league))throw Error('Unsupported league');
 if(!Array.isArray(gameIds)||gameIds.length<1||gameIds.length>16||!gameIds.every(id=>/^\d{5,15}$/.test(String(id))))throw Error('Supply 1–16 verified game IDs');
 if(!/^\d{1,15}$/.test(String(teamId)))throw Error('Valid team ID required');
 const results=await Promise.allSettled([...new Set(gameIds.map(String))].map(id=>base().espnGame(league,id)));
 const games=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const out=profile(games,teamId,options);
 return {...out,league,requestedGames:gameIds.length,successfulGames:games.length,failedGames:results.length-games.length,source:'ESPN play-by-play; team-filtered; no verified coach identity',asOf:new Date().toISOString()};
}
window.CurrentscyCoachingProfilesV25=Object.freeze({summarize,profile,collect,version:'V2.5 Step 2',simulationIntegrated:false});
})();