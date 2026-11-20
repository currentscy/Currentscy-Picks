#!/usr/bin/env python3
"""V95 Step 2: private SportsDataIO injury feed health + schema validation.
Requires secret SPORTSDATAIO_API_KEY and explicit SPORTSDATAIO_INJURIES_URL.
Never commits licensed raw feed or credentials to GitHub Pages.
"""
import datetime as dt, json, os, pathlib, sys, urllib.parse, urllib.request
HOSTS={"api.sportsdata.io"}
def fail(message):
    raise RuntimeError(message)
def run():
    key=os.environ.get("SPORTSDATAIO_API_KEY","").strip()
    endpoint=os.environ.get("SPORTSDATAIO_INJURIES_URL","").strip()
    if not key: fail("Missing SPORTSDATAIO_API_KEY secret")
    parsed=urllib.parse.urlsplit(endpoint)
    if parsed.scheme!="https" or parsed.hostname not in HOSTS or parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail("Provide an HTTPS SportsDataIO injuries endpoint URL without query params")
    req=urllib.request.Request(endpoint,headers={"Ocp-Apim-Subscription-Key":key,"Accept":"application/json","User-Agent":"Currentscy-Picks-V95/1.0"})
    with urllib.request.urlopen(req,timeout=30) as response:
        if response.status!=200: fail("SportsDataIO request returned non-200")
        raw=response.read(8_000_001)
        if len(raw)>8_000_000:fail("Feed exceeds safety size limit")
    feed=json.loads(raw)
    if not isinstance(feed,list):fail("Expected a JSON list of injury records; inspect your subscription endpoint")
    records=[]
    for item in feed:
        if not isinstance(item,dict):continue
        player_id=item.get("PlayerID")
        status=item.get("InjuryStatus") or item.get("Status")
        if player_id is None or not isinstance(status,str) or not status.strip():continue
        # Keep only non-sensitive operational metadata in private job artifact.
        records.append({"playerId":str(player_id),"team":item.get("Team"),"status":status.strip(),
                        "injuryDate":item.get("InjuryDate"),"updated":item.get("Updated")})
    if feed and not records:fail("Feed has entries but none match expected PlayerID/InjuryStatus schema")
    now=dt.datetime.now(dt.timezone.utc).isoformat()
    result={"provider":"sportsdataio","collectedAt":now,"recordCount":len(records),
            "license":"restricted; NOT cleared for public redistribution",
            "publicDisplayAuthorized":False,"commercialUseAuthorized":False,
            "endpointPath":parsed.path,"injuries":records}
    path=pathlib.Path("private-output/sportsdataio-injuries.json")
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(f"SportsDataIO feed validated; {len(records)} injury rows in private job artifact (not website)")
if __name__=="__main__":
    try:run()
    except Exception as exc:
        # Never print URL, token, HTTP response body, or request exception (may leak credentials).
        print("SportsDataIO collector failed: verify secret, endpoint, subscription and response schema.",file=sys.stderr)
        sys.exit(1)
