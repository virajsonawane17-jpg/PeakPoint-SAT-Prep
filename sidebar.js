/* ============================================
   PEAKPOINT SAT PREP — Shared app sidebar
   ============================================ */

(() => {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const storageKey = 'peakpoint-sidebar-collapsed';

  if (!toggle || !sidebar) return;

  const icon = toggle.querySelector('[data-sidebar-toggle-icon]');
  const sidebarFocusables = Array.from(sidebar.querySelectorAll('a, button'));

  const setToggleState = () => {
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Show sidebar' : 'Hide sidebar');
    toggle.title = collapsed ? 'Show sidebar' : 'Hide sidebar';
    if (icon) icon.textContent = collapsed ? '›' : '‹';
    sidebar.setAttribute('aria-hidden', String(collapsed));
    sidebarFocusables.forEach((el) => {
      if (collapsed) el.setAttribute('tabindex', '-1');
      else el.removeAttribute('tabindex');
    });
  };

  try {
    if (localStorage.getItem(storageKey) === 'true') {
      document.body.classList.add('sidebar-collapsed');
    }
  } catch {
    // The toggle still works if localStorage is unavailable.
  }

  setToggleState();

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    try {
      localStorage.setItem(storageKey, String(collapsed));
    } catch {
      // Best-effort preference persistence only.
    }
    setToggleState();
  });

  if (window.PP && PP.auth && typeof PP.auth.currentUser === 'function') {
    PP.auth.currentUser().then((user) => {
      if (!user) return;
      const firstName = (user.name || user.email || 'Student').split(' ')[0];
      const sideName = document.getElementById('side-user-name');
      if (sideName) sideName.textContent = user.name || firstName;
    }).catch(() => {});
  }
})();
