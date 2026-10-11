/* ============================================
   PEAKPOINT SAT PREP — Shared analytics data
   ============================================ */

(function () {
  const VOCAB_TOTAL = 5995;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pctValue = (part, whole) => (whole ? (part / whole) * 100 : 0);
  const pctText = (value) => `${Math.round(clamp(Number(value) || 0, 0, 100))}%`;

  function safeJSON(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
    ));
  }

  function storage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  function identity(user) {
    return user && (user.id || user.email || user.name) ? String(user.id || user.email || user.name) : 'student';
  }


  function readQuestionBankProgress(user) {
    const store = storage();
    if (!store) return { completed: 0, correct: 0, saved: 0, errors: 0, averageSeconds: 0 };

    const raw = safeJSON(store.getItem(`pp_qbank_progress:${identity(user)}`), {});
    const entries = Object.values(raw).filter((entry) => entry && typeof entry === 'object');
    const completed = entries.filter((entry) => entry.status).length;
    const correct = entries.filter((entry) => entry.status === 'correct').length;
    const saved = entries.filter((entry) => entry.saved).length;
    const errors = entries.filter((entry) => entry.status && entry.status === 'incorrect').length;
    const timed = entries
      .map((entry) => Number(entry.timeSpent || entry.seconds || entry.elapsedSeconds || 0))
      .filter((seconds) => seconds > 0);

    return {
      records: raw,
      completed,
      correct,
      saved,
      errors,
      averageSeconds: timed.length ? timed.reduce((sum, value) => sum + value, 0) / timed.length : 0,
    };
  }

  function readVocabProgress(user) {
    const store = storage();
    if (!store) {
      return { total: VOCAB_TOTAL, attempted: 0, mastered: 0, learning: 0, shaky: 0, newCount: VOCAB_TOTAL, xp: 0, bestStreak: 0, masteryPct: 0 };
    }

    const keys = [`pp_vocab_progress:${identity(user)}`];

    let progress = {};
    for (const key of keys) {
      const candidate = safeJSON(store.getItem(key), {});
      const hasWords = Object.keys(candidate).some((entryKey) => entryKey !== '_meta');
      if (hasWords || (candidate._meta && Object.keys(candidate._meta).length)) {
        progress = candidate;
        break;
      }
    }

    const entries = Object.entries(progress).filter(([key, value]) => key !== '_meta' && value && typeof value === 'object');
    const statusCount = (status) => entries.filter(([, value]) => value.status === status).length;
    const mastered = statusCount('mastered');
    const learning = statusCount('learning');
    const shaky = statusCount('shaky');
    const attempted = mastered + learning + shaky;
    const meta = progress._meta || {};

    return {
      total: VOCAB_TOTAL,
      attempted,
      mastered,
      learning,
      shaky,
      newCount: Math.max(0, VOCAB_TOTAL - attempted),
      xp: Number(meta.xp || 0),
      bestStreak: Number(meta.bestStreak || 0),
      masteryPct: pctValue(mastered, VOCAB_TOTAL),
    };
  }

  function readActivityLog(user) {
    const store = storage();
    if (!store) return [];
    const keys = [`peakpoint-activity-log:${identity(user)}`];

    return keys.flatMap((key) => safeJSON(store.getItem(key), [])).filter((event) => event && event.t);
  }

  function readPlannerPayload(user, data) {
    const remotePlanner = data && data.learning && data.learning.studyPlanner;
    const store = storage();
    const inputs = store ? safeJSON(store.getItem(`pp_planner_inputs:${identity(user)}`), null) : null;
    const localPlanner = inputs ? {
      version: 1,
      inputs,
      generated: store.getItem(`pp_planner_generated:${identity(user)}`) === '1',
      updatedAt: null,
    } : null;

    if (remotePlanner && remotePlanner.inputs) {
      if (localPlanner && localPlanner.generated && !remotePlanner.generated) return localPlanner;
      return remotePlanner;
    }
    return localPlanner;
  }

  function recordActivity(user, event) {
    const store = storage();
    if (!store || !event) return;
    const key = `peakpoint-activity-log:${identity(user)}`;
    const log = safeJSON(store.getItem(key), []);
    log.push({ ...event, t: event.t || Date.now() });
    store.setItem(key, JSON.stringify(log.slice(-300)));
  }

  function getDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getSevenDays() {
    const now = new Date();
    const days = [];
    for (let index = 6; index >= 0; index -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - index);
      days.push({
        key: getDayKey(day),
        label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        minutes: 0,
      });
    }
    return days;
  }

  function addMinutes(days, timestamp, minutes) {
    const date = timestamp ? new Date(timestamp) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const found = days.find((day) => day.key === getDayKey(date));
    if (found && Number.isFinite(minutes) && minutes > 0) found.minutes += minutes;
  }

  function getAttemptSection(attempt) {
    const value = `${attempt.section || ''} ${attempt.subject || ''} ${attempt.skill || ''} ${attempt.domain || ''}`;
    if (/math|algebra|geometry|trigonometry|data|equation|function|ratio|percentage/i.test(value)) return 'math';
    if (/vocab|word/i.test(value)) return 'vocab';
    return 'rw';
  }

  function getAttemptSkill(attempt) {
    return attempt.skill || attempt.domain || attempt.section || 'Mixed practice';
  }


  function build(user, data) {
    const attempts = data && Array.isArray(data.attempts) ? data.attempts : [];
    const profile = data && data.profile ? data.profile : {};
    const questionBank = readQuestionBankProgress(user);
    const vocab = readVocabProgress(user);
    const activityLog = readActivityLog(user);
    const planner = readPlannerPayload(user, data);

    const attemptCorrect = attempts.filter((attempt) => attempt.correct).length;
    const attemptWrong = attempts.filter((attempt) => attempt.correct === false).length;
    const totalQuestions = attempts.length + questionBank.completed;
    const correctQuestions = attemptCorrect + questionBank.correct;
    const recentErrors = attemptWrong + questionBank.errors;
    const savedQuestions = questionBank.saved;
    const accuracy = pctValue(correctQuestions, totalQuestions);

    const sections = attempts.reduce((map, attempt) => {
      const section = getAttemptSection(attempt);
      map[section].total += 1;
      if (attempt.correct) map[section].correct += 1;
      return map;
    }, {
      math: { total: 0, correct: 0 },
      rw: { total: 0, correct: 0 },
      vocab: { total: 0, correct: 0 },
    });

    Object.values(questionBank.records || {}).forEach((record) => {
      if (!record.status) return;
      const section = /^(?:h[a-e]|p[a-c]|q[a-g]|s[a-d])$/.test(record.slug || '') ? 'math' : 'rw';
      sections[section].total += 1;
      if (record.status === 'correct') sections[section].correct += 1;
    });
    const mathAccuracy = sections.math.total ? pctValue(sections.math.correct, sections.math.total) : 0;
    const rwAccuracy = sections.rw.total ? pctValue(sections.rw.correct, sections.rw.total) : 0;
    const vocabAccuracy = vocab.attempted ? pctValue(vocab.mastered, vocab.attempted) : 0;

    const mathScore = Number(planner?.inputs?.math) || null;
    const rwScore = Number(planner?.inputs?.rw) || null;
    const totalScore = Number(planner?.inputs?.current) || (mathScore && rwScore ? mathScore + rwScore : null);
    const targetScore = Number(profile.targetScore || profile.target_score || (planner && planner.inputs && planner.inputs.target) || 0) || null;
    const scoreDelta = 0;

    const studyDays = getSevenDays();
    attempts.forEach((attempt) => addMinutes(studyDays, attempt.t || attempt.created_at, Number(attempt.timeSpent || 0) / 60));
    activityLog.forEach((event) => addMinutes(studyDays, event.t, Number(event.minutes || 0)));

    const activityDates = new Set([
      ...attempts.map((a) => a.t || a.created_at),
      ...activityLog.map((e) => e.t),
      ...Object.values(questionBank.records || {}).map((r) => r.updatedAt),
    ].filter(Boolean).map((timestamp) => getDayKey(new Date(timestamp))));
    const activeDays = studyDays.filter((day) => activityDates.has(day.key)).length;
    const todayMinutes = studyDays[studyDays.length - 1].minutes;

    const groupedSkills = attempts.reduce((map, attempt) => {
      const skill = getAttemptSkill(attempt);
      if (!map[skill]) map[skill] = { total: 0, correct: 0 };
      map[skill].total += 1;
      if (attempt.correct) map[skill].correct += 1;
      return map;
    }, {});

    const skillItems = Object.entries(groupedSkills)
      .map(([name, value]) => ({
        name,
        value: Math.round(pctValue(value.correct, value.total)),
        detail: `${value.total} ${value.total === 1 ? 'attempt' : 'attempts'}`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    if (questionBank.completed) {
      skillItems.push({
        name: 'Question Bank',
        value: Math.round(pctValue(questionBank.correct, questionBank.completed)),
        detail: `${questionBank.completed} attempted`,
      });
    }

    if (vocab.attempted) {
      skillItems.push({
        name: 'Vocabulary Mastery',
        value: Math.max(1, Math.round(vocab.masteryPct)),
        detail: `${vocab.mastered} mastered`,
      });
    }

    const normalizedSkills = skillItems
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
      .map((item) => ({
        ...item,
        tone: item.value >= 85 ? 'strong' : item.value >= 70 ? 'steady' : 'focus',
      }));

    const misses = attempts.filter((attempt) => attempt.correct === false)
      .reduce((map, attempt) => {
        const skill = getAttemptSkill(attempt);
        map[skill] = (map[skill] || 0) + 1;
        return map;
      }, {});
    if (questionBank.errors) misses['Question Bank misses'] = (misses['Question Bank misses'] || 0) + questionBank.errors;
    if (vocab.shaky) misses['Shaky vocabulary'] = (misses['Shaky vocabulary'] || 0) + vocab.shaky;

    const mistakes = Object.entries(misses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    const mathCount = sections.math.total;
    const rwCount = sections.rw.total;
    const vocabCount = vocab.attempted;
    const mixTotal = mathCount + rwCount + vocabCount;
    const mix = {
      math: pctValue(mathCount, mixTotal),
      rw: pctValue(rwCount, mixTotal),
      vocab: pctValue(vocabCount, mixTotal),
    };

    const achievements = [
      {
        title: 'First climb started',
        detail: 'Attempt your first question',
        unlocked: totalQuestions > 0,
      },
      {
        title: 'Accuracy spark',
        detail: 'Reach 80% current accuracy',
        unlocked: accuracy >= 80,
      },
      {
        title: 'Word collector',
        detail: 'Practice 25 vocabulary words',
        unlocked: vocab.attempted >= 25,
      },
      {
        title: 'Vocab streaker',
        detail: 'Hit a best vocab streak of 10',
        unlocked: vocab.bestStreak >= 10,
      },
      {
        title: 'Momentum week',
        detail: 'Study on 4 days this week',
        unlocked: activeDays >= 4,
      },
    ];

    const nextAction = (() => {
      if (recentErrors > 0) {
        return {
          title: 'Review incorrect answers',
          detail: `${recentErrors} missed ${recentErrors === 1 ? 'question is' : 'questions are'} ready to turn into focused practice.`,
          href: 'question-bank.html',
          cta: 'Open Question Bank',
        };
      }
      if (vocab.shaky > 0) {
        return {
          title: 'Review shaky vocabulary',
          detail: `${vocab.shaky} ${vocab.shaky === 1 ? 'word needs' : 'words need'} one more clean rep.`,
          href: 'vocab.html',
          cta: 'Open Vocab',
        };
      }
      if (totalQuestions === 0 && vocab.attempted === 0) {
        return {
          title: 'Start your first climb',
          detail: 'Answer a few questions or practice vocab so PeakPoint can personalize the dashboard.',
          href: 'question-bank.html',
          cta: 'Start Practice',
        };
      }
      return {
        title: 'Keep building mastery',
        detail: 'Your next best move is another focused set in your strongest active routine.',
        href: 'question-bank.html',
        cta: 'Continue Practicing',
      };
    })();

    const readiness = accuracy >= 88 && activeDays >= 3
      ? 'Study activity: Strong momentum'
      : accuracy >= 75 || activeDays >= 2
        ? 'Study activity: Building momentum'
        : 'Study activity: Ready to start';

    return {
      totalQuestions,
      correctQuestions,
      accuracy,
      recentErrors,
      savedQuestions,
      questionBank,
      vocab,
      scores: {
        math: mathScore,
        rw: rwScore,
        total: totalScore,
        target: targetScore,
        delta: scoreDelta,
      },
      sections: {
        math: { ...sections.math, accuracy: mathAccuracy },
        rw: { ...sections.rw, accuracy: rwAccuracy },
        vocab: { total: vocab.attempted, correct: vocab.mastered, accuracy: vocabAccuracy },
      },
      studyDays,
      activeDays,
      todayMinutes,
      skills: normalizedSkills,
      mix,
      mistakes,
      achievements,
      nextAction,
      readiness,
      planner,
      hasActivity: Boolean(totalQuestions || vocab.attempted || activityLog.length),
    };
  }

  function renderStudyTime(plot, axis, analytics) {
    if (!plot || !axis || !analytics) return;
    const days = analytics.studyDays || getSevenDays();
    const maxMinutes = Math.max(8, ...days.map((day) => day.minutes));
    const chart = plot.closest('.study-time-chart');
    if (chart) {
      const labels = chart.querySelectorAll('.study-time-yaxis span');
      labels.forEach((label, index) => { label.textContent = `${Math.round(maxMinutes * (1 - index / Math.max(1, labels.length - 1)))} mins`; });
      chart.setAttribute('aria-label', days.map((day) => `${day.label}: ` + Math.round(day.minutes) + ' recorded minutes').join('; '));
    }
    plot.querySelectorAll('.study-bar').forEach((bar) => bar.remove());
    days.forEach((day, index) => {
      const bar = document.createElement('span');
      bar.className = 'study-bar';
      bar.dataset.index = String(index);
      bar.style.setProperty('--study-height', `${(day.minutes / maxMinutes) * 100}%`);
      bar.style.setProperty('--bar-left', `${(index / Math.max(1, days.length - 1)) * 94}%`);
      plot.appendChild(bar);
    });
    axis.innerHTML = days.map((day) => `<span>${escapeHTML(day.label)}</span>`).join('');
  }

  window.PeakPointAnalytics = {
    build,
    clamp,
    escapeHTML,
    pctText,
    readPlannerPayload,
    recordActivity,
    renderStudyTime,
  };
})();
