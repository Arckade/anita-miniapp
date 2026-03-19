import os
import json
from typing import List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import subprocess
from pathlib import Path
import logging
from google import genai
from google.genai import types  # 1. Importa types per la configurazione

# Carica le variabili d'ambiente
load_dotenv()

# Configura il Client
api_key = os.getenv("VITE_GEMINI_KEY") or os.getenv("GEMINI_API_KEY")

# Optional OpenAI key for transcription (Whisper)
openai_key = os.getenv("OPENAI_API_KEY")

if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None

app = FastAPI()

logging.basicConfig(level=logging.INFO)

# Directory to serve saved recordings
BASE_DIR = os.path.dirname(__file__)
RECORDINGS_DIR = os.path.join(BASE_DIR, 'recordings')
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# Mount recordings as static files at /recordings
app.mount('/recordings', StaticFiles(directory=RECORDINGS_DIR), name='recordings')

# --- Configurazione CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Modelli Dati ---
class Message(BaseModel):
    role: str
    content: str
    type: str = None
    content: str = None
    filename: str = None

# 2. Aggiorniamo ChatRequest per includere la lingua (opzionale con default)
class ChatRequest(BaseModel):
    messages: List[Message] = []
    language: str = "italiano"  # Default se non specificato
    


# --- Rotte ---

@app.websocket("/chat")
async def chat(websocket: WebSocket):
    await websocket.accept()
    try:
        # --- AGGIUNTO WHILE TRUE ---
        while True:
            # 1. Ricezione del messaggio JSON dal client
            # Questa istruzione mette in pausa l'esecuzione finché non arriva un messaggio
            data = await websocket.receive_text()

            # 2. Parsing e validazione dei dati
            try:
                payload = json.loads(data)
                request = ChatRequest(**payload)
            except ValueError as e:
                await websocket.send_json({"error": f"JSON non valido: {str(e)}"})
                continue  # Modificato da 'return' a 'continue' per non chiudere la connessione
            except Exception as e:
                await websocket.send_json({"error": f"Errore di validazione: {str(e)}"})
                continue  # Modificato da 'return' a 'continue'

            if not request.messages:
                await websocket.send_json({"error": "Nessun messaggio o contenuto fornito"})
                continue  # Modificato da 'return' a 'continue'

            # Preparazione messaggi cronologico (history)
            sdk_messages = []
            for msg in request.messages:
                if msg.type == "audio":
                    continue
                sdk_messages.append({
                    "role": "user" if msg.role == "user" else "model",
                    "parts": [{"text": msg.content}]
                })
            if not sdk_messages:
                continue

            if client is None:
                await websocket.send_json({"error": "AI API key non configurata."})
                return

            # 3. Creiamo il System Prompt dinamico
            system_instruction_text = (
                f"Sei un assistente utile e professionale. "
                f"Rispondi esclusivamente in {request.language}. "
                f"Non usare altre lingue a meno che non sia strettamente necessario per tradurre termini tecnici."
            )

            # 4. Configurazione del modello
            generate_content_config = types.GenerateContentConfig(
                system_instruction=system_instruction_text,
            )

            # 5. Chiamata all'API AI
            # Qui usiamo await, ma la libreria google-genai potrebbe essere sincrona.
            # Se ottieni un errore di "coroutine never awaited", rimuovi await qui.
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=sdk_messages,
                config=generate_content_config
            )

            # Estrazione risposta
            response_text = ""
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                response_text = response.candidates[0].content.parts[0].text

            # 6. Invio della risposta
            await websocket.send_json({"response": response_text})

            # --- FINE CICLO ---
            # Una volta arrivati qui, il ciclo ricomincia e aspetta il prossimo messaggio

    except WebSocketDisconnect:
        logging.info("Client disconnesso intenzionalmente")
    # except Exception as e:
    #     logging.error(f"Errore durante la gestione della chat WebSocket: {e}")
    #     try:
    #         await websocket.send_json({"error": f"Errore interno del server: {str(e)}"})
    #     except Exception:
    #         pass

@app.post('/upload-audio')
async def upload_audio(file: UploadFile = File(...), language: str = Form('italiano')):
    try:
        # Cartella per salvare le registrazioni
        base_dir = os.path.dirname(__file__)
        rec_dir = os.path.join(base_dir, 'recordings')
        os.makedirs(rec_dir, exist_ok=True)

        filename = f"voice-{int(__import__('time').time() * 1000)}-{file.filename}"
        safe_path = os.path.join(rec_dir, filename)

        # Salva il file
        with open(safe_path, 'wb') as f:
            content = await file.read()
            f.write(content)

        # Prova a trascrivere usando OpenAI Whisper se la chiave è configurata
        transcription = None
        converted = False
        converted_path = None

        # If file format is not optimal for STT, try converting to WAV (mono, 16k)
        try:
            src_path = Path(safe_path)
            ext = src_path.suffix.lower()
            # If source is not wav/flac/mp3, try conversion
            if ext not in ['.wav', '.flac', '.mp3']:
                converted_path = str(src_path.with_suffix('.wav'))
                logging.info(f"Attempting conversion {safe_path} -> {converted_path}")
                # ffmpeg must be installed on the host
                subprocess.run([
                    'ffmpeg', '-y', '-i', safe_path,
                    '-ar', '16000', '-ac', '1', converted_path
                ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                converted = True
        except subprocess.CalledProcessError as e:
            logging.warning(f"ffmpeg conversion failed: {e.stderr.decode('utf-8', errors='ignore')}")
            converted = False
            converted_path = None
        except Exception as e:
            logging.warning(f"Conversion check error: {e}")
            converted = False
            converted_path = None

        if openai_key:
            try:
                audio_to_send = converted_path if converted_path else safe_path
                async with httpx.AsyncClient(timeout=120.0) as client:
                    with open(audio_to_send, 'rb') as fh:
                        files = {
                            'file': (Path(audio_to_send).name, fh, file.content_type or 'audio/wav')
                        }
                        data = {'model': 'whisper-1'}
                        if language:
                            data['language'] = 'en' if language.lower().startswith('en') else 'it'

                        headers = {'Authorization': f'Bearer {openai_key}'}
                        logging.info(f"Sending file {audio_to_send} to Whisper for transcription")
                        resp = await client.post('https://api.openai.com/v1/audio/transcriptions', headers=headers,
                                                 data=data, files=files)
                        if resp.status_code == 200:
                            j = resp.json()
                            transcription = j.get('text')
                            logging.info(f"Transcription result: {transcription}")
                        else:
                            logging.warning(f"Transcription failed: {resp.status_code} {resp.text}")
            except Exception as e:
                logging.exception(f"Errore during transcription: {e}")

        return {"filename": filename, "transcription": transcription, "converted": converted, "message": "uploaded"}
    except Exception as e:
        print(f"Errore upload audio: {e}")
        raise HTTPException(status_code=500, detail=f"Errore salvataggio audio: {str(e)}")