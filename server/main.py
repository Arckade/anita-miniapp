import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types  # 1. Importa types per la configurazione

# Carica le variabili d'ambiente
load_dotenv()

# Configura il Client
api_key = os.getenv("VITE_GEMINI_KEY") or os.getenv("GEMINI_API_KEY")

if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None

app = FastAPI()

# --- Configurazione CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelli Dati ---
class Message(BaseModel):
    role: str
    content: str

# 2. Aggiorniamo ChatRequest per includere la lingua (opzionale con default)
class ChatRequest(BaseModel):
    messages: List[Message]
    language: str = "italiano"  # Default se non specificato

# --- Rotte ---
@app.post("/chat")
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Nessun messaggio fornito")

    try:
        # Preparazione messaggi cronologico (history)
        sdk_messages = []
        for msg in request.messages:
            sdk_messages.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [{"text": msg.content}]
            })

        if client is None:
            raise HTTPException(status_code=500, detail="AI API key non configurata.")

        # 3. Creiamo il System Prompt dinamico basato sulla lingua
        # Questo istruisce il modello su come comportarsi PRIMA di leggere i messaggi
        system_instruction_text = (
            f"Sei un assistente utile e professionale. "
            f"Rispondi esclusivamente in {request.language}. "
            f"Non usare altre lingue a meno che non sia strettamente necessario per tradurre termini tecnici."
        )

        # 4. Configurazione del modello con System Instruction
        generate_content_config = types.GenerateContentConfig(
            system_instruction=system_instruction_text,
            # Puoi aggiungere altri parametri qui, es:
            # temperature=0.7,
            # max_output_tokens=512,
        )

        # 5. Passiamo la configurazione alla chiamata
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=sdk_messages,
            config=generate_content_config  # <--- Qui passiamo il config
        )

        # Estrazione risposta
        response_text = ""
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text

        return {"response": response_text}

    except Exception as e:
        print(f"Errore Gemini: {e}")
        # Ritorniamo anche il dettaglio dell'errore per debug (opzionale)
        raise HTTPException(status_code=500, detail=f"Errore interno del server AI: {str(e)}")