from pathlib import Path

PROMPTS_DIR = Path(__file__).parent

def render_prompt(prompt_name: str, **kwargs) -> str:
    """
    Loads a prompt template from prompts/{prompt_name}.txt and formats it with kwargs.
    """
    prompt_path = PROMPTS_DIR / f"{prompt_name}.txt"
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt template {prompt_name}.txt not found in {PROMPTS_DIR}")

    with open(prompt_path, "r", encoding="utf-8") as f:
        template = f.read()

    # Use standard python string formatting
    try:
        return template.format(**kwargs)
    except KeyError as e:
        raise ValueError(f"Missing required parameter for prompt {prompt_name}: {e}")
