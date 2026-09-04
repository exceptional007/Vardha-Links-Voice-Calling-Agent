from app.services.llm_service import generate_ai_response_stream

knowledge_base = """
INCA is an academic management platform.
It manages academic timetables.
"""

for chunk in generate_ai_response_stream(
    user_message="What is INCA?",
    knowledge_base=knowledge_base,
    conversation_history=[],
):
    print(chunk, end="", flush=True)