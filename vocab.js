/* ============================================
   PEAKPOINT SAT PREP — Vocabulary
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;
  const data = await PP.auth.loadData(user.id);
  PP.learning.normalize(data);

  const el = (id) => document.getElementById(id);
  let current = null;
  let currentChoices = [];
  const letters = ['A', 'B', 'C', 'D'];

  renderStats();
  renderList();
  showWord(PP.learning.dueVocabulary(data)[0] || PP.learning.VOCAB[0]);

  function renderStats() {
    const stats = PP.learning.vocabularyStats(data);
    el('vocab-stats').innerHTML = Object.entries(stats).map(([status, count]) => `
      <div class="card stat-card-big">
        <div class="big-label">${status}</div>
        <div class="big-number">${count}</div>
        <div class="big-detail">words</div>
      </div>`).join('');
    el('vocab-due').textContent = `${PP.learning.dueVocabulary(data).length} due`;
  }

  function renderList() {
    const list = el('vocab-list');
    list.innerHTML = '';
    for (const word of PP.learning.VOCAB) {
      const progress = data.learning.vocabulary[word.id];
      const item = document.createElement('button');
      item.className = 'bank-result';
      item.innerHTML = `<strong>${escapeHtml(word.word)}</strong><span>${progress.status} · due ${progress.due}</span>`;
      item.addEventListener('click', () => showWord(word));
      list.appendChild(item);
    }
  }

  function showWord(word) {
    current = word;
    const progress = data.learning.vocabulary[word.id];
    el('vocab-word').textContent = word.word;
    el('vocab-status').textContent = progress.status;
    el('vocab-example').textContent = `${word.example}\n\nAs used here, "${word.word}" most nearly means:`;
    el('vocab-detail').classList.remove('show');
    el('vocab-ai-box').innerHTML = '';
    buildChoices();
  }

  function buildChoices() {
    const distractors = PP.learning.VOCAB
      .filter((word) => word.id !== current.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((word) => word.definition);
    currentChoices = shuffle([current.definition, ...distractors]);
    const box = el('vocab-choices');
    box.innerHTML = '';
    currentChoices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.innerHTML = `<span class="choice-letter">${letters[index]}</span><span>${escapeHtml(choice)}</span>`;
      button.addEventListener('click', () => answer(choice, button));
      box.appendChild(button);
    });
  }

  function answer(choice, button) {
    const correct = choice === current.definition;
    [...el('vocab-choices').querySelectorAll('.choice')].forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent.includes(current.definition)) btn.classList.add('correct');
    });
    button.classList.add(correct ? 'correct' : 'wrong');
    PP.learning.recordVocabularyReview(data, current.id, correct);
    const q = PP.learning.enrichQuestion(PP.questions.generate('vocab', 2));
    q.id = `vocab-${current.id}-${Date.now()}`;
    q.prompt = el('vocab-example').textContent;
    q.choices = currentChoices;
    q.answer = currentChoices.indexOf(current.definition);
    q.correctAnswer = letters[q.answer];
    q.skill = 'vocab';
    q.skillName = 'Words in Context';
    q.domain = 'Craft and Structure';
    PP.game.recordAttempt(data, q, correct, correct ? 1 : 0);
    PP.learning.recordAttemptDetail(data, q, {
      selectedIndex: currentChoices.indexOf(choice),
      correct,
      elapsedSeconds: 0,
      hintCount: 0,
      completionStatus: 'answered'
    });
    PP.auth.saveData(user.id, data);
    showDetail();
    renderStats();
    renderList();
  }

  function showDetail() {
    el('vocab-detail').innerHTML = `
      <strong>${escapeHtml(current.definition)}</strong>
      <p>Synonyms: ${current.synonyms.map(escapeHtml).join(', ')}</p>
      <p>Antonyms: ${current.antonyms.map(escapeHtml).join(', ')}</p>
      <p>Root: ${escapeHtml(current.roots)}</p>
      <p>Common trap: ${escapeHtml(current.trap)}</p>
      <p>Memory aid: ${escapeHtml(current.memory)}</p>`;
    el('vocab-detail').classList.add('show');
  }

  el('vocab-known').addEventListener('click', () => {
    PP.learning.recordVocabularyReview(data, current.id, true);
    PP.auth.saveData(user.id, data);
    renderStats();
    renderList();
    showDetail();
  });

  el('vocab-missed').addEventListener('click', () => {
    PP.learning.recordVocabularyReview(data, current.id, false);
    PP.auth.saveData(user.id, data);
    renderStats();
    renderList();
    showDetail();
  });

  el('vocab-next').addEventListener('click', () => {
    showWord(PP.learning.dueVocabulary(data)[0] || PP.learning.VOCAB[Math.floor(Math.random() * PP.learning.VOCAB.length)]);
  });

  el('vocab-ai').addEventListener('click', async () => {
    el('vocab-ai-box').innerHTML = '<p class="card-sub">Asking PeakPoint AI...</p>';
    const result = await PP.api.vocabulary('vocabulary memory aid', current);
    el('vocab-ai-box').innerHTML = result.ok
      ? `<div class="ai-summary-card"><strong>PeakPoint AI Memory Aid</strong><p>${escapeHtml(result.text)}</p></div>`
      : `<p class="card-sub">${escapeHtml(result.error || 'PeakPoint AI is unavailable. Use the built-in memory aid for now.')}</p>`;
  });

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
})();
