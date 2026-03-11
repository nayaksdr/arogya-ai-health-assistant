import { useState, useRef, useEffect, useCallback } from "react";

const BACKEND_URL = "http://localhost:8000";

const SUGGESTIONS = [
  { en: "I have fever and headache", hi: "मुझे बुखार और सिरदर्द है", mr: "मला ताप आणि डोकेदुखी आहे" },
  { en: "I have a cold and cough", hi: "मुझे सर्दी और खांसी है", mr: "मला सर्दी आणि खोकला आहे" },
  { en: "My stomach is hurting", hi: "मेरे पेट में दर्द है", mr: "माझ्या पोटात दुखत आहे" },
  { en: "I feel very tired", hi: "मुझे बहुत थकान हो रही है", mr: "मला खूप थकवा येत आहे" },
];

const LANG_FLAGS = { English: "🇬🇧", Hindi: "🇮🇳", Marathi: "🟠" };
const LANG_LABELS = { English: "English", Hindi: "हिंदी", Marathi: "मराठी" };

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 18px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#10b981",
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
      animation: "slideIn 0.3s ease-out",
    }}>
      {!isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #10b981, #059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, marginRight: 10, flexShrink: 0, marginTop: 4,
          boxShadow: "0 2px 8px rgba(16,185,129,0.4)",
        }}>🩺</div>
      )}
      <div style={{
        maxWidth: "75%",
        background: isUser
          ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
          : msg.isError ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.95)",
        color: isUser ? "#fff" : msg.isError ? "#fca5a5" : "#1e293b",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px", fontSize: 14.5, lineHeight: 1.7,
        boxShadow: isUser ? "0 4px 15px rgba(14,165,233,0.3)" : "0 4px 15px rgba(0,0,0,0.08)",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        border: msg.isError ? "1px solid rgba(239,68,68,0.3)" : "none",
      }}>
        {!isUser && msg.lang && (
          <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {LANG_FLAGS[msg.lang]} {LANG_LABELS[msg.lang]} Detected
          </div>
        )}
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #0ea5e9, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, marginLeft: 10, flexShrink: 0, marginTop: 4,
        }}>👤</div>
      )}
    </div>
  );
}

