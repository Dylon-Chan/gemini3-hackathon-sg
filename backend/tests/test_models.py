from backend.models import SessionState, PeriodState, Stage, PERIODS, LocationAnalysis, Coordinates


def test_session_state_defaults():
    s = SessionState(session_id="abc", image_path="/tmp/img.jpg", original_image_url="/media/img.jpg")
    assert s.status == "uploaded"
    assert s.location is None
    assert s.periods == {}


def test_period_state_defaults():
    p = PeriodState(period="1925")
    assert p.stage == Stage.PENDING
    assert p.video_url is None


def test_periods_list():
    assert "present" in PERIODS
    assert len(PERIODS) == 6


def test_coordinates_validation():
    c = Coordinates(lat=1.2840, lng=103.8510)
    assert c.lat == 1.2840
