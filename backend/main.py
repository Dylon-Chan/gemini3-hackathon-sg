import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

Path("media/sessions").mkdir(parents=True, exist_ok=True)

app = FastAPI(title="SingFlix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
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
