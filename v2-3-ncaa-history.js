/* Currentscy Picks V2.3: compact NCAA game history only. */
(()=>{'use strict';
function run(){
 if(typeof sport==='undefined'||sport!=='ncaa')return;
 const root=document.getElementById('results');if(!root)return;
 const availability=document.getElementById('v22-ncaa-availability');
 if(availability&&availability.textContent.includes('NCAA match injury report')){
  for(const h of document.querySelectorAll('#detail h2,#detail h3')){
   if(!/Match injury report/i.test(h.textContent||''))continue;
   const old=h.closest('.panel');
   if(old&&old!==availability)old.style.display='none';
  }
 }
 for(const panel of root.querySelectorAll('.panel')){
  if(panel.classList.contains('v23-history'))continue;
  const title=panel.querySelector('h2');
  if(!title||!/Recent verified NCAA games/i.test(title.textContent))continue;
  const tiles=[...panel.querySelectorAll('.tile')];
  if(!tiles.length)continue;
  const wrap=document.createElement('div');wrap.className='v23-history';
  const h=document.createElement('h2');h.textContent='Recent verified NCAA games';wrap.append(h);
  for(const tile of tiles){
   const team=tile.querySelector('strong')?.textContent||'Team';
   const details=document.createElement('details');
   const summary=document.createElement('summary');summary.textContent=team+' · '+tile.querySelectorAll('li').length+' recent games';
   const ul=tile.querySelector('ul');details.append(summary);
   if(ul)details.append(ul.cloneNode(true));
   wrap.append(details);
  }
  panel.replaceWith(wrap);
 }
}
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;run()})}
function init(){const root=document.getElementById('results');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});const detail=document.getElementById('detail');if(detail)new MutationObserver(schedule).observe(detail,{childList:true,subtree:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();