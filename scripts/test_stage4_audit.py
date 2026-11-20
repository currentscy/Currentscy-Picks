import unittest
from stage4_audit import evaluate
G={"games":[{"gameKey":"nba:1","sport":"nba","start":"2026-11-21T01:00:00Z"}]}
P={"predictionId":"a","gameKey":"nba:1","predictedAt":"2026-11-20T22:00:00Z",
   "market":"home-win","entityId":"home","modelVersion":"v1",
   "sourceUrl":"https://example.org/pred","baselineProbability":.6}
O={"predictionId":"a","result":1,"verified":True,"verifiedAt":"2026-11-21T04:00:00Z","sourceUrl":"https://example.org/outcome"}
class Stage4Tests(unittest.TestCase):
    def test_empty(self):
        r=evaluate(G,[],[])
        self.assertEqual(r["total"]["scored"],0)
        self.assertFalse(r["deploymentGate"]["passed"])
    def test_scoring_by_sport(self):
        r=evaluate(G,[P],[O])
        self.assertEqual(r["bySport"]["nba"]["scored"],1)
        self.assertEqual(r["byKickoffMonth"]["2026-11"]["scored"],1)
    def test_candidate_requires_source(self):
        p=dict(P,candidateProbability=.8,candidateEvidenceAuthenticated=True,
               candidateEvidenceCapturedAt="2026-11-20T21:00:00Z",
               candidateEvidenceGateVersion="stage3-authenticated-v1")
        self.assertEqual(evaluate(G,[p],[O])["total"]["paired"],0)
        p["candidateEvidenceSourceUrl"]="https://example.org/evidence"
        r=evaluate(G,[p],[O])
        self.assertEqual(r["total"]["paired"],1)
        self.assertLess(r["total"]["pairedBrierDelta"],0)
        self.assertFalse(r["improvementEstablished"])
    def test_reject_after_kickoff(self):
        p=dict(P,predictedAt="2026-11-21T01:00:00Z")
        self.assertEqual(evaluate(G,[p],[O])["total"]["scored"],0)
    def test_duplicate_predictions(self):
        r=evaluate(G,[P,P],[O])
        self.assertEqual(r["total"]["scored"],1)
        self.assertEqual(len(r["rejected"]),1)
    def test_boolean_result_rejected(self):
        r=evaluate(G,[P],[dict(O,result=True)])
        self.assertEqual(r["total"]["scored"],0)
if __name__=="__main__":unittest.main()
