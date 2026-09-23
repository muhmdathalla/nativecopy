# ⚡ NativeCopy // Live Remote VS Code, Directory File Injection & Cross-Device Sync

<p align="center">
  <img src="public/favicon.ico" width="80" alt="NativeCopy Logo" />
</p>

<p align="center">
  <strong>Sistem Manajemen Clipboard & Live Remote Code Injection Lintas Perangkat Berkecepatan Tinggi</strong><br>
  Ketik atau upload file dari smartphone (iPhone/Android), langsung tertulis dan tersimpan otomatis ke dalam folder project VS Code laptop Anda secara real-time!
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VS_Code-Extension_v1.0.0-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Code Extension" />
  <img src="https://img.shields.io/badge/Sync_Engine-Zero--Latency_SSE-10B981" alt="Sync Engine" />
  <img src="https://img.shields.io/badge/Mobile-iPhone_13_Pro_Optimized-38BDF8" alt="Mobile Optimized" />
  <img src="https://img.shields.io/badge/Security-Stateless_PBKDF2-F59E0B" alt="Security" />
</p>

---

## 🚀 Fitur Unggulan

### 1. 🖐️ AirMotion Spatial Hand Gesture Camera Pointer & Virtual Trackpad *(NEW & ANTI-MAINSTREAM)*
Kendalikan kursor mouse dan gestur OS laptop Anda (Mac & Windows) secara global **tanpa harus buka VS Code saja** — bekerja untuk desktop, browser, video, presentasi, dll:
- 📷 **AI Computer Vision (MediaPipe Hands)**: Mengakses kamera HP secara langsung dengan overlay Cyber HUD futuristik.
- 👆 **1 Jari (Telunjuk)**: Menggerakkan pointer kursor OS laptop secara presisi dengan filter *Exponential Moving Average (EMA)* anti-jitter.
- 👌 **Pinch Gesture (Telunjuk + Jempol)**: Klik kiri (*Left Click*) instan.
- ✌️ **2 Jari Terangkat**: Scroll halaman web / dokumen ke atas & ke bawah secara natural.
- 🖐️ **3 Jari Terbuka**: Switch window aplikasi OS (<kbd>Cmd + Tab</kbd> di macOS / <kbd>Alt + Tab</kbd> di Windows).
- ✊ **Genggaman Tertutup**: Pause tracking otomatis agar leluasa reposisi tangan.
- 📱 **Virtual Touchpad Mode**: Trackpad sentuh presisi tinggi dengan multi-touch scroll, tactile left/right click, dan OS shortcut bar jika tidak ingin menggunakan kamera.

### 2. ⚡ Live Remote Typing ke Kursor VS Code
Ketik atau paste kode/teks dari HP Anda $\rightarrow$ tekan **"Kirim ke VS Code"** $\rightarrow$ teks **langsung terketik otomatis di posisi kursor file VS Code yang sedang Anda buka di laptop!**

### 3. 📁 Direct Workspace Directory File Injection (HP $\rightarrow$ Folder VS Code)
Upload file apa saja dari HP (file kode `.ipynb`, `.cpp`, `.py`, `.js`, gambar, dataset `.csv`, archive `.zip`) $\rightarrow$ ekstensi VS Code secara otomatis **langsung menyimpan file tersebut ke dalam subfolder project yang sedang aktif dibuka** di VS Code dan langsung membuka tab filenya!

### 4. ⚡ Reverse Teleport Selection (VS Code $\rightarrow$ Layar HP)
Blok baris kode atau fungsi apa saja di VS Code laptop $\rightarrow$ tekan shortcut `Cmd+Option+T` (Mac) atau `Ctrl+Alt+T` (Windows) $\rightarrow$ kode langsung **teleport** muncul di layar HP Anda seketika disertai getaran haptic dan tombol *1-Tap Salin*.

### 5. 📤 Upload File dari VS Code ke HP (Download Hub)
Kirim file aktif dari laptop ke HP cukup dengan menekan `Cmd+Option+U` (Mac) / `Ctrl+Alt+U` (Windows). File langsung muncul di daftar unduhan HP Anda.

### 6. 📱 Desain Mobile-First (Dioptimalkan untuk iPhone 13 Pro & iOS Safari)
- **iOS Bottom-Sheet Modals**: Dialog bergaya sheet asli iOS dengan drag handle dan gesture swipe-down untuk menutup.
- **Safe Area Inset Support**: Sempurna untuk layar ber-notch dan Dynamic Island.
- **Auto-Zoom Prevention**: Input teks nyaman tanpa zoom liar di Safari iOS.

### 7. 🕒 4 Jam Dunia & Kalkulator Kurs Live
- Bar jam dunia realtime: **Jakarta (WIB)**, **New York (EDT)**, **Istanbul (TRT)**, dan **Madinah (AST)**.
- Ticker kurs USD $\leftrightarrow$ IDR live dengan kalkulator dua arah.

