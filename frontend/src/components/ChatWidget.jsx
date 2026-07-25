import React, { useEffect, useRef, useState } from "react";
import { http, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Send, X, MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "munim_chat_history";

const INITIAL_MSG = {
  role: "assistant",
  content: "Namaste! Main Munim Ji 🎩 — aapka finance advisor. Kharcha, savings, budget — kuch bhi puchho!",
};

const QUICK_PROMPTS = [
  "Iss mahine kaisa hisab hai?",
  "Kharcha kaise kam karun?",
  "Bachat ke tips do",
  "Udhaar kitna baaki hai?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20))); }
    catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { data } = await http.post("/ai/chat", { messages: next });
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
      setMessages([...next, {
        role: "assistant",
        content: "Bhai thoda dikkat aa gayi 😅 — thodi der baad try karo!",
      }]);
    }
    setSending(false);
  };

  const clearChat = () => {
    if (!window.confirm("Chat history clear karni hai?")) return;
    setMessages([INITIAL_MSG]);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="chat-widget-open-btn"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#2A4F4F] to-[#1a3838]
                     text-white shadow-2xl hover:scale-110 transition-all
                     flex items-center justify-center group"
          aria-label="Chat with Munim Ji"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E8B365] rounded-full flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-[#1C1917]" />
          </span>
          <span className="absolute right-full mr-3 whitespace-nowrap bg-[#1C1917] text-white text-xs
                           px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
                           pointer-events-none">
            Munim Ji se baat karo 🎩
          </span>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          data-testid="chat-widget-panel"
          className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[540px] max-h-[80vh]
                     bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#E7E5DF]
                     animate-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2A4F4F] to-[#1a3838] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#E8B365] flex items-center justify-center text-lg">
                🎩
              </div>
              <div>
                <div className="font-heading font-bold text-sm">Munim Ji</div>
                <div className="text-[11px] opacity-80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#4A7C59] rounded-full inline-block" /> Online · AI Advisor
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} data-testid="chat-clear-btn"
                className="text-[10px] opacity-70 hover:opacity-100 px-2 py-1 rounded hover:bg-white/10">
                Clear
              </button>
              <button onClick={() => setOpen(false)} data-testid="chat-widget-close-btn"
                className="p-1.5 rounded hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F9F8F6]">
            {messages.map((m, i) => (
              <div key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#E8B365] flex items-center justify-center text-sm mr-2 flex-shrink-0">
                    🎩
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug
                  ${m.role === "user"
                    ? "bg-[#2A4F4F] text-white rounded-br-md"
                    : "bg-white border border-[#E7E5DF] text-[#1C1917] rounded-bl-md"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-[#E8B365] flex items-center justify-center text-sm mr-2">
                  🎩
                </div>
                <div className="bg-white border border-[#E7E5DF] px-3 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#78716C] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#78716C] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#78716C] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts (only if just intro message) */}
          {messages.length <= 1 && !sending && (
            <div className="px-3 py-2 bg-[#F9F8F6] border-t border-[#E7E5DF]">
              <div className="text-[10px] text-[#78716C] mb-1.5 font-semibold uppercase tracking-wider">
                Quick prompts
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} onClick={() => send(p)}
                    className="text-xs bg-white border border-[#E7E5DF] hover:bg-[#F2F0EA]
                               px-2.5 py-1 rounded-full text-[#57534E] transition">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 border-t border-[#E7E5DF] flex items-center gap-2 bg-white"
          >
            <input
              ref={inputRef}
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Munim Ji se pucho..."
              className="flex-1 h-10 px-3 rounded-full border border-[#E7E5DF] focus:border-[#2A4F4F]
                         focus:ring-1 focus:ring-[#2A4F4F] text-sm bg-[#F9F8F6] outline-none"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              data-testid="chat-send-btn"
              className="rounded-full bg-[#2A4F4F] hover:bg-[#1a3838] text-white w-10 h-10 flex-shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
