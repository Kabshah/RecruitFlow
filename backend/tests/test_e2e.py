import json
import pytest
import os
from unittest.mock import MagicMock

# Simulate a mock environment
os.environ["DEFAULT_TIMEZONE"] = "Australia/Sydney"
# We won't test the actual LLM call if no keys are set, but we can verify the pipeline logic.

def test_pipeline_initialization():
    try:
        from main import app, process_intake, evaluate_candidate
        assert app is not None
        assert process_intake is not None
        assert evaluate_candidate is not None
    except ImportError:
        # In case backend isn't mounted correctly in path
        import sys
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
        from main import app
        assert app is not None


def test_duplicate_check_logic():
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from ats.duplicate_check import DuplicateDetector
    
    mock_db = MagicMock()
    mock_response = MagicMock()
    mock_response.data = [
        {"id": "test-id-1", "candidates": {"name": "John Doe", "email": "johndoe@test.com", "phone": "1234567890"}}
    ]
    mock_db.client.table().select().eq().execute.return_value = mock_response
    
    detector = DuplicateDetector(mock_db)
    
    # Test Exact Email Match
    res1 = detector.check_duplicate({"email": "johndoe@test.com", "name": "Johnny"}, "job-1")
    assert res1["is_duplicate"] == True
    assert res1["certainty"] == "exact"
    
    # Test Fuzzy Match
    res2 = detector.check_duplicate({"email": "new@test.com", "name": "John Doe"}, "job-1")
    assert res2["is_duplicate"] == True
    assert res2["certainty"] == "fuzzy"
    
    # Test Clean
    res3 = detector.check_duplicate({"email": "clean@test.com", "name": "Jane Smith"}, "job-1")
    assert res3["is_duplicate"] == False

def test_score_classification_bands():
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from scoring.scorer import CandidateScorer
    from unittest.mock import patch
    
    mock_llm = MagicMock()
    # Mock the skill gap analysis output
    scorer = CandidateScorer(mock_llm)
    scorer.gap_analyzer.analyze = MagicMock(return_value={"missing": []})
    
    # Inject a fake LLM response for Score = 85
    mock_llm.generate.return_value = '{"score": 85, "explanation": "Good fit"}'
    
    res = scorer.evaluate_candidate({"name":"Mock"}, {"description": "Mock Job"})
    assert res["score"] == 85
    assert res["classification"] == "Recommended"
