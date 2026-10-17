"""Checks for admin authentication.

    cd backend && python -m tests.test_auth      (or: pytest tests/)
"""

import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp}/auth.db"
os.environ["CHROMA_PERSIST_DIRECTORY"] = os.path.join(_tmp, "chroma")
os.environ["SECRET_KEY_FILE"] = os.path.join(_tmp, "secret.key")
os.environ.pop("ADMIN_USERNAME", None)
os.environ.pop("ADMIN_PASSWORD", None)

from fastapi.testclient import TestClient  # noqa: E402

from app import auth  # noqa: E402
from app.main import app  # noqa: E402

PASSWORD = "correct horse battery"


def test_auth_flow():
    with TestClient(app) as c:
        # Fresh install: admin routes are closed, setup is pending.
        assert c.get("/api/agents/").status_code == 401
        assert c.get("/api/settings/").status_code == 401
        assert c.get("/api/auth/state").json() == {
            "needs_setup": True, "authenticated": False, "username": None,
        }

        # Setup needs the token from the logs.
        token = auth._setup_token
        assert token
        body = {"username": "admin", "password": PASSWORD}
        assert c.post("/api/auth/setup", json={**body, "token": "wrong"}).status_code == 403
        assert c.post("/api/auth/setup", json={**body, "token": token, "password": "short"}).status_code == 400

        # Another site can't drive the setup form even with the token.
        cross = {"Sec-Fetch-Site": "cross-site"}
        assert c.post("/api/auth/setup", json={**body, "token": token}, headers=cross).status_code == 403

        r = c.post("/api/auth/setup", json={**body, "token": token})
        assert r.status_code == 200, r.text
        cookie = r.cookies.get(auth.COOKIE_NAME)
        assert cookie and "httponly" in r.headers["set-cookie"].lower()
        assert "secure" not in r.headers["set-cookie"].lower()  # plain HTTP here

        # Setup is closed for good, with or without the old token.
        assert c.post("/api/auth/setup", json={**body, "token": token}).status_code == 409

        # Signed in: admin routes open, cross-site writes refused.
        assert c.get("/api/agents/").status_code == 200
        agent = {"name": "a", "llm_model": "llama3.2"}
        assert c.post("/api/agents/", json=agent, headers=cross).status_code == 403
        assert c.post("/api/agents/", json=agent, headers={"Origin": "https://evil.example"}).status_code == 403
        assert c.post("/api/agents/", json=agent, headers={"Origin": "http://testserver"}).status_code == 200
        assert c.post("/api/agents/", json=agent, headers={"Sec-Fetch-Site": "same-origin"}).status_code == 200

        # No CORS on the admin API, CORS kept on the public API.
        pre = {"Origin": "https://site.example", "Access-Control-Request-Method": "POST"}
        assert "access-control-allow-origin" not in c.options("/api/agents/", headers=pre).headers
        assert c.options("/api/v1/public/chat", headers=pre).headers["access-control-allow-origin"] == "*"

        # The public API still works without a session.
        c.cookies.clear()
        key = None
        r = c.post("/api/auth/login", json=body)
        assert r.status_code == 200
        agent_id = c.get("/api/agents/").json()[0]["id"]
        key = c.post(f"/api/agents/{agent_id}/api-keys/", json={"name": "k"}).json()["key"]
        c.post("/api/auth/logout")
        assert c.get("/api/agents/").status_code == 401
        assert c.get("/api/v1/public/agent", headers={"Authorization": f"Bearer {key}"}).status_code == 200

        # Logout really ends the session server-side: the old cookie is dead.
        c.cookies.set(auth.COOKIE_NAME, cookie)
        assert c.get("/api/agents/").status_code == 200  # setup session, still live
        c.post("/api/auth/logout")
        c.cookies.set(auth.COOKIE_NAME, cookie)
        assert c.get("/api/agents/").status_code == 401

        # Wrong passwords: same answer for unknown users, then a temporary lock.
        assert c.post("/api/auth/login", json={"username": "nobody", "password": "x"}).status_code == 401
        for _ in range(auth.LoginThrottle.MAX_PER_USERNAME):
            assert c.post("/api/auth/login", json={**body, "password": "nope"}).status_code == 401
        r = c.post("/api/auth/login", json=body)
        assert r.status_code == 429 and int(r.headers["retry-after"]) > 0
        auth.throttle = auth.LoginThrottle()

        # A parallel burst must not slip past the count (attempts are counted
        # before the password check, not after it fails).
        def attempt(i):
            return c.post("/api/auth/login", json={**body, "password": f"wrong{i}"}).status_code

        with ThreadPoolExecutor(30) as pool:
            codes = list(pool.map(attempt, range(30)))
        assert codes.count(401) == auth.LoginThrottle.MAX_PER_USERNAME, codes
        auth.throttle = auth.LoginThrottle()

        # Changing the password signs out the other sessions.
        c.cookies.clear()
        other = TestClient(app)
        assert other.post("/api/auth/login", json=body).status_code == 200
        assert c.post("/api/auth/login", json=body).status_code == 200
        r = c.put("/api/auth/password", json={"current_password": "nope", "new_password": "another long one"})
        assert r.status_code == 400
        r = c.put("/api/auth/password", json={"current_password": PASSWORD, "new_password": "another long one"})
        assert r.status_code == 200 and r.json()["ended"] >= 1
        assert other.get("/api/agents/").status_code == 401
        assert c.get("/api/agents/").status_code == 200
        assert c.post("/api/auth/login", json={**body, "password": "another long one"}).status_code == 200


if __name__ == "__main__":
    test_auth_flow()
    print("ok test_auth_flow")
