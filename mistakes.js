/* ============================================
   PEAKPOINT SAT PREP — Mistake Review
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;
  const data = await PP.auth.loadData(user.id);
  PP.learning.normalize(data);

  const el = (id) => document.getElementById(id);
  const filters = {
    subject: el('m-subject'),
    domain: el('m-domain'),
    skill: el('m-skill'),
    difficulty: el('m-difficulty'),
    status: el('m-status'),
    repeated: el('m-repeated')
  };
  let mistakes = [];
  let current = null;
  let retrying = false;
  let tutor = null;

  populateFilters();
  applyFilters();

  tutor = PP.tutor.mount(el('mistake-ai-tutor'), () => ({
    submitted: true,
    selectedAnswer: 'Reviewing a previously missed question',
    question: current ? { ...current.question, answerLabel: current.question.correctAnswer, correctChoice: current.question.correctAnswer } : null,
    recentWeaknesses: PP.learning.weakestSkills(data, 3).map((s) => s.name)
  }));

  function populateFilters() {
    const domains = new Set();
    for (const mistake of data.learning.mistakes) domains.add(mistake.domain);
    for (const domain of [...domains].filter(Boolean).sort()) filters.domain.append(new Option(domain, domain));
    for (const skill of PP.questions.SKILLS) filters.skill.append(new Option(skill.name, skill.id));
    Object.values(filters).forEach((select) => select.addEventListener('change', applyFilters));
  }

  function applyFilters() {
    mistakes = data.learning.mistakes.filter((mistake) => {
      if (filters.subject.value && mistake.subject !== filters.subject.value) return false;
      if (filters.domain.value && mistake.domain !== filters.domain.value) return false;
      if (filters.skill.value && mistake.skill !== filters.skill.value) return false;
      if (filters.difficulty.value && String(mistake.difficulty) !== String(filters.difficulty.value)) return false;
      if (filters.status.value && mistake.status !== filters.status.value) return false;
      if (filters.repeated.value === 'yes' && mistake.repeatedCount < 2) return false;
      return true;
    });
    el('mistake-count').textContent = `${mistakes.length}`;
    renderList();
    renderDetail(mistakes[0] || null);
  }

  function renderList() {
    const list = el('mistake-list');
    list.innerHTML = '';
    if (!mistakes.length) {
      list.innerHTML = '<p class="card-sub">No mistakes match those filters. Nice.</p>';
      return;
    }
    for (const mistake of mistakes) {
      const item = document.createElement('button');
      item.className = 'bank-result';
      item.innerHTML = `<strong>${escapeHtml(mistake.skillName)}</strong><span>${escapeHtml(mistake.domain)} · ${mistake.status.replace('_', ' ')} · x${mistake.repeatedCount}</span>`;
      item.addEventListener('click', () => renderDetail(mistake));
      list.appendChild(item);
    }
  }

  function renderDetail(mistake) {
    current = mistake;
    retrying = false;
    if (!current) {
      el('mistake-detail').style.display = 'none';
      return;
    }
    el('mistake-detail').style.display = '';
    const q = current.question;
    el('mistake-section').textContent = current.subject;
    el('mistake-domain').textContent = current.domain;
    el('mistake-skill').textContent = current.skillName;
    el('mistake-repeat').textContent = `Repeated ${current.repeatedCount}`;
    el('mistake-text').textContent = q.prompt || q.text;
    el('mistake-explanation').innerHTML = `<strong>Review.</strong><br>${escapeHtml(PP.learning.structuredExplanation(q, null)).replace(/\n/g, '<br>')}`;
    el('mistake-notes').value = current.notes || '';
    renderChoices(false);
    if (tutor) tutor.renderQuick();
  }

  function renderChoices(enabled) {
    const box = el('mistake-choices');
    const q = current.question;
    box.innerHTML = '';
    q.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.disabled = !enabled;
      button.innerHTML = `<span class="choice-letter">${letters[index]}</span><span>${escapeHtml(choice)}</span>`;
      if (!enabled && index === q.answer) button.classList.add('correct');
      if (enabled) button.addEventListener('click', () => answerRetry(index, button));
      box.appendChild(button);
    });
  }

  const letters = ['A', 'B', 'C', 'D'];

  function answerRetry(index, button) {
    if (!retrying) return;
    retrying = false;
    const q = PP.learning.enrichQuestion(current.question);
    const correct = index === q.answer;
    const buttons = [...el('mistake-choices').querySelectorAll('.choice')];
    buttons.forEach((b) => b.disabled = true);
    button.classList.add(correct ? 'correct' : 'wrong');
    buttons[q.answer].classList.add('correct');
    PP.game.recordAttempt(data, q, correct, correct ? 1 : 0);
    PP.learning.recordAttemptDetail(data, q, {
      selectedIndex: index,
      correct,
      elapsedSeconds: 0,
      hintCount: 0,
      completionStatus: 'answered'
    });
    PP.auth.saveData(user.id, data);
    el('mistake-explanation').innerHTML = `${correct ? '<strong>Retry correct.</strong><br>' : '<strong>Still shaky.</strong><br>'}${escapeHtml(PP.learning.structuredExplanation(q, index)).replace(/\n/g, '<br>')}`;
    applyFilters();
  }

  el('mistake-retry').addEventListener('click', () => {
    retrying = true;
    renderChoices(true);
    el('mistake-explanation').innerHTML = '<strong>Retry mode.</strong> Pick an answer before checking the explanation.';
  });

  el('mistake-understood').addEventListener('click', saveStatus.bind(null, 'understood'));
  el('mistake-mastered').addEventListener('click', saveStatus.bind(null, 'mastered'));
  el('mistake-notes').addEventListener('change', () => {
    PP.learning.setMistakeStatus(data, current.id, current.status === 'mastered' ? 'mastered' : 'understood', el('mistake-notes').value);
    PP.auth.saveData(user.id, data);
    applyFilters();
  });

  function saveStatus(status) {
    PP.learning.setMistakeStatus(data, current.id, status, el('mistake-notes').value);
    PP.auth.saveData(user.id, data);
    applyFilters();
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
})();
