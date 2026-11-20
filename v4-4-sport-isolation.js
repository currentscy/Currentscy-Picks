/* V4.4 — prevent stale football output from appearing in soccer game details.
   Defensive DOM isolation while legacy asynchronous simulation paths are refactored.
   Never substitute football data for missing soccer information. */
(()=>{'use strict';
const footballNames=/\b(?:Miami Dolphins|Buffalo Bills|NFL|NCAA|college football)\b/i;
const footballMetric=/\b(?:sampled win share|trial win share|average sampled score|sampled ties|injury-adjusted trials)\b/i;
let pending=false;
function isSoccer(){return document.body?.dataset?.sport==='soccer' &&
 /\bSoccer\b/i.test(document.getElementById('matchDate')?.textContent||'');}
function clean(){
 if(!isSoccer())return;
 const results=document.getElementById('results');
 if(!results)return;
 // Only remove an entire top-level result panel if BOTH football-specific
 // team/league identity and football-specific metric are present.
 for(const panel of [...results.children]){
  const t=panel.textContent||'';
  if(footballNames.test(t)&&footballMetric.test(t))panel.remove();
 }
}
function schedule(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;clean()});}
function init(){
 const results=document.getElementById('results'),detail=document.getElementById('detail');
 if(results)new MutationObserver(schedule).observe(results,{childList:true});
 const date=document.getElementById('matchDate');
 if(date)new MutationObserver(schedule).observe(date,{childList:true,characterData:true,subtree:true});
 if(detail)new MutationObserver(schedule).observe(detail,{attributes:true,attributeFilter:['class']});
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscySportIsolationV44=Object.freeze({clean,version:'V4.4',scope:'soccer-results'});
})();
