/* ============================================
   PEAKPOINT SAT PREP — Fresh home dashboard
   Auth gate + display-only user personalization.
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
})();
