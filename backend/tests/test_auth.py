"""Auth endpoint tests — register, login, profile, forgot-password, reset-password."""
from app.services import otp_service


class TestRegister:
    def test_register_success(self, client):
        r = client.post("/api/v1/auth/register", json={
            "username": "newuser_auth",
            "email": "newuser_auth@farm.ai",
            "password": "Pass1234!",
            "full_name": "New User",
        })
        assert r.status_code == 201

    def test_register_duplicate_username(self, client):
        client.post("/api/v1/auth/register", json={
            "username": "dup_user", "email": "dup1@farm.ai",
            "password": "Pass123!", "full_name": "D"
        })
        r = client.post("/api/v1/auth/register", json={
            "username": "dup_user", "email": "dup2@farm.ai",
            "password": "Pass123!", "full_name": "D"
        })
        assert r.status_code in (400, 409)

    def test_register_duplicate_email(self, client):
        client.post("/api/v1/auth/register", json={
            "username": "emailuser1", "email": "shared@farm.ai",
            "password": "Pass123!", "full_name": "E"
        })
        r = client.post("/api/v1/auth/register", json={
            "username": "emailuser2", "email": "shared@farm.ai",
            "password": "Pass123!", "full_name": "E"
        })
        assert r.status_code in (400, 409)


class TestLogin:
    def test_login_success(self, client, auth_headers):
        assert auth_headers["Authorization"].startswith("Bearer ")

    def test_login_wrong_password(self, client):
        client.post("/api/v1/auth/register", json={
            "username": "logintest", "email": "logintest@farm.ai",
            "password": "correct123", "full_name": "L"
        })
        r = client.post("/api/v1/auth/login", json={"username": "logintest", "password": "wrong"})
        assert r.status_code in (400, 401)

    def test_login_unknown_user(self, client):
        r = client.post("/api/v1/auth/login", json={"username": "ghost", "password": "x"})
        assert r.status_code in (400, 401, 404)

    def test_login_returns_token(self, client):
        client.post("/api/v1/auth/register", json={
            "username": "tokenuser", "email": "tokenuser@farm.ai",
            "password": "Pass123!", "full_name": "T"
        })
        r = client.post("/api/v1/auth/login", json={"username": "tokenuser", "password": "Pass123!"})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


class TestProfile:
    def test_profile_requires_auth(self, client):
        r = client.get("/api/v1/auth/profile")
        assert r.status_code == 401

    def test_profile_authenticated(self, client, auth_headers):
        r = client.get("/api/v1/auth/profile", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "username" in data
        assert "email" in data


class TestForgotPassword:
    def test_forgot_email_unknown(self, client):
        r = client.post("/api/v1/auth/forgot-password/email", json={"email": "nobody@x.com"})
        assert r.status_code == 404

    def test_forgot_email_known(self, client):
        client.post("/api/v1/auth/register", json={
            "username": "forgotuser", "email": "forgot@farm.ai",
            "password": "Pass123!", "full_name": "F"
        })
        r = client.post("/api/v1/auth/forgot-password/email", json={"email": "forgot@farm.ai"})
        assert r.status_code == 200
        assert r.json()["channel"] == "email"

    def test_forgot_whatsapp_unknown(self, client):
        r = client.post("/api/v1/auth/forgot-password/whatsapp", json={"phone_number": "+21699000000"})
        assert r.status_code == 404


class TestResetPassword:
    def test_reset_invalid_otp(self, client):
        r = client.post("/api/v1/auth/reset-password", json={
            "channel": "email",
            "identifier": "anyone@farm.ai",
            "otp": "000000",
            "new_password": "newpass123",
        })
        assert r.status_code == 400

    def test_reset_invalid_channel(self, client):
        r = client.post("/api/v1/auth/reset-password", json={
            "channel": "sms",
            "identifier": "x",
            "otp": "123456",
            "new_password": "newpass123",
        })
        assert r.status_code in (400, 422)

    def test_reset_full_flow(self, client):
        client.post("/api/v1/auth/register", json={
            "username": "resetuser", "email": "reset@farm.ai",
            "password": "oldpass123", "full_name": "R"
        })
        from datetime import datetime, timedelta
        otp_service.OTP_STORE["email:reset@farm.ai"] = {
            "otp": "654321",
            "expires": datetime.utcnow() + timedelta(minutes=5),
        }
        r = client.post("/api/v1/auth/reset-password", json={
            "channel": "email",
            "identifier": "reset@farm.ai",
            "otp": "654321",
            "new_password": "newpass123",
        })
        assert r.status_code == 200
        assert r.json()["success"] is True
        login_r = client.post("/api/v1/auth/login", json={
            "username": "resetuser", "password": "newpass123"
        })
        assert login_r.status_code == 200
