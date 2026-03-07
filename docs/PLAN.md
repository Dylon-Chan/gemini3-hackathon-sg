# SingFlix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build SingFlix — a Singapore time-travel web app where users upload a photo, AI identifies the location, researches history/future, generates reference images, and creates Veo 3 videos for 6 time periods (1925, 1965, 1985, Present, 2040, 2070) shown on a dark cinematic timeline.

**Architecture:** Next.js 15 frontend + FastAPI (Python) backend with a fully parallel AI pipeline: Gemini 3 Pro for location analysis and web research (with Google Search grounding), Gemini 3 Pro Image for reference frame generation, and Veo 3 for video generation. Real-time progress streamed via Server-Sent Events.

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS, FastAPI, Python 3.11+, google-genai SDK, sse-starlette, Veo 3 API, asyncio

---

## Task 1: Project Scaffold

**Files:**
- Create: `frontend/` (Next.js 15 app)
- Create: `backend/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `docs/plans/2026-03-07-singflix-design.md`

**Step 1: Create docs directory and save design doc**

```bash
mkdir -p docs/plans
```

Save `docs/plans/2026-03-07-singflix-design.md` with design decisions (app name, stack, time periods, pipeline strategy, UI theme — see context above).

**Step 2: Scaffold Next.js frontend**

```bash
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

**Step 3: Create backend structure**

```bash
mkdir -p backend/pipeline backend/prompts media/sessions
touch backend/__init__.py backend/pipeline/__init__.py backend/prompts/__init__.py
```

**Step 4: Create `backend/requirements.txt`**

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
python-multipart>=0.0.9
sse-starlette>=2.1.0
google-genai>=0.8.0
google-cloud-aiplatform>=1.60.0
pillow>=10.0.0
aiofiles>=23.0.0
python-dotenv>=1.0.0
httpx>=0.27.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

**Step 5: Create `backend/.env.example`**

```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-pro
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation
VEO_MODEL=veo-3.0-generate-001
USE_VERTEX_AI=false
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
VEO_OUTPUT_GCS_BUCKET=singflix-videos
GEMINI_CONCURRENCY=3
VEO_POLL_INTERVAL_SECONDS=10
VEO_MAX_POLL_ATTEMPTS=60
```

**Step 6: Copy `.env.example` to `.env` and fill in your API keys**

```bash
cp backend/.env.example backend/.env
```

**Step 7: Install backend dependencies**

```bash
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

**Step 8: Create minimal `backend/main.py`**

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pathlib import Path

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


@app.get("/health")
async def health():
    return {"status": "ok", "app": "SingFlix"}
```

**Step 9: Start backend and verify health endpoint**

```bash
cd backend && uvicorn main:app --reload --port 8000
# In another terminal:
curl http://localhost:8000/health
# Expected: {"status":"ok","app":"SingFlix"}
```

**Step 10: Verify Next.js starts**

```bash
cd frontend && npm run dev
# Visit http://localhost:3000 — should show Next.js default page
```

**Step 11: Commit**

```bash
git add .
git commit -m "feat: initial SingFlix scaffold — Next.js + FastAPI health check"
```

---

## Task 2: Pydantic Models

**Files:**
- Create: `backend/models.py`

**Step 1: Write `backend/models.py`**

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum

PERIODS = ["1925", "1965", "1985", "present", "2040", "2070"]
PeriodLiteral = Literal["1925", "1965", "1985", "present", "2040", "2070"]

class Stage(str, Enum):
    PENDING = "pending"
    RESEARCHING = "researching"
    IMAGE_GENERATING = "image_generating"
    VIDEO_GENERATING = "video_generating"
    COMPLETE = "complete"
    ERROR = "error"


class Coordinates(BaseModel):
    lat: float
    lng: float


class LocationAnalysis(BaseModel):
    location_name: str
    coordinates: Coordinates
    confidence: float = Field(ge=0.0, le=1.0)
    neighborhood: str
    landmark_type: str
    notable_features: list[str]
    description: str


class ResearchResult(BaseModel):
    period: str
    summary: str
    key_visual_facts: list[str]
    atmosphere: str
    architectural_style: str
    street_level_details: str
    sources_used: list[str] = []


class PeriodState(BaseModel):
    period: str
    stage: Stage = Stage.PENDING
    research_summary: Optional[str] = None
    key_visual_facts: Optional[list[str]] = None
    reference_image_url: Optional[str] = None
    video_url: Optional[str] = None
    video_prompt: Optional[str] = None
    error_message: Optional[str] = None


class SessionState(BaseModel):
    session_id: str
    image_path: str
    original_image_url: str
    status: str = "uploaded"
    location: Optional[LocationAnalysis] = None
    periods: dict[str, PeriodState] = Field(default_factory=dict)

    model_config = {"arbitrary_types_allowed": True}
```

**Step 2: Write tests for models**

Create `backend/tests/__init__.py` (empty) and `backend/tests/test_models.py`:

```python
from backend.models import SessionState, PeriodState, Stage, PERIODS, LocationAnalysis, Coordinates


def test_session_state_defaults():
    s = SessionState(session_id="abc", image_path="/tmp/img.jpg", original_image_url="/media/img.jpg")
    assert s.status == "uploaded"
    assert s.location is None
    assert s.periods == {}


def test_period_state_defaults():
    p = PeriodState(period="1925")
    assert p.stage == Stage.PENDING
    assert p.video_url is None


def test_periods_list():
    assert "present" in PERIODS
    assert len(PERIODS) == 6


def test_coordinates_validation():
    c = Coordinates(lat=1.2840, lng=103.8510)
    assert c.lat == 1.2840
```

**Step 3: Run tests**

```bash
cd backend && python -m pytest tests/test_models.py -v
# Expected: 4 tests PASS
```

**Step 4: Commit**

```bash
git add backend/models.py backend/tests/
git commit -m "feat: add Pydantic models for session, period, location"
```

---

## Task 3: Session Store + Storage

**Files:**
- Create: `backend/sessions.py`
- Create: `backend/storage.py`
- Create: `backend/tests/test_sessions.py`

**Step 1: Write `backend/storage.py`**

```python
import os
import uuid
from pathlib import Path

MEDIA_ROOT = Path("media/sessions")


def save_upload(session_id: str, data: bytes, content_type: str) -> Path:
    ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
    session_dir = MEDIA_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    path = session_dir / f"upload.{ext}"
    path.write_bytes(data)
    return path


def save_image(session_id: str, period: str, data: bytes) -> Path:
    path = MEDIA_ROOT / session_id / f"{period}_reference.png"
    path.write_bytes(data)
    return path


def save_video(session_id: str, period: str, data: bytes) -> Path:
    path = MEDIA_ROOT / session_id / f"{period}_video.mp4"
    path.write_bytes(data)
    return path


