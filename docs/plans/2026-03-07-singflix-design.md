# SingFlix Design Document

**App:** SingFlix — Singapore Time Travel
**Date:** 2026-03-07

## Design Decisions
- Frontend: Next.js 15 (App Router) + Tailwind CSS
- Backend: FastAPI (Python 3.11+)
- Location analysis: Gemini 3 Pro (Vision)
- Historical/future research: Gemini 3 Pro + Google Search grounding
- Reference image gen: Gemini 3 Pro Image (native image output)
- Video generation: Veo 3 API
- Real-time updates: Server-Sent Events (SSE)
- Pipeline strategy: Fully parallel (asyncio.gather for all 6 periods)
- Geographic scope: Singapore-focused
- UI theme: Dark cinematic — amber/gold past, blue/cyan future
- Storage: Local filesystem

## Time Periods
1925 → 1965 → 1985 → [PRESENT] → 2040 → 2070
