/* Currentscy Picks V101 — NCAA Step 3: validated evidence fusion.
   Does not fetch protected feeds, expose secrets or alter existing simulations.
   Accepts normalized CFBD/SportsDataverse rows only after server-side extraction. */
(()=>{'use strict';
const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
const aliases=new Map([['ucfknights','centralflorida'],['ucf','centralflorida'],['centralfloridaknights','centralflorida'],['iowastatecyclones','iowastate'],['miamifl','miamiflorida']]);
function teamKey(name){const k=norm(name);return aliases.get(k)||k}
function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function dateKey(v){const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toISOString().slice(0,10):null}
function normalizeGame(row,source){
 if(!row||typeof row!=='object')return null;
 const home=row.home_team??row.homeTeam??row.home?.team?.displayName??row.home?.name;
 const away=row.away_team??row.awayTeam??row.away?.team?.displayName??row.away?.name;
 const date=dateKey(row.start_date??row.startDate??row.date);
 const hs=num(row.home_points??row.homePoints??row.home_score);
 const as=num(row.away_points??row.awayPoints??row.away_score);
 if(!home||!away||!date||teamKey(home)===teamKey(away)||hs===null||as===null||hs<0||as<0)return null;
 const completed=row.completed===true||row.status==='completed'||row.status==='final'||(source==='cfbd'&&hs!==null&&as!==null);
 if(!completed)return null;
 return {source,id:String(row.id??row.game_id??''),date,home:teamKey(home),away:teamKey(away),homeName:String(home),awayName:String(away),homeScore:hs,awayScore:as};
}
function matchGames(espnRows,cfbdRows,sdvRows=[]){
 const sources=[['espn',espnRows],['cfbd',cfbdRows],['sportsdataverse',sdvRows]];
 const groups=new Map(),rejected={espn:0,cfbd:0,sportsdataverse:0};
 for(const [source,rows] of sources){
  for(const row of Array.isArray(rows)?rows:[]){
   const g=normalizeGame(row,source);
   if(!g){rejected[source]++;continue}
   const key=[g.date,g.home,g.away].join('|');
   if(!groups.has(key))groups.set(key,[]);
   if(!groups.get(key).some(x=>x.source===source))groups.get(key).push(g);
  }
 }
 const games=[],conflicts=[];
 for(const [key,rows] of groups){
  const scores=new Set(rows.map(x=>x.homeScore+'-'+x.awayScore));
  if(scores.size>1){conflicts.push({key,sources:rows.map(x=>x.source),reason:'Conflicting final scores'});continue}
  games.push({key,...rows[0],sources:rows.map(x=>x.source),crossChecked:rows.length>=2});
 }
 return {games,conflicts,rejected,counts:{accepted:games.length,crossChecked:games.filter(x=>x.crossChecked).length,conflicted:conflicts.length}};
}
function normalizeEfficiency(row){
 if(!row||typeof row!=='object')return null;
 const team=teamKey(row.team??row.teamName);
 const offense=row.offense??{},defense=row.defense??{};
 const offEPA=num(row.offenseEPA??offense.epaPerPlay??offense.epa_per_play);
 const defEPA=num(row.defenseEPA??defense.epaPerPlay??defense.epa_per_play);
 const offSuccess=num(row.offenseSuccess??offense.successRate??offense.success_rate);
 const defSuccess=num(row.defenseSuccess??defense.successRate??defense.success_rate);
 if(!team||[offEPA,defEPA,offSuccess,defSuccess].some(x=>x===null))return null;
 if(offSuccess<0||offSuccess>1||defSuccess<0||defSuccess>1)return null;
 return {team,offEPA,defEPA,offSuccess,defSuccess,season:Number(row.season??row.year),source:String(row.source??'normalized'),verifiedAt:row.verifiedAt??null};
}
function matchup(home,away,rows){
 const map=new Map((Array.isArray(rows)?rows:[]).map(normalizeEfficiency).filter(Boolean).map(x=>[x.team,x]));
 const h=map.get(teamKey(home)),a=map.get(teamKey(away));
 if(!h||!a)return {ready:false,reason:'Verified advanced metrics missing for one or both teams'};
 if(h.season!==a.season||!Number.isInteger(h.season))return {ready:false,reason:'Advanced metrics seasons do not match'};
 return {ready:true,season:h.season,home:h,away:a,signals:{
  homeOffenseVsAwayDefenseEPA:h.offEPA-a.defEPA,
  awayOffenseVsHomeDefenseEPA:a.offEPA-h.defEPA,
  homeOffenseVsAwayDefenseSuccess:h.offSuccess-a.defSuccess,
  awayOffenseVsHomeDefenseSuccess:a.offSuccess-h.defSuccess
 },calibrated:false,note:'Matchup differences are exploratory features, not win probabilities'};
}
window.CurrentscyNCAAIntegrationV101=Object.freeze({teamKey,normalizeGame,matchGames,normalizeEfficiency,matchup,version:'V101',simulationConnected:false});
})();