import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pause,
  Play,
  Smile,
  Paperclip,
  RefreshCw,
  Phone,
  Video,
  MoreVertical,
  Search,
  CircleDashed,
} from 'lucide-react';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';
import { Message, DebateState } from '../types';

const CHAT_BACKGROUND_STYLE = {
  backgroundColor: '#efeae2',
  backgroundImage:
    'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.3) 8%, transparent 9%), radial-gradient(circle at 30% 10%, rgba(255,255,255,0.25) 6%, transparent 7%), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.25) 7%, transparent 8%), radial-gradient(circle at 90% 30%, rgba(255,255,255,0.2) 7%, transparent 8%)',
  backgroundSize: '220px 220px',
};

interface TopicHistory {
  id: string;
  topic: string;
  startedAt: string;
  status: 'active' | 'paused' | 'ended';
}

export function ChatRoom() {
  const [debateId, setDebateId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [topicHistory, setTopicHistory] = useState<TopicHistory[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debateState, setDebateState] = useState<DebateState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debateId) return;

    const ws = new WebSocket(`ws://localhost:3001?debateId=${debateId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'message') {
        setIsTyping(false);
        setTypingAgent(null);
        setMessages((prev) => [...prev, data.data]);
      } else if (data.type === 'typing') {
        if (data.active === false) {
          setIsTyping(false);
          setTypingAgent(null);
        } else {
          setIsTyping(true);
          setTypingAgent(data.agent ?? null);
        }
      } else if (data.type === 'status') {
        if (data.data?.isPaused !== undefined) {
          setIsPaused(data.data.isPaused);
          setTopicHistory((prev) =>
            prev.map((entry) =>
              entry.id === debateId ? { ...entry, status: data.data.isPaused ? 'paused' : 'active' } : entry,
            ),
          );
        }

        if (
          data.data?.phase ||
          data.data?.phaseLabel ||
          data.data?.evaluator ||
          data.data?.openQuestions ||
          data.data?.status
        ) {
          setDebateState((prev) => ({
            topic: prev?.topic || topic,
            status: data.data.status ?? prev?.status ?? '',
            round: prev?.round ?? 0,
            openQuestions: data.data.openQuestions ?? prev?.openQuestions ?? [],
            depthLevel: prev?.depthLevel ?? 0,
            phase: data.data.phase ?? prev?.phase,
            phaseLabel: data.data.phaseLabel ?? prev?.phaseLabel,
            evaluator: data.data.evaluator ?? prev?.evaluator,
          }));
        }
      }
    };

    ws.onerror = (event) => console.error('WebSocket error:', event);

    fetch(`http://localhost:3001/api/debate/${debateId}/history`)
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setMessages((prev) => {
            const userMessages = prev.filter((msg) => msg.agent === 'USER');
            return [...userMessages, ...data.history];
          });
        }
        if (data.state) {
          setDebateState(data.state);
        }
      })
      .catch((err) => console.error('Error loading history:', err));

    return () => {
      ws.close();
    };
  }, [debateId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePauseResume = async () => {
    if (!debateId) return;

    try {
      const endpoint = isPaused ? 'resume' : 'pause';
      const response = await fetch(`http://localhost:3001/api/debate/${debateId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`Failed to ${endpoint} debate`);

      const data = await response.json();
      setIsPaused(data.isPaused);
    } catch (err) {
      console.error(err);
      setError(`Unable to ${isPaused ? 'resume' : 'pause'} the debate. Please try again.`);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim() || debateId) return;

    const topicText = inputValue.trim();
    const userMessage: Message = {
      agent: 'USER',
      role: 'You',
      content: topicText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/debate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicText,
          options: {
            maxRounds: 20,
            minRounds: 5,
            researcherInterval: 3,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to start debate');

      const data = await response.json();
      setDebateId(data.debateId);
      setTopic(topicText);
      setTopicHistory((prev) => [
        {
          id: data.debateId,
          topic: topicText,
          startedAt: new Date().toISOString(),
          status: 'active',
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      setError('Failed to start the debate. Please try again.');
      setMessages((prev) => [
        ...prev,
        {
          agent: 'SYSTEM',
          role: 'System',
          content: 'We could not connect to the debate engine. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStarting(false);
    }
  };

  const handleNewTopic = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (debateId) {
      setTopicHistory((prev) =>
        prev.map((entry) => (entry.id === debateId ? { ...entry, status: 'ended' } : entry)),
      );
    }

    setDebateId(null);
    setTopic('');
    setMessages([]);
    setIsPaused(false);
    setTypingAgent(null);
    setIsTyping(false);
    setInputValue('');
    setError(null);
    setDebateState(null);
  };

  const placeholder = debateId ? 'Debate in progress. Use “New Topic” to start another conversation.' : 'Type a topic…';

  const sidebarHeader = useMemo(() => {
    const active = topicHistory.find((entry) => entry.id === debateId);
    if (active) {
      return { title: active.topic, status: isPaused ? 'Paused' : 'Live' };
    }
    return { title: 'New chat', status: 'Pick a topic to begin' };
  }, [topicHistory, debateId, isPaused]);

  const latestHypothesis = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.agent === 'A' && message.structure?.claims?.length),
    [messages],
  );

  const highlightClaims = latestHypothesis?.structure?.claims?.slice(0, 3) ?? [];
  const evaluatorScores = debateState?.evaluator?.scorecard
    ? Object.entries(debateState.evaluator.scorecard)
    : [];
  const topOpenQuestions = debateState?.openQuestions?.slice(-3) ?? [];

  return (
    <div className="w-full max-w-6xl h-[90vh] rounded-[20px] overflow-hidden shadow-2xl border border-black/10 bg-[#111b21] text-[#e9edef]">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-80 flex-col bg-[#111b21] border-r border-white/5 h-full">
          <div className="bg-[#202c33] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 flex items-center justify-center font-semibold text-[#111b21]">
                AI
              </div>
              <div>
                <p className="text-sm font-semibold">{sidebarHeader.title}</p>
                <p className="text-xs text-emerald-200">{sidebarHeader.status}</p>
              </div>
              <button
                onClick={handleNewTopic}
                className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition"
              >
                New topic
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 bg-[#111b21] rounded-lg px-3 py-2 text-sm text-slate-300">
              <Search size={16} />
              <input
                placeholder="Search your debates"
                className="bg-transparent focus:outline-none flex-1 text-xs placeholder:text-slate-500"
                disabled
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto chat-scrollbar">
            {topicHistory.length === 0 ? (
              <div className="p-6 text-sm text-slate-400 leading-relaxed">
                Start a debate topic and it will appear here. Each conversation keeps your entire agent exchange in one
                place, just like WhatsApp chats.
              </div>
            ) : (
              topicHistory.map((entry) => (
                <div
                  key={entry.id}
                  className={`px-4 py-3 border-b border-white/5 cursor-pointer transition ${
                    entry.id === debateId ? 'bg-[#202c33]' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold truncate">{entry.topic}</p>
                    <span className="text-[11px] text-slate-500">
                      {new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 capitalize flex items-center gap-1">
                    <CircleDashed size={12} />
                    {entry.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main conversation */}
        <section className="flex-1 flex flex-col bg-[#0b141a] h-full">
          {/* Header */}
          <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-black/20">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-lg font-semibold text-[#0b141a]">
                AI
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#202c33]" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{topic || 'Chatter Debate Room'}</p>
              <p className="text-xs text-emerald-200">
                {debateId ? (isPaused ? 'Paused' : 'Agents online now') : 'Waiting for your topic'}
              </p>
            </div>
            {debateId && (
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-full transition" title="Voice call">
                  <Phone size={18} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition" title="Video call">
                  <Video size={18} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition" title="Menu">
                  <MoreVertical size={18} />
                </button>
                <button
                  onClick={handlePauseResume}
                  className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                    isPaused ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500/90 hover:bg-red-600 text-white'
                  }`}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleNewTopic}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                  title="Start a new topic"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            )}
          </div>

        {/* Summary */}
        {debateId && debateState && (
          <div className="bg-[#0d1b24] border-b border-black/40 px-4 py-3">
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Current Phase</p>
                <p className="text-base font-semibold text-white">{debateState.phaseLabel || debateState.phase}</p>
                <p className="text-xs text-slate-400 mt-1">Round {debateState.round}</p>
                {debateState.evaluator?.decision && (
                  <span className="inline-flex mt-2 px-2 py-1 text-[11px] rounded-full bg-emerald-500/20 text-emerald-200">
                    Evaluator: {debateState.evaluator.decision}
                  </span>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Evaluator Scores</p>
                {evaluatorScores.length === 0 ? (
                  <p className="text-slate-400 text-xs">Waiting for evaluation…</p>
                ) : (
                  <div className="space-y-1">
                    {evaluatorScores.map(([metric, score]) => (
                      <div key={metric} className="flex items-center justify-between text-xs text-slate-200">
                        <span className="capitalize">{metric}</span>
                        <span className="font-semibold">{(score * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Key Questions</p>
                  {topOpenQuestions.length === 0 ? (
                    <p className="text-slate-400 text-xs mt-1">No open questions.</p>
                  ) : (
                    <ul className="mt-1 list-disc list-inside text-xs text-slate-100 space-y-1">
                      {topOpenQuestions.map((question, idx) => (
                        <li key={`${question}-${idx}`}>{question}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Latest Hypothesis</p>
                  {highlightClaims.length === 0 ? (
                    <p className="text-slate-400 text-xs mt-1">Awaiting formal claim.</p>
                  ) : (
                    <ul className="mt-1 list-disc list-inside text-xs text-slate-100 space-y-1">
                      {highlightClaims.map((claim: string, idx: number) => (
                        <li key={`${claim}-${idx}`}>{claim}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
          <div className="flex-1 flex flex-col overflow-hidden" style={CHAT_BACKGROUND_STYLE}>
            <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-4 chat-scrollbar">
              <MessageList messages={messages} />
              <AnimatePresence>{isTyping && typingAgent && <TypingIndicator agent={typingAgent} />}</AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 pb-2 text-sm text-red-100 bg-red-500/50"
              >
                {error}
              </motion.div>
            )}

            {/* Composer */}
            <form onSubmit={handleSend} className="bg-[#101a20] px-4 md:px-8 py-4 border-t border-black/10">
              <div className="flex items-center gap-3 bg-[#1f2c34] rounded-xl shadow-inner px-4 py-2">
                <button type="button" disabled className="text-slate-400">
                  <Smile size={22} />
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder}
                  disabled={Boolean(debateId) || isStarting}
                  className="flex-1 bg-transparent focus:outline-none text-[#e9edef] placeholder:text-slate-500 text-sm"
                />
                <button type="button" disabled className="text-slate-400">
                  <Paperclip size={20} />
                </button>
                <button
                  type="submit"
                  disabled={Boolean(debateId) || isStarting || !inputValue.trim()}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition ${
                    debateId || isStarting || !inputValue.trim()
                      ? 'bg-emerald-400/60 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {isStarting ? 'Starting…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

