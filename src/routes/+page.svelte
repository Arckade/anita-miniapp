<script>
  import { tick, afterUpdate, onMount } from "svelte";
  import { apiStore } from "../store.js";
  import { get } from "svelte/store";

  // Lingua (it | en)
  let language = 'it';

  // --- cartella dei messaggi ---
  let messaggi = [
    {
      testo:
        language === 'en'
          ? "Hi! I'm Anita — what would you like to talk about?"
          : "Ciao! sono anita, di cosa vuoi parlare?",
      mittente: "AI",
    },
  ];
  let nuovoMessaggio = "";
  let isLoading = false; // l'AI sta pensando
  let isRecording = false; // registrazione audio in corso
  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];

  // Riferimento al contenitore della chat per lo scroll
  let chatContainer;

  async function inviaMessaggio() {
    if (nuovoMessaggio.trim() === "" || isLoading) return;

    // 1. Aggiunge messaggio utente
    messaggi = [...messaggi, { testo: nuovoMessaggio, mittente: "Io" }];

    // Pulisce input
    const inputText = nuovoMessaggio;
    nuovoMessaggio = "";
    isLoading = true;

    // Scorri in basso dopo aver aggiunto il messaggio utente
    await tick();
    scrollToBottom();

    // 2. Chiama l'AI
    try {
      // Nota: passiamo 'messaggi' che contiene già il nuovo msg utente e la lingua corrente
      await apiStore.fetchData(messaggi, language);

      // 3. QUI AVVIENE LA MAGIA: Leggiamo la risposta dallo store
      const storeState = get(apiStore);

      if (storeState.data) {
        // Aggiungiamo la risposta AI alla lista locale
        messaggi = [...messaggi, { testo: storeState.data, mittente: "AI" }];
      }
    } catch (err) {
      console.error(err);
      messaggi = [
        ...messaggi,
        { testo: language === 'en' ? "Connection error with the AI." : "Errore di connessione con l'AI.", mittente: "AI" },
      ];
    } finally {
      isLoading = false;
      await tick();
      scrollToBottom();
    }
  }

  async function startRecording() {
    if (isRecording) return;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });

        // Indica che stiamo inviando
        isLoading = true;
        try {
          const res = await apiStore.uploadAudio(file, language);

          // Aggiungi un messaggio utente rappresentando il file o trascrizione
          if (res && res.transcription) {
            messaggi = [...messaggi, { testo: res.transcription, mittente: 'Io' }];
            // Dopo aver aggiunto il testo trascritto chiamiamo l'AI
            await tick();
            await apiStore.fetchData(messaggi, language);
            const storeState = get(apiStore);
            if (storeState.data) {
              messaggi = [...messaggi, { testo: storeState.data, mittente: 'AI' }];
            }
          } else if (res && res.filename) {
            // Aggiungiamo il messaggio con riferimento al file audio
            const placeholder = `[Audio file: ${res.filename}]`;
            messaggi = [...messaggi, { testo: placeholder, audio: res.filename, mittente: 'Io' }];
            await tick();
            // Inoltriamo comunque il riferimento all'AI (il backend può gestirlo)
            await apiStore.fetchData(messaggi, language);
            const storeState = get(apiStore);
            if (storeState.data) {
              messaggi = [...messaggi, { testo: storeState.data, mittente: 'AI' }];
            }
          } else {
            messaggi = [...messaggi, { testo: language === 'en' ? 'Audio uploaded.' : 'Audio inviato.', mittente: 'Io' }];
          }
        } catch (err) {
          console.error(err);
          messaggi = [...messaggi, { testo: language === 'en' ? 'Audio upload failed.' : 'Invio audio fallito.', mittente: 'AI' }];
        } finally {
          isLoading = false;
          // stop tracks
          if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
          }
        }
      };

      mediaRecorder.start();
      isRecording = true;
    } catch (err) {
      console.error('Could not start recording', err);
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    } catch (e) {
      console.error(e);
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

  // Settings dropdown
  let showMenu = false;
  let showLangOptions = false;

  function toggleMenu(event) {
    showMenu = !showMenu;
  }

  function selectLanguage() {
    // Toggle inline language choices
    showLangOptions = !showLangOptions;
  }

  function setLanguage(l) {
    language = l;
    showLangOptions = false;
    showMenu = false;
    // Inform the user in the selected language
    const confirmation = l === 'en' ? 'Language set to English.' : 'Lingua impostata su Italiano.';
    messaggi = [...messaggi, { testo: confirmation, mittente: 'AI' }];
  }

  function selectTemplate() {
    showMenu = false;
    // placeholder action
    console.log("Template clicked");
  }

  // Gestione tasti Enter per registrazione "hold-to-record"
  onMount(() => {
    function down(e) {
      if (e.key === 'Enter') {
        // Previeni l'invio normale del form quando iniziamo a registrare
        e.preventDefault();
        if (!isRecording && !isLoading) startRecording();
      }
    }

    function up(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isRecording) stopRecording();
      }
    }

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

  // Riproduci un file audio salvato sul server
  function playAudio(filename) {
    try {
      const backend = import.meta.env.VITE_BACKEND || '';
      // If backend is empty, assume same origin
      const url = backend ? `${backend.replace(/\/$/, '')}/recordings/${filename}` : `/recordings/${filename}`;
      const audio = new Audio(url);
      audio.play().catch(err => console.error('Audio play failed', err));
    } catch (e) {
      console.error('playAudio error', e);
    }
  }
</script>

<!-- STRUTTURA -->
<main on:click={() => { showMenu = false; showLangOptions = false }}>
  <div class="chat-container" bind:this={chatContainer}>
    {#each messaggi as msg}
      <div class="bolla {msg.mittente === 'Io' ? 'io' : 'ai'}">
        {#if msg.audio}
          <button type="button" class="play-audio" on:click={() => playAudio(msg.audio)} aria-label="Play audio">
            ▶️
          </button>
        {:else}
          {msg.testo}
        {/if}
      </div>
    {/each}
  </div>

  <!-- Indicatore "Sta scrivendo..." -->
  {#if isLoading}
    <div class="typing">{language === 'en' ? "Assistant is typing..." : "L'assistente sta scrivendo..."}</div>
  {/if}

  <form on:submit|preventDefault={inviaMessaggio}>
    <div class="settings-container" on:click|stopPropagation>
      <button
        type="button"
        class="settings-button"
        aria-label="Settings"
        on:click={toggleMenu}
      >
        ⚙️
      </button>

      {#if showMenu}
        <div class="settings-menu" on:click|stopPropagation>
          <button type="button" class="menu-item" on:click={selectLanguage}>
            {language === 'en' ? 'Language' : 'Lingua'}
          </button>

          {#if showLangOptions}
            <div class="lang-options">
              <button type="button" class="menu-item" on:click={() => setLanguage('it')}>
                Italiano
              </button>
              <button type="button" class="menu-item" on:click={() => setLanguage('en')}>
                English
              </button>
            </div>
          {/if}

          <button type="button" class="menu-item" on:click={selectTemplate}>
            template
          </button>
        </div>
      {/if}
    </div>
    <input
      type="text"
      placeholder={language === 'en' ? 'Write a message...' : 'Scrivi un messaggio...'}
      bind:value={nuovoMessaggio}
      disabled={isLoading}
    />
    <!-- Pulsante registrazione accanto alla barra di input -->
    <button
      type="button"
      class="record-button"
      aria-label="Hold to record"
      on:mousedown|preventDefault={startRecording}
      on:mouseup|preventDefault={stopRecording}
      on:mouseleave|preventDefault={stopRecording}
      on:touchstart|preventDefault={startRecording}
      on:touchend|preventDefault={stopRecording}
    >
      ⏺
    </button>

    <!-- Icona invio (simulata con + o >) -->
    <button type="submit" disabled={isLoading || !nuovoMessaggio.trim()}>
      ➤
    </button>
  </form>
</main>

<!-- STILE -->
<style>
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100vh;
    background-color: #d1d7db;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
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
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
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
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);

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

  .settings-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .settings-button {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 18px;
    margin-right: 6px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .settings-menu {
    position: absolute;
    bottom: 50px;
    left: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    padding: 6px;
    min-width: 120px;
    z-index: 30;
  }

  .menu-item {
    background: transparent;
    border: none;
    padding: 8px 12px;
    text-align: center;
    cursor: pointer;
    border-radius: 6px;
  }

  .menu-item:hover {
    background: #f3f4f6;
  }

  .lang-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
    /* indent the language choices so they appear further to the right */
    padding-left: 20px;
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

  /* Style for the record button next to input */
  .record-button {
    background-color: #b91c1c; /* red */
    color: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  .record-button:active { transform: scale(0.96); }

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
