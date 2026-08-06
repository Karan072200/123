#!/usr/bin/env python3
"""
Session 5B Bug Fix Testing — Re-test ONLY the two specific bugs:
1. /api/audit-logs GET returning 500 due to ObjectIds in nested 'after' docs
2. /api/rbac/change-role returning 404 due to email case mismatch

DO NOT re-run earlier passing tests (headers, size limit, password hashing).
"""
import requests
import uuid
import json
from datetime import datetime

BASE_URL = "https://garment-erp-upgrade.preview.emergentagent.com"

# Test state
test_user_email = None
test_user_password = "TestPass@123"
access_token = None
warehouse1_id = None
warehouse2_id = None
transfer_id = None

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def register_and_login():
    """Register a fresh test user with unique email."""
    global test_user_email, access_token
    
    unique_id = uuid.uuid4().hex[:8]
    test_user_email = f"TEST_sec5b_{unique_id}@example.com"
    
    log(f"Registering test user: {test_user_email}")
    
    # Register
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_user_email,
        "password": test_user_password,
        "name": f"Test User {unique_id}"
    })
    
    if resp.status_code != 200:
        log(f"❌ Registration failed: {resp.status_code} {resp.text}")
        return False
    
    log(f"✅ Registration successful")
    
    # Login
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_user_email,
        "password": test_user_password
    })
    
    if resp.status_code != 200:
        log(f"❌ Login failed: {resp.status_code} {resp.text}")
        return False
    
    # Extract access token from cookie
    if 'access_token' in resp.cookies:
        access_token = resp.cookies['access_token']
        log(f"✅ Login successful, got access token")
        return True
    else:
        log(f"❌ No access token in response")
        return False

def get_headers():
    """Return headers with auth cookie."""
    return {"Cookie": f"access_token={access_token}"}

# ============================================================================
# BUG FIX 1: /api/audit-logs GET returning 500 due to ObjectIds
# ============================================================================

