#!/usr/bin/env node
/* Live NBA feedback loop. Runs the SAME shared model used by the website.
   All timestamps are server-side. No forecast is made after tip-off. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const model=require('../nba-shared-model.js');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'research-ledger','stage3');
const load=(name,otherwise)=>{try{return JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))}catch(e){if(e.code==='ENOENT')return otherwise;throw e}};
const write=(name,obj)=>{fs.mkdirSync(dir,{recursive:true});const p=path.join(dir,name);const tmp=p+'.tmp';fs.writeFileSync(tmp,JSON.stringify(obj,null,2)+'\n');fs.renameSync(tmp,p)};
const clock=()=>new Date();
const day=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replaceAll('-','');
async function json(url){
 const res=await fetch(url,{headers:{'User-Agent':'CurrentscyPicksFeedback/1.0','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error('HTTP '+res.status+' '+url);
 return res.json();
}
async function record(c){
 const direct=model.parseRecord(c);
 if(direct)return direct;
 const id=c?.team?.id;
 if(!id)return null;
 try{
  const j=await json('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/'+encodeURIComponent(id));
  const t=j.team||j;
  const rs=t.record?.items||t.record?.records||[];
  const o=rs.find(x=>/total|overall/i.test(x.type||x.name||''))||rs[0];
  const stats=o?.stats||[];
  const stat=n=>stats.find(x=>x.name===n||x.abbreviation===n)?.value;
  const w=Number(stat('wins')),l=Number(stat('losses'));
  if(Number.isFinite(w)&&Number.isFinite(l)&&w+l>=8)return {w,l,pct:w/(w+l)};
  return model.parseRecord({records:[{summary:typeof o?.summary==='string'?o.summary:''}]});
 }catch{return null}
}
async function enrich(e){
 const cs=e.competitions?.[0]?.competitors||[];
 const home=cs.find(c=>c.homeAway==='home'),away=cs.find(c=>c.homeAway==='away');
 if(!home||!away)return null;
 const [hr,ar]=await Promise.all([record(home),record(away)]);
 if(!hr||!ar)return null;
 return model.fromEvent({...e,competitions:[{...e.competitions[0],competitors:cs.map(c=>c===home?{...c,records:[{type:'total',summary:hr.w+'-'+hr.l}]}:c===away?{...c,records:[{type:'total',summary:ar.w+'-'+ar.l}]}:c)}]});
}
function outcomesFor(event,predictions,observedAt,source){
 const comp=event.competitions?.[0];
 if(event.status?.type?.completed!==true)return [];
 const cs=comp?.competitors||[];
 const home=cs.find(c=>c.homeAway==='home'),away=cs.find(c=>c.homeAway==='away');
 const hs=Number(home?.score),as=Number(away?.score);
 if(!home||!away||home.score==null||away.score==null||!Number.isFinite(hs)||!Number.isFinite(as)||hs===as)return [];
 return predictions.filter(p=>p.gameKey==='nba:'+event.id).map(p=>({
  predictionId:p.predictionId,result:hs>as?1:0,verified:true,
  verifiedAt:observedAt,sourceUrl:source,
  verificationMethod:'ESPN completed scoreboard and numeric final score (single provider; not independently corroborated)',
  homeScore:hs,awayScore:as
 }));
}
async function run(){
 const now=clock(),nowISO=now.toISOString();
 const predictions=load('pregame-predictions.json',[]);
 const outcomes=load('verified-outcomes.json',[]);
 const index=load('game-index.json',{schemaVersion:1,games:[]});
 const known=new Set(predictions.map(x=>x.predictionId));
 const done=new Set(outcomes.map(x=>x.predictionId));
 const games=new Map(index.games.map(g=>[g.gameKey,g]));
 let created=0,settled=0,failures=[];
 // Capture the current and prior two Pacific dates so finals still settle.
 const dates=[0,-1,-2].map(offset=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()+offset);return day(d)});
 for(const date of new Set(dates)){
  const url='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates='+date+'&limit=100';
  let events;
  try{events=(await json(url)).events||[]}catch(e){failures.push({date,error:String(e)});continue}
  for(const e of events){
   if(!e.id||!e.date)continue;
   const tip=new Date(e.date);
   if(!Number.isFinite(tip.getTime()))continue;
   const key='nba:'+e.id;
   if(!games.has(key))games.set(key,{gameKey:key,sport:'nba',start:e.date,sourceUrl:url});
   const status=e.status?.type||{};
   if(tip.getTime()>now.getTime()&&status.state!=='in'&&status.state!=='post'&&!status.completed){
    const id='nba-home-win:'+e.id+':'+model.version;
    if(!known.has(id)){
     const forecast=await enrich(e);
     // A slow provider call must never create a prediction after kickoff.
     const captured=clock();
     if(forecast&&captured<tip){
      predictions.push({predictionId:id,gameKey:key,market:'home-win',entityId:forecast.homeId,
       modelVersion:model.version,predictedAt:captured.toISOString(),sourceUrl:url,
       baselineProbability:forecast.homeProbability,homeTeamId:forecast.homeId,awayTeamId:forecast.awayId,
       homeRecord:forecast.homeRecord,awayRecord:forecast.awayRecord,
       captureMethod:'GitHub Actions server-side using exact NBA website shared model',
       candidateProbability:null});
      known.add(id);created++;
     }
    }
   }
   if(status.completed===true){
    for(const result of outcomesFor(e,predictions,nowISO,url)){
     if(!done.has(result.predictionId)){outcomes.push(result);done.add(result.predictionId);settled++}
    }
   }
  }
 }
 // Never replace archived forecasts or outcomes; preserve first observation.
 index.games=[...games.values()].sort((a,b)=>a.gameKey.localeCompare(b.gameKey));
 write('game-index.json',index);
 write('pregame-predictions.json',predictions);
 write('verified-outcomes.json',outcomes);
 console.log(JSON.stringify({modelVersion:model.version,newPredictions:created,newOutcomes:settled,
  totalPredictions:predictions.length,totalOutcomes:outcomes.length,failures}));
 if(failures.length===new Set(dates).size)process.exitCode=1;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
module.exports={outcomesFor};
