import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from './build-readiness.mjs';
const event={sport:'nba',gameKey:'nba:1',start:'2026-11-21T10:00:00Z',season:'2026',teams:[{teamKey:'nba:team1'}],observations:[]};
const forecast={sport:'nba',gameKey:'nba:1',status:'scored',homeWinProbability:.75,predictedAt:'2026-11-21T08:00:00Z',scheduledStart:event.start,result:{homeWon:true,verifiedAt:'2026-11-21T13:00:00Z',sourceUrl:'https://example.org/result'}};
const generate=(obs=[],f=[forecast])=>build({games:[{...event,observations:obs}]},{games:f});
test('eight sports have independent readiness records',()=>assert.equal(Object.keys(generate().readinessBySport).length,8));
test('empty evidence is never evidence-ready',()=>assert.equal(generate().readinessBySport.nba.evidenceReady,false));
test('scored NBA forecast uses home-win Brier and log loss',()=>{const r=generate().readinessBySport.nba;assert.equal(r.brier,.0625);assert.ok(Math.abs(r.logLoss+Math.log(.75))<1e-10);assert.equal(r.scoredForecasts,1)});
test('future predictions cannot be scored as pregame',()=>assert.equal(generate([], [{...forecast,predictedAt:'2026-11-21T11:00:00Z'}]).readinessBySport.nba.scoredForecasts,0));
test('unverified final outcome cannot be scored',()=>assert.equal(generate([], [{...forecast,result:{...forecast.result,sourceUrl:null}}]).readinessBySport.nba.scoredForecasts,0));
test('wrong player identity, season and post-start evidence are rejected',()=>{
 const base={eventId:'nba:1',playerId:'p1',participantId:'nba:team1',season:'2026',observedAt:'2026-11-21T08:00:00Z',sourceUrl:'https://example.org',lineupStatus:'confirmed',authenticated:true};
 for(const bad of [{...base,playerId:''},{...base,season:'2025'},{...base,observedAt:'2026-11-21T12:00:00Z'},{...base,participantId:'other'}])assert.equal(generate([bad]).readinessBySport.nba.eligibleObservations,0);
});
test('one authenticated observation still cannot self-certify readiness',()=>{
 const o={eventId:'nba:1',playerId:'p1',participantId:'nba:team1',season:'2026',observedAt:'2026-11-21T08:00:00Z',sourceUrl:'https://example.org',lineupStatus:'confirmed',authenticated:true};
 assert.equal(generate([o]).readinessBySport.nba.evidenceReady,false);
});
