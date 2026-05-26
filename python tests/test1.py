import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import backend.auth as auth
import backend.main as main


class AuthFlowTests(unittest.TestCase):
    def setUp(self) -> None:
        # Reset in-memory stores
        auth.USERS_DB.clear()
        auth.SESSIONS.clear()

        self.client = TestClient(main.app)

        # Create a baseline user for login tests
        auth.USERS_DB["test@example.com"] = {
            "email": "test@example.com",
            "password": "password123"
        }

    def _extract_auth_cookie(self, response):
        cookie_header = response.headers.get("Set-Cookie")
        self.assertIsNotNone(cookie_header)
        self.assertIn("auth_token=", cookie_header)

        token = response.cookies.get("auth_token")
        self.assertIsNotNone(token)

        # attach to client for future requests
        self.client.cookies.set("auth_token", token)
        return token

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

    @patch("backend.auth.send_welcome_email")
    def test_signup_sets_session_cookie(self, mock_send_welcome_email) -> None:
        mock_send_welcome_email.return_value = None

        response = self.client.post(
            "/api/auth/signup",
            json={
                "email": "newuser@example.com",
                "password": "password123"
            }
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["user"]["email"], "newuser@example.com")

        token = self._extract_auth_cookie(response)

        # verify session works
        check = self.client.get("/api/auth/check")
        self.assertEqual(check.status_code, 200)
        self.assertTrue(check.json()["authenticated"])

    def test_login_sets_session_cookie(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "password123"
            }
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        token = self._extract_auth_cookie(response)

        check = self.client.get("/api/auth/check")
        self.assertEqual(check.status_code, 200)
        self.assertTrue(check.json()["authenticated"])

    def test_login_fails_with_wrong_password(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "wrongpassword"
            }
        )

        self.assertNotEqual(response.status_code, 200)

    def test_signup_fails_for_existing_user(self) -> None:
        response = self.client.post(
            "/api/auth/signup",
            json={
                "email": "test@example.com",
                "password": "password123"
            }
        )

        self.assertNotEqual(response.status_code, 200)

    def test_signup_missing_fields(self) -> None:
        response = self.client.post(
            "/api/auth/signup",
            json={"email": "missing@example.com"}
        )

        self.assertNotEqual(response.status_code, 200)

    def test_auth_check_requires_login(self) -> None:
        response = self.client.get("/api/auth/check")
        self.assertEqual(response.status_code, 401)

    def test_logout_clears_session(self) -> None:
        # login first
        login = self.client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "password123"
            }
        )

        self.assertEqual(login.status_code, 200)
        self._extract_auth_cookie(login)

        # assume logout endpoint exists
        logout = self.client.post("/api/auth/logout")
        self.assertEqual(logout.status_code, 200)

        # session should be invalid now
        check = self.client.get("/api/auth/check")
        self.assertFalse(check.json().get("authenticated", False))