from app.services.tts_service import text_to_speech


text = "Hello. This is a test of the Vardha AI voice agent."

audio = text_to_speech(text)

print(f"Audio generated successfully.")
print(f"Audio bytes: {len(audio)}")

with open("test_audio.ulaw", "wb") as file:
    file.write(audio)

print("Saved: test_audio.ulaw")