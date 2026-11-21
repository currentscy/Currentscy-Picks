// Stage 2 game-specific ESPN boxscore ingestion. Historical/postgame observations
// are NEVER eligible as pregame evidence for the same event.
import {readFileSync,writeFileSync} from 'node:fs';
const ROUTES={
 nba:'basketball/nba',nfl:'football/nfl','ncaa-football':'football/college-football',
 nhl:'hockey/nhl',mlb:'baseball/mlb',
 'soccer-england':'soccer/eng.1','soccer-spain':'soccer/esp.1',
 'soccer-germany':'soccer/ger.1','soccer-italy':'soccer/ita.1',
 'soccer-france':'soccer/fra.1','soccer-mexico':'soccer/mex.1',
 'soccer-mls':'soccer/usa.1','soccer-ucl':'soccer/uefa.champions',
 'soccer-uel':'soccer/uefa.europa'
};
export function parseBoxscore(summary,game,observedAt,sourceUrl) {
 const observations=[],unresolved=[];
 const teams=new Set((game.teams||[]).map(t=>String(t.teamKey).split(':').at(-1)));
 for(const group of summary?.boxscore?.players||[]) {
  const teamId=String(group?.team?.id||'');
  if(!teams.has(teamId)){unresolved.push({reason:'boxscore team not reconciled',teamId});continue;}
  for(const category of group.statistics||[]) {
   const keys=category.keys||category.labels||[];
   for(const entry of category.athletes||[]) {
    const athlete=entry.athlete||{};
    if(!athlete.id){unresolved.push({reason:'missing athlete ID',teamId});continue;}
    const values=entry.stats||[];
    if(!Array.isArray(values)||!values.length)continue;
    observations.push({
     eventId:game.gameKey,gameKey:game.gameKey,sport:game.sport,
     playerId:String(athlete.id),playerName:athlete.displayName||null,
     participantId:(game.teams||[]).find(t=>String(t.teamKey).split(':').at(-1)===teamId)?.teamKey,
     source:'espn-game-summary',sourceUrl,observedAt,
     statGroup:category.name||category.displayName||'unknown',
     stats:Object.fromEntries(values.map((v,i)=>[String(keys[i]||'stat_'+i),v])),
     season:game.season||null,injuryStatus:null,lineupStatus:'unknown',
     evidencePhase:'postgame',pregameEligible:false,
     independentVerification:false
    });
   }
  }
 }
 return {observations,unresolved};
}
export async function enrichStage2(stage2,{fetcher=fetch,maxGames=20,observedAt=new Date().toISOString()}={}) {
 const games=[];let attempted=0;
 for(const game of stage2.games||[]) {
  const g={...game,observations:[...(game.observations||[])],unresolved:[...(game.unresolved||[])]};
  const route=ROUTES[game.sport];
  const eventId=game.source?.eventId||game.gameKey?.split(':').at(-1);
  if(!game.completed||!route||!eventId||attempted>=maxGames){games.push(g);continue;}
  attempted++;
  const url='https://site.api.espn.com/apis/site/v2/sports/'+route+'/summary?event='+encodeURIComponent(eventId);
  try {
   const response=await fetcher(url,{headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const result=parseBoxscore(await response.json(),game,observedAt,url);
   g.observations.push(...result.observations);
   g.unresolved.push(...result.unresolved);
   g.evidenceCollection={status:result.observations.length?'postgame-collected':'no-player-observations',observedAt,sourceUrl:url,pregameEligible:false};
  }catch(e){g.unresolved.push({reason:'source fetch failed',message:String(e.message||e),sourceUrl:url});g.evidenceCollection={status:'failed',observedAt,sourceUrl:url};}
  games.push(g);
 }
 return {...stage2,stage2EnrichedAt:observedAt,games,postgameObservations:games.reduce((n,g)=>n+(g.observations||[]).filter(o=>o.evidencePhase==='postgame').length,0)};
}
if(process.argv[1]&&import.meta.url==='file://'+process.argv[1]){
 const input=process.argv[2]||'research-ledger/stage2/latest.json';
 const output=process.argv[3]||'research-ledger/stage2/enriched.json';
 const data=await enrichStage2(JSON.parse(readFileSync(input,'utf8')));
 writeFileSync(output,JSON.stringify(data,null,2)+'\n');
 console.log('Wrote',output,'postgame observations:',data.postgameObservations);
}
