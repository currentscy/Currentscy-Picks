"""Pure ESPN player-boxscore extraction and paired forecast scoring.

No network, no database writes. Fail closed on incomplete or ambiguous identity.
"""
import math

METRICS = {
    ("passing", "YDS"): "passingyards",
    ("rushing", "YDS"): "rushingyards",
    ("receiving", "YDS"): "receivingyards",
    ("receiving", "REC"): "receptions",
}

def extract_player_results(summary, league, game_id):
    """Return (results, errors). Only use after independently verifying final status."""
    errors, results = [], {}
    header = summary.get("header") or {}
    if str(header.get("id", "")) != str(game_id):
        return {}, ["ESPN summary game ID mismatch"]
    comps = header.get("competitions") or []
    if not comps or (comps[0].get("status") or {}).get("type", {}).get("completed") is not True:
        return {}, ["ESPN game not confirmed final"]
    box = (summary.get("boxscore") or {}).get("players") or []
    if not box:
        return {}, ["Missing ESPN player boxscore"]
    for team in box:
        team_id = str((team.get("team") or {}).get("id") or "")
        if not team_id:
            errors.append("Team ID missing")
            continue
        for group in team.get("statistics") or []:
            category = str(group.get("name") or "").lower()
            labels = [str(s).upper() for s in (group.get("labels") or [])]
            if not labels:
                errors.append(f"Missing labels: {category}")
                continue
            for row in group.get("athletes") or []:
                athlete = row.get("athlete") or {}
                athlete_id = str(athlete.get("id") or "")
                if not athlete_id:
                    errors.append("Missing athlete ID")
                    continue
                stats = row.get("stats") or []
                if len(stats) != len(labels):
                    errors.append(f"Stat count mismatch: {athlete_id}")
                    continue
                for label, value in zip(labels, stats):
                    market = METRICS.get((category, label))
                    if not market:
                        continue
                    try:
                        n = float(str(value).replace(",", ""))
                    except (ValueError, TypeError):
                        errors.append(f"Unparseable {market}: {athlete_id}")
                        continue
                    if not math.isfinite(n) or n < 0:
                        errors.append(f"Invalid {market}: {athlete_id}")
                        continue
                    key = (league, str(game_id), athlete_id, market)
                    if key in results and results[key]["teamId"] != team_id:
                        errors.append(f"Conflicting athlete identity: {athlete_id}")
                        results.pop(key, None)
                        continue
                    results[key] = {"actualValue": n, "teamId": team_id,
                                    "playerId": athlete_id, "market": market}
    return results, errors

def score_pair(prediction, actual):
    """Both probabilities must be frozen pregame. Threshold is inclusive (1+)."""
    p, c = prediction["baselineProbability"], prediction["coachingProbability"]
    threshold = prediction["threshold"]
    if not all(isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)
               for x in (p, c, threshold, actual)):
        raise ValueError("Invalid numerical inputs")
    if not 0 <= p <= 1 or not 0 <= c <= 1 or threshold < 0 or actual < 0:
        raise ValueError("Out-of-range inputs")
    outcome = int(actual >= threshold)
    return {"outcome": outcome, "baselineBrier": (p - outcome)**2,
            "coachingBrier": (c - outcome)**2, "actualValue": actual}
