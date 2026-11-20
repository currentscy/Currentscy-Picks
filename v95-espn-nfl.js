/* V95 Step 4 — ESPN NFL secondary research adapter.
   Publicly reachable endpoint does NOT imply commercial/public redistribution rights.
   Research-only: no changes to five-leg probabilities or source authorization flags.
*/
(()=>{'use strict';
const BASE='https://site.api.espn.com/apis/site/v2/sports/football/nfl/';
const status=Object.freeze({provider:'espn',mode:'secondary-research',publicDisplayAuthorized:false,
 commercialUseAuthorized:false,calibrated:false,defenderAssignments:false});
const validId=id=>/^[0-9]{1,15}$/.test(String(id));
async function getJSON(path,{signal}={}){
 const res=await fetch(BASE+path,{signal,cache:'no-store'});
 if(!res.ok)throw Error('ESPN research endpoint returned HTTP '+res.status);
 return res.json();
}
function normalizeEvent(e){
 const competition=e?.competitions?.[0];
 const sides=competition?.competitors||[];
 const team=side=>{const c=sides.find(x=>x.homeAway===side);return c?{
  id:String(c.team?.id||''),name:c.team?.displayName||null,
  record:c.records?.find(r=>r.type==='total')?.summary||null}:null};
 const state=e?.status?.type?.state||null;
 return {eventId:String(e?.id||''),date:e?.date||null,home:team('home'),away:team('away'),
  state:['pre','in','post'].includes(state)?state:null,
  completed:e?.status?.type?.completed===true};
}
async function scoreboard({dates,signal}={}){
 if(dates&&!/^\d{8}$/.test(dates))throw Error('Expected dates YYYYMMDD');
 const path='scoreboard?limit=100'+(dates?'&dates='+dates:'');
 const data=await getJSON(path,{signal});
 if(!Array.isArray(data?.events))throw Error('Unexpected ESPN scoreboard response');
 return {source:BASE+path,fetchedAt:new Date().toISOString(),status,
  games:data.events.map(normalizeEvent).filter(e=>e.eventId&&e.home&&e.away)};
}
async function summary(eventId,{signal}={}){
 if(!validId(eventId))throw Error('Invalid NFL game ID');
 const path='summary?event='+eventId;
 const data=await getJSON(path,{signal});
 const competitors=data?.header?.competitions?.[0]?.competitors;
 if(!Array.isArray(competitors))throw Error('Unexpected ESPN summary response');
 return {source:BASE+path,fetchedAt:new Date().toISOString(),status,eventId:String(eventId),
  teams:competitors.map(c=>({id:String(c.team?.id||''),name:c.team?.displayName||null,
   homeAway:c.homeAway||null})),
  boxscoreAvailable:Array.isArray(data?.boxscore?.players)&&data.boxscore.players.length>0,
  // Avoid publishing raw player box scores or inferring coverage assignments.
  playerMeasurements:[],injuriesVerified:false,defenderMatchupsVerified:false};
}
function crossCheckGame(a,b){
 if(!a?.eventId||!b?.eventId||String(a.eventId)!==String(b.eventId))
  return {verified:false,reason:'Missing or mismatched event IDs'};
 const ids=x=>[x.home?.id,x.away?.id].filter(Boolean).sort().join('|');
 if(!ids(a)||!ids(b)||ids(a)!==ids(b))return {verified:false,reason:'Team IDs disagree'};
 return {verified:true,scope:'game identity only',playerPropsVerified:false,
  commercialUseAuthorized:false};
}
window.CurrentscyESPNNFL=Object.freeze({status,scoreboard,summary,crossCheckGame});
})();