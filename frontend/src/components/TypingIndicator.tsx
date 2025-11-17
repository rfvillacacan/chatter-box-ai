import { motion } from 'framer-motion';
import { MessageSquare, User, Search } from 'lucide-react';

interface TypingIndicatorProps {
  agent: string;
}

const agentIcons = {
  A: MessageSquare,
  B: User,
  C: Search,
};

const agentColors = {
  A: 'text-agentA',
  B: 'text-agentB',
  C: 'text-agentC',
};

export function TypingIndicator({ agent }: TypingIndicatorProps) {
  const Icon = agentIcons[agent as keyof typeof agentIcons] || MessageSquare;
  const colorClass = agentColors[agent as keyof typeof agentColors] || 'text-slate-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center">
        <Icon size={20} className={colorClass} />
      </div>
      <div className="flex items-center gap-1 px-4 py-3 bg-slate-100 rounded-2xl rounded-tl-sm border border-slate-300">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-slate-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-slate-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-slate-400 rounded-full"
        />
      </div>
    </motion.div>
  );
}

