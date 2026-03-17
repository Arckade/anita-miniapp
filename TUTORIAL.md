# Tutorial per Sviluppatori: Estendere Anita Mini-App

Benvenuto nel progetto Anita Mini-App! Questo tutorial ti guiderà passo dopo passo nell'aggiunta di nuove funzionalità, spiegando la struttura del progetto e come collegare il frontend Svelte con il backend Python.

## 1. Struttura del Progetto

Il progetto è stato riorganizzato seguendo gli standard di SvelteKit per rendere lo sviluppo più intuitivo e scalabile.

### Cartelle Principali
- **`src/lib/`**: Contiene il codice condiviso e la logica di business riutilizzabile.
  - **`stores.js`**: Gestisce lo stato globale dell'applicazione (es. le chiamate API, la chat).
  - **`utils.js`**: Contiene funzioni di utilità condivise (es. gestione URL).
  - **`index.js`**: Esporta i moduli contenuti in `lib` per un'importazione pulita.
- **`src/routes/`**: Contiene le pagine e component dell'applicazione.
  - **`+page.svelte`**: La pagina principale (la chat).
  - **`+layout.svelte`**: Il layout comune a tutte le pagine.
- **`server/`**: Contiene il backend in Python (FastAPI/Uvicorn).
  - **`main.py`**: Il punto di ingresso del server API.
- **`static/`**: File statici come immagini o `robots.txt`.

## 2. Installazione ed Esecuzione

Prima di iniziare, assicurati di avere installato Node.js e Python.

### Backend (Python)
Apri un terminale nella cartella `server`:
```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Il server sarà attivo su `http://localhost:8000`.

### Frontend (SvelteKit)
Apri un nuovo terminale nella radice del progetto:
```bash
npm install
npm run dev
```
L'app sarà disponibile su `http://localhost:5173`.

---

## 3. Come Aggiungere una Nuova Funzionalità

Immaginiamo di voler aggiungere un semplice contatore di messaggi o una nuova pagina di "Profilo".

### Parte A: Aggiungere una Nuova Pagina
In SvelteKit, le rotte sono definite dalle cartelle dentro `src/routes`.

1.  Crea una cartella `src/routes/profilo`.
2.  Dentro `profilo`, crea un file `+page.svelte`.
3.  Aggiungi il seguente codice:
    ```svelte
    <script>
      // Importa lo store globale se serve
      import { apiStore } from '$lib/stores.js';
    </script>

    <h1>Il Tuo Profilo</h1>
    <p>Benvenuto nella pagina profilo!</p>
    <a href="/">Torna alla Chat</a>
    ```
4.  Ora visita `http://localhost:5173/profilo`.

### Parte B: Estendere la Logica (Store)
Se vuoi aggiungere una nuova funzione per chiamare il backend, modifica `src/lib/stores.js`.

Esempio: Aggiungere una funzione per salutare.
1.  Apri `src/lib/stores.js`.
2.  Aggiungi una nuova funzione dentro `createApiStore`:
    ```javascript
    // ... dentro createApiStore ...
    const saluta = async (nome) => {
      update(s => ({ ...s, loading: true }));
      try {
        const res = await fetch(`${getWsUrl().replace('ws', 'http')}/api/saluta`, {
           method: 'POST',
           body: JSON.stringify({ nome })
        });
        const data = await res.json();
        // Fai qualcosa con i dati...
      } catch (e) {
        console.error(e);
      } finally {
        update(s => ({ ...s, loading: false }));
      }
    };

    return {
      subscribe,
      // ... altre funzioni ...
      saluta // Esporta la nuova funzione
    };
    ```

### Parte C: Modificare il Backend
Se hai aggiunto una chiamata API nel frontend, devi gestirla nel backend.

1.  Apri `server/main.py`.
2.  Aggiungi il nuovo endpoint:
    ```python
    from fastapi import FastAPI
    from pydantic import BaseModel

    class SalutoRequest(BaseModel):
        nome: str

    @app.post("/api/saluta")
    async def saluta(request: SalutoRequest):
        return {"messaggio": f"Ciao, {request.nome}!"}
    ```

## 4. Consigli Utili
- **Importazioni Pulite**: Usa sempre `$lib` per i tuoi import (es. `import ... from '$lib/stores.js'`).
- **Componenti**: Se crei parti di UI riutilizzabili (es. un bottone speciale), mettile in `src/lib/components/` (crea la cartella se non esiste) e importali con `$lib/components/TuoBottone.svelte`.
- **Stile**: Svelte gestisce lo stile in modo "scoped" (locale al componente), ma puoi usare classi globali in `app.css` se presente o definire stili globali.

Buon lavoro con Anita Mini-App!
