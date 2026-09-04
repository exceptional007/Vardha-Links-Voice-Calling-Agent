import asyncio, json, base64, os

from fastapi import APIRouter, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from sqlalchemy.orm import Session
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from twilio.rest import Client as TwilioClient

try:
    import audioop
except ImportError:
    import audioop_lts as audioop

from ..database import SessionLocal
from ..models import Call
from ..services.stt_service import create_deepgram_client
from ..services.llm_service import generate_ai_response_stream, extract_end_call
from ..services.tts_service import text_to_speech
from ..services.knowledge_base_service import get_selected_knowledge_base_text, get_selected_knowledge_base
from ..services.summary_service import generate_call_summary

router = APIRouter(
    tags=["Twilio"],
)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")

twilio_client = (
    TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
    else None
)


def build_transcript(history: list[dict]) -> str:
    lines = []

    for message in history:
        role = message["role"]
        speaker = "USER" if role == "user" else "AI"
        lines.append(f"{speaker}: {message['content']}")

    return "\n".join(lines)


@router.post("/twiml/voice")
async def voice_webhook():

    response = VoiceResponse()

    base_url = os.getenv("PUBLIC_BASE_URL")

    if not base_url:
        raise ValueError("PUBLIC_BASE_URL is not set")

    ws_url = base_url.replace("https://", "wss://")

    connect = Connect()
    stream = Stream(url=f"{ws_url}/twilio/media-stream")
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

    call_history: list[dict] = []
    ai_speaking = False
    stream_sid = None
    call_sid = None

    speech_frames = 0

    tts_queue: asyncio.Queue = asyncio.Queue()
    
    active_chunks = 0

    pending_hangup_call_sid: str | None = None

    deepgram_client = create_deepgram_client()

    loop = asyncio.get_running_loop()

    def should_flush_text(buffer: str) -> bool:
        text = buffer.strip()

        if not text:
            return False

        if text.endswith((".", "?", "!", "।")):
            return True

        if len(text) >= 120:
            return True

        return False

    def queue_tts_chunk(text: str):
        
        nonlocal ai_speaking, active_chunks

        clean_text, ended = extract_end_call(text)

        if ended:
            nonlocal_holder["should_end"] = True

        if not clean_text:
            return

        active_chunks += 1
        ai_speaking = True
        tts_queue.put_nowait(clean_text)

    nonlocal_holder = {"should_end": False}

    async def run_llm_and_speak(user_message: str, knowledge_base: str) -> tuple[str, bool]:

        nonlocal_holder["should_end"] = False
        full_response_parts: list[str] = []

        def worker():
            text_buffer = ""

            for chunk in generate_ai_response_stream(
                user_message=user_message,
                knowledge_base=knowledge_base,
                conversation_history=call_history,
            ):
                if not chunk:
                    continue

                full_response_parts.append(chunk)
                text_buffer += chunk

                if should_flush_text(text_buffer):
                    tts_chunk, text_buffer = text_buffer.strip(), ""
                    print(f"[LLM CHUNK] {tts_chunk}")
                    loop.call_soon_threadsafe(queue_tts_chunk, tts_chunk)

            remaining_text = text_buffer.strip()

            if remaining_text:
                print(f"[LLM FINAL CHUNK] {remaining_text}")
                loop.call_soon_threadsafe(queue_tts_chunk, remaining_text)

        await asyncio.to_thread(worker)

        full_text = "".join(full_response_parts)
        clean_full_text, _ = extract_end_call(full_text)
        return clean_full_text.strip(), nonlocal_holder["should_end"]

    def clear_ai_audio_and_reset():

        nonlocal ai_speaking, active_chunks, speech_frames

        while not tts_queue.empty():
            try:
                tts_queue.get_nowait()
                tts_queue.task_done()
            except asyncio.QueueEmpty:
                break

        active_chunks = 0
        ai_speaking = False
        speech_frames = 0

    try:
        async with deepgram_client.listen.v1.connect(
            model="nova-3",
            language="multi",
            encoding="mulaw",
            sample_rate=8000,
            channels=1,
            interim_results=True,
            smart_format=True,
            punctuate=True,
            endpointing=300,
        ) as deepgram:

            print("Deepgram WebSocket connected")

            async def tts_worker():
                while True:
                    text = await tts_queue.get()

                    if text is None:
                        tts_queue.task_done()
                        break

                    try:
                        print(f"[TTS WORKER] Processing: {text}")

                        audio_data = await asyncio.to_thread(text_to_speech, text)

                        if not stream_sid or not audio_data:
                            continue

                        audio_payload = base64.b64encode(audio_data).decode("utf-8")

                        await websocket.send_text(
                            json.dumps({
                                "event": "media",
                                "streamSid": stream_sid,
                                "media": {"payload": audio_payload},
                            })
                        )

                        await websocket.send_text(
                            json.dumps({
                                "event": "mark",
                                "streamSid": stream_sid,
                                "mark": {"name": "ai_audio_finished"},
                            })
                        )

                        print(f"[TTS WORKER] Audio sent: {text}")

                    except asyncio.CancelledError:
                        raise

                    except Exception as e:
                        print(f"[TTS WORKER] Error: {e}")

                    finally:
                        tts_queue.task_done()

            tts_worker_task = asyncio.create_task(tts_worker())

            async def speak_greeting():

                db = SessionLocal()

                try:
                    selected_kb = get_selected_knowledge_base(db)
                finally:
                    db.close()

                if selected_kb:
                    greeting = (
                        f"Hello, I'm calling from {selected_kb.title}. "
                        "This is the Vardha AI Voice Agent, thanks for picking up."
                    )
                else:
                    greeting = (
                        "Hello, this is the Vardha AI Voice Agent, "
                        "thanks for picking up."
                    )

                call_history.append({"role": "assistant", "content": greeting})
                queue_tts_chunk(greeting)

            async def receive_transcripts():
                nonlocal ai_speaking, active_chunks, speech_frames, pending_hangup_call_sid

                try:
                    async for message in deepgram:
                        message_type = getattr(message, "type", "")

                        if message_type == "Results":
                            channel = getattr(message, "channel", None)

                            if not channel:
                                continue

                            alternatives = getattr(channel, "alternatives", [])

                            if not alternatives:
                                continue

                            transcript = getattr(alternatives[0], "transcript", "")
                            transcript = transcript.strip()

                            if transcript:
                                is_final = getattr(message, "is_final", False)
                                speech_final = getattr(message, "speech_final", False)

                                if is_final:
                                    print(f"[FINAL] {transcript}")
                                else:
                                    print(f"[INTERIM] {transcript}")

                                    if ai_speaking and transcript and stream_sid:
                                        try:
                                            await websocket.send_text(
                                                json.dumps({
                                                    "event": "clear",
                                                    "streamSid": stream_sid,
                                                })
                                            )
                                            print("[BARGE-IN] AI audio cleared")
                                            clear_ai_audio_and_reset()

                                        except Exception as e:
                                            print(f"[BARGE-IN] Error: {e}")

                                if speech_final:
                                    print(f"[USER SAID] {transcript}")

                                    db = SessionLocal()

                                    try:
                                        knowledge_base = get_selected_knowledge_base_text(db)
                                    finally:
                                        db.close()

                                    call_history.append({
                                        "role": "user",
                                        "content": transcript,
                                    })

                                    print("[LLM] Starting Gemini streaming...")

                                    try:
                                        full_ai_response, should_end = await run_llm_and_speak(
                                            transcript, knowledge_base
                                        )

                                        if full_ai_response:
                                            call_history.append({
                                                "role": "assistant",
                                                "content": full_ai_response,
                                            })

                                        print(f"[AI RESPONSE COMPLETE] {full_ai_response}")

                                        if should_end and call_sid:
                                            print(f"[CALL END] Model requested end of call for {call_sid}")
                                            pending_hangup_call_sid = call_sid

                                    except asyncio.CancelledError:
                                        print("[LLM] Streaming response cancelled")
                                        raise

                                    except Exception as e:
                                        print(f"[LLM] Streaming error: {e}")

                except asyncio.CancelledError:
                    pass

                except Exception as e:
                    print(f"Deepgram receive error: {e}")

            transcript_task = asyncio.create_task(receive_transcripts())

            try:
                while True:
                    raw_message = await websocket.receive_text()
                    message = json.loads(raw_message)
                    event = message.get("event")

                    if event == "connected":
                        print("Twilio connection event received")

                    elif event == "start":
                        start_data = message.get("start", {})
                        stream_sid = start_data.get("streamSid")
                        call_sid = start_data.get("callSid")

                        print("Twilio Media Stream started")
                        print(f"Stream SID: {stream_sid}")
                        print(f"Call SID: {call_sid}")

                        await speak_greeting()

                    elif event == "mark":
                        mark_data = message.get("mark", {})
                        mark_name = mark_data.get("name")

                        if mark_name == "ai_audio_finished":

                            if active_chunks > 0:
                                active_chunks -= 1

                            if active_chunks == 0:
                                ai_speaking = False
                                speech_frames = 0

                                print("[TTS] AI audio playback finished (all chunks played)")

                                if pending_hangup_call_sid and twilio_client:
                                    try:
                                        twilio_client.calls(pending_hangup_call_sid).update(
                                            status="completed"
                                        )
                                        print(
                                            f"[CALL END] Hung up {pending_hangup_call_sid} "
                                            "after farewell finished playing"
                                        )
                                    except Exception as e:
                                        print(f"[CALL END] Hangup failed: {e}")
                                    finally:
                                        pending_hangup_call_sid = None
                            else:
                                print(
                                    f"[TTS] Chunk finished, "
                                    f"{active_chunks} chunk(s) still pending"
                                )

                    elif event == "media":
                        media = message.get("media", {})
                        payload = media.get("payload")

                        if payload:
                            audio_data = base64.b64decode(payload)

                            if ai_speaking:
                                try:
                                    pcm_audio = audioop.ulaw2lin(audio_data, 2)
                                    rms = audioop.rms(pcm_audio, 2)

                                    if rms > 500:
                                        speech_frames += 1
                                    else:
                                        speech_frames = 0

                                    if speech_frames >= 3:
                                        print(f"[FAST BARGE-IN] Caller speech detected (RMS={rms})")

                                        if stream_sid:
                                            await websocket.send_text(
                                                json.dumps({
                                                    "event": "clear",
                                                    "streamSid": stream_sid,
                                                })
                                            )

                                        print("[BARGE-IN] AI audio cleared immediately")
                                        clear_ai_audio_and_reset()

                                except Exception as e:
                                    print(f"[BARGE-IN] VAD error: {e}")

                            await deepgram.send_media(audio_data)

                    elif event == "stop":
                        print("Twilio Media Stream stopped")
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
                                    print(f"Transcript saved for call {call.id}")
                                else:
                                    print(f"Call not found for transcript SID: {call_sid}")

                        finally:
                            db.close()

                        break

            finally:
                transcript_task.cancel()

                try:
                    await transcript_task
                except asyncio.CancelledError:
                    pass

                await tts_queue.put(None)

                try:
                    await tts_worker_task
                except asyncio.CancelledError:
                    pass

    except WebSocketDisconnect:
        print("Twilio WebSocket disconnected")

    except Exception as e:
        print(f"Media stream error: {e}")

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
        call = (
            db.query(Call)
            .filter(Call.twilio_call_sid == CallSid)
            .first()
        )

        if not call:
            print(f"Call not found for SID: {CallSid}")
            return {"status": "call_not_found"}

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

        return {"status": "updated"}

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