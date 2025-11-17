const round = (value) => Math.round(value * 100) / 100;

export function evaluateDebate(history = [], state = {}, options = {}) {
  const theoristTurns = history.filter((msg) => msg.agent === 'A').length;
  const criticTurns = history.filter((msg) => msg.agent === 'B').length;
  const researcherTurns = history.filter((msg) => msg.agent === 'C').length;

  const noveltyScore = round(Math.min(1, theoristTurns / Math.max(1, (options.minRounds || 5) * 0.8)));
  const evidenceScore = round(Math.min(1, researcherTurns / Math.max(1, state.round || 1)));
  const critiqueScore = round(Math.min(1, criticTurns / Math.max(1, state.round || 1)));
  const readinessScore = round(Math.min(1, (state.round + 1) / Math.max(1, options.minRounds || 1)));

  let decision = 'continue';
  const notes = [];

  if (readinessScore > 0.9 && (state.openQuestions?.length || 0) <= 1) {
    decision = 'synthesize';
    notes.push('Evaluator believes the debate is ready for synthesis.');
  }

  if (evidenceScore < 0.25 && critiqueScore > 0.6) {
    decision = 'reject';
    notes.push('Evidence remains weak despite sustained critique. Recommend rejection/pause.');
  } else if (evidenceScore < 0.35) {
    decision = 'needs_evidence';
    notes.push('Evaluator suggests gathering more evidence before moving on.');
  }

  return {
    scorecard: {
      novelty: noveltyScore,
      evidence: evidenceScore,
      critique: critiqueScore,
      readiness: readinessScore,
    },
    decision,
    notes,
  };
}


