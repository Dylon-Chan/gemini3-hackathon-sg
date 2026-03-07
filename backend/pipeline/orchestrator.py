import asyncio
import logging
from pathlib import Path
from backend import sessions as session_store, storage
from backend.models import Stage, PERIODS
from backend.pipeline import analyzer, researcher, imager, videomaker

logger = logging.getLogger(__name__)


async def run_pipeline(session_id: str):
    """Main pipeline: analyze → parallel(research → image + prompt → video) for all 6 periods."""
    logger.info("[pipeline] run_pipeline started for session %s", session_id)
    session = await session_store.store.get(session_id)
    if not session:
        logger.error("[pipeline] session %s not found", session_id)
        return

    # Step 1: Analyze location from uploaded image
    try:
        logger.info("[pipeline] starting location analysis for %s (image_path=%s)", session_id, session.image_path)
        location = await analyzer.analyze_location(session.image_path)
        logger.info("[pipeline] location identified: %s", location.location_name)
        await session_store.store.update_location(session_id, location)
        await session_store.store.emit(session_id, "location_identified", location.model_dump())
    except Exception as e:
        logger.exception("[pipeline] location analysis failed for %s", session_id)
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
