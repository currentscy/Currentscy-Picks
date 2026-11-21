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
if __name__=="__main__":unittest.main()