def media_url(path: Path) -> str:
    """Convert local path to URL served by FastAPI /media mount."""
    return "/" + str(path)
```

**Step 2: Write `backend/sessions.py`**

```python
import asyncio
from typing import Optional
from backend.models import SessionState, PeriodState, Stage, PERIODS, LocationAnalysis, ResearchResult
import json


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, SessionState] = {}
        self._queues: dict[str, asyncio.Queue] = {}
        self._lock = asyncio.Lock()

    async def create(self, session_id: str, image_path: str, original_image_url: str) -> SessionState:
        async with self._lock:
            state = SessionState(
                session_id=session_id,
                image_path=image_path,
                original_image_url=original_image_url,
                periods={p: PeriodState(period=p) for p in PERIODS},
            )
            self._sessions[session_id] = state
            self._queues[session_id] = asyncio.Queue(maxsize=200)
            return state

    async def get(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    async def update_location(self, session_id: str, location: LocationAnalysis):
        async with self._lock:
            self._sessions[session_id].location = location

    async def update_period(self, session_id: str, period: str, **kwargs):
        async with self._lock:
            state = self._sessions[session_id].periods[period]
            for k, v in kwargs.items():
                if hasattr(state, k):
                    setattr(state, k, v)

    async def emit(self, session_id: str, event: str, data: dict):
        q = self._queues.get(session_id)
        if q:
            await q.put({"event": event, "data": data})

    async def subscribe(self, session_id: str) -> Optional[asyncio.Queue]:
        return self._queues.get(session_id)

    def all_periods_done(self, session_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session:
            return False
        return all(
            p.stage in (Stage.COMPLETE, Stage.ERROR)
            for p in session.periods.values()
        )


store = SessionStore()
```

**Step 3: Write tests**

`backend/tests/test_sessions.py`:

```python
import asyncio
import pytest
from backend.sessions import SessionStore
from backend.models import Stage


@pytest.mark.asyncio
async def test_create_session():
    s = SessionStore()
    state = await s.create("test-1", "/tmp/img.jpg", "/media/sessions/test-1/upload.jpg")
    assert state.session_id == "test-1"
    assert len(state.periods) == 6
    assert state.periods["1925"].stage == Stage.PENDING


@pytest.mark.asyncio
async def test_update_period():
    s = SessionStore()
    await s.create("test-2", "/tmp/img.jpg", "/media/sessions/test-2/upload.jpg")
    await s.update_period("test-2", "1925", stage=Stage.RESEARCHING, research_summary="Colonial Singapore")
    state = await s.get("test-2")
    assert state.periods["1925"].stage == Stage.RESEARCHING
    assert state.periods["1925"].research_summary == "Colonial Singapore"


@pytest.mark.asyncio
async def test_emit_and_subscribe():
    s = SessionStore()
    await s.create("test-3", "/tmp/img.jpg", "/media/img.jpg")
    await s.emit("test-3", "period_update", {"period": "1925", "stage": "researching"})
    q = await s.subscribe("test-3")
    event = await asyncio.wait_for(q.get(), timeout=1.0)
    assert event["event"] == "period_update"
    assert event["data"]["period"] == "1925"


@pytest.mark.asyncio
async def test_all_periods_done():
    s = SessionStore()
    await s.create("test-4", "/tmp/img.jpg", "/media/img.jpg")
    assert not s.all_periods_done("test-4")
    for p in ["1925", "1965", "1985", "present", "2040", "2070"]:
        await s.update_period("test-4", p, stage=Stage.COMPLETE)
    assert s.all_periods_done("test-4")
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest tests/test_sessions.py -v
# Expected: 4 tests PASS
```

**Step 5: Commit**

```bash
git add backend/sessions.py backend/storage.py backend/tests/test_sessions.py
git commit -m "feat: add session store with asyncio.Queue fan-out and storage utils"
```

---

## Task 4: Upload Endpoint + SSE Infrastructure

**Files:**
- Modify: `backend/main.py`

**Step 1: Update `backend/main.py` with upload + SSE endpoints**

```python
import os
import uuid
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv
from pathlib import Path
from backend import sessions as session_store, storage

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


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())
    data = await file.read()
    image_path = storage.save_upload(session_id, data, file.content_type or "image/jpeg")
    original_image_url = storage.media_url(image_path)
    await session_store.store.create(session_id, str(image_path), original_image_url)
    return {"session_id": session_id, "original_image_url": original_image_url}


@app.post("/api/process/{session_id}")
async def start_processing(session_id: str, background_tasks: BackgroundTasks):
    session = await session_store.store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    from backend.pipeline import orchestrator
    background_tasks.add_task(orchestrator.run_pipeline, session_id)
    return {"status": "processing_started", "session_id": session_id}


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    session = await session_store.store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session.model_dump(exclude={"image_path"})


@app.get("/api/events/{session_id}")
async def event_stream(session_id: str, request: Request):
    session = await session_store.store.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    q = await session_store.store.subscribe(session_id)

    async def generator():
        # Replay completed period states for page-reload recovery
        current = await session_store.store.get(session_id)
        for period, pstate in current.periods.items():
            if pstate.stage.value not in ("pending",):
                yield {
                    "event": "period_update",
                    "data": json.dumps(pstate.model_dump()),
                }
        if current.location:
            yield {
                "event": "location_identified",
                "data": json.dumps(current.location.model_dump()),
            }

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
```

**Step 2: Create stub pipeline orchestrator so import doesn't fail**

Create `backend/pipeline/orchestrator.py`:

```python
import asyncio
from backend import sessions as session_store


async def run_pipeline(session_id: str):
    """Stub — emits fake events for SSE testing."""
    from backend.models import PERIODS, Stage
    for period in PERIODS:
        await asyncio.sleep(0.5)
        await session_store.store.update_period(session_id, period, stage=Stage.COMPLETE)
        await session_store.store.emit(session_id, "period_update", {
            "period": period,
            "stage": "complete",
            "research_summary": f"Test summary for {period}",
        })
    await session_store.store.emit(session_id, "session_complete", {})
```

**Step 3: Restart backend and test upload**

```bash
# Test upload (use any JPEG image)
curl -X POST http://localhost:8000/api/upload \
  -F "file=@/path/to/test_image.jpg" \
  -H "Accept: application/json"
# Expected: {"session_id":"<uuid>","original_image_url":"/media/sessions/<uuid>/upload.jpg"}
```

**Step 4: Test SSE stream**

```bash
# Replace <session_id> with the one from step 3
curl -N http://localhost:8000/api/events/<session_id>
# Then in another terminal:
curl -X POST http://localhost:8000/api/process/<session_id>
# Should see period_update events streaming in
```

**Step 5: Commit**

```bash
git add backend/main.py backend/pipeline/orchestrator.py
git commit -m "feat: upload endpoint, SSE event stream, stub pipeline orchestrator"
```

---

## Task 5: Location Analyzer

**Files:**
- Create: `backend/pipeline/analyzer.py`
- Create: `backend/prompts/analysis.py`
- Create: `backend/tests/test_analyzer.py`

**Step 1: Write `backend/prompts/analysis.py`**

```python
LOCATION_ANALYSIS_PROMPT = """
You are an expert on Singapore's urban geography, architecture, and landmarks.

Analyze this photograph and identify the Singapore location depicted.

Return ONLY a JSON object with exactly these fields:
{
  "location_name": "Full descriptive name (e.g. 'Raffles Place MRT Station, Central Business District')",
  "coordinates": {"lat": 1.2840, "lng": 103.8510},
  "confidence": 0.92,
  "neighborhood": "CBD / Chinatown / Orchard / Toa Payoh / etc.",
  "landmark_type": "MRT station / shophouse / HDB estate / colonial building / park / etc.",
  "notable_features": ["list", "of", "visible", "features", "in", "the", "image"],
  "description": "2-sentence description of what is shown in the photograph"
}

Rules:
- Coordinates MUST be within Singapore bounds: lat 1.15–1.48, lng 103.6–104.1
- If you cannot identify a specific location, use your best estimate and set confidence below 0.5
- Be specific: prefer "Tanjong Pagar Railway Station" over "a train station"
- notable_features should describe what is VISUALLY present (architecture, signage, vegetation, people, vehicles)
"""
```

**Step 2: Write `backend/pipeline/analyzer.py`**

```python
import asyncio
import os
from pathlib import Path
from google import genai
from google.genai import types
from backend.models import LocationAnalysis
from backend.prompts.analysis import LOCATION_ANALYSIS_PROMPT


async def analyze_location(image_path: str) -> LocationAnalysis:
    """Extract location name and coordinates from uploaded image using Gemini Vision."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

    image_bytes = Path(image_path).read_bytes()
    ext = Path(image_path).suffix.lower()
    mime = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime),
            LOCATION_ANALYSIS_PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=LocationAnalysis,
        ),
    )
    return response.parsed
```

**Step 3: Write mock-based test**

`backend/tests/test_analyzer.py`:

```python
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from backend.pipeline.analyzer import analyze_location
from backend.models import LocationAnalysis, Coordinates


@pytest.mark.asyncio
async def test_analyze_location_returns_location_analysis():
    mock_location = LocationAnalysis(
        location_name="Marina Bay Sands, Marina Bay",
        coordinates=Coordinates(lat=1.2840, lng=103.8607),
        confidence=0.95,
        neighborhood="Marina Bay",
        landmark_type="integrated resort",
        notable_features=["three towers", "rooftop pool", "waterfront"],
        description="Marina Bay Sands integrated resort with iconic three towers.",
    )

    mock_response = MagicMock()
    mock_response.parsed = mock_location

    with patch("backend.pipeline.analyzer.genai.Client") as MockClient:
        mock_client = MockClient.return_value
        mock_client.models.generate_content.return_value = mock_response

        result = await analyze_location("/tmp/test.jpg")

    assert result.location_name == "Marina Bay Sands, Marina Bay"
    assert result.coordinates.lat == 1.2840
    assert result.confidence == 0.95
```

**Step 4: Run test**

```bash
cd backend && python -m pytest tests/test_analyzer.py -v
# Expected: PASS (mock bypasses real API call)
```

**Step 5: Commit**

```bash
git add backend/pipeline/analyzer.py backend/prompts/analysis.py backend/tests/test_analyzer.py
git commit -m "feat: location analyzer using Gemini Vision with structured JSON output"
```

---

## Task 6: Period Researcher

**Files:**
- Create: `backend/pipeline/researcher.py`
- Create: `backend/prompts/research.py`

**Step 1: Write `backend/prompts/research.py`**

```python
PERIOD_CONTEXT = {
    "1925": {
        "era": "British colonial Singapore, Straits Settlements era",
        "focus": "colonial architecture, immigrant communities (Chinese, Indian, Malay), kampong life, trade port activity",
        "sources_hint": "NAS (National Archives Singapore) photo archives, Survey Department maps, colonial-era Straits Times",
        "time_descriptor": "the year 1925",
    },
    "1965": {
        "era": "Singapore's independence year, early PAP governance under Lee Kuan Yew",
        "focus": "post-independence urban reality, early HDB resettlement, kampong clearances, industrial beginnings",
        "sources_hint": "NAS photo archives, Singapore History Gallery records, early Singapore newspapers",
        "time_descriptor": "the year 1965, Singapore's independence year",
    },
    "1985": {
        "era": "Singapore's rapid modernisation era, economic recession recovery period",
        "focus": "MRT construction, Orchard Road commercial development, conservation shophouses policy, modern HDB estates",
        "sources_hint": "URA conservation records, Straits Times 1985 archives, early MRT construction documentation",
        "time_descriptor": "the year 1985",
    },
    "present": {
        "era": "Contemporary Singapore 2024-2025",
        "focus": "current urban character, recent developments, mix of heritage and modern",
        "sources_hint": "OneMap Singapore, StreetDirectory, recent news and Google Maps",
        "time_descriptor": "present day (2024-2025)",
    },
    "2040": {
        "era": "Near-future Singapore guided by URA Master Plan 2040 and Long-Term Plan Review",
        "focus": "URA Long-Term Plan Review 2021, green corridors, sea-level adaptation, car-lite neighbourhoods",
        "sources_hint": "URA Long-Term Plan Review 2021, BCA Green Building Masterplan, Singapore Green Plan 2030",
        "time_descriptor": "the year 2040 based on URA Master Plan projections",
    },
    "2070": {
        "era": "Long-term future Singapore with advanced climate adaptation",
        "focus": "sea-level rise mitigation infrastructure, post-car urban form, vertical greenery, demographic changes",
        "sources_hint": "Singapore's Third National Climate Change Study, Centre for Liveable Cities research, URA planning reports",
        "time_descriptor": "the year 2070 based on long-range urban and climate projections",
    },
}


def build_research_prompt(location_name: str, neighborhood: str, landmark_type: str, period: str) -> str:
    ctx = PERIOD_CONTEXT[period]
    return f"""
You are a Singapore urban historian and futurist with access to Google Search.

Research what this specific location looked like during {ctx['time_descriptor']}.

Location: {location_name}
Neighborhood: {neighborhood}
Type: {landmark_type}

Era context: {ctx['era']}
Research focus: {ctx['focus']}
Recommended sources to search: {ctx['sources_hint']}

Use Google Search to find information about this EXACT location in {period}.
Search queries to try:
- "{location_name} {period}"
- "{neighborhood} Singapore {period} history"
- "Singapore {period} {landmark_type} urban development"

Return ONLY a JSON object with these exact fields:
{{
  "period": "{period}",
  "summary": "3-4 sentences vividly describing the location in {period}. Be specific about what existed then.",
  "key_visual_facts": ["5-7 specific visual details: materials, colors, signage, people, vehicles, vegetation, skyline"],
  "atmosphere": "One sentence describing the mood and sensory atmosphere for video generation",
  "architectural_style": "Dominant architectural vocabulary at this location in {period}",
  "street_level_details": "What a pedestrian standing here would see and experience in {period}",
  "sources_used": ["list of actual source names/URLs found"]
}}
"""
```

**Step 2: Write `backend/pipeline/researcher.py`**

```python
import asyncio
import os
from google import genai
from google.genai import types
from backend.models import LocationAnalysis, ResearchResult
from backend.prompts.research import build_research_prompt

_semaphore: asyncio.Semaphore | None = None


def get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        concurrency = int(os.getenv("GEMINI_CONCURRENCY", "3"))
        _semaphore = asyncio.Semaphore(concurrency)
    return _semaphore


async def research_period(location: LocationAnalysis, period: str) -> ResearchResult:
    """Research what a Singapore location looked like during a specific period."""
    async with get_semaphore():
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
        search_tool = types.Tool(google_search=types.GoogleSearch())

        prompt = build_research_prompt(
            location_name=location.location_name,
            neighborhood=location.neighborhood,
            landmark_type=location.landmark_type,
            period=period,
        )

        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[search_tool],
                response_mime_type="application/json",
                response_schema=ResearchResult,
            ),
        )
        return response.parsed
```

**Step 3: Commit**

```bash
git add backend/pipeline/researcher.py backend/prompts/research.py
git commit -m "feat: period researcher using Gemini + Google Search grounding"
```

---

## Task 7: Reference Image Generator

**Files:**
- Create: `backend/pipeline/imager.py`
- Create: `backend/prompts/imaging.py`

**Step 1: Write `backend/prompts/imaging.py`**

```python
PERIOD_VISUAL_STYLE = {
    "1925": "aged sepia-toned photograph style, soft warm golden tones, visible grain texture, colonial-era aesthetic",
    "1965": "1960s documentary photograph style, slightly faded Kodachrome colors, mid-century aesthetic, slightly overexposed",
    "1985": "1980s color photograph style, vivid but slightly oversaturated, sharp consumer film quality",
    "present": "modern HDR digital photography, sharp, high contrast, contemporary Singapore aesthetics",
    "2040": "near-future architectural visualization, lush biophilic design, integrated greenery, clean Scandinavian-Asian lines",
    "2070": "speculative future cityscape render, advanced sustainable architecture, dramatic sky, futuristic but organic",
}


def build_imaging_prompt(
    location_name: str,
    period: str,
    research_summary: str,
    key_visual_facts: list[str],
    atmosphere: str,
    architectural_style: str,
    street_level_details: str,
) -> str:
    style = PERIOD_VISUAL_STYLE[period]
    facts_str = "\n".join(f"  - {f}" for f in key_visual_facts)

    return f"""
Generate a photorealistic, cinematic 16:9 image of {location_name} in Singapore during the year {period}.

Visual photographic style: {style}

Historical/future context from research:
Summary: {research_summary}
Key visual elements to include:
{facts_str}
Atmosphere: {atmosphere}
Architectural style: {architectural_style}
Street level: {street_level_details}

Composition requirements:
- Camera at eye level or very slight elevation (1-2 metres above ground)
- Show the full architectural character and surrounding streetscape
- Include period-appropriate people, vehicles, signage, and vegetation
- Singapore tropical sky: partly cloudy, humid atmospheric haze, warm light
- Suitable as a video generation reference frame: clear foreground and background separation
- No text watermarks, no UI elements, no borders

Strict period accuracy:
- Year {period}: ONLY show architecture, technology, fashion, signage, vehicles from {period} or earlier
- NO anachronistic elements whatsoever
- High photorealistic detail, film quality composition
"""
```

**Step 2: Write `backend/pipeline/imager.py`**

```python
import asyncio
import os
from pathlib import Path
from google import genai
from google.genai import types
from backend.models import ResearchResult, LocationAnalysis
from backend.prompts.imaging import build_imaging_prompt
from backend import storage


def _extract_image_bytes(response) -> bytes:
    """Extract image bytes from Gemini response, with fallback for SDK version differences."""
    try:
        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                return part.inline_data.data
    except (AttributeError, IndexError):
        pass
    # Fallback: try response.parts directly
    if hasattr(response, "parts"):
        for part in response.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                return part.inline_data.data
    raise ValueError("No image data found in Gemini response")


async def generate_reference_image(
    location: LocationAnalysis,
    period: str,
    research: ResearchResult,
    session_id: str,
) -> Path:
    """Generate a reference image for a time period. Returns local file path."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-exp-image-generation")

    prompt = build_imaging_prompt(
        location_name=location.location_name,
        period=period,
        research_summary=research.summary,
        key_visual_facts=research.key_visual_facts,
        atmosphere=research.atmosphere,
        architectural_style=research.architectural_style,
        street_level_details=research.street_level_details,
    )

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    image_bytes = _extract_image_bytes(response)
    path = storage.save_image(session_id, period, image_bytes)
    return path
