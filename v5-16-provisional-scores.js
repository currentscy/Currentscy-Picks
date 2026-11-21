/* Provisional matchup scoring: only uses completed current-season ESPN team games.
   Never claims player, injury or simulation evidence not present in the feed. */
(()=>{'use strict';
const ROOT='https://site.api.espn.com/apis/site/v2/sports/',TZ='America/Los_Angeles';
const sportPath={nfl:'football/nfl',ncaa:'football/college-football',nba:'basketball/nba'};
const cache=new Map();let busy=false,lastRun=0;
const request=async url=>{if(!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).catch(()=>null));return cache.get(url)};
const number=v=>{const x=typeof v==='object'?(v?.value??v?.displayValue):v;const n=Number(x);return Number.isFinite(n)?n:null};
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const day=d=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return p.year+p.month+p.day};
const seasonYear=()=>{const d=new Date(),parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'numeric'}).formatToParts(d).map(x=>[x.type,x.value]));return +parts.year};
function completedGames(data,id,cutoff){
 return (data?.events||[]).filter(e=>e.status?.type?.completed&&new Date(e.date)<cutoff).map(e=>{
 const c=e.competitions?.[0]?.competitors||[],us=c.find(x=>String(x.team?.id)===String(id)),them=c.find(x=>x!==us);
 const scored=number(us?.score),allowed=number(them?.score);
 return us&&them&&scored!==null&&allowed!==null?{scored,allowed,date:e.date,opponent:them.team?.displayName}:null;
 }).filter(Boolean).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
async function profile(path,id,cutoff){
 const year=seasonYear(),url=ROOT+path+'/teams/'+id+'/schedule?season='+year+'&limit=100';
 const data=await request(url);let games=completedGames(data,id,cutoff);
 if(path==='football/nfl'||path==='football/college-football')games=games.slice(0,8);else games=games.slice(0,12);
 if(games.length<3)return null;
 const mean=k=>games.reduce((sum,g)=>sum+g[k],0)/games.length;
 return {pf:mean('scored'),pa:mean('allowed'),n:games.length,latest:games[0].date};
}
function compute(a,b,path,homeA){
 const base=path==='basketball/nba'?112:25,edge=path==='basketball/nba'?2.2:1.6;
 const ap=.55*a.pf+.45*b.pa, bp=.55*b.pf+.45*a.pa;
 const shrink=a.n<5||b.n<5?.55:.8;
 const as=base+(ap-base)*shrink+(homeA?edge/2:-edge/2);
 const bs=base+(bp-base)*shrink+(homeA?-edge/2:edge/2);
 return {as:Math.max(0,Math.round(as)),bs:Math.max(0,Math.round(bs)),ap,bp};
}
function detail(card,msg){const details=card.querySelector('details');if(!details)return;let target=details.querySelector('.cp-projection-evidence');if(!target){target=document.createElement('p');target.className='cp-projection-evidence';details.insertBefore(target,details.children[1]||null)}target.textContent=msg}
function setScore(card,model,winner,opponent,as,bs,a,b){
 const sub=card.querySelector('.cp-pick-sub');if(!sub)return;
 const predictedWinner=as>bs?winner:bs>as?opponent:'Tie projection';
 sub.textContent='Provisional score · '+winner+' '+as+' – '+opponent+' '+bs;
 sub.style.color='#e4c18d';sub.style.fontWeight='650';
 const note=card.querySelector('.cp-tactical-note')||document.createElement('div');note.className='cp-tactical-note';
 note.style.cssText='font-size:11px;line-height:1.3;color:#b9c2ce;margin-top:4px';
 const reason=a.pf-b.pa>b.pf-a.pa?winner+' scoring profile versus '+opponent+' points allowed':opponent+' scoring profile versus '+winner+' points allowed';
 note.textContent='Matchup factor: '+reason+' (recent completed games)';
 if(!note.parentNode)sub.after(note);
 const details=card.querySelector('details');if(details){[...details.querySelectorAll('p')].forEach(p=>{if(!p.classList.contains('cp-projection-evidence'))p.remove()})}
 detail(card,'Offensive scoring: '+winner+' '+a.pf.toFixed(1)+' PPG; '+opponent+' '+b.pf.toFixed(1)+' PPG. Defensive points allowed: '+winner+' '+a.pa.toFixed(1)+'; '+opponent+' '+b.pa.toFixed(1)+'. Samples: '+a.n+' and '+b.n+' current-season completed games before this matchup. Model: recent scoring blend v1, home adjustment and shrinkage. Projected edge: '+predictedWinner+'. No verified player assignments, injuries, or Monte Carlo output in these inputs. Not a calibrated win probability.');
}
async function updateCard(card,path){
 const teams=card.querySelector('.cp-pick-teams');if(!teams||card.dataset.cpProjection==='ready')return;
 const opponent=teams.querySelector('span')?.textContent.replace(/^vs\s*/,'').trim(),winner=teams.firstChild?.textContent?.trim();
 const meta=card.querySelector('.cp-pick-meta')?.textContent||'';
 const match=meta.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{1,2}):(\d{2})\s*([AP])M/);
 const month=match?new Date(Date.parse(match[1]+' 1, 2020')).getMonth():NaN;
 const date=match?new Date(seasonYear(),month,+match[2]):new Date(NaN);
 if(!winner||!opponent||!Number.isFinite(date.getTime()))return;
 const key=String(seasonYear())+String(month+1).padStart(2,'0')+String(+match[2]).padStart(2,'0'),board=await request(ROOT+path+'/scoreboard?dates='+key+'&limit=100');
 const event=(board?.events||[]).find(e=>{
 const c=e.competitions?.[0]?.competitors||[];
 return c.some(x=>normalize(x.team?.displayName)===normalize(winner))&&c.some(x=>normalize(x.team?.displayName)===normalize(opponent));
 });
 if(!event)return;
 const cs=event.competitions?.[0]?.competitors||[];
 const w=cs.find(x=>normalize(x.team?.displayName)===normalize(winner)),o=cs.find(x=>normalize(x.team?.displayName)===normalize(opponent));
 if(!w?.team?.id||!o?.team?.id)return;
 const cutoff=new Date(event.date),[a,b]=await Promise.all([profile(path,w.team.id,cutoff),profile(path,o.team.id,cutoff)]);
 if(!a||!b){detail(card,'Insufficient completed current-season scoring samples for a defensible provisional projection.');return}
 const x=compute(a,b,path,w.homeAway==='home');
 setScore(card,null,winner,opponent,x.as,x.bs,a,b);card.dataset.cpProjection='ready';
}
async function run(){
 const sport=document.body?.dataset?.sport,path=sportPath[sport];if(!path||busy)return;
 const host=sport==='nba'?document.getElementById('v87-daily-three'):document.getElementById('v59WeeklyResults');
 const cards=[...host?.querySelectorAll('.cp-pick')||[]].filter(c=>c.dataset.cpProjection!=='ready');
 if(!cards.length)return;busy=true;
 try{await Promise.all(cards.slice(0,5).map(c=>updateCard(c,path).catch(()=>{})))}finally{busy=false}
}
function init(){setInterval(()=>{if(Date.now()-lastRun<9000)return;lastRun=Date.now();run()},10000);run()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();