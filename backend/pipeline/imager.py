import asyncio
import os
from pathlib import Path
from google import genai
from google.genai import types
from backend.models import ResearchResult, LocationAnalysis
from backend.prompts.imaging import build_imaging_prompt
from backend import storage


def _extract_image_bytes(response) -> bytes:
    """Extract image bytes from Gemini response with fallback for SDK version differences."""
    try:
        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                return part.inline_data.data
    except (AttributeError, IndexError):
        pass
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
