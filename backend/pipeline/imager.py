import os
from pathlib import Path
from google.genai import types
from backend.models import ResearchResult, LocationAnalysis
from backend.prompts.imaging import build_imaging_prompt
from backend import storage
from backend.gemini_client import get_client


def _extract_image_bytes(response) -> bytes:
    """Extract image bytes from a Gemini native image generation response."""
    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            return part.inline_data.data
    raise ValueError("No image data found in Gemini response")


async def generate_reference_image(
    location: LocationAnalysis,
    period: str,
    research: ResearchResult,
    session_id: str,
) -> Path:
    """Generate a reference image using Nano Banana 2 (Gemini 3.1 Flash Image).
    Returns local file path."""
    client = get_client()
    model = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview")

    prompt = build_imaging_prompt(
        location_name=location.location_name,
        period=period,
        research_summary=research.summary,
        key_visual_facts=research.key_visual_facts,
        atmosphere=research.atmosphere,
        architectural_style=research.architectural_style,
        street_level_details=research.street_level_details,
    )

    response = await client.aio.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    image_bytes = _extract_image_bytes(response)
    path = storage.save_image(session_id, period, image_bytes)
    return path
