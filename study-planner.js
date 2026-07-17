/* ============================================
   PEAKPOINT SAT PREP — Study Planner UI
   UI-only interactions. No plan data is saved.
   ============================================ */

(async () => {
  if (window.PP && PP.auth) {
    const user = await PP.auth.requireAuth();
    if (!user) return;
    const firstName = (user.name || user.email || 'Student').split(' ')[0];
    const sideName = document.getElementById('side-user-name');
    if (sideName) sideName.textContent = user.name || firstName;
  }

  const $ = (id) => document.getElementById(id);
  const tabs = Array.from(document.querySelectorAll('[data-plan-view]'));
  const panels = Array.from(document.querySelectorAll('[data-plan-panel]'));
  const testDate = $('test-date');
  const targetScore = $('target-score');
  const currentScore = $('current-score');
  const rwScore = $('rw-score');
  const mathScore = $('math-score');
  const dailyTime = $('daily-time');
  const domainMeters = Array.from(document.querySelectorAll('[data-domain-score]'));
  const toggleInputs = Array.from(document.querySelectorAll('.planner-days input'));

  function showPanel(view) {
    tabs.forEach((tab) => {
      const active = tab.dataset.planView === view;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.planPanel === view);
    });
  }

  function selectedDayCount() {
    return Array.from(document.querySelectorAll('.planner-days input:checked')).length || 1;
  }

  function syncTogglePills() {
    toggleInputs.forEach((input) => {
      const label = input.closest('label');
      if (label) label.classList.toggle('is-selected', input.checked);
    });
  }

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
          updateSnapshot();
        });
        meter.appendChild(dot);
      }
      syncDomainMeter(meter);
    });
  }

  function updateSnapshot() {
    const today = new Date();
    const selectedDate = testDate && testDate.value ? new Date(`${testDate.value}T12:00:00`) : today;
    const diff = Math.max(0, Math.ceil((selectedDate - today) / 86400000));
    const target = Number(targetScore && targetScore.value) || 1540;
    const current = Number(currentScore && currentScore.value) || 1340;
    const minutes = Number(dailyTime && dailyTime.value) || 45;
    const weeklyHours = (selectedDayCount() * minutes / 60).toFixed(1);

    const daysEl = $('planner-days');
    const gapEl = $('score-gap');
    const weeklyEl = $('weekly-time');
    const splitEl = $('score-split');
    const weakestEl = $('weakest-domain');
    const averageEl = $('domain-average');
    const domainScores = domainMeters.map((meter) => ({
      name: meter.dataset.domainName || 'Domain',
      score: Math.min(7, Math.max(1, Number(meter.dataset.domainLevel) || 1))
    }));
    const weakest = domainScores.reduce((lowest, item) => (
      item.score < lowest.score ? item : lowest
    ), domainScores[0] || { name: 'Craft and Structure', score: 0 });
    const average = domainScores.length
      ? domainScores.reduce((sum, item) => sum + item.score, 0) / domainScores.length
      : 0;

    if (daysEl) daysEl.textContent = `${diff} ${diff === 1 ? 'day' : 'days'}`;
    if (gapEl) gapEl.textContent = `${target - current >= 0 ? '+' : ''}${target - current}`;
    if (weeklyEl) weeklyEl.textContent = `${weeklyHours}h`;
    if (splitEl) splitEl.textContent = `${Number(rwScore && rwScore.value) || 660} / ${Number(mathScore && mathScore.value) || 680}`;
    if (weakestEl) weakestEl.textContent = weakest.name;
    if (averageEl) averageEl.textContent = domainBand(Math.round(average));
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.planView));
  });

  document.querySelectorAll('#planner-form input, #planner-form select').forEach((input) => {
    input.addEventListener('input', updateSnapshot);
    input.addEventListener('change', updateSnapshot);
  });

  toggleInputs.forEach((input) => {
    input.addEventListener('change', syncTogglePills);
  });

  const refresh = $('refresh-plan');
  if (refresh) refresh.addEventListener('click', updateSnapshot);

  setupDomainMeters();
  syncTogglePills();
  updateSnapshot();
})();
