/**
 * NativeCopy - Clean & Rock-Solid Frontend
 */

(function () {
  'use strict';

  // State
  const state = {
    user: JSON.parse(localStorage.getItem('nc_user') || 'null'),
    token: localStorage.getItem('nc_token') || '',
    snippets: [],
    activeFilter: 'all',
    searchQuery: '',
    eventSource: null,
    pollingTimer: null,
    isRegisterMode: false
  };

  // DOM
  const el = {
    brandLogo: document.getElementById('brandLogo'),
    searchInput: document.getElementById('searchInput'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    headerAuthArea: document.getElementById('headerAuthArea'),
    appView: document.getElementById('appView'),
    authView: document.getElementById('authView'),
    btnNewSnippet: document.getElementById('btnNewSnippet'),
    filterTabs: document.getElementById('filterTabs'),
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
    // Modal
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
    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Toast Manager ---
  function showToast(message, type = 'normal', duration = 2500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
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
    if (diff < 10) return 'Baru saja';
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
      showToast('Tersalin ke clipboard!', 'success');
      if (btn) {
        const orig = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `<span>✓ Tersalin</span>`;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = orig;
        }, 1500);
      }
    } else {
      showToast('Gagal menyalin otomatis', 'error');
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

      el.headerAuthArea.innerHTML = `
        <div class="user-badge">
          <span>${escapeHtml(state.user.username)}</span>
          <button class="btn-logout" id="btnLogout" title="Keluar">
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
      el.headerAuthArea.innerHTML = '';
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
    el.authBtnText.textContent = state.isRegisterMode ? 'Daftar Akun' : 'Masuk (Login)';

    if (res.ok && res.data && res.data.token) {
      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('nc_token', state.token);
      localStorage.setItem('nc_user', JSON.stringify(state.user));
      el.authPassword.value = '';
      showToast('Berhasil masuk!', 'success');
      updateAuthUI();
    } else {
      el.authError.textContent = res.data?.error || 'Gagal terhubung. Pastikan koneksi aman.';
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

    // 1. Try SSE Stream
    try {
      const sseUrl = `/api/events?token=${encodeURIComponent(state.token)}`;
      const es = new EventSource(sseUrl);
      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleLiveEvent(msg);
        } catch (e) {}
      };
      es.onerror = () => {
        // SSE disconnected on serverless, fallback is already running
      };
      state.eventSource = es;
    } catch (e) {}

    // 2. Reliable Background Polling every 4 seconds (handles serverless perfectly)
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

  // --- Snippet CRUD ---
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
            <button class="icon-btn btn-pin" data-id="${s.id}" title="${s.isPinned ? 'Lepas Pin' : 'Pin'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button class="icon-btn btn-edit" data-id="${s.id}" title="Edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="icon-btn btn-del" data-id="${s.id}" title="Hapus">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="card-code">${escapeHtml(s.content)}</div>

        <div class="card-footer">
          <span class="char-info">${s.content.length} karakter</span>
          <button class="btn-copy" data-id="${s.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Salin</span>
          </button>
        </div>
      </div>
    `).join('');

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
        if (confirm('Hapus snippet ini?')) {
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

  // --- Modal Form ---
  function openSnippetModal(snip = null) {
    if (snip) {
      el.modalTitle.textContent = 'Edit Snippet';
      el.editSnippetId.value = snip.id;
      el.snippetTitleInput.value = snip.title;
      el.snippetLangInput.value = snip.language;
      el.snippetContentInput.value = snip.content;
      el.snippetPinInput.checked = snip.isPinned;
    } else {
      el.modalTitle.textContent = 'Snippet Baru';
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

  // Auto detect format on paste
  el.snippetContentInput.addEventListener('input', () => {
    const val = el.snippetContentInput.value.trim();
    if (!el.editSnippetId.value && el.snippetLangInput.value === 'plaintext') {
      if (/^(SELECT|INSERT INTO|CREATE TABLE)/i.test(val)) el.snippetLangInput.value = 'sql';
      else if (/^(\{.*\}|\[.*\])$/s.test(val)) {
        try { JSON.parse(val); el.snippetLangInput.value = 'json'; } catch (e) {}
      }
      else if (/^(def |import |from \w+ import)/.test(val)) el.snippetLangInput.value = 'python';
      else if (/^(const |let |var |function)/.test(val)) el.snippetLangInput.value = 'javascript';
      else if (/^(#!|\$|curl |sudo |git )/.test(val)) el.snippetLangInput.value = 'bash';
    }
  });

  // --- Listeners ---
  el.tabLogin.addEventListener('click', () => {
    state.isRegisterMode = false;
    el.tabLogin.classList.add('active');
    el.tabRegister.classList.remove('active');
    el.authBtnText.textContent = 'Masuk (Login)';
    el.authError.classList.add('hidden');
  });

  el.tabRegister.addEventListener('click', () => {
    state.isRegisterMode = true;
    el.tabRegister.classList.add('active');
    el.tabLogin.classList.remove('active');
    el.authBtnText.textContent = 'Daftar Akun';
    el.authError.classList.add('hidden');
  });

  el.authForm.addEventListener('submit', handleAuthSubmit);

  el.filterTabs.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      el.filterTabs.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.getAttribute('data-filter');
      renderSnippets();
    });
  });

  el.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderSnippets();
  });

  el.btnNewSnippet.addEventListener('click', () => openSnippetModal());
  el.btnEmptyNew.addEventListener('click', () => openSnippetModal());
  el.btnCloseSnippetModal.addEventListener('click', closeSnippetModal);
  el.btnCancelSnippet.addEventListener('click', closeSnippetModal);
  el.snippetForm.addEventListener('submit', handleSnippetSubmit);

  el.modalSnippet.addEventListener('click', (e) => {
    if (e.target === el.modalSnippet) closeSnippetModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSnippetModal();
  });

  // Start app
  updateAuthUI();

})();
