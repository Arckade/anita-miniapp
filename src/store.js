import { writable } from 'svelte/store';

// --- api-config ---
const API_KEY = import.meta.env.VITE_GEMINI_KEY;
const MODEL_ID = "gemini-2.5-flash";

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
    fetchData: async (messaggi) => {
      // Aggiorniamo lo stato: inizio caricamento
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const history = messaggi.map(m => ({
          role: m.mittente === "Io" ? "user" : "model",
          parts: [{ text: m.testo }]
        }));

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: history,
              generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
            })
          }
        );

        const data = await response.json();
        console.log(data);
        const rispostaTesto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Spiacente, errore.";

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
    reset: () => set(initialState) // Opzionale: per resettare lo store
  };
};

// Esportiamo l'istanza dello store
export const apiStore = createApiStore();