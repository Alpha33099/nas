"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_REPLIES = [
  "Which plan is best for me?",
  "Is my phone compatible?",
  "Can I use Simwaya on a non-PTA phone?",
  "Does Simwaya work in my country?",
  "How much data do I need?",
  "How do I activate my eSIM?",
];

export function SimwayaAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-simwaya-ai", handler);
    return () => window.removeEventListener("open-simwaya-ai", handler);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversation: newMessages }),
      });

      if (!res.ok) throw new Error("failed");

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-navy-950 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xl transition-all hover:bg-navy-900 hover:scale-105"
        type="button"
      >
        <Sparkles size={16} className="text-teal-400" />
        Simwaya AI
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/40 sm:items-end sm:justify-end sm:bg-transparent sm:p-5 backdrop-blur-xs">
          <div className="flex h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[580px] sm:w-96 sm:rounded-2xl border border-navy-900/10">
            <div className="flex items-center justify-between border-b border-navy-900/10 px-5 py-3.5 bg-mist-50 rounded-t-2xl">
              <div>
                <p className="flex items-center gap-1.5 font-display text-sm font-bold text-navy-950">
                  <Sparkles size={14} className="text-teal-600" />
                  Simwaya AI
                </p>
                <p className="text-[11px] text-ink-400">Travel Connectivity Assistant</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-ink-400 hover:text-navy-950"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <>
                  <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                    Hi! I&apos;m Simwaya AI. I can help you choose a plan, check device
                    compatibility, understand coverage, and learn how to activate your eSIM.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        type="button"
                        className="rounded-full border border-navy-900/15 bg-white px-2.5 py-1 text-[11px] text-navy-950 transition-colors hover:bg-navy-900/5 shadow-2xs"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-navy-950 text-white"
                      : "bg-mist-100 text-navy-950"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose-chat text-xs sm:text-sm">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              ))}

              {loading && (
                <div className="max-w-[85%] rounded-2xl bg-mist-100 px-3.5 py-2 text-xs text-ink-400">
                  Thinking...
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-red-50 px-3.5 py-2 text-xs text-red-700">
                  Simwaya AI is temporarily unavailable. You can still browse our plans or
                  message us on Instagram.
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2 border-t border-navy-900/10 px-3.5 py-2.5 bg-white rounded-b-2xl"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Simwaya AI..."
                className="flex-1 rounded-full border border-navy-900/15 px-3.5 py-1.5 text-xs outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-950 text-white disabled:opacity-40 transition"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
