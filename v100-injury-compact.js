/* V100 injury compact hotfix: replace legacy injury card, not just its child styling. */
(()=>{'use strict';
const links={
 'Baltimore Ravens':'https://www.baltimoreravens.com/team/injury-report/',
 'Carolina Panthers':'https://www.panthers.com/team/injury-report/',
 'Buffalo Bills':'https://www.buffalobills.com/team/injury-report/',
 'Miami Dolphins':'https://www.miamidolphins.com/team/injury-report/'
};
const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
const isHeading=x=>/match injury report/i.test(clean(x));
function findCards(){
 const candidates=[];
 for(const el of document.querySelectorAll('h1,h2,h3,h4,h5,header,strong,div')){
  if(el.dataset?.v100Compact==='yes')continue;
  const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ');
  if(!isHeading(own)||own.length>95)continue;
  let card=el.closest('.panel,.card,.v87-card,.injury-card');
  if(!card){
   let cur=el;
   for(let k=0;k<5&&cur.parentElement;k++){
    cur=cur.parentElement;
    const t=clean(cur.textContent);
    if(t.length>80&&t.length<2800&&/injury information unavailable|injury and availability sources/i.test(t)){card=cur;break}
   }
  }
  if(card&&!candidates.includes(card))candidates.push(card);
 }
 return candidates;
}
function compact(card){
 if(card.dataset.v100Compact==='yes')return;
 const original=clean(card.textContent);
 if(!isHeading(original)||original.length>4500)return;
 let teams=Object.keys(links).filter(name=>original.includes(name));
 if(teams.length<2){
  const all=[...card.querySelectorAll('h2,h3,h4,h5,strong')].map(e=>clean(e.textContent))
   .filter(n=>n&&!isHeading(n)&&n.length<45&&!/official|source|injury/i.test(n));
  for(const n of all)if(!teams.includes(n))teams.push(n);
 }
 if(!teams.length)return;
 const title=document.createElement('h3');
 title.textContent='🏥 Match injury report';
 title.style.cssText='margin:0 0 10px;font-size:1.15rem';
 const wrap=document.createElement('div');wrap.dataset.v100Compact='yes';
 wrap.style.cssText='display:grid;gap:8px';
 for(const team of teams.slice(0,2)){
  const detail=document.createElement('details');
  detail.style.cssText='border:1px solid #434a58;border-radius:8px;background:#151b25';
  const summary=document.createElement('summary');
  summary.style.cssText='cursor:pointer;padding:12px;font-size:14px;font-weight:650';
  summary.textContent=team+' · View report';
  const body=document.createElement('div');
  body.style.cssText='padding:0 12px 12px;font-size:13px;line-height:1.5;color:#d0d7e2';
  const p=document.createElement('p');
  p.textContent='Player injuries and injured-reserve status have not been verified from this matchup feed.';
  body.append(p);
  if(links[team]){
   const a=document.createElement('a');a.href=links[team];a.target='_blank';a.rel='noopener noreferrer';
   a.textContent='Open official team injury report';a.style.color='#a9caff';body.append(a);
  }
  detail.append(summary,body);wrap.append(detail);
 }
 const note=document.createElement('p');
 note.textContent='Injured reserve and game-day inactives require separate verification.';
 note.style.cssText='font-size:12px;color:#aeb8c8;margin:8px 0 0';
 wrap.append(note);
 card.dataset.v100Compact='yes';
 card.replaceChildren(title,wrap);
}
let scheduled=false;
function render(){for(const card of findCards())compact(card)}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;render()},250)}
function init(){render();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();