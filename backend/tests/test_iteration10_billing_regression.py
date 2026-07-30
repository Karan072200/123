"""
Iteration 10 backend regression tests for Apka Munim billing stack.

Scope:
- FY-aware invoice numbering (INV/2526/0001)
- Invoice templates & recurring invoices CRUD
- Webhook secret rotate/info + HMAC verification
- Generic + Razorpay/Cashfree/PhonePe UPI webhooks
- Bank payment CSV import (HDFC-shape)
- Reconcile + confirm
- Overdue digest preview + send (503 dev)
- Webhook health aggregation
- PATCH 404s on accounts/kids/warranties
- Public delete-account-request rate-limit (5/hr)
- Canonical DELETE /auth/me + legacy /user/delete-account 404
"""
import os
import hmac
import hashlib
import json
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

# ---------------------------------------------------------------------------
# Shared session + fixture user
# ---------------------------------------------------------------------------
_SESSION_STATE = {"token": None, "user": None, "email": None, "password": None}


def _headers():
    return {"Authorization": f"Bearer {_SESSION_STATE['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="session", autouse=True)
def bootstrap_user():
    """Register ONE fresh user for the whole regression run (register is 5/hr rate-limited)."""
    # Server lowercases the email before storing, so use a lowercase prefix.
    email = f"test_it10_{uuid.uuid4().hex[:10]}@example.com"
    password = "TestPass123!"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": password, "name": "IT10 Tester", "currency": "INR",
    }, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Register failed ({r.status_code}): {r.text[:300]}")
    body = r.json()
    _SESSION_STATE["token"] = body["token"]
    _SESSION_STATE["email"] = email
    _SESSION_STATE["password"] = password
    # Load /auth/me to capture user id (business_id used for webhooks)
    me = requests.get(f"{API}/auth/me", headers=_headers(), timeout=15)
    assert me.status_code == 200, me.text
    _SESSION_STATE["user"] = me.json()
    yield
    # Best-effort cleanup — delete the account
    try:
        requests.delete(f"{API}/auth/me", headers=_headers(), timeout=15)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Auth basics
# ---------------------------------------------------------------------------
class TestAuth:
    def test_auth_me_returns_user(self):
        r = requests.get(f"{API}/auth/me", headers=_headers(), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == _SESSION_STATE["email"]
        assert "id" in data
        assert "personal_ledger_id" in data


# ---------------------------------------------------------------------------
# Invoice numbering
# ---------------------------------------------------------------------------
_INVOICE_STATE = {}


class TestInvoiceNumbering:
    def _create_invoice(self, invoice_type, invoice_date, customer_name="TEST_Cust", amount=100):
        payload = {
            "invoice_type": invoice_type,
            "customer_name": customer_name,
            "items": [{"name": "Item", "qty": 1, "price": amount, "gst_rate": 0}],
            "gst_mode": "exclusive",
            "payment_mode": "credit",
            "invoice_date": invoice_date,
            "due_date": "2025-01-01",  # past date -> becomes overdue for digest test
        }
        return requests.post(f"{API}/billing/invoices", json=payload, headers=_headers(), timeout=15)

    def test_first_tax_invoice_feb2026_is_INV_2526_0001(self):
        r = self._create_invoice("tax", "2026-02-15T00:00:00Z", amount=1234.56)
        assert r.status_code == 200, r.text
        inv = r.json()
        assert inv["invoice_number"] == "INV/2526/0001", f"got {inv['invoice_number']}"
        _INVOICE_STATE["first_tax"] = inv

    def test_second_tax_invoice_same_fy_is_INV_2526_0002(self):
        r = self._create_invoice("tax", "2026-03-01T00:00:00Z", amount=500)
        assert r.status_code == 200, r.text
        inv = r.json()
        assert inv["invoice_number"] == "INV/2526/0002"
        _INVOICE_STATE["second_tax"] = inv

    def test_gst_invoice_uses_GST_prefix(self):
        r = self._create_invoice("gst", "2026-02-20T00:00:00Z", amount=750)
        assert r.status_code == 200, r.text
        inv = r.json()
        assert inv["invoice_number"].startswith("GST/2526/"), inv["invoice_number"]
        _INVOICE_STATE["gst"] = inv


# ---------------------------------------------------------------------------
# Invoice templates
# ---------------------------------------------------------------------------
class TestInvoiceTemplates:
    def test_create_list_delete_template(self):
        payload = {
            "name": "TEST_AMC_2026",
            "invoice_type": "tax",
            "items": [{"name": "AMC", "qty": 1, "price": 1000, "gst_rate": 18}],
            "gst_mode": "exclusive",
        }
        r = requests.post(f"{API}/billing/invoice-templates", json=payload, headers=_headers(), timeout=15)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["name"] == "TEST_AMC_2026"
        tid = t["id"]

        r = requests.get(f"{API}/billing/invoice-templates", headers=_headers(), timeout=15)
        assert r.status_code == 200
        assert any(x["id"] == tid for x in r.json())

        r = requests.delete(f"{API}/billing/invoice-templates/{tid}", headers=_headers(), timeout=15)
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Recurring invoices
# ---------------------------------------------------------------------------
class TestRecurringInvoices:
    def test_create_list_patch_delete(self):
        payload = {
            "name": "TEST_MonthlyRent",
            "invoice_type": "tax",
            "customer_name": "TEST_Tenant",
            "items": [{"name": "Rent", "qty": 1, "price": 5000, "gst_rate": 0}],
            "gst_mode": "exclusive",
            "day_of_month": 1,
            "enabled": True,
        }
        r = requests.post(f"{API}/billing/recurring-invoices", json=payload, headers=_headers(), timeout=15)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]

        r = requests.get(f"{API}/billing/recurring-invoices", headers=_headers(), timeout=15)
        assert r.status_code == 200
        assert any(x["id"] == rid for x in r.json())

        r = requests.patch(
            f"{API}/billing/recurring-invoices/{rid}",
            json={"enabled": False},
            headers=_headers(), timeout=15,
        )
        assert r.status_code == 200

        r = requests.patch(
            f"{API}/billing/recurring-invoices/does-not-exist",
            json={"enabled": False},
            headers=_headers(), timeout=15,
        )
        assert r.status_code == 404

        r = requests.delete(f"{API}/billing/recurring-invoices/{rid}", headers=_headers(), timeout=15)
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Webhook rotate + info + HMAC
# ---------------------------------------------------------------------------
_WEBHOOK = {}


