#!/usr/bin/env python3
"""User-readable actual forecast-versus-final history. Never reconstruct past picks."""
import datetime as dt
import json
from pathlib import Path
from stage3_evaluate import instant

ROOT=Path(__file__).resolve().parents[1]/"research-ledger"
def read(path,default):
 p=ROOT/path
 return json.loads(p.read_text()) if p.exists() else default
def build(events,predictions,outcomes,fresh_events=None):
 games={g.get("eventKey"):g for g in events if isinstance(g,dict)}
 # The unified ledger refreshes less often than the 15-minute final-score poll.
 # Prefer the newer source observation only when it is timestamped and final.
 for g in fresh_events or []:
  if not isinstance(g,dict) or not g.get("eventKey"):continue
  old=games.get(g["eventKey"])
  new_time=instant(g.get("observedAt"))
  old_time=instant(old.get("observedAt")) if old else None
  if new_time and (not old_time or new_time>old_time):games[g["eventKey"]]=g
 results={o.get("predictionId"):o for o in outcomes if isinstance(o,dict)}
 rows=[]
 for p in predictions:
  g=games.get(p.get("gameKey"))
  if not g:continue
  start=instant(g.get("scheduledStart"));pred=instant(p.get("predictedAt"))
  if not start or not pred or pred>=start:continue
  teams=g.get("teams") or []
  home=next((t for t in teams if t.get("homeAway")=="home"),{})
  away=next((t for t in teams if t.get("homeAway")=="away"),{})
  if not home or not away:continue
  prob=p.get("baselineProbability")
  if type(prob) not in (float,int) or not 0<prob<1:continue
  o=results.get(p.get("predictionId"))
  valid=o and o.get("verified") is True and instant(o.get("verifiedAt")) and instant(o["verifiedAt"])>=start and g.get("completed") is True
  # Match the actual final scoreboard to the independently archived outcome.
  if valid:
   try:
    hs=float(home["score"]);a=float(away["score"])
    valid=(hs!=a and int(hs>a)==o.get("result") and
      hs==float(o.get("homeScore")) and a==float(o.get("awayScore")) and
      (not p.get("homeTeamId") or str(p["homeTeamId"])==str(home.get("sourceTeamId"))) and
      (not p.get("awayTeamId") or str(p["awayTeamId"])==str(away.get("sourceTeamId"))))
   except (KeyError,TypeError,ValueError):valid=False
  final=None
  if valid and type(o.get("result")) is int and o["result"] in (0,1):
   final={"homeScore":home.get("score"),"awayScore":away.get("score"),
     "homeWon":bool(o["result"]),"verifiedAt":o["verifiedAt"],
     "sourceUrl":o.get("sourceUrl"),"brier":round((prob-o["result"])**2,6)}
  rows.append({"gameKey":p["gameKey"],"sport":g.get("sport"),
   "home":home.get("name"),"away":away.get("name"),"scheduledStart":g.get("scheduledStart"),
   "predictedAt":p["predictedAt"],"predictedWinner":home.get("name") if prob>=.5 else away.get("name"),
   "predictedWinnerProbability":round(max(prob,1-prob),4),"homeWinProbability":prob,
   "modelVersion":p.get("modelVersion"),"captureMethod":p.get("captureMethod"),
   "result":final,"status":"scored" if final else "awaiting-verified-final"})
 rows.sort(key=lambda r:(r["scheduledStart"] or "",r["gameKey"]),reverse=True)
 return rows
def main():
 rows=build(read("unified-events.json",{}).get("events",[]),
  read("stage3/pregame-predictions.json",[]),read("stage3/verified-outcomes.json",[]),
  read("stage1/latest.json",{}).get("events",[]))
 data={"schemaVersion":1,"generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
  "totalForecastsWithFixtures":len(rows),"scored":sum(x["status"]=="scored" for x in rows),
  "games":rows,"note":"Only forecasts genuinely archived before kickoff appear; older games without archived pregame forecasts cannot be evaluated retrospectively."}
 p=ROOT/"forecast-vs-results.json";p.write_text(json.dumps(data,indent=2)+"\n")
 print(json.dumps({"forecastedGames":len(rows),"scored":data["scored"]}))
if __name__=="__main__":main()
