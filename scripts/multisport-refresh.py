#!/usr/bin/env python3
"""Incremental public scoreboard collector. Source failures never erase prior snapshots."""
import datetime as dt,json,pathlib,urllib.request,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"research-ledger";OUT.mkdir(exist_ok=True)
NOW=dt.datetime.now(dt.timezone.utc)
SOURCES={"nfl":("football","nfl"),"ncaa":("football","college-football"),"nba":("basketball","nba"),"nhl":("hockey","nhl"),"soccer-epl":("soccer","eng.1"),"soccer-laliga":("soccer","esp.1"),"soccer-bundesliga":("soccer","ger.1"),"soccer-seriea":("soccer","ita.1"),"soccer-ligue1":("soccer","fra.1")}
path=OUT/"multisport-events.json"
try: ledger=json.loads(path.read_text())
except (ValueError,FileNotFoundError):ledger={}
changed=[];failures=[]
for league,(sport,competition) in SOURCES.items():
 for offset in (-1,0,1,2,3,4,5,6,7):
  date=(NOW+dt.timedelta(days=offset)).strftime("%Y%m%d")
  url=f"https://site.api.espn.com/apis/site/v2/sports/{sport}/{competition}/scoreboard?dates={date}&limit=300"
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"CurrentscyPicksResearch/1.1","Accept":"application/json"})
   with urllib.request.urlopen(req,timeout=12) as resp: data=json.load(resp)
   for event in data.get("events",[]):
    eid=str(event.get("id") or "")
    if not eid:continue
    comps=(event.get("competitions") or [{}])[0].get("competitors") or []
    teams=[{"id":str(c.get("team",{}).get("id","")),"name":c.get("team",{}).get("displayName"),"homeAway":c.get("homeAway"),"score":c.get("score")} for c in comps]
    status=event.get("status",{}).get("type",{})
    row={"league":league,"eventId":eid,"start":event.get("date"),"teams":teams,"status":status.get("state"),"completed":bool(status.get("completed")),"source":url}
    key=league+":"+eid
    previous=ledger.get(key)
    if previous is None: changed.append({"type":"new_game","key":key})
    elif any(previous.get(k)!=row[k] for k in ("start","teams","status","completed")):
     changed.append({"type":"game_updated","key":key})
    row["firstObserved"]=previous.get("firstObserved",NOW.isoformat()) if previous else NOW.isoformat()
    row["lastObserved"]=NOW.isoformat()
    ledger[key]=row
  except Exception as e:failures.append({"league":league,"date":date,"error":type(e).__name__})
# Retain history for auditing, but bound size for GitHub Pages.
if len(ledger)>12000:
 ledger=dict(sorted(ledger.items(),key=lambda kv:kv[1].get("start") or "",reverse=True)[:12000])
path.write_text(json.dumps(ledger,sort_keys=True,separators=(",",":"))+"\n")
status={"lastRun":NOW.isoformat(),"trackedGames":len(ledger),"changes":changed[:100],"changeCount":len(changed),"sourceFailures":failures[:30],"failureCount":len(failures),"injuryFeedVerified":False,"note":"Scoreboard monitoring only; injuries and starting lineups require separate verified feeds. GitHub Actions scheduling is not real-time."}
(OUT/"multisport-status.json").write_text(json.dumps(status,indent=2)+"\n")
print(json.dumps({"tracked":len(ledger),"changed":len(changed),"failures":len(failures)}))
