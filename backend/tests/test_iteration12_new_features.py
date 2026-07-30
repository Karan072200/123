"""Iteration 12: new features — Convert docs, Party profile+statement, Purchase Bills,
Statement PDF, GSTIN autofill + backend regression.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0]).rstrip("/")


@pytest.fixture(scope="module")
def auth():
    email = f"erp_it12_{int(time.time())}_{uuid.uuid4().hex[:6]}@test.com"
    r = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": "Testpass123!", "name": "ERP Test 12"},
        timeout=30,
    )
    if r.status_code == 429:
        pytest.skip(f"Rate limited: {r.text}")
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    assert token
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    yield s
    try:
        s.delete(f"{BASE_URL}/api/auth/me", timeout=15)
    except Exception:
        pass


# --------- GSTIN lookup ---------
class TestGstinLookup:
    def test_valid_gstin(self, auth):
        r = auth.get(f"{BASE_URL}/api/gstin/lookup/27ABCDE1234F1Z5", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["state_name"] == "Maharashtra"
        assert d["pan"] == "ABCDE1234F"
        assert "Proprietor" in d["entity_type"] or "Individual" in d["entity_type"]

    def test_bad_gstin(self, auth):
        r = auth.get(f"{BASE_URL}/api/gstin/lookup/BADGSTIN", timeout=15)
        assert r.status_code == 400

    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/gstin/lookup/27ABCDE1234F1Z5", timeout=15)
        assert r.status_code == 401, f"expected 401, got {r.status_code}"


# --------- Convert Invoice ---------
class TestConvertInvoice:
    def _create_customer(self, auth):
        r = auth.post(f"{BASE_URL}/api/billing/customers",
                      json={"name": "TEST_ConvCust", "phone": "9999900000"}, timeout=15)
        assert r.status_code in (200, 201), r.text
        return r.json()

    def _create_invoice(self, auth, itype, cust_id, cust_name):
        payload = {
            "invoice_type": itype,
            "customer_id": cust_id,
            "customer_name": cust_name,
            "items": [{"name": "Widget", "qty": 2, "price": 100, "gst_rate": 18}],
            "gst_mode": "exclusive",
            "payment_mode": "credit",
            "status": "final",
        }
        r = auth.post(f"{BASE_URL}/api/billing/invoices", json=payload, timeout=20)
        assert r.status_code in (200, 201), r.text
        return r.json()

    def test_convert_quotation_to_tax(self, auth):
        cust = self._create_customer(auth)
        quo = self._create_invoice(auth, "quotation", cust["id"], cust["name"])
        r = auth.post(f"{BASE_URL}/api/billing/invoices/{quo['id']}/convert",
                      json={"target_type": "tax"}, timeout=20)
        assert r.status_code == 200, r.text
        new_inv = r.json()
        assert new_inv["invoice_type"] == "tax"
        assert new_inv["invoice_number"].startswith("INV"), new_inv["invoice_number"]
        assert new_inv["converted_from_id"] == quo["id"]
        assert new_inv["converted_from_number"] == quo["invoice_number"]

        # source should now have converted_to_id/number
        r2 = auth.get(f"{BASE_URL}/api/billing/invoices/{quo['id']}", timeout=15)
        assert r2.status_code == 200
        src = r2.json()
        assert src.get("converted_to_id") == new_inv["id"]
        assert src.get("converted_to_number") == new_inv["invoice_number"]

    def test_convert_tax_returns_400(self, auth):
        cust = self._create_customer(auth)
        inv = self._create_invoice(auth, "tax", cust["id"], cust["name"])
        r = auth.post(f"{BASE_URL}/api/billing/invoices/{inv['id']}/convert",
                      json={"target_type": "tax"}, timeout=20)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"


# --------- Party profile + Statement ---------
class TestPartyStatement:
    def test_profile_statement_pdf(self, auth):
        c = auth.post(f"{BASE_URL}/api/billing/customers",
                      json={"name": "TEST_StmtCust", "phone": "9111100000"}, timeout=15).json()
        # Create a tax invoice
        payload = {
            "invoice_type": "tax",
            "customer_id": c["id"], "customer_name": c["name"],
            "items": [{"name": "Item A", "qty": 1, "price": 500, "gst_rate": 18}],
            "gst_mode": "exclusive", "payment_mode": "credit", "status": "final",
        }
        auth.post(f"{BASE_URL}/api/billing/invoices", json=payload, timeout=20)

        # Party profile
        r = auth.get(f"{BASE_URL}/api/billing/parties/{c['id']}", timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_StmtCust"

        # Statement JSON
        r = auth.get(f"{BASE_URL}/api/billing/parties/{c['id']}/statement", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["party"]["id"] == c["id"]
        assert len(d["invoices"]) >= 1
        totals = d["totals"]
        for k in ("billed", "paid", "outstanding", "count"):
            assert k in totals
        assert totals["count"] == len(d["invoices"])
        assert abs(totals["billed"] - sum(float(i.get("total", 0)) for i in d["invoices"])) < 0.01

        # PDF
        r = auth.get(f"{BASE_URL}/api/billing/parties/{c['id']}/statement.pdf", timeout=30)
        assert r.status_code == 200, r.text[:200]
        assert "application/pdf" in r.headers.get("content-type", "")
        assert r.content.startswith(b"%PDF-")
        assert len(r.content) > 500


# --------- Purchase bills API ---------
class TestPurchaseBill:
    def test_create_and_list_purchase_invoice(self, auth):
        s = auth.post(f"{BASE_URL}/api/billing/suppliers",
                      json={"name": "TEST_Supp1"}, timeout=15).json()
        payload = {
            "invoice_type": "purchase",
            "customer_id": s["id"], "customer_name": s["name"],
            "items": [{"name": "Raw", "qty": 3, "price": 100, "gst_rate": 5}],
            "gst_mode": "exclusive", "payment_mode": "credit", "status": "final",
        }
        r = auth.post(f"{BASE_URL}/api/billing/invoices", json=payload, timeout=20)
        assert r.status_code in (200, 201), r.text
        inv = r.json()
        assert inv["invoice_type"] == "purchase"

        r = auth.get(f"{BASE_URL}/api/billing/invoices", timeout=15)
        assert r.status_code == 200
        types = [i.get("invoice_type") for i in r.json()]
        assert "purchase" in types


# --------- Regression on existing endpoints ---------
ENDPOINTS = [
    "/api/billing/invoices",
    "/api/billing/products",
    "/api/billing/customers",
    "/api/billing/suppliers",
    "/api/ledgers",
    "/api/analytics/summary",
]


@pytest.mark.parametrize("endpoint", ENDPOINTS)
def test_regression_endpoint_ok(auth, endpoint):
    r = auth.get(f"{BASE_URL}{endpoint}", timeout=30)
    assert r.status_code == 200, f"{endpoint} -> {r.status_code}: {r.text[:200]}"
