from app.services.llm_service import generate_ai_response
import time

knowledge_base = """
Vardha Technologies is an AI software company.

The company was founded in 2020.

The office is located in Bangalore, India.

The company provides AI automation solutions for businesses.
"""


questions = [
    "When was Vardha Technologies founded?",
    "Where is the office located?",
    "What does the company do?",
    "What is the CEO's name?",
]


print("\nCALLER:", questions[0])

answer = generate_ai_response(
    user_message=questions[0],
    knowledge_base=knowledge_base,
)
    
print("AI:", answer)

print("\nCALLER:", questions[1])

answer = generate_ai_response(
    user_message=questions[1],
    knowledge_base=knowledge_base,
)
    
print("AI:", answer)

print("\nCALLER:", questions[2])

answer = generate_ai_response(
    user_message=questions[2],
    knowledge_base=knowledge_base,
)
    
print("AI:", answer)

print("\nCALLER:", questions[3])

answer = generate_ai_response(
    user_message=questions[3],
    knowledge_base=knowledge_base,
)
    
print("AI:", answer)