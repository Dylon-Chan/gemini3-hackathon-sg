import pytest
from unittest.mock import patch, MagicMock
from backend.pipeline.analyzer import analyze_location
from backend.models import LocationAnalysis, Coordinates


@pytest.mark.asyncio
async def test_analyze_location_returns_location_analysis():
    mock_location = LocationAnalysis(
        location_name="Marina Bay Sands, Marina Bay",
        coordinates=Coordinates(lat=1.2840, lng=103.8607),
        confidence=0.95,
        neighborhood="Marina Bay",
        landmark_type="integrated resort",
        notable_features=["three towers", "rooftop pool", "waterfront"],
        description="Marina Bay Sands integrated resort with iconic three towers.",
    )

    mock_response = MagicMock()
    mock_response.parsed = mock_location

    from unittest.mock import AsyncMock
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

    with patch("backend.pipeline.analyzer.get_client", return_value=mock_client), \
         patch("backend.pipeline.analyzer.Path") as MockPath:
        mock_path_instance = MockPath.return_value
        mock_path_instance.read_bytes.return_value = b"fake_image_bytes"
        mock_path_instance.suffix = ".jpg"
        result = await analyze_location("/tmp/test.jpg")

    assert result.location_name == "Marina Bay Sands, Marina Bay"
    assert result.coordinates.lat == 1.2840
    assert result.confidence == 0.95
