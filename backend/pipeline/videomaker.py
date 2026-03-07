import asyncio
import os
from pathlib import Path
from google.genai import types
from backend.models import LocationAnalysis, ResearchResult
from backend.prompts.video import build_video_prompt_generation_prompt
from backend import storage
from backend.gemini_client import get_client

POLL_INTERVAL = int(os.getenv("VEO_POLL_INTERVAL_SECONDS", "10"))
MAX_POLL_ATTEMPTS = int(os.getenv("VEO_MAX_POLL_ATTEMPTS", "60"))


async def generate_video_prompt(
    location: LocationAnalysis,
    period: str,
    research: ResearchResult,
) -> str:
    """Use Gemini to write a Veo-optimized video prompt from research data."""
    client = get_client()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

    meta_prompt = build_video_prompt_generation_prompt(
        location_name=location.location_name,
        period=period,
        research_summary=research.summary,
        atmosphere=research.atmosphere,
        street_level_details=research.street_level_details,
    )

    response = await client.aio.models.generate_content(
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
    client = get_client()
    model = os.getenv("VEO_MODEL", "veo-3.0-generate-001")

    image_bytes = reference_image_path.read_bytes()

    # Submit video generation job (long-running operation)
    operation = await client.aio.models.generate_videos(
        model=model,
        prompt=video_prompt,
        image=types.Image(
            image_bytes=image_bytes,
            mime_type="image/png",
        ),
        config=types.GenerateVideosConfig(
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
        operation = await operation.refresh()

    # Extract video bytes
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
