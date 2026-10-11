(async () => {
  const question = document.getElementById('preview-question');
  const choices = document.getElementById('preview-choices');
  const feedback = document.getElementById('preview-feedback');
  const check = document.getElementById('preview-check');
  try {
    const response = await fetch('data/questions/ha.json');
    if (!response.ok) throw new Error('Unavailable');
    const bank = await response.json();
    const item = bank.find((q) => q.type === 'mcq' && q.choices?.length && q.answer);
    if (!item) throw new Error('No preview');
    document.getElementById('preview-skill').textContent = `${item.skill} · ${item.difficulty} · College Board question`;
    // Reviewed repository question content, matching the full practice renderer.
    question.innerHTML = (item.passage || '') + item.prompt;
    item.choices.forEach((choice) => {
      const label = document.createElement('label'); label.className = 'preview-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'preview-answer'; input.value = choice.letter; input.required = true;
      const text = document.createElement('span'); text.innerHTML = `${choice.letter}. ${choice.html}`;
      label.append(input, text); choices.append(label);
    });
    check.disabled = false;
    document.getElementById('preview-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = choices.querySelector('input:checked'); if (!selected) return;
      feedback.replaceChildren();
      const result = document.createElement('p');
      result.textContent = selected.value === item.answer ? 'Correct. Review the explanation below.' : `The correct answer is ${item.answer}. Review the explanation and try the full practice tools.`;
      const explanation = document.createElement('div'); explanation.innerHTML = item.rationale || 'An explanation is not available for this question.';
      feedback.append(result, explanation);
    });
  } catch {
    document.getElementById('preview-skill').textContent = 'Preview unavailable';
    feedback.textContent = 'We could not load this question. Refresh to retry, or open the full question bank below.';
    document.getElementById('preview-form').hidden = true;
  }
})();
