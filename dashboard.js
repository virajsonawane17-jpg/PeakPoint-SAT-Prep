/* ============================================
   PEAKPOINT SAT PREP — Dashboard logic
   Renders personalized stats from the current
   user's stored study data.
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;

  const data = await PP.auth.loadData(user.id);

  /* ---------- Greeting & rank ---------- */
  document.getElementById('dash-name').textContent = user.name.split(' ')[0];

  const lvl = PP.game.levelInfo(data.xp);
  document.getElementById('rank-icon').textContent = lvl.rank.icon;
  document.getElementById('rank-name').textContent = lvl.rank.name;
  document.getElementById('rank-level').textContent = 'Lv. ' + lvl.level;

  /* ---------- Diagnostic banner ---------- */
  if (!data.diagnosticDone) {
    document.getElementById('diagnostic-banner').style.display = '';
  }

  /* ---------- Score estimate ---------- */
  const scores = PP.game.estimatedScores(data);
  document.getElementById('score-total').textContent = scores.total != null ? scores.total : '—';
  document.getElementById('score-math').textContent = scores.math != null ? scores.math : '—';
  document.getElementById('score-rw').textContent = scores.rw != null ? scores.rw : '—';

  /* ---------- XP / level ---------- */
  document.getElementById('xp-total').textContent = (data.xp || 0).toLocaleString() + ' XP';
  document.getElementById('xp-fill').style.width = lvl.pct + '%';
  document.getElementById('xp-detail').textContent =
    `${lvl.into.toLocaleString()} / ${lvl.need.toLocaleString()} XP to level ${lvl.level + 1}`;

  /* ---------- Daily goal ring ---------- */
  const today = PP.game.todayCount(data);
  const goal = PP.game.DAILY_GOAL;
  const ring = document.getElementById('goal-ring');
  const circumference = 2 * Math.PI * 42;
  const done = Math.min(1, today / goal);
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference * (1 - done);
  document.getElementById('goal-text').textContent = `${today}/${goal}`;
  if (today >= goal) {
    document.getElementById('goal-detail').textContent = '🎯 Goal complete! Every extra question is bonus fuel.';
  }

  /* ---------- Streak ---------- */
  const streak = PP.game.streak(data);
  document.getElementById('streak-count').textContent = streak;
  const streakDetail = document.getElementById('streak-detail');
  if (streak === 0) streakDetail.textContent = 'Practice today to start a streak.';
  else if (today === 0) streakDetail.textContent = `${streak}-day streak — practice today to keep it alive!`;
  else streakDetail.textContent = `${streak} day${streak === 1 ? '' : 's'} in a row. Keep climbing.`;

  /* ---------- Skill mastery bars ---------- */
  function fillClass(m) {
    if (m >= 85) return 'fill-top';
    if (m >= 65) return 'fill-high';
    if (m >= 40) return 'fill-mid';
    return 'fill-low';
  }

  function renderMastery(section, mountId) {
    const mount = document.getElementById(mountId);
    const skills = PP.questions.SKILLS.filter(s => s.section === section);
    mount.innerHTML = '';
    for (const s of skills) {
      const m = data.mastery[s.id];
      const row = document.createElement('div');
      row.className = 'skill-row';
      row.innerHTML = `
        <span class="skill-name">${s.name}</span>
        <div class="skill-bar"><div class="skill-bar-fill ${m != null ? fillClass(m) : ''}" style="width:${m != null ? m : 0}%"></div></div>
        <span class="skill-pct">${m != null ? Math.round(m) + '%' : '—'}</span>
        <a class="skill-drill" href="practice.html?mode=skill&skill=${s.id}">Drill</a>`;
      mount.appendChild(row);
    }
  }

  renderMastery('math', 'mastery-math');
  renderMastery('rw', 'mastery-rw');

  /* ---------- Progress chart ---------- */
  (function drawChart() {
    const canvas = document.getElementById('progress-chart');
    const snaps = data.snapshots || [];
    if (snaps.length < 2) {
      canvas.style.display = 'none';
      document.getElementById('chart-empty').style.display = '';
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

    const totals = snaps.map(s => s.math + s.rw);
    const min = Math.max(400, Math.min(...totals) - 60);
    const max = Math.min(1600, Math.max(...totals) + 60);
    const padL = 46, padR = 16, padT = 16, padB = 28;
    const plotW = w - padL - padR, plotH = h - padT - padB;

    const x = (i) => padL + (snaps.length === 1 ? plotW / 2 : (i / (snaps.length - 1)) * plotW);
    const y = (v) => padT + (1 - (v - min) / (max - min)) * plotH;

    // gridlines
    ctx.strokeStyle = 'rgba(30, 30, 58, 0.9)';
    ctx.fillStyle = '#6A6A85';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.lineWidth = 1;
    const stepCount = 4;
    for (let i = 0; i <= stepCount; i++) {
      const v = min + (i / stepCount) * (max - min);
      ctx.beginPath();
      ctx.moveTo(padL, y(v));
      ctx.lineTo(w - padR, y(v));
      ctx.stroke();
      ctx.fillText(String(Math.round(v / 10) * 10), 4, y(v) + 4);
    }

    // score line
    const grad = ctx.createLinearGradient(padL, 0, w - padR, 0);
    grad.addColorStop(0, '#6C63FF');
    grad.addColorStop(1, '#A78BFF');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    totals.forEach((v, i) => i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)));
    ctx.stroke();

    // points
    ctx.fillStyle = '#A78BFF';
    totals.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(x(i), y(v), 4, 0, Math.PI * 2);
      ctx.fill();
    });
  })();

  /* ---------- Badges ---------- */
  const grid = document.getElementById('badge-grid');
  const earned = new Set(data.badges || []);
  for (const b of PP.game.BADGES) {
    const el = document.createElement('div');
    el.className = 'badge ' + (earned.has(b.id) ? 'earned' : 'locked');
    el.innerHTML = `
      <span class="badge-icon">${b.icon}</span>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>`;
    grid.appendChild(el);
  }
  document.getElementById('badge-count').textContent = `${earned.size}/${PP.game.BADGES.length} earned`;

  /* ---------- Target score & test date ---------- */
  const targetSel = document.getElementById('target-score');
  const dateInput = document.getElementById('test-date');
  const summary = document.getElementById('target-summary');

  if (data.profile.targetScore) targetSel.value = data.profile.targetScore;
  if (data.profile.testDate) dateInput.value = data.profile.testDate;

  function updateTargetSummary() {
    const target = data.profile.targetScore;
    const dateStr = data.profile.testDate;
    const parts = [];
    if (target && scores.total != null) {
      const gap = target - scores.total;
      parts.push(gap > 0 ? `${gap} points to your ${target} goal.` : `🎉 You're at or above your ${target} goal!`);
    } else if (target) {
      parts.push(`Goal: ${target}. Take the diagnostic to see your gap.`);
    }
    if (dateStr) {
      const days = Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000);
      if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'} until test day.`);
      else if (days === 0) parts.push('Test day is today — good luck! 🚀');
    }
    summary.textContent = parts.join(' ') || 'Set a target score and test date to see your countdown.';
  }

  function saveProfile() {
    data.profile.targetScore = targetSel.value ? parseInt(targetSel.value, 10) : null;
    data.profile.testDate = dateInput.value || null;
    PP.auth.saveData(user.id, data);
    updateTargetSummary();
  }

  targetSel.addEventListener('change', saveProfile);
  dateInput.addEventListener('change', saveProfile);
  updateTargetSummary();

  /* ---------- Logout ---------- */
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await PP.auth.logout();
    window.location.href = 'index.html';
  });
})();
