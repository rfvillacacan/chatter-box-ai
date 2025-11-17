import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STRUCTURE_INSTRUCTIONS = {
  A: `Respond with VALID JSON only (no prose). Use this structure:
{
  "summary": "2-3 sentences summarizing your latest contribution.",
  "assumptions": ["..."],
  "claims": ["..."],
  "logical_steps": ["..."],
  "predictions": ["..."],
  "open_questions": ["..."]
}
Always return arrays even if empty.`,
  B: `Respond with VALID JSON only (no prose). Use this structure:
{
  "summary": "2 sentences summarizing your critique.",
  "target_claim": "Which claim or idea you are targeting.",
  "counterarguments": ["..."],
  "edge_cases": ["..."],
  "requested_evidence": ["..."],
  "risk_of_error": ["..."]
}
Always return arrays even if empty.`,
  C: `Respond with VALID JSON only (no prose). Use this structure:
{
  "summary": "Brief overview of the most relevant findings.",
  "query": "What you investigated or searched for.",
  "findings": [
    { "statement": "fact or insight", "source": "citation or url" }
  ],
  "citations": ["..."],
  "reliability": "High | Medium | Low",
  "implications": ["What this means for the debate"]
}
Always include citations when possible and keep arrays even if empty.`,
  F: `Respond with VALID JSON only (no prose). Use this structure:
{
  "summary": "Describe the formalization you produced or evaluated.",
  "formalism": ["Equations, pseudo-code, or symbolic statements."],
  "variables": ["Key variables or parameters you introduced."],
  "constraints": ["Any constraints or boundary conditions."],
  "evaluation_notes": ["Checks you performed, caveats, or errors."],
  "next_tests": ["Steps to validate or extend the formalism."]
}
Always use arrays even if a section is empty.`,
  R: `Respond with VALID JSON only (no prose). Use this structure:
{
  "summary": "One or two sentences describing your verdict.",
  "directive": "support | reject | continue | needs_evidence",
  "targets": ["IDs or short titles of the hypotheses you are judging"],
  "rationale": ["Key reasons for the directive"],
  "risks": ["Residual risks or uncertainties"],
  "follow_up_actions": ["Concrete next steps for the team"]
}
Always include at least one rationale entry and point to specific hypotheses where possible.`,
};

const STRUCTURE_DEFAULTS = {
  A: {
    summary: '',
    assumptions: [],
    claims: [],
    logical_steps: [],
    predictions: [],
    open_questions: [],
  },
  B: {
    summary: '',
    target_claim: '',
    counterarguments: [],
    edge_cases: [],
    requested_evidence: [],
    risk_of_error: [],
  },
  C: {
    summary: '',
    query: '',
    findings: [],
    citations: [],
    reliability: '',
    implications: [],
  },
  F: {
    summary: '',
    formalism: [],
    variables: [],
    constraints: [],
    evaluation_notes: [],
    next_tests: [],
  },
  R: {
    summary: '',
    directive: '',
    targets: [],
    rationale: [],
    risks: [],
    follow_up_actions: [],
  },
};

const AGENT_PROMPTS = {
  A: {
    role: 'Theorist',
    system: `You are Agent A, a thoughtful theorist and explainer. Your role is to:
- Propose well-reasoned theories and explanations
- Build on ideas with depth and clarity
- Respond to critiques by refining your arguments
- Always contribute meaningful insights, never just agree and stop

You must always provide substantive responses. If asked to refine, elaborate, or address a critique, do so thoroughly.`,
  },
  B: {
    role: 'Critic',
    system: `You are Agent B, a sharp critic and skeptic. Your role is to:
- Challenge assumptions and find gaps in arguments
- Ask probing questions
- Offer alternative perspectives
- Push for clarity and rigor

You must always find something to question or critique. Never simply agree - always push the conversation forward with challenges or new angles.`,
  },
  C: {
    role: 'Researcher',
    system: `You are Agent C, a researcher focused on facts and evidence. Your role is to:
- Identify factual gaps in the conversation
- Provide evidence-based insights
- Note when claims need verification
- Keep discussions grounded in reality

You cannot debate - you only provide research notes and factual context. Keep responses concise and evidence-focused.`,
  },
  F: {
    role: 'Formalizer',
    system: `You are Agent F, a formalizer who converts natural language hypotheses into structured representations such as equations, pseudo-code, or logical statements. Your responsibilities:
- Extract the core hypothesis and formalize it precisely.
- Identify variables, constraints, and assumptions.
- Evaluate the formalism for coherence, pointing out limitations.
- Suggest next analytical or experimental steps.

You are not here to introduce new narratives—focus on formal clarity.`,
  },
  R: {
    role: 'Referee',
    system: `You are Agent R, the Referee. Your job is to weigh accumulated evidence, critique, and formal analyses to determine whether the current hypotheses should be supported, rejected, reworked, or require more evidence. You must:
- Examine the provided hypotheses (including their support/counter evidence and status),
- Consider evaluator scores and recent messages,
- Issue a directive: "support", "reject", "needs_evidence", or "continue",
- Provide a brief summary plus rationale and any follow-up actions required.`,
  },
};

function summarizeHistory(history, maxTokens = 2000) {
  if (history.length === 0) return '';
  
  // Keep last 5 messages in full, summarize the rest
  const recentMessages = history.slice(-5);
  const olderMessages = history.slice(0, -5);
  
  if (olderMessages.length === 0) {
    return recentMessages.map(msg => `${msg.agent}: ${msg.content}`).join('\n\n');
  }
  
  const summary = olderMessages.length > 0 
    ? `[Previous discussion: ${olderMessages.length} messages about ${history[0]?.topic || 'the topic'}]\n\n`
    : '';
  
  const recent = recentMessages.map(msg => `${msg.agent}: ${msg.content}`).join('\n\n');
  
  return summary + recent;
}

