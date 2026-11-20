/* Currentscy Picks V100: compact NFL injury panel. Never invent injury statuses. */
(()=>{'use strict';
const links={
 'Baltimore Ravens':'https://www.baltimoreravens.com/team/injury-report/',
 'Carolina Panthers':'https://www.panthers.com/team/injury-report/',
 'Buffalo Bills':'https://www.buffalobills.com/team/injury-report/',
 'Miami Dolphins':'https://www.miamidolphins.com/team/injury-report/'
};
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
function render(){
 for(const heading of document.querySelectorAll('h1,h2,h3,h4')){
  if(!/match injury report/i.test(norm(heading.textContent)))continue;
  const panel=heading.closest('.panel')||heading.parentElement;
  if(!panel||panel.dataset.v100Injury==='done')continue;
  const original=norm(panel.textContent);
  const teams=Object.keys(links).filter(n=>original.includes(n));
  // Fallback for other NFL teams: extract named sections without inventing links.
  if(!teams.length){
   for(const h of panel.querySelectorAll('h3,h4,strong')){
    const name=norm(h.textContent);
    if(name&&name!==norm(heading.textContent)&&!teams.includes(name)&&!name.includes('Source:')&&name.length<50)teams.push(name);
   }
  }
  if(!teams.length)continue;
  panel.dataset.v100Injury='done';
  const wrap=document.createElement('div');
  wrap.className='v100-injury-compact';
  wrap.style.cssText='margin-top:10px;display:grid;gap:8px';
  for(const name of teams.slice(0,2)){
   const detail=document.createElement('details');
   detail.style.cssText='border:1px solid #424b5b;border-radius:9px;background:#171e2a';
   const summary=document.createElement('summary');
   summary.style.cssText='padding:12px;cursor:pointer;font-weight:650;list-style-position:inside';
   summary.textContent=name+' · View availability';
   const inner=document.createElement('div');
   inner.style.cssText='padding:0 12px 12px;font-size:13px;line-height:1.5;color:#d4dae4';
   const msg=document.createElement('p');
   msg.style.cssText='margin:4px 0 8px';
   msg.textContent='Verified player-level injuries, injured reserve and game-day inactives are not currently available from this matchup feed.';
   inner.append(msg);
   if(links[name]){
    const a=document.createElement('a');a.href=links[name];a.target='_blank';a.rel='noopener noreferrer';
    a.style.color='#a9caff';a.textContent='Official '+name+' injury report';
    inner.append(a);
   }
   detail.append(summary,inner);wrap.append(detail);
  }
  const note=document.createElement('p');note.style.cssText='font-size:12px;color:#aab3c2;margin:3px 0';
  note.textContent='Weekly reports may omit injured-reserve players. Missing data does not mean healthy.';
  wrap.append(note);
  // Hide the verbose, unreliable legacy panel body; keep its original heading.
  for(const child of [...panel.children]){
   if(child===heading||child.contains(heading))continue;
   child.hidden=true;child.style.display='none';
  }
  const host=heading.parentElement===panel?panel:heading.parentElement;
  host.append(wrap);
 }
}
let queued=false;
function queue(){
 if(queued)return;queued=true;
 setTimeout(()=>{queued=false;render()},250);
}
function init(){render();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();