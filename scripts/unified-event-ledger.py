#!/usr/bin/env python3
"""Persistent multi-sport fixture and result ledger, with source provenance.

A game/fight is an observed event, NOT a saved model prediction. Missing
feeds remain explicitly uncovered rather than being marked successful.
"""
import datetime as dt
import json
import os
import urllib.request
from pathlib import Path
from stage1_collect import SPORTS, normalize_event

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"research-ledger"/"unified-events.json"
HEALTH=ROOT/"research-ledger"/"unified-coverage.json"
UTC=dt.timezone.utc
# MLB added to the existing Stage 1 ESPN leagues. UFC and tennis use
# separate ESPN scoreboard feeds; their completeness is not assumed.
FEEDS={**SPORTS,"mlb":("baseball","mlb"),"ufc":("mma","ufc"),
       "tennis-atp":("tennis","atp"),"tennis-wta":("tennis","wta")}
EXTRA={k:v for k,v in FEEDS.items() if k not in SPORTS}
def iso(s):
 try:
  d=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
  return d.astimezone(UTC) if d.tzinfo else None
 except (ValueError,AttributeError):return None
def get(url):
 req=urllib.request.Request(url,headers={"User-Agent":"CurrentscyPicksUnified/1.0","Accept":"application/json"})
 with urllib.request.urlopen(req,timeout=12) as f:return json.load(f)
def merge(existing,observed):
 by={x["eventKey"]:x for x in existing if isinstance(x,dict) and x.get("eventKey")}
 for e in observed:
  key=e.get("eventKey")
  if not key:continue
  previous=by.get(key)
  if not previous:
   by[key]={**e,"firstObservedAt":e["observedAt"],"lastObservedAt":e["observedAt"],
            "observationCount":1}
  elif iso(e.get("observedAt")) and (not iso(previous.get("lastObservedAt")) or iso(e["observedAt"])>=iso(previous["lastObservedAt"])):
   first=previous.get("firstObservedAt") or previous.get("observedAt")
   count=int(previous.get("observationCount") or 1)
   # Preserve last known completed score if a later feed temporarily regresses.
   if previous.get("completed") and not e.get("completed"):
    by[key]={**previous,"lastObservedAt":e["observedAt"],"observationCount":count+1}
   else:
    by[key]={**e,"firstObservedAt":first,"lastObservedAt":e["observedAt"],"observationCount":count+1}
 return sorted(by.values(),key=lambda x:x["eventKey"])
def collect(now=None,fetcher=get,back=1,forward=2):
 now=now or dt.datetime.now(UTC)
 observed=now.isoformat()
 events=[];checks=[]
 for sport,(category,league) in EXTRA.items():
  for offset in range(-back,forward+1):
   day=(now+dt.timedelta(days=offset)).strftime("%Y%m%d")
   url=f"https://site.api.espn.com/apis/site/v2/sports/{category}/{league}/scoreboard?dates={day}&limit=300"
   try:
    data=fetcher(url)
    rows=[]
    for e in data.get("events") or []:
     if not e.get("id"):continue
     row=normalize_event(e,sport,observed,url)
     # Individual sports may provide athlete identities instead of team objects.
     if sport in ("ufc","tennis-atp","tennis-wta"):
      participants=[]
      for competition in e.get("competitions") or []:
       for c in competition.get("competitors") or []:
        entity=c.get("athlete") or c.get("team") or {}
        ident=entity.get("id") or c.get("id")
        if not ident:continue
        participants.append({"sourceTeamId":str(ident),
         "name":entity.get("displayName") or entity.get("fullName") or c.get("displayName"),
         "homeAway":c.get("homeAway"),"score":str(c["score"]) if c.get("score") is not None else None,
         "winner":c.get("winner") if isinstance(c.get("winner"),bool) else None})
      if participants:row["teams"]=participants
     rows.append(row)
    events.extend(rows)
    checks.append({"sport":sport,"day":day,"ok":True,"count":len(rows),"sourceUrl":url})
   except Exception as exc:
    checks.append({"sport":sport,"day":day,"ok":False,"error":type(exc).__name__})
 return events,checks
def main():
 old=json.loads(OUT.read_text()) if OUT.exists() else {"events":[]}
 stage1path=ROOT/"research-ledger"/"stage1"/"latest.json"
 stage1=json.loads(stage1path.read_text()) if stage1path.exists() else {"events":[],"checks":[]}
 events,checks=collect()
 events=list(stage1.get("events",[]))+events
 checks=list(stage1.get("checks",[]))+checks
 result={"schemaVersion":1,"updatedAt":dt.datetime.now(UTC).isoformat(),
         "events":merge(old.get("events",[]),events)}
 summary={}
 for sport in FEEDS:
  attempts=[x for x in checks if x["sport"]==sport]
  summary[sport]={"requestsSucceeded":sum(x["ok"] for x in attempts),
   "requestsFailed":sum(not x["ok"] for x in attempts),
   "eventsObservedThisRun":sum(x.get("count",x.get("eventsReturned",0)) for x in attempts),
   "historicalEvents":sum(x.get("sport")==sport for x in result["events"]),
   "coverageVerifiedComplete":False}
 health={"schemaVersion":1,"updatedAt":result["updatedAt"],"sports":summary,
         "errors":[x for x in checks if not x["ok"]][:100],
         "totalHistoricalEvents":len(result["events"]),
         "allEventsCaptured":False,"allPredictionsCaptured":False,
         "note":"Unofficial ESPN schedule feeds are incomplete for some fights and tennis matches; absence of events is not evidence of full coverage."}
 OUT.parent.mkdir(parents=True,exist_ok=True)
 for path,data in ((OUT,result),(HEALTH,health)):
  temp=path.with_suffix(".tmp")
  temp.write_text(json.dumps(data,indent=2)+"\n")
  os.replace(temp,path)
 print(json.dumps({"events":len(result["events"]),"sportCoverage":summary}))
 if not any(x["ok"] for x in checks):raise SystemExit("All event feeds failed")
if __name__=="__main__":main()
