/* Currentscy Picks V3.4 defensive data readiness and provider audit.
   Explicitly separates 2026 data from historical coverage and unsupported assignments. */
(()=>{'use strict';
const providers=Object.freeze([
 {name:'PFF Developer API',coverage:true,blitz:'requires entitlement check',alignment:'requires endpoint/field verification',assignment:'not established',auth:'PFF Pro subscription',configured:false,scope:'NFL and NCAA may be supported by subscription'},
 {name:'nflverse / FTN',coverage:'depends on released season',blitz:'season-specific charting may be available',alignment:false,assignment:false,auth:'public datasets with license conditions',configured:false,scope:'NFL only'},
 {name:'GridIron Data',coverage:'2025 season per provider documentation',blitz:'2026 season per provider documentation',alignment:false,assignment:false,auth:'Basic plan required for coverage endpoints',configured:false,scope:'NFL only'}
]);
function readiness(league,eventId){
 const chart=window.CurrentscyDefensiveChartingV31?.status?.();
 const ing=window.CurrentscyCoachingIngestionV29?.report?.(league,eventId);
 return {league,eventId:String(eventId||''),providerConfigured:chart?.configured===true,coverage:ing?.streams?.coverage||'missing charting',alignment:ing?.streams?.alignment||'missing charting',playerAssignmentsVerified:false,simulationActivation:false,providers};
}
function init(){
 if(document.getElementById('cp-defensive-data-readiness'))return;
 const section=document.createElement('section');section.id='cp-defensive-data-readiness';
 section.style.cssText='margin:16px auto;padding:14px;max-width:800px;border:1px solid #575044;border-radius:12px;background:#101217;color:#f2f2f2';
 const heading=document.createElement('strong');heading.textContent='Defensive coverage data · provider status';section.append(heading);
 const description=document.createElement('p');description.style.cssText='font-size:13px;color:#bbb';description.textContent='NFL and NCAA player coverage requires licensed charting. Older-season coverage is never treated as current-season evidence.';section.append(description);
 const status=document.createElement('p');status.style.cssText='font-size:13px;color:#e2c181';status.textContent='No live charting provider configured. Receiver–cornerback assignments remain unverified.';section.append(status);
 const table=document.createElement('div');table.style.cssText='font-size:12px;line-height:1.6';
 providers.forEach(p=>{const row=document.createElement('div');row.style.cssText='padding:8px 0;border-top:1px solid #383838';const b=document.createElement('b');b.textContent=p.name+' — ';row.append(b,document.createTextNode(p.auth+'. Coverage: '+String(p.coverage)+'. Alignment: '+String(p.alignment)+'.'));table.append(row)});
 section.append(table);(document.querySelector('main')||document.body).append(section);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyDefensiveReadinessV34=Object.freeze({providers,readiness,version:'V3.4',connected:false});
})();