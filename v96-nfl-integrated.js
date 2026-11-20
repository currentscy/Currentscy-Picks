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
// PFF ONLY in the five-leg player-summary context and ONLY through licensed, server-curated content.
// Never call PFF endpoints directly or scrape PFF.
function playerSummary({context,playerId,licensedPffSummary}={}){
 if(context!=='five-leg-player-parlay')return {pffUsed:false,summary:null};
 const v=licensedPffSummary;
 if(!v||v.provider!=='pff'||v.licensed===true!==true||v.publicDisplayAuthorized!==true||
    v.playerId!==playerId||!fresh(v.observedAt,168)||typeof v.summary!=='string')
  return {pffUsed:false,summary:null,reason:'Licensed PFF player summary unavailable'};
 return {pffUsed:true,summary:v.summary.slice(0,500),observedAt:v.observedAt};
}
window.CurrentscyNFLV96=Object.freeze({version:VERSION,providers,refresh,health,evaluateInputs,playerSummary});
function init(){
 cleanVersion(document.body);
 const observer=new MutationObserver(scheduleClean);
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 refresh().catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();