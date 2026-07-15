/* ============================================
   PEAKPOINT SAT PREP — Question Bank
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;

  const data = await PP.auth.loadData(user.id);
  PP.learning.normalize(data);

  const el = (id) => document.getElementById(id);
  const filters = {
    subject: el('filter-subject'),
    domain: el('filter-domain'),
    skill: el('filter-skill'),
    difficulty: el('filter-difficulty'),
    questionType: el('filter-type'),
    status: el('filter-status'),
    accuracy: el('filter-accuracy'),
    sourceType: el('filter-source')
  };

  const bank = buildBank();
  let results = [];
  let current = null;
  let submitted = false;
  let selectedAnswer = null;
  let startedAt = Date.now();
  let hintCount = 0;
  let tutor = null;

  populateFilters();
  applyFilters();

  tutor = PP.tutor.mount(el('bank-ai-tutor'), () => ({
    submitted,
    selectedAnswer,
    question: current ? { ...current, answerLabel: current.correctAnswer, correctChoice: current.correctAnswer } : null,
    recentWeaknesses: PP.learning.weakestSkills(data, 3).map((s) => s.name)
  }), {
    onMessage(role) {
      if (role === 'user' && !submitted) hintCount++;
    }
  });

  function buildBank() {
    const generated = PP.learning.approvedGeneratedQuestions(data);
    const originals = [];
    for (const skill of PP.questions.SKILLS) {
      for (const diff of [1, 2, 3]) {
        originals.push(PP.learning.enrichQuestion(PP.questions.generate(skill.id, diff)));
        originals.push(PP.learning.enrichQuestion(PP.questions.generate(skill.id, diff)));
      }
    }
    return [...generated, ...originals];
  }

  function populateFilters() {
    const domains = new Set();
    const types = new Set();
    for (const question of bank) {
      const q = PP.learning.enrichQuestion(question);
      domains.add(q.domain);
      types.add(q.questionType);
    }
    for (const domain of [...domains].sort()) filters.domain.append(new Option(domain, domain));
    for (const skill of PP.questions.SKILLS) filters.skill.append(new Option(skill.name, skill.id));
    for (const type of [...types].sort()) filters.questionType.append(new Option(type, type));
    Object.values(filters).forEach((select) => select.addEventListener('change', applyFilters));
  }

  function currentFilterValues() {
    return Object.fromEntries(Object.entries(filters).map(([key, node]) => [key, node.value]));
  }

  function applyFilters() {
    results = PP.learning.filterQuestions(bank, currentFilterValues(), data);
    el('result-count').textContent = `${results.length} questions`;
    renderResults();
    renderQuestion(results[0] || null);
  }

  function renderResults() {
    const mount = el('question-results');
    mount.innerHTML = '';
    if (!results.length) {
      mount.innerHTML = '<p class="card-sub">No questions match those filters yet.</p>';
      return;
    }
    results.slice(0, 60).forEach((question, index) => {
      const q = PP.learning.enrichQuestion(question);
      const item = document.createElement('button');
      item.className = 'bank-result';
      item.innerHTML = `<strong>${escapeHtml(q.skillName)}</strong><span>${escapeHtml(q.domain)} · ${'★'.repeat(q.difficulty)}${'☆'.repeat(3 - q.difficulty)}</span>`;
      item.addEventListener('click', () => renderQuestion(results[index]));
      mount.appendChild(item);
    });
  }

  function renderQuestion(question) {
    current = question ? PP.learning.enrichQuestion(question) : null;
    submitted = false;
    selectedAnswer = null;
    hintCount = 0;
    startedAt = Date.now();
    if (!current) {
      el('bank-question').style.display = 'none';
      return;
    }
    el('bank-question').style.display = '';
    el('bank-section').textContent = current.subject;
    el('bank-domain').textContent = current.domain;
    el('bank-skill').textContent = current.skillName;
    el('bank-diff').textContent = '★'.repeat(current.difficulty) + '☆'.repeat(3 - current.difficulty);
    el('bank-text').textContent = current.prompt;
    el('bank-explanation').classList.remove('show');
    el('bank-explanation').innerHTML = '';
    el('bank-status').textContent = `${current.sourceLabel} · about ${current.estimatedSeconds}s`;
    el('bank-save').textContent = data.learning.savedQuestions[current.id] ? 'Saved' : 'Save';
    el('bank-save').classList.toggle('active', !!data.learning.savedQuestions[current.id]);
    renderChoices();
    if (tutor) tutor.renderQuick();
  }

  function renderChoices() {
    const box = el('bank-choices');
    box.innerHTML = '';
    current.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.innerHTML = `<span class="choice-letter">${letters[index]}</span><span>${escapeHtml(choice)}</span>`;
      button.addEventListener('click', () => answer(index, button));
      box.appendChild(button);
    });
  }

  const letters = ['A', 'B', 'C', 'D'];

  function answer(index, button) {
    if (submitted) return;
    submitted = true;
    const correct = index === current.answer;
    selectedAnswer = `${letters[index]}. ${current.choices[index]}`;
    const buttons = [...el('bank-choices').querySelectorAll('.choice')];
    buttons.forEach((b) => b.disabled = true);
    button.classList.add(correct ? 'correct' : 'wrong');
    buttons[current.answer].classList.add('correct');
    PP.game.recordAttempt(data, current, correct, correct ? 1 : 0);
    PP.learning.recordAttemptDetail(data, current, {
      selectedIndex: index,
      correct,
      elapsedSeconds: (Date.now() - startedAt) / 1000,
      hintCount,
      completionStatus: 'answered'
    });
    PP.learning.savePrediction(data);
    PP.auth.saveData(user.id, data);
    el('bank-explanation').innerHTML = `${correct ? '<strong>Correct.</strong><br>' : '<strong>Not quite.</strong><br>'}${escapeHtml(PP.learning.structuredExplanation(current, index)).replace(/\n/g, '<br>')}`;
    el('bank-explanation').classList.add('show');
    el('bank-status').textContent = correct ? 'Logged as correct.' : 'Saved to Mistake Review.';
    if (tutor) tutor.renderQuick();
  }

  function skip() {
    if (submitted) return;
    submitted = true;
    selectedAnswer = 'Skipped';
    const buttons = [...el('bank-choices').querySelectorAll('.choice')];
    buttons.forEach((b) => b.disabled = true);
    buttons[current.answer].classList.add('correct');
    PP.game.recordAttempt(data, current, false, 0);
    PP.learning.recordAttemptDetail(data, current, {
      selectedIndex: null,
      correct: false,
      elapsedSeconds: (Date.now() - startedAt) / 1000,
      hintCount,
      completionStatus: 'skipped'
    });
    PP.auth.saveData(user.id, data);
    el('bank-explanation').innerHTML = `<strong>Skipped.</strong><br>${escapeHtml(PP.learning.structuredExplanation(current, null)).replace(/\n/g, '<br>')}`;
    el('bank-explanation').classList.add('show');
    el('bank-status').textContent = 'Skipped question saved for review.';
    if (tutor) tutor.renderQuick();
  }

  el('bank-save').addEventListener('click', () => {
    const saved = !data.learning.savedQuestions[current.id];
    PP.learning.saveQuestion(data, current, saved);
    el('bank-save').textContent = saved ? 'Saved' : 'Save';
    el('bank-save').classList.toggle('active', saved);
    PP.auth.saveData(user.id, data);
  });

  el('bank-collection').addEventListener('click', () => {
    let collection = data.learning.collections[0];
    if (!collection) collection = PP.learning.createCollection(data, 'Saved Practice');
    PP.learning.addToCollection(data, collection.id, current);
    PP.auth.saveData(user.id, data);
    el('bank-status').textContent = `Added to ${collection.name}.`;
  });

  el('bank-skip').addEventListener('click', skip);

  el('bank-report').addEventListener('click', () => {
    const details = window.prompt('What should PeakPoint review?');
    if (details == null) return;
    PP.learning.reportQuestion(data, current, 'Question bank report', details);
    PP.auth.saveData(user.id, data);
    el('bank-status').textContent = 'Report saved.';
  });

  el('bank-next').addEventListener('click', () => {
    const weak = PP.learning.weakestSkills(data, 1)[0];
    const next = results.find((question) => !weak || question.skill === weak.id) || results[Math.floor(Math.random() * results.length)];
    renderQuestion(next);
  });

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
})();
