/* Currentscy Picks V81: presentation-only cleanup; original research remains intact. */
(()=>{'use strict';
let pending=false;
function refresh(){
 const detail=document.getElementById('detail');
 const nba=!!detail&&!detail.classList.contains('hidden')&&/\bNBA\b/i.test(document.getElementById('matchDate')?.textContent||'');
 if(detail)detail.classList.toggle('v81-nba',nba);
 const status=document.getElementById('dataStatus');
 if(status&&nba&&/NBA matchup research loaded/i.test(status.textContent||''))status.setAttribute('aria-hidden','true');
 else if(status&&status.getAttribute('aria-hidden')==='true')status.removeAttribute('aria-hidden');
 document.querySelectorAll('footer').forEach(f=>{
  if(/Currentscy Picks V(?:7[0-9]|80)\b/.test(f.textContent||'')){
   const first=f.firstChild;
   if(first&&first.nodeType===3)first.textContent=first.textContent.replace(/Currentscy Picks V(?:7[0-9]|80)\b/g,'Currentscy Picks V81');
  }
 });
 for(const h of document.querySelectorAll('h2,h3')){
  const label=(h.textContent||'').trim();
  const panel=h.closest('.panel');
  if(!panel)continue;
  if(/^(?:Recent ESPN player performance|ESPN\s*[·•-]\s*Last completed game box scores)$/i.test(label)){
   panel.classList.toggle('v81-hide-panel',nba);
  }
 }
 for(const summary of document.querySelectorAll('summary')){
  const match=/^How this matchup was evaluated$/i.test((summary.textContent||'').trim());
  if(match&&summary.closest('details'))summary.closest('details').classList.toggle('v81-hide-panel',nba);
 }
 // Remove only a wrapper that became visually empty after the explanatory details were hidden.
 for(const panel of detail?.querySelectorAll('.panel')||[]){
  const children=[...panel.children];
  const emptyAfterCleanup=(panel.innerText||'').trim()===''||children.length>0&&children.every(el=>
   el.classList.contains('v81-hide-panel')||
   (el.tagName==='DETAILS'&&el.classList.contains('v81-hide-panel'))||
   (el.textContent||'').trim()===''&&el.children.length===0
  );
  panel.classList.toggle('v81-empty-wrapper',nba&&emptyAfterCleanup);
 }
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}
function start(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();