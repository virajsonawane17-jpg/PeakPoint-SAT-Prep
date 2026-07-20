/* ============================================
   PEAKPOINT SAT PREP — Study Planner
   Turns the SAT profile inputs into a real,
   personalized schedule and renders it into the
   list + calendar views. Frontend only; inputs
   persist in localStorage.
   ============================================ */

(async () => {
  let currentUser = null;
  if (window.PP && PP.auth) {
    const user = await PP.auth.requireAuth();
    if (!user) return;
    currentUser = user;
    const firstName = (user.name || user.email || 'Student').split(' ')[0];
    const sideName = document.getElementById('side-user-name');
    if (sideName) sideName.textContent = user.name || firstName;
  }

  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'pp_planner_inputs';
  const GEN_KEY = 'pp_planner_generated';

  /* ---------- domain reference ----------
     weight = share of the section on the real SAT; slug/subject/domain feed the
     "Start" link straight into the matching Question Bank list. */
  const DOMAIN_INFO = {
    'Information and Ideas': { section: 'RW', weight: 0.26, slug: 'cid', short: 'Info & Ideas', skills: 'central ideas, inferences, and command of evidence' },
    'Craft and Structure': { section: 'RW', weight: 0.28, slug: 'wic', short: 'Craft & Structure', skills: 'words in context, text structure, and cross-text links' },
    'Expression of Ideas': { section: 'RW', weight: 0.20, slug: 'syn', short: 'Expression of Ideas', skills: 'rhetorical synthesis and transitions' },
    'Standard English Conventions': { section: 'RW', weight: 0.26, slug: 'bou', short: 'Grammar & Conventions', skills: 'boundaries and form, structure & sense' },
    'Algebra': { section: 'Math', weight: 0.35, slug: 'ha', short: 'Algebra', skills: 'linear equations, systems, and inequalities' },
    'Advanced Math': { section: 'Math', weight: 0.35, slug: 'pc', short: 'Advanced Math', skills: 'nonlinear functions and equivalent expressions' },
    'Problem-Solving and Data Analysis': { section: 'Math', weight: 0.15, slug: 'qa', short: 'Data Analysis', skills: 'ratios, percentages, data, and probability' },
    'Geometry and Trigonometry': { section: 'Math', weight: 0.15, slug: 'sa', short: 'Geometry & Trig', skills: 'area & volume, triangles, circles, and trig' },
  };
  const SUBJECT_OF = { RW: 'Reading & Writing', Math: 'Math' };
  const WD_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /* ---------- date helpers ---------- */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  const sameDate = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  /* ---------- DOM refs ---------- */
  const tabs = Array.from(document.querySelectorAll('[data-plan-view]'));
  const panels = Array.from(document.querySelectorAll('[data-plan-panel]'));
  const testDate = $('test-date');
  const domainMeters = Array.from(document.querySelectorAll('[data-domain-score]'));
  const toggleInputs = Array.from(document.querySelectorAll('.planner-days input'));

  let plan = null;                 // latest generated plan
  let sessionByKey = {};           // dayKey -> session
  const calState = { y: 0, m: 0 }; // month shown in calendar view
  let remoteLearningState = {};
  let remoteReady = false;
  let remoteSaveTimer = null;

  /* ---------- read the form ---------- */
  const num = (id, fallback) => {
    const v = parseInt(($(id) && $(id).value) || '', 10);
    return Number.isFinite(v) ? v : fallback;
  };

  function readConfig() {
    const today = startOfDay(new Date());
    const test = testDate && testDate.value
      ? startOfDay(new Date(`${testDate.value}T00:00:00`))
      : addDays(today, 30);
    const days = new Set(
      toggleInputs.filter((i) => i.checked).map((i) => WD_INDEX[i.value])
    );
    const domains = domainMeters.map((m) => ({
      name: m.dataset.domainName,
      level: Math.min(7, Math.max(1, Number(m.dataset.domainLevel) || 4)),
      ...DOMAIN_INFO[m.dataset.domainName],
    })).filter((d) => d.section);

    return {
      today,
      test,
      target: num('target-score', 1400),
      current: num('current-score', 1200),
      rw: num('rw-score', 600),
      math: num('math-score', 600),
      dailyMin: num('daily-time', 45),
      days,
      domains,
    };
  }

  /* ---------- session builders ---------- */
  function focusSession(date, domain, dailyMin) {
    const level = domain.level;
    const phase = level <= 3 ? 'build' : level <= 5 ? 'timed' : 'sharpen';
    const titleSuffix = phase === 'build' ? 'fundamentals' : phase === 'timed' ? 'timed set' : 'challenge set';
    const focusTag = phase === 'build' ? 'Learn' : phase === 'timed' ? 'Timed' : 'Sharpen';
    const desc = phase === 'build'
      ? `Rebuild the basics of ${domain.skills}. Work a few untimed, then redo every miss.`
      : phase === 'timed'
        ? `Timed practice on ${domain.skills}. Log each miss and why in your mistakes notebook.`
        : `Hard-level ${domain.skills} to build speed and cut careless errors.`;
    return {
      date, type: 'focus', domain: domain.name, section: domain.section,
      title: `${domain.name} ${titleSuffix}`,
      short: domain.short,
      desc,
      tags: [`${dailyMin} min`, domain.section === 'RW' ? 'Reading' : 'Math', focusTag],
      link: `question-list.html?skill=${encodeURIComponent(domain.slug)}` +
        `&subject=${encodeURIComponent(SUBJECT_OF[domain.section])}&domain=${encodeURIComponent(domain.name)}`,
      cta: 'Start',
    };
  }

  const checkpointSession = (date, dailyMin) => ({
    date, type: 'checkpoint', section: 'Mixed',
    title: 'Mixed timed review', short: 'Mixed review',
    desc: 'Short adaptive set across your weakest skills so far — practice test pacing and stamina.',
    tags: [`${dailyMin} min`, 'Mixed', 'Timed'],
    link: 'question-bank.html', cta: 'Start',
  });

  const fullTestSession = (date) => ({
    date, type: 'fulltest', section: 'Mixed',
    title: 'Full practice test', short: 'Practice test',
    desc: 'Sit a full-length timed section (or a full test). Afterward, review every single miss.',
    tags: ['Timed', 'Full-length', 'Review'],
    link: 'peaklabs.html', cta: 'Open PeakLabs',
  });

  const lightSession = (date) => ({
    date, type: 'light', section: 'Rest',
    title: 'Light review & rest', short: 'Light review',
    desc: 'Skim your mistakes notebook and formula sheet only. No hard new material — rest up.',
    tags: ['20 min', 'Review', 'Rest'],
    link: 'mistakes.html', cta: 'Open notebook',
  });

  const testDaySession = (date) => ({
    date, type: 'test', section: 'Exam',
    title: 'SAT — Test day', short: 'Test day',
    desc: 'This is it. Arrive early with your admission ticket, photo ID, calculator, and snacks. You’ve got this.',
    tags: ['Test day'], link: null, cta: null,
  });

  /* ---------- the generator ---------- */
  function generatePlan(cfg) {
    const totalDays = daysBetween(cfg.today, cfg.test);
    if (cfg.days.size === 0) return { sessions: [], reason: 'no-days' };
    if (totalDays < 0) return { sessions: [], reason: 'past' };

    // Weighted round-robin so weaker section + weaker domain + heavier exam
    // weight all pull more sessions, while everything still gets covered.
    const rwNeed = Math.max(40, 800 - cfg.rw);
    const mathNeed = Math.max(40, 800 - cfg.math);
    const sectionNeed = { RW: rwNeed, Math: mathNeed };
    const weights = cfg.domains.map((d) =>
      (0.35 + sectionNeed[d.section] / 400) * (8 - d.level) * (0.5 + d.weight));
    const credits = weights.map(() => 0);
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
    const pickDomain = () => {
      let best = 0;
      for (let i = 0; i < credits.length; i += 1) {
        credits[i] += weights[i];
        if (credits[i] > credits[best]) best = i;
      }
      credits[best] -= totalWeight;
      return cfg.domains[best];
    };

    // Cadence: weekly-ish mixed review; full tests in the final fortnight.
    const sessions = [];
    let studyIndex = 0;
    const cap = Math.min(totalDays, 400);
    const satPreferred = cfg.days.has(6);

    for (let i = 0; i <= cap; i += 1) {
      const date = addDays(cfg.today, i);
      const wd = date.getDay();
      const daysLeft = daysBetween(date, cfg.test);

      if (daysLeft === 0) { sessions.push(testDaySession(date)); continue; }
      if (!cfg.days.has(wd)) continue;               // only preferred study days

      if (daysLeft === 1) { sessions.push(lightSession(date)); continue; }

      const weekend = wd === 0 || wd === 6;
      const isFullTestDay = daysLeft <= 14 && weekend &&
        (wd === 6 || (wd === 0 && !satPreferred));
      if (isFullTestDay) { sessions.push(fullTestSession(date)); studyIndex += 1; continue; }

      studyIndex += 1;
      if (studyIndex % 6 === 0) { sessions.push(checkpointSession(date, cfg.dailyMin)); continue; }
      sessions.push(focusSession(date, pickDomain(), cfg.dailyMin));
    }

    const study = sessions.filter((s) => s.type === 'focus' || s.type === 'checkpoint' || s.type === 'fulltest');
    const hours = Math.round((study.length * cfg.dailyMin) / 60);
    return {
      sessions,
      reason: null,
      meta: {
        totalDays, studyCount: study.length, hours,
        gap: cfg.target - cfg.current, dailyMin: cfg.dailyMin,
      },
    };
  }

  /* ---------- rendering ---------- */
  function renderSummary(cfg) {
    const el = $('plan-summary');
    if (!el) return;
    if (!plan || plan.reason || !plan.sessions.length) {
      el.textContent = plan && plan.reason === 'no-days'
        ? 'Pick at least one preferred study day to build your schedule.'
        : plan && plan.reason === 'past'
          ? 'Your test date has passed — set an upcoming date to build a plan.'
          : '';
      return;
    }
    const m = plan.meta;
    const gapText = m.gap > 0 ? `closing a ${m.gap}-point gap`
      : m.gap === 0 ? 'holding your target'
        : 'already past your target — stay sharp';
    el.textContent = `${m.studyCount} study sessions • about ${m.hours} focused hours • ${m.totalDays} days to test — ${gapText}.`;
  }

  function renderHero(cfg) {
    const daysEl = $('planner-days');
    if (!daysEl) return;
    const diff = Math.max(0, daysBetween(cfg.today, cfg.test));
    daysEl.textContent = `${diff} ${diff === 1 ? 'day' : 'days'}`;
  }

  function dateLabel(date, today) {
    if (sameDate(date, today)) return 'Today';
    if (sameDate(date, addDays(today, 1))) return 'Tomorrow';
    return WD_SHORT[date.getDay()];
  }

  function renderList(cfg) {
    const body = $('plan-list-body');
    const empty = $('plan-empty');
    const more = $('plan-more');
    if (!body) return;
    body.innerHTML = '';
    more.hidden = true;

    const upcoming = (plan.sessions || []).filter((s) => daysBetween(cfg.today, s.date) >= 0);
    if (!upcoming.length) {
      empty.hidden = false;
      const t = $('plan-empty-text');
      if (t) t.textContent = plan.reason === 'past'
        ? 'Your test date has passed. Set an upcoming date to generate a new plan.'
        : plan.reason === 'no-days'
          ? 'Select at least one preferred study day to generate your schedule.'
          : 'No upcoming sessions — adjust your inputs to build a plan.';
      return;
    }
    empty.hidden = true;

    const LIMIT = 14;
    const shown = upcoming.slice(0, LIMIT);
    const frag = document.createDocumentFragment();
    shown.forEach((s) => {
      const isToday = sameDate(s.date, cfg.today);
      const card = document.createElement('article');
      card.className = `plan-day-card type-${s.type}` + (isToday ? ' today' : '');
      const mon = `${MONTHS[s.date.getMonth()].slice(0, 3)} ${s.date.getDate()}`;
      const tags = s.tags.map((t) => `<span>${t}</span>`).join('');
      const action = s.link && s.cta
        ? `<a class="plan-day-action" href="${s.link}">${s.cta}</a>`
        : `<span class="plan-day-flag">${s.type === 'test' ? '🎯' : '🌙'}</span>`;
      card.innerHTML = `
        <div class="plan-day-date"><span>${dateLabel(s.date, cfg.today)}</span><strong>${mon}</strong></div>
        <div class="plan-day-work">
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
          <div class="plan-tags">${tags}</div>
        </div>
        ${action}`;
      frag.appendChild(card);
    });
    body.appendChild(frag);

    if (upcoming.length > LIMIT) {
      const rest = upcoming.length - LIMIT;
      more.hidden = false;
      more.textContent = `+ ${rest} more session${rest === 1 ? '' : 's'} scheduled before test day. Switch to calendar view to see everything.`;
    }
  }

  function renderCalendar(cfg) {
    const grid = $('calendar-grid');
    const title = $('calendar-title');
    if (!grid) return;
    // clear previous day cells (keep the 7 weekday labels)
    grid.querySelectorAll('.calendar-cell').forEach((c) => c.remove());

    title.textContent = `${MONTHS[calState.m]} ${calState.y}`;

    const first = new Date(calState.y, calState.m, 1);
    const leading = (first.getDay() + 6) % 7; // days from Monday
    const gridStart = addDays(first, -leading);
    const today = cfg.today;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < 42; i += 1) {
      const date = addDays(gridStart, i);
      const inMonth = date.getMonth() === calState.m;
      const key = dayKey(date);
      const session = sessionByKey[key];
      const isToday = sameDate(date, today);

      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      if (!inMonth) cell.classList.add('muted');
      if (isToday) cell.classList.add('today');
      if (sameDate(date, cfg.test)) cell.classList.add('exam');
      if (session) {
        if (session.type === 'checkpoint' || session.type === 'fulltest') cell.classList.add('checkpoint');
        else if (session.type === 'test') cell.classList.add('exam');
        else if (session.type === 'light') cell.classList.add('rest');
        else cell.classList.add('active');
      }

      const top = document.createElement('div');
      top.className = 'cell-top';
      const num = document.createElement('strong');
      num.textContent = String(date.getDate());
      top.appendChild(num);
      if (isToday) {
        const pill = document.createElement('em');
        pill.className = 'cell-today';
        pill.textContent = 'Today';
        top.appendChild(pill);
      }
      cell.appendChild(top);

      if (session && inMonth) {
        const tag = document.createElement('span');
        tag.className = 'cell-tag';
        tag.textContent = session.short;
        cell.appendChild(tag);
        cell.classList.add('is-clickable');
        cell.dataset.dayKey = key;
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `${session.title} — ${MONTHS[date.getMonth()]} ${date.getDate()}. View details.`);
      }
      frag.appendChild(cell);
    }
    grid.appendChild(frag);
  }

  /* ---------- day detail modal ---------- */
  const TYPE_LABEL = {
    focus: 'Focused practice',
    checkpoint: 'Mixed review',
    fulltest: 'Full practice test',
    light: 'Light review & rest',
    test: 'Test day',
  };

  function openDayModal(key) {
    const s = sessionByKey[key];
    if (!s) return;
    const modal = $('day-modal');
    if (!modal) return;
    const d = s.date;
    $('day-modal-date').textContent = `${WD_LONG[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
    const badge = $('day-modal-badge');
    badge.textContent = TYPE_LABEL[s.type] || 'Study session';
    badge.className = `day-modal-badge type-${s.type}`;
    $('day-modal-title').textContent = s.title;
    $('day-modal-desc').textContent = s.desc;
    $('day-modal-tags').innerHTML = s.tags.map((t) => `<span>${t}</span>`).join('');
    const action = $('day-modal-action');
    if (s.link && s.cta) {
      action.href = s.link;
      action.textContent = s.type === 'test' ? s.cta : `${s.cta} →`;
      action.hidden = false;
    } else {
      action.hidden = true;
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('day-modal-close').focus();
  }

  function closeDayModal() {
    const modal = $('day-modal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------- orchestration ---------- */
  function regenerate() {
    const cfg = readConfig();
    plan = generatePlan(cfg);
    sessionByKey = {};
    (plan.sessions || []).forEach((s) => { sessionByKey[dayKey(s.date)] = s; });
    renderHero(cfg);
    renderSummary(cfg);
    renderList(cfg);
    renderCalendar(cfg);
    saveInputs();
    return cfg;
  }

  /* ---------- view tabs ---------- */
  function showPanel(view) {
    tabs.forEach((tab) => {
      const active = tab.dataset.planView === view;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.planPanel === view));
  }

  /* ---------- domain meters (interactive) ---------- */
  function domainBand(level) {
    if (level <= 3) return 'Building';
    if (level <= 5) return 'Medium';
    return 'Strong';
  }
  function syncDomainMeter(meter) {
    const level = Math.min(7, Math.max(1, Number(meter.dataset.domainLevel) || 1));
    meter.dataset.domainLevel = String(level);
    meter.querySelectorAll('.domain-dot').forEach((dot) => {
      const dotLevel = Number(dot.dataset.level);
      dot.classList.toggle('is-building', dotLevel <= 3);
      dot.classList.toggle('is-medium', dotLevel >= 4 && dotLevel <= 5);
      dot.classList.toggle('is-strong', dotLevel >= 6);
      dot.classList.toggle('is-filled', dotLevel <= level);
      dot.classList.toggle('is-current', dotLevel === level);
      dot.setAttribute('aria-pressed', String(dotLevel === level));
    });
    const band = meter.closest('.domain-control')?.querySelector('.domain-band');
    if (band) band.textContent = domainBand(level);
  }
  function setupDomainMeters() {
    domainMeters.forEach((meter) => {
      const name = meter.dataset.domainName || 'domain';
      meter.innerHTML = '';
      for (let level = 1; level <= 7; level += 1) {
        const dot = document.createElement('button');
        dot.className = 'domain-dot';
        dot.type = 'button';
        dot.dataset.level = String(level);
        dot.setAttribute('aria-label', `Set ${name} progress to ${domainBand(level)}`);
        dot.addEventListener('click', () => {
          meter.dataset.domainLevel = String(level);
          syncDomainMeter(meter);
          markStale();
        });
        meter.appendChild(dot);
      }
      syncDomainMeter(meter);
    });
  }

  function syncTogglePills() {
    toggleInputs.forEach((input) => {
      const label = input.closest('label');
      if (label) label.classList.toggle('is-selected', input.checked);
    });
  }

  /* ---------- persistence ---------- */
  function setSaveStatus(text, tone) {
    const el = $('planner-save-status');
    if (!el) return;
    el.textContent = text;
    if (tone) el.dataset.tone = tone;
    else delete el.dataset.tone;
  }

  function readLocalPlannerPayload() {
    let inputs = null;
    let generated = false;
    try { inputs = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { inputs = null; }
    try { generated = localStorage.getItem(GEN_KEY) === '1'; } catch (_) { generated = false; }
    return {
      version: 1,
      inputs,
      generated,
      updatedAt: new Date().toISOString(),
    };
  }

  function applyPlannerPayload(payload) {
    if (!payload || !payload.inputs) return false;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload.inputs));
      if (payload.generated) localStorage.setItem(GEN_KEY, '1');
      else localStorage.removeItem(GEN_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function loadRemotePlanner() {
    if (!currentUser || !window.PP || !PP.sb) return null;
    const { data, error } = await PP.sb
      .from('learning_state')
      .select('state')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (error) throw error;
    remoteLearningState = (data && data.state) || {};
    return remoteLearningState.studyPlanner || null;
  }

  async function saveRemotePlanner(payload) {
    if (!currentUser || !window.PP || !PP.sb) return;
    remoteLearningState = {
      ...(remoteLearningState || {}),
      studyPlanner: payload,
    };
    const { error } = await PP.sb.from('learning_state').upsert({
      user_id: currentUser.id,
      state: remoteLearningState,
    }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  async function hydrateRemotePlanner() {
    setSaveStatus('Loading saved plan…');
    try {
      const remotePlanner = await loadRemotePlanner();
      if (remotePlanner && remotePlanner.inputs) {
        applyPlannerPayload(remotePlanner);
        setSaveStatus('Saved to account', 'saved');
      } else {
        const localPayload = readLocalPlannerPayload();
        if (localPayload.inputs) {
          await saveRemotePlanner(localPayload);
          setSaveStatus('Saved to account', 'saved');
        } else {
          setSaveStatus('Ready to save');
        }
      }
      remoteReady = true;
    } catch (_) {
      remoteReady = false;
      setSaveStatus('Saved on this device', 'local');
    }
  }

  function queueRemoteSave() {
    if (!remoteReady) return;
    setSaveStatus('Saving…');
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(async () => {
      try {
        await saveRemotePlanner(readLocalPlannerPayload());
        setSaveStatus('Saved to account', 'saved');
      } catch (_) {
        setSaveStatus('Saved on this device', 'local');
      }
    }, 450);
  }

  function saveInputs() {
    try {
      const data = {
        test: testDate ? testDate.value : '',
        target: $('target-score')?.value,
        current: $('current-score')?.value,
        rw: $('rw-score')?.value,
        math: $('math-score')?.value,
        daily: $('daily-time')?.value,
        days: toggleInputs.filter((i) => i.checked).map((i) => i.value),
        levels: domainMeters.map((m) => [m.dataset.domainName, m.dataset.domainLevel]),
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      queueRemoteSave();
    } catch (_) { /* ignore */ }
  }
  function loadInputs() {
    let data;
    try { data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (_) { return; }
    if (!data) return;
    const set = (id, v) => { if (v != null && $(id)) $(id).value = v; };
    if (data.test && testDate) testDate.value = data.test;
    set('target-score', data.target);
    set('current-score', data.current);
    set('rw-score', data.rw);
    set('math-score', data.math);
    set('daily-time', data.daily);
    if (Array.isArray(data.days)) {
      toggleInputs.forEach((i) => { i.checked = data.days.includes(i.value); });
    }
    if (Array.isArray(data.levels)) {
      const byName = Object.fromEntries(data.levels);
      domainMeters.forEach((m) => {
        const v = byName[m.dataset.domainName];
        if (v != null) m.dataset.domainLevel = v;
      });
    }
  }

  /* ---------- generate flow (button + premium loading) ---------- */
  const genBtn = $('generate-plan');
  const placeholderEl = $('plan-placeholder');
  const loadingEl = $('plan-loading');
  const contentEl = $('plan-content');
  const tabsEl = $('planner-tabs');
  const loadingText = $('plan-loading-text');
  let hasPlan = false;

  const LOADING_MSGS = [
    'Reading your score profile…',
    'Prioritizing your weak spots…',
    'Spacing sessions to test day…',
    'Finalizing your calendar…',
  ];

  function setGenLabel() {
    genBtn.innerHTML =
      `<span class="generate-spark" aria-hidden="true"></span>${hasPlan ? 'Update my plan' : 'Make my Target Score Plan'}`;
  }

  // A change after a plan exists doesn't rebuild automatically — it just
  // nudges the button so the student re-generates when ready.
  function markStale() {
    saveInputs();
    renderHero(readConfig());
    if (hasPlan && genBtn) genBtn.classList.add('is-stale');
  }

  function generateWithLoading() {
    if (!genBtn) return;
    saveInputs();
    placeholderEl.hidden = true;
    contentEl.hidden = true;
    loadingEl.hidden = false;
    genBtn.disabled = true;
    genBtn.classList.remove('is-stale');

    let i = 0;
    loadingText.textContent = LOADING_MSGS[0];
    const rot = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length;
      loadingText.textContent = LOADING_MSGS[i];
    }, 340);

    setTimeout(() => {
      clearInterval(rot);
      const cfg = regenerate();
      loadingEl.hidden = true;
      contentEl.hidden = false;
      tabsEl.hidden = !(plan && plan.sessions && plan.sessions.length);
      hasPlan = true;
      genBtn.disabled = false;
      setGenLabel();
      try { localStorage.setItem(GEN_KEY, '1'); } catch (_) { /* ignore */ }
      queueRemoteSave();
      const card = document.querySelector('.planner-preview-card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1350);
  }

  /* ---------- wire up ---------- */
  tabs.forEach((tab) => tab.addEventListener('click', () => showPanel(tab.dataset.planView)));

  document.querySelectorAll('#planner-form input, #planner-form select').forEach((input) => {
    const ev = input.type === 'number' || input.type === 'date' ? 'input' : 'change';
    input.addEventListener(ev, markStale);
  });
  toggleInputs.forEach((input) => input.addEventListener('change', () => { syncTogglePills(); markStale(); }));

  if (genBtn) genBtn.addEventListener('click', generateWithLoading);

  const calPrev = $('cal-prev');
  const calNext = $('cal-next');
  const stepMonth = (delta) => {
    const d = new Date(calState.y, calState.m + delta, 1);
    calState.y = d.getFullYear();
    calState.m = d.getMonth();
    renderCalendar(readConfig());
  };
  if (calPrev) calPrev.addEventListener('click', () => stepMonth(-1));
  if (calNext) calNext.addEventListener('click', () => stepMonth(1));

  // calendar cell -> day detail modal (event delegation, bound once)
  const gridEl = $('calendar-grid');
  if (gridEl) {
    gridEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.calendar-cell.is-clickable');
      if (cell) openDayModal(cell.dataset.dayKey);
    });
    gridEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const cell = e.target.closest('.calendar-cell.is-clickable');
      if (cell) { e.preventDefault(); openDayModal(cell.dataset.dayKey); }
    });
  }
  const dayModal = $('day-modal');
  const dayClose = $('day-modal-close');
  if (dayClose) dayClose.addEventListener('click', closeDayModal);
  if (dayModal) dayModal.addEventListener('click', (e) => { if (e.target === dayModal) closeDayModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dayModal && !dayModal.hidden) closeDayModal();
  });

  /* ---------- init ---------- */
  await hydrateRemotePlanner();
  loadInputs();
  setupDomainMeters();
  syncTogglePills();
  const now = new Date();
  calState.y = now.getFullYear();
  calState.m = now.getMonth();
  renderHero(readConfig());   // show the countdown

  // Restore a previously built plan so it survives closing/reopening the site.
  let restored = false;
  try { restored = localStorage.getItem(GEN_KEY) === '1'; } catch (_) { restored = false; }
  if (restored) {
    regenerate();
    if (placeholderEl) placeholderEl.hidden = true;
    if (loadingEl) loadingEl.hidden = true;
    if (contentEl) contentEl.hidden = false;
    if (tabsEl) tabsEl.hidden = !(plan && plan.sessions && plan.sessions.length);
    hasPlan = true;
    setGenLabel();
  }
})();
