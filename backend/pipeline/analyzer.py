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
