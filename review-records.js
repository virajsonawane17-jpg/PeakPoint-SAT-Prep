(async () => {
  const user = await PP.auth.requireAuth(); if (!user) return;
  const status = document.getElementById('review-status');
  const host = document.getElementById('review-records');
  const saved = location.pathname.endsWith('saved.html');
  try {
    const progress = JSON.parse(localStorage.getItem(`pp_qbank_progress:${user.id}`) || '{}');
    const records = Object.entries(progress).filter(([, value]) => saved ? value.saved : value.status === 'incorrect');
    status.textContent = records.length ? `${records.length} ${saved ? 'saved' : 'incorrect'} questions.` : `No ${saved ? 'saved questions' : 'incorrect answers'} yet. Start a practice session in the question bank.`;
    records.forEach(([id, record]) => {
      const card = document.createElement('article'); card.className = 'data-notice';
      const title = document.createElement('h2'); title.textContent = `${record.slug || 'Practice'} · ${record.difficulty || 'Mixed difficulty'}`;
      const label = document.createElement('p'); label.textContent = `Question ${id} · ${record.status || 'Not answered'}`;
      const link = document.createElement('a');
      const query = new URLSearchParams({ skill: record.slug || '', ...(saved ? {saved:'saved'} : {result:'incorrect'}) });
      link.href = `question-list.html?${query}`; link.textContent = 'Review this skill';
      card.append(title, label, link); host.append(card);
    });
  } catch { status.textContent = 'Your local records could not be read. Check browser storage permissions and retry.'; }
})();
