/* ============================================
   PEAKPOINT SAT PREP — Question List / Practice
   Loads real College Board questions for one skill
   (data/questions/<slug>.json) and drives the
   list view + practice modal. Progress is stored
   locally (no backend).
   ============================================ */

(() => {
  'use strict';

  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const SLUG = (params.get('skill') || params.get('slug') || '').toLowerCase();
  const STORE_KEY = 'pp_qbank_progress';
  const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 };

  const stripHtml = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const loadProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (_) { return {}; }
  };
  let progress = loadProgress();
  const saveProgress = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (_) {}
  };
  const stateOf = (id) => progress[id] || {};

  /* ---------- state ---------- */
  let questions = [];      // all questions for this skill
  let view = [];           // filtered + sorted
  const filters = { difficulty: 'all', status: 'all', search: '' };
  let sortMode = 'default';
  let modalIndex = -1;     // index into `view` currently open in modal

  /* ---------- DOM ---------- */
  const listEl = $('qlist');
  const emptyEl = $('qlist-empty');
  const countEl = $('qlist-count');
  const searchEl = $('qlist-search');
  const sortEl = $('qlist-sort');
  const toastEl = $('qlist-toast');

  const modal = $('practice-modal');
  const mPassage = $('practice-passage');
  const mPrompt = $('practice-heading');
  const mChoices = $('practice-choices');
  const mDifficulty = $('practice-difficulty');
  const mSkill = $('practice-skill');
  const mId = $('practice-id');
  const mMark = $('practice-mark');
  const mSave = $('practice-save');
  const mExplain = $('practice-explanation');
  const mExplainResult = $('explain-result');
  const mExplainText = $('explain-text');
  const mPrev = $('practice-prev');
  const mNext = $('practice-next');
  const mCheck = $('practice-check');
  const mPosition = $('practice-position');

  let toastTimer = null;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  };

  /* ---------- boot ---------- */
  const boot = async () => {
    if (!SLUG) { showFatal('No skill selected.'); return; }
    let manifest = null;
    try {
      manifest = await fetch('data/manifest.json').then((r) => (r.ok ? r.json() : null));
    } catch (_) { /* manifest is optional */ }

    applyManifestMeta(manifest);

    try {
      questions = await fetch(`data/questions/${SLUG}.json`).then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      });
    } catch (_) {
      showFatal('These questions could not be loaded yet.');
      return;
    }

    // keep an original order index for the "default" sort
    questions.forEach((q, i) => { q._i = i; });
    wireControls();
    render();
  };

  const applyManifestMeta = (manifest) => {
    let subject = params.get('subject') || '';
    let domain = params.get('domain') || '';
    let skillName = params.get('name') || '';
    let total = null;

    if (manifest) {
      for (const subj of manifest.subjects || []) {
        for (const dom of subj.domains || []) {
          for (const sk of dom.skills || []) {
            if (sk.slug === SLUG) {
              subject = subject || subj.name;
              domain = domain || dom.name;
              skillName = skillName || sk.name;
              total = sk.count;
            }
          }
        }
      }
    }
    subject = subject || 'SAT';
    skillName = skillName || 'Practice';

    $('crumb-subject').textContent = subject;
    $('crumb-skill').textContent = skillName;
    $('qlist-title').textContent = skillName;
    $('qlist-eyebrow').textContent = `${subject}${domain ? ' · ' + domain : ''}`;
    document.title = `${skillName} — PeakPoint SAT Prep`;
    if (total != null) {
      $('qlist-sub').textContent =
        `Work through ${total} official College Board question${total === 1 ? '' : 's'} for ${skillName}. Filter, sort, and open any question to practice.`;
    }
  };

  const showFatal = (msg) => {
    if (listEl) listEl.innerHTML = '';
    if (countEl) countEl.textContent = '';
    if (emptyEl) {
      emptyEl.hidden = false;
      const p = emptyEl.querySelector('p');
      if (p) p.textContent = msg;
      const btn = $('qlist-reset');
      if (btn) btn.hidden = true;
    }
  };

  /* ---------- filtering / sorting ---------- */
  const matchesStatus = (q) => {
    const st = stateOf(q.id);
    switch (filters.status) {
      case 'unattempted': return !st.status;
      case 'correct': return st.status === 'correct';
      case 'incorrect': return st.status === 'incorrect';
      case 'marked': return !!st.marked;
      default: return true;
    }
  };

  const computeView = () => {
    const query = filters.search.toLowerCase();
    view = questions.filter((q) => {
      if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
      if (!matchesStatus(q)) return false;
      if (query) {
        const hay = (q._text || (q._text = stripHtml(q.passage) + ' ' + stripHtml(q.prompt))).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    view.sort((a, b) => {
      switch (sortMode) {
        case 'diff-asc': return DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || a._i - b._i;
        case 'diff-desc': return DIFF_ORDER[b.difficulty] - DIFF_ORDER[a.difficulty] || a._i - b._i;
        case 'status': {
          const rank = (q) => (!stateOf(q.id).status ? 0 : 1);
          return rank(a) - rank(b) || a._i - b._i;
        }
        default: return a._i - b._i;
      }
    });
  };

  /* ---------- rendering ---------- */
  const render = () => {
    computeView();
    updateStats();

    if (!view.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      countEl.textContent = `0 of ${questions.length} questions`;
      return;
    }
    emptyEl.hidden = true;
    countEl.textContent = `${view.length} of ${questions.length} question${questions.length === 1 ? '' : 's'}`;

    const frag = document.createDocumentFragment();
    view.forEach((q, idx) => {
      const st = stateOf(q.id);
      const li = document.createElement('li');
      li.className = 'qcard';
      if (st.status) li.classList.add(`is-${st.status}`);

      const statusLabel = st.status === 'correct' ? 'Correct'
        : st.status === 'incorrect' ? 'Incorrect'
        : 'Not started';

      li.innerHTML = `
        <button type="button" class="qcard-open" data-open="${idx}">
          <span class="qcard-num">${q._i + 1}</span>
          <span class="qcard-main">
            <span class="qcard-preview">${escapeHtml(preview(q))}</span>
            <span class="qcard-meta">
              <span class="q-badge diff-${q.difficulty.toLowerCase()}">${q.difficulty}</span>
              <span class="qcard-type">${q.type === 'spr' ? 'Student response' : 'Multiple choice'}</span>
              <span class="qcard-status status-${st.status || 'none'}">${statusLabel}</span>
              ${st.marked ? '<span class="qcard-flag">Marked</span>' : ''}
            </span>
          </span>
          <span class="qcard-go" aria-hidden="true">›</span>
        </button>`;
      frag.appendChild(li);
    });
    listEl.innerHTML = '';
    listEl.appendChild(frag);
  };

  const preview = (q) => {
    const p = stripHtml(q.prompt);
    const generic = /which choice completes the text/i.test(p) || p.length < 40;
    const src = generic && q.passage ? stripHtml(q.passage) : p;
    return src.length > 180 ? src.slice(0, 180) + '…' : src;
  };

  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const updateStats = () => {
    let correct = 0, incorrect = 0;
    questions.forEach((q) => {
      const s = stateOf(q.id).status;
      if (s === 'correct') correct++;
      else if (s === 'incorrect') incorrect++;
    });
    const attempted = correct + incorrect;
    const total = questions.length || 1;
    const pct = Math.round((attempted / total) * 100);
    $('stat-correct').textContent = correct;
    $('stat-incorrect').textContent = incorrect;
    $('stat-remaining').textContent = total - attempted;
    $('qlist-ring-pct').textContent = pct + '%';
    const ring = $('qlist-ring');
    if (ring) ring.style.background =
      `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--surface-2) 0)`;
  };

  /* ---------- controls ---------- */
  const wireControls = () => {
    document.querySelectorAll('[data-filter-set]').forEach((group) => {
      const key = group.dataset.filterSet;
      group.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          filters[key] = btn.dataset.value;
          group.querySelectorAll('button').forEach((b) => {
            const on = b === btn;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', String(on));
          });
          render();
        });
      });
    });

    if (searchEl) searchEl.addEventListener('input', () => {
      filters.search = searchEl.value.trim();
      render();
    });
    if (sortEl) sortEl.addEventListener('change', () => {
      sortMode = sortEl.value;
      render();
    });

    const resetBtn = $('qlist-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      filters.difficulty = 'all'; filters.status = 'all'; filters.search = '';
      sortMode = 'default';
      if (searchEl) searchEl.value = '';
      if (sortEl) sortEl.value = 'default';
      document.querySelectorAll('[data-filter-set] button').forEach((b) => {
        const on = b.dataset.value === 'all';
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      render();
    });

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open]');
      if (btn) openModal(parseInt(btn.dataset.open, 10));
    });

    // modal controls
    $('practice-close').addEventListener('click', closeModal);
    mPrev.addEventListener('click', () => step(-1));
    mNext.addEventListener('click', () => step(1));
    mCheck.addEventListener('click', checkAnswer);
    mMark.addEventListener('click', toggleMark);
    mSave.addEventListener('click', toggleSave);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
  };

  /* ---------- practice modal ---------- */
  let selectedLetter = null;
  let checked = false;

  const openModal = (idx) => {
    modalIndex = idx;
    renderModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('practice-close').focus();
  };
  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    render(); // reflect any status changes
  };
  const step = (dir) => {
    const next = modalIndex + dir;
    if (next < 0 || next >= view.length) return;
    modalIndex = next;
    renderModal();
  };

  const renderModal = () => {
    const q = view[modalIndex];
    if (!q) return;
    selectedLetter = null;
    checked = false;
    const st = stateOf(q.id);

    mDifficulty.textContent = q.difficulty;
    mDifficulty.className = `q-badge diff-${q.difficulty.toLowerCase()}`;
    mSkill.textContent = q.skill;
    mId.textContent = '#' + String(q.questionId || q.id).slice(0, 8);
    mPosition.textContent = `${modalIndex + 1} of ${view.length}`;

    // passage
    if (q.passage && stripHtml(q.passage)) {
      mPassage.innerHTML = q.passage;
      mPassage.hidden = false;
    } else {
      mPassage.hidden = true;
      mPassage.innerHTML = '';
    }
    mPrompt.innerHTML = q.prompt || 'Question';

    // choices or grid-in
    mChoices.innerHTML = '';
    mExplain.hidden = true;
    if (q.type === 'spr' || !q.choices.length) {
      const wrap = document.createElement('div');
      wrap.className = 'spr-input';
      wrap.innerHTML = `
        <label for="spr-field">Enter your answer</label>
        <input id="spr-field" type="text" autocomplete="off" inputmode="text" placeholder="Your answer" />`;
      mChoices.appendChild(wrap);
      wrap.querySelector('input').addEventListener('input', (e) => {
        selectedLetter = e.target.value.trim();
        mCheck.disabled = !selectedLetter;
      });
    } else {
      q.choices.forEach((c) => {
        const label = document.createElement('label');
        label.className = 'choice';
        label.dataset.letter = c.letter;
        label.innerHTML = `
          <input type="radio" name="choice" value="${c.letter}" />
          <span class="choice-letter">${c.letter}</span>
          <span class="choice-body">${c.html}</span>`;
        label.querySelector('input').addEventListener('change', () => {
          selectedLetter = c.letter;
          mChoices.querySelectorAll('.choice').forEach((x) => x.classList.remove('is-picked'));
          label.classList.add('is-picked');
          mCheck.disabled = false;
        });
        mChoices.appendChild(label);
      });
    }

    mCheck.disabled = true;
    mCheck.textContent = 'Check answer';
    mCheck.hidden = false;

    // mark / save state
    setToggle(mMark, !!st.marked);
    setToggle(mSave, !!st.saved);

    // if previously attempted, show prior result immediately
    if (st.status) {
      revealAnswer(q, st.status === 'correct', true);
    }
  };

  const setToggle = (btn, on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-on', on);
  };

  const normalizeSpr = (s) => String(s).replace(/\s+/g, '').toLowerCase();
  const sprCorrect = (q, val) => {
    const accepted = String(q.answerText || '').split(',').map((x) => normalizeSpr(x)).filter(Boolean);
    const guess = normalizeSpr(val);
    if (accepted.includes(guess)) return true;
    const gNum = parseFloat(val);
    return accepted.some((a) => {
      const n = parseFloat(a);
      return !isNaN(n) && !isNaN(gNum) && Math.abs(n - gNum) < 1e-9;
    });
  };

  const checkAnswer = () => {
    const q = view[modalIndex];
    if (!q || checked) return;
    let isCorrect;
    if (q.type === 'spr' || !q.choices.length) {
      if (!selectedLetter) return;
      // A handful of grid-ins store their answer only as an image in the
      // rationale; there is nothing to auto-grade against, so just reveal it.
      if (!q.answerText) { revealAnswer(q, null, false); return; }
      isCorrect = sprCorrect(q, selectedLetter);
    } else {
      if (!selectedLetter) return;
      isCorrect = selectedLetter === q.answer;
    }
    progress[q.id] = Object.assign({}, progress[q.id], { status: isCorrect ? 'correct' : 'incorrect' });
    saveProgress();
    updateStats();
    revealAnswer(q, isCorrect, false);
  };

  const revealAnswer = (q, isCorrect, replay) => {
    checked = true;
    mCheck.hidden = true;

    if (q.type !== 'spr' && q.choices.length) {
      mChoices.querySelectorAll('.choice').forEach((label) => {
        const letter = label.dataset.letter;
        const input = label.querySelector('input');
        input.disabled = true;
        if (letter === q.answer) label.classList.add('is-correct');
        if (!replay && letter === selectedLetter && !isCorrect) label.classList.add('is-wrong');
      });
    } else {
      const input = mChoices.querySelector('input');
      if (input) input.disabled = true;
      if (q.answerText) {
        const sol = document.createElement('p');
        sol.className = 'spr-solution';
        sol.innerHTML = `Accepted answer${String(q.answerText).includes(',') ? 's' : ''}: <strong>${escapeHtml(q.answerText)}</strong>`;
        mChoices.appendChild(sol);
      } else {
        const sol = document.createElement('p');
        sol.className = 'spr-solution';
        sol.textContent = 'See the explanation below for the correct answer.';
        mChoices.appendChild(sol);
      }
    }

    if (isCorrect === null) {
      mExplainResult.textContent = 'Answer revealed';
      mExplainResult.className = 'explain-result';
    } else {
      mExplainResult.textContent = replay
        ? (isCorrect ? 'You answered this correctly' : 'You answered this incorrectly')
        : (isCorrect ? 'Correct!' : 'Not quite');
      mExplainResult.className = 'explain-result ' + (isCorrect ? 'is-correct' : 'is-wrong');
    }
    mExplainText.innerHTML = q.rationale || 'No explanation provided for this question.';
    mExplain.hidden = false;
  };

  const toggleMark = () => {
    const q = view[modalIndex];
    if (!q) return;
    const st = Object.assign({}, progress[q.id]);
    st.marked = !st.marked;
    progress[q.id] = st;
    saveProgress();
    setToggle(mMark, st.marked);
    toast(st.marked ? 'Marked for review' : 'Unmarked');
  };

  const toggleSave = () => {
    const q = view[modalIndex];
    if (!q) return;
    const st = Object.assign({}, progress[q.id]);
    st.saved = !st.saved;
    progress[q.id] = st;
    saveProgress();
    setToggle(mSave, st.saved);
    toast(st.saved ? 'Saved' : 'Removed from saved');
  };

  boot();
})();
