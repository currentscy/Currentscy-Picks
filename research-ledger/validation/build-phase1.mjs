// Phase 1: create a separate, auditable pregame historical evidence artifact.
// This never overwrites Stage 2 source data or promotes prediction probabilities.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {collectUpcomingGame} from './collect-both-teams.mjs';
export async function buildPhase1(stage2,{asOf=new Date().toISOString(),maxGames=8,maxHistory=3,fetcher=fetch}={}) {
 const upcoming=(stage2.games||[]).filter(g=>!g.completed&&Date.parse(g.start)>Date.parse(asOf)).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)).slice(0,maxGames);
 const games=[];
 for(const game of upcoming) {
  const result=await collectUpcomingGame(game,{asOf,maxHistory,fetcher});
  games.push({gameKey:game.gameKey,sport:game.sport,start:game.start,teams:game.teams,asOf,sourceFailures:result.sourceFailures||[],coverage:result.coverage||[],observations:result.observations||[],blockers:result.errors||[],historicalEvidenceAvailable:result.ok,injuriesVerified:false,lineupsVerified:false,simulationInputApproved:false});
 }
 return {schemaVersion:1,generatedAt:asOf,sourceStage2GeneratedAt:stage2.generatedAt||null,description:'Historical box scores only; not a confirmed lineup or independently authenticated simulation input',games,summary:{attempted:games.length,bothTeamsHistoricalCoverage:games.filter(g=>g.historicalEvidenceAvailable).length,playerObservations:games.reduce((n,g)=>n+g.observations.length,0),simulationApproved:0}};
}
if(process.argv[1]&&import.meta.url==='file://'+process.argv[1]){
 const input=process.argv[2]||'research-ledger/stage2/latest.json';
 const output=process.argv[3]||'research-ledger/stage2/phase1-historical.json';
 const maxGames=Math.min(30,Math.max(1,Number(process.env.STAGE2_PHASE1_MAX_GAMES)||8));
 const result=await buildPhase1(JSON.parse(readFileSync(input,'utf8')),{maxGames});
 mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.summary));
}
