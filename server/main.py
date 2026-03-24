import asyncio
import os
import json
import base64
import time
import logging
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
from google import genai
from google.genai import types

# Carica le variabili d'ambiente
load_dotenv()

# Configura i Client
api_key = os.getenv("VITE_GEMINI_KEY") or os.getenv("GEMINI_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")

if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None

app = FastAPI()

# Configurazione Logging
logging.basicConfig(level=logging.INFO)

# Directory per salvare le registrazioni
BASE_DIR = os.path.dirname(__file__)
RECORDINGS_DIR = os.path.join(BASE_DIR, 'recordings')
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# Monta la directory delle registrazioni come file statici
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


class ChatRequest(BaseModel):
    type: str
    messages: List[Message] = []
    language: str = "it"


class AudioMessage(BaseModel):
    type: str
    filename: Optional[str] = None
    content: str
    language: str = "it"


# --- WebSocket Endpoint ---
@app.websocket("/chat")
async def chat(websocket: WebSocket):
    await websocket.accept()

    try:
        # --- CICLO PRINCIPALE ---
        while True:
            # 1. Ricezione del messaggio JSON dal client
            data = await websocket.receive_text()

            # 2. Parsing JSON
            try:
                payload = json.loads(data)
            except ValueError as e:
                await websocket.send_json({"error": f"JSON non valido: {str(e)}"})
                continue

            msg_type = payload.get("type")

            # ---------------------------------------------------------
            # GESTIONE AUDIO (Nuova Logica WebSocket)
            # ---------------------------------------------------------
            if msg_type == "audio":
                try:
                    audio_message = AudioMessage.model_validate(payload)
                    language = audio_message.language

                    if not audio_message.content or not audio_message.filename:
                        raise ValueError("Dati audio incompleti (manca content o filename)")

                    # Decodifica Base64 — rimuove l'header "data:audio/webm;base64," se presente
                    if "," in audio_message.content:
                        _, encoded = audio_message.content.split(",", 1)
                    else:
                        encoded = audio_message.content

                    file_bytes = base64.b64decode(encoded)

                    # Salva il file su disco
                    timestamp = int(time.time() * 1000)
                    safe_filename = f"{timestamp}-{audio_message.filename}"
                    safe_path = os.path.join(RECORDINGS_DIR, safe_filename)

                    with open(safe_path, 'wb') as f:
                        f.write(file_bytes)

                    # --- Conversione Audio (ffmpeg) ---
                    transcription = None
                    converted = False
                    converted_path = None

                    try:
                        src_path = Path(safe_path)
                        ext = src_path.suffix.lower()

                        # Converti in wav 16 kHz mono se il formato non è già supportato
                        if ext not in ['.wav', '.flac', '.mp3']:
                            converted_path = str(src_path.with_suffix('.wav'))
                            logging.info(f"Conversione ffmpeg: {safe_path} -> {converted_path}")

                            proc = await asyncio.create_subprocess_exec(
                                'ffmpeg', '-y', '-i', safe_path,
                                '-ar', '16000', '-ac', '1', converted_path,
                                stdout=asyncio.subprocess.PIPE,
                                stderr=asyncio.subprocess.PIPE
                            )
                            _, stderr_bytes = await proc.communicate()
                            if proc.returncode != 0:
                                raise RuntimeError(stderr_bytes.decode('utf-8', errors='ignore'))
                            converted = True
                    except RuntimeError as e:
                        logging.warning(f"ffmpeg conversion failed: {e}")
                        converted = False
                        converted_path = None
                    except Exception as e:
                        logging.warning(f"Errore generico conversione: {e}")
                        converted = False
                        converted_path = None

                    # --- Trascrizione (OpenAI Whisper) ---
                    if openai_key:
                        try:
                            # Usa il file convertito se esiste, altrimenti l'originale
                            audio_to_send = converted_path if converted_path else safe_path

                            # Determina il mimetype
                            content_type = 'audio/wav' if converted else 'audio/webm'

                            async with httpx.AsyncClient(timeout=120.0) as http_client:
                                with open(audio_to_send, 'rb') as fh:
                                    files = {
                                        'file': (Path(audio_to_send).name, fh, content_type)
                                    }
                                    data_whisper = {'model': 'whisper-1'}

                                    # Mappatura lingua per Whisper (en / it)
                                    if audio_message.language:
                                        data_whisper['language'] = audio_message.language

                                    headers = {'Authorization': f'Bearer {openai_key}'}
                                    logging.info(f"Invio file {audio_to_send} a Whisper...")

                                    resp = await http_client.post(
                                        'https://api.openai.com/v1/audio/transcriptions',
                                        headers=headers,
                                        data=data_whisper,
                                        files=files
                                    )

                                    if resp.status_code == 200:
                                        j = resp.json()
                                        transcription = j.get('text')
                                        logging.info(f"Trascrizione completata: {transcription}")
                                    else:
                                        logging.warning(f"Trascrizione fallita: {resp.status_code} {resp.text}")
                                        await websocket.send_json({"error": f"Errore API Whisper: {resp.text}"})
                                        continue  # Salta l'invio della risposta positiva

                        except Exception as e:
                            logging.exception(f"Errore durante trascrizione: {e}")
                            await websocket.send_json({"error": f"Errore trascrizione: {str(e)}"})
                            continue

                    # Invia la risposta al client (risolve la Promise nel frontend)
                    await websocket.send_json({
                        "type": "audio_response",
                        "filename": safe_filename,
                        "transcription": transcription,
                        "converted": converted,
                        "message": "uploaded"
                    })

                except Exception as e:
                    logging.error(f"Errore elaborazione audio: {e}")
                    await websocket.send_json({"error": f"Errore elaborazione audio: {str(e)}"})

                # Continua al prossimo messaggio (non eseguire la logica chat testuale)
                continue

            # ---------------------------------------------------------
            # GESTIONE CHAT TESTUALE
            # ---------------------------------------------------------

            chat_request = ChatRequest.model_validate(payload)

            if not chat_request.messages:
                continue

            # --- MODIFICA: Logica per messaggio "sample" ---
            # Controlla se l'ultimo messaggio dell'utente è "sample"
            last_message = chat_request.messages[-1]
            if last_message.role == "user" and last_message.content.strip().lower() == "sample":
                logging.info("Rilevato messaggio 'sample'. Invio audio di test statico.")

                # Definisci il path statico del file audio di test
                # Assicurati che questo file esista nella cartella 'recordings'
                sample_audio_path = os.path.join(RECORDINGS_DIR, "test_sample.wav")

                if os.path.exists(sample_audio_path):
                    try:
                        with open(sample_audio_path, "rb") as audio_file:
                            # Leggi il file e convertilo in Base64
                            binary_data = audio_file.read()
                            b64_content = base64.b64encode(binary_data).decode('utf-8')

                        # Costruisci la risposta JSON con type: "audio"
                        # Simula la struttura di un messaggio audio ricevuto, ma invertito (server -> client)
                        response_payload = {
                            "type": "audio",
                            "content": f"data:audio/wav;base64,{b64_content}",
                            "filename": "test_sample.wav"
                        }

                        await websocket.send_json(response_payload)

                        # Salta il resto della logica (LLM) e torna ad ascoltare
                        continue

                    except Exception as e:
                        logging.error(f"Errore lettura file sample: {e}")
                        await websocket.send_json({"error": "Errore durante la lettura del file sample"})
                        continue
                else:
                    logging.warning(f"File sample non trovato in: {sample_audio_path}")
                    await websocket.send_json({"error": "File audio di test non trovato sul server"})
                    continue
            # -----------------------------------------------

            # Preparazione messaggi per l'SDK
            sdk_messages = []
            for msg in chat_request.messages:
                sdk_messages.append({
                    "role": "user" if msg.role == "user" else "model",
                    "parts": [{"text": msg.content}]
                })

            if not sdk_messages:
                continue

            if client is None:
                await websocket.send_json({"error": "AI API key non configurata."})
                return

            # System Prompt dinamico
            system_instruction_text = (
                f"Sei un assistente utile e professionale. "
                f"Rispondi esclusivamente in {chat_request.language}. "
                f"Non usare altre lingue a meno che non sia strettamente necessario per tradurre termini tecnici."
            )

            # Configurazione modello
            generate_content_config = types.GenerateContentConfig(
                system_instruction=system_instruction_text,
            )

            # Chiamata all'API Google GenAI
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=sdk_messages,
                    config=generate_content_config
                )

                # Estrazione testo risposta
                response_text = ""
                if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                    response_text = response.candidates[0].content.parts[0].text

                # Invio risposta al client
                await websocket.send_json({"response": response_text})

            except Exception as e:
                logging.error(f"Errore generazione AI: {e}")
                await websocket.send_json({"error": "Errore durante la generazione della risposta."})

    except WebSocketDisconnect:
        logging.info("Client disconnesso intenzionalmente")
    except Exception as e:
        logging.error(f"Errore WebSocket generico: {e}")