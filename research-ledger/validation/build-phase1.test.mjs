import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPhase1} from './build-phase1.mjs';
const game={gameKey:'nba:future',sport:'nba',start:'2026-11-25T01:00:00Z',completed:false,teams:[{teamKey:'nba:espn:1'},{teamKey:'nba:espn:2'}]};
const past={...game,gameKey:'nba:past',start:'2026-11-19T01:00:00Z',completed:true};
test('only future games are collected, missing sources block readiness',async()=>{
 const r=await buildPhase1({games:[past,game]}, {asOf:'2026-11-21T20:00:00Z',fetcher:async()=>({ok:false,status:503})});
 assert.equal(r.games.length,1);assert.equal(r.summary.simulationApproved,0);assert.equal(r.games[0].historicalEvidenceAvailable,false);
});
test('no games results in empty truthful report',async()=>{
 const r=await buildPhase1({games:[past]}, {asOf:'2026-11-21T20:00:00Z'});
 assert.equal(r.summary.attempted,0);assert.equal(r.summary.playerObservations,0);
});
