import unittest
from stage2_quality_gate import evaluate

class Stage2QualityTests(unittest.TestCase):
    def test_empty_evidence_not_ready(self):
        result=evaluate({"games":[{"observations":[]}]})
        self.assertFalse(result["readyForStage3ModelTraining"])
        self.assertEqual(result["linkedObservations"],0)
    def test_self_asserted_verification_not_sufficient(self):
        result=evaluate({"games":[{"observations":[{"provider":"other","kind":"lineup","verified":True,"modelEligible":True}],"conflicts":[]}]})
        self.assertFalse(result["independentProviderAuthenticationVerified"])
        self.assertFalse(result["readyForStage3ModelTraining"])
    def test_conflicts_counted(self):
        result=evaluate({"games":[{"observations":[],"conflicts":[{"kind":"injury"}]}]})
        self.assertEqual(result["unresolvedConflicts"],1)
    def test_nba_two_opponent_coverage_is_measured(self):
        game={"gameKey":"nba:future","sport":"nba","completed":False,
              "teams":[{"teamKey":"nba:espn:1"},{"teamKey":"nba:espn:2"}],
              "observations":[{"provider":"espn","kind":"player-stat",
                               "teamId":"1","historicalEventId":"past"}]}
        report=evaluate({"games":[game]})
        self.assertEqual(report["nbaUpcomingGames"],1)
        self.assertEqual(report["nbaGamesWithBothOpponentsCovered"],0)
        self.assertEqual(report["nbaMissingTeamEvidence"][0]["missingTeamKeys"],["nba:espn:2"])
        game["observations"].append({"provider":"espn","kind":"player-stat",
                                      "teamId":"2","historicalEventId":"past"})
        report=evaluate({"games":[game]})
        self.assertEqual(report["nbaGamesWithBothOpponentsCovered"],1)
        self.assertFalse(report["readyForStage3ModelTraining"])

if __name__=="__main__":unittest.main()
