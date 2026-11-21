import test from 'node:test';
import assert from 'node:assert/strict';
import {attachHistoricalEvidence} from './attach-historical-evidence.mjs';
const game={gameKey:'nba:future',sport:'nba',start:'2026-11-25T01:00:00Z',teams:[{teamKey:'nba:espn:1'},{teamKey:'nba:espn:2'}],observations:[]};
const obs=id=>({eventId:'nba:future',participantId:'nba:espn:'+id,playerId:'p'+id,sourceEventId:'prior'+id,sourceUrl:'https://example.org/summary',historicalGameStart:'2026-11-19T01:00:00Z'});
const phase={generatedAt:'2026-11-21T20:00:00Z',games:[{gameKey:'nba:future',asOf:'2026-11-21T20:00:00Z',observations:[obs('1'),obs('2')]}]};
test('links both sides by exact identities without changing original observations',()=>{const result=attachHistoricalEvidence({games:[game]},phase).games[0];assert.equal(result.historicalPlayerEvidence.bothTeamsCovered,true);assert.equal(result.historicalPlayerEvidence.observations.length,2);assert.deepEqual(result.observations,[]);assert.equal(result.historicalPlayerEvidence.simulationInputApproved,false)});
test('rejects cross-team and post-cutoff records',()=>{const invalid={...phase,games:[{...phase.games[0],observations:[obs('1'),{...obs('2'),participantId:'nba:espn:99'}, {...obs('2'),historicalGameStart:'2026-11-26T00:00:00Z'}]}]};const r=attachHistoricalEvidence({games:[game]},invalid).games[0].historicalPlayerEvidence;assert.equal(r.bothTeamsCovered,false);assert.equal(r.observations.length,1)});
test('does not modify unrelated games',()=>{const other={...game,gameKey:'nba:other'};assert.deepEqual(attachHistoricalEvidence({games:[other]},phase).games[0],other)});
