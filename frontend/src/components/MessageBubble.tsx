import { motion } from 'framer-motion';
import { Message } from '../types';
import { User, Search, MessageSquare } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  index: number;
}

const agentConfig = {
  A: {
    name: 'Agent A',
    role: 'Theorist',
    icon: MessageSquare,
  },
  B: {
    name: 'Agent B',
    role: 'Critic',
    icon: User,
  },
  C: {
    name: 'Agent C',
    role: 'Researcher',
    icon: Search,
  },
  F: {
    name: 'Agent F',
    role: 'Formalizer',
    icon: MessageSquare,
  },
  SYSTEM: {
    name: 'System',
    role: 'System',
    icon: MessageSquare,
  },
  USER: {
    name: 'You',
    role: 'Topic',
    icon: MessageSquare,
  },
};

const STRUCTURE_DISPLAY_MAP: Record<
  string,
  Array<{ key: string; title: string; type?: 'list' | 'text' | 'findings' }>
> = {
  A: [
    { key: 'assumptions', title: 'Assumptions' },
    { key: 'claims', title: 'Claims' },
    { key: 'logical_steps', title: 'Logical Steps' },
    { key: 'predictions', title: 'Predictions' },
    { key: 'open_questions', title: 'Open Questions' },
  ],
  B: [
    { key: 'target_claim', title: 'Target Claim', type: 'text' },
    { key: 'counterarguments', title: 'Counterarguments' },
    { key: 'edge_cases', title: 'Edge Cases' },
    { key: 'requested_evidence', title: 'Requested Evidence' },
    { key: 'risk_of_error', title: 'Risks' },
  ],
  C: [
    { key: 'query', title: 'Research Query', type: 'text' },
    { key: 'findings', title: 'Findings', type: 'findings' },
    { key: 'citations', title: 'Citations' },
    { key: 'reliability', title: 'Reliability', type: 'text' },
    { key: 'implications', title: 'Implications' },
  ],
  F: [
    { key: 'formalism', title: 'Formalism' },
    { key: 'variables', title: 'Variables' },
    { key: 'constraints', title: 'Constraints' },
    { key: 'evaluation_notes', title: 'Evaluation Notes' },
    { key: 'next_tests', title: 'Next Tests' },
  ],
};

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const config = agentConfig[message.agent as keyof typeof agentConfig] || agentConfig.SYSTEM;
  const isUser = message.agent === 'USER';
  const isSystem = message.agent === 'SYSTEM';
  const isAgent = !isUser && !isSystem;
  const Icon = config.icon;
  const sections = getStructureSections(message);
  const summaryText = message.structure?.summary || message.content;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const bubbleClasses = (() => {
    if (isUser) return 'bg-[#d9fdd3] text-[#111b21] rounded-xl rounded-br-sm';
    if (isSystem) return 'bg-[#f0f2f5] text-slate-600 rounded-xl text-center';
    return 'bg-white text-[#111b21] border border-black/5 rounded-xl rounded-tl-sm';
  })();

  const alignment = isUser ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`flex ${alignment}`}
    >
      <div className="max-w-[75%] flex flex-col gap-1">
        {isAgent && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
            <div className="flex items-center gap-1 font-semibold text-slate-600">
              <Icon size={12} />
              {config.name}
            </div>
            <span className="text-[11px]">{config.role}</span>
          </div>
        )}

        <div className={`px-4 py-3 shadow-sm ${bubbleClasses}`}>
          <p className="whitespace-pre-wrap leading-relaxed">{summaryText}</p>

          {sections.length > 0 && (
            <div className="mt-3 space-y-3">
              {sections.map((section) => (
                <div
                  key={`${message.timestamp}-${section.title}`}
                  className="bg-white/70 rounded-lg p-3 shadow-inner"
                >
                  <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    {section.title}
                  </p>
                  {renderSectionContent(section)}
                </div>
              ))}
            </div>
          )}

          <div className={`text-[11px] mt-1 flex ${isUser ? 'justify-end text-[#1a3324]/70' : 'justify-end text-slate-400'}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getStructureSections(message: Message) {
  if (!message.structure) return [];
  const map = STRUCTURE_DISPLAY_MAP[message.agent];
  if (!map) return [];

  return map
    .map((section) => {
      const value = message.structure?.[section.key];
      if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        return null;
      }
      return { ...section, value };
    })
    .filter(Boolean) as Array<{ key: string; title: string; type?: string; value: any }>;
}

function renderSectionContent(section: { type?: string; value: any }) {
  if (section.type === 'text') {
    return <p className="text-sm text-slate-700">{section.value}</p>;
  }

  if (section.type === 'findings' && Array.isArray(section.value)) {
    return (
      <ul className="space-y-2 text-sm text-slate-700 list-disc pl-4">
        {section.value.map((finding: any, idx: number) => (
          <li key={idx}>
            {finding.statement}
            {finding.source && (
              <span className="block text-xs text-slate-500 mt-0.5">Source: {finding.source}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (Array.isArray(section.value)) {
    return (
      <ul className="space-y-1 text-sm text-slate-700 list-disc pl-4">
        {section.value.map((item: string, idx: number) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm text-slate-700">{section.value}</p>;
}

