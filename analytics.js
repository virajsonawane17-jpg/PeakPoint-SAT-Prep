/* ============================================
   PEAKPOINT SAT PREP — Analytics UI
   ============================================ */

(async () => {
  let user = null;
  let data = null;

  if (window.PP && PP.auth) {
    user = await PP.auth.requireAuth();
    if (!user) return;
    try {
      data = await PP.auth.loadData(user.id);
    } catch {
      data = null;
    }
  }

  const analytics = window.PeakPointAnalytics.build(user, data);
  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };
  const setHref = (id, value) => {
    const el = $(id);
    if (el) el.setAttribute('href', value);
  };
  const { escapeHTML, pctText, clamp } = window.PeakPointAnalytics;

  if (user) {
    const firstName = (user.name || user.email || 'Student').split(' ')[0];
    setText('side-user-name', user.name || firstName);
  }

  setText('metric-attempted', analytics.totalQuestions.toLocaleString());
  setText('metric-accuracy', analytics.totalQuestions ? pctText(analytics.accuracy) : '0%');
  setText('metric-saved', String(analytics.savedQuestions));
  setText('metric-errors', String(analytics.recentErrors));
  setText('score-total', String(analytics.scores.total));
  setText('score-rw', String(analytics.scores.rw));
  setText('score-math', String(analytics.scores.math));
  setText('score-goal', String(analytics.scores.target));
  setText('math-accuracy', pctText(analytics.sections.math.accuracy));
  setText('rw-accuracy', pctText(analytics.sections.rw.accuracy));
  setText('vocab-accuracy', analytics.vocab.attempted ? pctText(analytics.sections.vocab.accuracy) : `${analytics.vocab.mastered} mastered`);
  setText('mix-math', pctText(analytics.mix.math));
  setText('mix-rw', pctText(analytics.mix.rw));
  setText('mix-vocab', pctText(analytics.mix.vocab));
  setText('analytics-readiness', analytics.readiness);
  setText('analytics-updated', new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  const delta = analytics.scores.delta;
  const trend = document.querySelector('.trend-pill');
  if (trend) trend.textContent = `${delta >= 0 ? '+' : ''}${delta} score momentum`;

  document.querySelectorAll('.bar-row i').forEach((bar, index) => {
    const values = [analytics.sections.math.accuracy, analytics.sections.rw.accuracy, analytics.sections.vocab.accuracy];
    bar.style.setProperty('--bar-width', pctText(values[index] || 0));
  });

  const mixRing = document.querySelector('.mix-ring');
  if (mixRing) {
    const mathEnd = clamp(analytics.mix.math, 0, 100);
    const rwEnd = clamp(mathEnd + analytics.mix.rw, 0, 100);
    mixRing.style.background = `conic-gradient(var(--accent) 0 ${mathEnd}%, #22c55e ${mathEnd}% ${rwEnd}%, #f59e0b ${rwEnd}% 100%)`;
  }

  window.PeakPointAnalytics.renderStudyTime($('study-time-plot'), $('study-time-xaxis'), analytics);

  function renderSkillGrid() {
    const grid = $('skill-grid');
    if (!grid) return;
    const items = analytics.skills.length ? analytics.skills : [
      { name: 'Question Bank', value: 0, detail: 'Start a set', tone: 'focus' },
      { name: 'Vocabulary Mastery', value: 0, detail: 'Practice words', tone: 'focus' },
      { name: 'Study Streak', value: 0, detail: 'Log activity', tone: 'focus' },
    ];

    grid.innerHTML = items.map((item) => (
      `<div class="skill-tile ${item.tone}">
        <span>${escapeHTML(item.name)}</span>
        <strong>${Math.round(item.value)}%</strong>
        <small>${escapeHTML(item.detail)}</small>
        <i style="--skill-width: ${clamp(item.value, 8, 100)}%;"></i>
      </div>`
    )).join('');
  }

  function renderMistakes() {
    const list = $('review-list');
    if (!list) return;
    const items = analytics.mistakes.length ? analytics.mistakes : [
      { name: 'No mistake pattern yet', count: 0 },
      { name: 'Start practice to unlock trends', count: 0 },
    ];

    list.innerHTML = items.map((item) => (
      `<div>
        <strong>${escapeHTML(item.name)}</strong>
        <span>${item.count ? `${item.count} recent ${item.count === 1 ? 'miss' : 'misses'}` : 'Ready when you are'}</span>
      </div>`
    )).join('');
  }

  function renderMomentum() {
    setText('momentum-title', analytics.nextAction.title);
    setText('momentum-detail', analytics.nextAction.detail);
    setText('momentum-cta', analytics.nextAction.cta);
    setHref('momentum-cta', analytics.nextAction.href);
    setText('momentum-streak', `${analytics.activeDays} day${analytics.activeDays === 1 ? '' : 's'}`);
    setText('momentum-xp', analytics.vocab.xp.toLocaleString());
    setText('momentum-vocab', `${analytics.vocab.mastered} / ${analytics.vocab.total.toLocaleString()}`);
    setText('review-action', analytics.nextAction.cta);
    setHref('review-action', analytics.nextAction.href);
  }

  function renderAchievements() {
    const list = $('achievement-list');
    if (!list) return;
    list.innerHTML = analytics.achievements.map((achievement) => (
      `<li class="${achievement.unlocked ? 'unlocked' : ''}">
        <span aria-hidden="true"></span>
        <div>
          <strong>${escapeHTML(achievement.title)}</strong>
          <small>${escapeHTML(achievement.detail)}</small>
        </div>
      </li>`
    )).join('');
  }

  renderSkillGrid();
  renderMistakes();
  renderMomentum();
  renderAchievements();
})();
