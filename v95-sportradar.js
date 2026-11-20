/* V95 Step 3: public-side Sportradar guard; no secret keys or browser API calls. */
(()=>{'use strict';
const status=Object.freeze({provider:'sportradar',connected:false,mode:'server-only',
 liveVerified:false,commercialDisplayAuthorized:false,
 reason:'Awaiting paid subscription, authenticated server validation and usage-rights review'});
window.CurrentscySportradar=Object.freeze({
 status,
 getGameStatus(gameId){return {gameId:gameId||null,verified:false,reason:status.reason}},
 getPlayerAvailability(playerId){return {playerId:playerId||null,verified:false,reason:status.reason}}
});
})();