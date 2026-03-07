import asyncio
import json
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
    """Research what a Singapore location looked like during a specific period.

    Uses two-step approach because Vertex AI doesn't allow google_search
    together with controlled generation (response_schema).
    Step 1: Search with grounding to gather facts.
    Step 2: Parse the free-text response into structured JSON.
    """
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

        # Step 1: grounded search (no schema constraint)
        search_response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[search_tool],
            ),
        )

        raw_text = search_response.text

        # Step 2: parse into structured output (no search tool)
        parse_response = await client.aio.models.generate_content(
            model=model,
            contents=f"Parse the following research into the required JSON schema. "
                     f"Preserve all factual details.\n\n{raw_text}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ResearchResult,
            ),
        )
        return parse_response.parsed
