import { writable } from 'svelte/store';

// Funzione che crea il nostro store custom
const createApiStore = () => {
  // Stato iniziale
  const initialState = {
    data: null,
    loading: false,
    error: null
  };

  const { subscribe, update, set } = writable(initialState);

  return {
    subscribe, // Esporiamo subscribe per renderlo reattivo nei componenti
    fetchData: async (messaggi, language = 'it') => {
      // Aggiorniamo lo stato: inizio caricamento
      update(state => ({ ...state, loading: true, error: null }));

      try {
        // Mappiamo i messaggi nel formato che il backend si aspetta
        const messages = messaggi.map(m => ({
          role: m.mittente === "Io" ? "user" : "model",
          content: m.testo
        }));

        // Chiamata al nostro backend FastAPI (/chat)
        const backend = import.meta.env.VITE_BACKEND || 'http://localhost:8000';
        // Convertiamo il codice lingua ('it'|'en') in un nome leggibile per il prompt
        const languageName = language === 'en' ? 'English' : (language === 'it' ? 'Italiano' : language);

        const response = await fetch(`${backend}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, language: languageName })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server error ${response.status}: ${text}`);
        }

        const data = await response.json();
        const rispostaTesto = data.response ?? "Spiacente, errore.";

        // Salviamo la risposta grezza nello store e fermiamo il caricamento
        update(state => ({
          ...state,
          data: rispostaTesto,
          loading: false
        }));

      } catch (err) {
        // Gestione errore
        update(state => ({
          ...state,
          error: err.message,
          loading: false
        }));
        throw err;
      }
    },
    // Carica un file audio al backend
    uploadAudio: async (file, language = 'it') => {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const backend = import.meta.env.VITE_BACKEND || 'http://localhost:8000';
        const form = new FormData();
        form.append('file', file, file.name || 'voice.webm');
        form.append('language', language);

        const response = await fetch(`${backend}/upload-audio`, {
          method: 'POST',
          body: form,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server error ${response.status}: ${text}`);
        }

        const data = await response.json();

        update(state => ({ ...state, data: data, loading: false }));

        return data;
      } catch (err) {
        update(state => ({ ...state, error: err.message, loading: false }));
        throw err;
      }
    },
    reset: () => set(initialState) // Opzionale: per resettare lo store
  };
};

// Esportiamo l'istanza dello store
export const apiStore = createApiStore();