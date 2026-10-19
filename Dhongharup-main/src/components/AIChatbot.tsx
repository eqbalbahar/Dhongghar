import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Bot } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

interface Msg { role: 'user' | 'assistant'; text: string }

export function AIChatbot() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: "Hi! I'm the DHONG GHAR AI assistant. Ask me about products, sizing, shipping, returns, or track an order." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    const next = [...msgs, { role: 'user' as const, text }];
    setMsgs(next);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: next.slice(-10).map((m) => ({ role: m.role, content: m.text })) }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const reply = data.reply || "I'm sorry, I couldn't process that right now.";
      setMsgs((m) => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: "I'm having trouble connecting right now. Please try again or contact us via the details in the footer." }]);
    }
    setBusy(false);
  };

  return (
    <>
      {/* Launcher */}
      <div className="group fixed bottom-5 right-5 z-[70]">
        <motion.button
          onClick={() => setOpen(true)}
          initial={{ scale: 0 }} animate={{ scale: open ? 0 : 1 }}
          className="grid h-14 w-14 place-items-center rounded-full bg-gold-sheen shadow-gold-glow"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open AI assistant"
        >
          <Sparkles size={22} className="text-ink-950" />
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-glow-pulse rounded-full bg-accent-400 ring-2 ring-ink-950" />
        </motion.button>
        <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-gold-400/20 bg-ink-950/90 px-3 py-1.5 text-xs text-gold-200 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
          Ask our AI assistant
        </span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed bottom-4 right-4 z-[71] flex h-[520px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-white/15 bg-ink-900/95 shadow-glass-lg backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-gold-400/15 to-transparent p-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold-sheen"><Bot size={17} className="text-ink-950" /></div>
                <div>
                  <p className="font-display text-sm font-semibold text-ink-50">DHONG GHAR AI</p>
                  <p className="flex items-center gap-1 text-[10px] text-accent-300"><span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> Online</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-ink-300 hover:bg-white/10 hover:text-ink-50"><X size={16} /></button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-gold-sheen text-ink-950' : 'bg-white/[0.06] text-ink-100'}`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl bg-white/[0.06] px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-gold-400" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                  placeholder="Ask about products, orders, shipping…"
                  className="flex-1 bg-transparent px-2.5 text-sm text-ink-50 outline-none placeholder-ink-500"
                />
                <button onClick={send} disabled={busy || !input.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-gold-sheen text-ink-950 disabled:opacity-40">
                  <Send size={15} />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-ink-500">Powered by Gemini · DHONG GHAR Customer Care</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