```

**Step 3: Commit**

```bash
git add backend/pipeline/imager.py backend/prompts/imaging.py
git commit -m "feat: reference image generator using Gemini Image model"
```

---

## Task 8: Veo 3 Video Generator

**Files:**
- Create: `backend/pipeline/videomaker.py`
- Create: `backend/prompts/video.py`

**Step 1: Write `backend/prompts/video.py`**

```python
PERIOD_MOTION_STYLE = {
    "1925": "Camera slowly pans left to right, golden afternoon light, vintage film grain flicker, contemplative pace",
    "1965": "Gentle documentary zoom-in toward the scene, natural lighting, observational style",
    "1985": "Medium dolly shot moving slowly forward, warm Singapore afternoon light, active street energy",
    "present": "Smooth cinematic tracking shot at pedestrian height, modern ambient sounds, dynamic city life",
    "2040": "Fluid forward motion through integrated nature and architecture, soft diffused light, futuristic calm",
    "2070": "Sweeping reveal pan from right to left, dramatic sky, advanced sustainable urban environment",
}


def build_video_prompt_generation_prompt(
    location_name: str,
    period: str,
    research_summary: str,
    atmosphere: str,
    street_level_details: str,
) -> str:
    motion = PERIOD_MOTION_STYLE[period]
    return f"""
Write a Veo 3 video generation prompt for a 6-second cinematic clip.

Location: {location_name}, Singapore, year {period}
Research summary: {research_summary}
Atmosphere: {atmosphere}
Street level scene: {street_level_details}
Camera movement style: {motion}

The video prompt MUST:
1. Open with the camera movement description
2. Describe the scene in vivid sensory and visual detail
3. Specify Singapore tropical lighting conditions
4. Include ambient sound cues (Veo 3 generates audio — be specific: hawker chatter, rain, construction, birds)
5. Describe people and their period-appropriate activities
6. End with the emotional/cinematic tone
7. Be exactly 3-5 sentences
8. NOT include any text overlays, titles, or post-processing effect descriptions
9. Only describe what would be in the {period} time period

Output ONLY the video prompt text. No preamble, no explanation, no quotes.
"""
```

**Step 2: Write `backend/pipeline/videomaker.py`**

```python
import asyncio
import os
from pathlib import Path
from google import genai
from google.genai import types
from google.genai.types import GenerateVideosConfig
from backend.models import LocationAnalysis, ResearchResult
from backend.prompts.video import build_video_prompt_generation_prompt
from backend import storage

