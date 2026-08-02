import json
from prompts.render import render_prompt
from llm.client import LLMClient, extract_json_from_text
from scoring.gap_analysis import SkillGapAnalyzer


class CandidateScorer:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.gap_analyzer = SkillGapAnalyzer(llm_client)

    def evaluate_candidate(self, candidate_profile: dict, job_data: dict) -> dict:
        """Runs both Gap Analysis and Scoring, returning a combined result."""
        # 1. Shared Skill Gap Analysis
        gap_analysis = self.gap_analyzer.analyze(
            candidate_profile,
            job_data.get("requirements_json", {}),
        )

        # 2. Score generation
        prompt = render_prompt(
            "score_candidate",
            job_description=job_data.get("description", ""),
            job_requirements=json.dumps(job_data.get("requirements_json", {}), indent=2),
            candidate_profile=json.dumps(candidate_profile, indent=2),
            gap_analysis=json.dumps(gap_analysis, indent=2),
        )
        raw_output = self.llm_client.generate(prompt).strip()
        extracted = extract_json_from_text(raw_output)
        try:
            score_data = json.loads(extracted)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM did not return valid JSON for scoring: {e}\nRaw: {raw_output[:500]}")

        score = score_data.get("score", 0)

        # 3. Classification bands
        if score >= 90:
            classification = "Highly Recommended"
        elif score >= 75:
            classification = "Recommended"
        elif score >= 60:
            classification = "Consider"
        else:
            classification = "Not Recommended"

        return {
            "score": score,
            "classification": classification,
            "explanation": score_data.get("explanation", ""),
            "skill_gap": gap_analysis,
        }
