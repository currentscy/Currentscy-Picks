// Read-only readiness report builder. Run with node research-ledger/validation/build-readiness.mjs
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const canonical=s=>s==='ncaa_football'?'ncaa-football':s?.startsWith('soccer-')?'soccer':s?.startsWith('tennis-')?'tennis':s;
export const SPORTS=['nfl','nba','ncaa-football','soccer','nhl','mlb','tennis','ufc'];
export function build(stage2,comparison,previous={}) {
 const report={...previous,schemaVersion:2,readinessGeneratedAt:new Date().toISOString(),readinessBySport:{}};
 const games=Array.isArray(stage2?.games)?stage2.games:[];
 const forecasts=Array.isArray(comparison?.games)?comparison.games:[];
 for(const sport of SPORTS) {
  const subset=games.filter(g=>canonical(g.sport)===sport);
  const obs=subset.flatMap(g=>(Array.isArray(g.observations)?g.observations:[]).map(o=>({o,g})));
  const rejected=[];let eligible=0;
  for(const {o,g} of obs) {
   const eventId=o.eventId||o.gameKey;
   const observedAt=Date.parse(o.observedAt||o.retrievedAt);
   const start=Date.parse(g.start);
   const teams=new Set((g.teams||[]).map(t=>t.teamKey));
   const issues=[];
   if(eventId!==g.gameKey)issues.push('event identity mismatch');
   if(!o.playerId||!o.participantId||!teams.has(o.participantId))issues.push('player/team identity missing or unmatched');
   if(!o.season||!g.season||o.season!==g.season)issues.push('season not verified');
   if(!Number.isFinite(observedAt)||!Number.isFinite(start)||observedAt>start)issues.push('not verified pregame');
   if(!o.sourceUrl||!/^https:\/\//.test(o.sourceUrl))issues.push('source URL missing');
   if(!['confirmed','probable','unknown'].includes(o.lineupStatus))issues.push('lineup status missing');
   if(o.authenticated!==true)issues.push('independent authentication missing');
   if(issues.length)rejected.push({gameKey:g.gameKey,issues});else eligible++;
  }
  const scored=[];
  for(const f of forecasts.filter(f=>canonical(f.sport)===sport)) {
   const p=f.homeWinProbability;
   const r=f.result;
   if(f.status!=='scored'||!r||typeof r.homeWon!=='boolean'||!r.sourceUrl||!/^https:\/\//.test(r.sourceUrl))continue;
   if(!Number.isFinite(p)||p<0||p>1)continue;
   if(!Number.isFinite(Date.parse(f.predictedAt))||!Number.isFinite(Date.parse(f.scheduledStart))||Date.parse(f.predictedAt)>=Date.parse(f.scheduledStart))continue;
   if(!Number.isFinite(Date.parse(r.verifiedAt))||Date.parse(r.verifiedAt)<Date.parse(f.scheduledStart))continue;
   scored.push({p,y:Number(r.homeWon)});
  }
  const n=scored.length;
  const brier=n?scored.reduce((s,x)=>s+(x.p-x.y)**2,0)/n:null;
  const logLoss=n?scored.reduce((s,x)=>s-(x.y*Math.log(Math.max(1e-12,x.p))+(1-x.y)*Math.log(Math.max(1e-12,1-x.p))),0)/n:null;
  const calibration=[0,.2,.4,.6,.8].map(lo=>{const a=scored.filter(x=>x.p>=lo&&(lo===.8?x.p<=1:x.p<lo+.2));return {range:[lo,lo+.2],n:a.length,meanPrediction:a.length?a.reduce((s,x)=>s+x.p,0)/a.length:null,observedRate:a.length?a.reduce((s,x)=>s+x.y,0)/a.length:null};});
  // The report cannot prove tests, source authentication, or model validation by itself.
  report.readinessBySport[sport]={operational:null,evidenceReady:false,validated:false,stage2Games:subset.length,linkedObservations:obs.length,eligibleObservations:eligible,rejectedObservations:rejected.length,scoredForecasts:n,brier,logLoss,calibration,blockers:[...(eligible?'independent authentication requires external audit':['no authenticated, pregame player observations']), 'operational regression tests not established', 'out-of-sample model validation not established']};
 }
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const stage2=read('research-ledger/stage2/latest.json');
 const comparison=read('research-ledger/forecast-vs-results.json');
 const previous=read('research-ledger/validation-dashboard.json');
 const report=build(stage2,comparison,previous);
 writeFileSync(resolve(root,'research-ledger/validation-dashboard.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Readiness report written; no models or website files modified');
}
