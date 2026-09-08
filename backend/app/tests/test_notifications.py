def _setup_shifts_and_assign(test_client, manager_token, volunteer_token, month=12, year=2026):
    """Helper: generate shifts, assign volunteer to first, return shift list."""
    test_client.post(
        "/shifts/generate",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"month": month, "year": year}
    )
    shifts = test_client.get(f"/shifts/?month={month}&year={year}").json()
    shift_id = shifts[0]["id"]
    test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={"shift_id": shift_id}
    )
    return shifts

def test_create_notification_is_unread(test_client, manager_token, volunteer_token):
    """שיבוץ למשמרת יוצר התראה unread."""
    _setup_shifts_and_assign(test_client, manager_token, volunteer_token)

    notifs = test_client.get(
        "/notifications/",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    ).json()
    assert len(notifs) >= 1
    assert notifs[0]["is_read"] is False

def test_mark_as_read(test_client, manager_token, volunteer_token):
    """סימון התראה כנקראה."""
    _setup_shifts_and_assign(test_client, manager_token, volunteer_token)

    notifs = test_client.get(
        "/notifications/",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    ).json()
    assert len(notifs) >= 1
    notif_id = notifs[0]["id"]

    resp = test_client.put(
        f"/notifications/{notif_id}/read",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

def test_get_notifications_for_user(test_client, volunteer_token, manager_token):
    """מנהל לא רואה התראות של מתנדב."""
    _setup_shifts_and_assign(test_client, manager_token, volunteer_token)

    notifs_vol = test_client.get(
        "/notifications/",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    ).json()
    notifs_mgr = test_client.get(
        "/notifications/",
        headers={"Authorization": f"Bearer {manager_token}"}
    ).json()

    assert len(notifs_mgr) == 0
    assert len(notifs_vol) >= 1

def test_mark_all_as_read(test_client, manager_token, volunteer_token):
    """סימון כל ההתראות כנקראו."""
    shifts = _setup_shifts_and_assign(test_client, manager_token, volunteer_token)

    # Assign a second shift to create a second notification
    shift_id2 = shifts[1]["id"]
    test_client.post(
        "/shifts/assign",
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={"shift_id": shift_id2}
    )

    resp = test_client.put(
        "/notifications/read-all",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] > 0

    notifs = test_client.get(
        "/notifications/",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    ).json()
    assert all(n["is_read"] for n in notifs)
