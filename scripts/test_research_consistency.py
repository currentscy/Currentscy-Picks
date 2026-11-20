import unittest
from research_consistency import report
class ConsistencyTests(unittest.TestCase):
 def test_final_score_conflict_is_visible(self):
  a={"events":[{"eventKey":"nba:1","completed":True,"teams":[{"sourceTeamId":"10","score":"100"},{"sourceTeamId":"20","score":"90"}]}]}
  b={"nba:1":{"league":"nba","eventId":"1","completed":True,"teams":[{"id":"10","score":"99"},{"id":"20","score":"90"}]}}
  r=report(a,{},b,{},[],[],{}, {},{})
  self.assertEqual(r["verification"]["sameProviderGamesCompared"],1)
  self.assertEqual(r["verification"]["sameProviderDisagreements"][0]["field"],"final-score")
  self.assertFalse(r["readyForAutomaticModelUpdates"])
 def test_outcome_orphan(self):
  r=report({}, {}, {}, {}, [], [{"predictionId":"missing"}],{}, {},{})
  self.assertEqual(r["verification"]["unmatchedOutcomeIds"],["missing"])
if __name__=="__main__":unittest.main()
