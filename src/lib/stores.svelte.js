// stores.svelte.js
import { getWsUrl, getBackendUrl } from '$lib/utils.js';

class ChatStore {
  // --- STATO REATTIVO ---
  incomingMessages = $state([]);
  isBackendTyping = $state(false);
  connectionStatus = $state('disconnected');

  language = $state('it');
  showAiText = $state(true);
  nativeLanguage = $state('it');
  targetLanguage = $state('en');

  // --- STATO INTERNO WS ---
  socket = null;
  reconnectTimer = null;
  reconnectAttempts = 0;

  constructor() {
    // Inizializza da localStorage
    if (typeof localStorage !== 'undefined') {
      this.language = localStorage.getItem('anita_language') || 'it';
      this.showAiText = localStorage.getItem('anita_show_ai_text') === null ? true : localStorage.getItem('anita_show_ai_text') === 'true';
      this.nativeLanguage = localStorage.getItem('anita_native_language') || 'it';
      this.targetLanguage = localStorage.getItem('anita_target_language') || 'en';
    }

    // Persisti in localStorage quando cambiano
    // FIX: Usiamo $effect.root() al posto di $effect() per gli effetti a livello di modulo
    $effect.root(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('anita_language', this.language);
        localStorage.setItem('anita_show_ai_text', String(this.showAiText));
        localStorage.setItem('anita_native_language', this.nativeLanguage);
        localStorage.setItem('anita_target_language', this.targetLanguage);
      }
    });

    // Avvia la connessione
    this.connect();
  }

  // ... (il resto della classe ChatStore rimane IDENTICO, non serve cambiarlo)
  
  // --- API ---
  async loadSupportedLanguages() {
    const backend = getBackendUrl();
    const response = await fetch(`${backend}/settings/supported-languages`);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to load languages: ${response.status} ${body}`);
    }
    return await response.json();
  }

  async loadLanguageSettings() {
    const backend = getBackendUrl();
    const response = await fetch(`${backend}/settings/language`);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to load languages: ${response.status} ${body}`);
    }
    const data = await response.json();
    this.nativeLanguage = data.native_language || 'it';
    this.targetLanguage = data.target_language || 'en';
    return data;
  }

  async saveLanguageSettings(native, target) {
    const backend = getBackendUrl();
    const response = await fetch(`${backend}/settings/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'language', native_language: native, target_language: target })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to save languages: ${response.status} ${body}`);
    }

    const data = await response.json();
    this.nativeLanguage = data.native_language || native;
    this.targetLanguage = data.target_language || target;
    return data;
  }

  // --- WEBSOCKET ---
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.connectionStatus = 'connecting';

    try {
      this.socket = new WebSocket(getWsUrl());

      this.socket.onopen = () => {
        console.log('[WS] Connesso');
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onclose = () => {
        console.log('[WS] Disconnesso');
        this.connectionStatus = 'disconnected';
        this.isBackendTyping = false;
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('[WS] Errore:', error);
        this.connectionStatus = 'disconnected';
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (e) {
      console.error('[WS] Impossibile creare connessione:', e);
      this.connectionStatus = 'disconnected';
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const MAX_RECONNECT_DELAY = 30000;
    const BASE_RECONNECT_DELAY = 1000;
    
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000, MAX_RECONNECT_DELAY);
    this.reconnectAttempts++;

    console.log(`[WS] Riconnessione tra ${Math.round(delay / 1000)}s (tentativo ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  handleMessage(rawData) {
    try {
      const data = JSON.parse(rawData);
      if (typeof data.typing === 'boolean') {
        this.isBackendTyping = data.typing;
        return;
      }
      if (data.text || data.audio_bytes) {
        this.isBackendTyping = false;
        this.incomingMessages.push(data);
      }
    } catch (e) {
      console.error('[WS] Errore parsing JSON:', e, rawData);
    }
  }

  sendText(text) {
    if (!this.isSocketReady()) return false;
    this.socket.send(JSON.stringify({ type: 'text', text }));
    return true;
  }

  sendAudio(base64Audio) {
    if (!this.isSocketReady()) return false;
    const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
    this.socket.send(JSON.stringify({ type: 'audio', audio_bytes: cleanBase64 }));
    return true;
  }

  consumeIncomingMessage() {
    this.incomingMessages.shift();
  }

  consumeAllIncomingMessages() {
    this.incomingMessages.length = 0;
  }

  forceReconnect() {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  isSocketReady() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Impossibile inviare: socket non pronto');
      return false;
    }
    return true;
  }
}

// Esportiamo UN SINGOLO OGGETTO ISTANZA DELLA CLASSE
export const chatStore = new ChatStore();