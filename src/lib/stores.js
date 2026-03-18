import { writable } from 'svelte/store';
import { getWsUrl, getBackendUrl } from '$lib/utils.js';

const createApiStore = () => {
  const initialState = {
    data: null,
    loading: false,
    error: null,
    connected: false // New state to track WS connection
  };

  const { subscribe, update, set } = writable(initialState);

  let socket = null;
  let reconnectTimer = null;
  let messageResolver = null; // Promise resolver for the awaited response

  // Connection function
  const connect = () => {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return;
    }

    console.log("Tentativo di connessione WebSocket...");
    
    try {
      socket = new WebSocket(getWsUrl());

      socket.onopen = () => {
        console.log("WebSocket Connesso");
        update(s => ({ ...s, error: null, connected: true, loading: false }));
        // Clear any pending reconnection timers
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };

      socket.onclose = (event) => {
        console.log("WebSocket Disconnesso. Riconnessione tra 3 secondi...");
        update(s => ({ ...s, connected: false, loading: false }));
        
        // Automatic reconnection every 3 seconds
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
        update(s => ({ ...s, error: "Errore di connessione WebSocket", connected: false }));
        socket.close(); // Close to trigger onclose and reconnection
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update the store with received data
          update(s => ({ ...s, data: data, loading: false }));

          // If there is a promise waiting for a response (for await fetchData), resolve it
          if (messageResolver) {
            messageResolver(data);
            messageResolver = null;
          }
        } catch (e) {
          console.error("Errore parsing messaggio WS:", e);
        }
      };

    } catch (e) {
      console.error("Impossibile creare WebSocket", e);
      // Fallback o riprova
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    }
  };

  // Waits for the socket to be open, with timeout (default 8 seconds)
  const waitForConnection = (timeout = 8000) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    // If the socket is closed, start reconnection immediately
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      connect();
    }
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeout;
      const check = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          resolve();
        } else if (Date.now() >= deadline) {
          reject(new Error('WebSocket non connesso. Riprova tra qualche istante.'));
        } else {
          setTimeout(check, 150);
        }
      };
      check();
    });
  };

  // Start the initial connection
  connect();

  return {
    subscribe,

    // Method to send chat messages
    fetchData: async (messaggi, language = 'it') => {
      await waitForConnection();

      update(state => ({ ...state, loading: true, error: null }));

      // Message mapping
      const messages = messaggi.map(m => ({
        role: m.mittente === "Io" ? "user" : "model",
        content: m.testo
      }));

      const languageName = language === 'en' ? 'English' : (language === 'it' ? 'Italiano' : language);

      const payload = {
        type: 'chat', // Identifier for the backend
        messages: messages,
        language: languageName
      };

      return new Promise((resolve, reject) => {
        try {
          socket.send(JSON.stringify(payload));
          // Set the resolver that will be called by onmessage
          messageResolver = resolve;
        } catch (err) {
          update(state => ({ ...state, error: err.message, loading: false }));
          reject(err);
        }
      });
    },

    // Method to send audio files via HTTP multipart, then get AI response via WebSocket
    uploadAudio: async (file, language = 'it') => {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        // 1. Upload audio via HTTP (avoids huge base64 payloads on WebSocket)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', language === 'en' ? 'English' : 'Italiano');

        // Use new URL to resolve the path from root, ignoring any suffixes in VITE_BACKEND
        const uploadUrl = new URL('/upload-audio', getBackendUrl()).href;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error(`Upload fallito: ${res.status}`);
        }

        const data = await res.json();
        const transcription = data.transcription;

        if (!transcription) {
          // No transcription available (OpenAI key not configured)
          update(state => ({ ...state, loading: false }));
          return { response: '' };
        }

        // 2. Send the transcription as a chat message via WebSocket to get the AI response
        await waitForConnection();

        const languageName = language === 'en' ? 'English' : 'Italiano';
        const payload = {
          type: 'chat',
          messages: [{ role: 'user', content: transcription }],
          language: languageName
        };

        return new Promise((resolve, reject) => {
          try {
            socket.send(JSON.stringify(payload));
            messageResolver = resolve;
          } catch (err) {
            update(state => ({ ...state, error: err.message, loading: false }));
            reject(err);
          }
        });

      } catch (err) {
        update(state => ({ ...state, error: err.message, loading: false }));
        throw err;
      }
    },

    reset: () => set(initialState),
    
    // Utility to check connection state
    isConnected: () => socket && socket.readyState === WebSocket.OPEN
  };
};

export const apiStore = createApiStore();