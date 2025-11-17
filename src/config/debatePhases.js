export const debatePhases = [
  {
    id: 'formalize',
    label: 'Problem Formalization',
    description: 'Define the topic, key terms, and desired outcomes.',
    agents: ['A'],
    repeatable: false,
  },
  {
    id: 'decompose',
    label: 'Decomposition & Critique',
    description: 'Identify assumptions, edge cases, and sub-questions.',
    agents: ['B'],
    repeatable: false,
  },
  {
    id: 'investigate',
    label: 'Investigation & Evidence',
    description: 'Gather supporting evidence or counter-points.',
    agents: ['C'],
    repeatable: true,
  },
  {
    id: 'hypothesize',
    label: 'Hypothesis Generation',
    description: 'Propose refined explanations or models.',
    agents: ['A', 'F'],
    repeatable: true,
  },
  {
    id: 'test',
    label: 'Testing & Stress Check',
    description: 'Challenge hypotheses with adversarial questions.',
    agents: ['B', 'F'],
    repeatable: true,
  },
  {
    id: 'synthesize',
    label: 'Synthesis',
    description: 'Summarize and capture the best insights.',
    agents: ['SYSTEM'],
    repeatable: false,
  },
];


