/* Shared NBA regularized record model used by website and scheduled forecast collector.
   Not calibrated; no injuries/lineups inferred. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.CurrentscyNBAModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const version='nba-record-home-v1';
 function parseRecord(c){
  const records=c?.records||[];
  const overall=records.find(x=>/overall|total/i.test(x.type||x.name||''))||records[0];
  const summary=String(overall?.summary||c?.team?.record?.summary||c?.team?.record||c?.record||'').trim();
  const m=summary.match(/^(\d+)\s*-\s*(\d+)$/);
  if(!m)return null;
  const w=Number(m[1]),l=Number(m[2]);
  return w+l>=8?{w,l,pct:w/(w+l)}:null;
 }
 function estimate(hr,ar){
  if(!hr||!ar||hr.w+hr.l<8||ar.w+ar.l<8)return null;
  const strength=r=>Math.log((r.w+6)/(r.l+6));
  const logit=.22+.70*(strength(hr)-strength(ar));
  const p=1/(1+Math.exp(-logit));
  return Math.max(.25,Math.min(.75,p));
 }
 function fromEvent(event){
  const cs=event?.competitions?.[0]?.competitors||[];
  const home=cs.find(x=>x.homeAway==='home'),away=cs.find(x=>x.homeAway==='away');
  if(!home?.team?.id||!away?.team?.id)return null;
  const hr=parseRecord(home),ar=parseRecord(away);
  const p=estimate(hr,ar);
  return p===null?null:{homeId:String(home.team.id),awayId:String(away.team.id),
    homeName:home.team.displayName,awayName:away.team.displayName,
    homeRecord:hr,awayRecord:ar,homeProbability:p,modelVersion:version};
 }
 return {version,parseRecord,estimate,fromEvent};
});