def test_bug1_audit_logs():
    """
    Bug Fix 1: /api/audit-logs was returning 500 due to ObjectIds in nested 'after' docs.
    Fix: deps.audit_log() now recursively strips _id and coerces ObjectId to string.
    
    Test:
    1. Create warehouse (triggers audit log with nested doc)
    2. Update warehouse (triggers audit log)
    3. Create batch (triggers audit log)
    4. Create transfer (triggers audit log)
    5. Receive transfer (triggers audit log)
    6. GET /api/audit-logs → MUST be 200 with valid JSON
    """
    global warehouse1_id, warehouse2_id, transfer_id
    
    log("\n" + "="*80)
    log("BUG FIX 1: Testing /api/audit-logs (ObjectId fix)")
    log("="*80)
    
    results = {
        "step1_create_warehouse": False,
        "step2_update_warehouse": False,
        "step3_create_batch": False,
        "step4_create_transfer": False,
        "step5_receive_transfer": False,
        "step6_get_audit_logs": False,
        "step7_verify_items": False,
        "step8_verify_no_objectid": False
    }
    
    # Step 1: Create warehouse W1
    log("\n1. Creating warehouse W1...")
    resp = requests.post(f"{BASE_URL}/api/warehouses", 
                        headers=get_headers(),
                        json={"name": "W1", "is_default": True})
    
    if resp.status_code == 200:
        warehouse1_id = resp.json().get("id")
        log(f"✅ Step 1.1: Warehouse W1 created: {warehouse1_id}")
        results["step1_create_warehouse"] = True
    else:
        log(f"❌ Step 1.1: Failed to create warehouse: {resp.status_code} {resp.text}")
        return results
    
    # Step 2: Update warehouse W1
    log("\n2. Updating warehouse W1...")
    resp = requests.put(f"{BASE_URL}/api/warehouses/{warehouse1_id}",
                       headers=get_headers(),
                       json={"name": "W1-renamed", "is_default": True})
    
    if resp.status_code == 200:
        log(f"✅ Step 2.1: Warehouse W1 updated")
        results["step2_update_warehouse"] = True
    else:
        log(f"❌ Step 2.1: Failed to update warehouse: {resp.status_code} {resp.text}")
    
    # Step 3: Create batch (stock adjustment)
    log("\n3. Creating batch with stock adjustment...")
    resp = requests.post(f"{BASE_URL}/api/warehouses/stock/adjust",
                        headers=get_headers(),
                        json={
                            "warehouse_id": warehouse1_id,
                            "product_id": "p1",
                            "product_name": "P1",
                            "qty_delta": 10,
                            "reason": "opening stock"
                        })
    
    if resp.status_code == 200:
        log(f"✅ Step 3.1: Stock adjustment created")
        results["step3_create_batch"] = True
    else:
        log(f"❌ Step 3.1: Failed to create stock adjustment: {resp.status_code} {resp.text}")
    
    # Create W2 for transfer
    log("\n4. Creating warehouse W2...")
    resp = requests.post(f"{BASE_URL}/api/warehouses",
                        headers=get_headers(),
                        json={"name": "W2"})
    
    if resp.status_code == 200:
        warehouse2_id = resp.json().get("id")
        log(f"✅ Step 4.1: Warehouse W2 created: {warehouse2_id}")
    else:
        log(f"❌ Step 4.1: Failed to create warehouse W2: {resp.status_code} {resp.text}")
        return results
    
    # Step 4: Create transfer
    log("\n5. Creating stock transfer...")
    resp = requests.post(f"{BASE_URL}/api/warehouses/transfers",
                        headers=get_headers(),
                        json={
                            "from_warehouse_id": warehouse1_id,
                            "to_warehouse_id": warehouse2_id,
                            "transfer_date": "2026-01-01",
                            "lines": [{
                                "product_id": "p1",
                                "qty": 5,
                                "rate": 100
                            }]
                        })
    
    if resp.status_code == 200:
        transfer_id = resp.json().get("id")
        log(f"✅ Step 5.1: Transfer created: {transfer_id}")
        results["step4_create_transfer"] = True
    else:
        log(f"❌ Step 5.1: Failed to create transfer: {resp.status_code} {resp.text}")
    
    # Step 5: Receive transfer
    log("\n6. Receiving transfer...")
    resp = requests.post(f"{BASE_URL}/api/warehouses/transfers/{transfer_id}/receive",
                        headers=get_headers())
    
    if resp.status_code == 200:
        log(f"✅ Step 6.1: Transfer received")
        results["step5_receive_transfer"] = True
    else:
        log(f"❌ Step 6.1: Failed to receive transfer: {resp.status_code} {resp.text}")
    
    # Step 6: GET /api/audit-logs (THE CRITICAL TEST)
    log("\n7. Testing GET /api/audit-logs (CRITICAL)...")
    resp = requests.get(f"{BASE_URL}/api/audit-logs?limit=50",
                       headers=get_headers())
    
    if resp.status_code != 200:
        log(f"❌ Step 7.1: CRITICAL FAILURE - GET /api/audit-logs returned {resp.status_code}")
        log(f"   Response: {resp.text}")
        return results
    
    log(f"✅ Step 7.1: GET /api/audit-logs returned 200")
    results["step6_get_audit_logs"] = True
    
    # Step 7: Verify response structure
    try:
        data = resp.json()
        
        # Check required keys
        required_keys = ["items", "total", "skip", "limit"]
        missing_keys = [k for k in required_keys if k not in data]
        
        if missing_keys:
            log(f"❌ Step 7.2: Missing keys in response: {missing_keys}")
            return results
        
        log(f"✅ Step 7.2: Response has all required keys: {required_keys}")
        
        items = data.get("items", [])
        log(f"   Items count: {len(items)}, Total: {data.get('total')}")
        
        if len(items) < 5:
            log(f"⚠️  Step 7.3: Expected at least 5 audit log entries, got {len(items)}")
        else:
            log(f"✅ Step 7.3: Got {len(items)} audit log entries (>= 5)")
            results["step7_verify_items"] = True
        
        # Step 8: Verify each item has required keys and NO ObjectId
        log("\n8. Verifying audit log items...")
        required_item_keys = ["id", "owner_id", "user_id", "at", "action", "entity_type"]
        
        all_valid = True
        for i, item in enumerate(items[:10]):  # Check first 10
            missing = [k for k in required_item_keys if k not in item]
            if missing:
                log(f"❌ Step 8.{i+1}: Item {i} missing keys: {missing}")
                all_valid = False
            
            # Try to JSON-serialize to ensure no ObjectId
            try:
                json.dumps(item)
            except Exception as e:
                log(f"❌ Step 8.{i+1}: Item {i} contains non-JSON-serializable data: {e}")
                all_valid = False
        
        if all_valid:
            log(f"✅ Step 8: All items have required keys and are JSON-serializable (no ObjectId)")
            results["step8_verify_no_objectid"] = True
        
    except Exception as e:
        log(f"❌ Step 7.2: Failed to parse JSON response: {e}")
        return results
    
    return results

