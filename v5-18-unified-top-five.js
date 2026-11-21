/* Unified compact Top 5 for NFL/NCAA/NBA. Read-only UI adapter. */
(()=>{'use strict';
const css=`
#v59WeeklyResults,#v87-daily-three{border-left:0!important;padding:0!important;margin:0!important}
#v59WeeklyPanel,#v87-daily-three{max-width:100%;box-sizing:border-box}
#v59WeeklyResults>.leg,#v87-daily-three>.v87-three-leg{display:none!important}
#v59WeeklyResults>.desc,#v87-daily-three>.v87-three-note{display:none!important}
.cp5-list{margin:0!important;padding:0!important;border:0!important;background:transparent!important}
.cp5-item{padding:11px 0 10px!important;border:0!important;border-bottom:1px solid #343a44!important;margin:0!important;background:transparent!important;box-shadow:none!important;min-height:0!important}
.cp5-item:last-child{border-bottom:0!important}
.cp5-top{display:grid;grid-template-columns:25px minmax(0,1fr) 76px;gap:8px;align-items:start}
.cp5-num{background:#2d251c;color:#e7b66d;font-size:12px;font-weight:800;border-radius:7px;padding:5px 0;text-align:center}
.cp5-team{font-size:14px;line-height:1.25;color:#f7f8fb;font-weight:750;overflow-wrap:break-word}
.cp5-opponent{font-size:12px;color:#aeb7c4;line-height:1.3;margin-top:3px;overflow-wrap:break-word}
.cp5-date{font-size:11px;color:#aab4c2;margin-top:5px;line-height:1.3}
.cp5-metric{font-size:15px;line-height:1.1;color:#e5ba7b;font-weight:800;text-align:right;white-space:nowrap}
.cp5-metric small{display:block;font-size:9px;color:#acb3bf;font-weight:500;margin-top:3px}
.cp5-projection{margin:6px 0 0 33px;font-size:12px;line-height:1.35;color:#e5c18e;font-weight:650}
.cp5-details{margin:4px 0 0 33px;font-size:11px;color:#b6bfcb}
.cp5-details summary{color:#cba979;cursor:pointer;min-height:26px;display:flex;align-items:center}
.cp5-details p{line-height:1.45;margin:5px 0}
#v59WeeklyResults>.cp-pick,#v87-daily-three>.cp-pick{display:none!important}
#v59WeeklyResults>.cp5-list .cp5-item,#v87-daily-three>.cp5-list .cp5-item{display:block!important}
#v87-daily-three{padding:12px!important}
#v87-daily-three .v87-three-note{display:none!important}
@media(max-width:365px){.cp5-top{grid-template-columns:23px minmax(0,1fr) 68px;gap:6px}.cp5-team{font-size:13px}.cp5-metric{font-size:13px}}
`;
const st=document.createElement('style');st.textContent=css;document.head.append(st);
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const txt=n=>clean(n?.textContent);
const key=s=>clean(s).toLowerCase().replace(/[^a-z0-9]/g,'');
function parseRow(node,i){
 const raw=txt(node),strong=txt(node.querySelector('strong'));
 const line=strong.replace(/^\d+\.\s*/,'').replace(/\s*·\s*IN PROGRESS\s*\/\s*STARTED/ig,'');
 let winner='',opponent='';
 let m=line.match(/^(.+?)\s+over\s+(.+)$/i);
 if(m){winner=m[1];opponent=m[2]}else{
 const mm=line.match(/^(.+?)\s+vs\s+(.+)$/i);
 if(mm){winner=mm[1];opponent=mm[2]}
 }
 if(!winner||!opponent)return null;
 const score=raw.match(/(?:Rank(?:ing)? score)\s*([\d.]+)\s*\/\s*100/i)?.[1];
 const date=raw.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+[A-Za-z]{3}\s+\d{1,2},?\s+\d{1,2}:\d{2}\s*[AP]M\s*P[DS]T/i)?.[0]||'';
 return {winner,opponent,score,date,raw,started:/IN PROGRESS|STARTED/i.test(raw),index:i};
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function build(p){
 const item=el('article','cp5-item');item.dataset.cp5Winner=p.winner;item.dataset.cp5Opponent=p.opponent;
 const top=el('div','cp5-top'),number=el('span','cp5-num',String(p.index+1)),main=el('div'),teams=el('div','cp5-team',p.winner),opp=el('div','cp5-opponent','vs '+p.opponent),date=el('div','cp5-date',p.date),metric=el('div','cp5-metric',p.score||'—');
 metric.append(el('small','',p.score?'Rank /100':'Unranked'));main.append(teams,opp,date);top.append(number,main,metric);item.append(top);
 const projection=el('div','cp5-projection',p.started?'Game started · pregame projection unavailable':'Score projection unavailable');item.append(projection);
 const details=el('details','cp5-details');details.append(el('summary','','Matchup analysis'));
 details.append(el('p','','Ranking is provisional and not a calibrated probability. Open the scheduled matchup for its existing game-level simulation and player research.'));
 item.append(details);return item;
}
function extract(host,sport){
 let rows=sport==='nba'?[...host.querySelectorAll(':scope > .v87-three-leg')]:[...host.querySelectorAll(':scope > .leg')];
 if(!rows.length)return null;
 const parsed=rows.slice(0,5).map(parseRow).filter(Boolean);if(!parsed.length)return null;
 return {parsed,signature:parsed.map(x=>x.raw).join('|')};
}
function refresh(){
 const sport=document.body?.dataset?.sport,host=sport==='nba'?document.getElementById('v87-daily-three'):document.getElementById('v59WeeklyResults');
 if(!host||!['nfl','ncaa','nba'].includes(sport))return;
 const data=extract(host,sport);if(!data||host.dataset.cp5Signature===data.signature)return;
 host.dataset.cp5Signature=data.signature;
 host.querySelector(':scope > .cp5-list')?.remove();
 const list=el('div','cp5-list');data.parsed.forEach(p=>list.append(build(p)));
 host.append(list);
}
let queued=false;
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}
function init(){new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-sport','class']});setInterval(refresh,3500);refresh()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();