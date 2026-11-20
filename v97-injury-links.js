/* V97 injury-report visibility: official team reports, no invented statuses. */
(()=>{'use strict';
const reports=[
 {team:'Baltimore Ravens',url:'https://www.baltimoreravens.com/team/injury-report/',note:'Official weekly practice report. Injured reserve is a separate roster designation; this report may omit IR players.'},
 {team:'Carolina Panthers',url:'https://www.panthers.com/team/injury-report/',note:'Official weekly practice report. Check injured reserve and final game-day inactives separately.'}
];
let busy=false;
function enhance(){
 if(busy)return;busy=true;
 try{
  const headings=[...document.querySelectorAll('h1,h2,h3')].filter(e=>/match injury report/i.test(e.textContent||''));
  for(const heading of headings){
   const panel=heading.closest('.panel')||heading.parentElement;
   if(!panel||panel.querySelector('[data-v97-injury-links]'))continue;
   const text=panel.textContent||'';
   const matches=reports.filter(r=>text.includes(r.team));
   if(!matches.length)continue;
   const box=document.createElement('div');box.dataset.v97InjuryLinks='true';
   box.style.cssText='border-top:1px solid #465166;margin-top:18px;padding-top:14px;line-height:1.6';
   const title=document.createElement('strong');title.textContent='Official injury and availability sources';box.append(title);
   for(const r of matches){
    const p=document.createElement('p');
    const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';
    a.textContent=r.team+' — official injury report';a.style.color='#9ac5ff';
    p.append(a,document.createTextNode(' · '+r.note));box.append(p);
   }
   const warning=document.createElement('p');
   warning.textContent='Weekly practice reports do not cover every injured-reserve designation. Final inactives are normally released closer to kickoff. An empty API response does not mean no injuries.';
   box.append(warning);panel.append(box);
  }
 }finally{busy=false}
}
let scheduled=false;
function queue(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;enhance()},200)}
function init(){enhance();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();