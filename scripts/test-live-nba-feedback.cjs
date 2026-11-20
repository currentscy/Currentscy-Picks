'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const model=require('../nba-shared-model.js');
const {outcomesFor}=require('./live-nba-feedback.cjs');
test('model uses website record prior and home edge',()=>{
 const home={records:[{type:'total',summary:'12-8'}]};
 const away={records:[{type:'total',summary:'8-12'}]};
 const p=model.estimate(model.parseRecord(home),model.parseRecord(away));
 assert.ok(p>.5&&p<.75);
});
test('no record means no invented probability',()=>{
 assert.equal(model.parseRecord({}),null);
 assert.equal(model.estimate(null,{w:10,l:10}),null);
});
test('completed NBA scoreboard generates matching home outcome',()=>{
 const event={id:'10',status:{type:{completed:true}},competitions:[{competitors:[
  {homeAway:'home',score:'105',team:{id:'1'}},{homeAway:'away',score:'99',team:{id:'2'}}]}]};
 const p=[{gameKey:'nba:10',predictionId:'p1'}];
 const rows=outcomesFor(event,p,'2026-11-21T05:00:00Z','https://example.org/score');
 assert.equal(rows.length,1);assert.equal(rows[0].result,1);
 assert.match(rows[0].verificationMethod,/single provider/);
});
test('no completed game means no outcome',()=>{
 const event={id:'10',status:{type:{completed:false}},competitions:[{competitors:[]}]};
 assert.equal(outcomesFor(event,[{gameKey:'nba:10',predictionId:'p1'}],'2026-11-21T05:00:00Z','https://example.org').length,0);
});