export async function callAgent(agentId, topic, history, state) {
  const agentConfig = AGENT_PROMPTS[agentId];
  if (!agentConfig) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const historySummary = summarizeHistory(history);
  
  const structureInstruction = STRUCTURE_INSTRUCTIONS[agentId] || '';
  const hypothesesSnapshot =
    Array.isArray(state.hypotheses) && state.hypotheses.length
      ? state.hypotheses
          .slice(-3)
          .map(
            (h) =>
              `${h.id || h.title || 'hypothesis'} (status=${h.status || 'unknown'}, prob=${
                typeof h.probability === 'number' ? h.probability : 'n/a'
              })`,
          )
          .join('\n  - ')
      : null;
  const hypothesesSection = hypothesesSnapshot
    ? `\nHypotheses (recent):\n  - ${hypothesesSnapshot}`
    : `\nHypotheses: none captured yet.`;

  const directiveNote = state.pendingDirective
    ? `\nCurrent directive: ${String(state.pendingDirective).toUpperCase()}.`
    : '';

  const evaluatorNote =
    state.evaluator && state.evaluator.scorecard
      ? `\nEvaluator scores: ${JSON.stringify(state.evaluator.scorecard)}`
      : '';

  const toolNotes = state.toolResults
    ? `\nTooling context:\n${JSON.stringify(state.toolResults, null, 2)}`
    : '';

  const systemPrompt = `${agentConfig.system}

Current debate topic: ${topic}
Debate status: ${state.status}
Round: ${state.round}
Current phase: ${state.phase} (${state.phaseLabel || 'General'})
${state.openQuestions.length > 0 ? `Open questions to consider: ${state.openQuestions.slice(-3).join('; ')}` : ''}
${hypothesesSection}
${directiveNote}
${evaluatorNote}

Remember: You are ${agentConfig.role}. Stay focused on rigorous reasoning and the guidance above.
${structureInstruction}
${toolNotes}`;

  const userPrompt = state.status === 'synthesis'
    ? `The debate is moving toward synthesis. Please provide a thoughtful summary of your position, key arguments, and points of agreement/disagreement with the other agents.`
    : history.length === 0
    ? `Start the debate by presenting your initial perspective on: ${topic}`
    : `Continue the debate. Here's the conversation so far:\n\n${historySummary}\n\nRespond as ${agentConfig.role}. Output valid JSON only.`;

  if (process.env.MOCK_AGENT_RESPONSES === 'true') {
    return buildMockResponse(agentId, agentConfig.role, state);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can upgrade to gpt-4
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content;

    const { structuredContent, summaryText } = parseStructuredContent(agentId, content);

    return {
      agent: agentId,
      role: agentConfig.role,
      content: summaryText,
      structure: structuredContent,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error calling agent ${agentId}:`, error);
    return {
      agent: agentId,
      role: agentConfig.role,
      content: `[Error: Unable to generate response. ${error.message}]`,
      timestamp: new Date().toISOString(),
    };
  }
}

function parseStructuredContent(agentId, rawContent) {
  if (!rawContent) {
    return { structuredContent: null, summaryText: '' };
  }

  const cleaned = extractJsonPayload(rawContent);
  if (!cleaned) {
    return { structuredContent: null, summaryText: rawContent };
  }

  try {
    const parsed = JSON.parse(cleaned);
    const normalized = normalizeStructure(agentId, parsed);
    const summaryText = normalized.summary || rawContent;
    return { structuredContent: normalized, summaryText };
  } catch (error) {
    console.warn(`Failed to parse structured response for agent ${agentId}:`, error.message);
    return { structuredContent: null, summaryText: rawContent };
  }
}

function normalizeStructure(agentId, payload = {}) {
  const defaults = STRUCTURE_DEFAULTS[agentId];
  if (!defaults) return payload;

  const normalized = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (Array.isArray(defaultValue)) {
      const value = payload[key];
      normalized[key] = Array.isArray(value) ? value : [];
    } else if (typeof defaultValue === 'object' && defaultValue !== null) {
      normalized[key] = Array.isArray(payload[key]) ? payload[key] : [];
    } else {
      normalized[key] = payload[key] ?? defaultValue ?? '';
    }
  }

  return normalized;
}

function extractJsonPayload(text = '') {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```json/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return trimmed.slice(firstBrace, lastBrace + 1);
}

function buildMockResponse(agentId, role, state) {
  const defaults = STRUCTURE_DEFAULTS[agentId] || { summary: '' };
  const structure = { ...defaults };

  if (Array.isArray(structure.claims)) {
    structure.claims = [`Mock claim at phase ${state.currentPhase || state.phase}`];
  }
  if (Array.isArray(structure.assumptions)) {
    structure.assumptions = ['Mock assumption A', 'Mock assumption B'];
  }
  if (Array.isArray(structure.findings)) {
    structure.findings = [{ statement: 'Simulated evidence snippet', source: 'mock://source' }];
  }
  if (Array.isArray(structure.formalism)) {
    structure.formalism = ['f(x) = mock_hypothesis(x)'];
  }
  if (Array.isArray(structure.open_questions)) {
    structure.open_questions = ['What happens if assumptions shift?'];
  }

  structure.summary = `Mock ${role} response during ${state.currentPhase || state.phase}.`;

  return {
    agent: agentId,
    role,
    content: structure.summary,
    structure,
    timestamp: new Date().toISOString(),
  };
}

