/* Currentscy Picks V83: single matchup-only NBA box-score view. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const clean=s=>(s||'').replace(/\s+/g,' ').trim();
const cols=['MIN','PTS','FG','3PT','FT','REB','AST','TO','STL','BLK'];
function value(s){const m=clean(s).match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):-Infinity}
function render(){
 const detail=$('detail'),source=$('v63BoxScore'),title=clean($('matchTitle')?.textContent);
 const nba=detail&&!detail.classList.contains('hidden')&&/\bNBA\b/i.test($('matchDate')?.textContent||'');
 const old=$('v83-player-stats');
 if(!nba||!source||!title.includes(' vs ')){if(old)old.remove();if(source)source.classList.remove('v83-source-hidden');return;}
 const teams=title.split(/\s+vs\.?\s+/i).map(clean).filter(Boolean);if(teams.length!==2)return;
 const panels=[...source.querySelectorAll('.panel')];
 const found=new Map();
 for(const panel of panels){
  const elements=[...panel.querySelectorAll('h2,h3,h4,h5,table')];
  let team=null;
  for(const el of elements){
   if(el.tagName!=='TABLE'){
    const t=clean(el.textContent).replace(/\s+Players$/i,'');
    const match=teams.find(x=>x.toLowerCase()===t.toLowerCase());
    if(match)team=match;
    else if(/^[A-Za-z .'-]{4,45}$/.test(t)&&!/^Players$|^Player Stats$/i.test(t))team=null;
    continue;
   }
   if(!team||found.has(team))continue;
   const header=[...el.querySelectorAll('thead th')].map(h=>clean(h.textContent).toUpperCase());
   if(!header.includes('PTS')||!header.includes('PLAYER'))continue;
   const rows=[...(el.tBodies[0]?.rows||[])].map(row=>[...row.cells].map(cell=>clean(cell.textContent))).filter(row=>row.length===header.length);
   if(rows.length)found.set(team,{header,rows});
  }
 }
 if(found.size!==2)return;
 const signature=JSON.stringify(teams.map(t=>found.get(t)));
 if(old&&old.dataset.signature===signature){source.classList.add('v83-source-hidden');return;}
 if(old)old.remove();
 const host=document.createElement('section');host.id='v83-player-stats';host.className='panel';host.dataset.signature=signature;
 const heading=document.createElement('h2');heading.textContent='Player Stats';host.appendChild(heading);
 const subtitle=document.createElement('p');subtitle.className='v83-caption';subtitle.textContent='Last recorded game box scores · tap a statistic to sort · not a confirmed lineup';host.appendChild(subtitle);
 for(const team of teams){
  const data=found.get(team);const h=document.createElement('h3');h.textContent=team;host.appendChild(h);
  const scroller=document.createElement('div');scroller.className='v83-scroll';const table=document.createElement('table');table.className='v83-table';
  const thead=table.createTHead(),headRow=thead.insertRow();const body=table.createTBody();
  data.header.forEach((label,i)=>{const th=document.createElement('th');if(cols.includes(label)){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='v83-sort';b.addEventListener('click',()=>sort(i,table,b));th.appendChild(b)}else th.textContent=label;headRow.appendChild(th)});
  for(const row of data.rows){const tr=body.insertRow();row.forEach(c=>{const td=tr.insertCell();td.textContent=c})}
  function sort(col,tab,btn,first=false){
   const dir=first||tab.dataset.sortcol!==String(col)?'desc':tab.dataset.sortdir==='desc'?'asc':'desc';
   const rows=[...body.rows];rows.sort((a,b)=>{
    const av=value(a.cells[col]?.textContent),bv=value(b.cells[col]?.textContent);
    return (dir==='desc'?bv-av:av-bv);
   });rows.forEach(r=>body.appendChild(r));
   tab.dataset.sortcol=String(col);tab.dataset.sortdir=dir;
   tab.querySelectorAll('.v83-sort').forEach(b=>{b.removeAttribute('data-direction');b.removeAttribute('aria-sort')});
   if(btn){btn.dataset.direction=dir;btn.setAttribute('aria-sort',dir==='desc'?'descending':'ascending')}
  }
  sort(data.header.indexOf('PTS'),table,headRow.cells[data.header.indexOf('PTS')]?.querySelector('button'),true);
  scroller.appendChild(table);host.appendChild(scroller);
 }
 source.insertAdjacentElement('beforebegin',host);source.classList.add('v83-source-hidden');
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;try{render()}catch(e){console.warn('V83 player stats',e)}})}
function init(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();