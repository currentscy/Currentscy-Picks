import unittest
from stage3_evaluate import evaluate,score

GAME={"games":[{"gameKey":"nba:123","start":"2026-11-21T01:00:00Z"}]}
P={"predictionId":"p1","gameKey":"nba:123","predictedAt":"2026-11-20T22:00:00Z",
   "market":"home-win","entityId":"home","modelVersion":"baseline-1",
   "sourceUrl":"https://example.org/pregame","baselineProbability":0.6}
O={"predictionId":"p1","result":1,"verified":True,"verifiedAt":"2026-11-21T04:00:00Z",
   "sourceUrl":"https://example.org/final"}
class Stage3Tests(unittest.TestCase):
    def test_no_data_means_no_accuracy_claim(self):
        r=evaluate(GAME)
        self.assertIsNone(r["baseline"])
        self.assertFalse(r["improvementEstablished"])
        self.assertFalse(r["liveModelActivated"])
    def test_pregame_scored(self):
        r=evaluate(GAME,[P],[O])
        self.assertEqual(r["summary"]["scoredBaselinePredictions"],1)
        self.assertAlmostEqual(r["baseline"]["brier"],.16)
    def test_postgame_predictions_rejected(self):
        p=dict(P,predictedAt="2026-11-21T02:00:00Z")
        r=evaluate(GAME,[p],[O])
        self.assertEqual(r["summary"]["scoredBaselinePredictions"],0)
        self.assertEqual(r["summary"]["rejectedRecords"],1)
    def test_unverified_result_not_scored(self):
        r=evaluate(GAME,[P],[dict(O,verified=False)])
        self.assertEqual(r["summary"]["scoredBaselinePredictions"],0)
    def test_candidate_without_evidence_excluded(self):
        r=evaluate(GAME,[dict(P,candidateProbability=.9)],[O])
        self.assertEqual(r["summary"]["pairedSample"],0)
        self.assertFalse(r["deploymentGate"]["passed"])
    def test_score_prefers_better_calibrated_predictions(self):
        self.assertLess(score([(.8,1)])["brier"],score([(.2,1)])["brier"])
if __name__=="__main__":unittest.main()
