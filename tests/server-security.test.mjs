import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.GEMINI_API_KEY = '';
process.env.ALLOW_DEMO_AUTH = 'true';

const serverModule = await import('../server.js');

test('pre-submit tutor payload strips answer fields and forbids revealing answers', () => {
  const payload = serverModule.buildTutorPayload({
    message: 'What is the answer?',
    context: {
      submitted: false,
      question: {
        id: 'q1',
        text: 'If 2x = 8, what is x?',
        choices: ['2', '4', '6', '8'],
        answer: 1,
        correctAnswer: 'B',
        explanation: 'x = 4'
      }
    }
  });

  assert.match(payload.system_instruction, /Do not reveal the correct answer/i);
  assert.doesNotMatch(payload.input, /correctAnswer/);
  assert.doesNotMatch(payload.input, /"answer"\s*:/);
});

test('post-submit tutor payload may include correct answer context', () => {
  const payload = serverModule.buildTutorPayload({
    message: 'Explain my mistake',
    context: {
      submitted: true,
      selectedAnswer: 'A',
      question: {
        id: 'q1',
        text: 'If 2x = 8, what is x?',
        choices: ['2', '4', '6', '8'],
        answerLabel: 'B',
        explanation: 'x = 4'
      }
    }
  });

  assert.match(payload.system_instruction, /may fully explain/i);
  assert.match(payload.input, /correctAnswer/);
});

test('Gemini calls degrade safely when the key is missing', async () => {
  const payload = await serverModule.callGemini({ system_instruction: 'test', input: 'hello' });
  assert.equal(payload.unavailable, true);
  assert.doesNotMatch(JSON.stringify(payload), /AIza[0-9A-Za-z_-]{20,}/i);
});

test('Gemini JSON parser accepts fenced JSON', () => {
  const parsed = serverModule.parseGeminiJson('```json\n{"questions":[{"prompt":"Original prompt"}]}\n```');
  assert.equal(parsed.questions[0].prompt, 'Original prompt');
});
