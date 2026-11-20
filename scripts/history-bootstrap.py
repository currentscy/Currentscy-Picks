#!/usr/bin/env python3
"""Bootstrap past *results* only, never past forecasts, for research baselines.
Source observation time is NOW; past fixtures are not misrepresented as
historically captured evidence. Fetches bounded dates per sport.
"""
import datetime as dt
import json
import os
import urllib.request
from pathlib import Path
from stage1_collect import SPORTS,normalize_event
from validation_dashboard import when

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/"research-ledger"/"history-bootstrap.json"
NOW=lambda:dt.datetime.now(dt.timezone.utc)
def get(url):
 req=urllib.request.Request(url,headers={"User-Agent":"CurrentscyResearchHistory/1.0","Accept":"application/json"})
 with urllib.request.urlopen(req,timeout=12) as response:return json.load(response)
def dates(sport,now):
 # Bound network cost; enough historical days for team-level prior results.
 if sport=="nfl":return [now-dt.timedelta(days=x) for x in range(0,85,7)]
 if sport=="ncaa-football":return [now-dt.timedelta(days=x) for x in range(0,85,7)]
 if sport in ("nba","nhl"):return [now-dt.timedelta(days=x) for x in range(1,35)]
 return [now-dt.timedelta(days=x) for x in range(1,36,2)]
def collect(now=None,fetch=get):
 now=now or NOW();stamp=now.isoformat();events={};checks=[]
 for sport,(category,league) in SPORTS.items():
  for day in dates(sport,now):
   date=day.strftime("%Y%m%d")
   url=f"https://site.api.espn.com/apis/site/v2/sports/{category}/{league}/scoreboard?dates={date}&limit=300"
   try:
    response=fetch(url)
    found=0
    for e in response.get("events") or []:
     if not e.get("id"):continue
     row=normalize_event(e,sport,stamp,url)
     if row["completed"] and when(row.get("scheduledStart")) and when(row["scheduledStart"])<now:
      events[row["eventKey"]]=row;found+=1
    checks.append({"sport":sport,"date":date,"ok":True,"finals":found})
   except Exception as exc:
    checks.append({"sport":sport,"date":date,"ok":False,"error":type(exc).__name__})
 return list(events.values()),checks
def main():
 from importlib.util import spec_from_file_location,module_from_spec
 spec=spec_from_file_location("unified_ledger",ROOT/"scripts"/"unified-event-ledger.py")
 mod=module_from_spec(spec);spec.loader.exec_module(mod)
 target=ROOT/"research-ledger"/"unified-events.json"
 existing=json.loads(target.read_text()) if target.exists() else {"events":[]}
 observed,checks=collect()
 merged=mod.merge(existing.get("events",[]),observed)
 target.parent.mkdir(parents=True,exist_ok=True)
 tmp=target.with_suffix(".tmp")
 tmp.write_text(json.dumps({"schemaVersion":1,"updatedAt":NOW().isoformat(),"events":merged},indent=2)+"\n")
 os.replace(tmp,target)
 report={"updatedAt":NOW().isoformat(),"historicalFinalsObservedThisRun":len(observed),
  "savedEvents":len(merged),"requestsSucceeded":sum(x["ok"] for x in checks),
  "requestsFailed":sum(not x["ok"] for x in checks),
  "note":"Historical finals observed today; no backdated forecasts or historical source-capture claims."}
 DEST.write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps(report))
 if not any(x["ok"] for x in checks):raise SystemExit("No historical feeds available")
if __name__=="__main__":main()
