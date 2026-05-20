"""Farm CRUD endpoint tests."""


class TestFarms:
    def _create(self, client, headers, name="Test Farm"):
        return client.post("/api/v1/farms", json={
            "name": name,
            "location": "Tunis",
            "area_hectares": 5.0,
            "farm_type": "mixed",
        }, headers=headers)

    def _get_id(self, client, headers, name):
        """Create a farm and find its id via list endpoint."""
        self._create(client, headers, name)
        farms = client.get("/api/v1/farms", headers=headers).json()
        match = next((f for f in farms if f.get("name") == name), None)
        assert match is not None, f"Farm '{name}' not found in list"
        return match["id"]

    def test_list_farms_requires_auth(self, client):
        r = client.get("/api/v1/farms")
        assert r.status_code == 401

    def test_create_farm(self, client, auth_headers):
        r = self._create(client, auth_headers)
        assert r.status_code in (200, 201)

    def test_list_farms(self, client, auth_headers):
        self._create(client, auth_headers, "Farm A")
        r = client.get("/api/v1/farms", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_get_farm(self, client, auth_headers):
        farm_id = self._get_id(client, auth_headers, "Farm Detail")
        r = client.get(f"/api/v1/farms/{farm_id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "Farm Detail"

    def test_update_farm(self, client, auth_headers):
        farm_id = self._get_id(client, auth_headers, "Farm Update")
        r = client.put(f"/api/v1/farms/{farm_id}", json={"name": "Updated Farm"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "Updated Farm"

    def test_delete_farm(self, client, auth_headers):
        farm_id = self._get_id(client, auth_headers, "Farm Delete")
        r = client.delete(f"/api/v1/farms/{farm_id}", headers=auth_headers)
        assert r.status_code in (200, 204)

    def test_get_nonexistent_farm(self, client, auth_headers):
        r = client.get("/api/v1/farms/999999", headers=auth_headers)
        assert r.status_code == 404
