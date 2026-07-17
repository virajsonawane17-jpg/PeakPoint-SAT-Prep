/* ============================================
   PEAKPOINT SAT PREP — Question Bank
   Renders the subject → domain → skill tree from
   data/manifest.json (built from the College Board
   SAT Suite Question Bank). Each skill links to the
   question list for that skill.
   ============================================ */

(() => {
  'use strict';

  if (window.PP && PP.auth && typeof PP.auth.requireAuth === 'function') {
    PP.auth.requireAuth();
  }

  const STORE_KEY = 'pp_qbank_progress';
  const grid = document.getElementById('subject-grid');
  const loading = document.getElementById('bank-loading');
  const searchInput = document.getElementById('bank-search');
  const filterButtons = Array.from(document.querySelectorAll('[data-bank-filter]'));
  let activeFilter = 'all';

  const fmt = (n) => n.toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const normalize = (v) => v.toLowerCase().replace(/\s+/g, ' ').trim();

  const loadProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (_) { return {}; }
  };

  const boot = async () => {
    let manifest;
    try {
      manifest = await fetch('data/manifest.json').then((r) => {
        if (!r.ok) throw new Error('missing manifest');
        return r.json();
      });
    } catch (_) {
      if (loading) loading.textContent = 'The question bank could not be loaded. Run the importer to build data/manifest.json.';
      return;
    }
    render(manifest);
    if (loading) loading.remove();
    grid.hidden = false;
    wireSearch();
    wireFilters();
  };

  const render = (manifest) => {
    const progress = loadProgress();
    const subjTotals = {};

    grid.innerHTML = '';
    (manifest.subjects || []).forEach((subj) => {
      let subjTotal = 0;
      const domainHtml = (subj.domains || []).map((dom) => {
        const domTotal = (dom.skills || []).reduce((a, s) => a + s.count, 0);
        subjTotal += domTotal;
        const skills = (dom.skills || []).map((sk) => {
          const url = `question-list.html?skill=${encodeURIComponent(sk.slug)}` +
            `&subject=${encodeURIComponent(subj.name)}&domain=${encodeURIComponent(dom.name)}`;
          return `<a class="skill-link" href="${url}" data-skill-name="${esc(sk.name)}">
              <span>${esc(sk.name)}</span><strong>${fmt(sk.count)}</strong>
            </a>`;
        }).join('');
        return `<section class="domain-group is-open" data-domain-group>
            <button class="domain-toggle" type="button" aria-expanded="true">
              <span>${esc(dom.name)}</span><strong>${fmt(domTotal)}</strong>
            </button>
            <div class="skill-list">${skills}</div>
          </section>`;
      }).join('');

      subjTotals[subj.name] = subjTotal;
      const firstSlug = subj.domains?.[0]?.skills?.[0]?.slug;
      const startUrl = firstSlug
        ? `question-list.html?skill=${encodeURIComponent(firstSlug)}&subject=${encodeURIComponent(subj.name)}`
        : '#';

      const card = document.createElement('article');
      card.className = 'subject-bank-card';
      card.dataset.subjectCard = subj.name;
      card.innerHTML = `
        <div class="subject-card-head">
          <div>
            <span class="card-kicker">${esc(subj.name)}</span>
            <h2>${esc(subj.name)}</h2>
            <p>${fmt(subjTotal)} questions</p>
          </div>
          <a class="start-pill" href="${startUrl}"><span class="play-dot" aria-hidden="true"></span>Start</a>
        </div>
        <div class="domain-list">${domainHtml}</div>`;
      grid.appendChild(card);
    });

    // overview numbers
    const total = manifest.total || Object.values(subjTotals).reduce((a, b) => a + b, 0);
    setText('ov-total', fmt(total));
    setText('ov-rw', fmt(subjTotals['Reading & Writing'] || 0) + ' questions');
    setText('ov-math', fmt(subjTotals['Math'] || 0) + ' questions');

    // domain expand/collapse
    grid.querySelectorAll('.domain-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('[data-domain-group]');
        const open = group.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  };

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const applyFilters = () => {
    const query = normalize(searchInput ? searchInput.value : '');
    grid.querySelectorAll('[data-subject-card]').forEach((card) => {
      const subject = card.dataset.subjectCard || '';
      const subjectMatches = activeFilter === 'all' || subject === activeFilter;
      let hasVisible = false;
      card.querySelectorAll('[data-domain-group]').forEach((group) => {
        const text = normalize(group.textContent || '');
        const match = !query || text.includes(query);
        group.classList.toggle('is-filter-hidden', !match);
        if (match) hasVisible = true;
      });
      card.classList.toggle('is-hidden', !subjectMatches || !hasVisible);
    });
  };

  const wireSearch = () => {
    if (searchInput) searchInput.addEventListener('input', applyFilters);
  };

  const wireFilters = () => {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.bankFilter || 'all';
        filterButtons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        applyFilters();
      });
    });
  };

  boot();
})();
