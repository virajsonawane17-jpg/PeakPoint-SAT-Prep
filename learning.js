/* ============================================
   PEAKPOINT SAT PREP — Learning system core
   Deterministic analytics, planning, vocab, mistakes,
   recommendations, and question metadata.
   ============================================ */

window.PP = window.PP || {};

PP.learning = (() => {
  const STORAGE_VERSION = 2;
  const letters = ['A', 'B', 'C', 'D'];

  const SKILL_META = {
    'lin-eq': { subject: 'Math', section: 'math', domain: 'Algebra', skillName: 'Linear Equations', questionType: 'Multiple Choice', estimatedSeconds: 70 },
    systems: { subject: 'Math', section: 'math', domain: 'Algebra', skillName: 'Systems of Equations', questionType: 'Multiple Choice', estimatedSeconds: 85 },
    'lin-fn': { subject: 'Math', section: 'math', domain: 'Advanced Math', skillName: 'Linear Functions & Graphs', questionType: 'Multiple Choice', estimatedSeconds: 80 },
    ratios: { subject: 'Math', section: 'math', domain: 'Problem Solving and Data Analysis', skillName: 'Ratios, Percents & Proportions', questionType: 'Multiple Choice', estimatedSeconds: 75 },
    data: { subject: 'Math', section: 'math', domain: 'Problem Solving and Data Analysis', skillName: 'Data Analysis & Statistics', questionType: 'Multiple Choice', estimatedSeconds: 75 },
    prob: { subject: 'Math', section: 'math', domain: 'Problem Solving and Data Analysis', skillName: 'Probability', questionType: 'Multiple Choice', estimatedSeconds: 80 },
    quad: { subject: 'Math', section: 'math', domain: 'Advanced Math', skillName: 'Quadratics & Exponents', questionType: 'Multiple Choice', estimatedSeconds: 90 },
    expo: { subject: 'Math', section: 'math', domain: 'Advanced Math', skillName: 'Exponential Growth & Decay', questionType: 'Multiple Choice', estimatedSeconds: 85 },
    geom: { subject: 'Math', section: 'math', domain: 'Geometry and Trigonometry', skillName: 'Geometry', questionType: 'Multiple Choice', estimatedSeconds: 80 },
    trig: { subject: 'Math', section: 'math', domain: 'Geometry and Trigonometry', skillName: 'Trigonometry', questionType: 'Multiple Choice', estimatedSeconds: 85 },
    agree: { subject: 'Reading and Writing', section: 'rw', domain: 'Standard English Conventions', skillName: 'Subject-Verb Agreement', questionType: 'Text Completion', estimatedSeconds: 50 },
    punct: { subject: 'Reading and Writing', section: 'rw', domain: 'Standard English Conventions', skillName: 'Punctuation & Boundaries', questionType: 'Text Completion', estimatedSeconds: 55 },
    trans: { subject: 'Reading and Writing', section: 'rw', domain: 'Expression of Ideas', skillName: 'Transitions', questionType: 'Text Completion', estimatedSeconds: 55 },
    vocab: { subject: 'Reading and Writing', section: 'rw', domain: 'Craft and Structure', skillName: 'Words in Context', questionType: 'Vocabulary in Context', estimatedSeconds: 55 },
    concise: { subject: 'Reading and Writing', section: 'rw', domain: 'Expression of Ideas', skillName: 'Concision & Style', questionType: 'Text Completion', estimatedSeconds: 50 }
  };

  const VOCAB = [
    { id: 'ambivalent', word: 'ambivalent', definition: 'having mixed feelings', example: 'Lena felt ambivalent about leaving home for college.', synonyms: ['conflicted', 'uncertain'], antonyms: ['certain', 'decisive'], roots: 'ambi = both', trap: 'Does not mean uninterested.', memory: 'Two feelings are both alive at once.' },
    { id: 'candid', word: 'candid', definition: 'honest and direct', example: 'The director gave a candid interview about the budget problems.', synonyms: ['frank', 'open'], antonyms: ['guarded', 'evasive'], roots: 'cand = shining/white', trap: 'Candid is honest, not necessarily harsh.', memory: 'A candid camera shows what really happened.' },
    { id: 'diligent', word: 'diligent', definition: 'careful and hardworking', example: 'A diligent researcher checked every source twice.', synonyms: ['thorough', 'persistent'], antonyms: ['careless', 'lazy'], roots: 'diligere = value highly', trap: 'Not the same as naturally talented.', memory: 'Diligent work is done with care.' },
    { id: 'ephemeral', word: 'ephemeral', definition: 'short-lived', example: 'The blossoms were ephemeral, lasting barely two weeks.', synonyms: ['brief', 'fleeting'], antonyms: ['lasting', 'permanent'], roots: 'epi + hemera = for a day', trap: 'Not just delicate or seasonal.', memory: 'An ephemeral moment evaporates quickly.' },
    { id: 'lucid', word: 'lucid', definition: 'clear and easy to understand', example: 'Her lucid explanation made the theorem accessible.', synonyms: ['clear', 'coherent'], antonyms: ['confusing', 'obscure'], roots: 'luc = light', trap: 'Lucid is clarity, not enthusiasm.', memory: 'Light makes an idea easy to see.' },
    { id: 'mitigate', word: 'mitigate', definition: 'lessen', example: 'Mangroves can mitigate storm damage.', synonyms: ['reduce', 'ease'], antonyms: ['worsen', 'intensify'], roots: 'mitis = mild', trap: 'It usually does not mean prevent entirely.', memory: 'Mitigate makes something milder.' },
    { id: 'novel', word: 'novel', definition: 'new and original', example: 'The team proposed a novel cooling method.', synonyms: ['innovative', 'fresh'], antonyms: ['familiar', 'conventional'], roots: 'nov = new', trap: 'On the SAT, novel often means new, not a book.', memory: 'Novel has the same root as novelty.' },
    { id: 'pragmatic', word: 'pragmatic', definition: 'practical', example: 'The mayor took a pragmatic approach to traffic.', synonyms: ['realistic', 'workable'], antonyms: ['idealistic', 'impractical'], roots: 'pragma = deed/action', trap: 'Not pessimistic.', memory: 'Pragmatic plans can actually be done.' },
    { id: 'scrutinize', word: 'scrutinize', definition: 'examine closely', example: 'Auditors scrutinize every transaction.', synonyms: ['inspect', 'analyze'], antonyms: ['glance', 'ignore'], roots: 'scrutari = search', trap: 'It is not just criticize.', memory: 'Scrutiny means close inspection.' },
    { id: 'tenacious', word: 'tenacious', definition: 'persistent', example: 'The tenacious climbers returned after three failed attempts.', synonyms: ['determined', 'stubborn'], antonyms: ['yielding', 'weak'], roots: 'tenere = hold', trap: 'Not necessarily aggressive.', memory: 'Tenacious people hold on.' },
    { id: 'undermine', word: 'undermine', definition: 'weaken', example: 'Leaks began to undermine trust.', synonyms: ['erode', 'damage'], antonyms: ['support', 'strengthen'], roots: 'mine under = weaken from below', trap: 'Not merely expose.', memory: 'To undermine is to weaken the foundation.' },
    { id: 'corroborate', word: 'corroborate', definition: 'confirm with evidence', example: 'Two witnesses corroborated the account.', synonyms: ['confirm', 'support'], antonyms: ['contradict', 'refute'], roots: 'corroborare = strengthen', trap: 'Not record or question.', memory: 'Corroborating evidence strengthens a claim.' }
  ];

  function id(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  function todayKey(date = new Date()) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function dateKeyAfter(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return todayKey(date);
  }

  function blankState() {
    return {
      version: STORAGE_VERSION,
      attemptDetails: [],
      mistakes: [],
      savedQuestions: {},
      collections: [],
      studyPreferences: null,
      studyPlan: [],
      vocabulary: {},
      rushSessions: [],
      diagnosticReports: [],
      scorePredictions: [],
      recommendations: [],
      tutorConversations: {},
      questionReports: [],
      generatedQuestions: []
    };
  }

  function normalize(data) {
    data.learning = { ...blankState(), ...(data.learning || {}) };
    data.learning.version = STORAGE_VERSION;
    data.learning.attemptDetails = Array.isArray(data.learning.attemptDetails) ? data.learning.attemptDetails : [];
    data.learning.mistakes = Array.isArray(data.learning.mistakes) ? data.learning.mistakes : [];
    data.learning.savedQuestions = data.learning.savedQuestions || {};
    data.learning.collections = Array.isArray(data.learning.collections) ? data.learning.collections : [];
    data.learning.studyPlan = Array.isArray(data.learning.studyPlan) ? data.learning.studyPlan : [];
    data.learning.vocabulary = data.learning.vocabulary || {};
    data.learning.rushSessions = Array.isArray(data.learning.rushSessions) ? data.learning.rushSessions : [];
    data.learning.diagnosticReports = Array.isArray(data.learning.diagnosticReports) ? data.learning.diagnosticReports : [];
    data.learning.scorePredictions = Array.isArray(data.learning.scorePredictions) ? data.learning.scorePredictions : [];
    data.learning.recommendations = Array.isArray(data.learning.recommendations) ? data.learning.recommendations : [];
    data.learning.generatedQuestions = Array.isArray(data.learning.generatedQuestions) ? data.learning.generatedQuestions : [];
    for (const word of VOCAB) {
      if (!data.learning.vocabulary[word.id]) {
        data.learning.vocabulary[word.id] = { status: 'new', due: todayKey(), reviews: 0, correct: 0, lastReviewed: null };
      }
    }
    return data;
  }

  function metaFor(skillId) {
    return SKILL_META[skillId] || {
      subject: 'Reading and Writing',
      section: 'rw',
      domain: 'Mixed Practice',
      skillName: skillId || 'Mixed Skill',
      questionType: 'Multiple Choice',
      estimatedSeconds: 70
    };
  }

  function enrichQuestion(question) {
    const meta = metaFor(question.skill);
    const answerIndex = Number.isInteger(question.answer) ? question.answer : letters.indexOf(question.correctAnswer);
    return {
      ...question,
      prompt: question.prompt || question.text || '',
      passage: question.passage || '',
      subject: question.subject || meta.subject,
      section: question.section || meta.section,
      domain: question.domain || meta.domain,
      skillName: question.skillName || meta.skillName,
      questionType: question.questionType || meta.questionType,
      estimatedSeconds: question.estimatedSeconds || meta.estimatedSeconds,
      sourceType: question.sourceType || 'peakpoint-original',
      sourceLabel: question.sourceLabel || 'PeakPoint SAT-style practice',
      contentStatus: question.contentStatus || 'approved',
      answer: answerIndex,
      correctAnswer: letters[answerIndex] || question.correctAnswer || ''
    };
  }

  function accuracy(items) {
    if (!items.length) return null;
    return Math.round((items.filter((item) => item.correct).length / items.length) * 100);
  }

  function groupAccuracy(attempts, key) {
    const groups = {};
    for (const attempt of attempts) {
      const label = attempt[key] || 'Mixed';
      groups[label] = groups[label] || { total: 0, correct: 0, accuracy: 0 };
      groups[label].total += 1;
      if (attempt.correct) groups[label].correct += 1;
    }
    for (const value of Object.values(groups)) {
      value.accuracy = Math.round((value.correct / value.total) * 100);
    }
    return groups;
  }

  function avg(items, key) {
    const nums = items.map((item) => Number(item[key])).filter((n) => Number.isFinite(n));
    return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
  }

  function recordAttemptDetail(data, question, options = {}) {
    normalize(data);
    const q = enrichQuestion(question);
    const selectedIndex = Number.isInteger(options.selectedIndex) ? options.selectedIndex : null;
    const correct = !!options.correct;
    const detail = {
      id: id('attempt'),
      qid: q.id,
      skill: q.skill,
      skillName: q.skillName,
      section: q.section,
      subject: q.subject,
      domain: q.domain,
      questionType: q.questionType,
      difficulty: q.difficulty,
      selectedIndex,
      selectedAnswer: selectedIndex == null ? null : letters[selectedIndex],
      selectedText: selectedIndex == null ? null : q.choices[selectedIndex],
      correctAnswer: q.correctAnswer,
      correctText: q.choices[q.answer],
      correct,
      elapsedSeconds: Math.max(0, Math.round(options.elapsedSeconds || 0)),
      hintCount: Math.max(0, Math.round(options.hintCount || 0)),
      completionStatus: options.completionStatus || (selectedIndex == null ? 'skipped' : 'answered'),
      sourceType: q.sourceType,
      question: snapshotQuestion(q),
      createdAt: new Date().toISOString()
    };
    data.learning.attemptDetails.push(detail);
    updateMistakes(data, detail);
    refreshRecommendations(data);
    return detail;
  }

  function snapshotQuestion(q) {
    return {
      id: q.id,
      prompt: q.prompt,
      passage: q.passage || '',
      choices: q.choices,
      answer: q.answer,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      skill: q.skill,
      skillName: q.skillName,
      section: q.section,
      subject: q.subject,
      domain: q.domain,
      difficulty: q.difficulty,
      questionType: q.questionType,
      estimatedSeconds: q.estimatedSeconds,
      sourceType: q.sourceType,
      sourceLabel: q.sourceLabel
    };
  }

  function updateMistakes(data, detail) {
    const existing = data.learning.mistakes.find((m) => m.qid === detail.qid);
    if (!detail.correct || detail.completionStatus === 'skipped') {
      if (existing) {
        existing.attemptIds.push(detail.id);
        existing.repeatedCount += 1;
        existing.status = 'needs_review';
        existing.lastMissedAt = detail.createdAt;
      } else {
        data.learning.mistakes.unshift({
          id: id('mistake'),
          qid: detail.qid,
          question: detail.question,
          subject: detail.subject,
          domain: detail.domain,
          skill: detail.skill,
          skillName: detail.skillName,
          difficulty: detail.difficulty,
          questionType: detail.questionType,
          attemptIds: [detail.id],
          repeatedCount: 1,
          notes: '',
          status: 'needs_review',
          understood: false,
          mastered: false,
          lastMissedAt: detail.createdAt,
          masteredAt: null
        });
      }
      return;
    }
    if (existing && existing.status !== 'mastered') {
      existing.retrySuccesses = (existing.retrySuccesses || 0) + 1;
      existing.status = existing.understood || existing.retrySuccesses >= 2 ? 'mastered' : 'reviewing';
      if (existing.status === 'mastered') {
        existing.mastered = true;
        existing.masteredAt = detail.createdAt;
      }
    }
  }

  function setMistakeStatus(data, mistakeId, status, notes) {
    normalize(data);
    const mistake = data.learning.mistakes.find((item) => item.id === mistakeId);
    if (!mistake) return null;
    if (notes != null) mistake.notes = String(notes).slice(0, 1200);
    if (status === 'understood') {
      mistake.understood = true;
      mistake.status = 'reviewing';
    }
    if (status === 'mastered') {
      mistake.mastered = true;
      mistake.status = 'mastered';
      mistake.masteredAt = new Date().toISOString();
    }
    refreshRecommendations(data);
    return mistake;
  }

  function saveQuestion(data, question, saved = true) {
    normalize(data);
    const q = enrichQuestion(question);
    if (saved) data.learning.savedQuestions[q.id] = snapshotQuestion(q);
    else delete data.learning.savedQuestions[q.id];
    return data.learning.savedQuestions;
  }

  function createCollection(data, name) {
    normalize(data);
    const trimmed = String(name || '').trim().slice(0, 80);
    if (!trimmed) return null;
    const collection = { id: id('collection'), name: trimmed, qids: [], createdAt: new Date().toISOString() };
    data.learning.collections.push(collection);
    return collection;
  }

  function addToCollection(data, collectionId, question) {
    normalize(data);
    const q = enrichQuestion(question);
    const collection = data.learning.collections.find((item) => item.id === collectionId);
    if (!collection) return null;
    if (!collection.qids.includes(q.id)) collection.qids.push(q.id);
    saveQuestion(data, q, true);
    return collection;
  }

  function reportQuestion(data, question, issue, details) {
    normalize(data);
    const q = enrichQuestion(question);
    const report = {
      id: id('report'),
      qid: q.id,
      issue: String(issue || 'Problem report').slice(0, 120),
      details: String(details || '').slice(0, 1000),
      status: 'open',
      createdAt: new Date().toISOString()
    };
    data.learning.questionReports.push(report);
    return report;
  }

  function latestAttempts(data, count = 80) {
    normalize(data);
    return data.learning.attemptDetails.slice(-count);
  }

  function skillProfile(data) {
    const profile = {};
    for (const skill of PP.questions.SKILLS) {
      const meta = metaFor(skill.id);
      const attempts = latestAttempts(data, 500).filter((a) => a.skill === skill.id);
      profile[skill.id] = {
        id: skill.id,
        name: meta.skillName,
        subject: meta.subject,
        section: meta.section,
        domain: meta.domain,
        mastery: data.mastery[skill.id] ?? 30,
        attempts: attempts.length,
        correct: attempts.filter((a) => a.correct).length,
        accuracy: accuracy(attempts),
        avgSeconds: avg(attempts, 'elapsedSeconds'),
        repeatedMistakes: data.learning.mistakes.filter((m) => m.skill === skill.id && m.status !== 'mastered').length,
        lastPracticed: attempts.length ? attempts[attempts.length - 1].createdAt : null
      };
    }
    return profile;
  }

  function weakestSkills(data, limit = 5) {
    return Object.values(skillProfile(data))
      .sort((a, b) => {
        const scoreA = (a.mastery || 0) - a.repeatedMistakes * 8 + (a.accuracy == null ? -8 : 0);
        const scoreB = (b.mastery || 0) - b.repeatedMistakes * 8 + (b.accuracy == null ? -8 : 0);
        return scoreA - scoreB;
      })
      .slice(0, limit);
  }

  function strongestSkills(data, limit = 5) {
    return Object.values(skillProfile(data))
      .filter((s) => s.attempts > 0)
      .sort((a, b) => (b.mastery || 0) - (a.mastery || 0))
      .slice(0, limit);
  }

  function prediction(data) {
    normalize(data);
    const scores = PP.game.estimatedScores(data);
    const attempts = latestAttempts(data, 180);
    const recent = attempts.slice(-30);
    const consistency = recent.length < 5 ? 0.35 : Math.max(0.35, 1 - standardDeviation(recent.map((a) => a.correct ? 1 : 0)));
    const avgPace = avg(recent, 'elapsedSeconds') || 80;
    const pacePenalty = avgPace > 95 ? 20 : avgPace > 80 ? 10 : 0;
    const practiceBonus = Math.min(40, Math.floor((data.attempts || []).length / 15) * 5);
    const math = scores.math == null ? null : clampScore(scores.math + practiceBonus - pacePenalty);
    const rw = scores.rw == null ? null : clampScore(scores.rw + practiceBonus - Math.floor(pacePenalty / 2));
    const total = math != null && rw != null ? math + rw : null;
    const confidenceScore = Math.min(95, Math.round(35 + attempts.length * 1.4 + consistency * 20));
    const confidence = attempts.length < 15 ? 'Low' : confidenceScore < 70 ? 'Medium' : 'High';
    const range = total == null ? null : confidence === 'High' ? 40 : confidence === 'Medium' ? 70 : 110;
    return {
      total,
      math,
      rw,
      confidence,
      confidenceScore,
      rangeLow: total == null ? null : Math.max(400, total - range),
      rangeHigh: total == null ? null : Math.min(1600, total + range),
      trend: scoreTrend(data),
      lastUpdated: new Date().toISOString(),
      nextBandSkills: weakestSkills(data, 4).map((s) => s.name)
    };
  }

  function clampScore(score) {
    return Math.max(200, Math.min(800, Math.round(score / 10) * 10));
  }

  function standardDeviation(values) {
    if (!values.length) return 1;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  function scoreTrend(data) {
    const snaps = data.learning.scorePredictions.length ? data.learning.scorePredictions : (data.snapshots || []);
    if (snaps.length < 2) return 'Not enough data yet';
    const first = snaps[Math.max(0, snaps.length - 5)];
    const last = snaps[snaps.length - 1];
    const firstTotal = first.total || (first.math + first.rw);
    const lastTotal = last.total || (last.math + last.rw);
    const delta = lastTotal - firstTotal;
    if (delta > 20) return `Up ${delta} points recently`;
    if (delta < -20) return `Down ${Math.abs(delta)} points recently`;
    return 'Stable recently';
  }

  function savePrediction(data) {
    normalize(data);
    const p = prediction(data);
    if (p.total != null) {
      data.learning.scorePredictions.push(p);
      data.learning.scorePredictions = data.learning.scorePredictions.slice(-60);
    }
    return p;
  }

  function diagnosticReport(data, attempts) {
    normalize(data);
    const details = attempts && attempts.length ? attempts : latestAttempts(data, 15);
    const p = savePrediction(data);
    const report = {
      id: id('diagnostic'),
      createdAt: new Date().toISOString(),
      predictedTotal: p.total,
      predictedMath: p.math,
      predictedRw: p.rw,
      confidence: p.confidence,
      accuracyByDomain: groupAccuracy(details, 'domain'),
      accuracyBySkill: groupAccuracy(details, 'skillName'),
      averagePacing: avg(details, 'elapsedSeconds'),
      strongestAreas: strongestSkills(data, 4).map((s) => s.name),
      weakestAreas: weakestSkills(data, 5).map((s) => s.name),
      recommendedNextSteps: refreshRecommendations(data).slice(0, 4).map((r) => r.title),
      attempts: details.map((a) => a.id)
    };
    data.learning.diagnosticReports.push(report);
    return report;
  }

  function generateStudyPlan(data, preferences = {}) {
    normalize(data);
    const prefs = {
      targetScore: Number(preferences.targetScore || data.profile?.targetScore || 1400),
      testDate: preferences.testDate || data.profile?.testDate || dateKeyAfter(60),
      preferredDays: Array.isArray(preferences.preferredDays) && preferences.preferredDays.length ? preferences.preferredDays : ['Mon', 'Wed', 'Fri', 'Sat'],
      minutesPerDay: Math.max(15, Number(preferences.minutesPerDay || 45)),
      subjectPreference: preferences.subjectPreference || 'Mixed'
    };
    const weak = weakestSkills(data, 8);
    const dueVocab = dueVocabulary(data).slice(0, 6);
    const plan = [];
    const days = daysUntil(prefs.testDate);
    const horizon = Math.min(Math.max(days, 14), 35);
    let weakIndex = 0;
    for (let offset = 0; offset < horizon; offset++) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (!prefs.preferredDays.includes(label) && offset !== 0) continue;
      const urgency = days - offset < 21 ? 'high' : days - offset < 45 ? 'medium' : 'steady';
      const weakSkill = weak[weakIndex % Math.max(1, weak.length)] || Object.values(skillProfile(data))[0];
      weakIndex++;
      const baseDuration = Math.min(prefs.minutesPerDay, urgency === 'high' ? prefs.minutesPerDay : Math.max(20, prefs.minutesPerDay - 10));
      plan.push(activity(date, 'skill-practice', `Practice ${weakSkill.name}`, weakSkill, baseDuration, `This is one of your lowest mastery areas and has the best score upside right now.`));
      if (plan.length % 3 === 0) {
        plan.push(activity(date, 'mistake-review', 'Review recent mistakes', weakSkill, Math.min(20, prefs.minutesPerDay), 'Mistake review prevents repeated misses from turning into habits.'));
      }
      if (dueVocab.length && plan.length % 4 === 0) {
        plan.push(activity(date, 'vocabulary-review', 'Review shaky vocabulary', { name: 'Words in Context', subject: 'Reading and Writing', section: 'rw' }, 15, 'Vocabulary spacing is due today, so this keeps words from fading.'));
      }
      if (plan.length % 6 === 0) {
        plan.push(activity(date, 'timed-practice', urgency === 'high' ? 'Timed mixed practice' : 'Question Rush pacing check', weakSkill, Math.min(20, prefs.minutesPerDay), 'Timed work checks whether accuracy is holding under test-day pacing.'));
      }
    }
    if (!data.diagnosticDone) {
      plan.unshift({
        id: id('activity'),
        date: todayKey(),
        type: 'diagnostic',
        title: 'Take the diagnostic',
        subject: 'Mixed',
        skill: null,
        duration: 20,
        status: 'ready',
        reason: 'Your plan gets much sharper after PeakPoint measures your starting point.'
      });
    }
    data.learning.studyPreferences = prefs;
    data.learning.studyPlan = plan.slice(0, 42);
    refreshRecommendations(data);
    return data.learning.studyPlan;
  }

  function activity(date, type, title, skill, duration, reason) {
    return {
      id: id('activity'),
      date: todayKey(date),
      type,
      title,
      subject: skill.subject || (skill.section === 'math' ? 'Math' : 'Reading and Writing'),
      skill: skill.id || skill.name,
      skillName: skill.name || skill.skillName,
      duration,
      status: 'ready',
      reason
    };
  }

  function daysUntil(dateStr) {
    if (!dateStr) return 60;
    const end = new Date(dateStr + 'T00:00:00');
    return Math.max(1, Math.ceil((end - new Date()) / 86400000));
  }

  function updateActivity(data, activityId, action, newDate) {
    normalize(data);
    const item = data.learning.studyPlan.find((activityItem) => activityItem.id === activityId);
    if (!item) return null;
    if (action === 'start') item.status = 'in_progress';
    if (action === 'complete') item.status = 'complete';
    if (action === 'skip') item.status = 'skipped';
    if (action === 'replace') {
      const weak = weakestSkills(data, 1)[0];
      item.title = `Practice ${weak.name}`;
      item.skill = weak.id;
      item.skillName = weak.name;
      item.subject = weak.subject;
      item.reason = 'Replaced with the current highest-impact weak skill.';
      item.status = 'ready';
    }
    if (action === 'reschedule') {
      item.date = newDate || dateKeyAfter(1);
      item.status = 'ready';
    }
    refreshRecommendations(data);
    return item;
  }

  function refreshRecommendations(data) {
    normalize(data);
    const recs = [];
    const weak = weakestSkills(data, 4);
    const mistakes = data.learning.mistakes.filter((m) => m.status !== 'mastered');
    if (!data.diagnosticDone) recs.push(rec('diagnostic', 'Take Diagnostic', 'Set your baseline and unlock a sharper plan.', 'practice.html?mode=diagnostic'));
    const nextPlan = data.learning.studyPlan.find((item) => item.status === 'ready' || item.status === 'in_progress');
    if (nextPlan) recs.push(rec('study-plan', 'Continue Study Plan', nextPlan.title, 'study-plan.html'));
    if (mistakes.length) recs.push(rec('mistakes', `Fix ${mistakes[0].skillName} Mistakes`, 'Review missed questions while they are still fresh.', 'mistakes.html'));
    if (weak[0]) recs.push(rec('skill', `Practice ${weak[0].name}`, 'This is your highest-impact skill right now.', `practice.html?mode=skill&skill=${weak[0].id}`));
    if (dueVocabulary(data).length) recs.push(rec('vocab', 'Review Shaky Vocabulary', 'Spaced repetition is due today.', 'vocab.html'));
    recs.push(rec('rush', 'Start Question Rush', 'Build speed without letting accuracy drift.', 'rush.html'));
    data.learning.recommendations = dedupeBy(recs, 'id').slice(0, 6);
    return data.learning.recommendations;
  }

  function rec(idValue, title, detail, href) {
    return { id: idValue, title, detail, href, createdAt: new Date().toISOString() };
  }

  function dedupeBy(items, key) {
    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item[key])) return false;
      seen.add(item[key]);
      return true;
    });
  }

  function dueVocabulary(data) {
    normalize(data);
    const today = todayKey();
    return VOCAB
      .filter((word) => (data.learning.vocabulary[word.id]?.due || today) <= today)
      .map((word) => ({ ...word, progress: data.learning.vocabulary[word.id] }));
  }

  function recordVocabularyReview(data, wordId, correct) {
    normalize(data);
    const progress = data.learning.vocabulary[wordId] || { status: 'new', reviews: 0, correct: 0 };
    progress.reviews += 1;
    if (correct) progress.correct += 1;
    progress.lastReviewed = new Date().toISOString();
    const rate = progress.correct / progress.reviews;
    if (!correct) progress.status = 'missed';
    else if (progress.reviews >= 4 && rate >= 0.85) progress.status = 'mastered';
    else if (rate >= 0.7) progress.status = 'known';
    else progress.status = 'shaky';
    const interval = progress.status === 'mastered' ? 14 : progress.status === 'known' ? 5 : progress.status === 'shaky' ? 2 : 1;
    progress.due = dateKeyAfter(interval);
    data.learning.vocabulary[wordId] = progress;
    refreshRecommendations(data);
    return progress;
  }

  function vocabularyStats(data) {
    normalize(data);
    const counts = { new: 0, known: 0, missed: 0, shaky: 0, mastered: 0 };
    for (const value of Object.values(data.learning.vocabulary)) counts[value.status || 'new'] += 1;
    return counts;
  }

  function recordRushSession(data, session) {
    normalize(data);
    const saved = {
      id: id('rush'),
      mode: session.mode || 'mixed',
      seconds: session.seconds || 180,
      total: session.total || 0,
      correct: session.correct || 0,
      bestStreak: session.bestStreak || 0,
      avgSeconds: session.avgSeconds || null,
      skillPerformance: session.skillPerformance || {},
      mistakes: session.mistakes || [],
      createdAt: new Date().toISOString()
    };
    data.learning.rushSessions.push(saved);
    data.learning.rushSessions = data.learning.rushSessions.slice(-50);
    refreshRecommendations(data);
    return saved;
  }

  function analytics(data) {
    normalize(data);
    const attempts = latestAttempts(data, 500);
    const p = prediction(data);
    const mistakeTotal = data.learning.mistakes.length;
    const masteredMistakes = data.learning.mistakes.filter((m) => m.status === 'mastered').length;
    const vocab = vocabularyStats(data);
    return {
      overallAccuracy: accuracy(attempts),
      predicted: p,
      domainAccuracy: groupAccuracy(attempts, 'domain'),
      skillProfile: skillProfile(data),
      timeSpentMinutes: Math.round(attempts.reduce((sum, a) => sum + (a.elapsedSeconds || 0), 0) / 60),
      questionsCompleted: attempts.filter((a) => a.completionStatus === 'answered').length,
      averagePacing: avg(attempts, 'elapsedSeconds'),
      weakAreas: weakestSkills(data, 5),
      strongAreas: strongestSkills(data, 5),
      readinessLevel: readinessLevel(p, data),
      studyPlanCompletion: planCompletion(data),
      mistakeResolutionRate: mistakeTotal ? Math.round((masteredMistakes / mistakeTotal) * 100) : 0,
      vocabularyMastery: vocab,
      rushPerformance: data.learning.rushSessions.slice(-8)
    };
  }

  function readinessLevel(p, data) {
    if (!data.diagnosticDone) return 'Needs diagnostic';
    if (p.confidence === 'High' && p.total >= (data.profile?.targetScore || 1400)) return 'On track';
    if (p.confidence === 'Low') return 'Needs more data';
    return 'Building';
  }

  function planCompletion(data) {
    const plan = data.learning.studyPlan || [];
    if (!plan.length) return 0;
    return Math.round((plan.filter((item) => item.status === 'complete').length / plan.length) * 100);
  }

  function filterQuestions(questions, filters, data) {
    normalize(data);
    return questions.filter((question) => {
      const q = enrichQuestion(question);
      const details = data.learning.attemptDetails.filter((a) => a.qid === q.id);
      const missed = data.learning.mistakes.some((m) => m.qid === q.id && m.status !== 'mastered');
      const saved = !!data.learning.savedQuestions[q.id];
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.domain && q.domain !== filters.domain) return false;
      if (filters.skill && q.skill !== filters.skill) return false;
      if (filters.difficulty && String(q.difficulty) !== String(filters.difficulty)) return false;
      if (filters.questionType && q.questionType !== filters.questionType) return false;
      if (filters.status === 'completed' && !details.length) return false;
      if (filters.status === 'uncompleted' && details.length) return false;
      if (filters.accuracy === 'missed' && !missed) return false;
      if (filters.accuracy === 'saved' && !saved) return false;
      if (filters.sourceType && q.sourceType !== filters.sourceType) return false;
      return true;
    });
  }

  function generatedQuality(question, existing = []) {
    const notes = [];
    const prompt = String(question.prompt || question.text || '').trim();
    const choices = question.choices || [];
    if (prompt.length < 20) notes.push('Prompt may be too short.');
    if (!Array.isArray(choices) || choices.length !== 4) notes.push('Question must have exactly four choices.');
    if (new Set(choices.map((c) => String(c).trim().toLowerCase())).size !== choices.length) notes.push('Duplicate answer choices detected.');
    if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) notes.push('Correct answer must be A, B, C, or D.');
    if (!question.explanation || question.explanation.length < 50) notes.push('Explanation should be more detailed.');
    if (/college board|official sat|bluebook/i.test(`${prompt} ${question.explanation || ''}`)) notes.push('Remove official-source wording.');
    const duplicate = existing.some((item) => String(item.prompt || item.text || '').trim().toLowerCase() === prompt.toLowerCase());
    if (duplicate) notes.push('Possible duplicate prompt.');
    return { ok: notes.length === 0, notes };
  }

  function structuredExplanation(question, selectedIndex = null) {
    const q = enrichQuestion(question);
    const correctLetter = q.correctAnswer || letters[q.answer];
    const selectedLetter = selectedIndex == null ? null : letters[selectedIndex];
    const incorrect = q.choices
      .map((choice, index) => ({ choice, letter: letters[index], index }))
      .filter((choice) => choice.index !== q.answer)
      .map((choice) => `${choice.letter}: This is not the best answer; it reflects a common trap or incomplete step for ${q.skillName}.`)
      .join('\n');
    const desmos = q.section === 'math'
      ? 'When useful, use Desmos to graph equations, check intersections, evaluate expressions, or verify numerical answers after solving.'
      : 'Desmos is usually not needed for this Reading and Writing question.';
    return [
      selectedLetter ? `Your answer: ${selectedLetter}. Correct answer: ${correctLetter}.` : `Correct answer: ${correctLetter}.`,
      `Why the correct answer is correct: ${q.explanation}`,
      `Why the other choices are incorrect:\n${incorrect}`,
      `Concept tested: ${q.skillName} in ${q.domain}.`,
      `Fastest method: identify the tested skill first, solve or eliminate using that rule, then check only the answer choice you selected.`,
      `Common trap: rushing into answer choices before naming the rule or relationship being tested.`,
      `Takeaway rule: for ${q.skillName}, write down the core relationship before doing any answer-choice elimination.`,
      `Desmos guidance: ${desmos}`
    ].join('\n\n');
  }

  function addGeneratedQuestions(data, questions) {
    normalize(data);
    const existing = data.learning.generatedQuestions;
    const added = (questions || []).map((question) => {
      const quality = generatedQuality(question, existing);
      return {
        id: id('generated'),
        ...question,
        sourceType: 'ai-generated',
        contentStatus: 'draft',
        status: 'draft',
        quality,
        reviewNotes: '',
        createdAt: new Date().toISOString()
      };
    });
    data.learning.generatedQuestions.unshift(...added);
    return added;
  }

  function reviewGeneratedQuestion(data, questionId, action, edits = {}) {
    normalize(data);
    const item = data.learning.generatedQuestions.find((q) => q.id === questionId);
    if (!item) return null;
    Object.assign(item, edits);
    if (action === 'approve') {
      item.status = 'approved';
      item.contentStatus = 'approved';
      item.reviewedAt = new Date().toISOString();
    }
    if (action === 'reject') {
      item.status = 'rejected';
      item.contentStatus = 'rejected';
      item.reviewedAt = new Date().toISOString();
    }
    if (action === 'draft') {
      item.status = 'draft';
      item.contentStatus = 'draft';
    }
    item.quality = generatedQuality(item, data.learning.generatedQuestions.filter((q) => q.id !== questionId));
    return item;
  }

  function approvedGeneratedQuestions(data) {
    normalize(data);
    return data.learning.generatedQuestions.filter((q) => q.status === 'approved').map((q) => enrichQuestion({
      ...q,
      id: q.id,
      text: q.prompt,
      answer: letters.indexOf(q.correctAnswer)
    }));
  }

  return {
    SKILL_META,
    VOCAB,
    addGeneratedQuestions,
    addToCollection,
    analytics,
    approvedGeneratedQuestions,
    blankState,
    createCollection,
    diagnosticReport,
    dueVocabulary,
    enrichQuestion,
    filterQuestions,
    generatedQuality,
    generateStudyPlan,
    latestAttempts,
    normalize,
    prediction,
    recordAttemptDetail,
    recordRushSession,
    recordVocabularyReview,
    refreshRecommendations,
    reportQuestion,
    reviewGeneratedQuestion,
    savePrediction,
    saveQuestion,
    setMistakeStatus,
    skillProfile,
    strongestSkills,
    structuredExplanation,
    updateActivity,
    vocabularyStats,
    weakestSkills
  };
})();