class TestWebhookSecret:
    def test_rotate_returns_secret_and_url(self):
        r = requests.post(f"{API}/billing/webhook/rotate", headers=_headers(), timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "secret" in j and len(j["secret"]) > 10
        assert j["webhook_url"].endswith(f"/api/webhooks/upi/{_SESSION_STATE['user']['id']}")
        _WEBHOOK["secret"] = j["secret"]

    def test_info_reports_has_secret_true(self):
        r = requests.get(f"{API}/billing/webhook/info", headers=_headers(), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["has_secret"] is True


# ---------------------------------------------------------------------------
# Public webhook endpoints
# ---------------------------------------------------------------------------
def _sign(secret: str, body_bytes: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()


class TestPublicWebhooks:
    def test_generic_webhook_without_signature_401(self):
        bid = _SESSION_STATE["user"]["id"]
        payload = {"amount": 100, "reference": "no-sig"}
        r = requests.post(f"{API}/webhooks/upi/{bid}", json=payload, timeout=15)
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text[:200]}"

    def test_generic_webhook_with_valid_signature_clears_invoice(self):
        bid = _SESSION_STATE["user"]["id"]
        inv = _INVOICE_STATE["first_tax"]
        body = json.dumps({
            "amount": float(inv["total"]),
            "reference": f"UPI/{inv['invoice_number']}",
            "payer_name": "TEST_Cust",
            "payer_upi": "test@upi",
        }).encode()
        sig = _sign(_WEBHOOK["secret"], body)
        r = requests.post(
            f"{API}/webhooks/upi/{bid}",
            data=body,
            headers={"Content-Type": "application/json", "X-Signature-256": sig},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        assert r.json().get("status") == "accepted"

        # Verify invoice balance_due cleared
        g = requests.get(f"{API}/billing/invoices/{inv['id']}", headers=_headers(), timeout=15)
        assert g.status_code == 200
        assert g.json()["balance_due"] == 0, f"balance_due = {g.json()['balance_due']}"

    def test_razorpay_adapter(self):
        bid = _SESSION_STATE["user"]["id"]
        body = json.dumps({
            "payload": {"payment": {"entity": {
                "id": "pay_TEST1",
                "amount": 12345,  # paise -> 123.45
                "vpa": "buyer@okhdfc",
                "notes": {"invoice": "INV/2526/9999"},
                "method": "upi",
                "email": "buyer@example.com",
            }}}
        }).encode()
        sig = _sign(_WEBHOOK["secret"], body)
        r = requests.post(
            f"{API}/webhooks/upi/{bid}/razorpay",
            data=body,
            headers={"Content-Type": "application/json", "X-Signature-256": sig},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.json().get("provider") == "razorpay"

    def test_cashfree_adapter(self):
        bid = _SESSION_STATE["user"]["id"]
        body = json.dumps({
            "data": {
                "order": {"order_id": "ORDER_TEST_CF", "order_amount": 250.5},
                "payment": {
                    "payment_amount": 250.5,
                    "bank_reference": "CFREF123",
                    "cf_payment_id": "pay_cf_1",
                    "payment_group": "upi",
                    "payment_method": {"upi": {"upi_id": "cf@upi"}},
                },
                "customer_details": {"customer_name": "TEST_CF"},
            }
        }).encode()
        sig = _sign(_WEBHOOK["secret"], body)
        r = requests.post(
            f"{API}/webhooks/upi/{bid}/cashfree",
            data=body,
            headers={"Content-Type": "application/json", "X-Signature-256": sig},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.json().get("provider") == "cashfree"

    def test_phonepe_adapter(self):
        bid = _SESSION_STATE["user"]["id"]
        body = json.dumps({
            "data": {
                "amount": 50000,  # paise -> 500
                "merchantTransactionId": "MTX_TEST_PP",
                "paymentInstrument": {"accountHolderName": "TEST_PP", "utr": "UTR123"},
                "providerReferenceId": "PROV_PP",
            }
        }).encode()
        sig = _sign(_WEBHOOK["secret"], body)
        r = requests.post(
            f"{API}/webhooks/upi/{bid}/phonepe",
            data=body,
            headers={"Content-Type": "application/json", "X-Signature-256": sig},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.json().get("provider") == "phonepe"

    def test_unknown_provider_404(self):
        bid = _SESSION_STATE["user"]["id"]
        r = requests.post(f"{API}/webhooks/upi/{bid}/unknown-provider", json={"a": 1}, timeout=15)
        assert r.status_code == 404, r.text[:300]


# ---------------------------------------------------------------------------
# CSV import
# ---------------------------------------------------------------------------
HDFC_CSV = """Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amount,Deposit Amount,Closing Balance
15/02/26,UPI-JOHN-TEST/INV/2526/0002,REF001,15/02/26,,500.00,10500.00
16/02/26,ATM WITHDRAWAL,REF002,16/02/26,200.00,,10300.00
17/02/26,SALARY CREDIT XYZ,REF003,17/02/26,,15000.00,25300.00
"""


class TestCSVImport:
    def test_empty_csv_400(self):
        r = requests.post(f"{API}/billing/bank-payments/import-csv", data=b"",
                          headers={**_headers(), "Content-Type": "text/csv"}, timeout=15)
        assert r.status_code == 400, r.text[:200]

    def test_hdfc_csv_imports_credit_rows_only(self):
        r = requests.post(
            f"{API}/billing/bank-payments/import-csv",
            data=HDFC_CSV.encode(),
            headers={**_headers(), "Content-Type": "text/csv"},
            timeout=20,
        )
        assert r.status_code == 200, r.text[:400]
        j = r.json()
        assert j["imported"] == 2, f"expected 2 credit rows, got {j['imported']}"

        # Verify source=csv-import
        lst = requests.get(f"{API}/billing/bank-payments", headers=_headers(), timeout=15).json()
        csv_docs = [x for x in lst if x.get("source") == "csv-import"]
        assert len(csv_docs) >= 2


# ---------------------------------------------------------------------------
# Reconcile + confirm
# ---------------------------------------------------------------------------
class TestReconcile:
    def test_reconcile_matches_by_invoice_number_or_amount(self):
        r = requests.post(f"{API}/billing/reconcile", headers=_headers(), timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        # We have 2nd invoice INV/2526/0002 with balance 500, CSV row of 500 references INV/2526/0002 → score>=60
        assert j["auto_matched"] >= 1, f"reconcile result: {j}"

        # Verify the 2nd invoice's balance_due is now 0
        inv = _INVOICE_STATE["second_tax"]
        g = requests.get(f"{API}/billing/invoices/{inv['id']}", headers=_headers(), timeout=15).json()
        assert g["balance_due"] == 0, g

    def test_confirm_possible_match(self):
        # Create a partial-match payment (only amount matches GST invoice, no ref)
        inv = _INVOICE_STATE["gst"]
        pay = {
            "amount": float(inv["total"]),
            "reference": "AMBIGUOUS-NO-INVOICE-NO",
            "payer_name": "TEST_Cust",  # matches customer_name partially
        }
        r = requests.post(f"{API}/billing/bank-payments", json=pay, headers=_headers(), timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        rec = requests.post(f"{API}/billing/reconcile", headers=_headers(), timeout=20).json()
        # Fetch payment and see if it's 'possible' or 'matched'
        lst = requests.get(f"{API}/billing/bank-payments", headers=_headers(), timeout=15).json()
        me_pay = next((x for x in lst if x["id"] == pid), None)
        assert me_pay, "payment vanished"
        # It may be matched (if the score reached 60) or possible; confirm endpoint should work either way
        if me_pay.get("status") == "possible":
            c = requests.post(f"{API}/billing/bank-payments/{pid}/confirm", headers=_headers(), timeout=15)
            assert c.status_code == 200, c.text
            # Invoice cleared
            g = requests.get(f"{API}/billing/invoices/{inv['id']}", headers=_headers(), timeout=15).json()
            assert g["balance_due"] == 0
        else:
            # already matched by amount rule → skip confirm assertion but ensure invoice cleared
            g = requests.get(f"{API}/billing/invoices/{inv['id']}", headers=_headers(), timeout=15).json()
            assert g["balance_due"] == 0, g


# ---------------------------------------------------------------------------
# Overdue digest
# ---------------------------------------------------------------------------
class TestOverdueDigest:
    def test_preview_returns_html(self):
        r = requests.get(f"{API}/billing/overdue-digest/preview", headers=_headers(), timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert set(["html", "count", "recipient"]).issubset(j.keys())
        assert isinstance(j["html"], str) and len(j["html"]) > 100
        assert j["recipient"] == _SESSION_STATE["email"]

    def test_send_returns_503_with_placeholder_key(self):
        r = requests.post(f"{API}/billing/overdue-digest/send", headers=_headers(), timeout=20)
        assert r.status_code == 503, f"expected 503, got {r.status_code}: {r.text[:300]}"


# ---------------------------------------------------------------------------
# Webhook health
# ---------------------------------------------------------------------------
class TestWebhookHealth:
    def test_health_returns_all_providers(self):
        r = requests.get(f"{API}/billing/webhook/health", headers=_headers(), timeout=15)
        assert r.status_code == 200, r.text
        arr = r.json()
        assert isinstance(arr, list)
        provs = {row["provider"] for row in arr}
        for p in ("webhook", "razorpay", "cashfree", "phonepe", "csv-import"):
            assert p in provs, f"missing provider {p}: got {provs}"
        for row in arr:
            for k in ("last", "hours_since", "count", "healthy"):
                assert k in row, f"row {row} missing key {k}"


# ---------------------------------------------------------------------------
# PATCH endpoints — 404 on missing id
# ---------------------------------------------------------------------------
class TestPatchNotFound:
    def test_account_patch_404(self):
        r = requests.patch(f"{API}/accounts/does-not-exist",
                           json={"name": "x", "type": "savings", "opening_balance": 0, "currency": "INR"},
                           headers=_headers(), timeout=15)
        assert r.status_code == 404, f"got {r.status_code}: {r.text[:200]}"

    def test_kid_patch_404(self):
        r = requests.patch(f"{API}/kids/does-not-exist",
                           json={"name": "Kid", "monthly_pocket_money": 100},
                           headers=_headers(), timeout=15)
        assert r.status_code == 404, f"got {r.status_code}: {r.text[:200]}"

    def test_warranty_patch_404(self):
        r = requests.patch(f"{API}/warranties/does-not-exist",
                           json={"item_name": "TV", "purchase_date": "2025-01-01",
                                 "warranty_end_date": "2026-01-01"},
                           headers=_headers(), timeout=15)
        assert r.status_code == 404, f"got {r.status_code}: {r.text[:200]}"


# ---------------------------------------------------------------------------
# Public delete-account-request + legacy route + canonical delete
# ---------------------------------------------------------------------------
class TestDeleteAccountRoutes:
    def test_invalid_email_422(self):
        # Pydantic EmailStr → 422
        r = requests.post(f"{API}/public/delete-account-request",
                          json={"email": "not-an-email", "reason": "x"}, timeout=15)
        assert r.status_code == 422, f"got {r.status_code}: {r.text[:200]}"

    def test_rate_limit_5_per_hour(self):
        # Rate limit is 5/hour per remote address. Ingress may rotate client IPs
        # across replicas, so we hit the endpoint up to 20 times and assert at
        # least one 429 fires (i.e. the limiter is wired up).
        statuses = []
        for i in range(20):
            r = requests.post(f"{API}/public/delete-account-request",
                              json={"email": f"rl_{i}_{uuid.uuid4().hex[:6]}@example.com",
                                    "reason": "test"}, timeout=15)
            statuses.append(r.status_code)
        assert 429 in statuses, f"expected at least one 429 in {statuses}"

    def test_legacy_route_removed(self):
        r = requests.delete(f"{API}/user/delete-account", headers=_headers(), timeout=15)
        assert r.status_code == 404, f"legacy route should be 404, got {r.status_code}"

    def test_zzz_canonical_delete_auth_me(self):
        """Named zzz_ so it runs last within this class alphabetically per pytest default order."""
        r = requests.delete(f"{API}/auth/me", headers=_headers(), timeout=20)
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}"
        # /auth/me should now be 401
        m = requests.get(f"{API}/auth/me", headers=_headers(), timeout=15)
        assert m.status_code in (401, 404), f"expected 401/404 after delete, got {m.status_code}"
        # Prevent teardown from double-deleting
        _SESSION_STATE["token"] = None
