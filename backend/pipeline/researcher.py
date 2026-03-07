import asyncio
import os
from google.genai import types

from backend.models import LocationAnalysis, ResearchResult
from backend.prompts.research import build_research_prompt
from backend.gemini_client import get_client

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
        client = get_client()
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
        search_tool = types.Tool(google_search=types.GoogleSearch())

        prompt = build_research_prompt(
            location_name=location.location_name,
            neighborhood=location.neighborhood,
            landmark_type=location.landmark_type,
            period=period,
        )

        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[search_tool],
                response_mime_type="application/json",
                response_schema=ResearchResult,
            ),
        )
        return response.parsed
