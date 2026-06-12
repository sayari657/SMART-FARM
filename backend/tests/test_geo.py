"""Geo endpoint tests — public resources and tenant-protected farm data."""


class TestGeo:
    def test_geo_farms_requires_auth(self, client):
        r = client.get("/api/v1/geo/farms")
        assert r.status_code == 401

    def test_geo_farms_authenticated(self, client, auth_headers):
        r = client.get("/api/v1/geo/farms", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "type" in data
        assert "features" in data

    def test_geo_vets_public(self, client):
        r = client.get("/api/v1/geo/vets")
        assert r.status_code == 200
        data = r.json()
        assert "features" in data

    def test_geo_hives_requires_auth(self, client):
        r = client.get("/api/v1/geo/hives")
        assert r.status_code == 401

    def test_geo_hives_authenticated(self, client, auth_headers):
        r = client.get("/api/v1/geo/hives", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "features" in data

    def test_overpass_proxy_missing_query(self, client):
        r = client.post("/api/v1/geo/overpass", json={})
        assert r.status_code == 400

    def test_overpass_proxy_with_query(self, client):
        r = client.post("/api/v1/geo/overpass", json={"query": "[out:json];out 0;"})
        assert r.status_code in (200, 400, 502, 503)
