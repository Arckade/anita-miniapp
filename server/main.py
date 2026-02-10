import os
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai  # Nuovo import

# Carica le variabili d'ambiente
load_dotenv()

# Configura il Client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY non trovata nel file .env")

# Con il nuovo SDK istanziamo direttamente il Client
client = genai.Client(api_key=api_key)

app = FastAPI()

# --- Configurazione CORS per Svelte ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Modelli Dati ---
class Message(BaseModel):
    role: str  # "user" o "model"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


# --- Rotte ---
@app.post("/chat")
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Nessun messaggio fornito")

    try:
        # Converti i messaggi Pydantic nel formato richiesto dal nuovo SDK
        # Il nuovo SDK vuole una lista di dizionari: {"role": ..., "parts": [{"text": ...}]}
        sdk_messages = []
        for msg in request.messages:
            sdk_messages.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [{"text": msg.content}]
            })

        print(sdk_messages)

        # Chiamata al metodo generate_content del Client
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=sdk_messages
        )

        # Estrazione del testo dalla risposta
        # La struttura della risposta è complessa, navighiamo verso la parte di testo
        response_text = ""
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text

        return {"response": response_text}

    except Exception as e:
        print(f"Errore Gemini: {e}")
        raise HTTPException(status_code=500, detail="Errore interno del server AI")
