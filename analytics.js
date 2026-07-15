/* ============================================
   PEAKPOINT SAT PREP — Analytics
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;
  const data = await PP.auth.loadData(user.id);
  PP.learning.normalize(data);
  const analytics = PP.learning.analytics(data);
  const el = (id) => document.getElementById(id);

  renderCards();
  renderChart();
  renderRows('domain-accuracy', Object.entries(analytics.domainAccuracy).map(([name, v]) => ({ name, value: `${v.accuracy}%`, detail: `${v.correct}/${v.total} correct` })));
  renderSkillMastery();
  renderRows('weak-areas', analytics.weakAreas.map((s) => ({ name: s.name, value: Math.round(s.mastery) + '%', detail: s.domain })));
  renderRows('strong-areas', analytics.strongAreas.map((s) => ({ name: s.name, value: Math.round(s.mastery) + '%', detail: s.domain })));
  renderRows('vocab-analytics', Object.entries(analytics.vocabularyMastery).map(([name, value]) => ({ name, value, detail: 'words' })));
  renderRows('rush-analytics', analytics.rushPerformance.map((r) => ({ name: r.mode, value: `${r.correct}/${r.total}`, detail: `${r.avgSeconds || 0}s avg · best ${r.bestStreak}` })));

  el('weekly-ai-btn').addEventListener('click', async () => {
    el('weekly-ai').innerHTML = '<strong>Weekly Progress Summary</strong><p class="card-sub">Thinking...</p>';
    const result = await PP.api.summary('weekly progress summary', analytics);
    el('weekly-ai').innerHTML = result.ok
      ? `<strong>Weekly Progress Summary</strong><p>${escapeHtml(result.text)}</p>`
      : `<strong>Weekly Progress Summary</strong><p class="card-sub">${escapeHtml(result.error || 'PeakPoint AI is unavailable, but your analytics are ready.')}</p>`;
  });

  function renderCards() {
    const p = analytics.predicted;
    const cards = [
      ['Predicted SAT', p.total || '—', p.rangeLow ? `${p.rangeLow}-${p.rangeHigh} · ${p.confidence}` : p.confidence],
      ['Reading & Writing', p.rw || '—', p.trend],
      ['Math', p.math || '—', `Updated ${new Date(p.lastUpdated).toLocaleDateString()}`],
      ['Questions', analytics.questionsCompleted, `${analytics.overallAccuracy || 0}% accuracy`],
      ['Time Spent', `${analytics.timeSpentMinutes}m`, `${analytics.averagePacing || 0}s avg pace`],
      ['Readiness', analytics.readinessLevel, `${analytics.studyPlanCompletion}% plan complete`],
      ['Mistake Resolution', `${analytics.mistakeResolutionRate}%`, 'mastered mistakes'],
      ['Practice Streak', PP.game.streak(data), 'days']
    ];
    el('analytics-cards').innerHTML = cards.map(([label, value, detail]) => `
      <div class="card stat-card-big">
        <div class="big-label">${escapeHtml(label)}</div>
        <div class="big-number">${escapeHtml(value)}</div>
        <div class="big-detail">${escapeHtml(detail)}</div>
      </div>`).join('');
  }

  function renderRows(id, rows) {
    const mount = el(id);
    if (!rows.length) {
      mount.innerHTML = '<p class="card-sub">Not enough data yet.</p>';
      return;
    }
    mount.innerHTML = rows.map((row) => `
      <div class="mini-row">
        <span><strong>${escapeHtml(row.name)}</strong><br><small class="muted">${escapeHtml(row.detail || '')}</small></span>
        <strong>${escapeHtml(row.value)}</strong>
      </div>`).join('');
  }

  function renderSkillMastery() {
    const mount = el('skill-mastery-analytics');
    const profile = Object.values(analytics.skillProfile);
    mount.innerHTML = profile.map((skill) => `
      <div class="skill-row">
        <span class="skill-name">${escapeHtml(skill.name)}</span>
        <div class="skill-bar"><div class="skill-bar-fill ${fillClass(skill.mastery)}" style="width:${skill.mastery}%"></div></div>
        <span class="skill-pct">${Math.round(skill.mastery)}%</span>
      </div>`).join('');
  }

  function fillClass(m) {
    if (m >= 85) return 'fill-top';
    if (m >= 65) return 'fill-high';
    if (m >= 40) return 'fill-mid';
    return 'fill-low';
  }

  function renderChart() {
    const canvas = el('analytics-chart');
    const points = data.learning.scorePredictions.length ? data.learning.scorePredictions : (data.snapshots || []).map((s) => ({ total: s.math + s.rw }));
    if (points.length < 2) {
      canvas.style.display = 'none';
      el('analytics-chart-empty').style.display = '';
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || canvas.parentElement.clientWidth - 56;
    const h = 240;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const values = points.map((p) => p.total || (p.math + p.rw)).filter(Boolean);
    const min = Math.max(400, Math.min(...values) - 60);
    const max = Math.min(1600, Math.max(...values) + 60);
    const pad = { l: 46, r: 16, t: 16, b: 28 };
    const x = (i) => pad.l + (i / (values.length - 1)) * (w - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
    ctx.strokeStyle = 'rgba(30, 30, 58, 0.12)';
    ctx.fillStyle = '#71717a';
    ctx.font = '11px Instrument Sans, sans-serif';
    for (let i = 0; i <= 4; i++) {
      const v = min + (i / 4) * (max - min);
      ctx.beginPath();
      ctx.moveTo(pad.l, y(v));
      ctx.lineTo(w - pad.r, y(v));
      ctx.stroke();
      ctx.fillText(String(Math.round(v / 10) * 10), 4, y(v) + 4);
    }
    const grad = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0);
    grad.addColorStop(0, '#0ea5e9');
    grad.addColorStop(1, '#7dd3fc');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((value, i) => i ? ctx.lineTo(x(i), y(value)) : ctx.moveTo(x(i), y(value)));
    ctx.stroke();
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
})();
