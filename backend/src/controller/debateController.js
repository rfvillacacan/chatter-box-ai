import { randomUUID } from 'crypto';
import { callAgent } from '../agents/agentSystem.js';
import { connectionManager } from '../websocket/broadcaster.js';
import { debatePhases } from '../config/debatePhases.js';
import { runSupportTools } from '../tools/index.js';
import { evaluateDebate } from './evaluator.js';

export class DebateController {
  constructor(debateId, topic, options = {}) {
    this.debateId = debateId;
    this.topic = topic;
    this.state = {
      topic,
      status: 'exploration',
      round: 0,
      openQuestions: [],
      depthLevel: 0,
      phase: debatePhases[0]?.id || 'formalize',
      phaseLabel: debatePhases[0]?.label || 'Problem Formalization',
      hypotheses: [],
    };
    this.history = [];
    this.isPaused = false;
    this.pauseResumePromise = null;
    this.pauseResolve = null;
    this.options = {
      maxRounds: options.maxRounds || 20,
      minRounds: options.minRounds || 5,
      researcherInterval: options.researcherInterval || 3,
      ...options,
    };
    this.introPhases = debatePhases.filter(
      (phase) => !phase.repeatable && phase.id !== 'synthesize',
    );
    this.loopPhases = debatePhases.filter((phase) => phase.repeatable);
    this.finalPhase = debatePhases.find((phase) => phase.id === 'synthesize');
    this.hypotheses = [];
    this.activeHypothesisId = null;
    this.initializeHypotheses();
  }

  async start() {
    return this.runLoop();
  }

  async runLoop() {
    await this.runPhaseSequence(this.introPhases);
    this.updateState();

    while (!this.shouldFinalize() && this.state.round < this.options.maxRounds) {
      await this.runPhaseSequence(this.loopPhases);
      this.state.round += 1;
      this.updateState();
      if (this.shouldFinalize()) break;
      if (this.state.pendingDirective === 'halt') {
        this.state.pendingDirective = null;
        break;
      }
    }

    if (this.finalPhase) {
      await this.runPhaseSequence([this.finalPhase]);
    }

    const finalAnswer = this.history[this.history.length - 1];

    return {
      history: this.history,
      finalAnswer,
      state: this.state,
    };
  }

  updateState() {
    // Extract open questions from recent messages
    const recentMessages = this.history.slice(-3);
    recentMessages.forEach(msg => {
      const questions = msg.content.match(/[^.!?]*\?/g);
      if (questions) {
        questions.forEach(q => {
          if (!this.state.openQuestions.includes(q.trim())) {
            this.state.openQuestions.push(q.trim());
          }
        });
      }
      if (msg.structure?.open_questions?.length) {
        msg.structure.open_questions.forEach((q) => {
          if (q && !this.state.openQuestions.includes(q)) {
            this.state.openQuestions.push(q);
          }
        });
      }
    });

    // Update depth level
    this.state.depthLevel = Math.floor(this.state.round / 5);

    this.state.status =
      this.state.round >= this.options.minRounds ? 'ready_to_synthesize' : 'exploration';
    this.state.evaluator = evaluateDebate(this.history, this.state, this.options);
    this.updateHypothesisScores();
    this.state.hypotheses = this.hypotheses;
    this.state.pendingDirective = this.state.evaluator?.directive || null;
    this.broadcastStatus({
      phase: this.state.phase,
      phaseLabel: this.state.phaseLabel,
      evaluator: this.state.evaluator,
      hypotheses: this.hypotheses,
      openQuestions: this.state.openQuestions,
      pendingDirective: this.state.pendingDirective,
      isPaused: this.isPaused,
    });
  }

  shouldFinalize() {
    if (this.state.round < this.options.minRounds) return false;
    if (this.state.round >= this.options.maxRounds) return true;
    if (this.state.pendingDirective === 'halt') return true;
    if (this.state.evaluator?.decision === 'synthesize') return true;
    return this.state.openQuestions.length <= 1;
  }

  async synthesize() {
    const summary = this.history
      .map(msg => `${msg.agent}: ${msg.content}`)
      .join('\n\n');

    return {
      agent: 'SYSTEM',
      role: 'system',
      content: `## Debate Summary\n\nAfter ${this.state.round} rounds of discussion, here's a synthesis of the key points raised by the agents.`,
      timestamp: new Date().toISOString(),
    };
  }

  async runPhaseSequence(phases = []) {
    for (const phase of phases) {
      if (!phase) continue;
      this.state.phase = phase.id;
      this.state.phaseLabel = phase.label;
      for (const agentId of phase.agents) {
        await this.waitIfPaused();
        await this.executeAgentTurn(agentId, phase);
      }
    }
  }

  async executeAgentTurn(agentId, phase) {
    if (agentId === 'SYSTEM') {
      const finalMessage = await this.synthesize();
      const enrichedFinal = { ...finalMessage, phase: phase.id };
      this.history.push(enrichedFinal);
      this.broadcastMessage(enrichedFinal);
      return;
    }

    this.broadcastTyping(agentId, true);
    let toolResults = null;
    if (['C', 'F', 'R'].includes(agentId)) {
      toolResults = await runSupportTools(agentId, {
        topic: this.topic,
        state: this.state,
        history: this.history,
        phase,
      });
    }

    const agentState = {
      ...this.state,
      currentPhase: phase.id,
      toolResults,
      hypotheses: this.hypotheses,
    };

    const message = await callAgent(agentId, this.topic, this.history, agentState);
    this.broadcastTyping(agentId, false);
    const enrichedMessage = this.sanitizeMessage({ ...message, phase: phase.id, tools: toolResults });
    this.history.push(enrichedMessage);
    this.applyHypothesisInsights(enrichedMessage);
    this.broadcastMessage(enrichedMessage);

    await this.delay(phase.delay ?? 300);
  }

