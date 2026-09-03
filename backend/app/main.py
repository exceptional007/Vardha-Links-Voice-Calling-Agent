from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models

from .routes.knowledge_base import router as knowledge_base_router
from .routes.calls import router as calls_router
from .routes.twillio import router as twillio_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vardha AI Voice Calling Agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knowledge_base_router)
app.include_router(calls_router)
app.include_router(twillio_router)

@app.get("/")
def root():
    return {
        "message": "Vardha AI Voice Calling Agent API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }