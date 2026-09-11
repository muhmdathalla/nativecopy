# 📋 NativeCopy - Cross-Device Clipboard & Code Sync (LAN)

NativeCopy adalah aplikasi web clipboard & code snippet manager yang dirancang khusus untuk memindahkan potongan kode, teks perintah terminal, SQL query, atau catatan antar perangkat (misalnya antara Laptop dan PC Lab / Smartphone) di jaringan lokal (Wi-Fi/LAN yang sama) secara **instan (real-time)** dan **aman**.

---

## ✨ Fitur Utama

- ⚡ **Real-Time Live Sync (SSE)**: Setiap kali kamu copy-paste atau simpan snippet di laptop, browser di PC Lab langsung terupdate otomatis tanpa perlu refresh!
- 🔒 **Sistem Akun & Keamanan**:
  - Hash password menggunakan **PBKDF2-HMAC-SHA256** (100.000 iterasi + unique cryptographic salt).
  - Session token terenkripsi.
- 🎨 **Developer Aesthetic UI**:
  - Dark Mode modern terinspirasi oleh *VS Code & Linear*.
  - Syntax Highlighting untuk beragam bahasa (JavaScript, Python, Bash, SQL, JSON, HTML, CSS, PHP, C++, Markdown, Plain Text).
  - Nomor baris & auto indentation (dukungan tombol `Tab`).
- 🚀 **1-Click Copy**: Tombol salin cepat dengan notifikasi toast dan fallback otomatis untuk jaringan LAN tanpa HTTPS.
- ⌨️ **Global Keyboard Shortcuts**:
  - `Ctrl + V` / `Cmd + V`: Tekan di mana saja pada dashboard untuk langsung membuka form simpan snippet.
  - `/` atau `Ctrl + K`: Fokus cepat ke kolom pencarian snippet.
  - `Escape`: Menutup modal aktif.
- 📌 **Pin & Filter & Search**: Sematkan snippet penting di atas, filter berdasarkan kategori bahasa, dan pencarian instan.
- 🌐 **Auto LAN IP Discovery**: Menampilkan alamat IP lokal perangkat secara otomatis agar PC Lab tinggal membuka alamat tersebut.
- 📦 **Zero External Dependency**: Menggunakan Python 3 Standard Library + SQLite3 (tidak butuh instalasi library pihak ketiga, langsung jalan di sistem operasi apa saja).

---

## 🚀 Cara Menjalankan

### 1. Jalankan di Laptop (Host):
Buka terminal di folder project ini dan jalankan:
```bash
python3 server.py
# Atau
./start.sh
```

Terminal akan menampilkan IP jaringan lokal kamu, misalnya:
```text
============================================================
 🚀 NativeCopy Server is RUNNING!
============================================================
 • Local Access     : http://localhost:8080
 • LAN (Lab PC / HP): http://192.168.1.15:8080
============================================================
```

### 2. Akses dari PC Lab / HP:
1. Pastikan PC Lab terhubung ke **jaringan Wi-Fi atau LAN yang sama** dengan laptop kamu.
2. Buka browser di PC Lab dan ketik URL IP yang tampil (misal: `http://192.168.1.15:8080`).
3. Login menggunakan akun yang sama dengan yang didaftarkan di laptop.
4. Selesai! Kamu sekarang bisa bebas copy-paste kode dari laptop ke PC lab atau sebaliknya secara instan.

---

## 🛠️ Struktur Proyek

```
NativeCopy/
├── server.py         # HTTP Server multi-threaded & SSE Real-time Broadcaster
├── database.py       # SQLite3 Database Layer (Auth PBKDF2 & Snippets CRUD)
├── start.sh          # Script launcher cepat
├── test_handler.py   # Test suite otomatis
├── README.md         # Dokumentasi lengkap
├── data/             # Folder penyimpanan database SQLite (auto-created)
│   └── nativecopy.db
└── public/           # Frontend Single Page Application
    ├── index.html    # Antarmuka web utama
    ├── style.css     # Styling tema programmer dark mode
    └── app.js        # Logika frontend, SSE listener & clipboard handler
```
