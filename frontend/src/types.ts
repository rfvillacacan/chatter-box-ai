export interface Message {
  agent: string;
  role: string;
  content: string;
  timestamp: string;
  structure?: Record<string, any>;
  phase?: string;
  tools?: Record<string, any>;
}

export interface DebateState {
  topic: string;
  status: string;
  round: number;
  openQuestions: string[];
  depthLevel: number;
  phase?: string;
  phaseLabel?: string;
  evaluator?: {
    scorecard?: Record<string, number>;
    decision?: string;
    notes?: string[];
  };
}

