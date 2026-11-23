#!/usr/bin/env python3
"""Collect NBA player box-score observations for BOTH teams of upcoming games.

Free, unofficial ESPN endpoints. Historical completed-game statistics only.
This is evidence collection, NOT season-average projection or lineup confirmation.
"""
import datetime as dt
import json
import os
import time
import urllib.parse
from pathlib import Path

from stage1_collect import request_json

ROOT = Path(__file__).resolve().parents[1]
STAGE1 = ROOT / "research-ledger/stage1/latest.json"
OUTPUT = ROOT / "research-ledger/stage2/provider-observations.json"
COVERAGE = ROOT / "research-ledger/stage2/nba-player-coverage.json"
UTC = dt.timezone.utc
STATS = {"PTS": "points", "REB": "rebounds", "AST": "assists",
         "STL": "steals", "BLK": "blocks", "TO": "turnovers",
         "MIN": "minutes"}
MAX_GAMES = 45

def parse_time(value):
    if not isinstance(value, str):
        return None
    try:
        stamp = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return stamp.astimezone(UTC) if stamp.tzinfo else None
    except ValueError:
        return None

def season_for(day):
    return day.year + 1 if day.month >= 10 else day.year

def parse_boxscore(payload, event_id, event_start, source_url, observed):
    """Extract ESPN-qualified athlete/team IDs and labeled numeric game stats."""
    result = []
    for team in ((payload.get("boxscore") or {}).get("players") or []):
        team_id = str((team.get("team") or {}).get("id") or "")
        if not team_id:
            continue
        for group in team.get("statistics") or []:
            labels = group.get("labels") or []
            for entry in group.get("athletes") or []:
                athlete = entry.get("athlete") or {}
                athlete_id = str(athlete.get("id") or "")
                if not athlete_id or entry.get("didNotPlay") is True:
                    continue
                values = entry.get("stats") or []
                for label, raw in zip(labels, values):
                    name = STATS.get(str(label).upper())
                    if not name:
                        continue
                    try:
                        value = float(raw)
                    except (ValueError, TypeError):
                        continue
                    if not (-1000 < value < 10000):
                        continue
                    result.append({"teamId": team_id, "athleteId": athlete_id,
                                   "athleteName": athlete.get("displayName"),
                                   "statName": name, "value": value,
                                   "historicalEventId": str(event_id),
                                   "sourceGameStart": event_start,
                                   "sourceUrl": source_url})
    return result

def collect(stage1, fetcher=request_json, now=None, lookback=7, max_games=MAX_GAMES):
    now = now or dt.datetime.now(UTC)
    stamp = now.isoformat()
    events = [e for e in stage1.get("events", []) if e.get("sport") == "nba"]
    upcoming = [e for e in events if not e.get("completed") and
                (parse_time(e.get("scheduledStart")) or now) > now and
                len([t for t in e.get("teams", []) if t.get("sourceTeamId")]) == 2]
    past = {}
    errors = []
    for e in events:
        when = parse_time(e.get("scheduledStart"))
        if e.get("completed") and when and when < now and season_for(when) == season_for(now):
            past[str(e.get("sourceEventId"))] = e
    # Extend historical coverage beyond Stage 1's one-day lookback.
    for days in range(1, lookback + 1):
        day = (now - dt.timedelta(days=days)).strftime("%Y%m%d")
        url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?" + urllib.parse.urlencode({"dates": day, "limit": 300})
        try:
            data = fetcher(url)
            for e in data.get("events") or []:
                when = parse_time(e.get("date"))
                if not when or when >= now or season_for(when) != season_for(now):
                    continue
                if ((e.get("status") or {}).get("type") or {}).get("completed") is True:
                    past[str(e["id"])] = {"sourceEventId": str(e["id"]), "scheduledStart": e["date"]}
        except (Exception) as exc:
            errors.append({"sourceUrl": url, "reason": type(exc).__name__})
    historical = []
    for event in sorted(past.values(), key=lambda e: e.get("scheduledStart") or "", reverse=True)[:max_games]:
        eid = str(event["sourceEventId"])
        url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?" + urllib.parse.urlencode({"event": eid})
        try:
            payload = fetcher(url)
            historical.extend(parse_boxscore(payload, eid, event["scheduledStart"], url, stamp))
        except (Exception) as exc:
            errors.append({"sourceUrl": url, "reason": type(exc).__name__})
        time.sleep(0.15)
    # A player's historical game is linked to an upcoming game only through
    # their ESPN team ID. Never infer roster membership from a display name.
    by_team = {}
    for stat in historical:
        by_team.setdefault(stat["teamId"], []).append(stat)
    observations = []
    coverage = []
    seen = set()
    for game in upcoming:
        eid = str(game["sourceEventId"])
        for team in game["teams"]:
            tid = str(team["sourceTeamId"])
            rows = by_team.get(tid, [])
            athletes = {r["athleteId"] for r in rows}
            coverage.append({"gameKey": game["eventKey"], "teamId": tid,
                             "teamName": team.get("name"), "historicalPlayers": len(athletes),
                             "historicalStatRows": len(rows),
                             "status": "available" if athletes else "unavailable",
                             "reason": None if athletes else "No current-season completed NBA box score for this team in lookback window"})
            for row in rows:
                key = (eid, tid, row["athleteId"], row["historicalEventId"], row["statName"])
                if key in seen:
                    continue
                seen.add(key)
                observations.append({
                    "provider": "espn", "gameKey": game["eventKey"],
                    "sourceEventId": eid, "historicalEventId": row["historicalEventId"],
                    "kind": "player-stat", "entityProvider": "espn",
                    "entityId": row["athleteId"], "entityName": row["athleteName"],
                    "teamId": tid, "statName": row["statName"], "value": row["value"],
                    "sourceSeason": season_for(now),
                    "sourceGameStart": row["sourceGameStart"],
                    "sourceUrl": row["sourceUrl"],
                    "effectiveAt": row["sourceGameStart"], "observedAt": stamp,
                    "verified": True
                })
    return observations, {"schemaVersion": 1, "generatedAt": stamp,
        "season": season_for(now), "metricType": "historical-completed-game-boxscore",
        "upcomingGames": len(upcoming), "teamCoverage": coverage,
        "historicalGamesChecked": min(len(past), max_games),
        "observations": len(observations), "sourceErrors": errors,
        "limitations": "Historical game stats, NOT season aggregates, confirmed rosters, injuries or lineups. Model activation prohibited."}

def main():
    stage1 = json.loads(STAGE1.read_text())
    observations, report = collect(stage1)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # Keep existing external observations if any, without silently replacing them.
    existing = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else []
    if not isinstance(existing, list):
        raise SystemExit("Provider observation archive must be an array")
    existing = [o for o in existing if not (isinstance(o, dict) and
                o.get("provider") == "espn" and o.get("kind") == "player-stat" and
                o.get("historicalEventId"))]
    for path, data in [(OUTPUT, existing + observations), (COVERAGE, report)]:
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        os.replace(tmp, path)
    print(json.dumps({"observations": len(observations), "teamCoverage": len(report["teamCoverage"]),
                      "missingTeams": sum(x["status"] != "available" for x in report["teamCoverage"]),
                      "sourceErrors": len(report["sourceErrors"])}))

if __name__ == "__main__":
    main()
