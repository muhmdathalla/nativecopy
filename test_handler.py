"""
Direct In-Memory Handler & Database Testing without Network Sockets
"""

import unittest
import io
import json
import time
import database
from server import NativeCopyHandler

class MockSocket:
    def __init__(self, request_bytes):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self.rfile
        elif 'w' in mode:
            return self.wfile
        raise ValueError(f"Unknown mode: {mode}")

    def sendall(self, data):
        self.wfile.write(data)

    def close(self):
        pass

class DummyServer:
    def __init__(self):
        pass

def simulate_http_request(method, path, body=None, headers=None):
    headers = headers or {}
    body_bytes = b""
    if body:
        if isinstance(body, dict):
            body_bytes = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(body, (str, bytes)):
            body_bytes = body.encode("utf-8") if isinstance(body, str) else body
        headers["Content-Length"] = str(len(body_bytes))

    header_lines = [f"{method} {path} HTTP/1.1", "Host: localhost"]
    for k, v in headers.items():
        header_lines.append(f"{k}: {v}")
    header_str = "\r\n".join(header_lines) + "\r\n\r\n"
    raw_req = header_str.encode("utf-8") + body_bytes

    sock = MockSocket(raw_req)
    handler = NativeCopyHandler(sock, ("127.0.0.1", 12345), DummyServer())
    
    response_bytes = sock.wfile.getvalue()
    parts = response_bytes.split(b"\r\n\r\n", 1)
    header_part = parts[0].decode("utf-8", errors="ignore")
    body_part = parts[1] if len(parts) > 1 else b""
    
    status_line = header_part.splitlines()[0]
    status_code = int(status_line.split(" ")[1])
    
    json_data = None
    try:
        json_data = json.loads(body_part.decode("utf-8"))
    except Exception:
        pass

    return {
        "status": status_code,
        "raw_headers": header_part,
        "body": body_part,
        "json": json_data
    }

class TestNativeCopyDirect(unittest.TestCase):
    def setUp(self):
        database.init_db()

    def test_complete_flow(self):
        username = f"user_{int(time.time() * 1000)}"
        password = "testpassword123"

        # 1. Register API
        res = simulate_http_request("POST", "/api/auth/register", {"username": username, "password": password})
        self.assertEqual(res["status"], 201)
        self.assertIn("token", res["json"])
        token = res["json"]["token"]

        # 2. Get Me API
        res_me = simulate_http_request("GET", "/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_me["status"], 200)
        self.assertEqual(res_me["json"]["user"]["username"], username)

        # 3. Create Snippet API
        snip_payload = {
            "title": "Bash Script Copy",
            "content": "#!/bin/bash\necho 'NativeCopy on LAN'",
            "language": "bash",
            "isPinned": True
        }
        res_create = simulate_http_request("POST", "/api/snippets", snip_payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_create["status"], 201)
        snippet_id = res_create["json"]["snippet"]["id"]
        self.assertTrue(res_create["json"]["snippet"]["isPinned"])

        # 4. Get Snippets API
        res_list = simulate_http_request("GET", "/api/snippets", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_list["status"], 200)
        self.assertEqual(len(res_list["json"]["snippets"]), 1)
        self.assertEqual(res_list["json"]["snippets"][0]["title"], "Bash Script Copy")

        # 5. Update Snippet API
        update_payload = {
            "title": "Bash Script Updated",
            "content": "#!/bin/bash\necho 'Updated NativeCopy'",
            "language": "bash"
        }
        res_update = simulate_http_request("PUT", f"/api/snippets/{snippet_id}", update_payload, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_update["status"], 200)
        self.assertEqual(res_update["json"]["snippet"]["title"], "Bash Script Updated")

        # 6. Toggle Pin API
        res_pin = simulate_http_request("POST", f"/api/snippets/{snippet_id}/pin", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_pin["status"], 200)
        self.assertFalse(res_pin["json"]["snippet"]["isPinned"])

        # 7. Delete Snippet API
        res_del = simulate_http_request("DELETE", f"/api/snippets/{snippet_id}", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_del["status"], 200)

        # 8. Check empty snippets list
        res_empty = simulate_http_request("GET", "/api/snippets", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_empty["status"], 200)
        self.assertEqual(len(res_empty["json"]["snippets"]), 0)

        # 9. Static File test (index.html)
        res_static = simulate_http_request("GET", "/")
        self.assertEqual(res_static["status"], 200)
        self.assertIn("NativeCopy", res_static["body"].decode("utf-8"))

if __name__ == "__main__":
    unittest.main()
