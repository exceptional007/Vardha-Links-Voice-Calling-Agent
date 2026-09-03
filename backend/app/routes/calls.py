import os, requests

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Call
from ..schemas import CallResponse
from ..services.twilio_service import create_call


router = APIRouter(
    prefix="/calls",
    tags=["Calls"],
)


class CreateCallRequest(BaseModel):
    phone_number: str


@router.post("")
def make_call(
    data: CreateCallRequest,
    db: Session = Depends(get_db),
):
    base_url = os.getenv(
        "PUBLIC_BASE_URL",
        "http://localhost:8000",
    )

    call_record = Call(
        phone_number=data.phone_number,
        status="initiated",
    )

    db.add(call_record)
    db.commit()
    db.refresh(call_record)

    twilio_call = create_call(
        to_number=data.phone_number,
        webhook_url=f"{base_url}/twiml/voice",
        status_callback_url=f"{base_url}/twilio/status-callback",
        recording_status_callback_url=f"{base_url}/twilio/recording-callback",
    )

    call_record.twilio_call_sid = twilio_call.sid

    db.commit()
    db.refresh(call_record)

    return {
        "id": call_record.id,
        "twilio_call_sid": twilio_call.sid,
        "status": "initiated",
    }
    
@router.get(
    "",
    response_model=list[CallResponse],
)
def get_calls(
    db: Session = Depends(get_db),
):
    calls = (
        db.query(Call)
        .order_by(Call.id.desc())
        .all()
    )

    return calls

@router.get("/{call_id}/recording")
def get_recording(
    call_id: int,
    db: Session = Depends(get_db),
):
    call = (
        db.query(Call)
        .filter(Call.id == call_id)
        .first()
    )

    if not call:
        raise HTTPException(
            status_code=404,
            detail="Call not found",
        )

    if not call.recording_url:
        raise HTTPException(
            status_code=404,
            detail="Recording not available",
        )

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")

    if not account_sid or not auth_token:
        raise HTTPException(
            status_code=500,
            detail="Twilio credentials are not configured",
        )

    recording_url = call.recording_url

    if not recording_url.endswith(".mp3"):
        recording_url = f"{recording_url}.mp3"

    response = requests.get(
        recording_url,
        auth=(account_sid, auth_token),
        stream=True,
        timeout=30,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail="Unable to fetch recording from Twilio",
        )

    return StreamingResponse(
        response.iter_content(chunk_size=8192),
        media_type="audio/mpeg",
    )

@router.get(
    "/{call_id}",
    response_model=CallResponse,
)
def get_call(
    call_id: int,
    db: Session = Depends(get_db),
):
    call = (
        db.query(Call)
        .filter(Call.id == call_id)
        .first()
    )

    if not call:
        raise HTTPException(
            status_code=404,
            detail="Call not found",
        )

    return call