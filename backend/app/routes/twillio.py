import asyncio, json, base64, os

from fastapi import APIRouter, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from sqlalchemy.orm import Session
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream

from ..database import SessionLocal
from ..models import Call
from ..services.stt_service import create_deepgram_client
from ..services.llm_service import generate_ai_response
from ..services.tts_service import text_to_speech
from ..services.knowledge_base_service import  get_selected_knowledge_base_text
from ..services.summary_service import generate_call_summary

conversation_history = {}

router = APIRouter(
    tags=["Twilio"],
)

def build_transcript(history: list[dict]) -> str:
    lines = []

    for message in history:
        role = message["role"]

        if role == "user":
            speaker = "USER"
        else:
            speaker = "AI"

        lines.append(f"{speaker}: {message['content']}")

    return "\n".join(lines)

@router.post("/twiml/voice")
async def voice_webhook():
    response = VoiceResponse()

    response.say(
        "Hello. This is the Vardha AI Voice Agent. "
        "This is a test call. Thank you for answering."
    )
    
    base_url = os.getenv("PUBLIC_BASE_URL")
    
    if not base_url:
        raise ValueError("PUBLIC_BASE_URL is not set")
    
    ws_url = base_url.replace("https://", "wss://")
    
    connect = Connect()
    
    stream = Stream(
        url=f"{ws_url}/twilio/media-stream"
    )

    connect.append(stream)
    response.append(connect)

    return Response(
        content=str(response),
        media_type="application/xml",
    )

@router.websocket("/twilio/media-stream")
async def media_stream(websocket: WebSocket):
    await websocket.accept()

    print("================================")
    print("Twilio WebSocket connected")
    print("================================")

    call_history = []

    deepgram_client = create_deepgram_client()

    try:
        async with deepgram_client.listen.v1.connect(
            model="nova-3",
            language="en-US",
            encoding="mulaw",
            sample_rate=8000,
            channels=1,
            interim_results=True,
            smart_format=True,
            punctuate=True,
            endpointing=300,
        ) as deepgram:

            print("Deepgram WebSocket connected")

            async def receive_transcripts():
                try:
                    async for message in deepgram:
                        message_type = getattr(message, "type", "")

                        if message_type == "Results":
                            channel = getattr(message, "channel", None)

                            if not channel:
                                continue

                            alternatives = getattr(
                                channel,
                                "alternatives",
                                []
                            )

                            if not alternatives:
                                continue

                            transcript = getattr(
                                alternatives[0],
                                "transcript",
                                ""
                            )

                            transcript = transcript.strip()

                            if transcript:
                                is_final = getattr(
                                    message,
                                    "is_final",
                                    False
                                )

                                speech_final = getattr(
                                    message,
                                    "speech_final",
                                    False
                                )

                                if is_final:
                                    print(
                                        f"[FINAL] {transcript}"
                                    )
                                else:
                                    print(
                                        f"[INTERIM] {transcript}"
                                    )

                                if speech_final:
                                    print(f"[USER SAID] {transcript}")
                                    
                                    db = SessionLocal()

                                    try:
                                        knowledge_base = get_selected_knowledge_base_text(db)
                                    finally:
                                        db.close()

                                    ai_response = generate_ai_response( 
                                        user_message=transcript,
                                        knowledge_base=knowledge_base,
                                        conversation_history=call_history,
                                    )
                                    
                                    call_history.append({
                                        "role": "user",
                                        "content": transcript,
                                    })

                                    call_history.append({
                                        "role": "assistant",
                                        "content": ai_response,
                                    })

                                    print(f"[AI RESPONSE] {ai_response}")

                                    audio_data = text_to_speech(ai_response)

                                    if stream_sid and audio_data:
                                        audio_payload = base64.b64encode(audio_data).decode("utf-8")

                                        await websocket.send_text(
                                            json.dumps(
                                                {
                                                    "event": "media",
                                                    "streamSid": stream_sid,
                                                    "media": {
                                                        "payload": audio_payload
                                                    },
                                                }
                                            )
                                        )

                                        print("[TTS] Audio sent to Twilio")

                except asyncio.CancelledError:
                    pass

                except Exception as e:
                    print(
                        f"Deepgram receive error: {e}"
                    )

            transcript_task = asyncio.create_task(
                receive_transcripts()
            )

            try:
                
                stream_sid = None
                call_sid = None
                
                while True:
                    raw_message = await websocket.receive_text()

                    message = json.loads(raw_message)

                    event = message.get("event")

                    if event == "connected":
                        print(
                            "Twilio connection event received"
                        )

                    elif event == "start":
                        start_data = message.get(
                            "start",
                            {}
                        )

                        stream_sid = start_data.get(
                            "streamSid"
                        )
                        
                        call_sid = start_data.get(
                            "callSid"
                        )

                        print(
                            "Twilio Media Stream started"
                        )

                        print(
                            f"Stream SID: {stream_sid}"
                        )
                        
                        print(f"Call SID: {call_sid}")

                    elif event == "media":
                        media = message.get(
                            "media",
                            {}
                        )

                        payload = media.get(
                            "payload"
                        )

                        if payload:
                            audio_data = base64.b64decode(
                                payload
                            )

                            await deepgram.send_media(
                                audio_data
                            )

                    elif event == "stop":
                        print(
                            "Twilio Media Stream stopped"
                        )
                        transcript = build_transcript(call_history)

                        db = SessionLocal()

                        try:
                            if call_sid:
                                call = (
                                    db.query(Call)
                                    .filter(Call.twilio_call_sid == call_sid)
                                    .first()
                                )

                                if call:
                                    call.transcript = transcript
                                    
                                    if transcript.strip():
                                        call.summary = generate_call_summary(transcript)
                                        print(f"Summary generated for call {call.id}")

                                    db.commit()

                                    print(
                                        f"Transcript saved for call {call.id}"
                                    )
                                else:
                                    print(
                                        f"Call not found for transcript SID: {call_sid}"
                                    )

                        finally:
                            db.close()
                        break

            finally:
                transcript_task.cancel()

                try:
                    await transcript_task
                except asyncio.CancelledError:
                    pass

    except WebSocketDisconnect:
        print(
            "Twilio WebSocket disconnected"
        )

    except Exception as e:
        print(
            f"Media stream error: {e}"
        )

    finally:
        if call_history and call_sid:
            db = SessionLocal()

            try:
                call = (
                    db.query(Call)
                    .filter(Call.twilio_call_sid == call_sid)
                    .first()
                )

                if call:
                    transcript = build_transcript(call_history)

                    if not call.transcript:
                        call.transcript = transcript

                    if not call.summary and transcript.strip():
                        call.summary = generate_call_summary(transcript)

                    db.commit()

                    print(f"Final call data saved for call {call.id}")

            except Exception as e:
                print(f"Final call data save error: {e}")

            finally:
                db.close()

        print("Media stream finished")
        
