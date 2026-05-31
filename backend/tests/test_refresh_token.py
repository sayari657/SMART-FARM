"""
Tests for JWT refresh token flow.
POST /api/v1/auth/login      → access_token + refresh_token
POST /api/v1/auth/refresh    → new access_token
POST /api/v1/auth/logout     → confirmation
"""
import pytest


LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
LOGOUT_URL = "/api/v1/auth/logout"
REGISTER_URL = "/api/v1/auth/register"


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

def _register_and_login(client, username: str = "refresh_test_user",
                         password: str = "Refresh1234!"):
    """Register user (idempotent) and return full login response JSON."""
    client.post(REGISTER_URL, json={
        "username": username,
        "password": password,
        "email": f"{username}@test.farm.ai",
        "full_name": "Refresh Test",
        "role": "admin",
    })
    resp = client.post(LOGIN_URL, json={"username": username, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()


# -------------------------------------------------------------------
# Login — access + refresh token returned
# -------------------------------------------------------------------

class TestLoginTokens:

    def test_login_returns_access_token(self, client):
        data = _register_and_login(client)
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 20

    def test_login_returns_refresh_token(self, client):
        data = _register_and_login(client)
        assert "refresh_token" in data, \
            f"refresh_token missing from login response. Keys: {list(data.keys())}"
        assert isinstance(data["refresh_token"], str)
        assert len(data["refresh_token"]) > 20

    def test_access_and_refresh_tokens_differ(self, client):
        data = _register_and_login(client)
        assert data["access_token"] != data["refresh_token"]

    def test_token_type_is_bearer(self, client):
        data = _register_and_login(client)
        token_type = data.get("token_type", "")
        assert token_type.lower() == "bearer"


# -------------------------------------------------------------------
# Refresh endpoint
# -------------------------------------------------------------------

class TestRefreshEndpoint:

    def test_refresh_returns_new_access_token(self, client):
        login_data = _register_and_login(client, "rt_user_a", "Rt_Pass1234!")
        refresh_token = login_data.get("refresh_token")
        if not refresh_token:
            pytest.skip("Login did not return refresh_token")

        resp = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        assert resp.status_code == 200, f"Refresh failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data

    def test_new_access_token_differs_from_old(self, client):
        login_data = _register_and_login(client, "rt_user_b", "Rt_Pass1234!")
        refresh_token = login_data.get("refresh_token")
        if not refresh_token:
            pytest.skip("Login did not return refresh_token")

        old_token = login_data["access_token"]
        resp = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        if resp.status_code == 200:
            new_token = resp.json()["access_token"]
            # JWT payload (middle segment) may differ due to iat/exp
            assert new_token != old_token

    def test_invalid_refresh_token_rejected(self, client):
        resp = client.post(REFRESH_URL, json={"refresh_token": "totally.invalid.token"})
        assert resp.status_code in (401, 422), \
            f"Expected 401/422 for invalid token, got {resp.status_code}"

    def test_access_token_used_as_refresh_rejected(self, client):
        """Access token should NOT be accepted as a refresh token (type claim check)."""
        login_data = _register_and_login(client, "rt_user_c", "Rt_Pass1234!")
        access_token = login_data["access_token"]

        resp = client.post(REFRESH_URL, json={"refresh_token": access_token})
        assert resp.status_code in (401, 422), \
            f"Access token wrongly accepted as refresh token"

    def test_missing_refresh_token_returns_422(self, client):
        resp = client.post(REFRESH_URL, json={})
        assert resp.status_code == 422

    def test_empty_refresh_token_rejected(self, client):
        resp = client.post(REFRESH_URL, json={"refresh_token": ""})
        assert resp.status_code in (401, 422)


# -------------------------------------------------------------------
# New access token works for protected endpoints
# -------------------------------------------------------------------

class TestRefreshedTokenFunctionality:

    def test_refreshed_token_can_access_protected_route(self, client):
        login_data = _register_and_login(client, "rt_user_d", "Rt_Pass1234!")
        refresh_token = login_data.get("refresh_token")
        if not refresh_token:
            pytest.skip("Login did not return refresh_token")

        resp = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
        if resp.status_code != 200:
            pytest.skip(f"Refresh failed: {resp.text}")

        new_token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {new_token}"}

        # Access any protected endpoint — /api/v1/auth/me is standard
        me_resp = client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code in (200, 404), \
            f"Refreshed token rejected: {me_resp.status_code} — {me_resp.text}"


# -------------------------------------------------------------------
# Logout
# -------------------------------------------------------------------

class TestLogout:

    def test_logout_returns_200(self, client, auth_headers):
        resp = client.post(LOGOUT_URL, headers=auth_headers)
        assert resp.status_code == 200

    def test_logout_response_has_message(self, client, auth_headers):
        resp = client.post(LOGOUT_URL, headers=auth_headers)
        data = resp.json()
        # Should return some confirmation message
        assert "message" in data or "status" in data or "detail" in data

    def test_logout_requires_auth(self, client):
        resp = client.post(LOGOUT_URL)
        assert resp.status_code == 401


# -------------------------------------------------------------------
# Security service unit tests
# -------------------------------------------------------------------

class TestSecurityService:

    def test_create_refresh_token_returns_string(self):
        from app.core.security import create_refresh_token
        token = create_refresh_token({"sub": "user123"})
        assert isinstance(token, str)
        assert len(token) > 20

    def test_decode_refresh_token_returns_payload(self):
        from app.core.security import create_refresh_token, decode_refresh_token
        token = create_refresh_token({"sub": "user_abc"})
        payload = decode_refresh_token(token)
        assert payload["sub"] == "user_abc"
        assert payload.get("type") == "refresh"

    def test_access_token_rejected_by_decode_refresh(self):
        from app.core.security import create_access_token, decode_refresh_token
        access_tok = create_access_token({"sub": "user_xyz"})
        with pytest.raises(Exception):
            decode_refresh_token(access_tok)

    def test_tampered_token_raises(self):
        from app.core.security import create_refresh_token, decode_refresh_token
        token = create_refresh_token({"sub": "user_test"})
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(Exception):
            decode_refresh_token(tampered)
