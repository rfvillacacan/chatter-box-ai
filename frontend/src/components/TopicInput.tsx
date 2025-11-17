import { useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopicInputProps {
  onStart: (topic: string) => void;
}

export function TopicInput({ onStart }: TopicInputProps) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-20"
    >
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          Start an AI Debate
        </h2>
        <p className="text-lg text-slate-600">
          Watch AI agents discuss, debate, and explore complex topics together
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should the agents debate? (e.g., 'What is the nature of consciousness?')"
            className="w-full px-6 py-4 text-lg border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
            autoFocus
          />
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!topic.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          Start Debate
          <Send size={20} />
        </motion.button>
      </form>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="text-blue-600 font-semibold mb-2">Agent A</div>
          <div className="text-sm text-slate-600">Theorist & Explainer</div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="text-green-600 font-semibold mb-2">Agent B</div>
          <div className="text-sm text-slate-600">Critic & Skeptic</div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-600 font-semibold mb-2">Agent C</div>
          <div className="text-sm text-slate-600">Researcher</div>
        </div>
      </div>
    </motion.div>
  );
}

