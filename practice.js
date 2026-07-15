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
  PP.learning.normalize(data);
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
  let questionStartedAt = Date.now();
  let currentSubmitted = false;
  let currentSelectedAnswer = null;
  let hintCount = 0;
  let sessionDetails = [];
  let tutorWidget = null;

  /* ---------- Elements ---------- */
  const el = (id) => document.getElementById(id);
  const hudMode = el('hud-mode'), hudProgress = el('hud-progress'),
        hudCombo = el('hud-combo'), hudXp = el('hud-xp'), hudTimer = el('hud-timer');
  const qSection = el('q-section'), qSkill = el('q-skill'), qDiff = el('q-diff'),
        qText = el('q-text'), choicesBox = el('choices'), explanation = el('explanation');
  const nextBtn = el('next-btn'), sessionStats = el('session-stats'), toast = el('xp-toast');
  const saveBtn = el('save-question-btn'), skipBtn = el('skip-question-btn'), reportBtn = el('report-question-btn');

  hudMode.textContent = MODE_LABELS[mode] || MODE_LABELS.adaptive;

  tutorWidget = PP.tutor.mount(el('practice-ai-tutor'), () => ({
    submitted: currentSubmitted,
    action: currentSubmitted ? 'post-submit help' : 'pre-submit hint',
    selectedAnswer: currentSelectedAnswer,
    question: current ? {
      ...current,
      answerLabel: current.correctAnswer,
      correctChoice: current.correctAnswer
    } : null,
    recentWeaknesses: PP.learning.weakestSkills(data, 3).map((s) => s.name)
  }), {
    onMessage(role) {
      if (role === 'user' && !currentSubmitted) hintCount++;
    }
  });

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
    current = PP.learning.enrichQuestion(current);
    qIndex++;
    renderQuestion();
  }

  function renderQuestion() {
    questionStartedAt = Date.now();
    currentSubmitted = false;
    currentSelectedAnswer = null;
    hintCount = 0;
    qSection.textContent = current.subject;
    qSkill.textContent = current.skillName;
    qDiff.textContent = '★'.repeat(current.difficulty) + '☆'.repeat(3 - current.difficulty);
    qText.textContent = current.prompt;
    explanation.classList.remove('show');
    explanation.innerHTML = '';
    nextBtn.style.display = 'none';
    skipBtn.disabled = false;
    saveBtn.textContent = data.learning.savedQuestions[current.id] ? 'Saved' : 'Save';
    saveBtn.classList.toggle('active', !!data.learning.savedQuestions[current.id]);

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
    if (tutorWidget) tutorWidget.renderQuick();
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function answer(choiceIndex, btn) {
    if (finished || currentSubmitted) return;
    const buttons = choicesBox.querySelectorAll('.choice');
    buttons.forEach(b => b.disabled = true);

    const correct = choiceIndex === current.answer;
    currentSubmitted = true;
    currentSelectedAnswer = `${['A', 'B', 'C', 'D'][choiceIndex]}. ${current.choices[choiceIndex]}`;
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

    // Persist: legacy aggregates plus detailed attempt history.
    const earned = PP.game.recordAttempt(data, current, correct, combo);
    const detail = PP.learning.recordAttemptDetail(data, current, {
      selectedIndex: choiceIndex,
      correct,
      elapsedSeconds: (Date.now() - questionStartedAt) / 1000,
      hintCount,
      completionStatus: 'answered'
    });
    sessionDetails.push(detail);
    sessionXp += earned;
    PP.learning.savePrediction(data);
    PP.auth.saveData(user.id, data);

    if (earned > 0) showToast(`+${earned} XP${combo >= 3 ? ` · ⚡×${combo}` : ''}`);

    explanation.innerHTML = (correct ? '<strong>✓ Correct.</strong><br>' : '<strong>✗ Not quite.</strong><br>') +
      escapeHtml(PP.learning.structuredExplanation(current, choiceIndex)).replace(/\n/g, '<br>');
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
    skipBtn.disabled = true;
    if (tutorWidget) tutorWidget.renderQuick();
  }

  function skipQuestion() {
    if (finished || currentSubmitted) return;
    const buttons = choicesBox.querySelectorAll('.choice');
    buttons.forEach(b => b.disabled = true);
    buttons[current.answer].classList.add('correct');
    currentSubmitted = true;
    currentSelectedAnswer = 'Skipped';
    answered++;
    combo = 0;
    const earned = PP.game.recordAttempt(data, current, false, combo);
    sessionXp += earned;
    const detail = PP.learning.recordAttemptDetail(data, current, {
      selectedIndex: null,
      correct: false,
      elapsedSeconds: (Date.now() - questionStartedAt) / 1000,
      hintCount,
      completionStatus: 'skipped'
    });
    sessionDetails.push(detail);
    PP.auth.saveData(user.id, data);
    explanation.innerHTML = '<strong>Skipped.</strong><br>' +
      escapeHtml(PP.learning.structuredExplanation(current, null)).replace(/\n/g, '<br>');
    explanation.classList.add('show');
    hudCombo.textContent = `⚡ Combo ×${combo}`;
    hudCombo.classList.remove('combo-hot');
    hudXp.textContent = `+${sessionXp} XP`;
    sessionStats.textContent = `${correctCount}/${answered} correct this session`;
    const done = (mode === 'sprint' && answered >= SPRINT_COUNT) || (mode === 'diagnostic' && qIndex >= diagnosticQueue.length);
    nextBtn.textContent = done ? 'See Results →' : 'Next Question →';
    nextBtn.style.display = '';
    skipBtn.disabled = true;
    if (tutorWidget) tutorWidget.renderQuick();
  }

  nextBtn.addEventListener('click', () => {
    if (mode === 'sprint' && answered >= SPRINT_COUNT) {
      return endSession('🏁 Sprint finished!', 'You beat the clock — here\'s how your sprint went.');
    }
    if (mode === 'diagnostic' && qIndex >= diagnosticQueue.length) {
      return endSession('🩺 Diagnostic complete!', 'Your baseline is set. Your dashboard now shows a personalized score estimate and study plan.');
    }
    nextQuestion();
  });

  saveBtn.addEventListener('click', () => {
    const saved = !data.learning.savedQuestions[current.id];
    PP.learning.saveQuestion(data, current, saved);
    saveBtn.textContent = saved ? 'Saved' : 'Save';
    saveBtn.classList.toggle('active', saved);
    PP.auth.saveData(user.id, data);
  });

  skipBtn.addEventListener('click', skipQuestion);

  reportBtn.addEventListener('click', () => {
    const details = window.prompt('What should PeakPoint review about this question?');
    if (details == null) return;
    PP.learning.reportQuestion(data, current, 'Student report', details);
    PP.auth.saveData(user.id, data);
    showToast('Report saved for review');
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
    let diagnostic = null;
    if (mode === 'diagnostic') {
      diagnostic = PP.learning.diagnosticReport(data, sessionDetails);
      if (!data.learning.studyPlan.length) PP.learning.generateStudyPlan(data, {
        targetScore: data.profile.targetScore || 1400,
        testDate: data.profile.testDate || null
      });
    } else {
      PP.learning.savePrediction(data);
      PP.learning.refreshRecommendations(data);
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
      renderDiagnosticInsights(diagnostic);
    }
    renderAiSummary(diagnostic);
  }

  function renderDiagnosticInsights(report) {
    if (!report) return;
    const box = el('diagnostic-insights');
    const domainRows = Object.entries(report.accuracyByDomain)
      .map(([name, value]) => `<div class="mini-row"><span>${escapeHtml(name)}</span><strong>${value.accuracy}%</strong></div>`)
      .join('');
    box.innerHTML = `
      <div class="result-grid">
        <div class="result-card"><span>Predicted Total</span><strong>${report.predictedTotal || '—'}</strong></div>
        <div class="result-card"><span>Reading & Writing</span><strong>${report.predictedRw || '—'}</strong></div>
        <div class="result-card"><span>Math</span><strong>${report.predictedMath || '—'}</strong></div>
        <div class="result-card"><span>Confidence</span><strong>${report.confidence || 'Low'}</strong></div>
      </div>
      <div class="card diagnostic-detail">
        <h3>Domain accuracy</h3>
        ${domainRows || '<p class="card-sub">No domain data yet.</p>'}
      </div>
      <div class="card diagnostic-detail">
        <h3>Next steps</h3>
        <p class="card-sub">${report.recommendedNextSteps.map(escapeHtml).join(' • ') || 'Keep practicing to build your plan.'}</p>
      </div>`;
  }

  async function renderAiSummary(report) {
    const box = el('ai-summary');
    if (!box) return;
    const metrics = report || {
      answered,
      correct: correctCount,
      accuracy: answered ? Math.round((correctCount / answered) * 100) : null,
      weakest: PP.learning.weakestSkills(data, 3).map((s) => s.name)
    };
    box.innerHTML = '<p class="card-sub">Checking for PeakPoint AI coaching...</p>';
    const result = await PP.api.summary(mode === 'diagnostic' ? 'diagnostic results' : 'practice session', metrics);
    if (!result.ok) {
      box.innerHTML = `<p class="card-sub">${escapeHtml(result.error || 'PeakPoint AI coaching is unavailable, but your results were saved.')}</p>`;
      return;
    }
    box.innerHTML = `<div class="ai-summary-card"><strong>PeakPoint AI Coach</strong><p>${escapeHtml(result.text)}</p></div>`;
  }

  el('again-btn').addEventListener('click', () => window.location.reload());
  el('end-session-btn').addEventListener('click', () => {
    if (answered === 0) return window.location.href = 'dashboard.html';
    endSession('🚀 Session logged!', 'Nice work — your progress has been saved to your dashboard.');
  });

  /* ---------- Launch ---------- */
  nextQuestion();
})();
