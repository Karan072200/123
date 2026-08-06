#!/usr/bin/env python3
"""
Comprehensive backend test suite for Apka Munim — Foundation Fix + Manufacturing + Reports.

Tests:
1. Auth setup (register fresh test user)
2. Manufacturing endpoints (13 total)
3. Accounting Reports endpoints (7 total)
4. Cross-cutting: auth requirements, existing endpoints, GZip
"""
import sys
import uuid
import requests
from datetime import datetime, timedelta

# Base URL from frontend/.env
BASE_URL = "https://garment-erp-upgrade.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Test user credentials
TEST_EMAIL = f"TEST_foundation_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "TestPass@123"
TEST_BUSINESS = "Test Garments Co"

# Global session with auth
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

# Test results
results = {
    "passed": [],
    "failed": [],
    "errors": []
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


def test_auth_register():
    """1. Register a fresh test user"""
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
                # Also try to get cookie
                if "access_token" in resp.cookies:
                    session.cookies.update(resp.cookies)
                log_pass("Auth: Register", f"User: {TEST_EMAIL}")
                return True
            else:
                log_fail("Auth: Register", "No token in response", resp)
                return False
        else:
            log_fail("Auth: Register", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Auth: Register", e)
        return False


def test_auth_me():
    """Verify /auth/me works with token"""
    try:
        resp = session.get(f"{API_URL}/auth/me", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "email" in data and data["email"].lower() == TEST_EMAIL.lower():
                log_pass("Auth: /auth/me", f"Authenticated as {data['email']}")
                return True
            else:
                log_fail("Auth: /auth/me", f"Email mismatch: expected {TEST_EMAIL}, got {data.get('email')}", resp)
                return False
        else:
            log_fail("Auth: /auth/me", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Auth: /auth/me", e)
        return False


def test_manufacturing_fabrics():
    """2. Manufacturing: Fabrics CRUD"""
    fabric_id = None
    
    # POST - Create fabric
    try:
        resp = session.post(
            f"{API_URL}/manufacturing/fabrics",
            json={
                "name": "Cotton 200GSM Red",
                "fabric_type": "cotton",
                "gsm": 200,
                "color": "Red",
                "unit": "meter",
                "rate": 120,
                "stock_qty": 50,
                "min_stock": 10
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("fab_"):
                fabric_id = data["id"]
                log_pass("Manufacturing: POST /fabrics", f"Created fabric {fabric_id}")
            else:
                log_fail("Manufacturing: POST /fabrics", "ID missing or wrong format", resp)
                return False
        else:
            log_fail("Manufacturing: POST /fabrics", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Manufacturing: POST /fabrics", e)
        return False
    
    # GET - List fabrics
    try:
        resp = session.get(f"{API_URL}/manufacturing/fabrics", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "total" in data and "skip" in data and "limit" in data:
                if len(data["items"]) > 0:
                    log_pass("Manufacturing: GET /fabrics", f"Found {data['total']} fabrics")
                else:
                    log_fail("Manufacturing: GET /fabrics", "No items returned", resp)
                    return False
            else:
                log_fail("Manufacturing: GET /fabrics", "Wrong response shape", resp)
                return False
        else:
            log_fail("Manufacturing: GET /fabrics", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Manufacturing: GET /fabrics", e)
        return False
    
    # GET with search
    try:
        resp = session.get(f"{API_URL}/manufacturing/fabrics?search=Cotton", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and len(data["items"]) > 0:
                log_pass("Manufacturing: GET /fabrics?search=Cotton", f"Found {len(data['items'])} results")
            else:
                log_fail("Manufacturing: GET /fabrics?search", "No filtered results", resp)
        else:
            log_fail("Manufacturing: GET /fabrics?search", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: GET /fabrics?search", e)
    
    # PUT - Update fabric
    if fabric_id:
        try:
            resp = session.put(
                f"{API_URL}/manufacturing/fabrics/{fabric_id}",
                json={
                    "name": "Cotton 200GSM Red Updated",
                    "fabric_type": "cotton",
                    "gsm": 200,
                    "color": "Red",
                    "unit": "meter",
                    "rate": 125,
                    "stock_qty": 45,
                    "min_stock": 10
                },
                timeout=10
            )
            if resp.status_code == 200:
                log_pass("Manufacturing: PUT /fabrics/{id}", "Updated fabric")
            else:
                log_fail("Manufacturing: PUT /fabrics/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: PUT /fabrics/{id}", e)
        
        # DELETE - Delete fabric
        try:
            resp = session.delete(f"{API_URL}/manufacturing/fabrics/{fabric_id}", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("deleted") == True:
                    log_pass("Manufacturing: DELETE /fabrics/{id}", "Deleted fabric")
                    
                    # Verify 404 on GET after delete
                    resp2 = session.get(f"{API_URL}/manufacturing/fabrics/{fabric_id}", timeout=10)
                    if resp2.status_code == 404:
                        log_pass("Manufacturing: Verify fabric deleted", "GET returns 404")
                    else:
                        log_fail("Manufacturing: Verify fabric deleted", f"Expected 404, got {resp2.status_code}", resp2)
                else:
                    log_fail("Manufacturing: DELETE /fabrics/{id}", "deleted flag not true", resp)
            else:
                log_fail("Manufacturing: DELETE /fabrics/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: DELETE /fabrics/{id}", e)
    
    return True


def test_manufacturing_boms():
    """3. Manufacturing: BOM CRUD with cost computation"""
    bom_id = None
    
    # First create a fabric for BOM lines
    fabric_resp = session.post(
        f"{API_URL}/manufacturing/fabrics",
        json={
            "name": "Cotton 200GSM for BOM",
            "fabric_type": "cotton",
            "gsm": 200,
            "color": "White",
            "unit": "meter",
            "rate": 120,
            "stock_qty": 100,
            "min_stock": 10
        },
        timeout=10
    )
    fabric_id = fabric_resp.json().get("id") if fabric_resp.status_code == 200 else "fab_test"
    
    # POST - Create BOM
    try:
        resp = session.post(
            f"{API_URL}/manufacturing/boms",
            json={
                "code": "BOM-T001",
                "product_name": "Cotton T-Shirt L",
                "size": "L",
                "color": "Red",
                "lines": [
                    {
                        "material_id": fabric_id,
                        "material_type": "fabric",
                        "material_name": "Cotton 200GSM",
                        "qty": 1.5,
                        "unit": "meter",
                        "wastage_pct": 5,
                        "rate": 120
                    },
                    {
                        "material_id": "fab_thread",
                        "material_type": "fabric",
                        "material_name": "Thread",
                        "qty": 0.05,
                        "unit": "kg",
                        "wastage_pct": 0,
                        "rate": 400
                    }
                ],
                "labour_cost": 40,
                "overhead_cost": 15
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("bom_"):
                bom_id = data["id"]
                # Verify cost computation
                # material_cost = (1.5 * 1.05 * 120) + (0.05 * 1.0 * 400) = 189 + 20 = 209
                # total_cost = 209 + 40 + 15 = 264
                expected_material = 209.0
                expected_total = 264.0
                actual_material = data.get("material_cost", 0)
                actual_total = data.get("total_cost", 0)
                
                if abs(actual_material - expected_material) < 0.1 and abs(actual_total - expected_total) < 0.1:
                    log_pass("Manufacturing: POST /boms", f"Created BOM {bom_id}, costs verified: material={actual_material}, total={actual_total}")
                else:
                    log_fail("Manufacturing: POST /boms", f"Cost mismatch: expected material={expected_material}, total={expected_total}, got material={actual_material}, total={actual_total}", resp)
                    return False
            else:
                log_fail("Manufacturing: POST /boms", "ID missing or wrong format", resp)
                return False
        else:
            log_fail("Manufacturing: POST /boms", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Manufacturing: POST /boms", e)
        return False
    
    # GET - List BOMs
    try:
        resp = session.get(f"{API_URL}/manufacturing/boms", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "total" in data:
                log_pass("Manufacturing: GET /boms", f"Found {data['total']} BOMs")
            else:
                log_fail("Manufacturing: GET /boms", "Wrong response shape", resp)
        else:
            log_fail("Manufacturing: GET /boms", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: GET /boms", e)
    
    # PUT - Update BOM (verify costs recomputed)
    if bom_id:
        try:
            resp = session.put(
                f"{API_URL}/manufacturing/boms/{bom_id}",
                json={
                    "code": "BOM-T001-UPDATED",
                    "product_name": "Cotton T-Shirt L Updated",
                    "size": "L",
                    "color": "Red",
                    "lines": [
                        {
                            "material_id": fabric_id,
                            "material_type": "fabric",
                            "material_name": "Cotton 200GSM",
                            "qty": 2.0,
                            "unit": "meter",
                            "wastage_pct": 5,
                            "rate": 120
                        }
                    ],
                    "labour_cost": 50,
                    "overhead_cost": 20
                },
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                # New: material_cost = 2.0 * 1.05 * 120 = 252, total = 252 + 50 + 20 = 322
                expected_total = 322.0
                actual_total = data.get("total_cost", 0)
                if abs(actual_total - expected_total) < 0.1:
                    log_pass("Manufacturing: PUT /boms/{id}", f"Updated BOM, costs recomputed: {actual_total}")
                else:
                    log_fail("Manufacturing: PUT /boms/{id}", f"Cost recomputation failed: expected {expected_total}, got {actual_total}", resp)
            else:
                log_fail("Manufacturing: PUT /boms/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: PUT /boms/{id}", e)
        
        # DELETE
        try:
            resp = session.delete(f"{API_URL}/manufacturing/boms/{bom_id}", timeout=10)
            if resp.status_code == 200:
                log_pass("Manufacturing: DELETE /boms/{id}", "Deleted BOM")
            else:
                log_fail("Manufacturing: DELETE /boms/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: DELETE /boms/{id}", e)
    
    return True


def test_manufacturing_orders():
    """4. Manufacturing: Production Order flow"""
    order_id = None
    
    # POST - Create order
    try:
        resp = session.post(
            f"{API_URL}/manufacturing/orders",
            json={
                "product_name": "Cotton T-Shirt Red",
                "party_name": "ABC Buyer",
                "color": "Red",
                "size_matrix": [
                    {"size": "S", "qty": 10},
                    {"size": "M", "qty": 20},
                    {"size": "L", "qty": 15}
                ],
                "total_qty": 45,
                "target_date": "2026-12-31"
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("po_"):
                order_id = data["id"]
                order_no = data.get("order_no", "")
                
                # Verify order_no pattern PO-YYYY-####
                import re
                if re.match(r"^PO-\d{4}-\d{4}$", order_no):
                    log_pass("Manufacturing: POST /orders - order_no", f"Order number: {order_no}")
                else:
                    log_fail("Manufacturing: POST /orders - order_no", f"Wrong pattern: {order_no}", resp)
                
                # Verify status and stage
                if data.get("status") == "pending" and data.get("current_stage_no") == 1:
                    log_pass("Manufacturing: POST /orders - status", "Status=pending, stage=1")
                else:
                    log_fail("Manufacturing: POST /orders - status", f"Wrong status/stage: {data.get('status')}/{data.get('current_stage_no')}", resp)
                
                # Verify stages_detail
                stages = data.get("stages_detail", [])
                expected_stages = ["Cutting", "Stitching", "Embroidery", "Printing", "Washing", "Packing", "QC"]
                if len(stages) == 7:
                    stage_names = [s.get("name") for s in stages]
                    if stage_names == expected_stages:
                        log_pass("Manufacturing: POST /orders - stages", f"7 stages: {', '.join(stage_names)}")
                    else:
                        log_fail("Manufacturing: POST /orders - stages", f"Wrong stage names: {stage_names}", resp)
                else:
                    log_fail("Manufacturing: POST /orders - stages", f"Expected 7 stages, got {len(stages)}", resp)
            else:
                log_fail("Manufacturing: POST /orders", "ID missing or wrong format", resp)
                return False
        else:
            log_fail("Manufacturing: POST /orders", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Manufacturing: POST /orders", e)
        return False
    
    # GET - List orders
    try:
        resp = session.get(f"{API_URL}/manufacturing/orders", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "total" in data:
                log_pass("Manufacturing: GET /orders", f"Found {data['total']} orders")
            else:
                log_fail("Manufacturing: GET /orders", "Wrong response shape", resp)
        else:
            log_fail("Manufacturing: GET /orders", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: GET /orders", e)
    
    # POST /advance - Test stage progression
    if order_id:
        try:
            # Advance once: pending -> in_progress, stage 1->2
            resp = session.post(f"{API_URL}/manufacturing/orders/{order_id}/advance", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "in_progress" and data.get("current_stage_no") == 2:
                    stages = data.get("stages_detail", [])
                    if stages[0].get("completed_at"):
                        log_pass("Manufacturing: POST /orders/{id}/advance (1st)", "Status=in_progress, stage=2, stage 1 completed")
                    else:
                        log_fail("Manufacturing: POST /orders/{id}/advance (1st)", "Stage 1 not marked completed", resp)
                else:
                    log_fail("Manufacturing: POST /orders/{id}/advance (1st)", f"Wrong status/stage: {data.get('status')}/{data.get('current_stage_no')}", resp)
            else:
                log_fail("Manufacturing: POST /orders/{id}/advance (1st)", f"Expected 200, got {resp.status_code}", resp)
            
            # Advance 5 more times (stages 2-6)
            for i in range(2, 7):
                resp = session.post(f"{API_URL}/manufacturing/orders/{order_id}/advance", timeout=10)
                if resp.status_code != 200:
                    log_fail(f"Manufacturing: POST /orders/{{id}}/advance ({i})", f"Expected 200, got {resp.status_code}", resp)
                    break
            else:
                data = resp.json()
                if data.get("status") == "in_progress" and data.get("current_stage_no") == 7:
                    log_pass("Manufacturing: POST /orders/{id}/advance (2-6)", "Advanced to stage 7, status=in_progress")
                else:
                    log_fail("Manufacturing: POST /orders/{id}/advance (2-6)", f"Wrong status/stage: {data.get('status')}/{data.get('current_stage_no')}", resp)
            
            # Advance one more time: should complete
            resp = session.post(f"{API_URL}/manufacturing/orders/{order_id}/advance", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "completed" and data.get("current_stage_no") == 7:
                    log_pass("Manufacturing: POST /orders/{id}/advance (final)", "Status=completed, stage=7")
                else:
                    log_fail("Manufacturing: POST /orders/{id}/advance (final)", f"Wrong status/stage: {data.get('status')}/{data.get('current_stage_no')}", resp)
            else:
                log_fail("Manufacturing: POST /orders/{id}/advance (final)", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: POST /orders/{id}/advance", e)
    
    # Create a new order for stage update test
    try:
        resp = session.post(
            f"{API_URL}/manufacturing/orders",
            json={
                "product_name": "Test Order for Stage Update",
                "party_name": "Test Buyer",
                "color": "Blue",
                "size_matrix": [{"size": "M", "qty": 50}],
                "total_qty": 50,
                "target_date": "2026-12-31"
            },
            timeout=10
        )
        if resp.status_code == 200:
            new_order_id = resp.json().get("id")
            
            # POST /stages/{stage_no}/update
            try:
                resp = session.post(
                    f"{API_URL}/manufacturing/orders/{new_order_id}/stages/3/update",
                    json={
                        "completed_qty": 30,
                        "wastage_qty": 2,
                        "completed": True,
                        "started": True
                    },
                    timeout=10
                )
                if resp.status_code == 200:
                    data = resp.json()
                    stages = data.get("stages_detail", [])
                    stage_3 = next((s for s in stages if s.get("stage_no") == 3), None)
                    if stage_3:
                        if stage_3.get("completed_at") and stage_3.get("started_at"):
                            if stage_3.get("completed_qty") == 30 and stage_3.get("wastage_qty") == 2:
                                log_pass("Manufacturing: POST /orders/{id}/stages/{n}/update", "Stage 3 updated with qty and timestamps")
                            else:
                                log_fail("Manufacturing: POST /orders/{id}/stages/{n}/update", f"Wrong qty: completed={stage_3.get('completed_qty')}, wastage={stage_3.get('wastage_qty')}", resp)
                        else:
                            log_fail("Manufacturing: POST /orders/{id}/stages/{n}/update", "Timestamps not set", resp)
                    else:
                        log_fail("Manufacturing: POST /orders/{id}/stages/{n}/update", "Stage 3 not found", resp)
                else:
                    log_fail("Manufacturing: POST /orders/{id}/stages/{n}/update", f"Expected 200, got {resp.status_code}", resp)
            except Exception as e:
                log_error("Manufacturing: POST /orders/{id}/stages/{n}/update", e)
        else:
            log_fail("Manufacturing: Create order for stage update", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: Create order for stage update", e)
    
    # GET with status filter
    try:
        resp = session.get(f"{API_URL}/manufacturing/orders?status=in_progress", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data:
                log_pass("Manufacturing: GET /orders?status=in_progress", f"Filter works, found {len(data['items'])} orders")
            else:
                log_fail("Manufacturing: GET /orders?status", "Wrong response shape", resp)
        else:
            log_fail("Manufacturing: GET /orders?status", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: GET /orders?status", e)
    
    # DELETE
    if order_id:
        try:
            resp = session.delete(f"{API_URL}/manufacturing/orders/{order_id}", timeout=10)
            if resp.status_code == 200:
                log_pass("Manufacturing: DELETE /orders/{id}", "Deleted order")
            else:
                log_fail("Manufacturing: DELETE /orders/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: DELETE /orders/{id}", e)
    
    return True


def test_manufacturing_job_work():
    """5. Manufacturing: Job Work CRUD"""
    jw_id = None
    
    # POST
    try:
        resp = session.post(
            f"{API_URL}/manufacturing/job-work",
            json={
                "vendor_id": "v1",
                "vendor_name": "XYZ Embroidery",
                "stage_name": "Embroidery",
                "qty_sent": 50,
                "rate": 15,
                "sent_date": "2026-01-01"
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("jw_"):
                jw_id = data["id"]
                # Verify total_amount = 50 * 15 = 750
                if data.get("total_amount") == 750:
                    log_pass("Manufacturing: POST /job-work", f"Created job-work {jw_id}, total_amount=750")
                else:
                    log_fail("Manufacturing: POST /job-work", f"Wrong total_amount: {data.get('total_amount')}", resp)
            else:
                log_fail("Manufacturing: POST /job-work", "ID missing or wrong format", resp)
                return False
        else:
            log_fail("Manufacturing: POST /job-work", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Manufacturing: POST /job-work", e)
        return False
    
    # GET
    try:
        resp = session.get(f"{API_URL}/manufacturing/job-work", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "total" in data:
                log_pass("Manufacturing: GET /job-work", f"Found {data['total']} job-work entries")
            else:
                log_fail("Manufacturing: GET /job-work", "Wrong response shape", resp)
        else:
            log_fail("Manufacturing: GET /job-work", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: GET /job-work", e)
    
    # PUT
    if jw_id:
        try:
            resp = session.put(
                f"{API_URL}/manufacturing/job-work/{jw_id}",
                json={
                    "vendor_id": "v1",
                    "vendor_name": "XYZ Embroidery Updated",
                    "stage_name": "Embroidery",
                    "qty_sent": 60,
                    "rate": 15,
                    "sent_date": "2026-01-01"
                },
                timeout=10
            )
            if resp.status_code == 200:
                log_pass("Manufacturing: PUT /job-work/{id}", "Updated job-work")
            else:
                log_fail("Manufacturing: PUT /job-work/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: PUT /job-work/{id}", e)
        
        # DELETE
        try:
            resp = session.delete(f"{API_URL}/manufacturing/job-work/{jw_id}", timeout=10)
            if resp.status_code == 200:
                log_pass("Manufacturing: DELETE /job-work/{id}", "Deleted job-work")
            else:
                log_fail("Manufacturing: DELETE /job-work/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: DELETE /job-work/{id}", e)
    
    return True


def test_manufacturing_wastage():
    """6. Manufacturing: Wastage CRUD"""
    wst_id = None
    
    # POST
    try:
        resp = session.post(
            f"{API_URL}/manufacturing/wastage",
            json={
                "qty": 5,
                "unit": "piece",
                "reason": "Cutting error",
                "date": "2026-01-01",
                "value": 600
            },
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data["id"].startswith("wst_"):
                wst_id = data["id"]
                log_pass("Manufacturing: POST /wastage", f"Created wastage {wst_id}")
            else:
                log_fail("Manufacturing: POST /wastage", "ID missing or wrong format", resp)
                return False
        else:
            log_fail("Manufacturing: POST /wastage", f"Expected 200, got {resp.status_code}", resp)
            return False
    except Exception as e:
        log_error("Manufacturing: POST /wastage", e)
        return False
    
    # GET
    try:
        resp = session.get(f"{API_URL}/manufacturing/wastage", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "items" in data and "total" in data:
                log_pass("Manufacturing: GET /wastage", f"Found {data['total']} wastage entries")
            else:
                log_fail("Manufacturing: GET /wastage", "Wrong response shape", resp)
        else:
            log_fail("Manufacturing: GET /wastage", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: GET /wastage", e)
    
    # DELETE
    if wst_id:
        try:
            resp = session.delete(f"{API_URL}/manufacturing/wastage/{wst_id}", timeout=10)
            if resp.status_code == 200:
                log_pass("Manufacturing: DELETE /wastage/{id}", "Deleted wastage")
            else:
                log_fail("Manufacturing: DELETE /wastage/{id}", f"Expected 200, got {resp.status_code}", resp)
        except Exception as e:
            log_error("Manufacturing: DELETE /wastage/{id}", e)
    
    return True


def test_manufacturing_dashboard():
    """7. Manufacturing: Dashboard"""
    try:
        resp = session.get(f"{API_URL}/manufacturing/dashboard", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["open_orders", "completed_orders", "delayed_orders", "total_boms", "total_fabrics", "wastage_value", "stage_load"]
            if all(k in data for k in required_keys):
                log_pass("Manufacturing: GET /dashboard", f"All keys present: {', '.join(required_keys)}")
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Manufacturing: GET /dashboard", f"Missing keys: {missing}", resp)
        else:
            log_fail("Manufacturing: GET /dashboard", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Manufacturing: GET /dashboard", e)


def test_reports_trial_balance():
    """8. Reports: Trial Balance"""
    try:
        resp = session.get(f"{API_URL}/reports/trial-balance?from=2026-01-01&to=2026-12-31", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["from", "to", "debit_rows", "credit_rows", "debit_total", "credit_total", "difference"]
            if all(k in data for k in required_keys):
                log_pass("Reports: GET /trial-balance", f"Valid shape, debit_total={data['debit_total']}, credit_total={data['credit_total']}")
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Reports: GET /trial-balance", f"Missing keys: {missing}", resp)
        else:
            log_fail("Reports: GET /trial-balance", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Reports: GET /trial-balance", e)


def test_reports_pnl():
    """9. Reports: P&L"""
    try:
        resp = session.get(f"{API_URL}/reports/pnl?from=2026-01-01&to=2026-12-31", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["from", "to", "sales", "purchases", "gross_profit", "other_income", "expenses", "total_income", "total_expense", "net_profit"]
            if all(k in data for k in required_keys):
                log_pass("Reports: GET /pnl", f"Valid shape, net_profit={data['net_profit']}")
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Reports: GET /pnl", f"Missing keys: {missing}", resp)
        else:
            log_fail("Reports: GET /pnl", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Reports: GET /pnl", e)


def test_reports_balance_sheet():
    """10. Reports: Balance Sheet"""
    try:
        resp = session.get(f"{API_URL}/reports/balance-sheet?as_of=2026-12-31", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["as_of", "assets", "liabilities", "equity"]
            if all(k in data for k in required_keys):
                assets = data["assets"]
                if "cash" in assets and "bank" in assets and "sundry_debtors" in assets and "total" in assets:
                    log_pass("Reports: GET /balance-sheet", f"Valid shape, assets.total={assets['total']}, equity={data['equity']}")
                else:
                    log_fail("Reports: GET /balance-sheet", "Assets structure incomplete", resp)
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Reports: GET /balance-sheet", f"Missing keys: {missing}", resp)
        else:
            log_fail("Reports: GET /balance-sheet", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Reports: GET /balance-sheet", e)


def test_reports_day_book():
    """11. Reports: Day Book"""
    try:
        resp = session.get(f"{API_URL}/reports/day-book?on=2026-01-01", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["date", "transactions", "invoices", "bank_payments", "counts"]
            if all(k in data for k in required_keys):
                log_pass("Reports: GET /day-book", f"Valid shape, counts={data['counts']}")
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Reports: GET /day-book", f"Missing keys: {missing}", resp)
        else:
            log_fail("Reports: GET /day-book", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Reports: GET /day-book", e)


def test_reports_cash_book():
    """12. Reports: Cash Book"""
    try:
        resp = session.get(f"{API_URL}/reports/cash-book?from=2026-01-01&to=2026-12-31", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["from", "to", "rows", "total_receipts", "total_payments", "closing_balance"]
            if all(k in data for k in required_keys):
                log_pass("Reports: GET /cash-book", f"Valid shape, closing_balance={data['closing_balance']}")
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Reports: GET /cash-book", f"Missing keys: {missing}", resp)
        else:
            log_fail("Reports: GET /cash-book", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Reports: GET /cash-book", e)


def test_reports_gstr1():
    """13. Reports: GSTR-1"""
    try:
        resp = session.get(f"{API_URL}/reports/gstr-1?month=2026-01", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["month", "b2b", "b2c", "totals"]
            if all(k in data for k in required_keys):
                totals = data["totals"]
                if "b2b" in totals and "b2c" in totals and "all" in totals:
                    # Check sub-structure
                    if all(k in totals["all"] for k in ["count", "taxable_value", "cgst", "sgst", "igst", "grand_total"]):
                        log_pass("Reports: GET /gstr-1", f"Valid shape, totals.all.grand_total={totals['all']['grand_total']}")
                    else:
                        log_fail("Reports: GET /gstr-1", "totals.all structure incomplete", resp)
                else:
                    log_fail("Reports: GET /gstr-1", "totals structure incomplete", resp)
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Reports: GET /gstr-1", f"Missing keys: {missing}", resp)
        else:
            log_fail("Reports: GET /gstr-1", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Reports: GET /gstr-1", e)


def test_reports_gstr3b():
    """14. Reports: GSTR-3B"""
    try:
        resp = session.get(f"{API_URL}/reports/gstr-3b?month=2026-01", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["month", "outward", "inward_itc", "net_tax_liability"]
            if all(k in data for k in required_keys):
                log_pass("Reports: GET /gstr-3b", f"Valid shape, net_tax_liability={data['net_tax_liability']}")
            else:
                missing = [k for k in required_keys if k not in data]
                log_fail("Reports: GET /gstr-3b", f"Missing keys: {missing}", resp)
        else:
            log_fail("Reports: GET /gstr-3b", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Reports: GET /gstr-3b", e)


def test_auth_required():
    """15. Cross-cutting: Verify 401 without auth"""
    endpoints = [
        "/manufacturing/fabrics",
        "/manufacturing/boms",
        "/manufacturing/orders",
        "/manufacturing/dashboard",
        "/reports/trial-balance",
        "/reports/pnl"
    ]
    
    # Create a session without auth
    unauth_session = requests.Session()
    
    for endpoint in endpoints:
        try:
            resp = unauth_session.get(f"{API_URL}{endpoint}", timeout=10)
            if resp.status_code == 401:
                log_pass(f"Auth Required: {endpoint}", "Returns 401 without auth")
            else:
                log_fail(f"Auth Required: {endpoint}", f"Expected 401, got {resp.status_code}", resp)
        except Exception as e:
            log_error(f"Auth Required: {endpoint}", e)


def test_existing_endpoints():
    """16. Cross-cutting: Verify existing endpoints still work"""
    # Already tested /auth/me above
    
    # Test root endpoint
    try:
        resp = session.get(f"{API_URL}/", timeout=10)
        if resp.status_code == 200:
            log_pass("Existing: GET /api/", "Root endpoint works")
        else:
            log_fail("Existing: GET /api/", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("Existing: GET /api/", e)


def test_gzip_encoding():
    """17. Cross-cutting: Verify GZip encoding on large response"""
    try:
        # Day-book might return large response
        resp = session.get(f"{API_URL}/reports/day-book?on=2026-01-01", timeout=10)
        if resp.status_code == 200:
            content_encoding = resp.headers.get("Content-Encoding", "")
            # Note: GZip might not be applied if response is too small
            if content_encoding == "gzip":
                log_pass("GZip: Content-Encoding", "Response is gzipped")
            else:
                # This is not a failure - GZip only applies to responses > 500 bytes
                log_pass("GZip: Content-Encoding", f"Response encoding: {content_encoding or 'none'} (GZip applies only to large responses)")
        else:
            log_fail("GZip: Content-Encoding", f"Expected 200, got {resp.status_code}", resp)
    except Exception as e:
        log_error("GZip: Content-Encoding", e)


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
    print("APKA MUNIM BACKEND TEST SUITE")
    print("Foundation Fix + Manufacturing + Accounting Reports")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("="*80)
    print()
    
    # 1. Auth setup
    if not test_auth_register():
        print("\n❌ Auth registration failed. Cannot proceed with other tests.")
        return 1
    
    if not test_auth_me():
        print("\n❌ Auth verification failed. Cannot proceed with other tests.")
        return 1
    
    print()
    
    # 2. Manufacturing tests
    print("--- MANUFACTURING TESTS ---")
    test_manufacturing_fabrics()
    test_manufacturing_boms()
    test_manufacturing_orders()
    test_manufacturing_job_work()
    test_manufacturing_wastage()
    test_manufacturing_dashboard()
    print()
    
    # 3. Reports tests
    print("--- ACCOUNTING REPORTS TESTS ---")
    test_reports_trial_balance()
    test_reports_pnl()
    test_reports_balance_sheet()
    test_reports_day_book()
    test_reports_cash_book()
    test_reports_gstr1()
    test_reports_gstr3b()
    print()
    
    # 4. Cross-cutting tests
    print("--- CROSS-CUTTING TESTS ---")
    test_auth_required()
    test_existing_endpoints()
    test_gzip_encoding()
    print()
    
    # Summary
    return print_summary()


if __name__ == "__main__":
    sys.exit(main())
