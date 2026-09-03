import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set")

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-3.1-flash-lite"


SUMMARY_INSTRUCTION = """
You are a call analysis assistant.

Analyze the provided phone call transcript and create a concise
professional summary.

Extract:

1. Topics Discussed
2. Questions Asked
3. Requirements / Intent
4. Notable Points

Rules:
- Use ONLY information present in the transcript.
- Never invent or assume information.
- If a section has no relevant information, write "None".
- Keep the summary concise and useful.
- Do not include unnecessary commentary.
"""


def generate_call_summary(transcript: str) -> str:

    if not transcript.strip():
        return "No conversation was recorded."

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=f"""
Call Transcript:
----------------
{transcript}
----------------

Generate the call summary.
""",
        config=types.GenerateContentConfig(
            system_instruction=SUMMARY_INSTRUCTION,
            temperature=0.1,
            max_output_tokens=500,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        ),
    )

    if not response.text:
        return "Unable to generate call summary."

    return response.text.strip()