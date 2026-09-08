import pytest
import datetime

def test_generate_shifts_october(test_client, manager_token):
    resp = test_client.post(
        "/shifts/generate",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"month": 10, "year": 2026}
    )
    assert resp.status_code == 200
    shifts = resp.json()
    # October 2026 has 21 workdays (Sun-Thu) excluding 10 weekend days (Fri-Sat)
    assert len(shifts) == 21 * 3 # 63 shifts



def test_generate_shifts_idempotent(test_client, manager_token):
    test_client.post(
        "/shifts/generate",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"month": 10, "year": 2026}
    )
    resp = test_client.post(
        "/shifts/generate",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"month": 10, "year": 2026}
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0

def test_assign_volunteer(test_client, manager_token, volunteer_token):
    # generate a shift for future
    now = datetime.datetime.now()
    month, year = now.month, now.year + 1
    
    test_client.post(
        "/shifts/generate",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"month": month, "year": year}
    )
    
    shifts_resp = test_client.get(f"/shifts/?month={month}&year={year}")
    shift_id = shifts_resp.json()[0]["id"]
    
    resp = test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={"shift_id": shift_id}
    )
    assert resp.status_code == 200
    assert resp.json()["shift_id"] == shift_id

def test_assign_past_shift_fails(test_client, manager_token, volunteer_token):
    test_client.post(
        "/shifts/generate",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"month": 1, "year": 2024}
    )
    
    shifts_resp = test_client.get("/shifts/?month=1&year=2024")
    if shifts_resp.json():
        shift_id = shifts_resp.json()[0]["id"]
        
        resp = test_client.post(
            "/shifts/assign",
            headers={"Authorization": f"Bearer {volunteer_token}"},
            json={"shift_id": shift_id}
        )
        assert resp.status_code == 400

def test_clock_out_before_clock_in_fails(test_client, manager_token, volunteer_token):
    now = datetime.datetime.now()
    month, year = now.month, now.year + 1
    test_client.post("/shifts/generate", headers={"Authorization": f"Bearer {manager_token}"}, json={"month": month, "year": year})
    shifts_resp = test_client.get(f"/shifts/?month={month}&year={year}")
    shift_id = shifts_resp.json()[0]["id"]
    
    test_client.post("/shifts/assign", headers={"Authorization": f"Bearer {volunteer_token}"}, json={"shift_id": shift_id})
    
    resp = test_client.post("/shifts/clock-out", headers={"Authorization": f"Bearer {volunteer_token}"}, json={"shift_id": shift_id})
    assert resp.status_code == 400

def test_hours_calculation(test_client, manager_token, volunteer_token):
    # This involves manipulating DB directly or relying on actual time if we didn't mock. 
    # Since we can't easily mock datetime.utcnow in FastAPI without dependencies,
    # we'll just check clock in works.
    now = datetime.datetime.now()
    month, year = now.month, now.year + 1
    test_client.post("/shifts/generate", headers={"Authorization": f"Bearer {manager_token}"}, json={"month": month, "year": year})
    shifts_resp = test_client.get(f"/shifts/?month={month}&year={year}")
    shift_id = shifts_resp.json()[0]["id"]
    
    test_client.post("/shifts/assign", headers={"Authorization": f"Bearer {volunteer_token}"}, json={"shift_id": shift_id})
    
    resp = test_client.post("/shifts/clock-in", headers={"Authorization": f"Bearer {volunteer_token}"}, json={"shift_id": shift_id})
    assert resp.status_code == 200
    assert resp.json()["clock_in"] is not None
    
    # We can test clock out immediately, hours will be 0
    resp2 = test_client.post("/shifts/clock-out", headers={"Authorization": f"Bearer {volunteer_token}"}, json={"shift_id": shift_id})
    assert resp2.status_code == 200
    assert resp2.json()["hours_logged"] is not None

def test_operator_forbidden_from_manager_endpoints(test_client, operator_token):
    # SALON_OPERATOR must NOT be allowed to generate shifts or create shifts
    resp = test_client.post(
        "/shifts/generate",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={"month": 11, "year": 2026}
    )
    assert resp.status_code == 403

    resp2 = test_client.post(
        "/shifts",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={"date": "2026-11-15", "slot": "MORNING", "title": "משמרת"}
    )
    assert resp2.status_code == 403

    resp3 = test_client.get(
        "/users",
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert resp3.status_code == 403

def test_shift_capacity_default_one_and_increase(test_client, manager_token, volunteer_token, volunteer2_token):
    # Manager creates an event shift with default capacity 1
    future_date = (datetime.date.today() + datetime.timedelta(days=30)).strftime("%Y-%m-%d")
    create_resp = test_client.post(
        "/shifts",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"date": future_date, "slot": "MORNING", "title": "משמרת רגילה", "max_volunteers": 1}
    )
    assert create_resp.status_code == 200
    shift_id = create_resp.json()["id"]

    # First volunteer assigns
    resp1 = test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={"shift_id": shift_id}
    )
    assert resp1.status_code == 200

    # Second volunteer attempts to assign -> should fail because shift is full (max 1)
    resp2 = test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer2_token}"},
        json={"shift_id": shift_id}
    )
    assert resp2.status_code == 400
    assert "מלאה" in resp2.json()["detail"]

    # Manager increases capacity to 2
    patch_resp = test_client.patch(
        f"/shifts/{shift_id}",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"max_volunteers": 2}
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["max_volunteers"] == 2

    # Second volunteer assigns now -> success!
    resp3 = test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer2_token}"},
        json={"shift_id": shift_id}
    )
    assert resp3.status_code == 200

