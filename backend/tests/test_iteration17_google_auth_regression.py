"""Regression tests for iteration 17 — Google auth banner (host-allowlist) approach.

We only re-verify the backend auth endpoints still behave as before:
 - POST /api/auth/google  -> 401 on invalid credential
 - POST /api/auth/register -> 200 on new user
 - POST /api/auth/login    -> 200 with correct password
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if "REACT_APP_BACKEND_URL" in os.environ else None

# Fallback: read from frontend/.env
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def test_user():
    return {
        "email": f"TEST_iter17_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Testpass123!",
        "name": "Iter17 Tester",
        "currency": "INR",
    }


class TestGoogleAuthInvalid:
    def test_google_invalid_credential_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/google", json={"credential": "not-a-real-jwt"})
        assert r.status_code == 401, f"Expected 401 got {r.status_code}: {r.text[:200]}"


class TestRegisterAndLogin:
    def test_register_new_user_returns_200(self, api, test_user):
        r = api.post(f"{BASE_URL}/api/auth/register", json=test_user)
        assert r.status_code == 200, f"register failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        # sanity: token or user data returned
        assert isinstance(data, dict)

    def test_login_with_registered_user_returns_200(self, api, test_user):
        # ensure user exists (idempotent-ish: register may 400 if already there)
        api.post(f"{BASE_URL}/api/auth/register", json=test_user)
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"


class TestGoogleOauthDoc:
    def test_google_oauth_fix_doc_exists(self):
        path = "/app/GOOGLE_OAUTH_FIX.md"
        assert os.path.exists(path)
        assert os.path.getsize(path) > 2048, "GOOGLE_OAUTH_FIX.md should be >2KB"
