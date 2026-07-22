/* ============================================
   PEAKPOINT SAT PREP — Fresh home dashboard
   Auth gate + live learning snapshot.
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;

  const firstName = (user.name || user.email || 'Student').split(' ')[0];
  document.getElementById('hero-user-name').textContent = firstName;
  document.getElementById('side-user-name').textContent = user.name || firstName;

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  document.getElementById('greeting-copy').textContent = greeting;

  let data = null;
  try {
    data = await PP.auth.loadData(user.id);
  } catch {
    data = null;
  }

  const analytics = window.PeakPointAnalytics.build(user, data);
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const setHref = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('href', value);
  };
  const { escapeHTML } = window.PeakPointAnalytics;

  const DOMAIN_INFO = {
    'Information and Ideas': { section: 'RW', weight: 0.26, slug: 'cid', short: 'Info & Ideas', skills: 'central ideas, inferences, and command of evidence' },
    'Craft and Structure': { section: 'RW', weight: 0.28, slug: 'wic', short: 'Craft & Structure', skills: 'words in context, text structure, and cross-text links' },
    'Expression of Ideas': { section: 'RW', weight: 0.20, slug: 'syn', short: 'Expression of Ideas', skills: 'rhetorical synthesis and transitions' },
    'Standard English Conventions': { section: 'RW', weight: 0.26, slug: 'bou', short: 'Grammar & Conventions', skills: 'boundaries and form, structure & sense' },
    Algebra: { section: 'Math', weight: 0.35, slug: 'ha', short: 'Algebra', skills: 'linear equations, systems, and inequalities' },
    'Advanced Math': { section: 'Math', weight: 0.35, slug: 'pc', short: 'Advanced Math', skills: 'nonlinear functions and equivalent expressions' },
    'Problem-Solving and Data Analysis': { section: 'Math', weight: 0.15, slug: 'qa', short: 'Data Analysis', skills: 'ratios, percentages, data, and probability' },
    'Geometry and Trigonometry': { section: 'Math', weight: 0.15, slug: 'sa', short: 'Geometry & Trig', skills: 'area and volume, triangles, circles, and trig' },
  };
  const SUBJECT_OF = { RW: 'Reading & Writing', Math: 'Math' };
  const WD_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const addDays = (date, n) => {
    const next = new Date(date);
    next.setDate(next.getDate() + n);
    return next;
  };
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  const sameDate = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const parseDateInput = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : startOfDay(date);
  };
  const score = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function plannerConfig(payload) {
    if (!payload || !payload.inputs) return null;
    const inputs = payload.inputs;
    const levels = Array.isArray(inputs.levels) ? Object.fromEntries(inputs.levels) : {};
    const today = startOfDay(new Date());
    const test = parseDateInput(inputs.test);
    const days = new Set(Array.isArray(inputs.days) ? inputs.days.map((day) => WD_INDEX[day]).filter((day) => day != null) : []);
    const domains = Object.entries(DOMAIN_INFO).map(([name, info]) => ({
      name,
      ...info,
      level: Math.min(7, Math.max(1, Number(levels[name]) || 4)),
    }));

    return {
      today,
      test,
      target: score(inputs.target, analytics.scores.target),
      current: score(inputs.current, analytics.scores.total),
      rw: score(inputs.rw, analytics.scores.rw),
      math: score(inputs.math, analytics.scores.math),
      dailyMin: score(inputs.daily, 45),
      days,
      domains,
      generated: payload.generated === true,
    };
  }

  function focusSession(date, domain, dailyMin) {
    const phase = domain.level <= 3 ? 'build' : domain.level <= 5 ? 'timed' : 'sharpen';
    const titleSuffix = phase === 'build' ? 'fundamentals' : phase === 'timed' ? 'timed set' : 'challenge set';
    const focusTag = phase === 'build' ? 'Learn' : phase === 'timed' ? 'Timed' : 'Sharpen';
    return {
      date,
      type: 'focus',
      title: `${domain.name} ${titleSuffix}`,
      short: domain.short,
      desc: phase === 'build'
        ? `Rebuild ${domain.skills} with careful reps and mistake review.`
        : phase === 'timed'
          ? `Practice ${domain.skills} under time pressure, then log every miss.`
          : `Push hard-level ${domain.skills} for speed and cleaner decisions.`,
      tags: [`${dailyMin} min`, domain.section === 'RW' ? 'Reading' : 'Math', focusTag],
      link: `question-list.html?skill=${encodeURIComponent(domain.slug)}` +
        `&subject=${encodeURIComponent(SUBJECT_OF[domain.section])}&domain=${encodeURIComponent(domain.name)}`,
    };
  }

  function checkpointSession(date, dailyMin) {
    return {
      date,
      type: 'checkpoint',
      title: 'Mixed timed review',
      short: 'Mixed review',
      desc: 'Run a short mixed set across weak skills and review every miss.',
      tags: [`${dailyMin} min`, 'Mixed', 'Timed'],
      link: 'question-bank.html',
    };
  }

  function fullTestSession(date) {
    return {
      date,
      type: 'fulltest',
      title: 'Full practice test',
      short: 'Practice test',
      desc: 'Complete a full timed section or full test, then review every miss.',
      tags: ['Timed', 'Full-length', 'Review'],
      link: 'peaklabs.html',
    };
  }

  function lightSession(date) {
    return {
      date,
      type: 'light',
      title: 'Light review and rest',
      short: 'Light review',
      desc: 'Skim your mistakes notebook and formula sheet. Keep it light.',
      tags: ['20 min', 'Review', 'Rest'],
      link: 'mistakes.html',
    };
  }

  function testDaySession(date) {
    return {
      date,
      type: 'test',
      title: 'SAT Test Day',
      short: 'Test day',
      desc: 'Arrive early with everything packed and ready.',
      tags: ['Test day'],
      link: 'study-planner.html',
    };
  }

  function generateDashboardPlan(cfg) {
    if (!cfg || !cfg.test) return { sessions: [], reason: 'no-test' };
    const totalDays = daysBetween(cfg.today, cfg.test);
    if (cfg.days.size === 0) return { sessions: [], reason: 'no-days' };
    if (totalDays < 0) return { sessions: [], reason: 'past' };

    const rwNeed = Math.max(40, 800 - cfg.rw);
    const mathNeed = Math.max(40, 800 - cfg.math);
    const sectionNeed = { RW: rwNeed, Math: mathNeed };
    const weights = cfg.domains.map((domain) =>
      (0.35 + sectionNeed[domain.section] / 400) * (8 - domain.level) * (0.5 + domain.weight));
    const credits = weights.map(() => 0);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
    const pickDomain = () => {
      let best = 0;
      for (let index = 0; index < credits.length; index += 1) {
        credits[index] += weights[index];
        if (credits[index] > credits[best]) best = index;
      }
      credits[best] -= totalWeight;
      return cfg.domains[best];
    };

    const sessions = [];
    const cap = Math.min(totalDays, 400);
    const satPreferred = cfg.days.has(6);
    let studyIndex = 0;

    for (let index = 0; index <= cap; index += 1) {
      const date = addDays(cfg.today, index);
      const weekday = date.getDay();
      const daysLeft = daysBetween(date, cfg.test);

      if (daysLeft === 0) { sessions.push(testDaySession(date)); continue; }
      if (!cfg.days.has(weekday)) continue;
      if (daysLeft === 1) { sessions.push(lightSession(date)); continue; }

      const weekend = weekday === 0 || weekday === 6;
      const isFullTestDay = daysLeft <= 14 && weekend && (weekday === 6 || (weekday === 0 && !satPreferred));
      if (isFullTestDay) { sessions.push(fullTestSession(date)); studyIndex += 1; continue; }

      studyIndex += 1;
      if (studyIndex % 6 === 0) { sessions.push(checkpointSession(date, cfg.dailyMin)); continue; }
      sessions.push(focusSession(date, pickDomain(), cfg.dailyMin));
    }

    return { sessions, reason: null };
  }

  function renderTestDate(cfg) {
    if (!cfg || !cfg.test) {
      setText('dashboard-test-date', 'Create a study plan to set your test date.');
      setText('dashboard-test-meta', 'Your countdown will appear here after your plan is saved.');
      setText('dashboard-test-action', 'Open Study Planner');
      return;
    }

    const diff = daysBetween(cfg.today, cfg.test);
    setText('dashboard-test-date', formatDate(cfg.test));
    if (diff > 0) setText('dashboard-test-meta', `${diff} ${diff === 1 ? 'day' : 'days'} until test day`);
    else if (diff === 0) setText('dashboard-test-meta', 'Test day is today');
    else setText('dashboard-test-meta', 'This test date has passed. Choose your next SAT date.');
    setText('dashboard-test-action', diff < 0 ? 'Choose next SAT date' : 'Update Study Planner');
  }

  function sessionDateLabel(session, today) {
    if (sameDate(session.date, today)) return 'Today';
    if (sameDate(session.date, addDays(today, 1))) return 'Tomorrow';
    return session.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function renderSchedule(cfg, plan) {
    const card = document.getElementById('dashboard-schedule-card');
    const mascot = document.getElementById('dashboard-schedule-mascot');
    const list = document.getElementById('dashboard-schedule-list');
    const action = document.getElementById('dashboard-schedule-action');
    if (!card || !list || !action) return;

    const resetEmpty = () => {
      card.classList.remove('has-plan');
      if (mascot) mascot.hidden = false;
      list.hidden = true;
      list.innerHTML = '';
      setText('dashboard-schedule-status', 'No plan yet');
      setText('dashboard-schedule-title', 'Create a study plan');
      setText('dashboard-schedule-desc', 'Get a personalized study plan based on your test date and skill level.');
      setText('dashboard-schedule-action', 'Create my study plan');
      setHref('dashboard-schedule-action', 'study-planner.html');
    };

    if (!cfg || !cfg.generated || !plan || plan.reason) {
      resetEmpty();
      if (cfg && cfg.test && plan && plan.reason === 'past') {
        setText('dashboard-schedule-status', 'Plan needs update');
        setText('dashboard-schedule-title', 'Choose your next SAT date');
        setText('dashboard-schedule-desc', 'Your saved test date has passed, so update the planner to rebuild your schedule.');
        setText('dashboard-schedule-action', 'Update Study Planner');
      }
      return;
    }

    const todaySessions = plan.sessions.filter((session) => sameDate(session.date, cfg.today));
    const upcoming = plan.sessions.filter((session) => daysBetween(cfg.today, session.date) >= 0);
    const shown = todaySessions.length ? todaySessions : upcoming.slice(0, 1);

    card.classList.add('has-plan');
    if (mascot) mascot.hidden = true;
    list.hidden = false;

    if (todaySessions.length) {
      setText('dashboard-schedule-status', `${todaySessions.length} ${todaySessions.length === 1 ? 'activity' : 'activities'} today`);
      setText('dashboard-schedule-title', todaySessions.length === 1 ? todaySessions[0].title : "Today's SAT work");
      setText('dashboard-schedule-desc', `${formatDate(cfg.test)} test date. Current ${cfg.current}, target ${cfg.target}.`);
    } else if (shown.length) {
      setText('dashboard-schedule-status', 'Next up');
      setText('dashboard-schedule-title', 'No scheduled activity today');
      setText('dashboard-schedule-desc', `Your next planned session is ${sessionDateLabel(shown[0], cfg.today)}. Current ${cfg.current}, target ${cfg.target}.`);
    } else {
      setText('dashboard-schedule-status', 'Plan complete');
      setText('dashboard-schedule-title', 'You reached the end of this schedule');
      setText('dashboard-schedule-desc', 'Update your Study Planner to build the next schedule.');
    }

    list.innerHTML = shown.map((session) => (
      `<a class="schedule-task" href="${session.link || 'study-planner.html'}">
        <span>${escapeHTML(sessionDateLabel(session, cfg.today))}</span>
        <strong>${escapeHTML(session.title)}</strong>
        <small>${escapeHTML(session.tags.join(' / '))}</small>
      </a>`
    )).join('');

    const primary = shown[0];
    setText('dashboard-schedule-action', todaySessions.length && primary ? "Start today's work" : 'Open Study Planner');
    setHref('dashboard-schedule-action', todaySessions.length && primary ? primary.link || 'study-planner.html' : 'study-planner.html');
  }

  setText('home-metric-attempted', analytics.totalQuestions.toLocaleString());
  setText('home-metric-accuracy', analytics.totalQuestions ? window.PeakPointAnalytics.pctText(analytics.accuracy) : '0%');
  setText('home-metric-saved', String(analytics.savedQuestions));
  setText('home-metric-errors', String(analytics.recentErrors));
  setText('home-quest-title', analytics.nextAction.title);
  setText('home-quest-detail', analytics.nextAction.detail);
  setText('home-quest-link', analytics.nextAction.cta);
  setHref('home-quest-link', analytics.nextAction.href);

  const plannerPayload = window.PeakPointAnalytics.readPlannerPayload(user, data);
  const cfg = plannerConfig(plannerPayload);
  const dashboardPlan = cfg ? generateDashboardPlan(cfg) : null;
  const currentScore = cfg ? cfg.current : analytics.scores.total;
  const targetScore = cfg ? cfg.target : analytics.scores.target;

  setText('home-current-score', String(currentScore));
  setText('home-target-score', String(targetScore));
  renderTestDate(cfg);
  renderSchedule(cfg, dashboardPlan);

  window.PeakPointAnalytics.renderStudyTime(
    document.getElementById('home-study-time-plot'),
    document.getElementById('home-study-time-xaxis'),
    analytics,
  );
})();
