/* Currentscy Picks V96 — source-aware NFL evidence, never fabricate provider availability. */
(()=>{'use strict';
const VERSION='V96';
const providers=['nflverse','sportsdataio','sportradar','espn'];
const sourceState={nflverse:'not-tested',sportsdataio:'not-connected',sportradar:'not-connected',espn:'not-tested'};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const fresh=(s,hours)=>!!s&&Number.isFinite(Date.parse(s))&&(Date.now()-Date.parse(s))>=-300000&&(Date.now()-Date.parse(s))<=hours*3600000;
function cleanVersion(root){
 if(!root)return;
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walk.nextNode()){
  const p=walk.currentNode.parentElement;
  if(!p||p.closest('script,style,noscript,textarea,code,pre'))continue;
  if(/\bV\d+\b/i.test(walk.currentNode.nodeValue))nodes.push(walk.currentNode);
 }
 for(const n of nodes)n.nodeValue=n.nodeValue.replace(/\bV\d+\b/gi,VERSION);
 if(document.title)document.title=document.title.replace(/\bV\d+\b/gi,VERSION);
}
let pending=false;
function scheduleClean(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;cleanVersion(document.body)})}
function health(){return {...sourceState,asOf:new Date().toISOString(),verifiedSources:Object.entries(sourceState).filter(([,v])=>v==='verified').map(([k])=>k)}}
async function refresh(){
 let history=null,scoreboard=null;
 try{
  if(!window.CurrentscyNFLverse?.load)throw Error('No nflverse reader');
  history=await window.CurrentscyNFLverse.load();
  sourceState.nflverse=fresh(history.generatedAt,72)&&history.players?.length>0?'verified':'stale-or-empty';
 }catch(_){sourceState.nflverse='unavailable'}
 try{
  if(!window.CurrentscyESPNNFL?.scoreboard)throw Error('No ESPN reader');
  scoreboard=await window.CurrentscyESPNNFL.scoreboard();
  sourceState.espn=fresh(scoreboard.fetchedAt,1)&&Array.isArray(scoreboard.games)?'verified':'unavailable';
 }catch(_){sourceState.espn='unavailable'}
 // Public adapters intentionally fail closed until a licensed server connection exists.
 sourceState.sportsdataio=window.CurrentscySportsDataIO?.status?.connected===true&&
  window.CurrentscySportsDataIO?.status?.injuriesVerified===true?'verified':'not-connected';
 sourceState.sportradar=window.CurrentscySportradar?.status?.connected===true&&
  window.CurrentscySportradar?.status?.liveVerified===true?'verified':'not-connected';
 return {health:health(),history,scoreboard};
}
function evaluateInputs({playerId,metric,eventId,legs}={}){
 const missing=[];
 if(sourceState.nflverse!=='verified')missing.push('verified recent nflverse player history');
 if(sourceState.espn!=='verified')missing.push('ESPN game context');
 if(sourceState.sportsdataio!=='verified')missing.push('SportsDataIO injuries and active status');
 if(sourceState.sportradar!=='verified')missing.push('Sportradar live game data');
 if(!playerId||!metric||!eventId)missing.push('mapped player, market and game IDs');
 const five=window.CurrentscyNFLV95?.fiveLegReadiness?.(legs);
 if(!five?.ready)missing.push(five?.reason||'five-leg readiness');
 return {ready:missing.length===0,missing,simulationCalibrated:false,
  note:'No joint five-leg simulation or calibrated probabilities until historical validation and source mapping'};
}
// PFF may contribute to any NFL research context IF the specific licensed usage permits it.
// No scraping, public client credentials, invented data, or unlicensed redistribution.
const pffContexts=new Set(['nfl-simulation','player-matchup','team-matchup','offense-defense',
 'five-leg-player-parlay','five-leg-simulation','injury-context','research']);
function pffEvidence({context,playerId,licensedPffData}={}){
 if(!pffContexts.has(context))return {pffUsed:false,reason:'Unsupported NFL context'};
 const v=licensedPffData;
 if(!v||v.provider!=='pff'||v.licensed!==true||v.derivedAnalyticsAuthorized!==true||
    v.contexts?.includes(context)!==true||!fresh(v.observedAt,168)||
    (playerId&&v.playerId!==playerId))
  return {pffUsed:false,reason:'Authorized, fresh PFF evidence unavailable for this use'};
 const metrics=v.metrics&&typeof v.metrics==='object'?Object.fromEntries(
  Object.entries(v.metrics).filter(([k,n])=>/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(k)&&finite(n))
 ):{};
 return {pffUsed:true,context,metrics,observedAt:v.observedAt,
  source:'PFF licensed server feed',simulationCalibrated:false};
}
function playerSummary({context,playerId,licensedPffSummary}={}){
 const ev=pffEvidence({context,playerId,licensedPffData:licensedPffSummary});
 if(!ev.pffUsed||licensedPffSummary.publicDisplayAuthorized!==true||
    typeof licensedPffSummary.summary!=='string')
  return {pffUsed:false,summary:null,reason:'Licensed public-display PFF summary unavailable'};
 return {pffUsed:true,summary:licensedPffSummary.summary.slice(0,500),observedAt:ev.observedAt};
}
window.CurrentscyNFLV96=Object.freeze({version:VERSION,providers,refresh,health,evaluateInputs,
 pffEvidence,playerSummary});
function init(){
 cleanVersion(document.body);
 const observer=new MutationObserver(scheduleClean);
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 refresh().catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();