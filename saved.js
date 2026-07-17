/* ============================================
   PEAKPOINT SAT PREP - Saved UI
   Frontend-only interactions.
   ============================================ */

(() => {
  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  const filterButtons = Array.from(document.querySelectorAll('[data-saved-filter]'));
  const cards = Array.from(document.querySelectorAll('.saved-question-card'));
  const searchInput = document.getElementById('saved-search');
  const clearButton = document.querySelector('[data-clear-search]');
  let activeFilter = 'all';

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
        (activeFilter === 'Due' && tags.includes('due'));
      const searchMatches = !query || text.includes(query) || tags.includes(query);

      card.classList.toggle('is-hidden', !filterMatches || !searchMatches);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.savedFilter || 'all';
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
        const selected = item.dataset.savedFilter === 'all';
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      applyFilters();
    });
  }

  document.querySelectorAll('[data-unsave]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.saved-question-card');
      if (!card) return;
      card.classList.add('is-removing');
      window.setTimeout(() => {
        card.classList.add('is-hidden');
        card.classList.remove('is-removing');
      }, 180);
    });
  });
})();
