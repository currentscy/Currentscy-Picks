/* Currentscy Picks V3.6: verified current-season NCAA coaching tendencies.
   Auto-discovers completed games, filters exact ESPN team ID, fetches summaries,
   and returns descriptive pass/run and halftime shifts only. */
(()=>{'use strict';
const cache=new Map();
const base='https://site.api.espn.com/apis/site/v2/sports/football/college-football/';
async function get(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error('ESPN HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}
}
function dateKey(d){return d.toISOString().slice(0,10).replace(/-/g,'')}
function seasonStart(year){return new Date(Date.UTC(year,7,1))}
function seasonYear(now){return now.getUTCMonth()<7?now.getUTCFullYear()-1:now.getUTCFullYear()}
async function discover(teamId,{asOf=new Date().toISOString(),maxGames=8}={}){
 if(!/^\d{1,15}$/.test(String(teamId)))throw Error('Valid ESPN team ID required');
 const cutoff=new Date(asOf);
 if(!Number.isFinite(cutoff.getTime()))throw Error('Invalid cutoff date');
 const year=seasonYear(cutoff),start=seasonStart(year);
 const games=[],errors=[],seen=new Set();
 for(let d=new Date(cutoff);d>=start&&games.length<maxGames;d.setUTCDate(d.getUTCDate()-7)){
  const day=dateKey(d);
  try{
   const data=await get(base+'scoreboard?dates='+day+'&limit=200');
   for(const event of data.events||[]){
    const competitors=event.competitions?.[0]?.competitors||[];
    if(!competitors.some(c=>String(c.team?.id)===String(teamId)))continue;
    if(event.status?.type?.completed!==true||!/^\d{5,15}$/.test(String(event.id))||seen.has(String(event.id)))continue;
    if(new Date(event.date).getTime()>=cutoff.getTime())continue;
    seen.add(String(event.id));
    games.push({eventId:String(event.id),date:event.date,name:event.name||'',opponent:competitors.find(c=>String(c.team?.id)!==String(teamId))?.team?.displayName||null});
   }
  }catch(e){errors.push(day+': '+String(e?.message||e))}
 }
 return {teamId:String(teamId),year,games:games.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,maxGames),errors,asOf:cutoff.toISOString(),method:'Weekly scoreboard discovery; incomplete if games occurred on different days'};
}
async function collect(teamId,options={}){
 const asOf=options.asOf||new Date().toISOString(),maxGames=Math.min(12,Math.max(4,Number(options.maxGames)||8));
 const key=[teamId,asOf.slice(0,10),maxGames].join(':');
 const hit=cache.get(key);if(hit&&Date.now()-hit.at<300000)return hit.value;
 const discovered=await discover(teamId,{asOf,maxGames});
 const parser=window.CurrentscyCoachingDataV25,profiles=window.CurrentscyCoachingProfilesV25;
 if(!parser||!profiles)throw Error('ESPN parser or coaching profiles unavailable');
 const results=await Promise.allSettled(discovered.games.map(async g=>{
  const game=await parser.espnGame('ncaa',g.eventId);
  return {...game,date:g.date,opponent:g.opponent,name:g.name};
 }));
 const completed=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const summary=profiles.profile(completed,teamId,{minGames:4});
 const value={league:'ncaa',teamId:String(teamId),season:discovered.year,asOf:new Date().toISOString(),cutoff:asOf,discoveredGames:discovered.games.length,parsedGames:completed.length,failedSummaries:results.length-completed.length,discoveryErrors:discovered.errors,profile:summary,gameSources:completed.map(g=>({eventId:g.eventId,date:g.date,opponent:g.opponent,url:base+'summary?event='+g.eventId,plays:g.plays.length})),currentSeasonOnly:true,coachIdentityVerified:false,scoreAdjusted:false,coverageCharted:false,simulationIntegrated:false,limitations:['Weekly discovery may omit nonstandard game dates','Observed pass/run shifts are not proof of coaching causation','No opponent-adjusted scheme or verified defensive assignments']};
 cache.set(key,{at:Date.now(),value});return value;
}
function init(){
 if(document.getElementById('cp-ncaa-coaching-check'))return;
 const box=document.createElement('section');box.id='cp-ncaa-coaching-check';box.style.cssText='margin:16px auto;padding:14px;max-width:800px;border:1px solid #575044;border-radius:12px;background:#101217;color:#f2f2f2';
 const title=document.createElement('strong');title.textContent='NCAA current-season coaching research';box.append(title);
 const p=document.createElement('p');p.style.cssText='font-size:13px;color:#bbb';p.textContent='Enter an ESPN NCAA team ID to collect completed games and observed first-half/second-half tendencies. Research only; predictions remain unchanged.';box.append(p);
 const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.placeholder='ESPN team ID';input.setAttribute('aria-label','ESPN NCAA team ID');input.style.cssText='padding:9px;background:#1b1d22;color:white;border:1px solid #666;border-radius:6px;max-width:140px';
 const button=document.createElement('button');button.type='button';button.textContent='Analyze team';button.style.cssText='margin-left:8px;padding:9px 13px;background:#bd9954;color:#111;border:0;border-radius:7px;font-weight:700';
 const out=document.createElement('div');out.setAttribute('role','status');out.style.cssText='white-space:pre-wrap;font-size:13px;margin-top:10px';
 button.addEventListener('click',async()=>{
  button.disabled=true;out.textContent='Collecting completed NCAA games…';
  try{
   const r=await collect(input.value.trim());
   const f=r.profile;
   out.textContent='Season: '+r.season+' | Games parsed: '+r.parsedGames+' | Games meeting sample: '+f.gamesUsed+'\n'+
    'Pass rate: '+(f.averagePassRate===null?'Unavailable':(100*f.averagePassRate).toFixed(1)+'%')+'\n'+
    'Second-half change: '+(f.meanSecondHalfShift===null?'Unavailable':(100*f.meanSecondHalfShift).toFixed(1)+' percentage points')+'\n'+
    'Evidence: '+f.confidence+'\n'+f.halftimeDescription+'\n'+
    (r.discoveryErrors.length?'Discovery errors: '+r.discoveryErrors.length+'\n':'')+
    'Not adjusted for score/opponent; not used in live picks.';
  }catch(e){out.textContent='Unable to analyze: '+String(e?.message||e)}
  finally{button.disabled=false}
 });
 box.append(input,button,out);(document.querySelector('main')||document.body).append(box);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyNCAACoachingV36=Object.freeze({discover,collect,version:'V3.6',simulationIntegrated:false});
})();