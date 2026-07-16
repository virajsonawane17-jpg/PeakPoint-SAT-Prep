/* ============================================
   PEAKPOINT SAT PREP — Vocabulary Practice
   ============================================ */

(async () => {
  if (window.PP && PP.auth) {
    const user = await PP.auth.requireAuth();
    if (!user) return;
  }

  const words = [
    ['Abandon', 'learning'], ['Abashed', 'shaky'], ['Abate', 'shaky'], ['Abdicate', 'shaky'], ['Aberration', 'shaky'],
    ['Abhor', 'shaky'], ['Abide', 'shaky'], ['Ability', 'mastered'], ['Abject', 'shaky'], ['Abjure', 'missed'],
    ['Abominable', 'shaky'], ['Abortive', 'missed'], ['Abridge', 'shaky'], ['Abrupt', 'shaky'], ['Abscond', 'missed'],
    ['Absolve', 'shaky'], ['Absorb', 'mastered'], ['Abstain', 'shaky'], ['Abstemious', 'missed'], ['Abstinent', 'learning'],
    ['Abstract', 'shaky'], ['Abstruse', 'missed'], ['Abysmal', 'shaky'], ['Academic', 'mastered'], ['Accept', 'mastered'],
    ['Accessible', 'shaky'], ['Accidental', 'shaky'], ['Accolade', 'learning'], ['Accommodate', 'shaky'], ['Accumulate', 'shaky']
  ];

  const tabs = Array.from(document.querySelectorAll('[data-vocab-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-vocab-panel]'));
  const grid = document.getElementById('word-grid');
  const search = document.getElementById('vocab-search');
  const empty = document.getElementById('word-empty');

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

  function renderWords(query) {
    if (!grid) return;
    const q = String(query || '').trim().toLowerCase();
    const filtered = words.filter(([word]) => word.toLowerCase().includes(q));
    grid.innerHTML = filtered.map(([word, status]) => `
      <article class="word-card ${status}">
        <strong>${word}</strong>
        ${status === 'learning' ? '<span class="word-status">Learning</span>' : ''}
      </article>
    `).join('');
    if (empty) empty.classList.toggle('show', filtered.length === 0);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.vocabTab));
  });

  if (search) {
    search.addEventListener('input', () => renderWords(search.value));
  }

  renderWords('');
})();
