import os
import re
import json
from huggingface_hub import InferenceClient

try:
    from google import genai as _genai
except ImportError:
    _genai = None

# Prepended to every prompt so the model knows we only want raw JSON back.
_JSON_SYSTEM_INSTRUCTION = (
    "You are a JSON-only API. "
    "Respond with ONLY a raw JSON object or array — no markdown fences, no preamble, "
    "no explanation, no code blocks, no 'Here is...' text. "
    "Start your response with '{' or '[' and end with '}' or ']'. Nothing else."
)


def extract_json_from_text(text: str) -> str:
    """
    Robustly extract the first valid JSON object or array from an LLM
    response that may include markdown fences, preamble, or explanation text.

    Extraction order:
    1. Markdown fenced code block  (```json ... ``` or ``` ... ```)
    2. First {...} block (greedy)
    3. First [...] block (greedy)
    4. Raw stripped text as-is (final fallback)
    """
    # 1. Fenced code block — ```json ... ``` or ``` ... ```
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()

    # 2. First {...} — handle nested braces properly
    brace_match = _find_balanced(text, "{", "}")
    if brace_match:
        return brace_match

    # 3. First [...] — handle nested brackets
    bracket_match = _find_balanced(text, "[", "]")
    if bracket_match:
        return bracket_match

    # 4. Nothing worked — return as-is and let the caller raise a clear error
    return text.strip()


def _find_balanced(text: str, open_ch: str, close_ch: str) -> str | None:
    """Return the first balanced open_ch…close_ch substring, or None."""
    start = text.find(open_ch)
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape_next = False
    for i in range(start, len(text)):
        ch = text[i]
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


class LLMClient:
    def __init__(self):
        self.hf_token = os.getenv("HF_API_TOKEN")
        self.hf_model = os.getenv("HF_MODEL_NAME", "deepseek-ai/DeepSeek-V3-0324")
        self.gemini_key = os.getenv("GEMINI_API_KEY")

        if self.hf_token:
            self.hf_client = InferenceClient(token=self.hf_token)
        else:
            self.hf_client = None

        if self.gemini_key and _genai:
            self.gemini_client = _genai.Client(api_key=self.gemini_key)
        else:
            self.gemini_client = None

    def generate(self, prompt: str) -> str:
        """
        Primary: HF (configurable via HF_MODEL_NAME).
        Fallback: Gemini (if GEMINI_API_KEY is set and HF fails or is not configured).

        A JSON-only system instruction is prepended so models that support a
        system role receive it; the same text is also prefixed to the user
        message for models that do not.
        """
        if self.hf_client:
            try:
                messages = [
                    {"role": "system", "content": _JSON_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": prompt},
                ]
                completion = self.hf_client.chat_completion(
                    model=self.hf_model,
                    messages=messages,
                    max_tokens=4096,
                    temperature=0.1,
                )
                return completion.choices[0].message.content
            except Exception as e:
                print(f"HuggingFace ({self.hf_model}) call failed: {e}. Falling back to Gemini...")

        if self.gemini_client:
            try:
                full_prompt = f"{_JSON_SYSTEM_INSTRUCTION}\n\n{prompt}"
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=full_prompt,
                )
                return response.text
            except Exception as e:
                print(f"Gemini fallback also failed: {e}")

        raise RuntimeError("All LLM providers failed or are not configured.")

    def generate_json(self, prompt: str) -> dict | list:
        """
        Convenience wrapper: calls generate(), extracts JSON, and returns the
        parsed object/array.  Raises ValueError with the raw output on failure
        so callers get a clear, actionable error message.
        """
        raw = self.generate(prompt)
        extracted = extract_json_from_text(raw)
        try:
            return json.loads(extracted)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"LLM did not return valid JSON.\n"
                f"Extraction attempt: {extracted[:300]}\n"
                f"Raw output: {raw[:500]}"
            ) from exc
