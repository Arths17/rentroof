import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import backend.auth as auth
import backend.main as main


class AuthFlowTests(unittest.TestCase):
    def setUp(self) -> None:
        auth.USERS_DB.clear()
        auth.SESSIONS.clear()
        self.client = TestClient(main.app)

    def test_health_endpoint(self) -> None:
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'healthy'})

    @patch('backend.auth.send_welcome_email')
    def test_signup_sets_session_cookie(self, mock_send_welcome_email) -> None:
        mock_send_welcome_email.return_value = None

        response = self.client.post(
            '/api/auth/signup',
            json={
                'email': 'landlord@example.com',
                'password': 'strong-password',
                'name': 'Landlord User',
                'plan': 'growth',
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload['success'])
        self.assertEqual(payload['user']['email'], 'landlord@example.com')
        self.assertIn('auth_token=', response.headers.get('set-cookie', ''))

        cookie_token = response.cookies.get('auth_token')
        self.assertIsNotNone(cookie_token)

        self.client.cookies.set('auth_token', cookie_token)
        check_response = self.client.get('/api/auth/check')
        self.assertEqual(check_response.status_code, 200)
        self.assertTrue(check_response.json()['authenticated'])

    def test_login_sets_session_cookie(self) -> None:
        response = self.client.post(
            '/api/auth/login',
            json={
                'email': 'tenant@example.com',
                'password': 'correct-horse-battery-staple',
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload['success'])
        self.assertEqual(payload['user']['email'], 'tenant@example.com')
        self.assertIn('auth_token=', response.headers.get('set-cookie', ''))


if __name__ == '__main__':
    unittest.main()