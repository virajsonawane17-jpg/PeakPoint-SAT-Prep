/* ============================================
   PEAKPOINT SAT PREP — Maintenance gate
   ============================================ */

(function () {
  const MAINTENANCE_MODE = true;
  const MAINTENANCE_PAGE = 'maintenance.html';
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (MAINTENANCE_MODE && currentPage !== MAINTENANCE_PAGE) {
    window.location.replace(MAINTENANCE_PAGE);
  }
})();
