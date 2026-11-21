/* NBA daily top-five winners. Isolated from NFL/NCAA and legacy NBA player parlays. */
(()=>{'use strict';
const ID='v87-daily-three', TZ='America/Los_Angeles', API='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const byId=id=>document.getElementById(id);
const dayKey=d=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return p.year+p.month+p.day};
const safeDate=d=>{const n=new Date(d);return Number.isFinite(n.getTime())?n:null};
const model=()=>window.CurrentscyNBAModel;
let cacheDay='', lastFetch=0, loading=false, games=[], error='', generation=0;
function active(){return document.body?.dataset?.sport==='nba' && !!byId('listing') && !byId('listing').classList.contains('hidden') && byId('detail')?.classList.contains('hidden')!==false}
function record(c){
 const m=model();if(!m)return null;
 const r=m.parseRecord(c);if(r)return r;
 const summary=c?.team?.record?.summary||c?.team?.record;
 if(typeof summary==='string')return m.parseRecord({records:[{type:'total',summary}]});
 return null;
}
async function getRecord(c){
 const direct=record(c);if(direct)return direct;
 if(!c?.team?.id)return null;
 try{
  const response=await fetch(API+'teams/'+encodeURIComponent(c.team.id),{cache:'no-store'});
  if(!response.ok)return null;
  const data=await response.json(),t=data.team||data,rs=t.record?.items||t.record?.records||[];
  const overall=rs.find(x=>/total|overall/i.test(x.type||x.name||''))||rs[0];
  const parsed=record({records:[overall||{}]});if(parsed)return parsed;
  const stats=overall?.stats||[];
  const val=(name,abbr)=>Number(stats.find(x=>x.name===name||x.abbreviation===abbr)?.value);
  const w=val('wins','W'),l=val('losses','L');
  if(Number.isFinite(w)&&Number.isFinite(l)&&w+l>=8)return {w,l,pct:w/(w+l)};
  return record({records:[{summary:overall?.summary||t.record?.summary||''}]});
 }catch{return null}
}
async function rank(event){
 const cs=event?.competitions?.[0]?.competitors||[],h=cs.find(x=>x.homeAway==='home'),a=cs.find(x=>x.homeAway==='away');
 if(!h?.team?.displayName||!a?.team?.displayName)return null;
 const [hr,ar]=await Promise.all([getRecord(h),getRecord(a)]);
 const estimate=hr&&ar&&model()?.estimate(hr,ar);
 if(!Number.isFinite(estimate))return null;
 const home=estimate>=.5,dt=safeDate(event.date);if(!dt)return null;
 return {id:String(event.id),winner:(home?h:a).team.displayName,loser:(home?a:h).team.displayName,
 score:home?estimate:1-estimate,winnerRecord:home?hr:ar,loserRecord:home?ar:hr,date:dt,
 started:Date.now()>=dt.getTime()||event.status?.type?.state==='in'};
}
async function refresh(force=false){
 const day=dayKey(new Date()),now=Date.now();
 if(!active()||loading||(!force&&cacheDay===day&&now-lastFetch<300000))return;
 loading=true;lastFetch=now;error='';render();
 const request=++generation;
 try{
  const response=await fetch(API+'scoreboard?dates='+day+'&limit=100',{cache:'no-store'});
  if(!response.ok)throw Error('NBA scoreboard HTTP '+response.status);
  const data=await response.json();
  const events=(data.events||[]).filter(e=>e.id&&safeDate(e.date)&&dayKey(new Date(e.date))===day&&!e.status?.type?.completed&&e.status?.type?.state!=='post');
  const results=await Promise.all(events.map(rank));
  if(request!==generation)return;
  games=results.filter(Boolean).sort((a,b)=>b.score-a.score||a.date-b.date).slice(0,5);
  cacheDay=day;
 }catch(e){error=e.message||'NBA data unavailable';cacheDay='';games=[]}
 finally{loading=false;render()}
}
function render(){
 const old=byId(ID);
 if(!active()){old?.remove();return}
 const listing=byId('listing'),target=byId('games');if(!listing||!target||!target.parentNode)return;
 let panel=old;
 if(!panel){panel=document.createElement('section');panel.id=ID;panel.className='v87-daily-three';}
 if(panel.parentNode!==target.parentNode||panel.nextSibling!==target)target.parentNode.insertBefore(panel,target);
 panel.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='🏀 NBA · Top 5 Daily Game Winners';panel.appendChild(heading);
 const intro=document.createElement('p');intro.className='v87-three-note';
 intro.textContent='Today only · Pacific time · strongest available matchup leans. Record/home-court estimates are not calibrated probabilities; injuries, lineups and individual defensive matchups are not verified.';
 panel.appendChild(intro);
 if(loading&&!games.length){const p=document.createElement('p');p.textContent='Loading today’s NBA winner rankings…';panel.appendChild(p)}
 if(error){const p=document.createElement('p');p.textContent='NBA ranking temporarily unavailable: '+error;panel.appendChild(p)}
 games.forEach((g,i)=>{
  const row=document.createElement('div');row.className='v87-three-leg';
  const title=document.createElement('strong');title.textContent=(i+1)+'. '+g.winner+' over '+g.loser+(g.started?' · IN PROGRESS / STARTED':'');row.appendChild(title);
  const detail=document.createElement('p');detail.textContent=new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(g.date);row.appendChild(detail);
  const note=document.createElement('small');note.textContent='Ranking score '+(g.score*100).toFixed(1)+'/100 · Records '+g.winnerRecord.w+'-'+g.winnerRecord.l+' vs '+g.loserRecord.w+'-'+g.loserRecord.l+(g.started?' · not a pregame forecast':'');row.appendChild(note);
  panel.appendChild(row);
 });
 if(!loading&&!error&&!games.length){const p=document.createElement('p');p.textContent='No eligible same-day games with verified season records. No picks from tomorrow or another week will be substituted.';panel.appendChild(p)}
 const footer=document.createElement('p');footer.className='v87-three-note';footer.textContent='Five selections are a maximum, not a requirement. Rankings are research candidates, not a guaranteed five-leg parlay.';panel.appendChild(footer);
}
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render();refresh()})}
function init(){
 const listing=byId('listing');
 if(listing)new MutationObserver(schedule).observe(listing,{attributes:true,attributeFilter:['class']});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-sport']});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 window.addEventListener('focus',schedule);
 setInterval(schedule,60000);
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
