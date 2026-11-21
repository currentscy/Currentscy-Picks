import datetime as dt
import unittest
from integration_health import status,build
class IntegrationHealthTests(unittest.TestCase):
 def test_missing_report_is_not_healthy(self):
  result=status("x","no-such-report.json","generatedAt",dt.datetime.now(dt.timezone.utc),1)
  self.assertEqual(result["state"],"missing")
 def test_report_does_not_claim_automatic_production_updates(self):
  self.assertFalse(build()["automaticProductionModelUpdates"])
 def test_shadow_learning_layer_is_reported(self):
  result=build()
  self.assertIn("shadowML",result["layers"])
  self.assertIn("shadowLearningScored",result["metrics"])
if __name__=="__main__":unittest.main()
