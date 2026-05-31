"""Tests for poultry ERP endpoints — batches, logs, sales, inventory, P&L."""
import pytest


# ── Shared fixture ────────────────────────────────────────────────────────────

@pytest.fixture()
def farm_id(client, auth_headers):
    r = client.post("/api/v1/farms", json={"name": "Poultry Farm", "location": "Tunis"}, headers=auth_headers)
    assert r.status_code in (200, 201)
    return r.json()["id"]


@pytest.fixture()
def batch(client, auth_headers, farm_id):
    r = client.post("/api/v1/poultry/batches", json={
        "farm_id": farm_id,
        "name": "Lot A",
        "batch_type": "broiler",
        "breed": "Ross 308",
        "initial_quantity": 100,
        "status": "active",
    }, headers=auth_headers)
    assert r.status_code in (200, 201), r.text
    return r.json()


# ── Batches ───────────────────────────────────────────────────────────────────

class TestPoultryBatches:
    def test_create_batch(self, client, auth_headers, farm_id):
        r = client.post("/api/v1/poultry/batches", json={
            "farm_id": farm_id,
            "name": "Lot ISA",
            "batch_type": "layer",
            "breed": "ISA Brown",
            "initial_quantity": 200,
            "status": "active",
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        assert data["farm_id"] == farm_id
        assert data["initial_quantity"] == 200
        assert data["current_quantity"] == 200

    def test_list_batches(self, client, auth_headers, farm_id, batch):
        r = client.get(f"/api/v1/poultry/batches?farm_id={farm_id}", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(b["id"] == batch["id"] for b in r.json())

    def test_update_batch(self, client, auth_headers, batch):
        r = client.patch(f"/api/v1/poultry/batches/{batch['id']}", json={"status": "closed"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "closed"

    def test_update_nonexistent_batch(self, client, auth_headers):
        r = client.patch("/api/v1/poultry/batches/999999", json={"status": "closed"}, headers=auth_headers)
        assert r.status_code == 404

    def test_delete_batch(self, client, auth_headers, farm_id):
        r = client.post("/api/v1/poultry/batches", json={
            "farm_id": farm_id, "name": "Del Batch", "batch_type": "broiler", "initial_quantity": 10,
        }, headers=auth_headers)
        bid = r.json()["id"]
        r = client.delete(f"/api/v1/poultry/batches/{bid}", headers=auth_headers)
        assert r.status_code in (200, 204)

    def test_batch_requires_auth(self, client, farm_id):
        r = client.get(f"/api/v1/poultry/batches?farm_id={farm_id}")
        assert r.status_code == 401


# ── Feed Logs ─────────────────────────────────────────────────────────────────

class TestPoultryFeedLogs:
    def test_create_feed_log(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/feed-logs", json={
            "batch_id": batch["id"],
            "date": "2026-06-01",
            "feed_type": "starter",
            "quantity_kg": 25.0,
            "cost_per_kg": 1.5,
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        assert data["batch_id"] == batch["id"]
        assert data["quantity_kg"] == 25.0

    def test_list_feed_logs(self, client, auth_headers, batch):
        client.post("/api/v1/poultry/feed-logs", json={
            "batch_id": batch["id"], "date": "2026-06-01",
            "feed_type": "starter", "quantity_kg": 10.0,
        }, headers=auth_headers)
        r = client.get(f"/api/v1/poultry/batches/{batch['id']}/feed-logs", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_delete_feed_log(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/feed-logs", json={
            "batch_id": batch["id"], "date": "2026-06-01",
            "feed_type": "grower", "quantity_kg": 5.0,
        }, headers=auth_headers)
        log_id = r.json()["id"]
        r = client.delete(f"/api/v1/poultry/feed-logs/{log_id}", headers=auth_headers)
        assert r.status_code in (200, 204)


# ── Egg Logs ──────────────────────────────────────────────────────────────────

class TestPoultryEggLogs:
    def test_create_egg_log(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/egg-logs", json={
            "batch_id": batch["id"],
            "date": "2026-06-01",
            "total_eggs": 80,
            "broken_eggs": 2,
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        assert data["total_eggs"] == 80
        assert data["batch_id"] == batch["id"]

    def test_production_rate_calculated(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/egg-logs", json={
            "batch_id": batch["id"],
            "date": "2026-06-02",
            "total_eggs": 90,
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        # 90 eggs / 100 birds * 100 = 90%
        assert data["production_rate"] == pytest.approx(90.0, abs=1.0)

    def test_list_egg_logs(self, client, auth_headers, batch):
        r = client.get(f"/api/v1/poultry/batches/{batch['id']}/egg-logs", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Health Logs ───────────────────────────────────────────────────────────────

class TestPoultryHealthLogs:
    def test_create_health_log(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/health-logs", json={
            "batch_id": batch["id"],
            "date": "2026-06-01",
            "deaths_today": 2,
            "symptom": "none",
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        assert data["deaths_today"] == 2

    def test_deaths_reduce_batch_quantity(self, client, auth_headers, batch):
        client.post("/api/v1/poultry/health-logs", json={
            "batch_id": batch["id"], "date": "2026-06-01", "deaths_today": 5,
        }, headers=auth_headers)
        r = client.get(f"/api/v1/poultry/batches?farm_id={batch['farm_id']}", headers=auth_headers)
        updated = next(b for b in r.json() if b["id"] == batch["id"])
        assert updated["current_quantity"] == 95

    def test_deaths_exceed_quantity_rejected(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/health-logs", json={
            "batch_id": batch["id"], "date": "2026-06-01", "deaths_today": 999,
        }, headers=auth_headers)
        assert r.status_code == 422

    def test_delete_health_log_restores_quantity(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/health-logs", json={
            "batch_id": batch["id"], "date": "2026-06-01", "deaths_today": 3,
        }, headers=auth_headers)
        log_id = r.json()["id"]
        client.delete(f"/api/v1/poultry/health-logs/{log_id}", headers=auth_headers)
        r = client.get(f"/api/v1/poultry/batches?farm_id={batch['farm_id']}", headers=auth_headers)
        updated = next(b for b in r.json() if b["id"] == batch["id"])
        assert updated["current_quantity"] == 100


# ── Sales ─────────────────────────────────────────────────────────────────────

class TestPoultrySales:
    def test_create_sale(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/sales", json={
            "batch_id": batch["id"],
            "date": "2026-06-01",
            "product_type": "eggs",
            "quantity": 100,
            "unit_price": 0.35,
            "total_amount": 35.0,
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        assert data["total_amount"] == 35.0

    def test_sale_live_birds_reduces_quantity(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/sales", json={
            "batch_id": batch["id"],
            "date": "2026-06-01",
            "product_type": "poulets",
            "quantity": 10,
            "unit_price": 5.0,
            "total_amount": 50.0,
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        r = client.get(f"/api/v1/poultry/batches?farm_id={batch['farm_id']}", headers=auth_headers)
        updated = next(b for b in r.json() if b["id"] == batch["id"])
        assert updated["current_quantity"] == 90

    def test_sale_exceeds_quantity_rejected(self, client, auth_headers, batch):
        r = client.post("/api/v1/poultry/sales", json={
            "batch_id": batch["id"],
            "date": "2026-06-01",
            "product_type": "poulets",
            "quantity": 999,
            "unit_price": 5.0,
            "total_amount": 4995.0,
        }, headers=auth_headers)
        assert r.status_code == 422


# ── Inventory ─────────────────────────────────────────────────────────────────

class TestPoultryInventory:
    def test_create_inventory_item(self, client, auth_headers, farm_id):
        r = client.post("/api/v1/poultry/inventory", json={
            "farm_id": farm_id,
            "item_name": "Vaccin Newcastle",
            "category": "medicament",
            "quantity": 50,
            "unit": "doses",
        }, headers=auth_headers)
        assert r.status_code in (200, 201)
        data = r.json()
        assert data["item_name"] == "Vaccin Newcastle"
        assert "id" in data

    def test_list_inventory(self, client, auth_headers, farm_id):
        client.post("/api/v1/poultry/inventory", json={
            "farm_id": farm_id, "item_name": "Aliment Démarrage",
            "category": "feed", "quantity": 200, "unit": "kg",
        }, headers=auth_headers)
        r = client.get(f"/api/v1/poultry/inventory?farm_id={farm_id}", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_delete_inventory_item(self, client, auth_headers, farm_id):
        r = client.post("/api/v1/poultry/inventory", json={
            "farm_id": farm_id, "item_name": "Del", "category": "feed", "quantity": 1, "unit": "kg",
        }, headers=auth_headers)
        item_id = r.json()["id"]
        r = client.delete(f"/api/v1/poultry/inventory/{item_id}", headers=auth_headers)
        assert r.status_code in (200, 204)

    def test_delete_nonexistent_item(self, client, auth_headers):
        r = client.delete("/api/v1/poultry/inventory/999999", headers=auth_headers)
        assert r.status_code == 404


# ── P&L ───────────────────────────────────────────────────────────────────────

class TestPoultryPnL:
    def test_pnl_empty_batch(self, client, auth_headers, batch):
        r = client.get(f"/api/v1/poultry/batches/{batch['id']}/pnl", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["batch_id"] == batch["id"]
        assert data["total_costs"] == 0.0
        assert data["total_revenue"] == 0.0
        assert data["margin"] == 0.0

    def test_pnl_with_data(self, client, auth_headers, batch):
        client.post("/api/v1/poultry/feed-logs", json={
            "batch_id": batch["id"], "date": "2026-06-01",
            "feed_type": "starter", "quantity_kg": 20.0, "cost_per_kg": 1.0,
        }, headers=auth_headers)
        client.post("/api/v1/poultry/sales", json={
            "batch_id": batch["id"], "date": "2026-06-02",
            "product_type": "eggs", "quantity": 100, "unit_price": 0.5, "total_amount": 50.0,
        }, headers=auth_headers)
        r = client.get(f"/api/v1/poultry/batches/{batch['id']}/pnl", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total_feed_cost"] == 20.0
        assert data["total_revenue"] == 50.0
        assert data["margin"] == 30.0
        assert data["margin_pct"] == pytest.approx(60.0, abs=0.1)

    def test_pnl_nonexistent_batch(self, client, auth_headers):
        r = client.get("/api/v1/poultry/batches/999999/pnl", headers=auth_headers)
        assert r.status_code == 404


# ── Farm Stats ────────────────────────────────────────────────────────────────

class TestPoultryFarmStats:
    def test_farm_stats(self, client, auth_headers, farm_id, batch):
        r = client.get(f"/api/v1/poultry/stats/farm/{farm_id}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "active_batches" in data
        assert "total_birds" in data
        assert "eggs_today" in data
        assert "mortality_rate" in data
        assert data["active_batches"] >= 1
        assert data["total_birds"] >= 0
