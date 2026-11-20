/* AI research panel. Read-only public JSON; credentials never enter browser. */
(()=>{'use strict';
const ID='currentscy-ai-research';
let data=null,loading=false,last=0;
function el(tag,value){const x=document.createElement(tag);x.textContent=value;return x}
function draw(){
 const existing=document.getElementById(ID);
 const parent=document.getElementById('currentscy-feedback')?.parentNode;
 if(!parent){existing?.remove();return}
 const box=existing||document.createElement('section');
 if(!existing){box.id=ID;box.style.cssText='margin:12px 0;padding:14px;border:1px solid #4b432d;border-radius:14px;background:#0c1019;color:#f4f2ec;font:14px system-ui,sans-serif';parent.insertBefore(box,document.getElementById('currentscy-feedback').nextSibling)}
 box.replaceChildren();
 box.appendChild(el('h3','AI Research · Model Learning'));
 if(!data){box.appendChild(el('p',loading?'Checking research evidence…':'Research agent report is not yet available.'));return}
 const scored=data.summary?.scored||0;
 const pending=data.summary?.awaitingFinal||0;
 box.appendChild(el('p',scored+' scored games · '+pending+' awaiting results · '+(data.aiEnabled?'AI research connected':'AI model not connected yet')));
 const note=data.analysis||'Automated research evidence checks are active. AI-generated analysis requires a server-side API key. Calibration remains in shadow mode until real outcomes support an improvement.';
 const body=el('p',note.slice(0,2200));body.style.whiteSpace='pre-wrap';box.appendChild(body);
 const foot=el('small','Read-only research. AI does not change saved predictions, final results or the production model.');
 foot.style.opacity='.75';box.appendChild(foot)
}
async function refresh(){
 if(loading||Date.now()-last<300000)return;
 loading=true;last=Date.now();
 try{const response=await fetch('research-ledger/ai/latest.json?t='+Math.floor(Date.now()/300000),{cache:'no-store'});if(!response.ok)throw Error('unavailable');data=await response.json()}catch{data=null}
 finally{loading=false;draw()}
}
function init(){draw();refresh();setInterval(()=>{draw();refresh()},60000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()
})();
