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
from google.genai import types  # 1. Import types for configuration

# Load environment variables
load_dotenv()

# Configure the Client
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

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Data Models ---
class Message(BaseModel):
    role: str
    content: str = None
    type: str = None
    filename: str = None


# 2. Update ChatRequest to include language (optional with default)
class ChatRequest(BaseModel):
    messages: List[Message] = []
    language: str = "italiano"  # Default if not specified


# --- Routes ---

@app.websocket("/chat")
async def chat(websocket: WebSocket):
    await websocket.accept()
    try:
        # --- ADDED WHILE TRUE ---
        while True:
            # 1. Receive JSON message from client
            # This pauses execution until a message arrives
            data = await websocket.receive_text()

            # 2. Parsing and data validation
            try:
                payload = json.loads(data)
                request = ChatRequest(**payload)
            except ValueError as e:
                await websocket.send_json({"error": f"JSON non valido: {str(e)}"})
                continue  # Changed from 'return' to 'continue' to avoid closing the connection
            except Exception as e:
                await websocket.send_json({"error": f"Errore di validazione: {str(e)}"})
                continue  # Changed from 'return' to 'continue' to avoid closing the connection

            if not request.messages and not request.content:
                await websocket.send_json({"error": "Nessun messaggio o contenuto fornito"})
                continue  # Changed from 'return' to 'continue' to avoid closing the connection

            # Prepare chronological messages (history)
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

            # 3. Create the dynamic System Prompt
            system_instruction_text = (
                f"Sei un assistente utile e professionale. "
                f"Rispondi esclusivamente in {request.language}. "
                f"Non usare altre lingue a meno che non sia strettamente necessario per tradurre termini tecnici."
            )

            # 4. Model configuration
            generate_content_config = types.GenerateContentConfig(
                system_instruction=system_instruction_text,
            )

            # 5. Call the AI API
            # Here we use await, but the google-genai library might be synchronous.
            # If you get a "coroutine never awaited" error, remove await here.
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=sdk_messages,
                config=generate_content_config
            )

            # Extract response
            response_text = ""
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                response_text = response.candidates[0].content.parts[0].text

            # 6. Send the response
            await websocket.send_json({"response": response_text})

            # --- END OF LOOP ---
            # Once here, the loop restarts and waits for the next message

    except WebSocketDisconnect:
        logging.info("Client disconnesso intenzionalmente")
    except Exception as e:
        logging.error(f"Errore durante la gestione della chat WebSocket: {e}")
        try:
            await websocket.send_json({"error": f"Errore interno del server: {str(e)}"})
        except Exception:
            pass

@app.post('/upload-audio')
async def upload_audio(file: UploadFile = File(...), language: str = Form('italiano')):
    try:
        # Folder to save recordings
        base_dir = os.path.dirname(__file__)
        rec_dir = os.path.join(base_dir, 'recordings')
        os.makedirs(rec_dir, exist_ok=True)

        filename = f"voice-{int(__import__('time').time() * 1000)}-{file.filename}"
        safe_path = os.path.join(rec_dir, filename)

        # Save the file
        with open(safe_path, 'wb') as f:
            content = await file.read()
            f.write(content)

        # Keep only a limited number of audio files
        MAX_RECORDINGS = 3
        existing = sorted(
            [os.path.join(rec_dir, f) for f in os.listdir(rec_dir) if os.path.isfile(os.path.join(rec_dir, f))],
            key=os.path.getmtime
        )
        for old_file in existing[:-MAX_RECORDINGS]:
            try:
                os.remove(old_file)
            except Exception:
                pass

        # Try to transcribe using OpenAI Whisper if the key is configured
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