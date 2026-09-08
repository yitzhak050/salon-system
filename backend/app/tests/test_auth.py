def test_login_success(test_client, manager_token):
    # manager_token fixture created the user with 0501234567/password123
    resp = test_client.post("/auth/login", json={"phone": "0501234567", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

def test_login_wrong_password(test_client, manager_token):
    resp = test_client.post("/auth/login", json={"phone": "0501234567", "password": "wrong"})
    assert resp.status_code == 401

def test_create_user_by_manager(test_client, manager_token):
    resp = test_client.post(
        "/users/", 
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"name": "New Vol", "phone": "0521111111", "role": "EVENT_VOLUNTEER", "password": "pw"}
    )
    assert resp.status_code == 201
    assert resp.json()["phone"] == "0521111111"

def test_create_user_by_volunteer_forbidden(test_client, volunteer_token):
    resp = test_client.post(
        "/users/", 
        headers={"Authorization": f"Bearer {volunteer_token}"},
        json={"name": "New Vol", "phone": "0521111112", "role": "EVENT_VOLUNTEER", "password": "pw"}
    )
    assert resp.status_code == 403

def test_duplicate_phone(test_client, manager_token):
    # manager has 0501234567
    resp = test_client.post(
        "/users/", 
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"name": "Dupe", "phone": "0501234567", "role": "EVENT_VOLUNTEER", "password": "pw"}
    )
    assert resp.status_code == 400
