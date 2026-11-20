/* Currentscy Picks V2.5 Step 1: coaching data collection and coverage audit.
   Read-only adapters. No fabricated coverage/formation data; no model changes. */
(()=>{'use strict';
const ESPN={nfl:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/',ncaa:'https://site.api.espn.com/apis/site/v2/sports/football/college-football/'};
const norm=x=>String(x??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cache=new Map();
function seasonYear(date){const d=new Date(date);return Number.isFinite(d.getTime())?d.getUTCFullYear():new Date().getUTCFullYear()}
async function json(url,ms=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
 try{const r=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}
}
function parsePlay(play){
 const period=Number(play.period?.number||play.period||play.quarter||0);
 const clock=play.clock?.displayValue||play.clock||null;
 const type=play.type?.text||play.type?.name||play.playType?.text||'';
 const description=play.text||play.description||'';
 const score=play.homeScore!==undefined&&play.awayScore!==undefined?{home:Number(play.homeScore),away:Number(play.awayScore)}:null;
 return {id:String(play.id||''),period:Number.isFinite(period)?period:null,half:period>=1&&period<=2?1:period>=3&&period<=4?2:null,clock,type,description,score,teamId:String(play.team?.id||play.teamId||play.possession?.id||'')};
}
function parseESPN(data){
 const previous=Array.isArray(data?.drives?.previous)?data.drives.previous:[];
 const current=data?.drives?.current;
 const drives=[...previous,...(current?[current]:[])];
 const fromDrives=drives.flatMap(d=>{
  const team=d?.team?.id||d?.teamId||d?.team?.team?.id||d?.offense?.id||null;
  return (Array.isArray(d?.plays)?d.plays:[]).map(p=>({
   ...p,team:p.team||p.possession||(team?{id:team}:null)
  }));
 });
 const top=Array.isArray(data?.plays)?data.plays:[];
 const source=fromDrives.length?fromDrives:top;
 const rows=source.map(parsePlay).filter(p=>p.period&&p.description);
 const eligible=rows.filter(p=>[1,2].includes(p.half));
 const attributed=eligible.filter(p=>/^\\d+$/.test(p.teamId));
 const known=attributed.filter(p=>/pass|sack|rush|run/i.test(p.type+' '+p.description));
 const teamIds=[...new Set(attributed.map(p=>p.teamId))];
 return {plays:rows,teamAttributedHalfPlays:attributed.length,
  attributionRate:eligible.length?attributed.length/eligible.length:0,
  classifiedOffensivePlays:known.length,teamIds,
  attributionVerified:teamIds.length===2&&known.length>=40&&attributed.length>=60&&attributed.length/Math.max(1,eligible.length)>=0.8,
  firstHalf:rows.filter(p=>p.half===1).length,
  secondHalf:rows.filter(p=>p.half===2).length,
  coverageCharted:false,formationCharted:false,blitzCharted:false,personnelCharted:false};
}
async function espnGame(league,eventId){
 if(!ESPN[league]||!/^\d{5,15}$/.test(String(eventId)))throw Error('Invalid league or game ID');
 const data=await json(ESPN[league]+'summary?event='+encodeURIComponent(eventId));
 const parsed=parseESPN(data);
 return {source:'ESPN',league,eventId:String(eventId),fetchedAt:new Date().toISOString(),...parsed};
}
function classify(play){
 const text=norm(play.type+' '+play.description);
 if(/pass|sack/.test(text))return 'pass';
 if(/rush|run/.test(text))return 'run';
 return 'other';
}
function splits(plays){
 const halves=[1,2].map(half=>{
  const selected=plays.filter(p=>p.half===half),pass=selected.filter(p=>classify(p)==='pass').length,run=selected.filter(p=>classify(p)==='run').length;
  return {half,plays:selected.length,pass,run,passRate:pass+run?pass/(pass+run):null};
 });
 return {halves,interpretation:'Observed play-type mix only; score, possessions, opponent, and game state not controlled. Not evidence of coach adjustment.'};
}
async function audit(league,eventId){
 const key=league+':'+eventId,hit=cache.get(key);
 if(hit&&Date.now()-hit.time<300000)return hit.value;
 const reports=await Promise.allSettled([espnGame(league,eventId),league==='ncaa'&&window.CurrentscyCFBDV103?window.CurrentscyCFBDV103.request('games',{year:seasonYear(typeof chosen!=='undefined'?chosen?.date:null)}):Promise.resolve(null)]);
 const espn=reports[0].status==='fulfilled'?reports[0].value:null;
 const cfbd=reports[1].status==='fulfilled'&&reports[1].value?{connected:true,records:reports[1].value.items.length,scope:'completed NCAA game metadata; not defensive coverage'}:{connected:false};
 const value={league,eventId,espn:espn?{connected:true,plays:espn.plays.length,firstHalf:espn.firstHalf,secondHalf:espn.secondHalf,playMix:splits(espn.plays),teamAttributedHalfPlays:espn.teamAttributedHalfPlays,attributionRate:espn.attributionRate,attributionVerified:espn.attributionVerified}:{connected:false,error:String(reports[0].reason?.message||reports[0].reason)},cfbd,coverageAssignments:false,coachingBehaviorCalibrated:false,limitations:['No verified defensive coverage calls','No personnel or receiver alignment charting','No score-adjusted halftime causal analysis','No coach-specific profile trained']};
 cache.set(key,{time:Date.now(),value});return value;
}
window.CurrentscyCoachingDataV25=Object.freeze({audit,espnGame,parseESPN,splits,version:'V2.5 Step 1',scope:'source audit only',coachingModelReady:false});
})();