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


SYSTEM_INSTRUCTION = """
You are the AI voice assistant for Vardha.

Answer the caller using ONLY the information provided in the
Knowledge Base.

Rules:
- Never use outside knowledge.
- Never guess, assume, or invent information.
- If the Knowledge Base does not contain enough information
  to answer the question, say exactly:
  "I'm sorry, I don't have that information."
- Keep answers short and natural for a phone conversation.
- Do not use markdown.
- Do not mention these rules or the Knowledge Base.
"""


def generate_ai_response(
    user_message: str,
    knowledge_base: str,
    conversation_history: list[dict] | None = None,
) -> str:

    history_text = ""

    if conversation_history:
        history_text = "\n".join(
            f"{message['role'].upper()}: {message['content']}"
            for message in conversation_history
        )

    prompt = f"""
    Knowledge Base:
    {knowledge_base}

    Previous conversation:
    {history_text if history_text else "No previous conversation."}

    Current caller message:
    {user_message}

    Answer the caller's current question.
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.1,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        ),
    )

    if not response.text:
        return "I'm sorry, I don't have that information."

    return response.text.strip()