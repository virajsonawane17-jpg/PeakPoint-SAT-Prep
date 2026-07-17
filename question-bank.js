/* ============================================
   PEAKPOINT SAT PREP - Question Bank UI
   Frontend-only interactions.
   ============================================ */

(() => {
  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  const filterButtons = Array.from(document.querySelectorAll('[data-bank-filter]'));
  const subjectCards = Array.from(document.querySelectorAll('[data-subject-card]'));
  const searchInput = document.getElementById('bank-search');
  const modal = document.getElementById('bank-modal');
  const modalTitle = document.getElementById('bank-modal-title');
  const modalCopy = document.getElementById('bank-modal-copy');
  let activeFilter = 'all';

  const normalize = (value) => value.toLowerCase().replace(/\s+/g, ' ').trim();

  const applyFilters = () => {
    const query = normalize(searchInput ? searchInput.value : '');

    subjectCards.forEach((card) => {
      const subject = card.dataset.subjectCard || '';
      const subjectMatches = activeFilter === 'all' || subject === activeFilter;
      let hasVisibleDomain = false;

      card.querySelectorAll('[data-domain-group]').forEach((group) => {
        const text = normalize(group.textContent || '');
        const searchMatches = !query || text.includes(query);
        group.classList.toggle('is-filter-hidden', !searchMatches);
        if (searchMatches) hasVisibleDomain = true;
      });

      card.classList.toggle('is-hidden', !subjectMatches || !hasVisibleDomain);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.bankFilter || 'all';
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

  document.querySelectorAll('.domain-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('[data-domain-group]');
      const isOpen = group ? group.classList.toggle('is-open') : false;
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });

  const showModal = (title, copy) => {
    if (!modal || !modalTitle || !modalCopy) return;
    modalTitle.textContent = title;
    modalCopy.textContent = copy;
    modal.hidden = false;
    const closeButton = modal.querySelector('[data-close-modal]');
    if (closeButton) closeButton.focus();
  };

  document.querySelectorAll('[data-start-subject]').forEach((button) => {
    button.addEventListener('click', () => {
      const subject = button.dataset.startSubject || 'SAT';
      showModal(
        `Start ${subject} practice`,
        `This will launch a focused ${subject} question set when question-bank functionality is connected.`
      );
    });
  });

  document.querySelectorAll('[data-skill]').forEach((button) => {
    button.addEventListener('click', () => {
      const skill = button.dataset.skill || 'this skill';
      showModal(
        `Practice ${skill}`,
        `This will open a targeted practice set for ${skill} once the question engine is connected.`
      );
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      if (modal) modal.hidden = true;
    });
  });

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.hidden = true;
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      modal.hidden = true;
    }
  });
})();
