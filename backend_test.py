#!/usr/bin/env python3
"""
Session 5 Security Hardening Test Suite for Apka Munim

Tests:
- Suite A: RBAC endpoints (9 roles + permissions)
- Suite B: Backup routes with RBAC guards
- Suite C: Security headers (CSP, HSTS, COOP, CORP, etc.)
- Suite D: Request-size limit middleware
- Suite E: Password hashing (Argon2 + bcrypt→Argon2 rehash)
- Suite F: Regressions (existing endpoints still work)
- Suite G: Log sanitization (JWT redaction)
"""

import requests
import uuid
import json
import base64
import pyotp
import bcrypt
from datetime import datetime
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load backend env
load_dotenv("/app/backend/.env")

# Base URL from frontend/.env
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break

API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]

print(f"🧪 Session 5 Security Hardening Test Suite")
print(f"📍 Base URL: {BASE_URL}")
print(f"📍 API Base: {API_BASE}")
print()

# MongoDB connection for direct DB operations
mongo_client = MongoClient(MONGO_URL)
db_name = os.environ.get("DB_NAME", "apka_munim")
db = mongo_client[db_name]

# Test state
test_user_email = f"TEST_sec5_{uuid.uuid4().hex[:8]}@example.com"
test_user_password = "TestPass@123"
test_user_name = "Test User"
test_user_currency = "INR"
access_token = None
cookies = {}

passed = 0
failed = 0
errors = []

def log_test(name, success, detail=""):
    global passed, failed, errors
    if success:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name}")
        if detail:
            print(f"     {detail}")
            errors.append(f"{name}: {detail}")

def register_user():
    """Register a fresh test user and save access token"""
    global access_token, cookies, test_user_email
    
    print("🔐 Registering fresh test user...")
    resp = requests.post(f"{API_BASE}/auth/register", json={
        "email": test_user_email,
        "password": test_user_password,
        "name": test_user_name,
        "currency": test_user_currency
    })
    
    if resp.status_code != 200:
        print(f"❌ Registration failed: {resp.status_code} {resp.text}")
        return False
    
    data = resp.json()
    access_token = data.get("token")
    cookies = {"access_token": access_token}
    print(f"✅ Registered: {test_user_email}")
    print(f"   Token: {access_token[:20]}...")
    return True

def get_headers(token=None):
    """Get auth headers with Bearer token"""
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {"Authorization": f"Bearer {access_token}"}

# ============================================================================
# SUITE A — RBAC ENDPOINTS
# ============================================================================

