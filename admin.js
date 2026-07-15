/* ============================================
   PEAKPOINT SAT PREP — Admin AI question review
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;
  const data = await PP.auth.loadData(user.id);
  PP.learning.normalize(data);

  const el = (id) => document.getElementById(id);
  renderList();

  el('admin-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    el('admin-submit').disabled = true;
    el('admin-status').textContent = 'Asking Gemini Flash for original draft questions...';
    const result = await PP.api.generateQuestions({
      subject: el('admin-subject').value,
      domain: el('admin-domain').value,
      skill: el('admin-skill').value,
      difficulty: el('admin-difficulty').value,
      questionType: el('admin-type').value || 'Multiple Choice',
      count: el('admin-count').value,
      additionalInstructions: el('admin-instructions').value
    });
    el('admin-submit').disabled = false;
    if (!result.ok) {
      el('admin-status').textContent = result.error || 'Generation failed.';
      return;
    }
    const questions = normalizeGenerated(result.json || result);
    const added = PP.learning.addGeneratedQuestions(data, questions);
    PP.auth.saveData(user.id, data);
    el('admin-status').textContent = `${added.length} drafts added. Review before publishing.`;
    renderList();
  });

  function normalizeGenerated(payload) {
    const questions = Array.isArray(payload?.questions) ? payload.questions : Array.isArray(payload) ? payload : [];
    return questions.map((q) => ({
      prompt: q.prompt || q.text || '',
      passage: q.passage || '',
      choices: Array.isArray(q.choices) ? q.choices.slice(0, 4) : [],
      correctAnswer: String(q.correctAnswer || q.answer || '').trim().toUpperCase().slice(0, 1),
      explanation: q.explanation || '',
      subject: q.subject || el('admin-subject').value,
      domain: q.domain || el('admin-domain').value,
      skill: q.skill || el('admin-skill').value,
      skillName: q.skill || el('admin-skill').value,
      difficulty: q.difficulty === 'Hard' ? 3 : q.difficulty === 'Easy' ? 1 : 2,
      questionType: q.questionType || el('admin-type').value || 'Multiple Choice',
      estimatedSeconds: Number(q.estimatedSeconds || 75),
      sourceLabel: 'Admin-approved AI-generated SAT-style practice'
    }));
  }

  function renderList() {
    const list = el('admin-list');
    const items = data.learning.generatedQuestions || [];
    el('admin-count-label').textContent = `${items.filter((q) => q.status === 'draft').length} drafts`;
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<div class="card"><p class="card-sub">No generated questions yet.</p></div>';
      return;
    }
    for (const item of items) {
      const card = document.createElement('article');
      card.className = `card admin-card status-${item.status}`;
      const quality = item.quality || PP.learning.generatedQuality(item, items.filter((q) => q.id !== item.id));
      card.innerHTML = `
        <div class="q-meta">
          <span class="q-tag q-section">${escapeHtml(item.subject)}</span>
          <span class="q-tag">${escapeHtml(item.domain)}</span>
          <span class="q-tag">${escapeHtml(item.status)}</span>
        </div>
        <div class="field"><label>Prompt</label><textarea data-field="prompt" rows="4">${escapeHtml(item.prompt)}</textarea></div>
        <div class="field"><label>Choices (one per line)</label><textarea data-field="choices" rows="4">${escapeHtml((item.choices || []).join('\n'))}</textarea></div>
        <div class="filter-grid">
          <div class="field"><label>Correct</label><input data-field="correctAnswer" value="${escapeHtml(item.correctAnswer)}" /></div>
          <div class="field"><label>Skill</label><input data-field="skill" value="${escapeHtml(item.skill)}" /></div>
          <div class="field"><label>Estimated Seconds</label><input data-field="estimatedSeconds" type="number" value="${escapeHtml(item.estimatedSeconds || 75)}" /></div>
        </div>
        <div class="field"><label>Explanation</label><textarea data-field="explanation" rows="4">${escapeHtml(item.explanation)}</textarea></div>
        <div class="field"><label>Quality Notes</label><textarea data-field="reviewNotes" rows="3">${escapeHtml(item.reviewNotes || '')}</textarea></div>
        <p class="card-sub">${quality.ok ? 'Quality check passed.' : quality.notes.map(escapeHtml).join(' ')}</p>
        <div class="question-tools">
          <button class="tool-btn" data-action="save" type="button">Save Edits</button>
          <button class="tool-btn" data-action="approve" type="button">Approve</button>
          <button class="tool-btn" data-action="reject" type="button">Reject</button>
          <button class="tool-btn" data-action="regenerate" type="button">Regenerate</button>
        </div>`;
      card.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => handle(item, card, button.dataset.action)));
      list.appendChild(card);
    }
  }

  async function handle(item, card, action) {
    const edits = collectEdits(card);
    if (action === 'regenerate') {
      el('admin-status').textContent = 'Regenerating one draft...';
      const result = await PP.api.generateQuestions({
        subject: edits.subject || item.subject,
        domain: item.domain,
        skill: edits.skill || item.skill,
        difficulty: item.difficulty,
        questionType: item.questionType,
        count: 1,
        additionalInstructions: `Regenerate this draft more clearly. Review note: ${edits.reviewNotes || ''}`
      });
      if (result.ok) {
        const [replacement] = normalizeGenerated(result.json || result);
        Object.assign(edits, replacement);
      } else {
        el('admin-status').textContent = result.error || 'Regeneration failed.';
        return;
      }
    }
    PP.learning.reviewGeneratedQuestion(data, item.id, action === 'save' || action === 'regenerate' ? 'draft' : action, edits);
    PP.auth.saveData(user.id, data);
    el('admin-status').textContent = action === 'approve' ? 'Question approved and available to the bank.' : 'Review queue updated.';
    renderList();
  }

  function collectEdits(card) {
    const value = (field) => card.querySelector(`[data-field="${field}"]`)?.value || '';
    return {
      prompt: value('prompt'),
      choices: value('choices').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 4),
      correctAnswer: value('correctAnswer').trim().toUpperCase().slice(0, 1),
      skill: value('skill'),
      skillName: value('skill'),
      estimatedSeconds: Number(value('estimatedSeconds') || 75),
      explanation: value('explanation'),
      reviewNotes: value('reviewNotes')
    };
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
})();
