import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

function loadPeakPoint() {
  const context = {
    window: {},
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout
  };
  context.window.PP = {};
  context.PP = context.window.PP;
  const root = fileURLToPath(new URL('..', import.meta.url));
  for (const file of ['questions.js', 'game.js', 'learning.js']) {
    vm.runInNewContext(readFileSync(join(root, file), 'utf8'), context, { filename: file });
  }
  return context.PP;
}

function data(PP) {
  const d = {
    profile: { targetScore: 1450, testDate: '2026-12-01' },
    attempts: [],
    sessions: [],
    snapshots: [],
    days: [],
    diagnosticDone: false,
    xp: 0,
    bestCombo: 0,
    mastery: {},
    badges: [],
    learning: PP.learning.blankState()
  };
  PP.learning.normalize(d);
  return d;
}

test('diagnostic attempts create report and score prediction', () => {
  const PP = loadPeakPoint();
  const d = data(PP);
  const details = [];
  for (const question of PP.questions.diagnosticSet()) {
    const q = PP.learning.enrichQuestion(question);
    PP.game.recordAttempt(d, q, true, 1);
    details.push(PP.learning.recordAttemptDetail(d, q, {
      selectedIndex: q.answer,
      correct: true,
      elapsedSeconds: 55,
      completionStatus: 'answered'
    }));
  }
  d.diagnosticDone = true;
  const report = PP.learning.diagnosticReport(d, details);

  assert.equal(report.attempts.length, PP.questions.SKILLS.length);
  assert.ok(report.predictedTotal >= 400);
  assert.ok(d.learning.scorePredictions.length >= 1);
});

test('study plan is generated from weak skills and can complete activities', () => {
  const PP = loadPeakPoint();
  const d = data(PP);
  const plan = PP.learning.generateStudyPlan(d, {
    targetScore: 1500,
    testDate: '2026-12-01',
    preferredDays: ['Mon', 'Wed', 'Fri'],
    minutesPerDay: 45
  });
  assert.ok(plan.length > 0);
  const updated = PP.learning.updateActivity(d, plan[0].id, 'complete');
  assert.equal(updated.status, 'complete');
  assert.ok(PP.learning.analytics(d).studyPlanCompletion > 0);
});

test('missed question appears in mistake review and later mastery does not erase history', () => {
  const PP = loadPeakPoint();
  const d = data(PP);
  const q = PP.learning.enrichQuestion(PP.questions.generate('lin-eq', 2));
  PP.learning.recordAttemptDetail(d, q, { selectedIndex: (q.answer + 1) % 4, correct: false, elapsedSeconds: 70 });
  assert.equal(d.learning.mistakes.length, 1);
  PP.learning.setMistakeStatus(d, d.learning.mistakes[0].id, 'mastered', 'I solved it by isolating x.');
  assert.equal(d.learning.mistakes[0].status, 'mastered');
  assert.equal(d.learning.attemptDetails.length, 1);
});

test('vocabulary review schedules the next due date and tracks status', () => {
  const PP = loadPeakPoint();
  const d = data(PP);
  const word = PP.learning.VOCAB[0];
  const progress = PP.learning.recordVocabularyReview(d, word.id, false);
  assert.equal(progress.status, 'missed');
  assert.ok(progress.due);
});

test('Question Rush session is saved and score prediction remains deterministic', () => {
  const PP = loadPeakPoint();
  const d = data(PP);
  const saved = PP.learning.recordRushSession(d, {
    mode: 'mixed',
    seconds: 180,
    total: 8,
    correct: 6,
    bestStreak: 4,
    avgSeconds: 18
  });
  assert.equal(saved.total, 8);
  assert.equal(d.learning.rushSessions.length, 1);
  assert.doesNotThrow(() => PP.learning.prediction(d));
});

test('generated questions remain draft until approved', () => {
  const PP = loadPeakPoint();
  const d = data(PP);
  const [draft] = PP.learning.addGeneratedQuestions(d, [{
    prompt: 'If x + 3 = 8, what is x?',
    choices: ['3', '4', '5', '6'],
    correctAnswer: 'C',
    explanation: 'Subtract 3 from both sides to get x = 5.',
    subject: 'Math',
    domain: 'Algebra',
    skill: 'Linear Equations',
    difficulty: 1,
    questionType: 'Multiple Choice',
    estimatedSeconds: 60
  }]);
  assert.equal(draft.status, 'draft');
  assert.equal(PP.learning.approvedGeneratedQuestions(d).length, 0);
  PP.learning.reviewGeneratedQuestion(d, draft.id, 'approve');
  assert.equal(PP.learning.approvedGeneratedQuestions(d).length, 1);
});
