/* ============================================
   PEAKPOINT SAT PREP - PeakPoint Climb UI
   Frontend-only journey interactions.
   ============================================ */

(async () => {
  const user = await PP.auth.requireAuth();
  if (!user) return;

  const currentCheckpoint = document.getElementById('current-checkpoint');
  const lessonModal = document.getElementById('lesson-modal');
  const modalTitle = document.getElementById('lesson-modal-title');
  const modalCopy = lessonModal ? lessonModal.querySelector('.dialog-copy') : null;
  const toast = document.getElementById('climb-toast');
  let toastTimer = null;

  const lessonPreviews = {
    'Base Camp': {
      title: 'Base Camp: Foundation Reset',
      copy: 'A fresh pass through essential algebra, grammar, and reading habits from the beginning of the trail.'
    },
    Meadows: {
      title: 'Meadows: Momentum Builder',
      copy: 'A balanced SAT-style set covering algebra fluency, central ideas, and sentence boundaries.'
    },
    Forest: {
      title: 'Forest: Trail Markers',
      copy: 'A focused SAT-style climb through transitions, nonlinear word problems, and command of evidence.'
    }
  };

  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function scrollToCurrent() {
    if (!currentCheckpoint) return;
    currentCheckpoint.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function openLesson(stage) {
    const preview = lessonPreviews[stage] || lessonPreviews.Forest;
    if (modalTitle) modalTitle.textContent = preview.title;
    if (modalCopy) modalCopy.textContent = preview.copy;

    if (lessonModal && typeof lessonModal.showModal === 'function') {
      lessonModal.showModal();
      return;
    }

    showToast(`${preview.title} is ready for a future lesson connection.`);
  }

  document.querySelectorAll('[data-scroll-current]').forEach((button) => {
    button.addEventListener('click', scrollToCurrent);
  });

  document.querySelectorAll('[data-lesson]').forEach((button) => {
    button.addEventListener('click', () => openLesson(button.dataset.lesson));
  });

  document.querySelectorAll('[data-achievement]').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.remove('is-celebrating');
      window.requestAnimationFrame(() => button.classList.add('is-celebrating'));
      window.setTimeout(() => button.classList.remove('is-celebrating'), 900);
      showToast(`${button.dataset.achievement} unlocked and added to your trail.`);
    });
  });

  const demoStart = document.querySelector('[data-demo-start]');
  if (demoStart) {
    demoStart.addEventListener('click', () => {
      if (lessonModal && lessonModal.open) lessonModal.close();
      showToast('Lesson launch preview complete. No study data was changed.');
    });
  }

  if (lessonModal) {
    lessonModal.addEventListener('click', (event) => {
      const bounds = lessonModal.getBoundingClientRect();
      const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
      if (outside) lessonModal.close();
    });
  }

  const checkpoints = Array.from(document.querySelectorAll('.checkpoint'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('in-view');
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.18 });

    checkpoints.forEach((checkpoint) => observer.observe(checkpoint));
    window.requestAnimationFrame(() => document.body.classList.add('climb-animations'));
  } else {
    checkpoints.forEach((checkpoint) => checkpoint.classList.add('in-view'));
  }
})();
