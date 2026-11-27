// Stage 2: assemble historical player evidence for BOTH sides of a future game.
// Historical game box scores are past observations; they are never mislabeled as
// confirmed future starters, injuries, or defender assignments.
const ROUTES={nfl:'football/nfl',nba:'basketball/nba','ncaa-football':'football/college-football',nhl:'hockey/nhl',mlb:'baseball/mlb','soccer-england':'soccer/eng.1','soccer-spain':'soccer/esp.1','soccer-germany':'soccer/ger.1','soccer-italy':'soccer/ita.1','soccer-france':'soccer/fra.1','soccer-mexico':'soccer/mex.1','soccer-mls':'soccer/usa.1','soccer-ucl':'soccer/uefa.champions','soccer-uel':'soccer/uefa.europa'};
const base='https://site.api.espn.com/apis/site/v2/sports/';
const stamp=x=>Date.parse(x);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
export function normalizeHistory(game,history,asOf) {
 const errors=[], observations=[],teams=game?.teams||[],ids=new Set(teams.map(t=>String(t.teamKey).split(':').at(-1)));
 if(teams.length!==2||new Set(teams.map(t=>t.teamKey)).size!==2)errors.push('game requires two distinct teams');
 if(!Number.isFinite(stamp(game?.start))||!Number.isFinite(stamp(asOf))||stamp(asOf)>=stamp(game.start))errors.push('not a pregame snapshot');
 for(const item of history||[]) {
  if(!ids.has(String(item.teamId))) {errors.push('historical team not in matchup');continue;}
  if(!nonempty(item.playerId)) {errors.push('historical player ID missing');continue;}
  if(!nonempty(item.season)||!nonempty(game.season)||String(item.season)!==String(game.season)){errors.push('historical season missing or does not match upcoming game');continue;}
  if(!nonempty(item.sourceEventId)||!nonempty(item.sourceUrl)) {errors.push('historical game provenance missing');continue;}
  if(!Number.isFinite(stamp(item.historicalGameStart))||stamp(item.historicalGameStart)>=stamp(game.start)||stamp(item.historicalGameStart)>=stamp(asOf)){errors.push('historical game occurs after cutoff');continue;}
  const participantId=teams.find(t=>String(t.teamKey).split(':').at(-1)===String(item.teamId)).teamKey;
  observations.push({eventId:game.gameKey,participantId,playerId:item.playerId,playerName:item.playerName||null,season:item.season||null,sourceEventId:item.sourceEventId,sourceUrl:item.sourceUrl,source:'espn-historical-boxscore',observedAt:asOf,historicalGameStart:item.historicalGameStart,stats:item.stats||{},lineupStatus:'unknown',injuryStatus:'unverified',confirmedForUpcomingGame:false,independentVerification:false});
 }
 const coverage=teams.map(t=>({participantId:t.teamKey,players:observations.filter(o=>o.participantId===t.teamKey).length}));
 if(coverage.some(t=>t.players===0))errors.push('missing player evidence for one or both teams');
 return {ok:errors.length===0,errors,coverage,observations};
}
async function json(fetcher,url) {const r=await fetcher(url,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r.json();}
export async function collectUpcomingGame(game,{fetcher=fetch,asOf=new Date().toISOString(),maxHistory=3}={}) {
 const route=ROUTES[game?.sport];
 if(!route)return {ok:false,errors:['no verified team-schedule route for sport'],coverage:[],observations:[]};
 const history=[],failures=[];
 let verifiedSeason=game.season?String(game.season):null;
 if(!verifiedSeason){
  const eventId=game.source?.eventId||String(game.gameKey||'').split(':').at(-1);
  try{
   const event=await json(fetcher,base+route+'/summary?event='+encodeURIComponent(eventId));
   const season=event.header?.season?.year||event.season?.year;
   if(!season)throw Error('upcoming event season missing');
   verifiedSeason=String(season);
  }catch(e){return {ok:false,errors:['cannot verify upcoming game season: '+String(e.message||e)],coverage:[],observations:[],sourceFailures:[],asOf};}
 }
 const verifiedGame={...game,season:verifiedSeason};
 for(const team of game.teams||[]) {
  const teamId=String(team.teamKey).split(':').at(-1);
  try {
   const schedule=await json(fetcher,base+route+'/teams/'+encodeURIComponent(teamId)+'/schedule');
   const candidates=(schedule.events||[]).filter(e=>String(e.season?.year||'')===verifiedSeason&&stamp(e.date)<stamp(asOf)&&stamp(e.date)<stamp(game.start)&&e.competitions?.[0]?.status?.type?.completed===true).sort((a,b)=>stamp(b.date)-stamp(a.date)).slice(0,maxHistory);
   for(const prior of candidates) {
    const url=base+route+'/summary?event='+encodeURIComponent(prior.id);
    try {
     const summary=await json(fetcher,url);
     for(const group of summary.boxscore?.players||[]) {
      if(String(group.team?.id)!==teamId)continue;
      for(const cat of group.statistics||[])for(const athlete of cat.athletes||[]) {
       if(!athlete.athlete?.id||!athlete.stats?.length)continue;
       history.push({teamId,playerId:String(athlete.athlete.id),playerName:athlete.athlete.displayName,sourceEventId:String(prior.id),sourceUrl:url,historicalGameStart:prior.date,season:String(prior.season?.year||''),stats:Object.fromEntries(athlete.stats.map((v,i)=>[String(cat.keys?.[i]||cat.labels?.[i]||'stat_'+i),v]))});
      }
     }
    }catch(e){failures.push({teamId,eventId:prior.id,reason:String(e.message||e)});}
   }
  }catch(e){failures.push({teamId,reason:String(e.message||e)});}
 }
 const result=normalizeHistory(verifiedGame,history,asOf);
 return {...result,errors:[...result.errors,...failures.map(x=>'source failure: '+x.reason)],sourceFailures:failures,ok:result.ok&&failures.length===0,asOf,injuriesVerified:false,lineupsVerified:false};
}
