import os

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

if not ELEVENLABS_API_KEY:
    raise ValueError("ELEVENLABS_API_KEY is not set")

if not ELEVENLABS_VOICE_ID:
    raise ValueError("ELEVENLABS_VOICE_ID is not set")


client = ElevenLabs(
    api_key=ELEVENLABS_API_KEY
)


def text_to_speech(text: str) -> bytes:
    """
    Convert text into 8 kHz μ-law audio suitable for Twilio.
    """

    audio_stream = client.text_to_speech.convert(
        voice_id=ELEVENLABS_VOICE_ID,
        text=text,
        model_id="eleven_flash_v2_5",
        output_format="ulaw_8000",
    )

    audio_chunks = []

    for chunk in audio_stream:
        if chunk:
            audio_chunks.append(chunk)

    return b"".join(audio_chunks)