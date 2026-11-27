import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHistory,collectUpcomingGame} from './collect-both-teams.mjs';
const game={gameKey:'nba:future',sport:'nba',season:'2026',start:'2026-11-25T01:00:00Z',teams:[{teamKey:'nba:espn:1'},{teamKey:'nba:espn:2'}]};
const row=id=>({teamId:id,playerId:'player'+id,sourceEventId:'past'+id,sourceUrl:'https://example.org',historicalGameStart:'2026-11-19T01:00:00Z',season:'2026',stats:{PTS:'20'}});
const asOf='2026-11-21T20:00:00Z';
test('requires both teams to have player evidence',()=>{assert.equal(normalizeHistory(game,[row('1')],asOf).ok,false);assert.equal(normalizeHistory(game,[row('1'),row('2')],asOf).ok,true)});
test('rejects future statistics and postgame snapshots',()=>{assert.equal(normalizeHistory(game,[row('1'),{...row('2'),historicalGameStart:'2026-11-26T00:00:00Z'}],asOf).ok,false);assert.equal(normalizeHistory(game,[row('1'),row('2')],'2026-11-26T00:00:00Z').ok,false)});
test('rejects wrong teams and missing player identity',()=>{assert.equal(normalizeHistory(game,[row('1'),{...row('2'),teamId:'99'}],asOf).ok,false);assert.equal(normalizeHistory(game,[row('1'),{...row('2'),playerId:''}],asOf).ok,false)});
test('does not invent confirmed lineups or injuries',()=>{const r=normalizeHistory(game,[row('1'),row('2')],asOf);assert.ok(r.observations.every(o=>o.lineupStatus==='unknown'&&o.injuryStatus==='unverified'&&o.confirmedForUpcomingGame===false))});
test('collects separate historical player stats from both teams',async()=>{
 const fetcher=async url=>({ok:true,json:async()=>{
  if(url.endsWith('/schedule')){const team=url.match(/teams\/(\d+)\/schedule/)[1];return {events:[{id:'past'+team,season:{year:2026},date:'2026-11-19T01:00:00Z',competitions:[{status:{type:{completed:true}}}]}]};}
  const team=url.match(/event=past(\d+)/)[1];return {boxscore:{players:[{team:{id:team},statistics:[{keys:['PTS'],athletes:[{athlete:{id:'player'+team},stats:['20']}]}]}]}]}};
 }});
 const r=await collectUpcomingGame(game,{fetcher,asOf,maxHistory:1});
 assert.equal(r.ok,true);assert.equal(r.observations.length,2);assert.equal(r.coverage.length,2);
});
test('failed source fetch fails closed',async()=>{const r=await collectUpcomingGame(game,{fetcher:async()=>({ok:false,status:503}),asOf});assert.equal(r.ok,false);assert.equal(r.sourceFailures.length,2)});

test('resolves missing season from upcoming event and rejects cross-season history',async()=>{
 const noSeason={...game,season:undefined,source:{eventId:'future'}};
 const fetcher=async url=>({ok:true,json:async()=>{
  if(url.includes('summary?event=future'))return {header:{season:{year:2026}}};
  if(url.endsWith('/schedule')){const id=url.match(/teams\\/(\\d+)\\/schedule/)[1];return {events:[{id:'past'+id,season:{year:2025},date:'2026-11-19T01:00:00Z',competitions:[{status:{type:{completed:true}}}]}]};}
  throw Error('unexpected '+url);
 }});
 const r=await collectUpcomingGame(noSeason,{fetcher,asOf,maxHistory:1});
 assert.equal(r.ok,false);
 assert.ok(r.errors.includes('missing player evidence for one or both teams'));
});
test('fails closed when upcoming season cannot be verified',async()=>{
 const r=await collectUpcomingGame({...game,season:undefined},{asOf,fetcher:async()=>({ok:true,json:async()=>({header:{}})})});
 assert.equal(r.ok,false);assert.match(r.errors[0],/cannot verify upcoming game season/);
});
