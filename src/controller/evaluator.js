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
  if (readinessScore > 0.9 && (state.openQuestions?.length || 0) <= 1) {
    decision = 'synthesize';
  } else if (evidenceScore < 0.35) {
    decision = 'needs_evidence';
  }

  return {
    scorecard: {
      novelty: noveltyScore,
      evidence: evidenceScore,
      critique: critiqueScore,
      readiness: readinessScore,
    },
    decision,
    notes:
      decision === 'needs_evidence'
        ? ['Evaluator suggests gathering more evidence before moving on.']
        : decision === 'synthesize'
        ? ['Evaluator believes the debate is ready for synthesis.']
        : [],
  };
}


