"""Tests for weather endpoints — current, forecast, coords."""
from unittest.mock import patch, AsyncMock
import pytest


MOCK_WEATHER = {
    "temperature": 28.5,
    "humidity": 65.0,
    "wind_speed": 12.0,
    "description": "Partly cloudy",
    "coords_used": [36.8065, 10.1815],
}

MOCK_FORECAST = {
    "daily": [
        {"date": "2026-06-01", "temp_max": 32.0, "temp_min": 22.0, "rain_mm": 0.0},
        {"date": "2026-06-02", "temp_max": 30.0, "temp_min": 21.0, "rain_mm": 2.5},
    ]
}


# ── Fixture ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def farm_id(client, auth_headers):
    r = client.post("/api/v1/farms", json={
        "name": "Weather Farm",
        "location": "Tunis",
        "latitude": 36.8065,
        "longitude": 10.1815,
    }, headers=auth_headers)
    assert r.status_code in (200, 201)
    return r.json()["id"]


# ── Current Weather ───────────────────────────────────────────────────────────

class TestCurrentWeather:
    def test_current_weather_requires_auth(self, client, farm_id):
        r = client.get(f"/api/v1/weather/current/{farm_id}")
        assert r.status_code == 401

    def test_current_weather_nonexistent_farm(self, client, auth_headers):
        with patch("app.services.weather_service.weather_service.get_current_weather",
                   new=AsyncMock(return_value=MOCK_WEATHER)):
            r = client.get("/api/v1/weather/current/999999", headers=auth_headers)
        assert r.status_code == 404

    def test_current_weather(self, client, auth_headers, farm_id):
        with patch("app.services.weather_service.weather_service.get_current_weather",
                   new=AsyncMock(return_value=MOCK_WEATHER)):
            r = client.get(f"/api/v1/weather/current/{farm_id}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "temperature" in data
        assert "coords_source" in data

    def test_current_weather_coord_override(self, client, auth_headers, farm_id):
        with patch("app.services.weather_service.weather_service.get_current_weather",
                   new=AsyncMock(return_value=MOCK_WEATHER)):
            r = client.get(
                f"/api/v1/weather/current/{farm_id}?lat=36.5&lon=10.5",
                headers=auth_headers,
            )
        assert r.status_code == 200
        assert r.json()["coords_source"] == "query_params"

    def test_current_weather_service_unavailable(self, client, auth_headers, farm_id):
        with patch("app.services.weather_service.weather_service.get_current_weather",
                   new=AsyncMock(return_value=None)):
            r = client.get(f"/api/v1/weather/current/{farm_id}", headers=auth_headers)
        assert r.status_code == 503


# ── Forecast ──────────────────────────────────────────────────────────────────

class TestWeatherForecast:
    def test_forecast_requires_auth(self, client, farm_id):
        r = client.get(f"/api/v1/weather/forecast/{farm_id}")
        assert r.status_code == 401

    def test_forecast(self, client, auth_headers, farm_id):
        with patch("app.services.weather_service.weather_service.get_forecast",
                   new=AsyncMock(return_value=MOCK_FORECAST)):
            r = client.get(f"/api/v1/weather/forecast/{farm_id}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "daily" in data
        assert len(data["daily"]) >= 1
        assert "date" in data["daily"][0]
        assert "temp_max" in data["daily"][0]

    def test_forecast_nonexistent_farm(self, client, auth_headers):
        with patch("app.services.weather_service.weather_service.get_forecast",
                   new=AsyncMock(return_value=MOCK_FORECAST)):
            r = client.get("/api/v1/weather/forecast/999999", headers=auth_headers)
        assert r.status_code == 404

    def test_forecast_service_unavailable(self, client, auth_headers, farm_id):
        with patch("app.services.weather_service.weather_service.get_forecast",
                   new=AsyncMock(return_value=None)):
            r = client.get(f"/api/v1/weather/forecast/{farm_id}", headers=auth_headers)
        assert r.status_code == 503


# ── Coords endpoint ───────────────────────────────────────────────────────────

class TestWeatherByCoords:
    def test_weather_by_coords(self, client):
        with patch("app.services.weather_service.weather_service.get_current_weather",
                   new=AsyncMock(return_value=MOCK_WEATHER)):
            r = client.get("/api/v1/weather/coords?lat=36.8&lon=10.2")
        assert r.status_code == 200
        assert "temperature" in r.json()

    def test_weather_by_coords_service_unavailable(self, client):
        with patch("app.services.weather_service.weather_service.get_current_weather",
                   new=AsyncMock(return_value=None)):
            r = client.get("/api/v1/weather/coords?lat=36.8&lon=10.2")
        assert r.status_code == 503
