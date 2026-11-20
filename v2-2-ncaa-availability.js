/* Currentscy Picks V2.2 Step 4 — NCAA availability evidence.
   ESPN roster/injury feeds only. No source = unknown, never healthy.
   This is a visible audit, NOT proof of game-day participation. */
(()=>{'use strict';
const BASE='https://site.api.espn.com/apis/site/v2/sports/football/college-football/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const name=x=>String(x?.athlete?.displayName||x?.athlete?.fullName||x?.player?.displayName||x?.displayName||x?.fullName||'').trim();
const status=x=>String(x?.injuryStatus||x?.designation||x?.status?.name||x?.status?.type?.name||x?.status?.type|| (typeof x?.status==='string'?x.status:'')||'').trim();
const flagged=/\b(out|inactive|injured|questionable|doubtful|probable|suspended|reserve|limited|day.to.day|game.time|pup)\b/i;
const cache=new Map();
async function get(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}
}
function collectRoster(data){
 const groups=data?.athletes||data?.roster||[];
 const rows=[],seen=new Set();
 for(const group of Array.isArray(groups)?groups:[]){
  const label=String(group?.displayName||group?.name||'');
  const members=Array.isArray(group?.items)?group.items:Array.isArray(group?.athletes)?group.athletes:Array.isArray(group)?group:[group];
  for(const x of members){
   const person=name(x),raw=status(x),designation=flagged.test(raw)?raw:flagged.test(label)?label:'';
   if(!person||!designation)continue;
   const k=person.toLowerCase();if(seen.has(k))continue;seen.add(k);
   rows.push({name:person,status:designation,source:'ESPN roster designation'});
  }
 }
 return rows;
}
function collectInjuries(data,id){
 const groups=data?.injuries||data?.teams||data?.items||[];
 if(!Array.isArray(groups))return [];
 const rows=[],seen=new Set();
 for(const group of groups){
  if(String(group?.team?.id||group?.id||'')!==String(id))continue;
  const items=group.injuries||group.items||group.athletes||[];
  for(const x of Array.isArray(items)?items:[]){
   const person=name(x),raw=status(x);
   if(!person||!flagged.test(raw)||seen.has(person.toLowerCase()))continue;
   seen.add(person.toLowerCase());rows.push({name:person,status:raw,source:'ESPN injury listing'});
  }
 }
 return rows;
}
async function load(teams){
 const key=teams.map(t=>t.id).join(',');
 const hit=cache.get(key);if(hit&&Date.now()-hit.at<180000)return hit.rows;
 const feed=await Promise.allSettled([get(BASE+'injuries'),...teams.map(t=>get(BASE+'teams/'+encodeURIComponent(t.id)+'/roster'))]);
 const rows=teams.map((t,i)=>{
  const roster=feed[i+1],inj=feed[0];
  const records=new Map();
  if(roster.status==='fulfilled')for(const x of collectRoster(roster.value))records.set(x.name.toLowerCase(),x);
  if(inj.status==='fulfilled')for(const x of collectInjuries(inj.value,t.id))records.set(x.name.toLowerCase(),x);
  return {team:t.name,players:[...records.values()],rosterLoaded:roster.status==='fulfilled',injuriesLoaded:inj.status==='fulfilled',verifiedGameDay:false};
 });
 cache.set(key,{at:Date.now(),rows});return rows;
}
let token=0;
async function render(){
 const detail=document.getElementById('detail'),date=document.getElementById('matchDate');
 if(!detail||detail.classList.contains('hidden')||!/NCAA Football/i.test(date?.textContent||''))return;
 const comp=chosen?.competitions?.[0]?.competitors||[];
 if(sport!=='ncaa'||comp.length!==2)return;
 const teams=comp.map(c=>({id:String(c.team?.id||''),name:c.team?.displayName||''}));
 if(teams.some(t=>!t.id))return;
 let slot=document.getElementById('v22-ncaa-availability');
 if(!slot){slot=document.createElement('section');slot.id='v22-ncaa-availability';slot.className='panel';const target=document.getElementById('v68NcaaFive');(target?.parentNode||detail).insertBefore(slot,target||null)}
 const current=++token;
 slot.innerHTML='<h2>NCAA player availability</h2><p class="desc">Checking NCAA roster designations…</p>';
 try{
  const rows=await load(teams);if(current!==token||sport!=='ncaa')return;
  slot.innerHTML='<h2>🏥 NCAA match injury report</h2><div class="v23-ncaa-injury">'+rows.map(t=>'<details><summary>'+esc(t.team)+' · '+t.players.length+' reported names · Tap to expand</summary><p>'+(t.players.length?t.players.map(p=>esc(p.name)+' — '+esc(p.status)+' <small>('+esc(p.source)+')</small>').join('<hr>'):'No named availability designations found')+'</p><p class="desc">Roster '+(t.rosterLoaded?'loaded':'unavailable')+' · Injury feed '+(t.injuriesLoaded?'loaded':'unavailable')+'</p></details>').join('')+'</div><p class="desc">Not a complete game-day injury report. Missing names do not mean healthy or active; confirm status independently before using player selections.</p>';
 }catch(e){if(current===token)slot.innerHTML='<h2>NCAA player availability</h2><p class="desc">Unavailable: '+esc(e.message)+'. No healthy status assumed.</p>'}
}
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render()})}
function init(){
 const detail=document.getElementById('detail');if(!detail)return;
 const date=document.getElementById('matchDate');
 if(date)new MutationObserver(schedule).observe(date,{childList:true,subtree:true,characterData:true});
 new MutationObserver(schedule).observe(detail,{attributes:true,attributeFilter:['class']});
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyNCAAAvailabilityV22=Object.freeze({load,version:'V2.2',gameDayVerified:false});
})();