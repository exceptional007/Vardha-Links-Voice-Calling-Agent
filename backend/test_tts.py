from app.services.tts_service import text_to_speech


audio = text_to_speech(
    "Hello, this is Vardha AI Voice Agent."
)

print("Audio bytes:", len(audio))

with open("test_audio.ulaw", "wb") as f:
    f.write(audio)

print("TTS test successful.")