export default function HealthAssistant() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `🌿 Namaste! Welcome to ArogyaAI\n\nI'm your personal health assistant. You can talk to me in:\n🇬🇧 English  |  🇮🇳 हिंदी  |  🟠 मराठी\n\nTell me your symptoms and I'll guide you with:\n💊 Medicine suggestions\n🥗 Diet recommendations\n🌿 Home remedies\n🔄 Recovery tips\n\nAapka swasthya, meri zimmedari! 🙏`,
    lang: null,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState("en");
  const [serverStatus, setServerStatus] = useState("checking");

  // ✅ MOVED INSIDE COMPONENT — was incorrectly placed outside before
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ MOVED INSIDE COMPONENT
  const getLangCode = () => {
    if (activeLang === "hi") return "hi-IN";
    if (activeLang === "mr") return "mr-IN";
    return "en-US";
  };

  // ✅ MOVED INSIDE COMPONENT
  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = getLangCode();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  };

  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(res => res.json())
      .then(() => setServerStatus("online"))
      .catch(() => setServerStatus("offline"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversation_history: history }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setServerStatus("online");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, lang: data.detected_language }]);
    } catch (err) {
      const errMsg = err.message.includes("fetch")
        ? "❌ Cannot reach backend server!\n\nOpen a new CMD window and run:\n\ncd \"C:\\Users\\HP\\Desktop\\AI Agent\\ai agent backend\"\nset ANTHROPIC_API_KEY=sk-ant-your-key\nuvicorn main:app --host 0.0.0.0 --port 8000"
        : `❌ Error: ${err.message}`;
      setServerStatus("offline");
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg, lang: null, isError: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const quickSend = (s) => {
    sendMessage(activeLang === "hi" ? s.hi : activeLang === "mr" ? s.mr : s.en);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #0d2d1a 50%, #0f172a 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 4px; }
        textarea:focus { outline: none; }
        .send-btn:hover { transform: scale(1.05); }
        .suggestion-chip:hover { background: rgba(16,185,129,0.25) !important; transform: translateY(-1px); }
        .lang-tab:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 700, padding: "20px 20px 0" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, padding: "16px 22px", display: "flex", alignItems: "center", gap: 14, backdropFilter: "blur(20px)" }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 4px 20px rgba(16,185,129,0.4)", animation: "float 3s ease-in-out infinite", flexShrink: 0 }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(90deg, #10b981, #34d399, #6ee7b7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5 }}>ArogyaAI</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>Multilingual Health Assistant • English • हिंदी • मराठी</div>
          </div>
          <div style={{ background: serverStatus === "online" ? "rgba(16,185,129,0.2)" : serverStatus === "offline" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)", border: `1px solid ${serverStatus === "online" ? "rgba(16,185,129,0.4)" : serverStatus === "offline" ? "rgba(239,68,68,0.4)" : "rgba(234,179,8,0.4)"}`, borderRadius: 10, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: serverStatus === "online" ? "#10b981" : serverStatus === "offline" ? "#f87171" : "#fbbf24" }}>
            {serverStatus === "online" ? "🟢 ONLINE" : serverStatus === "offline" ? "🔴 OFFLINE" : "🟡 CHECKING"}
          </div>
        </div>
      </div>

      {serverStatus === "offline" && (
        <div style={{ width: "100%", maxWidth: 700, padding: "10px 20px 0" }}>
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 16px", color: "#fca5a5", fontSize: 12 }}>
            ⚠️ Backend offline — Open new CMD and run: <span style={{ color: "#86efac" }}>uvicorn main:app --host 0.0.0.0 --port 8000</span>
          </div>
        </div>
      )}

      {/* Language Tabs */}
      <div style={{ width: "100%", maxWidth: 700, padding: "12px 20px 0" }}>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4, display: "flex", gap: 4, border: "1px solid rgba(255,255,255,0.08)" }}>
          {[{ key: "en", label: "🇬🇧 English" }, { key: "hi", label: "🇮🇳 हिंदी" }, { key: "mr", label: "🟠 मराठी" }].map((lang) => (
            <button key={lang.key} className="lang-tab" onClick={() => setActiveLang(lang.key)} style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s", background: activeLang === lang.key ? "linear-gradient(135deg, #10b981, #059669)" : "transparent", color: activeLang === lang.key ? "#fff" : "rgba(255,255,255,0.5)", boxShadow: activeLang === lang.key ? "0 2px 10px rgba(16,185,129,0.4)" : "none" }}>
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Suggestions */}
      <div style={{ width: "100%", maxWidth: 700, padding: "10px 20px 0", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="suggestion-chip" onClick={() => quickSend(s)} style={{ padding: "6px 14px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 20, color: "rgba(255,255,255,0.7)", fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
              {activeLang === "hi" ? s.hi : activeLang === "mr" ? s.mr : s.en}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ width: "100%", maxWidth: 700, flex: 1, padding: "12px 20px", overflowY: "auto", minHeight: 0, maxHeight: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🩺</div>
            <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: "18px 18px 18px 4px" }}><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ width: "100%", maxWidth: 700, padding: "0 20px 20px" }}>
        <div style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${serverStatus === "offline" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 20, padding: "12px 12px 12px 18px", display: "flex", gap: 10, alignItems: "flex-end", backdropFilter: "blur(20px)" }}>

          <textarea
            ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={activeLang === "hi" ? "अपने लक्षण बताएं..." : activeLang === "mr" ? "तुमची लक्षणे सांगा..." : "Describe your symptoms..."}
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 14.5, lineHeight: 1.6, resize: "none", minHeight: 24, maxHeight: 100, fontFamily: "inherit", overflowY: "auto" }}
            onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
          />

          {/* 🎙️ MIC BUTTON */}
          <button
            onClick={toggleVoiceInput}
            title={activeLang === "hi" ? "बोलें" : activeLang === "mr" ? "बोला" : "Speak"}
            style={{
              width: 44, height: 44, borderRadius: 14, border: "none", flexShrink: 0,
              background: isListening
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "rgba(255,255,255,0.1)",
              color: "#fff", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: isListening ? "0 0 12px rgba(239,68,68,0.6)" : "none",
              animation: isListening ? "pulse 1.2s infinite" : "none",
            }}
          >
            {isListening ? "🔴" : "🎙️"}
          </button>

          {/* ➤ SEND BUTTON */}
          <button
            className="send-btn"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{ width: 44, height: 44, borderRadius: 14, border: "none", background: loading || !input.trim() ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 20, cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}
          >
            {loading ? "⏳" : "➤"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          ⚕️ For emergencies, always call 112 or visit nearest hospital
        </div>
      </div>
    </div>
  );
}