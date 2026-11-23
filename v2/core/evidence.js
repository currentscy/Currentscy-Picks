// Currentscy V2 evidence contract. No API credentials in client code.
export const SCHEMA_VERSION = "2.0.0";
export const SPORTS = Object.freeze(["nfl","nba","ncaa","nhl","mlb","soccer","tennis","ufc"]);
export function normalizeEvidence(input = {}) {
 const obj = input && typeof input === "object" ? input : {};
 const rows = Array.isArray(obj.playerStatistics) ? obj.playerStatistics : [];
 const valid = rows.filter(p => p && typeof p === "object" && String(p.playerId||"").trim() && String(p.teamId||"").trim() && String(p.season||"").trim() && String(p.sourceUrl||"").startsWith("https://") && Number.isFinite(Date.parse(p.collectedAt)) && p.stats && typeof p.stats==="object" && !Array.isArray(p.stats));
 return {
  schemaVersion:SCHEMA_VERSION,sport:String(obj.sport||""),eventId:String(obj.eventId||""),
  season:String(obj.season||""),homeTeamId:String(obj.homeTeamId||""),awayTeamId:String(obj.awayTeamId||""),
  scheduledAt:obj.scheduledAt||null,collectedAt:obj.collectedAt||null,
  playerStatistics:valid, rejectedPlayerRecords:rows.length-valid.length,
  verifiedInjuries:Array.isArray(obj.verifiedInjuries)?obj.verifiedInjuries:[],
  verifiedLineups:Array.isArray(obj.verifiedLineups)?obj.verifiedLineups:[],
  sourceUrls:Array.isArray(obj.sourceUrls)?obj.sourceUrls:[],
  missing:Array.isArray(obj.missing)?obj.missing:[],
  rawStatus:obj.rawStatus||"unverified"
 };
}
export function validateEvidence(raw) {
 const e=normalizeEvidence(raw),errors=[];
 if(!SPORTS.includes(e.sport))errors.push("unknown_sport");
 if(!e.eventId)errors.push("missing_event_id");
 if(!e.season)errors.push("missing_season");
 if(!e.homeTeamId||!e.awayTeamId||e.homeTeamId===e.awayTeamId)errors.push("invalid_opponents");
 if(e.rejectedPlayerRecords)errors.push("invalid_player_records");
 const home=e.playerStatistics.filter(p=>String(p.teamId)===e.homeTeamId&&String(p.season)===e.season);
 const away=e.playerStatistics.filter(p=>String(p.teamId)===e.awayTeamId&&String(p.season)===e.season);
 if(!home.length)errors.push("missing_home_player_stats");
 if(!away.length)errors.push("missing_away_player_stats");
 if(e.playerStatistics.some(p=>p.season!==e.season))errors.push("cross_season_records");
 if(e.playerStatistics.some(p=>![e.homeTeamId,e.awayTeamId].includes(String(p.teamId))))errors.push("unmatched_team_records");
 const duplicates=new Set();
 for(const p of e.playerStatistics){const k=[p.playerId,p.teamId,p.season,p.gameId||"",p.sourceUrl].join("|");if(duplicates.has(k))errors.push("duplicate_player_record");duplicates.add(k);}
 return {ready:errors.length===0,errors:[...new Set(errors)],counts:{homePlayers:home.length,awayPlayers:away.length,rejected:e.rejectedPlayerRecords},evidence:e};
}
