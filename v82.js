/* Currentscy Picks V82 — NBA player stats display, non-destructive. */
(()=>{'use strict';
const norm=s=>(s||'').replace(/\s+/g,' ').trim();
const number=s=>{const v=norm(s);if(!v||v==='—')return -Infinity;const m=v.match(/^(-?\d+(?:\.\d+)?)(?:\s*[-/]\s*(\d+(?:\.\d+)?))?/);return m?Number(m[1]):-Infinity};
function refresh(){
 const detail=document.getElementById('detail');
 if(!detail||detail.classList.contains('hidden')||!/\bNBA\b/i.test(document.getElementById('matchDate')?.textContent||''))return;
 const match=norm(detail.querySelector('h1,h2')?.textContent||'');
 const teamNames=match.split(/\s+vs\.?\s+/i).map(norm).filter(Boolean);
 const panels=[...detail.querySelectorAll('.panel')].filter(p=>/Last completed game box scores/i.test(p.querySelector('h1,h2,h3,h4')?.textContent||''));
 for(const panel of panels){
  const heading=panel.querySelector('h1,h2,h3,h4');
  if(heading&&norm(heading.textContent)!=='Player Stats')heading.textContent='Player Stats';
  const tables=[...panel.querySelectorAll('table')];
  for(const table of tables){
   const heads=[...table.querySelectorAll('thead th')];
   if(!heads.length)continue;
   const labels=heads.map(h=>norm(h.textContent).toUpperCase());
   const pts=labels.indexOf('PTS');
   if(pts<0)continue;
   const body=table.tBodies[0];if(!body)continue;
   // Find the team label immediately preceding the table, within this panel.
   let node=table, teamLabel='';
   while(node&&node!==panel){
    let prev=node.previousElementSibling;
    while(prev){const txt=norm(prev.textContent);if(prev.matches('h2,h3,h4,h5,strong')&&txt&&txt.length<80){teamLabel=txt;break;}prev=prev.previousElementSibling;}
    if(teamLabel)break;node=node.parentElement;
   }
   // Never remove source tables; hide only a clearly identified unrelated opponent.
   const cleanTeam=teamLabel.replace(/\s*Players\s*$/i,'');
   const relevant=teamNames.length===2&&teamNames.some(t=>t.toLowerCase()===cleanTeam.toLowerCase());
   const unrelated=teamNames.length===2&&cleanTeam&&/^[A-Za-z .'-]+$/.test(cleanTeam)&&!relevant&&cleanTeam!=='Players';
   const group=table.closest('.v82-team-group');
   if(group)group.classList.toggle('v82-unrelated',unrelated);
   if(!table.dataset.v82Sorted){table.dataset.v82Sorted='1';sort(table,pts,true);}
   heads.forEach((th,i)=>{
    if(i===0||!['MIN','PTS','FG','3PT','FT','REB','AST','TO','BLK','STL'].includes(labels[i]))return;
    if(!th.querySelector('.v82-sort')){
     const button=document.createElement('button');button.type='button';button.className='v82-sort';button.textContent=norm(th.textContent);button.title='Sort players by '+labels[i];button.addEventListener('click',()=>{
      const desc=table.dataset.v82Col===String(i)?table.dataset.v82Dir!=='desc':true;
      sort(table,i,desc);
     });th.textContent='';th.appendChild(button);
    }
   });
  }
 }
 // Suppress old last-game date labels only when they directly precede a player stats panel.
 for(const panel of panels){const prev=panel.previousElementSibling;if(prev&&/\b(?:AM|PM)\s+P[DS]T\b/i.test(prev.textContent||'')&&prev.querySelectorAll('table').length===0)prev.classList.add('v82-date');}
}
function sort(table,col,descending){
 const body=table.tBodies[0];if(!body)return;
 const rows=[...body.rows];rows.sort((a,b)=>{
  const av=number(a.cells[col]?.textContent),bv=number(b.cells[col]?.textContent);
  return descending?bv-av:av-bv;
 });rows.forEach(r=>body.appendChild(r));
 table.dataset.v82Col=String(col);table.dataset.v82Dir=descending?'desc':'asc';
 table.querySelectorAll('.v82-sort').forEach(b=>b.removeAttribute('aria-sort'));
 const btn=table.tHead?.rows[0]?.cells[col]?.querySelector('button');if(btn)btn.setAttribute('aria-sort',descending?'descending':'ascending');
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
function start(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();