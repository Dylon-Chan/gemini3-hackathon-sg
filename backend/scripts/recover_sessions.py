"""
Recover state.json for old sessions that have media files but no state.json.
Run from project root: python -m backend.scripts.recover_sessions
"""
import json
from pathlib import Path

SESSIONS_ROOT = Path("media/sessions")
PERIODS = ["1925", "1965", "1985", "present", "2040", "2070"]


def recover_session(session_dir: Path) -> bool:
    session_id = session_dir.name
    state_path = session_dir / "state.json"

    if state_path.exists():
        return False  # Already has state.json

    # Find the upload file
    upload_path = None
    for ext in ("jpg", "jpeg", "png", "webp"):
        p = session_dir / f"upload.{ext}"
        if p.exists():
            upload_path = p
            break

    if not upload_path:
        return False  # No upload file, skip

    # Build period states
    periods = {}
    for period in PERIODS:
        ref = session_dir / f"{period}_reference.png"
        vid = session_dir / f"{period}_video.mp4"

        if vid.exists():
            stage = "complete"
            reference_image_url = f"/media/sessions/{session_id}/{period}_reference.png" if ref.exists() else None
            video_url = f"/media/sessions/{session_id}/{period}_video.mp4"
        elif ref.exists():
            stage = "image_generating"  # Has image but no video
            reference_image_url = f"/media/sessions/{session_id}/{period}_reference.png"
            video_url = None
        else:
            stage = "pending"
            reference_image_url = None
            video_url = None

        periods[period] = {
            "period": period,
            "stage": stage,
            "research_summary": None,
            "key_visual_facts": None,
            "reference_image_url": reference_image_url,
            "video_url": video_url,
            "video_prompt": None,
            "error_message": None,
        }

    state = {
        "session_id": session_id,
        "image_path": str(upload_path),
        "original_image_url": f"/media/sessions/{session_id}/{upload_path.name}",
        "status": "uploaded",
        "location": None,
        "periods": periods,
    }

    state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    complete_count = sum(1 for p in periods.values() if p["stage"] == "complete")
    print(f"  Recovered {session_id[:8]}... — {complete_count}/6 periods complete")
    return True


def main():
    if not SESSIONS_ROOT.exists():
        print("No media/sessions directory found.")
        return

    recovered = 0
    skipped = 0
    for session_dir in sorted(SESSIONS_ROOT.iterdir()):
        if not session_dir.is_dir() or session_dir.name.startswith("."):
            continue
        if session_dir.name.startswith("test-"):
            continue
        if recover_session(session_dir):
            recovered += 1
        else:
            skipped += 1

    print(f"\nDone: {recovered} recovered, {skipped} skipped (already had state.json or no upload)")


if __name__ == "__main__":
    main()
