#!/usr/bin/env python3
"""Stage 2 evidence quality gate. Never treats a self-asserted flag as independent verification."""
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/"research-ledger/stage2/latest.json"
OUTPUT=ROOT/"research-ledger/stage2/quality.json"

def evaluate(data):
    games=data.get("games") or []
    observations=[o for g in games if isinstance(g,dict) for o in (g.get("observations") or []) if isinstance(o,dict)]
    kinds=Counter(o.get("kind","unknown") for o in observations)
    providers=Counter(o.get("provider","unknown") for o in observations)
    conflicts=sum(len(g.get("conflicts") or []) for g in games if isinstance(g,dict))
    eligible=sum(o.get("modelEligible") is True for o in observations)
    nba_games=[g for g in games if isinstance(g,dict) and g.get("sport")=="nba" and not g.get("completed")]
    nba_coverage=[]
    for game in nba_games:
        expected={t.get("teamKey") for t in (game.get("teams") or []) if t.get("teamKey")}
        present={f"nba:espn:{o.get('teamId')}" for o in (game.get("observations") or [])
                 if o.get("kind")=="player-stat" and o.get("provider")=="espn"
                 and o.get("historicalEventId") and o.get("teamId")}
        missing=sorted(expected-present)
        nba_coverage.append({"gameKey":game.get("gameKey"),"teamsExpected":len(expected),
                             "teamsWithHistoricalPlayerEvidence":len(expected & present),
                             "missingTeamKeys":missing,
                             "bothOpponentsCovered":len(expected)==2 and not missing})
    # Stage 2 reconciliation does not authenticate a provider. This gate
    # deliberately refuses to infer authentication from user-supplied flags.
    ready=False
    return {"schemaVersion":1,"games":len(games),"linkedObservations":len(observations),
            "kinds":dict(kinds),"providers":dict(providers),
            "unresolvedConflicts":conflicts,"modelEligibleObservations":eligible,
            "nbaUpcomingGames":len(nba_coverage),
            "nbaGamesWithBothOpponentsCovered":sum(x["bothOpponentsCovered"] for x in nba_coverage),
            "nbaMissingTeamEvidence":[x for x in nba_coverage if not x["bothOpponentsCovered"]],
            "independentProviderAuthenticationVerified":False,
            "injuryVerificationReady":False,"lineupVerificationReady":False,
            "readyForStage3ModelTraining":ready,
            "reason":"Independent provider authentication, lineup/injury coverage and immutable pregame feature provenance are not yet established."}

def main():
    if not INPUT.exists():raise SystemExit("Stage 2 input missing")
    report=evaluate(json.loads(INPUT.read_text()))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report))
if __name__=="__main__":main()
