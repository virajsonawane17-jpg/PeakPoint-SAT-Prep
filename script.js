/* ============================================
   PEAKPOINT SAT PREP — Space Canvas + Animations
   ============================================ */

(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Space Canvas ---------- */
  const canvas = document.getElementById('space-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const stars = [];
    const STAR_COUNT = Math.min(320, Math.floor((window.innerWidth * window.innerHeight) / 5000));

    const nebulas = [];
    const NEBULA_COUNT = 4;

    let shootingStars = [];
    let nextShootingStarAt = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function createStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        const twinkles = Math.random() < 0.2;
        const drifts = Math.random() < 0.05;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: rand(0.4, 2.4),
          baseOpacity: rand(0.3, 1.0),
          opacity: rand(0.3, 1.0),
          twinkles,
          twinkleSpeed: rand(0.0008, 0.003),
          twinklePhase: Math.random() * Math.PI * 2,
          drifts,
          driftX: drifts ? rand(-0.2, 0.2) : 0,
          driftY: drifts ? rand(-0.1, 0.1) : 0,
          color: pickStarColor()
        });
      }
    }

    function pickStarColor() {
      const r = Math.random();
      if (r < 0.7) return '255, 255, 255';
      if (r < 0.88) return '200, 216, 255';
      return '212, 200, 255';
    }

    function createNebulas() {
      nebulas.length = 0;
      const colors = [
        'rgba(108, 99, 255, 0.10)',
        'rgba(74, 63, 191, 0.09)',
        'rgba(59, 130, 246, 0.07)',
        'rgba(167, 139, 255, 0.06)'
      ];
      for (let i = 0; i < NEBULA_COUNT; i++) {
        nebulas.push({
          baseX: rand(0, width),
          baseY: rand(0, height),
          radius: rand(280, 520),
          color: colors[i % colors.length],
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          speed: rand(0.0002, 0.0005),
          driftRange: rand(40, 90)
        });
      }
    }

    function spawnShootingStar() {
      const startX = rand(width * 0.1, width * 0.85);
      const startY = rand(0, height * 0.5);
      const angle = rand(Math.PI * 0.15, Math.PI * 0.35);
      const length = rand(220, 400);
      const speed = rand(8, 14);
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length,
        life: 0,
        maxLife: 80
      });
    }

    function drawNebulas(t) {
      for (const n of nebulas) {
        const x = n.baseX + Math.cos(t * n.speed + n.phaseX) * n.driftRange;
        const y = n.baseY + Math.sin(t * n.speed + n.phaseY) * n.driftRange;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, n.radius);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - n.radius, y - n.radius, n.radius * 2, n.radius * 2);
      }
    }

    function drawStars(t) {
      for (const s of stars) {
        if (s.twinkles) {
          const factor = (Math.sin(t * s.twinkleSpeed + s.twinklePhase) + 1) / 2;
          s.opacity = 0.3 + factor * 0.7;
        }
        if (s.drifts) {
          s.x += s.driftX;
          s.y += s.driftY;
          if (s.x < -10) s.x = width + 10;
          if (s.x > width + 10) s.x = -10;
          if (s.y < -10) s.y = height + 10;
          if (s.y > height + 10) s.y = -10;
        }
        ctx.fillStyle = `rgba(${s.color}, ${s.opacity})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        if (s.size > 1.6) {
          ctx.fillStyle = `rgba(${s.color}, ${s.opacity * 0.18})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawShootingStars() {
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;

        const lifeRatio = s.life / s.maxLife;
        const alpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1 - (lifeRatio - 0.3) / 0.7;

        const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.length;
        const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.length;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.6, `rgba(200, 216, 255, ${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx.fill();

        if (s.life >= s.maxLife) shootingStars.splice(i, 1);
      }
    }

    let lastTime = performance.now();
    function loop(t) {
      ctx.clearRect(0, 0, width, height);

      drawNebulas(t);
      drawStars(t);

      if (!prefersReducedMotion && t > nextShootingStarAt) {
        spawnShootingStar();
        nextShootingStarAt = t + rand(8000, 15000);
      }
      drawShootingStars();

      lastTime = t;
      requestAnimationFrame(loop);
    }

    function init() {
      resize();
      createStars();
      createNebulas();
      nextShootingStarAt = performance.now() + rand(3000, 7000);
      requestAnimationFrame(loop);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        createStars();
        createNebulas();
      }, 200);
    });

    init();
  }

  /* ---------- University Logos ----------
     Real PNG logos from Wikimedia Commons (publicly hot-linkable, CC-licensed).
     Each renders as a white silhouette via CSS filter. */
  const marqueeEl = document.getElementById('uni-marquee');
  if (marqueeEl) {
    const unis = [
      { name: 'Harvard',       png: 'logos/harvard.svg' },
      { name: 'Stanford',      png: 'logos/stanford.svg' },
      { name: 'MIT',           png: 'logos/mit.svg' },
      { name: 'Yale',          png: 'logos/yale.svg' },
      { name: 'Princeton',     png: 'logos/princeton.svg' },
      { name: 'Duke',          png: 'logos/duke.svg' },
      { name: 'Penn',          png: 'logos/penn.svg' },
      { name: 'Georgia Tech',  png: 'logos/georgia-tech.svg' },
      { name: 'Caltech',       png: 'logos/caltech.svg' },
      { name: 'Columbia',      png: 'logos/columbia.svg' },
      { name: 'Cornell',       png: 'logos/cornell.svg' }
    ];

    // Text fallback rendered in distinctive typography if the image fails to load
    const buildLogo = (uni) => {
      const wrap = document.createElement('div');
      wrap.className = 'uni-logo';
      wrap.setAttribute('title', uni.name);

      const img = document.createElement('img');
      img.alt = uni.name;
      img.loading = 'lazy';
      img.src = uni.png;
      img.onerror = () => { wrap.classList.add('fallback'); };
      wrap.appendChild(img);

      const txt = document.createElement('span');
      txt.className = 'uni-fallback';
      txt.textContent = uni.name;
      wrap.appendChild(txt);

      return wrap;
    };

    // Duplicate the set so the marquee loops seamlessly
    for (let pass = 0; pass < 2; pass++) {
      unis.forEach((u) => marqueeEl.appendChild(buildLogo(u)));
    }
  }

  /* ---------- Navbar scroll ---------- */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => {
      if (window.scrollY > 30) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  /* ---------- Hero word reveal (set delays) ---------- */
  document.querySelectorAll('.hero h1 .word').forEach((el, i) => {
    el.style.animationDelay = `${0.3 + i * 0.12}s`;
  });

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.delay || '0', 10);
          setTimeout(() => el.classList.add('visible'), delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Stats count up ---------- */
  const stats = document.querySelectorAll('[data-count]');
  if (stats.length) {
    const easeOutExpo = (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);

    const animateCount = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 2500;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeOutExpo(t);
        const value = Math.floor(target * eased);
        el.textContent = value.toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(step);
    };

    const statIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    stats.forEach((el) => statIo.observe(el));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const button = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!button || !answer) return;

    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all others
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          const a = other.querySelector('.faq-answer');
          if (a) a.style.maxHeight = '0';
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Competition Timeline progress + node activation ---------- */
  const timeline = document.querySelector('.timeline');
  if (timeline) {
    const progress = timeline.querySelector('.timeline-progress');
    const items = timeline.querySelectorAll('.timeline-item');

    const updateTimeline = () => {
      const rect = timeline.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = timeline.offsetHeight;
      const scrolled = Math.max(0, Math.min(total, viewportH * 0.5 - rect.top));
      const ratio = total > 0 ? scrolled / total : 0;
      if (progress) progress.style.height = (ratio * 100) + '%';

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        if (itemRect.top < viewportH * 0.7) item.classList.add('activated');
      });
    };

    window.addEventListener('scroll', updateTimeline, { passive: true });
    updateTimeline();
  }

  /* ---------- Hero parallax ---------- */
  const heroContent = document.querySelector('.hero-content');
  const orbs = document.querySelectorAll('.cosmic-orb');
  if (!prefersReducedMotion && (heroContent || orbs.length)) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (heroContent && y < window.innerHeight) {
        heroContent.style.transform = `translateY(${y * 0.3}px)`;
        heroContent.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.7));
      }
      orbs.forEach((orb, i) => {
        orb.style.transform = `translateY(${y * (0.15 + i * 0.05)}px)`;
      });
    }, { passive: true });
  }
})();
