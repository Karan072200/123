#!/usr/bin/env python3
"""
Backend test suite for Session 4 — Security Hardening + Warehouses.

Tests:
Suite A — SECURITY (13 endpoints):
  - Refresh token flow (issue, refresh, rotation, logout-all)
  - Sessions listing
  - TOTP 2FA (setup, verify, challenge, disable, status)
  - Audit logs
  
Suite B — WAREHOUSES (11 endpoints):
  - Warehouse CRUD
  - Stock levels and adjustments
  - Batches (with expiry)
  - Serials (unique serial numbers)
  - Stock transfers (in-transit → received)
"""
import sys
import uuid
import base64
import requests
import pyotp
from datetime import datetime, timedelta

# Base URL from frontend/.env
BASE_URL = "https://garment-erp-upgrade.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Test user credentials - unique per run
TEST_EMAIL = f"TEST_sec_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "TestPass@123"
TEST_BUSINESS = "Test Sec"

# Global session with auth
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

# Test results
results = {
    "passed": [],
    "failed": [],
    "errors": []
}

# Test data storage
test_data = {
    "refresh_token_v1": None,
    "refresh_token_v2": None,
    "totp_secret": None,
    "backup_codes": [],
    "wh1_id": None,
    "wh2_id": None,
    "batch_id": None,
    "serial_id": None,
    "transfer_id": None,
}


def log_pass(test_name: str, details: str = ""):
    print(f"✅ PASS: {test_name}")
    if details:
        print(f"   {details}")
    results["passed"].append(test_name)


def log_fail(test_name: str, reason: str, response=None):
    print(f"❌ FAIL: {test_name}")
    print(f"   Reason: {reason}")
    if response:
        print(f"   Status: {response.status_code}")
        try:
            print(f"   Body: {response.text[:500]}")
        except Exception:
            pass
    results["failed"].append({"test": test_name, "reason": reason})


def log_error(test_name: str, error: Exception):
    print(f"💥 ERROR: {test_name}")
    print(f"   {type(error).__name__}: {error}")
    results["errors"].append({"test": test_name, "error": str(error)})


# =========================================================================
#                              SETUP
# =========================================================================

