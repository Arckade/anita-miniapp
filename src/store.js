import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Funzione helper per ottenere l'URL WebSocket corretto
const getWsUrl = () => {
  const backend = import.meta.env.VITE_BACKEND || 'http://localhost:8000';
  return backend.replace(/^http/, 'ws');
};

const createApiStore = () => {
  const initialState = {
    data: null,
    loading: false,
    error: null,
    connected: false // Nuovo stato per tracciare la connessione WS
  };

  const { subscribe, update, set } = writable(initialState);

  let socket = null;
  let reconnectTimer = null;
  let messageResolver = null; // Promise resolver per la risposta attesa

  // Funzione di connessione
  const connect = () => {
    // Controllo di sicurezza aggiuntivo
    if (!browser) return;

    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return;
    }

    console.log("Tentativo di connessione WebSocket...");

    try {
      socket = new WebSocket(getWsUrl());

      socket.onopen = () => {
        console.log("WebSocket Connesso");
        update(s => ({ ...s, error: null, connected: true, loading: false }));
        // Pulisci eventuali timer di riconnessione pendenti
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };

      socket.onclose = (event) => {
        console.log("WebSocket Disconnesso. Riconnessione tra 3 secondi...");
        update(s => ({ ...s, connected: false, loading: false }));

        if (reconnectTimer) clearTimeout(reconnectTimer);
        // Riconnetti solo se siamo ancora nel browser (es. se l'utente non ha chiuso la pagina)
        if (browser) {
            reconnectTimer = setTimeout(connect, 3000);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
        update(s => ({ ...s, error: "Errore di connessione WebSocket", connected: false }));
        socket.close(); // Chiude per forzare onclose e la riconnessione
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Aggiorna lo store con i dati ricevuti
          update(s => ({ ...s, data: data, loading: false }));

          // Se c'è una promise in attesa di risposta (per await fetchData), la risolviamo
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
      if (browser) {
          reconnectTimer = setTimeout(connect, 3000);
      }
    }
  };

  // Avvia la connessione SOLO se siamo nel browser
  if (browser) {
    connect();
  }

  return {
    subscribe,

    // Metodo per inviare messaggi di chat
    fetchData: async (messaggi, language = 'it') => {
      // Se non connesso, segnaliamo errore o attendiamo (qui segnaliamo errore per immediatezza)
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket non connesso. Riprova tra qualche istante.");
      }

      update(state => ({ ...state, loading: true, error: null }));

      // Mappatura messaggi
      const messages = messaggi.map(m => ({
        role: m.mittente === "Io" ? "user" : "model",
        content: m.testo
      }));

      const languageName = language === 'en' ? 'English' : (language === 'it' ? 'Italiano' : language);

      const payload = {
        type: 'chat',
        messages: messages,
        language: languageName
      };

      return new Promise((resolve, reject) => {
        try {
          socket.send(JSON.stringify(payload));
          // Impostiamo il resolver che sarà chiamato da onmessage
          messageResolver = resolve;
        } catch (err) {
          update(state => ({ ...state, error: err.message, loading: false }));
          reject(err);
        }
      });
    },

    // Metodo per inviare file audio (convertito in Base64 per WS)
    uploadAudio: async (file, language = 'it') => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
         throw new Error("WebSocket non connesso.");
      }

      update(state => ({ ...state, loading: true, error: null }));

      // Leggiamo il file come DataURL (Base64)
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64Audio = reader.result; // "data:audio/webm;base64,......"
          
          const payload = {
            type: 'audio',
            content: base64Audio,
            filename: file.name || `voice-${Date.now()}.webm`,
            language: language
          };

          try {
            socket.send(JSON.stringify(payload));
            // Impostiamo il resolver
            messageResolver = resolve;
          } catch (err) {
            update(state => ({ ...state, error: err.message, loading: false }));
            reject(err);
          }
        };

        reader.onerror = (err) => {
          update(state => ({ ...state, error: "Lettura file fallita", loading: false }));
          reject(err);
        };

        reader.readAsDataURL(file);
      });
    },

    reset: () => set(initialState),
    
    // Utility per controllare lo stato
    isConnected: () => socket && socket.readyState === WebSocket.OPEN
  };
};

export const apiStore = createApiStore();