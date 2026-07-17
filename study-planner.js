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
    const daysEl = $('planner-days');

    if (daysEl) daysEl.textContent = `${diff} ${diff === 1 ? 'day' : 'days'}`;
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
