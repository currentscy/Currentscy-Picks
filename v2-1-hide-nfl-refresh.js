/* Remove only the unnecessary NFL top-five Refresh rankings button. */
(()=>{'use strict';let pending=false;
function run(){
 const panel=document.getElementById('v59WeeklyPanel');if(!panel)return;
 const heading=panel.querySelector('h2')?.textContent||'';
 if(!/NFL.*Top 5 weekly game winners/i.test(heading))return;
 for(const b of panel.querySelectorAll('button')){
  if(/^refresh rankings$/i.test((b.textContent||'').trim()))b.style.display='none';
 }
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;run()})}
function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();