# ============================================================================
# BUG FIX 2: /api/rbac/change-role returning 404 due to email case mismatch
# ============================================================================

def test_bug2_rbac_change_role():
    """
    Bug Fix 2: /api/rbac/change-role was returning 404 due to email case mismatch.
    Fix: Endpoint now lower-cases incoming user_email before lookup, with regex fallback.
    
    Test:
    1. As admin, POST /api/rbac/change-role with MIXED CASE email → MUST be 200
    2. GET /api/rbac/me → role should be "viewer"
    3. Try to change back as viewer → MUST be 403 (no permission)
    4. Register second user, try to change first user's role → test ledger isolation
    """
    log("\n" + "="*80)
    log("BUG FIX 2: Testing /api/rbac/change-role (email case fix)")
    log("="*80)
    
    results = {
        "step1_change_role_mixed_case": False,
        "step2_verify_role_changed": False,
        "step3_viewer_cannot_change": False,
        "step4_second_user_test": False
    }
    
    # Step 1: Change role with MIXED CASE email
    log("\n1. Testing role change with MIXED CASE email...")
    
    # Use deliberately mixed case email
    mixed_case_email = test_user_email.replace("test_sec5b", "TEST_SEC5B").replace("@example.com", "@EXAMPLE.COM")
    log(f"   Original email: {test_user_email}")
    log(f"   Mixed case email: {mixed_case_email}")
    
    resp = requests.post(f"{BASE_URL}/api/rbac/change-role",
                        headers=get_headers(),
                        json={
                            "user_email": mixed_case_email,
                            "role": "viewer"
                        })
    
    if resp.status_code != 200:
        log(f"❌ Step 1.1: CRITICAL FAILURE - POST /api/rbac/change-role returned {resp.status_code}")
        log(f"   Response: {resp.text}")
        return results
    
    log(f"✅ Step 1.1: POST /api/rbac/change-role returned 200")
    
    try:
        data = resp.json()
        if data.get("role") == "viewer":
            log(f"✅ Step 1.2: Response confirms role changed to 'viewer'")
            log(f"   Email in response: {data.get('email')}")
            results["step1_change_role_mixed_case"] = True
        else:
            log(f"❌ Step 1.2: Expected role 'viewer', got '{data.get('role')}'")
    except Exception as e:
        log(f"❌ Step 1.2: Failed to parse response: {e}")
        return results
    
    # Step 2: Verify role changed
    log("\n2. Verifying role changed via GET /api/rbac/me...")
    resp = requests.get(f"{BASE_URL}/api/rbac/me", headers=get_headers())
    
    if resp.status_code != 200:
        log(f"❌ Step 2.1: GET /api/rbac/me failed: {resp.status_code}")
        return results
    
    try:
        data = resp.json()
        current_role = data.get("role")
        
        if current_role == "viewer":
            log(f"✅ Step 2.1: Current role is 'viewer' (confirmed)")
            results["step2_verify_role_changed"] = True
        else:
            log(f"❌ Step 2.1: Expected role 'viewer', got '{current_role}'")
    except Exception as e:
        log(f"❌ Step 2.1: Failed to parse response: {e}")
        return results
    
    # Step 3: Try to change role back as viewer (should fail with 403)
    log("\n3. Testing viewer cannot change roles (should be 403)...")
    resp = requests.post(f"{BASE_URL}/api/rbac/change-role",
                        headers=get_headers(),
                        json={
                            "user_email": test_user_email,
                            "role": "admin"
                        })
    
    if resp.status_code == 403:
        log(f"✅ Step 3.1: Viewer correctly blocked from changing roles (403)")
        results["step3_viewer_cannot_change"] = True
    else:
        log(f"❌ Step 3.1: Expected 403, got {resp.status_code}")
        log(f"   Response: {resp.text}")
    
    # Step 4: Register second user and test cross-ledger role change
    log("\n4. Testing cross-ledger role change isolation...")
    
    # Register second user
    unique_id2 = uuid.uuid4().hex[:8]
    user2_email = f"TEST_sec5b_user2_{unique_id2}@example.com"
    user2_password = "TestPass@123"
    
    log(f"   Registering second user: {user2_email}")
    
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": user2_email,
        "password": user2_password,
        "name": f"Test User 2 {unique_id2}"
    })
    
    if resp.status_code != 200:
        log(f"⚠️  Step 4.1: Failed to register second user: {resp.status_code}")
        return results
    
    # Login as second user
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": user2_email,
        "password": user2_password
    })
    
    if resp.status_code != 200:
        log(f"⚠️  Step 4.2: Failed to login as second user: {resp.status_code}")
        return results
    
    user2_token = resp.cookies.get('access_token')
    user2_headers = {"Cookie": f"access_token={user2_token}"}
    
    log(f"✅ Step 4.1: Second user logged in")
    
    # Try to change first user's role from second user (different ledger)
    log(f"   Attempting to change first user's role from second user...")
    resp = requests.post(f"{BASE_URL}/api/rbac/change-role",
                        headers=user2_headers,
                        json={
                            "user_email": test_user_email,
                            "role": "admin"
                        })
    
    # This should fail with 403 (different ledger) or 404 (user not found in this ledger)
    if resp.status_code in [403, 404]:
        log(f"✅ Step 4.2: Cross-ledger role change correctly blocked ({resp.status_code})")
        results["step4_second_user_test"] = True
    else:
        log(f"⚠️  Step 4.2: Expected 403 or 404, got {resp.status_code}")
        log(f"   Response: {resp.text}")
    
    return results

