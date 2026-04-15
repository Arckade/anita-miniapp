import { writable } from 'svelte/store';
import { getWsUrl } from '$lib/utils.js';

// --- STORES REATTIVI ---
export const incomingMessages = writable([]);
export const isBackendTyping = writable(false);
export const connectionStatus = writable('disconnected'); // 'disconnected' | 'connecting' | 'connected'

// Tenda testo AI: true = testo visibile, false = nascosto
const SHOW_AI_TEXT_KEY = 'anita_show_ai_text';
const _savedShowAiText = typeof localStorage !== 'undefined'
  ? localStorage.getItem(SHOW_AI_TEXT_KEY)
  : null;
export const showAiText = writable(_savedShowAiText === null ? true : _savedShowAiText === 'true');
showAiText.subscribe(val => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SHOW_AI_TEXT_KEY, String(val));
  }
});

// --- STATE INTERNO ---
let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;

// --- CONNESSIONE ---
function connect() {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        return;
    }

    connectionStatus.set('connecting');

    try {
        socket = new WebSocket(getWsUrl());

        socket.onopen = () => {
            console.log('[WS] Connesso');
            connectionStatus.set('connected');
            reconnectAttempts = 0;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        socket.onclose = (event) => {
            console.log('[WS] Disconnesso, codice:', event.code);
            connectionStatus.set('disconnected');
            isBackendTyping.set(false);
            scheduleReconnect();
        };

        socket.onerror = (error) => {
            console.error('[WS] Errore:', error);
            connectionStatus.set('disconnected');
            // Non chiamare socket.close() qui, onclose verrà chiamato automaticamente
        };

        socket.onmessage = (event) => {
            handleMessage(event.data);
        };

    } catch (e) {
        console.error('[WS] Impossibile creare connessione:', e);
        connectionStatus.set('disconnected');
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;

    // Backoff esponenziale con jitter
    const delay = Math.min(
        BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts) + Math.random() * 1000,
        MAX_RECONNECT_DELAY
    );
    reconnectAttempts++;

    console.log(`[WS] Riconnessione tra ${Math.round(delay / 1000)}s (tentativo ${reconnectAttempts})`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, delay);
}

function handleMessage(rawData) {
    try {
        const data = JSON.parse(rawData);

        // Messaggio di "sta scrivendo"
        if (typeof data.typing === 'boolean') {
            isBackendTyping.set(data.typing);
            return;
        }

        // Messaggio con contenuto
        if (data.text || data.audio_bytes) {
            // Quando arriva un messaggio reale, il typing finisce
            isBackendTyping.set(false);
            incomingMessages.update(messages => [...messages, data]);
        }

    } catch (e) {
        console.error('[WS] Errore parsing JSON:', e, rawData);
    }
}

// --- API PUBBLICA ---

/**
 * Invia un messaggio di testo
 * @returns {boolean} true se inviato con successo
 */
export function sendText(text, language) {
    if (!isSocketReady()) return false;

    const payload = {
        language,
        text,
        audio_bytes: null
    };

    socket.send(JSON.stringify(payload));
    return true;
}

/**
 * Invia audio come base64 (può includere o meno il prefisso data:)
 * @returns {boolean} true se inviato con successo
 */
export function sendAudio(base64Audio, language) {
    if (!isSocketReady()) return false;

    // Pulisci il prefisso data: se presente - il backend vuole solo il base64 puro
    const cleanBase64 = base64Audio.includes(',')
        ? base64Audio.split(',')[1]
        : base64Audio;

    const payload = {
        language,
        text: null,
        audio_bytes: cleanBase64
    };

    socket.send(JSON.stringify(payload));
    return true;
}

/**
 * Consuma il primo messaggio in coda (da chiamare dopo averlo processato)
 */
export function consumeIncomingMessage() {
    incomingMessages.update(messages => messages.slice(1));
}

/**
 * Consuma tutti i messaggi in coda
 */
export function consumeAllIncomingMessages() {
    incomingMessages.set([]);
}

/**
 * Forza la riconnessione
 */
export function forceReconnect() {
    if (socket) {
        socket.onclose = null; // Evita schedulazione automatica
        socket.close();
    }
    reconnectAttempts = 0;
    connect();
}

// --- HELPERS ---
function isSocketReady() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('[WS] Impossibile inviare: socket non pronto');
        return false;
    }
    return true;
}

// --- INIT ---
connect();