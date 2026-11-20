/* V4.8: shared, fail-closed injury adjustment for five sports.
   Inputs must come from verified availability + calibrated player impact,
   never guessed from a team loss or a substitution. */
(function(root){'use strict';
const SPORTS=new Set(['nfl','soccer','nba','ncaa','nhl']);
const LIMITS={nfl:.35,soccer:.35,nba:.30,ncaa:.35,nhl:.35};
const records=new Map();
const valid=x=>typeof x==='number'&&Number.isFinite(x);
function register(sport,gameId,entries){
 if(!SPORTS.has(sport)||!String(gameId||'').trim()||!Array.isArray(entries))return false;
 const clean=entries.filter(e=>e&&e.verified===true&&e.impactValidated===true&&
  ['home','away'].includes(e.team)&&['out','limited','left-game'].includes(e.status)&&
  valid(e.impact)&&Math.abs(e.impact)<=LIMITS[sport]&&
  valid(e.remainingFraction)&&e.remainingFraction>=0&&e.remainingFraction<=1&&
  typeof e.playerId==='string'&&e.playerId.length>0&&
  typeof e.source==='string'&&e.source.length>0&&
  typeof e.asOf==='string'&&Number.isFinite(Date.parse(e.asOf)));
 records.set(sport+':'+gameId,clean.map(e=>({...e})));
 return clean.length>0;
}
function apply(sport,gameId,baseline){
 if(!SPORTS.has(sport)||!baseline||!valid(baseline.home)||!valid(baseline.away)||baseline.home<0||baseline.away<0)
  return {applied:false,reason:'Invalid baseline',...baseline};
 const items=records.get(sport+':'+gameId)||[];
 if(!items.length)return {applied:false,reason:'No validated availability/impact evidence',...baseline};
 const factor={home:1,away:1};
 for(const e of items)factor[e.team]*=1+e.impact*e.remainingFraction;
 return {home:baseline.home*factor.home,away:baseline.away*factor.away,applied:true,
  factors:factor,playerCount:items.length,experimental:true};
}
function status(sport,gameId){return {registered:(records.get(sport+':'+gameId)||[]).length};}
const api=Object.freeze({register,apply,status,supportedSports:[...SPORTS]});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CurrentscyInjuryEngineV48=api;
})(typeof window!=='undefined'?window:null);
