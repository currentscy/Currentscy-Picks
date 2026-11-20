const assert=require('node:assert/strict');
const m=require('../v4-7-soccer-injury.js');
const base={header:{id:'42',competitions:[{status:{type:{completed:true}}}]},keyEvents:[
 {text:'Substitution: A replaces B',clock:{displayValue:"46'"},athletes:[{athlete:{id:'3',displayName:'A'}}]},
 {text:'Injury: C',clock:{displayValue:"65'"}},
 {text:'Goal',clock:{displayValue:"70'"}}]};
const x=m.extract(base,'42');
assert.equal(x.ok,true);assert.equal(x.events.length,2);
assert.equal(x.events[0].injuryConfirmed,false);
assert.equal(x.events[1].injuryConfirmed,true);
assert.equal(m.extract(base,'other').ok,false);
assert.equal(m.impact({baselineHomeGoals:2,baselineAwayGoals:1}).ready,false);
assert.equal(m.impact({baselineHomeGoals:2,baselineAwayGoals:1,homeRemaining:.5,awayRemaining:.5,verifiedImpact:{verified:true,homeMultiplier:.8,awayMultiplier:1}}).homeRemainingExpectedGoals,.8);
console.log('V4.7 injury event and conservative impact tests passed');
