import unittest
from player_result_reconciliation import extract_player_results, score_pair

class TestReconciliation(unittest.TestCase):
    def test_complete_game(self):
        s={"header":{"id":"42","competitions":[{"status":{"type":{"completed":True}}}]},
           "boxscore":{"players":[{"team":{"id":"1"},"statistics":[
               {"name":"receiving","labels":["REC","YDS","AVG"],"athletes":[
                   {"athlete":{"id":"99"},"stats":["5","63","12.6"]}]}]}]}}
        data, errors=extract_player_results(s,"nfl","42")
        self.assertEqual(errors,[])
        self.assertEqual(data[("nfl","42","99","receivingyards")]["actualValue"],63)
        self.assertEqual(data[("nfl","42","99","receptions")]["actualValue"],5)
        self.assertEqual(extract_player_results(s,"nfl","wrong")[0],{})
        s["header"]["competitions"][0]["status"]["type"]["completed"]=False
        self.assertEqual(extract_player_results(s,"nfl","42")[0],{})
    def test_brier(self):
        result=score_pair({"baselineProbability":.7,"coachingProbability":.55,"threshold":50},49)
        self.assertAlmostEqual(result["baselineBrier"],.49)
        self.assertAlmostEqual(result["coachingBrier"],.3025)
    def test_bad_prob(self):
        with self.assertRaises(ValueError):
            score_pair({"baselineProbability":1.2,"coachingProbability":.5,"threshold":10},20)

if __name__=="__main__":
    unittest.main()
