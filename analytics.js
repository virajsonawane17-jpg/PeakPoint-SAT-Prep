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

  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };
  const escapeHTML = (value) => String(value || '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pct = (value) => `${Math.round(clamp(value, 0, 100))}%`;
  const attempts = data && Array.isArray(data.attempts) ? data.attempts : [];
  const sessions = data && Array.isArray(data.sessions) ? data.sessions : [];
  const snapshots = data && Array.isArray(data.snapshots) ? data.snapshots : [];

  if (user) {
    const firstName = (user.name || user.email || 'Student').split(' ')[0];
    setText('side-user-name', user.name || firstName);
  }

  const correct = attempts.filter((attempt) => attempt.correct).length;
  const total = attempts.length || 782;
  const accuracy = attempts.length ? (correct / attempts.length) * 100 : 92;
  const errors = attempts.length ? attempts.length - correct : 27;
  const latestSnapshot = snapshots[snapshots.length - 1] || null;
  const fallbackMath = 680;
  const fallbackRw = 660;
  const mathScore = latestSnapshot && Number(latestSnapshot.math) ? Number(latestSnapshot.math) : fallbackMath;
  const rwScore = latestSnapshot && Number(latestSnapshot.rw) ? Number(latestSnapshot.rw) : fallbackRw;
  const totalScore = mathScore + rwScore;
  const targetScore = data && data.profile && data.profile.targetScore ? data.profile.targetScore : 1540;

  setText('metric-attempted', String(total));
  setText('metric-accuracy', pct(accuracy));
  setText('metric-errors', String(errors));
  setText('review-action', `Review ${errors} recent ${errors === 1 ? 'error' : 'errors'}`);
  setText('score-total', String(totalScore));
  setText('score-rw', String(rwScore));
  setText('score-math', String(mathScore));
  setText('score-goal', String(targetScore));

  const today = new Date();
  setText('analytics-updated', today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const readiness = accuracy >= 90 ? 'Readiness level: Strong' : accuracy >= 75 ? 'Readiness level: Building' : 'Readiness level: Needs focus';
  setText('analytics-readiness', readiness);

  const bySection = attempts.reduce((map, attempt) => {
    const key = /math/i.test(attempt.section || attempt.skill || '') ? 'math' : 'rw';
    map[key].total += 1;
    if (attempt.correct) map[key].correct += 1;
    return map;
  }, { math: { total: 0, correct: 0 }, rw: { total: 0, correct: 0 } });

  const mathAccuracy = bySection.math.total ? (bySection.math.correct / bySection.math.total) * 100 : 94;
  const rwAccuracy = bySection.rw.total ? (bySection.rw.correct / bySection.rw.total) * 100 : 90;
  setText('math-accuracy', pct(mathAccuracy));
  setText('rw-accuracy', pct(rwAccuracy));

  document.querySelectorAll('.bar-row i').forEach((bar, index) => {
    const values = [mathAccuracy, rwAccuracy, 88];
    bar.style.setProperty('--bar-width', pct(values[index] || 88));
  });

  function renderStudyTime() {
    const plot = $('study-time-plot');
    const axis = $('study-time-xaxis');
    if (!plot || !axis) return;

    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      days.push({ key, label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), minutes: 0 });
    }

    attempts.forEach((attempt) => {
      const key = new Date(attempt.t || Date.now()).toISOString().slice(0, 10);
      const found = days.find((day) => day.key === key);
      if (found) found.minutes += 1;
    });

    if (!attempts.length) days[days.length - 1].minutes = 7;
    const maxMinutes = Math.max(8, ...days.map((day) => day.minutes));
    plot.querySelectorAll('.study-bar').forEach((bar) => bar.remove());
    days.forEach((day, index) => {
      const bar = document.createElement('span');
      bar.className = 'study-bar';
      bar.dataset.index = String(index);
      bar.style.setProperty('--study-height', `${Math.max(4, (day.minutes / maxMinutes) * 100)}%`);
      bar.style.setProperty('--bar-left', `${(index / Math.max(1, days.length - 1)) * 94}%`);
      plot.appendChild(bar);
    });
    axis.innerHTML = days.map((day) => `<span>${day.label}</span>`).join('');
  }

  function renderSkillGrid() {
    const grid = $('skill-grid');
    if (!grid) return;
    const mastery = data && data.mastery && Object.keys(data.mastery).length ? data.mastery : null;
    if (!mastery) return;

    const items = Object.entries(mastery)
      .map(([name, value]) => ({ name, value: Math.round(Number(value) || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    if (!items.length) return;
    grid.innerHTML = items.map((item) => {
      const tone = item.value >= 90 ? 'strong' : item.value >= 80 ? 'steady' : 'focus';
      return `<div class="skill-tile ${tone}">
        <span>${escapeHTML(item.name)}</span>
        <strong>${item.value}%</strong>
        <i style="--skill-width: ${clamp(item.value, 12, 100)}%;"></i>
      </div>`;
    }).join('');
  }

  function renderPracticeMix() {
    const counts = attempts.reduce((map, attempt) => {
      const section = /math/i.test(attempt.section || attempt.skill || '') ? 'math' : /vocab/i.test(attempt.skill || '') ? 'vocab' : 'rw';
      map[section] += 1;
      return map;
    }, { math: 0, rw: 0, vocab: 0 });
    const sum = counts.math + counts.rw + counts.vocab;
    if (!sum) return;
    setText('mix-math', pct((counts.math / sum) * 100));
    setText('mix-rw', pct((counts.rw / sum) * 100));
    setText('mix-vocab', pct((counts.vocab / sum) * 100));
  }

  function renderMistakes() {
    const list = $('review-list');
    if (!list || !attempts.length) return;
    const misses = attempts.filter((attempt) => !attempt.correct);
    const grouped = misses.reduce((map, attempt) => {
      const key = attempt.skill || attempt.section || 'Mixed practice';
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {});
    const items = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (!items.length) return;
    list.innerHTML = items.map(([skill, count]) => (
      `<div><strong>${escapeHTML(skill)}</strong><span>${count} recent ${count === 1 ? 'miss' : 'misses'}</span></div>`
    )).join('');
  }

  renderStudyTime();
  renderSkillGrid();
  renderPracticeMix();
  renderMistakes();

  if (sessions.length) {
    const rush = sessions.filter((session) => /rush/i.test(session.type || ''));
    if (rush.length) setText('vocab-accuracy', pct(88));
  }
})();