  async waitIfPaused() {
    if (this.isPaused) {
      await this.waitForResume();
    }
  }

  pause() {
    if (!this.isPaused) {
      this.isPaused = true;
      this.pauseResumePromise = new Promise((resolve) => {
        this.pauseResolve = resolve;
      });
      this.broadcastStatus({ isPaused: true });
    }
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      if (this.pauseResolve) {
        this.pauseResolve();
        this.pauseResolve = null;
        this.pauseResumePromise = null;
      }
      this.broadcastStatus({ isPaused: false });
    }
  }

  async waitForResume() {
    if (this.isPaused && this.pauseResumePromise) {
      await this.pauseResumePromise;
    }
  }

  broadcastMessage(message) {
    connectionManager.broadcast(this.debateId, {
      type: 'message',
      data: message,
    });
  }

  broadcastStatus(status) {
    connectionManager.broadcast(this.debateId, {
      type: 'status',
      data: status,
    });
  }

  broadcastTyping(agent, active) {
    connectionManager.broadcast(this.debateId, {
      type: 'typing',
      agent,
      active,
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  sanitizeMessage(message) {
    if (message.structure && typeof message.structure === 'object') {
      Object.keys(message.structure).forEach((key) => {
        const value = message.structure[key];
        if (Array.isArray(value)) {
          message.structure[key] = value.filter(
            (item) => item !== null && item !== undefined && item !== '',
          );
        } else if (typeof value === 'string') {
          message.structure[key] = value.trim();
        }
      });
    }
    return message;
  }

  applyHypothesisInsights(message) {
    if (!message || !message.structure) return;

    if (message.structure.claims?.length && message.agent === 'A') {
      const claimSummary = message.structure.summary || message.content;
      this.createOrUpdateHypothesis({
        title: claimSummary,
        proposer: message.agent,
        support: message.structure.claims,
      });
    }

    if (message.structure.counterarguments?.length && message.agent === 'B') {
      this.flagHypothesisEvidence('counter', message.structure.counterarguments);
    }

    if (message.structure.findings?.length && message.agent === 'C') {
      const supportive = message.structure.findings.filter((f) =>
        f?.statement?.toLowerCase().includes('evidence'),
      );
      const contradictory = message.structure.findings.filter((f) =>
        f?.statement?.toLowerCase().includes('no evidence'),
      );
      if (supportive.length) this.flagHypothesisEvidence('support', supportive.map((f) => f.statement));
      if (contradictory.length) this.flagHypothesisEvidence('counter', contradictory.map((f) => f.statement));
    }

    if (message.agent === 'F' && message.structure.evaluation_notes?.length) {
      this.flagHypothesisEvidence('formal', message.structure.evaluation_notes);
    }
  }

  createOrUpdateHypothesis({ title, proposer, support = [] }) {
    if (!title) return;
    let hypothesis = this.hypotheses.find((h) => h.title === title);
    if (!hypothesis) {
      hypothesis = {
        id: `H-${this.hypotheses.length + 1}`,
        title,
        proposer,
        support: [],
        counter: [],
        status: 'open',
        probability: 0.5,
      };
      this.hypotheses.push(hypothesis);
    }
    hypothesis.support.push(...support);
  }

  flagHypothesisEvidence(type, items = []) {
    if (!items.length || this.hypotheses.length === 0) return;
    const target = this.hypotheses[this.hypotheses.length - 1];
    if (!target) return;
    if (type === 'support') target.support.push(...items);
    if (type === 'counter') target.counter.push(...items);
    if (type === 'formal') target.formalNotes = [...(target.formalNotes || []), ...items];
  }

  updateHypothesisScores() {
    this.hypotheses = this.hypotheses.map((hyp) => {
      const supportScore = hyp.support.length;
      const counterScore = hyp.counter.length;
      const evalReadiness = this.state.evaluator?.decision === 'synthesize';
      const probability = Math.max(
        0,
        Math.min(1, 0.5 + (supportScore - counterScore) * 0.1 - (evalReadiness ? 0.1 : 0)),
      );

      let status = 'open';
      if (probability > 0.75) status = 'supported';
      if (probability < 0.25) status = 'rejected';
      if (counterScore > supportScore && counterScore > 2) status = 'rejected';

      return {
        ...hyp,
        probability: Number(probability.toFixed(2)),
        status,
      };
    });
  }
}

// Store active debates
const activeDebates = new Map();

export const debateController = {
  create: (debateId, topic, options) => {
    const controller = new DebateController(debateId, topic, options);
    activeDebates.set(debateId, controller);
    return controller;
  },

  get: (debateId) => {
    return activeDebates.get(debateId);
  },

  remove: (debateId) => {
    activeDebates.delete(debateId);
  },
};

