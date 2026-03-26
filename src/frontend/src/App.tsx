import { Mic, MicOff, Send, Settings, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UserPreferences } from "./backend.d";
import ArcReactor from "./components/ArcReactor";
import SettingsPanel from "./components/SettingsPanel";
import {
  useClearHistory,
  useGetUserPrefs,
  useSendOpenAIRequest,
} from "./hooks/useQueries";

type AppStatus = "online" | "listening" | "processing" | "speaking" | "standby";

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const STATUS_LABELS: Record<AppStatus, string> = {
  online: "SYSTEM ONLINE",
  listening: "LISTENING",
  processing: "PROCESSING",
  speaking: "SPEAKING",
  standby: "STANDBY",
};

const STATUS_COLORS: Record<AppStatus, string> = {
  online: "#00ff88",
  listening: "#00d4ff",
  processing: "#00aaff",
  speaking: "#00ccff",
  standby: "rgba(0,212,255,0.4)",
};

const SYSTEM_PROMPT = `You are JARVIS, an AI assistant inspired by Iron Man. Respond in a precise, helpful, slightly formal British tone. Keep responses concise and clear. Address the user as 'sir' occasionally. Never break character.`;

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>("online");
  const [micOn, setMicOn] = useState(false);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [interimText, setInterimText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [prefs, setPrefs] = useState<UserPreferences>({
    userName: "",
    assistantName: "JARVIS",
    voiceSpeed: 1.0,
  });
  const hasGreetedRef = useRef(false);
  const micOnRef = useRef(false);

  const recognitionRef = useRef<any>(null);
  const commandBuffer = useRef("");
  const commandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthRef = useRef(window.speechSynthesis);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prefsRef = useRef(prefs);
  // Keep local conversation history for context window
  const localHistoryRef = useRef<ConvMessage[]>([]);

  const { data: fetchedPrefs } = useGetUserPrefs();
  const sendOpenAI = useSendOpenAIRequest();
  const clearHistory = useClearHistory();

  // Keep refs in sync
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  // Load prefs
  useEffect(() => {
    const localRaw = localStorage.getItem("jarvis_prefs");
    const local = localRaw ? (JSON.parse(localRaw) as UserPreferences) : null;
    if (fetchedPrefs?.assistantName) {
      setPrefs(fetchedPrefs);
    } else if (local) {
      setPrefs(local);
    }
  }, [fetchedPrefs]);

  // Sync local history ref
  useEffect(() => {
    localHistoryRef.current = messages;
  }, [messages]);

  // Scroll to bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // TTS
  const speak = useCallback((text: string, onEnd?: () => void) => {
    const synth = synthRef.current;
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = prefsRef.current.voiceSpeed;
    utt.pitch = 0.85;
    const voices = synth.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes("Google UK English Male") ||
        v.name.includes("Daniel") ||
        v.name.includes("David") ||
        (v.lang.startsWith("en") && v.name.toLowerCase().includes("male")),
    );
    if (preferred) utt.voice = preferred;
    utt.onstart = () => setStatus("speaking");
    utt.onend = () => {
      setStatus(micOnRef.current ? "listening" : "online");
      onEnd?.();
    };
    utt.onerror = () => {
      setStatus(micOnRef.current ? "listening" : "online");
      onEnd?.();
    };
    synth.speak(utt);
  }, []);

  // Greeting — fires once voices are loaded
  useEffect(() => {
    if (hasGreetedRef.current) return;

    const doGreet = () => {
      if (hasGreetedRef.current) return;
      hasGreetedRef.current = true;
      const name = prefsRef.current.userName;
      const greeting = name
        ? `Welcome back, ${name}. All systems are operational.`
        : `${prefsRef.current.assistantName} online. How may I assist you?`;
      speak(greeting);
    };

    // Wait for voices to load, then greet
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (voices.length > 0) {
      const timer = setTimeout(doGreet, 600);
      return () => clearTimeout(timer);
    }
    // Voices not ready yet — listen for voiceschanged
    const onVoices = () => {
      synth.removeEventListener("voiceschanged", onVoices);
      setTimeout(doGreet, 300);
    };
    synth.addEventListener("voiceschanged", onVoices);
    // Fallback in case voiceschanged never fires
    const fallback = setTimeout(doGreet, 2000);
    return () => {
      synth.removeEventListener("voiceschanged", onVoices);
      clearTimeout(fallback);
    };
  }, [speak]);

  // Process a command — builds OpenAI message array with history context
  const processCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return;
      setStatus("processing");
      setInterimText("");

      const userMsg: ConvMessage = {
        role: "user",
        content: command,
        id: generateId(),
      };
      setMessages((prev) => [...prev, userMsg]);

      if (!navigator.onLine) {
        const errMsg = "No internet connection, sir.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errMsg, id: generateId() },
        ]);
        speak(errMsg);
        return;
      }

      // Build OpenAI messages array with recent history
      const history = localHistoryRef.current.slice(-10);
      const openAIMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: command },
      ];

      const requestBody = JSON.stringify({
        model: "gpt-4o-mini",
        messages: openAIMessages,
        max_tokens: 300,
        temperature: 0.7,
      });

      try {
        const rawResponse = await sendOpenAI.mutateAsync(requestBody);
        // Parse OpenAI response JSON
        let replyText: string;
        try {
          const parsed = JSON.parse(rawResponse);
          replyText =
            parsed?.choices?.[0]?.message?.content ||
            "No response received, sir.";
        } catch {
          // If parsing fails, use raw response
          replyText = rawResponse || "No response received, sir.";
        }

        const assistantMsg: ConvMessage = {
          role: "assistant",
          content: replyText,
          id: generateId(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        speak(replyText);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errMsg = errorMessage.includes("API key not set")
          ? "Please open Config and save your OpenAI API key, sir."
          : `AI systems error: ${errorMessage.slice(0, 80)}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errMsg, id: generateId() },
        ]);
        speak(errMsg);
      }
    },
    [sendOpenAI, speak],
  );

  // Speech recognition
  const startRecognition = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (event.results[i].isFinal) {
          final += `${transcript} `;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim || final);
      if (final) {
        commandBuffer.current += final;
        if (commandTimer.current) clearTimeout(commandTimer.current);
        commandTimer.current = setTimeout(() => {
          const cmd = commandBuffer.current.trim();
          commandBuffer.current = "";
          setInterimText("");
          if (cmd) processCommand(cmd);
        }, 1500);
      }
    };

    rec.onerror = () => {
      if (micOnRef.current) {
        setTimeout(() => startRecognition(), 1000);
      }
    };

    rec.onend = () => {
      if (micOnRef.current) {
        setTimeout(() => startRecognition(), 300);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [processCommand]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (micOnRef.current) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      commandBuffer.current = "";
      setMicOn(false);
      setStatus("standby");
      setInterimText("");
    } else {
      setMicOn(true);
      setStatus("listening");
      startRecognition();
    }
  }, [startRecognition]);

  useEffect(() => {
    if (micOn && !recognitionRef.current) {
      startRecognition();
    }
  }, [micOn, startRecognition]);

  const handleClearHistory = async () => {
    await clearHistory.mutateAsync();
    setMessages([]);
  };

  const handleTextSubmit = () => {
    const cmd = textInput.trim();
    if (!cmd) return;
    setTextInput("");
    processCommand(cmd);
  };

  const currentYear = new Date().getFullYear();
  const isProcessing = sendOpenAI.isPending;

  return (
    <div
      className="hud-bg scanlines min-h-screen flex flex-col relative"
      style={{
        background: "#000000",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* HUD Corner Brackets */}
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Top status bar */}
      <header className="relative z-10 px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div
            className="text-xs tracking-widest"
            style={{ color: "rgba(0,212,255,0.4)" }}
          >
            SYS.VER 3.0.7 — ICP CANISTER
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "#00ff88", boxShadow: "0 0 6px #00ff88" }}
            />
            <span
              className="text-xs tracking-widest"
              style={{ color: "#00ff88" }}
            >
              SECURE CONNECTION
            </span>
          </div>
          <div
            className="text-xs tracking-widest"
            style={{ color: "rgba(0,212,255,0.4)" }}
          >
            {new Date()
              .toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })
              .toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 pb-4">
        {/* Title */}
        <motion.div
          className="text-center mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1
            className="text-5xl font-bold tracking-[0.4em] glow-text"
            style={{ color: "#00d4ff" }}
          >
            JARVIS
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div
              className="w-1.5 h-1.5 rounded-full blink-anim"
              style={{ background: STATUS_COLORS[status] }}
            />
            <span
              className="text-xs tracking-[0.3em]"
              style={{ color: STATUS_COLORS[status], transition: "color 0.3s" }}
            >
              {STATUS_LABELS[status]}
              {(status === "listening" || status === "processing") && (
                <span className="status-dots" />
              )}
            </span>
          </div>
        </motion.div>

        {/* Thin HUD line */}
        <div
          className="w-full max-w-lg mb-4"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(0,212,255,0.4), transparent)",
          }}
        />

        {/* Arc Reactor */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="my-2"
        >
          <ArcReactor status={status} />
        </motion.div>

        {/* Interim speech text */}
        <AnimatePresence>
          {interimText && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-center max-w-md mt-2 mb-1"
              style={{ color: "rgba(0,212,255,0.6)" }}
            >
              &gt; {interimText}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thin HUD line */}
        <div
          className="w-full max-w-lg mt-4 mb-3"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(0,212,255,0.3), transparent)",
          }}
        />

        {/* Conversation Feed */}
        <div
          className="w-full max-w-2xl rounded overflow-y-auto"
          style={{
            maxHeight: 220,
            background: "rgba(0,10,18,0.85)",
            border: "1px solid rgba(0,212,255,0.15)",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          {messages.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-8 text-xs tracking-widest"
              style={{ color: "rgba(0,212,255,0.25)" }}
            >
              <div>NO COMMUNICATION LOG</div>
              <div className="mt-1">AWAITING INPUT</div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {messages.map((msg, _i) => (
                <motion.div
                  key={msg.id}
                  className="msg-animate"
                  initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div
                        className="text-xs max-w-xs px-3 py-1.5"
                        style={{
                          background: "rgba(0,212,255,0.06)",
                          border: "1px solid rgba(0,212,255,0.3)",
                          color: "#e0f7fa",
                          borderRadius: "4px 0 4px 4px",
                        }}
                      >
                        <span style={{ color: "rgba(0,212,255,0.5)" }}>
                          YOU:{" "}
                        </span>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div
                        className="text-xs max-w-sm px-3 py-1.5"
                        style={{
                          background: "rgba(0,150,180,0.05)",
                          border: "1px solid rgba(0,212,255,0.15)",
                          color: "#b2ebf2",
                          borderRadius: "0 4px 4px 4px",
                        }}
                      >
                        <span style={{ color: "#00d4ff" }}>
                          {prefs.assistantName}:{" "}
                        </span>
                        {msg.content}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div
                    className="text-xs px-3 py-1.5"
                    style={{
                      background: "rgba(0,150,180,0.05)",
                      border: "1px solid rgba(0,212,255,0.15)",
                      color: "rgba(0,212,255,0.5)",
                      borderRadius: "0 4px 4px 4px",
                    }}
                  >
                    <span style={{ color: "#00d4ff" }}>
                      {prefs.assistantName}:{" "}
                    </span>
                    <span className="status-dots" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5 mt-5">
          {/* Mic toggle */}
          <button
            type="button"
            onClick={toggleMic}
            className={`rounded-full flex items-center justify-center glow-btn ${micOn ? "mic-active" : ""}`}
            style={{
              width: 70,
              height: 70,
              background: micOn
                ? "rgba(0,212,255,0.12)"
                : "rgba(0,212,255,0.05)",
              border: `2px solid ${micOn ? "rgba(0,212,255,0.8)" : "rgba(0,212,255,0.3)"}`,
              color: micOn ? "#00d4ff" : "rgba(0,212,255,0.5)",
            }}
          >
            {micOn ? <Mic size={28} /> : <MicOff size={28} />}
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClearHistory}
            disabled={clearHistory.isPending}
            className="rounded flex items-center gap-2 px-4 py-2 text-xs tracking-widest glow-btn"
            style={{
              background: "rgba(0,212,255,0.04)",
              border: "1px solid rgba(0,212,255,0.25)",
              color: "rgba(0,212,255,0.6)",
            }}
          >
            <Trash2 size={14} />
            CLEAR
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded flex items-center gap-2 px-4 py-2 text-xs tracking-widest glow-btn"
            style={{
              background: "rgba(0,212,255,0.04)",
              border: "1px solid rgba(0,212,255,0.25)",
              color: "rgba(0,212,255,0.6)",
            }}
          >
            <Settings size={14} />
            CONFIG
          </button>
        </div>

        {/* Text input */}
        <div className="flex items-center gap-2 mt-4 w-full max-w-2xl">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder="TYPE A COMMAND..."
            disabled={isProcessing}
            className="flex-1 bg-transparent text-xs tracking-widest outline-none px-3 py-2 rounded"
            style={{
              background: "rgba(0,10,18,0.85)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#00d4ff",
              caretColor: "#00d4ff",
            }}
          />
          <button
            type="button"
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isProcessing}
            className="flex items-center justify-center rounded px-3 py-2 glow-btn"
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.35)",
              color:
                textInput.trim() && !isProcessing
                  ? "#00d4ff"
                  : "rgba(0,212,255,0.3)",
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </main>

      {/* Bottom status bar */}
      <footer className="relative z-10 px-8 py-4">
        <div
          style={{
            borderTop: "1px solid rgba(0,212,255,0.12)",
            paddingTop: "12px",
          }}
        >
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: "rgba(0,212,255,0.35)" }}
          >
            <div className="tracking-widest">
              CPU: 42% | MEM: 2.1 GB | NET:{" "}
              {navigator.onLine ? "ONLINE" : "OFFLINE"}
            </div>
            <div className="tracking-widest">
              VOICE: {prefs.voiceSpeed.toFixed(1)}x | MODEL: GPT-4O-MINI
            </div>
            <div>
              &copy; {currentYear}.{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(0,212,255,0.5)" }}
              >
                caffeine.ai
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onPrefsUpdated={(p) => {
              setPrefs(p);
              setShowSettings(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
