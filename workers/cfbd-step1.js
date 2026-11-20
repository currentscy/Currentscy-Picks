// Currentscy Picks NCAA CFBD gateway, step 1.
// Deploy this as Cloudflare Worker code after merging with any existing routes.
// Secret: CFBD_API_KEY. Never put it in frontend code.
const endpoints = Object.freeze({
  games: '/games',
  players: '/games/players',
  teams: '/games/teams',
  advanced: '/stats/season/advanced'
});
export default {
 async fetch(request, env) {
  const origin = env.ALLOWED_ORIGIN || 'https://currentscy.github.io';
  const headers = {
   'Access-Control-Allow-Origin': origin,
   'Access-Control-Allow-Methods': 'GET, OPTIONS',
   'Access-Control-Allow-Headers': 'Content-Type',
   'Vary': 'Origin',
   'Content-Type': 'application/json',
   'Cache-Control': 'public, max-age=1800'
  };
  const reply = (data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return reply({error:'GET only'},405);
  const supplied=request.headers.get('Origin');
  if(supplied && supplied!==origin)return reply({error:'Origin not permitted'},403);
  const url=new URL(request.url);
  if(url.pathname!=='/cfbd')return reply({error:'Not found'},404);
  if(!env.CFBD_API_KEY)return reply({error:'CFBD secret missing'},503);
  const kind=url.searchParams.get('type');
  if(!Object.hasOwn(endpoints,kind))return reply({error:'Invalid data type'},400);
  const year=Number(url.searchParams.get('year'));
  if(!Number.isInteger(year)||year<2001||year>new Date().getUTCFullYear()+1)return reply({error:'Invalid year'},400);
  const target=new URL('https://api.collegefootballdata.com'+endpoints[kind]);
  target.searchParams.set('year',String(year));
  for(const key of ['team','week','seasonType','classification']){
   const val=url.searchParams.get(key);
   if(val && val.length<=90)target.searchParams.set(key,val);
  }
  if(kind==='players'&&!target.searchParams.has('team')&&!target.searchParams.has('week'))return reply({error:'Player requests require team or week'},400);
  try{
   const upstream=await fetch(target,{headers:{Authorization:'Bearer '+env.CFBD_API_KEY,Accept:'application/json'},cf:{cacheTtl:1800,cacheEverything:true}});
   if(!upstream.ok)return reply({error:'CFBD request failed',status:upstream.status},upstream.status===429?429:502);
   const data=await upstream.json();
   return reply({source:'CFBD',year,type:kind,items:data,verifiedAt:new Date().toISOString()});
  }catch(_){return reply({error:'CFBD unavailable'},502)}
 }
};