# ============================================================================
# REGRESSION CHECK: No 500s in backend logs
# ============================================================================

def check_backend_logs():
    """Check backend logs for any 500 errors during test run."""
    log("\n" + "="*80)
    log("REGRESSION CHECK: Backend logs")
    log("="*80)
    
    import subprocess
    
    try:
        result = subprocess.run(
            ["tail", "-n", "200", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        logs = result.stdout
        
        # Look for 500 errors
        error_500_lines = [line for line in logs.split('\n') if '500' in line and 'Internal Server Error' in line]
        
        if error_500_lines:
            log(f"❌ Found {len(error_500_lines)} lines with 500 errors:")
            for line in error_500_lines[:5]:  # Show first 5
                log(f"   {line}")
        else:
            log(f"✅ No 500 errors found in backend logs")
        
        # Look for tracebacks
        if 'Traceback' in logs:
            log(f"⚠️  Found tracebacks in logs (check manually)")
        else:
            log(f"✅ No tracebacks found in backend logs")
        
    except Exception as e:
        log(f"⚠️  Could not check backend logs: {e}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    log("="*80)
    log("SESSION 5B BUG FIX TESTING")
    log("Testing ONLY the two specific bug fixes:")
    log("  1. /api/audit-logs GET returning 500 (ObjectId fix)")
    log("  2. /api/rbac/change-role returning 404 (email case fix)")
    log("="*80)
    
    # Register and login
    if not register_and_login():
        log("\n❌ FATAL: Could not register/login test user")
        return
    
    # Test Bug Fix 1
    bug1_results = test_bug1_audit_logs()
    
    # Test Bug Fix 2
    bug2_results = test_bug2_rbac_change_role()
    
    # Check backend logs
    check_backend_logs()
    
    # Summary
    log("\n" + "="*80)
    log("TEST SUMMARY")
    log("="*80)
    
    log("\nBUG FIX 1 - /api/audit-logs (ObjectId fix):")
    bug1_passed = sum(bug1_results.values())
    bug1_total = len(bug1_results)
    for step, passed in bug1_results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        log(f"  {status}: {step}")
    log(f"  Result: {bug1_passed}/{bug1_total} steps passed")
    
    log("\nBUG FIX 2 - /api/rbac/change-role (email case fix):")
    bug2_passed = sum(bug2_results.values())
    bug2_total = len(bug2_results)
    for step, passed in bug2_results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        log(f"  {status}: {step}")
    log(f"  Result: {bug2_passed}/{bug2_total} steps passed")
    
    total_passed = bug1_passed + bug2_passed
    total_tests = bug1_total + bug2_total
    
    log(f"\n{'='*80}")
    log(f"OVERALL: {total_passed}/{total_tests} tests passed ({100*total_passed//total_tests}%)")
    log(f"{'='*80}")
    
    if total_passed == total_tests:
        log("\n🎉 ALL TESTS PASSED - Both bug fixes working correctly!")
    else:
        log(f"\n⚠️  {total_tests - total_passed} test(s) failed - Review failures above")

if __name__ == "__main__":
    main()
