/* AI research panel. Read-only public JSON; credentials never enter browser. */
(()=>{'use strict';
const ID='currentscy-ai-research';
let data=null,health=null,cross=null,loading=false,last=0;
function el(tag,value){const x=document.createElement(tag);x.textContent=value;return x}
function draw(){
 const existing=document.getElementById(ID);
 const parent=document.getElementById('currentscy-feedback')?.parentNode;
 if(!parent){existing?.remove();return}
 const box=existing||document.createElement('section');
 if(!existing){box.id=ID;box.style.cssText='margin:12px 0;padding:14px;border:1px solid #4b432d;border-radius:14px;background:#0c1019;color:#f4f2ec;font:14px system-ui,sans-serif';parent.insertBefore(box,document.getElementById('currentscy-feedback').nextSibling)}
 box.replaceChildren();
 box.appendChild(el('h3','AI Research · Model Learning'));
 if(!data&&!cross&&!health){box.appendChild(el('p',loading?'Checking research evidence…':'Research reports are not yet available.'));return}
 if(health){const states=Object.values(health.layers||{});const ok=states.filter(x=>x.state==='ready'||x.state==='connected').length;box.appendChild(el('p','Research connections: '+ok+'/'+states.length+' layers reporting healthy · '+(health.metrics?.savedForecasts||0)+' archived forecasts · '+(health.metrics?.scoredForecasts||0)+' scored'));}
 if(cross){const providers=cross.providers||{};box.appendChild(el('p','Free AI cross-check · '+Object.entries(providers).map(([name,x])=>name+': '+x.status).join(' · ')));if(cross.providers?.cloudflare?.diagnostic)box.appendChild(el('p','Cloudflare: '+cross.providers.cloudflare.diagnostic));if(cross.crossCheckComplete)box.appendChild(el('p','All three AI research reviews received. Their agreement does not prove accuracy.'));}
 const scored=data?.summary?.scored||0;
 const pending=data?.summary?.awaitingFinal||0;
 box.appendChild(el('p',scored+' scored games · '+pending+' awaiting results · '+(cross?.providers?.cloudflare?.status==='ok'?'Cloudflare AI responding':cross?.providers?.cloudflare?.httpStatus?'Cloudflare AI HTTP '+cross.providers.cloudflare.httpStatus:'Free AI not verified yet')));
 const problem='';
 const note=data?.analysis||problem+'Automated research evidence checks are active. Free AI providers are optional and require their own setup. Calibration remains in shadow mode until real outcomes support an improvement.';
 const body=el('p',note.slice(0,2200));body.style.whiteSpace='pre-wrap';box.appendChild(body);
 const foot=el('small','Read-only research. AI does not change saved predictions, final results or the production model.');
 foot.style.opacity='.75';box.appendChild(foot)
}
async function refresh(){
 if(loading||Date.now()-last<300000)return;
 loading=true;last=Date.now();
 try{const responses=await Promise.all([fetch('research-ledger/ai/latest.json?t='+Math.floor(Date.now()/300000),{cache:'no-store'}),fetch('research-ledger/integration-health.json?t='+Math.floor(Date.now()/300000),{cache:'no-store'}),fetch('research-ledger/ai/cross-check.json?t='+Math.floor(Date.now()/300000),{cache:'no-store'})]);data=responses[0].ok?await responses[0].json():null;health=responses[1].ok?await responses[1].json():null;cross=responses[2].ok?await responses[2].json():null}catch{data=null;health=null;cross=null}
 finally{loading=false;draw()}
}
function init(){draw();refresh();setInterval(()=>{draw();refresh()},60000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()
})();
