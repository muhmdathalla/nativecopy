/**
 * NativeCopy Pro v2.0
 * Senior Developer Edition
 */

(function () {
  'use strict';

  // --- Multi-Language Dictionary (i18n) ---
  const i18n = {
    id: {
      search: 'Cari',
      devTools: 'Dev Tools',
      about: 'About',
      liveSyncActive: 'Live Sync Aktif',
      heroTitle: 'Cross-Device Developer Clipboard',
      heroDesc: 'Sinkronisasi kode, token API, SQL query secara instan antar perangkat.',
      newSnippet: '+ Snippet Baru',
      all: 'Semua',
      emptyTitle: 'Belum Ada Snippet Tersimpan',
      emptyDesc: 'Salin kode atau catatan di sini, dan buka akun ini di laptop atau PC lab kamu untuk langsung mengambilnya.',
      createFirst: '+ Buat Snippet Pertama',
      authTitle: 'NativeCopy Cloud',
      authSubtitle: 'Masuk dengan akun yang sama di Laptop & PC Lab untuk sinkronisasi otomatis tanpa batas.',
      loginTab: 'Masuk',
      registerTab: 'Daftar Baru',
      username: 'Username',
      password: 'Password',
      btnLogin: 'Masuk (Login)',
      btnRegister: 'Daftar Akun Baru',
      snippetTitleLabel: 'Judul / Deskripsi',
      snippetLangLabel: 'Bahasa / Format',
      snippetCodeLabel: 'Isi Kode / Teks',
      pinSnippet: '📌 Sematkan di paling atas (Pin)',
      cancel: 'Batal',
      saveAndSync: 'Simpan & Sync',
      aboutTitle: 'Tentang NativeCopy Pro',
      currencyTitle: 'Kurs Mata Uang Live (USD / IDR)',
      devToolsTitle: 'Developer Utility Toolkit',
      copied: 'Tersalin ke clipboard!',
      copyFailed: 'Gagal menyalin otomatis',
      confirmDelete: 'Hapus snippet ini?'
    },
    en: {
      search: 'Search',
      devTools: 'Dev Tools',
      about: 'About',
      liveSyncActive: 'Live Sync Active',
      heroTitle: 'Cross-Device Developer Clipboard',
      heroDesc: 'Instant synchronization of code snippets, API tokens & SQL queries across devices.',
      newSnippet: '+ New Snippet',
      all: 'All',
      emptyTitle: 'No Snippets Saved Yet',
      emptyDesc: 'Copy code or notes here, then login on your other device to access them instantly.',
      createFirst: '+ Create First Snippet',
      authTitle: 'NativeCopy Cloud',
      authSubtitle: 'Login with the same account across Laptop & Lab PC for seamless cross-device sync.',
      loginTab: 'Sign In',
      registerTab: 'Register',
      username: 'Username',
      password: 'Password',
      btnLogin: 'Sign In',
      btnRegister: 'Create Account',
      snippetTitleLabel: 'Title / Description',
      snippetLangLabel: 'Language / Format',
      snippetCodeLabel: 'Code / Text Content',
      pinSnippet: '📌 Pin to top of feed',
      cancel: 'Cancel',
      saveAndSync: 'Save & Sync',
      aboutTitle: 'About NativeCopy Pro',
      currencyTitle: 'Live Currency Converter (USD / IDR)',
      devToolsTitle: 'Developer Utility Toolkit',
      copied: 'Copied to clipboard!',
      copyFailed: 'Auto-copy failed',
      confirmDelete: 'Delete this snippet?'
    }
  };

  // State
  const state = {
    lang: localStorage.getItem('nc_lang') || 'id',
    user: JSON.parse(localStorage.getItem('nc_user') || 'null'),
    token: localStorage.getItem('nc_token') || '',
    snippets: [],
    activeFilter: 'all',
    searchQuery: '',
    usdRate: 16250.0,
    eventSource: null,
    pollingTimer: null,
    isRegisterMode: false
  };

  // DOM Elements
  const el = {
    brandBtn: document.getElementById('brandBtn'),
    bgCanvas: document.getElementById('bgCanvas'),
    btnOpenCommandPalette: document.getElementById('btnOpenCommandPalette'),
    btnOpenDevTools: document.getElementById('btnOpenDevTools'),
    btnOpenAbout: document.getElementById('btnOpenAbout'),
    btnLangToggle: document.getElementById('btnLangToggle'),
    langFlag: document.getElementById('langFlag'),
    langText: document.getElementById('langText'),
    btnOpenCurrencyModal: document.getElementById('btnOpenCurrencyModal'),
    tickerRate: document.getElementById('tickerRate'),
    navUserSlot: document.getElementById('navUserSlot'),
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
    // Currency Modal
    modalCurrency: document.getElementById('modalCurrency'),
    btnCloseCurrency: document.getElementById('btnCloseCurrency'),
    calcRateDisplay: document.getElementById('calcRateDisplay'),
    calcRateTime: document.getElementById('calcRateTime'),
    inputUSD: document.getElementById('inputUSD'),
    inputIDR: document.getElementById('inputIDR'),
    // Dev Tools Modal
    modalDevTools: document.getElementById('modalDevTools'),
    btnCloseDevTools: document.getElementById('btnCloseDevTools'),
    jsonInput: document.getElementById('jsonInput'),
    btnBeautifyJSON: document.getElementById('btnBeautifyJSON'),
    btnMinifyJSON: document.getElementById('btnMinifyJSON'),
    btnSaveJSONSnippet: document.getElementById('btnSaveJSONSnippet'),
    base64Input: document.getElementById('base64Input'),
    btnEncodeB64: document.getElementById('btnEncodeB64'),
    btnDecodeB64: document.getElementById('btnDecodeB64'),
    btnSaveB64Snippet: document.getElementById('btnSaveB64Snippet'),
    hashInput: document.getElementById('hashInput'),
    hashOutput: document.getElementById('hashOutput'),
    btnGenerateHash: document.getElementById('btnGenerateHash'),
    btnCopyHash: document.getElementById('btnCopyHash'),
    // Palette
    modalPalette: document.getElementById('modalPalette'),
    paletteSearch: document.getElementById('paletteSearch'),
    paletteResults: document.getElementById('paletteResults'),
    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Background Particle Animation ---
  function initBackgroundCanvas() {
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
    const count = Math.min(width > 768 ? 45 : 20, 60);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.6 + 0.8
      });
    }

    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let x = 0; x < width; x += 40) {
        for (let y = 0; y < height; y += 40) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Draw particles
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
        ctx.fillStyle = 'rgba(164, 173, 204, 0.25)';
        ctx.fill();

        // Connect lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(164, 173, 204, ${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // --- Internationalization (i18n) ---
  function setLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('nc_lang', lang);
    el.langFlag.textContent = lang === 'id' ? '🇮🇩' : '🇬🇧';
    el.langText.textContent = lang.toUpperCase();

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
        if (data && data.rates && data.rates.IDR) {
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
    toast.className = `toast-msg ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
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

  // --- Auth Flow ---
  function updateAuthUI() {
    if (state.user && state.token) {
      el.authView.classList.add('hidden');
      el.appView.classList.remove('hidden');

      el.navUserSlot.innerHTML = `
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
    } else {
      el.appView.classList.add('hidden');
      el.authView.classList.remove('hidden');
      el.navUserSlot.innerHTML = '';
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
    }
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
          <span class="char-info">${s.content.length} chars</span>
          <button class="btn-copy" data-id="${s.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Salin</span>
          </button>
        </div>
      </div>
    `).join('');

    // Highlight.js
    if (window.hljs) {
      el.snippetsGrid.querySelectorAll('pre code').forEach(block => {
        try { window.hljs.highlightElement(block); } catch (e) {}
      });
    }

    // Attach card actions
    el.snippetsGrid.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const snip = state.snippets.find(s => s.id === id);
        if (snip) copyToClipboard(snip.content, btn);
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

  // --- Developer Tools Utilities ---
  function initDevTools() {
    // Tabs
    document.querySelectorAll('.dev-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tool-pane').forEach(p => p.classList.add('hidden'));
        tab.classList.add('active');
        const tool = tab.getAttribute('data-tool');
        if (tool === 'json') document.getElementById('toolJSON').classList.remove('hidden');
        if (tool === 'base64') document.getElementById('toolBase64').classList.remove('hidden');
        if (tool === 'hash') document.getElementById('toolHash').classList.remove('hidden');
      });
    });

    // JSON Beautify & Minify
    el.btnBeautifyJSON.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(el.jsonInput.value);
        el.jsonInput.value = JSON.stringify(parsed, null, 2);
        showToast('JSON formatted!', 'success');
      } catch (e) {
        showToast('Invalid JSON string', 'error');
      }
    });

    el.btnMinifyJSON.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(el.jsonInput.value);
        el.jsonInput.value = JSON.stringify(parsed);
        showToast('JSON minified!', 'success');
      } catch (e) {
        showToast('Invalid JSON string', 'error');
      }
    });

    el.btnSaveJSONSnippet.addEventListener('click', () => {
      if (el.jsonInput.value.trim()) {
        el.modalDevTools.classList.add('hidden');
        openSnippetModal({
          title: 'JSON Data',
          language: 'json',
          content: el.jsonInput.value,
          isPinned: false
        });
      }
    });

    // Base64
    el.btnEncodeB64.addEventListener('click', () => {
      try {
        el.base64Input.value = btoa(unescape(encodeURIComponent(el.base64Input.value)));
        showToast('Base64 Encoded!', 'success');
      } catch (e) {
        showToast('Encode error', 'error');
      }
    });

    el.btnDecodeB64.addEventListener('click', () => {
      try {
        el.base64Input.value = decodeURIComponent(escape(atob(el.base64Input.value)));
        showToast('Base64 Decoded!', 'success');
      } catch (e) {
        showToast('Invalid Base64 string', 'error');
      }
    });

    el.btnSaveB64Snippet.addEventListener('click', () => {
      if (el.base64Input.value.trim()) {
        el.modalDevTools.classList.add('hidden');
        openSnippetModal({
          title: 'Base64 Snippet',
          language: 'plaintext',
          content: el.base64Input.value,
          isPinned: false
        });
      }
    });

    // SHA-256 Hash
    el.btnGenerateHash.addEventListener('click', async () => {
      const txt = el.hashInput.value;
      if (!txt) return;
      const msgBuffer = new TextEncoder().encode(txt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      el.hashOutput.value = hashHex;
      showToast('SHA-256 Generated!', 'success');
    });

    el.btnCopyHash.addEventListener('click', () => {
      if (el.hashOutput.value) copyToClipboard(el.hashOutput.value, el.btnCopyHash);
    });
  }

  // --- Command Palette ---
  function openCommandPalette() {
    el.modalPalette.classList.remove('hidden');
    el.paletteSearch.value = '';
    renderPaletteResults('');
    setTimeout(() => el.paletteSearch.focus(), 50);
  }

  function closeCommandPalette() {
    el.modalPalette.classList.add('hidden');
  }

  function renderPaletteResults(query) {
    const q = query.toLowerCase().trim();
    const actions = [
      { title: '+ Buat Snippet Baru (New)', action: () => { closeCommandPalette(); openSnippetModal(); } },
      { title: '💱 Buka Kurs USD / IDR Live', action: () => { closeCommandPalette(); el.modalCurrency.classList.remove('hidden'); } },
      { title: '🛠️ Buka Developer Utility Tools', action: () => { closeCommandPalette(); el.modalDevTools.classList.remove('hidden'); } },
      { title: 'ℹ️ Tentang NativeCopy Pro', action: () => { closeCommandPalette(); el.modalAbout.classList.remove('hidden'); } },
      { title: '🌐 Ganti Bahasa (Switch ID / EN)', action: () => { toggleLanguage(); closeCommandPalette(); } }
    ];

    const matchingActions = actions.filter(a => a.title.toLowerCase().includes(q));
    const matchingSnippets = state.snippets.filter(s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)).slice(0, 5);

    let html = '';
    matchingActions.forEach(a => {
      html += `<div class="palette-item action-item" data-type="action"><div class="palette-item-left">⚡ <strong>${escapeHtml(a.title)}</strong></div><span class="badge-lang">Action</span></div>`;
    });

    matchingSnippets.forEach(s => {
      html += `<div class="palette-item snippet-item" data-id="${s.id}"><div class="palette-item-left">📄 <span>${escapeHtml(s.title)}</span></div><span class="badge-lang">${escapeHtml(s.language)}</span></div>`;
    });

    if (!html) {
      html = `<div style="padding: 14px; text-align: center; font-size: 13px; color: #545b73;">Tidak ada hasil ditemukan</div>`;
    }

    el.paletteResults.innerHTML = html;

    // Attach clicks
    el.paletteResults.querySelectorAll('.action-item').forEach((item, idx) => {
      item.addEventListener('click', () => {
        matchingActions[idx].action();
      });
    });

    el.paletteResults.querySelectorAll('.snippet-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        const snip = state.snippets.find(s => s.id === id);
        if (snip) {
          closeCommandPalette();
          openSnippetModal(snip);
        }
      });
    });
  }

  function toggleLanguage() {
    setLanguage(state.lang === 'id' ? 'en' : 'id');
  }

  // --- Setup Listeners ---
  function setupEventListeners() {
    // Auth Tabs
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

    // Currency
    el.btnOpenCurrencyModal.addEventListener('click', () => {
      el.modalCurrency.classList.remove('hidden');
    });
    el.btnCloseCurrency.addEventListener('click', () => el.modalCurrency.classList.add('hidden'));

    el.inputUSD.addEventListener('input', () => updateCurrencyCalc(true));
    el.inputIDR.addEventListener('input', () => updateCurrencyCalc(false));

    document.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.inputUSD.value = btn.getAttribute('data-usd');
        updateCurrencyCalc(true);
      });
    });

    // Dev Tools
    el.btnOpenDevTools.addEventListener('click', () => {
      el.modalDevTools.classList.remove('hidden');
    });
    el.btnCloseDevTools.addEventListener('click', () => el.modalDevTools.classList.add('hidden'));

    // About
    el.btnOpenAbout.addEventListener('click', () => {
      el.modalAbout.classList.remove('hidden');
    });
    el.btnCloseAbout.addEventListener('click', () => el.modalAbout.classList.add('hidden'));

    // Language Toggle
    el.btnLangToggle.addEventListener('click', toggleLanguage);

    // Command Palette
    el.btnOpenCommandPalette.addEventListener('click', openCommandPalette);
    el.paletteSearch.addEventListener('input', (e) => renderPaletteResults(e.target.value));

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      if (e.key === 'Escape') {
        closeSnippetModal();
        closeCommandPalette();
        el.modalCurrency.classList.add('hidden');
        el.modalDevTools.classList.add('hidden');
        el.modalAbout.classList.add('hidden');
      }
    });

    // Close on backdrop click
    [el.modalSnippet, el.modalCurrency, el.modalDevTools, el.modalAbout, el.modalPalette].forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.add('hidden');
      });
    });
  }

  // --- Initialize App ---
  initBackgroundCanvas();
  setupEventListeners();
  initDevTools();
  setLanguage(state.lang);
  fetchLiveCurrencyRate();
  updateAuthUI();

})();
