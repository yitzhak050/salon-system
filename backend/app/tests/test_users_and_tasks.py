def test_create_user_no_slash_and_reset_password(test_client, manager_token):
    resp = test_client.post(
        "/users",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"name": "Test User No Slash", "phone": "0529999999", "role": "EVENT_VOLUNTEER", "password": "initial_pw"}
    )
    assert resp.status_code == 201
    user_id = resp.json()["id"]

    get_resp = test_client.get(
        "/users",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert get_resp.status_code == 200
    assert any(u["id"] == user_id for u in get_resp.json())

    reset_resp = test_client.put(
        f"/users/{user_id}/reset-password",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"password": "new_secret_password"}
    )
    assert reset_resp.status_code == 200

    login_resp = test_client.post("/auth/login", json={"phone": "0529999999", "password": "new_secret_password"})
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

def test_checklist_crud(test_client, manager_token, volunteer_token):
    resp = test_client.post(
        "/checklist",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"title": "כיבוי מזגנים", "description": "לוודא שכל המזגנים כבויים", "order_index": 1}
    )
    assert resp.status_code == 200
    task_id = resp.json()["id"]
    assert resp.json()["title"] == "כיבוי מזגנים"

    get_resp = test_client.get("/checklist")
    assert get_resp.status_code == 200
    assert any(t["id"] == task_id for t in get_resp.json())

    update_resp = test_client.put(
        f"/checklist/{task_id}",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"title": "כיבוי מזגנים ותאורה", "description": "לוודא מזגנים ותאורה כבויים"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "כיבוי מזגנים ותאורה"

    del_resp = test_client.delete(
        f"/checklist/{task_id}",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert del_resp.status_code == 200