POLL_INTERVAL = int(os.getenv("VEO_POLL_INTERVAL_SECONDS", "10"))
MAX_POLL_ATTEMPTS = int(os.getenv("VEO_MAX_POLL_ATTEMPTS", "60"))


async def generate_video_prompt(
    location: LocationAnalysis,
    period: str,
    research: ResearchResult,
) -> str:
    """Use Gemini to write a Veo-optimized video prompt from research data."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

    meta_prompt = build_video_prompt_generation_prompt(
        location_name=location.location_name,
        period=period,
        research_summary=research.summary,
        atmosphere=research.atmosphere,
        street_level_details=research.street_level_details,
    )

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=model,
        contents=meta_prompt,
    )
    return response.text.strip()


async def generate_video(
    session_id: str,
    period: str,
    reference_image_path: Path,
    video_prompt: str,
) -> Path:
    """Call Veo 3 with reference image + prompt. Poll to completion. Return MP4 path."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = os.getenv("VEO_MODEL", "veo-3.0-generate-001")

    image_bytes = reference_image_path.read_bytes()

    # Submit video generation job
    operation = await asyncio.to_thread(
        client.models.generate_videos,
        model=model,
        prompt=video_prompt,
        image=types.Image(
            image_bytes=image_bytes,
            mime_type="image/png",
        ),
        config=GenerateVideosConfig(
            aspect_ratio="16:9",
            duration_seconds=6,
            number_of_videos=1,
        ),
    )

    # Poll with bounded attempts
    attempts = 0
    while not operation.done:
        attempts += 1
        if attempts >= MAX_POLL_ATTEMPTS:
            raise TimeoutError(
                f"Veo 3 generation timed out after {MAX_POLL_ATTEMPTS * POLL_INTERVAL}s for period {period}"
            )
        await asyncio.sleep(POLL_INTERVAL)
        operation = await asyncio.to_thread(operation.refresh)

    # Extract video bytes (Gemini API path) or download from GCS (Vertex AI path)
    use_vertex = os.getenv("USE_VERTEX_AI", "false").lower() == "true"
    if use_vertex:
        video_bytes = await _download_gcs(operation.result.generated_videos[0].video.uri)
    else:
        video_bytes = operation.result.generated_videos[0].video.video_bytes

    return storage.save_video(session_id, period, video_bytes)


