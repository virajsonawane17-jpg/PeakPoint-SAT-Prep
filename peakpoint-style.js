/* ============================================
   PEAKPOINT SAT PREP - PeakPoint Style
   Hard-only SAT-style question bank preview.
   ============================================ */

(async () => {
  if (window.PP && PP.auth) {
    const user = await PP.auth.requireAuth();
    if (!user) return;
    const firstName = (user.name || user.email || 'Student').split(' ')[0];
    const sideName = document.getElementById('side-user-name');
    if (sideName) sideName.textContent = user.name || firstName;
  }

  const topics = [
    { id: 'rw-cross-text', subject: 'Reading & Writing', skill: 'Cross-Text Connections', domain: 'Craft and Structure', progress: 1, total: 32 },
    { id: 'rw-text-structure', subject: 'Reading & Writing', skill: 'Text Structure and Purpose', domain: 'Craft and Structure', progress: 2, total: 28 },
    { id: 'rw-words-context', subject: 'Reading & Writing', skill: 'Words in Context', domain: 'Craft and Structure', progress: 1, total: 31 },
    { id: 'rw-rhetorical-synthesis', subject: 'Reading & Writing', skill: 'Rhetorical Synthesis', domain: 'Expression of Ideas', progress: 0, total: 25 },
    { id: 'rw-transitions', subject: 'Reading & Writing', skill: 'Transitions', domain: 'Expression of Ideas', progress: 0, total: 27 },
    { id: 'rw-central-ideas', subject: 'Reading & Writing', skill: 'Central Ideas and Details', domain: 'Information and Ideas', progress: 0, total: 28 },
    { id: 'rw-command-evidence', subject: 'Reading & Writing', skill: 'Command of Evidence', domain: 'Information and Ideas', progress: 0, total: 29 },
    { id: 'rw-inferences', subject: 'Reading & Writing', skill: 'Inferences', domain: 'Information and Ideas', progress: 0, total: 26 },
    { id: 'rw-boundaries', subject: 'Reading & Writing', skill: 'Boundaries', domain: 'Standard English Conventions', progress: 2, total: 24 },
    { id: 'rw-form-structure', subject: 'Reading & Writing', skill: 'Form, Structure, and Sense', domain: 'Standard English Conventions', progress: 0, total: 27 },
    { id: 'math-linear-equations', subject: 'Math', skill: 'Linear equations in one variable', domain: 'Algebra', progress: 0, total: 1 },
    { id: 'math-linear-functions', subject: 'Math', skill: 'Linear functions', domain: 'Algebra', progress: 0, total: 4 },
    { id: 'math-systems-linear', subject: 'Math', skill: 'Systems of two linear equations in two variables', domain: 'Algebra', progress: 0, total: 1 },
    { id: 'math-linear-inequalities', subject: 'Math', skill: 'Linear inequalities in one or two variables', domain: 'Algebra', progress: 1, total: 4 },
    { id: 'math-equivalent-expressions', subject: 'Math', skill: 'Equivalent expressions', domain: 'Advanced Math', progress: 0, total: 6 },
    { id: 'math-nonlinear-equations', subject: 'Math', skill: 'Nonlinear equations in one variable and systems of equations in two variables', domain: 'Advanced Math', progress: 1, total: 5 },
    { id: 'math-nonlinear-functions', subject: 'Math', skill: 'Nonlinear functions', domain: 'Advanced Math', progress: 2, total: 22 },
    { id: 'math-ratios-rates', subject: 'Math', skill: 'Ratios, rates, proportional relationships, and units', domain: 'Problem-Solving and Data Analysis', progress: 2, total: 9 },
    { id: 'math-percentages', subject: 'Math', skill: 'Percentages', domain: 'Problem-Solving and Data Analysis', progress: 0, total: 4 },
    { id: 'math-one-variable-data', subject: 'Math', skill: 'One-variable data: Distributions and measures of center and spread', domain: 'Problem-Solving and Data Analysis', progress: 0, total: 1 },
    { id: 'math-probability', subject: 'Math', skill: 'Probability and conditional probability', domain: 'Problem-Solving and Data Analysis', progress: 0, total: 1 },
    { id: 'math-area-volume', subject: 'Math', skill: 'Area and volume', domain: 'Geometry and Trigonometry', progress: 0, total: 3 },
    { id: 'math-lines-angles', subject: 'Math', skill: 'Lines, angles, and triangles', domain: 'Geometry and Trigonometry', progress: 0, total: 6 },
    { id: 'math-right-triangles', subject: 'Math', skill: 'Right triangles and trigonometry', domain: 'Geometry and Trigonometry', progress: 0, total: 3 },
    { id: 'math-circles', subject: 'Math', skill: 'Circles', domain: 'Geometry and Trigonometry', progress: 0, total: 5 }
  ];

  const questionBank = topics.map((topic, index) => ({
    id: `${topic.id}-hard-${index + 1}`,
    topicId: topic.id,
    subject: topic.subject,
    domain: topic.domain,
    skill: topic.skill,
    difficulty: 'Hard',
    type: topic.subject === 'Math' ? 'Student-produced response or multiple choice' : 'Reading & Writing multiple choice',
    estimatedTime: topic.subject === 'Math' ? '2:10' : '1:35',
    prompt: makePrompt(topic)
  }));

  let selectedSubject = 'all';
  let selectedTopic = null;

  const hardQuestions = questionBank.filter((question) => question.difficulty === 'Hard');
  const hardQuestionCount = document.getElementById('hard-question-count');
  const topicSearch = document.getElementById('topic-search');
  const questionList = document.getElementById('hard-question-list');
  const emptyBank = document.getElementById('empty-bank');
  const selectedTopicPill = document.getElementById('selected-topic-pill');
  const bankTitle = document.getElementById('hard-bank-title');

  if (hardQuestionCount) hardQuestionCount.textContent = String(hardQuestions.length);

  function makePrompt(topic) {
    const templates = {
      'Reading & Writing': `Hard SAT-style drill: analyze a dense passage and choose the answer that best targets ${topic.skill.toLowerCase()} without relying on surface wording.`,
      Math: `Hard SAT-style drill: solve a multi-step ${topic.skill.toLowerCase()} problem using structure, accuracy, and efficient setup.`
    };
    return templates[topic.subject];
  }

  function topicMatches(topic, searchValue) {
    const haystack = `${topic.subject} ${topic.domain} ${topic.skill}`.toLowerCase();
    return haystack.includes(searchValue.trim().toLowerCase());
  }

  function visibleTopics() {
    const searchValue = topicSearch ? topicSearch.value : '';
    return topics.filter((topic) => {
      const subjectMatch = selectedSubject === 'all' || topic.subject === selectedSubject;
      return subjectMatch && topicMatches(topic, searchValue);
    });
  }

  function topicQuestionCount(topicId) {
    return hardQuestions.filter((question) => question.topicId === topicId).length;
  }

  function renderTopicCard(topic) {
    const percent = topic.total ? Math.round((topic.progress / topic.total) * 100) : 0;
    const active = selectedTopic === topic.id ? ' is-active' : '';
    return `
      <article class="topic-card${active}" data-topic-card="${topic.id}" data-subject="${topic.subject}">
        <div>
          <h3>${topic.skill}</h3>
          <p>${topic.domain}</p>
          <div class="topic-meta">
            <span>${topic.progress}/${topic.total} complete</span>
            <span>${topicQuestionCount(topic.id)} hard question</span>
          </div>
          <button type="button" data-open-topic="${topic.id}">Open <span aria-hidden="true">&gt;</span></button>
        </div>
        <div class="progress-ring" style="--progress: ${percent}%">
          <span>${percent}%</span>
        </div>
      </article>
    `;
  }

  function renderTopics() {
    const visible = visibleTopics();
    const rwTopics = visible.filter((topic) => topic.subject === 'Reading & Writing');
    const mathTopics = visible.filter((topic) => topic.subject === 'Math');
    const rwGrid = document.getElementById('rw-topic-grid');
    const mathGrid = document.getElementById('math-topic-grid');

    if (rwGrid) rwGrid.innerHTML = rwTopics.map(renderTopicCard).join('');
    if (mathGrid) mathGrid.innerHTML = mathTopics.map(renderTopicCard).join('');

    document.querySelectorAll('[data-section-count]').forEach((count) => {
      const subject = count.dataset.sectionCount;
      const total = visible.filter((topic) => topic.subject === subject).length;
      count.textContent = `${total} ${total === 1 ? 'topic' : 'topics'}`;
    });

    document.querySelectorAll('[data-subject-section]').forEach((section) => {
      const subject = section.dataset.subjectSection;
      const hasTopics = visible.some((topic) => topic.subject === subject);
      section.classList.toggle('is-hidden', !hasTopics);
    });

    document.querySelectorAll('[data-open-topic]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedTopic = button.dataset.openTopic;
        renderTopics();
        renderQuestions();
        document.querySelector('.hard-bank-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function filteredQuestions() {
    return hardQuestions.filter((question) => {
      const subjectMatch = selectedSubject === 'all' || question.subject === selectedSubject;
      const topicMatch = !selectedTopic || question.topicId === selectedTopic;
      return subjectMatch && topicMatch;
    });
  }

  function renderQuestions() {
    const questions = filteredQuestions();
    const topic = topics.find((item) => item.id === selectedTopic);

    if (bankTitle) bankTitle.textContent = topic ? topic.skill : 'All hard questions';
    if (selectedTopicPill) selectedTopicPill.textContent = topic ? `${topic.domain} - Hard` : 'Hard only';
    if (emptyBank) emptyBank.classList.toggle('show', questions.length === 0);
    if (!questionList) return;

    questionList.innerHTML = questions.map((question) => `
      <article class="question-card">
        <span class="card-kicker">${question.subject}</span>
        <h3>${question.skill}</h3>
        <p>${question.prompt}</p>
        <footer>
          <span class="question-chip hard">${question.difficulty}</span>
          <span class="question-chip">${question.domain}</span>
          <span class="question-chip">${question.estimatedTime}</span>
          <span class="question-chip">${question.type}</span>
        </footer>
      </article>
    `).join('');
  }

  document.querySelectorAll('[data-subject-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedSubject = button.dataset.subjectFilter || 'all';
      selectedTopic = null;
      document.querySelectorAll('[data-subject-filter]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderTopics();
      renderQuestions();
    });
  });

  if (topicSearch) {
    topicSearch.addEventListener('input', () => {
      selectedTopic = null;
      renderTopics();
      renderQuestions();
    });
  }

  renderTopics();
  renderQuestions();
})();
