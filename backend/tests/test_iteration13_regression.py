"""Iteration 13 light regression - 5 endpoint pings + statement.pdf + gstin lookup."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")


@pytest.fixture(scope="module")
def auth():
    email = f"erp_it13_{int(time.time())}@test.com"
    r = requests.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "Testpass123!", "name": "IT13"})
    assert r.status_code in (200, 201), r.text
    token = r.json().get("token") or r.json().get("access_token")
    assert token, r.json()
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {token}"
    return s


def test_customers_get_post(auth):
    r = auth.get(f"{BASE_URL}/api/billing/customers")
    assert r.status_code == 200
    r2 = auth.post(f"{BASE_URL}/api/billing/customers",
                   json={"name": "TEST_Cust13", "phone": "9999999999"})
    assert r2.status_code in (200, 201), r2.text
    cid = r2.json()["id"]
    pytest.customer_id = cid


def test_suppliers_get(auth):
    r = auth.get(f"{BASE_URL}/api/billing/suppliers")
    assert r.status_code == 200


def test_invoices_get(auth):
    r = auth.get(f"{BASE_URL}/api/billing/invoices")
    assert r.status_code == 200


def test_party_get(auth):
    r = auth.get(f"{BASE_URL}/api/billing/parties/{pytest.customer_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_Cust13"


def test_party_statement_json(auth):
    r = auth.get(f"{BASE_URL}/api/billing/parties/{pytest.customer_id}/statement")
    assert r.status_code == 200


def test_party_statement_pdf(auth):
    r = auth.get(f"{BASE_URL}/api/billing/parties/{pytest.customer_id}/statement.pdf")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF"


def test_gstin_lookup(auth):
    r = auth.get(f"{BASE_URL}/api/gstin/lookup/27ABCDE1234F1Z5")
    assert r.status_code == 200
    assert "state" in r.json() or "state_name" in r.json()
