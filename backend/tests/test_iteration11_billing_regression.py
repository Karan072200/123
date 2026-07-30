"""Iteration 11 regression: billing endpoints still return 200 after ERP UI refactor.
No backend changes expected; simply verify listing endpoints work for a fresh user.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://finance-hardening.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def auth():
    email = f"erp_it11_{int(time.time())}_{uuid.uuid4().hex[:6]}@test.com"
    password = "Testpass123!"
    r = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": password, "name": "ERP Test 11"},
        timeout=30,
    )
    if r.status_code == 429:
        pytest.skip(f"Rate limited on register: {r.text}")
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    body = r.json()
    token = body.get("token") or body.get("access_token")
    assert token, f"no token in register response: {body}"
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    yield s, email
    try:
        s.delete(f"{BASE_URL}/api/auth/me", timeout=15)
    except Exception:
        pass


ENDPOINTS = [
    "/api/billing/invoices",
    "/api/billing/products",
    "/api/billing/customers",
    "/api/billing/suppliers",
    "/api/ledgers",
    "/api/udhaar",
    "/api/analytics/summary",
]


@pytest.mark.parametrize("endpoint", ENDPOINTS)
def test_endpoint_returns_ok(auth, endpoint):
    s, _ = auth
    r = s.get(f"{BASE_URL}{endpoint}", timeout=30)
    assert r.status_code == 200, f"{endpoint} -> {r.status_code}: {r.text[:300]}"
    # Ensure JSON-serializable
    data = r.json()
    assert data is not None
