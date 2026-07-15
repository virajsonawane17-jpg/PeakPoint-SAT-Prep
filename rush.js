/* ============================================
   PEAKPOINT SAT PREP — Question Rush
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;
  const data = await PP.auth.loadData(user.id);
  PP.learning.normalize(data);

  const el = (id) => document.getElementById(id);
  const letters = ['A', 'B', 'C', 'D'];
  let mode = 'mixed';
  let seconds = 180;
  let timeLeft = 180;
  let timer = null;
  let current = null;
  let startedAt = Date.now();
  let total = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let score = 0;
  let details = [];

  el('rush-start').addEventListener('click', start);

  function start() {
    seconds = Number(el('rush-duration').value);
    mode = el('rush-mode').value;
    timeLeft = seconds;
    el('rush-setup').style.display = 'none';
    el('rush-game').style.display = '';
    tick();
    timer = setInterval(() => {
      timeLeft--;
      tick();
      if (timeLeft <= 0) finish();
    }, 1000);
    nextQuestion();
  }

  function tick() {
    const m = Math.floor(timeLeft / 60);
    const s = String(timeLeft % 60).padStart(2, '0');
    el('rush-timer').textContent = `${m}:${s}`;
    el('rush-timer').classList.toggle('timer-low', timeLeft <= 30);
  }

  function nextQuestion() {
    const pick = pickSkill();
    current = PP.learning.enrichQuestion(PP.questions.generate(pick.skill, pick.diff));
    startedAt = Date.now();
    el('rush-section').textContent = current.subject;
    el('rush-skill').textContent = current.skillName;
    el('rush-diff').textContent = '★'.repeat(current.difficulty) + '☆'.repeat(3 - current.difficulty);
    el('rush-text').textContent = current.prompt;
    const box = el('rush-choices');
    box.innerHTML = '';
    current.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.innerHTML = `<span class="choice-letter">${letters[index]}</span><span>${escapeHtml(choice)}</span>`;
      button.addEventListener('click', () => answer(index));
      box.appendChild(button);
    });
  }

  function pickSkill() {
    if (mode === 'weak') {
      const weak = PP.learning.weakestSkills(data, 4);
      const skill = weak[Math.floor(Math.random() * Math.max(1, weak.length))];
      return { skill: skill ? skill.id : 'lin-eq', diff: skill && skill.mastery < 50 ? 1 : 2 };
    }
    if (mode === 'vocab') return { skill: 'vocab', diff: 2 };
    const section = mode === 'math' ? 'math' : mode === 'rw' ? 'rw' : null;
    return PP.questions.adaptivePick(data.mastery, section);
  }

  function answer(index) {
    const wasCorrect = index === current.answer;
    total++;
    if (wasCorrect) {
      correct++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      score += 10 + current.difficulty * 5 + Math.min(streak, 8);
    } else {
      streak = 0;
    }
    PP.game.recordAttempt(data, current, wasCorrect, streak);
    const detail = PP.learning.recordAttemptDetail(data, current, {
      selectedIndex: index,
      correct: wasCorrect,
      elapsedSeconds: (Date.now() - startedAt) / 1000,
      hintCount: 0,
      completionStatus: 'answered'
    });
    details.push(detail);
    updateHud();
    if (timeLeft > 0) nextQuestion();
  }

  function updateHud() {
    el('rush-streak').textContent = `Streak ${streak}`;
    el('rush-best').textContent = `Best ${bestStreak}`;
    el('rush-accuracy').textContent = `Accuracy ${total ? Math.round((correct / total) * 100) : 0}%`;
    el('rush-score').textContent = `Score ${score}`;
  }

  async function finish() {
    clearInterval(timer);
    el('rush-game').style.display = 'none';
    el('rush-summary').style.display = '';
    const avgSeconds = details.length ? Math.round(details.reduce((sum, d) => sum + d.elapsedSeconds, 0) / details.length) : 0;
    const skillPerformance = PP.learning.analytics({ ...data, learning: { ...data.learning, attemptDetails: details } }).domainAccuracy;
    const saved = PP.learning.recordRushSession(data, {
      mode,
      seconds,
      total,
      correct,
      bestStreak,
      avgSeconds,
      skillPerformance,
      mistakes: details.filter((d) => !d.correct).map((d) => d.qid)
    });
    data.sessions.push({ type: 'question-rush', skill: mode, total, correct, t: Date.now() });
    PP.learning.savePrediction(data);
    PP.auth.saveData(user.id, data);

    el('rush-total').textContent = total;
    el('rush-correct').textContent = correct;
    el('rush-final-acc').textContent = total ? Math.round((correct / total) * 100) + '%' : '—';
    el('rush-avg').textContent = avgSeconds + 's';
    el('rush-final-best').textContent = bestStreak;
    el('rush-review').innerHTML = Object.entries(skillPerformance)
      .map(([name, value]) => `<div class="card diagnostic-detail"><h3>${escapeHtml(name)}</h3><p class="card-sub">${value.correct}/${value.total} correct · ${value.accuracy}%</p></div>`)
      .join('') || '<p class="card-sub">Complete a few questions to see skill performance.</p>';

    const ai = await PP.api.summary('question rush coaching', saved);
    el('rush-ai').innerHTML = ai.ok
      ? `<div class="ai-summary-card"><strong>PeakPoint AI Coach</strong><p>${escapeHtml(ai.text)}</p></div>`
      : `<p class="card-sub">${escapeHtml(ai.error || 'PeakPoint AI coaching is unavailable, but your rush results were saved.')}</p>`;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
})();
