from jose import jwt
from app.config import settings

def test_login_success(test_client, manager_token):
    # manager_token fixture created the user with 0501234567/password123
    resp = test_client.post("/auth/login", json={"phone": "0501234567", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

def test_login_remember_me_duration(test_client, manager_token):
    resp_30d = test_client.post("/auth/login", json={"phone": "0501234567", "password": "password123", "remember_me": True})
    resp_session = test_client.post("/auth/login", json={"phone": "0501234567", "password": "password123", "remember_me": False})
    assert resp_30d.status_code == 200
    assert resp_session.status_code == 200
    p_30d = jwt.decode(resp_30d.json()["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    p_session = jwt.decode(resp_session.json()["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert p_30d["remember_me"] is True
    assert p_session["remember_me"] is False
    # 30-day expiry is much longer than 8-hour session expiry
    assert p_30d["exp"] - p_session["exp"] > 20 * 24 * 3600

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

def test_unauthenticated_endpoints_blocked(test_client):
    assert test_client.get("/shifts?month=11&year=2026").status_code == 401
    assert test_client.get("/checklist").status_code == 401
    assert test_client.get("/settings").status_code == 401

    # Public settings must ONLY expose logo_url and never leak wifi_info or important_phones
    pub = test_client.get("/settings/public")
    assert pub.status_code == 200
    data = pub.json()
    assert "logo_url" in data
    assert "wifi_info" not in data
    assert "important_phones" not in data

def test_verify_and_change_password_invalidates_old_tokens(test_client, manager_token):
    # Create a volunteer and log in
    test_client.post(
        "/users/",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"name": "Sec User", "phone": "0523334444", "role": "EVENT_VOLUNTEER", "password": "old_password"}
    )
    login_resp = test_client.post("/auth/login", json={"phone": "0523334444", "password": "old_password"})
    old_token = login_resp.json()["access_token"]

    # Verify wrong password fails with 400
    bad_verify = test_client.post(
        "/users/me/verify-password",
        headers={"Authorization": f"Bearer {old_token}"},
        json={"old_password": "wrong_password"}
    )
    assert bad_verify.status_code == 400

    # Verify right password succeeds
    ok_verify = test_client.post(
        "/users/me/verify-password",
        headers={"Authorization": f"Bearer {old_token}"},
        json={"old_password": "old_password"}
    )
    assert ok_verify.status_code == 200

    # Change password -> returns new token and invalidates old_token
    change_resp = test_client.put(
        "/users/me/change-password",
        headers={"Authorization": f"Bearer {old_token}"},
        json={"old_password": "old_password", "new_password": "new_password123"}
    )
    assert change_resp.status_code == 200
    new_token = change_resp.json()["access_token"]
    assert new_token is not None

    # Old token must now be rejected!
    assert test_client.get("/users/me", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401
    # New token works!
    assert test_client.get("/users/me", headers={"Authorization": f"Bearer {new_token}"}).status_code == 200

def test_security_headers_and_url_injection_protection(test_client, volunteer_token, manager_token):
    resp = test_client.get("/users/me", headers={"Authorization": f"Bearer {volunteer_token}"})
    assert resp.status_code == 200
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert "no-store" in resp.headers.get("Cache-Control", "")
    assert "max-age=31536000" in resp.headers.get("Strict-Transport-Security", "")

    # Invalid month/year query injection blocked with 422
    bad_query = test_client.get(
        "/shifts?month=99&year=2026",
        headers={"Authorization": f"Bearer {volunteer_token}"}
    )
    assert bad_query.status_code == 422

    # Malicious logo_url blocked with 400
    bad_logo = test_client.put(
        "/settings",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"settings": {"logo_url": "javascript:alert(1)"}}
    )
    assert bad_logo.status_code == 400
