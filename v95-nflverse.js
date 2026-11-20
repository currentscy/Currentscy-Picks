/* V95 Step 1: historical nflverse data reader. Never treats history as predictions. */
(()=>{'use strict';
const url='data/v95-nflverse-player-stats.json';
async function load(){
 const r=await fetch(url+'?v=95-1',{cache:'no-store'});
 if(!r.ok)throw Error('NFLverse history not generated yet; run V95 GitHub Action');
 const data=await r.json();
 if(data.schemaVersion!==1||data.source!=='nflverse'||!Array.isArray(data.players)||!data.generatedAt)
  throw Error('Unexpected NFLverse history schema');
 return data;
}
function playerHistory(data,playerId,metric){
 const p=data?.players?.find(x=>x.playerId===playerId);
 if(!p||!Array.isArray(p.lastFive))return {available:false,reason:'Player history unavailable'};
 const logs=p.lastFive.filter(x=>Number.isFinite(x.metrics?.[metric]));
 if(!logs.length)return {available:false,reason:'Metric missing'};
 return {available:true,player:p.name,team:p.team,metric,values:logs.map(x=>x.metrics[metric]),
  weeks:logs.map(x=>x.week),sample:logs.length,source:data.assetUrl,
  calibrated:false,injuryVerified:false,defenderVerified:false};
}
window.CurrentscyNFLverse=Object.freeze({load,playerHistory,mode:'historical-only',readyForParlay:false});
})();