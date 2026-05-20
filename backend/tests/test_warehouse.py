"""Warehouse CRUD endpoint tests — categories, items, alerts."""
import pytest


class TestWarehouse:
    # ── helpers ───────────────────────────────────────────────────────────────

    def _create_category(self, client, auth_headers, name_fr="Semences Test"):
        return client.post("/api/v1/warehouse/categories", json={
            "name_ar": "بذور اختبار",
            "name_fr": name_fr,
            "icon": "Package",
            "color": "#16a34a",
        }, headers=auth_headers)

    def _create_item(self, client, auth_headers, category_id, name_fr="Blé dur"):
        return client.post("/api/v1/warehouse/items", json={
            "category_id": category_id,
            "name_ar": "قمح صلب",
            "name_fr": name_fr,
            "quantity": 10.0,
            "unit": "sacs",
            "min_quantity": 3.0,
        }, headers=auth_headers)

    @pytest.fixture()
    def category(self, client, auth_headers):
        return self._create_category(client, auth_headers, "Cat Fixture").json()

    @pytest.fixture()
    def item(self, client, auth_headers, category):
        return self._create_item(client, auth_headers, category["id"], "Item Fixture").json()

    # ── auth guard ────────────────────────────────────────────────────────────

    def test_categories_requires_auth(self, client):
        r = client.get("/api/v1/warehouse/categories")
        assert r.status_code == 401

    def test_items_requires_auth(self, client):
        r = client.get("/api/v1/warehouse/items")
        assert r.status_code == 401

    # ── category CRUD ─────────────────────────────────────────────────────────

    def test_create_category(self, client, auth_headers):
        r = self._create_category(client, auth_headers)
        assert r.status_code == 201
        body = r.json()
        assert body["id"] > 0
        assert body["name_fr"] == "Semences Test"

    def test_list_categories(self, client, auth_headers, category):
        r = client.get("/api/v1/warehouse/categories", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(c["id"] == category["id"] for c in data)

    def test_update_category(self, client, auth_headers, category):
        r = client.put(f"/api/v1/warehouse/categories/{category['id']}",
                       json={"name_fr": "Catégorie Mise à Jour"},
                       headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["name_fr"] == "Catégorie Mise à Jour"

    def test_delete_category(self, client, auth_headers):
        cat = self._create_category(client, auth_headers, "À Supprimer").json()
        r = client.delete(f"/api/v1/warehouse/categories/{cat['id']}",
                          headers=auth_headers)
        assert r.status_code == 204

    def test_update_nonexistent_category(self, client, auth_headers):
        r = client.put("/api/v1/warehouse/categories/99999",
                       json={"name_fr": "X"}, headers=auth_headers)
        assert r.status_code == 404

    # ── item CRUD ─────────────────────────────────────────────────────────────

    def test_create_item(self, client, auth_headers, category):
        r = self._create_item(client, auth_headers, category["id"])
        assert r.status_code == 201
        body = r.json()
        assert body["id"] > 0
        assert body["name_fr"] == "Blé dur"
        assert body["quantity"] == 10.0

    def test_list_items_by_category(self, client, auth_headers, category, item):
        r = client.get(f"/api/v1/warehouse/items?category_id={category['id']}",
                       headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert any(i["id"] == item["id"] for i in data)

    def test_update_item(self, client, auth_headers, item):
        r = client.put(f"/api/v1/warehouse/items/{item['id']}",
                       json={"quantity": 25.0, "unit": "tonnes"},
                       headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["quantity"] == 25.0
        assert body["unit"] == "tonnes"

    def test_delete_item(self, client, auth_headers, category):
        it = self._create_item(client, auth_headers, category["id"], "Orge Test").json()
        r = client.delete(f"/api/v1/warehouse/items/{it['id']}",
                          headers=auth_headers)
        assert r.status_code == 204

    def test_create_item_invalid_category(self, client, auth_headers):
        r = client.post("/api/v1/warehouse/items", json={
            "category_id": 999999,
            "name_ar": "X", "name_fr": "X",
        }, headers=auth_headers)
        assert r.status_code == 404

    def test_update_nonexistent_item(self, client, auth_headers):
        r = client.put("/api/v1/warehouse/items/99999",
                       json={"quantity": 5.0}, headers=auth_headers)
        assert r.status_code == 404

    # ── alerts ────────────────────────────────────────────────────────────────

    def test_create_and_list_alert(self, client, auth_headers, item):
        r = client.post("/api/v1/warehouse/alerts", json={
            "item_id": item["id"],
            "item_name": item["name_fr"],
            "alert_type": "stock_low",
            "message": "Stock faible",
            "severity": "warning",
        }, headers=auth_headers)
        assert r.status_code == 201
        alert_id = r.json()["id"]

        r2 = client.get("/api/v1/warehouse/alerts", headers=auth_headers)
        assert r2.status_code == 200
        assert any(a["id"] == alert_id for a in r2.json())

    def test_resolve_alert(self, client, auth_headers, item):
        created = client.post("/api/v1/warehouse/alerts", json={
            "item_id": item["id"],
            "item_name": "Test",
            "alert_type": "stock_out",
            "message": "Rupture",
            "severity": "critical",
        }, headers=auth_headers).json()

        r = client.put(f"/api/v1/warehouse/alerts/{created['id']}/resolve",
                       headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["is_resolved"] is True
