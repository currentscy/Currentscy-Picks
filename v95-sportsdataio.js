/* V95 Step 2 — client policy. No direct SportsDataIO browser calls. */
(()=>{'use strict';
const status=Object.freeze({provider:'sportsdataio',mode:'server-only',connected:false,
 publicDataAvailable:false,injuriesVerified:false,
 reason:'Awaiting licensed subscription, verified server feed and public/commercial usage rights'});
window.CurrentscySportsDataIO=Object.freeze({
 status,
 evaluatePlayer(player){
  return {playerId:player?.playerId??null,verified:false,active:null,
   reason:'SportsDataIO injury status is not connected to the public predictions'};
 }
});
})();