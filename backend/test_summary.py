from app.services.summary_service import generate_call_summary


transcript = """
USER: What does Vardha Technologies do?
AI: Vardha Technologies provides AI automation solutions for businesses.

USER: When was it founded?
AI: It was founded in 2020.

USER: What is the CEO's name?
AI: I'm sorry, I don't have that information.
"""


summary = generate_call_summary(transcript)

print("\nCALL SUMMARY")
print("====================")
print(summary)