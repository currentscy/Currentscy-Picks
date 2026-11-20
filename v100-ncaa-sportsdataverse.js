/* Currentscy NCAA Step 2: SportsDataverse release discovery.
   Read-only metadata, no API key, no model probability claims.
   Large Parquet assets must be normalized server-side before simulation. */
(()=>{'use strict';
const repo='sportsdataverse/sportsdataverse-data';
const allowed=new Set(['espn_cfb_pbp','espn_cfb_team_box','espn_cfb_player_box','espn_cfb_adv_team','cfbfastR_cfb_pbp','ncaa_mfb_player_stats']);
const cache=new Map();
async function release(tag){
 if(!allowed.has(tag))throw Error('Unsupported dataset');
 const hit=cache.get(tag);
 if(hit&&Date.now()-hit.at<3600000)return hit.data;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const res=await fetch('https://api.github.com/repos/'+repo+'/releases/tags/'+encodeURIComponent(tag),{signal:controller.signal,headers:{Accept:'application/vnd.github+json'}});
  if(!res.ok)throw Error('SportsDataverse release HTTP '+res.status);
  const data=await res.json();
  const assets=(data.assets||[]).filter(a=>/\.(parquet|csv|json)(\.gz)?$/i.test(a.name||'')).map(a=>({name:a.name,bytes:a.size,url:a.browser_download_url,updated:a.updated_at}));
  const out={tag,source:'SportsDataverse',publishedAt:data.published_at,assets,verifiedAt:new Date().toISOString(),usableForSimulation:false,note:'Release discovered; datasets must be parsed, joined and validated before model use'};
  cache.set(tag,{at:Date.now(),data:out});return out;
 }finally{clearTimeout(timeout)}
}
async function health(){
 const tags=['espn_cfb_team_box','espn_cfb_player_box','espn_cfb_adv_team'];
 return Promise.all(tags.map(async tag=>{try{const x=await release(tag);return {tag,status:x.assets.length?'available':'no-assets',assets:x.assets.length}}catch(e){return {tag,status:'unavailable',reason:e.message}}}));
}
window.CurrentscyNCAADataV100=Object.freeze({release,health,datasets:[...allowed],status:'metadata-only; not incorporated into simulation'});
})();