import json
from prompts.render import render_prompt
from llm.client import LLMClient, extract_json_from_text


class InterviewQuestionGenerator:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def generate(self, job_description: str, candidate_profile: dict, gap_analysis: dict) -> list:
        prompt = render_prompt(
            "interview_questions",
            job_description=job_description,
            candidate_profile=json.dumps(candidate_profile, indent=2),
            gap_analysis=json.dumps(gap_analysis, indent=2),
        )
        raw_output = self.llm_client.generate(prompt).strip()
        extracted = extract_json_from_text(raw_output)
        try:
            parsed = json.loads(extracted)
            return parsed.get("questions", [])
        except json.JSONDecodeError as e:
            print(f"Failed to parse LLM output as JSON: {e}\nRaw Output: {raw_output[:500]}")
            raise ValueError(f"LLM did not return valid JSON for interview questions: {e}")