async def _download_gcs(gcs_uri: str) -> bytes:
    """Download video from GCS URI when using Vertex AI."""
    from google.cloud import storage as gcs
    bucket_name, blob_path = gcs_uri.replace("gs://", "").split("/", 1)
    gcs_client = gcs.Client()
    bucket = gcs_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    return await asyncio.to_thread(blob.download_as_bytes)
```

**Step 3: Commit**

```bash
git add backend/pipeline/videomaker.py backend/prompts/video.py
git commit -m "feat: Veo 3 video generator with async polling and GCS/direct bytes fallback"
```

---

## Task 9: Pipeline Orchestrator (Wire Everything Together)

**Files:**
- Modify: `backend/pipeline/orchestrator.py`

**Step 1: Replace stub with real orchestrator**

```python
import asyncio
from pathlib import Path
from backend import sessions as session_store
from backend.models import Stage, PERIODS
from backend.pipeline import analyzer, researcher, imager, videomaker


async def run_pipeline(session_id: str):
    """Main pipeline: analyze → parallel(research → image → video) for all 6 periods."""
    session = await session_store.store.get(session_id)
    if not session:
        return

    # Step 1: Analyze location
    try:
        location = await analyzer.analyze_location(session.image_path)
        await session_store.store.update_location(session_id, location)
        await session_store.store.emit(session_id, "location_identified", location.model_dump())
    except Exception as e:
        await session_store.store.emit(session_id, "error", {"message": f"Location analysis failed: {e}"})
        return

    # Step 2: Process all 6 periods in parallel
    await asyncio.gather(*[
        _process_period(session_id, location, period)
        for period in PERIODS
    ])

    await session_store.store.emit(session_id, "session_complete", {})


async def _process_period(session_id: str, location, period: str):
    """Full pipeline for a single period: research → image + prompt → video."""
    try:
        # Research phase
        await session_store.store.update_period(session_id, period, stage=Stage.RESEARCHING)
        await session_store.store.emit(session_id, "period_update", {
            "period": period, "stage": Stage.RESEARCHING.value
        })

        research = await researcher.research_period(location, period)

        await session_store.store.update_period(
            session_id, period,
            research_summary=research.summary,
            key_visual_facts=research.key_visual_facts,
            stage=Stage.IMAGE_GENERATING,
        )
        await session_store.store.emit(session_id, "period_update", {
            "period": period,
            "stage": Stage.IMAGE_GENERATING.value,
            "research_summary": research.summary,
        })

        # Image generation + video prompt in parallel
        image_path, video_prompt = await asyncio.gather(
            imager.generate_reference_image(location, period, research, session_id),
            videomaker.generate_video_prompt(location, period, research),
        )

        from backend import storage
        image_url = storage.media_url(image_path)
        await session_store.store.update_period(
            session_id, period,
            reference_image_url=image_url,
            video_prompt=video_prompt,
            stage=Stage.VIDEO_GENERATING,
        )
        await session_store.store.emit(session_id, "period_update", {
            "period": period,
            "stage": Stage.VIDEO_GENERATING.value,
            "reference_image_url": image_url,
        })

        # Video generation
        video_path = await videomaker.generate_video(session_id, period, image_path, video_prompt)
        video_url = storage.media_url(video_path)

        await session_store.store.update_period(
            session_id, period,
            video_url=video_url,
            stage=Stage.COMPLETE,
        )
        await session_store.store.emit(session_id, "period_update", {
            "period": period,
            "stage": Stage.COMPLETE.value,
            "video_url": video_url,
        })

    except Exception as e:
        await session_store.store.update_period(
            session_id, period,
            stage=Stage.ERROR,
            error_message=str(e),
        )
        await session_store.store.emit(session_id, "period_update", {
            "period": period,
            "stage": Stage.ERROR.value,
            "error_message": str(e),
        })
