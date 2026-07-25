import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { http, formatApiError } from "@/lib/api";
import { toast } from "sonner";

/**
 * VoiceInput — Web Speech API + backend parser.
 * onParsed({amount, type, category, note, confidence})
 */
export default function VoiceInput({ onParsed, disabled }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = typeof window !== "undefined"
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "hi-IN"; // Hinglish → hi-IN gives good results
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript;
      }
      setTranscript(full);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "no-speech") toast.error(`Voice error: ${e.error}`);
    };
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
    };
  }, []);

  const start = () => {
    if (!recRef.current) return;
    setTranscript("");
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      // already listening
    }
  };

  const stop = async () => {
    if (recRef.current) recRef.current.stop();
    setListening(false);
    if (!transcript.trim()) return;
    setParsing(true);
    try {
      const { data } = await http.post("/voice/parse-transaction", { text: transcript });
      toast.success(`✓ Parsed: ${data.category} · ₹${data.amount}`);
      onParsed?.(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
    setParsing(false);
  };

  if (!supported) {
    return (
      <div className="text-xs text-[#78716C] italic">
        Voice input aapke browser me support nahi hai (Chrome/Edge try karo)
      </div>
    );
  }

  return (
    <div className="border border-dashed border-[#4A7C59]/40 rounded-xl p-3 bg-[#4A7C59]/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
            ${listening ? "bg-[#D96C52] animate-pulse" : "bg-[#4A7C59]"}`}>
            {parsing ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : listening ? (
              <Mic className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#3B6446]">
              {listening ? "🎤 Sun raha hoon..." : parsing ? "Parse ho raha hai..." : "Bolke transaction add karo"}
            </div>
            <div className="text-xs text-[#57534E] truncate italic">
              {transcript || (!listening && "e.g., \"500 rupaye zomato pe\" ya \"salary 50000 aayi\"")}
            </div>
          </div>
        </div>
        {listening ? (
          <Button size="sm" onClick={stop} data-testid="voice-stop-btn"
            className="bg-[#D96C52] hover:bg-[#B15039] text-white rounded-full">
            <MicOff className="w-4 h-4 mr-1" /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={disabled || parsing}
            data-testid="voice-start-btn"
            className="bg-[#4A7C59] hover:bg-[#3B6446] text-white rounded-full">
            <Mic className="w-4 h-4 mr-1" /> Bolo
          </Button>
        )}
      </div>
    </div>
  );
}
