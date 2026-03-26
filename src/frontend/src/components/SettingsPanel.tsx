import { Save, X } from "lucide-react";
import { type FC, useEffect, useId, useState } from "react";
import type { UserPreferences } from "../backend.d";
import {
  useGetOpenAIKey,
  useGetUserPrefs,
  useSetOpenAIKey,
  useUpdateUserPrefs,
} from "../hooks/useQueries";

interface SettingsPanelProps {
  onClose: () => void;
  onPrefsUpdated: (prefs: UserPreferences) => void;
}

const SettingsPanel: FC<SettingsPanelProps> = ({ onClose, onPrefsUpdated }) => {
  const { data: prefs } = useGetUserPrefs();
  const { data: savedKey } = useGetOpenAIKey();
  const updatePrefs = useUpdateUserPrefs();
  const setKey = useSetOpenAIKey();

  const [userName, setUserName] = useState("");
  const [assistantName, setAssistantName] = useState("JARVIS");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const userNameId = useId();
  const assistantNameId = useId();
  const voiceSpeedId = useId();
  const apiKeyId = useId();

  useEffect(() => {
    if (prefs) {
      setUserName(prefs.userName || "");
      setAssistantName(prefs.assistantName || "JARVIS");
      setVoiceSpeed(prefs.voiceSpeed || 1.0);
    }
  }, [prefs]);

  useEffect(() => {
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      const localKey = localStorage.getItem("jarvis_api_key") || "";
      if (localKey) setApiKey(localKey);
    }
  }, [savedKey]);

  const handleSave = async () => {
    const newPrefs = { userName, assistantName, voiceSpeed };
    localStorage.setItem("jarvis_prefs", JSON.stringify(newPrefs));
    if (apiKey) {
      localStorage.setItem("jarvis_api_key", apiKey);
    }
    await Promise.all([
      updatePrefs.mutateAsync(newPrefs),
      apiKey ? setKey.mutateAsync(apiKey) : Promise.resolve(),
    ]);
    onPrefsUpdated(newPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isPending = updatePrefs.isPending || setKey.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="settings-slide h-full w-full max-w-sm flex flex-col"
        style={{
          background: "rgba(2, 8, 14, 0.98)",
          borderLeft: "1px solid rgba(0,212,255,0.4)",
          boxShadow: "-4px 0 40px rgba(0,212,255,0.15)",
        }}
        data-ocid="settings.panel"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: "rgba(0,212,255,0.2)" }}
        >
          <div>
            <div
              className="text-xs tracking-widest"
              style={{ color: "rgba(0,212,255,0.5)" }}
            >
              SYSTEM
            </div>
            <div
              className="text-lg font-bold tracking-wider"
              style={{ color: "#00d4ff" }}
            >
              CONFIGURATION
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glow-btn rounded p-2"
            style={{
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#00d4ff",
            }}
            data-ocid="settings.close_button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* User Name */}
          <div className="space-y-2">
            <label
              htmlFor={userNameId}
              className="text-xs tracking-widest"
              style={{ color: "rgba(0,212,255,0.6)" }}
            >
              USER IDENTIFICATION
            </label>
            <input
              id={userNameId}
              className="input-hud w-full px-3 py-2 rounded text-sm"
              placeholder="Enter your name..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              data-ocid="settings.input"
            />
          </div>

          {/* Assistant Name */}
          <div className="space-y-2">
            <label
              htmlFor={assistantNameId}
              className="text-xs tracking-widest"
              style={{ color: "rgba(0,212,255,0.6)" }}
            >
              ASSISTANT DESIGNATION
            </label>
            <input
              id={assistantNameId}
              className="input-hud w-full px-3 py-2 rounded text-sm"
              placeholder="JARVIS"
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              data-ocid="settings.textarea"
            />
            <p className="text-xs" style={{ color: "rgba(0,212,255,0.35)" }}>
              Wake word for voice activation
            </p>
          </div>

          {/* Voice Speed */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label
                htmlFor={voiceSpeedId}
                className="text-xs tracking-widest"
                style={{ color: "rgba(0,212,255,0.6)" }}
              >
                VOICE SPEED
              </label>
              <span className="text-sm" style={{ color: "#00d4ff" }}>
                {voiceSpeed.toFixed(1)}x
              </span>
            </div>
            <input
              id={voiceSpeedId}
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(Number.parseFloat(e.target.value))}
              className="w-full"
              style={{
                accentColor: "#00d4ff",
                cursor: "pointer",
              }}
              data-ocid="settings.select"
            />
            <div
              className="flex justify-between text-xs"
              style={{ color: "rgba(0,212,255,0.35)" }}
            >
              <span>0.5x SLOW</span>
              <span>2.0x FAST</span>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label
              htmlFor={apiKeyId}
              className="text-xs tracking-widest"
              style={{ color: "rgba(0,212,255,0.6)" }}
            >
              AI INTERFACE KEY
            </label>
            <input
              id={apiKeyId}
              type="password"
              className="input-hud w-full px-3 py-2 rounded text-sm"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              data-ocid="settings.search_input"
            />
            <p className="text-xs" style={{ color: "rgba(0,212,255,0.35)" }}>
              OpenAI API key for AI responses
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(0,212,255,0.1)" }} />

          {/* System info */}
          <div
            className="text-xs space-y-1"
            style={{ color: "rgba(0,212,255,0.35)" }}
          >
            <div>PLATFORM: WEB SPEECH API</div>
            <div>TTS ENGINE: SYSTEM NATIVE</div>
            <div>MEMORY: LOCAL + CANISTER</div>
          </div>
        </div>

        {/* Save */}
        <div
          className="p-5 border-t"
          style={{ borderColor: "rgba(0,212,255,0.2)" }}
        >
          {saved && (
            <div
              className="text-center text-xs mb-3"
              style={{ color: "#00ff88" }}
              data-ocid="settings.success_state"
            >
              &#10003; CONFIGURATION SAVED
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-3 rounded text-sm font-bold tracking-widest glow-btn flex items-center justify-center gap-2"
            style={{
              background: isPending
                ? "rgba(0,212,255,0.05)"
                : "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.5)",
              color: "#00d4ff",
            }}
            data-ocid="settings.submit_button"
          >
            <Save size={16} />
            {isPending ? "SAVING..." : "SAVE CONFIGURATION"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