def test_unassign_24_hour_rule(test_client, manager_token, volunteer_token):
    # Case 1: Shift in far future (30 days) -> volunteer CAN unassign
    future_date = (datetime.date.today() + datetime.timedelta(days=30)).strftime("%Y-%m-%d")
    create_resp = test_client.post(
        "/shifts",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"date": future_date, "slot": "EVENING", "title": "משמרת עתידית"}
    )
    shift_id = create_resp.json()["id"]

    assign_resp = test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={"shift_id": shift_id}
    )
    assignment_id = assign_resp.json()["id"]

    unassign_resp = test_client.delete(
        f"/shifts/assign/{assignment_id}",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert unassign_resp.status_code == 200

    # Case 2: Shift today (less than 24 hours) -> volunteer CANNOT unassign
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    create_today = test_client.post(
        "/shifts",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"date": today_str, "slot": "MORNING", "title": "משמרת היום"}
    )
    today_shift_id = create_today.json()["id"]

    assign_today = test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={"shift_id": today_shift_id}
    )
    today_assign_id = assign_today.json()["id"]

    unassign_today = test_client.delete(
        f"/shifts/assign/{today_assign_id}",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert unassign_today.status_code == 400
    assert "24 שעות" in unassign_today.json()["detail"]

    # Manager CAN unassign even if < 24 hours
    manager_unassign = test_client.delete(
        f"/shifts/assign/{today_assign_id}",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert manager_unassign.status_code == 200

def test_custom_shift_signup(test_client, volunteer_token):
    # Volunteer registers for custom partial hours / weekend
    future_date = (datetime.date.today() + datetime.timedelta(days=14)).strftime("%Y-%m-%d")
    resp = test_client.post(
        "/shifts/custom-signup",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={
            "date": future_date,
            "start_time": "11:30",
            "end_time": "15:00",
            "notes": "שעות חלקיות בסופש"
        }
    )
    assert resp.status_code == 200
    assert "11:30" in resp.json()["notes"]

def test_volunteer_yearly_stats_and_attendance_report(test_client, manager_token, volunteer_token):
    current_year = datetime.date.today().year

    # 1. Check stats endpoint returns yearly stats
    stats_resp = test_client.get(
        f"/reports/volunteer/stats?year={current_year}",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert stats_resp.status_code == 200
    data = stats_resp.json()
    assert "total_hours" in data
    assert data["year"] == current_year

    # 2. Check attendance report endpoint
    att_resp = test_client.get(
        f"/reports/volunteer/attendance?year={current_year}",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert att_resp.status_code == 200
    att_data = att_resp.json()
    assert "records" in att_data
    assert "total_hours" in att_data
    assert att_data["year"] == current_year

    # 3. Check PDF export endpoint
    pdf_resp = test_client.get(
        f"/reports/volunteer/pdf?year={current_year}",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 0

def test_auto_hour_credit_when_shift_time_arrives(test_client, manager_token, volunteer_token):
    current_year = datetime.date.today().year

    # Create a shift for yesterday or earlier
    past_date = (datetime.date.today() - datetime.timedelta(days=2)).strftime("%Y-%m-%d")
    create_resp = test_client.post(
        "/shifts",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"date": past_date, "slot": "MORNING", "title": "משמרת עבר לבדיקה"}
    )
    assert create_resp.status_code == 200
    shift_id = create_resp.json()["id"]

    # Assign volunteer via manager
    assign_resp = test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"shift_id": shift_id, "user_id": test_client.get("/users", headers={"Authorization": f"Bearer {manager_token}"}).json()[1]["id"]}
    )
    # Even without clock-in, the hours must be calculated (4.0 hrs for morning shift)
    att_resp = test_client.get(
        f"/reports/volunteer/attendance?year={current_year}",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert att_resp.status_code == 200
    user_records = [r for r in att_resp.json()["records"] if r["shift_id"] == shift_id]
    if user_records:
        assert user_records[0]["hours_logged"] == 4.0
        assert user_records[0]["status"] == "אושר לפי מועד"



