/* ============================================
   PEAKPOINT SAT PREP - Settings
   ============================================ */

(async () => {
  const user = window.PP && PP.auth ? await PP.auth.requireAuth() : null;
  if (!user) return;
  const copy = document.getElementById('settings-user-copy');
  const logout = document.getElementById('settings-logout');

  if (user && copy) {
    copy.textContent = `Signed in as ${user.email || user.name || 'your PeakPoint account'}.`;
  }

  if (logout) {
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      logout.textContent = 'Logging out...';
      try {
        await PP.auth.logout();
        window.location.href = 'login.html';
      } catch {
        logout.disabled = false; logout.textContent = 'Retry log out';
        document.getElementById('settings-status').textContent = 'Sign-out failed. Check your connection and retry.';
      }
    });
  }
  document.getElementById('clear-local').addEventListener('click', () => {
    if (!window.confirm('Remove this account’s study records from this browser? Server records and your account will remain.')) return;
    try { PP.auth.clearLocalData(user.id); document.getElementById('settings-status').textContent = 'Local records cleared. Server records remain.'; }
    catch { document.getElementById('settings-status').textContent = 'Browser storage could not be cleared.'; }
  });
})();
