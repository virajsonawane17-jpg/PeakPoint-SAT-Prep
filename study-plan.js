/* ============================================
   PEAKPOINT SAT PREP — Study Plan
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;
  const data = await PP.auth.loadData(user.id);
  PP.learning.normalize(data);

  const el = (id) => document.getElementById(id);
  const form = el('plan-form');
  const prefs = data.learning.studyPreferences || {};

  el('plan-target').value = prefs.targetScore || data.profile.targetScore || '';
  el('plan-date').value = prefs.testDate || data.profile.testDate || '';
  el('plan-time').value = prefs.minutesPerDay || 45;
  el('plan-subject').value = prefs.subjectPreference || 'Mixed';
  if (prefs.preferredDays) {
    document.querySelectorAll('.day-picker input').forEach((input) => {
      input.checked = prefs.preferredDays.includes(input.value);
    });
  }

  if (!data.learning.studyPlan.length) {
    PP.learning.generateStudyPlan(data, collectPrefs());
    PP.auth.saveData(user.id, data);
  }
  renderPlan();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    PP.learning.generateStudyPlan(data, collectPrefs());
    data.profile.targetScore = Number(el('plan-target').value || data.profile.targetScore || 1400);
    data.profile.testDate = el('plan-date').value || data.profile.testDate;
    PP.auth.saveData(user.id, data);
    renderPlan();
  });

  function collectPrefs() {
    const preferredDays = [...document.querySelectorAll('.day-picker input:checked')].map((input) => input.value);
    return {
      targetScore: Number(el('plan-target').value || 1400),
      testDate: el('plan-date').value || null,
      minutesPerDay: Number(el('plan-time').value || 45),
      subjectPreference: el('plan-subject').value,
      preferredDays: preferredDays.length ? preferredDays : ['Mon', 'Wed', 'Fri', 'Sat']
    };
  }

  function renderPlan() {
    const list = el('plan-list');
    list.innerHTML = '';
    const plan = data.learning.studyPlan;
    el('plan-progress').textContent = `${PP.learning.analytics(data).studyPlanCompletion}% complete`;
    if (!plan.length) {
      list.innerHTML = '<div class="card"><p class="card-sub">Build a plan to get started.</p></div>';
      return;
    }
    for (const activity of plan.slice(0, 30)) {
      const card = document.createElement('article');
      card.className = `card plan-card status-${activity.status}`;
      card.innerHTML = `
        <div class="plan-card-main">
          <span class="q-tag">${activity.date}</span>
          <h3>${escapeHtml(activity.title)}</h3>
          <p class="card-sub">${escapeHtml(activity.reason)}</p>
          <span class="muted mono">${escapeHtml(activity.subject)} · ${activity.duration} min · ${activity.status.replace('_', ' ')}</span>
        </div>
        <div class="plan-actions">
          <button class="tool-btn" data-action="start">Start</button>
          <button class="tool-btn" data-action="complete">Complete</button>
          <button class="tool-btn" data-action="skip">Skip</button>
          <button class="tool-btn" data-action="replace">Replace</button>
          <button class="tool-btn" data-action="reschedule">Tomorrow</button>
          <button class="tool-btn" data-action="why">Why?</button>
        </div>`;
      card.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => handleAction(activity, button.dataset.action));
      });
      list.appendChild(card);
    }
  }

  async function handleAction(activity, action) {
    if (action === 'start') {
      if (activity.type === 'diagnostic') window.location.href = 'practice.html?mode=diagnostic';
      else if (activity.type === 'mistake-review') window.location.href = 'mistakes.html';
      else if (activity.type === 'vocabulary-review') window.location.href = 'vocab.html';
      else if (activity.type === 'timed-practice') window.location.href = 'rush.html';
      else window.location.href = `practice.html?mode=skill&skill=${encodeURIComponent(activity.skill)}`;
      return;
    }
    if (action === 'why') {
      await explain(activity);
      return;
    }
    PP.learning.updateActivity(data, activity.id, action);
    if (action === 'skip') rescheduleMissed();
    PP.auth.saveData(user.id, data);
    renderPlan();
  }

  function rescheduleMissed() {
    const skipped = data.learning.studyPlan.filter((item) => item.status === 'skipped');
    for (const item of skipped) {
      if (!data.learning.studyPlan.some((other) => other.id !== item.id && other.title === item.title && other.status === 'ready')) {
        data.learning.studyPlan.push({ ...item, id: `activity-${Date.now()}-${Math.random()}`, date: tomorrow(), status: 'ready', reason: `${item.reason} This was rescheduled after a skip.` });
      }
    }
  }

  function tomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  async function explain(activity) {
    const box = el('plan-ai');
    box.innerHTML = '<strong>PeakPoint AI rationale</strong><p class="card-sub">Thinking...</p>';
    const result = await PP.api.summary('study plan recommendation', {
      activity,
      weakestSkills: PP.learning.weakestSkills(data, 4).map((s) => s.name),
      targetScore: data.profile.targetScore,
      testDate: data.profile.testDate
    });
    if (!result.ok) {
      box.innerHTML = `<strong>PeakPoint AI rationale</strong><p class="card-sub">${escapeHtml(result.error || activity.reason)}</p>`;
      return;
    }
    box.innerHTML = `<strong>PeakPoint AI rationale</strong><p>${escapeHtml(result.text)}</p>`;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }
})();
