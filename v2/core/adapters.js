// Configuration-only adapter; existing Worker URLs must be passed by the host application.
// Never embed API keys or Worker secrets in this file.
export function createHttpCollector({baseUrl,endpoint,fetchImpl=fetch}={}){
 if(!baseUrl||!endpoint)throw new Error("Existing baseUrl and endpoint configuration required");
 const origin=new URL(baseUrl);
 if(origin.protocol!=="https:")throw new Error("HTTPS required");
 return async function collect(event){
  const url=new URL(endpoint,origin);
  url.searchParams.set("sport",event.sport);
  url.searchParams.set("eventId",event.eventId);
  const res=await fetchImpl(url.toString(),{headers:{Accept:"application/json"}});
  if(!res.ok)throw new Error("Collector HTTP "+res.status);
  return await res.json();
 };
}