```

**Step 2: Commit**

```bash
git add backend/pipeline/orchestrator.py
git commit -m "feat: full parallel pipeline orchestrator — research, image, video per period"
```

---

## Task 10: Frontend — Core Setup + Tailwind Dark Theme

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/tailwind.config.ts`
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/sse.ts`
- Create: `frontend/lib/constants.ts`

**Step 1: Update `frontend/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #09090b;
  --foreground: #fafafa;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #18181b; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
```

**Step 2: Create `frontend/lib/constants.ts`**

```typescript
export const PERIODS = ["1925", "1965", "1985", "present", "2040", "2070"] as const;
export type Period = typeof PERIODS[number];

export const PERIOD_LABELS: Record<Period, string> = {
  "1925": "1925",
  "1965": "1965",
  "1985": "1985",
  "present": "Now",
  "2040": "2040",
  "2070": "2070",
};

export const PERIOD_COLORS: Record<Period, { text: string; border: string; bg: string; glow: string }> = {
  "1925": { text: "text-amber-500", border: "border-amber-500", bg: "bg-amber-500/10", glow: "shadow-amber-500/30" },
  "1965": { text: "text-amber-400", border: "border-amber-400", bg: "bg-amber-400/10", glow: "shadow-amber-400/30" },
  "1985": { text: "text-yellow-300", border: "border-yellow-300", bg: "bg-yellow-300/10", glow: "shadow-yellow-300/30" },
  "present": { text: "text-white", border: "border-white", bg: "bg-white/10", glow: "shadow-white/20" },
  "2040": { text: "text-cyan-400", border: "border-cyan-400", bg: "bg-cyan-400/10", glow: "shadow-cyan-400/30" },
  "2070": { text: "text-blue-400", border: "border-blue-400", bg: "bg-blue-400/10", glow: "shadow-blue-400/30" },
};

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
```

**Step 3: Create `frontend/lib/api.ts`**

```typescript
import { API_BASE } from "./constants";

export interface UploadResponse {
  session_id: string;
  original_image_url: string;
}

export interface LocationInfo {
  location_name: string;
  coordinates: { lat: number; lng: number };
  confidence: number;
  neighborhood: string;
  landmark_type: string;
  notable_features: string[];
  description: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function startProcessing(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/process/${sessionId}`, { method: "POST" });
  if (!res.ok) throw new Error(`Process start failed: ${res.statusText}`);
}

export async function getSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`);
  if (!res.ok) throw new Error(`Session fetch failed: ${res.statusText}`);
  return res.json();
}
```

**Step 4: Create `frontend/lib/sse.ts`**

```typescript
"use client";
import { useEffect, useRef, useState } from "react";
import { API_BASE, PERIODS, Period } from "./constants";

export type PeriodStage =
  | "pending"
  | "researching"
  | "image_generating"
  | "video_generating"
  | "complete"
  | "error";

export interface PeriodState {
  period: Period;
  stage: PeriodStage;
  research_summary?: string;
  reference_image_url?: string;
  video_url?: string;
  error_message?: string;
}

export type PeriodStates = Partial<Record<Period, PeriodState>>;

export interface LocationInfo {
  location_name: string;
  coordinates: { lat: number; lng: number };
  confidence: number;
  neighborhood: string;
  landmark_type: string;
  description: string;
}

export function useSessionSSE(sessionId: string | null) {
  const [periodStates, setPeriodStates] = useState<PeriodStates>({});
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`${API_BASE}/api/events/${sessionId}`);
    esRef.current = es;

    es.addEventListener("period_update", (e: MessageEvent) => {
      const data: PeriodState = JSON.parse(e.data);
      setPeriodStates((prev) => ({ ...prev, [data.period]: data }));
    });

    es.addEventListener("location_identified", (e: MessageEvent) => {
      setLocation(JSON.parse(e.data));
    });

    es.addEventListener("session_complete", () => {
      setIsComplete(true);
      es.close();
    });

    es.onerror = () => {
      // Browser auto-reconnects EventSource on error
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId]);

  return { periodStates, location, isComplete };
}
```

**Step 5: Commit**

```bash
git add frontend/app/globals.css frontend/tailwind.config.ts frontend/lib/
git commit -m "feat: frontend constants, API client, SSE hook, dark theme globals"
```

---

## Task 11: Frontend Components

**Files:**
- Create: `frontend/components/UploadZone.tsx`
- Create: `frontend/components/LocationBadge.tsx`
- Create: `frontend/components/PeriodCard.tsx`
- Create: `frontend/components/VideoPlayer.tsx`
- Create: `frontend/components/TimelineSlider.tsx`

**Step 1: Create `frontend/components/UploadZone.tsx`**

```tsx
"use client";
import { useCallback, useState } from "react";

