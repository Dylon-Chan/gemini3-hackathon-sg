"""Shared Google GenAI client singleton.

Supports two auth modes (checked in order):
  1. GEMINI_API_KEY env var  → Gemini Developer API (AI Studio key)
  2. GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT → Vertex AI (service account JSON)

Also patches BaseApiClient.aclose() to guard against an upstream bug in
google-genai ≤1.66.0 where __del__ schedules aclose() even when the client
was initialised in sync-only mode (missing _async_httpx_client).
"""
import os
from google import genai
from google.genai import _api_client as _genai_api_client

# --- upstream bug workaround ---
_orig_aclose = _genai_api_client.BaseApiClient.aclose


async def _safe_aclose(self) -> None:
    if not hasattr(self, "_async_httpx_client"):
        return
    await _orig_aclose(self)


_genai_api_client.BaseApiClient.aclose = _safe_aclose
# --------------------------------

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            # Gemini Developer API (AI Studio key)
            _client = genai.Client(api_key=api_key)
        else:
            # Vertex AI via service account (GOOGLE_APPLICATION_CREDENTIALS)
            project = os.getenv("GOOGLE_CLOUD_PROJECT")
            location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
            if not project:
                raise RuntimeError(
                    "No auth configured. Set GEMINI_API_KEY for the Developer API, "
                    "or GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT for Vertex AI."
                )
            _client = genai.Client(vertexai=True, project=project, location=location)
    return _client
