/* ============================================
   PEAKPOINT SAT PREP - Settings
   ============================================ */

(async () => {
  const user = window.PP && PP.auth ? await PP.auth.requireAuth() : null;
  const copy = document.getElementById('settings-user-copy');
  const logout = document.getElementById('settings-logout');

  if (user && copy) {
    copy.textContent = `Signed in as ${user.email || user.name || 'your PeakPoint account'}.`;
  }

  if (logout) {
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      logout.textContent = 'Logging out...';
      if (window.PP && PP.auth) {
        await PP.auth.logout();
      }
      window.location.href = 'login.html';
    });
  }
})();
