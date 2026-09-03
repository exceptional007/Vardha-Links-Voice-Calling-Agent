import os

from twilio.rest import Client
from dotenv import load_dotenv


load_dotenv()


TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")


if not TWILIO_ACCOUNT_SID:
    raise ValueError("TWILIO_ACCOUNT_SID is not set")

if not TWILIO_AUTH_TOKEN:
    raise ValueError("TWILIO_AUTH_TOKEN is not set")

if not TWILIO_PHONE_NUMBER:
    raise ValueError("TWILIO_PHONE_NUMBER is not set")


client = Client(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
)


def create_call(
    to_number: str,
    webhook_url: str,
    status_callback_url: str,
    recording_status_callback_url: str,
):
    call = client.calls.create(
        to=to_number,
        from_=TWILIO_PHONE_NUMBER,
        url=webhook_url,
        status_callback=status_callback_url,
        status_callback_event=[
            "initiated",
            "ringing",
            "answered",
            "completed",
        ],
        record=True,
        recording_status_callback=recording_status_callback_url,
    )

    return call