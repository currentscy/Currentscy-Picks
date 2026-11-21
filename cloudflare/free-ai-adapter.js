// Optional Cloudflare Workers AI adapter. Deploy in YOUR Cloudflare account.
// Configure Workers AI binding named AI, and secret CROSSCHECK_TOKEN.
// The GitHub workflow calls this endpoint with Authorization: Bearer <token>.
// Use a model available on the Workers AI Free plan. No paid API keys.
export default {
 async fetch(request,env){
  if(request.method!=="POST")return new Response("POST required",{status:405});
  if(!env.AI||!env.CROSSCHECK_TOKEN)return new Response("Not configured",{status:503});
  const authorization=request.headers.get("Authorization")||"";
  if(authorization!==`Bearer ${env.CROSSCHECK_TOKEN}`)return new Response("Unauthorized",{status:401});
  const size=Number(request.headers.get("content-length")||0);
  if(size>12000)return new Response("Payload too large",{status:413});
  let body;try{body=await request.json()}catch{return new Response("Invalid JSON",{status:400})}
  if(typeof body.prompt!=="string"||body.prompt.length>10000)return new Response("Invalid prompt",{status:400});
  try{
   const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{
    messages:[{role:"system",content:"Audit supplied evidence only. Never fabricate games, injuries, probabilities or results. No betting recommendations."},
              {role:"user",content:body.prompt}],max_tokens:400
   });
   return new Response(JSON.stringify({response:String(result.response||"").slice(0,3500)}),
     {headers:{"Content-Type":"application/json","Cache-Control":"no-store"}})
  }catch{return new Response(JSON.stringify({error:"AI quota or inference unavailable"}),{status:503,headers:{"Content-Type":"application/json"}})}
 }
};