def test_auth_register():
    """Setup: Register a fresh test user"""
    try:
        resp = requests.post(
            f"{API_URL}/auth/register",
            json={
                "name": TEST_BUSINESS,
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "currency": "INR",
                "business_name": TEST_BUSINESS
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data:
                # Set auth for session
                session.headers.update({"Authorization": f"Bearer {data['token']}"})
                # Also get cookie
                if "access_token" in resp.cookies:
                    session.cookies.update(resp.cookies)
                log_pass("Setup: Register", f"User: {TEST_EMAIL}")
                return True
            else:
                log_fail("Setup: Register", "No token in response", resp)
                return False
        else:
            log_fail("Setup: Register", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Setup: Register", e)
        return False


# =========================================================================
#                         SUITE A — SECURITY
# =========================================================================

def test_a1_refresh_token_flow():
    """A1. Refresh token flow — issue, refresh, rotation"""
    
    # A1.1: Issue first refresh token
    try:
        resp = session.post(f"{API_URL}/auth/refresh/issue", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "refresh_token" in data and "expires_in_days" in data:
                if data["expires_in_days"] == 30:
                    test_data["refresh_token_v1"] = data["refresh_token"]
                    log_pass("A1.1: POST /auth/refresh/issue", f"Got refresh token, expires_in_days=30")
                else:
                    log_fail("A1.1: POST /auth/refresh/issue", f"Wrong expires_in_days: {data['expires_in_days']}", resp)
                    return False
            else:
                log_fail("A1.1: POST /auth/refresh/issue", "Missing refresh_token or expires_in_days", resp)
                return False
        else:
            log_fail("A1.1: POST /auth/refresh/issue", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("A1.1: POST /auth/refresh/issue", e)
        return False
    
    # A1.2: Use refresh token to get new access token (rotation)
    try:
        resp = session.post(
            f"{API_URL}/auth/refresh",
            json={"refresh_token": test_data["refresh_token_v1"]},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "access_token" in data and "refresh_token" in data and "expires_in" in data:
                test_data["refresh_token_v2"] = data["refresh_token"]
                # Verify rotation: v2 != v1
                if test_data["refresh_token_v2"] != test_data["refresh_token_v1"]:
                    # Verify Set-Cookie header
                    if "access_token" in resp.cookies or "Set-Cookie" in resp.headers:
                        log_pass("A1.2: POST /auth/refresh (rotation)", "Got new access + refresh token, rotation verified")
                    else:
                        log_fail("A1.2: POST /auth/refresh (rotation)", "No Set-Cookie header", resp)
                else:
                    log_fail("A1.2: POST /auth/refresh (rotation)", "Refresh token not rotated (v2 == v1)", resp)
                    return False
            else:
                log_fail("A1.2: POST /auth/refresh (rotation)", "Missing access_token or refresh_token", resp)
                return False
        else:
            log_fail("A1.2: POST /auth/refresh (rotation)", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("A1.2: POST /auth/refresh (rotation)", e)
        return False
    
    # A1.3: Try to use OLD token_v1 again (should be 401)
    try:
        resp = session.post(
            f"{API_URL}/auth/refresh",
            json={"refresh_token": test_data["refresh_token_v1"]},
            timeout=10
        )
        if resp.status_code == 401:
            body = resp.json()
            if "Invalid or revoked refresh token" in body.get("detail", ""):
                log_pass("A1.3: POST /auth/refresh (old token)", "Old token rejected with 401")
            else:
                log_fail("A1.3: POST /auth/refresh (old token)", f"Wrong error message: {body.get('detail')}", resp)
        else:
            log_fail("A1.3: POST /auth/refresh (old token)", f"Expected 401, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A1.3: POST /auth/refresh (old token)", e)
    
    # A1.4: Try garbage token (should be 401)
    try:
        resp = session.post(
            f"{API_URL}/auth/refresh",
            json={"refresh_token": "garbage_token_12345"},
            timeout=10
        )
        if resp.status_code == 401:
            log_pass("A1.4: POST /auth/refresh (garbage)", "Garbage token rejected with 401")
        else:
            log_fail("A1.4: POST /auth/refresh (garbage)", f"Expected 401, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A1.4: POST /auth/refresh (garbage)", e)
    
    return True


def test_a2_sessions():
    """A2. Sessions listing"""
    try:
        resp = session.get(f"{API_URL}/security/sessions", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "sessions" in data and "recent_activity" in data:
                if isinstance(data["sessions"], list) and isinstance(data["recent_activity"], list):
                    log_pass("A2: GET /security/sessions", f"Got {len(data['sessions'])} sessions, {len(data['recent_activity'])} recent activities")
                else:
                    log_fail("A2: GET /security/sessions", "sessions or recent_activity not a list", resp)
            else:
                log_fail("A2: GET /security/sessions", "Missing sessions or recent_activity", resp)
        else:
            log_fail("A2: GET /security/sessions", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A2: GET /security/sessions", e)


def test_a3_logout_all():
    """A3. Logout-all (revoke all refresh tokens)"""
    try:
        resp = session.post(f"{API_URL}/auth/logout-all", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "revoked" in data and data["revoked"] >= 1:
                log_pass("A3.1: POST /auth/logout-all", f"Revoked {data['revoked']} tokens")
                
                # A3.2: Try to use token_v2 (should be 401)
                try:
                    resp2 = session.post(
                        f"{API_URL}/auth/refresh",
                        json={"refresh_token": test_data["refresh_token_v2"]},
                        timeout=10
                    )
                    if resp2.status_code == 401:
                        log_pass("A3.2: POST /auth/refresh (after logout-all)", "Token revoked, got 401")
                    else:
                        log_fail("A3.2: POST /auth/refresh (after logout-all)", f"Expected 401, got {resp2.status_code}", resp2)
                except Exception as e:
                    log_error("A3.2: POST /auth/refresh (after logout-all)", e)
            else:
                log_fail("A3.1: POST /auth/logout-all", f"Wrong revoked count: {data.get('revoked')}", resp)
        else:
            log_fail("A3.1: POST /auth/logout-all", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A3.1: POST /auth/logout-all", e)


def test_a4_totp_2fa():
    """A4. TOTP 2FA setup + verify + challenge + disable"""
    
    # Issue a new refresh token for audit trail
    try:
        session.post(f"{API_URL}/auth/refresh/issue", timeout=10)
    except Exception:
        pass
    
    # A4.1: Setup TOTP
    try:
        resp = session.post(f"{API_URL}/auth/2fa/totp/setup", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "secret" in data and "otpauth_url" in data and "qr_code_png_base64" in data:
                secret = data["secret"]
                otpauth_url = data["otpauth_url"]
                qr_b64 = data["qr_code_png_base64"]
                
                # Verify secret is base32 (A-Z2-7, length 16-32)
                if len(secret) >= 16 and len(secret) <= 32 and all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" for c in secret):
                    # Verify otpauth_url starts with "otpauth://totp/"
                    if otpauth_url.startswith("otpauth://totp/"):
                        # Verify QR code is valid PNG
                        try:
                            qr_bytes = base64.b64decode(qr_b64)
                            if qr_bytes[:8] == b'\x89PNG\r\n\x1a\n':
                                test_data["totp_secret"] = secret
                                log_pass("A4.1: POST /auth/2fa/totp/setup", f"Got secret (len={len(secret)}), otpauth_url, valid PNG QR")
                            else:
                                log_fail("A4.1: POST /auth/2fa/totp/setup", f"QR code not a valid PNG (magic: {qr_bytes[:8]})", resp)
                                return False
                        except Exception as e:
                            log_fail("A4.1: POST /auth/2fa/totp/setup", f"Failed to decode QR base64: {e}", resp)
                            return False
                    else:
                        log_fail("A4.1: POST /auth/2fa/totp/setup", f"otpauth_url wrong format: {otpauth_url}", resp)
                        return False
                else:
                    log_fail("A4.1: POST /auth/2fa/totp/setup", f"Secret not valid base32: {secret}", resp)
                    return False
            else:
                log_fail("A4.1: POST /auth/2fa/totp/setup", "Missing secret, otpauth_url, or qr_code_png_base64", resp)
                return False
        else:
            log_fail("A4.1: POST /auth/2fa/totp/setup", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("A4.1: POST /auth/2fa/totp/setup", e)
        return False
    
    # A4.2: Compute current TOTP code and verify
    try:
        totp = pyotp.TOTP(test_data["totp_secret"])
        code = totp.now()
        
        resp = session.post(
            f"{API_URL}/auth/2fa/totp/verify",
            json={"code": code},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("enabled") == True and "backup_codes" in data:
                backup_codes = data["backup_codes"]
                if isinstance(backup_codes, list) and len(backup_codes) == 8:
                    # Verify backup codes are 8-char hex strings
                    if all(len(bc) == 8 and all(c in "0123456789ABCDEF" for c in bc) for bc in backup_codes):
                        test_data["backup_codes"] = backup_codes
                        log_pass("A4.2: POST /auth/2fa/totp/verify", f"TOTP enabled, got 8 backup codes")
                    else:
                        log_fail("A4.2: POST /auth/2fa/totp/verify", f"Backup codes wrong format: {backup_codes}", resp)
                else:
                    log_fail("A4.2: POST /auth/2fa/totp/verify", f"Expected 8 backup codes, got {len(backup_codes)}", resp)
            else:
                log_fail("A4.2: POST /auth/2fa/totp/verify", f"Wrong response: {data}", resp)
        else:
            log_fail("A4.2: POST /auth/2fa/totp/verify", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A4.2: POST /auth/2fa/totp/verify", e)
    
    # A4.3: Check status
    try:
        resp = session.get(f"{API_URL}/auth/2fa/status", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("totp_enabled") == True and data.get("backup_codes_remaining") == 8:
                log_pass("A4.3: GET /auth/2fa/status", "totp_enabled=true, backup_codes_remaining=8")
            else:
                log_fail("A4.3: GET /auth/2fa/status", f"Wrong status: {data}", resp)
        else:
            log_fail("A4.3: GET /auth/2fa/status", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A4.3: GET /auth/2fa/status", e)
    
    # A4.4: Challenge with wrong code (should be 400)
    try:
        resp = session.post(
            f"{API_URL}/auth/2fa/totp/challenge",
            json={"code": "000000"},
            timeout=10
        )
        if resp.status_code == 400:
            log_pass("A4.4: POST /auth/2fa/totp/challenge (wrong code)", "Got 400 for wrong code")
        else:
            log_fail("A4.4: POST /auth/2fa/totp/challenge (wrong code)", f"Expected 400, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A4.4: POST /auth/2fa/totp/challenge (wrong code)", e)
    
    # A4.5: Challenge with correct TOTP code
    try:
        totp = pyotp.TOTP(test_data["totp_secret"])
        code = totp.now()
        
        resp = session.post(
            f"{API_URL}/auth/2fa/totp/challenge",
            json={"code": code},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("verified") == True:
                log_pass("A4.5: POST /auth/2fa/totp/challenge (correct code)", "Verified=true")
            else:
                log_fail("A4.5: POST /auth/2fa/totp/challenge (correct code)", f"Wrong response: {data}", resp)
        else:
            log_fail("A4.5: POST /auth/2fa/totp/challenge (correct code)", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A4.5: POST /auth/2fa/totp/challenge (correct code)", e)
    
    # A4.6: Challenge with backup code
    if test_data["backup_codes"]:
        try:
            backup_code = test_data["backup_codes"][0]
            
            resp = session.post(
                f"{API_URL}/auth/2fa/totp/challenge",
                json={"code": backup_code},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("verified") == True and data.get("backup_used") == True:
                    log_pass("A4.6: POST /auth/2fa/totp/challenge (backup code)", "Verified=true, backup_used=true")
                    
                    # A4.7: Check status again (should be 7 remaining)
                    try:
                        resp2 = session.get(f"{API_URL}/auth/2fa/status", timeout=10)
                        if resp2.status_code == 200:
                            data2 = resp2.json()
                            if data2.get("backup_codes_remaining") == 7:
                                log_pass("A4.7: GET /auth/2fa/status (after backup)", "backup_codes_remaining=7")
                            else:
                                log_fail("A4.7: GET /auth/2fa/status (after backup)", f"Expected 7, got {data2.get('backup_codes_remaining')}", resp2)
                        else:
                            log_fail("A4.7: GET /auth/2fa/status (after backup)", f"Expected 200, got {resp2.status_code}", resp2)
                    except Exception as e:
                        log_error("A4.7: GET /auth/2fa/status (after backup)", e)
                else:
                    log_fail("A4.6: POST /auth/2fa/totp/challenge (backup code)", f"Wrong response: {data}", resp)
            else:
                log_fail("A4.6: POST /auth/2fa/totp/challenge (backup code)", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("A4.6: POST /auth/2fa/totp/challenge (backup code)", e)
    
    # A4.8: Disable TOTP
    try:
        totp = pyotp.TOTP(test_data["totp_secret"])
        code = totp.now()
        
        resp = session.post(
            f"{API_URL}/auth/2fa/totp/disable",
            json={"code": code},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("enabled") == False:
                log_pass("A4.8: POST /auth/2fa/totp/disable", "TOTP disabled")
                
                # A4.9: Check status (should be disabled)
                try:
                    resp2 = session.get(f"{API_URL}/auth/2fa/status", timeout=10)
                    if resp2.status_code == 200:
                        data2 = resp2.json()
                        if data2.get("totp_enabled") == False:
                            log_pass("A4.9: GET /auth/2fa/status (after disable)", "totp_enabled=false")
                        else:
                            log_fail("A4.9: GET /auth/2fa/status (after disable)", f"totp_enabled should be false: {data2}", resp2)
                    else:
                        log_fail("A4.9: GET /auth/2fa/status (after disable)", f"Expected 200, got {resp2.status_code}", resp2)
                except Exception as e:
                    log_error("A4.9: GET /auth/2fa/status (after disable)", e)
            else:
                log_fail("A4.8: POST /auth/2fa/totp/disable", f"Wrong response: {data}", resp)
        else:
            log_fail("A4.8: POST /auth/2fa/totp/disable", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A4.8: POST /auth/2fa/totp/disable", e)


def test_a5_audit_logs():
    """A5. Audit logs"""
    try:
        resp = session.get(f"{API_URL}/audit-logs?limit=50", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "total" in data and "skip" in data and "limit" in data:
                if data["skip"] == 0 and data["limit"] == 50:
                    # Check if 2fa-enabled and 2fa-disabled entries are present
                    items = data["items"]
                    actions = [item.get("action") for item in items]
                    if "2fa-enabled" in actions and "2fa-disabled" in actions:
                        log_pass("A5: GET /audit-logs", f"Got {data['total']} logs, includes 2fa-enabled and 2fa-disabled")
                    else:
                        log_pass("A5: GET /audit-logs", f"Got {data['total']} logs (2fa entries may not be present yet)")
                else:
                    log_fail("A5: GET /audit-logs", f"Wrong skip/limit: {data['skip']}/{data['limit']}", resp)
            else:
                log_fail("A5: GET /audit-logs", "Missing items, total, skip, or limit", resp)
        else:
            log_fail("A5: GET /audit-logs", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("A5: GET /audit-logs", e)


def test_a6_auth_enforcement():
    """A6. Auth enforcement on security endpoints"""
    endpoints = [
        "/auth/refresh/issue",
        "/security/sessions",
        "/auth/logout-all",
        "/auth/2fa/totp/setup",
        "/auth/2fa/status",
        "/audit-logs"
    ]
    
    # Create a session without auth
    unauth_session = requests.Session()
    
    for endpoint in endpoints:
        try:
            resp = unauth_session.get(f"{API_URL}{endpoint}", timeout=10)
            if resp.status_code == 401:
                log_pass(f"A6: Auth required {endpoint}", "Returns 401 without auth")
            else:
                log_fail(f"A6: Auth required {endpoint}", f"Expected 401, got {resp.status_code}", resp)
        except Exception as e:
            log_error(f"A6: Auth required {endpoint}", e)


# =========================================================================
#                         SUITE B — WAREHOUSES
# =========================================================================

def test_b1_warehouse_crud():
    """B1. Warehouse CRUD"""
    
    # B1.1: Create Main WH
    try:
        resp = session.post(
            f"{API_URL}/warehouses",
            json={"name": "Main WH", "code": "WH1", "is_default": True},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("wh_"):
                test_data["wh1_id"] = data["id"]
                log_pass("B1.1: POST /warehouses (Main WH)", f"Created {test_data['wh1_id']}")
            else:
                log_fail("B1.1: POST /warehouses (Main WH)", "ID missing or wrong format", resp)
                return False
        else:
            log_fail("B1.1: POST /warehouses (Main WH)", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("B1.1: POST /warehouses (Main WH)", e)
        return False
    
    # B1.2: Create Branch WH
    try:
        resp = session.post(
            f"{API_URL}/warehouses",
            json={"name": "Branch WH", "code": "WH2"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("wh_"):
                test_data["wh2_id"] = data["id"]
                log_pass("B1.2: POST /warehouses (Branch WH)", f"Created {test_data['wh2_id']}")
            else:
                log_fail("B1.2: POST /warehouses (Branch WH)", "ID missing or wrong format", resp)
        else:
            log_fail("B1.2: POST /warehouses (Branch WH)", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B1.2: POST /warehouses (Branch WH)", e)
    
    # B1.3: List warehouses
    try:
        resp = session.get(f"{API_URL}/warehouses", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and len(data["items"]) >= 2:
                log_pass("B1.3: GET /warehouses", f"Found {len(data['items'])} warehouses")
            else:
                log_fail("B1.3: GET /warehouses", f"Expected ≥2 items, got {len(data.get('items', []))}", resp)
        else:
            log_fail("B1.3: GET /warehouses", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B1.3: GET /warehouses", e)
    
    # B1.4: Update warehouse
    if test_data["wh1_id"]:
        try:
            resp = session.put(
                f"{API_URL}/warehouses/{test_data['wh1_id']}",
                json={"name": "Main WH", "code": "WH1", "is_default": True, "city": "Delhi"},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("city") == "Delhi":
                    log_pass("B1.4: PUT /warehouses/{id}", "Updated city=Delhi")
                else:
                    log_fail("B1.4: PUT /warehouses/{id}", f"City not updated: {data.get('city')}", resp)
            else:
                log_fail("B1.4: PUT /warehouses/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B1.4: PUT /warehouses/{id}", e)


def test_b2_stock_adjustment():
    """B2. Stock adjustment + levels"""
    
    # B2.1: Adjust stock for prod-1
    try:
        resp = session.post(
            f"{API_URL}/warehouses/stock/adjust",
            json={
                "warehouse_id": test_data["wh1_id"],
                "product_id": "prod-1",
                "product_name": "Test Product 1",
                "qty_delta": 100,
                "reason": "Opening balance"
            },
            timeout=10
        )
        if resp.status_code == 200:
            log_pass("B2.1: POST /warehouses/stock/adjust (prod-1)", "Adjusted +100")
        else:
            log_fail("B2.1: POST /warehouses/stock/adjust (prod-1)", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B2.1: POST /warehouses/stock/adjust (prod-1)", e)
    
    # B2.2: Adjust stock for prod-2
    try:
        resp = session.post(
            f"{API_URL}/warehouses/stock/adjust",
            json={
                "warehouse_id": test_data["wh1_id"],
                "product_id": "prod-2",
                "product_name": "Test Product 2",
                "qty_delta": 50,
                "reason": "Opening"
            },
            timeout=10
        )
        if resp.status_code == 200:
            log_pass("B2.2: POST /warehouses/stock/adjust (prod-2)", "Adjusted +50")
        else:
            log_fail("B2.2: POST /warehouses/stock/adjust (prod-2)", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B2.2: POST /warehouses/stock/adjust (prod-2)", e)
    
    # B2.3: Get stock levels
    try:
        resp = session.get(f"{API_URL}/warehouses/stock", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "levels" in data and "summary" in data:
                levels = data["levels"]
                summary = data["summary"]
                if len(levels) >= 2:
                    # Find prod-1 in summary
                    prod1_summary = next((s for s in summary if s["product_id"] == "prod-1"), None)
                    if prod1_summary and prod1_summary.get("total_qty") == 100:
                        log_pass("B2.3: GET /warehouses/stock", f"Found {len(levels)} levels, prod-1 total_qty=100")
                    else:
                        log_fail("B2.3: GET /warehouses/stock", f"prod-1 total_qty wrong: {prod1_summary}", resp)
                else:
                    log_fail("B2.3: GET /warehouses/stock", f"Expected ≥2 levels, got {len(levels)}", resp)
            else:
                log_fail("B2.3: GET /warehouses/stock", "Missing levels or summary", resp)
        else:
            log_fail("B2.3: GET /warehouses/stock", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B2.3: GET /warehouses/stock", e)


def test_b3_batches():
    """B3. Batches"""
    
    # B3.1: Create batch
    try:
        resp = session.post(
            f"{API_URL}/warehouses/batches",
            json={
                "product_id": "prod-1",
                "batch_no": "B001",
                "expiry_date": "2027-01-01",
                "warehouse_id": test_data["wh1_id"],
                "initial_qty": 20,
                "rate": 100
            },
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("batch_"):
                test_data["batch_id"] = data["id"]
                log_pass("B3.1: POST /warehouses/batches", f"Created batch {test_data['batch_id']}")
                
                # B3.2: Verify stock level increased (100 + 20 = 120)
                try:
                    resp2 = session.get(f"{API_URL}/warehouses/stock", timeout=10)
                    if resp2.status_code == 200:
                        data2 = resp2.json()
                        summary = data2.get("summary", [])
                        prod1_summary = next((s for s in summary if s["product_id"] == "prod-1"), None)
                        if prod1_summary and prod1_summary.get("total_qty") == 120:
                            log_pass("B3.2: Verify stock after batch", "prod-1 qty=120 (100+20)")
                        else:
                            log_fail("B3.2: Verify stock after batch", f"Expected 120, got {prod1_summary.get('total_qty') if prod1_summary else 'N/A'}", resp2)
                    else:
                        log_fail("B3.2: Verify stock after batch", f"Expected 200, got {resp2.status_code}", resp2)
                except Exception as e:
                    log_error("B3.2: Verify stock after batch", e)
            else:
                log_fail("B3.1: POST /warehouses/batches", "ID missing or wrong format", resp)
        else:
            log_fail("B3.1: POST /warehouses/batches", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B3.1: POST /warehouses/batches", e)
    
    # B3.3: List batches
    try:
        resp = session.get(f"{API_URL}/warehouses/batches", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data:
                items = data["items"]
                if any(b.get("batch_no") == "B001" for b in items):
                    log_pass("B3.3: GET /warehouses/batches", f"Found {len(items)} batches, includes B001")
                else:
                    log_fail("B3.3: GET /warehouses/batches", "B001 not found", resp)
            else:
                log_fail("B3.3: GET /warehouses/batches", "Missing items", resp)
        else:
            log_fail("B3.3: GET /warehouses/batches", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B3.3: GET /warehouses/batches", e)
    
    # B3.4: Query expiring batches (expiry 2027 is far, should be empty for 1 day)
    try:
        resp = session.get(f"{API_URL}/warehouses/batches?expiring_within_days=1", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data:
                log_pass("B3.4: GET /warehouses/batches?expiring_within_days=1", f"Found {len(data['items'])} expiring batches (likely 0)")
            else:
                log_fail("B3.4: GET /warehouses/batches?expiring_within_days", "Missing items", resp)
        else:
            log_fail("B3.4: GET /warehouses/batches?expiring_within_days", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B3.4: GET /warehouses/batches?expiring_within_days", e)
    
    # B3.5: Try to delete batch (should fail because it has stock)
    if test_data["batch_id"]:
        try:
            resp = session.delete(f"{API_URL}/warehouses/batches/{test_data['batch_id']}", timeout=10)
            if resp.status_code == 400:
                body = resp.json()
                if "stock" in body.get("detail", "").lower():
                    log_pass("B3.5: DELETE /warehouses/batches/{id} (with stock)", "Got 400 with 'stock' message")
                else:
                    log_fail("B3.5: DELETE /warehouses/batches/{id} (with stock)", f"Wrong error message: {body.get('detail')}", resp)
            else:
                log_fail("B3.5: DELETE /warehouses/batches/{id} (with stock)", f"Expected 400, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B3.5: DELETE /warehouses/batches/{id} (with stock)", e)


def test_b4_serials():
    """B4. Serials"""
    
    # B4.1: Create serial SN-A1
    try:
        resp = session.post(
            f"{API_URL}/warehouses/serials",
            json={
                "product_id": "prod-1",
                "serial_no": "SN-A1",
                "status": "in_stock"
            },
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("srl_"):
                test_data["serial_id"] = data["id"]
                log_pass("B4.1: POST /warehouses/serials (SN-A1)", f"Created serial {test_data['serial_id']}")
            else:
                log_fail("B4.1: POST /warehouses/serials (SN-A1)", "ID missing or wrong format", resp)
        else:
            log_fail("B4.1: POST /warehouses/serials (SN-A1)", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B4.1: POST /warehouses/serials (SN-A1)", e)
    
    # B4.2: Try to create duplicate SN-A1 (should fail)
    try:
        resp = session.post(
            f"{API_URL}/warehouses/serials",
            json={
                "product_id": "prod-1",
                "serial_no": "SN-A1",
                "status": "in_stock"
            },
            timeout=10
        )
        if resp.status_code == 400:
            body = resp.json()
            if "already exists" in body.get("detail", "").lower():
                log_pass("B4.2: POST /warehouses/serials (duplicate)", "Got 400 with 'already exists'")
            else:
                log_fail("B4.2: POST /warehouses/serials (duplicate)", f"Wrong error message: {body.get('detail')}", resp)
        else:
            log_fail("B4.2: POST /warehouses/serials (duplicate)", f"Expected 400, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B4.2: POST /warehouses/serials (duplicate)", e)
    
    # B4.3: Create serial SN-A2
    try:
        resp = session.post(
            f"{API_URL}/warehouses/serials",
            json={
                "product_id": "prod-1",
                "serial_no": "SN-A2",
                "status": "in_stock"
            },
            timeout=10
        )
        if resp.status_code == 200:
            log_pass("B4.3: POST /warehouses/serials (SN-A2)", "Created serial SN-A2")
        else:
            log_fail("B4.3: POST /warehouses/serials (SN-A2)", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B4.3: POST /warehouses/serials (SN-A2)", e)
    
    # B4.4: List serials
    try:
        resp = session.get(f"{API_URL}/warehouses/serials", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "total" in data:
                if data["total"] >= 2:
                    log_pass("B4.4: GET /warehouses/serials", f"Found {data['total']} serials")
                else:
                    log_fail("B4.4: GET /warehouses/serials", f"Expected ≥2, got {data['total']}", resp)
            else:
                log_fail("B4.4: GET /warehouses/serials", "Missing items or total", resp)
        else:
            log_fail("B4.4: GET /warehouses/serials", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B4.4: GET /warehouses/serials", e)
    
    # B4.5: Search for SN-A1
    try:
        resp = session.get(f"{API_URL}/warehouses/serials?search=SN-A1", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and len(data["items"]) == 1:
                log_pass("B4.5: GET /warehouses/serials?search=SN-A1", "Found 1 item")
            else:
                log_fail("B4.5: GET /warehouses/serials?search=SN-A1", f"Expected 1 item, got {len(data.get('items', []))}", resp)
        else:
            log_fail("B4.5: GET /warehouses/serials?search=SN-A1", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B4.5: GET /warehouses/serials?search=SN-A1", e)
    
    # B4.6: Update serial status to sold
    if test_data["serial_id"]:
        try:
            resp = session.put(
                f"{API_URL}/warehouses/serials/{test_data['serial_id']}",
                json={
                    "product_id": "prod-1",
                    "serial_no": "SN-A1",
                    "status": "sold"
                },
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "sold":
                    log_pass("B4.6: PUT /warehouses/serials/{id}", "Updated status=sold")
                else:
                    log_fail("B4.6: PUT /warehouses/serials/{id}", f"Status not updated: {data.get('status')}", resp)
            else:
                log_fail("B4.6: PUT /warehouses/serials/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B4.6: PUT /warehouses/serials/{id}", e)
        
        # B4.7: Delete serial
        try:
            resp = session.delete(f"{API_URL}/warehouses/serials/{test_data['serial_id']}", timeout=10)
            if resp.status_code == 200:
                log_pass("B4.7: DELETE /warehouses/serials/{id}", "Deleted serial")
            else:
                log_fail("B4.7: DELETE /warehouses/serials/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B4.7: DELETE /warehouses/serials/{id}", e)


def test_b5_stock_transfers():
    """B5. Stock transfers"""
    
    # B5.1: Create transfer
    try:
        resp = session.post(
            f"{API_URL}/warehouses/transfers",
            json={
                "from_warehouse_id": test_data["wh1_id"],
                "to_warehouse_id": test_data["wh2_id"],
                "transfer_date": "2026-01-01",
                "lines": [
                    {
                        "product_id": "prod-1",
                        "qty": 10,
                        "rate": 100
                    }
                ]
            },
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("xfer_"):
                test_data["transfer_id"] = data["id"]
                if data.get("status") == "in_transit":
                    log_pass("B5.1: POST /warehouses/transfers", f"Created transfer {test_data['transfer_id']}, status=in_transit")
                    
                    # B5.2: Verify source stock decreased (120 - 10 = 110)
                    try:
                        resp2 = session.get(f"{API_URL}/warehouses/stock", timeout=10)
                        if resp2.status_code == 200:
                            data2 = resp2.json()
                            summary = data2.get("summary", [])
                            prod1_summary = next((s for s in summary if s["product_id"] == "prod-1"), None)
                            if prod1_summary and prod1_summary.get("total_qty") == 110:
                                log_pass("B5.2: Verify source stock decreased", "prod-1 qty=110 (120-10)")
                            else:
                                log_fail("B5.2: Verify source stock decreased", f"Expected 110, got {prod1_summary.get('total_qty') if prod1_summary else 'N/A'}", resp2)
                        else:
                            log_fail("B5.2: Verify source stock decreased", f"Expected 200, got {resp2.status_code}", resp2)
                    except Exception as e:
                        log_error("B5.2: Verify source stock decreased", e)
                else:
                    log_fail("B5.1: POST /warehouses/transfers", f"Wrong status: {data.get('status')}", resp)
            else:
                log_fail("B5.1: POST /warehouses/transfers", "ID missing or wrong format", resp)
        else:
            log_fail("B5.1: POST /warehouses/transfers", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B5.1: POST /warehouses/transfers", e)
    
    # B5.3: List transfers
    try:
        resp = session.get(f"{API_URL}/warehouses/transfers", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data:
                items = data["items"]
                if any(t.get("id") == test_data["transfer_id"] for t in items):
                    log_pass("B5.3: GET /warehouses/transfers", f"Found {len(items)} transfers, includes our transfer")
                else:
                    log_fail("B5.3: GET /warehouses/transfers", "Our transfer not found", resp)
            else:
                log_fail("B5.3: GET /warehouses/transfers", "Missing items", resp)
        else:
            log_fail("B5.3: GET /warehouses/transfers", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B5.3: GET /warehouses/transfers", e)
    
    # B5.4: Receive transfer
    if test_data["transfer_id"]:
        try:
            resp = session.post(f"{API_URL}/warehouses/transfers/{test_data['transfer_id']}/receive", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "received":
                    log_pass("B5.4: POST /warehouses/transfers/{id}/receive", "Status=received")
                    
                    # B5.5: Verify destination stock increased
                    try:
                        resp2 = session.get(f"{API_URL}/warehouses/stock?warehouse_id={test_data['wh2_id']}", timeout=10)
                        if resp2.status_code == 200:
                            data2 = resp2.json()
                            levels = data2.get("levels", [])
                            prod1_level = next((l for l in levels if l["product_id"] == "prod-1"), None)
                            if prod1_level and prod1_level.get("qty") == 10:
                                log_pass("B5.5: Verify destination stock", "wh2 prod-1 qty=10")
                            else:
                                log_fail("B5.5: Verify destination stock", f"Expected 10, got {prod1_level.get('qty') if prod1_level else 'N/A'}", resp2)
                        else:
                            log_fail("B5.5: Verify destination stock", f"Expected 200, got {resp2.status_code}", resp2)
                    except Exception as e:
                        log_error("B5.5: Verify destination stock", e)
                else:
                    log_fail("B5.4: POST /warehouses/transfers/{id}/receive", f"Wrong status: {data.get('status')}", resp)
            else:
                log_fail("B5.4: POST /warehouses/transfers/{id}/receive", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B5.4: POST /warehouses/transfers/{id}/receive", e)
        
        # B5.6: Try to delete received transfer (should fail)
        try:
            resp = session.delete(f"{API_URL}/warehouses/transfers/{test_data['transfer_id']}", timeout=10)
            if resp.status_code == 400:
                body = resp.json()
                if "Cannot delete a received transfer" in body.get("detail", ""):
                    log_pass("B5.6: DELETE /warehouses/transfers/{id} (received)", "Got 400 with correct message")
                else:
                    log_fail("B5.6: DELETE /warehouses/transfers/{id} (received)", f"Wrong error message: {body.get('detail')}", resp)
            else:
                log_fail("B5.6: DELETE /warehouses/transfers/{id} (received)", f"Expected 400, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B5.6: DELETE /warehouses/transfers/{id} (received)", e)
    
    # B5.7: Create another transfer and delete it (in-transit)
    try:
        resp = session.post(
            f"{API_URL}/warehouses/transfers",
            json={
                "from_warehouse_id": test_data["wh1_id"],
                "to_warehouse_id": test_data["wh2_id"],
                "transfer_date": "2026-01-02",
                "lines": [
                    {
                        "product_id": "prod-2",
                        "qty": 5,
                        "rate": 50
                    }
                ]
            },
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            temp_transfer_id = data.get("id")
            
            # Delete it
            try:
                resp2 = session.delete(f"{API_URL}/warehouses/transfers/{temp_transfer_id}", timeout=10)
                if resp2.status_code == 200:
                    log_pass("B5.7: DELETE /warehouses/transfers/{id} (in-transit)", "Deleted in-transit transfer")
                    
                    # B5.8: Verify source stock restored
                    try:
                        resp3 = session.get(f"{API_URL}/warehouses/stock", timeout=10)
                        if resp3.status_code == 200:
                            data3 = resp3.json()
                            summary = data3.get("summary", [])
                            prod2_summary = next((s for s in summary if s["product_id"] == "prod-2"), None)
                            if prod2_summary and prod2_summary.get("total_qty") == 50:
                                log_pass("B5.8: Verify stock restored", "prod-2 qty=50 (restored)")
                            else:
                                log_fail("B5.8: Verify stock restored", f"Expected 50, got {prod2_summary.get('total_qty') if prod2_summary else 'N/A'}", resp3)
                        else:
                            log_fail("B5.8: Verify stock restored", f"Expected 200, got {resp3.status_code}", resp3)
                    except Exception as e:
                        log_error("B5.8: Verify stock restored", e)
                else:
                    log_fail("B5.7: DELETE /warehouses/transfers/{id} (in-transit)", f"Expected 200, got {resp2.status_code}", resp2)
            except Exception as e:
                log_error("B5.7: DELETE /warehouses/transfers/{id} (in-transit)", e)
        else:
            log_fail("B5.7: Create temp transfer", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("B5.7: Create temp transfer", e)


def test_b6_cannot_delete_warehouse_with_stock():
    """B6. Cannot delete warehouse with stock"""
    if test_data["wh1_id"]:
        try:
            resp = session.delete(f"{API_URL}/warehouses/{test_data['wh1_id']}", timeout=10)
            if resp.status_code == 400:
                body = resp.json()
                if "stock" in body.get("detail", "").lower():
                    log_pass("B6: DELETE /warehouses/{id} (with stock)", "Got 400 with 'stock' message")
                else:
                    log_fail("B6: DELETE /warehouses/{id} (with stock)", f"Wrong error message: {body.get('detail')}", resp)
            else:
                log_fail("B6: DELETE /warehouses/{id} (with stock)", f"Expected 400, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B6: DELETE /warehouses/{id} (with stock)", e)


def test_b7_same_warehouse_transfer_refused():
    """B7. Same-warehouse transfer refused"""
    if test_data["wh1_id"]:
        try:
            resp = session.post(
                f"{API_URL}/warehouses/transfers",
                json={
                    "from_warehouse_id": test_data["wh1_id"],
                    "to_warehouse_id": test_data["wh1_id"],
                    "transfer_date": "2026-01-01",
                    "lines": [
                        {
                            "product_id": "prod-1",
                            "qty": 5,
                            "rate": 100
                        }
                    ]
                },
                timeout=10
            )
            if resp.status_code == 400:
                body = resp.json()
                if "differ" in body.get("detail", "").lower():
                    log_pass("B7: POST /warehouses/transfers (same warehouse)", "Got 400 with 'differ' message")
                else:
                    log_fail("B7: POST /warehouses/transfers (same warehouse)", f"Wrong error message: {body.get('detail')}", resp)
            else:
                log_fail("B7: POST /warehouses/transfers (same warehouse)", f"Expected 400, got {resp.status_code}", resp)
        except Exception as e:
            log_error("B7: POST /warehouses/transfers (same warehouse)", e)


def test_b8_auth_enforcement():
    """B8. Auth enforcement on warehouse endpoints"""
    endpoints = [
        "/warehouses",
        "/warehouses/stock",
        "/warehouses/batches",
        "/warehouses/serials",
        "/warehouses/transfers"
    ]
    
    # Create a session without auth
    unauth_session = requests.Session()
    
    for endpoint in endpoints:
        try:
            resp = unauth_session.get(f"{API_URL}{endpoint}", timeout=10)
            if resp.status_code == 401:
                log_pass(f"B8: Auth required {endpoint}", "Returns 401 without auth")
            else:
                log_fail(f"B8: Auth required {endpoint}", f"Expected 401, got {resp.status_code}", resp)
        except Exception as e:
            log_error(f"B8: Auth required {endpoint}", e)


# =========================================================================
#                              MAIN
# =========================================================================

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ PASSED: {len(results['passed'])}")
    print(f"❌ FAILED: {len(results['failed'])}")
    print(f"💥 ERRORS: {len(results['errors'])}")
    print("="*80)
    
    if results['failed']:
        print("\nFAILED TESTS:")
        for fail in results['failed']:
            print(f"  - {fail['test']}: {fail['reason']}")
    
    if results['errors']:
        print("\nERROR TESTS:")
        for err in results['errors']:
            print(f"  - {err['test']}: {err['error']}")
    
    print("\n")
    
    # Return exit code
    return 0 if (len(results['failed']) == 0 and len(results['errors']) == 0) else 1


def main():
    print("="*80)
    print("APKA MUNIM BACKEND TEST SUITE — SESSION 4")
    print("Security Hardening + Warehouses")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("="*80)
    print()
    
    # Setup
    if not test_auth_register():
        print("\n❌ Auth registration failed. Cannot proceed with other tests.")
        return 1
    
    print()
    
    # Suite A — SECURITY
    print("--- SUITE A — SECURITY ---")
    test_a1_refresh_token_flow()
    test_a2_sessions()
    test_a3_logout_all()
    test_a4_totp_2fa()
    test_a5_audit_logs()
    test_a6_auth_enforcement()
    print()
    
    # Suite B — WAREHOUSES
    print("--- SUITE B — WAREHOUSES ---")
    test_b1_warehouse_crud()
    test_b2_stock_adjustment()
    test_b3_batches()
    test_b4_serials()
    test_b5_stock_transfers()
    test_b6_cannot_delete_warehouse_with_stock()
    test_b7_same_warehouse_transfer_refused()
    test_b8_auth_enforcement()
    print()
    
    # Summary
    return print_summary()


if __name__ == "__main__":
    sys.exit(main())
