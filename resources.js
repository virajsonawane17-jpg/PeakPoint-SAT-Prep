/* ============================================
   PEAKPOINT SAT PREP — Resource Library logic
   Search, filter, and render for resources.html
   ============================================ */

(async () => {
  // Members-only: the resource library requires a signed-in account.
  // requireAuth() redirects to login.html when there is no active session.
  let user = null;
  if (window.PP && PP.auth) {
    user = await PP.auth.requireAuth();
    if (!user) return;
  }

  const sideName = document.getElementById('side-user-name');
  if (sideName && user) {
    sideName.textContent = user.name || (user.email ? user.email.split('@')[0] : 'Student');
  }

  // Wire an optional Log Out button if one exists on a future app shell.
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await PP.auth.logout();
      window.location.href = 'index.html';
    });
  }

  const DATA = window.PP_RESOURCES || [];

  // ---------- DOM ----------
  const grid = document.getElementById('lib-grid');
  const emptyEl = document.getElementById('lib-empty');
  const countEl = document.getElementById('lib-count');
  const searchWrap = document.getElementById('lib-search');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const selSection = document.getElementById('filter-section');
  const selType = document.getElementById('filter-type');
  const selTopic = document.getElementById('filter-topic');
  const resetBtn = document.getElementById('lib-reset');
  const pillsWrap = document.getElementById('lib-pills');

  if (!grid) return;

  // ---------- State ----------
  const state = { q: '', section: '', type: '', topic: '' };

  // ---------- Helpers ----------
  const sectionSlug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const esc = (s) => (s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const uniqueSorted = (key) => {
    const set = new Set();
    DATA.forEach((r) => { if (r[key]) set.add(r[key]); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };

  const fillSelect = (sel, values) => {
    values.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
  };

  // Section-aware icon (document / test / formula)
  const iconFor = (r) => {
    const t = (r.materialType || '').toLowerCase();
    if (t.includes('practice test')) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
    }
    if (t.includes('formula') || t.includes('cheat')) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>';
    }
    if (t.includes('answer') || t.includes('explanation')) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  };

  // ---------- Rendering ----------
  const cardHTML = (r) => {
    const slug = sectionSlug(r.section);
    const topic = r.topic ? `<span class="res-topic">${esc(r.topic)}</span>` : '';
    return `
      <article class="res-card">
        <div class="res-top">
          <span class="res-badge sec-${slug}">${esc(r.section)}</span>
          <span class="res-type">${esc(r.materialType)}</span>
          <span class="res-icon">${iconFor(r)}</span>
        </div>
        <h3>${esc(r.title)}</h3>
        <p class="res-desc">${esc(r.description)}</p>
        ${topic}
        <div class="res-actions">
          <a class="res-btn view" href="${encodeURI(r.filePath)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            View PDF
          </a>
          <a class="res-btn download" href="${encodeURI(r.downloadUrl)}" download aria-label="Download ${esc(r.title)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span class="dl-text">Download</span>
          </a>
        </div>
      </article>`;
  };

  const matches = (r) => {
    if (state.section && r.section !== state.section) return false;
    if (state.type && r.materialType !== state.type) return false;
    if (state.topic && r.topic !== state.topic) return false;
    if (state.q) {
      const hay = (r.title + ' ' + r.section + ' ' + r.materialType + ' ' +
        r.topic + ' ' + r.description + ' ' + (r.notes || '')).toLowerCase();
      // every whitespace-separated term must be present
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  };

  const render = () => {
    const results = DATA.filter(matches);
    grid.innerHTML = results.map(cardHTML).join('');

    countEl.innerHTML = `Showing <strong>${results.length}</strong> of ${DATA.length} resources`;
    emptyEl.classList.toggle('show', results.length === 0);

    const active = state.q || state.section || state.type || state.topic;
    resetBtn.classList.toggle('show', !!active);
  };

  // ---------- Filter -> pill sync ----------
  const clearPillActive = () => pillsWrap.querySelectorAll('.lib-pill').forEach((p) => p.classList.remove('active'));

  const syncPillsFromState = () => {
    clearPillActive();
    let matchPill = null;
    if (!state.q && !state.topic) {
      if (state.section && !state.type) {
        matchPill = pillsWrap.querySelector(`[data-pill="section:${state.section}"]`);
      } else if (state.type && !state.section) {
        matchPill = pillsWrap.querySelector(`[data-pill="${state.type}"]`);
      } else if (!state.section && !state.type) {
        matchPill = pillsWrap.querySelector('[data-pill="all"]');
      }
    }
    if (matchPill) matchPill.classList.add('active');
  };

  // ---------- Events ----------
  let searchTimer;
  searchInput.addEventListener('input', () => {
    searchWrap.classList.toggle('has-value', searchInput.value.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput.value.trim();
      syncPillsFromState();
      render();
    }, 140);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchWrap.classList.remove('has-value');
    state.q = '';
    searchInput.focus();
    syncPillsFromState();
    render();
  });

  selSection.addEventListener('change', () => { state.section = selSection.value; syncPillsFromState(); render(); });
  selType.addEventListener('change', () => { state.type = selType.value; syncPillsFromState(); render(); });
  selTopic.addEventListener('change', () => { state.topic = selTopic.value; syncPillsFromState(); render(); });

  const resetAll = () => {
    state.q = state.section = state.type = state.topic = '';
    searchInput.value = '';
    searchWrap.classList.remove('has-value');
    selSection.value = selType.value = selTopic.value = '';
    syncPillsFromState();
    render();
  };
  resetBtn.addEventListener('click', resetAll);

  pillsWrap.addEventListener('click', (e) => {
    const pill = e.target.closest('.lib-pill');
    if (!pill) return;
    const val = pill.dataset.pill;

    // Reset text search + topic when using quick pills for predictable behaviour
    state.q = '';
    searchInput.value = '';
    searchWrap.classList.remove('has-value');
    state.topic = '';
    selTopic.value = '';

    if (val === 'all') {
      state.section = '';
      state.type = '';
    } else if (val.startsWith('section:')) {
      state.section = val.slice('section:'.length);
      state.type = '';
    } else {
      state.type = val;
      state.section = '';
    }
    selSection.value = state.section;
    selType.value = state.type;

    clearPillActive();
    pill.classList.add('active');
    render();
  });

  // ---------- Init ----------
  fillSelect(selSection, uniqueSorted('section'));
  fillSelect(selType, uniqueSorted('materialType'));
  fillSelect(selTopic, uniqueSorted('topic'));
  render();
})();
