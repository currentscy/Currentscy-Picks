/* Currentscy Picks V2.5 — UFC-only presentation and evidence safeguards.
   Does not modify other sports, network routes, or prediction formulas. */
(()=>{'use strict';
 const isUFC=()=>typeof sport!=='undefined'&&sport==='ufc';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const metricNames=['Strikes landed/min','Strikes absorbed/min','Striking accuracy','Striking defense','Takedowns/15m','Takedown defense','Submissions/15m'];
 function enhance(){
  if(!isUFC())return;
  const root=document.getElementById('results');
  if(!root)return;
  const card=root.querySelector('.v48-card');
  if(!card||card.dataset.ufc25==='done')return;
  card.dataset.ufc25='done';
  const heading=card.querySelector('.v48-head');
  if(heading)heading.innerHTML='🥊 UFC FIGHT BREAKDOWN <span>V2.5</span>';
  const fighters=[...card.querySelectorAll('.v48-fighter')];
  const names=fighters.map(x=>x.querySelector('strong')?.textContent?.trim()||'Fighter');
  const table=card.querySelector('.v48-table');
  const rows=table?[...table.querySelectorAll('tbody tr')]:[];
  const available=rows.filter(r=>[...r.querySelectorAll('td')].slice(1).every(c=>{const t=c.textContent.trim();return t&&t!=='—'&&t!=='N/A'}));
  const details=[...card.querySelectorAll('details')];
  const source=details.find(x=>/Sources & verification/i.test(x.querySelector('summary')?.textContent||''));
  const recent=details.find(x=>/Recent fight history/i.test(x.querySelector('summary')?.textContent||''));
  const quality=details.find(x=>/Opponent quality/i.test(x.querySelector('summary')?.textContent||''));
  const stats=details.find(x=>/All fighter statistics/i.test(x.querySelector('summary')?.textContent||''));
  const picks=card.querySelector('.v49-picks');
  const lean=card.querySelector('.v48-lean');
  const reasons=card.querySelector('.v48-section');
  const warning=card.querySelector('.v48-warning');
  const summary=document.createElement('section');
  summary.className='ufc25-summary';
  const chips=available.slice(0,4).map(r=>{
   const cells=[...r.querySelectorAll('td')].map(x=>x.textContent.trim());
   return '<div class="ufc25-stat"><span>'+esc(cells[0])+'</span><strong>'+esc(cells[1])+' <em>vs</em> '+esc(cells[2])+'</strong></div>';
  }).join('');
  summary.innerHTML='<div class="ufc25-heading"><strong>Matchup evidence</strong><span>'+available.length+'/'+metricNames.length+' comparable metrics</span></div>'+
   (chips?'<div class="ufc25-grid">'+chips+'</div>':'<p class="ufc25-muted">Verified head-to-head statistical coverage is incomplete. No percentages or outcomes are inferred.</p>')+
   '<p class="ufc25-caption">'+esc(names.join(' vs '))+' · UFC-only research · data availability is not prediction accuracy</p>';
  if(lean)lean.before(summary);else card.append(summary);
  if(picks){
   picks.classList.add('ufc25-research');
   const title=picks.querySelector('.v49-picks-title strong');
   if(title)title.textContent='Potential outcomes · evidence check';
   const sub=picks.querySelector('.v49-picks-sub');
   if(sub)sub.textContent='Research categories only. A selection is not issued until its exact threshold, fighter history and market are verified.';
  }
  if(reasons)reasons.classList.add('ufc25-reasons');
  if(warning)warning.classList.add('ufc25-warning');
  for(const d of [quality,stats,recent,source])if(d){d.open=false;d.classList.add('ufc25-details')}
  if(source){const note=document.createElement('p');note.className='ufc25-source-note';note.textContent='Source data may be missing or incomplete. ESPN and other feeds must agree on the specific metric before it is treated as independently verified.';source.querySelector('.v48-detailbody')?.prepend(note)}
 }
 const observer=new MutationObserver(()=>{if(isUFC())queueMicrotask(enhance)});
 function start(){const root=document.getElementById('results');if(!root)return;observer.observe(root,{childList:true,subtree:false});enhance()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
