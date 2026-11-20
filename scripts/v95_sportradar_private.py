#!/usr/bin/env python3
"""V95 Step 3: validate Sportradar NFL game feed privately; no public data output."""
import datetime as dt,json,os,sys,urllib.parse,urllib.request
ALLOWED=("api.sportradar.com","api.sportradar.us")
def main():
 key=os.environ.get("SPORTRADAR_API_KEY","").strip()
 url=os.environ.get("SPORTRADAR_NFL_FEED_URL","").strip()
 if not key:raise ValueError("API key not configured")
 p=urllib.parse.urlsplit(url)
 if p.scheme!="https" or p.hostname not in ALLOWED or p.username or p.password or p.fragment or p.query:
  raise ValueError("HTTPS Sportradar NFL endpoint URL required without query parameters")
 # Key in header, not URL. Validate provider's supported authentication method.
 req=urllib.request.Request(url,headers={"x-api-key":key,"Accept":"application/json","User-Agent":"Currentscy-Picks/95"})
 with urllib.request.urlopen(req,timeout=35) as res:
  if res.status!=200:raise ValueError("Unexpected response status")
  data=res.read(8_000_001)
  if len(data)>8_000_000:raise ValueError("Response exceeds size limit")
 obj=json.loads(data)
 if not isinstance(obj,dict):raise ValueError("Expected JSON object")
 # Schema varies by product and endpoint; check presence of an event collection
 # rather than inventing player-level statistics or defender assignments.
 event_keys=("games","events","league","season","game","sport_event")
 recognized=[k for k in event_keys if k in obj]
 if not recognized:raise ValueError("Unrecognized NFL feed schema")
 print(json.dumps({"provider":"sportradar","verifiedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
                   "schemaKeys":recognized,"responseTopLevelKeys":sorted(obj.keys())[:20],
                   "status":"private-schema-validated; no game or player stats published",
                   "publicUseAuthorized":False,"commercialUseAuthorized":False}))
if __name__=="__main__":
 try:main()
 except Exception:
  print("Sportradar validation failed; check subscription, endpoint, authentication, and schema. No secrets printed.",file=sys.stderr)
  sys.exit(1)
