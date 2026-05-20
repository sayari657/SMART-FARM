"""Geo endpoint tests — farms map, vets, hives, overpass proxy.

Note: all geo endpoints are public (no auth required).
The overpass proxy returns 400 when query is missing, 422 when body is invalid.
"""


class TestGeo:
    def test_geo_farms_public(self, client):
        r = client.get("/api/v1/geo/farms")
        assert r.status_code == 200
        data = r.json()
        assert "type" in data
        assert "features" in data

    def test_geo_vets_public(self, client):
        r = client.get("/api/v1/geo/vets")
        assert r.status_code == 200
        data = r.json()
        assert "features" in data

    def test_geo_hives_public(self, client):
        r = client.get("/api/v1/geo/hives")
        assert r.status_code == 200
        data = r.json()
        assert "features" in data

    def test_overpass_proxy_missing_query(self, client):
        r = client.post("/api/v1/geo/overpass", json={})
        assert r.status_code == 400

    def test_overpass_proxy_with_query(self, client):
        r = client.post("/api/v1/geo/overpass", json={"query": "[out:json];out 0;"})
        assert r.status_code in (200, 400, 502, 503)
