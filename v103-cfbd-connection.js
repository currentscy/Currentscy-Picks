/* Currentscy Picks V103: CFBD browser-side connection and verification.
   Secret remains in Cloudflare. This module never exposes the key and never
   treats an unsuccessful response as verified NCAA evidence. */
(()=>{'use strict';
const WORKER='https://currentscy-picks-api.johnnybawmie.workers.dev';
const TYPES=new Set(['games','players','teams','advanced']);
const cache=new Map();
function endpoint(type,opts={}){
 if(!TYPES.has(type))throw Error('Unsupported CFBD data type');
 const year=Number(opts.year);
 if(!Number.isInteger(year)||year<2001||year>new Date().getUTCFullYear()+1)throw Error('Invalid CFBD season');
 const u=new URL('/cfbd',WORKER);
 u.searchParams.set('type',type);u.searchParams.set('year',String(year));
 for(const k of ['team','week','seasonType','classification']){
  const value=opts[k];
  if(value!==undefined&&value!==null&&String(value).length<=90)u.searchParams.set(k,String(value));
 }
 return u.toString();
}
async function request(type,opts={}){
 const url=endpoint(type,opts);
 const hit=cache.get(url);
 if(hit&&Date.now()-hit.time<300000)return hit.result;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(url,{method:'GET',mode:'cors',signal:controller.signal,headers:{Accept:'application/json'}});
  let body;
  try{body=await response.json()}catch{throw Error('CFBD gateway returned non-JSON response')}
  if(!response.ok)throw Error('CFBD gateway HTTP '+response.status+': '+String(body?.error||'Request failed'));
  if(body?.source!=='CFBD'||!Array.isArray(body?.items)||body?.type!==type)throw Error('CFBD gateway returned an unexpected payload');
  const result={...body,connected:true,verifiedAt:new Date().toISOString()};
  cache.set(url,{time:Date.now(),result});
  return result;
 }finally{clearTimeout(timer)}
}
async function health(year=new Date().getUTCFullYear()){
 try{
  const r=await request('games',{year,week:1});
  return {connected:true,year,records:r.items.length,source:'CFBD',verifiedAt:r.verifiedAt,usableForModel:r.items.length>0};
 }catch(e){
  return {connected:false,year,records:0,source:'CFBD',error:e.message,usableForModel:false};
 }
}
window.CurrentscyCFBDV103=Object.freeze({endpoint,request,health,worker:WORKER,simulationIntegrated:false});
})();