/**
 * NativeCopy Enterprise Suite
 * Advanced Cross-Device Workspace & VS Code Live Remote Typing Engine
 */

(function () {
  'use strict';

  // --- i18n Dictionaries ---
  const i18n = {
    id: {
      feedback: 'Saran & Kritik',
      about: 'About',
      totalSnippets: 'Total Snippets',
      totalChars: 'Karakter Tersimpan',
      pinnedCount: 'Disematkan',
      syncEngine: 'Sync Engine',
      workspaceTitle: 'Workspace Clipboard Lintas Perangkat',
      workspaceSubtitle: 'Potongan kode & teks tersinkronisasi otomatis di seluruh komputer dan gadget Anda.',
      export: 'Export JSON',
      newSnippet: '+ Snippet Baru',
      all: 'Semua',
      emptyTitle: 'Belum Ada Snippet Tersimpan',
      emptyDesc: 'Tambahkan potongan kode atau teks di workstation ini, lalu login di workstation lain untuk mengambilnya seketika.',
      createFirst: '+ Buat Snippet Pertama',
      authTitle: 'NativeCopy Enterprise',
      authSubtitle: 'Masuk dengan akun yang sama di seluruh workstation & perangkat Anda untuk sinkronisasi otomatis.',
      loginTab: 'Masuk (Login)',
      registerTab: 'Daftar Akun',
      username: 'Username',
      password: 'Password',
      btnLogin: 'Masuk ke Workspace',
      btnRegister: 'Daftar Akun Baru',
      snippetTitleLabel: 'Judul / Keterangan',
      snippetLangLabel: 'Bahasa / Format',
      snippetCodeLabel: 'Isi Kode / Teks',
      pinSnippet: '📌 Sematkan di paling atas (Pin)',
      cancel: 'Batal',
      saveAndSync: 'Simpan & Sync',
      aboutTitle: 'Tentang NativeCopy Enterprise',
      currencyTitle: 'Kurs Mata Uang Live (USD / IDR)',
      feedbackTitle: 'Saran & Kritik (Feedback)',
      feedbackDesc: 'Bantu kami meningkatkan kualitas NativeCopy. Setiap saran, kritik, atau laporan bug sangat kami hargai!',
      feedbackCategory: 'Kategori',
      feedbackRating: 'Kepuasan Layanan',
      feedbackMessage: 'Pesan / Masukan Anda',
      sendFeedback: 'Kirim Masukan',
      copied: 'Tersalin ke clipboard!',
      copyFailed: 'Gagal menyalin otomatis',
      confirmDelete: 'Hapus snippet ini?'
    },
    en: {
      feedback: 'Feedback',
      about: 'About',
      totalSnippets: 'Total Snippets',
      totalChars: 'Total Characters',
      pinnedCount: 'Pinned',
      syncEngine: 'Sync Engine',
      workspaceTitle: 'Cross-Device Clipboard Workspace',
      workspaceSubtitle: 'Code snippets & text automatically synchronized across all your workstations & devices.',
      export: 'Export JSON',
      newSnippet: '+ New Snippet',
      all: 'All',
      emptyTitle: 'No Snippets Saved Yet',
      emptyDesc: 'Add code snippets or text on this workstation, then sign in on your other devices to access them instantly.',
      createFirst: '+ Create First Snippet',
      authTitle: 'NativeCopy Enterprise',
      authSubtitle: 'Sign in with the same account across all your workstations & devices for automatic sync.',
      loginTab: 'Sign In',
      registerTab: 'Register',
      username: 'Username',
      password: 'Password',
      btnLogin: 'Sign In to Workspace',
      btnRegister: 'Create Enterprise Account',
      snippetTitleLabel: 'Title / Description',
      snippetLangLabel: 'Language / Format',
      snippetCodeLabel: 'Code / Text Content',
      pinSnippet: '📌 Pin to top of feed',
      cancel: 'Cancel',
      saveAndSync: 'Save & Sync',
      aboutTitle: 'About NativeCopy Enterprise',
      currencyTitle: 'Live Currency Converter (USD / IDR)',
      feedbackTitle: 'Feedback & Inquiries',
      feedbackDesc: 'Help us improve NativeCopy. Every feedback, bug report, or feature request is appreciated!',
      feedbackCategory: 'Category',
      feedbackRating: 'Rating',
      feedbackMessage: 'Your Message / Feedback',
      sendFeedback: 'Submit Feedback',
      copied: 'Copied to clipboard!',
      copyFailed: 'Auto-copy failed',
      confirmDelete: 'Delete this snippet?'
    }
  };

  // State
  const state = {
    theme: localStorage.getItem('nc_theme') || 'obsidian',
    lang: localStorage.getItem('nc_lang') || 'id',
    user: JSON.parse(localStorage.getItem('nc_user') || 'null'),
    token: localStorage.getItem('nc_token') || '',
    snippets: [],
    activeFilter: 'all',
    searchQuery: '',
    usdRate: 16250.0,
    eventSource: null,
    pollingTimer: null,
    isRegisterMode: false,
    teleportFiles: []
  };

  // DOM Elements
  const el = {
    brandBtn: document.getElementById('brandBtn'),
    bgCanvas: document.getElementById('bgCanvas'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    themeNameText: document.getElementById('themeNameText'),
    themeMenu: document.getElementById('themeMenu'),
    btnLangToggle: document.getElementById('btnLangToggle'),
    langFlag: document.getElementById('langFlag'),
    langLabel: document.getElementById('langLabel'),
    btnOpenVsCodeSetup: document.getElementById('btnOpenVsCodeSetup'),
    btnOpenMoreMenu: document.getElementById('btnOpenMoreMenu'),
    moreDropdown: document.getElementById('moreDropdown'),
    menuItemFeedback: document.getElementById('menuItemFeedback'),
    menuItemAbout: document.getElementById('menuItemAbout'),
    menuItemExport: document.getElementById('menuItemExport'),
    btnOpenCurrency: document.getElementById('btnOpenCurrency'),
    tickerRate: document.getElementById('tickerRate'),
    navAuthSlot: document.getElementById('navAuthSlot'),
    // Clocks
    clockJKT: document.getElementById('clockJKT'),
    clockNYC: document.getElementById('clockNYC'),
    clockIST: document.getElementById('clockIST'),
    clockMED: document.getElementById('clockMED'),
    // VS Code Remote Box & Teleport Tabs
    tabModeLiveTyping: document.getElementById('tabModeLiveTyping'),
    tabModeFileTeleport: document.getElementById('tabModeFileTeleport'),
    panelLiveTyping: document.getElementById('panelLiveTyping'),
    panelFileTeleport: document.getElementById('panelFileTeleport'),
    teleportHintText: document.getElementById('teleportHintText'),
    remoteVsCodeInput: document.getElementById('remoteVsCodeInput'),
    remoteCharCount: document.getElementById('remoteCharCount'),
    btnSendToVsCode: document.getElementById('btnSendToVsCode'),
    // File Teleport Hub
    fileDropzone: document.getElementById('fileDropzone'),
    fileTeleportInput: document.getElementById('fileTeleportInput'),
    btnTriggerFilePick: document.getElementById('btnTriggerFilePick'),
    fileUploadStatus: document.getElementById('fileUploadStatus'),
    fileUploadStatusText: document.getElementById('fileUploadStatusText'),
    teleportFilesSection: document.getElementById('teleportFilesSection'),
    teleportFilesCount: document.getElementById('teleportFilesCount'),
    btnRefreshFiles: document.getElementById('btnRefreshFiles'),
    teleportFilesList: document.getElementById('teleportFilesList'),
    // Reverse Teleport Popup
    reverseTeleportBanner: document.getElementById('reverseTeleportBanner'),
    reverseSenderLabel: document.getElementById('reverseSenderLabel'),
    btnCloseReverseBanner: document.getElementById('btnCloseReverseBanner'),
    reverseFileName: document.getElementById('reverseFileName'),
    reverseCharCount: document.getElementById('reverseCharCount'),
    reverseCodePreview: document.getElementById('reverseCodePreview'),
    btnCopyReverseCode: document.getElementById('btnCopyReverseCode'),
    // Stats
    statCount: document.getElementById('statCount'),
    statChars: document.getElementById('statChars'),
    statPinned: document.getElementById('statPinned'),
    // Views
    appView: document.getElementById('appView'),
    authView: document.getElementById('authView'),
    btnNewSnippet: document.getElementById('btnNewSnippet'),
    filterTabs: document.getElementById('filterTabs'),
    searchInput: document.getElementById('searchInput'),
    snippetsGrid: document.getElementById('snippetsGrid'),
    emptyState: document.getElementById('emptyState'),
    btnEmptyNew: document.getElementById('btnEmptyNew'),
    countAll: document.getElementById('countAll'),
    countPinned: document.getElementById('countPinned'),
    // Auth Form
    tabLogin: document.getElementById('tabLogin'),
    tabRegister: document.getElementById('tabRegister'),
    authForm: document.getElementById('authForm'),
    authUsername: document.getElementById('authUsername'),
    authPassword: document.getElementById('authPassword'),
    authError: document.getElementById('authError'),
    btnSubmitAuth: document.getElementById('btnSubmitAuth'),
    authBtnText: document.getElementById('authBtnText'),
    // Snippet Modal
    modalSnippet: document.getElementById('modalSnippet'),
    modalTitle: document.getElementById('modalTitle'),
    snippetForm: document.getElementById('snippetForm'),
    editSnippetId: document.getElementById('editSnippetId'),
    snippetTitleInput: document.getElementById('snippetTitleInput'),
    snippetLangInput: document.getElementById('snippetLangInput'),
    snippetContentInput: document.getElementById('snippetContentInput'),
    snippetPinInput: document.getElementById('snippetPinInput'),
    btnCloseSnippetModal: document.getElementById('btnCloseSnippetModal'),
    btnCancelSnippet: document.getElementById('btnCancelSnippet'),
    btnSaveSnippet: document.getElementById('btnSaveSnippet'),
    // About Modal
    modalAbout: document.getElementById('modalAbout'),
    btnCloseAbout: document.getElementById('btnCloseAbout'),
    // VS Code Setup Modal
    modalVsCode: document.getElementById('modalVsCode'),
    btnCloseVsCodeModal: document.getElementById('btnCloseVsCodeModal'),
    btnCloseVsCodeModalBottom: document.getElementById('btnCloseVsCodeModalBottom'),
    userTokenDisplay: document.getElementById('userTokenDisplay'),
    btnCopyUserToken: document.getElementById('btnCopyUserToken'),
    // Currency Modal
    modalCurrency: document.getElementById('modalCurrency'),
    btnCloseCurrency: document.getElementById('btnCloseCurrency'),
    calcRateDisplay: document.getElementById('calcRateDisplay'),
    inputUSD: document.getElementById('inputUSD'),
    inputIDR: document.getElementById('inputIDR'),
    // Feedback Modal
    modalFeedback: document.getElementById('modalFeedback'),
    btnCloseFeedback: document.getElementById('btnCloseFeedback'),
    btnCancelFeedback: document.getElementById('btnCancelFeedback'),
    feedbackForm: document.getElementById('feedbackForm'),
    fbCategory: document.getElementById('fbCategory'),
    fbMessage: document.getElementById('fbMessage'),
    fbRatingVal: document.getElementById('fbRatingVal'),
    starRating: document.getElementById('starRating'),
    ratingText: document.getElementById('ratingText'),
    btnSubmitFeedback: document.getElementById('btnSubmitFeedback'),
    // AirMotion Spatial Pointer & Trackpad
    btnOpenAirMotion: document.getElementById('btnOpenAirMotion'),
    modalAirMotion: document.getElementById('modalAirMotion'),
    btnCloseAirMotion: document.getElementById('btnCloseAirMotion'),
    tabAirCamera: document.getElementById('tabAirCamera'),
    tabAirTrackpad: document.getElementById('tabAirTrackpad'),
    panelAirCamera: document.getElementById('panelAirCamera'),
    panelAirTrackpad: document.getElementById('panelAirTrackpad'),
    airMotionVideo: document.getElementById('airMotionVideo'),
    airMotionCanvas: document.getElementById('airMotionCanvas'),
    hudGestureBadge: document.getElementById('hudGestureBadge'),
    hudGestureText: document.getElementById('hudGestureText'),
    hudFpsText: document.getElementById('hudFpsText'),
    hudReticle: document.getElementById('hudReticle'),
    hudCoordsText: document.getElementById('hudCoordsText'),
    hudStateTag: document.getElementById('hudStateTag'),
    btnToggleAirCamera: document.getElementById('btnToggleAirCamera'),
    cameraBtnIcon: document.getElementById('cameraBtnIcon'),
    cameraBtnLabel: document.getElementById('cameraBtnLabel'),
    btnFlipCamera: document.getElementById('btnFlipCamera'),
    btnRecalibrateAir: document.getElementById('btnRecalibrateAir'),
    rangeAirSensitivity: document.getElementById('rangeAirSensitivity'),
    airSensVal: document.getElementById('airSensVal'),
    virtualTouchpad: document.getElementById('virtualTouchpad'),
    touchpadPointerDot: document.getElementById('touchpadPointerDot'),
    btnTrackpadLeftClick: document.getElementById('btnTrackpadLeftClick'),
    btnTrackpadRightClick: document.getElementById('btnTrackpadRightClick'),
    rangeTrackpadSensitivity: document.getElementById('rangeTrackpadSensitivity'),
    trackpadSensVal: document.getElementById('trackpadSensVal'),
    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Dynamic Particle Background Canvas ---
  function initDynamicBackgroundCanvas() {
    const canvas = el.bgCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(width > 768 ? 45 : 20, 50);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.5 + 0.8
      });
    }

    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function getThemeCanvasColors() {
      const t = state.theme;
      if (t === 'matrix') {
        return { particle: 'rgba(16, 185, 129, 0.4)', line: 'rgba(16, 185, 129, 0.16)', grid: 'rgba(16, 185, 129, 0.04)' };
      } else if (t === 'nordic') {
        return { particle: 'rgba(6, 182, 212, 0.4)', line: 'rgba(6, 182, 212, 0.16)', grid: 'rgba(6, 182, 212, 0.04)' };
      } else if (t === 'amethyst') {
        return { particle: 'rgba(168, 85, 247, 0.4)', line: 'rgba(168, 85, 247, 0.16)', grid: 'rgba(168, 85, 247, 0.04)' };
      } else if (t === 'amber') {
        return { particle: 'rgba(245, 158, 11, 0.4)', line: 'rgba(245, 158, 11, 0.16)', grid: 'rgba(245, 158, 11, 0.04)' };
      }
      return { particle: 'rgba(164, 173, 204, 0.25)', line: 'rgba(164, 173, 204, 0.12)', grid: 'rgba(255, 255, 255, 0.025)' };
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      const colors = getThemeCanvasColors();

      ctx.fillStyle = colors.grid;
      for (let x = 0; x < width; x += 40) {
        for (let y = 0; y < height; y += 40) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 125) {
            ctx.strokeStyle = colors.line;
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    }

    render();
  }

  // --- World Clocks Engine (JKT, NYC, IST, MED) ---
  function updateWorldClocks() {
    const now = new Date();
    const opts = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };

    try {
      el.clockJKT.textContent = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'Asia/Jakarta' }).format(now);
      el.clockNYC.textContent = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'America/New_York' }).format(now);
      el.clockIST.textContent = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'Europe/Istanbul' }).format(now);
      el.clockMED.textContent = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'Asia/Riyadh' }).format(now);
    } catch (e) {
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const fmt = (offset) => new Date(utc + (3600000 * offset)).toTimeString().split(' ')[0];
      el.clockJKT.textContent = fmt(7);
      el.clockNYC.textContent = fmt(-4);
      el.clockIST.textContent = fmt(3);
      el.clockMED.textContent = fmt(3);
    }
  }

  // --- Theme Switcher ---
  function setTheme(themeName) {
    state.theme = themeName;
    localStorage.setItem('nc_theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    document.body.className = `theme-${themeName}`;

    const names = {
      obsidian: 'Obsidian',
      matrix: 'Cyber Matrix',
      nordic: 'Nordic Cyan',
      amethyst: 'Royal Amethyst',
      amber: 'Solar Amber'
    };
    el.themeNameText.textContent = names[themeName] || 'Theme';

    document.querySelectorAll('.theme-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-theme') === themeName);
    });

    el.themeMenu.classList.add('hidden');
  }

  // --- i18n Translation ---
  function setLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('nc_lang', lang);
    el.langFlag.textContent = lang === 'id' ? '🇮🇩' : '🇬🇧';
    el.langLabel.textContent = lang.toUpperCase();

    const dict = i18n[lang] || i18n.id;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (dict[key]) {
        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
          node.placeholder = dict[key];
        } else {
          node.textContent = dict[key];
        }
      }
    });

    if (state.isRegisterMode) {
      el.authBtnText.textContent = dict.btnRegister;
    } else {
      el.authBtnText.textContent = dict.btnLogin;
    }
  }

  // --- Currency Live Rate & Converter ---
  async function fetchLiveCurrencyRate() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data?.rates?.IDR) {
          state.usdRate = data.rates.IDR;
        }
      }
    } catch (e) {}

    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(state.usdRate);
    el.tickerRate.textContent = formatted;
    el.calcRateDisplay.textContent = `1 USD = ${formatted}`;
    updateCurrencyCalc();
  }

  function updateCurrencyCalc(fromUSD = true) {
    const rate = state.usdRate;
    if (fromUSD) {
      const usd = parseFloat(el.inputUSD.value) || 0;
      const idr = usd * rate;
      el.inputIDR.value = new Intl.NumberFormat('id-ID').format(Math.round(idr));
    } else {
      const rawIDR = el.inputIDR.value.replace(/[^0-9]/g, '');
      const idr = parseFloat(rawIDR) || 0;
      const usd = idr / rate;
      el.inputUSD.value = (Math.round(usd * 100) / 100).toFixed(2);
    }
  }

  // --- Toast Manager ---
  function showToast(message, type = 'normal', duration = 2400) {
    const toast = document.createElement('div');
    toast.className = `toast-item ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - timestamp);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s lalu`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}j lalu`;
    const d = Math.floor(h / 24);
    return `${d}h lalu`;
  }

  // --- Copy Function ---
  async function copyToClipboard(text, btn) {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {}
    }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}
    }

    if (ok) {
      const dict = i18n[state.lang] || i18n.id;
      showToast(dict.copied, 'success');
      if (btn) {
        const orig = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `<span>✓ Tersalin</span>`;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = orig;
        }, 1400);
      }
    } else {
      showToast(i18n[state.lang].copyFailed, 'error');
    }
  }

  // --- API Client ---
  async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    try {
      const res = await fetch(endpoint, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, error: err.message };
    }
  }

  // --- Send Direct to Active VS Code Cursor ---
  async function sendDirectToVsCode(content) {
    if (!content || !content.trim()) {
      showToast('Ketik atau paste teks terlebih dahulu', 'error');
      return;
    }
    if (!state.token) {
      showToast('Silakan login terlebih dahulu', 'error');
      return;
    }

    const res = await api('/api/vscode/insert', {
      method: 'POST',
      body: JSON.stringify({
        content: content,
        mode: 'insert',
        sender: 'Mobile/Web Dashboard'
      })
    });

    if (res.ok) {
      showToast('⚡ Terkirim! Teks otomatis tertulis di kursor aktif VS Code Anda.', 'success', 3500);
    } else {
      showToast(res.data?.error || 'Gagal mengirim ke VS Code', 'error');
    }
  }

  // --- Auth Flow ---
  function updateAuthUI() {
    if (state.user && state.token) {
      el.authView.classList.add('hidden');
      el.appView.classList.remove('hidden');

      el.userTokenDisplay.value = state.token;

      el.navAuthSlot.innerHTML = `
        <div class="user-tag">
          <span>${escapeHtml(state.user.username)}</span>
          <button class="btn-signout" id="btnLogout" title="Keluar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      `;
      document.getElementById('btnLogout').addEventListener('click', handleLogout);
      
      initSync();
      fetchSnippets();
      fetchTeleportFiles();
    } else {
      el.appView.classList.add('hidden');
      el.authView.classList.remove('hidden');
      el.navAuthSlot.innerHTML = '';
      el.userTokenDisplay.value = 'Silakan login terlebih dahulu untuk mendapatkan token';
      stopSync();
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = el.authUsername.value.trim();
    const password = el.authPassword.value;
    el.authError.classList.add('hidden');

    if (!username || !password) return;

    el.btnSubmitAuth.disabled = true;
    el.authBtnText.textContent = 'Memproses...';

    const endpoint = state.isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const res = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    el.btnSubmitAuth.disabled = false;
    const dict = i18n[state.lang] || i18n.id;
    el.authBtnText.textContent = state.isRegisterMode ? dict.btnRegister : dict.btnLogin;

    if (res.ok && res.data && res.data.token) {
      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('nc_token', state.token);
      localStorage.setItem('nc_user', JSON.stringify(state.user));
      el.authPassword.value = '';
      showToast('Berhasil masuk!', 'success');
      updateAuthUI();
    } else {
      el.authError.textContent = res.data?.error || 'Gagal terhubung ke server.';
      el.authError.classList.remove('hidden');
    }
  }

  function handleLogout() {
    state.user = null;
    state.token = '';
    state.snippets = [];
    localStorage.removeItem('nc_token');
    localStorage.removeItem('nc_user');
    api('/api/auth/logout', { method: 'POST' });
    updateAuthUI();
    showToast('Telah keluar.');
  }

  // --- Real-Time Sync & Background Polling ---
  function initSync() {
    stopSync();

    try {
      const sseUrl = `/api/events?token=${encodeURIComponent(state.token)}`;
      const es = new EventSource(sseUrl);
      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleLiveEvent(msg);
        } catch (e) {}
      };
      state.eventSource = es;
    } catch (e) {}

    state.pollingTimer = setInterval(async () => {
      if (!state.token || !state.user) return;
      const res = await api('/api/snippets');
      if (res.ok && res.data && Array.isArray(res.data.snippets)) {
        const fresh = res.data.snippets;
        if (JSON.stringify(fresh) !== JSON.stringify(state.snippets)) {
          state.snippets = fresh;
          renderSnippets();
        }
      }
    }, 4000);
  }

  function stopSync() {
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }
    if (state.pollingTimer) {
      clearInterval(state.pollingTimer);
      state.pollingTimer = null;
    }
  }

  function handleLiveEvent(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'snippet_created') {
      if (!state.snippets.some(s => s.id === msg.payload.id)) {
        state.snippets.unshift(msg.payload);
        renderSnippets();
        showToast('Snippet baru diterima!');
      }
    } else if (msg.type === 'snippet_updated') {
      const idx = state.snippets.findIndex(s => s.id === msg.payload.id);
      if (idx !== -1) {
        state.snippets[idx] = msg.payload;
        state.snippets.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt - a.updatedAt));
        renderSnippets();
      }
    } else if (msg.type === 'snippet_deleted') {
      state.snippets = state.snippets.filter(s => s.id !== msg.payload.id);
      renderSnippets();
    } else if (msg.type === 'reverse_teleport') {
      // VS Code teleports selected text to mobile screen
      showReverseTeleportPopup(msg.payload);
    } else if (msg.type === 'file_teleport') {
      // New file teleported
      fetchTeleportFiles();
      showToast(`📁 Berkas '${msg.payload.filename}' diterima!`, 'success');
      playCyberChime();
    } else if (msg.type === 'file_deleted') {
      fetchTeleportFiles();
    }
  }

  // --- Audio Synth Chime (Web Audio API - No External Files) ---
  function playCyberChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.08); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.16); // D6

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (e) {}

    // Haptic vibration on mobile
    if (navigator.vibrate) {
      try { navigator.vibrate([40, 50, 40]); } catch (e) {}
    }
  }

  // --- Reverse Teleport Popup (VS Code -> Phone) ---
  let reversePopupTimer = null;
  function showReverseTeleportPopup(payload) {
    if (!payload || !el.reverseTeleportBanner) return;
    playCyberChime();

    const text = payload.text || '';
    const fileName = payload.fileName || 'VS Code';
    const lang = payload.language || 'plaintext';
    const sender = payload.sender || 'VS Code Laptop';

    el.reverseSenderLabel.textContent = `⚡ DITERIMA DARI ${sender.toUpperCase()}`;
    el.reverseFileName.textContent = fileName;
    el.reverseCharCount.textContent = `${text.length} chars`;
    el.reverseCodePreview.textContent = text;

    el.reverseTeleportBanner.classList.remove('hidden');

    el.btnCopyReverseCode.onclick = () => {
      copyToClipboard(text, el.btnCopyReverseCode);
      setTimeout(() => {
        el.reverseTeleportBanner.classList.add('hidden');
      }, 700);
    };

    if (reversePopupTimer) clearTimeout(reversePopupTimer);
    reversePopupTimer = setTimeout(() => {
      el.reverseTeleportBanner.classList.add('hidden');
    }, 15000); // Auto hide after 15s
  }

  // --- Teleport Mode Tabs & File Hub ---
  function setupTeleportModeTabs() {
    if (!el.tabModeLiveTyping || !el.tabModeFileTeleport) return;

    el.tabModeLiveTyping.addEventListener('click', () => {
      el.tabModeLiveTyping.classList.add('active');
      el.tabModeFileTeleport.classList.remove('active');
      el.panelLiveTyping.classList.remove('hidden');
      el.panelFileTeleport.classList.add('hidden');
      if (el.teleportHintText) el.teleportHintText.textContent = 'Ketik di HP, langsung tertulis di kursor VS Code';
    });

    el.tabModeFileTeleport.addEventListener('click', () => {
      el.tabModeFileTeleport.classList.add('active');
      el.tabModeLiveTyping.classList.remove('active');
      el.panelFileTeleport.classList.remove('hidden');
      el.panelLiveTyping.classList.add('hidden');
      if (el.teleportHintText) el.teleportHintText.textContent = 'Upload file dari HP, langsung tersimpan ke folder VS Code!';
      fetchTeleportFiles();
    });

    if (el.btnCloseReverseBanner) {
      el.btnCloseReverseBanner.addEventListener('click', () => {
        el.reverseTeleportBanner.classList.add('hidden');
      });
    }

    if (el.btnRefreshFiles) {
      el.btnRefreshFiles.addEventListener('click', fetchTeleportFiles);
    }
  }

  // --- File Teleportation Engine ---
  function setupFileTeleportation() {
    if (!el.fileDropzone || !el.fileTeleportInput) return;

    el.btnTriggerFilePick?.addEventListener('click', () => {
      el.fileTeleportInput.click();
    });

    el.fileTeleportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileUpload(file);
      el.fileTeleportInput.value = '';
    });

    // Drag and Drop
    el.fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.fileDropzone.classList.add('dragover');
    });

    el.fileDropzone.addEventListener('dragleave', () => {
      el.fileDropzone.classList.remove('dragover');
    });

    el.fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.fileDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }

  async function handleFileUpload(file) {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('Ukuran file maksimal 25 MB', 'error');
      return;
    }

    el.fileUploadStatus.classList.remove('hidden');
    el.fileUploadStatusText.textContent = `Mengirim '${file.name}' (${formatFileSize(file.size)})...`;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        const res = await api('/api/files/upload', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            fileData: base64Data,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            target: 'workspace',
            sender: 'Mobile Phone'
          })
        });

        el.fileUploadStatus.classList.add('hidden');

        if (res.ok) {
          showToast(`📁 Berkas '${file.name}' berhasil di-inject ke folder VS Code!`, 'success');
          fetchTeleportFiles();
          playCyberChime();
        } else {
          showToast(res.data?.error || 'Gagal mengunggah berkas', 'error');
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      el.fileUploadStatus.classList.add('hidden');
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  async function fetchTeleportFiles() {
    if (!state.token) return;
    const res = await api('/api/files');
    if (res.ok && res.data && Array.isArray(res.data.files)) {
      state.teleportFiles = res.data.files;
      renderTeleportFiles(state.teleportFiles);
    }
  }

  function renderTeleportFiles(files) {
    if (!el.teleportFilesSection || !el.teleportFilesList) return;

    if (!files || files.length === 0) {
      el.teleportFilesSection.classList.add('hidden');
      if (el.teleportFilesCount) el.teleportFilesCount.textContent = '0';
      return;
    }

    el.teleportFilesSection.classList.remove('hidden');
    if (el.teleportFilesCount) el.teleportFilesCount.textContent = files.length;

    el.teleportFilesList.innerHTML = files.map(f => {
      const ext = f.filename.split('.').pop().toLowerCase();
      let icon = '📄';
      if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) icon = '🖼️';
      else if (['js', 'ts', 'py', 'cpp', 'html', 'css', 'json', 'sql', 'sh'].includes(ext)) icon = '💻';
      else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) icon = '📦';
      else if (['pdf', 'docx', 'txt', 'md'].includes(ext)) icon = '📝';

      return `
        <div class="teleport-file-item">
          <div class="file-item-left">
            <span class="file-item-icon">${icon}</span>
            <div class="file-meta-col">
              <span class="file-item-name" title="${escapeHtml(f.filename)}">${escapeHtml(f.filename)}</span>
              <span class="file-item-sub">${formatFileSize(f.fileSize)} • Dari: ${escapeHtml(f.sender || 'Device')}</span>
            </div>
          </div>
          <div class="file-action-btns">
            <a href="/api/files/${f.id}/download?token=${encodeURIComponent(state.token)}" download="${escapeHtml(f.filename)}" class="btn-file-dl" title="Unduh ke HP">
              <span>⬇ Unduh</span>
            </a>
            <button class="btn-file-del btn-delete-file" data-id="${f.id}" title="Hapus Berkas">✕</button>
          </div>
        </div>
      `;
    }).join('');

    el.teleportFilesList.querySelectorAll('.btn-delete-file').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fid = btn.getAttribute('data-id');
        if (!confirm('Hapus berkas ini?')) return;
        const res = await api(`/api/files/${fid}`, { method: 'DELETE' });
        if (res.ok) {
          state.teleportFiles = state.teleportFiles.filter(item => item.id !== parseInt(fid, 10));
          renderTeleportFiles(state.teleportFiles);
          showToast('Berkas dihapus');
        }
      });
    });
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // --- Snippet Management ---
  async function fetchSnippets() {
    if (!state.token) return;
    const res = await api('/api/snippets');
    if (res.ok && res.data && Array.isArray(res.data.snippets)) {
      state.snippets = res.data.snippets;
      renderSnippets();
    }
  }

  function renderSnippets() {
    const list = state.snippets.filter(s => {
      if (state.activeFilter === 'pinned' && !s.isPinned) return false;
      if (state.activeFilter !== 'all' && state.activeFilter !== 'pinned' && s.language !== state.activeFilter) return false;
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
      }
      return true;
    });

    el.countAll.textContent = state.snippets.length;
    el.countPinned.textContent = state.snippets.filter(s => s.isPinned).length;
    el.statCount.textContent = state.snippets.length;
    el.statPinned.textContent = state.snippets.filter(s => s.isPinned).length;
    const totalChars = state.snippets.reduce((acc, curr) => acc + (curr.content ? curr.content.length : 0), 0);
    el.statChars.textContent = new Intl.NumberFormat('id-ID').format(totalChars);

    if (list.length === 0) {
      el.snippetsGrid.innerHTML = '';
      el.emptyState.classList.remove('hidden');
      return;
    }

    el.emptyState.classList.add('hidden');
    el.snippetsGrid.innerHTML = list.map(s => `
      <div class="snippet-card ${s.isPinned ? 'is-pinned' : ''}">
        <div class="card-top">
          <div>
            <div class="card-meta">
              <span class="badge-lang">${escapeHtml(s.language)}</span>
              ${s.isPinned ? `<span class="badge-pinned">📌 Pinned</span>` : ''}
              <span class="time-ago">${formatTime(s.updatedAt)}</span>
            </div>
            <h4 class="card-title">${escapeHtml(s.title)}</h4>
          </div>
          <div class="card-actions">
            <button class="action-icon-btn btn-pin" data-id="${s.id}" title="${s.isPinned ? 'Unpin' : 'Pin'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button class="action-icon-btn btn-edit" data-id="${s.id}" title="Edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-icon-btn btn-del" data-id="${s.id}" title="Hapus">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="card-code"><pre><code class="language-${escapeHtml(s.language)}">${escapeHtml(s.content)}</code></pre></div>

        <div class="card-footer">
          <button class="btn-copy btn-send-vscode" data-id="${s.id}" title="Kirim langsung ke file VS Code aktif" style="border-color:#06b6d4; color:#22d3ee;">
            <span>⚡ To VS Code</span>
          </button>

          <button class="btn-copy btn-card-copy" data-id="${s.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Salin</span>
          </button>
        </div>
      </div>
    `).join('');

    if (window.hljs) {
      el.snippetsGrid.querySelectorAll('pre code').forEach(block => {
        try { window.hljs.highlightElement(block); } catch (e) {}
      });
    }

    // Attach card action listeners
    el.snippetsGrid.querySelectorAll('.btn-card-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const snip = state.snippets.find(s => s.id === id);
        if (snip) copyToClipboard(snip.content, btn);
      });
    });

    el.snippetsGrid.querySelectorAll('.btn-send-vscode').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const snip = state.snippets.find(s => s.id === id);
        if (snip) sendDirectToVsCode(snip.content);
      });
    });

    el.snippetsGrid.querySelectorAll('.btn-pin').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const res = await api(`/api/snippets/${id}/pin`, { method: 'POST' });
        if (res.ok && res.data && res.data.snippet) {
          const idx = state.snippets.findIndex(s => s.id === id);
          if (idx !== -1) {
            state.snippets[idx] = res.data.snippet;
            state.snippets.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt - a.updatedAt));
            renderSnippets();
          }
        }
      });
    });

    el.snippetsGrid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const snip = state.snippets.find(s => s.id === id);
        if (snip) openSnippetModal(snip);
      });
    });

    el.snippetsGrid.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const dict = i18n[state.lang] || i18n.id;
        if (confirm(dict.confirmDelete)) {
          const res = await api(`/api/snippets/${id}`, { method: 'DELETE' });
          if (res.ok) {
            state.snippets = state.snippets.filter(s => s.id !== id);
            renderSnippets();
            showToast('Snippet dihapus');
          }
        }
      });
    });
  }

  // --- Modal Snippet ---
  function openSnippetModal(snip = null) {
    if (snip) {
      el.modalTitle.textContent = 'Edit Snippet';
      el.editSnippetId.value = snip.id;
      el.snippetTitleInput.value = snip.title;
      el.snippetLangInput.value = snip.language;
      el.snippetContentInput.value = snip.content;
      el.snippetPinInput.checked = snip.isPinned;
    } else {
      el.modalTitle.textContent = state.lang === 'en' ? 'New Snippet' : 'Snippet Baru';
      el.editSnippetId.value = '';
      el.snippetTitleInput.value = '';
      el.snippetLangInput.value = 'plaintext';
      el.snippetContentInput.value = '';
      el.snippetPinInput.checked = false;
    }
    el.modalSnippet.classList.remove('hidden');
    setTimeout(() => {
      if (!snip) el.snippetContentInput.focus();
      else el.snippetTitleInput.focus();
    }, 60);
  }

  function closeSnippetModal() {
    el.modalSnippet.classList.add('hidden');
  }

  async function handleSnippetSubmit(e) {
    e.preventDefault();
    const id = el.editSnippetId.value;
    const title = el.snippetTitleInput.value.trim() || 'Untitled';
    const content = el.snippetContentInput.value;
    const language = el.snippetLangInput.value;
    const isPinned = el.snippetPinInput.checked;

    if (!content.trim()) {
      showToast('Konten tidak boleh kosong', 'error');
      return;
    }

    if (id) {
      const res = await api(`/api/snippets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content, language })
      });
      if (res.ok && res.data?.snippet) {
        const idx = state.snippets.findIndex(s => s.id === parseInt(id, 10));
        if (idx !== -1) {
          state.snippets[idx] = res.data.snippet;
          state.snippets.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt - a.updatedAt));
          renderSnippets();
        }
        closeSnippetModal();
        showToast('Snippet diperbarui', 'success');
      }
    } else {
      const res = await api('/api/snippets', {
        method: 'POST',
        body: JSON.stringify({ title, content, language, isPinned })
      });
      if (res.ok && res.data?.snippet) {
        state.snippets.unshift(res.data.snippet);
        renderSnippets();
        closeSnippetModal();
        showToast('Snippet tersimpan & tersinkron!', 'success');
      }
    }
  }

  // --- Export All Snippets as JSON ---
  function exportSnippetsJSON() {
    if (state.snippets.length === 0) {
      showToast('Belum ada snippet untuk diexport', 'error');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.snippets, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `nativecopy_backup_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Export JSON berhasil diunduh!', 'success');
  }

  // --- Feedback (Saran & Kritik) Engine ---
  function setupFeedbackSystem() {
    const stars = el.starRating.querySelectorAll('.star');
    const ratingLabels = ['1 / 5 - Sangat Kurang', '2 / 5 - Perlu Peningkatan', '3 / 5 - Cukup', '4 / 5 - Puas', '5 / 5 - Sangat Puas'];

    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.getAttribute('data-val'), 10);
        el.fbRatingVal.value = val;
        el.ratingText.textContent = ratingLabels[val - 1];
        stars.forEach(s => {
          const sVal = parseInt(s.getAttribute('data-val'), 10);
          s.classList.toggle('active', sVal <= val);
        });
      });
    });

    el.feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = el.fbMessage.value.trim();
      const category = el.fbCategory.value;
      const rating = parseInt(el.fbRatingVal.value, 10);

      if (!message) return;

      el.btnSubmitFeedback.disabled = true;
      el.btnSubmitFeedback.textContent = 'Mengirim...';

      const res = await api('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ message, category, rating })
      });

      el.btnSubmitFeedback.disabled = false;
      el.btnSubmitFeedback.textContent = i18n[state.lang].sendFeedback;

      if (res.ok) {
        el.modalFeedback.classList.add('hidden');
        el.fbMessage.value = '';
        showToast('Terima kasih atas saran & kritik kamu! 🌟', 'success');
      } else {
        showToast(res.data?.error || 'Gagal mengirim saran', 'error');
      }
    });
  }

  // --- Setup Listeners ---
  function setupEventListeners() {
    updateWorldClocks();
    setInterval(updateWorldClocks, 1000);

    // Theme Selector
    el.btnThemeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      el.themeMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.theme-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        setTheme(opt.getAttribute('data-theme'));
      });
    });

    document.addEventListener('click', (e) => {
      if (!el.themeMenu.contains(e.target) && e.target !== el.btnThemeToggle) {
        el.themeMenu.classList.add('hidden');
      }
    });

    // Language Toggle
    el.btnLangToggle.addEventListener('click', () => {
      setLanguage(state.lang === 'id' ? 'en' : 'id');
    });

    // Send to VS Code live button & char counter
    if (el.remoteVsCodeInput && el.remoteCharCount) {
      el.remoteVsCodeInput.addEventListener('input', () => {
        const len = el.remoteVsCodeInput.value.length;
        el.remoteCharCount.textContent = `${len} char${len === 1 ? '' : 's'}`;
      });
    }

    el.btnSendToVsCode.addEventListener('click', () => {
      sendDirectToVsCode(el.remoteVsCodeInput.value);
    });

    // More Menu Dropdown
    if (el.btnOpenMoreMenu && el.moreDropdown) {
      el.btnOpenMoreMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        el.moreDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!el.moreDropdown.contains(e.target) && e.target !== el.btnOpenMoreMenu) {
          el.moreDropdown.classList.add('hidden');
        }
      });
    }

    if (el.menuItemFeedback) {
      el.menuItemFeedback.addEventListener('click', () => {
        el.moreDropdown?.classList.add('hidden');
        el.modalFeedback?.classList.remove('hidden');
      });
    }

    if (el.menuItemAbout) {
      el.menuItemAbout.addEventListener('click', () => {
        el.moreDropdown?.classList.add('hidden');
        el.modalAbout?.classList.remove('hidden');
      });
    }

    if (el.menuItemExport) {
      el.menuItemExport.addEventListener('click', () => {
        el.moreDropdown?.classList.add('hidden');
        exportSnippetsJSON();
      });
    }

    // VS Code Setup Modal
    el.btnOpenVsCodeSetup.addEventListener('click', () => {
      el.modalVsCode.classList.remove('hidden');
    });
    el.btnCloseVsCodeModal.addEventListener('click', () => el.modalVsCode.classList.add('hidden'));
    el.btnCloseVsCodeModalBottom.addEventListener('click', () => el.modalVsCode.classList.add('hidden'));

    el.btnCopyUserToken.addEventListener('click', () => {
      if (state.token) {
        copyToClipboard(state.token, el.btnCopyUserToken);
      } else {
        showToast('Silakan login terlebih dahulu untuk mendapatkan token akun', 'error');
      }
    });

    // Currency Modal
    el.btnOpenCurrency.addEventListener('click', () => el.modalCurrency.classList.remove('hidden'));
    el.btnCloseCurrency.addEventListener('click', () => el.modalCurrency.classList.add('hidden'));
    el.inputUSD.addEventListener('input', () => updateCurrencyCalc(true));
    el.inputIDR.addEventListener('input', () => updateCurrencyCalc(false));

    document.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        el.inputUSD.value = pill.getAttribute('data-usd');
        updateCurrencyCalc(true);
      });
    });

    // Feedback Modal close buttons
    el.btnCloseFeedback.addEventListener('click', () => el.modalFeedback.classList.add('hidden'));
    el.btnCancelFeedback.addEventListener('click', () => el.modalFeedback.classList.add('hidden'));

    // About Modal close button
    el.btnCloseAbout.addEventListener('click', () => el.modalAbout.classList.add('hidden'));

    // Auth Form Tabs
    el.tabLogin.addEventListener('click', () => {
      state.isRegisterMode = false;
      el.tabLogin.classList.add('active');
      el.tabRegister.classList.remove('active');
      el.authBtnText.textContent = i18n[state.lang].btnLogin;
      el.authError.classList.add('hidden');
    });

    el.tabRegister.addEventListener('click', () => {
      state.isRegisterMode = true;
      el.tabRegister.classList.add('active');
      el.tabLogin.classList.remove('active');
      el.authBtnText.textContent = i18n[state.lang].btnRegister;
      el.authError.classList.add('hidden');
    });

    el.authForm.addEventListener('submit', handleAuthSubmit);

    // Filters
    el.filterTabs.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        el.filterTabs.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeFilter = btn.getAttribute('data-filter');
        renderSnippets();
      });
    });

    // Search
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderSnippets();
    });

    // Modals
    el.btnNewSnippet.addEventListener('click', () => openSnippetModal());
    el.btnEmptyNew.addEventListener('click', () => openSnippetModal());
    el.btnCloseSnippetModal.addEventListener('click', closeSnippetModal);
    el.btnCancelSnippet.addEventListener('click', closeSnippetModal);
    el.snippetForm.addEventListener('submit', handleSnippetSubmit);

    // Escape closes all modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSnippetModal();
        el.modalVsCode.classList.add('hidden');
        el.modalCurrency.classList.add('hidden');
        el.modalFeedback.classList.add('hidden');
        el.modalAbout.classList.add('hidden');
        if (el.modalAirMotion) el.modalAirMotion.classList.add('hidden');
        el.themeMenu.classList.add('hidden');
      }
    });

    // Backdrop click closes modal
    [el.modalSnippet, el.modalVsCode, el.modalCurrency, el.modalFeedback, el.modalAbout, el.modalAirMotion].forEach(m => {
      if (!m) return;
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.add('hidden');
      });

      // Touch drag down on handle to close (iOS feel)
      const handle = m.querySelector('.modal-drag-handle');
      if (handle) {
        let startY = 0;
        handle.addEventListener('touchstart', (e) => {
          startY = e.touches[0].clientY;
        }, { passive: true });
        handle.addEventListener('touchend', (e) => {
          const deltaY = e.changedTouches[0].clientY - startY;
          if (deltaY > 50) {
            m.classList.add('hidden');
          }
        }, { passive: true });
      }
    });
  }

  // --- AirMotion Spatial Hand Gesture & Virtual Trackpad Engine ---
  function setupAirMotionSystem() {
    if (!el.btnOpenAirMotion || !el.modalAirMotion) return;

    let mediaStream = null;
    let handsInstance = null;
    let cameraFacing = 'user'; // 'user' (front selfie) or 'environment' (rear)
    let isCameraRunning = false;
    let isProcessing = false;
    let animationFrameId = null;

    // Movement state & EMA smoothing filter
    let lastX = null;
    let lastY = null;
    let smoothDx = 0;
    let smoothDy = 0;
    const alpha = 0.45; // EMA smoothing factor

    // Throttling & debouncing
    let lastMoveTime = 0;
    let lastClickTime = 0;
    let lastScrollTime = 0;
    let lastGestureTime = 0;
    let movePending = false;

    let fpsFrames = 0;
    let lastFpsCalc = performance.now();

    // Sensitivity
    let airSensitivity = parseFloat(el.rangeAirSensitivity ? el.rangeAirSensitivity.value : '2.0');
    let trackpadSensitivity = parseFloat(el.rangeTrackpadSensitivity ? el.rangeTrackpadSensitivity.value : '1.5');

    // UI Range listeners
    if (el.rangeAirSensitivity) {
      el.rangeAirSensitivity.addEventListener('input', (e) => {
        airSensitivity = parseFloat(e.target.value);
        if (el.airSensVal) el.airSensVal.textContent = `${airSensitivity.toFixed(1)}x`;
      });
    }

    if (el.rangeTrackpadSensitivity) {
      el.rangeTrackpadSensitivity.addEventListener('input', (e) => {
        trackpadSensitivity = parseFloat(e.target.value);
        if (el.trackpadSensVal) el.trackpadSensVal.textContent = `${trackpadSensitivity.toFixed(1)}x`;
      });
    }

    // Modal Triggers
    el.btnOpenAirMotion.addEventListener('click', () => {
      el.modalAirMotion.classList.remove('hidden');
    });

    el.btnCloseAirMotion.addEventListener('click', () => {
      closeAirMotionModal();
    });

    function closeAirMotionModal() {
      el.modalAirMotion.classList.add('hidden');
      stopAirCamera();
    }

    // Tabs switching
    if (el.tabAirCamera && el.tabAirTrackpad) {
      el.tabAirCamera.addEventListener('click', () => {
        el.tabAirCamera.classList.add('active');
        el.tabAirTrackpad.classList.remove('active');
        el.panelAirCamera.classList.remove('hidden');
        el.panelAirTrackpad.classList.add('hidden');
      });

      el.tabAirTrackpad.addEventListener('click', () => {
        el.tabAirTrackpad.classList.add('active');
        el.tabAirCamera.classList.remove('active');
        el.panelAirTrackpad.classList.remove('hidden');
        el.panelAirCamera.classList.add('hidden');
      });
    }

    // Network transmitters
    async function sendPointerMove(dx, dy) {
      const now = performance.now();
      if (now - lastMoveTime < 18 || movePending) return; // ~50Hz max transmission rate
      movePending = true;
      lastMoveTime = now;
      try {
        await fetch('/api/pointer/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dx, dy, sensitivity: airSensitivity })
        });
      } catch (err) {
        // silent fail
      } finally {
        movePending = false;
      }
    }

    async function sendPointerClick(button = 'left') {
      const now = performance.now();
      if (now - lastClickTime < 350) return; // 350ms cooldown
      lastClickTime = now;
      try {
        await fetch('/api/pointer/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ button })
        });
      } catch (err) {}
    }

    async function sendPointerScroll(dx, dy) {
      const now = performance.now();
      if (now - lastScrollTime < 30) return;
      lastScrollTime = now;
      try {
        await fetch('/api/pointer/scroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dx, dy, sensitivity: airSensitivity })
        });
      } catch (err) {}
    }

    async function sendPointerGesture(action) {
      const now = performance.now();
      if (now - lastGestureTime < 800) return; // 800ms cooldown
      lastGestureTime = now;
      try {
        const res = await fetch('/api/pointer/gesture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`⚡ Gestur Terpicu: ${action}`, 'success');
        }
      } catch (err) {}
    }

    // Camera Controls
    if (el.btnToggleAirCamera) {
      el.btnToggleAirCamera.addEventListener('click', () => {
        if (isCameraRunning) {
          stopAirCamera();
        } else {
          startAirCamera();
        }
      });
    }

    if (el.btnFlipCamera) {
      el.btnFlipCamera.addEventListener('click', () => {
        cameraFacing = cameraFacing === 'user' ? 'environment' : 'user';
        if (isCameraRunning) {
          stopAirCamera();
          startAirCamera();
        }
      });
    }

    if (el.btnRecalibrateAir) {
      el.btnRecalibrateAir.addEventListener('click', () => {
        lastX = null;
        lastY = null;
        smoothDx = 0;
        smoothDy = 0;
        updateHudBadge('🎯 Recalibrated', '#38bdf8');
      });
    }

    let lastLandmarks = null;

    // Start Camera Stream & MediaPipe Loop
    async function startAirCamera() {
      try {
        updateHudBadge('⏳ Memulai Kamera...', '#f59e0b');
        const constraints = {
          video: {
            facingMode: cameraFacing,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (el.airMotionVideo) {
          el.airMotionVideo.muted = true;
          el.airMotionVideo.playsInline = true;
          el.airMotionVideo.setAttribute('playsinline', '');
          el.airMotionVideo.setAttribute('webkit-playsinline', '');
          el.airMotionVideo.srcObject = mediaStream;
          
          try {
            await el.airMotionVideo.play();
          } catch (playErr) {
            console.warn('Video auto-play resolved:', playErr);
          }
        }

        isCameraRunning = true;
        if (el.cameraBtnIcon) el.cameraBtnIcon.textContent = '⏹️';
        if (el.cameraBtnLabel) el.cameraBtnLabel.textContent = 'Matikan Kamera';
        if (el.btnToggleAirCamera) el.btnToggleAirCamera.classList.remove('glow-accent');

        // Ensure MediaPipe Hands is initialized
        if (!handsInstance) {
          if (!window.Hands) {
            updateHudBadge('⏳ Loading AI Model...', '#f59e0b');
            await new Promise((resolve) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
              s.crossOrigin = 'anonymous';
              s.onload = resolve;
              s.onerror = resolve;
              document.head.appendChild(s);
            });
          }

          if (window.Hands) {
            handsInstance = new window.Hands({
              locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            handsInstance.setOptions({
              maxNumHands: 1,
              modelComplexity: 0,
              minDetectionConfidence: 0.35,
              minTrackingConfidence: 0.35
            });
            handsInstance.onResults(onHandResults);
          }
        }

        updateHudBadge('🖐️ Kamera Aktif', '#10b981');
        processCameraLoop();
      } catch (err) {
        console.error('AirMotion camera start error:', err);
        showToast('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser!', 'error');
        updateHudBadge('❌ Kamera Error', '#dc2626');
        stopAirCamera();
      }
    }

    function stopAirCamera() {
      isCameraRunning = false;
      lastLandmarks = null;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
      }
      if (el.airMotionVideo) {
        el.airMotionVideo.srcObject = null;
      }
      if (el.cameraBtnIcon && el.cameraBtnLabel) {
        el.cameraBtnIcon.textContent = '▶️';
        el.cameraBtnLabel.textContent = 'Aktifkan Kamera AI';
        if (el.btnToggleAirCamera) el.btnToggleAirCamera.classList.add('glow-accent');
      }
      // Clear canvas
      if (el.airMotionCanvas) {
        const ctx = el.airMotionCanvas.getContext('2d');
        ctx.clearRect(0, 0, el.airMotionCanvas.width, el.airMotionCanvas.height);
      }
      updateHudBadge('Kamera Siap', '#8c93a8');
    }

    let lastInferenceTime = 0;

    async function processCameraLoop() {
      if (!isCameraRunning) return;

      const video = el.airMotionVideo;
      const canvas = el.airMotionCanvas;

      if (video && canvas && video.readyState >= 2) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw HUD skeleton if landmarks are detected
        if (lastLandmarks && lastLandmarks.length > 0) {
          drawCyberHandSkeleton(ctx, lastLandmarks, canvas.width, canvas.height);
        }
        ctx.restore();

        // Feed canvas frame asynchronously to MediaPipe (throttled to ~30 FPS to prevent lag)
        const now = performance.now();
        if (!isProcessing && handsInstance && (now - lastInferenceTime >= 30)) {
          isProcessing = true;
          lastInferenceTime = now;
          handsInstance.send({ image: canvas })
            .catch((err) => { console.warn('MediaPipe frame err:', err); })
            .finally(() => { isProcessing = false; });
        }
      }

      // FPS tracking
      fpsFrames++;
      const now = performance.now();
      if (now - lastFpsCalc >= 1000) {
        const fps = Math.round((fpsFrames * 1000) / (now - lastFpsCalc));
        if (el.hudFpsText) el.hudFpsText.textContent = `${fps} FPS`;
        fpsFrames = 0;
        lastFpsCalc = now;
      }

      animationFrameId = requestAnimationFrame(processCameraLoop);
    }

    function updateHudBadge(text, color = '#38bdf8') {
      if (el.hudGestureText) el.hudGestureText.textContent = text;
      if (el.hudGestureBadge) el.hudGestureBadge.style.color = color;
    }

    // MediaPipe Result Handler & Landmark Math
    function onHandResults(results) {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        lastLandmarks = null;
        lastX = null;
        lastY = null;
        if (el.hudStateTag) el.hudStateTag.textContent = 'SEARCHING';
        updateHudBadge('🔍 Mencari Tangan...', '#8c93a8');
        return;
      }

      lastLandmarks = results.multiHandLandmarks[0];
      const landmarks = lastLandmarks;
      if (el.hudStateTag) el.hudStateTag.textContent = 'ACTIVE';

      // Key landmark coordinates
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];

      // Robust finger extension checks (distance from wrist invariant to rotation)
      function isFingerExtended(tipIdx, pipIdx, mcpIdx) {
        const dTip = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
        const dPip = Math.hypot(landmarks[pipIdx].x - wrist.x, landmarks[pipIdx].y - wrist.y);
        const dMcp = Math.hypot(landmarks[mcpIdx].x - wrist.x, landmarks[mcpIdx].y - wrist.y);
        return dTip > dPip * 1.15 && dPip > dMcp * 0.9;
      }

      const isIndexExt = isFingerExtended(8, 6, 5);
      const isMiddleExt = isFingerExtended(12, 10, 9);
      const isRingExt = isFingerExtended(16, 14, 13);
      const isPinkyExt = isFingerExtended(20, 18, 17);

      // Pinch Distance (Thumb Tip to Index Tip)
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

      // Display coordinates on HUD (Mirror X for natural selfie feel)
      const currX = (1.0 - indexTip.x);
      const currY = indexTip.y;
      if (el.hudCoordsText) {
        el.hudCoordsText.textContent = `X: ${(currX * 100).toFixed(0)}% | Y: ${(currY * 100).toFixed(0)}%`;
      }

      // Update Reticle location
      if (el.hudReticle) {
        el.hudReticle.style.left = `${(currX * 100).toFixed(1)}%`;
        el.hudReticle.style.top = `${(currY * 100).toFixed(1)}%`;
      }

      // ---------------- GESTURE CLASSIFIER ----------------
      // 1. PINCH CLICK: Thumb & Index very close
      if (pinchDist < 0.055) {
        updateHudBadge('👌 Pinch Click!', '#10b981');
        sendPointerClick('left');
      }
      // 2. SCROLL: 2 Fingers (Index + Middle extended, Ring & Pinky closed)
      else if (isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt) {
        updateHudBadge('✌️ Scrolling', '#38bdf8');
        if (lastY !== null) {
          const rawDy = (currY - lastY) * 500;
          if (Math.abs(rawDy) > 2) {
            sendPointerScroll(0, Math.round(rawDy));
          }
        }
        lastX = currX;
        lastY = currY;
      }
      // 3. SWITCH APP: 3/4 Fingers Wide (With strict 2.5s cooldown)
      else if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
        const now = performance.now();
        if (now - lastGestureTime >= 2500) {
          updateHudBadge('🖐️ Switch App (Cmd/Alt+Tab)', '#a855f7');
          sendPointerGesture('switch_window');
        }
      }
      // 4. CLOSED FIST: Tracking Paused
      else if (!isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
        updateHudBadge('✊ Tracking Paused', '#f59e0b');
        lastX = null;
        lastY = null;
      }
      // 5. DEFAULT POINTER: Index Finger Active
      else if (isIndexExt) {
        updateHudBadge('👆 Pointer Active', '#38bdf8');
        if (lastX !== null && lastY !== null) {
          const rawDx = (currX - lastX) * 1600;
          const rawDy = (currY - lastY) * 1600;

          // Clamp sudden erratic jumps
          const clampedDx = Math.max(-120, Math.min(120, rawDx));
          const clampedDy = Math.max(-120, Math.min(120, rawDy));

          // Apply Exponential Moving Average (EMA)
          smoothDx = alpha * clampedDx + (1 - alpha) * smoothDx;
          smoothDy = alpha * clampedDy + (1 - alpha) * smoothDy;

          if (Math.abs(smoothDx) > 0.3 || Math.abs(smoothDy) > 0.3) {
            sendPointerMove(smoothDx, smoothDy);
          }
        }
        lastX = currX;
        lastY = currY;
      } else {
        lastX = null;
        lastY = null;
      }
    }

    // Cyber HUD Skeleton Drawing
    function drawCyberHandSkeleton(ctx, landmarks, w, h) {
      const connections = [
        [0,1],[1,2],[2,3],[3,4], // Thumb
        [0,5],[5,6],[6,7],[7,8], // Index
        [0,9],[9,10],[10,11],[11,12], // Middle
        [0,13],[13,14],[14,15],[15,16], // Ring
        [0,17],[17,18],[18,19],[19,20], // Pinky
        [5,9],[9,13],[13,17] // Palm bridge
      ];

      // Draw connections
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;

      for (const [i, j] of connections) {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }

      // Draw joints
      landmarks.forEach((p, idx) => {
        const x = p.x * w;
        const y = p.y * h;
        ctx.beginPath();
        if (idx === 8 || idx === 4) { // Index & Thumb tips
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 12;
        } else {
          ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 6;
        }
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    // ---------------- Virtual Trackpad Touch Handlers ----------------
    if (el.virtualTouchpad) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let lastTouchX = 0;
      let lastTouchY = 0;
      let lastTwoTouchY = 0;

      el.virtualTouchpad.addEventListener('touchstart', (e) => {
        const touches = e.touches;
        touchStartTime = performance.now();

        if (touches.length === 1) {
          touchStartX = touches[0].clientX;
          touchStartY = touches[0].clientY;
          lastTouchX = touchStartX;
          lastTouchY = touchStartY;

          if (el.touchpadPointerDot) {
            const rect = el.virtualTouchpad.getBoundingClientRect();
            el.touchpadPointerDot.style.left = `${touchStartX - rect.left}px`;
            el.touchpadPointerDot.style.top = `${touchStartY - rect.top}px`;
            el.touchpadPointerDot.classList.remove('hidden');
          }
        } else if (touches.length === 2) {
          lastTwoTouchY = (touches[0].clientY + touches[1].clientY) / 2;
        }
      }, { passive: true });

      el.virtualTouchpad.addEventListener('touchmove', (e) => {
        const touches = e.touches;
        if (touches.length === 1) {
          const curX = touches[0].clientX;
          const curY = touches[0].clientY;
          const dx = (curX - lastTouchX) * trackpadSensitivity * 1.5;
          const dy = (curY - lastTouchY) * trackpadSensitivity * 1.5;

          lastTouchX = curX;
          lastTouchY = curY;

          if (el.touchpadPointerDot) {
            const rect = el.virtualTouchpad.getBoundingClientRect();
            el.touchpadPointerDot.style.left = `${curX - rect.left}px`;
            el.touchpadPointerDot.style.top = `${curY - rect.top}px`;
          }

          sendPointerMove(dx, dy);
        } else if (touches.length === 2) {
          const curTwoTouchY = (touches[0].clientY + touches[1].clientY) / 2;
          const deltaY = (curTwoTouchY - lastTwoTouchY) * trackpadSensitivity * 3.0;
          lastTwoTouchY = curTwoTouchY;

          sendPointerScroll(0, Math.round(deltaY));
        }
      }, { passive: true });

      el.virtualTouchpad.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
          const duration = performance.now() - touchStartTime;
          const dist = Math.hypot(lastTouchX - touchStartX, lastTouchY - touchStartY);

          // Tap detection (under 250ms & under 10px move)
          if (duration < 250 && dist < 10) {
            sendPointerClick('left');
          }

          if (el.touchpadPointerDot) {
            el.touchpadPointerDot.classList.add('hidden');
          }
        }
      }, { passive: true });
    }

    // Mouse Buttons
    if (el.btnTrackpadLeftClick) {
      el.btnTrackpadLeftClick.addEventListener('click', () => sendPointerClick('left'));
    }
    if (el.btnTrackpadRightClick) {
      el.btnTrackpadRightClick.addEventListener('click', () => sendPointerClick('right'));
    }

    // OS Quick Action Buttons
    document.querySelectorAll('.btn-os-shortcut').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action) sendPointerGesture(action);
      });
    });
  }

  // --- Initialize App ---
  setTheme(state.theme);
  setLanguage(state.lang);
  initDynamicBackgroundCanvas();
  setupFeedbackSystem();
  setupEventListeners();
  setupTeleportModeTabs();
  setupFileTeleportation();
  setupAirMotionSystem();
  fetchLiveCurrencyRate();
  updateAuthUI();

})();
