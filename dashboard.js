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

  setText('home-metric-attempted', analytics.totalQuestions.toLocaleString());
  setText('home-metric-accuracy', analytics.totalQuestions ? window.PeakPointAnalytics.pctText(analytics.accuracy) : '0%');
  setText('home-metric-saved', String(analytics.savedQuestions));
  setText('home-metric-errors', String(analytics.recentErrors));
  setText('home-quest-title', analytics.nextAction.title);
  setText('home-quest-detail', analytics.nextAction.detail);
  setText('home-quest-link', analytics.nextAction.cta);
  setHref('home-quest-link', analytics.nextAction.href);

  window.PeakPointAnalytics.renderStudyTime(
    document.getElementById('home-study-time-plot'),
    document.getElementById('home-study-time-xaxis'),
    analytics,
  );
})();
