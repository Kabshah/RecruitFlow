import json
from prompts.render import render_prompt
from llm.client import LLMClient, extract_json_from_text


class SkillGapAnalyzer:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def analyze(self, candidate_profile: dict, job_requirements: dict) -> dict:
        prompt = render_prompt(
            "gap_analysis",
            candidate_profile=json.dumps(candidate_profile, indent=2),
            job_requirements=json.dumps(job_requirements, indent=2),
        )
        raw_output = self.llm_client.generate(prompt).strip()
        extracted = extract_json_from_text(raw_output)
        try:
            return json.loads(extracted)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM did not return valid JSON for gap analysis: {e}\nRaw: {raw_output[:500]}")
