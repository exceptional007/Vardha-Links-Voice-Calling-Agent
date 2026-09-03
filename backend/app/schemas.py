from datetime import datetime

from pydantic import BaseModel, ConfigDict

class KnowledgeBaseSelection(BaseModel):
    scope: str
    knowledge_base_id: int | None = None

class KnowledgeBaseCreate(BaseModel):
    title: str
    content: str

class KnowledgeBaseUpdate(BaseModel):
    title: str
    content: str

class KnowledgeBaseResponse(BaseModel):
    id: int
    title: str
    content: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
class CallResponse(BaseModel):
    id: int
    phone_number: str
    twilio_call_sid: str | None
    status: str
    duration_seconds: int | None
    recording_url: str | None
    transcript: str | None
    summary: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)