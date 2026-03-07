import os
from pathlib import Path
from google.genai import types
from backend.models import LocationAnalysis
from backend.prompts.analysis import LOCATION_ANALYSIS_PROMPT
from backend.gemini_client import get_client


async def analyze_location(image_path: str) -> LocationAnalysis:
    """Extract location name and coordinates from uploaded image using Gemini Vision."""
    client = get_client()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

    image_bytes = Path(image_path).read_bytes()
    ext = Path(image_path).suffix.lower()
    mime = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"

    response = await client.aio.models.generate_content(
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
