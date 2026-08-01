"""Iteration 14 — Convert AlertDialog + WhatsApp reminders backend contract tests."""
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
    email = f"erp_it14_{int(time.time())}@test.com"
    r = requests.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "Testpass123!", "name": "IT14"})
    assert r.status_code in (200, 201), r.text
    token = r.json().get("token") or r.json().get("access_token")
    assert token
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {token}"
    return s


# ---- Reminder Settings ----
def test_reminder_settings_default(auth):
    r = auth.get(f"{BASE_URL}/api/billing/settings/reminders")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body == {"reminders_enabled": False, "reminder_interval_days": 7}


def test_reminder_settings_patch_and_persist(auth):
    r = auth.patch(f"{BASE_URL}/api/billing/settings/reminders",
                   json={"reminders_enabled": True, "reminder_interval_days": 5})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reminders_enabled"] is True
    assert body["reminder_interval_days"] == 5

    r2 = auth.get(f"{BASE_URL}/api/billing/settings/reminders")
    assert r2.status_code == 200
    assert r2.json() == {"reminders_enabled": True, "reminder_interval_days": 5}


def test_reminder_interval_clamped(auth):
    r = auth.patch(f"{BASE_URL}/api/billing/settings/reminders",
                   json={"reminders_enabled": True, "reminder_interval_days": 500})
    assert r.status_code == 200
    assert r.json()["reminder_interval_days"] == 90

    r = auth.patch(f"{BASE_URL}/api/billing/settings/reminders",
                   json={"reminders_enabled": True, "reminder_interval_days": -3})
    assert r.status_code == 200
    assert r.json()["reminder_interval_days"] == 1

    # reset for downstream tests
    auth.patch(f"{BASE_URL}/api/billing/settings/reminders",
               json={"reminders_enabled": True, "reminder_interval_days": 7})


# ---- Manual Party Reminder ----
def _mk_customer(auth, name, opening=0):
    r = auth.post(f"{BASE_URL}/api/billing/customers",
                  json={"name": name, "phone": "9876543210", "opening_balance": opening})
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def test_send_reminder_success_with_outstanding(auth):
    cid = _mk_customer(auth, "TEST_ReminderCust", opening=1500)
    pytest.reminder_customer_id = cid

    r = auth.post(f"{BASE_URL}/api/billing/parties/{cid}/send-reminder")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["party_id"] == cid
    assert body["party_name"] == "TEST_ReminderCust"
    assert body["outstanding"] == 1500
    assert body["whatsapp_url"].startswith("https://wa.me/")
    assert "text=" in body["whatsapp_url"]
    assert isinstance(body["message"], str) and len(body["message"]) > 0
    assert body["last_reminder_at"]
    # ISO timestamp roughly
    assert "T" in body["last_reminder_at"]


def test_send_reminder_stamps_last_reminder_at(auth):
    cid = pytest.reminder_customer_id
    # Refetch party via party endpoint to verify persistence
    r = auth.get(f"{BASE_URL}/api/billing/parties/{cid}")
    assert r.status_code == 200
    assert r.json().get("last_reminder_at")


def test_send_reminder_zero_outstanding_returns_400(auth):
    cid = _mk_customer(auth, "TEST_ZeroOutstanding", opening=0)
    r = auth.post(f"{BASE_URL}/api/billing/parties/{cid}/send-reminder")
    assert r.status_code == 400, r.text


def test_send_reminder_party_not_found(auth):
    r = auth.post(f"{BASE_URL}/api/billing/parties/does-not-exist-xyz/send-reminder")
    assert r.status_code == 404


# ---- Broader regression ----
def test_invoices_get(auth):
    r = auth.get(f"{BASE_URL}/api/billing/invoices")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_customers_get(auth):
    r = auth.get(f"{BASE_URL}/api/billing/customers")
    assert r.status_code == 200


def test_party_statement_json_and_pdf(auth):
    cid = pytest.reminder_customer_id
    r = auth.get(f"{BASE_URL}/api/billing/parties/{cid}/statement")
    assert r.status_code == 200
    r2 = auth.get(f"{BASE_URL}/api/billing/parties/{cid}/statement.pdf")
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("application/pdf")
    assert r2.content[:4] == b"%PDF"


def test_gstin_lookup(auth):
    r = auth.get(f"{BASE_URL}/api/gstin/lookup/27ABCDE1234F1Z5")
    assert r.status_code == 200


# ---- Convert flow (create a quotation invoice then convert to tax) ----
def test_convert_flow_quotation_to_tax(auth):
    # Need to create a quotation to convert
    payload = {
        "invoice_type": "quotation",
        "customer_id": pytest.reminder_customer_id,
        "customer_name": "TEST_ReminderCust",
        "items": [{"name": "Widget", "qty": 1, "price": 100, "tax_rate": 0}],
    }
    r = auth.post(f"{BASE_URL}/api/billing/invoices", json=payload)
    assert r.status_code in (200, 201), r.text
    inv = r.json()
    inv_id = inv["id"]

    r2 = auth.post(f"{BASE_URL}/api/billing/invoices/{inv_id}/convert",
                   json={"target_type": "tax"})
    assert r2.status_code in (200, 201), r2.text
    new = r2.json()
    assert new.get("id") and new["id"] != inv_id
    assert new.get("invoice_type") == "tax"
    assert new.get("converted_from_id") == inv_id


# ---- Scheduler registration ----
def test_scheduler_registered_in_logs():
    """Verify APScheduler startup log line is present in backend supervisor output."""
    try:
        with open("/var/log/supervisor/backend.err.log") as f:
            content = f.read()
    except FileNotFoundError:
        pytest.skip("Backend log not accessible")
    assert "APScheduler started" in content


# ---- Security doc ----
def test_security_rotation_doc_exists():
    p = "/app/SECURITY_KEY_ROTATION.md"
    assert os.path.exists(p)
    assert os.path.getsize(p) > 2048
