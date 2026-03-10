import asyncio
import json
from pathlib import Path
from typing import Optional
from backend.models import SessionState, PeriodState, Stage, PERIODS, LocationAnalysis

SESSIONS_ROOT = Path("media/sessions")


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, SessionState] = {}
        self._queues: dict[str, asyncio.Queue] = {}
        self._lock = asyncio.Lock()

    # ── persist / load ────────────────────────────────────────────────────────

    def _state_path(self, session_id: str) -> Path:
        return SESSIONS_ROOT / session_id / "state.json"

    def _persist(self, session_id: str) -> None:
        """Write session state to disk (called while lock is held)."""
        state = self._sessions.get(session_id)
        if not state:
            return
        path = self._state_path(session_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(state.model_dump_json(), encoding="utf-8")

    def _load_from_disk(self, session_id: str) -> Optional[SessionState]:
        """Try to restore a session from its JSON file on disk."""
        path = self._state_path(session_id)
        if not path.exists():
            return None
        try:
            return SessionState.model_validate_json(path.read_text(encoding="utf-8"))
        except Exception:
            return None

    # ── public API ────────────────────────────────────────────────────────────

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
            self._persist(session_id)
            return state

    async def get(self, session_id: str) -> Optional[SessionState]:
        """Return session from memory, or restore from disk if not present."""
        if session_id in self._sessions:
            return self._sessions[session_id]
        # Try disk restore (e.g. after backend restart)
        state = self._load_from_disk(session_id)
        if state:
            async with self._lock:
                self._sessions[session_id] = state
                # Create a fresh queue — pipeline won't run again, but SSE
                # replay in the endpoint will push the completed states once.
                if session_id not in self._queues:
                    self._queues[session_id] = asyncio.Queue(maxsize=200)
        return state

    async def update_location(self, session_id: str, location: LocationAnalysis):
        async with self._lock:
            self._sessions[session_id].location = location
            self._persist(session_id)

    async def update_period(self, session_id: str, period: str, **kwargs):
        async with self._lock:
            state = self._sessions[session_id].periods[period]
            for k, v in kwargs.items():
                if hasattr(state, k):
                    setattr(state, k, v)
            self._persist(session_id)

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