### 8. 🎨 5 Tema Dinamis & Background Partikel
Pilihan tema futuristik:
- 🌌 **Midnight Obsidian** (Default Modern Dark)
- 🟩 **Cyber Matrix** (Emerald Glow)
- 🩵 **Nordic Cyan** (Ice Blue)
- 🪻 **Royal Amethyst** (Deep Purple)
- 🟧 **Solar Amber** (Golden Cyber)

---

## 📦 Cara Memasang Ekstensi di Laptop / PC Lain

Bagi teman-teman yang ingin memasang ekstensi VS Code NativeCopy di laptop masing-masing:

### 🟢 Cara 1: Menggunakan Script Otomatis (Paling Cepat - 1 Detik)

#### Untuk macOS / Linux:
Buka terminal dan jalankan:
```bash
git clone https://github.com/muhmdathalla/nativecopy.git
cd nativecopy
./install-extension.sh
```

#### Untuk Windows (PowerShell / Command Prompt):
Buka terminal VS Code / PowerShell dan jalankan:
```powershell
git clone https://github.com/muhmdathalla/nativecopy.git
cd nativecopy
.\install-extension.bat
# atau: .\install-extension.ps1
```

---

### 🔵 Cara 2: Pasang via File VSIX (Resmi VS Code UI)

1. Clone atau unduh repository ini:
   ```bash
   git clone https://github.com/muhmdathalla/nativecopy.git
   ```
2. Buka **VS Code** $\rightarrow$ klik tab **Extensions** di sidebar kiri (<kbd>Cmd + Shift + X</kbd> atau <kbd>Ctrl + Shift + X</kbd>).
3. Klik ikon menu titik tiga (**`...`**) di pojok kanan atas panel Extensions $\rightarrow$ Pilih **`Install from VSIX...`**.
4. Pilih file **`nativecopy-1.0.0.vsix`** yang ada di dalam folder repo.
5. Selesai! Ekstensi langsung terpasang.

---

## 🔌 Cara Menghubungkan Ekstensi ke Akun Anda

1. Buka web NativeCopy di browser laptop atau HP Anda (misal `https://nativecopy.vercel.app` atau server lokal) lalu **Login / Daftar Akun**.
2. Klik tombol **`⚡ VS Code`** di navbar atas $\rightarrow$ klik **`Salin Token`**.
3. Buka **VS Code** di laptop.
4. Tekan <kbd>Cmd + Shift + P</kbd> (Mac) atau <kbd>Ctrl + Shift + P</kbd> (Windows), ketik:
   ```text
   NativeCopy: Connect Account / Set Token
   ```
5. Tekan **Enter** untuk menyetujui Server URL (default `https://nativecopy.vercel.app` atau URL lokal Anda).
6. **Paste Token Akun** Anda lalu tekan **Enter**.
7. Status bar di pojok kanan bawah VS Code akan aktif:
   ```text
   ⚡ NativeCopy: Live
   ```

---

## ⌨️ Daftar Shortcut VS Code

| Shortcut (Mac) | Shortcut (Windows/Linux) | Fungsi |
| :--- | :--- | :--- |
| <kbd>Cmd + Option + T</kbd> | <kbd>Ctrl + Alt + T</kbd> | ⚡ **Teleport Seleksi Kode** langsung ke layar HP |
| <kbd>Cmd + Option + U</kbd> | <kbd>Ctrl + Alt + U</kbd> | 📁 **Upload File Aktif** ke HP / Cloud Download Hub |
| <kbd>Cmd + Shift + P</kbd> $\rightarrow$ `NativeCopy: Connect` | <kbd>Ctrl + Shift + P</kbd> $\rightarrow$ `NativeCopy: Connect` | 🔌 Sambungkan akun & token |
| <kbd>Cmd + Shift + P</kbd> $\rightarrow$ `NativeCopy: Toggle` | <kbd>Ctrl + Shift + P</kbd> $\rightarrow$ `NativeCopy: Toggle` | ⏸️ On/Off kan fitur auto-insert |

---

## 🛠️ Menjalankan Server Sendiri (Lokal / Self-Hosted)

Jika ingin menjalankan server backend di jaringan Wi-Fi lokal rumah/kampus:

```bash
# Clone repository
git clone https://github.com/muhmdathalla/nativecopy.git
cd nativecopy

# Jalankan server
python3 server.py
```
Server akan berjalan di port `8080` dan menampilkan IP lokal (misal `http://192.168.1.10:8080`) yang bisa langsung dibuka dari browser HP Anda di jaringan Wi-Fi yang sama!

---

## 🛡️ Arsitektur & Keamanan
- **Stateless HMAC-SHA256 Authentication**: Token sesi mandiri yang tidak bergantung pada memori server, membuat aplikasi tahan restart dan stabil di platform cloud serverless (Vercel).
- **Sub-Millisecond Dual-Transport SSE**: Koneksi stream real-time dengan socket keep-alive 3 detik dan liveness watchdog untuk mencegah koneksi terputus.
- **Direct Workspace File API**: Menggunakan `vscode.workspace.fs` resmi yang aman dan terisolasi pada direktori workspace yang sedang dibuka pengguna.

---

<p align="center">
  Dibuat dengan ❤️ oleh <a href="https://github.com/muhmdathalla">Athalla</a> • NativeCopy 2026
</p>
