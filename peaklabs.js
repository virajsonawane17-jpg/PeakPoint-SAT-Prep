/* ============================================
   PEAKPOINT SAT PREP - PeakLabs UI
   Frontend-only interactions.
   ============================================ */

(() => {
  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  const indicator = document.getElementById('crafting-indicator');

  document.querySelectorAll('[data-generator-card]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      card.classList.toggle('is-expanded');
    });
  });

  document.querySelectorAll('[data-generate]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.generate || 'Similar';
      const card = button.closest('[data-generator-card]');
      if (card) card.classList.add('is-expanded');

      if (indicator) {
        indicator.textContent = `Crafting ${kind.toLowerCase()} set...`;
        indicator.classList.add('is-crafting');
      }

      window.setTimeout(() => {
        if (indicator) {
          indicator.textContent = `${kind} set ready`;
          indicator.classList.remove('is-crafting');
        }
      }, 520);
    });
  });
})();