interface Props {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

export function UploadZone({ onUpload, isLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) onUpload(file);
    },
    [onUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-8">
      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-black tracking-tight text-white mb-2">
          Sing<span className="text-amber-400">Flix</span>
        </h1>
        <p className="text-zinc-400 text-lg">
          Upload a Singapore photo. Travel through time.
        </p>
      </div>

      {/* Drop zone */}
      <label
        className={`
          relative cursor-pointer border-2 border-dashed rounded-2xl
          w-full max-w-2xl aspect-video flex flex-col items-center justify-center gap-4
          transition-all duration-300
          ${isDragging
            ? "border-amber-400 bg-amber-400/5 scale-[1.02]"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900"
          }
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isLoading}
        />
        {isLoading ? (
          <>
            <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400">Uploading...</p>
          </>
        ) : (
          <>
            <div className="text-5xl">🎬</div>
            <p className="text-zinc-300 text-lg font-medium">Drop a Singapore photo here</p>
            <p className="text-zinc-500 text-sm">or click to browse — JPG, PNG, WEBP</p>
          </>
        )}
      </label>

      <p className="mt-8 text-zinc-600 text-sm max-w-md text-center">
        Try: Marina Bay Sands, Chinatown, Orchard Road, Raffles Hotel, or any recognisable Singapore landmark
      </p>
    </div>
  );
}
```

**Step 2: Create `frontend/components/LocationBadge.tsx`**

```tsx
import { LocationInfo } from "@/lib/sse";

interface Props {
  location: LocationInfo | null;
}

export function LocationBadge({ location }: Props) {
  if (!location) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-sm">Analysing location...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-sm">📍</span>
        <span className="text-white font-semibold">{location.location_name}</span>
        {location.confidence > 0.8 && (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            High confidence
          </span>
        )}
      </div>
      <div className="text-zinc-500 text-xs pl-6">
        {location.coordinates.lat.toFixed(4)}°N, {location.coordinates.lng.toFixed(4)}°E
        {" · "}{location.neighborhood}
      </div>
    </div>
  );
}
```

**Step 3: Create `frontend/components/PeriodCard.tsx`**

```tsx
"use client";
import { Period, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodState } from "@/lib/sse";
import { API_BASE } from "@/lib/constants";

interface Props {
  period: Period;
  state?: PeriodState;
  isSelected: boolean;
  onClick: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Waiting...",
  researching: "Researching...",
  image_generating: "Generating image...",
  video_generating: "Generating video...",
  complete: "Ready",
  error: "Error",
};

export function PeriodCard({ period, state, isSelected, onClick }: Props) {
  const colors = PERIOD_COLORS[period];
  const stage = state?.stage ?? "pending";
  const isPast = ["1925", "1965", "1985"].includes(period);
  const isPresent = period === "present";

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer
        ${isSelected
          ? `${colors.border} ${colors.bg} shadow-lg ${colors.glow}`
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
        }
      `}
    >
      {/* Thumbnail / progress area */}
      <div className="relative aspect-video bg-zinc-950 overflow-hidden">
        {state?.reference_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_BASE}${state.reference_image_url}`}
            alt={`${PERIOD_LABELS[period]} reference`}
            className="w-full h-full object-cover"
          />
        )}
        {stage === "video_generating" && state?.reference_image_url && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className={`w-6 h-6 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`} />
          </div>
        )}
        {stage === "complete" && state?.video_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center border border-white/20">
              <span className="text-white text-lg ml-0.5">▶</span>
            </div>
          </div>
        )}
        {!state?.reference_image_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            {stage === "pending" && <span className="text-zinc-700 text-2xl">⏸</span>}
            {stage === "researching" && (
              <div className={`w-5 h-5 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`} />
            )}
          </div>
        )}
        {isPresent && (
          <div className="absolute top-1 right-1 text-xs bg-white/20 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
            NOW
          </div>
        )}
        {isPast && (
          <div className="absolute top-1 left-1 text-xs text-zinc-500">◄ PAST</div>
        )}
        {!isPast && !isPresent && (
          <div className="absolute top-1 right-1 text-xs text-zinc-500">FUTURE ►</div>
        )}
      </div>

      {/* Label */}
      <div className="p-2">
        <div className={`text-sm font-bold ${colors.text}`}>{PERIOD_LABELS[period]}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{STAGE_LABELS[stage]}</div>
      </div>

      {/* Progress indicator */}
      {["researching", "image_generating", "video_generating"].includes(stage) && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5">
          <div className={`h-full ${colors.bg.replace("/10", "")} animate-pulse`} />
        </div>
      )}
    </button>
  );
}
```

**Step 4: Create `frontend/components/VideoPlayer.tsx`**

```tsx
"use client";
import { useRef, useEffect } from "react";
import { Period, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodState } from "@/lib/sse";
import { API_BASE } from "@/lib/constants";

interface Props {
  period: Period;
  state?: PeriodState;
  originalImageUrl?: string;
}

export function VideoPlayer({ period, state, originalImageUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const colors = PERIOD_COLORS[period];
  const isPresent = period === "present";

  useEffect(() => {
    if (videoRef.current && state?.video_url) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [state?.video_url]);

  return (
    <div className={`relative w-full aspect-video rounded-2xl overflow-hidden border ${colors.border} bg-zinc-950`}>
      {/* Present: show uploaded image */}
      {isPresent && originalImageUrl && !state?.video_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${API_BASE}${originalImageUrl}`}
          alt="Current location"
          className="w-full h-full object-cover"
        />
      )}

      {/* Generated video */}
      {state?.video_url && (
        <video
          ref={videoRef}
          src={`${API_BASE}${state.video_url}`}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Reference image while video generates */}
      {!state?.video_url && state?.reference_image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${API_BASE}${state.reference_image_url}`}
            alt={`${period} reference`}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
            <div className={`w-10 h-10 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`} />
            <p className={`${colors.text} text-sm`}>Generating video...</p>
          </div>
        </>
      )}

      {/* No content yet */}
      {!state?.reference_image_url && !state?.video_url && !isPresent && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-10 h-10 border-2 ${colors.border} border-t-transparent rounded-full animate-spin`} />
        </div>
      )}

      {/* Year label overlay */}
      <div className="absolute bottom-4 left-4">
        <span className={`text-4xl font-black ${colors.text} drop-shadow-lg`}>
          {PERIOD_LABELS[period]}
        </span>
        {state?.research_summary && (
          <p className="text-white/70 text-xs mt-1 max-w-xs line-clamp-2">{state.research_summary}</p>
        )}
      </div>

      {/* Error state */}
      {state?.stage === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/50 border border-red-800">
          <p className="text-red-400 text-sm text-center px-4">{state.error_message || "Generation failed"}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 5: Create `frontend/components/TimelineSlider.tsx`**

```tsx
"use client";
import { Period, PERIODS, PERIOD_COLORS, PERIOD_LABELS } from "@/lib/constants";
import { PeriodStates } from "@/lib/sse";

interface Props {
  selected: Period;
  periodStates: PeriodStates;
  onSelect: (period: Period) => void;
}

export function TimelineSlider({ selected, periodStates, onSelect }: Props) {
  const presentIndex = PERIODS.indexOf("present");

  return (
    <div className="w-full px-4 py-6">
      {/* Timeline labels row */}
      <div className="relative flex items-center">
        {/* Horizontal line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-zinc-800" />

        {/* Period stops */}
        {PERIODS.map((period, i) => {
          const colors = PERIOD_COLORS[period];
          const isSelected = selected === period;
          const state = periodStates[period];
          const isComplete = state?.stage === "complete";
          const isActive = state && state.stage !== "pending";
          const isPresent = period === "present";

          return (
            <button
              key={period}
              onClick={() => onSelect(period)}
              className="relative flex-1 flex flex-col items-center gap-2 group"
            >
              {/* Timeline dot */}
              <div
                className={`
                  relative z-10 w-4 h-4 rounded-full border-2 transition-all duration-300
                  ${isSelected
                    ? `${colors.border.replace("border-", "bg-")} ${colors.border} scale-150 shadow-lg ${colors.glow}`
                    : isComplete
                    ? `${colors.border} bg-zinc-900`
                    : isActive
                    ? `${colors.border} bg-zinc-950 animate-pulse`
                    : "border-zinc-700 bg-zinc-950"
                  }
                `}
              />

              {/* Label below */}
              <span
                className={`
                  text-xs font-bold transition-colors duration-300 whitespace-nowrap
                  ${isSelected ? colors.text : isComplete ? "text-zinc-400" : "text-zinc-600"}
                  ${isPresent ? "text-sm font-black" : ""}
                `}
              >
                {PERIOD_LABELS[period]}
              </span>

              {/* Past / Future indicator */}
              {i === 0 && (
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">◄ PAST</span>
              )}
              {i === PERIODS.length - 1 && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">FUTURE ►</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add frontend/components/
git commit -m "feat: UploadZone, LocationBadge, PeriodCard, VideoPlayer, TimelineSlider components"
```

---

## Task 12: Main Page — Assemble Everything

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`

**Step 1: Update `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SingFlix — Singapore Time Travel",
  description: "Upload a photo of any Singapore location and watch it transform across time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-white`}>{children}</body>
    </html>
  );
}
```

**Step 2: Write `frontend/app/page.tsx`**

```tsx
"use client";
import { useState, useCallback } from "react";
import { UploadZone } from "@/components/UploadZone";
import { LocationBadge } from "@/components/LocationBadge";
import { PeriodCard } from "@/components/PeriodCard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TimelineSlider } from "@/components/TimelineSlider";
import { useSessionSSE } from "@/lib/sse";
import { uploadImage, startProcessing } from "@/lib/api";
import { PERIODS, Period } from "@/lib/constants";

