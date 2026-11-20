/* Currentscy Picks V77 — progressive enhancement; preserves existing simulation engine */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function relocate(){
 const d=$('detail'),r=$('results'),date=$('matchDate');
 if(!d||!r||!date||d.classList.contains('hidden'))return;
 const panels=[...r.querySelectorAll('.panel')];
 const p=panels.find(p=>/(?:NFL matchup|NBA\s*[·•-]?\s*Matchup outlook)/i.test(p.querySelector('h2')?.textContent||''));
 if(!p)return;
 const grid=p.querySelector('.grid');if(!grid)return;
 let host=$('v77-match-summary');
 if(!host){host=document.createElement('div');host.id='v77-match-summary';date.insertAdjacentElement('afterend',host)}
 if(!host.contains(grid)){host.appendChild(grid);const note=[...p.children].find(e=>/Historical team-score resampling/i.test(e.textContent||''));if(note)host.appendChild(note)}
 if(!p.querySelector('.grid')){if(/NFL matchup/i.test(p.querySelector('h2')?.textContent||''))p.style.display='none';else p.querySelector('h2')?.remove()}
}
function cleanNbaPresentation(){
 const d=$('detail');if(!d||d.classList.contains('hidden'))return;
 const nba=!!$('v77-match-summary')?.querySelector('.grid')&&[...d.querySelectorAll('h2,h3')].some(h=>/NBA/i.test(h.textContent||''))||/NBA matchup research loaded/i.test($('dataStatus')?.textContent||'');
 if(!nba)return;
 const status=$('dataStatus');if(status&&/NBA matchup research loaded/i.test(status.textContent||''))status.style.display='none';
 const r=$('results');if(r)for(const panel of r.querySelectorAll('.panel')){
  for(const details of panel.querySelectorAll('details'))if(/How this matchup was evaluated/i.test(details.querySelector('summary')?.textContent||''))details.remove();
 }
 for(const h of d.querySelectorAll('h2,h3')){
  if(/Recent ESPN player performance/i.test(h.textContent||'')){
   const panel=h.closest('.panel');if(panel)panel.style.display='none';
  }
 }
}
function playerRows(){
 const footer=document.querySelector('footer');if(footer&&footer.textContent.includes('Currentscy Picks V73'))footer.textContent=footer.textContent.replace('Currentscy Picks V73','Currentscy Picks V78');
 const d=$('detail');if(!d||d.classList.contains('hidden'))return;
 for(const heading of d.querySelectorAll('h2,h3')){
  if(!/Provisional player research/i.test(heading.textContent||''))continue;
  const panel=heading.closest('.panel');if(!panel)continue;
  if(/V7[0-6]/.test(heading.textContent))heading.textContent=heading.textContent.replace(/V7[0-7]/,'V78');
  // Do not fabricate 2026 season totals or expand historical sample denominators.
  for(const el of panel.querySelectorAll('p,small,div')){
   if(el.children.length)continue;
   if(/\d+\/\d+ historical hits/.test(el.textContent||''))el.style.lineHeight='1.55';
  }
 }
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;try{relocate();cleanNbaPresentation();playerRows()}catch(e){console.warn('V77 enhancement skipped',e)}})}
document.addEventListener('DOMContentLoaded',()=>{const root=$('detail');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});schedule()});
})();