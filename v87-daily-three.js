/* V87 NBA daily three-leg game-winner research; no invented probabilities. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const tz='America/Los_Angeles';
const dateKey=d=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+p.month+p.day};
const clean=x=>String(x||'').trim();
const parseRecord=c=>{
 const records=c?.records||[];
 const overall=records.find(x=>/overall|total/i.test(x.type||x.name||''))||records[0];
 const summary=clean(overall?.summary);
 const m=summary.match(/^(\d+)\s*-\s*(\d+)$/);
 if(!m)return null;
 const w=+m[1],l=+m[2];return w+l>=8?{w,l,pct:w/(w+l)}:null;
};
const build=(event)=>{
 if(event.status?.type?.completed||event.status?.type?.state==='post')return null;
 const competitors=event.competitions?.[0]?.competitors||[];
 const home=competitors.find(c=>c.homeAway==='home'),away=competitors.find(c=>c.homeAway==='away');
 if(!home?.team?.displayName||!away?.team?.displayName)return null;
 const hr=parseRecord(home),ar=parseRecord(away);
 if(!hr||!ar)return null;
 const diff=Math.abs(hr.pct-ar.pct);
 if(diff<.10)return null; // Avoid marginal record-only selections.
 const pick=hr.pct>ar.pct?home:away,record=hr.pct>ar.pct?hr:ar;
 return {id:event.id,pick:pick.team.displayName,home:home.team.displayName,away:away.team.displayName,record,other:hr.pct>ar.pct?ar:hr,diff,date:event.date};
};
let loadedDate='',items=[],loading=false;
async function fetchToday(){
 const day=dateKey(new Date());if(loading||loadedDate===day)return;
 loading=true;
 try{
  const url='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates='+day+'&limit=100';
  const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('scoreboard unavailable');
  const j=await r.json();
  items=(j.events||[]).filter(e=>dateKey(new Date(e.date))===day).map(build).filter(Boolean).sort((a,b)=>b.diff-a.diff).slice(0,3);
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
 if(!items.length||items.length!==3){host?.remove();return}
 if(!host){
  host=document.createElement('section');host.id='v87-daily-three';host.className='v87-daily-three';
  const parent=games.parentNode;parent.insertBefore(host,games);
 }
 const day=dateKey(new Date());
 if(host.dataset.date===day&&host.dataset.ids===items.map(x=>x.id).join(','))return;
 host.dataset.date=day;host.dataset.ids=items.map(x=>x.id).join(',');
 host.replaceChildren();
 const h=document.createElement('h2');h.textContent='🏀 Today’s NBA 3-Leg Game Parlay';host.appendChild(h);
 const note=document.createElement('p');note.className='v87-three-note';note.textContent='Three game-winner candidates for today (Pacific time), ranked by current team records. Preliminary research only; injuries, lineups and defensive matchups are not verified.';host.appendChild(note);
 items.forEach((x,i)=>{
  const div=document.createElement('div');div.className='v87-three-leg';
  const title=document.createElement('strong');title.textContent=(i+1)+'. '+x.pick+' to win';div.appendChild(title);
  const match=document.createElement('p');match.textContent=x.away+' vs '+x.home;div.appendChild(match);
  const sub=document.createElement('small');sub.textContent='Record comparison: '+x.record.w+'-'+x.record.l+' vs '+x.other.w+'-'+x.other.l+' · No calibrated win probability';div.appendChild(sub);
  host.appendChild(div);
 });
 const footer=document.createElement('p');footer.className='v87-three-note';footer.textContent='Record-based shortlist, not a three-game simulation or guaranteed parlay. Opens only when three eligible games have supported records.';host.appendChild(footer);
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const nba=document.body.dataset.sport==='nba'&&!$('listing')?.classList.contains('hidden');if(nba){fetchToday();render()}else $('v87-daily-three')?.remove()})}
function init(){
 const refresh=$('refresh');if(refresh)refresh.classList.add('v87-hide-refresh');
 schedule();
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','data-sport'],childList:true,subtree:false});
 const listing=$('listing');if(listing)new MutationObserver(schedule).observe(listing,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();