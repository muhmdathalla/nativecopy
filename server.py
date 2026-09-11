"""
NativeCopy HTTP & Real-Time Sync Server
Multi-threaded server with SSE (Server-Sent Events), SQLite3 database, and Developer-Centric Web UI.
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import mimetypes
import socket
import threading
import queue
import time
from typing import Dict, List, Set, Optional

import database

PORT = 8080
HOST = "0.0.0.0"
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

# User ID -> Set of queue.Queue for active SSE connections
connected_clients: Dict[int, Set[queue.Queue]] = {}
clients_lock = threading.Lock()

def register_sse_client(user_id: int) -> queue.Queue:
    """Registers a new SSE client queue for a user."""
    q = queue.Queue(maxsize=50)
    with clients_lock:
        if user_id not in connected_clients:
            connected_clients[user_id] = set()
        connected_clients[user_id].add(q)
    return q

def unregister_sse_client(user_id: int, q: queue.Queue):
    """Removes an SSE client queue."""
    with clients_lock:
        if user_id in connected_clients:
            connected_clients[user_id].discard(q)
            if not connected_clients[user_id]:
                del connected_clients[user_id]

def broadcast_user_event(user_id: int, event_type: str, payload: dict):
    """Broadcasts a real-time event to all active devices of a user."""
    message = json.dumps({"type": event_type, "payload": payload, "timestamp": int(time.time())})
    with clients_lock:
        queues = list(connected_clients.get(user_id, []))
    for q in queues:
        try:
            q.put_nowait(message)
        except queue.Full:
            pass

def get_local_ips() -> List[str]:
    """Finds all non-loopback IPv4 addresses of the host machine."""
    ips = set()
    try:
        # Connect to a public DNS IP to determine default route interface IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass

    if not ips:
        ips.add("127.0.0.1")
    return sorted(list(ips))

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class NativeCopyHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        # Clean logging format
        print(f"[{time.strftime('%H:%M:%S')}] {self.address_string()} - {format % args}")

    def send_json(self, status_code: int, data: dict, headers: Optional[dict] = None):
        """Sends a JSON response with proper CORS and content headers."""
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def get_auth_token(self) -> Optional[str]:
        """Extracts auth token from Authorization header or Cookie."""
        auth_header = self.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        
        cookie_header = self.headers.get("Cookie")
        if cookie_header:
            cookies = [c.strip() for c in cookie_header.split(";")]
            for c in cookies:
                if c.startswith("session_token="):
                    return c[len("session_token="):].strip()
        
        # Also support query parameter token for EventSource
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if "token" in qs and qs["token"]:
            return qs["token"][0]

        return None

    def get_authenticated_user(self) -> Optional[dict]:
        """Validates current request user."""
        token = self.get_auth_token()
        if not token:
            return None
        return database.get_user_by_session(token)

    def parse_json_body(self) -> Optional[dict]:
        """Parses request body as JSON."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        try:
            body = self.rfile.read(content_length).decode("utf-8")
            return json.loads(body)
        except Exception:
            return None

    def do_OPTIONS(self):
        """Handles CORS preflight requests."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        # 1. API: Network Info
        if path == "/api/network-info":
            local_ips = get_local_ips()
            urls = [f"http://{ip}:{PORT}" for ip in local_ips]
            return self.send_json(200, {
                "port": PORT,
                "ips": local_ips,
                "urls": urls,
                "primaryUrl": urls[0] if urls else f"http://localhost:{PORT}"
            })

        # 2. API: Current user info
        if path == "/api/auth/me":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized", "user": None})
            return self.send_json(200, {"user": user})

        # 3. API: Get snippets
        if path == "/api/snippets":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            search = qs.get("search", [None])[0]
            language = qs.get("language", [None])[0]
            snippets = database.get_user_snippets(user["id"], search, language)
            return self.send_json(200, {"snippets": snippets})

        # 4. API: Real-Time SSE Stream (/api/events)
        if path == "/api/events":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            
            client_queue = register_sse_client(user["id"])
            try:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "keep-alive")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                # Send initial ping
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()

                while True:
                    try:
                        # Wait for message with heartbeat timeout (15s)
                        msg = client_queue.get(timeout=15.0)
                        data = f"data: {msg}\n\n".encode("utf-8")
                        self.wfile.write(data)
                        self.wfile.flush()
                    except queue.Empty:
                        # Keep-alive heartbeat
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
            except (ConnectionResetError, BrokenPipeError, Exception):
                pass
            finally:
                unregister_sse_client(user["id"], client_queue)
            return

        # 5. Static Files Serving
        self.serve_static_file(path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. API: Register
        if path == "/api/auth/register":
            data = self.parse_json_body()
            if not data or "username" not in data or "password" not in data:
                return self.send_json(400, {"error": "Username dan password wajib diisi."})
            
            success, msg, user = database.register_user(data["username"], data["password"])
            if not success:
                return self.send_json(400, {"error": msg})
            
            # Automatically login after register
            _, _, token, user_data = database.login_user(data["username"], data["password"])
            return self.send_json(201, {
                "message": msg,
                "token": token,
                "user": user_data
            }, headers={"Set-Cookie": f"session_token={token}; Path=/; Max-Age=2592000; SameSite=Lax"})

        # 2. API: Login
        if path == "/api/auth/login":
            data = self.parse_json_body()
            if not data or "username" not in data or "password" not in data:
                return self.send_json(400, {"error": "Username dan password wajib diisi."})
            
            success, msg, token, user = database.login_user(data["username"], data["password"])
            if not success:
                return self.send_json(401, {"error": msg})
            
            return self.send_json(200, {
                "message": msg,
                "token": token,
                "user": user
            }, headers={"Set-Cookie": f"session_token={token}; Path=/; Max-Age=2592000; SameSite=Lax"})

        # 3. API: Logout
        if path == "/api/auth/logout":
            token = self.get_auth_token()
            if token:
                database.logout_session(token)
            return self.send_json(200, {
                "message": "Logged out successfully"
            }, headers={"Set-Cookie": "session_token=; Path=/; Max-Age=0"})

        # Authenticated endpoints
        user = self.get_authenticated_user()
        if not user:
            return self.send_json(401, {"error": "Unauthorized"})

        # 4. API: Create Snippet
        if path == "/api/snippets":
            data = self.parse_json_body()
            if not data or "content" not in data or not str(data["content"]).strip():
                return self.send_json(400, {"error": "Konten snippet tidak boleh kosong."})
            
            title = data.get("title", "")
            content = str(data["content"])
            language = data.get("language", "plaintext")
            is_pinned = bool(data.get("isPinned", False))

            snippet = database.create_snippet(
                user_id=user["id"],
                title=title,
                content=content,
                language=language,
                is_pinned=is_pinned
            )
            # Broadcast to other devices
            broadcast_user_event(user["id"], "snippet_created", snippet)
            return self.send_json(201, {"snippet": snippet})

        # 5. API: Toggle Pin (/api/snippets/<id>/pin)
        if path.startswith("/api/snippets/") and path.endswith("/pin"):
            parts = path.strip("/").split("/")
            if len(parts) == 4 and parts[1] == "snippets" and parts[3] == "pin":
                try:
                    snippet_id = int(parts[2])
                    updated = database.toggle_pin_snippet(snippet_id, user["id"])
                    if not updated:
                        return self.send_json(404, {"error": "Snippet tidak ditemukan."})
                    broadcast_user_event(user["id"], "snippet_updated", updated)
                    return self.send_json(200, {"snippet": updated})
                except ValueError:
                    return self.send_json(400, {"error": "ID Snippet tidak valid."})

        return self.send_json(404, {"error": "Endpoint not found"})

    def do_PUT(self):
        user = self.get_authenticated_user()
        if not user:
            return self.send_json(401, {"error": "Unauthorized"})

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Update Snippet (/api/snippets/<id>)
        if path.startswith("/api/snippets/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[1] == "snippets":
                try:
                    snippet_id = int(parts[2])
                    data = self.parse_json_body()
                    if not data or "content" not in data or not str(data["content"]).strip():
                        return self.send_json(400, {"error": "Konten snippet tidak boleh kosong."})
                    
                    title = data.get("title", "")
                    content = str(data["content"])
                    language = data.get("language", "plaintext")

                    updated = database.update_snippet(snippet_id, user["id"], title, content, language)
                    if not updated:
                        return self.send_json(404, {"error": "Snippet tidak ditemukan."})
                    
                    broadcast_user_event(user["id"], "snippet_updated", updated)
                    return self.send_json(200, {"snippet": updated})
                except ValueError:
                    return self.send_json(400, {"error": "ID Snippet tidak valid."})

        return self.send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        user = self.get_authenticated_user()
        if not user:
            return self.send_json(401, {"error": "Unauthorized"})

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Delete Snippet (/api/snippets/<id>)
        if path.startswith("/api/snippets/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[1] == "snippets":
                try:
                    snippet_id = int(parts[2])
                    deleted = database.delete_snippet(snippet_id, user["id"])
                    if not deleted:
                        return self.send_json(404, {"error": "Snippet tidak ditemukan."})
                    
                    broadcast_user_event(user["id"], "snippet_deleted", {"id": snippet_id})
                    return self.send_json(200, {"message": "Snippet berhasil dihapus.", "id": snippet_id})
                except ValueError:
                    return self.send_json(400, {"error": "ID Snippet tidak valid."})

        return self.send_json(404, {"error": "Endpoint not found"})

    def serve_static_file(self, req_path: str):
        """Serves static files safely from the public directory."""
        if req_path == "/" or not req_path:
            req_path = "/index.html"
        
        # Prevent directory traversal
        clean_path = os.path.normpath(req_path.lstrip("/"))
        file_path = os.path.join(PUBLIC_DIR, clean_path)

        # Ensure file stays within public directory
        if not os.path.abspath(file_path).startswith(os.path.abspath(PUBLIC_DIR)):
            self.send_error(403, "Forbidden")
            return

        if not os.path.isfile(file_path):
            # SPA fallback: if not an API route and file doesn't exist, serve index.html
            file_path = os.path.join(PUBLIC_DIR, "index.html")
            if not os.path.isfile(file_path):
                self.send_error(404, "File Not Found")
                return

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if "text" in mime_type or "javascript" in mime_type or "json" in mime_type else mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Internal Server Error: {e}")

def run_server(host=HOST, port=PORT):
    database.init_db()
    server = ThreadingHTTPServer((host, port), NativeCopyHandler)
    ips = get_local_ips()
    
    print("\n" + "="*60)
    print(" 🚀 NativeCopy Server is RUNNING!")
    print("="*60)
    print(f" • Local Access     : http://localhost:{port}")
    for ip in ips:
        print(f" • LAN (Lab PC / HP): http://{ip}:{port}")
    print("="*60)
    print(" Tekan Ctrl + C untuk menghentikan server.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] Menghentikan server NativeCopy...")
        server.server_close()

if __name__ == "__main__":
    run_server()
