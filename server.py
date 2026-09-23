"""
NativeCopy HTTP Server & Real-Time Sync
Supports Web Dashboard, Mobile Sync, and VS Code Active Editor Live Insertion.
"""

import sys
import ssl
import http.server
import socketserver
import json
import urllib.parse
import os
import mimetypes
import socket
import subprocess
import re
import threading
import queue
import time
import base64
from typing import Dict, List, Set, Optional

import database
import pointer_controller

PORT = 8080
HOST = "0.0.0.0"
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

connected_clients: Dict[int, Set[queue.Queue]] = {}
recent_user_events: Dict[int, List[dict]] = {}
event_counter = 0
clients_lock = threading.Lock()

def register_sse_client(user_id: int) -> queue.Queue:
    q = queue.Queue(maxsize=50)
    with clients_lock:
        if user_id not in connected_clients:
            connected_clients[user_id] = set()
        connected_clients[user_id].add(q)
    return q

def unregister_sse_client(user_id: int, q: queue.Queue):
    with clients_lock:
        if user_id in connected_clients:
            connected_clients[user_id].discard(q)
            if not connected_clients[user_id]:
                del connected_clients[user_id]

def broadcast_user_event(user_id: int, event_type: str, payload: dict):
    global event_counter
    with clients_lock:
        event_counter += 1
        event_obj = {
            "id": event_counter,
            "type": event_type,
            "payload": payload,
            "timestamp": int(time.time() * 1000)
        }
        if user_id not in recent_user_events:
            recent_user_events[user_id] = []
        recent_user_events[user_id].append(event_obj)
        if len(recent_user_events[user_id]) > 50:
            recent_user_events[user_id] = recent_user_events[user_id][-50:]
        
        message = json.dumps(event_obj)
        queues = list(connected_clients.get(user_id, []))
        
    for q in queues:
        try:
            q.put_nowait(message)
        except queue.Full:
            pass

