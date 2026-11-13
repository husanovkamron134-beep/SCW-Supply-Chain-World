import os
from pathlib import Path

from fastapi.testclient import TestClient

os.environ["SCW_JWT_SECRET"] = "test-secret-that-is-at-least-32-characters-long"
os.environ.pop("GEMINI_API_KEY", None)

from main import create_app


def make_client(tmp_path: Path):
    db_file = tmp_path / "scw-test.db"
    app = create_app(f"sqlite:///{db_file}", "test-secret-that-is-at-least-32-characters-long")
    return TestClient(app)


def register(client, email="owner@example.com"):
    response = client.post("/api/auth/register", json={
        "email": email, "password": "strong-password-123", "workspace_name": "SCW Test"
    })
    assert response.status_code == 201, response.text
    return response.json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_health_and_registration(tmp_path):
    client = make_client(tmp_path)
    assert client.get("/api/health").json()["status"] == "ok"
    result = register(client)
    assert result["workspace"]["role"] == "owner"
    assert client.get("/api/auth/me", headers=auth(result["access_token"])).json()["email"] == "owner@example.com"


def test_duplicate_email_and_bad_login(tmp_path):
    client = make_client(tmp_path)
    register(client)
    assert client.post("/api/auth/register", json={
        "email": "OWNER@example.com", "password": "strong-password-123"
    }).status_code == 409
    assert client.post("/api/auth/login", json={
        "email": "owner@example.com", "password": "wrong-password"
    }).status_code == 401


def test_workspace_state_and_version_conflict(tmp_path):
    client = make_client(tmp_path)
    owner = register(client)
    wid = owner["workspace"]["id"]
    headers = auth(owner["access_token"])
    saved = client.put(f"/api/workspaces/{wid}/state", headers=headers, json={
        "data": {"inventory": {"sku": "SCW-001", "qty": 42}}, "expected_version": 1
    })
    assert saved.status_code == 200
    assert saved.json()["version"] == 2
    conflict = client.put(f"/api/workspaces/{wid}/state", headers=headers, json={
        "data": {}, "expected_version": 1
    })
    assert conflict.status_code == 409
    loaded = client.get(f"/api/workspaces/{wid}/state", headers=headers).json()
    assert loaded["data"]["inventory"]["qty"] == 42


def test_membership_and_viewer_permissions(tmp_path):
    client = make_client(tmp_path)
    owner = register(client)
    viewer = register(client, "viewer@example.com")
    wid = owner["workspace"]["id"]
    owner_headers = auth(owner["access_token"])
    add = client.post(f"/api/workspaces/{wid}/members", headers=owner_headers,
                      json={"email": "viewer@example.com", "role": "viewer"})
    assert add.status_code == 201
    viewer_headers = auth(viewer["access_token"])
    assert client.get(f"/api/workspaces/{wid}/state", headers=viewer_headers).status_code == 200
    denied = client.put(f"/api/workspaces/{wid}/state", headers=viewer_headers,
                        json={"data": {"x": 1}})
    assert denied.status_code == 403
    assert client.get(f"/api/workspaces/{wid}/state", headers=auth(register(client, "stranger@example.com")["access_token"])).status_code == 404


def test_ai_proxy_is_disabled_without_server_key(tmp_path):
    client = make_client(tmp_path)
    owner = register(client)
    wid = owner["workspace"]["id"]
    response = client.post(f"/api/workspaces/{wid}/ai/analyze",
        headers=auth(owner["access_token"]), json={"question": "Zaxira xavfini bahola"})
    assert response.status_code == 503
