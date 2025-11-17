import test from 'node:test';
import assert from 'node:assert/strict';
import { DebateController } from '../src/controller/debateController.js';

test('DebateController completes structured phases with mock agents', async () => {
  process.env.MOCK_AGENT_RESPONSES = 'true';
  const controller = new DebateController('debate-test', 'Structured debate test', {
    maxRounds: 2,
    minRounds: 1,
  });

  const result = await controller.start();

  assert.ok(result.history.length > 0, 'history should accumulate messages');
  assert.ok(result.state.evaluator, 'evaluator state should be present');
  assert.equal(
    result.state.phase,
    'synthesize',
    'final phase should be synthesize after controller completion',
  );
  assert.ok(
    result.state.evaluator.scorecard?.novelty >= 0,
    'novelty score should be available and non-negative',
  );
});


