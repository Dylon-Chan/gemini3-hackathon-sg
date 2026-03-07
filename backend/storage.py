from pathlib import Path

MEDIA_ROOT = Path("media/sessions")


def save_upload(session_id: str, data: bytes, content_type: str) -> Path:
    ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
    session_dir = MEDIA_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    path = session_dir / f"upload.{ext}"
    path.write_bytes(data)
    return path


def save_image(session_id: str, period: str, data: bytes) -> Path:
    path = MEDIA_ROOT / session_id / f"{period}_reference.png"
    path.write_bytes(data)
    return path


def save_video(session_id: str, period: str, data: bytes) -> Path:
    path = MEDIA_ROOT / session_id / f"{period}_video.mp4"
    path.write_bytes(data)
    return path


def media_url(path: Path) -> str:
    """Convert local path to URL served by FastAPI /media mount."""
    return "/" + str(path)
