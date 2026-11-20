/* V2.2 team logos — use the ESPN event's own team logo; never modify matchup data. */
(()=>{'use strict';
let busy=false,signature='';
function safeLogo(team){const logos=team?.logos||[];const raw=logos.find(x=>/^https:\/\//.test(x?.href||''))?.href||team?.logo||'';try{const u=new URL(raw);return u.protocol==='https:'&&/^(?:[a-z0-9-]+\.)*(?:espncdn\.com|espn\.com)$/.test(u.hostname)?u.href:''}catch{return ''}}
function span(name,logo){const wrapper=document.createElement('span');wrapper.className='team-label';if(logo){const img=document.createElement('img');img.className='team-logo';img.src=logo;img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>img.remove();wrapper.append(img)}wrapper.append(document.createTextNode(name));return wrapper}
function update(){
 if(document.body.dataset.sport==='home')return;
 const ev=typeof chosen!=='undefined'?chosen:null;
 const competitors=ev?.competitions?.[0]?.competitors||[];
 const away=competitors.find(x=>x.homeAway==='away')?.team,home=competitors.find(x=>x.homeAway==='home')?.team;
 const title=document.getElementById('matchTitle');
 const sig=[ev?.id,away?.displayName,home?.displayName,document.body.dataset.sport].join('|');
 if(title&&away&&home&&(!title.dataset.logoSig||title.dataset.logoSig!==sig)){
  title.replaceChildren(span(away.displayName||'Away',safeLogo(away)),document.createTextNode(' vs '),span(home.displayName||'Home',safeLogo(home)));
  title.dataset.logoSig=sig;
 }
 // Schedule buttons retain their original click handlers; only add decorative logos.
 const eventsList=typeof events!=='undefined'?events:[];
 document.querySelectorAll('.game[data-i]').forEach(btn=>{
  const e=eventsList[Number(btn.dataset.i)];if(!e||btn.dataset.logoEvent===String(e.id))return;
  const c=e.competitions?.[0]?.competitors||[],a=c.find(x=>x.homeAway==='away')?.team,h=c.find(x=>x.homeAway==='home')?.team;
  const strong=btn.querySelector('strong');if(!strong||!a||!h)return;
  strong.replaceChildren(span(a.displayName||'Away',safeLogo(a)),document.createTextNode(' vs '),span(h.displayName||'Home',safeLogo(h)));
  btn.dataset.logoEvent=String(e.id);
 });
 // Add a small logo to matching injury team headings without changing report text or status.
 const detail=document.getElementById('detail');
 if(detail&&!detail.classList.contains('hidden')&&away&&home){
  const teams=[away,home];
  for(const el of detail.querySelectorAll('h3,h4,strong,summary')){
   if(el.querySelector('.team-logo'))continue;
   const raw=el.textContent?.trim()||'';
   const t=teams.find(t=>raw===t.displayName||raw.startsWith(t.displayName+' ·')||raw.startsWith(t.displayName+' •'));
   if(!t||!safeLogo(t))continue;
   const img=document.createElement('img');img.className='team-logo';img.src=safeLogo(t);img.alt='';img.loading='lazy';img.onerror=()=>img.remove();el.prepend(img);
  }
 }
 signature=sig;
}
function schedule(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;update()})}
function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();