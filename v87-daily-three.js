/* V5.6 NBA same-day five-game winner ranking; no invented probabilities. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const tz='America/Los_Angeles';
const dateKey=d=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+p.month+p.day};
const clean=x=>String(x||'').trim();
const model=window.CurrentscyNBAModel;
if(!model){console.warn('Currentscy NBA shared model unavailable');return;}
const parseRecord=model.parseRecord;
const estimate=model.estimate;
const build=(event)=>{
 if(event.status?.type?.completed||event.status?.type?.state==='post')return null;
 const competitors=event.competitions?.[0]?.competitors||[];
 const home=competitors.find(c=>c.homeAway==='home'),away=competitors.find(c=>c.homeAway==='away');
 if(!home?.team?.displayName||!away?.team?.displayName)return null;
 const hr=parseRecord(home),ar=parseRecord(away);
 // No reliable current-season records means no probability and no selection.
 if(!hr||!ar)return null;
 const homeEstimate=estimate(hr,ar);
 const homeFavored=homeEstimate>=.5;
 const edge=Math.abs(homeEstimate-.5);
 const pick=homeFavored?home:away;
 return {id:event.id,pick:pick.team.displayName,home:home.team.displayName,away:away.team.displayName,
  record:homeFavored?hr:ar,other:homeFavored?ar:hr,
  diff:edge,estimate:homeFavored?homeEstimate:1-homeEstimate,date:event.date};
};
let loadedDate='',items=[],loading=false,lastAttempt=0;
async function teamRecord(c){
 const direct=parseRecord(c);
 if(direct)return direct;
 const id=c?.team?.id;
 if(!id)return null;
 try{
  const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/'+encodeURIComponent(id),{cache:'no-store'});
  if(!r.ok)return null;
  const j=await r.json(),t=j.team||j;
  const records=t.record?.items||t.record?.records||[];
  const overall=records.find(x=>/total|overall/i.test(x.type||x.name||''))||records[0];
  const stats=overall?.stats||[];
  const stat=n=>stats.find(x=>x.name===n||x.abbreviation===n)?.value;
  const w=Number(stat('wins')),l=Number(stat('losses'));
  if(Number.isFinite(w)&&Number.isFinite(l)&&w+l>=8)return {w,l,pct:w/(w+l)};
  const summary=overall?.summary||t.record?.summary||t.record;
  return parseRecord({records:[{summary:typeof summary==='string'?summary:''}]});
 }catch{return null}
}
async function enrichEvent(e){
 const competitors=e.competitions?.[0]?.competitors||[];
 const home=competitors.find(c=>c.homeAway==='home'),away=competitors.find(c=>c.homeAway==='away');
 if(!home||!away)return null;
 const [hr,ar]=await Promise.all([teamRecord(home),teamRecord(away)]);
 if(!hr||!ar)return null;
 return build({...e,competitions:[{...e.competitions[0],competitors:competitors.map(c=>c===home?{...c,records:[{type:'total',summary:hr.w+'-'+hr.l}]}:c===away?{...c,records:[{type:'total',summary:ar.w+'-'+ar.l}]}:c)}]});
}
async function fetchToday(){
 const day=dateKey(new Date()),now=Date.now();
 if(loading||(loadedDate===day&&now-lastAttempt<5*60*1000))return;
 loading=true;lastAttempt=now;
 try{
  // Only the current Pacific calendar day, regardless of UTC midnight.
  const dates=[day];
  const responses=await Promise.all(dates.map(async dayKey=>{
   const url='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates='+dayKey+'&limit=100';
   const r=await fetch(url,{cache:'no-store'});
   if(!r.ok)throw Error('scoreboard unavailable');
   const j=await r.json();
   return (j.events||[]).filter(e=>dateKey(new Date(e.date))===dayKey);
  }));
  const unique=new Map();
  responses.flat().forEach(e=>{
   const tip=Date.parse(e.date);
   const state=e.status?.type?.state;
   if(!e.id||!Number.isFinite(tip)||tip<=Date.now()||state==='in'||state==='post'||e.status?.type?.completed)return;
   unique.set(e.id,e);
  });
  items=(await Promise.all([...unique.values()].filter(e=>dateKey(new Date(e.date))===day).map(enrichEvent))).filter(Boolean)
   .sort((a,b)=>b.estimate-a.estimate||Date.parse(a.date)-Date.parse(b.date)).slice(0,5);
  loadedDate=day;
 }catch{items=[];loadedDate='';}finally{loading=false;render()}
}
function render(){
 const listing=$('listing'),games=$('games'),heading=$('heading');
 const nba=document.body.dataset.sport==='nba'&&listing&&!listing.classList.contains('hidden');
 let host=$('v87-daily-three');
 if(!nba){host?.remove();return}
 const status=$('status');
 if(status&&/\d+\s+games found\s*·\s*live source/i.test(status.textContent||''))status.style.display='none';
 else if(status)status.style.display='';
 if(!host){
  host=document.createElement('section');host.id='v87-daily-three';host.className='v87-daily-three';
  const parent=games.parentNode;parent.insertBefore(host,games);
 }
 const day=dateKey(new Date());
 if(host.dataset.date===day&&host.dataset.ids===items.map(x=>x.id+':'+x.estimate.toFixed(4)).join(','))return;
 host.dataset.date=day;host.dataset.ids=items.map(x=>x.id+':'+x.estimate.toFixed(4)).join(',');
 host.replaceChildren();
 const h=document.createElement('h2');h.textContent='🏀 NBA 5 Game Parlay';host.appendChild(h);
 const note=document.createElement('p');note.className='v87-three-note';note.textContent='Ranked game-winner candidates from NBA games scheduled today (Pacific time) only. Updates daily and excludes games that have already started. Ranked by a conservative model that shrinks small-sample records toward average and accounts for home court. Model estimates are NOT historically calibrated. Injuries, lineups and defensive matchups are not verified.';host.appendChild(note);
 items.forEach((x,i)=>{
  const div=document.createElement('div');div.className='v87-three-leg';
  const title=document.createElement('strong');title.textContent=(i+1)+'. '+x.pick+' to win';div.appendChild(title);
  const match=document.createElement('p');match.textContent=x.away+' vs '+x.home+' · '+new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(x.date));div.appendChild(match);
  const sub=document.createElement('small');sub.textContent='Record comparison: '+(x.record?x.record.w+'-'+x.record.l:'unavailable')+' vs '+(x.other?x.other.w+'-'+x.other.l:'unavailable')+' · Provisional model estimate: '+Math.round(x.estimate*100)+'% (NOT calibrated)';div.appendChild(sub);
  host.appendChild(div);
 });
 const footer=document.createElement('p');footer.className='v87-three-note';footer.textContent='Regularized record-and-home-court model, not a five-game simulation or guaranteed parlay. Calibration requires walk-forward testing against historical games. Games without sufficient current-season records are excluded rather than assigned a probability. Never fills missing selections with tomorrow's games.';host.appendChild(footer);
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const nba=document.body.dataset.sport==='nba'&&!$('listing')?.classList.contains('hidden');if(nba){fetchToday();render()}else $('v87-daily-three')?.remove()})}
function init(){
 const refresh=$('refresh');if(refresh)refresh.classList.add('v87-hide-refresh');
 schedule();
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','data-sport'],childList:true,subtree:false});
 const listing=$('listing');if(listing)new MutationObserver(schedule).observe(listing,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 window.addEventListener('focus',schedule);
 setInterval(schedule,60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();