# 📋 NativeCopy Enterprise // Live Remote VS Code & Cloud Clipboard Sync

NativeCopy Enterprise adalah sistem sinkronisasi clipboard & code editor lintas perangkat berkecepatan tinggi dengan integrasi **Live Remote Insertion** langsung ke editor **VS Code**.

---

## ⚡ Fitur Utama

- 🚀 **Live Remote Typing to VS Code**: Salin/ketik teks atau kode dari HP Anda, tekan tombol *"⚡ Send to VS Code"*, maka teks tersebut **langsung otomatis tertulis pada file yang sedang dibuka di kursor aktif VS Code Anda!**
- ⚡ **Real-Time Live Sync (SSE)**: Sinkronisasi instan sub-milidetik antar browser, HP, laptop, dan VS Code.
- 🕒 **4 Global Real-Time World Clocks**: Bar jam dunia live berdetak detik (JKT, NYC, IST, MED).
- 💱 **Live USD ↔ IDR Currency Calculator**: Ticker kurs realtime & kalkulator konversi dua arah.
- 🎨 **Multi-Theme Dynamic Canvas**: 5 pilihan tema elegan (*Midnight Obsidian*, *Cyber Matrix*, *Nordic Cyan*, *Royal Amethyst*, *Solar Amber*) dengan partikel background canvas yang menyesuaikan warna secara dinamis.
- 🔒 **Stateless HMAC-SHA256 Token Auth**: Sesi login anti-logout 100% stabil di cloud serverless (Vercel).
- 💬 **Saran & Kritik (Feedback System)**: Form masukan dengan star rating (1-5 bintang).

---

## 📦 Cara Memasang Ekstensi VS Code di Laptop / PC Lain

### Cara 1: Menggunakan Script Otomatis (1 Detik)

#### Untuk macOS / Linux:
```bash
git clone https://github.com/muhmdathalla/nativecopy.git
cd nativecopy
./install-extension.sh
```

#### Untuk Windows:
```cmd
git clone https://github.com/muhmdathalla/nativecopy.git
cd nativecopy
install-extension.bat
```

### Cara 2: Salin Folder Manual
Cukup salin folder `vscode-extension` ke direktori ekstensi VS Code di komputer Anda:
- **macOS / Linux**: `~/.vscode/extensions/nativecopy-1.0.0/`
- **Windows**: `%USERPROFILE%\.vscode\extensions\nativecopy-1.0.0\`

---

## 🔌 Cara Menghubungkan Ekstensi VS Code ke Akun Anda

1. Buka web NativeCopy di browser (atau di HP) dan login ke akun Anda.
2. Klik tombol **"⚡ VS Code Sync"** di navbar atas, lalu klik **"Salin Token"**.
3. Buka **VS Code** di komputer Anda.
4. Tekan <kbd>Ctrl + Shift + P</kbd> (atau <kbd>Cmd + Shift + P</kbd> di Mac), ketik:
   ```text
   NativeCopy: Connect Account / Set Token
   ```
5. Masukkan URL server (default: `https://nativecopy.vercel.app` atau `http://localhost:8080`) dan paste Token Akun Anda.
6. Indikator di pojok kanan bawah VS Code akan berubah menjadi:
   ```text
   ⚡ NativeCopy: Live
   ```

---

## 📱 Cara Menggunakan (Ketik dari HP ke File VS Code)

1. Buka file kode yang ingin Anda edit di VS Code pada komputer Anda. Letakkan kursor di baris yang Anda inginkan.
2. Di HP Anda, buka web NativeCopy:
   - Ketik atau paste kode di kotak **"⚡ Live Remote Insert to VS Code Cursor"**, lalu tap **"⚡ Kirim Langsung ke Kursor VS Code"**.
   - Atau tap tombol **"⚡ To VS Code"** pada salah satu card snippet yang sudah ada.
3. Teks tersebut akan **langsung otomatis terketik di file VS Code yang sedang Anda buka!**

---

## 🛠️ Jalankan Server Lokal (Opsional)
```bash
python3 server.py
# atau
./start.sh
```
