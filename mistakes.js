/* ============================================
   PEAKPOINT SAT PREP - Mistakes Log UI
   Frontend-only interactions.
   ============================================ */

(() => {
  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  const filterButtons = Array.from(document.querySelectorAll('[data-mistake-filter]'));
  const cards = Array.from(document.querySelectorAll('.mistake-card'));
  const searchInput = document.getElementById('mistakes-search');
  const clearButton = document.querySelector('[data-clear-mistakes]');
  const notebookModal = document.getElementById('notebook-modal');
  const notebookTitle = document.getElementById('notebook-title');
  const notebookQuestion = document.getElementById('notebook-question');
  const notebookText = document.getElementById('notebook-text');
  const notebookStorageKey = 'peakpoint-mistake-notebook';
  const notebookNotes = new Map();
  let activeNotebookCard = null;
  let activeFilter = 'all';

  try {
    Object.entries(JSON.parse(localStorage.getItem(notebookStorageKey) || '{}')).forEach(([title, note]) => {
      notebookNotes.set(title, note);
    });
  } catch {
    // Notes still work during the session if localStorage is unavailable.
  }

  const normalize = (value) => value.toLowerCase().replace(/\s+/g, ' ').trim();

  const applyFilters = () => {
    const query = normalize(searchInput ? searchInput.value : '');

    cards.forEach((card) => {
      const subject = card.dataset.subject || '';
      const tags = normalize(card.dataset.tags || '');
      const text = normalize(card.textContent || '');
      const filterMatches =
        activeFilter === 'all' ||
        subject === activeFilter ||
        (activeFilter === 'Repeated' && tags.includes('repeated'));
      const searchMatches = !query || text.includes(query) || tags.includes(query);

      card.classList.toggle('is-hidden', !filterMatches || !searchMatches);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.mistakeFilter || 'all';
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      activeFilter = 'all';
      if (searchInput) searchInput.value = '';
      filterButtons.forEach((item) => {
        const selected = item.dataset.mistakeFilter === 'all';
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      applyFilters();
    });
  }

  document.querySelectorAll('[data-understood]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.mistake-card');
      if (!card) return;
      card.classList.toggle('is-resolved');
      button.textContent = card.classList.contains('is-resolved') ? 'Understood' : 'Mark understood';
    });
  });

  document.querySelectorAll('[data-notebook]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.mistake-card');
      if (!card || !notebookModal || !notebookTitle || !notebookQuestion || !notebookText) return;
      activeNotebookCard = card;
      const title = card.querySelector('h3') ? card.querySelector('h3').textContent : 'this mistake';
      const summary = card.querySelector('p') ? card.querySelector('p').textContent : '';
      notebookTitle.textContent = `Mistake notebook: ${title}`;
      notebookQuestion.textContent = summary;
      notebookText.value = notebookNotes.get(title) || '';
      notebookModal.hidden = false;
      notebookText.focus();
    });
  });

  document.querySelectorAll('[data-close-notebook]').forEach((button) => {
    button.addEventListener('click', () => {
      if (notebookModal) notebookModal.hidden = true;
    });
  });

  const saveNotebook = () => {
    if (!activeNotebookCard || !notebookText || !notebookModal) return;
    const title = activeNotebookCard.querySelector('h3') ? activeNotebookCard.querySelector('h3').textContent : 'mistake';
    notebookNotes.set(title, notebookText.value);
    try {
      localStorage.setItem(notebookStorageKey, JSON.stringify(Object.fromEntries(notebookNotes)));
    } catch {
      // Best-effort browser persistence only.
    }
    const button = activeNotebookCard.querySelector('[data-notebook]');
    if (button) button.textContent = 'Notebook saved';
    notebookModal.hidden = true;
  };

  document.querySelectorAll('[data-save-notebook]').forEach((button) => {
    button.addEventListener('click', saveNotebook);
  });

  if (notebookModal) {
    notebookModal.addEventListener('click', (event) => {
      if (event.target === notebookModal) notebookModal.hidden = true;
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && notebookModal && !notebookModal.hidden) {
      notebookModal.hidden = true;
    }
  });
})();
