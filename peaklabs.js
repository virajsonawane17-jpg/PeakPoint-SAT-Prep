/* ============================================
   PEAKPOINT SAT PREP - PeakLabs UI
   Frontend-only interactions.
   ============================================ */

(() => {
  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  const indicator = document.getElementById('crafting-indicator');
  const list = document.getElementById('practice-set-list');
  const generatedSets = {
    Similar: {
      title: 'Fresh Similar Equation Set',
      copy: '10 new one-variable equation questions with the same solving pattern.',
      level: 'Medium',
      className: 'medium',
      time: '9 min',
      progress: 0
    },
    Harder: {
      title: 'Hard Algebra Trap Set',
      copy: '12 tougher equations with fractions, distribution, and answer-choice traps.',
      level: 'Hard',
      className: 'hard',
      time: '14 min',
      progress: 0
    },
    Easier: {
      title: 'Foundation Reset Set',
      copy: '8 simpler equation questions to rebuild speed and confidence.',
      level: 'Easy',
      className: 'easy',
      time: '6 min',
      progress: 0
    }
  };

  document.querySelectorAll('.filter-group button').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('.filter-group');
      if (!group) return;
      group.querySelectorAll('button').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
    });
  });

  document.querySelectorAll('[data-generator-card]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      card.classList.toggle('is-expanded');
    });
  });

  const createPracticeCard = (kind) => {
    const set = generatedSets[kind] || generatedSets.Similar;
    const card = document.createElement('article');
    card.className = 'practice-set-card';
    card.innerHTML = `
      <div class="set-card-main">
        <span class="difficulty-badge ${set.className}">${set.level}</span>
        <h3>${set.title}</h3>
        <p>${set.copy}</p>
        <div class="set-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${set.progress}">
          <span style="--progress: ${set.progress}%;"></span>
        </div>
      </div>
      <div class="set-card-side">
        <span>${set.time}</span>
        <button type="button">Start Practice</button>
      </div>
    `;
    return card;
  };

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
        if (list) {
          list.prepend(createPracticeCard(kind));
        }
        if (indicator) {
          indicator.textContent = `${kind} set ready`;
          indicator.classList.remove('is-crafting');
        }
      }, 520);
    });
  });
})();
