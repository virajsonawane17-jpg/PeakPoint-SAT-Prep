/* ============================================
   PEAKPOINT SAT PREP — Vocabulary Practice
   ============================================ */

(async () => {
  let userId = 'guest';
  if (window.PP && PP.auth) {
    const user = await PP.auth.requireAuth();
    if (!user) return;
    userId = user.id || user.email || 'student';
    const firstName = (user.name || user.email || 'Student').split(' ')[0];
    const sideName = document.getElementById('side-user-name');
    if (sideName) sideName.textContent = user.name || firstName;
  }

  const words = Array.isArray(window.PP_VOCAB_WORDS) ? window.PP_VOCAB_WORDS : [];
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = `pp_vocab_progress:${userId}`;
  const PAGE_SIZE = 96;
  const STATUS_LABEL = {
    new: 'New',
    learning: 'Learning',
    shaky: 'Shaky',
    mastered: 'Mastered',
  };
  const DIFFICULTY_ORDER = { Core: 1, Medium: 2, Advanced: 3 };
  const STATUS_ORDER = { new: 1, learning: 2, shaky: 3, mastered: 4 };

  const tabs = Array.from(document.querySelectorAll('[data-vocab-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-vocab-panel]'));
  const grid = $('word-grid');
  const search = $('vocab-search');
  const empty = $('word-empty');
  const totalEl = $('vocab-total');
  const visibleEl = $('vocab-visible');
  const masteredEl = $('vocab-mastered');
  const resultsCount = $('vocab-results-count');
  const loadMore = $('vocab-load-more');
  const reset = $('vocab-reset');
  const controls = {
    difficulty: $('vocab-difficulty'),
    pos: $('vocab-pos'),
    status: $('vocab-status'),
    alpha: $('vocab-alpha'),
    length: $('vocab-length'),
    sort: $('vocab-sort'),
  };

  const filters = {
    query: '',
    difficulty: 'all',
    pos: 'all',
    status: 'all',
    alpha: 'all',
    length: 'all',
    sort: 'az',
  };
  let visibleLimit = PAGE_SIZE;
  let progress = loadProgress();
  let filteredWords = [];

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (_) {
      // Local progress is best effort.
    }
  }

  function getStatus(item) {
    return progress[item.id] || 'new';
  }

  function setStatus(id, status) {
    if (status === 'new') delete progress[id];
    else progress[id] = status;
    saveProgress();
    render();
  }

  function showPanel(name) {
    tabs.forEach((tab) => {
      const active = tab.dataset.vocabTab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.vocabPanel === name);
    });
  }

  function populatePartOfSpeech() {
    if (!controls.pos) return;
    const counts = words.reduce((acc, item) => {
      const key = item.partOfSpeech || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .forEach((pos) => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = `${pos} (${counts[pos].toLocaleString()})`;
        controls.pos.appendChild(option);
      });
  }

  function syncFiltersFromControls() {
    filters.query = search ? search.value.trim().toLowerCase() : '';
    filters.difficulty = controls.difficulty ? controls.difficulty.value : 'all';
    filters.pos = controls.pos ? controls.pos.value : 'all';
    filters.status = controls.status ? controls.status.value : 'all';
    filters.alpha = controls.alpha ? controls.alpha.value : 'all';
    filters.length = controls.length ? controls.length.value : 'all';
    filters.sort = controls.sort ? controls.sort.value : 'az';
  }

  function applyFilters() {
    const q = filters.query;
    filteredWords = words.filter((item) => {
      const status = getStatus(item);
      if (q && !`${item.word} ${item.definition} ${item.partOfSpeech}`.toLowerCase().includes(q)) return false;
      if (filters.difficulty !== 'all' && item.difficulty !== filters.difficulty) return false;
      if (filters.pos !== 'all' && item.partOfSpeech !== filters.pos) return false;
      if (filters.status !== 'all' && status !== filters.status) return false;
      if (filters.alpha !== 'all' && item.alphabetGroup !== filters.alpha) return false;
      if (filters.length !== 'all' && item.lengthBand !== filters.length) return false;
      return true;
    });

    filteredWords.sort((a, b) => {
      if (filters.sort === 'za') return b.word.localeCompare(a.word);
      if (filters.sort === 'difficulty') {
        return (DIFFICULTY_ORDER[b.difficulty] || 0) - (DIFFICULTY_ORDER[a.difficulty] || 0) ||
          a.word.localeCompare(b.word);
      }
      if (filters.sort === 'status') {
        return (STATUS_ORDER[getStatus(a)] || 0) - (STATUS_ORDER[getStatus(b)] || 0) ||
          a.word.localeCompare(b.word);
      }
      return a.word.localeCompare(b.word);
    });
  }

  function renderStats() {
    const mastered = words.filter((item) => getStatus(item) === 'mastered').length;
    if (totalEl) totalEl.textContent = words.length.toLocaleString();
    if (visibleEl) visibleEl.textContent = filteredWords.length.toLocaleString();
    if (masteredEl) masteredEl.textContent = mastered.toLocaleString();
    if (resultsCount) {
      const showing = Math.min(visibleLimit, filteredWords.length);
      resultsCount.textContent = filteredWords.length
        ? `Showing ${showing.toLocaleString()} of ${filteredWords.length.toLocaleString()} matching words`
        : '';
    }
  }

  function renderCard(item) {
    const status = getStatus(item);
    const statusLabel = STATUS_LABEL[status] || 'New';
    const buttons = ['learning', 'shaky', 'mastered'].map((nextStatus) => {
      const active = status === nextStatus ? ' is-active' : '';
      return `<button class="word-action ${nextStatus}${active}" type="button" data-word-id="${escapeHTML(item.id)}" data-status="${nextStatus}">${STATUS_LABEL[nextStatus]}</button>`;
    }).join('');
    return `
      <article class="word-card" data-difficulty="${escapeHTML(item.difficulty)}">
        <div class="word-card-head">
          <strong>${escapeHTML(item.word)}</strong>
          <span class="word-status ${escapeHTML(status)}">${escapeHTML(statusLabel)}</span>
        </div>
        <p class="word-definition">${escapeHTML(item.definition)}</p>
        <div class="word-tags" aria-label="Word categories">
          <span class="word-tag">${escapeHTML(item.partOfSpeech || 'Other')}</span>
          <span class="word-tag">${escapeHTML(item.difficulty)}</span>
          <span class="word-tag">${escapeHTML(item.lengthBand)}</span>
          <span class="word-tag">${escapeHTML(item.alphabetGroup)}</span>
        </div>
        <div class="word-actions" aria-label="Set review status">
          ${buttons}
          ${status !== 'new' ? `<button class="word-action" type="button" data-word-id="${escapeHTML(item.id)}" data-status="new">Reset</button>` : ''}
        </div>
      </article>
    `;
  }

  function render() {
    if (!grid) return;
    syncFiltersFromControls();
    applyFilters();
    const visible = filteredWords.slice(0, visibleLimit);
    grid.innerHTML = visible.map(renderCard).join('');
    if (empty) empty.classList.toggle('show', filteredWords.length === 0);
    if (loadMore) {
      loadMore.hidden = visibleLimit >= filteredWords.length;
      loadMore.textContent = `Load ${Math.min(PAGE_SIZE, Math.max(0, filteredWords.length - visibleLimit))} more`;
    }
    renderStats();
  }

  function resetFilters() {
    if (search) search.value = '';
    Object.entries(controls).forEach(([key, control]) => {
      if (!control) return;
      control.value = key === 'sort' ? 'az' : 'all';
    });
    visibleLimit = PAGE_SIZE;
    render();
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.vocabTab));
  });

  document.querySelectorAll('.vocab-mode-card button').forEach((button, index) => {
    button.addEventListener('click', () => {
      showPanel('library');
      if (controls.status) controls.status.value = index === 2 ? 'learning' : 'new';
      if (controls.sort) controls.sort.value = index === 1 ? 'difficulty' : 'az';
      visibleLimit = PAGE_SIZE;
      render();
      const library = $('vocab-library');
      if (library) library.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  [search, ...Object.values(controls)].forEach((control) => {
    if (!control) return;
    control.addEventListener(control === search ? 'input' : 'change', () => {
      visibleLimit = PAGE_SIZE;
      render();
    });
  });

  if (loadMore) {
    loadMore.addEventListener('click', () => {
      visibleLimit += PAGE_SIZE;
      render();
    });
  }

  if (reset) reset.addEventListener('click', resetFilters);

  if (grid) {
    grid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-word-id][data-status]');
      if (!button) return;
      setStatus(button.dataset.wordId, button.dataset.status);
    });
  }

  populatePartOfSpeech();
  render();
})();
