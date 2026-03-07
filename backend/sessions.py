import asyncio
from typing import Optional
from backend.models import SessionState, PeriodState, Stage, PERIODS, LocationAnalysis


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, SessionState] = {}
        self._queues: dict[str, asyncio.Queue] = {}
        self._lock = asyncio.Lock()

    async def create(self, session_id: str, image_path: str, original_image_url: str) -> SessionState:
        async with self._lock:
            state = SessionState(
                session_id=session_id,
                image_path=image_path,
                original_image_url=original_image_url,
                periods={p: PeriodState(period=p) for p in PERIODS},
            )
            self._sessions[session_id] = state
            self._queues[session_id] = asyncio.Queue(maxsize=200)
            return state

    async def get(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    async def update_location(self, session_id: str, location: LocationAnalysis):
        async with self._lock:
            self._sessions[session_id].location = location

    async def update_period(self, session_id: str, period: str, **kwargs):
        async with self._lock:
            state = self._sessions[session_id].periods[period]
            for k, v in kwargs.items():
                if hasattr(state, k):
                    setattr(state, k, v)

    async def emit(self, session_id: str, event: str, data: dict):
        q = self._queues.get(session_id)
        if q:
            await q.put({"event": event, "data": data})

    async def subscribe(self, session_id: str) -> Optional[asyncio.Queue]:
        return self._queues.get(session_id)

    def all_periods_done(self, session_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session:
            return False
        return all(
            p.stage in (Stage.COMPLETE, Stage.ERROR)
            for p in session.periods.values()
        )


store = SessionStore()
