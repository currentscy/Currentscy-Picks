#!/usr/bin/env python3
"""Join every research ledger into a single provenance/consistency health report.
Repeated ESPN endpoints are cross-checks, not independent sources.
"""
import datetime as dt
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"research-ledger"/"feedback-health.json"
def load(name,default):
 p=ROOT/"research-ledger"/name
 return json.loads(p.read_text()) if p.exists() else default

ALIASES={"nfl":"nfl","ncaa":"ncaa-football","nba":"nba","nhl":"nhl",
 "soccer-epl":"soccer-england","soccer-laliga":"soccer-spain",
 "soccer-bundesliga":"soccer-germany","soccer-seriea":"soccer-italy",
 "soccer-ligue1":"soccer-france"}
def report(stage1,stage2,legacy,football,forecasts,outcomes,stage3,stage4,stage5):
 a={x["eventKey"]:x for x in stage1.get("events",[]) if x.get("eventKey")}
 b={ALIASES.get(x.get("league"),x.get("league"))+":"+str(x.get("eventId")):x
    for x in legacy.values() if isinstance(x,dict) and x.get("league") and x.get("eventId")}
 mismatches=[]
 compared=0
 for key,game in a.items():
  other=b.get(key)
  if not other:continue
  compared+=1
  if bool(game.get("completed"))!=bool(other.get("completed")):
   mismatches.append({"gameKey":key,"field":"completed","reason":"collection disagreement or different polling times"})
   continue
  if game.get("completed"):
   def scores(teams,id_key):
    return {str(t.get(id_key)):str(t.get("score")) for t in teams if t.get("score") is not None}
   if scores(game.get("teams",[]),"sourceTeamId")!=scores(other.get("teams",[]),"id"):
    mismatches.append({"gameKey":key,"field":"final-score","reason":"ESPN snapshots disagree; review timestamps"})
 known={p.get("predictionId") for p in forecasts if isinstance(p,dict)}
 orphan=[o.get("predictionId") for o in outcomes if o.get("predictionId") not in known]
 return {"schemaVersion":1,"asOf":dt.datetime.now(dt.timezone.utc).isoformat(),
  "pipeline":{"stage1Events":len(a),"stage2Games":len(stage2.get("games",[])),
   "legacyMultisportGames":len(b),"legacyFootballGames":len(football),
   "stage5Snapshots":len(stage5.get("entries",[])),
   "unifiedEventHistory":len(load("unified-events.json",{}).get("events",[])),
   "sportsWithCoverageChecks":len(load("unified-coverage.json",{}).get("sports",{})),
   "liveModelForecasts":len(forecasts),"ESPNFinalOutcomes":len(outcomes),
   "stage3Scored":stage3.get("summary",{}).get("scoredBaselinePredictions",0),
   "stage4Scored":stage4.get("total",{}).get("scored",0)},
  "verification":{"sameProviderGamesCompared":compared,"sameProviderDisagreements":mismatches[:100],
   "unmatchedOutcomeIds":orphan[:100],"independentProviderVerification":False,
   "injuriesVerified":False,"lineupsVerified":False},
  "readyForAutomaticModelUpdates":False,
  "note":"Every research script feeds this audit or a stage of the evaluation pipeline; ESPN-only cross-checks are not independent confirmation."}
def main():
 r=report(load("stage1/latest.json",{}),load("stage2/latest.json",{}),
  load("multisport-events.json",{}),load("games.json",{}),
  load("stage3/pregame-predictions.json",[]),load("stage3/verified-outcomes.json",[]),
  load("stage3/evaluation.json",{}),load("stage4/report.json",{}),load("stage5/manifest.json",{}))
 OUT.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps(r,indent=2)+"\n")
 print(json.dumps(r["pipeline"]))
if __name__=="__main__":main()
