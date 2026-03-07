# SingFlix

**Singapore Time Travel** — Upload a photo of any Singapore location and watch AI reconstruct what it looked like in 1925, 1965, and 1985, then predict 2040 and 2070.

Built with Gemini 3 Pro · Veo 3 · Google Search Grounding · Next.js 15 · FastAPI

---

## Quick Start

### 1. Set your API keys

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set GEMINI_API_KEY
# At hackathon: also set VEO_MODEL to the confirmed Veo 3 model ID
```

### 2. Start the backend

```bash
cd backend
source .venv/bin/activate
cd ..
PYTHONPATH=. uvicorn backend.main:app --port 8000 --reload
```

### 3. Start the frontend (new terminal)

```bash
cd frontend
npm run dev
```

### 4. Open the app

Visit **http://localhost:3000**

Upload a photo of any recognisable Singapore location:
- Marina Bay Sands
- Raffles Hotel
- Chinatown shophouses
- Orchard Road
- Gardens by the Bay

---

## How It Works

1. **Upload** a Singapore photo
2. **Gemini 3 Pro** identifies the location and coordinates
3. **Gemini + Google Search** researches what the location looked like in each period
4. **Gemini Image** generates a reference frame for each era
5. **Veo 3** generates 6-second cinematic videos (runs in parallel for all periods)
6. **Watch** the timeline — amber past, white present, cyan/blue future

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | required | Google AI Studio API key |
| `GEMINI_MODEL` | `gemini-2.5-pro` | Model for analysis + research |
| `GEMINI_IMAGE_MODEL` | `gemini-2.0-flash-exp-image-generation` | Model for reference image gen |
| `VEO_MODEL` | `veo-3.0-generate-001` | Veo 3 model ID |
| `GEMINI_CONCURRENCY` | `3` | Max parallel Gemini calls |
| `VEO_POLL_INTERVAL_SECONDS` | `10` | How often to check Veo job status |

---

## Project Structure

```
singflix/
├── frontend/          # Next.js 15 — dark cinematic UI
│   ├── app/page.tsx   # Main SPA
│   └── components/    # UploadZone, VideoPlayer, TimelineSlider, PeriodCard
├── backend/
│   ├── main.py        # FastAPI — upload, SSE, process endpoints
│   ├── pipeline/      # analyzer, researcher, imager, videomaker, orchestrator
│   └── prompts/       # Period-specific prompt templates
└── media/sessions/    # Generated images and videos (local)
```
