from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/api/v1/system/health")

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["data"]["status"] == "ok"
    assert data["data"]["application"] == "EduSphere"
    assert data["data"]["version"] == "0.1.0"


def test_database_health():
    response = client.get("/api/v1/system/health/db")

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["data"]["status"] == "ok"
    assert data["data"]["database"] == "connected"