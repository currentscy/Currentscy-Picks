import unittest
from stage2_reconcile import reconcile

def fixture():
    return {"collectedAt": "2026-11-20T10:00:00Z", "events": [{
        "eventKey": "nba:101", "sport": "nba", "sourceEventId": "101",
        "scheduledStart": "2026-11-20T19:00:00Z", "observedAt": "2026-11-20T10:00:00Z",
        "sourceUrl": "https://site.api.espn.com/test", "teams": [
            {"sourceTeamId": "11", "name": "Home", "homeAway": "home"},
            {"sourceTeamId": "12", "name": "Away", "homeAway": "away"}]}]}
def obs(provider="espn", status="out"):
    return {"provider": provider, "gameKey": "nba:101", "sourceEventId": "101" if provider=="espn" else "xyz",
            "kind": "injury", "entityId": "athlete-1", "sourceUrl": "https://example.org/report",
            "observedAt": "2026-11-20T10:10:00Z", "effectiveAt": "2026-11-20T10:00:00Z",
            "status": status, "verified": True, "pregameVerified": True}
class ReconcileTests(unittest.TestCase):
    def test_missing_external_is_valid(self):
        r = reconcile(fixture())
        self.assertEqual(r["summary"]["games"], 1)
        self.assertEqual(r["summary"]["teams"], 2)
        self.assertEqual(r["summary"]["verifiedObservations"], 0)
    def test_verified_espn_observation(self):
        r = reconcile(fixture(), [obs()])
        self.assertEqual(r["summary"]["verifiedObservations"], 1)
        self.assertFalse(r["games"][0]["observations"][0]["modelEligible"])
    def test_external_requires_verified_crosswalk(self):
        r = reconcile(fixture(), [obs("other")])
        self.assertEqual(r["summary"]["verifiedObservations"], 0)
        self.assertEqual(r["summary"]["rejectedObservations"], 1)
    def test_crosswalk_with_evidence(self):
        o = obs("other")
        o["crosswalk"] = {"verified": True, "espnEventId": "101", "providerEventId": "xyz",
                          "method": "verified schedule/team IDs", "evidenceUrl": "https://example.org/match"}
        r = reconcile(fixture(), [o])
        self.assertEqual(r["summary"]["verifiedObservations"], 1)
    def test_invalid_time_rejected(self):
        o = obs()
        o["observedAt"] = "tomorrow"
        self.assertEqual(reconcile(fixture(), [o])["summary"]["rejectedObservations"], 1)
    def test_conflict_not_automatically_resolved(self):
        a = obs()
        b = obs("other", "questionable")
        b["entityProvider"] = "espn"
        b["crosswalk"] = {"verified": True, "espnEventId": "101", "providerEventId": "xyz",
                          "method": "manual ID verification", "evidenceUrl": "https://example.org/match"}
        r = reconcile(fixture(), [a, b])
        self.assertEqual(r["summary"]["conflicts"], 1)
        self.assertTrue(all(not x["modelEligible"] for x in r["games"][0]["observations"]))
if __name__ == "__main__":
    unittest.main()
