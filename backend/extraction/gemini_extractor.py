import json
from prompts.render import render_prompt
from llm.client import LLMClient, extract_json_from_text


class CandidateExtractor:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def extract_from_resume(self, resume_text: str) -> dict:
        prompt = render_prompt("extract_fields", resume_text=resume_text)
        raw_output = self.llm_client.generate(prompt)
        extracted = extract_json_from_text(raw_output)
        try:
            return json.loads(extracted)
        except json.JSONDecodeError as e:
            print(f"Failed to parse LLM output as JSON: {e}\nRaw Output: {raw_output[:500]}")
            raise ValueError("LLM did not return valid JSON for field extraction.")
