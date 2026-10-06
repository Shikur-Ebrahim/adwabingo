import { useState, useRef, useEffect } from 'react';
import { Send, Bot, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

const API = import.meta.env.VITE_API_URL || '';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  '👋 How do I start playing?',
  '💰 How do I deposit?',
  '🏆 How does BINGO work?',
  '📤 How to withdraw?',
  '🎯 What is Derash?',
  '🃏 How many cartelas can I buy?',
];

export default function SupportPage() {
  const { user } = useGameStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Hi ${user?.first_name || 'there'}! I'm your ADWA Bingo AI assistant.\n\nI can help you with:\n• How to play & game rules\n• Deposit & withdrawal help\n• Prize pool (Derash) questions\n• Any other questions about ADWA Bingo\n\nHow can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API}/support/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': (window as any).Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ message: text.trim(), history }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Sorry, I couldn\'t reach the server. Please try again in a moment.',
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Network error. Please check your connection and try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showQuickQuestions = messages.length <= 2 && !loading;

  return (
    <div className="flex flex-col h-screen bg-slate-50" style={{ maxHeight: '100dvh' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 pt-3 pb-3 flex items-center gap-3 flex-shrink-0 shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Bot size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-base leading-none">ADWA AI Support</p>
          <p className="text-violet-200 text-[11px] font-medium mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Online — Powered by Groq AI
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4" style={{ paddingBottom: showQuickQuestions ? '180px' : '80px' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-md">
                <Bot size={15} className="text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-md'
                : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot size={15} className="text-white" />
            </div>
            <div className="bg-white shadow-sm border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {showQuickQuestions && (
        <div className="fixed left-0 right-0 bg-white border-t border-slate-100 px-3 py-2 flex flex-col gap-2" style={{ bottom: '72px' }}>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Quick Questions</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-bold rounded-full active:scale-95 transition-all whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="fixed left-0 right-0 bottom-0 px-3 py-2.5 bg-white border-t border-slate-100 flex gap-2 items-center shadow-lg" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60 border border-slate-200"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 shadow-md flex-shrink-0"
        >
          <Send size={16} className="text-white translate-x-[1px]" />
        </button>
      </div>
    </div>
  );
}
