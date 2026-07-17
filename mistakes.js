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
})();
