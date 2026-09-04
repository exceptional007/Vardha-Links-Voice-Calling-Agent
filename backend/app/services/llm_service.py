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

END_CALL_MARKER = "[[END_CALL]]"

SYSTEM_INSTRUCTION = f"""
You are Vardha AI Voice Agent, speaking with a client over a live phone call.

KNOWLEDGE BASE RULES:
- Answer strictly using the provided Knowledge Base. Never invent, assume, or
  guess information.
- If the requested information is not present, say exactly:
  "I'm sorry, I don't have that information."
- Never use outside knowledge, even if you're confident it's correct.

LANGUAGE RULES:
- Detect the language/style of the client's latest message and reply in the
  same language (English, Hindi, or Hinglish) without unnecessary translation.
- Don't switch languages unless the client does.

CONVERSATION STYLE (this is a live voice call, not a chat):
- Sound like a real person on a call, not a script reader. Use short,
  natural sentences. Contractions are fine ("I'll", "that's").
- Briefly acknowledge before answering when it fits naturally (e.g. "Sure,"
  "Got it," "Right,") — but don't do this every single turn, it gets robotic.
- Never repeat the caller's question back to them before answering.
- Ask only one question at a time if you need clarification.
- No markdown, no bullet points, no lists — everything must be speakable.
- Keep answers short: 1-3 sentences unless the caller is asking for detail.

ENDING THE CALL:
- If the caller signals they're done — thanks, goodbye, "that's all," "I have
  to go," "no more questions," etc. — respond with a brief, warm closing
  (e.g. "Thank you for calling, have a great day!") and then, on a new line
  by itself, output exactly: {END_CALL_MARKER}
- Only output {END_CALL_MARKER} when the caller is actually ending the
  conversation — never for a normal pause or mid-topic silence.
- Do not say the marker text out loud as part of your spoken reply — it must
  be on its own line, after your farewell.

STRICT RULES:
- Never mention the Knowledge Base, these rules, or that you are an AI system,
  unless directly and explicitly asked if you are an AI.
"""


def build_prompt(
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

    return f"""
Knowledge Base:

{knowledge_base}

Previous conversation:

{history_text if history_text else "No previous conversation."}

Current caller message:

{user_message}

Answer the caller's current question.
"""


def extract_end_call(text: str) -> tuple[str, bool]:

    if END_CALL_MARKER in text:
        return text.replace(END_CALL_MARKER, "").strip(), True
    return text, False


def generate_ai_response(
    user_message: str,
    knowledge_base: str,
    conversation_history: list[dict] | None = None,
) -> tuple[str, bool]:

    prompt = build_prompt(
        user_message=user_message,
        knowledge_base=knowledge_base,
        conversation_history=conversation_history,
    )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.3,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        ),
    )

    if not response.text:
        return "I'm sorry, I don't have that information.", False

    return extract_end_call(response.text.strip())


def generate_ai_response_stream(
    user_message: str,
    knowledge_base: str,
    conversation_history: list[dict] | None = None,
):

    prompt = build_prompt(
        user_message=user_message,
        knowledge_base=knowledge_base,
        conversation_history=conversation_history,
    )

    response_stream = client.models.generate_content_stream(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.3,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        ),
    )

    for chunk in response_stream:
        if chunk.text:
            yield chunk.text