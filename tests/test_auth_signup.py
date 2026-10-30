"""
Tests for user authentication, citizen signup, protected developer onboarding,
bcrypt password hashing, and dual email/mobile login.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestAuthWorkflow(unittest.TestCase):

    def test_legacy_officer_login_preserved(self):
        """Ensures existing demo credentials still work seamlessly."""
        res = client.post(
            "/api/v1/auth/login",
            json={
                "email": "officer@jandrishti.gov.in",
                "password": "HackathonPassword2026!"
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], "officer@jandrishti.gov.in")
        self.assertEqual(data["user"]["role"], "municipal_officer")

    def test_citizen_signup_and_mobile_login(self):
        """Tests citizen signup, bcrypt password verification, and mobile login."""
        phone_num = "+91 99999 88888"
        password = "SecureCitizenPass123!"

        # 1. Signup citizen
        signup_res = client.post(
            "/api/v1/auth/signup/citizen",
            json={
                "full_name": "Aarav Sharma",
                "phone": phone_num,
                "email": "aarav@test.in",
                "password": password
            }
        )
        self.assertEqual(signup_res.status_code, 201)
        signup_data = signup_res.json()
        self.assertIn("access_token", signup_data)
        self.assertEqual(signup_data["user"]["full_name"], "Aarav Sharma")
        self.assertEqual(signup_data["user"]["role"], "citizen")

        # 2. Login using mobile phone number
        login_res = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": phone_num,
                "password": password
            }
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertIn("access_token", login_res.json())

        # 3. Login with wrong password fails
        bad_login = client.post(
            "/api/v1/auth/login",
            json={
                "identifier": phone_num,
                "password": "WrongPassword!"
            }
        )
        self.assertEqual(bad_login.status_code, 401)

    def test_protected_developer_signup(self):
        """Verifies developer registration requires a valid authorization invite code."""
        # Forbidden with invalid code
        bad_reg = client.post(
            "/api/v1/auth/signup/developer",
            json={
                "full_name": "Dev Admin",
                "email": "dev.admin@jandrishti.in",
                "password": "SuperSecretDevPass!",
                "invite_code": "INVALID_CODE"
            }
        )
        self.assertEqual(bad_reg.status_code, 403)

        # Successful with valid authorization invite code
        good_reg = client.post(
            "/api/v1/auth/signup/developer",
            json={
                "full_name": "Lead Engineer",
                "email": "lead.engineer@jandrishti.in",
                "password": "SuperSecretDevPass!",
                "invite_code": "DEV-JANDRISHTI-2026-KEY"
            }
        )
        self.assertEqual(good_reg.status_code, 201)
        self.assertEqual(good_reg.json()["user"]["role"], "developer")


if __name__ == "__main__":
    unittest.main()