def get_local_ips() -> List[str]:
    ips = set()
    try:
        output = subprocess.check_output(['ifconfig'], stderr=subprocess.DEVNULL).decode('utf-8')
        found = re.findall(r'inet (192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)', output)
        for ip in found:
            ips.add(ip)
    except Exception:
        pass

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        if not ip.startswith("127."):
            ips.add(ip)
        s.close()
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
        pass

    def send_json(self, status_code: int, data: dict, headers: Optional[dict] = None):
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
        auth_header = self.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        
        cookie_header = self.headers.get("Cookie")
        if cookie_header:
            cookies = [c.strip() for c in cookie_header.split(";")]
            for c in cookies:
                if c.startswith("session_token="):
                    return c[len("session_token="):].strip()
        
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if "token" in qs and qs["token"]:
            return qs["token"][0]

        return None

    def get_authenticated_user(self) -> Optional[dict]:
        token = self.get_auth_token()
        if not token:
            return None
        return database.verify_stateless_token(token)

    def parse_json_body(self) -> Optional[dict]:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        try:
            body = self.rfile.read(content_length).decode("utf-8")
            return json.loads(body)
        except Exception:
            return None

    def do_OPTIONS(self):
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

        if path == "/api/network-info":
            local_ips = get_local_ips()
            urls = [f"http://{ip}:{PORT}" for ip in local_ips]
            return self.send_json(200, {
                "port": PORT,
                "ips": local_ips,
                "urls": urls,
                "primaryUrl": urls[0] if urls else f"http://localhost:{PORT}"
            })

        if path == "/api/auth/me":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized", "user": None})
            return self.send_json(200, {"user": user})

        if path == "/api/snippets":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            search = qs.get("search", [None])[0]
            language = qs.get("language", [None])[0]
            snippets = database.get_user_snippets(user["id"], search, language)
            return self.send_json(200, {"snippets": snippets})

        # List Teleported Files
        if path == "/api/files":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            files = database.get_user_files(user["id"])
            return self.send_json(200, {"files": files})

        # OS Native Pointer Status
        if path == "/api/pointer/status":
            return self.send_json(200, pointer_controller.get_status())

        # Download Teleported File
        if path.startswith("/api/files/") and path.endswith("/download"):
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            try:
                parts = path.strip("/").split("/")
                file_id = int(parts[2])
                f = database.get_file_by_id(file_id, user["id"], include_data=True)
                if not f:
                    return self.send_json(404, {"error": "File tidak ditemukan."})
                
                raw_data = base64.b64decode(f["fileData"])
                self.send_response(200)
                self.send_header("Content-Type", f["mimeType"] or "application/octet-stream")
                self.send_header("Content-Length", str(len(raw_data)))
                self.send_header("Content-Disposition", f'attachment; filename="{f["filename"]}"')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(raw_data)
                return
            except Exception as e:
                return self.send_json(500, {"error": f"Gagal mengunduh file: {str(e)}"})

        # Recent events replay for polling & reconnect recovery
        if path == "/api/events/recent":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            try:
                since_id = int(qs.get("since_id", [0])[0])
            except Exception:
                since_id = 0
            with clients_lock:
                events = [e for e in recent_user_events.get(user["id"], []) if e["id"] > since_id]
            return self.send_json(200, {"events": events, "serverTime": int(time.time() * 1000)})

        # Real-time SSE Stream (Used by Web, Mobile, and VS Code Extension)
        if path == "/api/events":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            
            try:
                since_id = int(qs.get("since_id", [0])[0])
            except Exception:
                since_id = 0

            client_queue = register_sse_client(user["id"])
            try:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache, no-transform")
                self.send_header("Connection", "keep-alive")
                self.send_header("X-Accel-Buffering", "no")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                self.wfile.write(b": connected\n\n")
                self.wfile.flush()

                # Replay any missed events since client's last seen id
                with clients_lock:
                    missed = [e for e in recent_user_events.get(user["id"], []) if e["id"] > since_id]
                for ev in missed:
                    self.wfile.write(f"data: {json.dumps(ev)}\n\n".encode("utf-8"))
                self.wfile.flush()

                while True:
                    try:
                        msg = client_queue.get(timeout=3.0)
                        data = f"data: {msg}\n\n".encode("utf-8")
                        self.wfile.write(data)
                        self.wfile.flush()
                    except queue.Empty:
                        # 3-second heartbeat keeps NAT/Proxy/Vercel/OS sockets alive
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                unregister_sse_client(user["id"], client_queue)
            return

        self.serve_static_file(path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. VS Code Direct Live Insertion Endpoint
        if path == "/api/vscode/insert":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            
            data = self.parse_json_body() or {}
            content = data.get("content", "")
            if not str(content):
                return self.send_json(400, {"error": "Konten tidak boleh kosong."})
            
            mode = data.get("mode", "insert") # insert, replace, append
            
            # Broadcast direct live insert event to connected VS Code instances
            payload = {
                "content": str(content),
                "mode": mode,
                "timestamp": int(time.time()),
                "sender": data.get("sender", "Mobile/Web")
            }
            broadcast_user_event(user["id"], "vscode_remote_insert", payload)

            # Also optionally save as snippet if requested
            if data.get("saveSnippet", False):
                title = data.get("title", "Remote VS Code Stream")
                lang = data.get("language", "plaintext")
                snip = database.create_snippet(user["id"], title, str(content), lang, False)
                broadcast_user_event(user["id"], "snippet_created", snip)

            return self.send_json(200, {
                "success": True,
                "message": "⚡ Teks berhasil dikirim langsung ke kursor aktif VS Code!",
                "payload": payload
            })

        # 2. File Teleportation Endpoint (Phone -> VS Code Directory / VS Code -> Phone)
        if path == "/api/files/upload":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            
            data = self.parse_json_body() or {}
            filename = data.get("filename", "").strip()
            file_data = data.get("fileData", "") # Base64 string
            file_size = int(data.get("fileSize", len(file_data)))
            mime_type = data.get("mimeType", "application/octet-stream")
            target = data.get("target", "workspace") # "workspace" or "general"
            sender = data.get("sender", "Mobile Device")

            if not filename or not file_data:
                return self.send_json(400, {"error": "Nama berkas dan data konten wajib diisi."})

            saved_file = database.create_teleport_file(
                user_id=user["id"],
                filename=filename,
                file_size=file_size,
                mime_type=mime_type,
                file_data=file_data,
                target=target,
                sender=sender
            )

            # Broadcast file_teleport event to all user's connected VS Code & Web instances
            event_payload = {
                "fileId": saved_file["id"],
                "filename": filename,
                "fileSize": file_size,
                "mimeType": mime_type,
                "fileData": file_data, # base64 payload for direct disk injection
                "target": target,
                "sender": sender,
                "timestamp": int(time.time() * 1000)
            }
            broadcast_user_event(user["id"], "file_teleport", event_payload)

            return self.send_json(201, {
                "success": True,
                "message": f"📁 Berkas '{filename}' berhasil diteleportasikan!",
                "file": saved_file
            })

        # 3. Reverse Selection Teleport Endpoint (VS Code -> Mobile Screen)
        if path == "/api/teleport/selection":
            user = self.get_authenticated_user()
            if not user:
                return self.send_json(401, {"error": "Unauthorized"})
            
            data = self.parse_json_body() or {}
            text = data.get("text", "")
            language = data.get("language", "plaintext")
            file_name = data.get("fileName", "VS Code Editor")
            sender = data.get("sender", "VS Code")

            if not str(text):
                return self.send_json(400, {"error": "Teks seleksi tidak boleh kosong."})

            payload = {
                "text": str(text),
                "language": language,
                "fileName": file_name,
                "sender": sender,
                "timestamp": int(time.time() * 1000)
            }
            broadcast_user_event(user["id"], "reverse_teleport", payload)

            # Also create snippet in user's cloud clipboard
            if data.get("saveSnippet", True):
                snip = database.create_snippet(user["id"], f"Teleport dari {file_name}", str(text), language, False)
                broadcast_user_event(user["id"], "snippet_created", snip)

            return self.send_json(200, {
                "success": True,
                "message": "⚡ Seleksi kode berhasil diteleportasikan ke layar HP!",
                "payload": payload
            })

        # 4. OS Native Pointer Control Endpoints
        if path == "/api/pointer/move":
            data = self.parse_json_body() or {}
            dx = float(data.get("dx", 0))
            dy = float(data.get("dy", 0))
            sens = float(data.get("sensitivity", 1.0))
            if "abs_x" in data and "abs_y" in data:
                pointer_controller.move_pointer_absolute(float(data["abs_x"]), float(data["abs_y"]))
                new_x, new_y = float(data["abs_x"]), float(data["abs_y"])
            else:
                new_x, new_y = pointer_controller.move_pointer_relative(dx, dy, sens)
            return self.send_json(200, {"success": True, "x": new_x, "y": new_y})

        if path == "/api/pointer/click":
            data = self.parse_json_body() or {}
            button = data.get("button", "left")
            pointer_controller.click_pointer(button)
            return self.send_json(200, {"success": True, "button": button})

        if path == "/api/pointer/scroll":
            data = self.parse_json_body() or {}
            dx = int(data.get("dx", 0))
            dy = int(data.get("dy", 0))
            sens = float(data.get("sensitivity", 1.0))
            pointer_controller.scroll_pointer(dx, dy, sens)
            return self.send_json(200, {"success": True, "dx": dx, "dy": dy})

        if path == "/api/pointer/gesture":
            data = self.parse_json_body() or {}
            action = data.get("action", "")
            success = pointer_controller.trigger_system_gesture(action)
            return self.send_json(200, {"success": success, "action": action})

        # 2. Feedback
        if path == "/api/feedback":
            data = self.parse_json_body() or {}
            message = data.get("message", "").strip()
            if not message:
                return self.send_json(400, {"error": "Pesan feedback tidak boleh kosong."})
            
            user = self.get_authenticated_user()
            user_id = user["id"] if user else None
            name = data.get("name", user["username"] if user else "Anonymous")
            category = data.get("category", "General")
            rating = int(data.get("rating", 5))

            res = database.create_feedback(user_id, name, category, rating, message)
            return self.send_json(201, {"message": "Terima kasih atas saran & kritik kamu!", "feedback": res})

        # 3. Register
        if path == "/api/auth/register":
            data = self.parse_json_body()
            if not data or "username" not in data or "password" not in data:
                return self.send_json(400, {"error": "Username dan password wajib diisi."})
            
            success, msg, user_data, token = database.register_user(data["username"], data["password"])
            if not success:
                return self.send_json(400, {"error": msg})
            
            return self.send_json(201, {
                "message": msg,
                "token": token,
                "user": user_data
            }, headers={"Set-Cookie": f"session_token={token}; Path=/; Max-Age=31536000; SameSite=Lax"})

        # 4. Login
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
            }, headers={"Set-Cookie": f"session_token={token}; Path=/; Max-Age=31536000; SameSite=Lax"})

        # 5. Logout
        if path == "/api/auth/logout":
            return self.send_json(200, {
                "message": "Logged out successfully"
            }, headers={"Set-Cookie": "session_token=; Path=/; Max-Age=0"})

        user = self.get_authenticated_user()
        if not user:
            return self.send_json(401, {"error": "Unauthorized"})

        # 6. Create Snippet
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
            broadcast_user_event(user["id"], "snippet_created", snippet)
            return self.send_json(201, {"snippet": snippet})

        # 7. Toggle Pin
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

        if path.startswith("/api/files/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[1] == "files":
                try:
                    file_id = int(parts[2])
                    deleted = database.delete_teleport_file(file_id, user["id"])
                    if not deleted:
                        return self.send_json(404, {"error": "File tidak ditemukan."})
                    
                    broadcast_user_event(user["id"], "file_deleted", {"id": file_id})
                    return self.send_json(200, {"success": True, "message": "File berhasil dihapus.", "id": file_id})
                except ValueError:
                    return self.send_json(400, {"error": "ID File tidak valid."})

        return self.send_json(404, {"error": "Endpoint not found"})

    def serve_static_file(self, req_path: str):
        if req_path == "/" or not req_path:
            req_path = "/index.html"
        
        clean_path = os.path.normpath(req_path.lstrip("/"))
        file_path = os.path.join(PUBLIC_DIR, clean_path)

        if not os.path.abspath(file_path).startswith(os.path.abspath(PUBLIC_DIR)):
            self.send_error(403, "Forbidden")
            return

        if not os.path.isfile(file_path):
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

def generate_self_signed_cert(cert_file="cert.pem", key_file="key.pem") -> bool:
    if os.path.exists(cert_file) and os.path.exists(key_file):
        return True
    try:
        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", key_file, "-out", cert_file,
            "-days", "365", "-nodes",
            "-subj", "/CN=NativeCopy"
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print(f"[NativeCopy] SSL certificate generation failed: {e}")
        return False

def run_server(host=HOST, port=PORT):
    database.init_db()
    
    use_ssl = "--ssl" in sys.argv or "--https" in sys.argv
    cert_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cert.pem")
    key_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "key.pem")

    server = ThreadingHTTPServer((host, port), NativeCopyHandler)
    proto = "http"

    if use_ssl:
        if generate_self_signed_cert(cert_file, key_file):
            try:
                ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                ssl_ctx.load_cert_chain(certfile=cert_file, keyfile=key_file)
                server.socket = ssl_ctx.wrap_socket(server.socket, server_side=True)
                proto = "https"
            except Exception as e:
                print(f"[NativeCopy] Failed to enable SSL: {e}. Falling back to HTTP.")
                proto = "http"
        else:
            print("[NativeCopy] OpenSSL not found or failed. Running HTTP mode.")

    ips = get_local_ips()
    
    print("\n" + "="*55)
    print(f" NativeCopy Server Running ({proto.upper()})")
    print("="*55)
    print(f" • Local : {proto}://localhost:{port}")
    for ip in ips:
        print(f" • LAN   : {proto}://{ip}:{port}")
    if proto == "https":
        print(" [!] Saat buka di HP, klik 'Show Details' -> 'Visit This Website' untuk izinkan kamera")
    else:
        print(" [Tip] Gunakan 'python3 server.py --https' jika browser HP butuh izin kamera SSL")
    print("="*55 + "\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

if __name__ == "__main__":
    run_server()