type AppState = "idle" | "uploading" | "processing" | "complete";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("present");
  const [error, setError] = useState<string | null>(null);

  const { periodStates, location, isComplete } = useSessionSSE(sessionId);

  const completedCount = Object.values(periodStates).filter(
    (s) => s?.stage === "complete"
  ).length;

  const handleUpload = useCallback(async (file: File) => {
    try {
      setAppState("uploading");
      setError(null);
      const { session_id, original_image_url } = await uploadImage(file);
      setSessionId(session_id);
      setOriginalImageUrl(original_image_url);
      setAppState("processing");
      await startProcessing(session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setAppState("idle");
    }
  }, []);

  if (appState === "idle" || appState === "uploading") {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded-lg z-50">
            {error}
          </div>
        )}
        <UploadZone onUpload={handleUpload} isLoading={appState === "uploading"} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <h1 className="text-2xl font-black">
          Sing<span className="text-amber-400">Flix</span>
        </h1>
        <div className="flex items-center gap-4">
          <LocationBadge location={location} />
          {completedCount > 0 && (
            <span className="text-zinc-500 text-sm">{completedCount}/6 ready</span>
          )}
        </div>
        <button
          onClick={() => { setAppState("idle"); setSessionId(null); }}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← New photo
        </button>
      </header>

      {/* Main video player */}
      <div className="flex-1 px-6 pt-6">
        <VideoPlayer
          period={selectedPeriod}
          state={periodStates[selectedPeriod]}
          originalImageUrl={originalImageUrl ?? undefined}
        />
      </div>

      {/* Timeline slider */}
      <div className="px-6">
        <TimelineSlider
          selected={selectedPeriod}
          periodStates={periodStates}
          onSelect={setSelectedPeriod}
        />
      </div>

      {/* Period cards grid */}
      <div className="grid grid-cols-6 gap-3 px-6 pb-6">
        {PERIODS.map((period) => (
          <PeriodCard
            key={period}
            period={period}
            state={periodStates[period]}
            isSelected={selectedPeriod === period}
            onClick={() => setSelectedPeriod(period)}
          />
        ))}
      </div>
    </main>
  );
}
```

**Step 3: Add `NEXT_PUBLIC_API_BASE` to frontend env**

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

**Step 4: Restart frontend, verify the UI loads**

```bash
cd frontend && npm run dev
# Visit http://localhost:3000
# Should show dark SingFlix upload screen
```

**Step 5: Commit**

```bash
git add frontend/app/ frontend/.env.local
git commit -m "feat: main page with upload→processing→timeline flow"
```

---

## Task 13: End-to-End Test with Real APIs

**Step 1: Ensure all env vars are set in `backend/.env`**

```ini
GEMINI_API_KEY=<your real key>
GEMINI_MODEL=gemini-2.5-pro          # or gemini-3.0-pro at hackathon
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation
VEO_MODEL=veo-3.0-generate-001
GEMINI_CONCURRENCY=3
VEO_POLL_INTERVAL_SECONDS=10
VEO_MAX_POLL_ATTEMPTS=60
```

**Step 2: Start both services**

```bash
# Terminal 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

**Step 3: Upload a test image**

- Open http://localhost:3000
- Upload a clear photo of Marina Bay Sands, Chinatown shophouses, or Raffles Hotel
- Verify: location badge shows the identified location within 10 seconds
- Verify: period cards start showing "Researching..." status
- Verify: reference images appear in cards as they complete (amber tones for past, cyan for future)
- Verify: clicking a card updates the main video player
- Verify: videos start playing as they complete

**Step 4: Verify error resilience**

- Kill the backend mid-generation and restart — SSE should reconnect and resume showing available results
- Check that a failed period card shows error state without blocking other periods

**Step 5: Update model IDs at hackathon**

On hackathon day, update `backend/.env`:
```ini
GEMINI_MODEL=<actual Gemini 3 Pro model ID from Google AI Studio>
GEMINI_IMAGE_MODEL=<actual Gemini 3 Pro image model ID>
VEO_MODEL=<actual Veo 3 model ID from hackathon access>
```

**Step 6: Final commit**

```bash
git add .
git commit -m "feat: SingFlix MVP — Singapore time travel with Gemini 3 + Veo 3 video generation"
```

---

## Key Files Reference

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI routes, CORS, SSE endpoint, pipeline trigger |
| `backend/sessions.py` | In-memory session store + asyncio.Queue SSE fan-out |
| `backend/pipeline/orchestrator.py` | Parallel pipeline: analyze → 6x(research+image+video) |
| `backend/pipeline/analyzer.py` | Gemini Vision → location + coordinates |
| `backend/pipeline/researcher.py` | Gemini + Google Search → period research |
| `backend/pipeline/imager.py` | Gemini Image → reference frames per period |
| `backend/pipeline/videomaker.py` | Veo 3 submission + async polling + video storage |
| `backend/prompts/research.py` | `PERIOD_CONTEXT` dict — highest leverage prompt in system |
| `frontend/lib/sse.ts` | `useSessionSSE` hook — drives all real-time UI state |
| `frontend/app/page.tsx` | Main SPA state machine |

## Verification Checklist

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] Upload a JPEG → session created, file saved to `media/sessions/<id>/upload.jpg`
- [ ] POST `/api/process/<id>` → location identified within ~10s, SSE emits `location_identified`
- [ ] Period cards show stage transitions: pending → researching → image_generating → video_generating → complete
- [ ] Reference images appear in period cards (amber tones 1925-1985, white for present, cyan/blue 2040-2070)
- [ ] Videos autoplay in main player when period card is selected
- [ ] Page reload during generation reconnects SSE and replays completed states
- [ ] One failed period does not block others
- [ ] Timeline slider amber/gold for past, white for present, cyan/blue for future
