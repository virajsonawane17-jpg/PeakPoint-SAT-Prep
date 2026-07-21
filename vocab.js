/* ============================================
   PEAKPOINT SAT PREP — Vocabulary Practice
   ============================================ */

(async () => {
  let userId = 'guest';
  if (window.PP && PP.auth) {
    const user = await PP.auth.requireAuth();
    if (!user) return;
    userId = user.id || user.email || 'student';
    const firstName = (user.name || user.email || 'Student').split(' ')[0];
    const sideName = document.getElementById('side-user-name');
    if (sideName) sideName.textContent = user.name || firstName;
  }

  const words = Array.isArray(window.PP_VOCAB_WORDS) ? window.PP_VOCAB_WORDS : [];
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = `pp_vocab_progress:${userId}`;
  const ACTIVITY_KEY = `peakpoint-activity-log:${userId}`;
  const PAGE_SIZE = 96;
  const PRACTICE_SIZE = 10;
  const MATCH_SIZE = 6;
  const DECK_SIZE = 15;
  const STATUS_LABEL = {
    new: 'New',
    learning: 'Learning',
    shaky: 'Shaky',
    mastered: 'Mastered',
  };
  const DIFFICULTY_ORDER = { Core: 1, Medium: 2, Advanced: 3 };
  const STATUS_ORDER = { new: 1, learning: 2, shaky: 3, mastered: 4 };

  const tabs = Array.from(document.querySelectorAll('[data-vocab-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-vocab-panel]'));
  const grid = $('word-grid');
  const search = $('vocab-search');
  const empty = $('word-empty');
  const totalEl = $('vocab-total');
  const visibleEl = $('vocab-visible');
  const masteredEl = $('vocab-mastered');
  const resultsCount = $('vocab-results-count');
  const loadMore = $('vocab-load-more');
  const reset = $('vocab-reset');
  const gameCard = $('vocab-game-card');
  const gameEmpty = $('vocab-game-empty');
  const gameShell = $('vocab-game-shell');
  const gameModeLabel = $('game-mode-label');
  const gameTitle = $('game-title');
  const gameBody = $('vocab-game-body');
  const gameFeedback = $('vocab-game-feedback');
  const gameActions = $('vocab-game-actions');
  const gameScore = $('game-score');
  const gameStreak = $('game-streak');
  const gameTimer = $('game-timer');
  const exploreMastered = $('explore-mastered');
  const exploreLearning = $('explore-learning');
  const exploreShaky = $('explore-shaky');
  const exploreXp = $('explore-xp');
  const exploreTitle = $('vocab-explore-title');
  const exploreSummary = $('vocab-explore-summary');
  const progressBar = $('vocab-progress-bar');
  const controls = {
    difficulty: $('vocab-difficulty'),
    pos: $('vocab-pos'),
    status: $('vocab-status'),
    alpha: $('vocab-alpha'),
    length: $('vocab-length'),
    sort: $('vocab-sort'),
  };

  const filters = {
    query: '',
    difficulty: 'all',
    pos: 'all',
    status: 'all',
    alpha: 'all',
    length: 'all',
    sort: 'az',
  };
  let visibleLimit = PAGE_SIZE;
  let progress = loadProgress();
  let filteredWords = [];
  let activeGame = null;
  let matchTimerId = null;

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (_) {
      // Local progress is best effort.
    }
  }

  function recordVocabActivity(xp) {
    try {
      const log = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
      log.push({ type: 'vocab', xp, t: Date.now() });
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log.slice(-300)));
    } catch (_) {
      // Analytics activity is best effort.
    }
  }

  function meta() {
    progress._meta = progress._meta && typeof progress._meta === 'object' ? progress._meta : {};
    progress._meta.xp = Number(progress._meta.xp || 0);
    progress._meta.bestStreak = Number(progress._meta.bestStreak || 0);
    return progress._meta;
  }

  function addXp(amount) {
    meta().xp += amount;
    recordVocabActivity(amount);
    saveProgress();
    updateExploreStats();
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function sample(list, size) {
    return shuffle(list).slice(0, Math.min(size, list.length));
  }

  function wordById(id) {
    return words.find((item) => item.id === id);
  }

  function candidateWords(size, includeMastered) {
    const ranked = words.filter((item) => includeMastered || getStatus(item) !== 'mastered')
      .sort((a, b) => (STATUS_ORDER[getStatus(b)] || 0) - (STATUS_ORDER[getStatus(a)] || 0));
    const base = ranked.length >= size ? ranked : words;
    return sample(base, size);
  }

  function updateExploreStats() {
    const counts = { mastered: 0, learning: 0, shaky: 0 };
    words.forEach((item) => {
      const status = getStatus(item);
      if (counts[status] != null) counts[status] += 1;
    });
    const masteredPct = words.length ? Math.round((counts.mastered / words.length) * 100) : 0;
    if (exploreMastered) exploreMastered.textContent = counts.mastered.toLocaleString();
    if (exploreLearning) exploreLearning.textContent = counts.learning.toLocaleString();
    if (exploreShaky) exploreShaky.textContent = counts.shaky.toLocaleString();
    if (exploreXp) exploreXp.textContent = meta().xp.toLocaleString();
    if (progressBar) progressBar.style.width = `${masteredPct}%`;
    if (exploreTitle) {
      exploreTitle.textContent = counts.learning || counts.shaky
        ? 'Keep climbing your review deck'
        : 'Build your word power';
    }
    if (exploreSummary) {
      exploreSummary.textContent = counts.shaky
        ? `${counts.shaky.toLocaleString()} shaky words are ready for a focused comeback round.`
        : `${counts.mastered.toLocaleString()} mastered so far. Quick games move new words into long-term memory.`;
    }
  }

  function setGameMetrics(score, streak, timerText) {
    if (gameScore) gameScore.textContent = String(score || 0);
    if (gameStreak) gameStreak.textContent = String(streak || 0);
    if (gameTimer) gameTimer.textContent = timerText || 'Ready';
  }

  function showGameShell(modeLabel) {
    if (gameEmpty) gameEmpty.hidden = true;
    if (gameShell) gameShell.hidden = false;
    if (gameModeLabel) gameModeLabel.textContent = modeLabel;
    if (gameFeedback) {
      gameFeedback.hidden = true;
      gameFeedback.className = 'vocab-game-feedback';
      gameFeedback.textContent = '';
    }
    if (gameActions) gameActions.innerHTML = '';
    if (gameCard) gameCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function stopMatchTimer() {
    if (matchTimerId) {
      clearInterval(matchTimerId);
      matchTimerId = null;
    }
  }

  function getStatus(item) {
    return progress[item.id] || 'new';
  }

  function setStatus(id, status) {
    if (status === 'new') delete progress[id];
    else progress[id] = status;
    saveProgress();
    updateExploreStats();
    render();
  }

  function promoteAfterCorrect(item) {
    const status = getStatus(item);
    if (status === 'learning' || status === 'shaky') setStatus(item.id, 'mastered');
    else if (status !== 'mastered') setStatus(item.id, 'learning');
  }

  function markMissed(item) {
    if (getStatus(item) !== 'mastered') setStatus(item.id, 'shaky');
  }

  function definitionOptions(item) {
    const distractors = sample(
      words.filter((candidate) => candidate.id !== item.id && candidate.definition !== item.definition),
      3
    );
    return shuffle([item, ...distractors]);
  }

  function startPractice() {
    stopMatchTimer();
    const queue = candidateWords(PRACTICE_SIZE, false);
    activeGame = {
      mode: 'practice',
      queue,
      index: 0,
      score: 0,
      streak: 0,
      answered: false,
      options: [],
    };
    showGameShell('Practice');
    renderPracticeQuestion();
  }

  function renderPracticeQuestion() {
    if (!activeGame || activeGame.mode !== 'practice') return;
    const item = activeGame.queue[activeGame.index];
    if (!item) {
      finishGame('Practice complete', `You earned ${activeGame.score} points and moved words into your review cycle.`);
      return;
    }
    activeGame.answered = false;
    activeGame.options = definitionOptions(item);
    if (gameTitle) gameTitle.textContent = `Question ${activeGame.index + 1} of ${activeGame.queue.length}`;
    setGameMetrics(activeGame.score, activeGame.streak, `${activeGame.queue.length - activeGame.index} left`);
    if (gameFeedback) gameFeedback.hidden = true;
    if (gameBody) {
      gameBody.innerHTML = `
        <div class="practice-prompt">
          <span class="word-tag">${escapeHTML(item.partOfSpeech)}</span>
          <h3>${escapeHTML(item.word)}</h3>
          <p>Choose the definition that best matches this word.</p>
        </div>
        <div class="practice-choices">
          ${activeGame.options.map((option) => `
            <button type="button" data-choice-id="${escapeHTML(option.id)}">${escapeHTML(option.definition)}</button>
          `).join('')}
        </div>
      `;
    }
    if (gameActions) {
      gameActions.innerHTML = '<button class="vocab-secondary-action" type="button" data-game-action="end">End round</button>';
    }
  }

  function answerPractice(choiceId) {
    if (!activeGame || activeGame.mode !== 'practice' || activeGame.answered) return;
    const item = activeGame.queue[activeGame.index];
    const correct = choiceId === item.id;
    activeGame.answered = true;
    if (correct) {
      activeGame.score += 10 + Math.min(activeGame.streak * 2, 10);
      activeGame.streak += 1;
      meta().bestStreak = Math.max(meta().bestStreak, activeGame.streak);
      promoteAfterCorrect(item);
      addXp(8);
    } else {
      activeGame.streak = 0;
      markMissed(item);
      addXp(2);
    }
    setGameMetrics(activeGame.score, activeGame.streak, `${activeGame.queue.length - activeGame.index - 1} left`);

    if (gameBody) {
      gameBody.querySelectorAll('[data-choice-id]').forEach((button) => {
        const isCorrect = button.dataset.choiceId === item.id;
        const isChosen = button.dataset.choiceId === choiceId;
        button.disabled = true;
        button.classList.toggle('is-correct', isCorrect);
        button.classList.toggle('is-wrong', isChosen && !isCorrect);
      });
    }
    if (gameFeedback) {
      gameFeedback.hidden = false;
      gameFeedback.className = `vocab-game-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
      gameFeedback.innerHTML = correct
        ? `<strong>Nice hit.</strong> ${escapeHTML(item.word)} means ${escapeHTML(item.definition.toLowerCase())}.`
        : `<strong>Lock this one in.</strong> ${escapeHTML(item.word)} means ${escapeHTML(item.definition.toLowerCase())}.`;
    }
    if (gameActions) {
      const last = activeGame.index >= activeGame.queue.length - 1;
      gameActions.innerHTML = `
        <button class="start-practice" type="button" data-game-action="${last ? 'finish-practice' : 'next-practice'}">${last ? 'Finish round' : 'Next word'}</button>
        <button class="vocab-secondary-action" type="button" data-game-action="deck-current" data-word-id="${escapeHTML(item.id)}">Review this word</button>
      `;
    }
  }

  function startMatch() {
    stopMatchTimer();
    const pairs = candidateWords(MATCH_SIZE, false);
    activeGame = {
      mode: 'match',
      pairs,
      definitions: shuffle(pairs),
      matched: {},
      selectedWord: null,
      selectedDef: null,
      score: 0,
      streak: 0,
      seconds: 60,
    };
    showGameShell('Speed Match');
    renderMatch();
    matchTimerId = setInterval(() => {
      if (!activeGame || activeGame.mode !== 'match') return stopMatchTimer();
      activeGame.seconds -= 1;
      setGameMetrics(activeGame.score, activeGame.streak, `${activeGame.seconds}s`);
      if (activeGame.seconds <= 0) {
        stopMatchTimer();
        finishGame('Time is up', `You matched ${Object.keys(activeGame.matched).length} of ${activeGame.pairs.length} words.`);
      }
    }, 1000);
  }

  function renderMatch() {
    if (!activeGame || activeGame.mode !== 'match') return;
    if (gameTitle) gameTitle.textContent = 'Match each word to its meaning';
    setGameMetrics(activeGame.score, activeGame.streak, `${activeGame.seconds}s`);
    if (gameFeedback) gameFeedback.hidden = true;
    if (gameBody) {
      gameBody.innerHTML = `
        <div class="match-board">
          <div class="match-column">
            <h3>Words</h3>
            ${activeGame.pairs.map((item) => `
              <button type="button" class="${activeGame.matched[item.id] ? 'is-matched' : ''}" data-match-word="${escapeHTML(item.id)}" ${activeGame.matched[item.id] ? 'disabled' : ''}>${escapeHTML(item.word)}</button>
            `).join('')}
          </div>
          <div class="match-column">
            <h3>Definitions</h3>
            ${activeGame.definitions.map((item) => `
              <button type="button" class="${activeGame.matched[item.id] ? 'is-matched' : ''}" data-match-def="${escapeHTML(item.id)}" ${activeGame.matched[item.id] ? 'disabled' : ''}>${escapeHTML(item.definition)}</button>
            `).join('')}
          </div>
        </div>
      `;
      if (activeGame.selectedWord) {
        const selected = gameBody.querySelector(`[data-match-word="${activeGame.selectedWord}"]`);
        if (selected) selected.classList.add('is-selected');
      }
      if (activeGame.selectedDef) {
        const selected = gameBody.querySelector(`[data-match-def="${activeGame.selectedDef}"]`);
        if (selected) selected.classList.add('is-selected');
      }
    }
    if (gameActions) {
      gameActions.innerHTML = '<button class="vocab-secondary-action" type="button" data-game-action="end">End round</button>';
    }
  }

  function selectMatch(type, id) {
    if (!activeGame || activeGame.mode !== 'match' || activeGame.matched[id]) return;
    if (type === 'word') activeGame.selectedWord = id;
    if (type === 'def') activeGame.selectedDef = id;
    if (!activeGame.selectedWord || !activeGame.selectedDef) {
      renderMatch();
      return;
    }

    const correct = activeGame.selectedWord === activeGame.selectedDef;
    const item = wordById(activeGame.selectedWord);
    if (correct) {
      activeGame.matched[id] = true;
      activeGame.score += 15 + Math.min(activeGame.streak * 3, 15);
      activeGame.streak += 1;
      meta().bestStreak = Math.max(meta().bestStreak, activeGame.streak);
      if (item) promoteAfterCorrect(item);
      addXp(10);
    } else {
      activeGame.streak = 0;
      if (item) markMissed(item);
      addXp(1);
    }

    if (gameFeedback) {
      gameFeedback.hidden = false;
      gameFeedback.className = `vocab-game-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
      gameFeedback.innerHTML = correct
        ? '<strong>Matched.</strong> Keep the streak moving.'
        : '<strong>Not quite.</strong> Try another pairing.';
    }

    activeGame.selectedWord = null;
    activeGame.selectedDef = null;
    setGameMetrics(activeGame.score, activeGame.streak, `${activeGame.seconds}s`);

    if (Object.keys(activeGame.matched).length >= activeGame.pairs.length) {
      stopMatchTimer();
      finishGame('Board cleared', `You matched all ${activeGame.pairs.length} words with ${activeGame.seconds} seconds left.`);
      return;
    }

    setTimeout(() => {
      if (activeGame && activeGame.mode === 'match') renderMatch();
    }, correct ? 420 : 650);
  }

  function startDeck(seedId) {
    stopMatchTimer();
    let queue = [];
    if (seedId) {
      const seed = wordById(seedId);
      if (seed) queue = [seed, ...candidateWords(DECK_SIZE - 1, true).filter((item) => item.id !== seed.id)];
    } else {
      const reviewPool = words.filter((item) => ['learning', 'shaky'].includes(getStatus(item)));
      queue = sample(reviewPool.length ? reviewPool : words, DECK_SIZE);
      if (queue.length < DECK_SIZE) {
        const used = new Set(queue.map((item) => item.id));
        queue = queue.concat(sample(words.filter((item) => !used.has(item.id)), DECK_SIZE - queue.length));
      }
    }
    activeGame = {
      mode: 'deck',
      queue,
      index: 0,
      score: 0,
      streak: 0,
      revealed: false,
    };
    showGameShell('Review Deck');
    renderDeckCard();
  }

  function renderDeckCard() {
    if (!activeGame || activeGame.mode !== 'deck') return;
    const item = activeGame.queue[activeGame.index];
    if (!item) {
      finishGame('Review complete', `You reviewed ${activeGame.queue.length} words and earned ${activeGame.score} points.`);
      return;
    }
    if (gameTitle) gameTitle.textContent = `Card ${activeGame.index + 1} of ${activeGame.queue.length}`;
    setGameMetrics(activeGame.score, activeGame.streak, `${activeGame.queue.length - activeGame.index} cards`);
    if (gameFeedback) gameFeedback.hidden = true;
    if (gameBody) {
      gameBody.innerHTML = `
        <div class="deck-card ${activeGame.revealed ? 'is-revealed' : ''}">
          <span class="word-tag">${escapeHTML(item.partOfSpeech)} - ${escapeHTML(item.difficulty)}</span>
          <h3>${escapeHTML(item.word)}</h3>
          <p>${activeGame.revealed ? escapeHTML(item.definition) : 'Say the meaning out loud, then reveal the answer.'}</p>
        </div>
      `;
    }
    if (gameActions) {
      gameActions.innerHTML = activeGame.revealed
        ? `
          <button class="start-practice" type="button" data-game-action="deck-know">I knew it</button>
          <button class="vocab-secondary-action" type="button" data-game-action="deck-shaky">Still shaky</button>
          <button class="vocab-secondary-action" type="button" data-game-action="deck-next">Skip</button>
        `
        : `
          <button class="start-practice" type="button" data-game-action="deck-reveal">Reveal definition</button>
          <button class="vocab-secondary-action" type="button" data-game-action="end">End review</button>
        `;
    }
  }

  function advanceDeck(status) {
    if (!activeGame || activeGame.mode !== 'deck') return;
    const item = activeGame.queue[activeGame.index];
    if (status === 'mastered') {
      promoteAfterCorrect(item);
      activeGame.score += 8;
      activeGame.streak += 1;
      addXp(6);
    } else if (status === 'shaky') {
      markMissed(item);
      activeGame.streak = 0;
      addXp(2);
    }
    activeGame.index += 1;
    activeGame.revealed = false;
    renderDeckCard();
  }

  function finishGame(title, message) {
    stopMatchTimer();
    if (!activeGame) return;
    const mode = activeGame.mode;
    const score = activeGame.score || 0;
    const streak = activeGame.streak || 0;
    if (gameTitle) gameTitle.textContent = title;
    setGameMetrics(score, streak, 'Done');
    if (gameFeedback) gameFeedback.hidden = true;
    if (gameBody) {
      gameBody.innerHTML = `
        <div class="game-summary-card">
          <span class="game-empty-icon" aria-hidden="true"></span>
          <p class="eyebrow">Round results</p>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(message)}</p>
          <div class="summary-stats">
            <span><strong>${score}</strong> score</span>
            <span><strong>${meta().xp}</strong> total XP</span>
            <span><strong>${meta().bestStreak}</strong> best streak</span>
          </div>
        </div>
      `;
    }
    if (gameActions) {
      gameActions.innerHTML = `
        <button class="start-practice" type="button" data-game-action="restart-${escapeHTML(mode)}">Play again</button>
        <button class="vocab-secondary-action" type="button" data-game-action="show-library">Open Library</button>
      `;
    }
  }

  function showPanel(name) {
    tabs.forEach((tab) => {
      const active = tab.dataset.vocabTab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.vocabPanel === name);
    });
  }

  function populatePartOfSpeech() {
    if (!controls.pos) return;
    const counts = words.reduce((acc, item) => {
      const key = item.partOfSpeech || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .forEach((pos) => {
        const option = document.createElement('option');
        option.value = pos;
        option.textContent = `${pos} (${counts[pos].toLocaleString()})`;
        controls.pos.appendChild(option);
      });
  }

  function syncFiltersFromControls() {
    filters.query = search ? search.value.trim().toLowerCase() : '';
    filters.difficulty = controls.difficulty ? controls.difficulty.value : 'all';
    filters.pos = controls.pos ? controls.pos.value : 'all';
    filters.status = controls.status ? controls.status.value : 'all';
    filters.alpha = controls.alpha ? controls.alpha.value : 'all';
    filters.length = controls.length ? controls.length.value : 'all';
    filters.sort = controls.sort ? controls.sort.value : 'az';
  }

  function applyFilters() {
    const q = filters.query;
    filteredWords = words.filter((item) => {
      const status = getStatus(item);
      if (q && !`${item.word} ${item.definition} ${item.partOfSpeech}`.toLowerCase().includes(q)) return false;
      if (filters.difficulty !== 'all' && item.difficulty !== filters.difficulty) return false;
      if (filters.pos !== 'all' && item.partOfSpeech !== filters.pos) return false;
      if (filters.status !== 'all' && status !== filters.status) return false;
      if (filters.alpha !== 'all' && item.alphabetGroup !== filters.alpha) return false;
      if (filters.length !== 'all' && item.lengthBand !== filters.length) return false;
      return true;
    });

    filteredWords.sort((a, b) => {
      if (filters.sort === 'za') return b.word.localeCompare(a.word);
      if (filters.sort === 'difficulty') {
        return (DIFFICULTY_ORDER[b.difficulty] || 0) - (DIFFICULTY_ORDER[a.difficulty] || 0) ||
          a.word.localeCompare(b.word);
      }
      if (filters.sort === 'status') {
        return (STATUS_ORDER[getStatus(a)] || 0) - (STATUS_ORDER[getStatus(b)] || 0) ||
          a.word.localeCompare(b.word);
      }
      return a.word.localeCompare(b.word);
    });
  }

  function renderStats() {
    const mastered = words.filter((item) => getStatus(item) === 'mastered').length;
    if (totalEl) totalEl.textContent = words.length.toLocaleString();
    if (visibleEl) visibleEl.textContent = filteredWords.length.toLocaleString();
    if (masteredEl) masteredEl.textContent = mastered.toLocaleString();
    if (resultsCount) {
      const showing = Math.min(visibleLimit, filteredWords.length);
      resultsCount.textContent = filteredWords.length
        ? `Showing ${showing.toLocaleString()} of ${filteredWords.length.toLocaleString()} matching words`
        : '';
    }
  }

  function renderCard(item) {
    const status = getStatus(item);
    const statusLabel = STATUS_LABEL[status] || 'New';
    const buttons = ['learning', 'shaky', 'mastered'].map((nextStatus) => {
      const active = status === nextStatus ? ' is-active' : '';
      return `<button class="word-action ${nextStatus}${active}" type="button" data-word-id="${escapeHTML(item.id)}" data-status="${nextStatus}">${STATUS_LABEL[nextStatus]}</button>`;
    }).join('');
    return `
      <article class="word-card" data-difficulty="${escapeHTML(item.difficulty)}">
        <div class="word-card-head">
          <strong>${escapeHTML(item.word)}</strong>
          <span class="word-status ${escapeHTML(status)}">${escapeHTML(statusLabel)}</span>
        </div>
        <p class="word-definition">${escapeHTML(item.definition)}</p>
        <div class="word-tags" aria-label="Word categories">
          <span class="word-tag">${escapeHTML(item.partOfSpeech || 'Other')}</span>
          <span class="word-tag">${escapeHTML(item.difficulty)}</span>
          <span class="word-tag">${escapeHTML(item.lengthBand)}</span>
          <span class="word-tag">${escapeHTML(item.alphabetGroup)}</span>
        </div>
        <div class="word-actions" aria-label="Set review status">
          ${buttons}
          ${status !== 'new' ? `<button class="word-action" type="button" data-word-id="${escapeHTML(item.id)}" data-status="new">Reset</button>` : ''}
        </div>
      </article>
    `;
  }

  function render() {
    if (!grid) return;
    syncFiltersFromControls();
    applyFilters();
    const visible = filteredWords.slice(0, visibleLimit);
    grid.innerHTML = visible.map(renderCard).join('');
    if (empty) empty.classList.toggle('show', filteredWords.length === 0);
    if (loadMore) {
      loadMore.hidden = visibleLimit >= filteredWords.length;
      loadMore.textContent = `Load ${Math.min(PAGE_SIZE, Math.max(0, filteredWords.length - visibleLimit))} more`;
    }
    renderStats();
  }

  function resetFilters() {
    if (search) search.value = '';
    Object.entries(controls).forEach(([key, control]) => {
      if (!control) return;
      control.value = key === 'sort' ? 'az' : 'all';
    });
    visibleLimit = PAGE_SIZE;
    render();
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.vocabTab));
  });

  document.querySelectorAll('[data-vocab-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.vocabMode;
      if (mode === 'practice') startPractice();
      if (mode === 'match') startMatch();
      if (mode === 'deck') startDeck();
    });
  });

  [search, ...Object.values(controls)].forEach((control) => {
    if (!control) return;
    control.addEventListener(control === search ? 'input' : 'change', () => {
      visibleLimit = PAGE_SIZE;
      render();
    });
  });

  if (loadMore) {
    loadMore.addEventListener('click', () => {
      visibleLimit += PAGE_SIZE;
      render();
    });
  }

  if (reset) reset.addEventListener('click', resetFilters);

  if (grid) {
    grid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-word-id][data-status]');
      if (!button) return;
      setStatus(button.dataset.wordId, button.dataset.status);
    });
  }

  if (gameBody) {
    gameBody.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice-id]');
      if (choice) answerPractice(choice.dataset.choiceId);

      const wordButton = event.target.closest('[data-match-word]');
      if (wordButton) selectMatch('word', wordButton.dataset.matchWord);

      const defButton = event.target.closest('[data-match-def]');
      if (defButton) selectMatch('def', defButton.dataset.matchDef);
    });
  }

  if (gameActions) {
    gameActions.addEventListener('click', (event) => {
      const button = event.target.closest('[data-game-action]');
      if (!button) return;
      const action = button.dataset.gameAction;

      if (action === 'end') {
        finishGame('Round paused', 'Your word progress from this round has been saved on this device.');
      }
      if (action === 'next-practice') {
        activeGame.index += 1;
        renderPracticeQuestion();
      }
      if (action === 'finish-practice') {
        finishGame('Practice complete', `You scored ${activeGame.score} points across ${activeGame.queue.length} words.`);
      }
      if (action === 'deck-current') {
        startDeck(button.dataset.wordId);
      }
      if (action === 'deck-reveal') {
        activeGame.revealed = true;
        renderDeckCard();
      }
      if (action === 'deck-know') advanceDeck('mastered');
      if (action === 'deck-shaky') advanceDeck('shaky');
      if (action === 'deck-next') advanceDeck('skip');
      if (action === 'restart-practice') startPractice();
      if (action === 'restart-match') startMatch();
      if (action === 'restart-deck') startDeck();
      if (action === 'show-library') {
        showPanel('library');
        if (controls.status) controls.status.value = 'all';
        visibleLimit = PAGE_SIZE;
        render();
      }
    });
  }

  populatePartOfSpeech();
  updateExploreStats();
  render();
})();
