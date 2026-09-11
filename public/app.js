/**
 * NativeCopy Frontend Application
 * Cross-Device Real-Time Clipboard & Code Sync
 */

(function () {
  'use strict';

  // State
  const state = {
    user: null,
    token: localStorage.getItem('nativecopy_token') || '',
    snippets: [],
    activeFilter: 'all',
    searchQuery: '',
    networkInfo: null,
    eventSource: null,
    pollingInterval: null,
    isRegisterMode: false
  };

  // DOM Elements
  const el = {
    brandLogo: document.getElementById('brandLogo'),
    searchInput: document.getElementById('searchInput'),
    syncBadge: document.getElementById('syncBadge'),
    syncDot: document.getElementById('syncDot'),
    syncText: document.getElementById('syncText'),
    btnLanShare: document.getElementById('btnLanShare'),
    authContainer: document.getElementById('authContainer'),
    appView: document.getElementById('appView'),
    authView: document.getElementById('authView'),
    btnNewSnippet: document.getElementById('btnNewSnippet'),
    filterTabs: document.getElementById('filterTabs'),
    snippetsGrid: document.getElementById('snippetsGrid'),
    emptyState: document.getElementById('emptyState'),
    btnEmptyNew: document.getElementById('btnEmptyNew'),
    btnRefresh: document.getElementById('btnRefresh'),
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
    btnSaveSnippetText: document.getElementById('btnSaveSnippetText'),
    // LAN Modal
    modalLan: document.getElementById('modalLan'),
    lanUrlList: document.getElementById('lanUrlList'),
    btnCloseLanModal: document.getElementById('btnCloseLanModal'),
    btnCloseLanBottom: document.getElementById('btnCloseLanBottom'),
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Utility Functions ---

  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isInfo = type === 'info';

    toast.className = `toast-in pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-xl backdrop-blur-md transition-all ${
      isSuccess ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200' :
      isError ? 'bg-red-950/90 border-red-700/80 text-red-200' :
      'bg-cyan-950/90 border-cyan-700/80 text-cyan-200'
    }`;

    const iconSvg = isSuccess ?
      `<svg class="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` :
      isError ?
      `<svg class="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>` :
      `<svg class="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTimeAgo(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 5) return 'Baru saja';
    if (diff < 60) return `${diff}d yang lalu`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m yang lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j yang lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari yang lalu`;
  }

  async function copyToClipboard(text, buttonElement) {
    let copied = false;

    // Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (err) {
        console.warn('Navigator clipboard error:', err);
      }
    }

    // Robust fallback for non-HTTPS local LAN IP connections
    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.error('Fallback copy error:', e);
      }
    }

    if (copied) {
      showToast('Teks / Code berhasil disalin ke clipboard!', 'success');
      if (buttonElement) {
        const originalHtml = buttonElement.innerHTML;
        buttonElement.classList.add('copied-flash');
        buttonElement.innerHTML = `
          <svg class="w-4 h-4 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Tersalin!</span>
        `;
        setTimeout(() => {
          buttonElement.classList.remove('copied-flash');
          buttonElement.innerHTML = originalHtml;
        }, 1800);
      }
    } else {
      showToast('Gagal menyalin otomatis. Silakan salin manual.', 'error');
    }
  }

  function detectLanguage(code) {
    const trimmed = code.trim();
    if (/^\s*<\?php/i.test(trimmed)) return 'php';
    if (/^\s*<!DOCTYPE html>|^\s*<html/i.test(trimmed)) return 'html';
    if (/^\s*(\{|\{|\[\s*\{|\[)/.test(trimmed) && /:\s*["0-9]/.test(trimmed)) {
      try { JSON.parse(trimmed); return 'json'; } catch (e) {}
    }
    if (/^(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE)\b/i.test(trimmed)) return 'sql';
    if (/^(#!|\$|curl |sudo |git |npm |pip |docker |cd |ls -|export |echo )/m.test(trimmed)) return 'bash';
    if (/^(def |import |from \w+ import|class \w+:|print\(|if __name__ ==)/m.test(trimmed)) return 'python';
    if (/^(const |let |var |function|import |export default|console\.log|document\.)/m.test(trimmed)) return 'javascript';
    if (/^[.#]\w+[\s\S]*\{[\s\S]*\}/m.test(trimmed) && !/def |function|var /.test(trimmed)) return 'css';
    return 'plaintext';
  }

  // --- API Client ---

  async function apiRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      if (res.status === 401) {
        if (state.user) {
          handleLogout();
          showToast('Sesi telah berakhir, silakan login kembali.', 'info');
        }
        return { ok: false, status: 401, data: null };
      }

      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.error('API Request Error:', err);
      return { ok: false, status: 0, error: err.message };
    }
  }

  // --- Real-time Sync (SSE + Smart Polling Fallback) ---

  function initRealtimeSync() {
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
      state.pollingInterval = null;
    }

    if (!state.token || !state.user) {
      updateSyncStatus('disconnected');
      return;
    }

    updateSyncStatus('connected');

    // Try EventSource
    try {
      const sseUrl = `/api/events?token=${encodeURIComponent(state.token)}`;
      const es = new EventSource(sseUrl);

      es.onopen = () => {
        updateSyncStatus('connected');
      };

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleRealtimeEvent(msg);
        } catch (err) {}
      };

      es.onerror = () => {
        // If SSE fails (e.g. on serverless Vercel), enable smart polling fallback
        startPollingFallback();
      };

      state.eventSource = es;
    } catch (e) {
      startPollingFallback();
    }

    // Always keep light background polling every 5s for reliability
    startPollingFallback();
  }

  function startPollingFallback() {
    if (state.pollingInterval) return;
    state.pollingInterval = setInterval(async () => {
      if (!state.token || !state.user) return;
      const res = await apiRequest('/api/snippets');
      if (res.ok && res.data && res.data.snippets) {
        const newSnippets = res.data.snippets;
        if (JSON.stringify(newSnippets) !== JSON.stringify(state.snippets)) {
          state.snippets = newSnippets;
          renderSnippets();
        }
      }
    }, 4000);
  }

  function updateSyncStatus(status) {
    if (status === 'connected') {
      el.syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      el.syncText.textContent = 'Live Sync';
      el.syncBadge.title = 'Real-time sync aktif terhubung ke server';
    } else if (status === 'connecting' || status === 'reconnecting') {
      el.syncDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
      el.syncText.textContent = 'Menghubungkan...';
      el.syncBadge.title = 'Mencoba menghubungkan kembali...';
    } else {
      el.syncDot.className = 'w-2 h-2 rounded-full bg-slate-500';
      el.syncText.textContent = 'Offline';
      el.syncBadge.title = 'Tidak terhubung';
    }
  }

  function handleRealtimeEvent(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'snippet_created') {
      const exists = state.snippets.some(s => s.id === msg.payload.id);
      if (!exists) {
        state.snippets.unshift(msg.payload);
        renderSnippets();
        showToast(`Snippet baru diterima dari perangkat lain! 🚀`, 'info');
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

  // --- Auth & Session ---

  async function checkAuth() {
    if (!state.token) {
      renderAuthLoggedOut();
      return;
    }

    const res = await apiRequest('/api/auth/me');
    if (res.ok && res.data && res.data.user) {
      state.user = res.data.user;
      renderAuthLoggedIn();
      initRealtimeSync();
      fetchSnippets();
    } else {
      renderAuthLoggedOut();
    }
  }

  function renderAuthLoggedIn() {
    el.authView.classList.add('hidden');
    el.appView.classList.remove('hidden');

    el.authContainer.innerHTML = `
      <div class="flex items-center gap-2 px-3 py-1.5 bg-dark-850 border border-dark-700 rounded-lg">
        <div class="w-5 h-5 rounded bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-[11px] font-bold text-white font-mono uppercase">
          ${state.user.username.charAt(0)}
        </div>
        <span class="text-xs font-mono text-slate-200 hidden sm:inline">${escapeHtml(state.user.username)}</span>
        <button id="btnLogout" class="ml-1 text-slate-400 hover:text-red-400 p-0.5 rounded transition-all" title="Keluar / Logout">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    document.getElementById('btnLogout').addEventListener('click', handleLogout);
  }

  function renderAuthLoggedOut() {
    state.user = null;
    state.token = '';
    localStorage.removeItem('nativecopy_token');
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
      state.pollingInterval = null;
    }
    updateSyncStatus('disconnected');

    el.authContainer.innerHTML = `
      <button id="btnHeaderLogin" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-all">
        Login / Masuk
      </button>
    `;
    const btn = document.getElementById('btnHeaderLogin');
    if (btn) btn.addEventListener('click', () => {
      el.authUsername.focus();
    });

    el.appView.classList.add('hidden');
    el.authView.classList.remove('hidden');
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = el.authUsername.value.trim();
    const password = el.authPassword.value;
    el.authError.classList.add('hidden');

    if (!username || !password) {
      el.authError.textContent = 'Harap isi semua kolom.';
      el.authError.classList.remove('hidden');
      return;
    }

    el.btnSubmitAuth.disabled = true;
    el.authBtnText.textContent = 'Memproses...';

    const endpoint = state.isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const res = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    el.btnSubmitAuth.disabled = false;
    el.authBtnText.textContent = state.isRegisterMode ? 'Daftar Sekarang' : 'Masuk (Login)';

    if (res.ok && res.data && res.data.token) {
      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('nativecopy_token', state.token);
      el.authPassword.value = '';
      showToast(state.isRegisterMode ? 'Akun berhasil dibuat & otomatis login!' : 'Berhasil masuk!', 'success');
      renderAuthLoggedIn();
      initRealtimeSync();
      fetchSnippets();
    } else {
      el.authError.textContent = res.data?.error || 'Gagal terhubung ke server.';
      el.authError.classList.remove('hidden');
    }
  }

  async function handleLogout() {
    if (state.token) {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    }
    renderAuthLoggedOut();
    showToast('Telah keluar dari akun.', 'info');
  }

  // --- Snippet Management ---

  async function fetchSnippets() {
    if (!state.user) return;
    const res = await apiRequest('/api/snippets');
    if (res.ok && res.data && res.data.snippets) {
      state.snippets = res.data.snippets;
      renderSnippets();
    }
  }

  function renderSnippets() {
    const filtered = state.snippets.filter(s => {
      // Filter tab
      if (state.activeFilter === 'pinned' && !s.isPinned) return false;
      if (state.activeFilter !== 'all' && state.activeFilter !== 'pinned' && s.language !== state.activeFilter) return false;
      
      // Search query
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
      }
      return true;
    });

    // Update counts
    el.countAll.textContent = state.snippets.length;
    el.countPinned.textContent = state.snippets.filter(s => s.isPinned).length;

    if (filtered.length === 0) {
      el.snippetsGrid.innerHTML = '';
      el.emptyState.classList.remove('hidden');
      return;
    }

    el.emptyState.classList.add('hidden');
    el.snippetsGrid.innerHTML = filtered.map(s => renderSnippetCard(s)).join('');

    // Apply Highlight.js to code blocks if library is available
    if (window.hljs) {
      el.snippetsGrid.querySelectorAll('pre code').forEach((block) => {
        try {
          window.hljs.highlightElement(block);
        } catch (e) {}
      });
    }

    attachSnippetEvents();
  }

  function renderSnippetCard(s) {
    const isCode = s.language !== 'plaintext';
    const langBadgeColor = {
      javascript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      python: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      bash: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      sql: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      json: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      html: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      css: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    }[s.language] || 'bg-slate-700/30 text-slate-300 border-slate-700';

    const lineCount = (s.content.match(/\n/g) || []).length + 1;
    const charCount = s.content.length;

    return `
      <div class="snippet-card bg-dark-900 border ${s.isPinned ? 'border-cyan-500/50 bg-gradient-to-b from-dark-850 to-dark-900' : 'border-dark-700/80'} rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 relative shadow-lg" data-id="${s.id}">
        
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border uppercase ${langBadgeColor}">
                ${escapeHtml(s.language)}
              </span>
              ${s.isPinned ? `
                <span class="text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 font-semibold flex items-center gap-1">
                  📌 Pinned
                </span>
              ` : ''}
              <span class="text-[11px] font-mono text-slate-500" title="${new Date(s.updatedAt * 1000).toLocaleString()}">
                ${formatTimeAgo(s.updatedAt)}
              </span>
            </div>
            <h3 class="text-sm font-semibold text-white truncate font-mono" title="${escapeHtml(s.title)}">
              ${escapeHtml(s.title)}
            </h3>
          </div>

          <!-- Top Quick Actions (Pin, Edit, Delete) -->
          <div class="flex items-center gap-1">
            <button class="btn-pin p-1.5 rounded-lg ${s.isPinned ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-500 hover:text-slate-300 hover:bg-dark-800'} transition-all" title="${s.isPinned ? 'Lepas Pin' : 'Sematkan Pin'}" data-id="${s.id}">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </button>
            <button class="btn-edit p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-dark-800 rounded-lg transition-all" title="Edit Snippet" data-id="${s.id}">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-delete p-1.5 text-slate-500 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-all" title="Hapus Snippet" data-id="${s.id}">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Code Content Area -->
        <div class="code-viewport">
          <pre><code class="language-${escapeHtml(s.language)}">${escapeHtml(s.content)}</code></pre>
        </div>

        <!-- Card Footer Actions -->
        <div class="flex items-center justify-between pt-1 border-t border-dark-800/80">
          <span class="text-[11px] font-mono text-slate-500">
            ${lineCount} lines • ${charCount} chars
          </span>

          <!-- Big 1-Click Copy Button -->
          <button class="btn-copy flex items-center gap-1.5 px-3.5 py-1.5 bg-dark-800 hover:bg-cyan-600 border border-dark-700 hover:border-cyan-500 text-slate-200 hover:text-white rounded-lg text-xs font-mono font-medium shadow-sm transition-all transform active:scale-95" data-id="${s.id}">
            <svg class="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Salin (Copy)</span>
          </button>
        </div>

      </div>
    `;
  }

  function attachSnippetEvents() {
    // Copy buttons
    el.snippetsGrid.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const snippet = state.snippets.find(s => s.id === id);
        if (snippet) {
          copyToClipboard(snippet.content, btn);
        }
      });
    });

    // Pin buttons
    el.snippetsGrid.querySelectorAll('.btn-pin').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const res = await apiRequest(`/api/snippets/${id}/pin`, { method: 'POST' });
        if (res.ok && res.data && res.data.snippet) {
          const idx = state.snippets.findIndex(s => s.id === id);
          if (idx !== -1) {
            state.snippets[idx] = res.data.snippet;
            state.snippets.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt - a.updatedAt));
            renderSnippets();
            showToast(res.data.snippet.isPinned ? 'Snippet disematkan di atas 📌' : 'Pin dilepas', 'info');
          }
        }
      });
    });

    // Edit buttons
    el.snippetsGrid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const snippet = state.snippets.find(s => s.id === id);
        if (snippet) {
          openSnippetModal(snippet);
        }
      });
    });

    // Delete buttons
    el.snippetsGrid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (confirm('Apakah kamu yakin ingin menghapus snippet ini?')) {
          const res = await apiRequest(`/api/snippets/${id}`, { method: 'DELETE' });
          if (res.ok) {
            state.snippets = state.snippets.filter(s => s.id !== id);
            renderSnippets();
            showToast('Snippet berhasil dihapus.', 'info');
          }
        }
      });
    });
  }

  // --- Snippet Modal (Create / Edit) ---

  function openSnippetModal(snippetToEdit = null) {
    if (snippetToEdit) {
      el.modalTitle.textContent = 'Edit Snippet';
      el.btnSaveSnippetText.textContent = 'Perbarui & Sync';
      el.editSnippetId.value = snippetToEdit.id;
      el.snippetTitleInput.value = snippetToEdit.title;
      el.snippetLangInput.value = snippetToEdit.language;
      el.snippetContentInput.value = snippetToEdit.content;
      el.snippetPinInput.checked = snippetToEdit.isPinned;
    } else {
      el.modalTitle.textContent = 'Buat Snippet Baru';
      el.btnSaveSnippetText.textContent = 'Simpan & Sync';
      el.editSnippetId.value = '';
      el.snippetTitleInput.value = '';
      el.snippetLangInput.value = 'plaintext';
      el.snippetContentInput.value = '';
      el.snippetPinInput.checked = false;
    }

    el.modalSnippet.classList.remove('hidden');
    setTimeout(() => {
      if (!snippetToEdit) {
        el.snippetContentInput.focus();
      } else {
        el.snippetTitleInput.focus();
      }
    }, 50);
  }

  function closeSnippetModal() {
    el.modalSnippet.classList.add('hidden');
    el.editSnippetId.value = '';
  }

  async function handleSnippetFormSubmit(e) {
    e.preventDefault();
    const id = el.editSnippetId.value;
    const title = el.snippetTitleInput.value.trim() || 'Untitled Snippet';
    const content = el.snippetContentInput.value;
    const language = el.snippetLangInput.value;
    const isPinned = el.snippetPinInput.checked;

    if (!content.trim()) {
      showToast('Konten snippet tidak boleh kosong!', 'error');
      return;
    }

    if (id) {
      // Update
      const res = await apiRequest(`/api/snippets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content, language })
      });
      if (res.ok && res.data && res.data.snippet) {
        const idx = state.snippets.findIndex(s => s.id === parseInt(id, 10));
        if (idx !== -1) {
          state.snippets[idx] = res.data.snippet;
          state.snippets.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt - a.updatedAt));
          renderSnippets();
        }
        closeSnippetModal();
        showToast('Snippet berhasil diperbarui!', 'success');
      } else {
        showToast(res.data?.error || 'Gagal memperbarui snippet', 'error');
      }
    } else {
      // Create
      const res = await apiRequest('/api/snippets', {
        method: 'POST',
        body: JSON.stringify({ title, content, language, isPinned })
      });
      if (res.ok && res.data && res.data.snippet) {
        state.snippets.unshift(res.data.snippet);
        renderSnippets();
        closeSnippetModal();
        showToast('Snippet tersimpan & disinkronkan! ⚡', 'success');
      } else {
        showToast(res.data?.error || 'Gagal membuat snippet', 'error');
      }
    }
  }

  // Auto-detect language on typing in snippet textarea
  el.snippetContentInput.addEventListener('input', () => {
    if (el.snippetLangInput.value === 'plaintext' || el.editSnippetId.value === '') {
      const detected = detectLanguage(el.snippetContentInput.value);
      if (detected !== 'plaintext') {
        el.snippetLangInput.value = detected;
      }
    }
  });

  // Enable Tab key inside textarea
  el.snippetContentInput.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 2;
    }
  });

  // --- LAN Share Modal ---

  async function openLanModal() {
    const res = await apiRequest('/api/network-info');
    if (res.ok && res.data) {
      state.networkInfo = res.data;
      el.lanUrlList.innerHTML = res.data.urls.map(url => `
        <div class="flex items-center justify-between p-2.5 bg-dark-950 border border-dark-800 rounded-xl">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
            <span class="font-mono text-xs text-cyan-300 truncate select-all">${escapeHtml(url)}</span>
          </div>
          <button class="btn-copy-url px-2.5 py-1 bg-dark-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition-all shrink-0 ml-2" data-url="${escapeHtml(url)}">
            Salin Link
          </button>
        </div>
      `).join('');

      el.lanUrlList.querySelectorAll('.btn-copy-url').forEach(btn => {
        btn.addEventListener('click', () => {
          copyToClipboard(btn.getAttribute('data-url'), btn);
        });
      });
    }

    el.modalLan.classList.remove('hidden');
  }

  function closeLanModal() {
    el.modalLan.classList.add('hidden');
  }

  // --- Global Keyboard Shortcuts ---

  document.addEventListener('keydown', (e) => {
    const activeTagName = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    const isInputActive = activeTagName === 'input' || activeTagName === 'textarea' || activeTagName === 'select';

    // Escape closes modals
    if (e.key === 'Escape') {
      closeSnippetModal();
      closeLanModal();
      return;
    }

    // Slash '/' focuses search
    if (e.key === '/' && !isInputActive) {
      e.preventDefault();
      el.searchInput.focus();
      return;
    }

    // Ctrl+K / Cmd+K search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      el.searchInput.focus();
      return;
    }

    // Ctrl+V / Cmd+V when not in an input -> Quick Paste Modal
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isInputActive && state.user) {
      openSnippetModal();
      navigator.clipboard?.readText?.().then(clipText => {
        if (clipText && clipText.trim()) {
          el.snippetContentInput.value = clipText;
          const detected = detectLanguage(clipText);
          el.snippetLangInput.value = detected;
        }
      }).catch(() => {});
    }
  });

  // --- Setup Event Listeners ---

  // Auth Tab Switch
  el.tabLogin.addEventListener('click', () => {
    state.isRegisterMode = false;
    el.tabLogin.className = 'flex-1 py-2 text-xs font-semibold rounded-lg bg-dark-800 text-white shadow-sm transition-all';
    el.tabRegister.className = 'flex-1 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-all';
    el.authBtnText.textContent = 'Masuk (Login)';
    el.authError.classList.add('hidden');
  });

  el.tabRegister.addEventListener('click', () => {
    state.isRegisterMode = true;
    el.tabRegister.className = 'flex-1 py-2 text-xs font-semibold rounded-lg bg-dark-800 text-white shadow-sm transition-all';
    el.tabLogin.className = 'flex-1 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-all';
    el.authBtnText.textContent = 'Daftar Sekarang';
    el.authError.classList.add('hidden');
  });

  el.authForm.addEventListener('submit', handleAuthSubmit);

  // Filter Buttons
  el.filterTabs.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.filterTabs.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'filter-btn px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-700 transition-all';
      });
      btn.className = 'filter-btn active px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 transition-all font-semibold';
      state.activeFilter = btn.getAttribute('data-filter');
      renderSnippets();
    });
  });

  // Search Input
  el.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderSnippets();
  });

  // Action Buttons
  el.btnNewSnippet.addEventListener('click', () => openSnippetModal());
  el.btnEmptyNew.addEventListener('click', () => openSnippetModal());
  el.btnCloseSnippetModal.addEventListener('click', closeSnippetModal);
  el.btnCancelSnippet.addEventListener('click', closeSnippetModal);
  el.snippetForm.addEventListener('submit', handleSnippetFormSubmit);

  el.btnRefresh.addEventListener('click', () => {
    fetchSnippets();
    showToast('Data disinkronkan.', 'info');
  });

  el.btnLanShare.addEventListener('click', openLanModal);
  el.btnCloseLanModal.addEventListener('click', closeLanModal);
  el.btnCloseLanBottom.addEventListener('click', closeLanModal);

  // Close modals on backdrop click
  el.modalSnippet.addEventListener('click', (e) => {
    if (e.target === el.modalSnippet) closeSnippetModal();
  });
  el.modalLan.addEventListener('click', (e) => {
    if (e.target === el.modalLan) closeLanModal();
  });

  // Brand Logo click resets view
  el.brandLogo.addEventListener('click', () => {
    state.searchQuery = '';
    el.searchInput.value = '';
    state.activeFilter = 'all';
    el.filterTabs.querySelector('[data-filter="all"]').click();
  });

  // Init App
  checkAuth();

})();
