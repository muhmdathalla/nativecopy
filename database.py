"""
NativeCopy Database Layer
Handles SQLite database operations, password security with PBKDF2, sessions, and snippet management.
Works both locally and on cloud serverless (Vercel, Render, Railway).
"""

import sqlite3
import hashlib
import secrets
import os
import time
from typing import Optional, Dict, List, Any, Tuple

if os.environ.get("VERCEL") or not os.access(os.path.dirname(os.path.abspath(__file__)), os.W_OK):
    DB_DIR = "/tmp"
else:
    DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

DB_PATH = os.path.join(DB_DIR, "nativecopy.db")

def get_db_connection() -> sqlite3.Connection:
    """Creates a thread-safe connection to the SQLite database with row factory."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Initializes tables if they do not exist."""
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

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'plaintext',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON snippets(user_id);
    CREATE INDEX IF NOT EXISTS idx_snippets_pinned ON snippets(is_pinned DESC, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    """)
    conn.commit()
    conn.close()

# Auto-initialize DB on import
try:
    init_db()
except Exception:
    pass

# ----------------- Password & Auth Utilities -----------------

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    if salt is None:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return pw_hash, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verifies a password against the stored hash and salt."""
    pw_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(pw_hash, stored_hash)

# ----------------- User Management -----------------

def register_user(username: str, password: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Registers a new user. Returns (success, message, user_data)."""
    username = username.strip()
    if len(username) < 3 or len(username) > 30:
        return False, "Username harus antara 3 - 30 karakter.", None
    if len(password) < 4:
        return False, "Password minimal 4 karakter.", None

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
        return True, "Pendaftaran berhasil!", {"id": user_id, "username": username}
    except sqlite3.IntegrityError:
        return False, "Username sudah digunakan. Silakan pilih username lain.", None
    finally:
        conn.close()

def login_user(username: str, password: str, session_duration_days: int = 30) -> Tuple[bool, str, Optional[str], Optional[Dict[str, Any]]]:
    """Logs in user and creates a session token. Returns (success, message, token, user_data)."""
    username = username.strip()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, password_hash, salt FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if not row:
            return False, "Username atau password salah.", None, None
        
        if not verify_password(password, row["password_hash"], row["salt"]):
            return False, "Username atau password salah.", None, None

        user_id = row["id"]
        token = secrets.token_hex(32)
        now = int(time.time())
        expires_at = now + (session_duration_days * 86400)

        cursor.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, expires_at)
        )
        conn.commit()
        return True, "Login berhasil!", token, {"id": user_id, "username": row["username"]}
    finally:
        conn.close()

def get_user_by_session(token: str) -> Optional[Dict[str, Any]]:
    """Gets user associated with session token if valid and not expired."""
    if not token:
        return None
    now = int(time.time())
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id, u.username, s.expires_at 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.token = ? AND s.expires_at > ?
        """, (token, now))
        row = cursor.fetchone()
        if row:
            return {"id": row["id"], "username": row["username"]}
        return None
    finally:
        conn.close()

def logout_session(token: str) -> bool:
    """Removes a session token."""
    if not token:
        return True
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        return True
    finally:
        conn.close()

# ----------------- Snippets CRUD -----------------

def get_user_snippets(user_id: int, search: Optional[str] = None, language: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all snippets for a user, sorted by pinned first, then newest updated."""
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
    """Gets a specific snippet by id if owned by user."""
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
    """Creates a new snippet."""
    now = int(time.time())
    title = title.strip() or "Untitled Snippet"
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
    """Updates an existing snippet."""
    now = int(time.time())
    title = title.strip() or "Untitled Snippet"
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
    """Toggles pin status for a snippet."""
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
    """Deletes a snippet."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, user_id))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()
