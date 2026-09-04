import os
import re

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

OUTPUT FORMAT — STRICT:
- Plain text only. This output is displayed as-is, not rendered as markdown.
- Do NOT use any markdown syntax: no "#" headers, no "**bold**", no "*" or
  "-" bullet markers, no backticks, no underscores for emphasis.
- Write each section as a plain heading line followed by a colon, like:
  "Topics Discussed:" then the content on the next line(s).
- For lists within a section, write each item on its own line starting
  with a plain number or nothing at all — do not use "*" or "-" characters.
- Example of the exact format to follow:

Topics Discussed:
Overview and functionality of the INCA academic management platform.

Questions Asked:
Can you please tell me about INCA?
What does it do?

Requirements / Intent:
The user requested information regarding the purpose and utility of the
INCA platform.

Notable Points:
INCA helps educational institutions manage lecture schedules and timetables.
Users can filter schedules by academic year, semester, branch, and batch.
"""


_MARKDOWN_PATTERNS = [
    (re.compile(r"\*\*(.*?)\*\*"), r"\1"),   # **bold**
    (re.compile(r"__(.*?)__"), r"\1"),        # __bold__
    (re.compile(r"\*(.*?)\*"), r"\1"),        # *italic*
    (re.compile(r"_(.*?)_"), r"\1"),          # _italic_
    (re.compile(r"`{1,3}(.*?)`{1,3}"), r"\1"),  # `code` / ```code```
    (re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE), ""),   # # headers
    (re.compile(r"^\s{0,3}[*\-+]\s+", re.MULTILINE), ""),   # bullet markers
    (re.compile(r"^\s{0,3}\d+\.\s+", re.MULTILINE), ""),    # "1. " list markers
]


def strip_markdown(text: str) -> str:
    cleaned = text

    for pattern, replacement in _MARKDOWN_PATTERNS:
        cleaned = pattern.sub(replacement, cleaned)

    cleaned = "\n".join(line.rstrip() for line in cleaned.split("\n"))
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    return cleaned.strip()


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

    return strip_markdown(response.text.strip())