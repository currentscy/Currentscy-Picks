/* V84: concise matchup research, without inventing defender assignments. */
(()=>{'use strict';
function refresh(){
 const d=document.getElementById('detail');
 if(!d||d.classList.contains('hidden')||!/\bNBA\b/i.test(document.getElementById('matchDate')?.textContent||''))return;
 for(const summary of d.querySelectorAll('summary')){
  if(!/^Matchup research$/i.test(summary.textContent.trim()))continue;
  const details=summary.closest('details');if(!details)continue;
  let box=details.querySelector('.v84-research');
  if(!box){box=document.createElement('div');box.className='v84-research';details.insertBefore(box,summary.nextSibling)}
  const source=[...details.childNodes].filter(n=>n!==summary&&n!==box).map(n=>n.textContent||'').join(' ');
  const hits=source.match(/cleared\s+([^\.]+?)\s+in\s+(\d+)\s+of\s+(\d+)\s+verified appearances/i);
  const sample=hits?`The player cleared ${hits[1]} in ${hits[2]}/${hits[3]} recorded appearances. `:'';
  const text=sample+'Expected individual defender and defensive assignments are not verified by the current feed, so a defender-specific advantage cannot be established. This is a recent-form candidate, not a confirmed favorable defensive matchup.';
  if(box.textContent!==text)box.textContent=text;
  details.classList.add('v84-compact');
 }
 const footer=document.querySelector('footer');if(footer&&/Currentscy Picks V8[123]\b/.test(footer.textContent)){const first=footer.firstChild;if(first?.nodeType===3)first.textContent=first.textContent.replace(/Currentscy Picks V8[123]\b/,'Currentscy Picks V84')}
}
let pending=false;function run(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}
function start(){run();new MutationObserver(run).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();