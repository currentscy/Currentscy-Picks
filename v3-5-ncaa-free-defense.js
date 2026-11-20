/* Currentscy Picks V3.5 — free NCAA defensive evidence.
 * Uses EXISTING CFBD Cloudflare gateway (no key exposed) + ESPN public summaries.
 * Distinguishes measured team defense from unavailable coverage charting.
 * No changes to live picks or simulation weights.
 */
(()=>{'use strict';
const cache=new Map();
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=x=>{const n=Number(x);return Number.isFinite(n)?n:null};
function normalizedTeam(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function classify(p){
 const t=String(p.type||'')+' '+String(p.description||'');
 if(/pass|sack/i.test(t))return 'pass';
 if(/rush|run/i.test(t))return 'run';
 return 'other';
}
function defensiveSummary(plays,defenseId){
 const playsAgainst=(plays||[]).filter(p=>p.teamId&&String(p.teamId)!==String(defenseId)&&[1,2].includes(p.half));
 const halves=[1,2].map(half=>{
  const rows=playsAgainst.filter(p=>p.half===half),pass=rows.filter(p=>classify(p)==='pass').length,run=rows.filter(p=>classify(p)==='run').length;
  return {half,observedPlays:rows.length,pass,run,opponentPassRate:pass+run?pass/(pass+run):null};
 });
 return {defenseId:String(defenseId),halves,description:'Opponent play mix inferred from ESPN play attribution; not charted defensive coverage',limitations:['Not score-adjusted','ESPN play classifications may be incomplete']};
}
function aggregateAdvanced(items,team){
 const name=normalizedTeam(team);
 const matched=(items||[]).filter(r=>normalizedTeam(r.team||r.school||r.name)===name);
 return {matched:matched.length,records:matched.slice(0,8),note:'Raw CFBD advanced team records; field meanings and seasons must be verified before model use'};
}
async function collect({eventId,year,week,defenseTeamId,team}={}){
 if(!/^\d{5,15}$/.test(String(eventId))||!Number.isInteger(year)||year<2001||year>new Date().getUTCFullYear()+1||!Number.isInteger(week)||week<1||week>20||!team||!defenseTeamId)throw Error('NCAA ESPN event, season, week, team name and ESPN defense ID required');
 const key=[eventId,year,week,defenseTeamId,normalizedTeam(team)].join(':');
 const hit=cache.get(key);if(hit&&Date.now()-hit.time<300000)return hit.result;
 const espn=window.CurrentscyCoachingIngestionV29,cfbd=window.CurrentscyCFBDV103;
 const checks=await Promise.allSettled([
  espn?.fetchGame('ncaa',eventId)??Promise.reject(Error('ESPN module unavailable')),
  cfbd?.request('advanced',{year,week,team})??Promise.reject(Error('CFBD module unavailable')),
  cfbd?.request('games',{year,week,team})??Promise.reject(Error('CFBD module unavailable'))
 ]);
 const game=checks[0].status==='fulfilled'?checks[0].value:null;
 const advanced=checks[1].status==='fulfilled'?checks[1].value:null;
 const games=checks[2].status==='fulfilled'?checks[2].value:null;
 const result={
  league:'ncaa',eventId:String(eventId),year,week,team,asOf:new Date().toISOString(),
  sources:{
   espn:{connected:!!game,plays:game?.plays?.length||0,url:game?.url||null,error:checks[0].status==='rejected'?String(checks[0].reason?.message||checks[0].reason):null},
   cfbdAdvanced:{connected:!!advanced,records:advanced?.items?.length||0,error:checks[1].status==='rejected'?String(checks[1].reason?.message||checks[1].reason):null},
   cfbdGames:{connected:!!games,records:games?.items?.length||0,error:checks[2].status==='rejected'?String(checks[2].reason?.message||checks[2].reason):null}
  },
  observedDefense:game?defensiveSummary(game.plays,defenseTeamId):null,
  cfbdAdvanced:advanced?aggregateAdvanced(advanced.items,team):null,
  gameCrosscheck:games?{records:games.items.length,warning:'CFBD and ESPN game IDs differ; game identity not automatically matched'}:null,
  chartedManZone:false,chartedBlitzRate:false,chartedReceiverCornerAssignments:false,
  readyForLivePredictions:false,
  note:'Research-only free data connection; no invented coverage rates, and no model weights updated'
 };
 cache.set(key,{time:Date.now(),result});return result;
}
window.CurrentscyNCAAFreeDefenseV35=Object.freeze({collect,defensiveSummary,aggregateAdvanced,status:()=>({provider:'ESPN + existing CFBD Worker',keyRequiredInBrowser:false,liveCharting:false,connected:'check per-game with collect()',predictionIntegrated:false}),version:'V3.5'});
})();