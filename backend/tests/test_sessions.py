import asyncio
import pytest
from backend.sessions import SessionStore
from backend.models import Stage


@pytest.mark.asyncio
async def test_create_session():
    s = SessionStore()
    state = await s.create("test-1", "/tmp/img.jpg", "/media/sessions/test-1/upload.jpg")
    assert state.session_id == "test-1"
    assert len(state.periods) == 6
    assert state.periods["1925"].stage == Stage.PENDING


@pytest.mark.asyncio
async def test_update_period():
    s = SessionStore()
    await s.create("test-2", "/tmp/img.jpg", "/media/sessions/test-2/upload.jpg")
    await s.update_period("test-2", "1925", stage=Stage.RESEARCHING, research_summary="Colonial Singapore")
    state = await s.get("test-2")
    assert state.periods["1925"].stage == Stage.RESEARCHING
    assert state.periods["1925"].research_summary == "Colonial Singapore"


@pytest.mark.asyncio
async def test_emit_and_subscribe():
    s = SessionStore()
    await s.create("test-3", "/tmp/img.jpg", "/media/img.jpg")
    await s.emit("test-3", "period_update", {"period": "1925", "stage": "researching"})
    q = await s.subscribe("test-3")
    event = await asyncio.wait_for(q.get(), timeout=1.0)
    assert event["event"] == "period_update"
    assert event["data"]["period"] == "1925"


@pytest.mark.asyncio
async def test_all_periods_done():
    s = SessionStore()
    await s.create("test-4", "/tmp/img.jpg", "/media/img.jpg")
    assert not s.all_periods_done("test-4")
    for p in ["1925", "1965", "1985", "present", "2040", "2070"]:
        await s.update_period("test-4", p, stage=Stage.COMPLETE)
    assert s.all_periods_done("test-4")
