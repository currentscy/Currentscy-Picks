#!/usr/bin/env python3
"""Currentscy Picks automated NFL/NCAA research ledger.
Uses public ESPN scoreboard and summary data; no secret keys or fabricated forecasts.
Predictions are ingested only from externally persisted, pregame model exports.
"""
import datetime as dt
import json
import math
import os
import pathlib
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"research-ledger"
OUT.mkdir(exist_ok=True)
UTC=dt.timezone.utc
NOW=dt.datetime.now(UTC)
LEAGUES={"nfl":"nfl","ncaa":"college-football"}

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"CurrentscyPicksResearch/1.0","Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=18) as r:
        return json.load(r)

def read(name,default):
    path=OUT/name
    try:return json.loads(path.read_text())
    except (FileNotFoundError,json.JSONDecodeError):return default

def write(name,obj):
    (OUT/name).write_text(json.dumps(obj,indent=2,sort_keys=True)+"\n")

def parse_time(s):
    try:return dt.datetime.fromisoformat(s.replace("Z","+00:00"))
    except (ValueError,AttributeError):return None

def recent_games(league):
    events={}
    # ESPN scoreboard dates are UTC day strings; query recent dates to avoid weekly sampling gaps.
    for offset in range(0,9):
        day=(NOW-dt.timedelta(days=offset)).strftime("%Y%m%d")
        url=f"https://site.api.espn.com/apis/site/v2/sports/football/{LEAGUES[league]}/scoreboard?dates={day}&limit=300"
        try:
            for event in fetch(url).get("events",[]):
                if event.get("id"):events[str(event["id"])]=event
        except Exception as exc:
            print(f"{league} {day}: {type(exc).__name__}: {exc}")
    return events

def update():
    games=read("games.json",{})
    observations=read("observations.json",{})
    errors=[]
    for league in LEAGUES:
        for event_id,event in recent_games(league).items():
            key=f"{league}:{event_id}"
            start=parse_time(event.get("date"))
            if not start:continue
            competitors=event.get("competitions",[{}])[0].get("competitors",[])
            teams=[{"id":str(c.get("team",{}).get("id","")),"name":c.get("team",{}).get("displayName"),"score":c.get("score")} for c in competitors]
            completed=event.get("status",{}).get("type",{}).get("completed") is True
            # Never overwrite a stored kickoff or outcome with a later source revision.
            row=games.get(key,{"league":league,"gameId":event_id,"kickoff":start.isoformat(),"teams":teams,"firstObserved":NOW.isoformat(),"source":"ESPN scoreboard"})
            if completed:
                row["completed"]=True
                row["finalTeams"]=teams
                row["outcomeObserved"]=row.get("outcomeObserved",NOW.isoformat())
            games[key]=row
    # Archived prediction exports must already exist before kickoff.
    predictions=read("pregame-predictions.json",[])
    valid=[];rejected=[]
    for i,p in enumerate(predictions):
        key=f"{p.get('league')}:{p.get('gameId')}"
        game=games.get(key)
        kickoff=parse_time(game.get("kickoff")) if game else None
        saved=parse_time(p.get("predictionTimestamp"))
        has_values=all(isinstance(p.get(k),(int,float)) and math.isfinite(p[k]) for k in ("baselinePrediction","coachingPrediction","baselineProbability","coachingProbability"))
        if not game or not kickoff or not saved or saved>=kickoff or not has_values or not p.get("playerId") or not p.get("market") or not p.get("predictionSourceUrl"):
            rejected.append({"index":i,"reason":"Missing game, pregame timestamp, model outputs, player/market or provenance"})
            continue
        valid.append(p)
        # Actual player outcomes must be independently verified; team scores are not player props.
    write("games.json",games)
    write("observations.json",observations)
    write("audit.json",{"asOf":NOW.isoformat(),"gameCount":len(games),"completedGames":sum(bool(g.get("completed")) for g in games.values()),"pregamePredictionsValidated":len(valid),"pregamePredictionsRejected":rejected,"playerOutcomesVerified":len(observations),"modelImprovementEstablished":False,"nflActivated":False,"ncaaActivated":False,"nextBlocker":"Connect immutable pregame exports from the actual Currentscy Picks player prediction engine and verified player results","dataSource":"ESPN scoreboard; no defensive charting inferred"})
    print(json.dumps({"games":len(games),"pregamePredictions":len(valid),"rejected":len(rejected)}))

if __name__=="__main__":update()
