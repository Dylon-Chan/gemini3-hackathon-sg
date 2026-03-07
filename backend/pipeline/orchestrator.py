import asyncio
from backend import sessions as session_store
from backend.models import PERIODS, Stage


async def run_pipeline(session_id: str):
    """Stub pipeline — emits fake events for SSE testing. Replaced in Task 9."""
    for period in PERIODS:
        await asyncio.sleep(0.3)
        await session_store.store.update_period(session_id, period, stage=Stage.COMPLETE)
        await session_store.store.emit(session_id, "period_update", {
            "period": period,
            "stage": "complete",
            "research_summary": f"Stub summary for {period}",
        })
    await session_store.store.emit(session_id, "session_complete", {})
