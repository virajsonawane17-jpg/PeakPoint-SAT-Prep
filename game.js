/* ============================================
   PEAKPOINT SAT PREP — Gamification & Progress
   XP, levels, space-themed ranks, streaks,
   badges, mastery updates, and score estimates.
   ============================================ */

window.PP = window.PP || {};

PP.game = (() => {

  const DAILY_GOAL = 20; // questions per day

  /* ---------- XP & Levels ---------- */

  // XP needed to *reach* level L is 100·(L−1)². Level 1 starts at 0.
  function levelInfo(xp) {
    const level = Math.floor(Math.sqrt((xp || 0) / 100)) + 1;
    const floor = 100 * Math.pow(level - 1, 2);
    const ceil = 100 * Math.pow(level, 2);
    return {
      level,
      rank: rankFor(level),
      into: xp - floor,
      need: ceil - floor,
      pct: Math.min(100, Math.round(((xp - floor) / (ceil - floor)) * 100))
    };
  }

  const RANKS = [
    { min: 1,  name: 'Stargazer',  icon: '✦' },
    { min: 3,  name: 'Cadet',      icon: '🎓' },
    { min: 5,  name: 'Pilot',      icon: '🛩️' },
    { min: 8,  name: 'Navigator',  icon: '🧭' },
    { min: 12, name: 'Commander',  icon: '🎖️' },
    { min: 16, name: 'Astronaut',  icon: '👨‍🚀' },
    { min: 21, name: 'Voyager',    icon: '🛰️' },
    { min: 27, name: 'Celestial',  icon: '🌌' }
  ];

  function rankFor(level) {
    let r = RANKS[0];
    for (const rank of RANKS) if (level >= rank.min) r = rank;
    return r;
  }

  // Harder questions and hot streaks earn more XP.
  function xpFor(diff, combo) {
    return 10 * diff + 2 * Math.min(combo || 0, 10);
  }

  /* ---------- Streaks & daily activity ---------- */

  function todayKey(d) {
    const dt = d || new Date();
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }

  function streak(data) {
    const days = new Set(data.days || []);
    if (!days.size) return 0;
    let count = 0;
    const cursor = new Date();
    // A streak is alive if the user practiced today OR yesterday.
    if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(todayKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function todayCount(data) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return (data.attempts || []).filter(a => a.t >= start.getTime()).length;
  }

  /* ---------- Mastery & score estimates ---------- */

  // Mastery is 0–100 per skill. Gains shrink as mastery grows;
  // misses cost proportionally more at high mastery.
  function updateMastery(data, skillId, diff, correct) {
    const m = data.mastery[skillId] ?? 30;
    let next;
    if (correct) next = m + (100 - m) * (0.05 + 0.03 * diff);
    else next = m - m * 0.09;
    data.mastery[skillId] = Math.round(Math.max(5, Math.min(100, next)) * 10) / 10;
  }

  function sectionMastery(data, section) {
    const skills = PP.questions.SKILLS.filter(s => s.section === section);
    const vals = skills.map(s => data.mastery[s.id]).filter(v => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / skills.length; // unattempted skills count as 0
  }

  // Maps average mastery (0–100) onto the 200–800 SAT section scale,
  // rounded to the nearest 10 like a real score report.
  function estimatedScores(data) {
    const toScore = (m) => m == null ? null : Math.round((200 + 600 * (m / 100)) / 10) * 10;
    const math = toScore(sectionMastery(data, 'math'));
    const rw = toScore(sectionMastery(data, 'rw'));
    return { math, rw, total: (math != null && rw != null) ? math + rw : null };
  }

  /* ---------- Badges ---------- */

  const BADGES = [
    { id: 'first-step',   icon: '🚀', name: 'Liftoff',          desc: 'Answer your first question',            test: d => (d.attempts || []).length >= 1 },
    { id: 'diagnostic',   icon: '🩺', name: 'Systems Check',    desc: 'Complete the diagnostic',               test: d => d.diagnosticDone },
    { id: 'correct-10',   icon: '⭐', name: 'Rising Star',      desc: 'Answer 10 questions correctly',         test: d => countCorrect(d) >= 10 },
    { id: 'correct-50',   icon: '🌟', name: 'Supernova',        desc: 'Answer 50 questions correctly',         test: d => countCorrect(d) >= 50 },
    { id: 'correct-250',  icon: '💫', name: 'Galaxy Brain',     desc: 'Answer 250 questions correctly',        test: d => countCorrect(d) >= 250 },
    { id: 'streak-3',     icon: '🔥', name: 'Ignition',         desc: 'Practice 3 days in a row',              test: d => streak(d) >= 3 },
    { id: 'streak-7',     icon: '☄️', name: 'Comet',            desc: 'Practice 7 days in a row',              test: d => streak(d) >= 7 },
    { id: 'streak-30',    icon: '🪐', name: 'Full Orbit',       desc: 'Practice 30 days in a row',             test: d => streak(d) >= 30 },
    { id: 'combo-5',      icon: '⚡', name: 'Hot Streak',       desc: 'Get 5 correct in a row in one session', test: d => (d.bestCombo || 0) >= 5 },
    { id: 'combo-10',     icon: '🌠', name: 'Unstoppable',      desc: 'Get 10 correct in a row in one session', test: d => (d.bestCombo || 0) >= 10 },
    { id: 'skill-master', icon: '🏆', name: 'Skill Master',     desc: 'Reach 90+ mastery in any skill',        test: d => Object.values(d.mastery || {}).some(m => m >= 90) },
    { id: 'well-rounded', icon: '🌍', name: 'Well-Rounded',     desc: 'Attempt every skill at least once',     test: d => PP.questions.SKILLS.every(s => d.mastery[s.id] != null) },
    { id: 'sprint',       icon: '⏱️', name: 'Rocket Sprint',    desc: 'Finish a timed sprint session',         test: d => (d.sessions || []).some(s => s.type === 'sprint') },
    { id: 'daily-goal',   icon: '🎯', name: 'Bullseye',         desc: `Hit the daily goal of ${DAILY_GOAL} questions`, test: d => todayCount(d) >= DAILY_GOAL },
    { id: 'level-5',      icon: '🛩️', name: 'Pilot\'s License', desc: 'Reach level 5',                         test: d => levelInfo(d.xp || 0).level >= 5 },
    { id: 'level-10',     icon: '🎖️', name: 'Decorated',        desc: 'Reach level 10',                        test: d => levelInfo(d.xp || 0).level >= 10 }
  ];

  function countCorrect(data) {
    return (data.attempts || []).filter(a => a.correct).length;
  }

  // Returns newly earned badges and records them on the data object.
  function checkBadges(data) {
    data.badges = data.badges || [];
    const fresh = [];
    for (const b of BADGES) {
      if (!data.badges.includes(b.id) && b.test(data)) {
        data.badges.push(b.id);
        fresh.push(b);
      }
    }
    return fresh;
  }

  /* ---------- Attempt recording ---------- */

  // Single entry point used by the practice page after every answer.
  function recordAttempt(data, question, correct, combo) {
    data.attempts.push({
      qid: question.id,
      skill: question.skill,
      section: question.section,
      difficulty: question.difficulty,
      correct,
      t: Date.now()
    });
    updateMastery(data, question.skill, question.difficulty, correct);
    let earned = 0;
    if (correct) {
      earned = xpFor(question.difficulty, combo);
      data.xp = (data.xp || 0) + earned;
    }
    if ((combo || 0) > (data.bestCombo || 0)) data.bestCombo = combo;
    const key = todayKey();
    if (!data.days.includes(key)) data.days.push(key);
    return earned;
  }

  return {
    DAILY_GOAL, RANKS, BADGES,
    levelInfo, xpFor, streak, todayCount, todayKey,
    updateMastery, estimatedScores, sectionMastery,
    checkBadges, recordAttempt, countCorrect
  };
})();
