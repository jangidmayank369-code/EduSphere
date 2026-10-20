from starlette.requests import Request
import pytest

from app.api.routes import auth
from app.core.exceptions import RateLimitError


def make_request(client_ip: str = "192.0.2.10") -> Request:
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/v1/auth/login",
            "raw_path": b"/api/v1/auth/login",
            "query_string": b"",
            "headers": [],
            "client": (client_ip, 12345),
            "server": ("testserver", 80),
        }
    )


def test_login_rate_limit_allows_requests_under_limit(monkeypatch):
    monkeypatch.setattr(auth.settings, "login_rate_limit", 2)
    monkeypatch.setattr(auth.settings, "login_rate_window_seconds", 300)
    auth._login_ip_requests.clear()

    request = make_request()
    auth._check_login_ip_rate_limit(request)
    auth._check_login_ip_rate_limit(request)

    assert len(auth._login_ip_requests["192.0.2.10"]) == 2


def test_login_rate_limit_rejects_request_at_limit(monkeypatch):
    monkeypatch.setattr(auth.settings, "login_rate_limit", 2)
    monkeypatch.setattr(auth.settings, "login_rate_window_seconds", 300)
    auth._login_ip_requests.clear()

    request = make_request()
    auth._check_login_ip_rate_limit(request)
    auth._check_login_ip_rate_limit(request)

    with pytest.raises(RateLimitError) as exc_info:
        auth._check_login_ip_rate_limit(request)

    assert exc_info.value.status_code == 429
    assert exc_info.value.code == "LOGIN_IP_RATE_LIMITED"
    assert exc_info.value.details["retry_after_seconds"] >= 1


def test_login_rate_limit_uses_forwarded_client_ip(monkeypatch):
    monkeypatch.setattr(auth.settings, "login_rate_limit", 1)
    monkeypatch.setattr(auth.settings, "login_rate_window_seconds", 300)
    auth._login_ip_requests.clear()

    request = Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/v1/auth/login",
            "raw_path": b"/api/v1/auth/login",
            "query_string": b"",
            "headers": [(b"x-forwarded-for", b"198.51.100.25, 192.0.2.1")],
            "client": ("192.0.2.1", 12345),
            "server": ("testserver", 80),
        }
    )

    auth._check_login_ip_rate_limit(request)
    assert "198.51.100.25" in auth._login_ip_requests
