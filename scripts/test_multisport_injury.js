const assert=require('node:assert/strict');
const e=require('../v4-8-multisport-injury.js');
for(const sport of e.supportedSports){
 assert.deepEqual(e.apply(sport,'g',{home:100,away:80}).home,100);
 assert.equal(e.register(sport,'g',[{verified:false,impactValidated:true,team:'home',status:'out',impact:-.1,remainingFraction:1,playerId:'1',source:'verified',asOf:'2026-11-20T00:00:00Z'}]),false);
 assert.equal(e.apply(sport,'g',{home:100,away:80}).applied,false);
 assert.equal(e.register(sport,'g',[{verified:true,impactValidated:true,team:'home',status:'out',impact:-.1,remainingFraction:1,playerId:'1',source:'verified',asOf:'2026-11-20T00:00:00Z'}]),true);
 assert.equal(e.apply(sport,'g',{home:100,away:80}).home,90);
 assert.equal(e.apply(sport,'g',{home:100,away:80}).away,80);
}
console.log('Five-sport fail-closed injury engine tests passed');
