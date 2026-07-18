/* ============================================
   PEAKPOINT SAT PREP — Question Bank
   Renders the Reading & Writing / Math topic tree
   from data/manifest.json (College Board SAT Suite
   Question Bank) with dropdown filter pills whose
   selection both updates the live counts and is
   carried through to the question list.
   ============================================ */

(() => {
  'use strict';

  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  const STORE_KEY = 'pp_qbank_progress';

  const grid = document.getElementById('subject-grid');
  const loading = document.getElementById('bank-loading');
  const emptyEl = document.getElementById('bank-empty');
  const searchInput = document.getElementById('bank-search');
  const pillsHost = document.getElementById('filter-pills');
  const resetBtn = document.getElementById('filter-reset');

  const fmt = (n) => n.toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const normalize = (v) => v.toLowerCase().replace(/\s+/g, ' ').trim();

  /* ---- filter state ---- */
  const filters = { difficulty: 'all', result: 'all', completed: 'all', saved: 'all', search: '' };

  const PILLS = [
    {
      key: 'difficulty', label: 'Difficulty', icon: 'ic-difficulty',
      options: [
        { value: 'all', label: 'Any difficulty' },
        { value: 'Easy', label: 'Easy' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Hard', label: 'Hard' },
      ],
    },
    {
      key: 'result', label: 'Result', icon: 'ic-result',
      options: [
        { value: 'all', label: 'Any result' },
        { value: 'correct', label: 'Correct' },
        { value: 'incorrect', label: 'Incorrect' },
      ],
    },
    {
      key: 'completed', label: 'Completed', icon: 'ic-completed',
      options: [
        { value: 'all', label: 'Any status' },
        { value: 'completed', label: 'Completed' },
        { value: 'notstarted', label: 'Not started' },
      ],
    },
    {
      key: 'saved', label: 'Saved', icon: 'ic-saved',
      options: [
        { value: 'all', label: 'All questions' },
        { value: 'saved', label: 'Saved only' },
      ],
    },
  ];

  const loadProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (_) { return {}; }
  };
  let progress = loadProgress();

  let manifest = null;

  const boot = async () => {
    try {
      manifest = await fetch('data/manifest.json').then((r) => {
        if (!r.ok) throw new Error('missing manifest');
        return r.json();
      });
    } catch (_) {
      if (loading) loading.textContent = 'The question bank could not be loaded. Run the importer to build data/manifest.json.';
      return;
    }
    buildPills();
    if (loading) loading.remove();
    document.getElementById('bank-columns-head').hidden = false;
    document.getElementById('bank-hero-stat').hidden = false;
    grid.hidden = false;
    render();
    wireSearch();
    wireReset();
  };

  /* ---------- count logic ----------
     For a skill we know the per-difficulty totals from the manifest and the
     per-question local state (status / saved / difficulty) for anything the
     student has touched. That's enough to count any combination exactly. */
  const localForSkill = (slug) =>
    Object.values(progress).filter((p) => p && p.slug === slug);

  const skillCount = (skill) => {
    const D = filters.difficulty;
    const R = filters.result;
    const C = filters.completed;
    const SV = filters.saved;
    const diffMatch = (p) => D === 'all' || p.difficulty === D;
    const baseTotal = D === 'all' ? skill.count : ((skill.byDifficulty || {})[D] || 0);
    const local = localForSkill(skill.slug);

    // "Not started" is everything minus what's been attempted.
    if (C === 'notstarted') {
      if (SV === 'saved') {
        return local.filter((p) => p.saved && !p.status && diffMatch(p)).length;
      }
      const attempted = local.filter((p) => p.status && diffMatch(p)).length;
      return Math.max(0, baseTotal - attempted);
    }

    const needsLocal = R !== 'all' || C === 'completed' || SV === 'saved';
    if (needsLocal) {
      return local.filter((p) =>
        diffMatch(p)
        && (R === 'all' || p.status === R)
        && (C !== 'completed' || !!p.status)
        && (SV !== 'saved' || !!p.saved)
      ).length;
    }
    return baseTotal;
  };

  const anyFilterActive = () =>
    filters.difficulty !== 'all' || filters.result !== 'all'
    || filters.completed !== 'all' || filters.saved !== 'all';

  const filterParams = () => {
    const p = new URLSearchParams();
    if (filters.difficulty !== 'all') p.set('difficulty', filters.difficulty);
    if (filters.result !== 'all') p.set('result', filters.result);
    if (filters.completed !== 'all') p.set('completed', filters.completed);
    if (filters.saved !== 'all') p.set('saved', filters.saved);
    return p.toString();
  };

  /* ---------- render ---------- */
  const render = () => {
    progress = loadProgress();
    const query = normalize(filters.search);
    const extra = filterParams();
    let subjTotals = {};
    let anyVisible = false;

    grid.innerHTML = '';
    (manifest.subjects || []).forEach((subj) => {
      let subjTotal = 0;
      let domainHtml = '';

      (subj.domains || []).forEach((dom) => {
        let domTotal = 0;
        const skillRows = (dom.skills || []).map((sk) => {
          const c = skillCount(sk);
          domTotal += c;
          const hay = normalize(sk.name + ' ' + dom.name);
          const searchHit = !query || hay.includes(query);
          const url = `question-list.html?skill=${encodeURIComponent(sk.slug)}` +
            `&subject=${encodeURIComponent(subj.name)}&domain=${encodeURIComponent(dom.name)}` +
            (extra ? '&' + extra : '');
          const disabled = c === 0;
          return {
            searchHit,
            html: `<a class="skill-link${disabled ? ' is-empty' : ''}" href="${url}"
                data-search="${searchHit ? '1' : '0'}">
                <span class="skill-name">${esc(sk.name)}</span>
                <span class="skill-count">${fmt(c)}</span>
              </a>`,
          };
        });

        const visibleRows = skillRows.filter((r) => r.searchHit);
        if (!visibleRows.length && query) return; // hide domain entirely on search miss
        subjTotal += domTotal;

        const rowsHtml = (query ? visibleRows : skillRows).map((r) => r.html).join('');
        domainHtml += `<section class="domain-group is-open" data-domain-group>
            <button class="domain-toggle" type="button" aria-expanded="true">
              <span class="domain-name">${esc(dom.name)}</span>
              <span class="domain-count">${fmt(domTotal)}</span>
              <span class="domain-caret" aria-hidden="true"></span>
            </button>
            <div class="skill-list">${rowsHtml}</div>
          </section>`;
      });

      subjTotals[subj.name] = subjTotal;
      const hidden = query && !domainHtml;
      if (!hidden) anyVisible = true;

      const firstSkill = subj.domains?.[0]?.skills?.[0];
      const startUrl = firstSkill
        ? `question-list.html?skill=${encodeURIComponent(firstSkill.slug)}&subject=${encodeURIComponent(subj.name)}${extra ? '&' + extra : ''}`
        : '#';
      const accent = subj.name === 'Math' ? 'is-math' : 'is-rw';

      const card = document.createElement('article');
      card.className = `subject-bank-card ${accent}` + (hidden ? ' is-hidden' : '');
      card.dataset.subjectCard = subj.name;
      card.innerHTML = `
        <div class="subject-card-head">
          <div>
            <span class="card-kicker">${esc(subj.name)}</span>
            <p class="subject-card-count">${fmt(subjTotal)} question${subjTotal === 1 ? '' : 's'}${anyFilterActive() ? ' match' : ''}</p>
          </div>
          <a class="start-pill" href="${startUrl}"><span class="play-dot" aria-hidden="true"></span>Start</a>
        </div>
        <div class="domain-list">${domainHtml || '<p class="domain-empty">No matching skills.</p>'}</div>`;
      grid.appendChild(card);
    });

    // headers + hero
    setText('ov-total', fmt(Object.values(subjTotals).reduce((a, b) => a + b, 0)));
    setText('ov-rw', fmt(subjTotals['Reading & Writing'] || 0) + ' questions');
    setText('ov-math', fmt(subjTotals['Math'] || 0) + ' questions');

    emptyEl.hidden = anyVisible;
    grid.hidden = !anyVisible;

    // domain expand/collapse
    grid.querySelectorAll('.domain-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('[data-domain-group]');
        const open = group.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    if (resetBtn) resetBtn.hidden = !(anyFilterActive() || filters.search);
  };

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  /* ---------- filter pills ---------- */
  const buildPills = () => {
    pillsHost.innerHTML = '';
    PILLS.forEach((pill) => {
      const wrap = document.createElement('div');
      wrap.className = 'filter-pill';
      wrap.dataset.key = pill.key;
      wrap.innerHTML = `
        <button type="button" class="filter-pill-btn" aria-haspopup="true" aria-expanded="false">
          <span class="filter-pill-icon ${pill.icon}" aria-hidden="true"></span>
          <span class="filter-pill-label">${pill.label}</span>
          <span class="filter-pill-caret" aria-hidden="true"></span>
        </button>
        <div class="filter-menu" role="menu" hidden>
          ${pill.options.map((o) => `
            <button type="button" class="filter-option" role="menuitemradio" data-value="${o.value}"
              aria-checked="${o.value === 'all'}">${esc(o.label)}</button>`).join('')}
        </div>`;
      pillsHost.appendChild(wrap);

      const btn = wrap.querySelector('.filter-pill-btn');
      const menu = wrap.querySelector('.filter-menu');

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !menu.hidden;
        closeAllMenus();
        if (!isOpen) {
          menu.hidden = false;
          btn.setAttribute('aria-expanded', 'true');
        }
      });

      menu.querySelectorAll('.filter-option').forEach((opt) => {
        opt.addEventListener('click', () => {
          const value = opt.dataset.value;
          filters[pill.key] = value;
          menu.querySelectorAll('.filter-option').forEach((o) =>
            o.setAttribute('aria-checked', String(o === opt)));
          updatePillLabel(wrap, pill, value);
          closeAllMenus();
          render();
        });
      });
    });

    document.addEventListener('click', closeAllMenus);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllMenus(); });
  };

  const updatePillLabel = (wrap, pill, value) => {
    const active = value !== 'all';
    wrap.classList.toggle('is-active', active);
    const labelEl = wrap.querySelector('.filter-pill-label');
    const chosen = pill.options.find((o) => o.value === value);
    labelEl.textContent = active ? chosen.label : pill.label;
  };

  const closeAllMenus = () => {
    pillsHost.querySelectorAll('.filter-menu').forEach((m) => { m.hidden = true; });
    pillsHost.querySelectorAll('.filter-pill-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  };

  const wireSearch = () => {
    if (searchInput) searchInput.addEventListener('input', () => {
      filters.search = searchInput.value.trim();
      render();
    });
  };

  const resetAll = () => {
    filters.difficulty = 'all'; filters.result = 'all';
    filters.completed = 'all'; filters.saved = 'all'; filters.search = '';
    if (searchInput) searchInput.value = '';
    pillsHost.querySelectorAll('.filter-pill').forEach((wrap) => {
      const pill = PILLS.find((p) => p.key === wrap.dataset.key);
      wrap.classList.remove('is-active');
      wrap.querySelector('.filter-pill-label').textContent = pill.label;
      wrap.querySelectorAll('.filter-option').forEach((o, i) =>
        o.setAttribute('aria-checked', String(i === 0)));
    });
    render();
  };

  const wireReset = () => {
    if (resetBtn) resetBtn.addEventListener('click', resetAll);
    const emptyReset = document.getElementById('bank-empty-reset');
    if (emptyReset) emptyReset.addEventListener('click', resetAll);
  };

  boot();
})();
