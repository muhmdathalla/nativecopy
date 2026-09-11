"""
Test Suite for NativeCopy
Verifies database integrity, authentication flows, snippet operations, and HTTP APIs.
"""

import unittest
import os
import tempfile
import sqlite3
import database
import json
import urllib.request
import urllib.error
import threading
import time
from server import ThreadingHTTPServer, NativeCopyHandler

class TestDatabase(unittest.TestCase):
    def setUp(self):
        # Initialize DB
        database.init_db()

    def test_auth_and_user_flow(self):
        test_username = f"testuser_{int(time.time() * 1000)}"
        test_password = "password123"

        # 1. Register user
        success, msg, user = database.register_user(test_username, test_password)
        self.assertTrue(success, f"Register failed: {msg}")
        self.assertIsNotNone(user)
        self.assertEqual(user["username"], test_username)

        # 2. Duplicate registration should fail
        dup_success, dup_msg, _ = database.register_user(test_username, "otherpass")
        self.assertFalse(dup_success)

        # 3. Login with wrong password should fail
        bad_login, bad_msg, _, _ = database.login_user(test_username, "wrongpass")
        self.assertFalse(bad_login)

        # 4. Login with correct password
        login_success, login_msg, token, user_data = database.login_user(test_username, test_password)
        self.assertTrue(login_success)
        self.assertIsNotNone(token)
        self.assertEqual(user_data["username"], test_username)

        # 5. Validate session token
        session_user = database.get_user_by_session(token)
        self.assertIsNotNone(session_user)
        self.assertEqual(session_user["id"], user_data["id"])

        # 6. Logout
        logout_ok = database.logout_session(token)
        self.assertTrue(logout_ok)
        self.assertIsNone(database.get_user_by_session(token))

    def test_snippets_crud(self):
        # Register test user
        username = f"snipuser_{int(time.time() * 1000)}"
        _, _, user = database.register_user(username, "pass1234")
        uid = user["id"]

        # Create snippet
        snip = database.create_snippet(uid, "Query Test", "SELECT * FROM users;", "sql", is_pinned=False)
        self.assertIsNotNone(snip)
        self.assertEqual(snip["title"], "Query Test")
        self.assertEqual(snip["language"], "sql")
        snip_id = snip["id"]

        # Read snippet list
        snippets = database.get_user_snippets(uid)
        self.assertEqual(len(snippets), 1)
        self.assertEqual(snippets[0]["id"], snip_id)

        # Toggle pin
        pinned_snip = database.toggle_pin_snippet(snip_id, uid)
        self.assertTrue(pinned_snip["isPinned"])

        # Update snippet
        updated_snip = database.update_snippet(snip_id, uid, "Updated Title", "SELECT id FROM users;", "sql")
        self.assertEqual(updated_snip["title"], "Updated Title")
        self.assertEqual(updated_snip["content"], "SELECT id FROM users;")

        # Delete snippet
        deleted = database.delete_snippet(snip_id, uid)
        self.assertTrue(deleted)
        self.assertEqual(len(database.get_user_snippets(uid)), 0)

class TestServerAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.port = 8899
        cls.server = ThreadingHTTPServer(("127.0.0.1", cls.port), NativeCopyHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.3)

    @classmethod
    def tearDownClass(cls):
        cls.server.server_close()

    def test_network_info_and_static_files(self):
        # Test /api/network-info
        url = f"http://127.0.0.1:{self.port}/api/network-info"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode())
            self.assertIn("ips", data)
            self.assertIn("urls", data)

        # Test static index.html
        url_index = f"http://127.0.0.1:{self.port}/index.html"
        with urllib.request.urlopen(url_index) as resp:
            self.assertEqual(resp.status, 200)
            content = resp.read().decode()
            self.assertIn("NativeCopy", content)

    def test_http_auth_and_snippet_flow(self):
        username = f"httpuser_{int(time.time() * 1000)}"
        password = "secretpassword"

        # 1. Register API
        reg_data = json.dumps({"username": username, "password": password}).encode()
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/auth/register",
            data=reg_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 201)
            res_json = json.loads(resp.read().decode())
            token = res_json["token"]
            self.assertTrue(bool(token))

        # 2. Check /api/auth/me
        req_me = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(req_me) as resp:
            self.assertEqual(resp.status, 200)
            user_data = json.loads(resp.read().decode())["user"]
            self.assertEqual(user_data["username"], username)

        # 3. Create Snippet API
        snip_data = json.dumps({
            "title": "Python Test Code",
            "content": "def hello():\n    return 'world'",
            "language": "python",
            "isPinned": True
        }).encode()
        req_snip = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/snippets",
            data=snip_data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_snip) as resp:
            self.assertEqual(resp.status, 201)
            snip_resp = json.loads(resp.read().decode())["snippet"]
            self.assertEqual(snip_resp["title"], "Python Test Code")
            snip_id = snip_resp["id"]

        # 4. Get Snippets API
        req_get = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/snippets",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(req_get) as resp:
            self.assertEqual(resp.status, 200)
            snippets = json.loads(resp.read().decode())["snippets"]
            self.assertEqual(len(snippets), 1)
            self.assertEqual(snippets[0]["id"], snip_id)

if __name__ == "__main__":
    unittest.main()
