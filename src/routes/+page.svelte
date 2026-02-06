<script>
  import { onMount, tick, afterUpdate } from 'svelte';

  // --- api-config ---
  const API_KEY = import.meta.env.VITE_GEMINI_KEY;
  const MODEL_ID = "gemini-1.5-flash"; 

  // --- cartella dei messaggi ---
  let messaggi = [
    { testo: "Ciao! sono anita, di cosa vuoi parlare?", mittente: "AI" }
  ];
  let nuovoMessaggio = "";
  let isLoading = false; // l'AI sta pensando
  
  // Riferimento al contenitore della chat per lo scroll
  let chatContainer;

  async function inviaMessaggio() {
    if (nuovoMessaggio.trim() === "" || isLoading) return;

    // 1. Aggiunge messaggio utente
    messaggi = [...messaggi, { testo: nuovoMessaggio, mittente: "Io" }];
    const testoUtente = nuovoMessaggio;
    
    // Pulisce input
    nuovoMessaggio = "";
    isLoading = true;

    // Scorri in basso dopo aver aggiunto il messaggio utente
    await tick();
    scrollToBottom();

    // 2. Chiama l'AI
    await rispondiComeAI(testoUtente);
  }
  
  async function rispondiComeAI(testoUtente) {
    try {
      // Prepara la cronologia per Gemini (formato richiesto dall'API)
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
      
      // Estri risposta
      const rispostaTesto = data.candidates[0]?.content?.parts[0]?.text || "Spiacente, errore.";

      // Aggiunge messaggio AI
      messaggi = [...messaggi, { testo: rispostaTesto, mittente: "AI" }];

    } catch (error) {
      console.error(error);
      messaggi = [...messaggi, { testo: "Errore di connessione con l'AI.", mittente: "AI" }];
    } finally {
      isLoading = false;
      // Scorri in basso quando l'AI ha risposto
      await tick();
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
  
  // Ogni volta che i messaggi cambiano, scorri in basso
  afterUpdate(() => {
      scrollToBottom();
  });
</script>

<!-- STILE -->
<style>
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100vh;
    background-color: #d1d7db;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    justify-content: center;
  }

  main {
    width: 100%;
    max-width: 500px;
    height: 100%;
    background-color: #efeae2;
    display: flex;
    flex-direction: column;
    position: relative; /* Utile se volessi mettere un'animazione di scrittura */
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
  }

  .chat-container {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* Sfondo WhatsApp pattern (se l'immagine non carica usa un colore fallback) */
    background-color: #efeae2;
    background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png");
    background-blend-mode: overlay;
  }

  .bolla {
    padding: 10px 15px;
    border-radius: 8px;
    max-width: 75%;
    font-size: 15px;
    line-height: 1.4;
    position: relative;
    word-wrap: break-word;
    box-shadow: 0 1px 1px rgba(0,0,0,0.1);
    
    /* IMPORTANTE: Rispetta i ritorni a capo (\n) */
    white-space: pre-wrap; 
  }

  .bolla.io {
    background-color: #d9fdd3;
    align-self: flex-end;
    border-top-right-radius: 0;
  }

  .bolla.ai {
    background-color: #ffffff;
    align-self: flex-start;
    border-top-left-radius: 0;
  }

  form {
    padding: 10px;
    background-color: #f0f2f5;
    display: flex;
    gap: 10px;
    border-top: 1px solid #ddd;
    align-items: center;
  }
  
  input {
    flex: 1;
    padding: 12px 15px;
    border-radius: 20px;
    border: none; /* Più stile WhatsApp */
    outline: none;
    background-color: #ffffff;
  }

  button {
    background-color: #008069;
    color: white;
    border: none;
    /* Crea un cerchio per il bottone invio */
    width: 45px; 
    height: 45px;
    border-radius: 50%; 
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: transform 0.1s;
  }
  
  button:active {
    transform: scale(0.95);
  }
  
  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  /* Indicatore di caricamento */
  .typing {
    font-size: 12px;
    color: #666;
    margin-left: 20px;
    margin-bottom: 5px;
    font-style: italic;
    height: 15px; /* Previene salti di layout */
  }
</style>

<!-- STRUTTURA -->
<main>
  <div class="chat-container" bind:this={chatContainer}>
    {#each messaggi as msg}
      <div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
        {msg.testo}
      </div>
    {/each}
  </div>
  
  <!-- Indicatore "Sta scrivendo..." -->
  {#if isLoading}
    <div class="typing">L'assistente sta scrivendo...</div>
  {/if}

  <form on:submit|preventDefault={inviaMessaggio}>
    <input 
      type="text" 
      placeholder="Scrivi un messaggio..." 
      bind:value={nuovoMessaggio} 
      disabled={isLoading}
    />
    <!-- Icona invio (simulata con + o >) -->
    <button type="submit" disabled={isLoading || !nuovoMessaggio.trim()}>
      ➤
    </button>
  </form>
</main>