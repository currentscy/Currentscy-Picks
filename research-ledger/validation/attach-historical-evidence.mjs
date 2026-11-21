// Join pregame historical player evidence into Stage 2 by exact game/team IDs.
// Preserve provenance and keep historical records ineligible for unverified
// live lineup or injury claims. Never alter predictions.
export function attachHistoricalEvidence(stage2,phase1){
 const indexed=new Map((phase1.games||[]).map(g=>[g.gameKey,g]));
 const games=(stage2.games||[]).map(game=>{
  const incoming=indexed.get(game.gameKey);
  if(!incoming)return game;
  const validTeams=new Set((game.teams||[]).map(t=>t.teamKey));
  const observations=(incoming.observations||[]).filter(o=>o.eventId===game.gameKey&&validTeams.has(o.participantId)&&o.playerId&&o.sourceEventId&&o.sourceUrl?.startsWith('https://')&&Date.parse(o.historicalGameStart)<Date.parse(game.start)&&Date.parse(o.historicalGameStart)<Date.parse(incoming.asOf)&&Date.parse(incoming.asOf)<Date.parse(game.start));
  const coverage=(game.teams||[]).map(t=>({teamKey:t.teamKey,playerObservations:observations.filter(o=>o.participantId===t.teamKey).length}));
  const bothTeamsCovered=coverage.length===2&&coverage.every(t=>t.playerObservations>0);
  return {...game,historicalPlayerEvidence:{asOf:incoming.asOf,observations,coverage,bothTeamsCovered,sourceFailures:incoming.sourceFailures||[],blockers:incoming.blockers||[],independentlyVerified:false,pregameLineupsConfirmed:false,injuriesVerified:false,simulationInputApproved:false}};
 });
 return {...stage2,phase1HistoricalEvidence:{generatedAt:phase1.generatedAt||null,gameCount:games.filter(g=>g.historicalPlayerEvidence).length,warning:'Historical box scores are not confirmed starters, verified injuries or approved simulation inputs'},games};
}
