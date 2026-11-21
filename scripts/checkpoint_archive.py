#!/usr/bin/env python3
"""Persist observed multi-sport event snapshots and bridge real NBA model forecasts.
This is NOT a prediction generator for sports without a connected model.
"""
import datetime as dt,hashlib,json,os
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]/"research-ledger"
def read(path,default):
 try:return json.loads((BASE/path).read_text())
 except (OSError,ValueError):return default
def save(path,data):
 p=BASE/path;p.parent.mkdir(parents=True,exist_ok=True)
 tmp=p.with_suffix(".tmp");tmp.write_text(json.dumps(data,indent=2)+"\n");os.replace(tmp,p)
def archive(events,previous,now):
 existing={x.get("snapshotId"):x for x in previous if isinstance(x,dict)}
 for e in events:
  if not isinstance(e,dict) or not e.get("eventKey"):continue
  # Only record fields actually observed; do not infer injuries or lineups.
  fields={k:e.get(k) for k in ("eventKey","sport","scheduledStart","status","completed","teams","sourceUrl","observedAt","quality")}
  if not fields["observedAt"]:continue
  # Repeated polls with unchanged state must not create endless snapshots.
  state={k:v for k,v in fields.items() if k!="observedAt"}
  digest=hashlib.sha256(json.dumps(state,sort_keys=True).encode()).hexdigest()
  if digest not in existing:
   existing[digest]={"snapshotId":digest,"capturedAt":now,"observation":fields}
 return list(existing.values())
def bridge(predictions,outcomes,index,previous,previous_outcomes):
 games={g.get("gameKey"):g for g in index.get("games",[])}
 saved={x.get("predictionId"):x for x in previous}
 for p in predictions:
  if not isinstance(p,dict) or not p.get("predictionId") or p.get("predictionId") in saved:continue
  g=games.get(p.get("gameKey"),{})
  start=g.get("start");at=p.get("predictedAt")
  try:
   t=dt.datetime.fromisoformat(start.replace("Z","+00:00"))
   a=dt.datetime.fromisoformat(at.replace("Z","+00:00"))
  except (ValueError,TypeError,AttributeError):continue
  if a>=t:continue
  probability=p.get("baselineProbability")
  if type(probability) not in (float,int) or not 0<probability<1:continue
  # Existing collector has ONE forecast; label based on actual time before kickoff.
  cp="pregame" if dt.timedelta(0)<t-a<=dt.timedelta(minutes=90) else "early"
  saved[p["predictionId"]]={"predictionId":p["predictionId"],"gameKey":p["gameKey"],
   "sport":"nba","checkpoint":cp,"scheduledStart":start,"predictedAt":at,
   "probability":probability,"modelVersion":p.get("modelVersion"),"sourceUrl":p.get("sourceUrl"),
   "provenance":"existing exact shared NBA model; not independently injury-adjusted"}
 settled={o.get("predictionId"):o for o in previous_outcomes}
 for o in outcomes:
  if o.get("predictionId") in saved and o.get("verified") is True:
   settled.setdefault(o["predictionId"],o)
 return list(saved.values()),list(settled.values())
def main():
 now=dt.datetime.now(dt.timezone.utc).isoformat()
 sources=[read("stage1/latest.json",{}),read("unified-events.json",{})]
 events=[e for source in sources if isinstance(source,dict) for e in source.get("events",[])]
 snaps=archive(events,read("checkpoints/event-snapshots.json",[]),now)
 save("checkpoints/event-snapshots.json",snaps)
 preds,finals=bridge(read("stage3/pregame-predictions.json",[]),
  read("stage3/verified-outcomes.json",[]),read("stage3/game-index.json",{}),
  read("checkpoints/forecasts.json",[]),read("checkpoints/outcomes.json",[]))
 save("checkpoints/forecasts.json",preds);save("checkpoints/outcomes.json",finals)
 sports=sorted({s["observation"].get("sport") for s in snaps if s["observation"].get("sport")})
 print(json.dumps({"eventSnapshots":len(snaps),"observedSports":sports,"actualForecasts":len(preds),"matchedFinals":len(finals),
 "warning":"Non-NBA event snapshots are observations, not forecasts. Live injury and tennis models remain unconnected."}))
if __name__=="__main__":main()
