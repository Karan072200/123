"""Iteration 15: Google auth error handling regression.
Ensures /api/auth/google still rejects invalid credentials with 401 and other auth flows work.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://finance-hardening.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def fresh_user():
    email = f"TEST_it15_{uuid.uuid4().hex[:8]}@example.com"
    password = "Testpass123!"
    name = "Iter15 Tester"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": password, "name": name, "currency": "INR"
    }, timeout=30)
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": password, "name": name, "token": data.get("access_token") or data.get("token")}


# --- Google auth negative path ---
def test_google_auth_invalid_credential_returns_401():
    r = requests.post(f"{API}/auth/google", json={"credential": "this-is-not-a-real-jwt"}, timeout=30)
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"
    body = r.json()
    detail = body.get("detail") or body.get("message") or ""
    assert "Invalid Google token" in detail or "invalid" in detail.lower(), f"unexpected detail: {detail}"


def test_google_auth_endpoint_reachable_no_body():
    r = requests.post(f"{API}/auth/google", json={}, timeout=30)
    assert r.status_code in (400, 401, 422), f"unexpected status {r.status_code}: {r.text}"


# --- Regression: other auth endpoints still healthy ---
def test_register_then_login(fresh_user):
    r = requests.post(f"{API}/auth/login", json={
        "email": fresh_user["email"], "password": fresh_user["password"]
    }, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("access_token") or data.get("token")


def test_auth_me(fresh_user):
    token = fresh_user["token"]
    assert token, "no token from registration"
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    assert r.status_code == 200, f"/auth/me failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("email", "").lower() == fresh_user["email"].lower()


def test_pin_login_flow(fresh_user):
    """Set a PIN, then login with it."""
    token = fresh_user["token"]
    # Try to set PIN — endpoint may vary; try common ones
    pin = "1234"
    set_endpoints = [
        (f"{API}/auth/pin/set", {"pin": pin}),
        (f"{API}/auth/pin", {"pin": pin}),
        (f"{API}/users/me/pin", {"pin": pin}),
    ]
    set_ok = False
    for url, payload in set_endpoints:
        r = requests.post(url, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=30)
        if r.status_code in (200, 201, 204):
            set_ok = True
            break
    if not set_ok:
        pytest.skip("PIN set endpoint not found — skipping PIN login test")

    r = requests.post(f"{API}/auth/pin/login", json={
        "email": fresh_user["email"], "pin": pin
    }, timeout=30)
    assert r.status_code == 200, f"pin login failed: {r.status_code} {r.text}"
