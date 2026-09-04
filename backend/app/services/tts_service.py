import os

from dotenv import load_dotenv
from openai import OpenAI

try:
    import audioop
except ImportError:
    import audioop_lts as audioop

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY_VARDHA")


if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is not set")

client = OpenAI(api_key=OPENAI_API_KEY)


def text_to_speech(text: str) -> bytes:

    text = text.strip()

    if not text:
        return b""

    response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="marin",
        input=text,
        response_format="pcm",
        instructions="""
        Speak with a natural, professional Indian English accent.
        Use a warm and confident business-call tone.
        For Hindi, use natural Indian Hindi pronunciation.
        For Hinglish, naturally mix Hindi and English.
        Speak clearly and conversationally, not like a voice announcement.
        """
    )

    pcm_audio = response.read()

    return pcm_to_mulaw_8khz(pcm_audio)


def pcm_to_mulaw_8khz(pcm_audio: bytes) -> bytes:

    pcm_8khz, _ = audioop.ratecv(
        pcm_audio,
        2,      # sample width: 16-bit
        1,      # mono
        24000,  # input sample rate
        8000,   # output sample rate
        None,
    )

    # PCM -> mu-law
    mulaw_audio = audioop.lin2ulaw(
        pcm_8khz,
        2,
    )

    return mulaw_audio