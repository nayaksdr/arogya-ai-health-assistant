from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from groq import Groq
import json
import os

app = FastAPI(title="AI Health Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    with open("config.json", "r") as f:
        config = json.load(f)
    api_key = config.get("groq_api_key") or os.environ.get("GROQ_API_KEY")
except:
    api_key = os.environ.get("GROQ_API_KEY")

if not api_key:
    raise ValueError("No Groq API key found! Add groq_api_key in config.json")

# ✅ Groq client — NOT Anthropic
client = Groq(api_key=api_key)

SYSTEM_PROMPT = """You are ArogyaAI — a compassionate multilingual health assistant supporting English, Hindi (हिंदी), and Marathi (मराठी).

LANGUAGE RULE (CRITICAL):
- If user writes in Marathi → reply FULLY in Marathi
- If user writes in Hindi → reply FULLY in Hindi
- If user writes in English → reply FULLY in English

For every health concern provide:
🏥 Condition Overview — simple explanation
💊 Suggested Medicines — common OTC tablets
🥗 Diet Recommendations — what to eat and avoid
🌿 Home Remedies — Indian traditional remedies
🔄 Recovery Tips — rest, hydration, lifestyle
⚠️ When to See a Doctor — warning signs

Always end with disclaimer:
English: This is general health information. Please consult a qualified doctor.
Hindi: यह सामान्य स्वास्थ्य जानकारी है। कृपया डॉक्टर से परामर्श करें।
Marathi: ही सामान्य आरोग्य माहिती आहे. कृपया डॉक्टरांचा सल्ला घ्या."""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    reply: str
    detected_language: str

def detect_language_simple(text: str) -> str:
    marathi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    if marathi_chars > 0:
        marathi_keywords = ['आहे', 'माझ', 'मला', 'आणि', 'काय', 'कसे', 'होत', 'नाही', 'ताप']
        hindi_keywords = ['है', 'मुझे', 'और', 'क्या', 'कैसे', 'हो', 'नहीं', 'बुखार', 'दर्द']
        marathi_score = sum(1 for kw in marathi_keywords if kw in text)
        hindi_score = sum(1 for kw in hindi_keywords if kw in text)
        if marathi_score >= hindi_score:
            return "Marathi"
        return "Hindi"
    return "English"

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        detected_lang = detect_language_simple(request.message)

        # ✅ GROQ format — system message goes INSIDE messages list
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for msg in request.conversation_history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": request.message})

        # ✅ GROQ syntax — chat.completions.create NOT messages.create
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=2000,
            messages=messages
        )

        # ✅ GROQ response — choices[0].message.content
        reply_text = response.choices[0].message.content

        return ChatResponse(
            reply=reply_text,
            detected_language=detected_lang
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ArogyaAI Health Assistant"}

@app.get("/")
async def root():
    return {
        "name": "ArogyaAI",
        "description": "Multilingual AI Health Assistant",
        "languages": ["English", "Hindi", "Marathi"],
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)