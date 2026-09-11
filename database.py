"""
NativeCopy Database & Auth Layer
Robust, stateless HMAC-SHA256 token verification for 100% session stability across serverless (Vercel) and local servers.
"""

import sqlite3
import hashlib
import hmac
import base64
import json
import os
import time
from typing import Optional, Dict, List, Any, Tuple

# Secret key for signing stateless authentication tokens
SECRET_KEY = os.environ.get("NATIVECOPY_SECRET", "nativecopy-super-stable-secret-key-2026").encode("utf-8")

if os.environ.get("VERCEL") or not os.access(os.path.dirname(os.path.abspath(__file__)), os.W_OK):
    DB_DIR = "/tmp"
else:
    DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

DB_PATH = os.path.join(DB_DIR, "nativecopy.db")

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'plaintext',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON snippets(user_id);
    CREATE INDEX IF NOT EXISTS idx_snippets_pinned ON snippets(is_pinned DESC, updated_at DESC);
    """)
    conn.commit()
    conn.close()

try:
    init_db()
except Exception:
    pass

# ----------------- Password & Token Utilities -----------------

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if salt is None:
        salt = os.urandom(16).hex()
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return pw_hash, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    pw_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(pw_hash, stored_hash)

def generate_stateless_token(user_id: int, username: str) -> str:
    """Generates a tamper-proof HMAC signed token containing user identity (never expires prematurely)."""
    payload = {
        "uid": user_id,
        "u": username,
        "ts": int(time.time())
    }
    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
    sig = hmac.new(SECRET_KEY, payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"

def verify_stateless_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies signature of stateless token and extracts user information without session expiry bugs."""
    if not token or "." not in token:
        return None
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        expected_sig = hmac.new(SECRET_KEY, payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        
        # Add padding back for base64 decode
        rem = len(payload_b64) % 4
        padded = payload_b64 + ('=' * (4 - rem) if rem else '')
        payload_json = base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8')
        data = json.loads(payload_json)
        
        user_id = data.get("uid")
        username = data.get("u")
        if not user_id or not username:
            return None
        
        # Ensure user exists in current DB instance (helpful on Vercel cold restarts)
        ensure_user_in_instance(user_id, username)
        
        return {"id": user_id, "username": username}
    except Exception:
        return None

def ensure_user_in_instance(user_id: int, username: str):
    """Ensures user record exists locally so snippets FK works across ephemeral cloud containers."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT OR IGNORE INTO users (id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, username, "cloud_session", "cloud_salt", int(time.time()))
            )
            conn.commit()
        conn.close()
    except Exception:
        pass

# ----------------- User Authentication -----------------

def register_user(username: str, password: str) -> Tuple[bool, str, Optional[Dict[str, Any]], Optional[str]]:
    username = username.strip()
    if len(username) < 3 or len(username) > 30:
        return False, "Username harus antara 3 - 30 karakter.", None, None
    if len(password) < 4:
        return False, "Password minimal 4 karakter.", None, None

    pw_hash, salt = hash_password(password)
    now = int(time.time())
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)",
            (username, pw_hash, salt, now)
        )
        user_id = cursor.lastrowid
        conn.commit()
        token = generate_stateless_token(user_id, username)
        return True, "Pendaftaran berhasil!", {"id": user_id, "username": username}, token
    except sqlite3.IntegrityError:
        return False, "Username sudah digunakan. Silakan login atau gunakan username lain.", None, None
    finally:
        conn.close()

def login_user(username: str, password: str) -> Tuple[bool, str, Optional[str], Optional[Dict[str, Any]]]:
    username = username.strip()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, password_hash, salt FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if not row:
            # If not in local ephemeral instance, auto-register on valid password to keep cloud seamless
            return False, "Username atau password salah. Pastikan username sudah terdaftar.", None, None
        
        # If cloud dummy user, update password
        if row["password_hash"] == "cloud_session":
            pw_hash, salt = hash_password(password)
            cursor.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (pw_hash, salt, row["id"]))
            conn.commit()
            token = generate_stateless_token(row["id"], row["username"])
            return True, "Login berhasil!", token, {"id": row["id"], "username": row["username"]}

        if not verify_password(password, row["password_hash"], row["salt"]):
            return False, "Username atau password salah.", None, None

        token = generate_stateless_token(row["id"], row["username"])
        return True, "Login berhasil!", token, {"id": row["id"], "username": row["username"]}
    finally:
        conn.close()

def get_user_by_session(token: str) -> Optional[Dict[str, Any]]:
    return verify_stateless_token(token)

# ----------------- Snippets CRUD -----------------

def get_user_snippets(user_id: int, search: Optional[str] = None, language: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT id, user_id, title, content, language, is_pinned, created_at, updated_at FROM snippets WHERE user_id = ?"
        params: List[Any] = [user_id]

        if search:
            query += " AND (title LIKE ? OR content LIKE ?)"
            s_param = f"%{search.strip()}%"
            params.extend([s_param, s_param])
        
        if language and language != 'all':
            query += " AND language = ?"
            params.append(language.lower())

        query += " ORDER BY is_pinned DESC, updated_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        return [
            {
                "id": r["id"],
                "userId": r["user_id"],
                "title": r["title"],
                "content": r["content"],
                "language": r["language"],
                "isPinned": bool(r["is_pinned"]),
                "createdAt": r["created_at"],
                "updatedAt": r["updated_at"]
            }
            for r in rows
        ]
    finally:
        conn.close()

def get_snippet_by_id(snippet_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, title, content, language, is_pinned, created_at, updated_at FROM snippets WHERE id = ? AND user_id = ?",
            (snippet_id, user_id)
        )
        r = cursor.fetchone()
        if not r:
            return None
        return {
            "id": r["id"],
            "userId": r["user_id"],
            "title": r["title"],
            "content": r["content"],
            "language": r["language"],
            "isPinned": bool(r["is_pinned"]),
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"]
        }
    finally:
        conn.close()

def create_snippet(user_id: int, title: str, content: str, language: str = 'plaintext', is_pinned: bool = False) -> Dict[str, Any]:
    now = int(time.time())
    title = title.strip() or "Untitled"
    language = (language or "plaintext").lower().strip()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO snippets (user_id, title, content, language, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, title, content, language, 1 if is_pinned else 0, now, now)
        )
        snippet_id = cursor.lastrowid
        conn.commit()
        return {
            "id": snippet_id,
            "userId": user_id,
            "title": title,
            "content": content,
            "language": language,
            "isPinned": is_pinned,
            "createdAt": now,
            "updatedAt": now
        }
    finally:
        conn.close()

def update_snippet(snippet_id: int, user_id: int, title: str, content: str, language: str = 'plaintext') -> Optional[Dict[str, Any]]:
    now = int(time.time())
    title = title.strip() or "Untitled"
    language = (language or "plaintext").lower().strip()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE snippets SET title = ?, content = ?, language = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (title, content, language, now, snippet_id, user_id)
        )
        if cursor.rowcount == 0:
            return None
        conn.commit()
        return get_snippet_by_id(snippet_id, user_id)
    finally:
        conn.close()

def toggle_pin_snippet(snippet_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT is_pinned FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, user_id))
        row = cursor.fetchone()
        if not row:
            return None
        new_status = 0 if row["is_pinned"] else 1
        now = int(time.time())
        cursor.execute(
            "UPDATE snippets SET is_pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (new_status, now, snippet_id, user_id)
        )
        conn.commit()
        return get_snippet_by_id(snippet_id, user_id)
    finally:
        conn.close()

def delete_snippet(snippet_id: int, user_id: int) -> bool:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, user_id))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()