def test_suite_a():
    print("\n" + "="*80)
    print("SUITE A — RBAC ENDPOINTS")
    print("="*80)
    
    # A1. /rbac/me
    print("\n[A1] GET /api/rbac/me")
    resp = requests.get(f"{API_BASE}/rbac/me", headers=get_headers())
    log_test("A1.1: Returns 200", resp.status_code == 200, f"Got {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        log_test("A1.2: Has 'role' key", "role" in data, f"Keys: {list(data.keys())}")
        log_test("A1.3: Has 'permissions' list", "permissions" in data and isinstance(data["permissions"], list), 
                 f"permissions type: {type(data.get('permissions'))}")
        log_test("A1.4: Has 'email' key", "email" in data, f"Keys: {list(data.keys())}")
        log_test("A1.5: Has 'is_admin_or_above' bool", "is_admin_or_above" in data and isinstance(data["is_admin_or_above"], bool),
                 f"is_admin_or_above: {data.get('is_admin_or_above')}")
        
        # Fresh user should be admin (legacy fallback)
        role = data.get("role")
        log_test("A1.6: Role is 'admin' (legacy fallback)", role == "admin", f"Got role: {role}")
        
        is_admin = data.get("is_admin_or_above")
        log_test("A1.7: is_admin_or_above is true", is_admin == True, f"Got: {is_admin}")
        
        perms = data.get("permissions", [])
        log_test("A1.8: Has 'reports.view' permission", "reports.view" in perms, f"Permissions: {perms}")
        log_test("A1.9: Has 'invoice.delete' permission", "invoice.delete" in perms, f"Permissions: {perms}")
    
    # A2. /rbac/roles
    print("\n[A2] GET /api/rbac/roles")
    resp = requests.get(f"{API_BASE}/rbac/roles", headers=get_headers())
    log_test("A2.1: Returns 200", resp.status_code == 200, f"Got {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        roles = data.get("roles", [])
        log_test("A2.2: Has 'roles' array", isinstance(roles, list), f"Type: {type(roles)}")
        log_test("A2.3: Has exactly 9 roles", len(roles) == 9, f"Got {len(roles)} roles")
        
        expected_roles = ["super_admin", "admin", "manager", "accountant", "warehouse", "factory", "sales", "staff", "viewer"]
        role_names = [r.get("role") for r in roles]
        log_test("A2.4: All 9 role names present", set(expected_roles) == set(role_names), 
                 f"Expected: {expected_roles}, Got: {role_names}")
    
    # A3. /rbac/check-permission
    print("\n[A3] POST /api/rbac/check-permission")
    
    # Test invoice.delete (admin should have)
    resp = requests.post(f"{API_BASE}/rbac/check-permission", 
                         headers=get_headers(),
                         json={"permission": "invoice.delete"})
    log_test("A3.1: Returns 200", resp.status_code == 200, f"Got {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        log_test("A3.2: invoice.delete allowed for admin", data.get("allowed") == True, f"Got: {data}")
    
    # Test backup.restore (only super_admin)
    resp = requests.post(f"{API_BASE}/rbac/check-permission",
                         headers=get_headers(),
                         json={"permission": "backup.restore"})
    if resp.status_code == 200:
        data = resp.json()
        log_test("A3.3: backup.restore denied for admin", data.get("allowed") == False, f"Got: {data}")
    
    # Test read (all roles)
    resp = requests.post(f"{API_BASE}/rbac/check-permission",
                         headers=get_headers(),
                         json={"permission": "read"})
    if resp.status_code == 200:
        data = resp.json()
        log_test("A3.4: read allowed for admin", data.get("allowed") == True, f"Got: {data}")
    
    # Test made-up permission (default deny)
    resp = requests.post(f"{API_BASE}/rbac/check-permission",
                         headers=get_headers(),
                         json={"permission": "made-up-permission"})
    if resp.status_code == 200:
        data = resp.json()
        log_test("A3.5: made-up-permission denied (default deny)", data.get("allowed") == False, f"Got: {data}")
    
    # A4. /rbac/change-role
    print("\n[A4] POST /api/rbac/change-role")
    
    # Change self to viewer
    resp = requests.post(f"{API_BASE}/rbac/change-role",
                         headers=get_headers(),
                         json={"user_email": test_user_email, "role": "viewer"})
    log_test("A4.1: Change role to viewer returns 200", resp.status_code == 200, f"Got {resp.status_code}: {resp.text}")
    
    if resp.status_code == 200:
        data = resp.json()
        log_test("A4.2: Response has email", data.get("email") == test_user_email, f"Got: {data}")
        log_test("A4.3: Response has role=viewer", data.get("role") == "viewer", f"Got: {data}")
    
    # Verify role changed
    resp = requests.get(f"{API_BASE}/rbac/me", headers=get_headers())
    if resp.status_code == 200:
        data = resp.json()
        log_test("A4.4: /rbac/me now shows role=viewer", data.get("role") == "viewer", f"Got role: {data.get('role')}")
        log_test("A4.5: is_admin_or_above now false", data.get("is_admin_or_above") == False, 
                 f"Got: {data.get('is_admin_or_above')}")
    
    # Try to change role back (should fail - viewer lacks permission)
    resp = requests.post(f"{API_BASE}/rbac/change-role",
                         headers=get_headers(),
                         json={"user_email": test_user_email, "role": "admin"})
    log_test("A4.6: Viewer cannot change role (403)", resp.status_code == 403, 
             f"Got {resp.status_code}: {resp.text}")

# ============================================================================
# SUITE B — BACKUP ROUTES WITH RBAC GUARDS
# ============================================================================

def test_suite_b():
    print("\n" + "="*80)
    print("SUITE B — BACKUP ROUTES WITH RBAC GUARDS")
    print("="*80)
    
    # Continue as viewer from A4
    print("\n[B1] Backup export denied for viewer")
    resp = requests.get(f"{API_BASE}/backup/export", headers=get_headers())
    log_test("B1.1: GET /backup/export returns 403 for viewer", resp.status_code == 403,
             f"Got {resp.status_code}: {resp.text}")
    
    if resp.status_code == 403:
        detail = resp.json().get("detail", "")
        log_test("B1.2: Error mentions 'backup.export'", "backup.export" in str(detail),
                 f"Detail: {detail}")
    
    print("\n[B2] Backup restore denied for viewer")
    resp = requests.post(f"{API_BASE}/backup/restore", 
                         headers=get_headers(),
                         json={"data": {}})
    log_test("B2.1: POST /backup/restore returns 403 for viewer", resp.status_code == 403,
             f"Got {resp.status_code}: {resp.text}")
    
    print("\n[B3] Register fresh admin user")
    # Register another user (defaults to admin)
    admin_email = f"TEST_sec5_admin_{uuid.uuid4().hex[:8]}@example.com"
    admin_password = "AdminPass@123"
    
    resp = requests.post(f"{API_BASE}/auth/register", json={
        "email": admin_email,
        "password": admin_password,
        "name": "Admin User",
        "currency": "INR"
    })
    log_test("B3.1: Admin user registered", resp.status_code == 200, f"Got {resp.status_code}")
    
    if resp.status_code == 200:
        admin_token = resp.json().get("token")
        
        # Try backup export as admin
        resp = requests.get(f"{API_BASE}/backup/export", headers={"Authorization": f"Bearer {admin_token}"})
        # May return 200 OR 402/403 with premium-required (not RBAC 403)
        is_ok = resp.status_code == 200 or (resp.status_code in [402, 403] and "premium" in resp.text.lower())
        log_test("B3.2: Admin can access /backup/export (200 or premium-required)", is_ok,
                 f"Got {resp.status_code}: {resp.text[:100]}")

# ============================================================================
# SUITE C — SECURITY HEADERS
# ============================================================================

def test_suite_c():
    print("\n" + "="*80)
    print("SUITE C — SECURITY HEADERS")
    print("="*80)
    
    print("\n[C1] All security headers on /api/ root")
    resp = requests.get(f"{API_BASE}/")
    log_test("C1.1: GET /api/ returns 200", resp.status_code == 200, f"Got {resp.status_code}")
    
    headers = {k.lower(): v for k, v in resp.headers.items()}
    
    # Content-Security-Policy
    csp = headers.get("content-security-policy", "")
    log_test("C1.2: Has Content-Security-Policy", bool(csp), f"CSP: {csp}")
    log_test("C1.3: CSP contains default-src 'none'", "default-src 'none'" in csp, f"CSP: {csp}")
    log_test("C1.4: CSP contains frame-ancestors 'none'", "frame-ancestors 'none'" in csp, f"CSP: {csp}")
    log_test("C1.5: CSP contains base-uri 'none'", "base-uri 'none'" in csp, f"CSP: {csp}")
    
    # Strict-Transport-Security
    hsts = headers.get("strict-transport-security", "")
    log_test("C1.6: Has Strict-Transport-Security", bool(hsts), f"HSTS: {hsts}")
    log_test("C1.7: HSTS contains max-age=63072000", "max-age=63072000" in hsts, f"HSTS: {hsts}")
    log_test("C1.8: HSTS contains preload", "preload" in hsts, f"HSTS: {hsts}")
    
    # X-Frame-Options
    xfo = headers.get("x-frame-options", "")
    log_test("C1.9: X-Frame-Options = DENY", xfo.upper() == "DENY", f"Got: {xfo}")
    
    # X-Content-Type-Options
    xcto = headers.get("x-content-type-options", "")
    log_test("C1.10: X-Content-Type-Options = nosniff", xcto.lower() == "nosniff", f"Got: {xcto}")
    
    # Referrer-Policy
    rp = headers.get("referrer-policy", "")
    log_test("C1.11: Referrer-Policy = strict-origin-when-cross-origin", 
             rp.lower() == "strict-origin-when-cross-origin", f"Got: {rp}")
    
    # Permissions-Policy
    pp = headers.get("permissions-policy", "")
    log_test("C1.12: Has Permissions-Policy", bool(pp), f"PP: {pp}")
    log_test("C1.13: Permissions-Policy contains geolocation=()", "geolocation=()" in pp, f"PP: {pp}")
    log_test("C1.14: Permissions-Policy contains payment=()", "payment=()" in pp, f"PP: {pp}")
    
    # X-Permitted-Cross-Domain-Policies
    xpcdp = headers.get("x-permitted-cross-domain-policies", "")
    log_test("C1.15: X-Permitted-Cross-Domain-Policies = none", xpcdp.lower() == "none", f"Got: {xpcdp}")
    
    # Cross-Origin-Opener-Policy
    coop = headers.get("cross-origin-opener-policy", "")
    log_test("C1.16: Cross-Origin-Opener-Policy = same-origin", coop.lower() == "same-origin", f"Got: {coop}")
    
    # Cross-Origin-Resource-Policy
    corp = headers.get("cross-origin-resource-policy", "")
    log_test("C1.17: Cross-Origin-Resource-Policy = same-site", corp.lower() == "same-site", f"Got: {corp}")

# ============================================================================
# SUITE D — REQUEST-SIZE LIMIT
# ============================================================================

def test_suite_d():
    print("\n" + "="*80)
    print("SUITE D — REQUEST-SIZE LIMIT")
    print("="*80)
    
    print("\n[D1] 413 on huge Content-Length")
    # Send request with huge Content-Length header
    headers_huge = get_headers()
    headers_huge["Content-Length"] = "20000000"  # 20 MB
    
    try:
        resp = requests.post(f"{API_BASE}/auth/login",
                            headers=headers_huge,
                            json={"email": "test@example.com", "password": "test"},
                            timeout=5)
        log_test("D1.1: Returns 413 for huge Content-Length", resp.status_code == 413,
                 f"Got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("D1.1: Returns 413 for huge Content-Length", False, f"Exception: {e}")
    
    print("\n[D2] Normal request unaffected")
    resp = requests.post(f"{API_BASE}/auth/login",
                        json={"email": test_user_email, "password": test_user_password})
    log_test("D2.1: Normal login request works", resp.status_code in [200, 401],
             f"Got {resp.status_code}")

# ============================================================================
# SUITE E — PASSWORD HASHING
# ============================================================================

def test_suite_e():
    print("\n" + "="*80)
    print("SUITE E — PASSWORD HASHING")
    print("="*80)
    
    print("\n[E1] New users get Argon2")
    # Register a fresh user
    e1_email = f"TEST_sec5_argon_{uuid.uuid4().hex[:8]}@example.com"
    e1_password = "Argon2Test@123"
    
    resp = requests.post(f"{API_BASE}/auth/register", json={
        "email": e1_email,
        "password": e1_password,
        "name": "Argon Test",
        "currency": "INR"
    })
    log_test("E1.1: User registered", resp.status_code == 200, f"Got {resp.status_code}")
    
    if resp.status_code == 200:
        # Check password_hash in DB
        user_doc = db.users.find_one({"email": e1_email})
        if user_doc:
            pw_hash = user_doc.get("password_hash", "")
            log_test("E1.2: password_hash starts with $argon2id$", pw_hash.startswith("$argon2id$"),
                     f"Hash prefix: {pw_hash[:20]}")
        else:
            log_test("E1.2: password_hash starts with $argon2id$", False, "User not found in DB")
    
    print("\n[E2] Bcrypt legacy login still works (rehash test)")
    # Create a user with bcrypt hash directly in DB
    e2_email = f"TEST_sec5_bcrypt_{uuid.uuid4().hex[:8]}@example.com"
    e2_password = "OldPass@123456"
    
    # Generate bcrypt hash
    bcrypt_hash = bcrypt.hashpw(e2_password.encode(), bcrypt.gensalt()).decode()
    
    # Insert user with bcrypt hash
    user_id = str(uuid.uuid4())
    personal_ledger_id = f"pl_{user_id}"
    now_iso = datetime.utcnow().isoformat()
    
    db.users.insert_one({
        "id": user_id,
        "email": e2_email,
        "name": "Bcrypt Test",
        "password_hash": bcrypt_hash,
        "currency": "INR",
        "personal_ledger_id": personal_ledger_id,
        "current_ledger_id": personal_ledger_id,
        "created_at": now_iso,
        "registrationDate": now_iso,
        "trialStart": now_iso,
        "trialEnd": now_iso,
        "subscriptionStatus": "trial",
        "premiumActive": True,
    })
    
    db.ledgers.insert_one({
        "id": personal_ledger_id,
        "name": "Personal",
        "type": "personal",
        "owner_user_id": user_id,
        "members": [user_id],
        "created_at": now_iso,
    })
    
    log_test("E2.1: Bcrypt user inserted in DB", True)
    
    # Try to login with bcrypt password
    resp = requests.post(f"{API_BASE}/auth/login", json={
        "email": e2_email,
        "password": e2_password
    })
    log_test("E2.2: Login succeeds with bcrypt hash", resp.status_code == 200,
             f"Got {resp.status_code}: {resp.text}")
    
    if resp.status_code == 200:
        # Check if password was rehashed to Argon2
        user_doc = db.users.find_one({"email": e2_email})
        if user_doc:
            new_hash = user_doc.get("password_hash", "")
            log_test("E2.3: password_hash now starts with $argon2id$ (rehashed)", 
                     new_hash.startswith("$argon2id$"),
                     f"Hash prefix: {new_hash[:20]}")
            
            # Try to login again with same password (verify Argon2 works)
            resp = requests.post(f"{API_BASE}/auth/login", json={
                "email": e2_email,
                "password": e2_password
            })
            log_test("E2.4: Login still works after rehash", resp.status_code == 200,
                     f"Got {resp.status_code}")
        else:
            log_test("E2.3: password_hash now starts with $argon2id$ (rehashed)", False, 
                     "User not found in DB")

# ============================================================================
# SUITE F — REGRESSIONS
# ============================================================================

def test_suite_f():
    print("\n" + "="*80)
    print("SUITE F — REGRESSIONS (Previously-passing endpoints)")
    print("="*80)
    
    # Register a fresh user for regression tests
    f_email = f"TEST_sec5_regress_{uuid.uuid4().hex[:8]}@example.com"
    f_password = "StrongP@ss123"
    
    print("\n[F1] POST /api/auth/register")
    resp = requests.post(f"{API_BASE}/auth/register", json={
        "email": f_email,
        "password": f_password,
        "name": "Regression Test",
        "currency": "INR"
    })
    log_test("F1.1: Register returns 200", resp.status_code == 200, f"Got {resp.status_code}: {resp.text}")
    
    if resp.status_code == 200:
        f_token = resp.json().get("token")
        f_headers = {"Authorization": f"Bearer {f_token}"}
        
        print("\n[F2] POST /api/auth/login")
        resp = requests.post(f"{API_BASE}/auth/login", json={
            "email": f_email,
            "password": f_password
        })
        log_test("F2.1: Login with valid creds returns 200", resp.status_code == 200,
                 f"Got {resp.status_code}")
        
        resp = requests.post(f"{API_BASE}/auth/login", json={
            "email": f_email,
            "password": "WrongPassword@123"
        })
        log_test("F2.2: Login with wrong password returns 401", resp.status_code == 401,
                 f"Got {resp.status_code}")
        
        print("\n[F3] GET /api/ (root)")
        resp = requests.get(f"{API_BASE}/")
        log_test("F3.1: Root endpoint returns 200", resp.status_code == 200,
                 f"Got {resp.status_code}")
        
        print("\n[F4] GET /api/manufacturing/fabrics")
        resp = requests.get(f"{API_BASE}/manufacturing/fabrics", headers=f_headers)
        log_test("F4.1: Manufacturing fabrics returns 200", resp.status_code == 200,
                 f"Got {resp.status_code}")
        
        print("\n[F5] GET /api/reports/trial-balance")
        resp = requests.get(f"{API_BASE}/reports/trial-balance?from=2026-01-01&to=2026-12-31",
                           headers=f_headers)
        log_test("F5.1: Trial balance returns 200", resp.status_code == 200,
                 f"Got {resp.status_code}")
        
        print("\n[F6] GET /api/warehouses")
        resp = requests.get(f"{API_BASE}/warehouses", headers=f_headers)
        log_test("F6.1: Warehouses list returns 200", resp.status_code == 200,
                 f"Got {resp.status_code}")
        
        print("\n[F7] POST /api/warehouses")
        resp = requests.post(f"{API_BASE}/warehouses",
                            headers=f_headers,
                            json={"name": "Test WH", "is_default": True})
        log_test("F7.1: Create warehouse returns 200", resp.status_code == 200,
                 f"Got {resp.status_code}")
        
        print("\n[F8] GET /api/audit-logs")
        resp = requests.get(f"{API_BASE}/audit-logs", headers=f_headers)
        log_test("F8.1: Audit logs returns 200", resp.status_code == 200,
                 f"Got {resp.status_code}")

# ============================================================================
# SUITE G — LOG SANITIZATION
# ============================================================================

def test_suite_g():
    print("\n" + "="*80)
    print("SUITE G — LOG SANITIZATION")
    print("="*80)
    
    print("\n[G1] No JWT tokens in logs")
    
    # Make several authenticated requests
    for i in range(3):
        requests.get(f"{API_BASE}/rbac/me", headers=get_headers())
    
    # Read backend logs
    try:
        with open("/var/log/supervisor/backend.err.log", "r") as f:
            log_content = f.read()
        
        # Check for JWT patterns (eyJ... three-segment strings)
        import re
        jwt_pattern = r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
        jwt_matches = re.findall(jwt_pattern, log_content)
        
        log_test("G1.1: No raw JWT tokens in logs", len(jwt_matches) == 0,
                 f"Found {len(jwt_matches)} JWT tokens in logs")
        
        # Check for Bearer <token> patterns
        bearer_pattern = r'Bearer\s+eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
        bearer_matches = re.findall(bearer_pattern, log_content)
        
        log_test("G1.2: No 'Bearer <full-token>' in logs", len(bearer_matches) == 0,
                 f"Found {len(bearer_matches)} Bearer tokens in logs")
        
    except Exception as e:
        log_test("G1.1: No raw JWT tokens in logs", False, f"Could not read logs: {e}")
        log_test("G1.2: No 'Bearer <full-token>' in logs", False, f"Could not read logs: {e}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    # Register test user
    if not register_user():
        print("❌ Failed to register test user. Aborting.")
        return
    
    # Run test suites
    test_suite_a()
    test_suite_b()
    test_suite_c()
    test_suite_d()
    test_suite_e()
    test_suite_f()
    test_suite_g()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total:  {passed + failed}")
    print(f"📈 Success Rate: {passed / (passed + failed) * 100:.1f}%")
    
    if errors:
        print("\n" + "="*80)
        print("FAILED TESTS DETAILS")
        print("="*80)
        for err in errors:
            print(f"  • {err}")
    
    # Check backend logs for 500 errors
    print("\n" + "="*80)
    print("BACKEND LOG CHECK")
    print("="*80)
    try:
        with open("/var/log/supervisor/backend.err.log", "r") as f:
            log_lines = f.readlines()
        
        error_500_lines = [line for line in log_lines if "500" in line or "Internal Server Error" in line]
        
        if error_500_lines:
            print(f"❌ Found {len(error_500_lines)} lines with 500 errors:")
            for line in error_500_lines[-10:]:  # Show last 10
                print(f"   {line.strip()}")
        else:
            print("✅ No 500 errors found in backend logs")
    except Exception as e:
        print(f"⚠️  Could not check backend logs: {e}")
    
    print("\n" + "="*80)
    print("SESSION 5 SECURITY HARDENING TEST COMPLETE")
    print("="*80)

if __name__ == "__main__":
    main()
