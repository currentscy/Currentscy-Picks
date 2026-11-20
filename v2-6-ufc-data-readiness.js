/* V2.6 UFC data readiness: displays actual fields present, not invented values. */
(()=>{'use strict';
const run=()=>{
 const card=document.querySelector('#results .v48-card');if(!card||card.querySelector('.ufc26-data'))return;
 const table=card.querySelector('.v48-table');
 const fighterCount=card.querySelectorAll('.v48-fighter').length;
 const rows=table?[...table.querySelectorAll('tbody tr')]:[];
 const complete=rows.filter(r=>[...r.querySelectorAll('td')].slice(1).length===2&&[...r.querySelectorAll('td')].slice(1).every(x=>{const t=x.textContent.trim();return t&&t!=='—'&&t!=='N/A'})).length;
 const names=[...card.querySelectorAll('.v48-fighter small')].map(x=>x.textContent||'');
 const records=names.filter(x=>!/Record unavailable/i.test(x)).length;
 const box=document.createElement('p');box.className='ufc26-data';
 box.style.cssText='margin:12px 0;padding:12px;border:1px solid #47556a;border-radius:10px;color:#c6d2e1;font-size:13px;line-height:1.5';
 box.textContent='UFC data check: '+records+'/'+fighterCount+' fighter records shown · '+complete+'/'+rows.length+' comparable statistical metrics. '+(complete<4?'Limited metrics — precise predictions are not validated.':'Statistics displayed; source agreement and model calibration still require verification.');
 const head=card.querySelector('.ufc25-summary')||card.querySelector('.v48-lean');if(head)head.after(box);else card.prepend(box);
};
const start=()=>{const root=document.getElementById('results');if(!root)return;new MutationObserver(()=>queueMicrotask(run)).observe(root,{childList:true});run()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();