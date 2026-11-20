/* Currentscy Picks Step 4 — scenario-dependent, seeded 100k Monte Carlo.
   Research only until calibrated transition and player outcome inputs are supplied.
   No synthetic probabilities are displayed for incomplete games. */
(()=>{'use strict';
const models=new Map();
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bound=(v,lo,hi)=>finite(v)&&v>=lo&&v<=hi;
function rng(seed){let s=(seed>>>0)||1;return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296}}
function validate(m){
 const issues=[];
 if(!m||!['nfl','ncaa'].includes(m.league))issues.push('Valid NFL or NCAA model required');
 if(!m?.sourceUrl||!/^https?:\/\//.test(m.sourceUrl)||!m.asOf)issues.push('Dated source provenance required');
 if(!m?.calibrated||!m?.backtestId)issues.push('Calibrated model and held-out backtest identifier required');
 if(!Array.isArray(m?.scenarios)||m.scenarios.length<2)issues.push('At least two documented halftime coaching scenarios required');
 const scenarios=Array.isArray(m?.scenarios)?m.scenarios:[];
 if(scenarios.length){
  const sum=scenarios.reduce((a,s)=>a+(finite(s.weight)?s.weight:0),0);
  if(Math.abs(sum-1)>0.0001)issues.push('Halftime scenario weights must sum to one');
  for(const s of scenarios){
   if(!s.name||!bound(s.weight,0,1))issues.push('Invalid scenario name or weight');
   if(!bound(s.targetRate,0,1)||!bound(s.catchRate,0,1)||!bound(s.yardsPerCatch,0,80))issues.push('Each scenario needs sourced target, catch and yard rates');
  }
 }
 if(!bound(m?.firstHalf?.passPlays,0,100)||!bound(m?.firstHalf?.targetRate,0,1)||!bound(m?.firstHalf?.catchRate,0,1)||!bound(m?.firstHalf?.yardsPerCatch,0,80))issues.push('First-half play volume and player outcome rates required');
 if(!bound(m?.secondHalf?.passPlays,0,100))issues.push('Second-half play volume required');
 if(m?.availability!=='verified')issues.push('Receiver availability must be verified');
 if(m?.coachIdentityVerified!==true)issues.push('Current coordinator or play caller must be verified');
 return [...new Set(issues)];
}
function binomial(n,p,random){let v=0;for(let i=0;i<n;i++)if(random()<p)v++;return v}
function run(model,{trials=100000,seed=20261120}={}){
 const issues=validate(model);
 if(issues.length)return {ready:false,issues,trials:0,probabilities:null};
 if(!Number.isInteger(trials)||trials<100||trials>100000)throw Error('Trials must be between 100 and 100000');
 const random=rng(seed),hist={},rec=[],yards=[];
 for(let t=0;t<trials;t++){
  let receptions=0,totalYards=0;
  const roll=random();let cumulative=0,scenario=model.scenarios[model.scenarios.length-1];
  for(const s of model.scenarios){cumulative+=s.weight;if(roll<cumulative){scenario=s;break}}
  hist[scenario.name]=(hist[scenario.name]||0)+1;
  for(const half of [model.firstHalf,{...scenario,passPlays:model.secondHalf.passPlays}]){
   const passes=Math.floor(half.passPlays)+(random()<(half.passPlays%1)?1:0);
   const targets=binomial(passes,half.targetRate,random);
   const caught=binomial(targets,half.catchRate,random);
   receptions+=caught;
   // Expected yards conditional on catches; fixed within scenario, no uncalibrated variance assumed.
   totalYards+=caught*half.yardsPerCatch;
  }
  rec.push(receptions);yards.push(totalYards);
 }
 rec.sort((a,b)=>a-b);yards.sort((a,b)=>a-b);
 const avg=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
 const quant=(xs,p)=>xs[Math.min(xs.length-1,Math.floor(p*(xs.length-1)))];
 return {ready:true,trials,seed,model:'conditional halftime scenario Monte Carlo',calibratedAgainst:model.backtestId,source:model.sourceUrl,asOf:model.asOf,scenarios:Object.fromEntries(Object.entries(hist).map(([k,v])=>[k,v/trials])),receptions:{mean:avg(rec),p10:quant(rec,.1),median:quant(rec,.5),p90:quant(rec,.9)},yards:{mean:avg(yards),p10:quant(yards,.1),median:quant(yards,.5),p90:quant(yards,.9)},limitations:['Scenario weights and rates are externally calibrated inputs','Fixed yards per catch within scenario; no yardage dispersion model','Pass plays held at supplied halftime volumes','Not yet integrated with site five-leg engine']};
}
function register(gameId,modelsForGame){
 if(!/^\d{5,15}$/.test(String(gameId))||!Array.isArray(modelsForGame))throw Error('Invalid game models');
 models.set(String(gameId),modelsForGame.filter(x=>x?.receiver));refresh();return models.get(String(gameId)).length;
}
function render(){
 const d=document.getElementById('detail'),g=typeof chosen==='undefined'?null:chosen,league=typeof sport==='string'?sport:'';
 if(!d||d.classList.contains('hidden')||!['nfl','ncaa'].includes(league)||!g?.id)return;
 let box=d.querySelector('#v27-dynamic-coaching');
 if(!box){box=document.createElement('section');box.id='v27-dynamic-coaching';box.className='panel';const near=d.querySelector('#v26-coach-matchups');if(near)near.insertAdjacentElement('afterend',box);else d.append(box)}
 const entries=models.get(String(g.id))||[];
 const html=entries.map(m=>{
  const x=run(m);
  return '<details style="margin:10px 0;padding:10px;border:1px solid #394251;border-radius:10px"><summary>'+esc(m.receiver)+'</summary>'+
   (x.ready?'<p>100,000 scenario trials · receptions mean '+x.receptions.mean.toFixed(2)+' (10–90%: '+x.receptions.p10+'–'+x.receptions.p90+')</p><p>Yards mean '+x.yards.mean.toFixed(1)+'</p>':'<p class="desc">Simulation withheld: '+esc(x.issues.join('; '))+'</p>')+'</details>';
 }).join('');
 const next='<h2>Dynamic coaching scenarios · Step 4</h2><p class="desc">First-half player usage, halftime coaching responses and second-half outcomes. Simulations require calibrated coaching scenario weights, receiver rates, verified participation and documented sources.</p>'+
 (html||'<p class="desc">No calibrated coaching transition models connected for this matchup. The existing game simulation is unchanged.</p>')+
 '<p class="desc">Experimental research module · not used to generate five-leg picks.</p>';
 if(box.dataset.game!==String(g.id)||box.dataset.count!==String(entries.length)){box.innerHTML=next;box.dataset.game=String(g.id);box.dataset.count=String(entries.length)}
}
let queued=false;function refresh(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
function init(){const d=document.getElementById('detail');if(d)new MutationObserver(refresh).observe(d,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});const title=document.getElementById('matchTitle');if(title)new MutationObserver(refresh).observe(title,{childList:true,subtree:true,characterData:true});refresh()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyDynamicCoachV27=Object.freeze({validate,run,register,refresh,version:'V2.7 Step 4',integratedIntoPicks:false});
})();