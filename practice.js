/* ============================================
   PEAKPOINT SAT PREP — Practice session engine
   Modes:
     ?mode=diagnostic          — 15 fixed questions, one per skill
     ?mode=adaptive            — endless personalized practice
     ?mode=adaptive&section=x  — adaptive, limited to math|rw
     ?mode=skill&skill=<id>    — drill one skill
     ?mode=sprint              — 10 questions against a 10-minute clock
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;

  const data = await PP.auth.loadData(user.id);
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'adaptive';
  const section = params.get('section') || null;
  const skillParam = params.get('skill') || null;

  const SPRINT_COUNT = 10;
  const SPRINT_SECONDS = 600;

  const MODE_LABELS = {
    diagnostic: '🩺 Diagnostic',
    adaptive: section === 'math' ? '📐 Math Focus' : section === 'rw' ? '📖 R&W Focus' : '🧠 Adaptive Mission',
    skill: '🎯 Skill Drill',
    sprint: '⏱️ Rocket Sprint'
  };

  /* ---------- Session state ---------- */
  let diagnosticQueue = mode === 'diagnostic' ? PP.questions.diagnosticSet() : null;
  let current = null;
  let qIndex = 0;
  let answered = 0;
  let correctCount = 0;
  let combo = 0;
  let bestCombo = 0;
  let sessionXp = 0;
  let timeLeft = SPRINT_SECONDS;
  let timerId = null;
  let finished = false;

  /* ---------- Elements ---------- */
  const el = (id) => document.getElementById(id);
  const hudMode = el('hud-mode'), hudProgress = el('hud-progress'),
        hudCombo = el('hud-combo'), hudXp = el('hud-xp'), hudTimer = el('hud-timer');
  const qSection = el('q-section'), qSkill = el('q-skill'), qDiff = el('q-diff'),
        qText = el('q-text'), choicesBox = el('choices'), explanation = el('explanation');
  const nextBtn = el('next-btn'), sessionStats = el('session-stats'), toast = el('xp-toast');

  hudMode.textContent = MODE_LABELS[mode] || MODE_LABELS.adaptive;

  /* ---------- Timer (sprint only) ---------- */
  if (mode === 'sprint') {
    hudTimer.style.display = '';
    timerId = setInterval(() => {
      timeLeft--;
      const m = Math.floor(timeLeft / 60), s = String(timeLeft % 60).padStart(2, '0');
      hudTimer.textContent = `⏱️ ${m}:${s}`;
      if (timeLeft <= 60) hudTimer.classList.add('timer-low');
      if (timeLeft <= 0) endSession('⏰ Time!', 'The clock ran out — here\'s how your sprint went.');
    }, 1000);
  }

  /* ---------- Question flow ---------- */
  function nextQuestion() {
    if (mode === 'diagnostic') {
      if (qIndex >= diagnosticQueue.length) {
        return endSession('🩺 Diagnostic complete!', 'Your baseline is set. Your dashboard now shows a personalized score estimate and study plan.');
      }
      current = diagnosticQueue[qIndex];
    } else if (mode === 'skill' && skillParam) {
      const m = data.mastery[skillParam] ?? 30;
      const diff = m < 40 ? 1 : m < 70 ? 2 : 3;
      current = PP.questions.generate(skillParam, diff);
    } else {
      const pickInfo = PP.questions.adaptivePick(data.mastery, section);
      current = PP.questions.generate(pickInfo.skill, pickInfo.diff);
    }
    qIndex++;
    renderQuestion();
  }

  function renderQuestion() {
    const skillInfo = PP.questions.skillById(current.skill);
    qSection.textContent = current.section === 'math' ? 'Math' : 'Reading & Writing';
    qSkill.textContent = skillInfo ? skillInfo.name : current.skill;
    qDiff.textContent = '★'.repeat(current.difficulty) + '☆'.repeat(3 - current.difficulty);
    qText.textContent = current.text;
    explanation.classList.remove('show');
    nextBtn.style.display = 'none';

    choicesBox.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    current.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.innerHTML = `<span class="choice-letter">${letters[i]}</span><span>${escapeHtml(choice)}</span>`;
      btn.addEventListener('click', () => answer(i, btn));
      choicesBox.appendChild(btn);
    });

    const total = mode === 'diagnostic' ? diagnosticQueue.length : (mode === 'sprint' ? SPRINT_COUNT : null);
    hudProgress.textContent = total ? `Q ${qIndex}/${total}` : `Q ${qIndex}`;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function answer(choiceIndex, btn) {
    if (finished) return;
    const buttons = choicesBox.querySelectorAll('.choice');
    buttons.forEach(b => b.disabled = true);

    const correct = choiceIndex === current.answer;
    answered++;
    if (correct) {
      correctCount++;
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      btn.classList.add('correct');
    } else {
      combo = 0;
      btn.classList.add('wrong');
      buttons[current.answer].classList.add('correct');
    }

    // Persist: attempt log, mastery, XP, streak day.
    const earned = PP.game.recordAttempt(data, current, correct, combo);
    sessionXp += earned;
    PP.auth.saveData(user.id, data);

    if (earned > 0) showToast(`+${earned} XP${combo >= 3 ? ` · ⚡×${combo}` : ''}`);

    explanation.innerHTML = (correct ? '<strong>✓ Correct.</strong> ' : '<strong>✗ Not quite.</strong> ') + escapeHtml(current.explanation);
    explanation.classList.add('show');

    hudCombo.textContent = `⚡ Combo ×${combo}`;
    hudCombo.classList.toggle('combo-hot', combo >= 3);
    hudXp.textContent = `+${sessionXp} XP`;
    sessionStats.textContent = `${correctCount}/${answered} correct this session`;

    const sprintDone = mode === 'sprint' && answered >= SPRINT_COUNT;
    const diagDone = mode === 'diagnostic' && qIndex >= diagnosticQueue.length;
    nextBtn.textContent = sprintDone || diagDone ? 'See Results →' : 'Next Question →';
    nextBtn.style.display = '';
    nextBtn.focus();
  }

  nextBtn.addEventListener('click', () => {
    if (mode === 'sprint' && answered >= SPRINT_COUNT) {
      return endSession('🏁 Sprint finished!', 'You beat the clock — here\'s how your sprint went.');
    }
    nextQuestion();
  });

  let toastTimer = null;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
  }

  /* ---------- Session end ---------- */
  function endSession(title, sub) {
    if (finished) return;
    finished = true;
    if (timerId) clearInterval(timerId);

    // Record the session, refresh the score snapshot, check badges.
    if (answered > 0 || mode === 'diagnostic') {
      data.sessions.push({ type: mode, skill: skillParam || null, total: answered, correct: correctCount, t: Date.now() });
      if (mode === 'diagnostic') data.diagnosticDone = true;
      const scores = PP.game.estimatedScores(data);
      if (scores.math != null && scores.rw != null) {
        data.snapshots.push({ t: Date.now(), math: scores.math, rw: scores.rw });
      }
    }
    const freshBadges = PP.game.checkBadges(data);
    PP.auth.saveData(user.id, data);

    el('question-card').style.display = 'none';
    const summary = el('summary-card');
    summary.style.display = '';
    el('summary-title').textContent = title || 'Mission complete!';
    el('summary-sub').textContent = sub || '';
    el('sum-answered').textContent = answered;
    el('sum-accuracy').textContent = answered ? Math.round((correctCount / answered) * 100) + '%' : '—';
    el('sum-xp').textContent = '+' + sessionXp;
    el('sum-combo').textContent = bestCombo;

    const badgeBox = el('summary-badges');
    for (const b of freshBadges) {
      const chip = document.createElement('span');
      chip.className = 'summary-badge-chip';
      chip.innerHTML = `${b.icon} <strong>${b.name}</strong> unlocked!`;
      badgeBox.appendChild(chip);
    }

    if (mode === 'diagnostic') {
      el('summary-icon').textContent = '🩺';
      el('again-btn').style.display = 'none';
    }
  }

  el('again-btn').addEventListener('click', () => window.location.reload());
  el('end-session-btn').addEventListener('click', () => {
    if (answered === 0) return window.location.href = 'dashboard.html';
    endSession('🚀 Session logged!', 'Nice work — your progress has been saved to your dashboard.');
  });

  /* ---------- Launch ---------- */
  nextQuestion();
})();
