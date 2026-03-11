import { useState, useRef, useEffect, useCallback } from "react";
import logo from "./assets/icon/ArogyaAILogo.png"; 

const BACKEND_URL = "http://localhost:8000";

const SUGGESTIONS = [
  { en: "I have fever and headache", hi: "मुझे बुखार और सिरदर्द है", mr: "मला ताप आणि डोकेदुखी आहे" },
  { en: "I have a cold and cough", hi: "मुझे सर्दी और खांसी है", mr: "मला सर्दी आणि खोकला आहे" },
  { en: "My stomach is hurting", hi: "मेरे पेट में दर्द है", mr: "माझ्या पोटात दुखत आहे" },
  { en: "I feel very tired", hi: "मुझे बहुत थकान हो रही है", mr: "मला खूप थकवा येत आहे" },
];

const LANG_FLAGS = { English: "🇬🇧", Hindi: "🇮🇳", Marathi: "🟠" };
const LANG_LABELS = { English: "English", Hindi: "हिंदी", Marathi: "मराठी" };

// ── SVG Icons ──────────────────────────────────────────────
const SendIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
);

const HeartIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#10b981" stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// ── Typing Dots ────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 6, padding: "16px 20px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 9, height: 9, borderRadius: "50%",
          background: "#10b981",
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`msg-row ${isUser ? "msg-user" : "msg-ai"}`}>
      {!isUser && <div className="avatar avatar-ai">🩺</div>}
      <div className={`bubble ${isUser ? "bubble-user" : msg.isError ? "bubble-error" : "bubble-ai"}`}>
        {!isUser && msg.lang && (
          <div className="lang-badge">
            {LANG_FLAGS[msg.lang]} {LANG_LABELS[msg.lang]} Detected
          </div>
        )}
        {msg.content}
      </div>
      {isUser && <div className="avatar avatar-user">👤</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function HealthAssistant() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `🌿 Namaste! Welcome to ArogyaAI\n\nI'm your personal health assistant. You can talk to me in:\n🇬🇧 English  |  🇮🇳 हिंदी  |  🟠 मराठी\n\nTell me your symptoms and I'll guide you with:\n💊 Medicine suggestions\n🥗 Diet recommendations\n🌿 Home remedies\n🔄 Recovery tips\n\nAapka swasthya, meri zimmedari! 🙏`,
    lang: null,
  }]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [activeLang, setActiveLang] = useState("en");
  const [serverStatus, setServerStatus] = useState("checking");
  const [isListening, setIsListening]   = useState(false);

  const recognitionRef = useRef(null);
  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);

  // ── Voice Input ──────────────────────────────────────────
  const getLangCode = () => {
    if (activeLang === "hi") return "hi-IN";
    if (activeLang === "mr") return "mr-IN";
    return "en-US";
  };

  const toggleVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported. Try Chrome."); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = getLangCode();
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + t : t));
    };
    rec.start();
  };

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(r => r.json())
      .then(() => setServerStatus("online"))
      .catch(() => setServerStatus("offline"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Send Message ─────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((p) => [...p, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversation_history: history }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || `Error ${res.status}`); }
      const data = await res.json();
      setServerStatus("online");
      setMessages((p) => [...p, { role: "assistant", content: data.reply, lang: data.detected_language }]);
    } catch (err) {
      const errMsg = err.message.includes("fetch")
        ? `❌ Cannot reach backend!\n\nRun in CMD:\n\ncd "C:\\Users\\HP\\Desktop\\AI Agent\\ai agent backend"\nuvicorn main:app --host 0.0.0.0 --port 8000`
        : `❌ Error: ${err.message}`;
      setServerStatus("offline");
      setMessages((p) => [...p, { role: "assistant", content: errMsg, lang: null, isError: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading]);

  const handleKey  = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
  const quickSend  = (s) => sendMessage(activeLang === "hi" ? s.hi : activeLang === "mr" ? s.mr : s.en);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Outfit:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --green:        #10b981;
          --green-dark:   #059669;
          --green-dim:    rgba(16,185,129,0.14);
          --green-border: rgba(16,185,129,0.28);
          --blue:         #0ea5e9;
          --red:          #ef4444;
          --font:         'Outfit', 'Nunito', system-ui, sans-serif;
        }

        html, body, #root { height: 100%; width: 100%; overflow: hidden; }

        ::-webkit-scrollbar       { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--green-border); border-radius: 5px; }

        @keyframes bounce  { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-9px)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float   { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-7px) rotate(3deg)} }
        @keyframes pulse   { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,0.5)} 50%{transform:scale(1.06);box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes glow    { 0%,100%{opacity:.55} 50%{opacity:1} }

        /* ROOT */
        .app-root {
          height: 100vh; width: 100vw;
          background: radial-gradient(ellipse at 20% 0%, #0d3320 0%, #0b1a12 40%),
                      radial-gradient(ellipse at 80% 100%, #0a2a1a 0%, #0b1510 50%);
          font-family: var(--font);
          display: flex; flex-direction: column;
          color: #f0fdf4;
          overflow: hidden;
          position: relative;
        }
        .app-root::before {
          content:''; position:fixed; top:-120px; left:-120px;
          width:480px; height:480px;
          background:radial-gradient(circle,rgba(16,185,129,.12) 0%,transparent 70%);
          border-radius:50%; pointer-events:none;
          animation: glow 4s ease-in-out infinite;
        }
        .app-root::after {
          content:''; position:fixed; bottom:-100px; right:-100px;
          width:400px; height:400px;
          background:radial-gradient(circle,rgba(14,165,233,.08) 0%,transparent 70%);
          border-radius:50%; pointer-events:none;
        }

        /* HEADER */
        .header {
          flex-shrink:0;
          padding:14px 28px;
          background:rgba(11,26,18,.88);
          backdrop-filter:blur(24px);
          border-bottom:1px solid var(--green-border);
          display:flex; align-items:center; gap:16px;
          z-index:10;
        }
        .logo-wrap {
          width:56px; height:56px;
          background:linear-gradient(135deg,var(--green),var(--green-dark));
          border-radius:17px;
          display:flex; align-items:center; justify-content:center;
          font-size:28px;
          box-shadow:0 4px 24px rgba(16,185,129,.45);
          animation:float 3.5s ease-in-out infinite;
          flex-shrink:0;
        }
        .logo-title {
          font-size:clamp(20px,2.8vw,28px);
          font-weight:900;
          background:linear-gradient(90deg,#10b981,#34d399,#6ee7b7,#10b981);
          background-size:200% auto;
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          animation:shimmer 3s linear infinite;
          letter-spacing:-.5px; line-height:1.1;
        }
        .logo-sub {
          font-size:clamp(11px,1.4vw,13.5px);
          color:rgba(255,255,255,.45);
          margin-top:3px; font-weight:500;
        }
        .status-badge {
          padding:6px 16px; border-radius:30px;
          font-size:clamp(11px,1.3vw,13px); font-weight:700;
          letter-spacing:.5px; white-space:nowrap; flex-shrink:0;
        }
        .s-online  { background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.4);  color:#10b981; }
        .s-offline { background:rgba(239,68,68,.15);  border:1px solid rgba(239,68,68,.4);   color:#f87171; }
        .s-check   { background:rgba(234,179,8,.15);  border:1px solid rgba(234,179,8,.4);   color:#fbbf24; }

        /* OFFLINE BANNER */
        .offline-banner {
          flex-shrink:0; margin:10px 24px 0;
          background:rgba(239,68,68,.12);
          border:1px solid rgba(239,68,68,.3);
          border-radius:12px; padding:10px 18px;
          font-size:clamp(12px,1.4vw,14px); color:#fca5a5;
        }
        .offline-banner span { color:#86efac; font-weight:700; }

        /* LANG TABS */
        .lang-bar { flex-shrink:0; padding:12px 24px 0; }
        .lang-tabs {
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
          border-radius:16px; padding:5px;
          display:flex; gap:5px;
          max-width:500px; margin:0 auto;
        }
        .lang-tab {
          flex:1; padding:10px 14px;
          border-radius:11px; border:none; cursor:pointer;
          font-size:clamp(13px,1.7vw,15.5px); font-weight:700;
          font-family:var(--font); transition:all .25s;
          background:transparent; color:rgba(255,255,255,.45);
        }
        .lang-tab.active {
          background:linear-gradient(135deg,var(--green),var(--green-dark));
          color:#fff; box-shadow:0 3px 14px rgba(16,185,129,.4);
        }
        .lang-tab:hover:not(.active) { background:rgba(255,255,255,.08); color:rgba(255,255,255,.8); }

        /* SUGGESTIONS */
        .suggestions { flex-shrink:0; padding:10px 24px 0; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .suggestions::-webkit-scrollbar { display:none; }
        .sugg-inner { display:flex; gap:9px; width:max-content; padding-bottom:2px; }
        .chip {
          padding:8px 16px;
          background:var(--green-dim); border:1px solid var(--green-border);
          border-radius:30px; color:rgba(255,255,255,.78);
          font-size:clamp(12px,1.5vw,14.5px); font-family:var(--font); font-weight:600;
          cursor:pointer; white-space:nowrap; transition:all .2s;
          display:flex; align-items:center; gap:7px;
        }
        .chip:hover { background:rgba(16,185,129,.28); transform:translateY(-2px); box-shadow:0 4px 14px rgba(16,185,129,.2); }

        /* CHAT */
        .chat-area {
          flex:1; overflow-y:auto;
          padding:20px 28px;
          display:flex; flex-direction:column; gap:2px;
          min-height:0;
        }
        .msg-row {
          display:flex; align-items:flex-end; gap:12px;
          animation:slideIn .3s ease-out; margin-bottom:14px;
        }
        .msg-user { justify-content:flex-end; }
        .msg-ai   { justify-content:flex-start; }

        .avatar {
          width:42px; height:42px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:21px; flex-shrink:0; margin-bottom:2px;
        }
        .avatar-ai   { background:linear-gradient(135deg,var(--green),var(--green-dark)); box-shadow:0 2px 12px rgba(16,185,129,.4); }
        .avatar-user { background:linear-gradient(135deg,var(--blue),#7c3aed); }

        .bubble {
          max-width:min(70%, 760px);
          padding:15px 20px;
          font-size:clamp(14.5px,1.7vw,17px);
          line-height:1.78; white-space:pre-wrap;
          word-break:break-word; font-weight:500;
        }
        .bubble-user  { background:linear-gradient(135deg,#0ea5e9,#0284c7); color:#fff; border-radius:20px 20px 4px 20px; box-shadow:0 4px 18px rgba(14,165,233,.3); }
        .bubble-ai    { background:rgba(255,255,255,.96); color:#1e293b; border-radius:20px 20px 20px 4px; box-shadow:0 4px 18px rgba(0,0,0,.1); }
        .bubble-error { background:rgba(239,68,68,.13); color:#fca5a5; border:1px solid rgba(239,68,68,.3); border-radius:20px 20px 20px 4px; }

        .lang-badge { font-size:11.5px; color:var(--green); font-weight:800; margin-bottom:7px; letter-spacing:.6px; text-transform:uppercase; }

        /* INPUT */
        .input-wrap {
          flex-shrink:0;
          padding:12px 28px 18px;
          background:rgba(11,26,18,.75);
          backdrop-filter:blur(20px);
          border-top:1px solid var(--green-border);
        }
        .input-box {
          background:rgba(255,255,255,.06);
          border:1.5px solid var(--green-border);
          border-radius:24px; padding:13px 13px 13px 22px;
          display:flex; gap:11px; align-items:flex-end;
          transition:border-color .2s, box-shadow .2s;
          max-width:920px; margin:0 auto;
        }
        .input-box:focus-within { border-color:rgba(16,185,129,.65); box-shadow:0 0 0 4px rgba(16,185,129,.07); }
        .input-box.offline      { border-color:rgba(239,68,68,.4); }

        textarea.chat-input {
          flex:1; background:transparent; border:none;
          color:#fff; font-size:clamp(14px,1.7vw,17px);
          font-family:var(--font); font-weight:500;
          line-height:1.65; resize:none;
          min-height:28px; max-height:120px; overflow-y:auto;
        }
        textarea.chat-input:focus    { outline:none; }
        textarea.chat-input::placeholder { color:rgba(255,255,255,.28); }

        .btn-icon {
          width:50px; height:50px; border-radius:16px; border:none;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          flex-shrink:0; transition:all .2s; color:#fff;
        }
        .btn-mic { background:rgba(255,255,255,.1); }
        .btn-mic:hover { background:rgba(255,255,255,.18); transform:scale(1.07); }
        .btn-mic.listening { background:linear-gradient(135deg,#ef4444,#dc2626); animation:pulse 1.4s ease-in-out infinite; }
        .btn-send { background:linear-gradient(135deg,var(--green),var(--green-dark)); box-shadow:0 4px 16px rgba(16,185,129,.4); }
        .btn-send:hover:not(:disabled) { transform:scale(1.07); box-shadow:0 6px 22px rgba(16,185,129,.5); }
        .btn-send:disabled { background:rgba(16,185,129,.22); box-shadow:none; cursor:not-allowed; opacity:.55; }

        .emergency-note {
          text-align:center; margin-top:10px;
          font-size:clamp(11px,1.2vw,13px);
          color:rgba(255,255,255,.2);
          display:flex; align-items:center; justify-content:center; gap:5px;
        }

        /* ── RESPONSIVE ─────────────────────────────────── */
        @media (max-width:768px) {
          .header     { padding:12px 16px; gap:12px; }
          .logo-wrap  { width:46px; height:46px; font-size:23px; border-radius:13px; }
          .lang-bar   { padding:10px 16px 0; }
          .lang-tabs  { max-width:100%; }
          .suggestions{ padding:8px 16px 0; }
          .chat-area  { padding:14px 16px; }
          .bubble     { max-width:85%; }
          .input-wrap { padding:10px 16px 14px; }
          .input-box  { padding:11px 11px 11px 17px; border-radius:20px; max-width:100%; }
          .btn-icon   { width:46px; height:46px; border-radius:14px; }
        }

        @media (max-width:480px) {
          .header     { padding:10px 13px; gap:9px; }
          .logo-wrap  { width:40px; height:40px; font-size:20px; border-radius:11px; }
          .logo-sub   { display:none; }
          .status-badge { padding:5px 10px; font-size:11px; }
          .lang-bar   { padding:9px 13px 0; }
          .lang-tab   { padding:8px 8px; font-size:12.5px; }
          .chip       { padding:7px 12px; font-size:12px; }
          .chat-area  { padding:12px 12px; }
          .bubble     { max-width:90%; font-size:14px; padding:12px 15px; }
          .avatar     { width:35px; height:35px; font-size:17px; }
          .input-wrap { padding:8px 12px 12px; }
          .input-box  { padding:9px 9px 9px 14px; gap:8px; border-radius:17px; }
          .btn-icon   { width:43px; height:43px; border-radius:12px; }
          textarea.chat-input { font-size:14px; }
          .emergency-note { font-size:11px; }
        }

        @media (min-width:1280px) {
          .chat-area  { padding:22px 12%; }
          .input-wrap { padding:14px 12% 20px; }
          .input-box  { max-width:880px; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header className="header">
       <img
    src={logo}  
    alt="ArogyaAI"
    style={{
      height: "clamp(36px, 5vw, 52px)",
      width: "auto",
      objectFit: "contain",
      display: "block",
      flexShrink: 0,
      animation: "float 3.5s ease-in-out infinite",
    }}/>
        <div style={{ flex: 1 }}>
          <div className="logo-title">ArogyaAI</div>
          <div className="logo-sub">Multilingual Health Assistant • English • हिंदी • मराठी</div>
        </div>
        <div className={`status-badge ${serverStatus === "online" ? "s-online" : serverStatus === "offline" ? "s-offline" : "s-check"}`}>
          {serverStatus === "online" ? "🟢 ONLINE" : serverStatus === "offline" ? "🔴 OFFLINE" : "🟡 CHECKING"}
        </div>
      </header>

      {/* ── OFFLINE BANNER ── */}
      {serverStatus === "offline" && (
        <div className="offline-banner">
          ⚠️ Backend offline — Open CMD and run: <span>uvicorn main:app --host 0.0.0.0 --port 8000</span>
        </div>
      )}

      {/* ── LANG TABS ── */}
      <div className="lang-bar">
        <div className="lang-tabs">
          {[{ key:"en", label:"🇬🇧 English" }, { key:"hi", label:"🇮🇳 हिंदी" }, { key:"mr", label:"🟠 मराठी" }].map((l) => (
            <button key={l.key} className={`lang-tab ${activeLang === l.key ? "active" : ""}`} onClick={() => setActiveLang(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SUGGESTIONS ── */}
      <div className="suggestions">
        <div className="sugg-inner">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="chip" onClick={() => quickSend(s)}>
              <HeartIcon />
              {activeLang === "hi" ? s.hi : activeLang === "mr" ? s.mr : s.en}
            </button>
          ))}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div className="chat-area">
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div className="msg-row msg-ai">
            <div className="avatar avatar-ai">🩺</div>
            <div className="bubble bubble-ai" style={{ padding: 0 }}><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT AREA ── */}
      <div className="input-wrap">
        <div className={`input-box ${serverStatus === "offline" ? "offline" : ""}`}>
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={activeLang === "hi" ? "अपने लक्षण बताएं..." : activeLang === "mr" ? "तुमची लक्षणे सांगा..." : "Describe your symptoms..."}
            rows={1}
            onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
          />

          {/* Mic */}
          <button
            className={`btn-icon btn-mic ${isListening ? "listening" : ""}`}
            onClick={toggleVoiceInput}
            title={activeLang === "hi" ? "बोलें" : activeLang === "mr" ? "बोला" : "Speak"}
          >
            {isListening ? <StopIcon /> : <MicIcon />}
          </button>

          {/* Send */}
          <button
            className="btn-icon btn-send"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            title="Send"
          >
            <SendIcon />
          </button>
        </div>

        <p className="emergency-note">
          ⚕️ For emergencies, always call <strong style={{ color:"rgba(255,255,255,.38)" }}>112</strong> or visit nearest hospital
        </p>
      </div>
    </div>
  );
}