@router.post("/twilio/status-callback")
async def status_callback(
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
    CallDuration: str | None = Form(None),
    RecordingUrl: str | None = Form(None),
):
    db = SessionLocal()

    try:
        # We'll connect Twilio CallSid to our database
        # record properly in the next step.

        call = (
            db.query(Call)
            .filter(Call.twilio_call_sid == CallSid)
            .first()
        )

        if not call:
            print(f"Call not found for SID: {CallSid}")

            return {
                "status": "call_not_found",
            }

        call.status = CallStatus

        if CallDuration:
            call.duration_seconds = int(CallDuration)

        if RecordingUrl:
            call.recording_url = RecordingUrl

        db.commit()

        print(
            f"Updated call {call.id}: "
            f"status={call.status}, "
            f"duration={call.duration_seconds}, "
            f"recording={call.recording_url}"
        )

        return {
            "status": "updated",
        }

    finally:
        db.close()
        
@router.post("/twilio/recording-callback")
async def recording_callback(
    CallSid: str = Form(...),
    RecordingUrl: str | None = Form(None),
    RecordingStatus: str | None = Form(None),
    RecordingDuration: str | None = Form(None),
):
    db: Session = SessionLocal()

    try:
        call = (
            db.query(Call)
            .filter(Call.twilio_call_sid == CallSid)
            .first()
        )

        if not call:
            print(f"Call not found for recording SID: {CallSid}")
            return {"status": "call_not_found"}

        if RecordingUrl:
            call.recording_url = RecordingUrl

        if RecordingDuration:
            call.duration_seconds = int(RecordingDuration)

        db.commit()

        print(
            f"Recording updated for call {call.id}: "
            f"status={RecordingStatus}, "
            f"url={call.recording_url}"
        )

        return {"status": "updated"}

    finally:
        db.close()