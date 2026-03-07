import os
import uuid
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

load_dotenv()

Path("media/sessions").mkdir(parents=True, exist_ok=True)

app = FastAPI(title="SingFlix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type"],
)

app.mount("/media", StaticFiles(directory="media"), name="media")


@app.on_event("startup")
async def startup():
    loop = asyncio.get_event_loop()
    loop.set_default_executor(ThreadPoolExecutor(max_workers=20))


@app.get("/health")
async def health():
    return {"status": "ok", "app": "SingFlix"}


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    from backend import sessions as session_store, storage
    session_id = str(uuid.uuid4())
    data = await file.read()
    image_path = storage.save_upload(session_id, data, file.content_type or "image/jpeg")
    original_image_url = storage.media_url(image_path)
    await session_store.store.create(session_id, str(image_path), original_image_url)
    return {"session_id": session_id, "original_image_url": original_image_url}


@app.post("/api/process/{session_id}")
async def start_processing(session_id: str, background_tasks: BackgroundTasks):
    from backend import sessions as session_store
    session = await session_store.store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    from backend.pipeline import orchestrator
    background_tasks.add_task(orchestrator.run_pipeline, session_id)
    return {"status": "processing_started", "session_id": session_id}


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    from backend import sessions as session_store
    session = await session_store.store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session.model_dump(exclude={"image_path"})


@app.get("/api/events/{session_id}")
async def event_stream(session_id: str, request: Request):
    from backend import sessions as session_store
    session = await session_store.store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    q = await session_store.store.subscribe(session_id)

    async def generator():
        # Replay existing completed states for page-reload recovery
        current = await session_store.store.get(session_id)
        if current.location:
            yield {
                "event": "location_identified",
                "data": json.dumps(current.location.model_dump()),
            }
        for period, pstate in current.periods.items():
            if pstate.stage.value not in ("pending",):
                yield {
                    "event": "period_update",
                    "data": json.dumps(pstate.model_dump()),
                }

        # Stream new events
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(q.get(), timeout=25.0)
                yield {"event": event["event"], "data": json.dumps(event["data"])}
                if event["event"] == "session_complete":
                    break
            except asyncio.TimeoutError:
                yield {"event": "ping", "data": "{}"}

    return EventSourceResponse(
        generator(),
        headers={"X-Accel-Buffering": "no"},
    )
