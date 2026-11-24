#!/usr/bin/env python3
"""Stage 1: bounded, source-attributed multi-sport game collection.
No forecasts, injury inference, or edits to website simulation inputs.
"""
import datetime as dt
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "research-ledger" / "stage1"
UTC = dt.timezone.utc
SPORTS = {
    "nfl": ("football", "nfl"),
    "ncaa-football": ("football", "college-football"),
    "nba": ("basketball", "nba"),
    "ncaa-basketball": ("basketball", "mens-college-basketball"),
    "nhl": ("hockey", "nhl"),
    "soccer-england": ("soccer", "eng.1"),
    "soccer-spain": ("soccer", "esp.1"),
    "soccer-italy": ("soccer", "ita.1"),
    "soccer-germany": ("soccer", "ger.1"),
    "soccer-france": ("soccer", "fra.1"),
    "soccer-mls": ("soccer", "usa.1"),
    "soccer-mexico": ("soccer", "mex.1"),
    "soccer-ucl": ("soccer", "uefa.champions"),
    "soccer-uel": ("soccer", "uefa.europa"),
}
MAX_EVENTS = 6000
TIMEOUT = 12

def request_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "CurrentscyPicksStage1/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
        if response.status != 200:
            raise ValueError("Unexpected HTTP status")
        return json.load(response)

def normalize_event(event, sport, observed, source):
    comps = event.get("competitions") or []
    comp = comps[0] if comps else {}
    participants = []
    for c in comp.get("competitors") or []:
        team = c.get("team") or {}
        score = c.get("score")
        participants.append({
            "sourceTeamId": str(team.get("id") or ""),
            "name": team.get("displayName") or team.get("name"),
            "homeAway": c.get("homeAway"),
            "score": str(score) if score is not None else None,
            "winner": c.get("winner") if isinstance(c.get("winner"), bool) else None,
        })
    status = (event.get("status") or {}).get("type") or {}
    return {
        "eventKey": f"{sport}:{event.get('id')}",
        "sourceEventId": str(event.get("id")),
        "sport": sport,
        "scheduledStart": event.get("date"),
        "status": status.get("name"),
        "completed": status.get("completed") is True,
        "teams": participants,
        "source": "ESPN unofficial site scoreboard",
        "sourceUrl": source,
        "observedAt": observed,
        "verifiedInjuries": None,
        "verifiedLineups": None,
        "playerStatistics": None,
        "quality": {"scoreboardObserved": True, "injuriesVerified": False, "lineupsVerified": False, "playerStatisticsVerified": False},
    }

def collect(now=None, fetcher=request_json, days_back=1, days_forward=3):
    now = now or dt.datetime.now(UTC)
    observed = now.isoformat()
    events = {}
    checks = []
    for sport, (category, league) in SPORTS.items():
        for offset in range(-days_back, days_forward + 1):
            date = (now + dt.timedelta(days=offset)).strftime("%Y%m%d")
            url = f"https://site.api.espn.com/apis/site/v2/sports/{category}/{league}/scoreboard?" + urllib.parse.urlencode({"dates": date, "limit": 300})
            try:
                data = fetcher(url)
                count = 0
                for event in data.get("events") or []:
                    if not event.get("id"):
                        continue
                    row = normalize_event(event, sport, observed, url)
                    events[row["eventKey"]] = row
                    count += 1
                    if len(events) > MAX_EVENTS:
                        raise ValueError("Event safety limit reached")
                checks.append({"sport": sport, "date": date, "ok": True, "eventsReturned": count})
            except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError, OSError) as exc:
                checks.append({"sport": sport, "date": date, "ok": False, "error": type(exc).__name__})
    return {
        "schemaVersion": 1,
        "collectedAt": observed,
        "window": {"daysBack": days_back, "daysForward": days_forward},
        "sourcePolicy": "Unofficial ESPN public endpoint; coverage and permission must be independently reviewed before redistribution",
        "events": sorted(events.values(), key=lambda x: (x["scheduledStart"] or "", x["eventKey"])),
        "checks": checks,
        "summary": {
            "eventCount": len(events),
            "successfulRequests": sum(x["ok"] for x in checks),
            "failedRequests": sum(not x["ok"] for x in checks),
            "injuryRecordsVerified": 0,
            "lineupRecordsVerified": 0,
            "playerStatRecordsVerified": 0,
        },
    }


def nfl_history(now, events, fetcher=request_json):
    season = now.year if now.month >= 9 else now.year - 1
    base = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/"
    url = base + "scoreboard?dates=" + str(season) + "0901-" + now.strftime("%Y%m%d") + "&limit=1000"
    out = {"season": season, "observedAt": now.isoformat(), "games": [], "errors": []}
    targets = {t["sourceTeamId"] for g in events if g["sport"] == "nfl" and g["status"] == "STATUS_SCHEDULED" for t in g["teams"]}
    counts = {}
    historical = {}
    for week in range(1, 19):
        weekly = base + "scoreboard?" + urllib.parse.urlencode({"dates": season, "seasontype": 2, "week": week, "limit": 100})
        try:
            for event in fetcher(weekly).get("events", []):
                if event.get("id"):
                    historical[str(event["id"])] = event
        except (OSError, ValueError, TypeError) as exc:
            out["errors"].append({"sourceUrl": weekly, "error": type(exc).__name__, "httpStatus": getattr(exc, "code", None)})
    for e in sorted(historical.values(), key=lambda x: x.get("date", ""), reverse=True):
        if (e.get("season") or {}).get("year") != season or (e.get("season") or {}).get("type") != 2:
            continue
        if not (e.get("status") or {}).get("type", {}).get("completed"):
            continue
        try:
            if dt.datetime.fromisoformat(e["date"].replace("Z", "+00:00")) >= now:
                continue
        except (KeyError, ValueError, TypeError):
            continue
        row = normalize_event(e, "nfl", now.isoformat(), url)
        ids = {t["sourceTeamId"] for t in row["teams"]}
        if len(ids) != 2 or "" in ids or not any(counts.get(t, 0) < 6 for t in ids & targets):
            continue
        source = base + "summary?event=" + row["sourceEventId"]
        try:
            data = fetcher(source)
            if str((data.get("header") or {}).get("id")) != row["sourceEventId"]:
                raise ValueError("event identity mismatch")
            box = data.get("boxscore") or {}
            players = []
            for group in box.get("players", []):
                tid = str(group.get("team", {}).get("id", ""))
                if tid not in ids:
                    continue
                for cat in group.get("statistics", []):
                    keys = cat.get("keys") or cat.get("labels") or []
                    for a in cat.get("athletes", []):
                        person = a.get("athlete") or {}
                        stats = a.get("stats") or []
                        if person.get("id") and not a.get("didNotPlay") and keys and len(keys) == len(stats):
                            players.append({"teamId": tid, "playerId": str(person["id"]), "name": person.get("displayName"), "category": cat.get("name"), "stats": dict(zip(keys, stats))})
            if {p["teamId"] for p in players} != ids:
                raise ValueError("missing opponent player records")
            observed = dt.datetime.now(UTC).isoformat()
            out["games"].append({"eventId": row["sourceEventId"], "season": season, "kickoff": e["date"], "teams": row["teams"], "players": players, "teamStatistics": box.get("teams", []), "sourceUrl": source, "observedAt": observed})
            for tid in ids:
                counts[tid] = counts.get(tid, 0) + 1
        except (OSError, ValueError, TypeError, KeyError) as exc:
            out["errors"].append({"sourceUrl": source, "error": type(exc).__name__, "httpStatus": getattr(exc, "code", None)})
        if len(out["games"]) + len(out["errors"]) >= 96:
            break
    out["teamGameCounts"] = counts
    return out

def nfl_pregame_history(history, game, forecast_at):
    """Only evidence actually observed before kickoff can enter a new forecast."""
    start = dt.datetime.fromisoformat(game["scheduledStart"].replace("Z", "+00:00"))
    if forecast_at >= start or game.get("status") != "STATUS_SCHEDULED":
        return []
    ids = {t["sourceTeamId"] for t in game["teams"]}
    return [g for g in history["games"] if g["season"] == history["season"]
            and dt.datetime.fromisoformat(g["observedAt"]) <= forecast_at
            and dt.datetime.fromisoformat(g["kickoff"].replace("Z", "+00:00")) < forecast_at
            and ids.intersection(t["sourceTeamId"] for t in g["teams"])]


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    data = collect()
    history = nfl_history(dt.datetime.now(UTC), data['events'])
    history_tmp = DEST / 'nfl-history.json.tmp'
    history_tmp.write_text(json.dumps(history, ensure_ascii=False) + '\n')
    os.replace(history_tmp, DEST / 'nfl-history.json')
    audit = {"season": history["season"], "observedAt": history["observedAt"],
             "gameCount": len(history["games"]), "playerRows": sum(len(g["players"]) for g in history["games"]),
             "teamGameCounts": history.get("teamGameCounts", {}), "errors": history["errors"][:20],
             "samples": [{"eventId": g["eventId"], "sourceUrl": g["sourceUrl"], "observedAt": g["observedAt"],
                          "teams": g["teams"], "playerCounts": {t["sourceTeamId"]: sum(p["teamId"] == t["sourceTeamId"] for p in g["players"]) for t in g["teams"]},
                          "samplePlayers": g["players"][:2]} for g in history["games"][:3]]}
    audit["upcomingCoverage"] = [{"eventKey": g["eventKey"], "teams": [{"id": t["sourceTeamId"], "name": t["name"], "games": history.get("teamGameCounts", {}).get(t["sourceTeamId"], 0)} for t in g["teams"]]} for g in data["events"] if g["sport"] == "nfl" and g["status"] == "STATUS_SCHEDULED"]
    audit["ready"] = bool(audit["upcomingCoverage"]) and all(len(g["teams"]) == 2 and all(t["games"] > 0 for t in g["teams"]) for g in audit["upcomingCoverage"])
    (DEST / "nfl-history-audit.json").write_text(json.dumps(audit, indent=2) + "\\n")
    print(json.dumps(audit))
    if not audit["ready"]:
        print("NFL player evidence incomplete; prediction activation blocked")
    path = DEST / "latest.json"
    temp = DEST / "latest.json.tmp"
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    os.replace(temp, path)
    print(json.dumps(data["summary"]))
    if data["summary"]["successfulRequests"] == 0:
        raise SystemExit("No providers responded; collection snapshot marked unsuccessful")

if __name__ == "__main__":
    main()
