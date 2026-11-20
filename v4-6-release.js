/* V4.6 release label; deliberately does not change model probabilities. */
(()=>{'use strict';const VERSION='V4.6';function update(){
 document.title='Currentscy Picks '+VERSION;
 const f=document.querySelector('main footer')||document.querySelector('footer');
 if(f)f.innerHTML=f.innerHTML.replace(/Currentscy Picks V\d+(?:\.\d+)*/,'Currentscy Picks '+VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update,{once:true});else update();
window.CurrentscyReleaseV46=Object.freeze({version:VERSION});
})();
