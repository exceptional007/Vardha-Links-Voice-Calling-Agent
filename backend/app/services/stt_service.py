import os

from dotenv import load_dotenv
from deepgram import AsyncDeepgramClient

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

if not DEEPGRAM_API_KEY:
    raise ValueError("DEEPGRAM_API_KEY is not set")


def create_deepgram_client():
    return AsyncDeepgramClient(api_key=DEEPGRAM_API_KEY)