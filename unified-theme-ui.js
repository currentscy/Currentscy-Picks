/* Presentation-only enhancements; preserve original sport button nodes and handlers. */
(()=>{'use strict';
const labels={NFL:'Weekly Picks',NBA:'Daily Picks','NCAA Football':'Weekly Picks',NHL:'Daily Picks',MLB:'Daily Picks',Soccer:'Daily Picks',Tennis:'Daily Picks',UFC:'Fight Picks'};
function render(){
 const nav=document.getElementById('sports');if(!nav)return;
 for(const button of nav.querySelectorAll('button.sport')){
  const label=button.querySelector('.cp-league-label');if(!label)continue;
  const name=label.textContent.trim();if(!labels[name])continue;
  if(!label.querySelector('.cp-tile-subtitle')){
   const subtitle=document.createElement('small');subtitle.className='cp-tile-subtitle';subtitle.textContent=labels[name];label.appendChild(subtitle);
  }
 }
}
function init(){render();const nav=document.getElementById('sports');if(nav)new MutationObserver(render).observe(nav,{childList:true,subtree:false});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();