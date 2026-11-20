/* Currentscy Picks V3.0: live ESPN collection diagnostics.
   Tests source availability and parses actual returned play-by-play.
   No result is considered verified until the request succeeds in the browser. */
(()=>{'use strict';
const paths={nfl:'nfl',ncaa:'college-football'};
const base='https://site.api.espn.com/apis/site/v2/sports/football/';
const integerId=x=>/^\d{5,15}$/.test(String(x));
const dates=x=>/^\d{8}$/.test(String(x));
const json=async(url)=>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const body=await response.json();return {body,status:response.status,url};
 }finally{clearTimeout(timer)}
};
async function discover(league,day){
 if(!paths[league]||!dates(day))throw Error('Invalid league or date YYYYMMDD');
 const result=await json(base+paths[league]+'/scoreboard?dates='+day+'&limit=100');
 const games=(result.body?.events||[]).map(e=>({
  id:String(e.id||''),name:String(e.name||''),date:e.date||null,
  completed:e.status?.type?.completed===true,
  home:e.competitions?.[0]?.competitors?.find(t=>t.homeAway==='home')?.team?.displayName||null,
  away:e.competitions?.[0]?.competitors?.find(t=>t.homeAway==='away')?.team?.displayName||null
 })).filter(e=>integerId(e.id));
 return {source:result.url,games,asOf:new Date().toISOString()};
}
async function testGame(league,eventId){
 if(!paths[league]||!integerId(eventId))throw Error('Invalid league or event');
 const data=await json(base+paths[league]+'/summary?event='+eventId);
 const parsed=window.CurrentscyCoachingDataV25?.parseESPN(data.body);
 if(!parsed)throw Error('Coaching parser unavailable');
 const rows=parsed.plays||[],valid=rows.filter(p=>p.teamId&&[1,2].includes(p.half));
 const summary={league,eventId:String(eventId),source:data.url,asOf:new Date().toISOString(),totalPlays:rows.length,teamAttributedHalfPlays:valid.length,firstHalf:valid.filter(p=>p.half===1).length,secondHalf:valid.filter(p=>p.half===2).length,verified:valid.length>=20,limitations:['Play types may require manual quality audit','No coverage or defender alignment from ESPN','Observed halftime change does not prove a coaching adjustment']};
 if(!summary.verified)summary.error='Insufficient parsed team-attributed plays to validate source';
 return summary;
}
async function verify(league,day){
 const started=new Date().toISOString();
 try{
  const found=await discover(league,day);
  const game=found.games.find(g=>g.completed);
  if(!game)return {league,day,verified:false,started,reason:'No completed games discovered on selected date',discovery:found};
  const tested=await testGame(league,game.id);
  return {league,day,verified:tested.verified,started,discoveryCount:found.games.length,game:game.name,tested};
 }catch(error){return {league,day,verified:false,started,error:String(error?.message||error),reason:'Live ESPN request or parsing failed'}}
}
window.CurrentscyESPNDiagnosticsV30=Object.freeze({discover,testGame,verify,version:'V3.0',predictionIntegrated:false});
})();